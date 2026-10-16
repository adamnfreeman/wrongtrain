/* Questions about a trip that every screen asks: which destination a day belongs to,
   what colour it is, where we are in the trip right now. */
import type { Day, Destination, ID, Place, PlaceKind, Trip } from './types';
import { daysBetween, todayIn } from './time';

export type LineKey = Destination['color'] | 'travel' | 'other';

export interface TripIndex {
  trip: Trip;
  dest: Map<ID, Destination>;
  place: Map<ID, Place>;
  dayPos: Map<ID, number>;
}

export function indexTrip(trip: Trip): TripIndex {
  return {
    trip,
    dest: new Map(trip.destinations.map(d => [d.id, d])),
    place: new Map(trip.places.map(p => [p.id, p])),
    dayPos: new Map(trip.days.map((d, i) => [d.id, i])),
  };
}

export const destOf = (ix: TripIndex, day?: Day) => (day?.destinationId ? ix.dest.get(day.destinationId) : undefined);

/** Time zone that decides a day's clock: its destination's, else the trip's first destination's. */
export function tzOf(ix: TripIndex, day?: Day): string {
  return destOf(ix, day)?.timeZone || ix.trip.destinations[0]?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export const lineOf = (ix: TripIndex, day: Day): LineKey => (day.travel ? 'travel' : destOf(ix, day)?.color || 'other');
export const lineOfDest = (d?: Destination): LineKey => d?.color || 'other';

/** Heading for a day: "Kyoto", "Kyoto → Nara → Osaka", or "Travel". */
export function cityOf(ix: TripIndex, day: Day): string {
  if (day.title) return day.title;
  if (day.route?.length) return day.route.map(id => ix.dest.get(id)?.name).filter(Boolean).join(' → ');
  return destOf(ix, day)?.name || (day.travel ? 'Travel' : '');
}

/** Two- or three-letter code for a route badge: "KY", "OSA". */
export function codeOf(ix: TripIndex, day: Day): string {
  if (day.travel) return 'AIR';
  const name = destOf(ix, day)?.name || '';
  return name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '··';
}

export function stayLine(ix: TripIndex, day: Day): string {
  const stay = day.stayId ? ix.place.get(day.stayId) : undefined;
  return stay ? stay.name : day.travel ? 'In transit' : '';
}

export type Phase = 'before' | 'during' | 'after';
export interface Now { cur: Day | null; phase: Phase; togo: number }

/** Where are we? Each day counts as "today" by the clock of its own destination. */
export function whereNow(ix: TripIndex, at = new Date()): Now {
  const days = ix.trip.days;
  if (!days.length) return { cur: null, phase: 'before', togo: 0 };
  const cur = days.find(d => todayIn(tzOf(ix, d), at) === d.date) || null;
  const first = days[0], last = days[days.length - 1];
  const togo = daysBetween(todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone, at), first.date);
  const phase: Phase = cur ? 'during' : todayIn(tzOf(ix, last), at) > last.date ? 'after' : 'before';
  return { cur, phase, togo };
}

/** Runs of consecutive days in the same destination, for the trip-at-a-glance band. */
export function runs(ix: TripIndex) {
  const out: { dest: Destination; start: Day; end: Day }[] = [];
  ix.trip.days.forEach(d => {
    const dest = destOf(ix, d);
    if (d.travel || !dest) return;
    const r = out[out.length - 1];
    if (r && r.dest.id === dest.id) r.end = d; else out.push({ dest, start: d, end: d });
  });
  return out;
}

/* ---------- places ---------- */

export const KIND_LABEL: Record<PlaceKind, string> = {
  stay: 'Stay', sight: 'Sight', area: 'Area', food: 'Food', coffee: 'Coffee', shop: 'Shop',
  event: 'Booked event', transit: 'Transit', other: 'Place',
};

/** Pin groups for the map legend and filters: key, label, kinds, colour token. */
export const PIN_GROUPS: { key: string; label: string; kinds: PlaceKind[]; color: string }[] = [
  { key: 'stay', label: 'Stays', kinds: ['stay'], color: '--ink' },
  { key: 'plan', label: 'Booked', kinds: ['event'], color: '--l-red' },
  { key: 'sight', label: 'Sights & areas', kinds: ['sight', 'area', 'other'], color: '--l-blue' },
  { key: 'food', label: 'Food & coffee', kinds: ['food', 'coffee'], color: '--l-amber' },
  { key: 'shop', label: 'Shops', kinds: ['shop'], color: '--l-teal' },
  { key: 'transit', label: 'Transit', kinds: ['transit'], color: '--l-green' },
];
export const pinGroup = (p: Place) => (p.wishlist ? WISH : PIN_GROUPS.find(g => g.kinds.includes(p.kind)) || PIN_GROUPS[2]);
const WISH = { key: 'wish', label: 'Wishlist', kinds: [] as PlaceKind[], color: '--l-violet' };
export const ALL_PIN_GROUPS = [...PIN_GROUPS.slice(0, 5), WISH, PIN_GROUPS[5]];

export function mapsLink(ix: TripIndex, p: Place): string {
  if (p.link) return p.link;
  const q = p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : [p.name, p.area, p.destinationId && ix.dest.get(p.destinationId)?.name].filter(Boolean).join(', ');
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
}

export const dirLink = (p: { lat?: number; lng?: number }, mode: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=${mode}`;

/** Metres between two points. */
export function metres(a: number, b: number, c: number, d: number): number {
  const R = 6371000, t = Math.PI / 180, x = (c - a) * t, y = (d - b) * t;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function fmtDist(m: number): string {
  return m < 950 ? Math.max(10, Math.round(m / 10) * 10) + ' m'
    : m < 100000 ? (m / 1000).toFixed(1) + ' km'
    : Math.round(m / 1000).toLocaleString('en-US') + ' km';
}

/** Rough travel time from straight-line distance: walking up to 1.2 km, otherwise a transit guess. */
export function travel(m: number) {
  if (m <= 1200) return { min: Math.max(2, Math.round((m * 1.3) / 75)), how: 'on foot', mode: 'walking' };
  const km = (m * 1.3) / 1000, slow = Math.min(km, 13), fast = Math.max(0, km - 13);
  return { min: Math.round(12 + (slow / 28) * 60 + (fast / 55) * 60), how: 'by train or bus', mode: 'transit' };
}

let seq = 0;
export const newId = (prefix = 'x') => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
