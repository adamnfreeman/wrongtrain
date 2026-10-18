/* "Add anything": WrongTrain's main way in (VISION.md, "Just say it"). A button on every page
   opens a box where you type whatever you know (a place, a booking, a time, a to-do) and it is
   filed into the trip for everyone, the same way a group note is (sync/filing.ts). Each one is
   also kept as a group note on the To do tab, so there is a record of what was said. */
import { useState } from 'react';
import { addNote, getState } from '../model/store';
import { useSync } from '../sync/engine';
import { canFile, fileNote, useFilings } from '../sync/filing';
import { Sheet } from './form';
import { useApp } from './ctx';
import { Filed } from './views';

const EXAMPLES = [
  'muji, donqui and uniqlo',
  'our flight home is JL 4 at 7:45 PM on the last day',
  'dinner at Ichiran on day 3 at 8',
  'buy a Suica card before we go',
];

export function AddButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button className="addfab" onClick={onOpen} aria-label="Add anything to the trip">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      <span>Add</span>
    </button>
  );
}

export function AddAnything({ close }: { close: () => void }) {
  const { ix, go } = useApp();
  const t = ix.trip;
  const { session } = useSync();
  const filings = useFilings();
  const claude = canFile(t.id, !!session), shared = !!getState().sync[t.id];
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  /* why it can't be filed automatically here, so the box isn't a mystery */
  const why = claude ? '' : t.sample ? "In the sample it's kept as a note. On your own shared trips it's filed into the trip for everyone."
    : !shared ? "It's kept as a note for now. Share the trip (Trip settings, then Share with the group) and everything you add is filed into it for everyone."
    : !session ? "It's kept as a note. Sign in and it's filed into the trip." : '';
  const add = () => {
    const id = addNote(t.id, draft);
    if (!id) return setMsg('Type something first.');
    setDraft(''); setMsg('');
    setSent(s => [id, ...s]);
    if (claude) void fileNote(t.id, id);
  };
  const notes = sent.map(id => t.notes.find(n => n.id === id)).filter(Boolean) as typeof t.notes;
  return (
    <Sheet title="Add anything" onCancel={close} cancelLabel="Done">
      <p className="fhint" style={{ marginTop: 0, marginBottom: 12 }}>
        A place, a booking, a time, a to-do, a change of plan. Say it however it comes out and WrongTrain puts it where it belongs, for everyone on the trip.
      </p>
      <textarea className="search notebox addbox" rows={4} maxLength={600} value={draft} autoFocus
        onChange={e => setDraft(e.target.value)} aria-label="What to add"
        placeholder={`For example: ${EXAMPLES[1]}`} />
      <div className="chips">
        <button type="button" className="chipbtn go" onClick={add} disabled={!draft.trim()}>{claude ? 'Add it to the trip' : 'Add it'}</button>
      </div>
      {!draft && !sent.length && (
        <div className="chips addeg" role="group" aria-label="Examples">
          {EXAMPLES.map(e => <button key={e} type="button" className="chipbtn" onClick={() => setDraft(e)}>{e}</button>)}
        </div>
      )}
      {msg && <p className="geomsg bad" role="alert">{msg}</p>}
      {why && <p className="fhint">{why}</p>}
      {notes.length > 0 && (
        <ul className="sheet addlog">
          {notes.map(n => (
            <li key={n.id}>
              <p className="item-d"><b>{n.text}</b></p>
              {filings[n.id] ? <Filed tripId={t.id} noteId={n.id} f={filings[n.id]} /> : <p className="filed">{n.filed || 'Kept as a note on the To do tab.'}</p>}
            </li>
          ))}
        </ul>
      )}
      {notes.length > 0 && <p className="fhint"><button className="linkbtn" onClick={() => { close(); go('prep'); }}>See everything that's been added</button></p>}
    </Sheet>
  );
}
