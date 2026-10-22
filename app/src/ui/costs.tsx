/* What the AI has cost, in Account & settings, for Adam and Andrea only (ai_costs in schema.sql). Tokens are
   exact; dollars are a rough guess at list prices (the planner may run on a dearer model), so the
   Anthropic console stays the real bill. */
import { useEffect, useState } from 'react';
import { supabase, useSync } from '../sync/engine';

type Row = { kind: string; n: number; input: number; output: number; np: number; inputp: number; outputp: number };
interface Costs { uses: Row[]; plans: Omit<Row, 'kind'> }
/* Adam and Andrea, each by their address or their alias */
const ADAM = ['adam@thefreemans.io', 'adam@thefreemans.xyz', 'andrea@thefreemans.io', 'andrea@thefreemans.xyz'];
/* $ per million tokens, in and out: Haiku for filing and nearby, Sonnet for plans (rough) */
const RATE: Record<string, [number, number]> = { 'file-note': [1, 5], 'suggest-nearby': [1, 5], plans: [3, 15] };
const LABEL: Record<string, string> = { 'file-note': 'Notes filed', 'suggest-nearby': 'Nearby picks', plans: 'Trip plans' };
const dollars = (r: [number, number], i: number, o: number) => `$${((i * r[0] + o * r[1]) / 1e6).toFixed(2)}`;

export function AiCosts() {
  const { session } = useSync();
  const [c, setC] = useState<Costs | null>(null);
  const [days, setDays] = useState(30);
  const isAdam = ADAM.includes(session?.user.email?.toLowerCase() || '');
  useEffect(() => { if (isAdam) void supabase.rpc('ai_costs', { days }).then(({ data }) => data && setC(data as Costs)); }, [isAdam, days]);
  if (!isAdam || !c) return null;
  const rows = [...c.uses, { kind: 'plans', ...c.plans }];
  return (
    <section className="sec">
      <div className="sec-h"><h2>What the AI has cost</h2></div>
      <div className="chips" role="group" aria-label="Over">
        {[1, 7, 14, 30].map(d => <button key={d} type="button" className="chipbtn" aria-pressed={days === d} onClick={() => setDays(d)}>{d === 1 ? '1 day' : `${d} days`}</button>)}
      </div>
      <p className="note" style={{ marginTop: 0 }}>Only Adam and Andrea see this. Dollars are a rough guess at list prices; the Anthropic console has the real bill.</p>
      <ul className="sheet">{rows.map(r => {
        const rate = RATE[r.kind] || [1, 5];
        return (
          <li key={r.kind}>
            <div className="item-h"><span className="item-n">{LABEL[r.kind] || r.kind}</span><span className="kicker">{dollars(rate, r.inputp, r.outputp)} in {days === 1 ? '1 day' : `${days} days`}</span></div>
            <div className="meta"><span>{r.np} in {days === 1 ? '1 day' : `${days} days`}, {r.n} in all</span><span>{r.n ? `about ${dollars(rate, r.input / r.n, r.output / r.n)} each` : ''}</span><span>{dollars(rate, r.input, r.output)} in all</span></div>
          </li>
        );
      })}</ul>
    </section>
  );
}
