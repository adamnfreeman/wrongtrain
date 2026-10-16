/* Results for the search box above every screen. */
import { useMemo, useState } from 'react';
import { buildIndex, fold, search, type Entry, type Group } from '../model/search';
import { Empty } from './bits';
import { useApp, type Tab } from './ctx';

const ORDER: Group[] = ['Days', 'Transit', 'Places', 'Map', 'Phrases', 'To do', 'Notes'];
const FIRST: Record<Tab, Group[]> = { today: ['Days'], days: ['Days'], transit: ['Transit'], places: ['Places'], map: ['Places'], phrases: ['Phrases'], wallet: ['To do'], prep: ['To do', 'Notes'] };
const OPEN: Record<NonNullable<Entry['go']>, string> = { transit: 'Transit', places: 'Places', prep: 'To do', phrases: 'Phrases to hear it', map: 'Map' };

/** Marks each search term inside the text. */
function Hl({ s, terms }: { s: string; terms: string[] }) {
  const low = fold(s), ranges: [number, number][] = [];
  terms.forEach(t => { let p = 0; while ((p = low.indexOf(t, p)) > -1) { ranges.push([p, p + t.length]); p += t.length; } });
  ranges.sort((a, b) => a[0] - b[0]);
  const out: React.ReactNode[] = []; let i = 0;
  ranges.forEach(([a, b], k) => { if (a < i) return; out.push(s.slice(i, a), <mark key={k}>{s.slice(a, b)}</mark>); i = b; });
  out.push(s.slice(i));
  return <>{out}</>;
}

export function Search({ q }: { q: string }) {
  const { ix, ui, set, go } = useApp();
  const idx = useMemo(() => buildIndex(ix.trip), [ix.trip]);
  const [exp, setExp] = useState<Record<string, boolean>>({});
  const { terms, hits } = search(idx, q);
  if (!hits.length) return <Empty>Nothing in the trip matches “{q}”.</Empty>;
  const first = FIRST[ui.tab];
  return (
    <>
      <p className="lede">{hits.length} {hits.length === 1 ? 'result' : 'results'} across the whole trip.</p>
      {[...first, ...ORDER.filter(g => !first.includes(g))].map(g => {
        const list = hits.filter(e => e.g === g); if (!list.length) return null;
        const show = exp[g] ? list : list.slice(0, 5);
        return (
          <section key={g} className="blk">
            <div className="sec-h"><h2>{g}</h2><span className="kicker">{list.length}</span></div>
            <ul className="sheet">
              {show.map((e, i) => (
                <li key={i}>
                  <div className="kick"><Hl s={e.k} terms={terms} /></div>
                  {e.t && <div className="item-h"><span className="item-n"><Hl s={e.t} terms={terms} /></span></div>}
                  {e.x && <p className="item-d"><Hl s={e.x} terms={terms} /></p>}
                  <div className="meta">
                    {e.day ? <button className="linkbtn" onClick={() => go('days', e.day)}>Open this day</button>
                      : e.go ? <button className="linkbtn" onClick={() => { if (e.pq) set({ pq: e.pq }); go(e.go!); }}>Open {OPEN[e.go]}</button> : null}
                  </div>
                </li>
              ))}
            </ul>
            {list.length > show.length && <button className="linkbtn" onClick={() => setExp({ ...exp, [g]: true })}>Show all {list.length}</button>}
          </section>
        );
      })}
    </>
  );
}
