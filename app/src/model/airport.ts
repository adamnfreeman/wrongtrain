/* How early to be at the airport. 2½ hours isn't right everywhere (Adam, in Japan: a domestic flight
   needs about an hour): 2½ hours for an international flight, 1½ for a domestic one, or whatever the
   leg itself says (`early`, set in the leg editor). Boarding starts about half an hour before it leaves. */
import type { Leg } from './types';
import type { TripIndex } from './trip';

export const EARLY_INTERNATIONAL = 150, EARLY_DOMESTIC = 90, BOARDS_BEFORE = 30;

/** The country of a place name, by the trip's destinations ("Tokyo Haneda" is in Tokyo's country). */
function countryOf(ix: TripIndex, name: string): string | undefined {
  const n = name.toLowerCase();
  return ix.trip.destinations.find(d => d.name && n.includes(d.name.toLowerCase()))?.country || undefined;
}

/** Whether a flight crosses a border. Not knowing one end (home, say) counts as crossing: the safe side. */
export function international(ix: TripIndex, l: Leg): boolean {
  const fromPlace = l.fromPlaceId ? ix.place.get(l.fromPlaceId) : undefined;
  const from = (fromPlace?.destinationId && ix.dest.get(fromPlace.destinationId)?.country) || countryOf(ix, l.from);
  const to = countryOf(ix, l.to);
  return !from || !to || from.toUpperCase() !== to.toUpperCase();
}

/** Minutes to be there before a leg leaves: the airport for a flight, the platform for anything else. */
export function earlyFor(ix: TripIndex, l: Leg): number {
  if (l.mode !== 'flight') return 10;
  if (l.early != null) return l.early;
  return international(ix, l) ? EARLY_INTERNATIONAL : EARLY_DOMESTIC;
}
