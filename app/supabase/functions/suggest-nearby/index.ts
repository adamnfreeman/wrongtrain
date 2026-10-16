/* suggest-nearby: Claude picks five places near you for a mood.

   The app sends { trip_id, mood, local_time, candidates } with the signed-in person's token. The
   candidates are real places from OpenStreetMap that the app looked up around the phone (see
   _shared/nearby.ts). This function checks the person is on the trip, counts the use against the
   trip's allowance (as file-note does), and returns Claude's picks: ids from the list, each with
   a line on why. Nothing is stored except the count.

   Deploy it like file-note: supabase/functions/README.md. */
import Anthropic from 'npm:@anthropic-ai/sdk@0.132.1';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { NEARBY_SYSTEM, PICKS_SCHEMA, cleanPicks, isMood, nearbyPrompt, type Candidate } from '../_shared/nearby.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY

/** Only the fields Claude needs, from whatever the app sent. */
function readCandidates(x: unknown): Candidate[] {
  if (!Array.isArray(x)) return [];
  return x.slice(0, 40).flatMap(c => {
    if (!c || typeof c.id !== 'string' || typeof c.name !== 'string') return [];
    return [{
      id: c.id.slice(0, 40), name: c.name.slice(0, 120), what: String(c.what || '').slice(0, 80),
      lat: Number(c.lat) || 0, lng: Number(c.lng) || 0, dist: Math.max(0, Math.round(Number(c.dist) || 0)),
      ...(typeof c.hours === 'string' ? { hours: c.hours.slice(0, 120) } : {}),
    }];
  });
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method', message: 'Use POST.' });

  const auth = req.headers.get('Authorization') || '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const publicKey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!Deno.env.get('ANTHROPIC_API_KEY')) return reply(503, { error: 'setup', message: 'Suggestions are not set up yet.' });

  let body: { trip_id?: string; mood?: string; local_time?: string; candidates?: unknown };
  try { body = await req.json(); } catch { return reply(400, { error: 'input', message: 'Not JSON.' }); }
  const tripId = String(body.trip_id || ''), mood = body.mood, candidates = readCandidates(body.candidates);
  if (!tripId || !isMood(mood) || !candidates.length) return reply(400, { error: 'input', message: 'A trip, a mood and some places are needed.' });
  const localTime = String(body.local_time || '').slice(0, 40);

  /* as the caller: their access rules decide whether they are on the trip */
  const asUser = createClient(url, publicKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: who } = await asUser.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (!who?.user) return reply(401, { error: 'signin', message: 'Sign in again.' });
  const { data: row } = await asUser.from('trips').select('id').eq('id', tripId).maybeSingle();
  if (!row) return reply(403, { error: 'trip', message: 'You are not on this trip.' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: use, error: useErr } = await admin.rpc('claim_ai_use', { trip_id: tripId, user_id: who.user.id, kind: 'suggest-nearby' });
  if (useErr) {
    if (/allowance used up/i.test(useErr.message)) return reply(402, { error: 'allowance', message: 'This trip has used its free Claude uses.' });
    return reply(500, { error: 'server', message: useErr.message });
  }
  const { id: useId, left } = use as { id: string; left: number };

  try {
    const msg = await anthropic.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      /* a quick choice from a short list */
      output_config: { effort: 'low', format: { type: 'json_schema', schema: PICKS_SCHEMA } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: NEARBY_SYSTEM,
      messages: [{ role: 'user', content: nearbyPrompt(mood, localTime, candidates) }],
    });
    if (msg.stop_reason === 'refusal' || msg.stop_reason === 'max_tokens') throw new Error(`stopped: ${msg.stop_reason}`);
    const out = msg.content.find(b => b.type === 'text');
    const picks = cleanPicks(out && out.type === 'text' ? JSON.parse(out.text) : null, candidates);
    if (!picks.length) throw new Error('no usable picks');
    await admin.from('ai_uses').update({ input_tokens: msg.usage.input_tokens, output_tokens: msg.usage.output_tokens }).eq('id', useId);
    return reply(200, { picks, left });
  } catch (e) {
    await admin.rpc('refund_ai_use', { use_id: useId });
    const status = e instanceof Anthropic.RateLimitError ? 429 : 502;
    console.error('suggest-nearby failed', e);
    return reply(status, { error: 'claude', message: status === 429 ? 'Busy right now. Try again in a minute.' : 'Claude could not pick right now.' });
  }
});
