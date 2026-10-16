/* Looks around you for a mood (see supabase/functions/_shared/nearby.ts): real places from
   OpenStreetMap, then Claude's five on a shared trip, or the five nearest otherwise. Your
   location goes to OpenStreetMap only when you pick a mood; Claude sees the list of places. */
import { getState } from '../model/store';
import { candidatesFrom, overpassQuery, type Candidate, type Mood, type Pick } from '../../supabase/functions/_shared/nearby.ts';
import { supabase } from './engine';

export interface Suggestion extends Candidate { why?: string }
export interface Found {
  items: Suggestion[];
  /** Who chose: Claude, or simply the nearest. */
  by: 'claude' | 'nearest';
  /** Why Claude did not choose, when it did not. */
  note?: string;
  left?: number;
}

const OVERPASS = 'https://overpass-api.de/api/interpreter';

async function lookAround(mood: Mood, lat: number, lng: number): Promise<Candidate[]> {
  let found: Candidate[] = [];
  /* walking distance first; wider if that finds little */
  for (const radius of [1000, 2500]) {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(overpassQuery(mood, lat, lng, radius)),
    });
    if (!res.ok) throw new Error(res.status === 429 ? 'busy' : 'lookup');
    found = candidatesFrom(await res.json(), lat, lng);
    if (found.length >= 8) break;
  }
  return found;
}

/** Five places for a mood near a point. Throws when the lookup itself fails. */
export async function findNearby(tripId: string, mood: Mood, pos: { lat: number; lng: number }): Promise<Found> {
  let candidates: Candidate[];
  try { candidates = await lookAround(mood, pos.lat, pos.lng); }
  catch (e) {
    throw new Error((e as Error).message === 'busy' ? 'OpenStreetMap is busy. Try again in a minute.'
      : navigator.onLine === false ? 'No connection. Try again when you have signal.' : 'Could not look around right now. Try again.');
  }
  const nearest = (note?: string): Found => ({ items: candidates.slice(0, 5), by: 'nearest', note });
  if (!candidates.length) return { items: [], by: 'nearest' };

  const s = getState(), shared = !!s.sync[tripId];
  const { data: { session } } = await supabase.auth.getSession();
  if (s.trips.find(t => t.id === tripId)?.sample) return nearest('On your own shared trips, Claude picks the best five and says why.');
  if (!shared) return nearest('Share this trip and Claude picks the best five and says why.');
  if (!session) return nearest('Sign in and Claude picks the best five and says why.');

  const localTime = new Date().toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const { data, error } = await supabase.functions.invoke<{ picks: Pick[]; left?: number }>('suggest-nearby', {
    body: { trip_id: tripId, mood, local_time: localTime, candidates },
  });
  if (error || !data?.picks?.length) return nearest(await whyNot(error));
  const byId = new Map(candidates.map(c => [c.id, c]));
  const items = data.picks.flatMap(p => (byId.has(p.id) ? [{ ...byId.get(p.id)!, why: p.why }] : []));
  return items.length ? { items, by: 'claude', left: data.left } : nearest();
}

async function whyNot(e: unknown): Promise<string> {
  const res = (e as { context?: Response })?.context;
  if (res?.status === 404) return 'Claude’s picks are not set up yet, so these are the nearest.';
  if (res && typeof res.json === 'function') {
    try { const b = await res.clone().json() as { message?: string }; if (b?.message) return `${b.message} These are the nearest.`; } catch { /* not JSON */ }
  }
  return 'Claude could not pick just now, so these are the nearest.';
}
