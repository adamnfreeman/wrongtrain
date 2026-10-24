/* Tapping a place on Places: what it is, and "Add to itinerary" with the days it would fit best
   (model/fit.ts), each with a time that fits. One tap adds it; Undo takes it straight off again. */
import { useState } from 'react';
import type { Place } from '../model/types';
import { deletePlanItem, savePlanItem } from '../model/edit';
import { patchTrip } from '../model/store';
import { cityOf, mapsLink, newId } from '../model/trip';
import { fmtHM, longDate } from '../model/time';
import { fitOn, fitPlace, type Fit } from '../model/fit';
import { Field, Sheet } from './form';
import { Rich, Txt } from './bits';
import { useApp } from './ctx';

export function PlaceSheet({ p, close }: { p: Place; close: () => void }) {
  const { ix, edit } = useApp();
  const t = ix.trip;
  const [added, setAdded] = useState<{ fit: Fit; id: string } | null>(null);
  const [other, setOther] = useState('');
  const best = fitPlace(t, p);
  const hours = p.hours === '24h' ? 'Open 24 hours' : p.hours ? `${fmtHM(p.hours.open)}–${fmtHM(p.hours.close)}` : '';
  const when = (f: Fit) => `${longDate(f.day.date)}${f.time ? ` · ${fmtHM(f.time)}` : ''}`;
  const add = (f: Fit) => {
    const id = newId('i');
    patchTrip(t.id, x => savePlanItem(x, '', { id, text: p.name, placeId: p.id, time: f.time, end: f.end }, f.day.id));
    setAdded({ fit: f, id });
  };
  const pick = other ? t.days.find(d => d.id === other) : undefined;
  return (
    <Sheet title={p.name} onCancel={close} cancelLabel="Close">
      <Txt text={p.notes} className="item-d" />
      <div className="meta">
        {p.area && <span>{p.area}</span>}
        {hours && <span><Rich text={hours} /></span>}
        {!p.closed && <a href={mapsLink(ix, p)} target="_blank" rel="noopener noreferrer">Find in Maps</a>}
        <button className="linkbtn" onClick={() => { close(); edit({ kind: 'place', id: p.id }); }}>Edit</button>
      </div>
      <h3 className="sub-h">Add to itinerary</h3>
      {added ? (
        <div className="fitdone" role="status">
          <p>Added to <b>{when(added.fit)}</b>.</p>
          <div className="chips">
            <button className="chipbtn" onClick={() => { patchTrip(t.id, x => deletePlanItem(x, added.fit.day.id, added.id)); setAdded(null); }}>Undo</button>
            <button className="chipbtn plain" aria-pressed="true" onClick={close}>Done</button>
          </div>
        </div>
      ) : p.closed ? <p className="fhint">It's marked closed.</p> : (
        <>
          {best.length ? (
            <ul className="fits">{best.map(f => (
              <li key={f.day.id}>
                <button className="fitbtn" onClick={() => add(f)}>
                  <b>{when(f)}</b><span>{cityOf(ix, f.day)} · {f.why}</span><i aria-hidden="true">+</i>
                </button>
              </li>
            ))}</ul>
          ) : <p className="fhint">No day left that it fits: it's already on the plan, closed those days, or the trip is over.</p>}
          <Field label="Or pick a day">
            <select className="input" value={other} onChange={e => setOther(e.target.value)}>
              <option value="">Choose…</option>
              {t.days.map(d => <option key={d.id} value={d.id}>{longDate(d.date)} · {cityOf(ix, d)}</option>)}
            </select>
          </Field>
          {pick && <button className="fitbtn" onClick={() => add(fitOn(p, pick))}><b>{when(fitOn(p, pick))}</b><span>{fitOn(p, pick).why}</span><i aria-hidden="true">+</i></button>}
        </>
      )}
    </Sheet>
  );
}
