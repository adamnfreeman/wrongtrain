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

/* What Add means on each page: the box's title, a line saying what fits here, and examples. It all
   goes through the same filing, so something added on one page still lands everywhere it belongs
   (a dinner added on Places also goes on its day). */
export type AddKind = 'plan' | 'place' | 'travel' | 'todo' | 'any';
const KINDS: Record<AddKind, { title: string; hint: string; examples: string[] }> = {
  plan: { title: 'Add to the plan', hint: 'Something to do, a booking or a time. Say which day if you know it.',
    examples: ['dinner at Ichiran on day 3 at 8', 'teamLab Planets, tickets booked for 5 PM on Nov 2', 'free afternoon on day 4'] },
  place: { title: 'Add a place', hint: 'Somewhere to eat, see, shop or stay. Add a day if it has one.',
    examples: ['muji, donqui and uniqlo', 'the ramen place near the hotel', 'Fushimi Inari early on day 2'] },
  travel: { title: 'Add travel', hint: 'A flight, train, bus or transfer, with times and numbers if you have them.',
    examples: ['our flight home is JL 4 at 7:45 PM on the last day', 'shinkansen Kyoto to Tokyo on Nov 3, 10:12, car 7', 'airport bus to the hotel, 40 minutes'] },
  todo: { title: 'Add a to-do', hint: 'Something to book, buy or sort out, before or during the trip.',
    examples: ['buy a Suica card before we go', 'book the ryokan dinner', 'everyone: download the offline map'] },
  any: { title: 'Add anything', hint: 'A place, a booking, a time, a to-do, a change of plan.',
    examples: ['muji, donqui and uniqlo', 'our flight home is JL 4 at 7:45 PM on the last day', 'buy a Suica card before we go'] },
};
/** What the Add button does on each page; null where it has nothing to add (Phrases, Right now). */
export function addOn(tab: string): AddKind | 'photos' | 'expense' | null {
  return ({ today: 'plan', days: 'plan', map: 'place', places: 'place', transit: 'travel', prep: 'todo', trip: 'any', photos: 'photos', wallet: 'expense' } as const)[tab as 'today'] ?? null;
}

const LABEL: Record<string, string> = { photos: 'Add photos', expense: 'Add expense', plan: 'Add', place: 'Add place', travel: 'Add travel', todo: 'Add to-do', any: 'Add' };

export function AddButton({ kind, onOpen }: { kind: string; onOpen: () => void }) {
  return (
    <button className="addfab" onClick={onOpen} aria-label={LABEL[kind] || 'Add'}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      <span>{LABEL[kind] || 'Add'}</span>
    </button>
  );
}

export function AddAnything({ close, kind = 'any' }: { close: () => void; kind?: AddKind }) {
  const K = KINDS[kind];
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
    <Sheet title={K.title} onCancel={close} cancelLabel="Done">
      <p className="fhint" style={{ marginTop: 0, marginBottom: 12 }}>
        {K.hint} Say it however it comes out and WrongTrain puts it where it belongs, for everyone on the trip.
      </p>
      <textarea className="search notebox addbox" rows={4} maxLength={600} value={draft} autoFocus
        onChange={e => setDraft(e.target.value)} aria-label="What to add"
        placeholder={`For example: ${K.examples[0]}`} />
      <div className="chips">
        <button type="button" className="chipbtn go" onClick={add} disabled={!draft.trim()}>{claude ? 'Add it to the trip' : 'Add it'}</button>
      </div>
      {!draft && !sent.length && (
        <div className="chips addeg" role="group" aria-label="Examples">
          {K.examples.map(e => <button key={e} type="button" className="chipbtn" onClick={() => setDraft(e)}>{e}</button>)}
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
