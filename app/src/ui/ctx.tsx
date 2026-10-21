/* What every screen needs: the open trip, where we are in it, view state, and navigation. */
import { createContext, useContext } from 'react';
import type { Now, TripIndex } from '../model/trip';
import type { Geo } from './geo';
import type { Edit } from './editors';
import { JAPAN } from '../edition';

export const TABS = ['today', 'days', 'photos', 'notes', 'shop', 'map', 'wallet', 'trip', 'transit', 'places', 'phrases', 'prep', 'now'] as const;
const ALL_MAIN = ['today', 'days', 'photos', 'map', 'places', 'transit', 'wallet', 'phrases', 'prep', 'trip', 'shop', 'notes'] as const;
/** The tabs on the bottom bar, in order. Swiping moves between them. The Japan edition has no
    Wallet or Photos: what it saves stays on each phone, and that trip's group shares through the sheet. */
export const MAIN_TABS: readonly (typeof ALL_MAIN)[number][] = JAPAN ? ALL_MAIN.filter(t => t !== 'wallet' && t !== 'photos' && t !== 'shop') : ALL_MAIN;
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
}

export const AppCtx = createContext<App | null>(null);
export const useApp = () => useContext(AppCtx)!;
