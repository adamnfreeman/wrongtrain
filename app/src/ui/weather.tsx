/* A small weather line on Today: now and the day's high and low where you are (or, before the
   trip, the first day's forecast once it's within reach). Tapped, it opens the next 7 days for one
   place: where you are, or any of the trip's cities. Open-Meteo: free, no key. The last answers are
   kept on the phone, so they still show with no signal. */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from './ctx';
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

/** Where the day is: tonight's stay, else the day's city. */
async function whereIs(ix: TripIndex, day: Day): Promise<{ lat: number; lng: number } | null> {
  const stay = day.stayId ? ix.place.get(day.stayId) : undefined;
  if (stay?.lat != null && stay.lng != null) return { lat: stay.lat, lng: stay.lng };
  return whereCity(ix, day.destinationId || day.route?.[day.route.length - 1]);
}

/** A city: any place with a pin there, else its name looked up (kept on the phone). */
async function whereCity(ix: TripIndex, destId?: string): Promise<{ lat: number; lng: number } | null> {
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
  /* the unit is in the key, so switching °C and °F doesn't show the old numbers */
  const key = day ? `wx-${ix.trip.id}-${day.date}${F ? '-f' : ''}` : '';
  const [wx, setWx] = useState<Wx | null>(() => (key ? pref<Wx | null>(key, null) : null));
  /* looks again every half hour while the app stays open, and on coming back to it */
  const [round, setRound] = useState(0);
  useEffect(() => {
    const again = () => { if (!document.hidden) setRound(r => r + 1); };
    const t = setInterval(again, 30 * 60_000);
    document.addEventListener('visibilitychange', again);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', again); };
  }, []);
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
  }, [key, round]); // eslint-disable-line react-hooks/exhaustive-deps
  return wx;
}

const deg = (n: number) => `${Math.round(n)}°`;

/** During the trip: today where you are. Before it: the first day, once it's within 16 days. */
export function Weather({ ix, day, live }: { ix: TripIndex; day?: Day; live: boolean }) {
  const soon = !!day && daysBetween(todayIn(tzOf(ix, day)), day.date) <= 15;
  const wx = useWeather(ix, soon ? day : undefined, live);
  const [open, setOpen] = useState(false);
  if (!day || !soon || !wx) return null;
  const [, icon, words] = look(wx.code);
  const city = destOf(ix, day)?.name || '';
  return (<>
    <button type="button" className="wx" onClick={() => setOpen(true)} aria-label={`Weather${city ? ' in ' + city : ''}: ${words}. Tap for the week.`}>
      <span className="wx-i" aria-hidden>{icon}</span>
      {wx.now != null ? <b>{deg(wx.now)}</b> : <b>{deg(wx.hi)}</b>}
      <span>{words} · {wx.now != null ? `High ${deg(wx.hi)}, low ${deg(wx.lo)}` : `low ${deg(wx.lo)}`}{wx.rain >= 20 ? ` · ${wx.rain}% rain` : ''}</span>
      {city && <small>{live ? city : `${city}, ${shortDate(day.date)}`}</small>}
    </button>
    {/* outside the button: a tap inside the popup would otherwise reach the button and reopen it */}
    {open && <WeekView ix={ix} start={day.destinationId || ix.trip.destinations[0]?.id || ''} close={() => setOpen(false)} />}
  </>);
}

/* ---------- the next 7 days, tapped open ---------- */

interface Week {
  at: number; now?: { t: number; code: number };
  hours: { time: string; t: number; code: number; rain: number }[];
  days: { date: string; code: number; hi: number; lo: number; rain: number; wind: number }[];
}

async function fetchWeek(at: { lat: number; lng: number }): Promise<Week | null> {
  const key = `wxweek-${at.lat.toFixed(2)},${at.lng.toFixed(2)}`;
  const had = pref<Week | null>(key, null);
  if (had && Date.now() - had.at < 30 * 60_000) return had;
  if (!navigator.onLine) return had;
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${at.lat}&longitude=${at.lng}&timezone=auto&forecast_days=7&forecast_hours=24`
    + '&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code,precipitation_probability'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max'
    + (F ? '&temperature_unit=fahrenheit&wind_speed_unit=mph' : '');
  try {
    const j = await (await fetch(u)).json(), d = j?.daily, h = j?.hourly;
    if (!d?.time?.length) return had;
    const w: Week = {
      at: Date.now(), now: j.current ? { t: j.current.temperature_2m, code: j.current.weather_code } : undefined,
      hours: (h?.time || []).map((time: string, i: number) => ({ time, t: h.temperature_2m[i], code: h.weather_code[i], rain: h.precipitation_probability?.[i] ?? 0 })).filter((_: unknown, i: number) => i % 3 === 0),
      days: d.time.map((date: string, i: number) => ({ date, code: d.weather_code[i], hi: d.temperature_2m_max[i], lo: d.temperature_2m_min[i], rain: d.precipitation_probability_max[i] ?? 0, wind: d.wind_speed_10m_max[i] ?? 0 })),
    };
    setPref(key, w);
    return w;
  } catch { return had; }
}

const hourLabel = (iso: string) => { const h = +iso.slice(11, 13); return h === 0 ? '12 AM' : h === 12 ? 'Noon' : h < 12 ? `${h} AM` : `${h - 12} PM`; };
const dayLabel = (iso: string, i: number) => (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(iso + 'T12:00:00').getDay()]} ${shortDate(iso)}`);

/** The next 7 days for one place: where you are (if the phone knows) or any of the trip's cities. */
function WeekView({ ix, start, close }: { ix: TripIndex; start: string; close: () => void }) {
  const { geo } = useApp();
  const here = geo.pos ? { lat: geo.pos.lat, lng: geo.pos.lng } : null;
  const [pick, setPick] = useState(here ? 'here' : start);
  const [week, setWeek] = useState<Week | null>(null);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let on = true;
    setBusy(true);
    (async () => {
      const at = pick === 'here' ? here : await whereCity(ix, pick);
      const w = at ? await fetchWeek(at) : null;
      if (on) { setWeek(w); setBusy(false); }
    })();
    return () => { on = false; };
  }, [pick]); // eslint-disable-line react-hooks/exhaustive-deps
  const choices = [...(here ? [{ id: 'here', name: 'Where you are' }] : []), ...ix.trip.destinations.map(d => ({ id: d.id, name: d.name }))];
  const unit = F ? 'mph' : 'km/h';
  return createPortal(
    <div className="wxpop" role="dialog" aria-label="Weather for the week" onClick={e => e.target === e.currentTarget && close()}>
      <div className="wxcard">
        <div className="wxcard-h"><h2>Weather</h2><button className="linkbtn" onClick={close}>Close</button></div>
        {choices.length > 1 && <div className="chips" style={{ marginTop: 0 }}>{choices.map(c => (
          <button key={c.id} className="chipbtn plain" aria-pressed={pick === c.id} onClick={() => setPick(c.id)}>{c.name}</button>
        ))}</div>}
        {!week ? <p className="note">{busy ? 'Getting the forecast…' : 'No forecast right now. Try again with signal.'}</p> : <>
          {week.now && (
            <div className="wxnow"><span aria-hidden>{look(week.now.code)[1]}</span><b>{deg(week.now.t)}</b><span>{look(week.now.code)[2]}</span></div>
          )}
          <div className="wxhours">{week.hours.map(h => (
            <div key={h.time}><small>{hourLabel(h.time)}</small><span aria-hidden>{look(h.code)[1]}</span><b>{deg(h.t)}</b>{h.rain >= 20 && <i>{h.rain}%</i>}</div>
          ))}</div>
          <ul className="wxdays">{week.days.map((d, i) => (
            <li key={d.date}>
              <span className="wxd">{dayLabel(d.date, i)}</span>
              <span aria-hidden>{look(d.code)[1]}</span>
              <span className="wxw">{look(d.code)[2]}{d.rain >= 20 ? ` · ${d.rain}% rain` : ''}{d.wind >= (F ? 20 : 30) ? ` · wind ${Math.round(d.wind)} ${unit}` : ''}</span>
              <span className="wxt"><b>{deg(d.hi)}</b> {deg(d.lo)}</span>
            </li>
          ))}</ul>
          <p className="note">Open-Meteo forecast{busy ? ', updating…' : ''}.</p>
        </>}
      </div>
    </div>,
    document.body,
  );
}
