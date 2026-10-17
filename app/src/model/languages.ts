/* Which languages people speak where you're going, so nobody lands in Brussels expecting Dutch
   only (Adam, Oct 16). By country code, with regions where it matters, how far English gets you,
   and the phrase pack the app has for it, if any. */
export interface Langs { names: string; regions?: string; english: string; pack?: string }

export const LANGUAGES: Record<string, Langs> = {
  JP: { names: 'Japanese', english: 'Signs and transit announcements are in English too; outside hotels and big stations, few people speak much.', pack: 'ja' },
  BE: { names: 'French and Dutch (and some German)', regions: 'Brussels: French and Dutch, mostly French on the street. Flanders (Bruges, Ghent, Antwerp): Dutch. Wallonia (Liège, Namur): French. A small German-speaking area in the east.', english: 'Widely spoken, especially in Flanders and by younger people.' },
  CH: { names: 'German, French and Italian', regions: 'Zurich, Bern, Lucerne: Swiss German. Geneva, Lausanne: French. Lugano: Italian.', english: 'Widely spoken in cities and tourism.' },
  CA: { names: 'English and French', regions: 'Quebec (Montreal, Quebec City): French first.', english: 'Everywhere, though Quebec prefers French.' },
  FR: { names: 'French', english: 'In tourist areas; a "bonjour" first goes a long way.' },
  IT: { names: 'Italian', english: 'In tourist areas; less in the south and small towns.' },
  ES: { names: 'Spanish', regions: 'Barcelona: Catalan and Spanish. Basque Country: Basque and Spanish. Galicia: Galician and Spanish.', english: 'In tourist areas.' },
  PT: { names: 'Portuguese', english: 'Widely spoken, especially by younger people.' },
  DE: { names: 'German', english: 'Widely spoken.' },
  AT: { names: 'German', english: 'Widely spoken.' },
  NL: { names: 'Dutch', english: 'Almost everyone speaks it.' },
  GR: { names: 'Greek', english: 'In tourist areas and islands.' },
  GB: { names: 'English', regions: 'Wales: Welsh on signs too.', english: 'Native.' },
  IE: { names: 'English (and Irish)', english: 'Native.' },
  IS: { names: 'Icelandic', english: 'Almost everyone speaks it.' },
  US: { names: 'English', english: 'Native.' },
  MX: { names: 'Spanish', english: 'In tourist areas like Cancún and Tulum; less elsewhere.' },
  PE: { names: 'Spanish (and Quechua)', english: 'Limited outside hotels and tours.' },
  TH: { names: 'Thai', english: 'In tourist areas and hotels.' },
  VN: { names: 'Vietnamese', english: 'Limited outside tourist areas.' },
  KR: { names: 'Korean', english: 'Signs and subway in English; spoken English is limited.' },
  CN: { names: 'Mandarin Chinese', regions: 'Hong Kong: Cantonese and English.', english: 'Limited; a translation app helps.' },
  HK: { names: 'Cantonese and English', english: 'Widely understood.' },
  ID: { names: 'Indonesian', regions: 'Bali: Balinese too.', english: 'In tourist areas.' },
  AU: { names: 'English', english: 'Native.' },
  NZ: { names: 'English (and Māori)', english: 'Native.' },
  CZ: { names: 'Czech', english: 'In Prague and with younger people.' },
  HU: { names: 'Hungarian', english: 'In Budapest and with younger people.' },
  PL: { names: 'Polish', english: 'With younger people.' },
  TR: { names: 'Turkish', english: 'In tourist areas.' },
  MA: { names: 'Arabic and Berber (Amazigh), with French widely used', english: 'In tourist areas; French is more common.' },
  SE: { names: 'Swedish', english: 'Almost everyone speaks it.' },
  NO: { names: 'Norwegian', english: 'Almost everyone speaks it.' },
  DK: { names: 'Danish', english: 'Almost everyone speaks it.' },
};

/** The languages for a trip's destinations, one entry per country. */
export function tripLanguages(countries: string[]): { country: string; langs: Langs }[] {
  return [...new Set(countries.filter(Boolean))].flatMap(c => (LANGUAGES[c] ? [{ country: c, langs: LANGUAGES[c] }] : []));
}
