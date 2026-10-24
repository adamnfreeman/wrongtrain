import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { getState, importTrip, openSample, pref, resetSample, selectTrip, setPref, useStore } from './model/store';
import { readTripFile } from './model/tripFile';
import { JAPAN } from './edition';
import { JapanApp, SheetOnly } from './ui/japan';
import { sendSpot, useSharingUntil } from './sync/locations';
import { after, rightNow } from './model/rightNow';
import { liveCtx } from './model/next';
import { RightNow } from './ui/rightnow';
import { indexTrip, whereNow } from './model/trip';
import type { Trip } from './model/types';
import { Fold } from './ui/bits';
import { shortDate } from './model/time';
import { AppCtx, MAIN_TABS, TABS, type Tab, type UI } from './ui/ctx';
import { useGeo } from './ui/geo';
import { Days, Places, Prep, Today } from './ui/views';
import { MapView, ShareNotice } from './ui/map';
import { RemindNotice } from './ui/remind';
import { DocEditor, ExpenseEditor, Wallet } from './ui/wallet';
import { Phrases } from './ui/phrases';
import { Search } from './ui/search';
import { CopySampleSheet, DayEditor, LegEditor, NewTripSheet, PlaceEditor, TodoEditor, TripSettings, type Edit } from './ui/editors';
import { makeSample } from './model/sample';
import { AccountButton, JoinSheet, SyncLine, joinCodeFromLink } from './ui/account';
import { Toast, useWaitingForMe } from './ui/requests';
import { PlannerSheet } from './ui/planner';
import { TripHub } from './ui/trip';
import { AddAnything, AddButton, addOn, type AddKind } from './ui/addAnything';
import { addPhotos } from './sync/photos';
import { useWalletSeg } from './ui/wallet';
import { canFile } from './sync/filing';
import { useSync } from './sync/engine';
import { usePullToRefresh } from './ui/pull';
import { PlanItemEditor } from './ui/planItem';
import { Essentials } from './ui/essentials';
import { scheduleReminders } from './sync/reminders';
import { MyNotes } from './ui/mynotes';
import { PhotosPage } from './ui/photos';
import { offCentre, useDock } from './ui/dock';
import { useRef } from 'react';

/* Swipes the pager quickly across to a tapped tab, however far: the browser's own smooth scroll
   glides slowly over long distances and is cut short by scroll snapping on iOS. Snapping is off
   while it moves; the bar follows through the pager's scroll handler. */
let gliding = 0;
function glide(pg: HTMLElement, row: HTMLElement | null, to: number) {
  cancelAnimationFrame(gliding);
  const from = pg.scrollLeft, d = to - from, start = performance.now();
  const dur = Math.min(380, 220 + (Math.abs(d) / (pg.clientWidth || 1)) * 30);
  pg.style.scrollSnapType = 'none'; if (row) row.style.scrollSnapType = 'none';
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / dur), e = 1 - (1 - t) ** 3;
    pg.scrollLeft = from + d * e;
    if (t < 1) gliding = requestAnimationFrame(step);
    else { pg.style.scrollSnapType = ''; if (row) row.style.scrollSnapType = ''; }
  };
  gliding = requestAnimationFrame(step);
}

/* Your trips, with past ones archived out of the way: archiving is per phone (it hides the trip
   here, nothing changes for anyone else) and can be undone. Trips already over get the button. */
function TripList({ trips }: { trips: Trip[] }) {
  const [archived, setArchived] = useState<string[]>(() => pref<string[]>('archived', []));
  const save = (ids: string[]) => { setArchived(ids); setPref('archived', ids); };
  const today = new Date().toISOString().slice(0, 10);
  const row = (t: Trip, isArchived: boolean) => (
    <li key={t.id}>
      <button className="linkbtn item-n" onClick={() => selectTrip(t.id)}>{t.name}</button>
      <div className="meta">
        {t.days.length > 0 && <span>{shortDate(t.days[0].date)} – {shortDate(t.days[t.days.length - 1].date)}</span>}{t.sample && <span>Sample</span>}
        {isArchived ? <button className="linkbtn" onClick={() => save(archived.filter(x => x !== t.id))}>Bring back</button>
          : <button className="linkbtn" onClick={() => save([...archived, t.id])}>{(t.days[t.days.length - 1]?.date || '9') < today ? 'Archive (trip is over)' : 'Archive'}</button>}
      </div>
    </li>
  );
  const shown = trips.filter(t => !archived.includes(t.id)), hidden = trips.filter(t => archived.includes(t.id));
  return (
    <section className="sec">
      <div className="sec-h"><h2>Your trips</h2></div>
      {shown.length > 0 && <ul className="sheet">{shown.map(t => row(t, false))}</ul>}
      {hidden.length > 0 && <Fold title="Archived" count={hidden.length} note="Hidden on this phone only. Everything in them is kept."><ul className="sheet">{hidden.map(t => row(t, true))}</ul></Fold>}
    </section>
  );
}

export default function App() {
  if (JAPAN) return <JapanApp TripApp={TripApp} />;
  return <TheApp />;
}

function TheApp() {
  const { trips, activeId, me } = useStore();
  const trip = trips.find(t => t.id === activeId);
  /* an invite link (…#join=CODE) opens the join sheet over whatever is showing */
  const [join, setJoin] = useState(joinCodeFromLink);
  /* passport reminders before flights, kept in step with the trips (a moment after they change) */
  useEffect(() => { const t = window.setTimeout(() => void scheduleReminders(trips), 2000); return () => clearTimeout(t); }, [trips]);
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
      <AccountButton />
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
        <button className="gobtn ghost" style={{ width: '100%' }} onClick={() => setSheet('new')}>Plan it myself</button>
        <button className="gobtn ghost" style={{ width: '100%' }} onClick={openSample}>Explore a sample trip</button>
        <p className="hint">The sample is a made-up ten days through Kyoto, Nara, Osaka and Tokyo, set so that today is day two. Like it? <button className="linkbtn" onClick={() => setSheet('copy')}>Start from the sample</button> and change it to suit you.</p>
        <button className="gobtn ghost" style={{ width: '100%' }} onClick={() => setSheet('join')}>Join a trip with a code</button>
        <OpenTripFile trips={trips} />
        {sheet === 'plan' && <PlannerSheet close={() => setSheet(null)} />}
        {sheet === 'new' && <NewTripSheet close={() => setSheet(null)} />}
        {sheet === 'join' && <JoinSheet close={() => setSheet(null)} />}
        {sheet === 'copy' && <CopySampleSheet src={sample} close={() => setSheet(null)} />}
        {trips.length > 0 && <TripList trips={trips} />}
      </div>
    </div>
  );
}

/** Opens a trip saved as a file (model/tripFile.ts), such as the Japan sheet made into one. */
function OpenTripFile({ trips }: { trips: Trip[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const open = async (f: File | undefined) => {
    if (!f) return;
    setMsg('');
    try {
      const t = readTripFile(await f.text());
      if (trips.some(x => x.id === t.id) && !confirm(`Update "${t.name}" from this file? Ticks, notes and the wallet stay; the plan comes from the file.`)) return;
      importTrip(t);
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    finally { if (input.current) input.current.value = ''; }
  };
  return (
    <>
      <button className="gobtn ghost" style={{ width: '100%' }} onClick={() => input.current?.click()}>Open a trip file</button>
      <input ref={input} type="file" accept=".json,application/json" hidden aria-label="Trip file" onChange={e => void open(e.target.files?.[0])} />
      {msg && <p className="fhint warn" role="alert">{msg}</p>}
    </>
  );
}

/* ---------- the open trip ---------- */

const ICONS: Record<string, { label: string; icon: React.ReactNode }> = {
  now: { label: 'Right now', icon: <path d="M13.5 2.5 5 13.5h6.2l-1 8 8.8-11.2h-6.3z" /> },
  today: { label: 'Today', icon: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" /></> },
  essentials: { label: 'Essentials', icon: <><circle cx="8" cy="12" r="4.2" /><path d="M12.2 12H21M17.5 12v3.4M20.5 12v2.4" /></> },
  days: { label: 'Days', icon: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></> },
  map: { label: 'Map', icon: <><path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.4" /></> },
  photos: { label: 'Photos', icon: <><rect x="3" y="6" width="18" height="14" rx="3" /><circle cx="12" cy="13" r="3.6" /><path d="M8.5 6l1.4-2.2h4.2L15.5 6" /></> },
  shop: { label: 'Shopping', icon: <><path d="M5 8h14l-1.2 12.5H6.2z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></> },
  notes: { label: 'Notes', icon: <><path d="M6 3.5h9l3.5 3.5v13.5H6z" /><path d="M9 11h6M9 14.5h6M9 18h3.5" /></> },
  places: { label: 'Places', icon: <path d="M12 3.6l2.6 5.2 5.8.9-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.9z" /> },
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
    /* one city at a time: the one you're in, else the first (lists of every city were too much) */
    dest: (now.cur?.destinationId && !now.cur.travel ? now.cur.destinationId : (now.cur || trip.days[0])?.destinationId) || trip.destinations[0]?.id || 'all',
    veg: pref('veg', false), hide: {}, sim: { day: '', min: 840 }, pcat: pref<string[]>('fav-phrases', []).length ? '★ Favourites' : 'All', pq: '', q: '',
    ...fromHash(ids),
  }));
  const set = useCallback((p: Partial<UI>) => {
    if ('veg' in p) setPref('veg', p.veg);
    setUi(u => ({ ...u, ...p }));
  }, []);
  /* a new day, or a tab opened by a tap or a link, starts at the top of its page */
  const toTop = useRef<Tab | null>(null);
  const go = useCallback((tab: Tab, day?: string) => {
    setUi(u => { if (u.tab !== tab || (day && day !== u.day)) toTop.current = tab; return { ...u, tab, day: day || u.day, q: '' }; });
  }, []);
  const [editing, edit] = useState<Edit | null>(null);
  const [adding, setAdding] = useState(false);
  const photoPick = useRef<HTMLInputElement>(null);
  const walletSeg = useWalletSeg();
  const addKind = ui.tab === 'wallet' ? (walletSeg === 'docs' ? 'doc' : 'expense') : addOn(ui.tab);
  const signedIn = useSync().session;
  const close = useCallback(() => edit(null), []);
  /* Today needs it during the trip, and for "Something nearby" at any time */
  /* while you share where you are with the group, location stays on as you move between pages */
  const sharingUntil = useSharingUntil(trip.id);
  const geoWanted = ui.tab === 'map' || ui.tab === 'today' || !!sharingUntil;
  const geo = useGeo(geoWanted);
  useEffect(() => { if (sharingUntil && !geo.on && !geo.bad) geo.toggle(); }, [sharingUntil, geo]);
  useEffect(() => { if (sharingUntil && geo.pos) void sendSpot(trip.id, geo.pos, sharingUntil); }, [sharingUntil, geo.pos, trip.id]);

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

  /* the thing that matters right now, if anything: checked every half minute during the trip */
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setTick(x => x + 1), 30_000); return () => clearInterval(t); }, []);
  const rn = useMemo(() => {
    if (!now.cur) return { m: null, next: null };
    const c = liveCtx(ix, now.cur, geo.pos), m = rightNow(ix, c);
    return { m, next: m ? after(ix, c, m) : null };
  }, [ix, now.cur, geo.pos, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  /* it opens by itself once for each thing; when the thing is over, back to Today */
  useEffect(() => {
    const id = rn.m?.id;
    if (!id) { if (tabNow.current === 'now') go('today'); return; }
    /* the sample opens on Today; its Right now tab is there to try */
    if (trip.sample) return;
    const seen = pref<string[]>('rightnow-seen', []);
    if (!seen.includes(id)) { setPref('rightnow-seen', [...seen.slice(-50), id]); go('now'); }
  }, [rn.m?.id, go]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = ui.q.trim(), searching = q.length > 1;
  const waiting = useWaitingForMe(trip.id);
  const PAGES = { today: Today, days: Days, essentials: Essentials, photos: PhotosPage, notes: MyNotes, places: Places, map: MapView, phrases: Phrases, wallet: Wallet, trip: TripHub, prep: Prep };
  /* ---------- one long sheet: every page side by side, sliding with your finger ----------
     The pager scrolls sideways (the phone's own scrolling, so it tracks the finger and coasts);
     each page scrolls up and down by itself. The bottom bar and the pager move together: drag
     either and the other follows. Wherever the pager comes to rest is the open tab. */
  const tabNow = useRef(ui.tab); tabNow.current = ui.tab;
  /* "Right now" is a page only while something is happening; its tab sits left of Today */
  const order = useMemo<readonly Tab[]>(() => (rn.m ? ['now', ...MAIN_TABS] : [...MAIN_TABS]), [!!rn.m]); // eslint-disable-line react-hooks/exhaustive-deps
  const pager = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const TAB_W = 68;
  useDock(bar, '.tab', { radius: 110, small: 0.82, big: 1.2 });
  const pullLabel = useRef<HTMLDivElement>(null);
  usePullToRefresh(pager, pullLabel, trip.id);
  /* the open page first, the rest just after, so none is blank when slid past */
  const [all, setAll] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setAll(true), 350); return () => clearTimeout(t); }, []);
  const barDragging = useRef(false), tapping = useRef(false), settledBy = useRef<'pager' | null>(null);
  /* a label above the bar, clear of the thumb, naming the page you will land on while things move */
  const peek = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const pg = pager.current, row = bar.current; if (!pg || !row) return;
    let frame = 0, rest = 0, barRest = 0, peekOff = 0;
    const width = () => pg.clientWidth || 1;
    /* pager moves: the bar follows, and when it stops, that page is the open tab */
    const onPager = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        if (!barDragging.current) row.scrollLeft = (pg.scrollLeft / width()) * TAB_W;
        const t = order[Math.min(order.length - 1, Math.max(0, Math.round(pg.scrollLeft / width())))];
        const el = peek.current, src = row.querySelector<HTMLElement>(`.tab[data-tab="${t}"]`);
        if (el && src && el.dataset.tab !== t) { el.dataset.tab = t; el.innerHTML = src.querySelector('svg')!.outerHTML + `<span>${ICONS[t as keyof typeof ICONS].label}</span>`; }
        /* light up the tab for the page in view straight away, not once the sheet has stopped */
        row.querySelectorAll<HTMLElement>('.tab').forEach(b => { if (b.dataset.tab === t) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
        el?.classList.add('on');
        /* depth: a page shrinks and dims a little as it slides away from the middle */
        const w = width();
        pg.querySelectorAll<HTMLElement>('.pane').forEach((page, i) => {
          const off = Math.min(1, Math.abs(i * w - pg.scrollLeft) / w), inner = page.firstElementChild as HTMLElement;
          /* set only while off-centre: a transform on a page would trap its full-screen pop-ups */
          if (off > 0.002) { inner.style.transform = `scale(${(1 - off * 0.06).toFixed(4)})`; inner.style.opacity = (1 - off * 0.45).toFixed(3); }
          else { inner.style.transform = ''; inner.style.opacity = ''; }
        });
      });
      clearTimeout(rest); clearTimeout(peekOff);
      peekOff = window.setTimeout(() => peek.current?.classList.remove('on'), 350);
      rest = window.setTimeout(() => {
        /* after a tap the bar is in charge until it stops: a pause on the way is not a choice */
        if (tapping.current) return;
        const t = order[Math.round(pg.scrollLeft / width())] as Tab | undefined;
        if (t && t !== tabNow.current) {
          settledBy.current = 'pager';
          /* redraw in the background, so landing does not stutter */
          startTransition(() => setUi(u => ({ ...u, tab: t, q: '' })));
        }
      }, 120);
    };
    /* bar dragged: the pager follows it */
    const barStart = () => { barDragging.current = true; tapping.current = false; clearTimeout(barRest); };
    const barEnd = () => { clearTimeout(barRest); barRest = window.setTimeout(() => { barDragging.current = false; tapping.current = false; }, 400); };
    /* Moving by the bar sweeps the pages past quickly, which felt harsh: blur them in proportion
       to how fast they go, and clear it as they settle. A finger swipe gets none (it tracks the finger). */
    let lastX = pg.scrollLeft, blurOff = 0;
    const blur = (px: number) => { pg.style.setProperty('--mb', px.toFixed(1) + 'px'); pg.classList.toggle('blurring', px > 0.3); };
    const onBar = () => {
      if (!barDragging.current) return;
      pg.scrollLeft = (row.scrollLeft / TAB_W) * width();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        blur(Math.min(7, Math.abs(pg.scrollLeft - lastX) / 14));
        clearTimeout(blurOff); blurOff = window.setTimeout(() => blur(0), 90);
      }
      lastX = pg.scrollLeft;
      clearTimeout(barRest); barRest = window.setTimeout(() => { barDragging.current = false; tapping.current = false; }, 400);
    };
    pg.addEventListener('scroll', onPager, { passive: true });
    row.addEventListener('touchstart', barStart, { passive: true });
    row.addEventListener('touchend', barEnd, { passive: true });
    row.addEventListener('wheel', barStart, { passive: true });
    row.addEventListener('scroll', onBar, { passive: true });
    return () => {
      pg.removeEventListener('scroll', onPager); row.removeEventListener('touchstart', barStart);
      row.removeEventListener('touchend', barEnd); row.removeEventListener('wheel', barStart); row.removeEventListener('scroll', onBar);
      cancelAnimationFrame(frame); clearTimeout(rest); clearTimeout(barRest); clearTimeout(peekOff); clearTimeout(blurOff);
    };
  }, [order]);
  /* A tapped tab works like a day on the Days slider: the bar slides it to the middle and the
     pages follow the bar, landing on that page when it stops. (Moving the page and having the
     bar follow left the bar behind on the iPhone.) */
  const tapTab = (t: Tab, el: HTMLElement) => {
    const row = bar.current;
    if (!row || Math.abs(offCentre(row, el)) < 4 || matchMedia('(prefers-reduced-motion: reduce)').matches) return go(t);
    barDragging.current = true; tapping.current = true;
    window.setTimeout(() => { tapping.current = false; }, 1500); // in case the bar never moves
    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    /* the tab opens now (so it lights up straight away); the bar, not the pager, does the moving */
    settledBy.current = 'pager';
    go(t);
  };
  /* a tab opened any other way (a link, a button on a page): glide the pager there */
  const pagerReady = useRef(false);
  useEffect(() => {
    const pg = pager.current; if (!pg) return;
    const page = pg.querySelector<HTMLElement>(`.pane[data-tab="${ui.tab}"]`);
    if (toTop.current === ui.tab && page) { page.scrollTop = 0; toTop.current = null; }
    if (settledBy.current === 'pager') { settledBy.current = null; return; }
    const left = order.indexOf(ui.tab) * pg.clientWidth;
    /* A tap is not a drag of the bar: let the bar follow the pager, so the tapped tab slides to
       the middle and stays there (it used to stay put, and the next scroll jumped back). */
    barDragging.current = false;
    if (Math.abs(pg.scrollLeft - left) > 2) {
      if (!pagerReady.current || matchMedia('(prefers-reduced-motion: reduce)').matches) pg.scrollLeft = left;
      else glide(pg, bar.current, left);
    }
    pagerReady.current = true;
  }, [ui.tab, ui.day, order]);

  return (
    <AppCtx.Provider value={{ ix, now, ui, set, go, geo, me, edit }}>
      <div className="pager" ref={pager}>
        {order.map(t => {
          const Page = t === 'now' ? null : PAGES[t];
          return (
            <section key={t} className="pane" data-tab={t} aria-hidden={t !== ui.tab}>
              <div className="wrap" id={t === ui.tab ? 'view' : undefined}>
                {(all || t === ui.tab) && <>
                  <AccountButton trip={trip} />
                  {Page ? <Page /> : <RightNow moment={rn.m} next={rn.next} />}
                  {t === 'trip' && (searching ? <Search q={q} /> : <Footer trip={trip} />)}
                </>}
              </div>
            </section>
          );
        })}
      </div>
      <div className="sheets">
        {JAPAN && editing && <SheetOnly close={close} toNotes={() => go('prep')} />}
        {!JAPAN && editing?.kind === 'trip' && <TripSettings trip={trip} close={close} />}
        {!JAPAN && editing?.kind === 'plan' && <PlanItemEditor trip={trip} dayId={editing.dayId} id={editing.id} close={close} />}
        {!JAPAN && editing?.kind === 'day' && <DayEditor trip={trip} id={editing.id} close={close} onDayChange={id => go('days', id)} />}
        {!JAPAN && editing?.kind === 'leg' && <LegEditor trip={trip} id={editing.id} dayId={editing.dayId} close={close} />}
        {!JAPAN && editing?.kind === 'place' && <PlaceEditor trip={trip} id={editing.id} as={editing.as} dayId={editing.dayId} destinationId={editing.destinationId} close={close} />}
        {!JAPAN && editing?.kind === 'todo' && <TodoEditor trip={trip} id={editing.id} group={editing.group} close={close} />}
        {!JAPAN && editing?.kind === 'doc' && <DocEditor trip={trip} id={editing.id} forRef={editing.for} close={close} />}
        {!JAPAN && editing?.kind === 'expense' && <ExpenseEditor trip={trip} id={editing.id} close={close} />}
      </div>
      {/* the main way in: on every page but Right now, out of the way of any open editor */}
      {/* Add fits the page: photos on Photos, an expense on Wallet, otherwise the box, worded for the page */}
      {!JAPAN && !editing && !adding && addKind && <AddButton kind={addKind} onOpen={() => {
        const k = addKind;
        if (k === 'expense') edit({ kind: 'expense' });
        else if (k === 'doc') edit({ kind: 'doc' });
        else if (k === 'photos') {
          if (!getState().sync[trip.id] || trip.sample) { if (!trip.sample) edit({ kind: 'trip' }); return; }
          photoPick.current?.click();
        } else if (!canFile(trip.id, !!signedIn) && (k === 'place' || k === 'travel' || k === 'todo')) {
          /* nothing to file it with here (not shared, or signed out): the page's own form instead of a note */
          edit(k === 'place' ? { kind: 'place', as: 'food', ...(ui.dest !== 'all' ? { destinationId: ui.dest } : {}) } : k === 'travel' ? { kind: 'leg' } : { kind: 'todo', group: trip.todoGroups[0] });
        } else setAdding(true);
      }} />}
      <input ref={photoPick} className="photopick" type="file" accept="image/*" multiple hidden onChange={e => {
        const f = [...(e.target.files || [])]; e.target.value = '';
        if (f.length) void addPhotos(trip, f, now.cur?.id);
      }} />
      {adding && <AddAnything kind={(addOn(ui.tab) as AddKind) || 'any'} close={() => setAdding(false)} />}
      {!JAPAN && <ShareNotice />}
      {!JAPAN && <RemindNotice />}
      <div className="statusbg" aria-hidden="true" />
      <div className="ptr" ref={pullLabel} role="status" aria-live="polite" />
      <div className="tabpeek" ref={peek} aria-hidden="true" />
      {/* on wide screens (iPad, a computer) the sections sit in a sidebar instead of the bottom bar;
          the CSS decides which one shows */}
      <nav className="side" aria-label="Sections">
        <div className="side-brand"><img src="favicon.svg" alt="" />{trip.name}</div>
        {order.map(t => (
          <button key={t} className={'sidetab' + (t === 'now' ? ' tab-now' : '')} aria-current={ui.tab === t ? 'page' : undefined} onClick={() => go(t)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[t].icon}</svg><span>{ICONS[t].label}</span>
            {t === 'prep' && waiting > 0 && <span className="tabn" aria-label={`${waiting} waiting for your OK`}>{waiting}</span>}
          </button>
        ))}
      </nav>
      <nav className="tabs" aria-label="Sections">
        <div className="tabs-in" ref={bar}>
          {order.map(t => (
            <button key={t} data-tab={t} className={'tab' + (t === 'now' ? ' tab-now' : '')} aria-current={ui.tab === t ? 'page' : undefined} onClick={e => tapTab(t, e.currentTarget)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[t].icon}</svg>{ICONS[t].label}
              {t === 'prep' && waiting > 0 && <span className="tabn" aria-label={`${waiting} waiting for your OK`}>{waiting}</span>}
            </button>
          ))}
        </div>
      </nav>
    </AppCtx.Provider>
  );
}

function Footer({ trip }: { trip: Trip }) {
  return (
    <div className="foot">
      <SyncLine trip={trip} />
      <p>
        {trip.sample ? 'This is the sample trip. Ticks and notes are saved on this phone only. ' : 'Saved on this phone. '}
        {trip.sample && <button className="linkbtn" onClick={resetSample}>Start the sample over</button>}
      </p>
    </div>
  );
}
