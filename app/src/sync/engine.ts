/* Keeps shared trips in step with the server.

   - Every change to a shared trip is saved a moment later, with the version this phone last saw.
     If someone else saved in between, the save is refused; the engine fetches their copy, merges
     (see core.ts), and saves again.
   - Other people's saves arrive live while the app is open, and are fetched whenever it opens,
     comes back online or comes to the front.
   - With no signal nothing is lost: changes wait, marked unsaved, and go when the signal returns.

   Sign-in is an emailed six-digit code. Supabase keeps the session on the phone. */
import { createClient, type RealtimeChannel, type Session } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import type { Trip } from '../model/types';
import { getState, onTripChange, setSynced, type SyncInfo } from '../model/store';
import { receive, saved, type Remote } from './core';
import { SUPABASE_KEY, SUPABASE_URL } from './config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  /* detectSessionInUrl: tapping the link in the sign-in email (instead of typing the code) still signs you in */
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit', storageKey: 'wt-auth' },
});

/* ---------- status the screens can show ---------- */

export type TripStatus = 'saved' | 'saving' | 'waiting' | 'error';
interface Status { session: Session | null; ready: boolean; trips: Record<string, TripStatus>; lastError: string }
let status: Status = { session: null, ready: false, trips: {}, lastError: '' };
const listeners = new Set<() => void>();
function setStatus(p: Partial<Status>) { status = { ...status, ...p }; listeners.forEach(l => l()); }
const setTripStatus = (id: string, s: TripStatus) => { if (status.trips[id] !== s) setStatus({ trips: { ...status.trips, [id]: s } }); };

export function useSync(): Status {
  return useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l); }, () => status);
}

const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;
const signedIn = () => !!status.session;

/* ---------- writing into the store ---------- */

function put(trip: Trip, info: SyncInfo | null) {
  const s = getState();
  const trips = s.trips.some(t => t.id === trip.id) ? s.trips.map(t => (t.id === trip.id ? trip : t)) : [...s.trips, trip];
  const sync = { ...s.sync };
  if (info) sync[trip.id] = info; else delete sync[trip.id];
  setSynced(trips, sync);
}
function setInfo(id: string, info: SyncInfo) { const s = getState(); setSynced(s.trips, { ...s.sync, [id]: info }); }

/** Handles any server copy of a trip: a fresh fetch, a live update, or a refused save. */
function apply(remote: Remote) {
  const s = getState();
  const out = receive(s.trips.find(t => t.id === remote.id), s.sync[remote.id], remote);
  if (!out) return;
  put(out.trip, out.info);
  if (out.push) schedule(remote.id, 0);
}

/* ---------- saving ---------- */

const timers = new Map<string, number>();
const inFlight = new Set<string>();

function schedule(id: string, delay = 1200) {
  clearTimeout(timers.get(id));
  timers.set(id, window.setTimeout(() => { timers.delete(id); void push(id); }, delay));
}

async function push(id: string, tries = 0): Promise<void> {
  const s = getState(), info = s.sync[id], trip = s.trips.find(t => t.id === id);
  if (!info || !trip || !info.dirty) return setTripStatus(id, 'saved');
  if (!signedIn() || !online()) return setTripStatus(id, 'waiting');
  if (inFlight.has(id)) return schedule(id, 800);
  inFlight.add(id); setTripStatus(id, 'saving');
  try {
    const { data, error } = await supabase.rpc('save_trip', { trip_id: id, trip_data: trip, base_version: info.version });
    if (error) throw error;
    const v = Number(data);
    if (v > 0) {
      const now = getState();
      const cur = now.trips.find(t => t.id === id);
      if (cur && now.sync[id]) setInfo(id, saved(trip, cur, v));
      inFlight.delete(id);
      return getState().sync[id]?.dirty ? schedule(id, 300) : setTripStatus(id, 'saved');
    }
    /* someone else saved first: take theirs, merge, try again */
    inFlight.delete(id);
    const remote = await fetchOne(id);
    if (!remote) return dropShared(id);
    apply(remote);
    if (tries < 5) return push(id, tries + 1);
    setTripStatus(id, 'error');
  } catch (e) {
    inFlight.delete(id);
    setStatus({ lastError: errText(e) });
    setTripStatus(id, online() ? 'error' : 'waiting');
  }
}

/** Saves everything waiting to go, e.g. when the signal comes back. */
export function pushAll() { Object.entries(getState().sync).forEach(([id, i]) => { if (i.dirty) void push(id); }); }

/* ---------- fetching ---------- */

async function fetchOne(id: string): Promise<Remote | null> {
  const { data, error } = await supabase.from('trips').select('id, data, version').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Remote | null;
}

/** Fetches every shared trip you are on, adding new ones and catching up the rest. */
export async function pullAll() {
  if (!signedIn() || !online()) return;
  try {
    const { data, error } = await supabase.from('trips').select('id, data, version');
    if (error) throw error;
    const rows = (data || []) as Remote[];
    rows.forEach(apply);
    /* trips marked shared here that the server no longer has for you: removed, or deleted */
    const have = new Set(rows.map(r => r.id));
    Object.keys(getState().sync).forEach(id => { if (!have.has(id)) dropShared(id); });
    pushAll();
    listen();
  } catch (e) { setStatus({ lastError: errText(e) }); }
}

/** Keeps a trip that is no longer shared with you as a copy on this phone only. */
function dropShared(id: string) {
  const s = getState(); const sync = { ...s.sync }; delete sync[id];
  setSynced(s.trips, sync);
  const t = { ...status.trips }; delete t[id]; setStatus({ trips: t });
}

/* ---------- live updates ---------- */

let channel: RealtimeChannel | null = null;
function listen() {
  if (channel || !signedIn()) return;
  channel = supabase.channel('trips')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, p => {
      const row = (p.new || {}) as Partial<Remote>;
      if (row.id && row.data && row.version) apply(row as Remote);
    })
    .subscribe();
}
function unlisten() { if (channel) { void supabase.removeChannel(channel); channel = null; } }

/* ---------- account ---------- */

export async function sendCode(email: string) {
  /* the email's link, if tapped, comes back to this app rather than to the project's default address */
  const back = location.protocol.startsWith('http') ? location.origin + location.pathname : undefined;
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, ...(back ? { emailRedirectTo: back } : {}) } });
  if (error) throw error;
}

export async function verifyCode(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.replace(/\s/g, ''), type: 'email' });
  if (error) throw error;
}

export async function signOut() {
  unlisten();
  await supabase.auth.signOut();
}

/** Deletes the account and everything only it was on. Trips shared with others carry on. */
export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;
  unlisten();
  const s = getState();
  setSynced(s.trips.filter(t => !s.sync[t.id]), {}, s.sync[s.activeId || ''] ? null : s.activeId);
  await supabase.auth.signOut();
}

/* ---------- sharing ---------- */

export async function shareTrip(id: string): Promise<void> {
  const s = getState(), trip = s.trips.find(t => t.id === id);
  if (!trip) throw new Error('No such trip');
  if (trip.sample) throw new Error('Make your own copy of the sample to share it');
  const { error } = await supabase.rpc('share_trip', { trip_id: id, trip_data: trip, member_name: s.me });
  if (error) throw error;
  setInfo(id, { version: 1, base: trip, dirty: false });
  setTripStatus(id, 'saved');
  listen();
}

export async function createInvite(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_invite', { trip_id: id });
  if (error) throw error;
  return String(data);
}

/** Joins with an invite code and opens the trip. */
export async function joinTrip(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_trip', { invite_code: code, member_name: getState().me });
  if (error) throw error;
  const id = String(data);
  const remote = await fetchOne(id);
  if (!remote) throw new Error('Joined, but the trip could not be loaded');
  apply(remote);
  const s = getState(); setSynced(s.trips, s.sync, id);
  listen();
  return id;
}

export interface Member { user_id: string; name: string; role: 'owner' | 'editor' }
export async function members(id: string): Promise<Member[]> {
  const { data, error } = await supabase.from('trip_members').select('user_id, name, role').eq('trip_id', id).order('joined_at');
  if (error) throw error;
  return (data || []) as Member[];
}

export async function setMyName(name: string) {
  if (!signedIn()) return;
  await supabase.from('trip_members').update({ name }).eq('user_id', status.session!.user.id);
}

/** Leaves a shared trip; your copy is removed from this phone. */
export async function leaveTrip(id: string) {
  const { error } = await supabase.rpc('leave_trip', { trip_id: id });
  if (error) throw error;
  const s = getState(); const sync = { ...s.sync }; delete sync[id];
  setSynced(s.trips.filter(t => t.id !== id), sync, s.activeId === id ? null : s.activeId);
}

export async function removeMember(id: string, member: string) {
  const { error } = await supabase.rpc('remove_member', { trip_id: id, member });
  if (error) throw error;
}

export function errText(e: unknown): string {
  const m = (e as { message?: string })?.message || String(e);
  if (/invite not found/i.test(m)) return 'That code did not work. Check it, or ask for a new one: codes last 30 days.';
  if (/token has expired|invalid/i.test(m) && /otp|token/i.test(m)) return 'That code did not work. Each code works once: opening the link in the email uses it up, and codes expire after an hour. Tap "Use a different email" and send a new one.';
  if (/rate limit|security purposes/i.test(m)) return 'Too many codes sent. Wait a minute and try again.';
  if (/failed to fetch|network/i.test(m)) return 'No connection. Try again when you have signal.';
  return m;
}

/* ---------- start ---------- */

let started = false;
export function startSync() {
  if (started) return; started = true;
  onTripChange(id => {
    const s = getState(), info = s.sync[id];
    if (!info) return;
    if (!info.dirty) setInfo(id, { ...info, dirty: true });
    setTripStatus(id, 'waiting');
    schedule(id);
  });
  supabase.auth.getSession().then(({ data }) => {
    setStatus({ session: data.session, ready: true });
    void pullAll();
  });
  supabase.auth.onAuthStateChange((_e, session) => {
    const was = status.session?.user.id;
    setStatus({ session, ready: true });
    if (session && session.user.id !== was) { void pullAll(); }
    if (!session) unlisten();
  });
  window.addEventListener('online', () => { void pullAll(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void pullAll(); });
}
