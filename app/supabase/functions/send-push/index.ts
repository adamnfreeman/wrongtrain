/* send-push: tells the others on a trip, through Apple's push service, when someone taps Remind on a
   to-do or starts sharing where they are, so it reaches them with the app closed.

   The app sends { trip_id, kind: 'remind', todo_id } or { trip_id, kind: 'sharing' } with the
   signed-in person's token. This function checks they're on the trip, works out who it's for
   (_shared/push.ts), finds those people's phones (push_tokens) and sends a fixed message: nobody can
   send their own words. The same reminder or alert isn't sent again within 10 minutes.

   Secrets: APNS_KEY (the .p8 file's contents) and APNS_KEY_ID, from the Apple developer account;
   see supabase/functions/README.md. Deploy it like file-note. */
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { apnsToken, message, remindNames } from '../_shared/push.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const TEAM = 'GXSV7T4V36', TOPIC = 'lol.wrongtrain.app';
const HOSTS = ['https://api.push.apple.com', 'https://api.sandbox.push.apple.com'];
let cached: { token: string; at: number } | null = null;

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method', message: 'Use POST.' });

  const auth = req.headers.get('Authorization') || '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const publicKey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const p8 = Deno.env.get('APNS_KEY'), keyId = Deno.env.get('APNS_KEY_ID');
  if (!p8 || !keyId) return reply(503, { error: 'setup', message: 'Push is not set up yet.' });

  let body: { trip_id?: string; kind?: string; todo_id?: string };
  try { body = await req.json(); } catch { return reply(400, { error: 'input', message: 'Not JSON.' }); }
  const tripId = String(body.trip_id || ''), kind = body.kind === 'remind' || body.kind === 'sharing' ? body.kind : null;
  if (!tripId || !kind) return reply(400, { error: 'input', message: 'A trip and a kind are needed.' });

  /* as the caller: their access rules decide whether they're on the trip */
  const asUser = createClient(url, publicKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: who } = await asUser.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (!who?.user) return reply(401, { error: 'signin', message: 'Sign in again.' });
  const { data: row } = await asUser.from('trips').select('data').eq('id', tripId).maybeSingle();
  if (!row) return reply(403, { error: 'trip', message: 'You are not on this trip.' });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: members } = await admin.from('trip_members').select('user_id, name').eq('trip_id', tripId);
  const sender = (members || []).find(m => m.user_id === who.user.id)?.name || '';

  /* who it's for */
  const trip = row.data as { travelers?: string[]; todos?: { id: string; text: string }[] };
  let names: string[] | null = null, text = '', ref = '';
  if (kind === 'remind') {
    const todo = (trip.todos || []).find(t => t.id === body.todo_id);
    if (!todo) return reply(404, { error: 'todo', message: 'That to-do is not on the trip yet.' });
    names = remindNames(todo, trip.travelers || [], sender).map(n => n.trim().toLowerCase());
    text = todo.text; ref = todo.id;
  }
  const to = (members || []).filter(m => m.user_id !== who.user.id && (!names || names.includes((m.name || '').trim().toLowerCase())));
  if (!to.length) return reply(200, { sent: 0 });

  /* not the same thing twice within 10 minutes */
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await admin.from('push_sent').select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId).eq('kind', kind).eq('ref', kind === 'sharing' ? who.user.id : ref).gte('created_at', since);
  if (count) return reply(200, { sent: 0, recent: true });
  await admin.from('push_sent').insert({ trip_id: tripId, kind, ref: kind === 'sharing' ? who.user.id : ref, sender: who.user.id });

  const { data: phones } = await admin.from('push_tokens').select('token').in('user_id', to.map(m => m.user_id));
  if (!phones?.length) return reply(200, { sent: 0 });
  if (!cached || Date.now() - cached.at > 40 * 60_000) cached = { token: await apnsToken(p8, keyId, TEAM), at: Date.now() };
  const m = message(kind, sender, text);
  const payload = JSON.stringify({ aps: { alert: { title: m.title, body: m.body }, sound: 'default' }, tab: m.tab, trip_id: tripId });

  let sent = 0;
  for (const { token } of phones) {
    /* App Store and TestFlight phones use Apple's main service; builds run from Xcode use its sandbox */
    for (const host of HOSTS) {
      const r = await fetch(`${host}/3/device/${token}`, {
        method: 'POST', body: payload,
        headers: { authorization: `bearer ${cached.token}`, 'apns-topic': TOPIC, 'apns-push-type': 'alert', 'apns-priority': '10' },
      });
      if (r.ok) { sent++; break; }
      const why = (await r.json().catch(() => ({}))).reason || r.status;
      if (why === 'BadDeviceToken' && host === HOSTS[0]) continue;
      /* a phone that uninstalled the app, or a token that never worked: forget it */
      if (r.status === 410 || why === 'BadDeviceToken' || why === 'Unregistered') await admin.from('push_tokens').delete().eq('token', token);
      else await admin.from('function_errors').insert({ fn: 'send-push', message: `${r.status} ${why}` }).then(() => {}, () => {});
      break;
    }
  }
  return reply(200, { sent });
});
