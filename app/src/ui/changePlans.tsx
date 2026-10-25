/* "Change of plans?" on Today, during the trip (to-do 81): the plan says shopping across town but
   everyone wants something chill by the hotel. Pick what to skip from what's left today, pick a
   mood and where (near you or near tonight's hotel), and one tap swaps a nearby place in for now,
   with Undo. Places come from Something nearby (sync/nearby.ts). */
import { useState } from 'react';
import type { Day, Place, PlanItem, Trip } from '../model/types';
import { patchTrip } from '../model/store';
import { savePlanItem } from '../model/edit';
import { dirLink, fmtDist, newId, travel, tzOf } from '../model/trip';
import { fmtDur, fmtHM, hm, minutesIn } from '../model/time';
import { MOODS, type Mood } from '../../supabase/functions/_shared/nearby.ts';
import { findNearby, type Found, type Suggestion } from '../sync/nearby';
import { Sheet } from './form';
import { Ext } from './bits';
import { KIND, MOOD_ICON } from './nearby';
import { useApp } from './ctx';

const pad = (n: number) => String(n).padStart(2, '0');
const toHM = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

export function ChangePlans({ d, close }: { d: Day; close: () => void }) {
  const { ix, geo } = useApp();
  const t = ix.trip;
  const min = minutesIn(tzOf(ix, d));
  /* what's still ahead today: untimed things, and anything from half an hour ago on */
  const left = d.plan.filter(i => { const a = hm(i.time); return a == null || a >= min - 30; });
  const [skip, setSkip] = useState<string[]>([]);
  const hotel = d.stayId ? ix.place.get(d.stayId) : undefined;
  const hotelPin = hotel?.lat != null && hotel.lng != null ? { lat: hotel.lat, lng: hotel.lng } : null;
  const [near, setNear] = useState<'me' | 'hotel'>(geo.pos || !hotelPin ? 'me' : 'hotel');
  const [mood, setMood] = useState<Mood | null>(null);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState<{ name: string; before: Trip['days'][number]['plan']; placeId: string } | null>(null);

  const pos = near === 'hotel' ? hotelPin : geo.pos;
  const look = async (m: Mood, at = pos) => {
    setMood(m); setFound(null); setMsg('');
    if (!at) { if (!geo.on) geo.toggle(); return; }
    setBusy(true);
    try { setFound(await findNearby(t.id, m, at)); } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };
  /* location just arrived after picking a mood: look now */
  if (mood && near === 'me' && geo.pos && !found && !busy && !msg) void look(mood, geo.pos);

  /* in for now: the place joins the trip, a plan item starts in a quarter of an hour plus the trip
     there, and whatever was picked to skip comes off today */
  const swap = (s: Suggestion) => {
    const from = near === 'hotel' && hotelPin ? hotelPin : geo.pos;
    const go = from ? travel(Math.hypot((s.lat - from.lat) * 111_000, (s.lng - from.lng) * 111_000 * Math.cos(from.lat * Math.PI / 180))).min : 15;
    const start = Math.ceil((min + 15 + go) / 15) * 15;
    const place: Place = {
      id: newId('p'), name: s.name, kind: KIND[mood!], lat: s.lat, lng: s.lng,
      ...(d.destinationId ? { destinationId: d.destinationId } : {}), ...(s.why ? { notes: s.why } : {}), ...(s.website ? { link: s.website } : {}),
    };
    const item: PlanItem = { id: newId('i'), text: s.name, placeId: place.id, time: toHM(start) };
    setDone({ name: s.name, before: d.plan, placeId: place.id });
    patchTrip(t.id, x => savePlanItem({
      ...x, places: [...x.places, place],
      days: x.days.map(y => (y.id === d.id ? { ...y, plan: y.plan.filter(i => !skip.includes(i.id)) } : y)),
    }, '', item, d.id));
  };
  const undo = () => {
    if (!done) return;
    patchTrip(t.id, x => ({
      ...x, places: x.places.filter(p => p.id !== done.placeId),
      days: x.days.map(y => (y.id === d.id ? { ...y, plan: done.before } : y)),
    }));
    setDone(null);
  };

  return (
    <Sheet title="Change of plans?" onCancel={close} cancelLabel="Close">
      {done ? (
        <div className="fitdone" role="status">
          <p><b>{done.name}</b> is on today's plan{skip.length ? `, and ${skip.length === 1 ? 'one thing is' : `${skip.length} things are`} off it` : ''}.</p>
          <div className="chips">
            <button className="chipbtn" onClick={undo}>Undo</button>
            <button className="chipbtn plain" aria-pressed="true" onClick={close}>Done</button>
          </div>
        </div>
      ) : (
        <>
          {left.length > 0 && (
            <>
              <h3 className="sub-h" style={{ marginTop: 0 }}>Skip anything?</h3>
              <div className="chips" role="group" aria-label="What to skip">
                {left.map(i => {
                  const on = skip.includes(i.id);
                  return (
                    <button key={i.id} type="button" className="chipbtn plain" aria-pressed={on} onClick={() => setSkip(on ? skip.filter(x => x !== i.id) : [...skip, i.id])}>
                      {i.time ? fmtHM(i.time) + ' · ' : ''}{(i.placeId && ix.place.get(i.placeId)?.name) || i.text.split(/[.\n]/)[0].slice(0, 40)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <h3 className="sub-h">What do you feel like instead?</h3>
          {hotelPin && (
            <div className="chips" role="group" aria-label="Near">
              <button type="button" className="chipbtn" aria-pressed={near === 'me'} onClick={() => { setNear('me'); if (mood) void look(mood, geo.pos); }}>Near me</button>
              <button type="button" className="chipbtn" aria-pressed={near === 'hotel'} onClick={() => { setNear('hotel'); if (mood) void look(mood, hotelPin); }}>Near the hotel</button>
            </div>
          )}
          <div className="chips" role="group" aria-label="Mood">
            {MOODS.map(m => (
              <button key={m.key} type="button" className="chipbtn plain" aria-pressed={mood === m.key} disabled={busy} onClick={() => void look(m.key)}>
                <span aria-hidden="true">{MOOD_ICON[m.key]} </span>{m.label}
              </button>
            ))}
          </div>
          {mood && !pos && <p className={'geomsg' + (geo.bad ? ' bad' : '')}>{geo.bad ? geo.msg : 'Finding you…'}</p>}
          {busy && <p className="geomsg" role="status">Looking around…</p>}
          {msg && <p className="geomsg bad" role="alert">{msg}</p>}
          {found && !found.items.length && <p className="geomsg">Nothing of that sort within 2.5 km. Try another mood.</p>}
          {found && found.items.length > 0 && (
            <ul className="fits" style={{ marginTop: 10 }}>
              {found.items.map(s => {
                const tr = travel(s.dist);
                return (
                  <li key={s.id}>
                    <button className="fitbtn" onClick={() => swap(s)}>
                      <b>{s.name}</b><span>{s.what} · {fmtDist(s.dist)} · about {fmtDur(tr.min)} {tr.how}{s.why ? ` · ${s.why}` : ''}</span><i aria-hidden="true">+</i>
                    </button>
                    <div className="meta"><Ext href={dirLink(s, tr.mode)}>Directions</Ext></div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Sheet>
  );
}
