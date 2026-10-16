/* Combining two people's edits to the same trip.

   Each phone remembers the last copy it got from the server (the base). When a save is refused
   because someone else saved first, the phone has three copies: the base, its own, and the
   server's. Anything only one side changed keeps that side's change. Lists of things with ids
   (days, plan items, places, to-dos…) merge item by item, and items merge field by field, so
   you ticking a to-do while someone else rewords it keeps both. Only when both sides changed
   the very same field does this phone's version win, since its person is the one looking at it.

   An item one side deleted stays deleted unless the other side changed it in the meantime;
   then it is kept, as losing an edit is worse than an extra item. */
import type { Trip } from './types';
import { redate } from './edit';

type V = unknown;
type Obj = Record<string, V>;

const isObj = (v: V): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const hasIds = (a: V): a is { id: string }[] => Array.isArray(a) && a.length > 0 && a.every(x => isObj(x) && typeof x.id === 'string');
const isStrings = (a: V): a is (string | number)[] => Array.isArray(a) && a.every(x => typeof x === 'string' || typeof x === 'number');

export function same(a: V, b: V): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) { const bb = b as V[]; return a.length === bb.length && a.every((x, i) => same(x, bb[i])); }
  const ka = Object.keys(a as Obj).filter(k => (a as Obj)[k] !== undefined), kb = Object.keys(b as Obj).filter(k => (b as Obj)[k] !== undefined);
  return ka.length === kb.length && ka.every(k => same((a as Obj)[k], (b as Obj)[k]));
}

export function mergeValue(b: V, l: V, r: V): V {
  if (same(l, b)) return r;
  if (same(r, b) || same(l, r)) return l;
  /* both sides changed it */
  const arrays = [b, l, r].filter(Array.isArray);
  if (arrays.length >= 2 && [l, r].every(x => x === undefined || Array.isArray(x))) {
    const B = (Array.isArray(b) ? b : []) as V[], L = (l ?? []) as V[], R = (r ?? []) as V[];
    if ([B, L, R].every(x => x.length === 0 || hasIds(x))) return mergeList(B as { id: string }[], L as { id: string }[], R as { id: string }[]);
    if ([B, L, R].every(isStrings)) return mergeSet(B, L, R);
    return l;
  }
  if (isObj(l) && isObj(r)) {
    const B = isObj(b) ? b : {}, out: Obj = {};
    new Set([...Object.keys(r), ...Object.keys(l)]).forEach(k => {
      const v = mergeValue(B[k], l[k], r[k]);
      if (v !== undefined) out[k] = v;
    });
    return out;
  }
  return l;
}

/** Plain values (ids, weekdays, names): the server's order, plus what this phone added, minus what it removed. */
function mergeSet<T>(b: T[], l: T[], r: T[]): T[] {
  const removedHere = b.filter(x => !l.includes(x)), addedHere = l.filter(x => !b.includes(x));
  return [...r.filter(x => !removedHere.includes(x)), ...addedHere.filter(x => !r.includes(x))];
}

function mergeList<T extends { id: string }>(b: T[], l: T[], r: T[]): T[] {
  const B = new Map(b.map(x => [x.id, x])), L = new Map(l.map(x => [x.id, x]));
  const out: T[] = [];
  const pick = (id: string, lv?: T, rv?: T): T | null => {
    const bv = B.get(id);
    if (lv && rv) return mergeValue(bv, lv, rv) as T;
    if (lv) return !bv ? lv : same(lv, bv) ? null : lv;   /* added here, or deleted there (kept only if changed here) */
    if (rv) return !bv ? rv : same(rv, bv) ? null : rv;      /* added there, or deleted here (kept only if changed there) */
    return null;
  };
  /* the server's order first, so everyone ends up with the same order */
  r.forEach(rv => { const v = pick(rv.id, L.get(rv.id), rv); if (v) out.push(v); });
  /* then this phone's additions, each after the item it followed here */
  const R = new Set(r.map(x => x.id));
  l.forEach((lv, i) => {
    if (R.has(lv.id)) return;
    const v = pick(lv.id, lv, undefined); if (!v) return;
    let at = 0;
    for (let k = i - 1; k >= 0; k--) { const j = out.findIndex(x => x.id === l[k].id); if (j >= 0) { at = j + 1; break; } }
    out.splice(at, 0, v);
  });
  return out;
}

/** The trip both edits lead to. Days come out consecutive again, from the merged first date. */
export function merge3(base: Trip, local: Trip, remote: Trip): Trip {
  /* a day's date follows from its place in the trip, so moving the trip is not an edit to each day */
  const undated = (t: Trip): Trip => ({ ...t, days: t.days.map(({ date: _date, ...d }) => d as Trip['days'][number]) });
  const m = mergeValue(undated(base), undated(local), undated(remote)) as Trip;
  const start = local.days[0]?.date === base.days[0]?.date ? remote.days[0]?.date : local.days[0]?.date;
  return {
    ...m,
    id: local.id,
    days: redate(m.days || [], start),
    updatedAt: local.updatedAt > remote.updatedAt ? local.updatedAt : remote.updatedAt,
  };
}
