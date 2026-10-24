/* Search across the whole trip: days, legs, places, to-dos, notes, guides and phrases. */
import type { Trip } from './types';
import { indexTrip, cityOf, KIND_LABEL } from './trip';
import { longDate } from './time';
import { PACKS } from '../phrases';

/** Lower-case and strip accents one character at a time, so positions still line up for highlighting. */
export const fold = (s: string) => s.replace(/[À-ɏ]/g, c => c.normalize('NFD')[0]).toLowerCase();

export type Group = 'Days' | 'Travel' | 'Places' | 'Map' | 'Phrases' | 'To do' | 'Notes';
export interface Entry {
  g: Group;
  /** Where it is, e.g. "Wed Oct 28 · Plan". */
  k: string;
  t: string;
  x: string;
  day?: string;
  go?: 'essentials' | 'places' | 'prep' | 'phrases' | 'map';
  pq?: string;
  href?: string;
  h: string;
}

export function buildIndex(trip: Trip): Entry[] {
  const ix = indexTrip(trip), out: Entry[] = [];
  const add = (e: Omit<Entry, 'h'>) => out.push({ ...e, h: fold([e.k, e.t, e.x].join(' ')) });
  trip.days.forEach(d => {
    const label = longDate(d.date);
    add({ g: 'Days', k: label, t: cityOf(ix, d), x: d.summary, day: d.id });
    d.plan.forEach(p => add({ g: 'Days', k: label + ' · Plan', t: '', x: [p.text, ...(p.sub || [])].join(' · '), day: d.id }));
    d.tips.forEach(b => add({ g: 'Days', k: label + ' · Good to know', t: '', x: b.text, day: d.id }));
    d.around.forEach(b => add({ g: 'Days', k: label + ' · Getting around', t: '', x: b.text, day: d.id }));
  });
  trip.legs.forEach(l => add({ g: 'Travel', k: l.dayId ? longDate(trip.days[ix.dayPos.get(l.dayId)!].date) : 'Before the trip', t: `${l.from} → ${l.to}`, x: [l.how, l.tickets, l.details].filter(Boolean).join(' · '), go: 'essentials' }));
  trip.places.forEach(p => add({ g: 'Places', k: [p.destinationId && ix.dest.get(p.destinationId)?.name, p.wishlist ? 'Wishlist' : KIND_LABEL[p.kind]].filter(Boolean).join(' · '), t: p.name, x: [p.notes, p.area, p.dietNote].filter(Boolean).join(' · '), go: p.kind === 'food' || p.kind === 'coffee' ? 'places' : 'map' }));
  trip.todos.forEach(t => add({ g: 'To do', k: t.group + (t.when ? ' · ' + t.when : ''), t: t.text, x: t.details || '', go: 'prep' }));
  trip.notes.forEach(n => add({ g: 'Notes', k: 'Group notes · ' + n.author, t: '', x: n.text, go: 'prep' }));
  trip.guides.forEach(g => g.items.forEach(r => add({ g: 'Notes', k: g.group + ' · ' + g.title, t: r.title, x: r.body, go: 'prep' })));
  const pack = trip.phrasePack ? PACKS[trip.phrasePack] : undefined;
  pack?.groups.forEach(g => g.items.forEach(it => add({ g: 'Phrases', k: g.cat, t: it.en, x: [it.ja, it.ro, it.when].filter(Boolean).join(' · '), go: 'phrases', pq: it.en })));
  return out;
}

export function search(idx: Entry[], q: string) {
  const terms = fold(q).split(/\s+/).filter(Boolean);
  return { terms, hits: idx.filter(e => terms.every(t => e.h.includes(t))) };
}
