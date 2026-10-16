/* A day: its station board, plan, getting around, and where to eat. Plus the route list and the
   list items other screens reuse (legs, food, to-dos). */
import type { Bullet, Day, Leg, Place, Todo } from '../model/types';
import { cityOf, codeOf, lineOf, mapsLink, stayLine } from '../model/trip';
import { dayOfMonth, fmtHM, fmtT, longDate, shortDate } from '../model/time';
import { anchorsFor } from '../model/next';
import { toggleTodo } from '../model/store';
import { Ext, Pill, Rich, SecH, Txt, line } from './bits';
import { useApp } from './ctx';

export function Board({ d }: { d: Day }) {
  const { ix, go } = useApp();
  const i = ix.dayPos.get(d.id)!, days = ix.trip.days, p = days[i - 1], n = days[i + 1];
  const stay = d.stayId ? ix.place.get(d.stayId) : undefined;
  return (
    <header className="board" style={line(lineOf(ix, d))}>
      <div className="board-main">
        <div className="kicker">Day {i + 1} of {days.length} · {longDate(d.date)}</div>
        <h1>{cityOf(ix, d)}</h1>
        <p className="board-sub">
          {stayLine(ix, d)}{stay && <> · <Ext href={mapsLink(ix, stay)}>Map</Ext></>}
        </p>
      </div>
      <div className="band">
        <button className="band-btn" disabled={!p} onClick={() => p && go('days', p.id)}>
          <small>◀ {p ? shortDate(p.date) : 'Start'}</small>{p && cityOf(ix, p)}
        </button>
        <button className="band-btn next" disabled={!n} onClick={() => n && go('days', n.id)}>
          <small>{n ? shortDate(n.date) : 'End'} ▶</small>{n && cityOf(ix, n)}
        </button>
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
  const { ix, ui, go } = useApp();
  const legs = ix.trip.legs.filter(l => l.dayId === d.id);
  const eats = d.eatIds.map(id => ix.place.get(id)).filter((p): p is Place => !!p);
  const shown = eats.filter(p => vegOk(p, ui.veg));
  const fixed = anchorsFor(ix, d);
  return (
    <>
      {d.plan.length > 0 && (
        <section className="sec" style={line(lineOf(ix, d))}>
          <SecH title="Plan" />
          <ol className="plan">
            {d.plan.map(p => {
              const place = p.placeId ? ix.place.get(p.placeId) : undefined;
              return (
                <li key={p.id}>
                  {p.time && <div className="kick">{fmtHM(p.time)}{p.end ? '–' + fmtHM(p.end) : ''}{p.fixed && (p.timeKind === 'by' ? ' · at the latest' : ' · booked')}</div>}
                  <Txt text={p.text} />
                  {p.sub?.length ? <ul className="sub">{p.sub.map((s, j) => <li key={j}><Txt text={s} /></li>)}</ul> : null}
                  {place && place.kind !== 'stay' && <div className="meta"><Ext href={mapsLink(ix, place)}>{place.name} in Maps</Ext></div>}
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
                <Txt text={a.what} className="item-d" />
              </li>
            ))}
          </ul>
        </section>
      )}
      {(legs.length > 0 || d.around.length > 0) && (
        <section className="sec">
          <SecH title="Getting around"><button className="linkbtn" onClick={() => go('transit')}>All legs</button></SecH>
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
              <span className="stop-p"><Rich text={d.summary} /></span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/* the day strip along the top of Days */
export function DayStrip({ cur }: { cur: Day }) {
  const { ix, go } = useApp();
  return (
    <div className="daystrip" id="strip">
      {ix.trip.days.map(x => (
        <button key={x.id} className="daychip" style={line(lineOf(ix, x))} aria-current={x.id === cur.id}
          aria-label={longDate(x.date)} onClick={() => go('days', x.id)}>
          {longDate(x.date).slice(0, 3)}<b>{dayOfMonth(x.date)}</b>
        </button>
      ))}
    </div>
  );
}

export function LegItem({ l }: { l: Leg }) {
  const sk = l.status === 'booked' ? 'ok' : l.status === 'todo' ? 'todo' : '';
  const label = l.statusText || (l.status === 'booked' ? 'Booked' : l.status === 'todo' ? 'To book' : 'Nothing to book');
  return (
    <li>
      <div className="item-h"><span className="item-n">{l.from} → {l.to}</span><Pill kind={sk}>{l.status === 'booked' ? '✓ ' : ''}{label}</Pill></div>
      <Txt text={l.how} className="item-d" />
      {(l.depart || l.arrive) && <div className="meta">{l.depart && <span>Leaves <span className="tm">{fmtHM(l.depart)}</span></span>}{l.arrive && <span>Arrives <span className="tm">{fmtHM(l.arrive)}</span></span>}</div>}
      {l.tickets && <><span className="lbl">Tickets</span><Txt text={l.tickets} className="item-d" /></>}
      {l.details && <><span className="lbl">Details</span><Txt text={l.details} className="item-d" /></>}
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
  const { ix } = useApp();
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
  const { ix } = useApp();
  return (
    <li className={'todo' + (t.done ? ' done' : '')}>
      <button className="box" role="checkbox" aria-checked={t.done} aria-label={(t.done ? 'Untick: ' : 'Tick off: ') + t.text}
        onClick={() => toggleTodo(ix.trip.id, t.id)}>{t.done ? '✓' : ''}</button>
      <div>
        <div className="item-h"><span className="item-n">{t.text}</span></div>
        {t.when && <div className="when">{t.when}</div>}
        {!brief && <Txt text={t.details} className="item-d" />}
        {!brief && (t.link || (t.done && t.doneBy)) && (
          <div className="meta">
            {t.link && <Ext href={t.link}>Open link</Ext>}
            {t.done && t.doneBy && <span>Ticked by {t.doneBy}</span>}
          </div>
        )}
      </div>
    </li>
  );
}

