/* Passport reminders: "Do you have your passport?" twice for each booked flight: the evening before
   (8 PM, when there's still time to find it) and again about when you'd set off for the airport
   (an hour before you need to be there; model/airport.ts says how early that is). Three hours before
   came too late (Adam, Oct 27). Worked out here; scheduled as phone notifications by sync/reminders.ts. */
import type { Trip } from './types';
import { indexTrip, tzOf } from './trip';
import { addDays, fmtT, hm, instantIn } from './time';
import { BOARDS_BEFORE, earlyFor } from './airport';

export interface Reminder { key: string; at: Date; title: string; body: string }

/** The evening before, at this time (minutes into the day, where the flight leaves from). */
export const EVENING_BEFORE = 20 * 60;
/** Setting off: this long before you need to be at the airport. */
export const TO_AIRPORT_MIN = 60;

/** The passport reminders still to come on these trips, soonest first. */
export function passportReminders(trips: Trip[], now = new Date(), home = Intl.DateTimeFormat().resolvedOptions().timeZone): Reminder[] {
  const out: Reminder[] = [];
  for (const t of trips) {
    if (t.sample) continue;
    const ix = indexTrip(t);
    /* a flight before the first city leaves from home, so its time is home time (the phone's) */
    const firstCity = t.days.findIndex(d => d.destinationId && !d.travel);
    for (const l of t.legs) {
      if (l.mode !== 'flight' || l.status !== 'booked' || !l.dayId) continue;
      const day = t.days.find(d => d.id === l.dayId), dep = hm(l.depart);
      if (!day || dep == null) continue;
      const fromHome = !day.destinationId && t.days.indexOf(day) < firstCity;
      const zone = fromHome ? home : tzOf(ix, day);
      const flight = l.how.split(/[(,;\n]/)[0].trim();
      /* what the notification says: when it boards and when it leaves */
      const what = `${flight ? flight + ' to ' : 'Your flight to '}${l.to} boards about ${fmtT(dep - BOARDS_BEFORE)} and leaves at ${fmtT(dep)}`;
      const evening = instantIn(zone, addDays(day.date, -1), EVENING_BEFORE);
      const setOff = instantIn(zone, day.date, dep - earlyFor(ix, l) - TO_AIRPORT_MIN);
      const both: Reminder[] = [
        { key: `${t.id}:${l.id}:eve`, at: evening, title: 'Flying tomorrow', body: `Do you have your passport? ${what} tomorrow.` },
        { key: `${t.id}:${l.id}`, at: setOff, title: 'Heading to the airport soon', body: `Do you have your passport? ${what}.` },
      ];
      out.push(...both.filter(r => r.at > now));
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
