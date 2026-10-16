/* The editors: one full-screen sheet per thing you can change. Each works on a draft and only
   touches the trip when you press Save. */
import { useMemo, useState } from 'react';
import type { Day, Destination, Leg, LegMode, LegStatus, Place, PlaceKind, PlanItem, Todo, Trip } from '../model/types';
import {
  copyTrip, deleteDay, deleteDestination, deleteLeg, deletePlace, deleteTodo, destinationUse, insertDay, newId, newTrip,
  nextColor, saveDestination, saveLeg, savePlace, saveTodo, setStart, sortPlan, updateDay, type Stop,
} from '../model/edit';
import { addTrip, deleteTrip, getState, patchTrip } from '../model/store';
import { KIND_LABEL, cityOf, indexTrip } from '../model/trip';
import { addDays, longDate, todayIn } from '../model/time';
import { PACKS } from '../phrases';
import { Sharing } from './account';
import { Check, Choice, DeleteButton, Field, Lines, PinPicker, Segs, Sheet, Swatches, Text, ZonePicker, guessZone, phoneZone, zoneLabel } from './form';

export type Edit =
  | { kind: 'trip' }
  | { kind: 'day'; id: string }
  | { kind: 'leg'; id?: string; dayId?: string }
  | { kind: 'place'; id?: string; as?: PlaceKind; dayId?: string; destinationId?: string }
  | { kind: 'todo'; id?: string; group?: string }
  | { kind: 'doc'; id?: string; for?: { kind: 'plan' | 'leg'; id: string } }
  | { kind: 'expense'; id?: string };

interface Props { trip: Trip; close: () => void; onDayChange?: (id: string) => void }

const save = (trip: Trip, f: (t: Trip) => Trip) => patchTrip(trip.id, f);

/* ---------- day ---------- */

export function DayEditor({ trip, id, close, onDayChange }: Props & { id: string }) {
  const day = trip.days.find(d => d.id === id);
  const [d, setD] = useState<Day | undefined>(day);
  const [newStay, setNewStay] = useState('');
  if (!day || !d) return null;
  const i = trip.days.indexOf(day);
  const up = (p: Partial<Day>) => setD({ ...d, ...p });
  const inDest = (p: Place) => !d.destinationId || p.destinationId === d.destinationId || !p.destinationId;
  const stays = trip.places.filter(p => p.kind === 'stay' && inDest(p));
  const eats = trip.places.filter(p => (p.kind === 'food' || p.kind === 'coffee') && inDest(p));
  const pins = trip.places.filter(p => p.kind !== 'food' || p.lat != null);
  const setItem = (k: number, p: Partial<PlanItem>) => up({ plan: d.plan.map((x, j) => (j === k ? { ...x, ...p } : x)) });
  const move = (k: number, by: number) => { const a = [...d.plan]; const [x] = a.splice(k, 1); a.splice(k + by, 0, x); up({ plan: a }); };

  const commit = () => {
    let next = { ...d, plan: d.plan.filter(p => p.text.trim() || p.time).map(p => ({ ...p, text: p.text.trim() })) };
    save(trip, t => {
      let u = t;
      if (d.stayId === '__new' && newStay.trim()) {
        const place: Place = { id: newId('p'), name: newStay.trim(), kind: 'stay', ...(d.destinationId ? { destinationId: d.destinationId } : {}) };
        u = savePlace(u, place); next = { ...next, stayId: place.id };
      } else if (d.stayId === '__new') next = { ...next, stayId: undefined };
      return updateDay(u, id, () => next);
    });
    close();
  };

  return (
    <Sheet title={`Day ${i + 1} · ${longDate(day.date)}`} onCancel={close} onSave={commit}
      footer={<>
        <button type="button" className="linkbtn" onClick={() => { commit(); const u = insertDay(getState().trips.find(t => t.id === trip.id)!, id); patchTrip(trip.id, () => u); onDayChange?.(u.days[i + 1].id); }}>+ Add a day after this one</button>
        {trip.days.length > 1 && <DeleteButton label="Delete this day" confirmText={`Delete day ${i + 1} (${longDate(day.date)})? Its plan and legs go too, and later days move one day earlier.`}
          onDelete={() => { save(trip, t => deleteDay(t, id)); close(); onDayChange?.((trip.days[i + 1] || trip.days[i - 1]).id); }} />}
      </>}>
      <Choice label="Where" value={d.destinationId || ''} onChange={v => up({ destinationId: v || undefined })}
        options={[...trip.destinations.map(x => ({ value: x.id, label: x.name })), { value: '', label: 'In transit' }]} />
      <Check label="Travel day" checked={!!d.travel} onChange={v => up({ travel: v })} hint="Flights or long journeys; shown in the travel colour." />
      <Text label="Heading" value={d.title || ''} onChange={v => up({ title: v || undefined })} placeholder={cityOf(indexTrip(trip), { ...d, title: undefined }) || 'e.g. Kyoto → Nara → Osaka'}
        hint="Leave empty to use the destination's name." />
      <Text label="In one line" value={d.summary} onChange={v => up({ summary: v })} placeholder="e.g. Temples in the morning, market lunch, teamLab at 5" hint="Shown in the route list." />
      <Choice label="Where you sleep" value={d.stayId || ''} onChange={v => up({ stayId: v || undefined })}
        options={[{ value: '', label: 'Nowhere set' }, ...stays.map(p => ({ value: p.id, label: p.name })), { value: '__new', label: 'Somewhere new…' }]} />
      {d.stayId === '__new' && <Text label="Name of the place to stay" value={newStay} onChange={setNewStay} autoFocus placeholder="e.g. Hotel Granvia Kyoto" />}

      <h3 className="fsec">Plan</h3>
      {d.plan.map((p, k) => (
        <div key={p.id} className="planrow">
          <div className="prow-top">
            <input className="input time" type="time" value={p.time || ''} aria-label={`Time for item ${k + 1}`} onChange={e => setItem(k, { time: e.target.value || undefined })} />
            <span className="grow" />
            <button type="button" className="iconbtn" aria-label="Move up" disabled={k === 0} onClick={() => move(k, -1)}>↑</button>
            <button type="button" className="iconbtn" aria-label="Move down" disabled={k === d.plan.length - 1} onClick={() => move(k, 1)}>↓</button>
            <button type="button" className="iconbtn" aria-label={`Remove item ${k + 1}`} onClick={() => up({ plan: d.plan.filter((_, j) => j !== k) })}>✕</button>
          </div>
          <textarea className="input area sm" rows={2} value={p.text} placeholder="What's happening" aria-label={`Plan item ${k + 1}`} onChange={e => setItem(k, { text: e.target.value })} />
          <select className="input" value={p.placeId || ''} aria-label={`Place for item ${k + 1}`} onChange={e => setItem(k, { placeId: e.target.value || undefined })}>
            <option value="">No place</option>
            {pins.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <div className="prow-checks">
            <Check label="Be on time" checked={!!p.fixed} onChange={v => setItem(k, { fixed: v })} hint="A booking or meeting time." />
            {p.fixed && <Check label="It's a deadline" checked={p.timeKind === 'by'} onChange={v => setItem(k, { timeKind: v ? 'by' : undefined })} hint="Be there by this time, at the latest." />}
          </div>
        </div>
      ))}
      <div className="chips">
        <button type="button" className="chipbtn" onClick={() => up({ plan: [...d.plan, { id: newId('i'), text: '' }] })}>+ Add to the plan</button>
        {d.plan.some(p => p.time) && <button type="button" className="chipbtn" onClick={() => up({ plan: sortPlan(d.plan) })}>Sort by time</button>}
      </div>

      <h3 className="fsec">Notes for the day</h3>
      <Lines label="Getting around" items={d.around.map(b => b.text)} placeholder="e.g. Buses are a flat ¥230"
        onChange={v => up({ around: v.map((text, k) => ({ ...d.around[k], text })) })} />
      <Lines label="Good to know" items={d.tips.map(b => b.text)} placeholder="e.g. Most shops open at 10"
        onChange={v => up({ tips: v.map((text, k) => ({ ...d.tips[k], text })) })} />

      <div className="field">
        <span className="flabel">Where to eat</span>
        {eats.length ? (
          <div className="chips" style={{ marginTop: 0 }}>
            {eats.map(p => {
              const on = d.eatIds.includes(p.id);
              return <button type="button" key={p.id} className="chipbtn plain" aria-pressed={on} onClick={() => up({ eatIds: on ? d.eatIds.filter(x => x !== p.id) : [...d.eatIds, p.id] })}>{p.name}</button>;
            })}
          </div>
        ) : <p className="fhint">Add food and coffee places on the Places tab, then pick them here.</p>}
      </div>
    </Sheet>
  );
}

/* ---------- leg ---------- */

const MODES: { value: LegMode; label: string }[] = [
  { value: 'flight', label: 'Flight' }, { value: 'train', label: 'Train' }, { value: 'subway', label: 'Subway' }, { value: 'bus', label: 'Bus' },
  { value: 'car', label: 'Car or taxi' }, { value: 'ferry', label: 'Ferry' }, { value: 'walk', label: 'Walk' }, { value: 'other', label: 'Other' },
];
const STATUSES: { value: LegStatus; label: string }[] = [{ value: 'booked', label: 'Booked' }, { value: 'todo', label: 'To book' }, { value: 'none', label: 'Nothing to book' }];

export function LegEditor({ trip, id, dayId, close }: Props & { id?: string; dayId?: string }) {
  const orig = id ? trip.legs.find(l => l.id === id) : undefined;
  const [l, setL] = useState<Leg>(orig || { id: newId('l'), dayId, from: '', to: '', mode: 'train', how: '', status: 'todo' });
  const up = (p: Partial<Leg>) => setL({ ...l, ...p });
  const stations = trip.places.filter(p => p.lat != null);
  const ix = useMemo(() => indexTrip(trip), [trip]);
  const ok = l.from.trim() && l.to.trim();
  const commit = () => { save(trip, t => saveLeg(t, { ...l, from: l.from.trim(), to: l.to.trim(), statusText: undefined })); close(); };
  return (
    <Sheet title={orig ? 'Edit leg' : 'New leg'} onCancel={close} onSave={commit} canSave={!!ok}
      footer={orig && <DeleteButton label="Delete this leg" confirmText={`Delete ${l.from} → ${l.to}?`} onDelete={() => { save(trip, t => deleteLeg(t, l.id)); close(); }} />}>
      <Choice label="When" value={l.dayId || ''} onChange={v => up({ dayId: v || undefined })}
        options={[{ value: '', label: 'Before the trip' }, ...trip.days.map((d, k) => ({ value: d.id, label: `Day ${k + 1} · ${longDate(d.date)} · ${cityOf(ix, d)}` }))]} />
      <div className="frow">
        <Text label="From" value={l.from} onChange={v => up({ from: v })} placeholder="Kyoto" autoFocus={!orig} />
        <Text label="To" value={l.to} onChange={v => up({ to: v })} placeholder="Osaka" />
      </div>
      <Segs label="How" value={l.mode} onChange={v => up({ mode: v })} options={MODES} />
      <Text label="Service and seats" value={l.how} onChange={v => up({ how: v })} placeholder="e.g. Nozomi shinkansen, reserved, seats E" />
      <div className="frow">
        <Text label="Leaves" type="time" value={l.depart || ''} onChange={v => up({ depart: v || undefined })} />
        <Text label="Arrives" type="time" value={l.arrive || ''} onChange={v => up({ arrive: v || undefined })} />
      </div>
      <Choice label="Leaves from" value={l.fromPlaceId || ''} onChange={v => up({ fromPlaceId: v || undefined })}
        hint="Pick the station or airport so Today can tell you when to leave for it."
        options={[{ value: '', label: 'No map pin' }, ...stations.map(p => ({ value: p.id, label: p.name }))]} />
      <Segs label="Booking" value={l.status} onChange={v => up({ status: v })} options={STATUSES} />
      <Text label="Tickets" value={l.tickets || ''} onChange={v => up({ tickets: v || undefined })} placeholder="e.g. Smart EX app, or buy at the station" />
      <Text label="Details" multiline value={l.details || ''} onChange={v => up({ details: v || undefined })} placeholder="Booking references, platforms, anything else" />
    </Sheet>
  );
}

/* ---------- place ---------- */

const KINDS: PlaceKind[] = ['sight', 'area', 'food', 'coffee', 'shop', 'stay', 'event', 'transit', 'other'];
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function PlaceEditor({ trip, id, as, dayId, destinationId, close }: Props & { id?: string; as?: PlaceKind; dayId?: string; destinationId?: string }) {
  const orig = id ? trip.places.find(p => p.id === id) : undefined;
  const fallbackDest = destinationId || (dayId ? trip.days.find(d => d.id === dayId)?.destinationId : undefined) || trip.destinations[0]?.id;
  const [p, setP] = useState<Place>(orig || { id: newId('p'), name: '', kind: as || 'sight', ...(fallbackDest ? { destinationId: fallbackDest } : {}), ...(dayId ? { dayIds: [dayId] } : {}) });
  const up = (x: Partial<Place>) => setP({ ...p, ...x });
  const hours = p.hours === '24h' ? null : p.hours;
  const near = useMemo(() => trip.places.filter(x => x.lat != null && (!p.destinationId || x.destinationId === p.destinationId)).map(x => [x.lat!, x.lng!] as [number, number]), [trip.places, p.destinationId]);
  const food = p.kind === 'food' || p.kind === 'coffee';
  const commit = () => {
    const clean: Place = { ...p, name: p.name.trim() };
    if (!food) { delete clean.diet; delete clean.dietNote; }
    if (clean.hours && clean.hours !== '24h' && !(clean.hours.open && clean.hours.close)) delete clean.hours;
    save(trip, t => savePlace(t, clean)); close();
  };
  return (
    <Sheet title={orig ? 'Edit place' : 'New place'} onCancel={close} onSave={commit} canSave={!!p.name.trim()}
      footer={orig && <DeleteButton label="Delete this place" confirmText={`Delete ${p.name}? It comes off every day it is on.`} onDelete={() => { save(trip, t => deletePlace(t, p.id)); close(); }} />}>
      <Text label="Name" value={p.name} onChange={v => up({ name: v })} placeholder="e.g. Fushimi Inari Taisha" autoFocus={!orig} />
      <Segs label="Kind" value={p.kind} onChange={v => up({ kind: v })} options={KINDS.map(k => ({ value: k, label: KIND_LABEL[k] }))} />
      {trip.destinations.length > 0 && <Choice label="Destination" value={p.destinationId || ''} onChange={v => up({ destinationId: v || undefined })}
        options={[...trip.destinations.map(d => ({ value: d.id, label: d.name })), { value: '', label: 'Somewhere else' }]} />}
      <Text label="Area or address" value={p.area || ''} onChange={v => up({ area: v || undefined })} placeholder="e.g. Near Nishiki Market" />
      <Text label="Notes" multiline value={p.notes || ''} onChange={v => up({ notes: v || undefined })} placeholder="Why go, what to order, when it's quietest" />
      <PinPicker lat={p.lat} lng={p.lng} near={near} onChange={c => up(c)} />
      <div className="field">
        <span className="flabel">Opening hours</span>
        <Check label="Open 24 hours" checked={p.hours === '24h'} onChange={v => up({ hours: v ? '24h' : undefined })} />
        {p.hours !== '24h' && (
          <div className="frow">
            <Text label="Opens" type="time" value={hours?.open || ''} onChange={v => up({ hours: { open: v, close: hours?.close || '' } })} />
            <Text label="Closes" type="time" value={hours?.close || ''} onChange={v => up({ hours: { open: hours?.open || '', close: v } })} />
          </div>
        )}
        <span className="flabel" style={{ marginTop: 10 }}>Closed on</span>
        <div className="chips" style={{ marginTop: 0 }}>
          {WEEK.map((w, k) => {
            const on = !!p.closedDays?.includes(k);
            return <button type="button" key={w} className="chipbtn plain" aria-pressed={on} onClick={() => up({ closedDays: on ? p.closedDays!.filter(x => x !== k) : [...(p.closedDays || []), k] })}>{w}</button>;
          })}
        </div>
      </div>
      {food && (
        <>
          <Segs label="Vegetarian" value={p.diet || ('' as never)} onChange={v => up({ diet: (v as string) ? v : undefined })}
            options={[{ value: 'veg', label: 'Veg-friendly' }, { value: 'veg-some', label: 'Some veg' }, { value: 'no', label: 'Not veg' }, { value: '' as never, label: 'Not sure' }]} />
          <Text label="About the menu" value={p.dietNote || ''} onChange={v => up({ dietNote: v || undefined })} placeholder="e.g. Vegan ramen on request" />
        </>
      )}
      {trip.days.length > 0 && (
        <div className="field">
          <span className="flabel">On these days</span>
          <div className="chips" style={{ marginTop: 0 }}>
            {trip.days.map((d, k) => {
              const on = !!p.dayIds?.includes(d.id);
              return <button type="button" key={d.id} className="chipbtn plain" aria-pressed={on} aria-label={`Day ${k + 1}, ${longDate(d.date)}`}
                onClick={() => up({ dayIds: on ? p.dayIds!.filter(x => x !== d.id) : [...(p.dayIds || []), d.id] })}>{k + 1}</button>;
            })}
          </div>
          <p className="fhint">Places on a day show up in Today's suggestions for it.</p>
        </div>
      )}
      <Check label="Wishlist" checked={!!p.wishlist} onChange={v => up({ wishlist: v })} hint="Not planned yet; listed separately." />
      <Check label="Closed for good" checked={!!p.closed} onChange={v => up({ closed: v })} />
      <Text label="Link" type="url" value={p.link || ''} onChange={v => up({ link: v || undefined })} placeholder="Website or map link" />
    </Sheet>
  );
}

/* ---------- to-do ---------- */

export function TodoEditor({ trip, id, group, close }: Props & { id?: string; group?: string }) {
  const orig = id ? trip.todos.find(t => t.id === id) : undefined;
  const [t, setT] = useState<Todo>(orig || { id: newId('t'), group: group || trip.todoGroups[0] || 'Before the trip', text: '', done: false });
  const [newGroup, setNewGroup] = useState('');
  const up = (x: Partial<Todo>) => setT({ ...t, ...x });
  const g = t.group === '__new' ? newGroup.trim() : t.group;
  const commit = () => { save(trip, tr => saveTodo(tr, { ...t, group: g, text: t.text.trim() })); close(); };
  return (
    <Sheet title={orig ? 'Edit to-do' : 'New to-do'} onCancel={close} onSave={commit} canSave={!!(t.text.trim() && g)}
      footer={orig && <DeleteButton label="Delete this to-do" confirmText={`Delete “${t.text}”?`} onDelete={() => { save(trip, tr => deleteTodo(tr, t.id)); close(); }} />}>
      <Text label="To do" value={t.text} onChange={v => up({ text: v })} placeholder="e.g. Book the Narita Express" autoFocus={!orig} />
      <Choice label="List" value={t.group} onChange={v => up({ group: v })}
        options={[...trip.todoGroups.map(x => ({ value: x, label: x })), { value: '__new', label: 'New list…' }]} />
      {t.group === '__new' && <Text label="Name of the new list" value={newGroup} onChange={setNewGroup} placeholder="e.g. Packing" />}
      <Text label="When" value={t.when || ''} onChange={v => up({ when: v || undefined })} placeholder="e.g. A week before" />
      <Text label="Details" multiline value={t.details || ''} onChange={v => up({ details: v || undefined })} />
      <Text label="Link" type="url" value={t.link || ''} onChange={v => up({ link: v || undefined })} />
    </Sheet>
  );
}

/* ---------- trip settings ---------- */

const packOptions = [{ value: '', label: 'None' }, ...Object.values(PACKS).map(p => ({ value: p.lang, label: p.name }))];

export function TripSettings({ trip, close }: Props) {
  const [name, setName] = useState(trip.name);
  const [people, setPeople] = useState(trip.travelers.join(', '));
  const [start, setStartDate] = useState(trip.days[0]?.date || todayIn(phoneZone()));
  const [pack, setPack] = useState(trip.phrasePack || '');
  const [dests, setDests] = useState<Destination[]>(trip.destinations);
  const [open, setOpen] = useState<string | null>(null);
  const upDest = (id: string, p: Partial<Destination>) => setDests(dests.map(d => (d.id === id ? { ...d, ...p } : d)));
  const commit = () => {
    save(trip, t => {
      let u: Trip = { ...t, name: name.trim() || t.name, travelers: people.split(',').map(s => s.trim()).filter(Boolean), phrasePack: pack || undefined };
      dests.forEach(d => { u = saveDestination(u, { ...d, name: d.name.trim() || 'Unnamed' }); });
      t.destinations.filter(d => !dests.some(x => x.id === d.id)).forEach(d => { u = deleteDestination(u, d.id); });
      if (start && start !== t.days[0]?.date) u = setStart(u, start);
      return u;
    });
    close();
  };
  return (
    <Sheet title="Trip settings" onCancel={close} onSave={commit}
      footer={!getState().sync[trip.id] && <DeleteButton label="Delete this trip" confirmText={`Delete “${trip.name}” from this phone? This cannot be undone.`} onDelete={() => { close(); deleteTrip(trip.id); }} />}>
      <Text label="Trip name" value={name} onChange={setName} />
      <Text label="First day" type="date" value={start} onChange={setStartDate} hint={trip.days.length ? `${trip.days.length} days, ending ${longDate(addDays(start, trip.days.length - 1))}. Moving the first day moves the whole trip.` : undefined} />
      <Text label="Who's going" value={people} onChange={setPeople} placeholder="Names, separated by commas" />
      <Choice label="Phrases" value={pack} onChange={setPack} options={packOptions} hint="The language on the Phrases tab." />
      <h3 className="fsec">Sharing</h3>
      <Sharing trip={trip} onLeft={close} />
      <h3 className="fsec">Destinations</h3>
      <ul className="sheet">
        {dests.map(d => {
          const use = destinationUse(trip, d.id), inUse = use.days + use.places > 0;
          return (
            <li key={d.id}>
              <div className="item-h">
                <span className="dot" style={{ ['--pc' as string]: `var(--l-${d.color})` }} />
                <span className="item-n">{d.name || 'Unnamed'}</span>
                <span className="grow" />
                <button type="button" className="linkbtn" onClick={() => setOpen(open === d.id ? null : d.id)}>{open === d.id ? 'Done' : 'Edit'}</button>
              </div>
              <div className="meta"><span>{zoneLabel(d.timeZone)}</span><span>{use.days} days · {use.places} places</span></div>
              {open === d.id && (
                <div className="destedit">
                  <Text label="Name" value={d.name} onChange={v => upDest(d.id, { name: v })} />
                  <ZonePicker value={d.timeZone} onChange={v => upDest(d.id, { timeZone: v })} />
                  <Swatches value={d.color} used={dests.map(x => x.color)} onChange={c => upDest(d.id, { color: c })} />
                  {inUse ? <p className="fhint">Used by {use.days} days and {use.places} places, so it can't be removed.</p>
                    : <button type="button" className="dangerbtn" onClick={() => setDests(dests.filter(x => x.id !== d.id))}>Remove {d.name}</button>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="chips">
        <button type="button" className="chipbtn" onClick={() => {
          const d: Destination = { id: newId('c'), name: '', country: '', timeZone: dests[dests.length - 1]?.timeZone || phoneZone(), color: nextColor(dests.map(x => x.color)) };
          setDests([...dests, d]); setOpen(d.id);
        }}>+ Add a destination</button>
      </div>
      <h3 className="fsec">Days</h3>
      <p className="fhint">Add or delete a day from inside it with Edit day. To make the trip longer:</p>
      <div className="chips"><button type="button" className="chipbtn" onClick={() => { commit(); patchTrip(trip.id, t => insertDay(t)); }}>+ Add a day at the end</button></div>
    </Sheet>
  );
}

/* ---------- new trips ---------- */

export function NewTripSheet({ close }: { close: () => void }) {
  const [name, setName] = useState('');
  const [start, setStartDate] = useState(addDays(todayIn(phoneZone()), 30));
  const [people, setPeople] = useState('');
  const [stops, setStops] = useState<Stop[]>([{ name: '', timeZone: phoneZone(), nights: 3 }]);
  const [zoneOpen, setZoneOpen] = useState<number | null>(null);
  const upStop = (k: number, p: Partial<Stop>) => setStops(stops.map((s, j) => (j === k ? { ...s, ...p } : s)));
  const named = stops.filter(s => s.name.trim());
  const nights = named.reduce((n, s) => n + Math.max(1, s.nights), 0);
  const pack = named.some(s => s.timeZone === 'Asia/Tokyo') ? 'ja' : undefined;
  const create = () => {
    addTrip(newTrip({ name: name || named.map(s => s.name.trim()).join(', '), start, stops: named, travelers: people.split(',').map(s => s.trim()).filter(Boolean), phrasePack: pack }));
    close();
  };
  return (
    <Sheet title="New trip" onCancel={close} onSave={create} saveLabel="Create" canSave={named.length > 0 && !!start}>
      <Text label="Trip name" value={name} onChange={setName} placeholder={named.length ? named.map(s => s.name.trim()).join(', ') : 'e.g. Italy in May'} autoFocus />
      <Text label="First day" type="date" value={start} onChange={setStartDate} />
      <h3 className="fsec">Stops, in order</h3>
      {stops.map((s, k) => (
        <div key={k} className="planrow">
          <div className="frow">
            <Text label={`Stop ${k + 1}`} value={s.name} placeholder={['Rome', 'Florence', 'Venice'][k % 3]}
              onChange={v => { const z = guessZone(v); upStop(k, { name: v, ...(z ? { timeZone: z } : {}) }); }} />
            <div className="field nights">
              <label className="flabel" htmlFor={`n${k}`}>Nights</label>
              <input id={`n${k}`} className="input" type="number" min={1} max={60} inputMode="numeric" value={s.nights}
                onChange={e => upStop(k, { nights: Math.max(1, Math.min(60, +e.target.value || 1)) })} />
            </div>
          </div>
          <p className="fhint">Time zone: <b>{zoneLabel(s.timeZone)}</b> · <button type="button" className="linkbtn" onClick={() => setZoneOpen(zoneOpen === k ? null : k)}>{zoneOpen === k ? 'Done' : 'Change'}</button>
            {stops.length > 1 && <> · <button type="button" className="linkbtn" onClick={() => setStops(stops.filter((_, j) => j !== k))}>Remove</button></>}</p>
          {zoneOpen === k && <ZonePicker value={s.timeZone} onChange={z => upStop(k, { timeZone: z })} />}
        </div>
      ))}
      <div className="chips"><button type="button" className="chipbtn" onClick={() => setStops([...stops, { name: '', timeZone: stops[stops.length - 1]?.timeZone || phoneZone(), nights: 2 }])}>+ Add a stop</button></div>
      {named.length > 0 && <p className="fhint">{nights + 1} days: {nights} nights away, plus the day you travel home{pack ? '. Japanese phrases are switched on.' : '.'}</p>}
      <Text label="Who's going" value={people} onChange={setPeople} placeholder="Names, separated by commas" />
      <Field label="Next">
        <p className="fhint" style={{ marginTop: 0 }}>You get an empty day for each night. Fill them in from the Days tab with Edit day, and add places, legs and to-dos as you go.</p>
      </Field>
    </Sheet>
  );
}

export function CopySampleSheet({ src, close }: { src: Trip; close: () => void }) {
  const [name, setName] = useState('Our Japan trip');
  const [start, setStartDate] = useState(addDays(todayIn(phoneZone()), 30));
  return (
    <Sheet title="Start from the sample" onCancel={close} onSave={() => { addTrip(copyTrip(src, start, name.trim() || src.name)); close(); }} saveLabel="Create" canSave={!!start}>
      <p className="fhint" style={{ marginTop: 0 }}>Makes a copy of the ten-day Japan sample for you to change. Ticks and notes start empty.</p>
      <Text label="Trip name" value={name} onChange={setName} />
      <Text label="First day" type="date" value={start} onChange={setStartDate} hint={`Ends ${longDate(addDays(start, src.days.length - 1))}.`} />
    </Sheet>
  );
}
