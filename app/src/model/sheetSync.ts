/* Bringing the Japan 2026 Google Sheet into the trip in the full app (Trip page, "Update from the
   Google Sheet"). Friends still add to the sheet; this pulls their additions in without losing
   what was added in the app.

   It is a three-way merge (merge3), like two phones' edits: the base is what the sheet said last
   time it was pulled in. The first time there is no such copy, so the base is made from the app's
   own trip, kept to the items the sheet also has: items both have take the sheet's version, items
   only the app has (places Claude filed, the wallet, notes, ticks, who's going) stay, and items
   only the sheet has are added. Things the app keeps and the sheet doesn't know about at all are
   carried over as they are. */
import type { Trip } from './types';
import { merge3 } from './merge';

type O = Record<string, unknown>;
const isObj = (v: unknown): v is O => typeof v === 'object' && v !== null && !Array.isArray(v);
const withIds = (a: unknown): a is { id: string }[] => Array.isArray(a) && a.every(x => isObj(x) && typeof x.id === 'string');

/** local, kept to what sheet also has: lists of items keep only the items the sheet has too, deeply. */
function shared(local: unknown, sheet: unknown): unknown {
  if (withIds(local) && withIds(sheet)) {
    const theirs = new Map(sheet.map(x => [x.id, x]));
    return local.filter(x => theirs.has(x.id)).map(x => shared(x, theirs.get(x.id)));
  }
  if (isObj(local) && isObj(sheet)) return Object.fromEntries(Object.entries(local).map(([k, v]) => [k, k in sheet ? shared(v, sheet[k]) : v]));
  return local;
}

export function updateFromSheet(local: Trip, sheet: Trip, lastSheet?: Trip | null): Trip {
  /* the sheet knows nothing of the app's own parts: carry them over, so they don't read as removed */
  const remote = { ...sheet } as unknown as O;
  for (const [k, v] of Object.entries(local)) if (!(k in remote) || remote[k] === undefined) remote[k] = v;
  for (const k of ['docs', 'expenses', 'settlements', 'venmo', 'going', 'tastes', 'currency', 'phrasePack'] as const) if ((local as unknown as O)[k] !== undefined) remote[k] = (local as unknown as O)[k];
  const base = lastSheet ? ({ ...remote, ...lastSheet } as unknown as Trip) : (shared(local, sheet) as Trip);
  return { ...merge3(base, local, remote as unknown as Trip), id: local.id, createdAt: local.createdAt };
}
