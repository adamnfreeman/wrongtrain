/* Phrases for the trip's language, with recorded audio where there is some. */
import { useEffect, useState } from 'react';
import { PACKS } from '../phrases';
import type { Phrase, PhrasePack } from '../phrases/types';
import { loadClips, play, translateLink, type SayState } from '../phrases/speak';
import { fold } from '../model/search';
import { Empty, Ext } from './bits';
import { useApp } from './ctx';
import { Languages } from './languages';

export function Phrases() {
  const { ix, ui, set } = useApp();
  const pack = ix.trip.phrasePack ? PACKS[ix.trip.phrasePack] : undefined;
  useEffect(() => { if (pack) loadClips(pack); }, [pack]);
  if (!pack) return (
    <>
      <h1 className="page-h">Phrases</h1>
      <Empty>No phrase pack for this trip's language yet. Japanese is the first; more are on the way.</Empty>
    </>
  );
  const terms = fold(ui.pq.trim()).split(/\s+/).filter(Boolean);
  const cats = ['All', ...pack.groups.map(g => g.cat)];
  const groups = pack.groups.map(g => {
    const skip = !terms.length && ui.pcat !== 'All' && g.cat !== ui.pcat;   /* typing searches every category */
    const items = skip ? [] : g.items.filter(it => terms.every(t => fold([it.en, it.ja, it.ro, it.say, it.when, g.cat].join(' ')).includes(t)));
    return { cat: g.cat, items };
  }).filter(g => g.items.length);
  const n = groups.reduce((k, g) => k + g.items.length, 0);
  const q = ui.pq.trim();
  return (
    <>
      <h1 className="page-h">Phrases</h1>
      <p className="lede">{pack.intro}</p>
      <div className="sbar"><div className="sin">
        <input className="search" type="search" placeholder="Find a phrase or type a word" aria-label="Find a phrase" autoComplete="off"
          value={ui.pq} onChange={e => set({ pq: e.target.value })} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
        {ui.pq && <button className="sclear" onClick={() => set({ pq: '' })}>Clear</button>}
      </div></div>
      <div className="catstrip" role="group" aria-label="Category">
        {cats.map(c => <button key={c} className="chipbtn plain" aria-pressed={ui.pcat === c && !q} onClick={() => set({ pcat: c, pq: '' })}>{c}</button>)}
      </div>
      {q && (
        <div className="lookup">
          <p className="lede2">{n ? 'Not what you need?' : 'Nothing in the list matches.'} Look up “{q}” elsewhere:</p>
          <div className="chips">
            <a className="chipbtn" target="_blank" rel="noopener noreferrer" href={translateLink(q, 'auto', pack.lang)}>Google Translate</a>
            {pack.dictionary && <a className="chipbtn" target="_blank" rel="noopener noreferrer" href={pack.dictionary.url + encodeURIComponent(q)}>{pack.dictionary.label}</a>}
          </div>
        </div>
      )}
      <div id="phraselist">
        {groups.map(g => (
          <section key={g.cat} className="blk"><h3>{g.cat}</h3><ul className="sheet">{g.items.map(it => <PhraseItem key={it.en + it.ja} pack={pack} it={it} />)}</ul></section>
        ))}
      </div>
    <Languages />
    </>
  );
}

function PhraseItem({ pack, it }: { pack: PhrasePack; it: Phrase }) {
  const [state, setState] = useState<{ s: SayState; slow: boolean }>({ s: 'idle', slow: false });
  const [big, setBig] = useState(false);
  const label = (slow: boolean) => state.slow === slow && state.s === 'playing' ? 'Playing…' : state.slow === slow && state.s === 'loading' ? 'Loading…' : slow ? 'Slow' : 'Play';
  const go = (slow: boolean) => play(pack, it, slow, s => setState({ s, slow }));
  return (
    <li className={'phrase' + (big ? ' big' : '')}>
      <div className="item-h"><span className="item-n">{it.en}</span></div>
      <p className="ja" lang={pack.lang}>{it.ja}</p>
      <p className="ro">{it.ro}{it.say && <> <span className="say">{it.say}</span></>}</p>
      <div className="chips pbtns">
        <button className="chipbtn go" onClick={() => go(false)}>{label(false)}</button>
        <button className="chipbtn" onClick={() => go(true)}>{label(true)}</button>
        <button className="chipbtn" aria-pressed={big} onClick={() => setBig(!big)}>{big ? 'Show small' : 'Show big'}</button>
      </div>
      {state.s === 'failed' && <p className="geomsg bad">No sound came out. Check the volume and that the phone is not on silent, or <Ext href={translateLink(it.tts || it.ja, pack.lang, 'en')}>hear it in Google Translate</Ext>.</p>}
      {it.when && <p className="item-d">{it.when}</p>}
    </li>
  );
}
