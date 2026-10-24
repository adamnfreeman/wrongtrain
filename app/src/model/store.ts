/* Trips saved on this phone.

   Everything lives in one localStorage record so it opens instantly and works with no signal.
   Screens call these functions and never touch storage themselves. For a shared trip, the sync
   engine (sync/engine.ts) hears about every change through onTripChange and sends it on. */
import { useSyncExternalStore } from 'react';
import type { Note, Trip } from './types';
import type { Role, Rule } from './rules';
import { addDays, daysBetween, todayIn } from './time';
import { newId } from './trip';
import { freshenSample, makeSample } from './sample';
import { backupSoon } from '../native';
import { updateFromFile } from './tripFile';
import { tick } from './todos';

/** What this phone knows about a shared trip's server copy. */
export interface SyncInfo {
  /** Server version this phone's copy is based on. */
  version: number;
  /** The server copy at that version, for merging when someone else saves first. */
  base: Trip;
  /** Changed here since the last save reached the server. */
  dirty: boolean;
  /** The trip's rule and your role on it, as last heard from the server (see rules.ts). */
  rule?: Rule;
  role?: Role;
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
    if (s && Array.isArray(s.trips)) return { ...s, sync: s.sync || {}, trips: s.trips.map(t => (!t.sample ? t : /* an older sample, without what's newer (Right now's train, the hotels' details), is made afresh */
      t.legs.some(l => l.id === 'l-now') && t.places.some(p => p.id === 's-kyo' && p.booking) ? freshenSample(keepSampleCurrent(t)) : makeSample(new Date()))) };
  } catch { /* storage blocked or corrupt: start empty */ }
  return { trips: [], activeId: null, me: '', sync: {} };
}

let state: State = load();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* full or blocked: keep going in memory */ }
  backupSoon();
}

let changeHook: ((tripId: string) => void) | null = null;
/** The sync engine registers here to hear about every change to a trip. */
export const onTripChange = (f: (tripId: string) => void) => { changeHook = f; };

let gateHook: ((tripId: string, before: Trip, after: Trip) => boolean) | null = null;
/** The sync engine registers here to hold back changes to a shared trip that need the owner's OK. */
export const onTripGate = (f: (tripId: string, before: Trip, after: Trip) => boolean) => { gateHook = f; };

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

/** Applies a change to one trip and saves it. Every edit goes through here. On a shared trip, a
    change that needs the owner's OK is not made here; it goes off as a request instead. */
export function patchTrip(id: string, f: (t: Trip) => Trip) {
  const before = state.trips.find(t => t.id === id);
  if (!before) return;
  const after = { ...f(before), updatedAt: new Date().toISOString() };
  if (gateHook && !gateHook(id, before, after)) return;
  set({ trips: state.trips.map(t => (t.id === id ? after : t)) });
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

/** Opens a trip from a file (model/tripFile.ts). A trip already here is updated, through patchTrip
    so a shared one sends the update to the group. */
export function importTrip(t: Trip) {
  const have = state.trips.find(x => x.id === t.id);
  if (!have) return addTrip(t);
  patchTrip(t.id, h => updateFromFile(h, t));
  set({ activeId: t.id });
}

/** Removes a trip from this phone (a shared trip stays online for everyone else). */
export function deleteTrip(id: string) {
  const sync = { ...state.sync }; delete sync[id];
  set({ trips: state.trips.filter(t => t.id !== id), activeId: state.activeId === id ? null : state.activeId, sync });
}

export const setMe = (me: string) => set({ me: me.trim() });

/* The Japan edition sends ticks and group notes on to the sheet (sheet/live.ts, App.tsx). */
let todoHook: ((tripId: string, todoId: string, done: boolean) => void) | null = null;
let noteHook: ((tripId: string, note: Note) => void) | null = null;
export const onTodoToggle = (f: typeof todoHook) => { todoHook = f; };
export const onNoteAdd = (f: typeof noteHook) => { noteHook = f; };

/** Replaces a trip with a newer copy from elsewhere (the Japan sheet), without counting it as an edit. */
export function replaceTrip(t: Trip) {
  const have = state.trips.some(x => x.id === t.id);
  set({ trips: have ? state.trips.map(x => (x.id === t.id ? t : x)) : [...state.trips, t], activeId: t.id });
}

export function toggleTodo(tripId: string, todoId: string, as?: string) {
  const was = state.trips.find(t => t.id === tripId)?.todos.find(x => x.id === todoId);
  if (was) todoHook?.(tripId, todoId, !was.done);
  patchTrip(tripId, t => tick(t, todoId, state.me, as));
}

/** Adds a group note and returns its id, or '' when there was nothing to add. */
export function addNote(tripId: string, text: string): string {
  const clean = text.replace(/[ \t]+/g, ' ').trim().slice(0, 600);
  if (!clean) return '';
  const id = newId('n');
  patchTrip(tripId, t => ({
    ...t,
    notes: [...t.notes, { id, author: state.me || 'Me', text: clean, at: new Date().toISOString(), done: false }],
  }));
  const note = state.trips.find(t => t.id === tripId)?.notes.find(n => n.id === id);
  if (note) noteHook?.(tripId, note);
  return id;
}

/** Changes a note's wording; the app offers it only to whoever wrote it. */
export function editNote(tripId: string, noteId: string, text: string): boolean {
  const clean = text.replace(/[ \t]+/g, ' ').trim().slice(0, 600);
  if (!clean) return false;
  patchTrip(tripId, t => ({ ...t, notes: t.notes.map(n => (n.id === noteId ? { ...n, text: clean, edited: new Date().toISOString() } : n)) }));
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
