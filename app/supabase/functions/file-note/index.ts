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
import { FILING_SCHEMA, SEARCH_SYSTEM, SYSTEM_PROMPT, buildNotePrompt, emptyToNull, isFiling, unalias, type Filing } from '../_shared/filing.ts';

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
  const author = String(body.note?.author || '').slice(0, 60);
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
    if (/too many at once/i.test(useErr.message)) return reply(429, { error: 'busy', message: 'That was a lot at once. Try again in a minute.' });
    if (/daily limit/i.test(useErr.message)) return reply(429, { error: 'daily', message: "You've used WrongTrain's AI a lot today. Try again tomorrow." });
    if (/allowance used up/i.test(useErr.message)) return reply(402, { error: 'allowance', message: 'This trip has used its free filings. The note stays open for the owner.' });
    return reply(500, { error: 'server', message: useErr.message });
  }
  const { id: useId, left } = use as { id: string; left: number };

  try {
    const today = new Date().toISOString().slice(0, 10);
    /* a trip stuffed far beyond any real one isn't sent: it would only cost money */
    const built = buildNotePrompt(row.data, { text, author }, owner, today);
    if (built.prompt.length > 120_000) { await admin.rpc('refund_ai_use', { use_id: useId }); return reply(413, { error: 'size', message: 'This trip is too big to file notes into.' }); }
    const used = { input_tokens: 0, output_tokens: 0 };
    const add = (u: { input_tokens: number; output_tokens: number }) => { used.input_tokens += u.input_tokens; used.output_tokens += u.output_tokens; };
    const ask = async (prompt: string): Promise<Filing> => {
      const msg = await anthropic.beta.messages.create({
        /* Haiku: filing a note is routine; far cheaper than Opus, which cost 8¢ a note (Oct 17) */
        model: 'claude-haiku-5-5',
        max_tokens: 4000,
        output_config: { effort: 'low', format: { type: 'json_schema', schema: FILING_SCHEMA } },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });
      add(msg.usage);
      if (msg.stop_reason === 'refusal') throw new Error('Claude declined to file this note.');
      if (msg.stop_reason === 'max_tokens') throw new Error('The answer was cut off.');
      const out = msg.content.find(b => b.type === 'text');
      const f = out && out.type === 'text' ? (JSON.parse(out.text) as unknown) : null;
      if (!isFiling(f)) throw new Error('The answer was not in the expected form.');
      return f;
    };
    let { back } = built;
    let filing = await ask(built.prompt);
    /* a note asking for a kind of place ("get botox and a facial"): search the web for real ones
       near where the group will be, then file with what was found. Only these notes pay for it. */
    const search = String(filing.search || '').trim().slice(0, 200);
    if (search) try {
      const res = await anthropic.beta.messages.create({
        model: 'claude-haiku-5-5', max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
        system: SEARCH_SYSTEM,
        messages: [{ role: 'user', content: search }],
      });
      add(res.usage);
      const found = res.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('\n').trim();
      if (found) {
        const again = buildNotePrompt(row.data, { text, author }, owner, today, found);
        back = again.back;
        filing = await ask(again.prompt);
      }
    } catch (e) {
      /* the search failing shouldn't lose the note: it stays open, with the reason logged */
      const detail = e instanceof Anthropic.APIError ? `${e.status} ${JSON.stringify(e.error)}` : String((e as Error)?.message || e);
      await admin.from('function_errors').insert({ fn: 'file-note search', message: detail.slice(0, 4000) }).then(() => {}, () => {});
      filing = { ...filing, changes: [], done: false, reply: filing.reply || "Couldn't look that up just now; the note is left open." };
    }
    filing = { ...filing, search: null };
    await admin.from('ai_uses').update(used).eq('id', useId);
    return reply(200, { ...unalias(emptyToNull(filing), back), left });
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
