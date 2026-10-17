/* The Trip tab: everything that is not about today or a particular day. Search, the sections
   that used to be tabs of their own (Places, Transit, Phrases, To do), sharing and settings, and
   switching trips. Sections open full screen with a way back here. */
import { selectTrip, useStore } from '../model/store';
import { shortDate } from '../model/time';
import { PACKS } from '../phrases';
import { useApp, type Tab } from './ctx';
import { useWaitingForMe } from './requests';
import { RouteList } from './day';
import { SecH } from './bits';
import { JAPAN } from '../edition';
import { visibleTodos } from '../model/todos';
import { Languages } from './languages';
import { SHEET_URL } from '../sheet/live';

/** Sections that open from Trip rather than the bottom bar (none now: every section has a tab). */
export const UNDER_TRIP: Tab[] = [];

export function TripHub() {
  const { ix, ui, set, go, edit } = useApp();
  const t = ix.trip, shared = !!useStore().sync[t.id];
  const waiting = useWaitingForMe(t.id);
  const open = visibleTodos(t.todos, useStore().me).filter(x => !x.done).length, notes = t.notes.filter(n => !n.done).length;
  const toBook = t.legs.filter(l => l.status === 'todo').length;
  const ideas = t.places.filter(p => p.wishlist).length;
  const pack = t.phrasePack ? PACKS[t.phrasePack] : undefined;
  const tiles: { tab: Tab; name: string; what: string; dot?: boolean }[] = [
    { tab: 'places', name: 'Places', what: `${t.places.length - ideas} planned · ${ideas} ideas` },
    { tab: 'transit', name: 'Transit', what: toBook ? `${toBook} to book` : `${t.legs.length} legs` },
    { tab: 'phrases', name: 'Phrases', what: pack ? pack.name : 'None yet' },
    { tab: 'prep', name: 'To do', what: `${open} open${notes ? ` · ${notes} ${notes === 1 ? 'note' : 'notes'}` : ''}${waiting ? ` · ${waiting} for your OK` : ''}`, dot: waiting > 0 },
  ];
  const days = t.days;
  return (
    <>
      <div className="kicker">{days.length ? `${shortDate(days[0].date)} – ${shortDate(days[days.length - 1].date)}` : 'No dates yet'}{t.travelers.length ? ` · ${t.travelers.length} ${t.travelers.length === 1 ? 'person' : 'people'}` : ''}</div>
      <h1 className="page-h hub-h">{t.name}</h1>
      <div className="sin hub-search">
        <input className="search" type="search" placeholder="Search the trip" aria-label="Search the trip" autoComplete="off" enterKeyHint="search"
          value={ui.q} onChange={e => set({ q: e.target.value })} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
        {ui.q && <button className="sclear" onClick={() => set({ q: '' })}>Clear</button>}
      </div>
      {!ui.q && <div className="hub">
        {tiles.map(x => (
          <button key={x.tab} className="tile" onClick={() => go(x.tab)}>
            <b>{x.name}{x.dot && <i className="tile-dot" aria-label="Needs you" />}</b><span>{x.what}</span>
          </button>
        ))}
      </div>}
      {JAPAN ? <ul className="hubrows">
        <li><button onClick={() => go('prep')}><b>Leave a group note</b><span>Ask for something to be added; it's filed into the trip</span></button></li>
        <li><a href={SHEET_URL} target="_blank" rel="noopener"><b>Open the Google Sheet</b><span>Where the plan is changed</span></a></li>
      </ul> : <ul className="hubrows">
        <li><button onClick={() => edit({ kind: 'trip' })}><b>{shared ? 'People and sharing' : 'Share with the group'}</b><span>{shared ? 'Invite, roles, who can change the plan' : 'Plan it together, live'}</span></button></li>
        <li><button onClick={() => edit({ kind: 'trip' })}><b>Trip settings</b><span>Name, dates, destinations</span></button></li>
        <li><button onClick={() => selectTrip(null)}><b>All trips</b><span>{t.sample ? 'Leave the sample, plan your own' : 'Switch trip, or plan a new one'}</span></button></li>
      </ul>}
      {!ui.q && <Languages />}
      {!ui.q && days.length > 0 && <section className="sec"><SecH title="The whole route" /><RouteList /></section>}
    </>
  );
}

/** "‹ Trip" at the top of a section opened from Trip. */
export function BackToTrip() {
  const { go } = useApp();
  return <button className="linkbtn backlink" onClick={() => go('trip')}>‹ Trip</button>;
}
