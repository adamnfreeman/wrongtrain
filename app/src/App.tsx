import { useCallback, useEffect, useMemo, useState } from 'react';
import { openSample, pref, resetSample, selectTrip, setMe, setPref, useStore } from './model/store';
import { indexTrip, whereNow } from './model/trip';
import type { Trip } from './model/types';
import { shortDate } from './model/time';
import { AppCtx, MAIN_TABS, TABS, type Tab, type UI } from './ui/ctx';
import { useGeo } from './ui/geo';
import { Days, Places, Prep, Today, Transit } from './ui/views';
import { MapView } from './ui/map';
import { DocEditor, ExpenseEditor, Wallet } from './ui/wallet';
import { Phrases } from './ui/phrases';
import { Search } from './ui/search';
import { CopySampleSheet, DayEditor, LegEditor, NewTripSheet, PlaceEditor, TodoEditor, TripSettings, type Edit } from './ui/editors';
import { makeSample } from './model/sample';
import { AccountLine, JoinSheet, SyncLine, joinCodeFromLink } from './ui/account';
import { setMyName } from './sync/engine';
import { Toast, useWaitingForMe } from './ui/requests';
import { ThemeSwitch } from './ui/theme';
import { PlannerSheet } from './ui/planner';
import { BackToTrip, TripHub, UNDER_TRIP } from './ui/trip';
import { centre, offCentre, useDock } from './ui/dock';
import { useRef } from 'react';

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
  const [sheet, setSheet] = useState<'plan' | 'new' | 'copy' | 'join' | null>(null);
  /* the last trip's tab is in the address; drop it, so the next trip opened starts on Today */
  useEffect(() => {
    if (location.hash && !/join=|access_token|error_description/.test(location.hash)) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch { /* ignore */ }
    }
  }, []);
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
        <button className="gobtn" style={{ width: '100%' }} onClick={() => setSheet('plan')}>Plan a trip for me</button>
        <p className="hint" style={{ marginTop: 0 }}>Answer a few questions and WrongTrain suggests where to go, for how long, where to stay, what to eat and see. Then change anything.</p>
        <button className="gobtn ghost" style={{ width: '100%' }} onClick={openSample}>Explore a sample trip</button>
        <button className="gobtn ghost" style={{ width: '100%' }} onClick={() => setSheet('new')}>Plan it myself</button>
        <p className="hint">The sample is a made-up ten days through Kyoto, Nara, Osaka and Tokyo, set so that today is day two. Like it? <button className="linkbtn" onClick={() => setSheet('copy')}>Start from the sample</button> and change it to suit you.</p>
        <button className="gobtn ghost" style={{ width: '100%' }} onClick={() => setSheet('join')}>Join a trip with a code</button>
        {sheet === 'plan' && <PlannerSheet close={() => setSheet(null)} />}
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
        <div className="foot"><AccountLine /><ThemeSwitch /></div>
      </div>
    </div>
  );
}

/* ---------- the open trip ---------- */

const ICONS: Record<(typeof MAIN_TABS)[number], { label: string; icon: React.ReactNode }> = {
  today: { label: 'Today', icon: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" /></> },
  days: { label: 'Days', icon: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></> },
  map: { label: 'Map', icon: <><path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.4" /></> },
  places: { label: 'Places', icon: <path d="M12 3.6l2.6 5.2 5.8.9-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.9z" /> },
  transit: { label: 'Transit', icon: <><rect x="5" y="3" width="14" height="14" rx="3.5" /><path d="M5 10.5h14M9 20.5l1.5-3.5M15 20.5L13.5 17M9 13.8h.01M15 13.8h.01" /></> },
  phrases: { label: 'Phrases', icon: <><path d="M4 5h16v11H10l-4.5 3.5V16H4z" /><path d="M8.5 9.5h7M8.5 12.5h4.5" /></> },
  prep: { label: 'To do', icon: <path d="M4 7.5l2 2 3-3.5M4 15.5l2 2 3-3.5M12.5 8H20M12.5 16H20" /> },
  wallet: { label: 'Wallet', icon: <><rect x="3.5" y="6" width="17" height="13" rx="2.5" /><path d="M3.5 10h17M15 14.5h2.5" /></> },
  trip: { label: 'Trip', icon: <><circle cx="6" cy="6" r="1.6" /><circle cx="12" cy="6" r="1.6" /><circle cx="18" cy="6" r="1.6" /><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /><circle cx="6" cy="18" r="1.6" /><circle cx="12" cy="18" r="1.6" /><circle cx="18" cy="18" r="1.6" /></> },
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
  const View = { today: Today, days: Days, transit: Transit, places: Places, map: MapView, phrases: Phrases, wallet: Wallet, trip: TripHub, prep: Prep }[ui.tab];
  /* swipe sideways anywhere on the screen to move between tabs; not on the map itself, which drags,
     nor on rows that scroll sideways (the day slider, the tab bar) */
  const tabNow = useRef(ui.tab); tabNow.current = ui.tab;
  useEffect(() => {
    const main = MAIN_TABS as readonly string[];
    let start: { x: number; y: number } | null = null;
    const down = (e: TouchEvent) => {
      const el = e.target as HTMLElement;
      start = el.closest('[data-noswipe], input, textarea, select, .sheet-wrap, .leaflet-container, .tabs, .pview') ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const up = (e: TouchEvent) => {
      const s = start; start = null;
      if (!s || document.body.classList.contains('sheet-open')) return;
      const t1 = e.changedTouches[0], dx = t1.clientX - s.x, dy = t1.clientY - s.y;
      if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
      const next = main[main.indexOf(tabNow.current) + (dx < 0 ? 1 : -1)];
      if (next) go(next as Tab);
    };
    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchend', up, { passive: true });
    return () => { window.removeEventListener('touchstart', down); window.removeEventListener('touchend', up); };
  }, [go]);
  /* the bottom bar scrolls like the day slider, with the open tab in the middle */
  const bar = useRef<HTMLDivElement>(null);
  useDock(bar, '.tab', { radius: 110, small: 0.82, big: 1.12 });
  /* scrolling the bar yourself opens whichever tab reaches the middle, as it gets there */
  const fromBar = useRef(false);
  useEffect(() => {
    const row = bar.current; if (!row) return;
    let mine = false, touching = false, frame = 0, rest = 0;
    const pick = () => {
      frame = 0;
      let best: HTMLElement | null = null, dist = Infinity;
      row.querySelectorAll<HTMLElement>('.tab').forEach(el => { const d = Math.abs(offCentre(row, el)); if (d < dist) { dist = d; best = el; } });
      const t = (best as HTMLElement | null)?.dataset.tab as Tab | undefined;
      if (t && t !== tabNow.current) { fromBar.current = true; go(t); }
    };
    const start = () => { mine = true; touching = true; clearTimeout(rest); };
    const end = () => { touching = false; };
    const onScroll = () => {
      if (!mine) return;  /* the bar moving itself to centre a tab */
      if (!frame) frame = requestAnimationFrame(pick);
      clearTimeout(rest);
      rest = window.setTimeout(() => { if (!touching) mine = false; }, 180);
    };
    row.addEventListener('touchstart', start, { passive: true });
    row.addEventListener('touchend', end, { passive: true });
    row.addEventListener('wheel', start, { passive: true });
    row.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      row.removeEventListener('touchstart', start); row.removeEventListener('touchend', end);
      row.removeEventListener('wheel', start); row.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame); clearTimeout(rest);
    };
  }, [go]);
  /* otherwise (a tap, a swipe on the page, a link) the bar slides the open tab to the middle */
  const barReady = useRef(false);
  useEffect(() => {
    if (fromBar.current) { fromBar.current = false; return; }
    centre(bar.current, bar.current?.querySelector<HTMLElement>('.tab[aria-current="page"]'), barReady.current);
    barReady.current = true;
  }, [ui.tab]);
  /* the page slides in from the side you are moving towards */
  const lastTab = useRef(ui.tab);
  const order = MAIN_TABS as readonly string[];
  const dir = order.indexOf(ui.tab) >= order.indexOf(lastTab.current) ? 'next' : 'prev';
  useEffect(() => { lastTab.current = ui.tab; }, [ui.tab]);

  return (
    <AppCtx.Provider value={{ ix, now, ui, set, go, geo, me, edit }}>
      <div className="wrap">
        {(UNDER_TRIP as string[]).includes(ui.tab) && <BackToTrip />}
        <div id="view" key={ui.tab} className={'slide-' + (lastTab.current === ui.tab ? 'none' : dir)}>
          <View />
          {ui.tab === 'trip' && (searching ? <Search q={q} /> : <Footer trip={trip} me={me} />)}
        </div>
        {editing?.kind === 'trip' && <TripSettings trip={trip} close={close} />}
        {editing?.kind === 'day' && <DayEditor trip={trip} id={editing.id} close={close} onDayChange={id => go('days', id)} />}
        {editing?.kind === 'leg' && <LegEditor trip={trip} id={editing.id} dayId={editing.dayId} close={close} />}
        {editing?.kind === 'place' && <PlaceEditor trip={trip} id={editing.id} as={editing.as} dayId={editing.dayId} destinationId={editing.destinationId} close={close} />}
        {editing?.kind === 'todo' && <TodoEditor trip={trip} id={editing.id} group={editing.group} close={close} />}
        {editing?.kind === 'doc' && <DocEditor trip={trip} id={editing.id} forRef={editing.for} close={close} />}
        {editing?.kind === 'expense' && <ExpenseEditor trip={trip} id={editing.id} close={close} />}
      </div>
      <nav className="tabs" aria-label="Sections">
        <div className="tabs-in" ref={bar}>
          {MAIN_TABS.map(t => (
            <button key={t} data-tab={t} className="tab" aria-current={ui.tab === t || (t === 'trip' && (UNDER_TRIP as string[]).includes(ui.tab)) ? 'page' : undefined} onClick={() => go(t)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[t].icon}</svg>{ICONS[t].label}
              {t === 'prep' && waiting > 0 && <span className="tabn" aria-label={`${waiting} waiting for your OK`}>{waiting}</span>}
            </button>
          ))}
        </div>
      </nav>
    </AppCtx.Provider>
  );
}

function Footer({ trip, me }: { trip: Trip; me: string }) {
  const [name, setName] = useState(me);
  return (
    <div className="foot">
      <SyncLine trip={trip} />
      <p>
        {trip.sample ? 'This is the sample trip. Ticks and notes are saved on this phone only. ' : 'Saved on this phone. '}
        {trip.sample && <button className="linkbtn" onClick={resetSample}>Start the sample over</button>}
      </p>
      <AccountLine />
      <label className="lbl" htmlFor="me">Your name, for notes and ticks</label>
      <div className="sbar" style={{ marginTop: 6 }}>
        <div className="sin"><input id="me" className="search" style={{ paddingRight: 12 }} value={name} placeholder={trip.travelers[0] ? `e.g. ${trip.travelers[0]}` : 'Your name'}
          onChange={e => setName(e.target.value)} onBlur={() => { setMe(name); if (name.trim()) void setMyName(name.trim()); }} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} /></div>
      </div>
      <ThemeSwitch />
    </div>
  );
}
