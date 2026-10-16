/* "Something nearby": pick a mood, get five places near you.

   The app asks OpenStreetMap (the Overpass API) for named places of the right sort around you,
   then, on a shared trip with uses left, the suggest-nearby function asks Claude to pick the best
   five and say why in a line. Without Claude, the five nearest are shown.

   Plain TypeScript with no Deno or browser APIs, so the Edge Function, the app and the unit tests
   can all use it. */

/** The moods to choose from. Each is a set of OpenStreetMap tags; a value is a regular expression. */
export const MOODS = [
  { key: 'food', label: 'Food', tags: [['amenity', '^(restaurant|fast_food|food_court)$']] },
  { key: 'coffee', label: 'Coffee & cake', tags: [['amenity', '^(cafe|ice_cream)$'], ['shop', '^(bakery|pastry|confectionery)$']] },
  { key: 'drinks', label: 'Drinks', tags: [['amenity', '^(bar|pub|biergarten|nightclub)$']] },
  { key: 'rest', label: 'Rest', tags: [['leisure', '^(park|garden|spa|sauna)$'], ['amenity', '^public_bath$'], ['natural', '^beach$']] },
  { key: 'sights', label: 'Sightseeing', tags: [['tourism', '^(attraction|viewpoint)$'], ['historic', '^(castle|monument|memorial|ruins|archaeological_site|city_gate|building|church|temple|shrine)$']] },
  { key: 'culture', label: 'Culture', tags: [['tourism', '^(museum|gallery)$'], ['amenity', '^(theatre|arts_centre)$']] },
  { key: 'adventure', label: 'Adventure', tags: [['tourism', '^(zoo|aquarium|theme_park)$'], ['leisure', '^(nature_reserve|water_park|escape_game|amusement_arcade|ice_rink|climbing|trampoline_park)$'], ['sport', '^climbing$']] },
  { key: 'film', label: 'A film', tags: [['amenity', '^cinema$']] },
  { key: 'shopping', label: 'Shopping', tags: [['shop', '^(mall|department_store|clothes|books|gift|shoes|second_hand|antiques|music|art|craft|games)$'], ['amenity', '^marketplace$']] },
] as const;
export type Mood = (typeof MOODS)[number]['key'];
export const isMood = (s: unknown): s is Mood => MOODS.some(m => m.key === s);

/** A place OpenStreetMap knows about, near you. */
export interface Candidate {
  /** OpenStreetMap's id, e.g. "node/123" */
  id: string;
  name: string;
  /** What it is, in words: "Restaurant · ramen" */
  what: string;
  lat: number;
  lng: number;
  /** Metres from you, as the crow flies. */
  dist: number;
  /** OpenStreetMap opening hours, as written there ("Mo-Fr 09:00-18:00"). */
  hours?: string;
  website?: string;
}

/** Claude's choice: up to five candidates, each with a line on why. */
export interface Pick { id: string; why: string }
export interface Picks { picks: Pick[] }

/** The Overpass query for a mood within radius metres of a point. */
export function overpassQuery(mood: Mood, lat: number, lng: number, radius: number): string {
  const m = MOODS.find(x => x.key === mood)!;
  const at = `(around:${Math.round(radius)},${lat.toFixed(5)},${lng.toFixed(5)})`;
  const parts = m.tags.map(([k, re]) => `  nwr["${k}"~"${re}"]["name"]${at};`);
  return `[out:json][timeout:15];\n(\n${parts.join('\n')}\n);\nout center 120;`;
}

/** Metres between two points (haversine). */
export function metresBetween(a: number, b: number, c: number, d: number): number {
  const r = Math.PI / 180, x = Math.sin(((c - a) * r) / 2), y = Math.sin(((d - b) * r) / 2);
  return 2 * 6371000 * Math.asin(Math.sqrt(x * x + Math.cos(a * r) * Math.cos(c * r) * y * y));
}

const words = (s: string) => s.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

/** What a place is, from its tags. */
function whatOf(t: Record<string, string>): string {
  const main = t.tourism || t.amenity || t.leisure || t.shop || t.historic || t.natural || t.sport || 'place';
  const label = t.shop && !t.amenity ? `${words(t.shop)} shop`.replace(/^Mall shop$/, 'Shopping mall') : words(main);
  const extra = t.cuisine ? t.cuisine.split(';').slice(0, 2).map(c => c.replace(/_/g, ' ')).join(', ') : '';
  return extra ? `${label} · ${extra}` : label;
}

export interface OsmElement { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

/** The nearest named places from an Overpass answer, one per name, closest first. */
export function candidatesFrom(json: { elements?: OsmElement[] }, lat: number, lng: number, max = 40): Candidate[] {
  const seen = new Set<string>(), out: Candidate[] = [];
  const all = (json.elements || []).flatMap(e => {
    const p = e.center || (e.lat != null && e.lon != null ? { lat: e.lat, lon: e.lon } : null);
    const name = e.tags?.['name:en'] || e.tags?.name;
    if (!p || !name) return [];
    return [{ e, p, name, dist: metresBetween(lat, lng, p.lat, p.lon) }];
  }).sort((a, b) => a.dist - b.dist);
  for (const { e, p, name, dist } of all) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const t = e.tags!;
    out.push({
      id: `${e.type}/${e.id}`, name, what: whatOf(t), lat: p.lat, lng: p.lon, dist: Math.round(dist),
      ...(t.opening_hours ? { hours: t.opening_hours } : {}), ...(t.website ? { website: t.website } : {}),
    });
    if (out.length >= max) break;
  }
  return out;
}

/* ---------- asking Claude ---------- */

const obj = (props: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(props), properties: props });

/** JSON schema for structured outputs. */
export const PICKS_SCHEMA = obj({
  picks: { type: 'array', items: obj({ id: { type: 'string' }, why: { type: 'string' } }) },
});

export const NEARBY_SYSTEM = `You help someone on a trip choose where to go next. You get their mood, the local day and time, and a list of real places near them from OpenStreetMap, with distances and opening hours where known.

Pick the five best places for the mood, best first. Prefer places that are likely open now (read the opening hours against the local time; if hours are missing, it may be open), that are close, and that are worth the trip: something with character over a chain, unless the mood or the hour calls for something quick. Give a varied five rather than five of the same.

For each, write "why" as one short sentence (under 20 words) in plain words: what it is and why it suits right now. Do not invent facts that are not in the list: no ratings, prices, dishes or history you were not given. If fewer than five fit, return fewer.

Use only ids from the list.`;

/** The message for Claude: mood, time and the candidates, kept short. */
export function nearbyPrompt(mood: Mood, localTime: string, candidates: Candidate[]): string {
  const label = MOODS.find(m => m.key === mood)!.label;
  const lines = candidates.slice(0, 40).map(c => [c.id, c.name, c.what, `${c.dist} m`, c.hours ? `hours: ${c.hours}` : ''].filter(Boolean).join(' | '));
  return `Mood: ${label}\nLocal time: ${localTime}\n\nPlaces (id | name | what | distance | hours):\n${lines.join('\n')}`;
}

/** Keeps only picks that name a candidate, at most five, each once. */
export function cleanPicks(p: unknown, candidates: Candidate[]): Pick[] {
  const list = (p as Picks)?.picks;
  if (!Array.isArray(list)) return [];
  const ids = new Set(candidates.map(c => c.id)), seen = new Set<string>();
  return list.filter(x => x && typeof x.id === 'string' && typeof x.why === 'string' && ids.has(x.id) && !seen.has(x.id) && seen.add(x.id))
    .slice(0, 5).map(x => ({ id: x.id, why: x.why.trim().slice(0, 200) }));
}
