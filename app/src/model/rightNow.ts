/* "Right now": the one thing you need to be on top of at this moment, if there is one. A booked
   flight, train or bus, or a fixed booking or meeting, from a while before you need to leave until
   a little after it starts. Outside those windows there's nothing, and the page isn't there.

   The windows, by kind (how early it opens is on top of the travel time to get there):
   - flight: from about 3 hours before it leaves (2.5 h at the airport, plus getting there)
   - train, bus or other ride: from 45 minutes before you need to leave
   - booking or meeting: from 30 minutes before you need to leave
   Each closes a little after its time: 20 minutes for a flight or booking, 10 for a ride. */
import type { Day, Leg, Place, PlanItem } from './types';
import { hm } from './time';
import { type TripIndex, metres, travel } from './trip';
import type { Ctx } from './next';

export interface Moment {
  /** Stable for the thing itself, so "opened by itself once" can be remembered. */
  id: string;
  kind: 'flight' | 'ride' | 'event';
  dayId: string;
  /** Minutes into the day it leaves or starts. */
  at: number;
  title: string;
  leg?: Leg;
  item?: PlanItem;
  place: Place | null;
  /** Minutes to be there before it: at the airport, on the platform, at the door. */
  lead: number;
  /** Getting there from where you are, when both are known. */
  trip: { min: number; how: string; mode: string; metres: number } | null;
  /** When to set off, minutes into the day. */
  leaveBy: number;
  /** Minutes from now until it leaves or starts (negative once it has). */
  inMin: number;
}

const OPEN = { flight: 30, ride: 45, event: 30 } as const;
const CLOSE = { flight: 20, ride: 10, event: 20 } as const;
const LEAD = { flight: 150, ride: 10, event: 10 } as const;

const pinned = (p?: Place | null) => (p && p.lat != null && p.lng != null ? p : null);

/** Everything on a day that can be a "right now", in time order. */
export function momentsOn(ix: TripIndex, d: Day, ctx: Pick<Ctx, 'pos' | 'min'>): Moment[] {
  const out: Moment[] = [];
  const reach = (place: Place | null) => {
    const p = pinned(place);
    if (!p || !ctx.pos) return null;
    const m = metres(ctx.pos.lat, ctx.pos.lng, p.lat!, p.lng!);
    return { ...travel(m), metres: m };
  };
  const add = (m: Omit<Moment, 'leaveBy' | 'inMin' | 'trip' | 'lead'>) => {
    const lead = LEAD[m.kind], trip = reach(m.place);
    out.push({ ...m, lead, trip, leaveBy: m.at - lead - (trip?.min ?? 0), inMin: m.at - ctx.min });
  };
  for (const l of ix.trip.legs) {
    if (l.dayId !== d.id || l.status !== 'booked') continue;
    const at = hm(l.depart); if (at == null) continue;
    add({ id: `leg:${l.id}`, kind: l.mode === 'flight' ? 'flight' : 'ride', dayId: d.id, at, title: `${l.from} → ${l.to}`, leg: l,
      place: (l.fromPlaceId && ix.place.get(l.fromPlaceId)) || null });
  }
  for (const p of d.plan) {
    const at = hm(p.time);
    if (!p.fixed || at == null || p.timeKind === 'by') continue;
    const place = (p.placeId && ix.place.get(p.placeId)) || null;
    add({ id: `plan:${p.id}`, kind: 'event', dayId: d.id, at, title: place?.name || p.text.split(/[.:—]/)[0].trim(), item: p, place });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Whether a moment's window is open at minute `min` of its day. */
export const isOpen = (m: Moment, min: number) => min >= m.leaveBy - OPEN[m.kind] && min <= m.at + CLOSE[m.kind];

/** The thing that matters right now on this day, or null. The earliest open window wins. */
export function rightNow(ix: TripIndex, ctx: Ctx): Moment | null {
  return momentsOn(ix, ctx.d, ctx).find(m => isOpen(m, ctx.min)) || null;
}

/** What comes after it today, for a small "then" line. */
export function after(ix: TripIndex, ctx: Ctx, m: Moment): Moment | null {
  return momentsOn(ix, ctx.d, ctx).find(x => x.at > m.at) || null;
}
