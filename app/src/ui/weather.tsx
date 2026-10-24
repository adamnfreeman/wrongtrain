/* A small weather line on Today: now and the day's high and low where you are (or, before the
   trip, the first day's forecast once it's within reach). Open-Meteo: free, no key, forecasts up to
   16 days out. The last answer is kept on the phone, so it still shows with no signal. */
import { useEffect, useState } from 'react';
import type { Day } from '../model/types';
import { pref, setPref } from '../model/store';
import { daysBetween, shortDate, todayIn } from '../model/time';
import { destOf, tzOf, type TripIndex } from '../model/trip';

interface Wx { at: number; now?: number; code: number; hi: number; lo: number; rain: number }

/* Fahrenheit where people read it (the US and a few others), Celsius everywhere else */
const F = /-(US|LR|MM|BS|BZ|KY|PW)$/i.test(navigator.language || '');

const LOOK: [number[], string, string][] = [
  [[0], '☀️', 'Clear'], [[1, 2], '🌤️', 'Partly cloudy'], [[3], '☁️', 'Cloudy'], [[45, 48], '🌫️', 'Fog'],
  [[51, 53, 55, 56, 57], '🌦️', 'Drizzle'], [[61, 63, 65, 66, 67, 80, 81, 82], '🌧️', 'Rain'],
  [[71, 73, 75, 77, 85, 86], '🌨️', 'Snow'], [[95, 96, 99], '⛈️', 'Storms'],
];
const look = (code: number) => LOOK.find(([c]) => c.includes(code)) || LOOK[2];

/** Where the day is: tonight's stay, else any place with a pin in that city, else its name looked up. */
async function whereIs(ix: TripIndex, day: Day): Promise<{ lat: number; lng: number } | null> {
  const destId = day.destinationId || day.route?.[day.route.length - 1];
  const stay = day.stayId ? ix.place.get(day.stayId) : undefined;
  if (stay?.lat != null && stay.lng != null) return { lat: stay.lat, lng: stay.lng };
  const any = ix.trip.places.find(p => p.destinationId === destId && p.lat != null && p.lng != null);
  if (any) return { lat: any.lat!, lng: any.lng! };
  const dest = destId ? ix.dest.get(destId) : undefined;
  if (!dest) return null;
  const key = 'wx-where-' + dest.name.toLowerCase();
  const had = pref<{ lat: number; lng: number } | null>(key, null);
  if (had) return had;
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(dest.name)}${dest.country ? '&countryCode=' + dest.country : ''}`);
  const hit = (await r.json())?.results?.[0];
  if (!hit) return null;
  const at = { lat: hit.latitude, lng: hit.longitude };
  setPref(key, at);
  return at;
}

function useWeather(ix: TripIndex, day: Day | undefined, live: boolean): Wx | null {
  const key = day ? `wx-${ix.trip.id}-${day.date}` : '';
  const [wx, setWx] = useState<Wx | null>(() => (key ? pref<Wx | null>(key, null) : null));
  useEffect(() => {
    if (!day) return;
    setWx(pref<Wx | null>(key, null));
    /* at most every half hour; the forecast doesn't change faster than that */
    if (Date.now() - (pref<Wx | null>(key, null)?.at || 0) < 30 * 60_000 || !navigator.onLine) return;
    let on = true;
    (async () => {
      const at = await whereIs(ix, day);
      if (!at) return;
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${at.lat}&longitude=${at.lng}&timezone=${encodeURIComponent(tzOf(ix, day))}`
        + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&start_date=${day.date}&end_date=${day.date}`
        + (live ? '&current=temperature_2m,weather_code' : '') + (F ? '&temperature_unit=fahrenheit' : '');
      const j = await (await fetch(u)).json();
      const d = j?.daily;
      if (!d?.time?.length) return;
      const next: Wx = {
        at: Date.now(), code: live && j.current ? j.current.weather_code : d.weather_code[0], now: live ? j.current?.temperature_2m : undefined,
        hi: d.temperature_2m_max[0], lo: d.temperature_2m_min[0], rain: d.precipitation_probability_max[0] ?? 0,
      };
      setPref(key, next);
      if (on) setWx(next);
    })().catch(() => { /* no weather today: the line just doesn't show */ });
    return () => { on = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return wx;
}

const deg = (n: number) => `${Math.round(n)}°`;

/** During the trip: today where you are. Before it: the first day, once it's within 16 days. */
export function Weather({ ix, day, live }: { ix: TripIndex; day?: Day; live: boolean }) {
  const soon = !!day && daysBetween(todayIn(tzOf(ix, day)), day.date) <= 15;
  const wx = useWeather(ix, soon ? day : undefined, live);
  if (!day || !soon || !wx) return null;
  const [, icon, words] = look(wx.code);
  const city = destOf(ix, day)?.name || '';
  return (
    <div className="wx" aria-label={`Weather${city ? ' in ' + city : ''}: ${words}`}>
      <span className="wx-i" aria-hidden>{icon}</span>
      {wx.now != null ? <b>{deg(wx.now)}</b> : <b>{deg(wx.hi)}</b>}
      <span>{words} · {wx.now != null ? `High ${deg(wx.hi)}, low ${deg(wx.lo)}` : `low ${deg(wx.lo)}`}{wx.rain >= 20 ? ` · ${wx.rain}% rain` : ''}</span>
      {city && <small>{live ? city : `${city}, ${shortDate(day.date)}`}</small>}
    </div>
  );
}
