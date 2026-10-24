/* Phrases for the trip's language, with recorded audio where there is some. */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { pref, setPref } from '../model/store';
import { PACKS, packForTrip } from '../phrases';
import type { Phrase, PhrasePack } from '../phrases/types';
import { loadClips, play, translateLink, type SayState } from '../phrases/speak';
import { fold } from '../model/search';
import { Empty, Ext } from './bits';
import { useApp } from './ctx';
import { appleCaps, scanText, translateOnPhone, type AppleCaps } from '../sync/apple';

export function Phrases() {
  const { ix, ui, set } = useApp();
  /* the trip's pack, or, if none was picked, the language of its first destination we have one for */
  const pack = ix.trip.phrasePack ? PACKS[ix.trip.phrasePack] : packForTrip(ix.trip);
  useEffect(() => { if (pack) loadClips(pack); }, [pack]);
  if (!pack) return (
    <>
      <h1 className="page-h">Phrases</h1>
      <Empty>No phrases for this trip's language yet. Pick a language in Trip settings, under Phrases.</Empty>
    </>
  );
  const terms = fold(ui.pq.trim()).split(/\s+/).filter(Boolean);
  const favs = useFavs();
  const cats = [...(favs.length ? [FAV] : []), 'All', ...pack.groups.map(g => g.cat)];
  const all = pack.groups.flatMap(g => g.items.map(it => ({ it, cat: g.cat })));
  const starred = favs.map(k => all.find(x => key(x.it) === k)).filter(Boolean) as typeof all;
  /* Favourites first: on its own when picked, at the top of All */
  /* nothing starred any more: Favourites falls back to All */
  const pcat = ui.pcat === FAV && !starred.length ? 'All' : ui.pcat;
  const favGroup = !terms.length && (pcat === FAV || pcat === 'All') && starred.length ? [{ cat: FAV, items: starred.map(x => x.it) }] : [];
  const groups = [...favGroup, ...pack.groups.map(g => {
    if (pcat === FAV && !terms.length) return { cat: g.cat, items: [] };
    const skip = !terms.length && pcat !== 'All' && g.cat !== pcat;   /* typing searches every category */
    const items = skip ? [] : g.items.filter(it => terms.every(t => fold([it.en, it.ja, it.ro, it.say, it.when, g.cat].join(' ')).includes(t)));
    return { cat: g.cat, items };
  })].filter(g => g.items.length);
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
      <Translator pack={pack} />
      <div className="catstrip" role="group" aria-label="Category">
        {cats.map(c => <button key={c} className="chipbtn plain" aria-pressed={pcat === c && !q} onClick={() => set({ pcat: c, pq: '' })}>{c}</button>)}
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
          <section key={g.cat} className="blk"><h3>{g.cat}</h3>{g.cat === FAV && <p className="note" style={{ marginTop: -4 }}>Starred on this phone. Tap ★ again to take one off.</p>}<ul className="sheet">{g.items.map((it, i) => <PhraseItem key={it.en + it.ja} pack={pack} it={it} order={g.cat === FAV ? { first: i === 0, last: i === g.items.length - 1 } : undefined} />)}</ul></section>
        ))}
      </div>
    </>
  );
}

/* favourite phrases, starred on this phone, in the order they were starred */
export const FAV = '★ Favourites';
const FAVS = 'fav-phrases';
let favs: string[] = pref<string[]>(FAVS, []);
const favListeners = new Set<() => void>();
const useFavs = () => useSyncExternalStore(f => { favListeners.add(f); return () => favListeners.delete(f); }, () => favs);
const key = (it: Phrase) => it.en + '|' + it.ja;
/** Moves a favourite up or down the Favourites list. */
function moveFav(it: Phrase, by: -1 | 1) {
  const i = favs.indexOf(key(it)), j = i + by;
  if (i < 0 || j < 0 || j >= favs.length) return;
  const next = [...favs]; [next[i], next[j]] = [next[j], next[i]];
  favs = next; setPref(FAVS, favs); favListeners.forEach(f => f());
}

function toggleFav(it: Phrase) {
  const k = key(it);
  favs = favs.includes(k) ? favs.filter(x => x !== k) : [...favs, k];
  setPref(FAVS, favs); favListeners.forEach(f => f());
}

function PhraseItem({ pack, it, order }: { pack: PhrasePack; it: Phrase; order?: { first: boolean; last: boolean } }) {
  const starred = useFavs().includes(key(it));
  const [state, setState] = useState<{ s: SayState; slow: boolean }>({ s: 'idle', slow: false });
  const [big, setBig] = useState(false);
  const label = (slow: boolean) => state.slow === slow && state.s === 'playing' ? 'Playing…' : state.slow === slow && state.s === 'loading' ? 'Loading…' : slow ? 'Slow' : 'Play';
  const go = (slow: boolean) => play(pack, it, slow, s => setState({ s, slow }));
  return (
    <li className={'phrase' + (big ? ' big' : '')}>
      <div className="item-h"><span className="item-n">{it.en}</span>
        {order && <span className="pmove">
          <button aria-label="Move up" disabled={order.first} onClick={() => moveFav(it, -1)}>↑</button>
          <button aria-label="Move down" disabled={order.last} onClick={() => moveFav(it, 1)}>↓</button>
        </span>}
        <button className={'pstar' + (starred ? ' on' : '')} aria-pressed={starred} aria-label={starred ? 'Take off favourites' : 'Add to favourites'} onClick={() => toggleFav(it)}>{starred ? '★' : '☆'}</button>
      </div>
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

/** Translate anything not in the list. On an iPhone that can, it's done on the phone (free, no
    signal needed once the language is downloaded), and the camera reads menus and signs: tap
    Translate, or one outlined line. Elsewhere, Google Translate opens with it, and its camera does
    menus and signs. */
function Translator({ pack }: { pack: PhrasePack }) {
  const [text, setText] = useState('');
  const [caps, setCaps] = useState<AppleCaps | null>(null);
  useEffect(() => { void appleCaps().then(setCaps); }, []);
  const [out, setOut] = useState<{ from: string; to: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const lang = pack.name.replace(/ phrases?$/i, '');
  const here = !!caps?.translate;
  const run = async (lines: string[], source: string, target: string) => {
    setBusy(true); setMsg('');
    try { const t = await translateOnPhone(lines, target, source); setOut(lines.map((from, i) => ({ from, to: t[i] || '' }))); }
    catch (e) { setMsg((e as Error).message || "Couldn't translate that."); }
    setBusy(false);
  };
  const camera = async () => {
    setMsg('');
    try {
      const r = await scanText([pack.lang, 'en']);
      if (!r.cancelled && r.lines.length) await run(r.lines, pack.lang, 'en');
    } catch (e) { setMsg((e as Error).message || "Couldn't open the camera."); }
  };
  return (
    <>
      {caps?.scanner && here && (
        <button className="gobtn ghost camtrans" style={{ width: '100%' }} disabled={busy} onClick={() => void camera()}>
          {busy ? 'Translating…' : `Translate a menu or sign (${lang})`}
        </button>
      )}
      <details className="fold translator" open={out.length > 0 || undefined}>
        <summary>Translate something</summary>
        <div style={{ padding: '0 14px 12px' }}>
          <textarea className="search notebox" rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Type or paste anything" aria-label="Text to translate" />
          {here ? (
            <div className="chips">
              <button className="chipbtn go" disabled={!text.trim() || busy} onClick={() => void run([text.trim()], 'en', pack.lang)}>English → {lang}</button>
              <button className="chipbtn" disabled={!text.trim() || busy} onClick={() => void run([text.trim()], pack.lang, 'en')}>{lang} → English</button>
            </div>
          ) : (
            <div className="chips">
              <a className={'chipbtn go' + (text.trim() ? '' : ' off')} target="_blank" rel="noopener noreferrer" href={translateLink(text, 'en', pack.lang)}>English → {lang}</a>
              <a className={'chipbtn' + (text.trim() ? '' : ' off')} target="_blank" rel="noopener noreferrer" href={translateLink(text, pack.lang, 'en')}>{lang} → English</a>
            </div>
          )}
          {out.length > 0 && (
            <ul className="sheet transout">{out.map((o, i) => <li key={i}><div className="item-n">{o.to}</div><div className="when">{o.from}</div></li>)}</ul>
          )}
          {msg && <p className="geomsg bad">{msg}</p>}
          {!caps?.scanner && (
            <p className="fhint">Menus and signs: <Ext href={`https://translate.google.com/?sl=${pack.lang}&tl=en&op=images`}>Google Translate</Ext> reads a photo, and the camera in Apple's Translate app or Google Translate works offline once {lang} is downloaded.</p>
          )}
          {here && <p className="fhint">Translated on this phone. The first time, it may ask to download {lang}.</p>}
        </div>
      </details>
    </>
  );
}
