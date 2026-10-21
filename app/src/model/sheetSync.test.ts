import { describe, expect, it } from 'vitest';
import { updateFromSheet } from './sheetSync';
import { makeSample } from './sample';

describe('updating the trip from the Google Sheet', () => {
  const app = () => {
    const t = makeSample(new Date('2026-10-26T09:00:00Z'));
    return { ...t, places: [...t.places, { id: 'p-claude', name: 'Kawaii Nails', kind: 'shop' as const, destinationId: t.destinations[0].id }],
      going: { [t.days[0].plan[0].id]: ['Adam', 'Andrea'] }, expenses: [{ id: 'e1', what: 'Dinner', amount: 100, currency: 'JPY', paidBy: 'Adam', split: ['Adam'], at: '2026-10-26' }] as never };
  };
  it('adds what friends put in the sheet and keeps what was added in the app', () => {
    const local = app();
    const sheet = makeSample(new Date('2026-10-26T09:00:00Z'));
    sheet.places = [...sheet.places, { id: 'p-new-from-sheet', name: 'Don Quijote Shibuya', kind: 'shop', destinationId: sheet.destinations[0].id }];
    sheet.days = sheet.days.map((d, i) => i === 1 ? { ...d, plan: [...d.plan, { id: 'x-sheet', text: 'Sumo practice at 7' }] } : d);
    const out = updateFromSheet(local, sheet);
    expect(out.places.some(p => p.id === 'p-new-from-sheet')).toBe(true);
    expect(out.places.some(p => p.id === 'p-claude')).toBe(true);
    expect(out.days[1].plan.some(p => p.id === 'x-sheet')).toBe(true);
    expect(out.going).toEqual(local.going);
    expect(out.expenses).toEqual(local.expenses);
  });
  it('takes the sheet\'s changes to things both have', () => {
    const local = app();
    const sheet = makeSample(new Date('2026-10-26T09:00:00Z'));
    const id = sheet.days[0].plan[0].id;
    sheet.days[0].plan[0] = { ...sheet.days[0].plan[0], text: 'Changed in the sheet' };
    const out = updateFromSheet(local, sheet);
    expect(out.days[0].plan.find(p => p.id === id)?.text).toBe('Changed in the sheet');
  });
  it('the second time, an edit made in the app survives a sheet that did not touch it', () => {
    const local = app();
    const sheet = makeSample(new Date('2026-10-26T09:00:00Z'));
    const first = updateFromSheet(local, sheet);
    const id = first.days[0].plan[0].id;
    const edited = { ...first, days: first.days.map((d, i) => i === 0 ? { ...d, plan: d.plan.map(p => p.id === id ? { ...p, text: 'Edited in the app' } : p) } : d) };
    const out = updateFromSheet(edited, sheet, sheet);
    expect(out.days[0].plan.find(p => p.id === id)?.text).toBe('Edited in the app');
  });
});
