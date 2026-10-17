/* "Something nearby" on the Today screen: pick a mood, see five places around you, save any to
   Ideas. See sync/nearby.ts for where the places come from. In the Japan edition the trip is the
   sheet's, replaced every few minutes, so a place goes to the sheet as a group note for its filer. */
import { useState } from 'react';
import type { PlaceKind } from '../model/types';
import { addNote, patchTrip } from '../model/store';
import { JAPAN } from '../edition';
import { dirLink, fmtDist, newId, travel } from '../model/trip';
import { fmtDur } from '../model/time';
import { MOODS, type Mood } from '../../supabase/functions/_shared/nearby.ts';
import { findNearby, type Found, type Suggestion } from '../sync/nearby';
import { Ext, SecH } from './bits';
import { useApp } from './ctx';

const KIND: Record<Mood, PlaceKind> = {
  food: 'food', coffee: 'coffee', drinks: 'food', sights: 'sight', culture: 'sight', offbeat: 'sight', music: 'event',
  adventure: 'sight', chill: 'area', spa: 'other', film: 'event', shopping: 'shop',
};

export function Nearby() {
  const { ix, now, geo } = useApp();
  const [mood, setMood] = useState<Mood | null>(null);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [msg, setMsg] = useState('');
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const look = async (m: Mood) => {
    setMood(m); setFound(null); setMsg('');
    if (!geo.pos) { if (!geo.on) geo.toggle(); return; }
    setBusy(true);
    try { setFound(await findNearby(ix.trip.id, m, geo.pos)); } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };
  /* location just arrived after picking a mood: look now */
  if (mood && geo.pos && !found && !busy && !msg) void look(mood);

  const save = (s: Suggestion) => {
    if (JAPAN) {
      const m = MOODS.find(x => x.key === mood)!;
      const city = ix.trip.destinations.find(d => d.id === now.cur?.destinationId)?.name;
      addNote(ix.trip.id, `Add ${s.name} (${s.what}, ${fmtDist(s.dist)} from where we were${city ? ' in ' + city : ''}) to the ${city ? city + ' ' : ''}${m.label.toLowerCase()} ideas. `
        + `Found with Something nearby. Coordinates: ${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}.`
        + (s.website ? ` Website: ${s.website}` : '') + (s.why ? ` Why: ${s.why}` : ''));
      setSaved({ ...saved, [s.id]: true });
      return;
    }
    patchTrip(ix.trip.id, t => ({
      ...t,
      places: [...t.places, {
        id: newId('p'), name: s.name, kind: KIND[mood!], lat: s.lat, lng: s.lng, wishlist: true,
        ...(now.cur?.destinationId ? { destinationId: now.cur.destinationId } : {}),
        ...(s.why ? { notes: s.why } : {}), ...(s.website ? { link: s.website } : {}),
      }],
    }));
    setSaved({ ...saved, [s.id]: true });
  };

  return (
    <section className="sec" id="nearby">
      <SecH title="Something nearby" />
      <p className="lede2">What are you in the mood for?</p>
      <div className="chips" role="group" aria-label="Mood">
        {MOODS.map(m => (
          <button key={m.key} type="button" className="chipbtn plain" aria-pressed={mood === m.key} disabled={busy} onClick={() => void look(m.key)}>{m.label}</button>
        ))}
      </div>
      {mood && !geo.pos && (
        <p className={'geomsg' + (geo.bad ? ' bad' : '')}>{geo.bad ? geo.msg : geo.supported ? 'Finding you…' : 'This needs your location, which this browser cannot share.'}</p>
      )}
      {busy && <p className="geomsg" role="status">Looking around…</p>}
      {msg && <p className="geomsg bad" role="alert">{msg}</p>}
      {found && !found.items.length && <p className="geomsg">Nothing of that sort within 2.5 km. Try another mood.</p>}
      {found && found.items.length > 0 && (
        <>
          {found.note && <p className="geomsg">{found.note}</p>}
          <ul className="sheet" style={{ marginTop: 10 }}>
            {found.items.map(s => {
              const tr = travel(s.dist);
              return (
                <li key={s.id}>
                  <div className="item-h"><span className="item-n">{s.name}</span></div>
                  <div className="when">{s.what} · {fmtDist(s.dist)} · about {fmtDur(tr.min)} {tr.how}</div>
                  {s.why && <p className="item-d">{s.why}</p>}
                  <div className="meta">
                    <Ext href={dirLink(s, tr.mode)}>Directions</Ext>
                    {saved[s.id] ? <span role="status">{JAPAN ? "Sent to the sheet; it'll be filed in a minute" : 'Saved to Ideas'}</span>
                      : <button type="button" className="linkbtn" onClick={() => save(s)}>{JAPAN ? 'Add to the trip' : 'Save to Ideas'}</button>}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="geomsg">{found.by === 'claude' ? 'Picked for you from ' : 'From '}places on OpenStreetMap (© OpenStreetMap contributors). Check opening hours before you go.</p>
        </>
      )}
    </section>
  );
}
