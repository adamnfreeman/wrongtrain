/* The trip, as WrongTrain stores it.

   One trip is a line: each destination is a line colour, each day a stop on it.
   Everything is plain JSON so a trip can be saved on the phone, synced to the group,
   or exported as a file without any conversion. Dates are ISO calendar dates
   ("2027-04-12"), times are 24-hour local clock times ("09:30") in the time zone of
   the day's destination, so a plan still reads right when your phone is on home time. */

export type ID = string;

/** Line colours a destination can take. The names are keys into the CSS palette. */
export const LINE_COLORS = ['violet', 'amber', 'red', 'green', 'teal', 'blue', 'pink', 'olive'] as const;
export type LineColor = (typeof LINE_COLORS)[number];

export interface Trip {
  id: ID;
  name: string;
  /** People on the trip, by display name. Group sync will attach accounts to these. */
  travelers: string[];
  destinations: Destination[];
  days: Day[];
  legs: Leg[];
  places: Place[];
  todoGroups: string[];
  todos: Todo[];
  notes: Note[];
  /** Who's going to each plan item, by plan item id: names from travelers. No entry means
      everyone. Kept apart from the days so saying "I'm out" is free for anyone on the trip. */
  going?: Record<ID, string[]>;
  guides: Guide[];
  /** Phrase pack to show on the Phrases tab, by language code ("ja"). */
  phrasePack?: string;
  /** Tickets, bookings and other papers everyone on the trip can open. Private ones (IDs) are
      kept only on your phone, apart from the trip (see sync/files.ts). */
  docs?: Doc[];
  /** Money paid for the group, and who owes what (model/money.ts). */
  expenses?: Expense[];
  /** Paying someone back. */
  settlements?: Settlement[];
  /** Currency balances are shown in, e.g. "USD". Defaults to the first expense's. */
  currency?: string;
  /** Venmo usernames, by traveller name, for "Pay with Venmo". */
  venmo?: Record<string, string>;
  /** How much say people get when they join, picked when the trip is made (model/rules.ts). It's
      applied when the trip is shared; after that the trip's rule online is what counts. */
  say?: 'open' | 'approve' | 'look';
  /** Set on the built-in sample, which may pretend you are on the trip right now. */
  sample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Destination {
  id: ID;
  name: string;
  /** ISO 3166 country code, for maps searches and phrase packs. */
  country: string;
  /** IANA time zone, e.g. "Asia/Tokyo". Decides what "today" and "now" mean there. */
  timeZone: string;
  color: LineColor;
}

export interface Day {
  id: ID;
  date: string;
  /** Where you sleep and spend most of the day. Unset on a travel day in transit. */
  destinationId?: ID;
  /** The places you pass through, in order, when the day moves between destinations. */
  route?: ID[];
  /** A travel day (flights, overnight trains). Shown in the travel colour. */
  travel?: boolean;
  /** Overrides the heading, e.g. "Kyoto → Nara → Osaka". */
  title?: string;
  /** Tonight's place to stay. */
  stayId?: ID;
  /** One line for the route list. */
  summary: string;
  plan: PlanItem[];
  /** "Good to know" bullets. */
  tips: Bullet[];
  /** "Getting around" bullets. */
  around: Bullet[];
  /** Places suggested for eating today, in the order to show them. */
  eatIds: ID[];
}

export interface Bullet {
  text: string;
  sub?: string[];
}

export interface PlanItem {
  id: ID;
  text: string;
  /** Local clock time it starts, "HH:MM". */
  time?: string;
  end?: string;
  /** Must be on time for this: a booking, a tour, a meeting point. Drives "How much time do I have?". */
  fixed?: boolean;
  /** "by" = a deadline (be there no later than), rather than a start time. */
  timeKind?: 'start' | 'by';
  placeId?: ID;
  sub?: string[];
  /** A booked item with no place: when Essentials tried to find which place it is online. */
  detailsAt?: string;
}

export type LegMode = 'flight' | 'train' | 'subway' | 'bus' | 'car' | 'ferry' | 'walk' | 'other';
export type LegStatus = 'booked' | 'todo' | 'none';

export interface Leg {
  id: ID;
  /** The day it happens. Unset for things set up before the trip (an IC card, a rail pass). */
  dayId?: ID;
  from: string;
  to: string;
  mode: LegMode;
  /** Service and seats, e.g. "Haruka limited express, reserved seats". */
  how: string;
  depart?: string;
  arrive?: string;
  /** Where you need to be for departure; used for "leave by" times. */
  fromPlaceId?: ID;
  status: LegStatus;
  /** Free text, e.g. "Booked" or "Buy at the station". */
  statusText?: string;
  tickets?: string;
  details?: string;
}

export type PlaceKind = 'stay' | 'sight' | 'area' | 'food' | 'coffee' | 'shop' | 'event' | 'transit' | 'other';

export interface Place {
  id: ID;
  name: string;
  kind: PlaceKind;
  destinationId?: ID;
  lat?: number;
  lng?: number;
  /** Short area or address, e.g. "Near Nishiki Market". */
  area?: string;
  /** Street address, for a taxi driver or a map (Essentials). */
  address?: string;
  phone?: string;
  /** Reservation details: confirmation number, name it's under, what's included. */
  booking?: string;
  /** For a stay: when you can check in and must check out, "HH:MM". */
  checkIn?: string;
  checkOut?: string;
  /** When Essentials looked it up in free map data (OpenStreetMap, MapTiler), found or not. */
  freeAt?: string;
  /** When Claude looked up its details online (sync/details.ts), found or not. */
  detailsAt?: string;
  /** The address or phone came from that lookup: shown with "found online, check it". */
  foundOnline?: boolean;
  notes?: string;
  /** Opening hours as local clock times; "24h" for always open. */
  hours?: { open: string; close: string } | '24h';
  /** Weekdays it is closed, 0 = Sunday. */
  closedDays?: number[];
  /** Diet tags for food: "veg" (fully veg-friendly) or "veg-some". */
  diet?: 'veg' | 'veg-some' | 'no';
  dietNote?: string;
  /** Not planned yet; shown under Ideas. */
  wishlist?: boolean;
  /** Days this place is on the list for. */
  dayIds?: ID[];
  /** Map or website link; a maps search is built from the name when unset. */
  link?: string;
  closed?: boolean;
}

export interface Todo {
  id: ID;
  group: string;
  text: string;
  details?: string;
  /** Free text, e.g. "Two weeks before". */
  when?: string;
  done: boolean;
  doneBy?: string;
  link?: string;
  /** What kind of thing it is, shown as a coloured tag (model/todos.ts). */
  tag?: 'book' | 'buy' | 'call' | 'email' | 'fill';
  /** A personal to-do: only this person (by name) sees it. */
  mine?: string;
  /** A group check: everyone ticks their own, and it's done when all of Who's going have. */
  everyone?: boolean;
  /** Who it's for, by name: each of them ticks their own, and it's done when all have. */
  who?: string[];
  /** Who has ticked a group check (or their part of an assigned one), by name. */
  checks?: string[];
}

export interface Note {
  id: ID;
  author: string;
  text: string;
  at: string;
  done: boolean;
  /** What Claude did with the note, or why it left it for the owner. Shown under the note. */
  filed?: string;
  /** What filing it made: "Added Ichiran to places in Kyoto" and the like. Shown under Dealt with. */
  made?: string[];
  /** When its writer last changed it. */
  edited?: string;
  /** A screenshot that came with it (a booking email, a ticket), read by Claude when it's filed. */
  image?: FileRef;
}

export interface Guide {
  id: ID;
  /** Heading the guide sits under, e.g. "Before you go". */
  group: string;
  title: string;
  items: { title: string; body: string }[];
}

/* ---------- wallet ---------- */

export type DocKind = 'id' | 'ticket' | 'booking' | 'insurance' | 'other';

/** A file kept on the phone and, unless private, in the trip's storage. path is where, in both. */
export interface FileRef { path: string; name: string; type: string; size: number }

export interface Doc {
  id: ID;
  title: string;
  kind: DocKind;
  file?: FileRef;
  link?: string;
  /** A picture inside the app, shown in the app's own viewer (the sample's tickets). */
  picture?: string;
  notes?: string;
  addedBy?: string;
  at: string;
  /** Only on this phone, never uploaded. Private docs are not part of the trip. */
  private?: boolean;
  /** Shared with only some people: kept apart from the trip, in its own table (sync/limitedDocs.ts). */
  limited?: boolean;
  /** For a limited doc: who added it, and who else may see it (account ids). */
  owner?: string;
  viewers?: string[];
  /** What it is for, so it shows there on the timeline: a plan item or a travel leg. */
  for?: { kind: 'plan' | 'leg' | 'place'; id: ID };
}

export interface Expense {
  id: ID;
  what: string;
  /** In currency, e.g. 42.5 */
  amount: number;
  currency: string;
  /** How many of the trip's currency one unit of this currency was worth when entered. 1 when the same. */
  rate: number;
  /** Traveller names. */
  paidBy: string;
  /** Who shares it. Without amounts it is split evenly; with them, each pays their amount (in currency). */
  split: { who: string; amount?: number }[];
  at: string;
  dayId?: ID;
  receipt?: FileRef;
  addedBy?: string;
}

export interface Settlement {
  id: ID;
  from: string;
  to: string;
  /** In the trip's currency. */
  amount: number;
  at: string;
  via?: 'venmo' | 'cash' | 'other';
}
