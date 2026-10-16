/* The Japan edition (edition.ts): sign in with the Japan page's name and passcode, then the Japan
   2026 trip straight from its Google Sheet, refreshed while the app is open. Ticks and group notes
   go back to the sheet; the plan itself is changed in the sheet (SheetOnly says so). */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Trip } from '../model/types';
import { getState, onNoteAdd, onTodoToggle, patchTrip, replaceTrip, setMe, useStore } from '../model/store';
import { forgetTick, loadTrip, noteOnSheet, rememberNote, rememberTick, saveCreds, savedCreds, SheetError, SHEET_URL, tickOnSheet, TRIP_ID, withPending, type Creds } from '../sheet/live';
import { Sheet } from './form';
import { Toast } from './requests';

const EVERY = 5 * 60_000;

export function JapanApp({ TripApp }: { TripApp: (p: { trip: Trip; me: string }) => ReactNode }) {
  const { trips, me } = useStore();
  const [creds, setCreds] = useState<Creds | null>(savedCreds);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const trip = creds ? trips.find(t => t.id === TRIP_ID) : undefined;
  const last = useRef(0);

  const signOut = useCallback((why = '') => {
    saveCreds(null); setCreds(null); setMsg(why);
  }, []);

  const refresh = useCallback(async (c: Creds, loud: boolean) => {
    last.current = Date.now();
    if (loud) setBusy(true);
    try {
      const t = await loadTrip(c);
      replaceTrip(withPending(t));
      if (loud) setMsg('');
    } catch (e) {
      const err = e instanceof SheetError ? e : new SheetError('other', String(e));
      if (err.kind === 'signin') signOut('Please sign in again.');
      else if (loud) setMsg(err.message);
    }
    if (loud) setBusy(false);
  }, [signOut]);

  /* keep the trip fresh: on opening, every few minutes, and on coming back to the app */
  useEffect(() => {
    if (!creds) return;
    void refresh(creds, !getState().trips.some(t => t.id === TRIP_ID));
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(creds, false); }, EVERY);
    const back = () => { if (!document.hidden && Date.now() - last.current > 60_000) void refresh(creds, false); };
    const out = () => signOut();
    document.addEventListener('visibilitychange', back);
    window.addEventListener('wt-japan-signout', out);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', back); window.removeEventListener('wt-japan-signout', out); };
  }, [creds, refresh, signOut]);

  /* ticks and notes go on to the sheet; if one doesn't make it, put it back and say so */
  useEffect(() => {
    if (!creds) return;
    onTodoToggle((tripId, todoId, done) => {
      const todo = getState().trips.find(t => t.id === tripId)?.todos.find(x => x.id === todoId);
      if (!todo) return;
      rememberTick(todoId, done);
      tickOnSheet(creds, todoId, todo.text, done).catch((e: unknown) => {
        forgetTick(todoId);
        patchTrip(tripId, t => ({ ...t, todos: t.todos.map(x => (x.id === todoId ? { ...x, done: !done } : x)) }));
        if (e instanceof SheetError && e.kind === 'signin') return signOut('Please sign in again.');
        alert('That tick was not saved to the sheet. Check your connection and try again.');
      });
    });
    onNoteAdd((tripId, note) => {
      rememberNote(note);
      noteOnSheet(creds, note.text).catch((e: unknown) => {
        patchTrip(tripId, t => ({ ...t, notes: t.notes.filter(n => n.id !== note.id) }));
        if (e instanceof SheetError && e.kind === 'signin') return signOut('Please sign in again.');
        alert('That note was not saved to the sheet. Check your connection and try again.');
      });
    });
    return () => { onTodoToggle(null); onNoteAdd(null); };
  }, [creds, signOut]);

  if (creds && trip) return <><TripApp key={trip.id} trip={trip} me={me} /><Toast /></>;
  return (
    <SignIn busy={busy} msg={msg} waiting={!!creds} onSignIn={async c => {
      setBusy(true); setMsg('');
      try {
        const t = await loadTrip(c);
        saveCreds(c); if (!getState().me) setMe(c.name);
        replaceTrip(t); setCreds(c);
      } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
      setBusy(false);
    }} />
  );
}

function SignIn({ busy, msg, waiting, onSignIn }: { busy: boolean; msg: string; waiting: boolean; onSignIn: (c: Creds) => void }) {
  const [name, setName] = useState(''), [code, setCode] = useState('');
  const ok = name.trim() && code.trim();
  return (
    <div className="wrap" style={{ paddingBottom: 40 }}>
      <form className="gate" onSubmit={e => { e.preventDefault(); if (ok && !busy) onSignIn({ name: name.trim(), code: code.trim() }); }}>
        <header className="board">
          <div className="board-main">
            <div className="kicker">WrongTrain</div>
            <h1>Japan 2026</h1>
            <p className="board-sub">Oct 26 – Nov 8. Kyoto, Nara, Osaka and Tokyo.</p>
          </div>
          <div className="stripe">{(['violet', 'amber', 'red', 'green'] as const).map(c => <i key={c} style={{ ['--line' as string]: `var(--l-${c})` }} />)}</div>
        </header>
        {waiting && busy ? <p className="hint">Loading the trip from the sheet…</p> : <>
          <p className="hint" style={{ marginTop: 0 }}>Use the name and passcode you were given for the Japan page.</p>
          <label className="flabel" htmlFor="jn">Name</label>
          <input id="jn" className="search" autoComplete="username" value={name} onChange={e => setName(e.target.value)} />
          <label className="flabel" htmlFor="jc" style={{ marginTop: 8 }}>Passcode</label>
          <input id="jc" className="search" type="password" autoComplete="current-password" value={code} onChange={e => setCode(e.target.value)} />
          <button className="gobtn" style={{ width: '100%', marginTop: 8 }} disabled={!ok || busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </>}
        {msg && <p className="fhint warn" role="alert">{msg}</p>}
      </form>
    </div>
  );
}

/** What an Edit button opens in the Japan edition: the plan is changed in the sheet. */
export function SheetOnly({ close, toNotes }: { close: () => void; toNotes: () => void }) {
  return (
    <Sheet title="Change it in the sheet" cancelLabel="Close" onCancel={close}>
      <p style={{ marginTop: 12 }}>This trip comes straight from the Japan 2026 Google Sheet, so the plan is changed there. Changes show up here within a few minutes.</p>
      <p className="hint">Or leave a group note saying what you want, and it gets filed for you.</p>
      <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        <button className="gobtn" onClick={() => { close(); toNotes(); }}>Leave a group note</button>
        <a className="gobtn ghost" href={SHEET_URL} target="_blank" rel="noopener" style={{ textAlign: 'center', textDecoration: 'none' }}>Open the sheet</a>
      </div>
    </Sheet>
  );
}
