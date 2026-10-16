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
  guides: Guide[];
  /** Phrase pack to show on the Phrases tab, by language code ("ja"). */
  phrasePack?: string;
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
}

export interface Note {
  id: ID;
  author: string;
  text: string;
  at: string;
  done: boolean;
}

export interface Guide {
  id: ID;
  /** Heading the guide sits under, e.g. "Before you go". */
  group: string;
  title: string;
  items: { title: string; body: string }[];
}
