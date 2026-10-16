/* Who may change what on a shared trip, and requests for changes that need the owner's OK.

   The owner picks a rule for the trip:
   - open: everyone changes everything directly
   - approve (the default): anyone can add ideas, places, to-dos and notes and tick things off;
     removing anything, or changing the plan itself (days, times, travel, stays, which day a
     place is on, the trip's name, dates and destinations), becomes a request
   - all: every change by someone else is a request, except leaving a note

   On top of the rule, each person has a role. Owners and organizers change everything directly
   and decide requests; viewers only leave notes.

   supabase/schema.sql enforces the same rule on every save (change_needs_approval), so these
   functions decide what the app offers, and the database makes sure of it. Keep the two in step. */
import type { Trip } from './types';
import { merge3, same } from './merge';
import { longDate, fmtHM } from './time';

export type Rule = 'open' | 'approve' | 'all';
export type Role = 'owner' | 'organizer' | 'editor' | 'viewer';

export const RULES: { value: Rule; label: string; hint: string }[] = [
  { value: 'approve', label: 'Approve changes', hint: 'Anyone can add ideas, places, to-dos and notes. Removing things or changing the plan (days, times, travel, stays) waits for your OK.' },
  { value: 'open', label: 'Open', hint: 'Everyone on the trip changes anything, straight away.' },
  { value: 'all', label: 'Approve everything', hint: 'Every change by someone else waits for your OK. Notes still go straight in.' },
];
export const ROLES: { value: Exclude<Role, 'owner'>; label: string; hint: string }[] = [
  { value: 'organizer', label: 'Organizer', hint: 'Changes anything and approves requests.' },
  { value: 'editor', label: 'Editor', hint: 'Follows the trip rule.' },
  { value: 'viewer', label: 'Viewer', hint: 'Sees everything, leaves notes.' },
];

export const canDecide = (role: Role) => role === 'owner' || role === 'organizer';

/** Parts of a trip anyone may add to under the approve rule. Everything else is the plan. */
const OPEN_KEYS = ['notes', 'todos', 'todoGroups', 'places'] as const;

type Verdict = 'ok' | 'request' | 'blocked';

/** What happens to an edit from someone with this role, on a trip with this rule. */
export function verdict(before: Trip, after: Trip, rule: Rule, role: Role): Verdict {
  if (canDecide(role) || (rule === 'open' && role === 'editor')) return 'ok';
  if (!needsApproval(before, after, role === 'viewer' ? 'all' : rule)) return 'ok';
  return role === 'viewer' ? 'blocked' : 'request';
}

/** True when the edit goes beyond what the rule lets anyone do directly. Mirrors change_needs_approval in schema.sql. */
export function needsApproval(before: Trip, after: Trip, rule: Rule): boolean {
  if (rule === 'open') return false;
  const free: readonly string[] = rule === 'all' ? ['notes'] : OPEN_KEYS;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    if (k === 'updatedAt' || free.includes(k)) continue;
    if (!same(before[k as keyof Trip], after[k as keyof Trip])) return true;
  }
  if (lost(before.notes, after.notes)) return true;
  if (rule === 'all') return false;
  if (lost(before.todos, after.todos) || lost(before.places, after.places)) return true;
  if ((before.todoGroups || []).some(g => !(after.todoGroups || []).includes(g))) return true;
  /* putting a place on a day, or taking it off one, changes the plan */
  const was = new Map((before.places || []).map(p => [p.id, p.dayIds || []]));
  return (after.places || []).some(p => !same(was.get(p.id) || [], p.dayIds || []));
}

const lost = (a: { id: string }[] = [], b: { id: string }[] = []) => a.some(x => !b.some(y => y.id === x.id));

/* ---------- requests ---------- */

/** A change waiting for approval: just the parts of the trip it touches, before and after. */
export interface Change { before: Partial<Trip>; after: Partial<Trip>; summary: string[] }

export function changeOf(before: Trip, after: Trip): Change {
  const b: Partial<Trip> = {}, a: Partial<Trip> = {};
  new Set([...Object.keys(before), ...Object.keys(after)]).forEach(k => {
    const key = k as keyof Trip;
    if (key === 'updatedAt' || same(before[key], after[key])) return;
    (b as Record<string, unknown>)[key] = before[key];
    (a as Record<string, unknown>)[key] = after[key];
  });
  return { before: b, after: a, summary: describe(before, after) };
}

/** The trip with an approved change made on top of it, keeping whatever else changed meanwhile. */
export function applyChange(current: Trip, c: Pick<Change, 'before' | 'after'>): Trip {
  const base = { ...current, ...c.before } as Trip, mine = { ...current, ...c.after } as Trip;
  return merge3(base, mine, current);
}

/* ---------- describing a change in words ---------- */

const q = (s: string) => `“${s.length > 60 ? s.slice(0, 57) + '…' : s}”`;

/** One line per thing changed, e.g. "Mon Nov 3: move “Fushimi Inari” from 9:00 AM to 7:00 AM". */
export function describe(before: Trip, after: Trip): string[] {
  const out: string[] = [];
  if (before.name !== after.name) out.push(`Rename the trip to ${q(after.name)}`);
  if ((before.days[0]?.date || '') !== (after.days[0]?.date || '') && before.days.length && after.days.length)
    out.push(`Move the trip to start ${longDate(after.days[0].date)}`);
  if (!same(before.travelers, after.travelers)) out.push(`Change who's going to ${after.travelers.join(', ') || 'nobody'}`);
  if (before.phrasePack !== after.phrasePack) out.push('Change the phrase language');
  list(out, before.destinations, after.destinations, d => d.name || 'a destination', 'destination');

  const dayName = (id: string) => { const d = after.days.find(x => x.id === id) || before.days.find(x => x.id === id); return d ? longDate(d.date) : 'a day'; };
  const B = new Map(before.days.map(d => [d.id, d]));
  after.days.forEach(d => { if (!B.has(d.id)) out.push(`Add a day (${longDate(d.date)})`); });
  before.days.forEach(d => { if (!after.days.some(x => x.id === d.id)) out.push(`Delete ${longDate(d.date)}${d.title ? ` (${d.title})` : ''}`); });
  after.days.forEach(d => {
    const o = B.get(d.id); if (!o) return;
    const at = longDate(d.date), P = new Map(o.plan.map(p => [p.id, p]));
    d.plan.forEach(p => {
      const w = P.get(p.id);
      if (!w) return out.push(`${at}: add ${q(p.text)}${p.time ? ` at ${fmtHM(p.time)}` : ''}`);
      if ((w.time || '') !== (p.time || '')) return out.push(`${at}: move ${q(p.text)} ${w.time ? `from ${fmtHM(w.time)} ` : ''}to ${p.time ? fmtHM(p.time) : 'no set time'}`);
      if (!same(w, p)) out.push(`${at}: change ${q(p.text)}`);
    });
    o.plan.forEach(p => { if (!d.plan.some(x => x.id === p.id)) out.push(`${at}: remove ${q(p.text)}`); });
    const { plan: _a, date: _b, ...rest } = d, { plan: _c, date: _d, ...was } = o;
    if (!same(rest, was)) {
      if (d.stayId !== o.stayId) out.push(`${at}: change where you stay`);
      else if (d.destinationId !== o.destinationId) out.push(`${at}: change the destination`);
      else out.push(`${at}: change the day's details`);
    }
  });

  list(out, before.legs, after.legs, l => `${l.from} → ${l.to}`, 'travel');
  list(out, before.places, after.places, p => p.name, 'place');
  const W = new Map(before.places.map(p => [p.id, p.dayIds || []]));
  after.places.forEach(p => {
    const was = W.get(p.id); if (!was) return;
    (p.dayIds || []).filter(id => !was.includes(id)).forEach(id => out.push(`Put ${q(p.name)} on ${dayName(id)}`));
    was.filter(id => !(p.dayIds || []).includes(id)).forEach(id => out.push(`Take ${q(p.name)} off ${dayName(id)}`));
  });
  list(out, before.todos, after.todos, t => t.text, 'to-do');
  before.notes.forEach(n => { if (!after.notes.some(x => x.id === n.id)) out.push(`Delete the note ${q(n.text)}`); });
  after.notes.forEach(n => { if (!before.notes.some(x => x.id === n.id)) out.push(`Add the note ${q(n.text)}`); });
  list(out, before.guides, after.guides, g => g.title, 'guide');
  return out.length ? out : ['Change the trip'];
}

/** Lines for things added, deleted or changed in a list. */
function list<T extends { id: string }>(out: string[], b: T[] = [], a: T[] = [], name: (x: T) => string, what: string) {
  const B = new Map(b.map(x => [x.id, x]));
  a.forEach(x => {
    const w = B.get(x.id);
    if (!w) out.push(`Add ${what} ${q(name(x))}`);
    else if (!same(w, x) && !(what === 'place' && same({ ...w, dayIds: undefined }, { ...x, dayIds: undefined }))) out.push(`Change ${what} ${q(name(x))}`);
  });
  b.forEach(x => { if (!a.some(y => y.id === x.id)) out.push(`Delete ${what} ${q(name(x))}`); });
}
