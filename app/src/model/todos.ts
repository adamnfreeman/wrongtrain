/* To-do kinds: for the group (anyone ticks it), personal (only you see it), or a group check
   (everyone ticks their own: "Register on Visit Japan Web"), and a tag for what sort of thing it is. */
import type { Todo, Trip } from './types';

export const TODO_TAGS: { value: NonNullable<Todo['tag']>; label: string }[] = [
  { value: 'book', label: 'Book' }, { value: 'buy', label: 'Buy' }, { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' }, { value: 'fill', label: 'Fill out' },
];

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The to-dos this person sees: everyone's, and their own personal ones. */
export const visibleTodos = (todos: Todo[], me: string) => todos.filter(t => !t.mine || (!!me && same(t.mine, me)));

/** A group check is done when everyone going has ticked it. */
export const checkDone = (t: Todo, trip: Trip) =>
  !!t.everyone && trip.travelers.length > 0 && trip.travelers.every(p => (t.checks || []).some(c => same(c, p)));

/** Ticking: a group check adds or removes you; anything else is ticked for everyone. */
export function tick(trip: Trip, id: string, me: string): Trip {
  const who = me.trim() || 'Me';
  return {
    ...trip,
    todos: trip.todos.map(t => {
      if (t.id !== id) return t;
      if (!t.everyone) return { ...t, done: !t.done, doneBy: !t.done ? me || undefined : undefined };
      const had = (t.checks || []).some(c => same(c, who));
      const checks = had ? (t.checks || []).filter(c => !same(c, who)) : [...(t.checks || []), who];
      const next = { ...t, checks };
      return { ...next, done: checkDone(next, trip) };
    }),
  };
}
