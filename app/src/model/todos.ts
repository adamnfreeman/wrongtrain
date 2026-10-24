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

/** The people who each tick their own: everyone on a group check, the named ones on an assigned
    to-do; null when anyone's tick does it for all. */
export const needs = (t: Todo, trip: Trip): string[] | null => (t.everyone ? trip.travelers : t.who?.length ? t.who : null);

export const hasTicked = (t: Todo, name: string) => (t.checks || []).some(c => same(c, name));

/** A group check (or an assigned to-do) is done when everyone it's for has ticked it. */
export const checkDone = (t: Todo, trip: Trip) => {
  const n = needs(t, trip);
  return !!n && n.length > 0 && n.every(p => hasTicked(t, p));
};

/** Ticking: on a group check or an assigned to-do it adds or removes you (or, tapping their face,
    the person named); anything else is ticked for everyone. */
export function tick(trip: Trip, id: string, me: string, as?: string): Trip {
  const who = (as || me).trim() || 'Me';
  return {
    ...trip,
    todos: trip.todos.map(t => {
      if (t.id !== id) return t;
      if (!needs(t, trip)) return { ...t, done: !t.done, doneBy: !t.done ? me || undefined : undefined };
      const had = (t.checks || []).some(c => same(c, who));
      const checks = had ? (t.checks || []).filter(c => !same(c, who)) : [...(t.checks || []), who];
      const next = { ...t, checks };
      return { ...next, done: checkDone(next, trip) };
    }),
  };
}
