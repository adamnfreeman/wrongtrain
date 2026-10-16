/* Trip files: a trip saved as JSON, opened with "Open a trip file" on the welcome screen. The Japan
   2026 sheet becomes one through legacy/to-app.mjs. Opening a newer file of a trip you already
   have updates it, keeping what was added in the app (ticks, notes, wallet, money). */
import type { Trip } from './types';
import { addDays } from './time';

/** Reads a trip file: { wrongtrain: 1, trip } or a bare trip. Throws a sentence to show. */
export function readTripFile(text: string): Trip {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('That file is not a trip file.'); }
  const t = ((data as { trip?: unknown })?.trip ?? data) as Partial<Trip>;
  if (!t || typeof t !== 'object' || typeof t.id !== 'string' || typeof t.name !== 'string' || !Array.isArray(t.days) || !t.days.length) {
    throw new Error('That file is not a trip file.');
  }
  /* days are always consecutive dates (model/edit.ts relies on it) */
  for (let i = 1; i < t.days.length; i++) {
    if (t.days[i].date !== addDays(t.days[i - 1].date, 1)) throw new Error(`The days in that file skip a date after ${t.days[i - 1].date}.`);
  }
  const now = new Date().toISOString();
  return {
    travelers: [], destinations: [], legs: [], places: [], todoGroups: [], todos: [], notes: [], guides: [],
    createdAt: now, ...t, updatedAt: now, sample: undefined,
  } as Trip;
}

/** A newer file of a trip already on the phone: the plan comes from the file; what people added in
    the app stays. */
export function updateFromFile(have: Trip, file: Trip): Trip {
  const done = new Map(have.todos.map(t => [t.id, t]));
  const noteIds = new Set(file.notes.map(n => n.id));
  return {
    ...file,
    createdAt: have.createdAt,
    travelers: have.travelers.length ? have.travelers : file.travelers,
    todos: file.todos.map(t => { const h = done.get(t.id); return h?.done ? { ...t, done: true, doneBy: h.doneBy } : t; }),
    notes: [...file.notes, ...have.notes.filter(n => !noteIds.has(n.id))],
    docs: have.docs, expenses: have.expenses, settlements: have.settlements, venmo: have.venmo,
    currency: have.currency || file.currency,
  };
}
