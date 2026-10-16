/* The trip's photos: anyone on a shared trip adds them, everyone sees them, sorted by day.

   Each photo is made smaller (2048 px, plus a 480 px thumbnail) and kept on the phone, then
   uploaded with its details as a row in trip_photos (schema.sql). With no signal it waits on the
   phone and goes later. The list is kept on the phone too, and thumbnails are fetched ahead, so
   the album shows with no signal; full-size photos are fetched when opened. */
import { useEffect, useSyncExternalStore } from 'react';
import type { Trip } from '../model/types';
import { getState } from '../model/store';
import { drop, fetchMissing, keep, sendWaiting, shrink, takenAt } from './files';
import { supabase } from './engine';

export interface Photo {
  id: string;
  trip_id: string;
  user_id: string | null;
  author_name: string;
  path: string;
  thumb: string;
  taken_at: string | null;
  day_id: string | null;
  width?: number | null;
  height?: number | null;
  caption?: string | null;
  created_at?: string;
  /** Still on this phone, waiting for signal. */
  local?: boolean;
}

const CACHE = 'wt-photos', QUEUE = 'wt-photo-queue';
const load = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
const keepJson = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full */ } };

let rows: Record<string, Photo[]> = load(CACHE, {});
let queue: Photo[] = load(QUEUE, []);
const listeners = new Set<() => void>();
let snap = { rows, queue };
const changed = () => { snap = { rows, queue }; keepJson(CACHE, rows); keepJson(QUEUE, queue); listeners.forEach(l => l()); };

/** Photos for a trip, oldest first: the group's, plus yours still waiting to go. */
export function usePhotos(tripId: string): Photo[] {
  const s = useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l); }, () => snap);
  useEffect(() => { void refresh(tripId); }, [tripId]);
  const all = [...(s.rows[tripId] || []), ...s.queue.filter(p => p.trip_id === tripId)];
  return all.sort((a, b) => (a.taken_at || '').localeCompare(b.taken_at || ''));
}

/** Fetches the trip's photo list and the thumbnails this phone does not have yet. */
export async function refresh(tripId: string) {
  if (!getState().sync[tripId] || !navigator.onLine) return;
  await flushPhotos();
  const { data, error } = await supabase.from('trip_photos').select('*').eq('trip_id', tripId).order('taken_at');
  if (error || !data) return;
  rows = { ...rows, [tripId]: data as Photo[] };
  changed();
  void fetchMissing((data as Photo[]).map(p => p.thumb));
}

/** Adds photos to the trip, each filed under the day it was taken (or the day shown). */
export async function addPhotos(trip: Trip, files: File[], dayId: string | undefined, onEach?: (n: number) => void) {
  let n = 0;
  for (const f of files) {
    const id = crypto.randomUUID(), at = await takenAt(f);
    const day = trip.days.find(d => d.date === at.slice(0, 10))?.id || dayId || null;
    const [full, small] = [await shrink(f, 2048, 0.82), await shrink(f, 480, 0.7)];
    const path = `${trip.id}/photos/${id}.jpg`, thumb = `${trip.id}/photos/${id}.t.jpg`;
    await keep(path, full); await keep(thumb, small);
    queue = [...queue, { id, trip_id: trip.id, user_id: null, author_name: getState().me, path, thumb, taken_at: at, day_id: day, local: true }];
    changed();
    onEach?.(++n);
  }
  void flushPhotos();
}

let flushing = false;
/** Sends photos added with no signal: the files first, then their rows. */
export async function flushPhotos() {
  if (flushing || !queue.length || !navigator.onLine) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  flushing = true;
  try {
    await sendWaiting();
    for (const p of [...queue]) {
      if (!getState().sync[p.trip_id]) continue;
      const { local: _l, author_name: _a, user_id: _u, ...row } = p;
      const { data, error } = await supabase.from('trip_photos').insert({ ...row, user_id: session.user.id }).select().single();
      if (error && !/duplicate/i.test(error.message)) break;
      queue = queue.filter(x => x.id !== p.id);
      if (data) rows = { ...rows, [p.trip_id]: [...(rows[p.trip_id] || []).filter(x => x.id !== p.id), data as Photo] };
      changed();
    }
  } finally { flushing = false; }
}

/** Removes a photo for everyone (yours, or anyone's if you are the owner or an organizer). */
export async function deletePhoto(p: Photo) {
  if (!p.local) {
    const { error } = await supabase.from('trip_photos').delete().eq('id', p.id);
    if (error) throw error;
  }
  queue = queue.filter(x => x.id !== p.id);
  rows = { ...rows, [p.trip_id]: (rows[p.trip_id] || []).filter(x => x.id !== p.id) };
  changed();
  await drop(p.path); await drop(p.thumb);
}

if (typeof window !== 'undefined') window.addEventListener('online', () => { void flushPhotos(); });
