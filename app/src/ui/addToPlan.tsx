/* "Add to itinerary" on a place's details card: the days it would fit best (model/fit.ts), each
   with a time that fits. One tap adds it; Undo takes it straight off again. */
import { useState } from 'react';
import type { Place } from '../model/types';
import { deletePlanItem, savePlanItem } from '../model/edit';
import { patchTrip } from '../model/store';
import { cityOf, newId } from '../model/trip';
import { fmtHM, longDate } from '../model/time';
import { fitOn, fitPlace, type Fit } from '../model/fit';
import { Field } from './form';
import { useApp } from './ctx';

export function AddToItinerary({ p, close }: { p: Place; close: () => void }) {
  const { ix } = useApp();
  const t = ix.trip;
  const [added, setAdded] = useState<{ fit: Fit; id: string } | null>(null);
  const [other, setOther] = useState('');
  const best = fitPlace(t, p);
  const when = (f: Fit) => `${longDate(f.day.date)}${f.time ? ` · ${fmtHM(f.time)}` : ''}`;
  const add = (f: Fit) => {
    const id = newId('i');
    patchTrip(t.id, x => savePlanItem(x, '', { id, text: p.name, placeId: p.id, time: f.time, end: f.end }, f.day.id));
    setAdded({ fit: f, id });
  };
  const pick = other ? t.days.find(d => d.id === other) : undefined;
  const picked = pick && fitOn(p, pick);
  return (
    <section className="dc-sec" id="addplan">
      <h3 className="sub-h">Add to itinerary</h3>
      {added ? (
        <div className="fitdone" role="status">
          <p>Added to <b>{when(added.fit)}</b>.</p>
          <div className="chips">
            <button className="chipbtn" onClick={() => { patchTrip(t.id, x => deletePlanItem(x, added.fit.day.id, added.id)); setAdded(null); }}>Undo</button>
            <button className="chipbtn plain" aria-pressed="true" onClick={close}>Done</button>
          </div>
        </div>
      ) : (
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
          {picked && <button className="fitbtn" onClick={() => add(picked)}><b>{when(picked)}</b><span>{picked.why}</span><i aria-hidden="true">+</i></button>}
        </>
      )}
    </section>
  );
}
