/* Where everyone is: the friend finder. Sharing is a choice, made per trip and for a set time (an
   hour, the rest of the day, the whole trip); while it lasts and the app is open, your position is
   sent every minute or so, or when you've moved, to trip_locations (schema.sql), where only the
   people on that trip can see it, and only until the time you picked. Stopping removes it. */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { supabase, useSync } from './engine';
import { getState } from '../model/store';
import { sampleSpots } from '../model/sample';
import { sendPush } from './push';

export interface FriendSpot { user_id: string; lat: number; lng: number; acc: number | null; at: string; until: string }

/* ---------- your sharing, per trip, remembered on this phone ---------- */

const KEY = 'wt-sharing-location';
const listeners = new Set<() => void>();
let sharing: Record<string, string> = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(sharing)); } catch { /* ignore */ } listeners.forEach(f => f()); };

/** Until when you're sharing on this trip, or null. */
export function useSharingUntil(tripId: string): Date | null {
  const until = useSyncExternalStore(f => { listeners.add(f); return () => listeners.delete(f); }, () => sharing[tripId] || '');
  const d = until ? new Date(until) : null;
  return d && d.getTime() > Date.now() ? d : null;
}

export function startSharing(tripId: string, until: Date) {
  sharing = { ...sharing, [tripId]: until.toISOString() }; save();
  /* the others get a push, so they know even with the app closed */
  if (!getState().trips.find(t => t.id === tripId)?.sample) sendPush(tripId, { kind: 'sharing' });
}

export async function stopSharing(tripId: string) {
  const next = { ...sharing }; delete next[tripId]; sharing = next; save();
  const { error } = await supabase.rpc('stop_sharing_location', { trip_id: tripId });
  if (error) throw error;
}

/* ---------- sending your position while you share ---------- */

const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = 6371000, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
};
const sent: Record<string, { lat: number; lng: number; at: number }> = {};

/** Sends where you are when you've moved 30 m or a minute has passed. Quiet when it fails: the next fix tries again. */
export async function sendSpot(tripId: string, pos: { lat: number; lng: number; acc: number }, until: Date) {
  const last = sent[tripId];
  if (last && Date.now() - last.at < 60_000 && metres(last, pos) < 30) return;
  sent[tripId] = { ...pos, at: Date.now() };
  const { error } = await supabase.rpc('share_location', { trip_id: tripId, lat: pos.lat, lng: pos.lng, acc: Math.round(pos.acc), until: until.toISOString() });
  if (error) delete sent[tripId];
}

/* ---------- everyone else ---------- */

/** People on the trip who are sharing where they are, refreshed every 30 seconds while shown. */
export function useFriendSpots(tripId: string, on: boolean): FriendSpot[] {
  const sample = !!getState().trips.find(t => t.id === tripId)?.sample;
  const { session } = useSync();
  const shared = !!getState().sync[tripId];
  const [spots, setSpots] = useState<FriendSpot[]>([]);
  const made = useMemo(() => (sample && on ? sampleSpots() : null), [sample, on]);
  /* the sample's made-up friends start sharing too, so the banner shows there (once per phone) */
  useEffect(() => {
    if (!made) return;
    /* a fixed "until" (the end of today), so it shows once a day rather than every launch */
    const end = new Date(); end.setHours(23, 59, 0, 0);
    noticeSharers(tripId, made.slice(0, 1).map(s => ({ ...s, until: end.toISOString() })));
  }, [made, tripId]);
  useEffect(() => {
    if (!on || !shared || !session) { setSpots([]); return; }
    let live = true;
    const load = async () => {
      const { data } = await supabase.from('trip_locations').select('user_id, lat, lng, acc, at, until').eq('trip_id', tripId);
      if (!live || !data) return;
      const others = (data as FriendSpot[]).filter(s => s.user_id !== session.user.id);
      setSpots(others);
      noticeSharers(tripId, others);
    };
    void load();
    const t = window.setInterval(() => { if (!document.hidden) void load(); }, 30_000);
    return () => { live = false; clearInterval(t); };
  }, [tripId, on, shared, session]);
  return made || spots;
}

/* ---------- telling you when someone starts sharing ---------- */

/** Someone who just started sharing, for the banner (ShareNotice in ui/map.tsx). */
export interface ShareStart { tripId: string; userId: string; until: string }
const SEEN = 'wt-shares-seen';
const noticeListeners = new Set<() => void>();
let notices: ShareStart[] = [];
const seen = (): string[] => { try { return JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch { return []; } };

/** Each time someone starts sharing (a new "until"), once per phone: a banner, and on the iPhone a
    notification too. Only while the app is open: with it closed, that would need push. */
export function noticeSharers(tripId: string, spots: FriendSpot[]) {
  const had = seen(), fresh = spots.filter(s => new Date(s.until).getTime() > Date.now() && !had.includes(`${tripId}:${s.user_id}:${s.until}`));
  if (!fresh.length) return;
  try { localStorage.setItem(SEEN, JSON.stringify([...had, ...fresh.map(s => `${tripId}:${s.user_id}:${s.until}`)].slice(-300))); } catch { /* ignore */ }
  notices = [...notices, ...fresh.map(s => ({ tripId, userId: s.user_id, until: s.until }))];
  noticeListeners.forEach(f => f());
}
export const useShareNotices = () => useSyncExternalStore(f => { noticeListeners.add(f); return () => noticeListeners.delete(f); }, () => notices);
export const dismissShareNotice = (n: ShareStart) => { notices = notices.filter(x => x !== n); noticeListeners.forEach(f => f()); };

/** "2 min ago", "just now". */
export function ago(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}
