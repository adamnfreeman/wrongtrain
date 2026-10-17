import { describe, expect, it } from 'vitest';
import { applyChange, changeOf, describe as words, joinLevel, needsApproval, verdict } from './rules';
import { deleteDay, deletePlace, insertDay, saveTodo, setStart } from './edit';
import { makeSample } from './sample';
import type { Trip } from './types';

const trip = () => makeSample(new Date('2027-04-12T09:00:00Z'));
const withPlan = (t: Trip, i: number, f: (p: Trip['days'][number]['plan']) => Trip['days'][number]['plan']): Trip =>
  ({ ...t, days: t.days.map((d, k) => (k === i ? { ...d, plan: f(d.plan) } : d)) });
const firstTimed = (t: Trip) => { const i = t.days.findIndex(d => d.plan.some(p => p.time)); return { i, p: t.days[i].plan.find(p => p.time)! }; };

describe('needsApproval under "approve"', () => {
  const t = trip();
  it('lets anyone add a note, a to-do or an idea, and tick things off', () => {
    const note = { ...t, notes: [...t.notes, { id: 'n1', author: 'Ben', text: 'Sentō?', at: '', done: false }] };
    expect(needsApproval(t, note, 'approve')).toBe(false);
    expect(needsApproval(t, saveTodo(t, { id: 'x', group: 'Packing', text: 'Adapter', done: false }), 'approve')).toBe(false);
    const idea = { ...t, places: [...t.places, { id: 'p1', name: 'Ramen place', kind: 'food' as const, wishlist: true }] };
    expect(needsApproval(t, idea, 'approve')).toBe(false);
    const ticked = { ...t, todos: t.todos.map((x, i) => (i === 0 ? { ...x, done: !x.done } : x)) };
    expect(needsApproval(t, ticked, 'approve')).toBe(false);
  });
  it('asks before removing anything', () => {
    expect(needsApproval(t, deletePlace(t, t.places[0].id), 'approve')).toBe(true);
    expect(needsApproval(t, { ...t, todos: t.todos.slice(1) }, 'approve')).toBe(true);
    const noted = { ...t, notes: [{ id: 'n1', author: 'A', text: 'x', at: '', done: false }] };
    expect(needsApproval(noted, { ...noted, notes: [] }, 'approve')).toBe(true);
  });
  it('asks before changing the plan', () => {
    const { i, p } = firstTimed(t);
    expect(needsApproval(t, withPlan(t, i, plan => plan.map(x => (x.id === p.id ? { ...x, time: '07:00' } : x))), 'approve')).toBe(true);
    expect(needsApproval(t, deleteDay(t, t.days[2].id), 'approve')).toBe(true);
    expect(needsApproval(t, insertDay(t), 'approve')).toBe(true);
    expect(needsApproval(t, setStart(t, '2027-06-01'), 'approve')).toBe(true);
    expect(needsApproval(t, { ...t, name: 'Mine now' }, 'approve')).toBe(true);
  });
  it('treats putting a place on a day as a plan change', () => {
    const p = t.places.find(x => !(x.dayIds || []).length)!;
    const on = { ...t, places: t.places.map(x => (x.id === p.id ? { ...x, dayIds: [t.days[3].id] } : x)) };
    expect(needsApproval(t, on, 'approve')).toBe(true);
    const scheduledIdea = { ...t, places: [...t.places, { id: 'p2', name: 'New', kind: 'sight' as const, dayIds: [t.days[1].id] }] };
    expect(needsApproval(t, scheduledIdea, 'approve')).toBe(true);
  });
  it('lets someone fix a place’s details without asking', () => {
    const p = t.places[0];
    expect(needsApproval(t, { ...t, places: t.places.map(x => (x.id === p.id ? { ...x, notes: 'Cash only' } : x)) }, 'approve')).toBe(false);
  });
  it('ignores the save stamp', () => {
    expect(needsApproval(t, { ...t, updatedAt: 'later' }, 'approve')).toBe(false);
  });
});

describe('the other rules', () => {
  const t = trip();
  const idea = { ...t, places: [...t.places, { id: 'p1', name: 'Ramen place', kind: 'food' as const, wishlist: true }] };
  const note = { ...t, notes: [...t.notes, { id: 'n1', author: 'Ben', text: 'Hi', at: '', done: false }] };
  it('"all" lets only notes through', () => {
    expect(needsApproval(t, idea, 'all')).toBe(true);
    expect(needsApproval(t, note, 'all')).toBe(false);
  });
  it('"open" lets everything through', () => {
    expect(needsApproval(t, deleteDay(t, t.days[1].id), 'open')).toBe(false);
  });
});

describe('verdict', () => {
  const t = trip(), cut = deleteDay(t, t.days[1].id);
  const note = { ...t, notes: [...t.notes, { id: 'n1', author: 'Vi', text: 'Hi', at: '', done: false }] };
  const idea = { ...t, places: [...t.places, { id: 'px', name: 'Gelato', kind: 'food' as const, wishlist: true }] };
  it('owners, organizers and editors ("can change anything") change anything directly', () => {
    expect(verdict(t, cut, 'owner')).toBe('ok');
    expect(verdict(t, cut, 'organizer')).toBe('ok');
    expect(verdict(t, cut, 'editor')).toBe('ok');
  });
  it('contributors ("can add ideas") add directly and ask for plan changes', () => {
    expect(verdict(t, idea, 'contributor')).toBe('ok');
    expect(verdict(t, cut, 'contributor')).toBe('request');
  });
  it('viewers ("look and leave notes") only leave notes', () => {
    expect(verdict(t, note, 'viewer')).toBe('ok');
    expect(verdict(t, idea, 'viewer')).toBe('blocked');
    expect(verdict(t, cut, 'viewer')).toBe('blocked');
  });
  it('a trip set up with a rule gives that level to people who join; open by default', () => {
    expect(joinLevel(undefined).role).toBe('editor');
    expect(joinLevel('approve').role).toBe('contributor');
    expect(joinLevel('all').role).toBe('contributor');
    expect(joinLevel('look').role).toBe('viewer');
  });
});

describe('requests', () => {
  it('keep only the parts of the trip they touch', () => {
    const t = trip(), c = changeOf(t, { ...t, name: 'Kansai', updatedAt: 'x' });
    expect(Object.keys(c.after)).toEqual(['name']);
    expect(c.before.name).toBe(t.name);
  });
  it('apply on top of changes made since they were asked', () => {
    const t = trip(), { i, p } = firstTimed(t);
    const asked = changeOf(t, withPlan(t, i, plan => plan.map(x => (x.id === p.id ? { ...x, time: '07:00' } : x))));
    /* meanwhile the owner renamed the trip and added a plan item to the same day */
    const now = withPlan({ ...t, name: 'Renamed' }, i, plan => [...plan, { id: 'new', text: 'Tea' }]);
    const done = applyChange(now, asked);
    expect(done.name).toBe('Renamed');
    expect(done.days[i].plan.find(x => x.id === p.id)!.time).toBe('07:00');
    expect(done.days[i].plan.some(x => x.id === 'new')).toBe(true);
  });
  it('delete a day and keep the rest consecutive', () => {
    const t = trip(), asked = changeOf(t, deleteDay(t, t.days[2].id));
    const done = applyChange(t, asked);
    expect(done.days).toHaveLength(t.days.length - 1);
    expect(done.days[2].date).toBe(t.days[2].date);
  });
});

describe('describe', () => {
  it('says what moved, in words', () => {
    const t = trip(), { i, p } = firstTimed(t);
    const lines = words(t, withPlan(t, i, plan => plan.map(x => (x.id === p.id ? { ...x, time: '07:00' } : x))));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/move “.+” from .+ to 7:00/);
  });
  it('names deleted days and places', () => {
    const t = trip();
    expect(words(t, deleteDay(t, t.days[2].id))[0]).toMatch(/^Delete \w{3} \w{3} \d+/);
    expect(words(t, deletePlace(t, t.places[0].id)).some(l => l.startsWith(`Delete place “${t.places[0].name}`))).toBe(true);
  });
});
