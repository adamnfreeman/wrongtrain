/* The Japan edition's link to the Japan 2026 sheet, through the same Apps Script web app the Japan
   page at wrongtrain.lol uses: sign in with the name and passcode people already have, read the
   sheet (with the page's own parser), and send ticks and group notes back to it. The sheet stays
   the one place the plan is changed; this keeps a copy on the phone for when there's no signal. */
import { parseTrip } from 'virtual:parse-trip';
import { toTrip, TRIP_ID } from './sheetTrip.js';
import type { Note, Trip } from '../model/types';

export const LIVE_URL = 'https://script.google.com/macros/s/AKfycbwomx2AxfD05jvfIOhGDbaSaeL_-oBOonTAgQfSOFDpyI-G7Ptrugr_mciUOW81vUbe/exec';
export const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1wwep3wajMXaMjp2RDtYWxsXL856zxeuIrBVNWeJo724/edit';
export { TRIP_ID };

export interface Creds { name: string; code: string }
const KEY = 'wt-japan-auth';

/* The old Japan page (same site, before this edition took its place) kept the sign-in as
   "trip-auth" and the last copy of the sheet as "trip-raw". Reading them means nobody has to
   sign in again, and the trip shows even when the first open after the swap has no signal. */
const OLD_AUTH = 'trip-auth', OLD_RAW = 'trip-raw';
const readJSON = (k: string) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };

export function savedCreds(): Creds | null {
  const c = readJSON(KEY) || readJSON(OLD_AUTH);
  return c?.name && c?.code ? { name: String(c.name), code: String(c.code) } : null;
}

/** The trip from the old page's saved copy of the sheet, if there is one. */
export function oldPageTrip(): Trip | null {
  const raw = readJSON(OLD_RAW);
  if (!raw || !Array.isArray(raw.tabs)) return null;
  try { const parsed = parseTrip(raw); return parsed.days.length ? toTrip(parsed) : null; } catch { return null; }
}
export function saveCreds(c: Creds | null) {
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify(c));
    else { localStorage.removeItem(KEY); localStorage.removeItem(OLD_AUTH); localStorage.removeItem(OLD_RAW); }
  } catch { /* ignore */ }
}

/** Plain-words trouble, for the screen. kind 'signin' means the name and passcode no longer work. */
export class SheetError extends Error {
  kind: 'signin' | 'locked' | 'offline' | 'other';
  constructor(kind: SheetError['kind'], message: string) { super(message); this.kind = kind; }
}

/* Apps Script answers a plain GET; the page falls back to JSONP when a browser blocks that, so
   this does too. Google's servers now and then answer 404 or 5xx for a moment: one more try. */
function jsonp(url: string): Promise<unknown> {
  return new Promise((res, rej) => {
    const cb = '__wt' + Date.now() + Math.floor(Math.random() * 1e4), s = document.createElement('script');
    const w = window as unknown as Record<string, unknown>;
    const done = () => { clearTimeout(timer); try { delete w[cb]; } catch { /* ignore */ } s.remove(); };
    const timer = setTimeout(() => { done(); rej(new Error('timeout')); }, 25000);
    w[cb] = (d: unknown) => { done(); res(d); };
    s.onerror = () => { done(); rej(new Error('load')); };
    s.src = url + '&callback=' + cb;
    document.head.appendChild(s);
  });
}
async function call(creds: Creds, params: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const u = `${LIVE_URL}?${new URLSearchParams({ t: String(Date.now()), name: creds.name, code: creds.code, ...params })}`;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(u, { redirect: 'follow' });
      if (r.ok) return await r.json();
    } catch { /* blocked or offline: try JSONP below */ }
    try { return (await jsonp(u)) as Record<string, unknown>; } catch { /* try once more */ }
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new SheetError('offline', navigator.onLine === false ? 'No signal. Showing the trip as last loaded.' : 'Could not reach the sheet. Try again in a minute.');
}
function failed(r: Record<string, unknown>): SheetError | null {
  if (r.ok !== false) return null;
  if (r.error === 'locked') return new SheetError('locked', 'Too many tries for that name. Wait ten minutes and try again.');
  if (r.error === 'signin' || r.error === 'auth' || !r.error) return new SheetError('signin', 'That name and passcode do not match.');
  return new SheetError('other', String(r.error));
}

/** Reads the sheet and makes it a trip. Throws a SheetError. */
export async function loadTrip(creds: Creds): Promise<Trip> {
  const raw = await call(creds);
  const bad = failed(raw); if (bad) throw bad;
  if (!Array.isArray(raw.tabs)) throw new SheetError('other', 'The sheet answered, but without the trip.');
  const parsed = parseTrip(raw);
  if (!parsed.days.length) throw new SheetError('other', 'Signed in, but the sheet has no day tabs to show.');
  return toTrip(parsed);
}

/** Ticks a to-do on the sheet's To Do tab. The row is in the to-do's id ("t-row-12"). */
export async function tickOnSheet(creds: Creds, todoId: string, text: string, done: boolean) {
  const row = /^t-row-(\d+)$/.exec(todoId)?.[1];
  if (!row) throw new SheetError('other', 'That to-do is not on the sheet.');
  const r = await call(creds, { action: 'check', row, text, done: done ? '1' : '0' });
  const bad = failed(r); if (bad) throw bad;
}

/** Adds a group note to the sheet's Group Notes tab, where it is filed within the hour. */
export async function noteOnSheet(creds: Creds, text: string) {
  const r = await call(creds, { action: 'note', text });
  const bad = failed(r); if (bad) throw bad;
  if (!r.noted) throw new SheetError('other', 'The sheet did not take the note.');
}

/* A tick or note made on this phone shows at once; a refresh that started before the sheet saved
   it must not undo it. So for a short while, what this phone did wins over the sheet's copy. */
const WAIT = 60_000;
const pendingTicks = new Map<string, { done: boolean; at: number }>();
const pendingNotes: { note: Note; at: number }[] = [];
export const rememberTick = (id: string, done: boolean) => pendingTicks.set(id, { done, at: Date.now() });
export const forgetTick = (id: string) => pendingTicks.delete(id);
export const rememberNote = (note: Note) => pendingNotes.push({ note, at: Date.now() });

/** The sheet's trip, with this phone's recent ticks and notes laid over it. */
export function withPending(t: Trip): Trip {
  const now = Date.now();
  for (const [k, v] of pendingTicks) if (now - v.at > WAIT) pendingTicks.delete(k);
  while (pendingNotes.length && now - pendingNotes[0].at > WAIT) pendingNotes.shift();
  const texts = new Set(t.notes.map(n => n.text.trim()));
  return {
    ...t,
    todos: t.todos.map(x => { const p = pendingTicks.get(x.id); return p ? { ...x, done: p.done } : x; }),
    notes: [...t.notes, ...pendingNotes.map(p => p.note).filter(n => !texts.has(n.text.trim()))],
  };
}
