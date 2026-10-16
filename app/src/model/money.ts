/* Who paid for what, who owes whom, and the fewest payments that settle it.

   Expenses are entered in whatever currency was paid, with the rate to the trip's currency at the
   time, so balances do not move when exchange rates do. Everything is worked out in cents of the
   trip's currency, so shares always add up to what was paid. */
import type { Expense, Trip } from './types';

export const tripCurrency = (t: Trip) => t.currency || t.expenses?.[0]?.currency || 'USD';

const cents = (x: number) => Math.round(x * 100);

/** What each person's share of an expense is, in cents of the trip's currency. */
export function shares(e: Expense): Map<string, number> {
  const total = cents(e.amount * e.rate), out = new Map<string, number>();
  const who = e.split.length ? e.split : [{ who: e.paidBy }];
  if (who.some(s => s.amount != null)) {
    who.forEach(s => out.set(s.who, (out.get(s.who) || 0) + cents((s.amount || 0) * e.rate)));
    return out;
  }
  /* even split; the odd cents go to the first people, so it adds up exactly */
  const each = Math.floor(total / who.length), extra = total - each * who.length;
  who.forEach((s, i) => out.set(s.who, (out.get(s.who) || 0) + each + (i < extra ? 1 : 0)));
  return out;
}

/** Each person's balance in cents: positive means they are owed, negative means they owe. */
export function balances(t: Trip): Map<string, number> {
  const b = new Map<string, number>();
  const add = (who: string, c: number) => b.set(who, (b.get(who) || 0) + c);
  t.travelers.forEach(p => b.set(p, 0));
  (t.expenses || []).forEach(e => {
    add(e.paidBy, cents(e.amount * e.rate));
    shares(e).forEach((c, who) => add(who, -c));
  });
  (t.settlements || []).forEach(s => { add(s.from, cents(s.amount)); add(s.to, -cents(s.amount)); });
  return b;
}

export interface Payment { from: string; to: string; cents: number }

/** The fewest payments that bring everyone to zero: the biggest debtor pays the biggest creditor, and so on. */
export function settleUp(b: Map<string, number>): Payment[] {
  const owe = [...b].filter(([, c]) => c < 0).map(([who, c]) => ({ who, c: -c })).sort((x, y) => y.c - x.c);
  const owed = [...b].filter(([, c]) => c > 0).map(([who, c]) => ({ who, c })).sort((x, y) => y.c - x.c);
  const out: Payment[] = [];
  let i = 0, j = 0;
  while (i < owe.length && j < owed.length) {
    const pay = Math.min(owe[i].c, owed[j].c);
    if (pay > 0) out.push({ from: owe[i].who, to: owed[j].who, cents: pay });
    owe[i].c -= pay; owed[j].c -= pay;
    if (owe[i].c === 0) i++;
    if (owed[j].c === 0) j++;
  }
  return out;
}

/** "$42.50", "¥4,200", "€12.00" */
export function fmtMoney(c: number, currency: string): string {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(c / 100); }
  catch { return `${(c / 100).toFixed(2)} ${currency}`; }
}

/** Opens Venmo (the app if installed) ready to pay someone. */
export const venmoLink = (user: string, c: number, note: string) =>
  `https://venmo.com/${encodeURIComponent(user.replace(/^@/, ''))}?txn=pay&amount=${(c / 100).toFixed(2)}&note=${encodeURIComponent(note)}`;

/** Currencies to offer, most travelled first. Any ISO code works. */
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN', 'CHF', 'CNY', 'KRW', 'THB', 'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'ISK', 'CZK', 'PLN', 'HUF', 'TRY', 'INR', 'IDR', 'VND', 'PHP', 'BRL', 'ZAR', 'AED', 'MAD'];
