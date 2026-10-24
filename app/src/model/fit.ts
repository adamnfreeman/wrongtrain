/* Where a place could go on the plan ("Add to itinerary" on Places): the days in its city that it's
   open, still to come, and least full, each with a time that fits around what's already planned
   and inside its opening hours. Clock times are minutes after midnight (time.ts). */
import type { Day, Place, PlanItem, Trip } from './types';
import { hm, todayIn, weekday } from './time';
import { indexTrip, tzOf } from './trip';
import { onToday } from './next';

export interface Fit { day: Day; /** "HH:MM", or none when the day has no gap long enough */ time?: string; end?: string; why: string }

/** Roughly how long a visit takes, so the slot leaves room for it. */
const LENGTH: Record<string, number> = { food: 90, coffee: 45, shop: 120, sight: 120, area: 150, event: 120 };
/** Start times people usually want, tried before any other: meals at mealtimes, sights in the day. */
const PREFER: Record<string, number[]> = {
  food: [12 * 60 + 30, 19 * 60, 13 * 60 + 30, 18 * 60 + 30, 20 * 60],
  coffee: [10 * 60, 15 * 60, 9 * 60, 16 * 60],
};
const DAY_FROM = 9 * 60, DAY_TO = 22 * 60, GAP = 30; // half an hour to get between things

const pad = (n: number) => String(n).padStart(2, '0');
const toHM = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

/** The day's booked-up stretches, from its timed items (90 minutes when an item has no end). */
function busy(plan: PlanItem[]): [number, number][] {
  return plan.flatMap(i => {
    const a = hm(i.time);
    if (a == null) return [];
    const b = hm(i.end);
    return [[a, b != null && b > a ? b : a + 90] as [number, number]];
  });
}

/** The first start time that fits: preferred times first, then every half hour through the day. */
export function slotFor(p: Place, plan: PlanItem[]): number | null {
  const len = LENGTH[p.kind] ?? 90;
  let from = DAY_FROM, to = DAY_TO;
  if (p.hours && p.hours !== '24h') {
    const o = hm(p.hours.open), c0 = hm(p.hours.close);
    if (o != null && c0 != null) {
      const c = c0 <= o ? c0 + 1440 : c0; // closes after midnight
      from = Math.max(from, o); to = Math.min(to, c);
    }
  }
  const taken = busy(plan);
  const free = (s: number) => s >= from && s + len <= to && taken.every(([a, b]) => s + len + GAP <= a || s >= b + GAP);
  const tries = [...(PREFER[p.kind] ?? [10 * 60, 14 * 60, 16 * 60])];
  for (let s = Math.ceil(from / 30) * 30; s + len <= to; s += 30) tries.push(s);
  return tries.find(free) ?? null;
}

const whyOf = (d: Day, s: number | null) => s == null ? 'No gap that day: goes on without a time'
  : d.plan.length ? `${d.plan.length} other thing${d.plan.length > 1 ? 's' : ''} planned` : 'Nothing planned yet';

const inCity = (d: Day, dest?: string) => !dest || d.destinationId === dest || !!d.route?.includes(dest);

/** Up to `n` days for the place, best first. Days already over, days it's closed and days it's
    already on are left out; days in another city only when its own city has none. */
export function fitPlace(t: Trip, p: Place, n = 3, now = new Date()): Fit[] {
  if (p.closed) return [];
  const ix = indexTrip(t);
  const last = t.days[t.days.length - 1]?.id;
  const open = t.days.filter(d => d.date >= todayIn(tzOf(ix, d), now)
    && !p.closedDays?.includes(weekday(d.date))
    && !onToday(p, d));
  const here = open.filter(d => inCity(d, p.destinationId));
  const days = here.length ? here : open;
  return days
    .map(day => {
      const s = slotFor(p, day.plan);
      const score = day.plan.length + (day.travel ? 6 : 0) + (day.id === last ? 4 : 0) + (s == null ? 5 : 0);
      const why = whyOf(day, s);
      return { day, score, fit: { day, time: s == null ? undefined : toHM(s), end: s == null ? undefined : toHM(s + (LENGTH[p.kind] ?? 90)), why } };
    })
    .sort((a, b) => a.score - b.score || a.day.date.localeCompare(b.day.date))
    .slice(0, n)
    .map(x => x.fit);
}

/** The same, for one day the person picked. */
export function fitOn(p: Place, day: Day): Fit {
  const s = slotFor(p, day.plan);
  return s == null ? { day, why: whyOf(day, s) }
    : { day, time: toHM(s), end: toHM(s + (LENGTH[p.kind] ?? 90)), why: whyOf(day, s) };
}
