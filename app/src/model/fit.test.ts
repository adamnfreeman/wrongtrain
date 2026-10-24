import { describe, expect, it } from 'vitest';
import { fitPlace, slotFor } from './fit';
import type { Day, Place, Trip } from './types';

const day = (id: string, date: string, dest: string, plan: Day['plan'] = []): Day =>
  ({ id, date, destinationId: dest, summary: '', plan, eatIds: [] } as unknown as Day);
const trip = (days: Day[], places: Place[]): Trip =>
  ({ id: 't', name: 'T', travelers: [], destinations: [{ id: 'k', name: 'Kyoto', timeZone: 'Asia/Tokyo' }, { id: 'o', name: 'Osaka', timeZone: 'Asia/Tokyo' }], days, places, legs: [], todos: [] } as unknown as Trip);
const NOW = new Date('2026-10-27T00:00:00Z');

describe('slotFor', () => {
  it('puts a meal at lunch when lunch is free', () => {
    expect(slotFor({ id: 'p', name: 'Ramen', kind: 'food' } as Place, [])).toBe(12 * 60 + 30);
  });
  it('works around what is planned and inside opening hours', () => {
    const p = { id: 'p', name: 'Temple', kind: 'sight', hours: { open: '13:00', close: '17:00' } } as Place;
    expect(slotFor(p, [{ id: 'a', text: 'x', time: '13:00', end: '14:00' }])).toBe(14 * 60 + 30);
    expect(slotFor(p, [{ id: 'a', text: 'x', time: '13:00', end: '16:00' }])).toBeNull();
  });
});

describe('fitPlace', () => {
  const days = [day('d1', '2026-10-26', 'k'), day('d2', '2026-10-28', 'k', [{ id: 'a', text: 'x', time: '10:00' }]), day('d3', '2026-10-29', 'k'), day('d4', '2026-10-30', 'o')];
  it('keeps to its city, days to come and days it is open, least full first', () => {
    const p = { id: 'p', name: 'Shop', kind: 'shop', destinationId: 'k', closedDays: [4] } as Place; // 29th is a Thursday
    const f = fitPlace(trip(days, [p]), p, 3, NOW);
    expect(f.map(x => x.day.id)).toEqual(['d2']);
    expect(f[0].time).toBe('14:00');
  });
  it('leaves out days it is already on', () => {
    const p = { id: 'a1', name: 'Shop', kind: 'shop', destinationId: 'o' } as Place;
    const t = trip([...days.slice(0, 3), day('d4', '2026-10-30', 'o', [{ id: 'z', text: 'Shop', placeId: 'a1' }])], [p]);
    expect(fitPlace(t, p, 3, NOW).map(x => x.day.id)).toEqual(['d3', 'd2']);
  });
});
