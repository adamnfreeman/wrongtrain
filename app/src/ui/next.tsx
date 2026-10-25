/* "How much time do I have?" on the Today screen. During the trip it uses the real time at the
   destination and, if switched on, your location. Before the trip it previews any day and time
   as if you were at that day's stay. */
import { useEffect, useState } from 'react';
import { anchorsFor, liveCtx, previewCtx, stopsFor, type Ctx, type Stop } from '../model/next';
import { dirLink, fmtDist, mapsLink, metres, pinGroup, travel, KIND_LABEL } from '../model/trip';
import { fmtDur, fmtHM, fmtT, longDate } from '../model/time';
import { needs, remindsMe, stillToDo, visibleTodos } from '../model/todos';
import { ThingRow } from './details';
import { ChangePlans } from './changePlans';
import { JAPAN } from '../edition';
import { TodoItem, tapped } from './day';
import { Ext, Pill, SecH, Txt, pinColor } from './bits';
import { useApp } from './ctx';
import { Nearby } from './nearby';

const about = (tr: { min: number; how: string }) => `about ${fmtDur(tr.min)} ${tr.how}`;

/** Re-render once a minute so "now" keeps moving. */
function useMinute() {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => !document.hidden && tick(x => x + 1), 60000); return () => clearInterval(t); }, []);
}

export function NextCard() {
  const { ix, now, ui, set, geo, go, me } = useApp();
  const [changing, setChanging] = useState(false);
  useMinute();
  let c: Ctx | null = null;
  if (now.phase === 'during' && now.cur) c = liveCtx(ix, now.cur, geo.on ? geo.pos : null);
  else if (now.phase === 'before') {
    const d = ix.trip.days.find(x => x.id === ui.sim.day) || ix.trip.days[Math.min(2, ix.trip.days.length - 1)];
    if (d) c = previewCtx(ix, d, ui.sim.min);
  }
  if (!c) return null;

  const list = anchorsFor(ix, c.d), timed = list.filter(a => a.at != null), allDay = list.filter(a => a.at == null);
  const next = timed.find(a => a.at! >= c.min - 15) || null;
  let need: number | null = null, tr: ReturnType<typeof travel> | null = null, big: string, say: React.ReactNode;
  if (next) {
    need = next.at! - next.lead;
    const beThere = next.lead ? `Be there by ${fmtT(need)} for ${fmtT(next.at!)}` : `Be there by ${fmtT(next.at!)}`;
    const why = next.kind === 'flight' ? ' (two and a half hours before the flight)' : '';
    const where = <b>{next.place?.name || next.name}</b>;
    if (c.pos && next.place?.lat != null) {
      tr = travel(metres(c.pos.lat, c.pos.lng, next.place.lat, next.place.lng!));
      const leaveBy = need - tr.min, free = leaveBy - c.min, hop = `It is about ${fmtDur(tr.min)} away ${tr.how}`;
      if (need < c.min) { big = 'Running late'; say = <>{where} is at {fmtT(next.at!)}. {hop}.</>; }
      else if (free <= 5) { big = 'Leave now'; say = <>Head to {where}. {beThere}{why}. {hop}.</>; }
      else { big = fmtDur(free); say = <>until you need to leave for {where}. {beThere}{why}. {hop}, so leave by <b>{fmtT(leaveBy)}</b>.</>; }
    } else {
      big = fmtDur(need - c.min); say = <>until you need to be at {where}. {beThere}{why}.</>;
    }
  } else {
    big = 'No deadline';
    say = allDay.length ? <>Today is {allDay.map((a, i) => <b key={i}>{i ? ' and ' : ''}{a.name}</b>)}, with no fixed time.</> : 'Nothing with a fixed time is left today.';
  }
  const stops = stopsFor(ix, c, next, need);
  const up = timed.filter(a => a.at! >= c.min - 15);
  const tomorrow = ix.trip.days[(ix.dayPos.get(c.d.id) ?? 0) + 1];
  const tfirst = tomorrow ? anchorsFor(ix, tomorrow).find(a => a.at != null) : undefined;
  const times: number[] = []; for (let m = 360; m <= 1380; m += 30) times.push(m);
  const tonight = c.d.stayId ? ix.place.get(c.d.stayId) : undefined;
  const prevStay = ix.trip.days[(ix.dayPos.get(c.d.id) ?? 0) - 1]?.stayId;
  /* to-dos that are yours to do: just for you, or assigned to you and not ticked yet; reminders first */
  const waiting = visibleTodos(ix.trip.todos, me)
    .filter(t => !t.done && (!!t.mine || (!!needs(t, ix.trip) && stillToDo(t, ix.trip).some(n => n.trim().toLowerCase() === me.trim().toLowerCase()))))
    .sort((a, b) => Number(remindsMe(b, ix.trip, me)) - Number(remindsMe(a, ix.trip, me)));

  return (
    <section className="sec" id="next">
      <SecH title="How much time do I have?">{!c.live && <span className="kicker">Preview</span>}{c.live && c.from && <span className="kicker">Sample</span>}</SecH>
      {!c.live && (
        <>
          <div className="simrow">
            <label htmlFor="simday">Day</label>
            <select id="simday" className="sel" value={c.d.id} onChange={e => set({ sim: { ...ui.sim, day: e.target.value } })}>
              {ix.trip.days.map(x => <option key={x.id} value={x.id}>{longDate(x.date)}</option>)}
            </select>
            <label htmlFor="simtime">Time</label>
            <select id="simtime" className="sel" value={c.min} onChange={e => set({ sim: { ...ui.sim, min: +e.target.value } })}>
              {times.map(m => <option key={m} value={m}>{fmtT(m)}</option>)}
            </select>
          </div>
          <p className="geomsg">{c.from ? `As if you were at ${c.from.name} at ${fmtT(c.min)} on ${longDate(c.d.date)}.` : `No stay with a map pin on ${longDate(c.d.date)}, so distances are left out.`} During the trip this uses the real time and your location.</p>
        </>
      )}
      {c.live && c.from && <p className="geomsg">This is the sample trip, so it pretends you are at {c.from.name} right now ({fmtT(c.min)} there).</p>}
      <div className="nextbox">
        <p className="bigtime">{big}</p><p>{say}</p>
        {next?.place?.lat != null && <div className="meta"><Ext href={dirLink(next.place, tr ? tr.mode : 'transit')}>Directions to {next.place.name}</Ext></div>}
      </div>
      {(up.length > 0 || allDay.length > 0 || tfirst || tonight) && (
        <>
          <h3 className="sub-h">Coming up</h3>
          <ul className="sheet esslist">
            {allDay.map((a, i) => <ThingRow key={'a' + i} thing={a.ref} kick="All day" title={a.name} />)}
            {up.map((a, i) => <ThingRow key={'u' + i} thing={a.ref} kick={`${fmtT(a.at!)}${a.at! - c.min > 0 ? ` · in ${fmtDur(a.at! - c.min)}` : ' · now'}`} title={a.name} sub={a.what !== a.name ? a.what.split('\n')[0] : undefined} />)}
            {tonight && <ThingRow thing={{ kind: 'place', id: tonight.id }} kick="Tonight" title={tonight.name}
              sub={[tonight.checkIn && c.d.stayId !== prevStay && `Check in from ${fmtHM(tonight.checkIn)}`, tonight.address || tonight.area].filter(Boolean).join(' · ') || undefined} />}
            {tfirst && <ThingRow thing={tfirst.ref} kick={`Tomorrow · ${fmtT(tfirst.at!)}`} title={tfirst.name} sub={tfirst.what !== tfirst.name ? tfirst.what.split('\n')[0] : undefined} />}
          </ul>
        </>
      )}
      {c.live && !JAPAN && (
        <div className="chips"><button type="button" className="chipbtn go" onClick={() => setChanging(true)}>Change of plans?</button></div>
      )}
      {changing && <ChangePlans d={c.d} close={() => setChanging(false)} />}
      {c.live && waiting.length > 0 && (
        <>
          <h3 className="sub-h">Waiting on you</h3>
          <ul className="sheet">{waiting.slice(0, 3).map(t => <TodoItem key={t.id} t={t} brief />)}</ul>
          {waiting.length > 3 && <button className="linkbtn" onClick={() => go('prep')}>All {waiting.length}</button>}
        </>
      )}
      {c.live && !c.pos && geo.supported && (
        <>
          <div className="chips"><button className="chipbtn plain" aria-pressed={geo.on} onClick={geo.toggle}>{geo.on ? 'Finding you…' : 'Use my location'}</button></div>
          <p className={'geomsg' + (geo.bad ? ' bad' : '')}>{geo.bad ? geo.msg : 'Turn on location to see when to leave and what is nearby.'}</p>
        </>
      )}
      {/* with location on: what's nearby, once a mood is picked (a suggestion from the trip's own
          list here was confusing); without: what's on today's list */}
      {!c.pos && <>
        <h3 className="sub-h">On today's list</h3>
        {stops.length ? <ul className="sheet">{stops.map(x => <StopItem key={x.p.id} x={x} />)}</ul> : <p className="lede2">Nothing on the map is on today's list.</p>}
      </>}
      <h3 className="sub-h">What's nearby?</h3>
      <Nearby inline />
      <p className="geomsg">Travel times are rough guesses from straight-line distance. Check Directions before relying on one.</p>
    </section>
  );
}

function StopItem({ x }: { x: Stop }) {
  const { ix, show } = useApp();
  const p = x.p, bits: string[] = [];
  if (x.dist != null) bits.push(`${fmtDist(x.dist)} · ${about(x.tr!)}`);
  if (x.status) bits.push(x.status);
  return (
    <li className="tapme" onClick={tapped(() => show({ kind: 'place', id: p.id }))}>
      <div className="item-h">
        <span className="item-n"><span className="dot" style={pinColor(pinGroup(p).color)} />{p.name}</span>
        <Pill>{KIND_LABEL[p.kind]}</Pill>{x.today && <Pill kind="ok">On today's list</Pill>}
      </div>
      {bits.length > 0 && <div className="when">{bits.join(' · ')}</div>}
      <Txt text={p.notes} className="item-d" />
      <div className="meta"><Ext href={x.dist != null ? dirLink(p, x.tr!.mode) : mapsLink(ix, p)}>{x.dist != null ? 'Directions' : 'Open in Google Maps'}</Ext></div>
    </li>
  );
}
