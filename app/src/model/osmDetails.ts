/* Free place details from OpenStreetMap, for Essentials: the address, phone and website mapped on
   a hotel or place near its pin. Matching is by name (a hotel can also be the only one right at
   its pin). Pure, so it can be tested; the lookup itself is in sync/details.ts. */
import type { Place } from './types';
import { metres } from './trip';

type El = { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
export interface OsmFound { address?: string; phone?: string; website?: string }

const LODGING = 'hotel|hostel|guest_house|apartment|motel';

/** Lodging near a hotel's pin, or anything named near another place's. */
export function osmQuery(p: Place): string {
  const at = `around:${p.kind === 'stay' ? 250 : 150},${p.lat},${p.lng}`;
  const what = p.kind === 'stay' ? `nwr(${at})[tourism~"^(${LODGING})$"];` : `nwr(${at})[name];`;
  return `[out:json][timeout:20];(${what});out tags center 60;`;
}

const STOP = new Set(['the', 'hotel', 'hostel', 'inn', 'and', 'by', 'at', 'of', 'a', 'your', 'kyoto', 'osaka', 'tokyo', 'nara']);
const words = (s: string) => s.toLowerCase().normalize('NFKC').replace(/[()'’.,&/-]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));

/** How much of the place's name an OSM name shares, 0 to 1. Japanese names compare whole. */
export function nameMatch(want: string, got: string): number {
  if (!got) return 0;
  const a = want.trim().toLowerCase(), b = got.trim().toLowerCase();
  if (a === b || (b.length > 3 && a.includes(b)) || (a.length > 3 && b.includes(a))) return 1;
  const w = words(want), g = new Set(words(got));
  return w.length ? w.filter(x => g.has(x)).length / w.length : 0;
}

/** An address from OSM's addr:* tags, Western ("12 Main St") or Japanese (block-house, area, city). */
export function osmAddress(t: Record<string, string>): string | undefined {
  if (t['addr:full']) return t['addr:full'];
  const num = t['addr:housenumber'], street = t['addr:street'], block = t['addr:block_number'];
  const first = street ? [num, street].filter(Boolean).join(' ') : block ? [block, num].filter(Boolean).join('-') : '';
  if (!first) return undefined;
  const rest = [t['addr:neighbourhood'], t['addr:quarter'], t['addr:suburb'], t['addr:district'], t['addr:city'], [t['addr:province'] || t['addr:state'], t['addr:postcode']].filter(Boolean).join(' ')];
  return [first, ...rest].filter(x => x && x.trim()).join(', ');
}

/** The best OSM match for a place in an Overpass answer, and what it knows. */
export function pickOsm(json: unknown, p: Place): OsmFound | null {
  const els = ((json as { elements?: El[] })?.elements || []).filter(e => e.tags);
  const where = (e: El) => (e.center ? e.center : { lat: e.lat ?? 0, lon: e.lon ?? 0 });
  const scored = els.map(e => {
    const t = e.tags!, c = where(e);
    const score = Math.max(...['name', 'name:en', 'official_name', 'brand', 'name:ja'].map(k => nameMatch(p.name, t[k] || '')));
    return { e, score, dist: metres(c.lat, c.lon, p.lat!, p.lng!) };
  }).sort((x, y) => y.score - x.score || x.dist - y.dist);
  let best = scored[0]?.score >= 0.6 ? scored[0] : undefined;
  /* a hotel's own pin: the only lodging within 60 m is very likely it */
  if (!best && p.kind === 'stay') {
    const close = scored.filter(s => s.dist < 60);
    if (close.length === 1) best = close[0];
  }
  if (!best) return null;
  const t = best.e.tags!;
  const out: OsmFound = {
    address: osmAddress(t),
    phone: t.phone || t['contact:phone'] || undefined,
    website: t.website || t['contact:website'] || undefined,
  };
  if (out.phone) out.phone = out.phone.split(';')[0].trim();
  if (out.website && !/^https?:\/\//.test(out.website)) out.website = 'https://' + out.website;
  return out.address || out.phone || out.website ? out : null;
}
