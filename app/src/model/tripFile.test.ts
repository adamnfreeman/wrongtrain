import { describe, expect, it } from 'vitest';
import { readTripFile, updateFromFile } from './tripFile';
import { copyTrip } from './edit';
import { makeSample } from './sample';

const file = () => copyTrip(makeSample(new Date('2027-04-01T12:00:00Z')), '2027-05-01', 'Japan');

describe('trip files', () => {
  it('reads a trip file, wrapped or bare', () => {
    const t = file();
    expect(readTripFile(JSON.stringify({ wrongtrain: 1, trip: t })).name).toBe('Japan');
    expect(readTripFile(JSON.stringify(t)).days.length).toBe(t.days.length);
  });

  it('turns away anything else, in plain words', () => {
    expect(() => readTripFile('not json')).toThrow('not a trip file');
    expect(() => readTripFile('{"name":"x"}')).toThrow('not a trip file');
    const t = file(); t.days[2] = { ...t.days[2], date: '2027-06-01' };
    expect(() => readTripFile(JSON.stringify(t))).toThrow('skip a date');
  });

  it('a newer file keeps the ticks, notes and wallet added in the app', () => {
    const have = file();
    have.todos[0] = { ...have.todos[0], done: true, doneBy: 'Ana' };
    have.notes = [{ id: 'mine', author: 'Ana', text: 'Bring umbrellas', at: '2027-04-02', done: false }];
    have.expenses = [{ id: 'e1', what: 'Dinner', amount: 40, currency: 'USD', rate: 1, paidBy: 'Ana', split: [], at: '2027-05-01' }];
    const next = { ...file(), id: have.id, todos: have.todos.map(t => ({ ...t, done: false })) };
    next.days[0] = { ...next.days[0], summary: 'Changed in the sheet' };
    const u = updateFromFile(have, next);
    expect(u.days[0].summary).toBe('Changed in the sheet');
    expect(u.todos[0]).toMatchObject({ done: true, doneBy: 'Ana' });
    expect(u.notes.some(n => n.id === 'mine')).toBe(true);
    expect(u.expenses).toHaveLength(1);
  });
});
