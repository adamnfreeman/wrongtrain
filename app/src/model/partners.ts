/* Things travellers need anyway, from partners who pay a commission when someone books through
   WrongTrain: an eSIM, a rail pass, tours, travel insurance. Shown on the planning screen while
   a trip is planned (ui/planning.tsx), always labelled.

   The links are plain until each programme approves us. Then put the ids in REF and the links
   carry them; nothing else changes. */

/** Affiliate ids, by partner. Empty: a plain link, no commission. */
export const REF = {
  /** Airalo partner programme (Impact): the tracking link prefix */
  airalo: '',
  /** Viator partner id (pid) and campaign (mcid) */
  viatorPid: '', viatorMcid: '',
  /** Klook affiliate id (aid) */
  klook: '',
  /** SafetyWing referenceID */
  safetywing: '',
};

interface Country { name: string; code: string; esim: string; rail?: 'jr' | 'eurail' }
const COUNTRIES: [RegExp, Country][] = [
  [/japan|tokyo|kyoto|osaka|hokkaido|okinawa/i, { name: 'Japan', code: 'JP', esim: 'japan', rail: 'jr' }],
  [/ital|rome|florence|venice|milan|amalfi|sicily/i, { name: 'Italy', code: 'IT', esim: 'italy', rail: 'eurail' }],
  [/france|paris|nice|lyon|provence/i, { name: 'France', code: 'FR', esim: 'france', rail: 'eurail' }],
  [/spain|barcelona|madrid|seville|ibiza/i, { name: 'Spain', code: 'ES', esim: 'spain', rail: 'eurail' }],
  [/portugal|lisbon|porto/i, { name: 'Portugal', code: 'PT', esim: 'portugal', rail: 'eurail' }],
  [/germany|berlin|munich/i, { name: 'Germany', code: 'DE', esim: 'germany', rail: 'eurail' }],
  [/greece|athens|santorini|mykonos/i, { name: 'Greece', code: 'GR', esim: 'greece' }],
  [/united kingdom|\buk\b|england|london|scotland|edinburgh/i, { name: 'the UK', code: 'GB', esim: 'united-kingdom' }],
  [/iceland|reykjavik/i, { name: 'Iceland', code: 'IS', esim: 'iceland' }],
  [/mexico|cancun|tulum|oaxaca/i, { name: 'Mexico', code: 'MX', esim: 'mexico' }],
  [/peru|lima|cusco/i, { name: 'Peru', code: 'PE', esim: 'peru' }],
  [/thailand|bangkok|phuket|chiang mai/i, { name: 'Thailand', code: 'TH', esim: 'thailand' }],
  [/vietnam|hanoi|ho chi minh|saigon/i, { name: 'Vietnam', code: 'VN', esim: 'vietnam' }],
  [/korea|seoul|busan/i, { name: 'South Korea', code: 'KR', esim: 'south-korea' }],
  [/bali|indonesia|jakarta/i, { name: 'Indonesia', code: 'ID', esim: 'indonesia' }],
  [/australia|sydney|melbourne/i, { name: 'Australia', code: 'AU', esim: 'australia' }],
];

export const countryOf = (where: string): Country | null => COUNTRIES.find(([re]) => re.test(where))?.[1] || null;

export interface PartnerCard { id: string; title: string; body: string; cta: string; url: string }

const withParams = (url: string, p: Record<string, string>) => {
  const u = new URL(url);
  Object.entries(p).forEach(([k, v]) => { if (v) u.searchParams.set(k, v); });
  return u.toString();
};

/** The cards for a trip: an eSIM, a rail pass where one is worth it, tours in the first city, insurance. */
export function partnerCards(where: string, city?: string): PartnerCard[] {
  const c = countryOf(where), place = city || c?.name || where.trim() || 'your trip';
  const cards: PartnerCard[] = [];
  const esim = `https://www.airalo.com/${c ? c.esim + '-esim' : ''}`;
  cards.push({
    id: 'esim', title: 'Data the moment you land', cta: c ? `See eSIMs for ${c.name}` : 'See travel eSIMs',
    body: `An eSIM for ${c?.name || 'where you are going'}: set it up at home, switch it on when you land. No roaming bill, no SIM swapping.`,
    url: REF.airalo ? REF.airalo + encodeURIComponent(esim) : esim,
  });
  if (c?.rail === 'jr') cards.push({
    id: 'rail', title: 'Thinking about a JR Pass?', cta: 'Compare JR Passes',
    body: 'Covers most JR trains, including most bullet trains. Worth it when you go between several cities.',
    url: withParams('https://www.klook.com/search/result/?query=JR%20Pass', { aid: REF.klook }),
  });
  if (c?.rail === 'eurail') cards.push({
    id: 'rail', title: 'Trains between cities', cta: 'See Eurail passes',
    body: 'A rail pass can beat buying each ticket when you hop between several cities. Reserved seats on fast trains cost a little extra.',
    url: 'https://www.eurail.com/en/eurail-passes',
  });
  cards.push({
    id: 'tours', title: `Top things to do in ${place}`, cta: 'Browse tours and tickets',
    body: 'Tours, tickets and day trips, many with free cancellation. Popular ones sell out, so it pays to look early.',
    url: withParams(`https://www.viator.com/searchResults/all?text=${encodeURIComponent(place)}`, { pid: REF.viatorPid, mcid: REF.viatorMcid, medium: REF.viatorPid ? 'link' : '' }),
  });
  cards.push({
    id: 'insurance', title: 'Travel insurance', cta: 'Get a quote',
    body: 'For medical bills abroad, cancelled flights and lost bags. Quick to set up, and you can buy it after you have left home.',
    url: withParams('https://safetywing.com/nomad-insurance', { referenceID: REF.safetywing }),
  });
  return cards;
}
