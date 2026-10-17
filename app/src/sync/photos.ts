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
  /** A sample photo: a drawing in public/sample, shown as it is. */
  src?: string;
}

export interface Heart { photo_id: string; user_id: string; author_name: string }
export interface Comment { id: string; photo_id: string; user_id: string | null; author_name: string; text: string; created_at: string }
/** Hearts and comments for one trip's photos. */
export interface Talk { hearts: Heart[]; comments: Comment[] }


const CACHE = 'wt-photos', QUEUE = 'wt-photo-queue';
const load = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
const keepJson = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full */ } };

let rows: Record<string, Photo[]> = load(CACHE, {});
let talk: Record<string, Talk> = load('wt-photo-talk', {});
let queue: Photo[] = load(QUEUE, []);
const listeners = new Set<() => void>();
let snap = { rows, queue, talk };
const changed = () => { snap = { rows, queue, talk }; keepJson(CACHE, rows); keepJson(QUEUE, queue); keepJson('wt-photo-talk', talk); listeners.forEach(l => l()); };

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
  void refreshTalk(tripId);
}

/* ---------- hearts and comments ---------- */

/** Hearts and comments on a trip's photos, kept on the phone so they show with no signal. */
export function useTalk(tripId: string): Talk {
  const s = useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l); }, () => snap);
  return s.talk[tripId] || NO_TALK;
}
const NO_TALK: Talk = { hearts: [], comments: [] };

export async function refreshTalk(tripId: string) {
  if (!getState().sync[tripId] || !navigator.onLine) return;
  const [h, c] = await Promise.all([
    supabase.from('photo_hearts').select('photo_id, user_id, author_name').eq('trip_id', tripId),
    supabase.from('photo_comments').select('id, photo_id, user_id, author_name, text, created_at').eq('trip_id', tripId).order('created_at'),
  ]);
  if (h.error || c.error) return;
  talk = { ...talk, [tripId]: { hearts: h.data as Heart[], comments: c.data as Comment[] } };
  changed();
}

const setTalk = (tripId: string, f: (t: Talk) => Talk) => { talk = { ...talk, [tripId]: f(talk[tripId] || NO_TALK) }; changed(); };
const offline = () => new Error('Hearts and comments need signal. Try again in a moment.');

/** Hearts a photo, or takes the heart back. Shown straight away; undone if it can't be saved. */
export async function toggleHeart(p: Photo, me: { id: string; name: string }) {
  const had = (talk[p.trip_id] || NO_TALK).hearts.some(h => h.photo_id === p.id && h.user_id === me.id);
  const without = (t: Talk) => ({ ...t, hearts: t.hearts.filter(h => !(h.photo_id === p.id && h.user_id === me.id)) });
  const withIt = (t: Talk) => ({ ...without(t), hearts: [...without(t).hearts, { photo_id: p.id, user_id: me.id, author_name: me.name }] });
  setTalk(p.trip_id, had ? without : withIt);
  if (p.src) return; // the sample's hearts stay on this phone
  if (!navigator.onLine) { setTalk(p.trip_id, had ? withIt : without); throw offline(); }
  const { error } = had
    ? await supabase.from('photo_hearts').delete().eq('photo_id', p.id).eq('user_id', me.id)
    : await supabase.from('photo_hearts').insert({ photo_id: p.id, trip_id: p.trip_id });
  if (error && !/duplicate/i.test(error.message)) { setTalk(p.trip_id, had ? withIt : without); throw error; }
}

export async function addComment(p: Photo, text: string, me: { id: string; name: string }) {
  const clean = text.trim().slice(0, 500);
  if (!clean) return;
  if (p.src) { setTalk(p.trip_id, t => ({ ...t, comments: [...t.comments, { id: crypto.randomUUID(), photo_id: p.id, user_id: me.id, author_name: me.name, text: clean, created_at: new Date().toISOString() }] })); return; }
  if (!navigator.onLine) throw offline();
  const { data, error } = await supabase.from('photo_comments').insert({ photo_id: p.id, trip_id: p.trip_id, text: clean }).select().single();
  if (error) throw error;
  setTalk(p.trip_id, t => ({ ...t, comments: [...t.comments, data as Comment] }));
}

export async function deleteComment(tripId: string, c: Comment, sample = false) {
  if (!sample) {
    const { error } = await supabase.from('photo_comments').delete().eq('id', c.id);
    if (error) throw error;
  }
  setTalk(tripId, t => ({ ...t, comments: t.comments.filter(x => x.id !== c.id) }));
}

/** The sample's hearts and comments, made up and kept on this phone, so the page can be tried. */
export function seedSampleTalk(tripId: string, seed: Talk) { if (!talk[tripId]) { talk = { ...talk, [tripId]: seed }; changed(); } }

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
