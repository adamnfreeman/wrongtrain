/* plan-trip: "Plan it for me". See _shared/planner.ts for the three steps and the prompts.

   POST { step: 'outline', answers }                          -> { plan_id, left, outline }
   POST { step: 'research', plan_id, answers, outline, index } -> { notes }
   POST { step: 'build', plan_id, answers, outline, index, notes } -> { stop }

   The person must be signed in. A plan is counted when its outline is made (5 a month for now,
   in ai_plans; testers listed in the PLAN_TESTERS secret get 1000); its later steps count against
   that plan. Research uses Claude's web search so hotels and restaurants are current; it is cut
   short before the function's time limit, and whatever was found by then is used.

   Costs while testing:
   - The same request twice (same model, step and everything sent) is answered from plan_cache,
     with no call to Claude.
   - The PLANNER_MODEL secret picks the model: unset for Sonnet (good plans for much less than
     Opus), claude-opus-5-5 for the best, claude-haiku-5-5 for cheap test runs. */
import Anthropic from 'npm:@anthropic-ai/sdk@0.132.1';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import {
  BUILD_SYSTEM, OUTLINE_SCHEMA, OUTLINE_SYSTEM, RESEARCH_SYSTEM, STOP_SCHEMA,
  buildPrompt, cleanOutline, cleanStopPlan, outlinePrompt, researchPrompt, stopDates,
  type Answers, type Outline, type StopPlan,
  clamp,
} from '../_shared/planner.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY
const MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'];
const MODEL = MODELS.includes(Deno.env.get('PLANNER_MODEL') || '') ? Deno.env.get('PLANNER_MODEL')! : 'claude-sonnet-5-5';
const HAIKU = MODEL.includes('haiku');
/* if Claude declines, the API retries on a fallback model in the same call (not offered for Haiku) */
const FALLBACK = HAIKU ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } as const;
/* Haiku takes the plain web search tool; the others the newer one that filters results */
const SEARCH = HAIKU ? { type: 'web_search_20250305', name: 'web_search', max_uses: 4 } as const : { type: 'web_search_20260209', name: 'web_search', max_uses: 4 } as const;
const TESTERS = (Deno.env.get('PLAN_TESTERS') || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);

/** A hash of everything that decides an answer, to find it in plan_cache. */
async function cacheKey(parts: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([MODEL, parts])));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
/* stop researching in time to answer within the Edge Function's limit */
const RESEARCH_MS = 135_000;

type Usage = { input_tokens: number; output_tokens: number };

/** A JSON answer in the given schema. */
async function ask<T>(system: string, prompt: string, schema: unknown, effort: 'low' | 'medium'): Promise<{ out: T; usage: Usage }> {
  const msg = await anthropic.beta.messages.create({
    model: MODEL, max_tokens: 16000, ...FALLBACK,
    output_config: { effort, format: { type: 'json_schema', schema } },
    system, messages: [{ role: 'user', content: prompt }],
  });
  if (msg.stop_reason === 'refusal') throw new Error('refusal');
  if (msg.stop_reason === 'max_tokens') throw new Error('cut off');
  const text = msg.content.find(b => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('no answer');
  return { out: JSON.parse(text.text) as T, usage: msg.usage };
}

/** Research notes for one stop, with web search, resuming paused turns until done or out of time. */
async function research(prompt: string): Promise<{ notes: string; usage: Usage }> {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), RESEARCH_MS);
  const messages: Parameters<typeof anthropic.beta.messages.stream>[0]['messages'] = [{ role: 'user', content: prompt }];
  const usage: Usage = { input_tokens: 0, output_tokens: 0 };
  let notes = '';
  try {
    for (let turn = 0; turn < 4; turn++) {
      const stream = anthropic.beta.messages.stream({
        model: MODEL, max_tokens: 32000, ...FALLBACK,
        output_config: { effort: 'medium' },
        tools: [SEARCH],
        system: RESEARCH_SYSTEM, messages,
      }, { signal: ctrl.signal });
      stream.on('text', t => { notes += t; });
      const msg = await stream.finalMessage();
      usage.input_tokens += msg.usage.input_tokens; usage.output_tokens += msg.usage.output_tokens;
      if (msg.stop_reason === 'refusal') throw new Error('refusal');
      if (msg.stop_reason !== 'pause_turn') break;
      messages.push({ role: 'assistant', content: msg.content });
    }
  } catch (e) {
    /* out of time: keep what was written so far, if it is enough to plan with */
    if (!ctrl.signal.aborted) throw e;
    if (notes.length < 300) throw new Error('research ran out of time before writing anything');
  } finally { clearTimeout(timer); }
  return { notes: notes.trim(), usage };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method', message: 'Use POST.' });
  if (!Deno.env.get('ANTHROPIC_API_KEY')) return reply(503, { error: 'setup', message: 'Planning is not set up yet.' });

  const auth = req.headers.get('Authorization') || '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const publicKey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY')!;
  const asUser = createClient(url, publicKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: who } = await asUser.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (!who?.user) return reply(401, { error: 'signin', message: 'Sign in to plan a trip.' });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  let body: { step?: string; plan_id?: string; answers?: Answers; outline?: Outline; index?: number; notes?: string };
  try { body = await req.json(); } catch { return reply(400, { error: 'input', message: 'Not JSON.' }); }
  const answers = clamp(body.answers);
  if (body.outline) body.outline = clamp(body.outline);
  if (JSON.stringify(body.answers || {}).length > 20_000 || JSON.stringify(body.outline || {}).length > 40_000) return reply(413, { error: 'size', message: 'That is more than a trip plan needs.' });
  if (!answers || typeof answers.where !== 'string' || !Array.isArray(answers.travelers)) return reply(400, { error: 'input', message: 'The answers are missing.' });
  answers.days = Math.min(60, Math.max(2, Math.round(Number(answers.days) || 10)));
  const cap = TESTERS.includes((who.user.email || '').toLowerCase()) ? 1000 : 5;
  const cached = async (key: string) => (await admin.from('plan_cache').select('response').eq('key', key).maybeSingle()).data?.response;
  const keep = (key: string, step: string, response: unknown) => admin.from('plan_cache').upsert({ key, step, response }).then(() => {}, () => {});

  try {
    if (body.step === 'outline') {
      const key = await cacheKey(['outline', answers]);
      const { data: plan, error } = await admin.rpc('claim_plan', { user_id: who.user.id, cap });
      if (error) return /allowance/.test(error.message)
        ? reply(402, { error: 'allowance', message: 'You have used this month’s free plans. You can still plan a trip by hand.' })
        : reply(500, { error: 'server', message: error.message });
      const { id, left } = plan as { id: string; left: number };
      try {
        const hit = await cached(key) as Outline | undefined;
        if (hit) return reply(200, { plan_id: id, left, outline: hit, cached: true });
        const { out, usage } = await ask<Outline>(OUTLINE_SYSTEM, outlinePrompt(answers, new Date().toISOString().slice(0, 10)), OUTLINE_SCHEMA, 'medium');
        const outline = cleanOutline(out, answers.days);
        if (!outline.stops.length) throw new Error('no stops');
        await admin.rpc('claim_plan_step', { plan_id: id, user_id: who.user.id, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
        await keep(key, 'outline', outline);
        return reply(200, { plan_id: id, left, outline });
      } catch (e) {
        await admin.rpc('refund_plan', { plan_id: id });
        throw e;
      }
    }

    const outline = body.outline, index = Number(body.index);
    if (!body.plan_id || !outline?.stops?.[index]) return reply(400, { error: 'input', message: 'Which plan and stop?' });
    const ask1 = { answers, outline, index };

    /* a step already worked out: no call to Claude, but still only on your own plan */
    const key = await cacheKey([body.step, answers, outline, index, body.step === 'build' ? String(body.notes || '') : '']);
    const hit = await cached(key);
    if (hit) {
      const { error } = await admin.rpc('claim_plan_step', { plan_id: body.plan_id, user_id: who.user.id, input_tokens: 0, output_tokens: 0 });
      if (error) return reply(402, { error: 'allowance', message: 'This plan has done all it can. Start a new one.' });
      return reply(200, { ...(hit as object), cached: true });
    }

    if (body.step === 'research') {
      const { notes, usage } = await research(researchPrompt(ask1));
      if (notes.length < 200) throw new Error(`too little found (${notes.length} characters)`);
      const { error } = await admin.rpc('claim_plan_step', { plan_id: body.plan_id, user_id: who.user.id, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
      if (error) return reply(402, { error: 'allowance', message: 'This plan has done all it can. Start a new one.' });
      await keep(key, 'research', { notes });
      return reply(200, { notes });
    }

    if (body.step === 'build') {
      const notes = String(body.notes || '').slice(0, 40000);
      if (!notes) return reply(400, { error: 'input', message: 'The research notes are missing.' });
      const { out, usage } = await ask<StopPlan>(BUILD_SYSTEM, buildPrompt(ask1, notes), STOP_SCHEMA, 'low');
      const { error } = await admin.rpc('claim_plan_step', { plan_id: body.plan_id, user_id: who.user.id, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
      if (error) return reply(402, { error: 'allowance', message: 'This plan has done all it can. Start a new one.' });
      const stop = cleanStopPlan(out, stopDates(outline, index).dates);
      await keep(key, 'build', { stop });
      return reply(200, { stop });
    }

    return reply(400, { error: 'input', message: 'Unknown step.' });
  } catch (e) {
    console.error('plan-trip failed', body.step, e);
    const detail = e instanceof Anthropic.APIError && e.status ? `${e.status} ${JSON.stringify(e.error)}` : String((e as Error)?.stack || e);
    await admin.from('function_errors').insert({ fn: 'plan-trip', step: body.step || null, message: detail.slice(0, 4000) }).then(() => {}, () => {});
    const busy = e instanceof Anthropic.RateLimitError;
    return reply(busy ? 429 : 502, { error: 'claude', message: busy ? 'Busy right now. Try again in a minute.' : 'Could not plan that just now. Try again.' });
  }
});
