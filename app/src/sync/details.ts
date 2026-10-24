/* Fills in what Essentials shows about the trip's hotels and booked places: first, by itself, from
   free map data (OpenStreetMap, MapTiler); then, only when someone taps "Find the rest online", with
   the place-details function, which has Claude search the web: address, phone, website, and for
   hotels check-in and check-out. Only empty fields are filled, and each thing is looked up once for
   the whole group (detailsAt says it has been, found or not). A booked plan item with no place gets
   one made from what was found. Shared trips only (the function checks you're on the trip). */
import type { Day, Place, PlanItem, Trip } from '../model/types';
import { getState, patchTrip } from '../model/store';
import { newId } from '../model/trip';
import { supabase } from './engine';
import { streetAddress } from './maptiler';
import { verdict } from '../model/rules';
import { osmQuery, pickOsm, type OsmFound } from '../model/osmDetails';
import type { Found } from '../../supabase/functions/_shared/details';

const tried = new Set<string>();
const OVERPASS = 'https://overpass-api.de/api/interpreter';

/** Not looked up from the free sources yet: a pinned place missing an address, phone or website. */
export const needsFree = (p: Place) => !p.freeAt && p.lat != null && p.lng != null && (!p.address || !p.phone || !p.link);

/** The free first pass, done by itself when Essentials opens: OpenStreetMap near each place's pin
    for address, phone and website, then MapTiler for an address OSM didn't have. Claude (below)
    only runs when someone asks it to find the rest. */
export async function fillFree(trip: Trip, places: Place[]): Promise<void> {
  if (trip.sample || !navigator.onLine) return;
  const todo = places.filter(p => needsFree(p) && !tried.has('free:' + p.id)).slice(0, 15);
  if (!todo.length) return;
  todo.forEach(p => tried.add('free:' + p.id));
  const found: Record<string, OsmFound> = {};
  for (const p of todo) {
    try {
      const r = await fetch(OVERPASS, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(osmQuery(p)) });
      if (r.ok) found[p.id] = pickOsm(await r.json(), p) || {};
    } catch { /* offline or busy: tried again next launch */ }
    if (!p.address && found[p.id] && !found[p.id].address) {
      const a = await streetAddress(p.lat!, p.lng!);
      if (a) found[p.id].address = a;
    }
  }
  const at = new Date().toISOString();
  const add = (t: Trip): Trip => ({
    ...t,
    places: t.places.map(p => {
      const f = found[p.id];
      if (!f) return p;
      const add: Partial<Place> = {};
      if (f.address && !p.address) add.address = f.address;
      if (f.phone && !p.phone) add.phone = f.phone;
      if (f.website && !p.link) add.link = f.website;
      return { ...p, ...add, freeAt: at, ...(Object.keys(add).length ? { foundOnline: true } : {}) };
    }),
  });
  /* someone whose edits need approval doesn't fill anything in (it would become a request) */
  const now = getState().trips.find(t => t.id === trip.id), role = getState().sync[trip.id]?.role;
  if (!now || (role && verdict(now, add(now), role) !== 'ok')) return;
  patchTrip(trip.id, add);
}


export const needsDetails = (p: Place) =>
  !p.detailsAt && (!p.address || !p.phone || !p.link || (p.kind === 'stay' && (!p.checkIn || !p.checkOut)));
export const bookingNeedsPlace = (p: PlanItem) => p.fixed && !p.placeId && !p.detailsAt && p.text.trim().length > 3;

/** Looks up what's missing; resolves when done (or there was nothing to do). */
export async function fillDetails(trip: Trip, places: Place[], bookings: { d: Day; p: PlanItem }[]): Promise<void> {
  if (!getState().sync[trip.id] || !navigator.onLine) return;
  const dest = new Map(trip.destinations.map(d => [d.id, d]));
  const where = (id?: string) => { const d = id ? dest.get(id) : undefined; return { city: d?.name || '', country: d?.country || '' }; };
  /* once per thing per app launch, even if it failed: the next launch tries again */
  const want = [
    ...places.filter(p => needsDetails(p) && !tried.has(p.id))
      .map(p => ({ id: p.id, kind: p.kind === 'stay' ? 'stay' : 'place', name: p.name, area: p.area, ...where(p.destinationId) })),
    ...bookings.filter(b => bookingNeedsPlace(b.p) && !tried.has(b.p.id))
      .map(b => ({ id: 'plan:' + b.p.id, kind: 'booking', name: b.p.text, ...where(b.d.destinationId) })),
  ].slice(0, 10);
  if (!want.length) return;
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return;
  want.forEach(w => tried.add(w.id.replace(/^plan:/, '')));
  const { data, error } = await supabase.functions.invoke<{ details: Found[] }>('place-details', { body: { trip_id: trip.id, places: want } });
  if (error || !data?.details) return;
  const at = new Date().toISOString(), by = new Map(data.details.map(d => [d.id, d]));
  const asked = new Set(want.map(w => w.id));
  patchTrip(trip.id, t => {
    const made: Place[] = [];
    const fill = (p: Place, f?: Found): Place => {
      const add: Partial<Place> = {};
      if (f?.address && !p.address) add.address = f.address;
      if (f?.phone && !p.phone) add.phone = f.phone;
      if (f?.website && !p.link) add.link = f.website;
      if (p.kind === 'stay' && f?.checkIn && !p.checkIn) add.checkIn = f.checkIn;
      if (p.kind === 'stay' && f?.checkOut && !p.checkOut) add.checkOut = f.checkOut;
      return { ...p, ...add, detailsAt: at, ...(Object.keys(add).length ? { foundOnline: true } : {}) };
    };
    const days = t.days.map(d => ({
      ...d,
      plan: d.plan.map(p => {
        if (!asked.has('plan:' + p.id)) return p;
        const f = by.get('plan:' + p.id);
        /* a booking that turned out to be a findable place gets that place, with what was found */
        if (f?.name && (f.address || f.phone || f.website)) {
          const place = fill({ id: newId('p'), name: f.name, kind: 'event', ...(d.destinationId ? { destinationId: d.destinationId } : {}), dayIds: [d.id] }, f);
          made.push(place);
          return { ...p, placeId: place.id, detailsAt: at };
        }
        return { ...p, detailsAt: at };
      }),
    }));
    return { ...t, days, places: [...t.places.map(p => (asked.has(p.id) ? fill(p, by.get(p.id)) : p)), ...made] };
  });
}
