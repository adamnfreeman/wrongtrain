/* A day: its station board, plan, getting around, and where to eat. Plus the route list and the
   list items other screens reuse (legs, food, to-dos). */
import { useEffect, useRef } from 'react';
import { centre, offCentre, useDock } from './dock';
import type { Bullet, Day, Leg, Place, Todo } from '../model/types';
import { DocLinks } from './wallet';
import { cityOf, codeOf, lineOf, mapsLink, stayLine, destOf } from '../model/trip';
import { dayOfMonth, fmtHM, fmtT, longDate } from '../model/time';
import { anchorsFor } from '../model/next';
import { toggleTodo } from '../model/store';
import { TODO_TAGS } from '../model/todos';
import { Ext, Pill, Rich, SecH, Txt, line } from './bits';
import { useApp } from './ctx';

/** The day's heading: which day, the city, tonight's stay. compact on Today, where the time to leave leads. */
export function Board({ d, compact }: { d: Day; compact?: boolean }) {
  const { ix, edit } = useApp();
  const i = ix.dayPos.get(d.id)!, days = ix.trip.days;
  const stay = d.stayId ? ix.place.get(d.stayId) : undefined;
  if (compact) return (
    <header className="dayhead" style={line(lineOf(ix, d))}>
      <div className="kicker">{longDate(d.date)} · Day {i + 1} of {days.length}</div>
      <h1>{cityOf(ix, d)}</h1>
    </header>
  );
  return (
    <header className="board" style={line(lineOf(ix, d))}>
      <div className="board-main">
        <div className="kicker">Day {i + 1} of {days.length} · {longDate(d.date)}</div>
        <h1>{cityOf(ix, d)}</h1>
        <p className="board-sub">
          {stayLine(ix, d)}{stay && <> · <Ext href={mapsLink(ix, stay)}>Map</Ext></>}
        </p>
        <button className="editbtn" onClick={() => edit({ kind: 'day', id: d.id })}>Edit day</button>
      </div>
    </header>
  );
}

const Bullets = ({ items }: { items: Bullet[] }) => (
  <ul className="sheet">
    {items.map((b, i) => (
      <li key={i}><Txt text={b.text} />{b.sub?.length ? <ul className="sub">{b.sub.map((s, j) => <li key={j}><Txt text={s} /></li>)}</ul> : null}</li>
    ))}
  </ul>
);

export function DayBody({ d }: { d: Day }) {
  const { ix, ui, go, edit } = useApp();
  const legs = ix.trip.legs.filter(l => l.dayId === d.id);
  const eats = d.eatIds.map(id => ix.place.get(id)).filter((p): p is Place => !!p);
  const shown = eats.filter(p => vegOk(p, ui.veg));
  const fixed = anchorsFor(ix, d);
  const empty = !d.plan.length && !legs.length && !d.around.length && !d.tips.length && !eats.length;
  if (empty) return (
    <section className="sec">
      <p className="empty">Nothing planned for this day yet.</p>
      <div className="chips" style={{ justifyContent: 'center' }}>
        <button className="chipbtn go" onClick={() => edit({ kind: 'day', id: d.id })}>Plan this day</button>
        <button className="chipbtn" onClick={() => edit({ kind: 'leg', dayId: d.id })}>+ Add a leg</button>
      </div>
    </section>
  );
  return (
    <>
      {d.plan.length > 0 && (
        <section className="sec" style={line(lineOf(ix, d))}>
          <SecH title="Plan"><button className="linkbtn" onClick={() => edit({ kind: 'day', id: d.id })}>Edit</button></SecH>
          <ol className="plan">
            {d.plan.map(p => {
              const place = p.placeId ? ix.place.get(p.placeId) : undefined;
              return (
                <li key={p.id}>
                  {p.time && <div className="kick">{fmtHM(p.time)}{p.end ? '–' + fmtHM(p.end) : ''}{p.fixed && (p.timeKind === 'by' ? ' · at the latest' : ' · booked')}</div>}
                  <Txt text={p.text} />
                  {p.sub?.length ? <ul className="sub">{p.sub.map((s, j) => <li key={j}><Txt text={s} /></li>)}</ul> : null}
                  {place && place.kind !== 'stay' && <div className="meta"><Ext href={mapsLink(ix, place)}>{place.name} in Maps</Ext></div>}
                  <DocLinks kind="plan" id={p.id} />
                </li>
              );
            })}
          </ol>
        </section>
      )}
      {fixed.length > 0 && (
        <section className="sec">
          <SecH title="Be on time for" />
          <ul className="sheet">
            {fixed.map((a, i) => (
              <li key={i}>
                <div className="kick">{a.at == null ? 'All day' : fmtT(a.at) + (a.kind === 'deadline' ? ' at the latest' : '')}</div>
                <div className="item-h"><span className="item-n">{a.name}</span></div>
                {a.what !== a.name && <Txt text={a.what} className="item-d" />}
              </li>
            ))}
          </ul>
        </section>
      )}
      {(legs.length > 0 || d.around.length > 0) && (
        <section className="sec">
          <SecH title="Getting around"><span><button className="linkbtn" onClick={() => edit({ kind: 'leg', dayId: d.id })}>+ Leg</button> · <button className="linkbtn" onClick={() => go('transit')}>All legs</button></span></SecH>
          {legs.length > 0 && <ul className="sheet">{legs.map(l => <LegItem key={l.id} l={l} />)}</ul>}
          {d.around.length > 0 && <div className="blk"><Bullets items={d.around} /></div>}
        </section>
      )}
      {d.tips.length > 0 && <section className="sec"><SecH title="Good to know" /><Bullets items={d.tips} /></section>}
      {eats.length > 0 && (
        <section className="sec">
          <SecH title="Where to eat"><VegToggle /></SecH>
          {shown.length ? <ul className="sheet">{shown.map(p => <EatItem key={p.id} p={p} />)}</ul>
            : <p className="empty">Nothing veg-friendly listed for this day.</p>}
        </section>
      )}
    </>
  );
}

export function RouteList() {
  const { ix, now, go } = useApp();
  return (
    <ol className="route">
      {ix.trip.days.map((d, i) => (
        <li key={d.id}>
          <button className="stop" style={line(lineOf(ix, d))} onClick={() => go('days', d.id)}>
            <span className="badge"><i>{codeOf(ix, d)}</i><b>{String(i + 1).padStart(2, '0')}</b></span>
            <span>
              <span className="stop-h"><b>{longDate(d.date)}</b><span>{cityOf(ix, d)}</span>{now.cur?.id === d.id && <em className="here">Today</em>}</span>
              <span className="stop-p">{d.summary ? <Rich text={d.summary} /> : d.plan.length ? `${d.plan.length} planned` : 'Nothing planned yet'}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/* the day strip along the top of Days */
/** The days as a line: a box per day in its destination's colour, joined up. Drag it sideways and
    the day in the middle opens; tap a day to slide to it. Like the Dock on a Mac, each day grows as
    it nears the middle and shrinks towards the edges. */
export function DaySlider({ cur }: { cur: Day }) {
  const { ix, go } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const days = ix.trip.days;
  /* keep the open day in the middle (instantly when it changes from elsewhere) */
  useEffect(() => { centre(ref.current, ref.current?.querySelector<HTMLElement>(`[data-day="${cur.id}"]`)); }, [cur.id]);
  useDock(ref, '[data-day]', { radius: 120, small: 0.86, big: 1.2, deps: [days.length] });
  /* when the slider comes to rest, open the day nearest the middle */
  useEffect(() => {
    const st = ref.current; if (!st) return;
    let t = 0;
    const settle = () => {
      let best: HTMLElement | null = null, dist = Infinity;
      st.querySelectorAll<HTMLElement>('[data-day]').forEach(el => { const c = Math.abs(offCentre(st, el)); if (c < dist) { dist = c; best = el; } });
      const id = (best as HTMLElement | null)?.dataset.day;
      if (id && id !== cur.id) go('days', id);
    };
    const onScroll = () => { clearTimeout(t); t = window.setTimeout(settle, 140); };
    st.addEventListener('scroll', onScroll, { passive: true });
    return () => { st.removeEventListener('scroll', onScroll); clearTimeout(t); };
  }, [cur.id, go]);
  return (
    <div className="dslider" ref={ref} data-noswipe>
      <div className="dslider-in"><div className="dtrack">
        {/* one line behind all the days, each stretch in the colour of the day it leaves from */}
        <i className="dline" style={{ background: `linear-gradient(to right, ${days.slice(0, -1).map((x, i) => `var(--l-${lineOf(ix, x)}) ${i * 62}px ${(i + 1) * 62}px`).join(', ') || 'transparent 0 0'})` }} />
        {days.map((x, i) => {
          const prev = days[i - 1], newCity = !prev || prev.destinationId !== x.destinationId || prev.travel !== x.travel;
          return (
            <button key={x.id} data-day={x.id} className={'dbox' + (x.travel ? ' travel' : '')} style={line(lineOf(ix, x))}
              aria-current={x.id === cur.id} aria-label={`${longDate(x.date)}, ${cityOf(ix, x)}`}
              onClick={e => (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })}>
              <small>{longDate(x.date).slice(0, 3)}</small><b>{dayOfMonth(x.date)}</b>
              {newCity && <em>{x.travel ? 'Travel' : destOf(ix, x)?.name || ''}</em>}
            </button>
          );
        })}
      </div></div>
    </div>
  );
}

export function LegItem({ l }: { l: Leg }) {
  const { edit } = useApp();
  const sk = l.status === 'booked' ? 'ok' : l.status === 'todo' ? 'todo' : '';
  const label = l.statusText || (l.status === 'booked' ? 'Booked' : l.status === 'todo' ? 'To book' : 'Nothing to book');
  return (
    <li>
      <div className="item-h"><span className="item-n">{l.from} → {l.to}</span><Pill kind={sk}>{l.status === 'booked' ? '✓ ' : ''}{label}</Pill></div>
      <Txt text={l.how} className="item-d" />
      {(l.depart || l.arrive) && <div className="meta">{l.depart && <span>Leaves <span className="tm">{fmtHM(l.depart)}</span></span>}{l.arrive && <span>Arrives <span className="tm">{fmtHM(l.arrive)}</span></span>}</div>}
      {l.tickets && <><span className="lbl">Tickets</span><Txt text={l.tickets} className="item-d" /></>}
      {l.details && <><span className="lbl">Details</span><Txt text={l.details} className="item-d" /></>}
      <DocLinks kind="leg" id={l.id} />
      <div className="meta"><button className="linkbtn" onClick={() => edit({ kind: 'leg', id: l.id })}>Edit</button><button className="linkbtn" onClick={() => edit({ kind: 'doc', for: { kind: 'leg', id: l.id } })}>+ Ticket</button></div>
    </li>
  );
}

/* ---------- food ---------- */

export const vegOk = (p: Place, veg: boolean) => !veg || ((p.diet === 'veg' || p.diet === 'veg-some') && !p.closed);

export function VegPill({ p }: { p: Place }) {
  if (p.closed) return <Pill kind="no">Closed for good</Pill>;
  if (p.diet === 'veg') return <Pill kind="ok">Veg-friendly</Pill>;
  if (p.diet === 'veg-some') return <Pill kind="todo">Some veg</Pill>;
  if (p.diet === 'no') return <Pill>Not veg</Pill>;
  return null;
}

export function EatItem({ p }: { p: Place }) {
  const { ix, edit } = useApp();
  const hours = p.hours === '24h' ? 'Open 24 hours' : p.hours ? `${fmtHM(p.hours.open)}–${fmtHM(p.hours.close)}` : '';
  return (
    <li className={p.closed ? 'dim' : ''}>
      <div className="item-h"><span className="item-n">{p.name}</span><VegPill p={p} /></div>
      <Txt text={p.notes} className="item-d" />
      <div className="meta">
        {p.area && <span>{p.area}</span>}
        {hours && <span><Rich text={hours} /></span>}
        {p.dietNote && <span>{p.dietNote}</span>}
        {!p.closed && <Ext href={mapsLink(ix, p)}>Find in Maps</Ext>}
        <button className="linkbtn" onClick={() => edit({ kind: 'place', id: p.id })}>Edit</button>
      </div>
    </li>
  );
}

export function VegToggle() {
  const { ui, set } = useApp();
  return <button className="chipbtn plain" aria-pressed={ui.veg} onClick={() => set({ veg: !ui.veg })}>Veg-friendly only</button>;
}

/* ---------- to-dos ---------- */

export function TodoItem({ t, brief }: { t: Todo; brief?: boolean }) {
  const { ix, edit, me } = useApp();
  /* a group check is ticked per person: your box shows your tick, the line shows everyone's */
  const mineTicked = t.everyone ? (t.checks || []).some(c => c.trim().toLowerCase() === (me || 'Me').trim().toLowerCase()) : t.done;
  const tag = TODO_TAGS.find(x => x.value === t.tag);
  return (
    <li className={'todo' + (t.done ? ' done' : '')}>
      <button className="box" role="checkbox" aria-checked={mineTicked} aria-label={(mineTicked ? 'Untick: ' : 'Tick off: ') + t.text}
        onClick={() => toggleTodo(ix.trip.id, t.id)}>{mineTicked ? '✓' : ''}</button>
      <div>
        <div className="item-h"><span className="item-n">{t.text}</span>{tag && <span className={'ttag t-' + tag.value}>{tag.label}</span>}{t.mine && <Pill>Just you</Pill>}</div>
        {t.everyone && <div className="checks">Everyone: {(t.checks || []).length} of {ix.trip.travelers.length || '?'}{(t.checks || []).length ? ` · ${t.checks!.join(', ')}` : ''}</div>}
        {t.when && <div className="when">{t.when}</div>}
        {!brief && <Txt text={t.details} className="item-d" />}
        {!brief && (
          <div className="meta">
            {t.link && <Ext href={t.link}>Open link</Ext>}
            {t.done && t.doneBy && <span>Ticked by {t.doneBy}</span>}
            <button className="linkbtn" onClick={() => edit({ kind: 'todo', id: t.id })}>Edit</button>
          </div>
        )}
      </div>
    </li>
  );
}

