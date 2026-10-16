/* Your own location: asked for only when you switch it on, and kept on this phone. The one exception
   is "Something nearby" (sync/nearby.ts), which sends it to OpenStreetMap when you pick a mood. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { isNative } from '../native';

export interface Geo {
  on: boolean;
  pos: { lat: number; lng: number; acc: number } | null;
  msg: string;
  bad: boolean;
  supported: boolean;
  toggle: () => void;
}

export function useGeo(wanted: boolean): Geo {
  /* in the iPhone app, the Geolocation plugin asks iOS (the web view's own API is not allowed there) */
  const supported = isNative || (typeof navigator !== 'undefined' && !!navigator.geolocation && window.isSecureContext);
  const [on, setOn] = useState(false);
  const [pos, setPos] = useState<Geo['pos']>(null);
  const [msg, setMsg] = useState('');
  const [bad, setBad] = useState(false);
  const watch = useRef<number | null>(null);
  const hasFix = useRef(false);

  useEffect(() => {
    if (!on || !wanted || !supported || document.hidden) return;
    const found = (c: { latitude: number; longitude: number; accuracy?: number }) => {
      hasFix.current = true; setPos({ lat: c.latitude, lng: c.longitude, acc: c.accuracy || 0 }); setMsg(''); setBad(false);
    };
    const failed = (denied: boolean) => {
      /* a passing hiccup should not switch it off once it has found you */
      if (hasFix.current && !denied) return;
      setOn(false); setPos(null); setBad(true); hasFix.current = false;
      setMsg(denied
        ? 'Location is switched off for WrongTrain. Turn it on in Settings → Privacy & Security → Location Services → WrongTrain, then try again.'
        : 'Could not find your location. Try again outdoors, or with Wi-Fi on.');
    };
    const opts = { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 };
    if (isNative) {
      let id: string | null = null, live = true;
      void (async () => {
        const { Geolocation } = await import('@capacitor/geolocation');
        try {
          const perm = await Geolocation.checkPermissions();
          if (perm.location !== 'granted' && (await Geolocation.requestPermissions({ permissions: ['location'] })).location !== 'granted') return failed(true);
          if (!live) return;
          id = await Geolocation.watchPosition(opts, (p, err) => {
            if (p) found(p.coords);
            else if (err) failed(/denied|permission/i.test(String((err as { message?: string }).message || err)));
          });
        } catch (e) { failed(/denied|permission/i.test(String((e as Error)?.message || e))); }
      })();
      return () => { live = false; if (id) void import('@capacitor/geolocation').then(({ Geolocation }) => Geolocation.clearWatch({ id: id! })); };
    }
    watch.current = navigator.geolocation.watchPosition(p => found(p.coords), err => failed(err.code === 1), opts);
    return () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); watch.current = null; };
  }, [on, wanted, supported]);

  const toggle = useCallback(() => {
    if (on) { setOn(false); setPos(null); setMsg(''); setBad(false); hasFix.current = false; return; }
    setOn(true); setBad(false); setMsg('Finding you…');
  }, [on]);

  return { on, pos, msg, bad, supported, toggle };
}
