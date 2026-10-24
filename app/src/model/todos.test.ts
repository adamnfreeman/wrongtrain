import { describe, expect, it } from 'vitest';
import { checkDone, tick, visibleTodos } from './todos';
import { makeSample } from './sample';
import type { Trip } from './types';

const trip = (): Trip => {
  const t = makeSample(new Date('2027-04-12T09:00:00Z'));
  return { ...t, todos: [
    { id: 'g', group: 'Before the trip', text: 'Visit Japan Web', done: false, everyone: true },
    { id: 'p', group: 'Before the trip', text: 'Pack my meds', done: false, mine: 'Sam' },
    { id: 'n', group: 'Before the trip', text: 'Book teamLab', done: false, tag: 'book' as const },
  ] };
};

describe('to-do kinds', () => {
  it('personal to-dos show only to their person', () => {
    expect(visibleTodos(trip().todos, 'Alex').map(t => t.id)).toEqual(['g', 'n']);
    expect(visibleTodos(trip().todos, 'sam').map(t => t.id)).toEqual(['g', 'p', 'n']);
  });
  it('a group check is done when everyone going has ticked it', () => {
    let t = trip();
    for (const who of ['Alex', 'Sam', 'Jordan']) t = tick(t, 'g', who);
    expect(t.todos[0].checks).toEqual(['Alex', 'Sam', 'Jordan']);
    expect(t.todos[0].done).toBe(false);
    t = tick(t, 'g', 'Riley');
    expect(t.todos[0].done).toBe(true);
    expect(checkDone(t.todos[0], t)).toBe(true);
    t = tick(t, 'g', 'Sam');
    expect(t.todos[0].done).toBe(false);
  });
  it('an ordinary to-do is ticked for everyone', () => {
    const t = tick(trip(), 'n', 'Jordan');
    expect(t.todos[2]).toMatchObject({ done: true, doneBy: 'Jordan' });
  });
  it('an assigned to-do is done when each person it is for has ticked it', () => {
    let t: Trip = { ...trip(), todos: [{ id: 'a', group: 'Before the trip', text: 'Passport photos', done: false, who: ['Alex', 'Sam'] }] };
    t = tick(t, 'a', 'Alex');
    expect(t.todos[0].done).toBe(false);
    /* someone else can tick for Sam by tapping Sam's face */
    t = tick(t, 'a', 'Jordan', 'Sam');
    expect(t.todos[0].checks).toEqual(['Alex', 'Sam']);
    expect(t.todos[0].done).toBe(true);
    t = tick(t, 'a', 'Alex');
    expect(t.todos[0].done).toBe(false);
  });
});
