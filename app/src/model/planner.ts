/* Turns a plan from "Plan it for me" (supabase/functions/_shared/planner.ts) into a normal trip,
   which the group then changes as they like.

   - Each stop becomes a destination with a day per night; the trip ends with a day home.
   - Hotels: the one Claude picked for the budget is the stay on each night there; the others are
     kept as ideas, so anyone wanting cheaper or nicer has options nearby.
   - Food and sights become places; ones in a day's plan are on that day, the rest are ideas.
   - Travel between stops becomes legs, still to book. Bookings to make become to-dos. */
import type { Answers, Outline, StopPlan } from '../../supabase/functions/_shared/planner.ts';
import { dollars } from '../../supabase/functions/_shared/planner.ts';
import type { Leg, LegMode, Place, Todo, Trip } from './types';
import { newTrip } from './edit';
import { newId } from './trip';
import { COUNTRY_LANG } from '../phrases';

/** A time zone the phone knows, or the closest guess from the city's name. */
export function realZone(tz: string, city: string): string {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { /* not a zone */ }
  const n = city.trim().toLowerCase().replace(/\s+/g, '_');
  const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') || [];
  return all.find(z => z.toLowerCase().endsWith('/' + n)) || 'UTC';
}

const MODE: Record<string, LegMode> = { flight: 'flight', train: 'train', bus: 'bus', car: 'car', ferry: 'ferry' };

export function planToTrip(a: Answers, o: Outline, stops: (StopPlan | null)[]): Trip {
  const names = a.travelers.map(t => t.name.trim()).filter(Boolean);
  const country = o.stops[0]?.country || '';
  let t = newTrip({
    name: o.title || a.where, start: o.start,
    stops: o.stops.map(s => ({ name: s.city, timeZone: realZone(s.timeZone, s.city), nights: s.nights, country: s.country })),
    travelers: names, ...(COUNTRY_LANG[country] ? { phrasePack: COUNTRY_LANG[country] } : {}),
  });
  const places: Place[] = [], todos: Todo[] = [], legs: Leg[] = [];
  const days = t.days.map(d => ({ ...d }));
  const destOf = (city: string) => t.destinations.find(d => d.name.toLowerCase() === city.trim().toLowerCase())?.id;
  const todo = (text: string) => { if (!todos.some(x => x.text === text)) todos.push({ id: newId('t'), group: 'Before the trip', text, done: false }); };

  let at = 0;
  o.stops.forEach((s, i) => {
    const destinationId = destOf(s.city), mine = days.slice(at, at + s.nights);
    const p = stops[i];
    if (i > 0 && mine[0]) {
      const hop = o.hops.find(h => h.to.toLowerCase().includes(s.city.toLowerCase())) || o.hops[i - 1];
      legs.push({
        id: newId('l'), dayId: mine[0].id, from: o.stops[i - 1].city, to: s.city, mode: MODE[hop?.mode || ''] || 'train',
        how: hop?.how || '', status: 'todo', ...(hop?.duration ? { details: `About ${hop.duration}.` } : {}),
      });
    }
    if (p) {
      /* hotels */
      p.hotels.forEach(h => {
        const id = newId('h');
        places.push({
          id, name: h.name, kind: 'stay', ...(destinationId ? { destinationId } : {}), area: h.area,
          notes: `${dollars(h.price)} · ${h.why}${h.pick ? '' : ' Another option nearby.'}`, ...(h.link ? { link: h.link } : {}),
          ...(h.pick ? {} : { wishlist: true }),
        });
        if (h.pick) { mine.forEach(d => { d.stayId = id; }); todo(`Book ${h.name} (${s.city}, ${s.nights} nights)`); }
      });
      /* food, sights and the rest */
      const byKey = new Map<string, string>();
      p.places.forEach(x => {
        const id = newId('p');
        byKey.set(x.key, id);
        places.push({
          id, name: x.name, kind: x.kind, ...(destinationId ? { destinationId } : {}), area: x.area,
          notes: x.notes + (x.bookAhead ? ' Book ahead.' : ''), ...(x.link ? { link: x.link } : {}),
          ...(x.veg ? { diet: 'veg-some' as const } : {}), wishlist: true,
        });
      });
      /* the days */
      p.days.forEach((pd, k) => {
        const d = mine[k]; if (!d) return;
        if (pd.title) d.title = pd.title;
        d.summary = pd.summary || d.summary;
        d.plan = pd.plan.map(x => ({
          id: newId('i'), text: x.text, ...(x.time ? { time: x.time } : {}), ...(x.fixed ? { fixed: true } : {}),
          ...(x.placeKey && byKey.has(x.placeKey) ? { placeId: byKey.get(x.placeKey)! } : {}),
        }));
        /* a place in the plan is on that day, not just an idea */
        pd.plan.forEach(x => {
          const id = x.placeKey && byKey.get(x.placeKey), pl = id && places.find(q => q.id === id);
          if (pl) { pl.wishlist = undefined; pl.dayIds = [...new Set([...(pl.dayIds || []), d.id])]; }
        });
        d.eatIds = places.filter(q => (q.kind === 'food' || q.kind === 'coffee') && q.dayIds?.includes(d.id)).map(q => q.id);
      });
      if (mine[0] && p.around.length) mine[0].around = p.around.map(text => ({ text }));
      p.todos.forEach(todo);
    }
    at += s.nights;
  });

  t = {
    ...t, days, places, legs,
    todos: [...t.todos, ...todos],
    guides: [{
      id: newId('g'), group: 'Before you go', title: 'The plan',
      items: [{ title: 'The shape of the trip', body: o.summary }, { title: 'Getting there', body: o.arrival },
        ...o.tips.map((tip, i) => ({ title: `Tip ${i + 1}`, body: tip }))],
    }],
  };
  return t;
}
