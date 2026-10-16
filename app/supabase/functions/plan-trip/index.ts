/* plan-trip: "Plan it for me". See _shared/planner.ts for the three steps and the prompts.

   POST { step: 'outline', answers }                          -> { plan_id, left, outline }
   POST { step: 'research', plan_id, answers, outline, index } -> { notes }
   POST { step: 'build', plan_id, answers, outline, index, notes } -> { stop }

   The person must be signed in. A plan is counted when its outline is made (5 a month for now,
   in ai_plans); its later steps count against that plan. Research uses Claude's web search so
   hotels and restaurants are current; it is cut short before the function's time limit, and
   whatever was found by then is used. */
import Anthropic from 'npm:@anthropic-ai/sdk@0.132.1';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import {
  BUILD_SYSTEM, OUTLINE_SCHEMA, OUTLINE_SYSTEM, RESEARCH_SYSTEM, STOP_SCHEMA,
  buildPrompt, cleanOutline, cleanStopPlan, outlinePrompt, researchPrompt, stopDates,
  type Answers, type Outline, type StopPlan,
} from '../_shared/planner.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY
const MODEL = 'claude-opus-5-5';
/* if Claude declines, the API retries on a fallback model in the same call */
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } as const;
/* stop researching in time to answer within the Edge Function's limit */
const RESEARCH_MS = 120_000;

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
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 6 }],
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
    if (!(ctrl.signal.aborted && notes.length > 1500)) throw e;
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
  const answers = body.answers;
  if (!answers || typeof answers.where !== 'string' || !Array.isArray(answers.travelers)) return reply(400, { error: 'input', message: 'The answers are missing.' });
  answers.days = Math.min(60, Math.max(2, Math.round(Number(answers.days) || 10)));

  try {
    if (body.step === 'outline') {
      const { data: plan, error } = await admin.rpc('claim_plan', { user_id: who.user.id });
      if (error) return /allowance/.test(error.message)
        ? reply(402, { error: 'allowance', message: 'You have used this month’s free plans. You can still plan a trip by hand.' })
        : reply(500, { error: 'server', message: error.message });
      const { id, left } = plan as { id: string; left: number };
      try {
        const { out, usage } = await ask<Outline>(OUTLINE_SYSTEM, outlinePrompt(answers, new Date().toISOString().slice(0, 10)), OUTLINE_SCHEMA, 'medium');
        const outline = cleanOutline(out, answers.days);
        if (!outline.stops.length) throw new Error('no stops');
        await admin.rpc('claim_plan_step', { plan_id: id, user_id: who.user.id, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
        return reply(200, { plan_id: id, left, outline });
      } catch (e) {
        await admin.rpc('refund_plan', { plan_id: id });
        throw e;
      }
    }

    const outline = body.outline, index = Number(body.index);
    if (!body.plan_id || !outline?.stops?.[index]) return reply(400, { error: 'input', message: 'Which plan and stop?' });
    const ask1 = { answers, outline, index };

    if (body.step === 'research') {
      const { notes, usage } = await research(researchPrompt(ask1));
      if (notes.length < 200) throw new Error('too little found');
      const { error } = await admin.rpc('claim_plan_step', { plan_id: body.plan_id, user_id: who.user.id, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
      if (error) return reply(402, { error: 'allowance', message: 'This plan has done all it can. Start a new one.' });
      return reply(200, { notes });
    }

    if (body.step === 'build') {
      const notes = String(body.notes || '').slice(0, 60000);
      if (!notes) return reply(400, { error: 'input', message: 'The research notes are missing.' });
      const { out, usage } = await ask<StopPlan>(BUILD_SYSTEM, buildPrompt(ask1, notes), STOP_SCHEMA, 'low');
      const { error } = await admin.rpc('claim_plan_step', { plan_id: body.plan_id, user_id: who.user.id, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
      if (error) return reply(402, { error: 'allowance', message: 'This plan has done all it can. Start a new one.' });
      return reply(200, { stop: cleanStopPlan(out, stopDates(outline, index).dates) });
    }

    return reply(400, { error: 'input', message: 'Unknown step.' });
  } catch (e) {
    console.error('plan-trip failed', body.step, e);
    const busy = e instanceof Anthropic.RateLimitError;
    return reply(busy ? 429 : 502, { error: 'claude', message: busy ? 'Busy right now. Try again in a minute.' : 'Claude could not plan that just now. Try again.' });
  }
});
