/* file-note: Claude files a group note into the trip.

   The app sends { trip_id, note: { text, author } } with the signed-in person's token. This
   function checks they are on the trip (by reading it under their own access rules), counts the
   use against the trip's allowance, sends the note and a compact view of the trip to Claude, and
   returns the changes Claude suggests. It changes nothing in the trip itself: the app applies the
   changes through its normal edit path, so the trip rule and roles decide what goes straight in
   and what becomes a request for the owner.

   The Anthropic API key lives only here, as the ANTHROPIC_API_KEY secret. Deploying and setting
   the secret: see supabase/functions/README.md. */
import Anthropic from 'npm:@anthropic-ai/sdk@0.132.1';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { FILING_SCHEMA, SYSTEM_PROMPT, isFiling, notePrompt, type Filing } from '../_shared/filing.ts';

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
  /* the app's publishable key comes with every request; the injected anon key is the fallback */
  const publicKey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!Deno.env.get('ANTHROPIC_API_KEY')) return reply(503, { error: 'setup', message: 'Filing notes is not set up yet.' });

  let body: { trip_id?: string; note?: { text?: string; author?: string } };
  try { body = await req.json(); } catch { return reply(400, { error: 'input', message: 'Not JSON.' }); }
  const tripId = String(body.trip_id || ''), text = String(body.note?.text || '').trim().slice(0, 600);
  if (!tripId || !text) return reply(400, { error: 'input', message: 'A trip and a note are needed.' });

  /* as the caller: their access rules decide whether they can see the trip at all */
  const asUser = createClient(url, publicKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: who } = await asUser.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (!who?.user) return reply(401, { error: 'signin', message: 'Sign in again.' });
  const { data: row } = await asUser.from('trips').select('data').eq('id', tripId).maybeSingle();
  if (!row) return reply(403, { error: 'trip', message: 'You are not on this trip.' });
  const { data: people } = await asUser.from('trip_members').select('name, role').eq('trip_id', tripId);
  const owner = (people || []).find(p => p.role === 'owner')?.name || '';

  /* the allowance is counted with the service key: nobody can call these from the app */
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: use, error: useErr } = await admin.rpc('claim_ai_use', { trip_id: tripId, user_id: who.user.id, kind: 'file-note' });
  if (useErr) {
    if (/allowance used up/i.test(useErr.message)) return reply(402, { error: 'allowance', message: 'This trip has used its free filings. The note stays open for the owner.' });
    return reply(500, { error: 'server', message: useErr.message });
  }
  const { id: useId, left } = use as { id: string; left: number };

  try {
    const today = new Date().toISOString().slice(0, 10);
    const msg = await anthropic.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      /* a routine job: keep it quick and cheap */
      output_config: { effort: 'low', format: { type: 'json_schema', schema: FILING_SCHEMA } },
      /* if Claude declines, the API retries on a fallback model in the same call */
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: notePrompt(row.data, { text, author: String(body.note?.author || '') }, owner, today) }],
    });
    if (msg.stop_reason === 'refusal') throw new Error('Claude declined to file this note.');
    if (msg.stop_reason === 'max_tokens') throw new Error('The answer was cut off.');
    const out = msg.content.find(b => b.type === 'text');
    const filing = out && out.type === 'text' ? (JSON.parse(out.text) as unknown) : null;
    if (!isFiling(filing)) throw new Error('The answer was not in the expected form.');
    await admin.from('ai_uses').update({ input_tokens: msg.usage.input_tokens, output_tokens: msg.usage.output_tokens }).eq('id', useId);
    return reply(200, { ...(filing as Filing), left });
  } catch (e) {
    /* a failed call does not count against the trip */
    await admin.rpc('refund_ai_use', { use_id: useId });
    const status = e instanceof Anthropic.RateLimitError ? 429 : 502;
    console.error('file-note failed', e);
    const detail = e instanceof Anthropic.APIError ? `${e.status} ${JSON.stringify(e.error)}` : String((e as Error)?.stack || e);
    await admin.from('function_errors').insert({ fn: 'file-note', message: detail.slice(0, 4000) }).then(() => {}, () => {});
    return reply(status, { error: 'claude', message: status === 429 ? 'Busy right now. Try again in a minute.' : 'This note could not be filed. Try again later.' });
  }
});
