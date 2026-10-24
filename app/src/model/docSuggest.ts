/* Documents a trip may need, suggested on Wallet → Documents until one is added or waved away:
   a passport and travel insurance for a trip abroad, entry forms some countries ask for, an
   International Driving Permit when there's driving, and the tickets and bookings not yet kept here.
   Home is the phone's own region; nothing is suggested for staying in your own country. */
import type { Doc, DocKind, Trip } from './types';

export interface DocSuggestion { key: string; title: string; why: string; kind: DocKind; link?: string }

/* entry forms and travel authorisations that go with a country, whatever your passport */
const ENTRY: Record<string, { title: string; why: string; link: string }> = {
  JP: { title: 'Visit Japan Web', why: 'Register before you fly: it gives the QR codes for immigration and customs at the airport.', link: 'https://www.vjw.digital.go.jp/' },
  GB: { title: 'UK Electronic Travel Authorisation (ETA)', why: 'Most visitors need one to enter the UK. Apply online a few days ahead.', link: 'https://www.gov.uk/guidance/apply-for-an-electronic-travel-authorisation-eta' },
  AU: { title: 'Australian visa or ETA', why: 'Every visitor needs one before flying to Australia.', link: 'https://immi.homeaffairs.gov.au/' },
};

const homeRegion = () => (navigator.language.split('-')[1] || '').toUpperCase();

export function docSuggestions(trip: Trip, have: Doc[], skipped: string[], home = homeRegion()): DocSuggestion[] {
  const abroad = [...new Set(trip.destinations.map(d => d.country?.toUpperCase()).filter(c => c && c !== home))];
  const has = (kind: DocKind, word?: RegExp) => have.some(d => d.kind === kind && (!word || word.test(d.title)));
  const out: DocSuggestion[] = [];
  if (abroad.length) {
    if (!has('id', /passport/i)) out.push({ key: 'passport', kind: 'id', title: 'Your passport', why: 'A photo of the photo page, kept just on this phone. Check it is valid for the whole trip; some countries want six months left.' });
    if (!has('insurance')) out.push({ key: 'insurance', kind: 'insurance', title: 'Travel insurance', why: 'The policy and the emergency number, so they open with no signal.' });
    for (const c of abroad) {
      const e = ENTRY[c!];
      if (e && !have.some(d => d.title.toLowerCase().includes(e.title.toLowerCase().split(' (')[0]))) out.push({ key: 'entry-' + c, kind: 'other', ...e });
    }
    out.push({ key: 'visa', kind: 'id', title: 'Visa or entry rules', why: `Check what your passport needs to enter ${trip.destinations.filter(d => d.country && d.country.toUpperCase() !== home).map(d => d.name).filter((n, i, a) => a.indexOf(n) === i).slice(0, 3).join(', ')}.`, link: 'https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages.html' });
    if (trip.legs.some(l => l.mode === 'car') && !has('id', /driving|idp/i)) out.push({ key: 'idp', kind: 'id', title: 'International Driving Permit', why: 'Needed with your licence to drive in many countries, Japan and Italy among them.' });
  }
  /* booked travel with nothing kept for it yet */
  const flights = trip.legs.filter(l => l.mode === 'flight' && l.status === 'booked');
  if (flights.length && !flights.some(l => have.some(d => d.for?.kind === 'leg' && d.for.id === l.id))) out.push({ key: 'flights', kind: 'ticket', title: 'Flight confirmations', why: 'Attach them to the flights, so they show on Right now and in Essentials.' });
  const stays = new Set(trip.days.map(d => d.stayId).filter(Boolean));
  if (stays.size && !has('booking')) out.push({ key: 'stays', kind: 'booking', title: 'Hotel bookings', why: 'The confirmations, for check-in and the address in the local language.' });
  return out.filter(s => !skipped.includes(s.key));
}
