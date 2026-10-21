/* Group notes filed by Claude: turning what the file-note function sends back into trip edits.

   Claude's answer is checked here before anything touches the trip: only ids the trip has, only
   the place kinds and times the app understands, nothing already on the trip. The edits are split
   in two, so the trip rule (rules.ts) treats them the way it treats anyone's edits:
   - additions: new places (not yet on any day), to-dos and to-do groups, and the note marked
     dealt with. Under the default rule these go straight in.
   - the plan: putting places on days, adding or changing plan items, travel and where people
     stay. For someone who "can add ideas" these become a request for the owner; for everyone who
     "can change anything" (the default) they go straight in.
   Coordinates are left unset: Claude's guesses are not reliable enough to pin on a map. */
import type { Filing } from '../../supabase/functions/_shared/filing.ts';
import { LEG_MODES, PLACE_KINDS } from '../../supabase/functions/_shared/filing.ts';
import type { Leg, PlanItem, Place, Todo, Trip } from './types';
import { newId, sortPlan, deletePlace } from './edit';
import { fmtHM, longDate } from './time';

export type { Filing };

/** One filed note, ready to apply in two parts and to undo. */
export interface Filed {
  noteId: string;
  /** New places, without days: the days go in with the plan part. */
  places: Place[];
  placeDays: { id: string; dayIds: string[] }[];
  todos: Todo[];
  /** To-do groups the trip did not have yet. */
  groups: string[];
  plan: { dayId: string; item: PlanItem }[];
  /** New travel, and changes to travel the trip has (with the leg as it was, for undo). */
  legs: Leg[];
  legEdits: { before: Leg; after: Leg }[];
  /** Where people sleep, with what it was before. */
  stays: { dayId: string; placeId: string; was?: string }[];
  /** Changes to plan items already on a day: after is null when the item is taken off. */
  planEdits: { dayId: string; before: PlanItem; after: PlanItem | null }[];
  reply: string;
  done: boolean;
  /** What was filed, in words, for the additions and for the plan. */
  added: string[];
  planned: string[];
}

const clean = (s: string | null | undefined, n: number) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const clock = (s: string | null) => (s && /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : undefined);
const q = (s: string) => `“${s}”`;

/** Checks Claude's answer against the trip and gives each new thing an id. */
export function prepareFiling(trip: Trip, noteId: string, f: Filing): Filed {
  const days = new Set(trip.days.map(d => d.id));
  const dest = new Map(trip.destinations.map(d => [d.id, d.name]));
  const have = new Set(trip.places.map(p => `${p.name.toLowerCase()}|${p.destinationId || ''}`));
  const keys = new Map<string, string>();
  const out: Filed = { noteId, places: [], placeDays: [], todos: [], groups: [], plan: [], legs: [], legEdits: [], stays: [], planEdits: [], reply: clean(f.reply, 400), done: !!f.done, added: [], planned: [] };

  for (const c of f.changes) {
    if (c.type !== 'place') continue;
    const name = clean(c.name, 120);
    const destinationId = c.destinationId && dest.has(c.destinationId) ? c.destinationId : undefined;
    const sig = `${name.toLowerCase()}|${destinationId || ''}`;
    if (!name || have.has(sig)) continue;
    have.add(sig);
    const dayIds = [...new Set(c.dayIds.filter(id => days.has(id)))];
    const area = clean(c.area, 80), notes = clean(c.notes, 400), link = clean(c.link, 300);
    const p: Place = {
      id: newId('p'), name, kind: (PLACE_KINDS as readonly string[]).includes(c.kind) ? c.kind : 'other',
      ...(destinationId ? { destinationId } : {}), ...(area ? { area } : {}), ...(notes ? { notes } : {}),
      ...(/^https?:\/\//i.test(link) ? { link } : {}),
      /* an idea until the plan part puts it on a day, which may wait for the owner */
      wishlist: true,
    };
    if (c.key) keys.set(c.key, p.id);
    out.places.push(p);
    out.added.push(`Added ${q(name)} to ${dayIds.length ? 'places' : 'ideas'}${destinationId ? ` in ${dest.get(destinationId)}` : ''}`);
    if (dayIds.length) {
      out.placeDays.push({ id: p.id, dayIds });
      dayIds.forEach(id => out.planned.push(`Put ${q(name)} on ${longDate(trip.days.find(d => d.id === id)!.date)}`));
    }
  }

  const groups = new Set(trip.todoGroups);
  const todos = new Set(trip.todos.map(t => t.text.toLowerCase()));
  for (const c of f.changes) {
    if (c.type !== 'todo') continue;
    const text = clean(c.text, 200), group = clean(c.group, 60) || trip.todoGroups[0] || 'Before the trip';
    if (!text || todos.has(text.toLowerCase())) continue;
    todos.add(text.toLowerCase());
    if (!groups.has(group)) { groups.add(group); out.groups.push(group); }
    const details = clean(c.details, 400), when = clean(c.when, 60);
    out.todos.push({ id: newId('t'), group, text, ...(details ? { details } : {}), ...(when ? { when } : {}), done: false });
    out.added.push(`Added the to-do ${q(text)} (${group})`);
  }

  const placeIds = new Set(trip.places.map(p => p.id));
  for (const c of f.changes) {
    if (c.type !== 'plan' || !days.has(c.dayId)) continue;
    const text = clean(c.text, 200);
    if (!text) continue;
    const time = clock(c.time), end = clock(c.end);
    const placeId = c.placeId ? (placeIds.has(c.placeId) ? c.placeId : keys.get(c.placeId)) : undefined;
    const item: PlanItem = { id: newId('i'), text, ...(time ? { time } : {}), ...(time && end ? { end } : {}), ...(c.fixed ? { fixed: true } : {}), ...(placeId ? { placeId } : {}) };
    out.plan.push({ dayId: c.dayId, item });
    out.planned.push(`${longDate(trip.days.find(d => d.id === c.dayId)!.date)}: add ${q(text)}${time ? ` at ${fmtHM(time)}` : ''}`);
  }

  const dateOf = (id: string) => longDate(trip.days.find(d => d.id === id)!.date);
  for (const c of f.changes) {
    if (c.type !== 'planEdit' || !days.has(c.dayId)) continue;
    const before = trip.days.find(d => d.id === c.dayId)!.plan.find(i => i.id === c.itemId);
    if (!before || out.planEdits.some(e => e.before.id === before.id)) continue;
    if (c.remove) {
      out.planEdits.push({ dayId: c.dayId, before, after: null });
      out.planned.push(`${dateOf(c.dayId)}: take off ${q(before.text)}`);
      continue;
    }
    const text = clean(c.text, 200), time = clock(c.time), end = clock(c.end);
    const after: PlanItem = { ...before, ...(text ? { text } : {}), ...(time ? { time } : {}), ...(time && end ? { end } : end ? { end } : {}) };
    if (JSON.stringify(after) === JSON.stringify(before)) continue;
    out.planEdits.push({ dayId: c.dayId, before, after });
    out.planned.push(`${dateOf(c.dayId)}: ${time && time !== before.time ? `move ${q(before.text)} to ${fmtHM(time)}` : `change ${q(before.text)}`}`);
  }

  const legIds = new Map(trip.legs.map(l => [l.id, l]));
  for (const c of f.changes) {
    if (c.type !== 'leg') continue;
    const from = clean(c.from, 80), to = clean(c.to, 80);
    if (!from || !to) continue;
    const dayId = c.dayId && days.has(c.dayId) ? c.dayId : undefined;
    const details = clean(c.details, 400), depart = clock(c.depart), arrive = clock(c.arrive);
    const fields = {
      from, to, mode: (LEG_MODES as readonly string[]).includes(c.mode) ? c.mode : 'other', how: clean(c.how, 160),
      status: (['booked', 'todo', 'none'] as const).includes(c.status) ? c.status : 'todo',
      ...(dayId ? { dayId } : {}), ...(depart ? { depart } : {}), ...(arrive ? { arrive } : {}), ...(details ? { details } : {}),
    } as const;
    const was = c.legId ? legIds.get(c.legId) : undefined;
    if (was) {
      if (out.legEdits.some(e => e.before.id === was.id)) continue;
      const { statusText: _s, ...rest } = was;
      out.legEdits.push({ before: was, after: { ...rest, ...fields } as Leg });
      out.planned.push(`Update travel ${q(`${was.from} → ${was.to}`)}`);
    } else {
      out.legs.push({ id: newId('l'), ...fields } as Leg);
      out.planned.push(`Add travel ${q(`${from} → ${to}`)}${dayId ? ` on ${dateOf(dayId)}` : ''}`);
    }
  }

  for (const c of f.changes) {
    if (c.type !== 'stay') continue;
    const placeId = placeIds.has(c.placeId) ? c.placeId : keys.get(c.placeId);
    if (!placeId) continue;
    const name = trip.places.find(p => p.id === placeId)?.name || out.places.find(p => p.id === placeId)?.name || 'there';
    for (const dayId of new Set(c.dayIds.filter(id => days.has(id)))) {
      const was = trip.days.find(d => d.id === dayId)!.stayId;
      if (was === placeId || out.stays.some(x => x.dayId === dayId)) continue;
      out.stays.push({ dayId, placeId, ...(was ? { was } : {}) });
      out.planned.push(`${dateOf(dayId)}: stay at ${q(name)}`);
    }
  }
  return out;
}

/** The additions, and the note marked dealt with (or left open, with Claude's reason). */
export function addPart(trip: Trip, x: Filed): Trip {
  return {
    ...trip,
    places: [...trip.places, ...x.places.filter(p => !trip.places.some(o => o.id === p.id))],
    todoGroups: [...trip.todoGroups, ...x.groups.filter(g => !trip.todoGroups.includes(g))],
    todos: [...trip.todos, ...x.todos.filter(t => !trip.todos.some(o => o.id === t.id))],
    notes: trip.notes.map(n => (n.id === x.noteId ? { ...n, done: n.done || x.done, filed: x.reply || undefined, made: [...x.added, ...x.planned].length ? [...x.added, ...x.planned] : undefined } : n)),
  };
}

export const hasPlanPart = (x: Filed) =>
  x.placeDays.length > 0 || x.plan.length > 0 || (x.legs ?? []).length > 0 || (x.legEdits ?? []).length > 0 || (x.stays ?? []).length > 0 || (x.planEdits ?? []).length > 0;

/** Places put on days, plan items added and changed, travel and stays. Leaves out anything
    pointing at a place the trip does not have. */
export function planPart(trip: Trip, x: Filed): Trip {
  const ids = new Set(trip.places.map(p => p.id));
  const on = new Map(x.placeDays.map(p => [p.id, p.dayIds]));
  const legEdit = new Map((x.legEdits ?? []).map(e => [e.after.id, e.after]));
  return {
    ...trip,
    places: trip.places.map(p => (on.has(p.id) ? { ...p, wishlist: undefined, dayIds: [...new Set([...(p.dayIds || []), ...on.get(p.id)!])] } : p)),
    days: trip.days.map(d => {
      const add = x.plan.filter(a => a.dayId === d.id && !d.plan.some(i => i.id === a.item.id))
        .map(a => (a.item.placeId && !ids.has(a.item.placeId) ? { ...a.item, placeId: undefined } : a.item));
      const edits = (x.planEdits ?? []).filter(e => e.dayId === d.id);
      const stay = (x.stays ?? []).find(s => s.dayId === d.id && ids.has(s.placeId));
      if (!add.length && !edits.length && !stay) return d;
      let plan = d.plan;
      for (const e of edits) plan = e.after ? plan.map(i => (i.id === e.before.id ? e.after! : i)) : plan.filter(i => i.id !== e.before.id);
      return { ...d, plan: sortPlan([...plan, ...add]), ...(stay ? { stayId: stay.placeId } : {}) };
    }),
    legs: [...trip.legs.map(l => legEdit.get(l.id) || l), ...(x.legs ?? []).filter(l => !trip.legs.some(o => o.id === l.id))],
  };
}

/** True when the plan part is in the trip (rather than waiting for approval). */
export const planIsIn = (trip: Trip, x: Filed) =>
  x.plan.every(a => trip.days.some(d => d.plan.some(i => i.id === a.item.id)))
  && x.placeDays.every(pd => trip.places.some(p => p.id === pd.id && pd.dayIds.every(id => p.dayIds?.includes(id))))
  && (x.legs ?? []).every(l => trip.legs.some(o => o.id === l.id))
  && (x.legEdits ?? []).every(e => JSON.stringify(trip.legs.find(o => o.id === e.after.id)) === JSON.stringify(e.after))
  && (x.stays ?? []).every(s => trip.days.find(d => d.id === s.dayId)?.stayId === s.placeId)
  && (x.planEdits ?? []).every(e => { const i = trip.days.find(d => d.id === e.dayId)?.plan.find(p => p.id === e.before.id); return e.after ? JSON.stringify(i) === JSON.stringify(e.after) : !i; });

/** Takes back everything one filing added, and reopens the note. */
export function undoFiling(trip: Trip, x: Filed): Trip {
  let t = trip;
  x.places.forEach(p => { if (t.places.some(o => o.id === p.id)) t = deletePlace(t, p.id); });
  const items = new Set(x.plan.map(a => a.item.id)), todos = new Set(x.todos.map(o => o.id));
  const left = t.todos.filter(o => !todos.has(o.id));
  const newLegs = new Set((x.legs ?? []).map(l => l.id)), oldLeg = new Map((x.legEdits ?? []).map(e => [e.before.id, e.before]));
  return {
    ...t,
    days: t.days.map(d => {
      let plan = d.plan.filter(i => !items.has(i.id));
      for (const e of (x.planEdits ?? []).filter(e => e.dayId === d.id)) {
        plan = plan.some(i => i.id === e.before.id) ? plan.map(i => (i.id === e.before.id ? e.before : i)) : [...plan, e.before];
      }
      /* the stay this filing set, or cleared just above because its new hotel was taken out again */
      const stay = (x.stays ?? []).find(s => s.dayId === d.id && (d.stayId === s.placeId || !d.stayId));
      const changed = plan.length !== d.plan.length || plan.some((i, k) => i !== d.plan[k]) || stay;
      if (!changed) return d;
      const { stayId: _s, ...rest } = d;
      return { ...(stay ? (stay.was ? { ...rest, stayId: stay.was } : rest) : d), plan: sortPlan(plan) };
    }),
    legs: t.legs.filter(l => !newLegs.has(l.id)).map(l => oldLeg.get(l.id) || l),
    todos: left,
    todoGroups: t.todoGroups.filter(g => !x.groups.includes(g) || left.some(o => o.group === g)),
    notes: t.notes.map(n => (n.id === x.noteId ? { ...n, done: false, filed: undefined, made: undefined } : n)),
  };
}
