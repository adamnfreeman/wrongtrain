import { describe, expect, it } from 'vitest';
import { receive, saved } from './core';
import { newTrip, saveTodo } from '../model/edit';
import type { Trip } from '../model/types';

const trip = (): Trip => newTrip({ name: 'Italy', start: '2027-05-01', stops: [{ name: 'Rome', timeZone: 'Europe/Rome', nights: 2 }] });
const clone = (t: Trip): Trip => JSON.parse(JSON.stringify(t));

describe('receive', () => {
  it('adds a trip this phone has never seen', () => {
    const t = trip();
    const o = receive(undefined, undefined, { id: t.id, data: t, version: 3 })!;
    expect(o.trip.id).toBe(t.id);
    expect(o.info).toMatchObject({ version: 3, dirty: false });
    expect(o.push).toBe(false);
  });

  it('ignores a copy that is not newer (an echo of our own save)', () => {
    const t = trip();
    expect(receive(t, { version: 4, base: t, dirty: false }, { id: t.id, data: t, version: 4 })).toBeNull();
    expect(receive(t, { version: 4, base: t, dirty: true }, { id: t.id, data: t, version: 2 })).toBeNull();
  });

  it('takes the newer copy as it is when nothing changed here', () => {
    const t = trip(), r = { ...clone(t), name: 'Italy in May' };
    const o = receive(t, { version: 1, base: t, dirty: false }, { id: t.id, data: r, version: 2 })!;
    expect(o.trip.name).toBe('Italy in May');
    expect(o.push).toBe(false);
  });

  it('merges when both changed, and asks to send the result', () => {
    const t = trip();
    const local = saveTodo(clone(t), { id: 'a', group: 'Before the trip', text: 'Mine', done: false });
    const remote = saveTodo(clone(t), { id: 'b', group: 'Before the trip', text: 'Theirs', done: false });
    const o = receive(local, { version: 1, base: t, dirty: true }, { id: t.id, data: remote, version: 2 })!;
    expect(o.trip.todos.map(x => x.text).sort()).toEqual(['Mine', 'Theirs']);
    expect(o.info.version).toBe(2);
    expect(o.info.base.todos.map(x => x.id)).toEqual(['b']);
    expect(o.push).toBe(true);
  });

  it('does not ask to send when the merge equals the server copy', () => {
    const t = trip(), r = { ...clone(t), name: 'Same' }, l = { ...clone(t), name: 'Same' };
    const o = receive(l, { version: 1, base: t, dirty: true }, { id: t.id, data: r, version: 2 })!;
    expect(o.push).toBe(false);
    expect(o.info.dirty).toBe(false);
  });
});

describe('saved', () => {
  it('is clean when nothing changed during the save, dirty when something did', () => {
    const t = trip();
    expect(saved(t, { ...t, updatedAt: 'later' }, 5)).toMatchObject({ version: 5, dirty: false });
    expect(saved(t, { ...t, name: 'typed during the save' }, 5).dirty).toBe(true);
  });
});
