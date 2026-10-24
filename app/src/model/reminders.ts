/* Passport reminders: "Do you have your passport?" when you'll soon be heading to the airport, which
   is when Right now opens for a flight (about 3 hours before it leaves; model/rightNow.ts). Worked
   out here; scheduled as phone notifications by sync/reminders.ts. */
import type { Trip } from './types';
import { indexTrip, tzOf } from './trip';
import { fmtHM, hm, instantIn } from './time';

export interface Reminder { key: string; at: Date; title: string; body: string }

/** Before a flight, the reminder comes this long before it leaves: 2.5 h at the airport and about
    half an hour to get there, as on Right now. */
export const BEFORE_FLIGHT_MIN = 180;

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
      const leaves = instantIn(fromHome ? home : tzOf(ix, day), day.date, dep);
      const at = new Date(leaves.getTime() - BEFORE_FLIGHT_MIN * 60_000);
      if (at <= now) continue;
      const flight = l.how.split(/[(,;\n]/)[0].trim();
      out.push({
        key: `${t.id}:${l.id}`, at,
        title: 'Heading to the airport soon',
        body: `Do you have your passport? ${flight ? flight + ' to ' : 'Your flight to '}${l.to} leaves at ${fmtHM(l.depart)}.`,
      });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
