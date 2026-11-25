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
/* Five tabs (Nov 24: eleven were too many to swipe through): Today, Plan (days), Map, Wallet and
   Group (trip). The other pages live inside them, picked at the top of the page (SUBS); Phrases,
   the currency converter and the emergency numbers are tools on Today (TOOLS). */
const ALL_MAIN = ['today', 'days', 'map', 'wallet', 'trip'] as const;
/** The tabs on the bottom bar, in order. Swiping moves between them. The Japan edition has no
    Wallet or Photos: what it saves stays on each phone, and that trip's group shares through the sheet. */
export const MAIN_TABS: readonly (typeof ALL_MAIN)[number][] = JAPAN ? ALL_MAIN.filter(t => t !== 'wallet') : ALL_MAIN;
export type Tab = (typeof TABS)[number];

/** The pages inside a tab, first one first. Each is one of the old tabs, so links to it still work. */
export const SUBS: Partial<Record<Tab, { id: Tab; label: string }[]>> = {
  days: [{ id: 'days', label: 'Days' }, { id: 'essentials', label: 'Bookings' }],
  map: [{ id: 'map', label: 'Map' }, { id: 'places', label: 'Places' }],
  trip: [{ id: 'trip', label: 'Trip' }, { id: 'prep', label: 'To do' }, ...(JAPAN ? [] : [{ id: 'photos' as Tab, label: 'Photos' }]), { id: 'notes', label: 'Notes' }],
};
/** Which tab holds a page. */
export function holder(page: Tab): Tab {
  for (const [tab, subs] of Object.entries(SUBS)) if (subs!.some(s => s.id === page)) return tab as Tab;
  return page;
}
export type Tool = 'phrases' | 'convert' | 'sos';

export interface UI {
  tab: Tab;
  /** The page open inside each tab that has several (SUBS), by tab. */
  sub: Partial<Record<Tab, Tab>>;
  /** A tool from Today open over the page, or none. */
  tool: Tool | null;
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
  /** The page you're actually looking at: the tab, or the page open inside it (essentials, places…). */
  here: Tab;
  /** Opens a thing's details card (ui/details.tsx). */
  show: (t: ThingRef) => void;
}

export const AppCtx = createContext<App | null>(null);
export const useApp = () => useContext(AppCtx)!;
