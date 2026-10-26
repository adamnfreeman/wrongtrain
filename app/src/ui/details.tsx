/* The details card: one look for everything you can tap. A hotel, a restaurant or sight, a flight
   or train, a booked plan item opens the same card wherever it's tapped (Today, Days, Places,
   Essentials): what and when up top, big buttons for what you'd do next (Directions, Call,
   Website), then the details in labelled rows, tickets and bookings, and Edit at the foot. A place
   that isn't a hotel also gets Add to itinerary. Nothing here is new data; it's read from the trip. */
import type { ReactNode } from 'react';
import type { Day, Leg, Place, PlanItem, ThingRef } from '../model/types';
import { addDays, fmtHM, longDate, shortDate } from '../model/time';
import { KIND_LABEL, type TripIndex, cityOf, dirLink, lineOf, lineOfDest, mapsLink, siteOf } from '../model/trip';
import { JAPAN } from '../edition';
import { DocLinks } from './wallet';
import { Popup } from './form';
import { Ext, Pill, Txt, line } from './bits';
import { WhoGoing } from './planItem';
import { AddToItinerary } from './addToPlan';
import { useApp } from './ctx';

const MODE: Record<string, string> = { flight: 'Flight', train: 'Train', subway: 'Subway', bus: 'Bus', car: 'Car', ferry: 'Ferry', walk: 'Walk', other: 'Travel' };
export const tel = (n: string) => 'tel:' + n.replace(/[^\d+]/g, '');
const site = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="ess-row"><span>{label}</span><div>{children}</div></div>;
}

/** The big buttons: what you'd do next with this thing. */
/** No website known yet: a web search for the place's own site, which is nearly always the top
    result (better than sending people to a map when they asked for the website). */
const siteSearch = (ix: TripIndex, p: Place) =>
  'https://www.google.com/search?q=' + encodeURIComponent([p.name, p.destinationId && ix.dest.get(p.destinationId)?.name, 'official site'].filter(Boolean).join(' '));

function Acts({ p }: { p?: Place }) {
  const { ix } = useApp();
  if (!p || p.closed) return null;
  return (
    <div className="dc-acts">
      <Ext href={p.lat != null ? dirLink(p, 'transit') : mapsLink(ix, p)}>Directions</Ext>
      {p.phone && <a href={tel(p.phone)}>Call</a>}
      {(siteOf(p) || (p.kind !== 'area' && p.kind !== 'transit')) && <Ext href={siteOf(p) || siteSearch(ix, p)}>Website</Ext>}
    </div>
  );
}

/** Where a place is, how to reach it, its booking: the rows every place shares. */
function PlaceRows({ p }: { p: Place }) {
  const { ix } = useApp();
  const hours = p.hours === '24h' ? 'Open 24 hours' : p.hours ? `${fmtHM(p.hours.open)}–${fmtHM(p.hours.close)}` : '';
  return (
    <>
      {(p.address || p.area) && <Row label="Address"><Ext href={mapsLink(ix, p)}>{p.address || p.area}</Ext></Row>}
      {p.phone && <Row label="Phone"><a href={tel(p.phone)}>{p.phone}</a></Row>}
      {hours && <Row label="Hours">{hours}{p.closedDays?.length ? `, closed ${p.closedDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}` : ''}</Row>}
      {siteOf(p) && <Row label="Website"><Ext href={siteOf(p)!}>{site(siteOf(p)!)}</Ext></Row>}
      {p.booking && <Row label="Reservation"><span className="pre">{p.booking}</span></Row>}
      {p.dietNote && <Row label="Food">{p.dietNote}</Row>}
    </>
  );
}

const Found = ({ p }: { p?: Place }) => p?.foundOnline ? <p className="ess-found">Some of this was found online. Check before you rely on it.</p> : null;

function Head({ kick, title, sub, colour, pill }: { kick: string; title: string; sub?: string; colour?: React.CSSProperties; pill?: ReactNode }) {
  return (
    <header className="dc-head" style={colour}>
      <div className="kicker">{kick}</div>
      <h2 className="dc-t">{title}</h2>
      {(sub || pill) && <p className="dc-sub">{sub}{pill}</p>}
    </header>
  );
}

function PlaceCard({ p, close }: { p: Place; close: () => void }) {
  const { ix, edit } = useApp();
  const nights = ix.trip.days.filter(d => d.stayId === p.id);
  const on = ix.trip.days.filter(d => d.plan.some(i => i.placeId === p.id) || d.eatIds.includes(p.id) || p.dayIds?.includes(d.id));
  const stay = p.kind === 'stay' && nights.length > 0;
  const first = nights[0], out = stay ? addDays(nights[nights.length - 1].date, 1) : '';
  const city = (p.destinationId && ix.dest.get(p.destinationId)?.name) || '';
  const sub = stay ? `${shortDate(first.date)} – ${shortDate(out)} · ${nights.length} ${nights.length === 1 ? 'night' : 'nights'}`
    : [city, on.length ? `On ${on.map(d => shortDate(d.date)).join(', ')}` : ''].filter(Boolean).join(' · ');
  const go = (f: () => void) => () => { close(); f(); };
  return (
    <>
      <Head kick={p.wishlist ? 'Wishlist' : KIND_LABEL[p.kind]} title={p.name} sub={sub} colour={line(lineOfDest(p.destinationId ? ix.dest.get(p.destinationId) : undefined))}
        pill={p.closed ? <Pill>Closed</Pill> : undefined} />
      <Acts p={p} />
      <Txt text={p.notes} className="item-d dc-notes" />
      <div className="dc-rows">
        {stay && <Row label="Check in">{shortDate(first.date)}{p.checkIn ? `, from ${fmtHM(p.checkIn)}` : ''}</Row>}
        {stay && <Row label="Check out">{shortDate(out)}{p.checkOut ? `, by ${fmtHM(p.checkOut)}` : ''}</Row>}
        <PlaceRows p={p} />
      </div>
      <Found p={p} />
      <DocLinks kind="place" id={p.id} />
      {p.kind !== 'stay' && !JAPAN && !p.closed && <AddToItinerary p={p} close={close} />}
      <div className="dc-btns">
        <button type="button" className="bigbtn" onClick={go(() => edit({ kind: 'place', id: p.id }))}>{stay && !(p.phone || p.booking || p.address) ? 'Add details' : 'Edit'}</button>
        <button type="button" className="bigbtn" onClick={go(() => edit({ kind: 'doc', for: { kind: 'place', id: p.id } }))}>Add a booking</button>
      </div>
    </>
  );
}

function LegCard({ l, close }: { l: Leg; close: () => void }) {
  const { ix, edit } = useApp();
  const day = l.dayId ? ix.trip.days.find(d => d.id === l.dayId) : undefined;
  const from = l.fromPlaceId ? ix.place.get(l.fromPlaceId) : undefined;
  const sub = [day ? longDate(day.date) : 'Before the trip', l.depart && fmtHM(l.depart) + (l.arrive ? `–${fmtHM(l.arrive)}` : '')].filter(Boolean).join(' · ');
  const sk = l.status === 'booked' ? 'ok' : l.status === 'todo' ? 'todo' : '';
  const go = (f: () => void) => () => { close(); f(); };
  return (
    <>
      <Head kick={MODE[l.mode]} title={`${l.from} → ${l.to}`} sub={sub + ' '} colour={day ? line(lineOf(ix, day)) : undefined}
        pill={<Pill kind={sk}>{l.statusText || (l.status === 'booked' ? 'Booked' : l.status === 'todo' ? 'To book' : 'Nothing to book')}</Pill>} />
      <Acts p={from} />
      <div className="dc-rows">
        {l.how && <Row label="Service"><span className="pre">{l.how}</span></Row>}
        {(l.depart || l.arrive) && <Row label="Times">{l.depart && `Leaves ${fmtHM(l.depart)}`}{l.depart && l.arrive && ', '}{l.arrive && `arrives ${fmtHM(l.arrive)}`}</Row>}
        {from && <Row label="From"><Ext href={mapsLink(ix, from)}>{from.name}{from.address ? `, ${from.address}` : ''}</Ext></Row>}
        {l.tickets && <Row label="Tickets"><span className="pre">{l.tickets}</span></Row>}
        {l.details && <Row label="Details"><span className="pre">{l.details}</span></Row>}
      </div>
      <DocLinks kind="leg" id={l.id} />
      <div className="dc-btns">
        <button type="button" className="bigbtn" onClick={go(() => edit({ kind: 'leg', id: l.id }))}>Edit</button>
        <button type="button" className="bigbtn" onClick={go(() => edit({ kind: 'doc', for: { kind: 'leg', id: l.id } }))}>Add a ticket</button>
      </div>
    </>
  );
}

function PlanCard({ d, p, close }: { d: Day; p: PlanItem; close: () => void }) {
  const { ix, edit } = useApp();
  const place = p.placeId ? ix.place.get(p.placeId) : undefined;
  const when = p.time ? (p.timeKind === 'by' ? 'By ' : '') + fmtHM(p.time) + (p.end ? `–${fmtHM(p.end)}` : '') : '';
  /* the place's name, else the text's first sentence; the whole text then sits under it */
  /* no lookbehind in this pattern: Safari before 16.4 can't read one, and the whole app would fail */
  const line1 = p.text.split('\n')[0], end = line1.match(/^.*?[.!?](?=\s)/);
  const first = (end ? end[0] : line1).trim();
  const title = place?.name || (first.length <= 70 ? first : first.slice(0, 67).trimEnd() + '…');
  const go = (f: () => void) => () => { close(); f(); };
  return (
    <>
      <Head kick={p.fixed ? 'Booked' : 'Plan'} title={title} sub={[longDate(d.date), when, cityOf(ix, d)].filter(Boolean).join(' · ')} colour={line(lineOf(ix, d))} />
      <Acts p={place} />
      {title !== p.text.trim() && <Txt text={p.text} className="item-d dc-notes" />}
      {p.sub?.map((s, i) => <Txt key={i} text={s} className="item-d" />)}
      {place && (
        <div className="dc-rows">
          {place.name !== title && <Row label="Where"><Ext href={mapsLink(ix, place)}>{place.name}</Ext></Row>}
          <PlaceRows p={place} />
        </div>
      )}
      <Found p={place} />
      <DocLinks kind="plan" id={p.id} />
      {!JAPAN && <WhoGoing trip={ix.trip} item={p} />}
      <div className="dc-btns">
        <button type="button" className="bigbtn" onClick={go(() => edit({ kind: 'plan', dayId: d.id, id: p.id }))}>Edit</button>
        <button type="button" className="bigbtn" onClick={go(() => edit({ kind: 'doc', for: { kind: 'plan', id: p.id } }))}>Add a ticket</button>
      </div>
    </>
  );
}

export function DetailsCard({ thing, close }: { thing: ThingRef; close: () => void }) {
  const { ix } = useApp();
  let body: ReactNode = null, label = 'Details';
  if (thing.kind === 'place') {
    const p = ix.place.get(thing.id);
    if (p) { body = <PlaceCard p={p} close={close} />; label = p.kind === 'stay' ? 'Hotel' : 'Place'; }
  } else if (thing.kind === 'leg') {
    const l = ix.trip.legs.find(x => x.id === thing.id);
    if (l) { body = <LegCard l={l} close={close} />; label = 'Travel'; }
  } else {
    const d = ix.trip.days.find(x => x.id === thing.dayId), p = d?.plan.find(x => x.id === thing.id);
    if (d && p) { body = <PlanCard d={d} p={p} close={close} />; label = p.fixed ? 'Booking' : 'Plan'; }
  }
  /* gone (deleted on another phone while open): nothing to show */
  if (!body) return null;
  return <Popup title={label} close={close}><div className="dcard">{body}</div></Popup>;
}

/** A one-line row that opens a thing's card: Essentials, Coming up and Tonight on Today. */
export function ThingRow({ thing, title, sub, kick, colour, extra }: { thing: ThingRef; title: ReactNode; sub?: ReactNode; kick?: ReactNode; colour?: React.CSSProperties; extra?: ReactNode }) {
  const { show } = useApp();
  return (
    <li className="trow-li">
      <button className="trow" onClick={() => show(thing)}>
        {colour && <i className="ess-dot" style={colour} aria-hidden />}
        <span className="ess-t">{kick && <span className="trow-k">{kick}</span>}{title}{sub && <small>{sub}</small>}</span>
        {extra}
        <span className="ess-chev" aria-hidden>›</span>
      </button>
    </li>
  );
}

