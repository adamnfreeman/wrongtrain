// Live check against the real Supabase project, as three throwaway people (anonymous sign-ins):
// sharing, invite codes, joining, refused stale saves, live updates and account deletion.
// Needs "Allow anonymous sign-ins" switched on in Supabase (Authentication → Sign In / Providers)
// while it runs. Everything it creates is deleted at the end.
import { createClient } from '@supabase/supabase-js';

const URL = process.env.VITE_SUPABASE_URL || 'https://wklwpihkpiuniazhidjz.supabase.co';
const KEY = process.env.VITE_SUPABASE_KEY || 'sb_publishable__D8Xs8wsZA97toBm2kvbSQ_ZjDo5c7u';
const wait = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const check = (c, m) => { if (!c) failures++; console.log((c ? 'PASS ' : 'FAIL ') + m); };

function person() {
  const store = new Map();
  return createClient(URL, KEY, { auth: { persistSession: true, storage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) } } });
}
const ana = person(), ben = person(), cat = person();
const people = [ana, ben, cat];

try {
  for (const p of people) { const { error } = await p.auth.signInAnonymously(); if (error) throw new Error('anonymous sign-in: ' + error.message); }
  check(true, 'three test people signed in');

  const id = 'livetest-' + Date.now().toString(36);
  const trip = { id, name: 'Live test', days: [], legs: [], places: [], todos: [], notes: [], guides: [], destinations: [], travelers: [], todoGroups: [] };
  let r = await ana.rpc('share_trip', { trip_id: id, trip_data: trip, member_name: 'Ana' });
  check(!r.error && r.data === 1, 'Ana shares a trip' + (r.error ? ': ' + r.error.message : ''));

  r = await cat.from('trips').select('id').eq('id', id);
  check(!r.error && r.data.length === 0, 'Cat, not invited, cannot see it');
  r = await cat.rpc('save_trip', { trip_id: id, trip_data: { ...trip, name: 'hacked' }, base_version: 1 });
  check(!!r.error, 'Cat cannot save over it');

  r = await ana.rpc('create_invite', { trip_id: id });
  const code = r.data;
  check(!r.error && /^[A-Z2-9]{8}$/.test(code), 'Ana gets an invite code: ' + code);

  r = await ben.rpc('join_trip', { invite_code: code.toLowerCase(), member_name: 'Ben' });
  check(!r.error && r.data === id, 'Ben joins with the code');
  r = await ben.from('trip_members').select('name, role').eq('trip_id', id).order('joined_at');
  check(!r.error && r.data.map(m => m.name).join(',') === 'Ana,Ben', 'both people are on the trip');

  /* Ana listens for live changes */
  const heard = [];
  const ch = ana.channel('t').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips' }, p => heard.push(p.new));
  await new Promise(res => ch.subscribe(s => { if (s === 'SUBSCRIBED') res(); }));
  await wait(1500);

  r = await ben.rpc('save_trip', { trip_id: id, trip_data: { ...trip, name: 'Ben was here' }, base_version: 1 });
  check(!r.error && r.data === 2, 'Ben saves (version 2)' + (r.error ? ': ' + r.error.message : r.data !== 2 ? ': got ' + JSON.stringify(r.data) : ''));
  r = await ana.rpc('save_trip', { trip_id: id, trip_data: { ...trip, name: 'Ana, stale' }, base_version: 1 });
  check(!r.error && r.data === -1, "Ana's save from the old version is refused, so the app merges first" + (r.error ? ': ' + r.error.message : ''));

  for (let i = 0; i < 20 && !heard.length; i++) await wait(250);
  check(heard.some(h => h.id === id && h.version === 2 && h.data?.name === 'Ben was here'), 'Ana hears about Ben\'s save live');
  await ana.removeChannel(ch);

  r = await ana.from('trips').select('version, data').eq('id', id).single();
  check(!r.error && r.data.version === 2 && r.data.data.name === 'Ben was here', 'the server keeps Ben\'s save');

  r = await ben.rpc('delete_account');
  check(!r.error, 'Ben deletes his account' + (r.error ? ': ' + r.error.message : ''));
  r = await ana.from('trip_members').select('name').eq('trip_id', id);
  check(!r.error && r.data.length === 1, '... and is off the trip');
} catch (e) {
  failures++; console.log('FAIL ' + e.message);
} finally {
  /* clean up: deleting each account removes the test trip with it */
  for (const p of [ana, cat]) { try { const s = await p.auth.getSession(); if (s.data.session) await p.rpc('delete_account'); } catch { /* already gone */ } }
}
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
