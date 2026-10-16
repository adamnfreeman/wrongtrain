/* "How much time do I have?": the next fixed time today, when to leave for it, and what fits
   in before then.

   Fixed times come from booked legs with a departure time, and plan items marked fixed.
   Everything else with a map pin is a candidate stop, ranked by distance and by whether it
   is on today's list. */
import type { Day, Place } from './types';
import { fmtT, hm, minutesIn, weekday } from './time';
import { type TripIndex, metres, travel, tzOf, pinGroup } from './trip';

export interface Anchor {
  at: number | null;
  /** Minutes to be there early: two and a half hours for a flight, ten for a train or booking. */
  lead: number;
  name: string;
  what: string;
  place: Place | null;
  kind: 'flight' | 'ride' | 'event' | 'deadline';
}

export function anchorsFor(ix: TripIndex, d: Day): Anchor[] {
  const out: Anchor[] = [];
  ix.trip.legs.forEach(l => {
    if (l.dayId !== d.id || l.status !== 'booked') return;
    const at = hm(l.depart); if (at == null) return;
    const flight = l.mode === 'flight';
    out.push({ at, lead: flight ? 150 : 10, name: `${l.from} → ${l.to}`, what: l.how,
      place: (l.fromPlaceId && ix.place.get(l.fromPlaceId)) || null, kind: flight ? 'flight' : 'ride' });
  });
  d.plan.forEach(p => {
    if (!p.fixed) return;
    const place = (p.placeId && ix.place.get(p.placeId)) || null;
    const by = p.timeKind === 'by';
    out.push({ at: hm(p.time), lead: by || hm(p.time) == null ? 0 : 10, name: place?.name || p.text.split(/[.:—]/)[0],
      what: p.text, place, kind: by ? 'deadline' : 'event' });
  });
  return out.sort((a, b) => (a.at ?? -1) - (b.at ?? -1));
}

export interface Ctx {
  d: Day;
  min: number;
  pos: { lat: number; lng: number } | null;
  live: boolean;
  /** The stay the preview pretends you are at. */
  from: Place | null;
}

const pinned = (p?: Place | null) => (p && p.lat != null && p.lng != null ? p : null);
const stayPin = (ix: TripIndex, d?: Day) => pinned(d?.stayId ? ix.place.get(d.stayId) : null);

/** Before mid-afternoon you are still where you woke up; after that, at tonight's stay. */
export function pretendAt(ix: TripIndex, d: Day, min: number): Place | null {
  const i = ix.dayPos.get(d.id) ?? 0, woke = stayPin(ix, ix.trip.days[i - 1]);
  return (min < 900 && woke) ? woke : (stayPin(ix, d) || woke);
}

export function liveCtx(ix: TripIndex, d: Day, geo: { lat: number; lng: number } | null): Ctx {
  const min = minutesIn(tzOf(ix, d));
  if (geo) return { d, min, pos: geo, live: true, from: null };
  /* the sample trip has nobody actually there, so it stands you at that day's stay */
  const from = ix.trip.sample ? pretendAt(ix, d, min) : null;
  return { d, min, pos: from ? { lat: from.lat!, lng: from.lng! } : null, live: true, from };
}

export function previewCtx(ix: TripIndex, d: Day, min: number): Ctx {
  const from = pretendAt(ix, d, min);
  return { d, min, pos: from ? { lat: from.lat!, lng: from.lng! } : null, live: false, from };
}

export interface Stop {
  p: Place;
  today: boolean;
  status: string;
  dist: number | null;
  tr: ReturnType<typeof travel> | null;
  leaveBy: number | null;
  score: number;
}

const NOT_A_STOP = new Set(['stay', 'transit', 'event']);

function hoursOf(p: Place): { open: number | null; close: number | null } | null {
  if (!p.hours) return null;
  if (p.hours === '24h') return { open: 0, close: 1440 };
  const open = hm(p.hours.open), close = hm(p.hours.close);
  return { open, close: close != null && open != null && close <= open ? close + 1440 : close };
}

export function onToday(p: Place, d: Day) {
  return !!(p.dayIds?.includes(d.id) || d.plan.some(i => i.placeId === p.id) || d.eatIds.includes(p.id));
}

export function stopsFor(ix: TripIndex, c: Ctx, next: Anchor | null, need: number | null): Stop[] {
  const out: Stop[] = [];
  const wd = weekday(c.d.date);
  ix.trip.places.forEach(p => {
    if (NOT_A_STOP.has(p.kind) || p.lat == null || p.lng == null || p.closed) return;
    const today = onToday(p, c.d);
    if (!today && p.wishlist) return;
    if (p.closedDays?.includes(wd)) return;
    const h = hoursOf(p);
    let status = '';
    if (h) {
      if (h.open != null && c.min < h.open) { if (h.open - c.min > 45) return; status = 'opens at ' + fmtT(h.open); }
      else if (h.close != null) { if (c.min > h.close - 20) return; status = h.close - (h.open ?? 0) >= 1440 ? 'open 24 hours' : 'open until ' + fmtT(h.close); }
    }
    const x: Stop = { p, today, status, dist: null, tr: null, leaveBy: null, score: 0 };
    if (c.pos) {
      x.dist = metres(c.pos.lat, c.pos.lng, p.lat, p.lng); x.tr = travel(x.dist);
      if (x.dist < 75 || x.dist > (today ? 20000 : 2500)) return;      /* skip where you are, and anything far unless today names it */
      if (next?.place?.lat != null && need != null) {
        const back = travel(metres(p.lat, p.lng, next.place.lat, next.place.lng!)).min;
        x.leaveBy = need - back;
        if (c.min + x.tr.min + 25 > x.leaveBy) return;                 /* no room for even a short stop */
      }
      x.score = x.dist + (today ? 0 : 2500);
    } else {
      if (!today) return;
      x.score = h?.open ?? 0;
    }
    out.push(x);
  });
  out.sort((a, b) => a.score - b.score);
  /* best first, but no more than two of a kind, so food, shops and sights all get a look in */
  const kinds: Record<string, number> = {};
  return out.filter(x => { const k = pinGroup(x.p).key; kinds[k] = (kinds[k] || 0) + 1; return kinds[k] <= 2; }).slice(0, 5);
}
