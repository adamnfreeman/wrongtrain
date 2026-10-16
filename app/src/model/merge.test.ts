import { describe, expect, it } from 'vitest';
import { merge3, same } from './merge';
import { deleteDay, insertDay, newTrip, saveLeg, savePlace, saveTodo, setStart, updateDay } from './edit';
import { makeSample } from './sample';
import type { Trip } from './types';

const base = (): Trip => {
  let t = newTrip({ name: 'Italy', start: '2027-05-01', travelers: ['Ana', 'Ben'], stops: [
    { name: 'Rome', timeZone: 'Europe/Rome', nights: 2 }, { name: 'Florence', timeZone: 'Europe/Rome', nights: 2 },
  ] });
  t = saveTodo(t, { id: 'todo1', group: 'Before the trip', text: 'Book the Colosseum', done: false });
  t = savePlace(t, { id: 'pl1', name: 'Trevi Fountain', kind: 'sight', destinationId: t.destinations[0].id });
  t = updateDay(t, t.days[0].id, d => ({ ...d, plan: [{ id: 'a', text: 'Breakfast', time: '08:00' }, { id: 'b', text: 'Colosseum', time: '09:00' }] }));
  return t;
};
const clone = (t: Trip): Trip => JSON.parse(JSON.stringify(t));
const consecutive = (t: Trip) => t.days.every((d, i) => i === 0 || Date.parse(d.date) - Date.parse(t.days[i - 1].date) === 864e5);

describe('merge3', () => {
  it('returns the server copy when this phone changed nothing', () => {
    const b = base(), r = { ...clone(b), name: 'Italy in May' };
    expect(merge3(b, clone(b), r).name).toBe('Italy in May');
  });

  it('keeps both when two people edit different things', () => {
    const b = base();
    const l = saveLeg(clone(b), { id: 'leg1', dayId: b.days[2].id, from: 'Rome', to: 'Florence', mode: 'train', how: 'Frecciarossa', status: 'booked' });
    const r = savePlace(clone(b), { id: 'pl2', name: 'Uffizi', kind: 'sight', destinationId: b.destinations[1].id });
    const m = merge3(b, l, r);
    expect(m.legs.map(x => x.id)).toEqual(['leg1']);
    expect(m.places.map(x => x.id)).toEqual(['pl1', 'pl2']);
  });

  it('merges one to-do field by field: a tick here, a rewording there', () => {
    const b = base();
    const l = { ...clone(b), todos: b.todos.map(t => ({ ...t, done: true, doneBy: 'Ana' })) };
    const r = { ...clone(b), todos: b.todos.map(t => ({ ...t, text: 'Book Colosseum tickets for 9 AM' })) };
    const t = merge3(b, l, r).todos[0];
    expect(t.done).toBe(true);
    expect(t.doneBy).toBe('Ana');
    expect(t.text).toBe('Book Colosseum tickets for 9 AM');
  });

  it('merges plan items inside the same day', () => {
    const b = base(), d0 = b.days[0].id;
    const l = updateDay(clone(b), d0, d => ({ ...d, plan: [...d.plan, { id: 'c', text: 'Forum', time: '12:00' }] }));
    const r = updateDay(clone(b), d0, d => ({ ...d, plan: d.plan.map(p => (p.id === 'b' ? { ...p, fixed: true } : p)), summary: 'Ancient Rome' }));
    const m = merge3(b, l, r), day = m.days[0];
    expect(day.plan.map(p => p.id)).toEqual(['a', 'b', 'c']);
    expect(day.plan[1].fixed).toBe(true);
    expect(day.summary).toBe('Ancient Rome');
  });

  it('puts an item added here after the one it followed', () => {
    const b = base(), d0 = b.days[0].id;
    const l = updateDay(clone(b), d0, d => ({ ...d, plan: [d.plan[0], { id: 'x', text: 'Coffee' }, d.plan[1]] }));
    const r = updateDay(clone(b), d0, d => ({ ...d, plan: [...d.plan, { id: 'y', text: 'Dinner' }] }));
    expect(merge3(b, l, r).days[0].plan.map(p => p.id)).toEqual(['a', 'x', 'b', 'y']);
  });

  it('this phone wins when both changed the very same field', () => {
    const b = base();
    expect(merge3(b, { ...clone(b), name: 'Mine' }, { ...clone(b), name: 'Theirs' }).name).toBe('Mine');
  });

  it('a deletion sticks when the other side left the item alone', () => {
    const b = base();
    const l = { ...clone(b), places: [] };
    const r = { ...clone(b), name: 'Italy in May' };
    const m = merge3(b, l, r);
    expect(m.places).toEqual([]);
    expect(m.name).toBe('Italy in May');
    /* and the other way round */
    expect(merge3(b, r, l).places).toEqual([]);
  });

  it('an item deleted on one side but edited on the other is kept with the edit', () => {
    const b = base();
    const l = { ...clone(b), places: [] };
    const r = { ...clone(b), places: b.places.map(p => ({ ...p, notes: 'Throw a coin in' })) };
    expect(merge3(b, l, r).places[0].notes).toBe('Throw a coin in');
    expect(merge3(b, r, l).places[0].notes).toBe('Throw a coin in');
  });

  it('keeps days consecutive when both sides add days', () => {
    const b = base();
    const l = insertDay(clone(b), b.days[0].id);
    const r = insertDay(clone(b), b.days[3].id);
    const m = merge3(b, l, r);
    expect(m.days).toHaveLength(b.days.length + 2);
    expect(consecutive(m)).toBe(true);
    expect(m.days[0].date).toBe('2027-05-01');
  });

  it('keeps days consecutive when one side deletes a day and the other moves the trip', () => {
    const b = base();
    const l = deleteDay(clone(b), b.days[1].id);
    const r = setStart(clone(b), '2027-06-01');
    const m = merge3(b, l, r);
    expect(m.days).toHaveLength(b.days.length - 1);
    expect(m.days[0].date).toBe('2027-06-01');
    expect(consecutive(m)).toBe(true);
  });

  it('merges travellers and to-do lists as sets', () => {
    const b = base();
    const l = { ...clone(b), travelers: ['Ana', 'Ben', 'Cat'] };
    const r = { ...clone(b), travelers: ['Ana'], todoGroups: [...b.todoGroups, 'Packing'] };
    const m = merge3(b, l, r);
    expect(m.travelers).toEqual(['Ana', 'Cat']);
    expect(m.todoGroups).toContain('Packing');
  });

  it('notes added on both phones all survive', () => {
    const b = base();
    const note = (id: string, text: string) => ({ id, author: 'x', text, at: '2027-01-01T00:00:00Z', done: false });
    const l = { ...clone(b), notes: [note('n1', 'mine')] };
    const r = { ...clone(b), notes: [note('n2', 'theirs')] };
    expect(merge3(b, l, r).notes.map(n => n.text).sort()).toEqual(['mine', 'theirs']);
  });

  it('is a no-op on identical copies of a big trip', () => {
    const s = makeSample(new Date('2027-03-01T00:00:00Z'));
    expect(same(merge3(s, clone(s), clone(s)), s)).toBe(true);
  });
});
