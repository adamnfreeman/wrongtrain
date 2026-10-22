/* What the AI has cost, in Account & settings, for Adam only (ai_costs in schema.sql). Tokens are
   exact; dollars are a rough guess at list prices (the planner may run on a dearer model), so the
   Anthropic console stays the real bill. */
import { useEffect, useState } from 'react';
import { supabase, useSync } from '../sync/engine';

type Row = { kind: string; n: number; input: number; output: number; n30: number; input30: number; output30: number };
interface Costs { uses: Row[]; plans: Omit<Row, 'kind'> }
/* Adam signs in with either his address or his alias */
const ADAM = ['adam@thefreemans.io', 'adam@thefreemans.xyz'];
/* $ per million tokens, in and out: Haiku for filing and nearby, Sonnet for plans (rough) */
const RATE: Record<string, [number, number]> = { 'file-note': [1, 5], 'suggest-nearby': [1, 5], plans: [3, 15] };
const LABEL: Record<string, string> = { 'file-note': 'Notes filed', 'suggest-nearby': 'Nearby picks', plans: 'Trip plans' };
const dollars = (r: [number, number], i: number, o: number) => `$${((i * r[0] + o * r[1]) / 1e6).toFixed(2)}`;

export function AiCosts() {
  const { session } = useSync();
  const [c, setC] = useState<Costs | null>(null);
  const isAdam = ADAM.includes(session?.user.email?.toLowerCase() || '');
  useEffect(() => { if (isAdam) void supabase.rpc('ai_costs').then(({ data }) => data && setC(data as Costs)); }, [isAdam]);
  if (!isAdam || !c) return null;
  const rows = [...c.uses, { kind: 'plans', ...c.plans }];
  return (
    <section className="sec">
      <div className="sec-h"><h2>What the AI has cost</h2></div>
      <p className="note" style={{ marginTop: 0 }}>Only you see this. Dollars are a rough guess at list prices; the Anthropic console has the real bill.</p>
      <ul className="sheet">{rows.map(r => {
        const rate = RATE[r.kind] || [1, 5];
        return (
          <li key={r.kind}>
            <div className="item-h"><span className="item-n">{LABEL[r.kind] || r.kind}</span><span className="kicker">{dollars(rate, r.input30, r.output30)} in 30 days</span></div>
            <div className="meta"><span>{r.n30} in 30 days, {r.n} in all</span><span>{r.n ? `about ${dollars(rate, r.input / r.n, r.output / r.n)} each` : ''}</span><span>{dollars(rate, r.input, r.output)} in all</span></div>
          </li>
        );
      })}</ul>
    </section>
  );
}
