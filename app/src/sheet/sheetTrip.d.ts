import type { Trip } from '../model/types';
export const TRIP_ID: string;
/** The Japan page's parsed sheet (parseTrip's result) as a trip. */
export function toTrip(parsed: unknown, now?: string): Trip;
