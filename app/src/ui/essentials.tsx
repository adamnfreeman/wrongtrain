/* Essentials: the things you look up in a hurry, in one calm list. Where you're staying (address,
   phone, reservation), flights and trains, booked reservations, and the emergency numbers where
   you are. Each item is one line until tapped; nothing here is new data, it's gathered from the
   trip (stays from the days, travel from Transit, reservations from booked plan items). */
import { useEffect, useState, type ReactNode } from 'react';
import type { Day, Leg, Place, PlanItem } from '../model/types';
import { addDays, fmtHM, shortDate } from '../model/time';
import { destOf, dirLink, mapsLink, type TripIndex } from '../model/trip';
import { DocLinks } from './wallet';
import { Empty, Ext, SecH, line } from './bits';
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
const MODE: Record<string, string> = { flight: 'Flight', train: 'Train', bus: 'Bus', ferry: 'Ferry', car: 'Car' };

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

const tel = (n: string) => 'tel:' + n.replace(/[^\d+]/g, '');

/** One thing, one line until tapped. */
function Item({ title, sub, colour, children }: { title: ReactNode; sub?: ReactNode; colour?: React.CSSProperties; children: ReactNode }) {
  return (
    <li>
      <details className="ess">
        <summary>
          {colour && <i className="ess-dot" style={colour} aria-hidden />}
          <span className="ess-t">{title}{sub && <small>{sub}</small>}</span>
          <span className="ess-chev" aria-hidden>›</span>
        </summary>
        <div className="ess-body">{children}</div>
      </details>
    </li>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="ess-row"><span>{label}</span><div>{children}</div></div>;
}

function StayItem({ p, nights }: { p: Place; nights: Day[] }) {
  const { ix, edit } = useApp();
  const first = nights[0], out = addDays(nights[nights.length - 1].date, 1);
  const n = nights.length;
  return (
    <Item title={p.name} colour={line(lineOfDest(destOf(ix, first)))}
      sub={`${shortDate(first.date)} – ${shortDate(out)} · ${n} ${n === 1 ? 'night' : 'nights'}`}>
      <Row label="Check in">{first.date && `${shortDate(first.date)}`}{p.checkIn ? `, from ${fmtHM(p.checkIn)}` : ''}</Row>
      <Row label="Check out">{shortDate(out)}{p.checkOut ? `, by ${fmtHM(p.checkOut)}` : ''}</Row>
      {(p.address || p.area) && <Row label="Address"><Ext href={mapsLink(ix, p)}>{p.address || p.area}</Ext></Row>}
      {p.phone && <Row label="Phone"><a href={tel(p.phone)}>{p.phone}</a></Row>}
      {p.booking && <Row label="Reservation"><span className="pre">{p.booking}</span></Row>}
      {p.notes && <Row label="Notes"><span className="pre">{p.notes}</span></Row>}
      {p.foundOnline && <p className="ess-found">Some of this was found online. Check before you rely on it.</p>}
      <DocLinks kind="place" id={p.id} />
      <div className="meta">
        {p.lat != null && <Ext href={dirLink(p, 'transit')}>Directions</Ext>}
        {p.link && <Ext href={p.link}>Website</Ext>}
        <button className="linkbtn" onClick={() => edit({ kind: 'place', id: p.id })}>{p.phone || p.booking || p.address ? 'Edit' : 'Add address, phone, reservation'}</button>
        <button className="linkbtn" onClick={() => edit({ kind: 'doc', for: { kind: 'place', id: p.id } })}>+ Booking</button>
      </div>
    </Item>
  );
}

function LegEss({ l, day }: { l: Leg; day?: Day }) {
  const { edit } = useApp();
  const when = [day && shortDate(day.date), l.depart && fmtHM(l.depart)].filter(Boolean).join(' · ');
  return (
    <Item title={`${l.from} → ${l.to}`} sub={[MODE[l.mode], when].filter(Boolean).join(' · ')}>
      {l.how && <Row label="Service"><span className="pre">{l.how}</span></Row>}
      {(l.depart || l.arrive) && <Row label="Times">{l.depart && `Leaves ${fmtHM(l.depart)}`}{l.depart && l.arrive && ', '}{l.arrive && `arrives ${fmtHM(l.arrive)}`}</Row>}
      <Row label="Booking">{l.statusText || (l.status === 'booked' ? 'Booked' : l.status === 'todo' ? 'Not booked yet' : 'Nothing to book')}</Row>
      {l.tickets && <Row label="Tickets"><span className="pre">{l.tickets}</span></Row>}
      {l.details && <Row label="Details"><span className="pre">{l.details}</span></Row>}
      <DocLinks kind="leg" id={l.id} />
      <div className="meta">
        <button className="linkbtn" onClick={() => edit({ kind: 'leg', id: l.id })}>Edit</button>
        <button className="linkbtn" onClick={() => edit({ kind: 'doc', for: { kind: 'leg', id: l.id } })}>+ Ticket</button>
      </div>
    </Item>
  );
}

function BookingEss({ d, p }: { d: Day; p: PlanItem }) {
  const { ix, edit } = useApp();
  const place = p.placeId ? ix.place.get(p.placeId) : undefined;
  return (
    <Item title={p.text} sub={[shortDate(d.date), p.time && (p.timeKind === 'by' ? 'by ' : '') + fmtHM(p.time), destOf(ix, d)?.name].filter(Boolean).join(' · ')}>
      {place && <Row label="Where"><Ext href={mapsLink(ix, place)}>{place.name}{place.address ? `, ${place.address}` : ''}</Ext></Row>}
      {place?.phone && <Row label="Phone"><a href={tel(place.phone)}>{place.phone}</a></Row>}
      {place?.link && <Row label="Website"><Ext href={place.link}>{place.link.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</Ext></Row>}
      {place?.foundOnline && <p className="ess-found">Found online. Check before you rely on it.</p>}
      {place?.booking && <Row label="Reservation"><span className="pre">{place.booking}</span></Row>}
      {p.sub?.map((s, i) => <p key={i} className="item-d">{s}</p>)}
      <DocLinks kind="plan" id={p.id} />
      <div className="meta">
        <button className="linkbtn" onClick={() => edit({ kind: 'plan', dayId: d.id, id: p.id })}>Edit</button>
        <button className="linkbtn" onClick={() => edit({ kind: 'doc', for: { kind: 'plan', id: p.id } })}>+ Ticket</button>
      </div>
    </Item>
  );
}

export function Essentials() {
  const { ix } = useApp();
  const t = ix.trip;
  const dayOf = new Map(t.days.map(d => [d.id, d]));
  const stays = staysOf(ix);
  const legs = t.legs.filter(l => FAR.includes(l.mode))
    .map(l => ({ l, day: l.dayId ? dayOf.get(l.dayId) : undefined }))
    .sort((a, b) => (a.day?.date || '').localeCompare(b.day?.date || '') || (a.l.depart || '').localeCompare(b.l.depart || ''));
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
  const [looking, setLooking] = useState(false);
  const findRest = () => { setLooking(true); void fillDetails(t, lookFor, unplaced).finally(() => setLooking(false)); };
  const missing = lookFor.length + unplaced.length;
  const countries = [...new Set(t.destinations.map(d => d.country).filter(Boolean))];
  return (
    <>
      <h1 className="page-h">Essentials</h1>
      <p className="note" style={{ marginTop: 0 }}>Hotels, travel, bookings and numbers. Tap one to see it all.</p>
      {freeBusy && <p className="note ess-looking">Filling in addresses and phone numbers…</p>}
      {!freeBusy && missing > 0 && shared && signedIn && !t.sample && (
        <div className="ess-rest">
          <span>{missing === 1 ? 'One hotel or booking is' : `${missing} hotels and bookings are`} missing an address, phone or website.</span>
          <button className="chipbtn go" disabled={looking} onClick={findRest}>{looking ? 'Looking…' : 'Find the rest online'}</button>
          <small>Uses one of the trip's AI uses.</small>
        </div>
      )}
      {!stays.length && !legs.length && !bookings.length && <Empty>Add where you're staying, your flights and trains, and booked plans; they'll gather here.</Empty>}
      {stays.length > 0 && (
        <section className="sec">
          <SecH title="Where you're staying"><span className="kicker">{stays.length}</span></SecH>
          <ul className="sheet esslist">{stays.map(s => <StayItem key={s.p.id + s.nights[0].id} p={s.p} nights={s.nights} />)}</ul>
        </section>
      )}
      {legs.length > 0 && (
        <section className="sec">
          <SecH title="Flights and trains"><span className="kicker">{legs.length}</span></SecH>
          <ul className="sheet esslist">{legs.map(x => <LegEss key={x.l.id} l={x.l} day={x.day} />)}</ul>
        </section>
      )}
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
