/* One thing on a day's plan: who's going (faces, and an "I'm in / I'm out" button for you) and the
   editor that opens when you tap it, where you change the words, the time, the day it's on and
   who's going. Moving it, the editor suggests the days it fits best. */
import { useState } from 'react';
import type { Day, PlanItem, Trip } from '../model/types';
import { deletePlanItem, savePlanItem, setGoing, toggleGoing } from '../model/edit';
import { getState, patchTrip, useStore } from '../model/store';
import { cityOf, indexTrip } from '../model/trip';
import { longDate } from '../model/time';
import { Check, DeleteButton, Field, Sheet, Text } from './form';
import { Avatar, useAvatarFor } from './avatar';
import { SAMPLE_PEOPLE } from '../model/sample';

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function Face({ tripId, name, size = 22 }: { tripId: string; name: string; size?: number }) {
  const src = useAvatarFor(tripId, name) || SAMPLE_PEOPLE.find(p => p.name === name)?.avatar;
  return <Avatar name={name} src={src} size={size} />;
}

/** Under a plan item: who's going when it isn't everyone, and your in/out button. */
export function WhoGoing({ trip, item }: { trip: Trip; item: PlanItem }) {
  const me = useStore().me;
  const going = trip.going?.[item.id];
  const isIn = !going || going.some(n => same(n, me || ''));
  if (trip.travelers.length < 2 && !going) return null;
  return (
    <div className="going">
      {going && <span className="goface">{going.map(n => <Face key={n} tripId={trip.id} name={n} />)}<small>{going.length ? `Just ${going.join(', ')}` : 'Nobody yet'}</small></span>}
      {me && <button className={'gobtn-s' + (isIn ? ' in' : '')} aria-pressed={isIn} onClick={e => { e.stopPropagation(); patchTrip(trip.id, t => toggleGoing(t, item.id, me)); }}>
        {isIn ? "I'm in ✓" : "I'm out"}
      </button>}
    </div>
  );
}

/** The days a plan item would fit best, other than the one it's on: in the right city if it has
    a place, then the days with the least on them, keeping clear of travel days and the last day. */
export function bestDays(t: Trip, item: PlanItem, fromDay: string): Day[] {
  const place = item.placeId ? t.places.find(p => p.id === item.placeId) : undefined;
  const last = t.days[t.days.length - 1]?.id;
  const score = (d: Day) => d.plan.length + (d.travel ? 6 : 0) + (d.id === last ? 4 : 0)
    + (place?.destinationId && d.destinationId !== place.destinationId ? 10 : 0);
  return t.days.filter(d => d.id !== fromDay).sort((a, b) => score(a) - score(b)).slice(0, 3);
}

export function PlanItemEditor({ trip, dayId, id, close }: { trip: Trip; dayId: string; id: string; close: () => void }) {
  const item = trip.days.find(d => d.id === dayId)?.plan.find(p => p.id === id);
  const ix = indexTrip(trip);
  const [text, setText] = useState(item?.text || '');
  const [day, setDay] = useState(dayId);
  const [time, setTime] = useState(item?.time || '');
  const [end, setEnd] = useState(item?.end || '');
  const [fixed, setFixed] = useState(!!item?.fixed);
  const [who, setWho] = useState<string[]>(trip.going?.[id] ?? trip.travelers);
  if (!item) return null;
  const label = (d: Day) => `${longDate(d.date)} · ${cityOf(ix, d)}`;
  const best = bestDays(trip, item, dayId);
  const save = () => {
    const next: PlanItem = { ...item, text: text.trim() || item.text, time: time || undefined, end: end || undefined, fixed: fixed || undefined };
    patchTrip(trip.id, t => savePlanItem(t, dayId, next, day));
    if (getState().trips.find(t => t.id === trip.id)?.travelers.length) patchTrip(trip.id, t => setGoing(t, id, who));
    close();
  };
  return (
    <Sheet title="Plan item" onCancel={close} onSave={save}>
      <Text label="What" value={text} onChange={setText} multiline />
      <Field label="Day">
        <select className="input" value={day} onChange={e => setDay(e.target.value)}>
          {trip.days.map(d => <option key={d.id} value={d.id}>{label(d)}{d.id === dayId ? ' (now)' : ''}</option>)}
        </select>
      </Field>
      {best.length > 0 && (
        <div className="bestdays">
          <p className="fhint">Fits best on:</p>
          <div className="chips">{best.map(d => (
            <button key={d.id} type="button" className="chipbtn" aria-pressed={day === d.id} onClick={() => setDay(d.id)}>
              {label(d)}<small>{d.plan.length ? ` · ${d.plan.length} planned` : ' · free'}</small>
            </button>
          ))}</div>
        </div>
      )}
      <div className="row2e">
        <Text label="Starts" type="time" value={time} onChange={setTime} />
        <Text label="Ends" type="time" value={end} onChange={setEnd} />
      </div>
      <Check label="Booked: be on time for this" checked={fixed} onChange={setFixed} />
      {trip.travelers.length > 1 && (
        <Field label="Who's going">
          <div className="whopick">
            {trip.travelers.map(n => {
              const on = who.some(w => same(w, n));
              return (
                <button key={n} type="button" className={'face' + (on ? '' : ' waiting')} aria-pressed={on}
                  onClick={() => setWho(on ? who.filter(w => !same(w, n)) : [...who, n])}>
                  <Face tripId={trip.id} name={n} size={44} /><span>{n}</span>
                </button>
              );
            })}
          </div>
        </Field>
      )}
      <DeleteButton label="Take it off the plan" confirmText={`Take "${item.text}" off the plan?`} onDelete={() => { patchTrip(trip.id, t => deletePlanItem(t, dayId, id)); close(); }} />
    </Sheet>
  );
}
