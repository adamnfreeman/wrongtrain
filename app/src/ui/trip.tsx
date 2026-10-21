/* The Trip tab: the trip as a whole, as opposed to a day or a place. Who's going (faces), the
   whole route, Before you go, what they speak there, and the trip's settings. Switching trips is
   in Account & settings. */
import { useStore } from '../model/store';
import { shortDate } from '../model/time';
import { useApp, type Tab } from './ctx';
import { Avatar, useMyAvatar, useTripPeople } from './avatar';
import { Guides } from './views';
import { RouteList } from './day';
import { SecH } from './bits';
import { JAPAN } from '../edition';
import { Languages } from './languages';
import { saveTripCopy } from '../sync/files';
import { SHEET_URL } from '../sheet/live';

/** Sections that open from Trip rather than the bottom bar (none now: every section has a tab). */
export const UNDER_TRIP: Tab[] = [];

export function TripHub() {
  const { ix, ui, set, go, edit } = useApp();
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
          <li><button onClick={() => void saveTripCopy(t)}><b>Saved on this phone</b><span>{shared ? 'Changes reach everyone when there\'s signal; the trip, tickets and documents' : 'The trip, tickets and documents'} work with no signal. Tap to save a copy as a file too.</span></button></li>
        </ul>}
      </>}
    </>
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
  if (!all.length && JAPAN) return null;
  return (
    <section className="sec">
      <SecH title="Who's going"><span className="kicker">{all.length || ''}</span></SecH>
      <div className="faces">
        {all.map(p => (
          <div key={p.key} className={'face' + (p.waiting ? ' waiting' : '')}>
            <Avatar name={p.name} src={p.src} size={56} />
            <span>{p.name}</span>
            {p.waiting && <small>not joined yet</small>}
          </div>
        ))}
        {!JAPAN && !t.sample && (
          <button className="face add" onClick={() => edit({ kind: 'trip' })} aria-label={shared ? 'Invite someone' : 'Share the trip'}>
            <i aria-hidden="true">+</i><span>{shared ? 'Invite' : 'Share'}</span>
          </button>
        )}
      </div>
    </section>
  );
}

/** "‹ Trip" at the top of a section opened from Trip. */
export function BackToTrip() {
  const { go } = useApp();
  return <button className="linkbtn backlink" onClick={() => go('trip')}>‹ Trip</button>;
}
