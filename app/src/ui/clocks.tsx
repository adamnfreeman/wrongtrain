/* "What time is it in…?" (Adam, Oct 27): a small line on Today with the time in the trip's other
   cities and at home, when they differ from the phone's own clock. Home is remembered as the phone's
   time zone whenever it isn't one of the trip's (before you leave, say). */
import { useEffect, useState } from 'react';
import { pref, setPref } from '../model/store';
import { fmtT, minutesIn } from '../model/time';
import type { TripIndex } from '../model/trip';

const zoneCity = (z: string) => z.split('/').pop()!.replace(/_/g, ' ');

export function Clocks({ ix }: { ix: TripIndex }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => !document.hidden && tick(x => x + 1), 60_000); return () => clearInterval(t); }, []);
  const phone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tripZones = [...new Map(ix.trip.destinations.filter(d => d.timeZone).map(d => [d.timeZone, d.name])).entries()];
  /* at home (not in any of the trip's zones): this is home */
  useEffect(() => {
    if (!tripZones.some(([z]) => z === phone) && pref('home-zone', '') !== phone) setPref('home-zone', phone);
  }, [phone, tripZones.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const home = pref('home-zone', '');
  const now = minutesIn(phone);
  const others = [
    ...tripZones.filter(([z]) => z !== phone).map(([z, name]) => ({ z, name })),
    ...(home && home !== phone && !tripZones.some(([z]) => z === home) ? [{ z: home, name: `home (${zoneCity(home)})` }] : []),
  ].filter(c => minutesIn(c.z) !== now);
  if (!others.length) return null;
  return (
    <p className="clocks" aria-label="Time elsewhere">
      {others.map(c => <span key={c.z}><b>{fmtT(minutesIn(c.z))}</b> {c.name.startsWith('home') ? 'at ' + c.name : 'in ' + c.name}</span>)}
    </p>
  );
}
