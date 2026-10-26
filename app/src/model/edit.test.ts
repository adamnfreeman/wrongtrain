import { describe, expect, it } from 'vitest';
import { copyTrip, deleteDay, deleteDestination, deletePlace, destinationUse, insertDay, newTrip, parseCoords, saveLeg, savePlace, setStart, sortPlan } from './edit';
import { makeSample } from './sample';
import type { Trip } from './types';

const consecutive = (t: Trip) => t.days.every((d, i) => i === 0 || new Date(d.date).getTime() - new Date(t.days[i - 1].date).getTime() === 864e5);

const trip = () => newTrip({
  name: 'Italy', start: '2027-05-01', travelers: ['Ana', 'Ben'],
  stops: [
    { name: 'Rome', timeZone: 'Europe/Rome', nights: 3 },
    { name: 'Florence', timeZone: 'Europe/Rome', nights: 2 },
    { name: 'Venice', timeZone: 'Europe/Rome', nights: 2 },
  ],
});

describe('newTrip', () => {
  it('turns nights into days, plus a travel day home', () => {
    const t = trip();
    expect(t.days).toHaveLength(8);
    expect(t.days[0].date).toBe('2027-05-01');
    expect(t.days[7].date).toBe('2027-05-08');
    expect(t.days[7].travel).toBe(true);
    expect(consecutive(t)).toBe(true);
  });
  it('gives each destination its own colour and files moving days under the arrival', () => {
    const t = trip();
    expect(new Set(t.destinations.map(d => d.color)).size).toBe(3);
    const florence = t.destinations.find(d => d.name === 'Florence')!;
    const rome = t.destinations.find(d => d.name === 'Rome')!;
    expect(t.days[3].destinationId).toBe(florence.id);
    expect(t.days[3].route).toEqual([rome.id, florence.id]);
    expect(t.days[4].route).toBeUndefined();
  });
  it('reuses a destination you return to', () => {
    const t = newTrip({ name: 'Loop', start: '2027-01-01', stops: [
      { name: 'Paris', timeZone: 'Europe/Paris', nights: 1 }, { name: 'Lyon', timeZone: 'Europe/Paris', nights: 1 }, { name: 'paris', timeZone: 'Europe/Paris', nights: 1 },
    ] });
    expect(t.destinations).toHaveLength(2);
  });
});

describe('days stay consecutive', () => {
  it('when a day is inserted in the middle', () => {
    const t = trip(), id = t.days[2].id;
    const u = insertDay(t, id);
    expect(u.days).toHaveLength(9);
    expect(u.days[3].plan).toEqual([]);
    expect(u.days[3].destinationId).toBe(t.days[2].destinationId);
    expect(u.days[8].date).toBe('2027-05-09');
    expect(consecutive(u)).toBe(true);
  });
  it('when a day is deleted, taking its legs with it', () => {
    let t = trip();
    t = saveLeg(t, { id: 'l1', dayId: t.days[3].id, from: 'Rome', to: 'Florence', mode: 'train', how: 'Frecciarossa', status: 'booked' });
    const u = deleteDay(t, t.days[3].id);
    expect(u.days).toHaveLength(7);
    expect(u.legs).toHaveLength(0);
    expect(u.days[6].date).toBe('2027-05-07');
    expect(consecutive(u)).toBe(true);
  });
  it('never deletes the only day', () => {
    const t = newTrip({ name: 'x', start: '2027-01-01', stops: [] });
    const one = insertDay({ ...t, days: [] }, undefined);
    expect(deleteDay(one, one.days[0].id).days).toHaveLength(1);
  });
  it('when the start date moves', () => {
    const u = setStart(trip(), '2027-12-30');
    expect(u.days[0].date).toBe('2027-12-30');
    expect(u.days[3].date).toBe('2028-01-02');
    expect(consecutive(u)).toBe(true);
  });
});

describe('places', () => {
  it('deleting one clears it from stays, plans, food lists and legs', () => {
    let t = trip();
    t = savePlace(t, { id: 'h', name: 'Hotel', kind: 'stay', destinationId: t.destinations[0].id });
    t = { ...t, days: t.days.map((d, i) => (i === 0 ? { ...d, stayId: 'h', eatIds: ['h'], plan: [{ id: 'p', text: 'Check in', placeId: 'h' }] } : d)) };
    t = saveLeg(t, { id: 'l', from: 'Hotel', to: 'Airport', mode: 'car', how: 'Taxi', status: 'none', fromPlaceId: 'h', dayId: t.days[0].id });
    const u = deletePlace(t, 'h');
    expect(u.places).toHaveLength(0);
    expect(u.days[0].stayId).toBeUndefined();
    expect(u.days[0].eatIds).toEqual([]);
    expect(u.days[0].plan[0].placeId).toBeUndefined();
    expect(u.legs[0].fromPlaceId).toBeUndefined();
  });
});

describe('destinations', () => {
  it('cannot be removed while days use them', () => {
    const t = trip(), rome = t.destinations[0];
    expect(destinationUse(t, rome.id).days).toBe(4);
    expect(deleteDestination(t, rome.id).destinations).toHaveLength(3);
  });
});

describe('legs', () => {
  it('stay in trip order: before the trip, then by day and time', () => {
    let t = trip();
    t = saveLeg(t, { id: 'b', dayId: t.days[3].id, from: 'A', to: 'B', mode: 'train', how: '', depart: '14:00', status: 'todo' });
    t = saveLeg(t, { id: 'a', dayId: t.days[3].id, from: 'A', to: 'B', mode: 'train', how: '', depart: '09:00', status: 'todo' });
    t = saveLeg(t, { id: 'c', from: 'Home', to: 'Rome', mode: 'flight', how: '', status: 'booked' });
    t = saveLeg(t, { id: 'z', dayId: t.days[0].id, from: 'A', to: 'B', mode: 'bus', how: '', status: 'none' });
    expect(t.legs.map(l => l.id)).toEqual(['c', 'z', 'a', 'b']);
  });
});

describe('sortPlan', () => {
  it('orders timed items and leaves untimed ones in their slots', () => {
    const out = sortPlan([
      { id: '1', text: 'b', time: '14:00' }, { id: '2', text: 'note' }, { id: '3', text: 'a', time: '09:00' },
    ]);
    expect(out.map(i => i.id)).toEqual(['3', '2', '1']);
  });
});

describe('copyTrip', () => {
  it('makes the sample your own: new id and dates, ticks and notes cleared', () => {
    const s = makeSample(new Date('2027-03-01T00:00:00Z'));
    const c = copyTrip(s, '2027-06-10', 'Our Japan trip');
    expect(c.id).not.toBe(s.id);
    expect(c.sample).toBeUndefined();
    expect(c.name).toBe('Our Japan trip');
    expect(c.days[0].date).toBe('2027-06-10');
    expect(c.todos.every(t => !t.done)).toBe(true);
    expect(c.notes).toEqual([]);
    expect(consecutive(c)).toBe(true);
    /* the original is untouched */
    expect(s.todos.some(t => t.done)).toBe(true);
  });
});

describe('parseCoords', () => {
  it.each([
    ['35.0116, 135.7681', 35.0116, 135.7681],
    ['35.0116 135.7681', 35.0116, 135.7681],
    ['(-33.8568, 151.2153)', -33.8568, 151.2153],
    ['https://www.google.com/maps/place/Kiyomizu-dera/@34.9948561,135.7850463,17z/data=!3m1!4b1!4m6!3m5!1s0x6!8m2!3d34.9946662!4d135.784661', 34.9946662, 135.784661],
    ['https://www.google.com/maps/@48.8584,2.2945,15z', 48.8584, 2.2945],
    ['https://www.google.com/maps/search/?api=1&query=41.8902,12.4922', 41.8902, 12.4922],
    ['https://maps.apple.com/?ll=51.5007,-0.1246&q=Big%20Ben', 51.5007, -0.1246],
  ])('reads %s', (s, lat, lng) => {
    expect(parseCoords(s)).toEqual({ lat, lng });
  });
  it.each(['https://maps.app.goo.gl/abc123', 'Kiyomizu-dera', '', '200, 10', '0, 0'])('rejects %s', s => {
    expect(parseCoords(s)).toBeNull();
  });
});

describe('savePlanItem on the same day', () => {
  it('keeps an item with no time where it was', async () => {
    const { savePlanItem } = await import('./edit');
    const t = {
      days: [{ id: 'd1', plan: [{ id: 'a', text: 'Coffee' }, { id: 'b', text: 'Temple', time: '10:00' }, { id: 'c', text: 'Dinner', time: '19:00' }] }],
    } as unknown as import('./types').Trip;
    const out = savePlanItem(t, 'd1', { id: 'a', text: 'Coffee with Andrea' }, 'd1');
    expect(out.days[0].plan.map(p => p.id)).toEqual(['a', 'b', 'c']);
    expect(out.days[0].plan[0].text).toBe('Coffee with Andrea');
  });
  it('orders times by the clock, not the text', async () => {
    const { sortPlan } = await import('./edit');
    expect(sortPlan([{ id: 'x', text: '', time: '13:00' }, { id: 'y', text: '', time: '9:00' }]).map(p => p.id)).toEqual(['y', 'x']);
  });
});
