/* place-details: finds the street address and phone number of a trip's hotels and booked places
   for Essentials, so nobody has to type them in.

   The app sends { trip_id, places: [{ id, name, city, country, area }], use_id? } (a few at a time)
   with the signed-in person's token. This function checks the person is on the trip, counts one use
   against the trip's allowance for the whole list (as file-note does), has Claude search the web,
   then turns what it found into { id, address, phone } for each. The app fills in only what's
   empty and says the details were found online. Nothing is stored here except the count.

   Deploy it like file-note: supabase/functions/README.md. */
import Anthropic from 'npm:@anthropic-ai/sdk@0.132.1';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { DETAILS_SCHEMA, EXTRACT_SYSTEM, SEARCH_SYSTEM, cleanFound, extractPrompt, readWanted, searchPrompt } from '../_shared/details.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method', message: 'Use POST.' });

  const auth = req.headers.get('Authorization') || '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const publicKey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!Deno.env.get('ANTHROPIC_API_KEY')) return reply(503, { error: 'setup', message: 'Looking up details is not set up yet.' });

  let body: { trip_id?: string; places?: unknown; use_id?: string };
  try { body = await req.json(); } catch { return reply(400, { error: 'input', message: 'Not JSON.' }); }
  const tripId = String(body.trip_id || ''), wanted = readWanted(body.places);
  if (!tripId || !wanted.length) return reply(400, { error: 'input', message: 'A trip and some places are needed.' });

  /* as the caller: their access rules decide whether they are on the trip */
  const asUser = createClient(url, publicKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: who } = await asUser.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (!who?.user) return reply(401, { error: 'signin', message: 'Sign in again.' });
  const { data: row } = await asUser.from('trips').select('id').eq('id', tripId).maybeSingle();
  if (!row) return reply(403, { error: 'trip', message: 'You are not on this trip.' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  /* the app asks in small groups (a big one took over a minute and the phone gave up waiting); the
     groups after the first carry its use, so one tap of "Find the rest online" counts once */
  let useId = '', left = 0, claimed = false;
  if (body.use_id) {
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { data: prev } = await admin.from('ai_uses').select('id').eq('id', body.use_id).eq('trip_id', tripId)
      .eq('user_id', who.user.id).eq('kind', 'place-details').gte('created_at', since).maybeSingle();
    if (prev) useId = prev.id as string;
  }
  const { data: use, error: useErr } = useId ? { data: null, error: null } : await admin.rpc('claim_ai_use', { trip_id: tripId, user_id: who.user.id, kind: 'place-details' });
  if (useErr) {
    if (/too many at once/i.test(useErr.message)) return reply(429, { error: 'busy', message: 'That was a lot at once. Try again in a minute.' });
    if (/daily limit/i.test(useErr.message)) return reply(429, { error: 'daily', message: "You've used WrongTrain's AI a lot today. Try again tomorrow." });
    if (/allowance used up/i.test(useErr.message)) return reply(402, { error: 'allowance', message: 'This trip has used its free AI.' });
    /* the database's own words stay in the error log, not in the app */
    await admin.from('function_errors').insert({ fn: 'place-details', message: useErr.message.slice(0, 4000) }).then(() => {}, () => {});
    return reply(500, { error: 'server', message: 'Something went wrong. Try again in a minute.' });
  }
  if (!useId) { ({ id: useId, left } = use as { id: string; left: number }); claimed = true; }

  try {
    const tokens = { input_tokens: 0, output_tokens: 0 };
    const add = (u: { input_tokens: number; output_tokens: number }) => { tokens.input_tokens += u.input_tokens; tokens.output_tokens += u.output_tokens; };
    /* 1: search the web, a search or two per place (Haiku, as file-note's search: cheap and quick) */
    const found = await anthropic.beta.messages.create({
      model: 'claude-haiku-5-5', max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: Math.min(6, wanted.length * 2) }],
      system: SEARCH_SYSTEM,
      messages: [{ role: 'user', content: searchPrompt(wanted) }],
    });
    add(found.usage);
    const notes = found.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('\n').trim();
    if (!notes) throw new Error('the search found nothing');
    /* 2: what was found, as { id, address, phone } */
    const msg = await anthropic.beta.messages.create({
      model: 'claude-haiku-5-5', max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: DETAILS_SCHEMA } },
      system: EXTRACT_SYSTEM,
      messages: [{ role: 'user', content: extractPrompt(wanted, notes) }],
    });
    add(msg.usage);
    if (msg.stop_reason === 'refusal' || msg.stop_reason === 'max_tokens') throw new Error(`stopped: ${msg.stop_reason}`);
    const out = msg.content.find(b => b.type === 'text');
    const details = cleanFound(out && out.type === 'text' ? JSON.parse(out.text) : null, wanted);
    /* a group after the first adds its tokens to the same use */
    const { data: had } = await admin.from('ai_uses').select('input_tokens, output_tokens').eq('id', useId).maybeSingle();
    await admin.from('ai_uses').update({
      input_tokens: (claimed ? 0 : Number(had?.input_tokens || 0)) + tokens.input_tokens,
      output_tokens: (claimed ? 0 : Number(had?.output_tokens || 0)) + tokens.output_tokens,
    }).eq('id', useId);
    return reply(200, { details, left, use_id: useId });
  } catch (e) {
    /* a failed call does not count against the trip (a later group's failure leaves the first's use) */
    if (claimed) await admin.rpc('refund_ai_use', { use_id: useId });
    const status = e instanceof Anthropic.RateLimitError ? 429 : 502;
    console.error('place-details failed', e);
    const detail = e instanceof Anthropic.APIError ? `${e.status} ${JSON.stringify(e.error)}` : String((e as Error)?.stack || e);
    await admin.from('function_errors').insert({ fn: 'place-details', message: detail.slice(0, 4000) }).then(() => {}, () => {});
    return reply(status, { error: 'claude', message: status === 429 ? 'Busy right now. Try again in a minute.' : 'Could not look them up right now.' });
  }
});
