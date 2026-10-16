import { describe, expect, it } from 'vitest';
import { balances, fmtMoney, settleUp, shares, venmoLink } from './money';
import type { Expense, Trip } from './types';

const ex = (p: Partial<Expense>): Expense => ({ id: 'e', what: 'x', amount: 0, currency: 'USD', rate: 1, paidBy: 'Adam', split: [], at: '', ...p });
const trip = (expenses: Expense[], settlements: Trip['settlements'] = []) =>
  ({ travelers: ['Adam', 'Ben', 'Cat'], expenses, settlements, currency: 'USD' } as unknown as Trip);

describe('shares', () => {
  it('splits evenly, with the odd cents adding up', () => {
    const s = shares(ex({ amount: 10, split: [{ who: 'Adam' }, { who: 'Ben' }, { who: 'Cat' }] }));
    expect([...s.values()]).toEqual([334, 333, 333]);
  });
  it('uses set amounts when given, converted to the trip currency', () => {
    const s = shares(ex({ amount: 3000, currency: 'JPY', rate: 0.0067, split: [{ who: 'Ben', amount: 2000 }, { who: 'Cat', amount: 1000 }] }));
    expect(s.get('Ben')).toBe(1340);
    expect(s.get('Cat')).toBe(670);
  });
});

describe('balances and settling up', () => {
  it('works out who owes whom', () => {
    const t = trip([
      ex({ amount: 90, paidBy: 'Adam', split: [{ who: 'Adam' }, { who: 'Ben' }, { who: 'Cat' }] }),
      ex({ amount: 30, paidBy: 'Ben', split: [{ who: 'Ben' }, { who: 'Cat' }] }),
    ]);
    const b = balances(t);
    expect(b.get('Adam')).toBe(6000);
    expect(b.get('Ben')).toBe(-1500);
    expect(b.get('Cat')).toBe(-4500);
    expect(settleUp(b)).toEqual([{ from: 'Cat', to: 'Adam', cents: 4500 }, { from: 'Ben', to: 'Adam', cents: 1500 }]);
  });
  it('counts payments already made', () => {
    const t = trip([ex({ amount: 20, paidBy: 'Adam', split: [{ who: 'Adam' }, { who: 'Ben' }] })], [{ id: 's', from: 'Ben', to: 'Adam', amount: 10, at: '' }]);
    expect(settleUp(balances(t))).toEqual([]);
  });
  it('is fine with no expenses', () => {
    expect(settleUp(balances(trip([])))).toEqual([]);
  });
});

describe('formatting', () => {
  it('shows money the usual way', () => {
    expect(fmtMoney(4250, 'USD')).toBe('$42.50');
    expect(fmtMoney(420000, 'JPY')).toBe('¥4,200');
  });
  it('builds a Venmo payment link', () => {
    expect(venmoLink('@adam-f', 4250, 'Kyoto dinner')).toBe('https://venmo.com/adam-f?txn=pay&amount=42.50&note=Kyoto%20dinner');
  });
});
