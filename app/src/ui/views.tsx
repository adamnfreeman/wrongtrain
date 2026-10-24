/* Today, Days, Transit, Places and To do. */
import { Weather } from './weather';
import { useState } from 'react';
import type { Place } from '../model/types';
import { lineOf, lineOfDest, runs, cityOf, mapsLink } from '../model/trip';
import { longDate, shortDate, stamp } from '../model/time';
import { onToday } from '../model/next';
import { addNote, editNote, toggleNote, getState } from '../model/store';
import { JAPAN } from '../edition';
import { visibleTodos } from '../model/todos';
import { Avatar, useAvatarFor } from './avatar';
import { Requests } from './requests';
import { useSync } from '../sync/engine';
import { canFile, dismissFiling, fileNote, undoFile, useFilings, type NoteFiling } from '../sync/filing';
import { Empty, Fold, Pill, SecH, Txt, line } from './bits';
import { Board, DayBody, DaySlider, EatItem, LegItem, TodoItem, VegToggle, vegOk } from './day';
import { NextCard } from './next';
import { useApp } from './ctx';

/* ---------- Today ---------- */

export function Today() {
  const { ix, now, go, me } = useApp();
  const days = ix.trip.days;
  if (!days.length) return <Empty>This trip has no days yet.</Empty>;
  if (now.phase === 'during' && now.cur) {
    return (
      <>
        <Board d={now.cur} compact />
        <Weather ix={ix} day={now.cur} live />
        <NextCard />
        <DayBody d={now.cur} />
      </>
    );
  }
  const rs = runs(ix);
  const big = now.phase === 'after' ? 'Trip complete' : now.togo > 1 ? `${now.togo} days to go` : now.togo === 1 ? 'Tomorrow' : 'Time to go';
  const open = visibleTodos(ix.trip.todos, me).filter(t => t.group === ix.trip.todoGroups[0] && !t.done);
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
      {now.phase === 'before' && <Weather ix={ix} day={days[0]} live={false} />}
      {now.phase === 'before' && open.length > 0 && (
        <section className="sec">
          <SecH title="Next to do"><button className="linkbtn" onClick={() => go('prep')}>All {open.length}</button></SecH>
          <ul className="sheet">{open.slice(0, 3).map(t => <TodoItem key={t.id} t={t} brief />)}</ul>
        </section>
      )}
      {now.phase === 'before' && <NextCard />}
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
    </div>
  );
}

/* ---------- Transit ---------- */

export function Transit() {
  const { ix, go, edit, now } = useApp();
  const legs = ix.trip.legs;
  const booked = legs.filter(l => l.status === 'booked').length, open = legs.filter(l => l.status === 'todo').length;
  const before = legs.filter(l => !l.dayId);
  return (
    <>
      <h1 className="page-h">Getting around</h1>
      <p className="lede">{legs.length ? `${legs.length} legs. ${booked} booked, ${open} still need something.` : 'Flights, trains, transfers: everything that gets you from place to place.'}</p>
      <div className="chips" style={{ marginTop: 0 }}><button className="chipbtn go" onClick={() => edit({ kind: 'leg' })}>+ Add a leg</button></div>
      {/* each day's travel folded, with only the next day that has any open: the whole trip's
          legs at once were too much to take in */}
      {(() => {
        const withLegs = ix.trip.days.filter(d => legs.some(l => l.dayId === d.id));
        const todayIso = now.cur?.date || (now.phase === 'after' ? '9999' : '');
        const past = withLegs.filter(d => todayIso && d.date < todayIso), coming = withLegs.filter(d => !(todayIso && d.date < todayIso));
        const day = (d: (typeof withLegs)[number], open: boolean) => {
          const ls = legs.filter(l => l.dayId === d.id), todo = ls.filter(l => l.status === 'todo').length;
          return (
            <div key={d.id} className="legday" style={line(lineOf(ix, d))}>
              <Fold title={`${longDate(d.date)} · ${cityOf(ix, d)}`} count={todo ? `${ls.length} · ${todo} to sort` : ls.length} open={open}>
                <ul className="sheet">{ls.map(l => <LegItem key={l.id} l={l} />)}</ul>
                <button className="linkbtn" onClick={() => go('days', d.id)}>Day plan</button>
              </Fold>
            </div>
          );
        };
        return <>
          {before.length > 0 && <Fold title="Before the trip" count={before.length} open={now.phase === 'before' && !coming.length}><ul className="sheet">{before.map(l => <LegItem key={l.id} l={l} />)}</ul></Fold>}
          {coming.map((d, i) => day(d, i === 0))}
          {past.length > 0 && <Fold title="Already travelled" count={past.length}>{past.map(d => day(d, false))}</Fold>}
        </>;
      })()}
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

/* Places by category, for one city at a time: a tile per kind with how many there are, and the
   list for the tile you pick. (One long list of every place in every city was too much.) A
   wishlist place shows under its own kind too, marked; the Wishlist tile gathers them all. */
const CATS: { key: string; label: string; icon: string; has: (p: Place) => boolean }[] = [
  { key: 'food', label: 'Food', icon: '🍜', has: p => p.kind === 'food' },
  { key: 'coffee', label: 'Coffee', icon: '☕', has: p => p.kind === 'coffee' },
  { key: 'sight', label: 'Sights', icon: '⛩️', has: p => p.kind === 'sight' || p.kind === 'other' },
  { key: 'area', label: 'Areas', icon: '🏮', has: p => p.kind === 'area' },
  { key: 'shop', label: 'Shops', icon: '🛍️', has: p => p.kind === 'shop' },
  { key: 'stay', label: 'Stays', icon: '🛏️', has: p => p.kind === 'stay' },
  { key: 'event', label: 'Booked', icon: '🎟️', has: p => p.kind === 'event' },
  { key: 'wish', label: 'Wishlist', icon: '⭐', has: p => !!p.wishlist },
];

export function Places() {
  const { ix, ui, set, edit } = useApp();
  const inCity = ix.trip.places.filter(p => (ui.dest === 'all' || p.destinationId === ui.dest) && p.kind !== 'transit');
  const counts = CATS.map(c => ({ ...c, n: inCity.filter(c.has).length }));
  const cat = counts.find(c => c.key === ui.seg && c.n) || counts.find(c => c.n);
  const dayOf = (p: Place) => ix.trip.days.find(d => onToday(p, d));
  const list = cat ? inCity.filter(cat.has).filter(p => !(cat.key === 'food' || cat.key === 'coffee') || vegOk(p, ui.veg)) : [];
  const food = cat?.key === 'food' || cat?.key === 'coffee';
  return (
    <>
      <h1 className="page-h">Places</h1>
      <div className="chips"><DestChips /></div>
      {counts.some(c => c.n) ? (
        <div className="cattiles" role="group" aria-label="Kind of place">
          {counts.filter(c => c.n).map(c => (
            <button key={c.key} className="cattile" aria-pressed={cat?.key === c.key} onClick={() => set({ seg: c.key })}>
              <span aria-hidden="true">{c.icon}</span><b>{c.label}</b><small>{c.n}</small>
            </button>
          ))}
        </div>
      ) : <Empty>{ix.trip.places.length ? 'No places in this city yet.' : 'No places yet. Use Add to put in somewhere to eat, a sight or a shop.'}</Empty>}
      <div className="chips"><button className="linkbtn" onClick={() => edit({ kind: 'place', as: cat?.key === 'food' || cat?.key === 'coffee' ? 'food' : 'sight', ...(ui.dest !== 'all' ? { destinationId: ui.dest } : {}) })}>+ Add a place</button></div>
      {cat && (
        <div id="results">
          {food && ix.trip.places.some(p => p.diet) && <div className="chips"><VegToggle /></div>}
          {list.length ? <ul className="sheet">{list.map(p => food ? <EatItem key={p.id} p={p} /> : <IdeaItem key={p.id} p={p} day={dayOf(p)?.date} />)}</ul>
            : <Empty>Nothing here for that filter.</Empty>}
        </div>
      )}
    </>
  );
}

function IdeaItem({ p, day }: { p: Place; day?: string }) {
  const { ix, edit } = useApp();
  return (
    <li>
      <div className="item-h"><span className="item-n">{p.name}</span>{day && <Pill kind="ok">On {shortDate(day)}</Pill>}{p.wishlist && <Pill>Wishlist</Pill>}</div>
      <Txt text={p.notes} className="item-d" />
      <div className="meta">{p.area && <span>{p.area}</span>}<a href={mapsLink(ix, p)} target="_blank" rel="noopener noreferrer">Find in Maps</a><button className="linkbtn" onClick={() => edit({ kind: 'place', id: p.id })}>Edit</button></div>
    </li>
  );
}

/* ---------- To do ---------- */

export function Prep() {
  const { ix, edit, me } = useApp();
  const t = ix.trip;
  return (
    <>
      <h1 className="page-h">To do</h1>
      <Requests trip={t} />
      <Notes />
      <p className="lede" style={{ marginTop: 22 }}>Tap a box to tick it off for everyone on the trip.</p>
      {t.todoGroups.map(g => {
        const items = visibleTodos(t.todos, me).filter(x => x.group === g), open = items.filter(x => !x.done), done = items.filter(x => x.done);
        return (
          <section key={g} className="blk">
            <SecH title={g}><span className="kicker">{open.length} open</span></SecH>
            {open.length ? <ul className="sheet">{open.map(x => <TodoItem key={x.id} t={x} />)}</ul> : <Empty>{items.length ? 'All done.' : 'Nothing on this list yet.'}</Empty>}
            {done.length > 0 && <Fold title="Done" count={done.length}><ul className="sheet">{done.map(x => <TodoItem key={x.id} t={x} />)}</ul></Fold>}
            <button className="linkbtn" onClick={() => edit({ kind: 'todo', group: g })}>+ Add a to-do</button>
          </section>
        );
      })}
    </>
  );
}

/** The trip's guides ("Before you go" and the like), each folded. On the Trip page (#60). */
export function Guides() {
  const t = useApp().ix.trip;
  return <>{t.guides.map((g, i) => (
    <div key={g.id}>
      {g.group !== t.guides[i - 1]?.group && <h3 className="group-h">{g.group}</h3>}
      <Fold title={g.title} count={g.items.length}>
        <ul className="sheet">{g.items.map((r, i) => <li key={i}><div className="item-h"><span className="item-n">{r.title}</span></div><Txt text={r.body} className="item-d" /></li>)}</ul>
      </Fold>
    </div>
  ))}</>;
}

function NoteFace({ tripId, name }: { tripId: string; name: string }) {
  return <Avatar name={name} src={useAvatarFor(tripId, name)} size={20} />;
}

function Notes() {
  const { ix } = useApp();
  const { session } = useSync();
  const filings = useFilings();
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [fixing, setFixing] = useState<{ id: string; text: string } | null>(null);
  const t = ix.trip, claude = canFile(t.id, !!session), shared = !!getState().sync[t.id];
  /* why Claude is not filing notes here, so a note that just sits there is not a mystery */
  const why = claude || JAPAN ? '' : t.sample ? 'Notes are filed into the trip automatically on your own shared trips, not the sample.'
    : !shared ? 'To have notes filed into the trip automatically, share it: Trip settings, then Share with the group.'
    : !session ? 'Sign in to have notes filed into the trip automatically.' : '';
  const all = t.notes.slice().reverse();
  /* a note Claude just filed stays in view, with what was filed, until you tap OK */
  const open = all.filter(n => !n.done || filings[n.id]), done = all.filter(n => n.done && !filings[n.id]);
  const add = () => {
    if (!draft.trim()) return setMsg({ text: 'Write the note first.', bad: true });
    const id = addNote(t.id, draft); setDraft('');
    if (id && claude) { setMsg(null); void fileNote(t.id, id); } else setMsg({ text: JAPAN ? 'Saved to the Group Notes tab in the sheet.' : shared ? 'Added for everyone on the trip.' : 'Added.', bad: false });
  };
  /* only the writer may change a note: notes carry a name, not an account, so match the name */
  const mine = (n: (typeof all)[number]) => !JAPAN && (n.author === (getState().me || 'Me') || !shared);
  const saveFix = (n: (typeof all)[number]) => {
    if (!fixing || !editNote(t.id, n.id, fixing.text)) return setMsg({ text: 'Write the note first.', bad: true });
    setFixing(null);
    /* not filed yet: file the new wording. Already filed: what was filed stays, and filing again is a tap away */
    if (claude && !n.done && !n.filed) { setMsg(null); void fileNote(t.id, n.id); }
    else setMsg({ text: n.filed && claude ? 'Changed. What was already filed from it stays; tap File it again to add anything new.' : 'Changed.', bad: false });
  };
  const item = (n: (typeof all)[number]) => fixing?.id === n.id ? (
    <li key={n.id} className="todo">
      <span />
      <div>
        <textarea className="search notebox" rows={3} maxLength={600} value={fixing.text} autoFocus aria-label="Change your note"
          onChange={e => setFixing({ id: n.id, text: e.target.value })} />
        <div className="chips"><button className="chipbtn go" onClick={() => saveFix(n)}>Save</button><button className="chipbtn" onClick={() => setFixing(null)}>Cancel</button></div>
      </div>
    </li>
  ) : (
    <li key={n.id} className={'todo' + (n.done ? ' done' : '')}>
      <button className="box" role="checkbox" aria-checked={n.done} aria-label={(n.done ? 'Reopen: ' : 'Mark dealt with: ') + n.text} disabled={JAPAN} onClick={() => toggleNote(t.id, n.id)}>{n.done ? '✓' : ''}</button>
      <div>
        <div className="kick notewho"><NoteFace tripId={t.id} name={n.author} />{n.author} · {stamp(n.at)}{n.edited && ' · changed'}</div><p className="item-d">{n.text}</p>
        {filings[n.id] ? <Filed tripId={t.id} noteId={n.id} f={filings[n.id]} />
          : <>
            {n.filed && <p className="filed">{n.filed}</p>}
            {/* under Dealt with: what it became, so a ticked note says where its contents went */}
            {n.done && n.made?.length ? <ul className="madelist">{n.made.map((m, i) => <li key={i}>{m}</li>)}</ul>
              : n.done && !n.filed ? <p className="filed">Ticked off by hand.</p> : null}
            {((claude && !n.done) || mine(n)) && <div className="meta">
              {claude && !n.done && <button className="linkbtn" onClick={() => void fileNote(t.id, n.id)}>{n.filed ? 'File it again' : 'File it into the trip'}</button>}
              {mine(n) && <button className="linkbtn" onClick={() => setFixing({ id: n.id, text: n.text })}>Edit</button>}
            </div>}
          </>}
      </div>
    </li>
  );
  return (
    <section className="blk" id="gnotes">
      <SecH title="Group notes"><span className="kicker">{open.filter(n => !n.done).length} open</span></SecH>
 <p className="note">{JAPAN
        ? 'More than a to-do list: this is how things get added to the trip. Leave a note with what you want added (a shop, somewhere to eat, a sight, something to pack). It goes to the Group Notes tab in the sheet and is filed within about an hour.'
        : claude
        ? 'Leave a note with something to add: somewhere to eat, a sight, a shop, something to book or pack. WrongTrain files it into the trip for everyone: places, days, travel, to-dos.'
        : 'Ideas, questions and things to add, for everyone on the trip to see.'}{why && <> {why}</>}</p>
      <textarea className="search notebox" id="gnote" rows={3} maxLength={600} value={draft} onChange={e => setDraft(e.target.value)}
        placeholder={claude ? 'For example: add the ramen place near the hotel to Nov 3' : 'For example: can we fit in a sentō one evening?'} aria-label="Your note" />
      <div className="chips"><button className="chipbtn go" onClick={add}>Add note</button></div>
      {msg && <p className={'geomsg' + (msg.bad ? ' bad' : '')} role="status">{msg.text}</p>}
      {/* a note being filed right now stays in view; notes left open fold away instead of sitting on top */}
      {open.filter(n => filings[n.id]).length > 0 && <ul className="sheet" style={{ marginTop: 12 }}>{open.filter(n => filings[n.id]).map(item)}</ul>}
      {open.filter(n => !filings[n.id]).length > 0 && (
        <Fold title="Open notes" count={open.filter(n => !filings[n.id]).length}
          note={claude ? 'Not filed into the trip yet. File one, or tick it once it’s dealt with.' : 'Tick a note once it’s dealt with.'}>
          <ul className="sheet">{open.filter(n => !filings[n.id]).map(item)}</ul>
        </Fold>
      )}
      {done.length > 0 && <Fold title="Dealt with" count={done.length}><ul className="sheet">{done.map(item)}</ul></Fold>}
    </section>
  );
}

/** What Claude just did with a note: still working, what it filed (with Undo), or what went wrong. */
export function Filed({ tripId, noteId, f }: { tripId: string; noteId: string; f: NoteFiling }) {
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
