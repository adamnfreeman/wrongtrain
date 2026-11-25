import { describe, expect, it } from 'vitest';
import { passportReminders } from './reminders';
import { addDays, instantIn } from './time';
import { makeSample } from './sample';
import type { Trip } from './types';

describe('passport reminders', () => {
  it('turns a local time in a zone into the right moment', () => {
    expect(instantIn('Asia/Tokyo', '2026-11-08', 19 * 60 + 45).toISOString()).toBe('2026-11-08T10:45:00.000Z');
    expect(instantIn('America/New_York', '2026-11-01', 9 * 60).toISOString()).toBe('2026-11-01T14:00:00.000Z');
  });
  it('comes the evening before and when you would set off, for each booked flight still ahead, not for the sample', () => {
    const s = makeSample(new Date('2026-10-24T00:00:00Z'));
    const day = s.days[s.days.length - 1];
    const t: Trip = { ...s, sample: undefined, legs: [
      { id: 'f1', dayId: day.id, from: 'Tokyo', to: 'San Francisco', mode: 'flight', how: 'JL 2 (Haneda T3)', depart: '19:45', status: 'booked' },
      { id: 'f2', dayId: day.id, from: 'Tokyo', to: 'Osaka', mode: 'flight', how: 'NH 1', depart: '08:00', status: 'todo' },
      { id: 't1', dayId: day.id, from: 'Tokyo', to: 'Narita', mode: 'train', how: "N'EX", depart: '15:00', status: 'booked' },
    ] };
    const r = passportReminders([t, s], new Date('2026-10-24T00:00:00Z'));
    expect(r.length).toBe(2);
    expect(r[0].at.toISOString()).toBe(instantIn('Asia/Tokyo', addDays(day.date, -1), 20 * 60).toISOString());
    expect(r[0].body).toBe('Do you have your passport? JL 2 to San Francisco boards about 7:15 PM and leaves at 7:45 PM tomorrow.');
    /* an international flight: 2½ hours at the airport, and an hour to get there */
    expect(r[1].at.toISOString()).toBe(instantIn('Asia/Tokyo', day.date, 16 * 60 + 15).toISOString());
    expect(passportReminders([t], new Date(r[1].at.getTime() + 1000))).toEqual([]);
  });
  it('reads a flight before the first city in home time', () => {
    const s = makeSample(new Date('2026-10-24T00:00:00Z'));
    const first = { ...s.days[0], id: 'd-out', date: '2026-10-25', destinationId: undefined, travel: true };
    const t: Trip = { ...s, sample: undefined, days: [first, ...s.days], legs: [
      { id: 'out', dayId: 'd-out', from: 'San Francisco', to: 'Osaka', mode: 'flight', how: 'JL 1', depart: '13:00', status: 'booked' }] };
    const r = passportReminders([t], new Date('2026-10-24T00:00:00Z'), 'America/Los_Angeles');
    expect(r[0].at.toISOString()).toBe('2026-10-25T03:00:00.000Z');
    expect(r[1].at.toISOString()).toBe('2026-10-25T16:30:00.000Z');
  });
});

describe('how early to be at the airport', () => {
  it('2½ hours abroad, 1½ at home, or what the leg says', async () => {
    const { earlyFor } = await import('./airport');
    const { indexTrip } = await import('./trip');
    const s = makeSample(new Date('2026-10-24T00:00:00Z'));
    const ix = indexTrip(s);
    const [a, b] = s.destinations;
    const leg = (from: string, to: string, early?: number) => ({ id: 'x', from, to, mode: 'flight' as const, how: '', status: 'booked' as const, early });
    expect(earlyFor(ix, leg('San Francisco', a.name))).toBe(150);
    if (b && a.country === b.country) expect(earlyFor(ix, leg(`${a.name} Haneda`, b.name))).toBe(90);
    expect(earlyFor(ix, leg(a.name, b?.name || a.name, 60))).toBe(60);
  });
});
