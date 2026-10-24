/* The Trip tab: the trip as a whole, as opposed to a day or a place. Who's going (faces), the
   whole route, Before you go, what they speak there, and the trip's settings. Switching trips is
   in Account & settings. */
import { PictureView } from './picture';
import { getState, patchTrip, pref, setPref, useStore } from '../model/store';
import { useEffect, useState } from 'react';
import { verdict } from '../model/rules';
import type { Trip } from '../model/types';
import { updateFromSheet } from '../model/sheetSync';
import { Sheet, Text } from './form';
import { TRIP_ID } from '../sheet/sheetTrip.js';
import { shortDate } from '../model/time';
import { useApp, type Tab } from './ctx';
import { Avatar, useMyAvatar, useTripPeople } from './avatar';
import { Guides } from './views';
import { RouteList } from './day';
import { SecH } from './bits';
import { JAPAN } from '../edition';
import { Languages } from './languages';
import { saveTripCopy } from '../sync/files';
import { SHEET_URL, loadTrip, savedCreds, saveCreds, type Creds } from '../sheet/live';

/** Sections that open from Trip rather than the bottom bar (none now: every section has a tab). */
export const UNDER_TRIP: Tab[] = [];

export function TripHub() {
  const { ix, ui, set, go, edit } = useApp();
  const [fromSheet, setFromSheet] = useState(false);
  const t = ix.trip, shared = !!useStore().sync[t.id];
  const days = t.days;
  return (
    <>
      <div className="kicker">{days.length ? `${shortDate(days[0].date)} – ${shortDate(days[days.length - 1].date)}` : 'No dates yet'}</div>
      <h1 className="page-h hub-h">{t.name}</h1>
      <div className="sin hub-search">
        <input className="search" type="search" placeholder="Search the trip" aria-label="Search the trip" autoComplete="off" enterKeyHint="search"
          value={ui.q} onChange={e => set({ q: e.target.value })} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
        {ui.q && <button className="sclear" onClick={() => set({ q: '' })}>Clear</button>}
      </div>
      {!ui.q && <>
        <WhosGoing />
        {days.length > 0 && <section className="sec"><SecH title="The whole route" /><RouteList /></section>}
        {t.guides.length > 0 && <section className="sec"><SecH title="Before you go" /><Guides /></section>}
        <Languages />
        {JAPAN ? <ul className="hubrows">
          <li><button onClick={() => go('prep')}><b>Leave a group note</b><span>Ask for something to be added; it's filed into the trip</span></button></li>
          <li><a href={SHEET_URL} target="_blank" rel="noopener"><b>Open the Google Sheet</b><span>Where the plan is changed</span></a></li>
        </ul> : <ul className="hubrows">
          <li><button onClick={() => edit({ kind: 'trip' })}><b>Trip settings</b><span>Name, dates, destinations, {shared ? 'who can change the plan' : 'sharing'}</span></button></li>
          {t.id === TRIP_ID && <li><button onClick={() => setFromSheet(true)}><b>Update from the Google Sheet</b><span>Bring in what friends added to the Japan sheet; what was added here stays</span></button></li>}
          <li><button onClick={() => void saveTripCopy(t)}><b>Saved on this phone</b><span>{shared ? 'Changes reach everyone when there\'s signal; the trip, tickets and documents' : 'The trip, tickets and documents'} work with no signal. Tap to save a copy as a file too.</span></button></li>
        </ul>}
      </>}
      {fromSheet && <FromSheet trip={t} close={() => setFromSheet(false)} />}
    </>
  );
}

/** "Update from the Google Sheet": signs in to the Japan sheet with its own name and passcode,
    reads it, and merges it into this trip (model/sheetSync.ts). */
function FromSheet({ trip, close }: { trip: Trip; close: () => void }) {
  const saved = savedCreds();
  const [name, setName] = useState(saved?.name || '');
  const [pass, setPass] = useState(saved?.code || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const go = async () => {
    setBusy(true); setMsg(null);
    try {
      const creds: Creds = { name: name.trim(), code: pass.trim() };
      const sheet = await loadTrip(creds);
      saveCreds(creds);
      const before = getState().trips.find(x => x.id === trip.id)!;
      const items = (x: Trip) => x.places.length + x.days.reduce((n, d) => n + d.plan.length, 0) + x.legs.length + x.todos.length;
      patchTrip(trip.id, x => updateFromSheet(x, sheet, pref<Trip | null>('sheet-base-' + trip.id, null)));
      setPref('sheet-base-' + trip.id, sheet);
      const added = items(getState().trips.find(x => x.id === trip.id)!) - items(before);
      setMsg({ text: added > 0 ? `Updated: ${added} new ${added === 1 ? 'thing' : 'things'} from the sheet.` : 'Up to date with the sheet.', bad: false });
    } catch (e) { setMsg({ text: (e as Error).message, bad: true }); }
    setBusy(false);
  };
  return (
    <Sheet title="Update from the Google Sheet" onCancel={close} cancelLabel="Done" onSave={() => void go()} saveLabel={busy ? 'Reading…' : 'Update'} canSave={!busy && !!name.trim() && !!pass.trim()}>
      <p className="fhint" style={{ marginTop: 0 }}>Uses your Japan page name and passcode. New days, plans, places, travel and to-dos from the sheet come in; what was added in the app stays.</p>
      <Text label="Your name on the Japan page" value={name} onChange={setName} />
      <Text label="Passcode" value={pass} onChange={setPass} />
      {msg && <p className={'geomsg' + (msg.bad ? ' bad' : '')} role="status">{msg.text}</p>}
    </Sheet>
  );
}

/** Everyone on the trip as a circle with their picture (initials otherwise) and name: the people
    who've joined, then anyone on Who's going who hasn't yet. A + circle to invite or share. */
function WhosGoing() {
  const { ix, edit } = useApp();
  const t = ix.trip, shared = !!useStore().sync[t.id], me = useStore().me;
  const people = useTripPeople(t.id), mine = useMyAvatar();
  const joined = people.map(p => ({ key: p.user_id, name: p.name || 'Someone', src: p.name && p.name === me && mine ? mine : p.avatar || null, waiting: false }));
  const names = new Set(joined.map(p => p.name.trim().toLowerCase()));
  const listed = t.travelers.filter(n => !names.has(n.trim().toLowerCase()))
    .map(n => ({ key: 'n:' + n, name: n, src: n === me ? mine : null, waiting: shared }));
  const all = [...joined, ...listed];
  const [big, setBig] = useState<{ src: string; name: string } | null>(null);
  /* someone who joined without a name and named themselves later never made it onto Who's going,
     so to-dos couldn't be assigned to them: whoever may change the plan adds them */
  const missing = people.map(p => (p.name || '').trim()).filter(n => n && !t.travelers.some(x => x.trim().toLowerCase() === n.toLowerCase()));
  useEffect(() => {
    if (!missing.length) return;
    const now = getState().trips.find(x => x.id === t.id), role = getState().sync[t.id]?.role;
    if (!now) return;
    const add = (x: Trip): Trip => ({ ...x, travelers: [...x.travelers, ...missing.filter(n => !x.travelers.some(y => y.trim().toLowerCase() === n.toLowerCase()))] });
    if (role && verdict(now, add(now), role) !== 'ok') return;
    patchTrip(t.id, add);
  }, [missing.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!all.length && JAPAN) return null;
  return (
    <section className="sec">
      <SecH title="Who's going"><span className="kicker">{all.length || ''}</span></SecH>
      <div className="faces">
        {all.map(p => (
          /* tap a picture to see it big */
          <button key={p.key} type="button" className={'face tapface' + (p.waiting ? ' waiting' : '')} disabled={!p.src}
            aria-label={p.src ? `See ${p.name}'s picture` : p.name} onClick={() => p.src && setBig({ src: p.src, name: p.name })}>
            <Avatar name={p.name} src={p.src} size={56} />
            <span>{p.name}</span>
            {p.waiting && <small>not joined yet</small>}
          </button>
        ))}
        {!JAPAN && !t.sample && (
          <button className="face add" onClick={() => edit({ kind: 'trip' })} aria-label={shared ? 'Invite someone' : 'Share the trip'}>
            <i aria-hidden="true">+</i><span>{shared ? 'Invite' : 'Share'}</span>
          </button>
        )}
      </div>
      {big && <PictureView src={big.src} title={big.name} close={() => setBig(null)} />}
    </section>
  );
}

/** "‹ Trip" at the top of a section opened from Trip. */
export function BackToTrip() {
  const { go } = useApp();
  return <button className="linkbtn backlink" onClick={() => go('trip')}>‹ Trip</button>;
}
