import { describe, expect, it } from 'vitest';
import { planToTrip, realZone } from './planner';
import { blankAnswers, cleanOutline, cleanStopPlan, outlinePrompt, stopDates, type Outline, type StopPlan } from '../../supabase/functions/_shared/planner.ts';

const answers = { ...blankAnswers(), where: 'Japan', days: 10, travelers: [{ name: 'Adam', from: 'Chicago' }, { name: 'Ben', from: 'Denver' }], budget: 3, diets: ['Vegetarian'] };
const outline: Outline = {
  title: 'Japan in spring', summary: 'Osaka then Kyoto.', start: '2027-04-01', arrival: 'Fly into KIX.', tips: ['Get an IC card.'],
  stops: [
    { city: 'Osaka', country: 'JP', timeZone: 'Asia/Tokyo', nights: 4, why: 'Food.' },
    { city: 'Kyoto', country: 'JP', timeZone: 'Asia/Tokyo', nights: 5, why: 'Temples.' },
  ],
  hops: [{ from: 'Osaka', to: 'Kyoto', mode: 'train', how: 'JR Special Rapid', duration: '30 min' }],
};
const kyoto: StopPlan = {
  hotels: [
    { name: 'Hotel A', area: 'Gion', price: 4, why: 'Central.', link: 'https://a.example', pick: true },
    { name: 'Hostel B', area: 'Gion', price: 1, why: 'Cheap, two streets away.', link: null, pick: false },
  ],
  places: [
    { key: 'p1', name: 'Fushimi Inari', kind: 'sight', area: 'Fushimi', notes: 'Go early.', link: null, veg: false, bookAhead: false },
    { key: 'p2', name: 'Veg Ramen', kind: 'food', area: 'Gion', notes: 'All vegan.', link: null, veg: true, bookAhead: true },
  ],
  days: [{ date: '2027-04-05', title: 'Arrive', summary: 'Settle in.', plan: [{ time: '18:00', text: 'Dinner', placeKey: 'p2', fixed: false }] }],
  around: ['Buses are slow; walk.'], todos: ['Book a tea ceremony'],
};

describe('the outline', () => {
  it('never has more nights than the days allow', () => {
    const o = cleanOutline({ ...outline, stops: [{ ...outline.stops[0], nights: 8 }, { ...outline.stops[1], nights: 8 }] }, 10);
    expect(o.stops.reduce((n, s) => n + s.nights, 0)).toBe(9);
  });
  it('gives each stop its days, the leaving day belonging to the next', () => {
    expect(stopDates(outline, 1)).toEqual({ first: '2027-04-05', leave: '2027-04-10', nights: 5, dates: ['2027-04-05', '2027-04-06', '2027-04-07', '2027-04-08', '2027-04-09'] });
  });
  it('tells Claude who is going and from where', () => {
    const s = outlinePrompt(answers, '2026-10-16');
    expect(s).toMatch(/People: 2 – Adam from Chicago; Ben from Denver/);
    expect(s).toMatch(/Budget: \$\$\$ out of/);
    expect(s).toMatch(/Food needs: Vegetarian/);
  });
});

describe('a stop’s plan', () => {
  it('keeps one hotel picked, real times and real place keys', () => {
    const p = cleanStopPlan({ ...kyoto, hotels: kyoto.hotels.map(h => ({ ...h, pick: true })), days: [{ ...kyoto.days[0], plan: [{ time: '6pm', text: 'x', placeKey: 'nope', fixed: false }] }] }, ['2027-04-05', '2027-04-06']);
    expect(p.hotels.filter(h => h.pick)).toHaveLength(1);
    expect(p.days).toHaveLength(2);
    expect(p.days[0].plan[0]).toMatchObject({ time: null, placeKey: null });
  });
});

describe('planToTrip', () => {
  const t = planToTrip(answers, outline, [null, cleanStopPlan(kyoto, stopDates(outline, 1).dates)]);
  it('makes a day per night and a day home', () => {
    expect(t.days).toHaveLength(10);
    expect(t.days[0].date).toBe('2027-04-01');
    expect(t.days[9].travel).toBe(true);
    expect(t.destinations.map(d => d.name)).toEqual(['Osaka', 'Kyoto']);
    expect(t.travelers).toEqual(['Adam', 'Ben']);
    expect(t.phrasePack).toBe('ja');
  });
  it('stays at the picked hotel, keeping the others as options', () => {
    const a = t.places.find(p => p.name === 'Hotel A')!, b = t.places.find(p => p.name === 'Hostel B')!;
    expect(t.days.slice(4, 9).every(d => d.stayId === a.id)).toBe(true);
    expect(b.wishlist).toBe(true);
    expect(a.notes).toMatch(/^\$\$\$\$ · Central/);
    expect(t.todos.some(x => x.text === 'Book Hotel A (Kyoto, 5 nights)')).toBe(true);
  });
  it('puts planned places on their day, and the rest in ideas', () => {
    const veg = t.places.find(p => p.name === 'Veg Ramen')!, inari = t.places.find(p => p.name === 'Fushimi Inari')!;
    expect(veg.dayIds).toEqual([t.days[4].id]);
    expect(veg.diet).toBe('veg-some');
    expect(veg.notes).toMatch(/Book ahead\.$/);
    expect(inari.wishlist).toBe(true);
    expect(t.days[4].plan[0]).toMatchObject({ text: 'Dinner', time: '18:00', placeId: veg.id });
    expect(t.days[4].eatIds).toEqual([veg.id]);
    expect(t.days[4].title).toBe('Arrive');
  });
  it('adds travel between stops, still to book, and the tips', () => {
    expect(t.legs).toHaveLength(1);
    expect(t.legs[0]).toMatchObject({ from: 'Osaka', to: 'Kyoto', mode: 'train', status: 'todo', dayId: t.days[4].id });
    expect(t.guides[0].items.some(i => i.body === 'Get an IC card.')).toBe(true);
  });
  it('guesses a time zone when Claude’s is not real', () => {
    expect(realZone('Mars/Base', 'Tokyo')).toBe('Asia/Tokyo');
    expect(realZone('Europe/Rome', 'Florence')).toBe('Europe/Rome');
  });
});
