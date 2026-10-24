/* Asking Claude to file a group note, through the file-note Edge Function.

   The function only suggests changes; they are made here through patchTrip, like anyone's edits,
   so on a shared trip the rule decides what goes straight in and what becomes a request (see
   model/filing.ts). What was filed is shown under the note until the app closes, with Undo. */
import { sendWaiting } from './files';
import { useSyncExternalStore } from 'react';
import { getState, patchTrip } from '../model/store';
import { addPart, hasPlanPart, planIsIn, planPart, prepareFiling, undoFiling, type Filed, type Filing } from '../model/filing';
import { supabase } from './engine';
import { findPins } from './maptiler';

export type NoteFiling =
  | { state: 'busy' }
  | { state: 'filed'; filed: Filed; added: string[]; planned: string[]; waiting: boolean; left?: number }
  | { state: 'error'; message: string };

let filings: Record<string, NoteFiling> = {};
const listeners = new Set<() => void>();
function set(noteId: string, f: NoteFiling | null) {
  filings = { ...filings };
  if (f) filings[noteId] = f; else delete filings[noteId];
  listeners.forEach(l => l());
}

export function useFilings(): Record<string, NoteFiling> {
  return useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l); }, () => filings);
}

/** Whether Claude can file notes on this trip for you: it is shared, you are signed in, and you can edit it. */
export function canFile(tripId: string, signedIn: boolean): boolean {
  const info = getState().sync[tripId];
  return signedIn && !!info && info.role !== 'viewer';
}

/** Sends one note to Claude and files what comes back. */
export async function fileNote(tripId: string, noteId: string): Promise<void> {
  const note = getState().trips.find(t => t.id === tripId)?.notes.find(n => n.id === noteId);
  if (!note || filings[noteId]?.state === 'busy') return;
  set(noteId, { state: 'busy' });
  /* a screenshot has to be in the trip's storage before Claude can read it */
  if (note.image) await sendWaiting();
  const { data, error } = await supabase.functions.invoke<Filing & { left?: number }>('file-note', {
    body: { trip_id: tripId, note: { text: note.text, author: note.author, ...(note.image ? { image: note.image.path } : {}) } },
  });
  if (error || !data) return set(noteId, { state: 'error', message: await errorText(error) });

  const trip = getState().trips.find(t => t.id === tripId);
  if (!trip?.notes.some(n => n.id === noteId)) return set(noteId, null);
  const x = prepareFiling(trip, noteId, data);
  patchTrip(tripId, t => addPart(t, x));
  if (hasPlanPart(x)) patchTrip(tripId, t => planPart(t, x));
  const now = getState().trips.find(t => t.id === tripId);
  set(noteId, { state: 'filed', filed: x, added: x.added, planned: x.planned, waiting: hasPlanPart(x) && !!now && !planIsIn(now, x), left: data.left });
  /* a place it added goes on the map now, not only when the Map page next opens */
  if (now && x.places.length) void findPins(now);
}

/** Takes back what Claude filed for a note and reopens it. */
export function undoFile(tripId: string, noteId: string) {
  const f = filings[noteId];
  if (f?.state !== 'filed') return;
  patchTrip(tripId, t => undoFiling(t, f.filed));
  set(noteId, null);
}

export const dismissFiling = (noteId: string) => set(noteId, null);

async function errorText(e: unknown): Promise<string> {
  /* the function says what went wrong in its JSON body */
  const res = (e as { context?: Response })?.context;
  if (res?.status === 404) return 'Filing notes is not set up yet.';
  if (res && typeof res.json === 'function') {
    try { const b = await res.clone().json() as { message?: string }; if (b?.message) return b.message; } catch { /* not JSON */ }
  }
  const m = (e as { message?: string })?.message || '';
  if (/failed to (send|fetch)|network/i.test(m)) return 'No connection. Try again when you have signal.';
  return 'This note could not be filed. Try again later.';
}
