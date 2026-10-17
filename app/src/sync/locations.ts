/* Where everyone is: the friend finder. Sharing is a choice, made per trip and for a set time (an
   hour, the rest of the day, the whole trip); while it lasts and the app is open, your position is
   sent every minute or so, or when you've moved, to trip_locations (schema.sql), where only the
   people on that trip can see it, and only until the time you picked. Stopping removes it. */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { supabase, useSync } from './engine';
import { getState } from '../model/store';

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

export function startSharing(tripId: string, until: Date) { sharing = { ...sharing, [tripId]: until.toISOString() }; save(); }

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
  const { session } = useSync();
  const shared = !!getState().sync[tripId];
  const [spots, setSpots] = useState<FriendSpot[]>([]);
  useEffect(() => {
    if (!on || !shared || !session) { setSpots([]); return; }
    let live = true;
    const load = async () => {
      const { data } = await supabase.from('trip_locations').select('user_id, lat, lng, acc, at, until').eq('trip_id', tripId);
      if (live && data) setSpots((data as FriendSpot[]).filter(s => s.user_id !== session.user.id));
    };
    void load();
    const t = window.setInterval(() => { if (!document.hidden) void load(); }, 30_000);
    return () => { live = false; clearInterval(t); };
  }, [tripId, on, shared, session]);
  return spots;
}

/** "2 min ago", "just now". */
export function ago(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}
