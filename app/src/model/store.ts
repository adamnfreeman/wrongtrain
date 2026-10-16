/* Trips saved on this phone.

   Everything lives in one localStorage record so it opens instantly and works with no signal.
   Group sync will sit behind the same actions later: screens call these functions and never
   touch storage themselves. */
import { useSyncExternalStore } from 'react';
import type { Trip } from './types';
import { addDays, daysBetween, todayIn } from './time';
import { newId } from './trip';
import { makeSample } from './sample';

interface State {
  trips: Trip[];
  activeId: string | null;
  /** Your display name on this phone, used for notes and ticks. */
  me: string;
}

const KEY = 'wrongtrain';
const listeners = new Set<() => void>();

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null') as State | null;
    if (s && Array.isArray(s.trips)) return { ...s, trips: s.trips.map(t => (t.sample ? keepSampleCurrent(t) : t)) };
  } catch { /* storage blocked or corrupt: start empty */ }
  return { trips: [], activeId: null, me: '' };
}

let state: State = load();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* full or blocked: keep going in memory */ }
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

function updateTrip(id: string, f: (t: Trip) => Trip) {
  set({ trips: state.trips.map(t => (t.id === id ? { ...f(t), updatedAt: new Date().toISOString() } : t)) });
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

export function deleteTrip(id: string) {
  set({ trips: state.trips.filter(t => t.id !== id), activeId: state.activeId === id ? null : state.activeId });
}

export const setMe = (me: string) => set({ me: me.trim() });

export function toggleTodo(tripId: string, todoId: string) {
  updateTrip(tripId, t => ({
    ...t,
    todos: t.todos.map(x => (x.id === todoId ? { ...x, done: !x.done, doneBy: !x.done ? state.me || undefined : undefined } : x)),
  }));
}

export function addNote(tripId: string, text: string) {
  const clean = text.replace(/[ \t]+/g, ' ').trim().slice(0, 600);
  if (!clean) return false;
  updateTrip(tripId, t => ({
    ...t,
    notes: [...t.notes, { id: newId('n'), author: state.me || 'Me', text: clean, at: new Date().toISOString(), done: false }],
  }));
  return true;
}

export function toggleNote(tripId: string, noteId: string) {
  updateTrip(tripId, t => ({ ...t, notes: t.notes.map(n => (n.id === noteId ? { ...n, done: !n.done } : n)) }));
}

/* per-phone view preferences, kept apart from trip data */
export function pref<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem('wt-pref-' + key); return v == null ? fallback : (JSON.parse(v) as T); } catch { return fallback; }
}
export function setPref(key: string, v: unknown) {
  try { localStorage.setItem('wt-pref-' + key, JSON.stringify(v)); } catch { /* ignore */ }
}
