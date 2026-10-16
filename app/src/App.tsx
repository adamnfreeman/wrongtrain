import { useCallback, useEffect, useMemo, useState } from 'react';
import { openSample, pref, resetSample, selectTrip, setMe, setPref, useStore } from './model/store';
import { indexTrip, whereNow } from './model/trip';
import type { Trip } from './model/types';
import { shortDate } from './model/time';
import { AppCtx, TABS, type Tab, type UI } from './ui/ctx';
import { useGeo } from './ui/geo';
import { Days, Places, Prep, Today, Transit } from './ui/views';
import { MapView } from './ui/map';
import { Phrases } from './ui/phrases';
import { Search } from './ui/search';
import { CopySampleSheet, DayEditor, LegEditor, NewTripSheet, PlaceEditor, TodoEditor, TripSettings, type Edit } from './ui/editors';
import { makeSample } from './model/sample';
import { AccountLine, JoinSheet, SyncLine, joinCodeFromLink } from './ui/account';
import { setMyName } from './sync/engine';
import { Toast, useWaitingForMe } from './ui/requests';

export default function App() {
  const { trips, activeId, me } = useStore();
  const trip = trips.find(t => t.id === activeId);
  /* an invite link (…#join=CODE) opens the join sheet over whatever is showing */
  const [join, setJoin] = useState(joinCodeFromLink);
  useEffect(() => {
    const f = () => { const c = joinCodeFromLink(); if (c) setJoin(c); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return (
    <>
      {trip ? <TripApp key={trip.id} trip={trip} me={me} /> : <Welcome trips={trips} />}
      {join && <JoinSheet initial={join} close={() => setJoin('')} />}
      <Toast />
    </>
  );
}

/* ---------- welcome ---------- */

function Welcome({ trips }: { trips: Trip[] }) {
  const [sheet, setSheet] = useState<'new' | 'copy' | 'join' | null>(null);
  const sample = useMemo(() => trips.find(t => t.sample) || makeSample(new Date()), [trips]);
  return (
    <div className="wrap" style={{ paddingBottom: 40 }}>
      <div className="gate">
        <header className="board">
          <div className="board-main">
            <div className="kicker">WrongTrain</div>
            <h1>Every trip is a line</h1>
            <p className="board-sub">Days, trains, places to eat and things to do, for everyone on the trip. Works with no signal.</p>
          </div>
          <div className="stripe">{(['violet', 'amber', 'red', 'green'] as const).map(c => <i key={c} style={{ ['--line' as string]: `var(--l-${c})` }} />)}</div>
        </header>
        <button className="gobtn" style={{ width: '100%' }} onClick={openSample}>Explore a sample trip</button>
        <button className="gobtn ghost" style={{ width: '100%' }} onClick={() => setSheet('new')}>Plan your own trip</button>
        <p className="hint">The sample is a made-up ten days through Kyoto, Nara, Osaka and Tokyo, set so that today is day two. Like it? <button className="linkbtn" onClick={() => setSheet('copy')}>Start from the sample</button> and change it to suit you.</p>
        <button className="gobtn ghost" style={{ width: '100%' }} onClick={() => setSheet('join')}>Join a trip with a code</button>
        {sheet === 'new' && <NewTripSheet close={() => setSheet(null)} />}
        {sheet === 'join' && <JoinSheet close={() => setSheet(null)} />}
        {sheet === 'copy' && <CopySampleSheet src={sample} close={() => setSheet(null)} />}
        {trips.length > 0 && (
          <section className="sec">
            <div className="sec-h"><h2>Your trips</h2></div>
            <ul className="sheet">
              {trips.map(t => (
                <li key={t.id}>
                  <button className="linkbtn item-n" onClick={() => selectTrip(t.id)}>{t.name}</button>
                  {t.days.length > 0 && <div className="meta"><span>{shortDate(t.days[0].date)} – {shortDate(t.days[t.days.length - 1].date)}</span>{t.sample && <span>Sample</span>}</div>}
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="foot"><AccountLine /></div>
      </div>
    </div>
  );
}

/* ---------- the open trip ---------- */

const ICONS: Record<Tab, { label: string; icon: React.ReactNode }> = {
  today: { label: 'Today', icon: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" /></> },
  days: { label: 'Days', icon: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></> },
  transit: { label: 'Transit', icon: <><rect x="5" y="3" width="14" height="14" rx="3.5" /><path d="M5 10.5h14M9 20.5l1.5-3.5M15 20.5L13.5 17M9 13.8h.01M15 13.8h.01" /></> },
  places: { label: 'Places', icon: <path d="M12 3.6l2.6 5.2 5.8.9-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.9z" /> },
  map: { label: 'Map', icon: <><path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.4" /></> },
  phrases: { label: 'Phrases', icon: <><path d="M4 5h16v11H10l-4.5 3.5V16H4z" /><path d="M8.5 9.5h7M8.5 12.5h4.5" /></> },
  prep: { label: 'To do', icon: <path d="M4 7.5l2 2 3-3.5M4 15.5l2 2 3-3.5M12.5 8H20M12.5 16H20" /> },
};

function fromHash(ids: Set<string>): Partial<UI> {
  const h = decodeURIComponent((location.hash || '').slice(1));
  if ((TABS as readonly string[]).includes(h)) return { tab: h as Tab };
  if (ids.has(h)) return { tab: 'days', day: h };
  return {};
}

function TripApp({ trip, me }: { trip: Trip; me: string }) {
  const ix = useMemo(() => indexTrip(trip), [trip]);
  const now = whereNow(ix);
  const ids = useMemo(() => new Set(trip.days.map(d => d.id)), [trip.days]);
  const [ui, setUi] = useState<UI>(() => ({
    tab: 'today', day: (now.cur || trip.days[0])?.id || '', seg: 'food',
    dest: now.cur?.destinationId && !now.cur.travel ? now.cur.destinationId : 'all',
    veg: pref('veg', false), hide: {}, sim: { day: '', min: 840 }, pcat: 'All', pq: '', q: '',
    ...fromHash(ids),
  }));
  const set = useCallback((p: Partial<UI>) => {
    if ('veg' in p) setPref('veg', p.veg);
    setUi(u => ({ ...u, ...p }));
  }, []);
  const go = useCallback((tab: Tab, day?: string) => {
    setUi(u => ({ ...u, tab, day: day || u.day, q: '' }));
    window.scrollTo(0, 0);
  }, []);
  const [editing, edit] = useState<Edit | null>(null);
  const close = useCallback(() => edit(null), []);
  /* Today needs it during the trip, and for "Something nearby" at any time */
  const geoWanted = ui.tab === 'map' || ui.tab === 'today';
  const geo = useGeo(geoWanted);

  useEffect(() => {
    /* leave a sign-in link's tokens in place until Supabase has read them */
    if (/access_token|error_description/.test(location.hash)) return;
    try { history.replaceState(null, '', '#' + (ui.tab === 'days' ? ui.day : ui.tab)); } catch { /* ignore */ }
  }, [ui.tab, ui.day]);
  useEffect(() => {
    const f = () => setUi(u => ({ ...u, ...fromHash(ids) }));
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, [ids]);

  const q = ui.q.trim(), searching = q.length > 1;
  const waiting = useWaitingForMe(trip.id);
  const View = { today: Today, days: Days, transit: Transit, places: Places, map: MapView, phrases: Phrases, prep: Prep }[ui.tab];

  return (
    <AppCtx.Provider value={{ ix, now, ui, set, go, geo, me, edit }}>
      <div className="wrap">
        <div className="tripbar">
          <button className="linkbtn" onClick={() => selectTrip(null)}>‹ All trips</button>
          <span className="tripname">{trip.name}</span>
          {trip.sample && <span className="pill">Sample</span>}
        </div>
        {!(ui.tab === 'phrases' && !searching) && (
          <div className="sbar">
            <div className="sin">
              <input className="search" type="search" placeholder="Search the whole trip" aria-label="Search the whole trip" autoComplete="off"
                enterKeyHint="search" value={ui.q} onChange={e => set({ q: e.target.value })} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
              {ui.q && <button className="sclear" onClick={() => set({ q: '' })}>Clear</button>}
            </div>
            {ui.tab !== 'prep' && <button className="notebtn" onClick={() => { go('prep'); setTimeout(() => document.getElementById('gnote')?.focus(), 50); }}>+ Note</button>}
          </div>
        )}
        <div id="view">{searching ? <Search q={q} /> : <View />}</div>
        <Footer trip={trip} me={me} onSettings={() => edit({ kind: 'trip' })} />
        {editing?.kind === 'trip' && <TripSettings trip={trip} close={close} />}
        {editing?.kind === 'day' && <DayEditor trip={trip} id={editing.id} close={close} onDayChange={id => go('days', id)} />}
        {editing?.kind === 'leg' && <LegEditor trip={trip} id={editing.id} dayId={editing.dayId} close={close} />}
        {editing?.kind === 'place' && <PlaceEditor trip={trip} id={editing.id} as={editing.as} dayId={editing.dayId} destinationId={editing.destinationId} close={close} />}
        {editing?.kind === 'todo' && <TodoEditor trip={trip} id={editing.id} group={editing.group} close={close} />}
      </div>
      <nav className="tabs" aria-label="Sections">
        <div className="tabs-in">
          {TABS.map(t => (
            <button key={t} className="tab" aria-current={ui.tab === t ? 'page' : undefined} onClick={() => go(t)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[t].icon}</svg>{ICONS[t].label}
              {t === 'prep' && waiting > 0 && <span className="tabn" aria-label={`${waiting} waiting for your OK`}>{waiting}</span>}
            </button>
          ))}
        </div>
      </nav>
    </AppCtx.Provider>
  );
}

function Footer({ trip, me, onSettings }: { trip: Trip; me: string; onSettings: () => void }) {
  const [name, setName] = useState(me);
  return (
    <div className="foot">
      <SyncLine trip={trip} />
      <p>
        {trip.sample ? 'This is the sample trip. Ticks and notes are saved on this phone only. ' : 'Saved on this phone. '}
        <button className="linkbtn" onClick={() => selectTrip(null)}>All trips</button>
        {trip.sample && <> · <button className="linkbtn" onClick={resetSample}>Start the sample over</button></>}
        {' · '}<button className="linkbtn" onClick={onSettings}>Trip settings</button>
      </p>
      <AccountLine />
      <label className="lbl" htmlFor="me">Your name, for notes and ticks</label>
      <div className="sbar" style={{ marginTop: 6 }}>
        <div className="sin"><input id="me" className="search" style={{ paddingRight: 12 }} value={name} placeholder={trip.travelers[0] ? `e.g. ${trip.travelers[0]}` : 'Your name'}
          onChange={e => setName(e.target.value)} onBlur={() => { setMe(name); if (name.trim()) void setMyName(name.trim()); }} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} /></div>
      </div>
    </div>
  );
}
