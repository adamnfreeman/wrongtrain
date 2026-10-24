/* MapTiler: the map's tiles and finding where places are.

   The key is meant to be public (it ships inside the app): MapTiler only accepts it from
   wrongtrain.lol, localhost and the app itself, set in MapTiler's dashboard (Adam's account,
   key "WrongTrain app"). The free plan asks for MapTiler's and OpenStreetMap's credit on the map. */
import L from 'leaflet';
import type { Place, Trip } from '../model/types';
import { getState, patchTrip, pref, setPref } from '../model/store';
import { verdict } from '../model/rules';
import { metres } from '../model/trip';

export const MAPTILER_KEY = 'Eqv13CqC4uLipHOoLm9F';
/* 512 px tiles drawn one zoom level up, so labels stay a readable size */
export const TILES = { url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, tileSize: 512, zoomOffset: -1, maxZoom: 19,
  attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap contributors</a>' };

/** MapTiler's logo in the map's corner, which the free plan asks for. */
export function addLogo(m: L.Map) {
  const c = new L.Control({ position: 'bottomleft' });
  c.onAdd = () => {
    const a = L.DomUtil.create('a', 'mt-logo');
    a.href = 'https://www.maptiler.com'; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = '<img src="https://api.maptiler.com/resources/logo.svg" alt="MapTiler" height="18">';
    return a;
  };
  c.addTo(m);
}

type LatLng = { lat: number; lng: number };

/** The best match for a search, near a point if given; null when nothing confident is found or
    offline. poi limits it to named places (shops, sights, stations, areas): without it a search
    for "Kinkaku-ji, Kyoto" lands on a street whose name looks alike. */
export async function geocode(q: string, opts: { near?: LatLng; country?: string; poi?: boolean } = {}): Promise<LatLng | null> {
  const p = new URLSearchParams({ key: MAPTILER_KEY, limit: '1', language: 'en' });
  if (opts.near) p.set('proximity', `${opts.near.lng},${opts.near.lat}`);
  if (opts.country) p.set('country', opts.country.toLowerCase());
  if (opts.poi) p.set('types', 'poi');
  try {
    const r = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?${p}`);
    if (!r.ok) return null;
    const f = (await r.json())?.features?.[0], c = f?.center;
    if (opts.poi && !(Number(f?.relevance) >= 0.9)) return null;
    return Array.isArray(c) && c.length === 2 ? { lng: Number(c[0]), lat: Number(c[1]) } : null;
  } catch { return null; }
}

/** The street address at a point (for a hotel whose map data has none), or null. */
export async function streetAddress(lat: number, lng: number): Promise<string | null> {
  const p = new URLSearchParams({ key: MAPTILER_KEY, limit: '1', language: 'en', types: 'address' });
  try {
    const r = await fetch(`https://api.maptiler.com/geocoding/${lng},${lat}.json?${p}`);
    if (!r.ok) return null;
    const name = (await r.json())?.features?.[0]?.place_name;
    return typeof name === 'string' && name.trim() ? name.trim() : null;
  } catch { return null; }
}

/* each place is looked up once per phone, so a place MapTiler can't find isn't asked about again */
const TRIED = 'pins-tried';
let running = false;

/** Finds map pins for the trip's places that have none (filed by Claude or made by the planner).
    Each city is looked up first, and a place's match only counts within 50 km of it, so a name
    that also exists elsewhere never lands in the wrong country. Changes go through the trip's
    rules like any edit; someone whose edits need approval doesn't look anything up. */
export async function findPins(trip: Trip) {
  if (running || trip.sample || !navigator.onLine) return;
  const role = getState().sync[trip.id]?.role;
  const tried = new Set(pref<string[]>(TRIED, []));
  const todo = trip.places.filter(p => (p.lat == null || p.lng == null) && !tried.has(p.id)).slice(0, 40);
  if (!todo.length) return;
  running = true;
  try {
    const cities = new Map<string, LatLng | null>();
    const cityOf = async (destId?: string) => {
      const d = trip.destinations.find(x => x.id === destId);
      if (!d) return null;
      if (!cities.has(d.id)) cities.set(d.id, await geocode(d.name, { country: d.country }));
      return cities.get(d.id) || null;
    };
    const found: Record<string, LatLng> = {};
    for (const p of todo) {
      const d = trip.destinations.find(x => x.id === p.destinationId);
      const centre = await cityOf(p.destinationId);
      tried.add(p.id);
      if (!centre) continue;
      let hit = await geocode([p.name, d?.name].filter(Boolean).join(', '), { near: centre, country: d?.country, poi: true });
      /* not found by name: the named spot in its area ("Near Nishiki Market"), if it has one. A
         city-wide guess would put the pin somewhere misleading, so there is no looser search. */
      const area = (p.area || '').replace(/^(near|by|around|off)\s+/i, '').trim();
      if (!hit && area.length > 3) hit = await geocode([area, d?.name].filter(Boolean).join(', '), { near: centre, country: d?.country, poi: true });
      if (hit && metres(hit.lat, hit.lng, centre.lat, centre.lng) < 50_000) found[p.id] = hit;
    }
    setPref(TRIED, [...tried].slice(-2000));
    if (!Object.keys(found).length) return;
    const add = (t: Trip): Trip => ({ ...t, places: t.places.map((p: Place) => (found[p.id] && p.lat == null ? { ...p, ...found[p.id] } : p)) });
    const now = getState().trips.find(t => t.id === trip.id);
    if (!now) return;
    if (role && verdict(now, add(now), role) !== 'ok') return;
    patchTrip(trip.id, add);
  } finally { running = false; }
}
