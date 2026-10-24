/* What every screen needs: the open trip, where we are in it, view state, and navigation. */
import { createContext, useContext } from 'react';
import type { Now, TripIndex } from '../model/trip';
import type { ThingRef } from '../model/types';
import type { Geo } from './geo';
import type { Edit } from './editors';
import { JAPAN } from '../edition';

export const TABS = ['today', 'days', 'essentials', 'photos', 'notes', 'map', 'wallet', 'trip', 'places', 'phrases', 'prep', 'now'] as const;
/* Shopping (ui/shop.tsx) is hidden until Adam has worked on it: add 'shop' back here and in TABS */
/* Transit was folded into Essentials (booked and to-book travel) and Days (each day's getting around) */
const ALL_MAIN = ['today', 'days', 'essentials', 'photos', 'map', 'places', 'wallet', 'phrases', 'prep', 'trip', 'notes'] as const;
/** The tabs on the bottom bar, in order. Swiping moves between them. The Japan edition has no
    Wallet or Photos: what it saves stays on each phone, and that trip's group shares through the sheet. */
export const MAIN_TABS: readonly (typeof ALL_MAIN)[number][] = JAPAN ? ALL_MAIN.filter(t => t !== 'wallet' && t !== 'photos') : ALL_MAIN;
export type Tab = (typeof TABS)[number];

export interface UI {
  tab: Tab;
  day: string;
  /** the kind of place shown on Places (CATS in views.tsx) */
  seg: string;
  /** Destination filter on Places and Map; "all" for every destination. */
  dest: string;
  veg: boolean;
  hide: Record<string, boolean>;
  /** The preview moment for "How much time do I have?" before the trip starts. */
  sim: { day: string; min: number };
  pcat: string;
  pq: string;
  q: string;
}

export interface App {
  ix: TripIndex;
  now: Now;
  ui: UI;
  set: (p: Partial<UI>) => void;
  go: (tab: Tab, day?: string) => void;
  geo: Geo;
  me: string;
  /** Opens an editor sheet. */
  edit: (e: Edit) => void;
  /** Opens a thing's details card (ui/details.tsx). */
  show: (t: ThingRef) => void;
}

export const AppCtx = createContext<App | null>(null);
export const useApp = () => useContext(AppCtx)!;
