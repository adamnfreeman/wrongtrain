/* "Adam reminded you: Register on Visit Japan Web": a banner when someone taps Remind on a to-do you
   still have to do (model/todos.ts, remindsMe), once per reminder per phone, with a way to To do. With
   the app closed, the push from send-push says it instead (sync/push.ts). */
import { useState } from 'react';
import { pref, setPref } from '../model/store';
import { remindsMe } from '../model/todos';
import { useApp } from './ctx';
import { Face } from './planItem';

const SEEN = 'nudges-seen';

export function RemindNotice() {
  const { ix, me, go } = useApp();
  const [shut, setShut] = useState<string[]>([]);
  const seen = pref<string[]>(SEEN, []);
  const t = ix.trip.todos.find(x => remindsMe(x, ix.trip, me) && !seen.includes(`${x.id}@${x.nudge!.at}`) && !shut.includes(x.id));
  const key = t ? `${t.id}@${t.nudge!.at}` : '';
  const done = () => { if (!t) return; setPref(SEEN, [...pref<string[]>(SEEN, []), key].slice(-300)); setShut(s => [...s, t.id]); };
  if (!t) return null;
  return (
    <div className="sharenote" role="status">
      <Face tripId={ix.trip.id} name={t.nudge!.by} size={30} />
      <span><b>{t.nudge!.by}</b> reminded you: {t.text}</span>
      <button className="chipbtn go" onClick={() => { done(); go('prep'); }}>Open</button>
      <button className="linkbtn" aria-label="Close" onClick={done}>✕</button>
    </div>
  );
}
