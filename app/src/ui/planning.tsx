/* The full-screen "planning your trip" screen: rows of icons sliding by, chosen from the vibe,
   interests, food needs and destination, with a line that changes every few seconds. It holds
   still for people who have Reduce Motion on. */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Answers } from '../../supabase/functions/_shared/planner.ts';
import { countryOf, partnerCards, type PartnerCard } from '../model/partners';
import { COUNTRY_LANG, PACKS } from '../phrases';
import type { Phrase, PhrasePack } from '../phrases/types';
import { loadClips, play } from '../phrases/speak';
import { openPage } from '../native';

const ICONS: Record<string, string[]> = {
  /* vibes */
  Chill: ['☕', '🌿', '🛋️', '🌅'], Foodie: ['🍜', '🍣', '🥟', '🍷'], Party: ['🎉', '🪩', '🍸', '🎶'], Romantic: ['🌹', '🥂', '🌙', '🕯️'],
  Artsy: ['🎨', '🖼️', '🎭', '📷'], Luxe: ['💎', '🥂', '🛎️', '✨'], 'Off the beaten path': ['🧭', '🗺️', '🏮', '🌀'], Nerdy: ['🎮', '👾', '🤖', '📚'], Outdoorsy: ['⛰️', '🥾', '🌲', '🏞️'],
  /* interests */
  Sightseeing: ['📸', '🏯', '🗼', '🌉'], Food: ['🍱', '🍕', '🥐', '🌮'], 'Culture & history': ['🏛️', '⛩️', '📜', '🏺'], 'Art & museums': ['🖼️', '🎨', '🗿'],
  'Nature & outdoors': ['🌸', '🏔️', '🌊', '🍁'], Nightlife: ['🌃', '🍸', '🎤', '🕺'], Shopping: ['🛍️', '👟', '🧥', '🎁'], Relaxing: ['♨️', '🛁', '🧘', '🌴'],
  Adventure: ['🧗', '🚴', '🏄', '🪂'], 'Wellness & spas': ['💆', '🧖', '♨️', '🌿'],
  /* food needs */
  Vegetarian: ['🥗', '🥦', '🍆'], Vegan: ['🌱', '🥑', '🥕'], Pescatarian: ['🐟', '🦐'],
};
/* a few destinations get their own; everywhere gets travel */
const PLACES: [RegExp, string[]][] = [
  [/japan|tokyo|kyoto|osaka/i, ['🗾', '🍙', '🚄', '🎌', '🍡']], [/ital|rome|florence|venice/i, ['🍝', '🍕', '🛵', '🇮🇹']],
  [/france|paris/i, ['🥖', '🗼', '🧀', '🇫🇷']], [/spain|barcelona|madrid/i, ['💃', '🥘', '🇪🇸']], [/mexico/i, ['🌮', '🌵', '🇲🇽']],
  [/greece|athens/i, ['🏛️', '🫒', '🇬🇷']], [/thai|bangkok/i, ['🛺', '🥭', '🇹🇭']], [/iceland/i, ['🌋', '🧊', '🌌']],
];
const TRAVEL = ['✈️', '🚆', '🧳', '🗺️', '🎫', '🚕', '🏨', '🧭'];

function pickIcons(a: Answers): string[] {
  const out = [...(PLACES.find(([re]) => re.test(a.where))?.[1] || [])];
  [...(a.vibes || []), ...a.styles, ...a.diets].forEach(k => out.push(...(ICONS[k] || [])));
  out.push(...TRAVEL);
  return [...new Set(out)];
}

function linesFor(a: Answers): string[] {
  const where = a.where.trim() || 'your trip';
  const l = [`Sketching a route for ${where}…`, 'Working out where to stay…', 'Counting the nights…', 'Checking how to get between places…'];
  if (a.styles.includes('Food') || (a.vibes || []).includes('Foodie')) l.push('Finding the good food…');
  if (a.diets.length) l.push(`Making sure there's ${a.diets[0].toLowerCase()} food…`);
  if (a.styles.includes('Nightlife') || (a.vibes || []).includes('Party')) l.push('Looking for late nights…');
  if ((a.vibes || []).includes('Off the beaten path')) l.push('Skipping the tourist traps…');
  if (a.travelers.length > 1) l.push(`Keeping ${a.travelers.length} people happy…`);
  return l;
}

/* ---------- cards to look at while waiting: phrases to learn, and things they will need ---------- */

type Card = { kind: 'phrase'; pack: PhrasePack; it: Phrase } | { kind: 'partner'; p: PartnerCard };

function cardsFor(a: Answers, city?: string): Card[] {
  const lang = COUNTRY_LANG[countryOf(a.where)?.code || ''], pack = lang ? PACKS[lang] : undefined;
  const phrases: Card[] = pack
    ? pack.groups.filter(g => /basic|food|eat|getting|transport|polite/i.test(g.cat)).flatMap(g => g.items.slice(0, 6))
      .sort(() => Math.random() - 0.5).slice(0, 4).map(it => ({ kind: 'phrase', pack, it }))
    : [];
  const partners: Card[] = partnerCards(a.where, city).map(p => ({ kind: 'partner', p }));
  /* phrase, partner, phrase, partner… */
  const out: Card[] = [];
  for (let i = 0; i < Math.max(phrases.length, partners.length); i++) { if (phrases[i]) out.push(phrases[i]); if (partners[i]) out.push(partners[i]); }
  return out;
}

function Cards({ answers, city }: { answers: Answers; city?: string }) {
  const cards = useMemo(() => cardsFor(answers, city), [answers, city]);
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  useEffect(() => { const p = cards.find(c => c.kind === 'phrase'); if (p && p.kind === 'phrase') void loadClips(p.pack); }, [cards]);
  /* move on every 8 seconds, unless they are looking at one */
  useEffect(() => { if (held || cards.length < 2) return; const t = setInterval(() => setI(x => (x + 1) % cards.length), 8000); return () => clearInterval(t); }, [held, cards.length]);
  if (!cards.length) return null;
  const c = cards[i % cards.length];
  return (
    <div className="pcard-wrap">
      <div className="pcard" key={i} onClick={() => setHeld(true)}>
        {c.kind === 'phrase' ? (
          <>
            <div className="kick">While you wait: a phrase in {c.pack.name}</div>
            <p className="pcard-en">{c.it.en}</p>
            <p className="pcard-ja">{c.it.ja}</p>
            <p className="pcard-ro">{c.it.ro}{c.it.say ? ` · say “${c.it.say}”` : ''}</p>
            <button type="button" className="chipbtn go" onClick={e => { e.stopPropagation(); setHeld(true); play(c.pack, c.it, false, () => {}); }}>Hear it</button>
          </>
        ) : (
          <>
            <div className="kick">You'll need this</div>
            <p className="pcard-title">{c.p.title}</p>
            <p className="pcard-body">{c.p.body}</p>
            <button type="button" className="chipbtn go" onClick={e => { e.stopPropagation(); setHeld(true); void openPage(c.p.url); }}>{c.p.cta}</button>
            <p className="pcard-note">WrongTrain may earn a commission. It does not change your price.</p>
          </>
        )}
      </div>
      <div className="pcard-dots">
        {cards.map((_, k) => <button key={k} type="button" aria-label={`Card ${k + 1}`} aria-current={k === i % cards.length} onClick={() => { setHeld(true); setI(k); }} />)}
      </div>
    </div>
  );
}

export function PlanningScreen({ answers, title, city, children }: { answers: Answers; title?: string; city?: string; children?: ReactNode }) {
  const icons = useMemo(() => pickIcons(answers), [answers]);
  const lines = useMemo(() => linesFor(answers), [answers]);
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(x => (x + 1) % lines.length), 2600); return () => clearInterval(t); }, [lines.length]);
  /* three rows, each a different slice and speed, doubled so the loop is seamless */
  const rows = [0, 1, 2].map(r => { const s = icons.slice(r % icons.length).concat(icons.slice(0, r % icons.length)); return [...s, ...s, ...s]; });
  return (
    <div className="planning" role="status" aria-live="polite">
      <div className="planning-rows" aria-hidden="true">
        {rows.map((row, r) => (
          <div key={r} className={'planning-row r' + r}>{row.map((ic, k) => <span key={k}>{ic}</span>)}</div>
        ))}
      </div>
      <div className="planning-text">
        <h2>{title || 'Planning your trip'}</h2>
        <p key={i}>{lines[i]}</p>
        {children}
        <Cards answers={answers} city={city} />
      </div>
    </div>
  );
}
