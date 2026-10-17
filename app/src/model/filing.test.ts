import { describe, expect, it } from 'vitest';
import { addPart, hasPlanPart, planIsIn, planPart, prepareFiling, undoFiling, type Filing } from './filing';
import { needsApproval, verdict } from './rules';
import { makeSample } from './sample';
import { compactTrip, emptyToNull, FILING_SCHEMA, isFiling, notePrompt } from '../../supabase/functions/_shared/filing.ts';

const trip = () => makeSample(new Date('2027-04-12T09:00:00Z'));
const place = (o: Partial<Extract<Filing['changes'][number], { type: 'place' }>> = {}) => ({
  type: 'place' as const, key: 'p1', name: 'Ichiran Ramen', kind: 'food' as const, destinationId: 'kyo', area: 'Near Nishiki Market',
  notes: 'Late-night ramen, booths for one.', link: null, wishlist: true, dayIds: [] as string[], ...o,
});
const filing = (changes: Filing['changes'], done = true): Filing => ({ changes, reply: 'Added Ichiran Ramen to the Kyoto food ideas.', done });

describe('prepareFiling', () => {
  it('turns a place into an idea in the right destination, without coordinates', () => {
    const x = prepareFiling(trip(), 'n2', filing([place()]));
    expect(x.places).toHaveLength(1);
    const p = x.places[0];
    expect(p).toMatchObject({ name: 'Ichiran Ramen', kind: 'food', destinationId: 'kyo', area: 'Near Nishiki Market', wishlist: true });
    expect(p.lat).toBeUndefined();
    expect(p.lng).toBeUndefined();
    expect(x.added).toEqual(['Added “Ichiran Ramen” to ideas in Kyoto']);
    expect(hasPlanPart(x)).toBe(false);
  });

  it('keeps only ids the trip has, and kinds and times the app knows', () => {
    const x = prepareFiling(trip(), 'n2', filing([
      place({ destinationId: 'atlantis', kind: 'spaceport' as never, dayIds: ['d2', 'nope'], wishlist: false, link: 'javascript:alert(1)' }),
      { type: 'plan', dayId: 'nope', text: 'Lost', time: null, end: null, fixed: false, placeId: null },
      { type: 'plan', dayId: 'd3', text: 'Dinner', time: '25:00', end: '21:00', fixed: false, placeId: 'p1' },
    ]));
    const p = x.places[0];
    expect(p.destinationId).toBeUndefined();
    expect(p.kind).toBe('other');
    expect(p.link).toBeUndefined();
    expect(x.placeDays).toEqual([{ id: p.id, dayIds: ['d2'] }]);
    expect(x.plan).toHaveLength(1);
    expect(x.plan[0].item.time).toBeUndefined();
    expect(x.plan[0].item.end).toBeUndefined();
    expect(x.plan[0].item.placeId).toBe(p.id);
  });

  it('skips what the trip already has', () => {
    const t = trip();
    const x = prepareFiling(t, 'n2', filing([
      place({ name: t.places[0].name, destinationId: t.places[0].destinationId || null }),
      { type: 'todo', group: t.todos[0].group, text: t.todos[0].text, details: null, when: null },
    ]));
    expect(x.places).toEqual([]);
    expect(x.todos).toEqual([]);
  });

  it('adds a to-do group only when it is new', () => {
    const t = trip();
    const x = prepareFiling(t, 'n2', filing([
      { type: 'todo', group: t.todoGroups[0], text: 'Book sumo tickets', details: null, when: 'A month before' },
      { type: 'todo', group: 'Gifts', text: 'Pick up omiyage', details: null, when: null },
    ]));
    expect(x.groups).toEqual(['Gifts']);
    expect(x.todos.map(o => o.when)).toEqual(['A month before', undefined]);
  });
});

describe('applying a filing', () => {
  it('puts additions straight in and marks the note dealt with, which needs nobody’s OK', () => {
    const t = trip();
    const x = prepareFiling(t, 'n2', filing([place(), { type: 'todo', group: 'Gifts', text: 'Pick up omiyage', details: null, when: null }]));
    const after = addPart(t, x);
    expect(after.places.at(-1)!.name).toBe('Ichiran Ramen');
    expect(after.todos.at(-1)!.text).toBe('Pick up omiyage');
    expect(after.todoGroups).toContain('Gifts');
    expect(after.notes.find(n => n.id === 'n2')).toMatchObject({ done: true, filed: 'Added Ichiran Ramen to the Kyoto food ideas.' });
    expect(needsApproval(t, after, 'approve')).toBe(false);
  });

  it('leaves the note open, with Claude’s reason, when it is left for the owner', () => {
    const t = trip();
    const x = prepareFiling(t, 'n2', { changes: [], reply: 'Left for the owner: it changes a booked train.', done: false });
    const after = addPart(t, x);
    expect(after.notes.find(n => n.id === 'n2')).toMatchObject({ done: false, filed: 'Left for the owner: it changes a booked train.' });
  });

  it('keeps plan changes apart, so the rule can send them to the owner', () => {
    const t = trip();
    const x = prepareFiling(t, 'n2', filing([
      place({ dayIds: ['d2'], wishlist: false }),
      { type: 'plan', dayId: 'd2', text: 'Dinner at Ichiran', time: '19:00', end: null, fixed: false, placeId: 'p1' },
    ]));
    const added = addPart(t, x);
    expect(added.places.at(-1)).toMatchObject({ wishlist: true });
    expect(added.places.at(-1)!.dayIds).toBeUndefined();
    expect(needsApproval(t, added, 'approve')).toBe(false);
    expect(planIsIn(added, x)).toBe(false);

    const planned = planPart(added, x);
    expect(needsApproval(added, planned, 'approve')).toBe(true);
    expect(planned.places.at(-1)).toMatchObject({ dayIds: ['d2'] });
    expect(planned.places.at(-1)!.wishlist).toBeUndefined();
    const d2 = planned.days.find(d => d.id === 'd2')!;
    const item = d2.plan.find(i => i.text === 'Dinner at Ichiran')!;
    expect(item).toMatchObject({ time: '19:00', placeId: x.places[0].id });
    /* in time order with the rest of the day */
    const times = d2.plan.filter(i => i.time).map(i => i.time!);
    expect(times).toEqual([...times].sort());
    expect(planIsIn(planned, x)).toBe(true);
    expect(x.planned).toEqual([expect.stringMatching(/^Put “Ichiran Ramen” on /), expect.stringMatching(/: add “Dinner at Ichiran” at 7:00 PM$/)]);
  });

  it('drops a link to a new place that did not go in', () => {
    const t = trip();
    const x = prepareFiling(t, 'n2', filing([place(), { type: 'plan', dayId: 'd2', text: 'Ramen', time: null, end: null, fixed: false, placeId: 'p1' }]));
    const planned = planPart(t, x);
    expect(planned.days.find(d => d.id === 'd2')!.plan.find(i => i.text === 'Ramen')!.placeId).toBeUndefined();
  });

  it('undoes everything it filed and reopens the note', () => {
    const t = trip();
    const x = prepareFiling(t, 'n2', filing([
      place({ dayIds: ['d2'], wishlist: false }),
      { type: 'todo', group: 'Gifts', text: 'Pick up omiyage', details: null, when: null },
      { type: 'plan', dayId: 'd2', text: 'Dinner at Ichiran', time: '19:00', end: null, fixed: false, placeId: 'p1' },
    ]));
    const done = planPart(addPart(t, x), x);
    const back = undoFiling(done, x);
    expect(back.places).toEqual(t.places);
    expect(back.todos).toEqual(t.todos);
    expect(back.todoGroups).toEqual(t.todoGroups);
    expect(back.days).toEqual(t.days);
    expect(back.notes.find(n => n.id === 'n2')).toMatchObject({ done: false });
    expect(back.notes.find(n => n.id === 'n2')!.filed).toBeUndefined();
  });

  it('undo keeps a to-do group someone else has since used', () => {
    const t = trip();
    const x = prepareFiling(t, 'n2', filing([{ type: 'todo', group: 'Gifts', text: 'Pick up omiyage', details: null, when: null }]));
    const done = addPart(t, x);
    const more = { ...done, todos: [...done.todos, { id: 'other', group: 'Gifts', text: 'Tea for Mum', done: false }] };
    expect(undoFiling(more, x).todoGroups).toContain('Gifts');
  });
});

describe('what the function sends Claude', () => {
  it('cuts the trip down to ids, names and the plan', () => {
    const c = compactTrip(trip(), 'Adam');
    expect(c.owner).toBe('Adam');
    expect(c.destinations.map(d => d.id)).toEqual(['kyo', 'nar', 'osa', 'tok']);
    expect(c.days[1]).toMatchObject({ id: 'd2', destination: 'Kyoto' });
    expect(JSON.stringify(c)).not.toMatch(/"lat"|"lng"|guides/);
  });

  it('puts the note after the trip, marked as the traveler’s', () => {
    const p = notePrompt(trip(), { text: 'Add Ichiran', author: 'Ben' }, 'Adam', '2027-04-12');
    expect(p).toMatch(/Today is 2027-04-12/);
    expect(p.indexOf('<trip>')).toBeLessThan(p.indexOf('<note author="Ben">'));
  });

  it('asks for every field, as structured outputs require', () => {
    const walk = (s: Record<string, unknown>): void => {
      if (s.type === 'object') {
        expect(s.additionalProperties).toBe(false);
        expect(s.required).toEqual(Object.keys(s.properties as object));
        Object.values(s.properties as Record<string, Record<string, unknown>>).forEach(walk);
      }
      if (s.items) walk(s.items as Record<string, unknown>);
      if (s.anyOf) (s.anyOf as Record<string, unknown>[]).forEach(walk);
    };
    walk(FILING_SCHEMA);
  });

  it('recognises a well-formed answer', () => {
    expect(isFiling(filing([place()]))).toBe(true);
    expect(isFiling({ changes: [{ type: 'delete' }], reply: '', done: true })).toBe(false);
    expect(isFiling({ reply: 'x' })).toBe(false);
  });
});

describe('travel, stays and changes to the plan', () => {
  it('adds a flight, updates one the trip has, and undoes both', () => {
    const t = trip(), leg = t.legs[0];
    const x = prepareFiling(t, 'n2', filing([
      { type: 'leg', legId: null, dayId: t.days.at(-1)!.id, from: 'Haneda', to: 'New York JFK', mode: 'flight', how: 'Flight JL 4', depart: '19:45', arrive: null, status: 'booked', details: null },
      { type: 'leg', legId: leg.id, dayId: leg.dayId || null, from: leg.from, to: leg.to, mode: leg.mode, how: 'Haruka 56, Green Car', depart: '20:46', arrive: '22:03', status: 'booked', details: 'Seats 5A-6B' },
      { type: 'leg', legId: null, dayId: 'nope', from: '', to: 'Nowhere', mode: 'rocket' as never, how: '', depart: '9am', arrive: null, status: 'todo', details: null },
    ]));
    expect(x.legs).toHaveLength(1);
    expect(x.legs[0]).toMatchObject({ from: 'Haneda', to: 'New York JFK', mode: 'flight', depart: '19:45', status: 'booked' });
    expect(x.legEdits).toHaveLength(1);
    const after = planPart(addPart(t, x), x);
    expect(after.legs.find(l => l.id === leg.id)).toMatchObject({ how: 'Haruka 56, Green Car', depart: '20:46', details: 'Seats 5A-6B' });
    expect(planIsIn(after, x)).toBe(true);
    const undone = undoFiling(after, x);
    expect(undone.legs).toEqual(t.legs);
  });

  it('moves, rewords and takes off plan items, and puts them back on undo', () => {
    const t = trip(), d = t.days.find(x => x.plan.length >= 2)!, [a, b] = d.plan;
    const x = prepareFiling(t, 'n2', filing([
      { type: 'planEdit', dayId: d.id, itemId: a.id, text: null, time: '07:00', end: null, remove: false },
      { type: 'planEdit', dayId: d.id, itemId: b.id, text: null, time: null, end: null, remove: true },
      { type: 'planEdit', dayId: d.id, itemId: 'nope', text: 'Ghost', time: null, end: null, remove: false },
    ]));
    expect(x.planEdits).toHaveLength(2);
    const after = planPart(t, x), day = after.days.find(y => y.id === d.id)!;
    expect(day.plan.find(i => i.id === a.id)?.time).toBe('07:00');
    expect(day.plan.some(i => i.id === b.id)).toBe(false);
    expect(planIsIn(after, x)).toBe(true);
    expect(undoFiling(after, x).days.find(y => y.id === d.id)!.plan.map(i => i.id).sort()).toEqual(d.plan.map(i => i.id).sort());
  });

  it('sets where people stay, with a hotel added in the same note', () => {
    const t = trip(), days = t.days.slice(0, 2).map(d => d.id);
    const x = prepareFiling(t, 'n2', filing([
      place({ key: 'h1', name: 'Hotel Gracery Shinjuku', kind: 'stay', destinationId: 'tok' }),
      { type: 'stay', dayIds: days, placeId: 'h1' },
    ]));
    expect(x.stays.map(s => s.dayId)).toEqual(days);
    const after = planPart(addPart(t, x), x);
    expect(after.days.slice(0, 2).every(d => d.stayId === x.places[0].id)).toBe(true);
    expect(undoFiling(after, x).days.slice(0, 2).map(d => d.stayId)).toEqual(t.days.slice(0, 2).map(d => d.stayId));
  });

  it('goes straight in for someone who can change anything; a request for someone who can add ideas', () => {
    const t = trip(), d = t.days.find(x => x.plan.length)!;
    const x = prepareFiling(t, 'n2', filing([{ type: 'planEdit', dayId: d.id, itemId: d.plan[0].id, text: null, time: '06:30', end: null, remove: false }]));
    const after = planPart(t, x);
    expect(verdict(t, after, 'editor')).toBe('ok');
    expect(verdict(t, after, 'contributor')).toBe('request');
  });

  it('copes with filings saved before travel and stays existed', () => {
    const t = trip(), x = prepareFiling(t, 'n2', filing([place()]));
    const old = { ...x } as Partial<typeof x>;
    delete old.legs; delete old.legEdits; delete old.stays; delete old.planEdits;
    expect(hasPlanPart(old as typeof x)).toBe(false);
    expect(() => undoFiling(addPart(t, old as typeof x), old as typeof x)).not.toThrow();
  });

  it('shows Claude the travel, stays and plan item ids it may change', () => {
    const c = compactTrip(trip());
    expect(c.legs.length).toBeGreaterThan(0);
    expect(c.days[0].plan[0]).toHaveProperty('id');
    expect(c.days.some(d => d.stay?.name)).toBe(true);
    expect(JSON.stringify(FILING_SCHEMA)).toContain('planEdit');
  });
});

describe('the filing schema the API accepts', () => {
  it('has at most 16 nullable or union fields (the API refuses more)', () => {
    let n = 0;
    const walk = (o: unknown) => {
      if (!o || typeof o !== 'object') return;
      const x = o as Record<string, unknown>;
      if (Array.isArray(x.type) || x.anyOf) n++;
      Object.values(x).forEach(walk);
    };
    walk(FILING_SCHEMA);
    expect(n).toBeLessThanOrEqual(16);
  });
  it('turns empty extras back into null', () => {
    const f = emptyToNull({ reply: '', done: true, changes: [{ type: 'todo', group: 'Before', text: 'Book', details: '', when: 'May' }] } as never);
    expect(f.changes[0]).toMatchObject({ details: null, when: 'May' });
  });
});
