/* Essentials: the things you look up in a hurry, in one calm list. Where you're staying (address,
   phone, reservation), flights and trains, booked reservations, and the emergency numbers where
   you are. Each item is one line until tapped; nothing here is new data, it's gathered from the
   trip (stays from the days, travel from its legs, reservations from booked plan items). Travel here
   is the kind you book or sort out: flights, trains, buses, ferries and cars, anything still to
   book, and what's set up before the trip; a day's local getting around stays on Days. */
import { useEffect, useState } from 'react';
import type { Day, Leg, Place, PlanItem } from '../model/types';
import { addDays, fmtHM, shortDate } from '../model/time';
import { destOf, type TripIndex } from '../model/trip';
import { Empty, SecH, line } from './bits';
import { ThingRow, tel } from './details';
import { useApp } from './ctx';
import { lineOfDest } from '../model/trip';
import { bookingNeedsPlace, fillDetails, fillFree, needsDetails, needsFree } from '../sync/details';
import { useSync } from '../sync/engine';
import { getState } from '../model/store';

/** Each place you sleep, in order, with its nights. */
export function staysOf(ix: TripIndex): { p: Place; nights: Day[] }[] {
  const out: { p: Place; nights: Day[] }[] = [];
  for (const d of ix.trip.days) {
    const p = d.stayId ? ix.place.get(d.stayId) : undefined;
    if (!p) continue;
    const last = out[out.length - 1];
    if (last && last.p.id === p.id) last.nights.push(d); else out.push({ p, nights: [d] });
  }
  return out;
}

const FAR: Leg['mode'][] = ['flight', 'train', 'bus', 'ferry', 'car'];
const MODE: Record<string, string> = { flight: 'Flight', train: 'Train', subway: 'Subway', bus: 'Bus', car: 'Car', ferry: 'Ferry', walk: 'Walk', other: 'Travel' };
/** Travel that belongs on Essentials (see the note at the top). */
export const essentialLeg = (l: Leg) => FAR.includes(l.mode) || l.status === 'todo' || !l.dayId;

/* Emergency numbers by country; 112 works from most mobile phones almost anywhere */
const SOS: Record<string, [string, string][]> = {
  JP: [['Police', '110'], ['Ambulance and fire', '119']],
  US: [['Emergency', '911']], CA: [['Emergency', '911']], MX: [['Emergency', '911']],
  GB: [['Emergency', '999']], IE: [['Emergency', '112']],
  KR: [['Police', '112'], ['Ambulance and fire', '119']],
  CN: [['Police', '110'], ['Ambulance', '120'], ['Fire', '119']],
  TW: [['Police', '110'], ['Ambulance and fire', '119']],
  TH: [['Police', '191'], ['Ambulance', '1669'], ['Tourist police', '1155']],
  AU: [['Emergency', '000']], NZ: [['Emergency', '111']],
};
const sos = (cc: string) => SOS[cc.toUpperCase()] || [['Emergency', '112']];
const COUNTRY = (cc: string) => { try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(cc.toUpperCase()) || cc; } catch { return cc; } };

function StayItem({ p, nights }: { p: Place; nights: Day[] }) {
  const { ix } = useApp();
  const first = nights[0], out = addDays(nights[nights.length - 1].date, 1);
  const n = nights.length;
  return (
    <ThingRow thing={{ kind: 'place', id: p.id }} title={p.name} colour={line(lineOfDest(destOf(ix, first)))}
      sub={`${shortDate(first.date)} – ${shortDate(out)} · ${n} ${n === 1 ? 'night' : 'nights'}${p.checkIn || p.checkOut ? ` · in ${p.checkIn ? fmtHM(p.checkIn) : '?'}, out ${p.checkOut ? fmtHM(p.checkOut) : '?'}` : ''}`} />
  );
}

function LegEss({ l, day }: { l: Leg; day?: Day }) {
  const when = [day && shortDate(day.date), l.depart && fmtHM(l.depart)].filter(Boolean).join(' · ');
  return (
    <ThingRow thing={{ kind: 'leg', id: l.id }} title={`${l.from} → ${l.to}`}
      sub={<>{[MODE[l.mode], when || (!l.dayId ? 'Before the trip' : '')].filter(Boolean).join(' · ')}{l.status === 'todo' && <b className="ess-tobook"> · To book</b>}</>} />
  );
}

function BookingEss({ d, p }: { d: Day; p: PlanItem }) {
  const { ix } = useApp();
  return <ThingRow thing={{ kind: 'plan', dayId: d.id, id: p.id }} title={p.text.split('\n')[0]} sub={[shortDate(d.date), p.time && (p.timeKind === 'by' ? 'by ' : '') + fmtHM(p.time), destOf(ix, d)?.name].filter(Boolean).join(' · ')} />;
}

export function Essentials() {
  const { ix, edit } = useApp();
  const t = ix.trip;
  const dayOf = new Map(t.days.map(d => [d.id, d]));
  const stays = staysOf(ix);
  /* what's set up before the trip first, then by day and time */
  const legs = t.legs.filter(essentialLeg)
    .map(l => ({ l, day: l.dayId ? dayOf.get(l.dayId) : undefined }))
    .sort((a, b) => (a.day?.date || '').localeCompare(b.day?.date || '') || (a.l.depart || '').localeCompare(b.l.depart || ''));
  const toBook = legs.filter(x => x.l.status === 'todo').length;
  const bookings = t.days.flatMap(d => d.plan.filter(p => p.fixed && p.text.trim()).map(p => ({ d, p })));
  /* addresses, phones and websites fill themselves in from free map data (OpenStreetMap, then
     MapTiler), once for the whole group. Claude, which costs money, looks for the rest only when
     someone taps "Find the rest online". */
  const mine = [...stays.map(s => s.p), ...bookings.flatMap(b => (b.p.placeId && ix.place.get(b.p.placeId)) || [])];
  const freeFor = mine.filter(needsFree), freeKey = freeFor.map(p => p.id).join();
  const [freeBusy, setFreeBusy] = useState(false);
  useEffect(() => {
    if (!freeFor.length) return;
    setFreeBusy(true);
    void fillFree(t, freeFor).finally(() => setFreeBusy(false));
  }, [t.id, freeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const lookFor = mine.filter(p => needsDetails(p) && !needsFree(p)), unplaced = bookings.filter(b => bookingNeedsPlace(b.p));
  const signedIn = !!useSync().session, shared = !!getState().sync[t.id];
  const [looking, setLooking] = useState<string | null>(null);
  const findRest = () => {
    setLooking('Looking…');
    void fillDetails(t, lookFor, unplaced, (done, of) => setLooking(done < of ? `Looking… ${done} of ${of}` : null)).finally(() => setLooking(null));
  };
  const missing = lookFor.length + unplaced.length;
  const countries = [...new Set(t.destinations.map(d => d.country).filter(Boolean))];
  return (
    <>
      <h1 className="page-h">Essentials</h1>
      <p className="note" style={{ marginTop: 0 }}>Hotels, travel, bookings and numbers. Tap one for its details.</p>
      {freeBusy && <p className="note ess-looking">Filling in addresses and phone numbers…</p>}
      {!freeBusy && missing > 0 && shared && signedIn && !t.sample && (
        <div className="ess-rest">
          <span>{missing === 1 ? 'One hotel or booking is' : `${missing} hotels and bookings are`} missing an address, phone or website.</span>
          <button className="chipbtn go" disabled={!!looking} onClick={findRest}>{looking || 'Find the rest online'}</button>
        </div>
      )}
      {!stays.length && !legs.length && !bookings.length && <Empty>Add where you're staying, your flights and trains, and booked plans; they'll gather here.</Empty>}
      {stays.length > 0 && (
        <section className="sec">
          <SecH title="Where you're staying"><span className="kicker">{stays.length}</span></SecH>
          <ul className="sheet esslist">{stays.map(s => <StayItem key={s.p.id + s.nights[0].id} p={s.p} nights={s.nights} />)}</ul>
        </section>
      )}
      <section className="sec">
        <SecH title="Travel"><span className="kicker">{legs.length}{toBook ? ` · ${toBook} to book` : ''}</span></SecH>
        {legs.length > 0 && <ul className="sheet esslist">{legs.map(x => <LegEss key={x.l.id} l={x.l} day={x.day} />)}</ul>}
        <button className="linkbtn" onClick={() => edit({ kind: 'leg' })}>+ Add travel</button>
      </section>
      {bookings.length > 0 && (
        <section className="sec">
          <SecH title="Reservations"><span className="kicker">{bookings.length}</span></SecH>
          <ul className="sheet esslist">{bookings.map(x => <BookingEss key={x.p.id} d={x.d} p={x.p} />)}</ul>
        </section>
      )}
      {countries.length > 0 && (
        <section className="sec">
          <SecH title="Emergency numbers" />
          <ul className="sheet esslist">
            {countries.map(cc => (
              <li key={cc} className="sos">
                {countries.length > 1 && <div className="kick">{COUNTRY(cc)}</div>}
                <div className="sos-row">{sos(cc).map(([what, n]) => <a key={what} className="chipbtn" href={tel(n)}>{what} <b>{n}</b></a>)}</div>
              </li>
            ))}
          </ul>
          <p className="note">112 also works from most mobile phones abroad.</p>
        </section>
      )}
    </>
  );
}
