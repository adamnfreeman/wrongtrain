/* The Notes tab, the last one: your own notes for the trip, kept on this phone only (group notes
   are on the To do tab), and below them comments about the app for Adam (sync/feedback.ts). */
import { useEffect, useState } from 'react';
import { pref, setPref } from '../model/store';
import { useSync } from '../sync/engine';
import { myFeedback, sendFeedback, type Feedback, type FeedbackKind } from '../sync/feedback';
import { Fold, SecH } from './bits';
import { useApp } from './ctx';
import { stamp } from '../model/time';
import { JAPAN } from '../edition';

export function MyNotes() {
  const t = useApp().ix.trip;
  const key = 'mynotes-' + t.id;
  const [text, setText] = useState(() => pref(key, ''));
  useEffect(() => { setText(pref(key, '')); }, [key]);
  useEffect(() => { const h = window.setTimeout(() => setPref(key, text), 300); return () => clearTimeout(h); }, [key, text]);
  return (
    <>
      <h1 className="page-h">Notes</h1>
      <p className="note" style={{ marginTop: 0 }}>Just for you, on this phone. Anything you want to remember on this trip.</p>
      <textarea className="mynotes" value={text} onChange={e => setText(e.target.value)} placeholder="Start typing…" aria-label="Your notes" />
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
        <div><div className="kick">{KINDS.find(x => x.k === f.kind)?.label} · {stamp(f.created_at)}</div><p className="item-d">{f.text}</p></div>
      </li>
    );
  };
  const send = async () => {
    try { await sendFeedback(kind, draft); setDraft(''); setMsg({ text: 'Sent. Thank you!', bad: false }); setSent(await myFeedback()); }
    catch (e) { setMsg({ text: (e as Error).message, bad: true }); }
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
        <div className="chips"><button type="button" className="chipbtn go" disabled={!draft.trim()} onClick={() => void send()}>Send to Adam</button></div>
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
