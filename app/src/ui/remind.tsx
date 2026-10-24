/* "Adam reminded you: Register on Visit Japan Web": a banner when someone taps Remind on a to-do you
   still have to do (model/todos.ts, remindsMe), once per reminder per phone, with a way to To do; on
   the iPhone, a notification goes to Notification Center too. It comes when the trip syncs, so with
   the app closed it waits until the app is next opened (sending it then would need push). */
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
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
  useEffect(() => {
    if (!t || !Capacitor.isNativePlatform()) return;
    void (async () => {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      let p = await LocalNotifications.checkPermissions();
      if (p.display === 'prompt' || p.display === 'prompt-with-rationale') p = await LocalNotifications.requestPermissions();
      if (p.display === 'granted') await LocalNotifications.schedule({ notifications: [{ id: 9000 + Math.floor(Math.random() * 999), title: `${t.nudge!.by} reminded you`, body: t.text }] });
    })().catch(() => {});
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
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
