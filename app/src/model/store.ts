/* Trips saved on this phone.

   Everything lives in one localStorage record so it opens instantly and works with no signal.
   Screens call these functions and never touch storage themselves. For a shared trip, the sync
   engine (sync/engine.ts) hears about every change through onTripChange and sends it on. */
import { useSyncExternalStore } from 'react';
import type { Trip } from './types';
import { addDays, daysBetween, todayIn } from './time';
import { newId } from './trip';
import { makeSample } from './sample';

/** What this phone knows about a shared trip's server copy. */
export interface SyncInfo {
  /** Server version this phone's copy is based on. */
  version: number;
  /** The server copy at that version, for merging when someone else saves first. */
  base: Trip;
  /** Changed here since the last save reached the server. */
  dirty: boolean;
}

interface State {
  trips: Trip[];
  activeId: string | null;
  /** Your display name on this phone, used for notes and ticks. */
  me: string;
  /** Shared trips, by id. A trip with no entry lives only on this phone. */
  sync: Record<string, SyncInfo>;
}

const KEY = 'wrongtrain';
const listeners = new Set<() => void>();

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null') as State | null;
    if (s && Array.isArray(s.trips)) return { ...s, sync: s.sync || {}, trips: s.trips.map(t => (t.sample ? keepSampleCurrent(t) : t)) };
  } catch { /* storage blocked or corrupt: start empty */ }
  return { trips: [], activeId: null, me: '', sync: {} };
}

let state: State = load();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* full or blocked: keep going in memory */ }
}

let changeHook: ((tripId: string) => void) | null = null;
/** The sync engine registers here to hear about every change to a trip. */
export const onTripChange = (f: (tripId: string) => void) => { changeHook = f; };

/** Low-level write for the sync engine: trips and sync records together. */
export function setSynced(trips: Trip[], sync: Record<string, SyncInfo>, activeId = state.activeId) {
  set({ trips, sync, activeId });
}

function set(next: Partial<State>) {
  state = { ...state, ...next };
  save();
  listeners.forEach(l => l());
}

export function useStore(): State {
  return useSyncExternalStore(
    l => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
  );
}

export const getState = () => state;

/** The sample trip always has today as its second day, so Today shows the trip in progress. */
function keepSampleCurrent(t: Trip): Trip {
  if (t.days.length < 2) return t;
  const tz = t.destinations[0]?.timeZone || 'UTC';
  const shift = daysBetween(t.days[1].date, todayIn(tz));
  if (!shift) return t;
  return { ...t, days: t.days.map(d => ({ ...d, date: addDays(d.date, shift) })) };
}

/** Applies a change to one trip and saves it. Every edit goes through here. */
export function patchTrip(id: string, f: (t: Trip) => Trip) {
  set({ trips: state.trips.map(t => (t.id === id ? { ...f(t), updatedAt: new Date().toISOString() } : t)) });
  changeHook?.(id);
}

/* ---------- actions ---------- */

export function openSample() {
  const have = state.trips.find(t => t.sample);
  if (have) return set({ activeId: have.id });
  const t = makeSample(new Date());
  set({ trips: [...state.trips, t], activeId: t.id });
}

export function resetSample() {
  const t = makeSample(new Date());
  set({ trips: [...state.trips.filter(x => !x.sample), t], activeId: t.id });
}

export const selectTrip = (id: string | null) => set({ activeId: id });

/** Adds a new trip and opens it. */
export function addTrip(t: Trip) {
  set({ trips: [...state.trips, t], activeId: t.id });
}

/** Removes a trip from this phone (a shared trip stays online for everyone else). */
export function deleteTrip(id: string) {
  const sync = { ...state.sync }; delete sync[id];
  set({ trips: state.trips.filter(t => t.id !== id), activeId: state.activeId === id ? null : state.activeId, sync });
}

export const setMe = (me: string) => set({ me: me.trim() });

export function toggleTodo(tripId: string, todoId: string) {
  patchTrip(tripId, t => ({
    ...t,
    todos: t.todos.map(x => (x.id === todoId ? { ...x, done: !x.done, doneBy: !x.done ? state.me || undefined : undefined } : x)),
  }));
}

export function addNote(tripId: string, text: string) {
  const clean = text.replace(/[ \t]+/g, ' ').trim().slice(0, 600);
  if (!clean) return false;
  patchTrip(tripId, t => ({
    ...t,
    notes: [...t.notes, { id: newId('n'), author: state.me || 'Me', text: clean, at: new Date().toISOString(), done: false }],
  }));
  return true;
}

export function toggleNote(tripId: string, noteId: string) {
  patchTrip(tripId, t => ({ ...t, notes: t.notes.map(n => (n.id === noteId ? { ...n, done: !n.done } : n)) }));
}

/* per-phone view preferences, kept apart from trip data */
export function pref<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem('wt-pref-' + key); return v == null ? fallback : (JSON.parse(v) as T); } catch { return fallback; }
}
export function setPref(key: string, v: unknown) {
  try { localStorage.setItem('wt-pref-' + key, JSON.stringify(v)); } catch { /* ignore */ }
}
