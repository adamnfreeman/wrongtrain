/* Changes to a trip. Every function takes a trip and returns a new one, so the store can save,
   and later sync, whatever comes back.

   One rule holds throughout: days are consecutive. Day n is always the start date plus n - 1,
   so inserting or deleting a day re-dates everything after it. */
import type { Day, Destination, Guide, Leg, LineColor, Place, PlanItem, Todo, Trip } from './types';
import { LINE_COLORS } from './types';
import { addDays } from './time';
import { newId } from './trip';

const stampNow = () => new Date().toISOString();

export const blankDay = (date: string, destinationId?: string): Day => ({
  id: newId('d'), date, ...(destinationId ? { destinationId } : {}), summary: '', plan: [], tips: [], around: [], eatIds: [],
});

/** Re-date every day from the first day's date, one day apart. */
export function redate(days: Day[], start = days[0]?.date): Day[] {
  return start ? days.map((d, i) => (d.date === addDays(start, i) ? d : { ...d, date: addDays(start, i) })) : days;
}

/* ---------- new trips ---------- */

export interface Stop { name: string; timeZone: string; nights: number; country?: string }

/** The next line colour not yet used, so each destination gets its own. */
export function nextColor(used: LineColor[]): LineColor {
  return LINE_COLORS.find(c => !used.includes(c)) || LINE_COLORS[used.length % LINE_COLORS.length];
}

/**
 * A trip from a list of stops: each stop's nights become days there, the day you move on is
 * filed under the place you arrive, and the trip ends with a travel day home.
 */
export function newTrip(o: { name: string; start: string; stops: Stop[]; travelers?: string[]; phrasePack?: string }): Trip {
  const destinations: Destination[] = [];
  o.stops.forEach(s => {
    if (destinations.some(d => d.name.toLowerCase() === s.name.trim().toLowerCase())) return;
    destinations.push({ id: newId('c'), name: s.name.trim(), country: s.country || '', timeZone: s.timeZone, color: nextColor(destinations.map(d => d.color)) });
  });
  const destId = (s: Stop) => destinations.find(d => d.name.toLowerCase() === s.name.trim().toLowerCase())!.id;
  const days: Day[] = [];
  o.stops.forEach((s, k) => {
    const id = destId(s), prev = o.stops[k - 1];
    for (let n = 0; n < Math.max(1, s.nights); n++) {
      const d = blankDay('', id);
      if (n === 0 && prev && destId(prev) !== id) d.route = [destId(prev), id];
      days.push(d);
    }
  });
  const last = o.stops[o.stops.length - 1];
  if (last) days.push({ ...blankDay('', destId(last)), travel: true, title: 'Travel home' });
  const t = stampNow();
  return {
    id: newId('t'), name: o.name.trim() || 'New trip', travelers: o.travelers || [], destinations,
    days: redate(days, o.start), legs: [], places: [], todoGroups: ['Before the trip', 'During the trip'], todos: [], notes: [], guides: [],
    ...(o.phrasePack ? { phrasePack: o.phrasePack } : {}), createdAt: t, updatedAt: t,
  };
}

/** A copy of any trip as your own, starting on a new date. Ticks and notes are cleared. */
export function copyTrip(src: Trip, start: string, name = src.name): Trip {
  const t = stampNow();
  const copy: Trip = JSON.parse(JSON.stringify(src));
  return {
    ...copy, id: newId('t'), name, sample: undefined, createdAt: t, updatedAt: t,
    days: redate(copy.days, start),
    todos: copy.todos.map(x => ({ ...x, done: false, doneBy: undefined })),
    notes: [],
  };
}

/* ---------- days ---------- */

/** A new empty day after the given one (or at the end), in the same destination. */
export function insertDay(trip: Trip, afterId?: string): Trip {
  const i = afterId ? trip.days.findIndex(d => d.id === afterId) : trip.days.length - 1;
  const ref = trip.days[i] || trip.days[trip.days.length - 1];
  const day = blankDay('', ref?.destinationId || trip.destinations[0]?.id);
  const days = [...trip.days.slice(0, i + 1), day, ...trip.days.slice(i + 1)];
  return { ...trip, days: redate(days, trip.days[0]?.date || ref?.date) };
}

/** Removes a day; its legs go with it, and later days move one day earlier. */
export function deleteDay(trip: Trip, id: string): Trip {
  if (trip.days.length <= 1) return trip;
  const start = trip.days[0].date;
  return {
    ...trip,
    days: redate(trip.days.filter(d => d.id !== id), start),
    legs: trip.legs.filter(l => l.dayId !== id),
    places: trip.places.map(p => (p.dayIds?.includes(id) ? { ...p, dayIds: p.dayIds.filter(x => x !== id) } : p)),
  };
}

/** Moves the whole trip to start on a new date. */
export const setStart = (trip: Trip, start: string): Trip => ({ ...trip, days: redate(trip.days, start) });

export const updateDay = (trip: Trip, id: string, f: (d: Day) => Day): Trip =>
  ({ ...trip, days: trip.days.map(d => (d.id === id ? f(d) : d)) });

/** Plan items with a time, in time order; untimed items keep their place after the one before them. */
export function sortPlan(items: PlanItem[]): PlanItem[] {
  const timed = items.filter(i => i.time).sort((a, b) => a.time!.localeCompare(b.time!));
  const out: PlanItem[] = [];
  let ti = 0;
  items.forEach(i => { out.push(i.time ? timed[ti++] : i); });
  return out;
}

/* ---------- lists: legs, places, to-dos, guides ---------- */

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some(x => x.id === item.id) ? list.map(x => (x.id === item.id ? item : x)) : [...list, item];
}

export const saveLeg = (trip: Trip, l: Leg): Trip => {
  /* keep legs in trip order: before-the-trip first, then by day and departure */
  const pos = (x: Leg) => (x.dayId ? trip.days.findIndex(d => d.id === x.dayId) + 1 : 0);
  const legs = upsert(trip.legs, l).map((x, i) => ({ x, i }))
    .sort((a, b) => pos(a.x) - pos(b.x) || (a.x.depart && b.x.depart ? a.x.depart.localeCompare(b.x.depart) : a.i - b.i)).map(o => o.x);
  return { ...trip, legs };
};
export const deleteLeg = (trip: Trip, id: string): Trip => ({ ...trip, legs: trip.legs.filter(l => l.id !== id) });

export const savePlace = (trip: Trip, p: Place): Trip => ({ ...trip, places: upsert(trip.places, p) });

/** Removes a place and every reference to it. */
export function deletePlace(trip: Trip, id: string): Trip {
  return {
    ...trip,
    places: trip.places.filter(p => p.id !== id),
    days: trip.days.map(d => ({
      ...d,
      ...(d.stayId === id ? { stayId: undefined } : {}),
      eatIds: d.eatIds.filter(x => x !== id),
      plan: d.plan.map(i => (i.placeId === id ? { ...i, placeId: undefined } : i)),
    })),
    legs: trip.legs.map(l => (l.fromPlaceId === id ? { ...l, fromPlaceId: undefined } : l)),
  };
}

export function saveTodo(trip: Trip, t: Todo): Trip {
  const groups = trip.todoGroups.includes(t.group) ? trip.todoGroups : [...trip.todoGroups, t.group];
  return { ...trip, todoGroups: groups, todos: upsert(trip.todos, t) };
}
export const deleteTodo = (trip: Trip, id: string): Trip => ({ ...trip, todos: trip.todos.filter(t => t.id !== id) });

export const saveGuide = (trip: Trip, g: Guide): Trip => ({ ...trip, guides: upsert(trip.guides, g) });
export const deleteGuide = (trip: Trip, id: string): Trip => ({ ...trip, guides: trip.guides.filter(g => g.id !== id) });

/* ---------- destinations ---------- */

export const saveDestination = (trip: Trip, d: Destination): Trip => ({ ...trip, destinations: upsert(trip.destinations, d) });

/** How many days and places point at a destination; it can only be removed when nothing does. */
export function destinationUse(trip: Trip, id: string) {
  return {
    days: trip.days.filter(d => d.destinationId === id || d.route?.includes(id)).length,
    places: trip.places.filter(p => p.destinationId === id).length,
  };
}

export function deleteDestination(trip: Trip, id: string): Trip {
  const u = destinationUse(trip, id);
  if (u.days || u.places) return trip;
  return { ...trip, destinations: trip.destinations.filter(d => d.id !== id) };
}

/* ---------- coordinates ---------- */

/**
 * Coordinates from whatever people paste: "35.0116, 135.7681", or a Google Maps or Apple Maps
 * link with them inside. Short share links (maps.app.goo.gl) carry no coordinates, so they return null.
 */
export function parseCoords(s: string): { lat: number; lng: number } | null {
  const t = decodeURIComponent((s || '').trim());
  const pats = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,                     /* Google place data: the pin itself */
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,                       /* Google map centre */
    /[?&](?:q|query|ll|sll|destination|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /^\s*\(?(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\)?\s*$/,     /* bare "lat, lng" */
  ];
  for (const p of pats) {
    const m = p.exec(t);
    if (m) {
      const lat = +m[1], lng = +m[2];
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)) return { lat, lng };
    }
  }
  return null;
}

export { newId };
