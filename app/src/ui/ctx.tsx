/* What every screen needs: the open trip, where we are in it, view state, and navigation. */
import { createContext, useContext } from 'react';
import type { Now, TripIndex } from '../model/trip';
import type { Geo } from './geo';
import type { Edit } from './editors';

export const TABS = ['today', 'days', 'map', 'wallet', 'trip', 'transit', 'places', 'phrases', 'prep'] as const;
/** The tabs on the bottom bar, in order. Swiping moves between them. */
export const MAIN_TABS = ['today', 'days', 'map', 'wallet', 'places', 'transit', 'phrases', 'prep', 'trip'] as const;
export type Tab = (typeof TABS)[number];

export interface UI {
  tab: Tab;
  day: string;
  seg: 'food' | 'ideas';
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
}

export const AppCtx = createContext<App | null>(null);
export const useApp = () => useContext(AppCtx)!;
