/* Your own location: asked for only when you switch it on, kept on this phone, never sent anywhere. */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Geo {
  on: boolean;
  pos: { lat: number; lng: number; acc: number } | null;
  msg: string;
  bad: boolean;
  supported: boolean;
  toggle: () => void;
}

export function useGeo(wanted: boolean): Geo {
  const supported = typeof navigator !== 'undefined' && !!navigator.geolocation && window.isSecureContext;
  const [on, setOn] = useState(false);
  const [pos, setPos] = useState<Geo['pos']>(null);
  const [msg, setMsg] = useState('');
  const [bad, setBad] = useState(false);
  const watch = useRef<number | null>(null);
  const hasFix = useRef(false);

  useEffect(() => {
    if (!on || !wanted || !supported || document.hidden) return;
    watch.current = navigator.geolocation.watchPosition(
      p => { hasFix.current = true; setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy || 0 }); setMsg(''); setBad(false); },
      err => {
        /* a passing hiccup should not switch it off once it has found you */
        if (hasFix.current && err.code !== 1) return;
        setOn(false); setPos(null); setBad(true); hasFix.current = false;
        setMsg(err.code === 1
          ? 'Location is switched off for WrongTrain. Allow it in Settings, then try again.'
          : 'Could not find your location. Try again outdoors, or with Wi-Fi on.');
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); watch.current = null; };
  }, [on, wanted, supported]);

  const toggle = useCallback(() => {
    if (on) { setOn(false); setPos(null); setMsg(''); setBad(false); hasFix.current = false; return; }
    setOn(true); setBad(false); setMsg('Finding you…');
  }, [on]);

  return { on, pos, msg, bad, supported, toggle };
}
