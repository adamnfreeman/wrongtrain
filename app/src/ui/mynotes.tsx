/* The Notes tab, the last one: your own notes for the trip, kept on this phone only (group notes
   are on the To do tab), and below them comments about the app for Adam (sync/feedback.ts). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { pref, setPref } from '../model/store';
import { useSync } from '../sync/engine';
import { localNotes, keepNotes, pullNotes, pushNotes } from '../sync/mynotes';
import { myFeedback, sendFeedback, type Feedback, type FeedbackKind } from '../sync/feedback';
import { Fold, SecH } from './bits';
import { useApp } from './ctx';
import { stamp } from '../model/time';
import { JAPAN } from '../edition';

const sample = (t: { sample?: boolean }) => !!t.sample;

export function MyNotes() {
  const t = useApp().ix.trip;
  const { session } = useSync();
  const [text, setText] = useState(() => localNotes(t.id));
  const typed = useRef(false);
  /* the account's copy, if it's newer: on opening, signing in, coming back to the app, pulling down */
  useEffect(() => {
    setText(localNotes(t.id)); typed.current = false;
    if (sample(t)) return;
    const pull = () => { if (!document.hidden) void pullNotes(t.id).then(x => { if (x != null) { typed.current = false; setText(x); } }); };
    pull();
    document.addEventListener('visibilitychange', pull);
    window.addEventListener('wt-refresh', pull);
    return () => { document.removeEventListener('visibilitychange', pull); window.removeEventListener('wt-refresh', pull); };
  }, [t.id, !!session]); // eslint-disable-line react-hooks/exhaustive-deps
  /* what you type: on the phone at once, to the account a moment after you stop */
  useEffect(() => {
    if (!typed.current) return;
    const h = window.setTimeout(() => keepNotes(t.id, text), 300);
    const up = window.setTimeout(() => { if (!sample(t)) void pushNotes(t.id); }, 1500);
    return () => { clearTimeout(h); clearTimeout(up); };
  }, [t.id, text]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <h1 className="page-h">Notes</h1>
      <p className="note" style={{ marginTop: 0 }}>Just for you{session ? ', on all your devices' : ', on this phone'}.</p>
      <textarea className="mynotes" value={text} onChange={e => { typed.current = true; setText(e.target.value); }} placeholder="Start typing…" aria-label="Your notes" />
      {!JAPAN && <AppComments />}
    </>
  );
}

const KINDS: { k: FeedbackKind; label: string }[] = [{ k: 'broken', label: "Something's broken" }, { k: 'idea', label: 'An idea' }, { k: 'change', label: 'Change this' }];

/** Comments about the app, for Adam: what doesn't work, what you'd like, what should change. */
function AppComments() {
  const { session } = useSync();
  const [kind, setKind] = useState<FeedbackKind>('broken');
  const [draft, setDraft] = useState('');
  /* a screenshot of the problem: from Photos, or a file */
  const [shot, setShot] = useState<File | null>(null);
  const shotUrl = useMemo(() => (shot ? URL.createObjectURL(shot) : ''), [shot]);
  useEffect(() => () => { if (shotUrl) URL.revokeObjectURL(shotUrl); }, [shotUrl]);
  const pick = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [sent, setSent] = useState<Feedback[]>([]);
  useEffect(() => { if (session) void myFeedback().then(setSent).catch(() => {}); }, [session]);
  /* ticked-off comments, on this phone only: they leave the list for a folded Done section */
  const [done, setDone] = useState<string[]>(() => pref('feedback-done', [] as string[]));
  const tick = (id: string) => { const next = done.includes(id) ? done.filter(x => x !== id) : [...done, id]; setDone(next); setPref('feedback-done', next); };
  const open = sent.filter(f => !done.includes(f.id)), closed = sent.filter(f => done.includes(f.id));
  const item = (f: Feedback) => {
    const d = done.includes(f.id);
    return (
      <li key={f.id} className={'todo' + (d ? ' done' : '')}>
        <button className="box" role="checkbox" aria-checked={d} aria-label={(d ? 'Reopen: ' : 'Done: ') + f.text} onClick={() => tick(f.id)}>{d ? '✓' : ''}</button>
        <div><div className="kick">{KINDS.find(x => x.k === f.kind)?.label} · {stamp(f.created_at)}</div><p className="item-d">{f.text}</p>{f.image && <p className="note" style={{ margin: 0 }}>With a screenshot</p>}</div>
      </li>
    );
  };
  const send = async () => {
    setBusy(true);
    try { await sendFeedback(kind, draft, shot); setDraft(''); setShot(null); setMsg({ text: 'Sent. Thank you!', bad: false }); setSent(await myFeedback()); }
    catch (e) { setMsg({ text: (e as Error).message, bad: true }); }
    setBusy(false);
  };
  return (
    <section className="sec" style={{ marginTop: 28 }}>
      <SecH title="Comments about the app" />
      <p className="note" style={{ marginTop: 0 }}>For Adam: what doesn't work, what you'd like to see, what should change. The build number goes with it.</p>
      {!session ? <p className="note">Sign in (the round button at the top) to send comments.</p> : <>
        <div className="chips" role="group" aria-label="What kind">
          {KINDS.map(x => <button key={x.k} type="button" className="chipbtn" aria-pressed={kind === x.k} onClick={() => setKind(x.k)}>{x.label}</button>)}
        </div>
        <textarea className="search notebox" rows={4} maxLength={2000} value={draft} onChange={e => setDraft(e.target.value)}
          placeholder={kind === 'broken' ? 'What happened, and what were you doing?' : kind === 'idea' ? 'What would make WrongTrain better?' : 'What should be different?'} aria-label="Your comment" />
        {shotUrl && (
          <div className="fb-shot">
            <img src={shotUrl} alt="Your screenshot" />
            <button type="button" className="linkbtn" onClick={() => setShot(null)}>Remove</button>
          </div>
        )}
        <input ref={pick} type="file" accept="image/*" hidden onChange={e => { setShot(e.target.files?.[0] || null); e.target.value = ''; }} />
        {/* Send on the left, a camera button for a screenshot on the right (Adam, Oct 26) */}
        <div className="fb-row">
          <button type="button" className="chipbtn go" disabled={!draft.trim() || busy} onClick={() => void send()}>{busy ? 'Sending…' : 'Send to Adam'}</button>
          <button type="button" className="cambtn fb-cam" onClick={() => pick.current?.click()} aria-label={shot ? 'Change the screenshot' : 'Add a screenshot'}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10.5H4z" /><circle cx="12" cy="13.5" r="3.4" /></svg>
          </button>
        </div>
        {msg && <p className={'geomsg' + (msg.bad ? ' bad' : '')} role="status">{msg.text}</p>}
        {sent.length > 0 && <>
          <h3 className="sub-h">What you've sent</h3>
          {open.length > 0 ? <ul className="sheet">{open.map(item)}</ul> : <p className="note">All done.</p>}
          {closed.length > 0 && <Fold title="Done" count={closed.length}><ul className="sheet">{closed.map(item)}</ul></Fold>}
        </>}
      </>}
    </section>
  );
}
