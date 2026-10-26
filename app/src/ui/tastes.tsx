/* "What do you like?": asked once when you join a shared trip (App.tsx), and from Trip any time.
   Your food needs and what you're into, kept on the trip under your name (model/tastes.ts), so
   What's nearby, Change of plans and the ideas box pick for you, not for someone else's diet. */
import { useState } from 'react';
import type { Trip } from '../model/types';
import { patchTrip } from '../model/store';
import { setTastes, tastesOf } from '../model/tastes';
import { DIETS, STYLES } from '../../supabase/functions/_shared/planner.ts';
import { Field, Sheet, Text } from './form';

const toggle = (l: string[], v: string) => (l.includes(v) ? l.filter(x => x !== v) : [...l, v]);

export function TastesSheet({ trip, me, close }: { trip: Trip; me: string; close: () => void }) {
  const was = tastesOf(trip, me);
  const [diets, setDiets] = useState<string[]>(was?.diets || []);
  const [likes, setLikes] = useState<string[]>(was?.likes || []);
  const [notes, setNotes] = useState(was?.notes || '');
  const save = () => { patchTrip(trip.id, t => setTastes(t, me, { diets, likes, notes })); close(); };
  return (
    <Sheet title="What do you like?" onCancel={close} cancelLabel={was ? 'Cancel' : 'Skip'} onSave={save}>
      <p className="lede2" style={{ marginTop: 12 }}>So the picks on {trip.name} suit you. Only you are asked; everyone has their own.</p>
      <Field label="Food">
        <div className="chips" style={{ marginTop: 0 }}>
          <button type="button" className="chipbtn plain" aria-pressed={!diets.length} onClick={() => setDiets([])}>I eat anything</button>
          {DIETS.map(d => <button key={d} type="button" className="chipbtn plain" aria-pressed={diets.includes(d)} onClick={() => setDiets(toggle(diets, d))}>{d}</button>)}
        </div>
      </Field>
      <Field label="I'm into">
        <div className="chips" style={{ marginTop: 0 }}>
          {STYLES.map(s => <button key={s} type="button" className="chipbtn plain" aria-pressed={likes.includes(s)} onClick={() => setLikes(toggle(likes, s))}>{s}</button>)}
        </div>
      </Field>
      <Text label="Anything else?" value={notes} onChange={setNotes} placeholder="e.g. no seafood, love jazz bars, early riser" />
    </Sheet>
  );
}
