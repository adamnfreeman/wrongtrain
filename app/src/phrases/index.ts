import type { PhrasePack } from './types';
import ja from './ja';
import es from './es';
import fr from './fr';
import it from './it';
import pt from './pt';
import de from './de';
import ko from './ko';
import zh from './zh';
import th from './th';
import el from './el';

/** Phrase packs by language code. Add a pack here to offer it for trips to that country. */
export const PACKS: Record<string, PhrasePack> = { ja, es, fr, it, pt, de, ko, zh, th, el };

/** Language spoken in a country, for picking a pack when a trip is planned. */
export const COUNTRY_LANG: Record<string, string> = {
  JP: 'ja', KR: 'ko', CN: 'zh', TH: 'th', GR: 'el', CY: 'el',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', PE: 'es', CL: 'es', CR: 'es', CU: 'es', EC: 'es', UY: 'es', GT: 'es', DO: 'es', BO: 'es', PA: 'es',
  FR: 'fr', MC: 'fr', IT: 'it', SM: 'it', VA: 'it', PT: 'pt', DE: 'de', AT: 'de', LI: 'de',
};

/* a stop's time zone, when that's all a new trip knows: the main city zones of each language */
const ZONE_LANG: Record<string, string> = {
  'Asia/Tokyo': 'ja', 'Asia/Seoul': 'ko', 'Asia/Shanghai': 'zh', 'Asia/Bangkok': 'th', 'Europe/Athens': 'el',
  'Europe/Madrid': 'es', 'Atlantic/Canary': 'es', 'America/Mexico_City': 'es', 'America/Cancun': 'es', 'America/Argentina/Buenos_Aires': 'es',
  'America/Bogota': 'es', 'America/Lima': 'es', 'America/Santiago': 'es', 'America/Costa_Rica': 'es', 'America/Havana': 'es',
  'Europe/Paris': 'fr', 'Europe/Monaco': 'fr', 'Europe/Rome': 'it', 'Europe/Lisbon': 'pt', 'Atlantic/Madeira': 'pt', 'Atlantic/Azores': 'pt',
  'Europe/Berlin': 'de', 'Europe/Vienna': 'de',
};

/** The pack for a new trip's stops, by the first stop whose time zone has one. */
export function packForZones(zones: string[]): string | undefined {
  for (const z of zones) if (ZONE_LANG[z] && PACKS[ZONE_LANG[z]]) return ZONE_LANG[z];
  return undefined;
}

/** A pack for a trip that never had one picked: its first destination in a country we have one for. */
export function packForTrip(t: { destinations: { country?: string; timeZone?: string }[] }): PhrasePack | undefined {
  for (const d of t.destinations) {
    const lang = (d.country && COUNTRY_LANG[d.country.toUpperCase()]) || (d.timeZone && ZONE_LANG[d.timeZone]);
    if (lang && PACKS[lang]) return PACKS[lang];
  }
  return undefined;
}
