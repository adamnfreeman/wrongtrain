/* Today, Days, Transit, Places and To do. */
import { useState } from 'react';
import type { Place } from '../model/types';
import { lineOf, lineOfDest, runs, cityOf, mapsLink } from '../model/trip';
import { longDate, shortDate, stamp } from '../model/time';
import { onToday } from '../model/next';
import { addNote, toggleNote, getState } from '../model/store';
import { Requests } from './requests';
import { useSync } from '../sync/engine';
import { canFile, dismissFiling, fileNote, undoFile, useFilings, type NoteFiling } from '../sync/filing';
import { Empty, Fold, Pill, SecH, Txt, line } from './bits';
import { Board, DayBody, DaySlider, EatItem, LegItem, RouteList, TodoItem, VegToggle, vegOk } from './day';
import { NextCard } from './next';
import { Nearby } from './nearby';
import { DayPhotos } from './photos';
import { useApp } from './ctx';

/* ---------- Today ---------- */

export function Today() {
  const { ix, now, go } = useApp();
  const days = ix.trip.days;
  if (!days.length) return <Empty>This trip has no days yet.</Empty>;
  if (now.phase === 'during' && now.cur) {
    return (
      <>
        <Board d={now.cur} compact />
        <NextCard />
        <div className="glances">
          <DayBody d={now.cur} glance />
          <Nearby />
        </div>
      </>
    );
  }
  const rs = runs(ix);
  const big = now.phase === 'after' ? 'Trip complete' : now.togo > 1 ? `${now.togo} days to go` : now.togo === 1 ? 'Tomorrow' : 'Time to go';
  const open = ix.trip.todos.filter(t => t.group === ix.trip.todoGroups[0] && !t.done);
  return (
    <>
      <header className="board">
        <div className="board-main">
          <div className="kicker">{ix.trip.name} · {shortDate(days[0].date)} – {shortDate(days[days.length - 1].date)}</div>
          <h1>{big}</h1>
          <p className="board-sub">{days.length} days, {rs.length} {rs.length === 1 ? 'stop' : 'stops'}, one line.</p>
        </div>
        <div className="legs3">
          {rs.map(r => (
            <button key={r.start.id} className="band-btn" style={line(lineOfDest(r.dest))} onClick={() => go('days', r.start.id)}>
              <small>{shortDate(r.start.date)}</small>{r.dest.name}
            </button>
          ))}
        </div>
      </header>
      {now.phase === 'before' && open.length > 0 && (
        <section className="sec">
          <SecH title="Next to do"><button className="linkbtn" onClick={() => go('prep')}>All {open.length}</button></SecH>
          <ul className="sheet">{open.slice(0, 3).map(t => <TodoItem key={t.id} t={t} brief />)}</ul>
        </section>
      )}
      {now.phase === 'before' && <NextCard />}
      <Nearby />
    </>
  );
}

/* ---------- Days ---------- */

export function Days() {
  const { ix, ui } = useApp();
  const d = ix.trip.days.find(x => x.id === ui.day) || ix.trip.days[0];
  if (!d) return <Empty>This trip has no days yet.</Empty>;
  return (
    <div>
      <DaySlider cur={d} />
      <Board d={d} />
      <DayBody d={d} />
      <DayPhotos d={d} />
      <section className="sec"><SecH title="The whole route" /><RouteList /></section>
    </div>
  );
}

/* ---------- Transit ---------- */

export function Transit() {
  const { ix, go, edit } = useApp();
  const legs = ix.trip.legs;
  const booked = legs.filter(l => l.status === 'booked').length, open = legs.filter(l => l.status === 'todo').length;
  const before = legs.filter(l => !l.dayId);
  return (
    <>
      <h1 className="page-h">Getting around</h1>
      <p className="lede">{legs.length ? `${legs.length} legs. ${booked} booked, ${open} still need something.` : 'Flights, trains, transfers: everything that gets you from place to place.'}</p>
      <div className="chips" style={{ marginTop: 0 }}><button className="chipbtn go" onClick={() => edit({ kind: 'leg' })}>+ Add a leg</button></div>
      {before.length > 0 && <section className="blk"><SecH title="Before the trip" /><ul className="sheet">{before.map(l => <LegItem key={l.id} l={l} />)}</ul></section>}
      {ix.trip.days.map(d => {
        const ls = legs.filter(l => l.dayId === d.id); if (!ls.length) return null;
        return (
          <section key={d.id} className="blk" style={line(lineOf(ix, d))}>
            <SecH title={`${longDate(d.date)} · ${cityOf(ix, d)}`}><button className="linkbtn" onClick={() => go('days', d.id)}>Day plan</button></SecH>
            <ul className="sheet">{ls.map(l => <LegItem key={l.id} l={l} />)}</ul>
          </section>
        );
      })}
      {!legs.length && <Empty>No legs yet.</Empty>}
    </>
  );
}

/* ---------- Places ---------- */

export function DestChips() {
  const { ix, ui, set } = useApp();
  if (ix.trip.destinations.length < 2) return null;
  return (
    <>
      <button className="chipbtn" aria-pressed={ui.dest === 'all'} onClick={() => set({ dest: 'all' })}>All</button>
      {ix.trip.destinations.map(d => (
        <button key={d.id} className="chipbtn" style={line(d.color)} aria-pressed={ui.dest === d.id} onClick={() => set({ dest: d.id })}>{d.name}</button>
      ))}
    </>
  );
}

const IDEA = new Set(['sight', 'area', 'shop', 'other']);

export function Places() {
  const { ix, ui, set, edit } = useApp();
  const hasDiet = ix.trip.places.some(p => p.diet);
  const groups = ix.trip.destinations.filter(d => ui.dest === 'all' || d.id === ui.dest);
  /* which day, if any, each place is planned for */
  const dayOf = (p: Place) => ix.trip.days.find(d => onToday(p, d));
  let body: React.ReactNode[] = [];
  if (ui.seg === 'food') {
    groups.forEach(dest => {
      (['food', 'coffee'] as const).forEach(kind => {
        const list = ix.trip.places.filter(p => p.destinationId === dest.id && p.kind === kind && vegOk(p, ui.veg));
        if (!list.length) return;
        body.push(
          <section key={dest.id + kind} className="blk" style={line(dest.color)}>
            <h3>{dest.name} · {kind === 'food' ? 'Food' : 'Coffee'}</h3>
            <ul className="sheet">{list.map(p => <EatItem key={p.id} p={p} />)}</ul>
          </section>,
        );
      });
    });
  } else {
    groups.forEach(dest => {
      const list = ix.trip.places.filter(p => p.destinationId === dest.id && IDEA.has(p.kind) && !p.wishlist);
      if (list.length) body.push(<h3 key={dest.id + 'h'} className="group-h">{dest.name}</h3>, <Fold key={dest.id} title="Things to see and do" count={list.length} open>
        <ul className="sheet">{list.map(p => <IdeaItem key={p.id} p={p} day={dayOf(p)?.date} />)}</ul></Fold>);
      const wish = ix.trip.places.filter(p => p.destinationId === dest.id && p.wishlist);
      if (wish.length) body.push(<Fold key={dest.id + 'w'} title="Wishlist" count={wish.length} note="Not planned yet. Add one to a day when it fits.">
        <ul className="sheet">{wish.map(p => <IdeaItem key={p.id} p={p} />)}</ul></Fold>);
    });
  }
  if (!body.length) body = [<Empty key="e">{ix.trip.places.length ? 'Nothing here for that filter.' : 'No places yet. Add somewhere to eat, a sight, or a shop.'}</Empty>];
  return (
    <>
      <h1 className="page-h">Places</h1>
      <div className="seg" role="group" aria-label="List">
        <button aria-pressed={ui.seg === 'food'} onClick={() => set({ seg: 'food' })}>Food</button>
        <button aria-pressed={ui.seg === 'ideas'} onClick={() => set({ seg: 'ideas' })}>Things to do</button>
      </div>
      <div className="chips"><DestChips />{ui.seg === 'food' && hasDiet && <VegToggle />}</div>
      <div className="chips"><button className="chipbtn go" onClick={() => edit({ kind: 'place', as: ui.seg === 'food' ? 'food' : 'sight', ...(ui.dest !== 'all' ? { destinationId: ui.dest } : {}) })}>+ Add a place</button></div>
      <div id="results">{body}</div>
    </>
  );
}

function IdeaItem({ p, day }: { p: Place; day?: string }) {
  const { ix, edit } = useApp();
  return (
    <li>
      <div className="item-h"><span className="item-n">{p.name}</span>{day && <Pill kind="ok">On {shortDate(day)}</Pill>}</div>
      <Txt text={p.notes} className="item-d" />
      <div className="meta">{p.area && <span>{p.area}</span>}<a href={mapsLink(ix, p)} target="_blank" rel="noopener noreferrer">Find in Maps</a><button className="linkbtn" onClick={() => edit({ kind: 'place', id: p.id })}>Edit</button></div>
    </li>
  );
}

/* ---------- To do ---------- */

export function Prep() {
  const { ix, edit } = useApp();
  const t = ix.trip;
  return (
    <>
      <h1 className="page-h">To do</h1>
      <Requests trip={t} />
      <Notes />
      <p className="lede" style={{ marginTop: 22 }}>Tap a box to tick it off for everyone on the trip.</p>
      {t.todoGroups.map(g => {
        const items = t.todos.filter(x => x.group === g), open = items.filter(x => !x.done), done = items.filter(x => x.done);
        return (
          <section key={g} className="blk">
            <SecH title={g}><span className="kicker">{open.length} open</span></SecH>
            {open.length ? <ul className="sheet">{open.map(x => <TodoItem key={x.id} t={x} />)}</ul> : <Empty>{items.length ? 'All done.' : 'Nothing on this list yet.'}</Empty>}
            {done.length > 0 && <Fold title="Done" count={done.length}><ul className="sheet">{done.map(x => <TodoItem key={x.id} t={x} />)}</ul></Fold>}
            <button className="linkbtn" onClick={() => edit({ kind: 'todo', group: g })}>+ Add a to-do</button>
          </section>
        );
      })}
      {t.guides.map((g, i) => {
        const head = g.group !== t.guides[i - 1]?.group ? <h3 className="group-h">{g.group}</h3> : null;
        return (
          <div key={g.id}>
            {head}
            <Fold title={g.title} count={g.items.length}>
              <ul className="sheet">{g.items.map((r, i) => <li key={i}><div className="item-h"><span className="item-n">{r.title}</span></div><Txt text={r.body} className="item-d" /></li>)}</ul>
            </Fold>
          </div>
        );
      })}
    </>
  );
}

function Notes() {
  const { ix } = useApp();
  const { session } = useSync();
  const filings = useFilings();
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const t = ix.trip, claude = canFile(t.id, !!session), shared = !!getState().sync[t.id];
  /* why Claude is not filing notes here, so a note that just sits there is not a mystery */
  const why = claude ? '' : t.sample ? 'Notes are filed into the trip automatically on your own shared trips, not the sample.'
    : !shared ? 'To have notes filed into the trip automatically, share it: Trip settings, then Share with the group.'
    : !session ? 'Sign in to have notes filed into the trip automatically.' : '';
  const all = t.notes.slice().reverse();
  /* a note Claude just filed stays in view, with what was filed, until you tap OK */
  const open = all.filter(n => !n.done || filings[n.id]), done = all.filter(n => n.done && !filings[n.id]);
  const add = () => {
    if (!draft.trim()) return setMsg({ text: 'Write the note first.', bad: true });
    const id = addNote(t.id, draft); setDraft('');
    if (id && claude) { setMsg(null); void fileNote(t.id, id); } else setMsg({ text: shared ? 'Added for everyone on the trip.' : 'Added.', bad: false });
  };
  const item = (n: (typeof all)[number]) => (
    <li key={n.id} className={'todo' + (n.done ? ' done' : '')}>
      <button className="box" role="checkbox" aria-checked={n.done} aria-label={(n.done ? 'Reopen: ' : 'Mark dealt with: ') + n.text} onClick={() => toggleNote(t.id, n.id)}>{n.done ? '✓' : ''}</button>
      <div>
        <div className="kick">{n.author} · {stamp(n.at)}</div><p className="item-d">{n.text}</p>
        {filings[n.id] ? <Filed tripId={t.id} noteId={n.id} f={filings[n.id]} />
          : <>
            {n.filed && <p className="filed">{n.filed}</p>}
            {claude && !n.done && <div className="meta"><button className="linkbtn" onClick={() => void fileNote(t.id, n.id)}>{n.filed ? 'File it again' : 'File it into the trip'}</button></div>}
          </>}
      </div>
    </li>
  );
  return (
    <section className="blk" id="gnotes">
      <SecH title="Group notes"><span className="kicker">{open.filter(n => !n.done).length} open</span></SecH>
      <p className="note">{claude
        ? 'Leave a note with something to add: somewhere to eat, a sight, a shop, something to book or pack. WrongTrain files it into the trip for everyone. Changes to plans already made wait for the owner.'
        : 'Ideas, questions and things to add, for everyone on the trip to see.'}{why && <> {why}</>}</p>
      <textarea className="search notebox" id="gnote" rows={3} maxLength={600} value={draft} onChange={e => setDraft(e.target.value)}
        placeholder={claude ? 'For example: add the ramen place near the hotel to Nov 3' : 'For example: can we fit in a sentō one evening?'} aria-label="Your note" />
      <div className="chips"><button className="chipbtn go" onClick={add}>Add note</button></div>
      {msg && <p className={'geomsg' + (msg.bad ? ' bad' : '')} role="status">{msg.text}</p>}
      {open.length > 0 && <ul className="sheet" style={{ marginTop: 12 }}>{open.map(item)}</ul>}
      {done.length > 0 && <Fold title="Dealt with" count={done.length}><ul className="sheet">{done.map(item)}</ul></Fold>}
    </section>
  );
}

/** What Claude just did with a note: still working, what it filed (with Undo), or what went wrong. */
function Filed({ tripId, noteId, f }: { tripId: string; noteId: string; f: NoteFiling }) {
  const reply = useApp().ix.trip.notes.find(n => n.id === noteId)?.filed;
  if (f.state === 'busy') return <p className="filed" role="status">Filing this into the trip…</p>;
  if (f.state === 'error') return (
    <div className="filed bad" role="status">
      {f.message}
      <div className="meta"><button className="linkbtn" onClick={() => void fileNote(tripId, noteId)}>Try again</button></div>
    </div>
  );
  const nothing = !f.added.length && !f.planned.length;
  return (
    <div className="filed" role="status">
      {reply && <p>{reply}</p>}
      {!nothing && (
        <ul>
          {f.added.map((l, i) => <li key={'a' + i}>{l}</li>)}
          {f.planned.map((l, i) => <li key={'p' + i}>{l}{f.waiting ? ' (sent to the owner for approval)' : ''}</li>)}
        </ul>
      )}
      {f.left != null && f.left <= 5 && <p>{f.left === 0 ? 'That was the last free filing on this trip.' : `${f.left} free filings left on this trip.`}</p>}
      <div className="meta">
        {!nothing && <button className="linkbtn" onClick={() => undoFile(tripId, noteId)}>Undo</button>}
        <button className="linkbtn" onClick={() => dismissFiling(noteId)}>OK</button>
      </div>
    </div>
  );
}
