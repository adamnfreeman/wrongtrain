import { describe, expect, it } from 'vitest';
import { after, isOpen, momentsOn, rightNow } from './rightNow';
import { makeSample } from './sample';
import { indexTrip } from './trip';
import type { Trip } from './types';

const withDay = (t: Trip, f: (t: Trip) => Trip) => f(t);
const base = () => {
  const t = makeSample(new Date('2027-04-12T09:00:00Z'));
  const d = t.days[3];
  /* a booked train at 10:00, a flight at 18:00, a booking at 13:00, all on day 4 */
  return withDay(t, x => ({
    ...x,
    legs: [
      ...x.legs.filter(l => l.dayId !== d.id),
      { id: 'tr', dayId: d.id, from: 'Kyoto', to: 'Tokyo', mode: 'train', how: 'Nozomi 252, car 8', depart: '10:00', arrive: '12:15', status: 'booked', details: 'Seats 8C, 8D' },
      { id: 'fl', dayId: d.id, from: 'Haneda', to: 'JFK', mode: 'flight', how: 'JL 4', depart: '18:00', status: 'booked' },
      { id: 'td', dayId: d.id, from: 'A', to: 'B', mode: 'bus', how: 'Not booked yet', depart: '09:00', status: 'todo' },
    ],
    days: x.days.map(y => (y.id === d.id ? { ...y, plan: [{ id: 'bk', text: 'Tea ceremony', time: '13:00', fixed: true }, { id: 'lo', text: 'Lunch', time: '12:30' }] } : y)),
  }));
};
const ctx = (t: Trip, min: number) => ({ d: t.days[3], min, pos: null, live: true, from: null });

describe('right now', () => {
  it('collects booked rides and flights and fixed bookings, not loose plans or unbooked travel', () => {
    const t = base(), ix = indexTrip(t);
    expect(momentsOn(ix, t.days[3], ctx(t, 0)).map(m => m.id)).toEqual(['leg:tr', 'plan:bk', 'leg:fl']);
  });

  it('a train opens 45 minutes before you need to leave and closes 10 after it goes', () => {
    const t = base(), ix = indexTrip(t);
    expect(rightNow(ix, ctx(t, 8 * 60))).toBeNull();
    expect(rightNow(ix, ctx(t, 9 * 60 + 10))?.id).toBe('leg:tr');
    expect(rightNow(ix, ctx(t, 10 * 60 + 5))?.inMin).toBe(-5);
    expect(rightNow(ix, ctx(t, 10 * 60 + 15))).toBeNull();
  });

  it('a booking, then a flight that opens about three hours ahead', () => {
    const t = base(), ix = indexTrip(t);
    expect(rightNow(ix, ctx(t, 12 * 60 + 25))?.id).toBe('plan:bk');
    expect(rightNow(ix, ctx(t, 14 * 60))).toBeNull();
    const fl = rightNow(ix, ctx(t, 15 * 60));
    expect(fl?.id).toBe('leg:fl');
    expect(fl?.leaveBy).toBe(18 * 60 - 150);
  });

  it('counts the trip there when it knows where you are and where it is', () => {
    const t = base(), ix = indexTrip(t), stay = t.places.find(p => p.lat != null)!;
    const t2 = { ...t, legs: t.legs.map(l => (l.id === 'tr' ? { ...l, fromPlaceId: stay.id } : l)) }, ix2 = indexTrip(t2);
    const far = { ...ctx(t2, 9 * 60), pos: { lat: stay.lat! + 0.05, lng: stay.lng! } };
    const m = rightNow(ix2, far)!;
    expect(m.trip!.min).toBeGreaterThan(10);
    expect(m.leaveBy).toBe(10 * 60 - 10 - m.trip!.min);
    expect(isOpen(m, m.leaveBy - 46)).toBe(false);
    void ix;
  });

  it('says what comes next', () => {
    const t = base(), ix = indexTrip(t), c = ctx(t, 9 * 60 + 30);
    expect(after(ix, c, rightNow(ix, c)!)?.id).toBe('plan:bk');
  });
});

describe('right now is only for the people on it', () => {
  it("someone else's ride or booking doesn't open yours", () => {
    const t = { ...base(), travelers: ['Adam', 'Andrea', 'Drew'], going: { tr: ['Adam', 'Andrea'], bk: ['Drew'] } };
    const ix = indexTrip(t);
    expect(momentsOn(ix, t.days[3], ctx(t, 0), 'Drew').map(m => m.id)).toEqual(['plan:bk', 'leg:fl']);
    expect(momentsOn(ix, t.days[3], ctx(t, 0), 'andrea').map(m => m.id)).toEqual(['leg:tr', 'leg:fl']);
    expect(rightNow(ix, ctx(t, 9 * 60 + 10), 'Drew')).toBeNull();
  });
});

describe('which day is today', () => {
  it("goes by the phone's own date, not the destination's: Sunday evening at home isn't Monday in Tokyo", async () => {
    const { whereNow } = await import('./trip');
    const t = { ...base(), sample: false };
    t.days = t.days.map((d, i) => ({ ...d, date: `2026-10-${26 + i}` }));
    const ix = indexTrip(t);
    /* 7 pm on Oct 25 in New York is already Oct 26 in Tokyo */
    const at = new Date('2026-10-25T23:00:00Z');
    expect(whereNow(ix, at, 'America/New_York')).toMatchObject({ cur: null, phase: 'before', togo: 1 });
    expect(whereNow(ix, at, 'Asia/Tokyo').cur?.date).toBe('2026-10-26');
  });
});
