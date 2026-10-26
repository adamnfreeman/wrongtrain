/* Each person's tastes on a trip (trip.tastes, by name): what they eat and what they're into. Picks
   for one person follow their own tastes; the group's are listed per person, so one vegetarian
   doesn't make everyone's suggestions vegetarian. */
import type { Tastes, Trip } from './types';

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Someone's tastes, matched by name whatever the case. */
export function tastesOf(t: Trip, name: string): Tastes | undefined {
  if (!name || !t.tastes) return undefined;
  const k = Object.keys(t.tastes).find(n => same(n, name));
  return k ? t.tastes[k] : undefined;
}

/** Sets one person's tastes, under the name they go by on the trip. */
export function setTastes(t: Trip, name: string, x: Tastes): Trip {
  const tastes = { ...(t.tastes || {}) };
  for (const k of Object.keys(tastes)) if (same(k, name)) delete tastes[k];
  tastes[name.trim()] = { diets: x.diets, likes: x.likes, ...(x.notes?.trim() ? { notes: x.notes.trim().slice(0, 200) } : {}) };
  return { ...t, tastes };
}

/** Whether they only eat vegetarian (or vegan) food. */
export const eatsVeg = (x?: Tastes) => !!x?.diets.some(d => /^(vegetarian|vegan)$/i.test(d));

/** One line for a prompt: "vegetarian; into Food, Nightlife; no seafood". Empty when nothing was said. */
export function tastesLine(x?: Tastes): string {
  if (!x) return '';
  return [
    x.diets.length ? `eats: ${x.diets.join(', ').toLowerCase()}` : 'no food needs',
    x.likes.length ? `into ${x.likes.join(', ')}` : '',
    x.notes ? x.notes : '',
  ].filter(Boolean).join('; ');
}
