/* Keeps shared trips in step with the server.

   - Every change to a shared trip is saved a moment later, with the version this phone last saw.
     If someone else saved in between, the save is refused; the engine fetches their copy, merges
     (see core.ts), and saves again.
   - Other people's saves arrive live while the app is open, and are fetched whenever it opens,
     comes back online or comes to the front.
   - With no signal nothing is lost: changes wait, marked unsaved, and go when the signal returns.
   - A change the trip's rule says needs the owner's OK (see model/rules.ts) is not made; it is
     sent as a request, kept on the phone until there is signal, and appears for everyone once
     the owner or an organizer approves it.

   Sign-in is an emailed six-digit code. Supabase keeps the session on the phone. */
import { createClient, type RealtimeChannel, type Session } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import type { Trip } from '../model/types';
import { getState, onTripChange, onTripGate, pref, setSynced, type SyncInfo } from '../model/store';
import { applyChange, changeOf, joinLevel, verdict, type Change, type Role, type Rule } from '../model/rules';
import { merge3, same } from '../model/merge';
import { receive, saved, type Remote } from './core';
import { SUPABASE_KEY, SUPABASE_URL } from './config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  /* detectSessionInUrl: tapping the link in the sign-in email (instead of typing the code) still signs you in */
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit', storageKey: 'wt-auth' },
});

/* ---------- status the screens can show ---------- */

export type TripStatus = 'saved' | 'saving' | 'waiting' | 'error';

/** A change someone asked for. Ones still on this phone, waiting for signal, have local set. */
export interface TripRequest {
  id: string;
  trip_id: string;
  author: string | null;
  author_name: string;
  summary: string[];
  before: Change['before'];
  after: Change['after'];
  status: 'pending' | 'approved' | 'denied' | 'withdrawn';
  reason?: string | null;
  created_at: string;
  decided_at?: string | null;
  local?: boolean;
}

/** A short message for the bottom of the screen, e.g. that a change went off for approval. */
export interface Notice { text: string; bad?: boolean; at: number }

interface Status {
  session: Session | null; ready: boolean; trips: Record<string, TripStatus>; lastError: string;
  /** Requests on your trips: waiting, and decided in the last month. */
  requests: TripRequest[];
  notice: Notice | null;
}
let status: Status = { session: null, ready: false, trips: {}, lastError: '', requests: [], notice: null };
const listeners = new Set<() => void>();
function setStatus(p: Partial<Status>) { status = { ...status, ...p }; listeners.forEach(l => l()); }
const setTripStatus = (id: string, s: TripStatus) => { if (status.trips[id] !== s) setStatus({ trips: { ...status.trips, [id]: s } }); };

export function useSync(): Status {
  return useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l); }, () => status);
}

const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;
const signedIn = () => !!status.session;
/** Signed in right now. Use this, not a session read at render time, in anything that runs after
    signing in: the screen's copy is from before, and would send you back to sign in again. */
export const isSignedIn = signedIn;

export function notify(text: string, bad = false) { setStatus({ notice: { text, bad, at: Date.now() } }); }
export function clearNotice() { if (status.notice) setStatus({ notice: null }); }

/* ---------- writing into the store ---------- */

/* the rule and your role ride along on every sync record, whatever else changes */
const withAccess = (id: string, info: SyncInfo): SyncInfo => {
  const was = getState().sync[id];
  return { ...info, rule: info.rule ?? was?.rule, role: info.role ?? was?.role };
};

function put(trip: Trip, info: SyncInfo | null) {
  const s = getState();
  const trips = s.trips.some(t => t.id === trip.id) ? s.trips.map(t => (t.id === trip.id ? trip : t)) : [...s.trips, trip];
  const sync = { ...s.sync };
  if (info) sync[trip.id] = withAccess(trip.id, info); else delete sync[trip.id];
  setSynced(trips, sync);
}
function setInfo(id: string, info: SyncInfo) { const s = getState(); setSynced(s.trips, { ...s.sync, [id]: withAccess(id, info) }); }

/** Handles any server copy of a trip: a fresh fetch, a live update, or a refused save. */
function apply(remote: Remote) {
  const s = getState();
  const out = receive(s.trips.find(t => t.id === remote.id), s.sync[remote.id], remote);
  if (out) put(out.trip, out.info);
  if (remote.rule && getState().sync[remote.id] && getState().sync[remote.id].rule !== remote.rule)
    setInfo(remote.id, { ...getState().sync[remote.id], rule: remote.rule });
  if (out?.push) schedule(remote.id, 0);
}

/* ---------- the owner's OK ---------- */

/** Decides whether an edit to a shared trip is made now. If it needs approval, it is sent as a request. */
function gate(id: string, before: Trip, after: Trip): boolean {
  const info = getState().sync[id];
  /* not shared, or your role not heard yet: the server still checks, and save() turns a refusal into a request */
  if (!info?.role) return true;
  const v = verdict(before, after, info.role);
  if (v === 'ok') return true;
  if (v === 'blocked') { notify('You can see this trip and leave notes. Ask the owner if you want to change it.', true); return false; }
  ask(id, changeOf(before, after));
  return false;
}

const OUTBOX = 'wt-outbox';
function outbox(): TripRequest[] { try { return JSON.parse(localStorage.getItem(OUTBOX) || '[]') as TripRequest[]; } catch { return []; } }
function setOutbox(list: TripRequest[]) {
  try { localStorage.setItem(OUTBOX, JSON.stringify(list)); } catch { /* full or blocked */ }
  setStatus({ requests: [...status.requests.filter(r => !r.local), ...list] });
}

/** Queues a request and sends it when there is signal. */
function ask(tripId: string, c: Change) {
  const r: TripRequest = {
    id: 'local-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), trip_id: tripId, author: status.session?.user.id || null,
    author_name: getState().me, summary: c.summary, before: c.before, after: c.after, status: 'pending', created_at: new Date().toISOString(), local: true,
  };
  setOutbox([...outbox(), r]);
  const what = c.summary.length === 1 ? `: ${c.summary[0]}` : ` (${c.summary.length} changes)`;
  notify(signedIn() && online() ? `Sent for approval${what}` : `Kept on this phone for approval${what}. It goes when you have signal.`);
  void flush();
}

let flushing = false;
async function flush() {
  if (flushing || !signedIn() || !online()) return;
  flushing = true;
  try {
    for (const r of outbox()) {
      const { data, error } = await supabase.rpc('request_change', { trip_id: r.trip_id, before: r.before, after: r.after, summary: r.summary });
      if (error && /failed to fetch|network/i.test(error.message)) break;
      setOutbox(outbox().filter(x => x.id !== r.id));
      if (error) { notify(`That request was not sent: ${errText(error)}`, true); continue; }
      upsertRequest({ ...r, id: String(data), local: false });
    }
  } finally { flushing = false; }
}

function upsertRequest(r: TripRequest) {
  const old = status.requests.find(x => x.id === r.id);
  setStatus({ requests: [r, ...status.requests.filter(x => x.id !== r.id)].sort((a, b) => b.created_at.localeCompare(a.created_at)) });
  /* tell the person who asked when theirs is decided */
  const mine = r.author && r.author === status.session?.user.id;
  if (mine && old?.status === 'pending' && (r.status === 'approved' || r.status === 'denied'))
    notify(r.status === 'approved' ? `Approved: ${r.summary[0] || 'your change'}` : `Not approved: ${r.summary[0] || 'your change'}${r.reason ? ` (${r.reason})` : ''}`, r.status === 'denied');
}

async function fetchRequests() {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data, error } = await supabase.from('trip_requests').select('*')
    .or(`status.eq.pending,decided_at.gt."${since}"`).order('created_at', { ascending: false }).limit(300);
  if (error) throw error;
  setStatus({ requests: [...((data || []) as TripRequest[]), ...outbox()] });
}

/** Approves a request: makes the change on top of the trip as it is now, and saves it for everyone. */
export async function approveRequest(r: TripRequest) {
  for (let tries = 0; tries < 4; tries++) {
    const s = getState(), info = s.sync[r.trip_id], trip = s.trips.find(t => t.id === r.trip_id);
    if (!info || !trip) throw new Error('This trip is not on this phone.');
    const next = { ...applyChange(trip, r), updatedAt: new Date().toISOString() };
    const { data, error } = await supabase.rpc('decide_request', { request_id: r.id, approve: true, reason: null, trip_data: next, base_version: info.version });
    if (error) throw error;
    const v = Number(data);
    if (v > 0) {
      /* anything typed here while that was on its way goes on top */
      const cur = getState().trips.find(t => t.id === r.trip_id) || trip;
      const merged = same(cur, trip) ? next : merge3(trip, cur, next);
      put(merged, saved(next, merged, v));
      upsertRequest({ ...r, status: 'approved', decided_at: new Date().toISOString() });
      if (getState().sync[r.trip_id]?.dirty) schedule(r.trip_id, 300);
      return;
    }
    const remote = await fetchOne(r.trip_id);
    if (!remote) throw new Error('This trip is no longer shared with you.');
    apply(remote);
  }
  throw new Error('The trip kept changing while saving. Try again.');
}

export async function denyRequest(r: TripRequest, reason: string) {
  const { error } = await supabase.rpc('decide_request', { request_id: r.id, approve: false, reason, trip_data: null, base_version: null });
  if (error) throw error;
  upsertRequest({ ...r, status: 'denied', reason: reason.trim() || null, decided_at: new Date().toISOString() });
}

export async function withdrawRequest(r: TripRequest) {
  if (r.local) return setOutbox(outbox().filter(x => x.id !== r.id));
  const { error } = await supabase.rpc('withdraw_request', { request_id: r.id });
  if (error) throw error;
  upsertRequest({ ...r, status: 'withdrawn', decided_at: new Date().toISOString() });
}

export async function setTripRule(id: string, rule: Rule) {
  const { error } = await supabase.rpc('set_trip_rule', { trip_id: id, rule });
  if (error) throw error;
  setInfo(id, { ...getState().sync[id], rule });
}

export async function setMemberRole(id: string, member: string, role: Exclude<Role, 'owner'>) {
  const { error } = await supabase.rpc('set_member_role', { trip_id: id, member, role });
  if (error) throw error;
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
    /* the server says this needs the owner's OK (your role changed, or the phone did not know it
       yet): ask for it instead, and go back to the trip as everyone else has it */
    if (/needs approval/i.test(errText(e))) {
      const now = getState(), cur = now.trips.find(t => t.id === id), i = now.sync[id];
      if (cur && i) {
        if (i.role === 'viewer') notify('You can see this trip and leave notes. Your other changes were not saved.', true);
        else ask(id, changeOf(i.base, cur));
        put(i.base, { ...i, dirty: false });
        void pullAll();
        return setTripStatus(id, 'saved');
      }
    }
    setStatus({ lastError: errText(e) });
    setTripStatus(id, online() ? 'error' : 'waiting');
  }
}

/** Saves everything waiting to go, e.g. when the signal comes back. */
export function pushAll() { Object.entries(getState().sync).forEach(([id, i]) => { if (i.dirty) void push(id); }); }

/* ---------- fetching ---------- */

async function fetchOne(id: string): Promise<Remote | null> {
  const { data, error } = await supabase.from('trips').select('id, data, version, rule').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Remote | null;
}

/** Fetches every shared trip you are on, adding new ones and catching up the rest. */
export async function pullAll() {
  if (!signedIn() || !online()) return;
  try {
    const [{ data, error }, mine] = await Promise.all([
      supabase.from('trips').select('id, data, version, rule'),
      supabase.from('trip_members').select('trip_id, role').eq('user_id', status.session!.user.id),
    ]);
    if (error) throw error;
    const rows = (data || []) as Remote[];
    rows.forEach(apply);
    ((mine.data || []) as { trip_id: string; role: Role }[]).forEach(m => {
      const i = getState().sync[m.trip_id];
      if (i && i.role !== m.role) setInfo(m.trip_id, { ...i, role: m.role });
    });
    /* trips marked shared here that the server no longer has for you: removed, or deleted */
    const have = new Set(rows.map(r => r.id));
    Object.keys(getState().sync).forEach(id => { if (!have.has(id)) dropShared(id); });
    pushAll();
    listen();
    await flush();
    await fetchRequests();
    /* files: send any added with no signal, and fetch the group's so they open offline */
    void import('./files').then(f => {
      const paths = getState().trips.filter(t => getState().sync[t.id])
        .flatMap(t => [...(t.docs || []).map(d => d.file?.path), ...(t.expenses || []).map(e => e.receipt?.path)])
        .filter((x): x is string => !!x);
      return f.sendWaiting().then(() => f.fetchMissing(paths));
    }).catch(() => {});
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_requests' }, p => {
      const row = (p.new || {}) as Partial<TripRequest>;
      if (row.id && row.trip_id && row.status) upsertRequest(row as TripRequest);
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

/** Moves the account to a new email. Supabase emails a six-digit code to the new address (and,
    with "Secure email change" on, to the old one too); the change is made once a code is entered.
    Trips, names and roles stay, because they belong to the account, not the address. */
export async function changeEmail(email: string) {
  const { error } = await supabase.auth.updateUser({ email: email.trim() });
  if (error) throw error;
}

export async function verifyEmailChange(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.replace(/\s/g, ''), type: 'email_change' });
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
  setInfo(id, { version: 1, base: trip, dirty: false, rule: 'open', role: 'owner' });
  /* the level of say picked when the trip was made: open unless they chose otherwise */
  if (trip.say && trip.say !== 'open') await setTripRule(id, trip.say).catch(() => {});
  shareMyAvatar();
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
  /* you join with the level the trip was set up with; the owner can change it later */
  const s = getState(); setSynced(s.trips, { ...s.sync, [id]: { ...s.sync[id], rule: remote.rule || 'open', role: s.sync[id]?.role || joinLevel(remote.rule).role } }, id);
  listen();
  void fetchRequests().catch(() => {});
  shareMyAvatar();
  return id;
}

export interface Member { user_id: string; name: string; role: Role; avatar?: string | null }
export async function members(id: string): Promise<Member[]> {
  const { data, error } = await supabase.from('trip_members').select('user_id, name, role, avatar').eq('trip_id', id).order('joined_at');
  if (error) throw error;
  return (data || []) as Member[];
}

export async function setMyName(name: string) {
  if (!signedIn()) return;
  await supabase.from('trip_members').update({ name }).eq('user_id', status.session!.user.id);
}

/** Your picture goes on a trip you've just shared or joined. */
const shareMyAvatar = () => { const a = pref<string | null>('avatar', null); if (a) void setMyAvatar(a).catch(() => {}); };

/** Puts your profile picture (or none) on every trip you're on; see ui/avatar.tsx. */
export async function setMyAvatar(avatar: string | null) {
  if (!signedIn()) return;
  const { error } = await supabase.from('trip_members').update({ avatar }).eq('user_id', status.session!.user.id);
  if (error) throw error;
}

/** Leaves a shared trip; your copy is removed from this phone. */
export async function leaveTrip(id: string) {
  const { error } = await supabase.rpc('leave_trip', { trip_id: id });
  if (error) throw error;
  const s = getState(); const sync = { ...s.sync }; delete sync[id];
  setSynced(s.trips.filter(t => t.id !== id), sync, s.activeId === id ? null : s.activeId);
}

/** The owner deletes a shared trip for everyone: online, and from this phone. */
export async function deleteSharedTrip(id: string) {
  const { error } = await supabase.rpc('delete_trip', { trip_id: id });
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
  if (/already decided/i.test(m)) return 'Someone already decided that one.';
  if (/only the owner/i.test(m)) return 'Only the trip owner can do that.';
  return m;
}

/* ---------- start ---------- */

let started = false;
export function startSync() {
  if (started) return; started = true;
  onTripGate(gate);
  setStatus({ requests: outbox() });
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
