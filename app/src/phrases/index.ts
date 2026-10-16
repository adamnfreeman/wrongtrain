import type { PhrasePack } from './types';
import ja from './ja';

/** Phrase packs by language code. Add a pack here to offer it for trips to that country. */
export const PACKS: Record<string, PhrasePack> = { ja };

/** Language spoken in a country, for picking a pack when a trip is planned. */
export const COUNTRY_LANG: Record<string, string> = { JP: 'ja' };
