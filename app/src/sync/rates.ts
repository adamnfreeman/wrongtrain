/* Exchange rates for expenses paid in another currency, from the European Central Bank's daily
   rates (Frankfurter, free, no key). The rate is kept on the expense, so balances do not move. */
export async function rate(from: string, to: string): Promise<number | null> {
  if (from === to) return 1;
  for (const url of [`https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`, `https://api.frankfurter.app/latest?from=${from}&to=${to}`]) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const v = (await r.json() as { rates?: Record<string, number> }).rates?.[to];
      if (typeof v === 'number' && v > 0) return v;
    } catch { /* try the next, or give up offline */ }
  }
  return null;
}
