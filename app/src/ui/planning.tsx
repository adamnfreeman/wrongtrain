/* The full-screen "planning your trip" screen: rows of icons sliding by, chosen from the vibe,
   interests, food needs and destination, with a line that changes every few seconds. It holds
   still for people who have Reduce Motion on. */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Answers } from '../../supabase/functions/_shared/planner.ts';

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
  const l = [`Planning ${where}…`, 'Working out where to stay…', 'Counting the nights…', 'Checking how to get between places…'];
  if (a.styles.includes('Food') || (a.vibes || []).includes('Foodie')) l.push('Finding the good food…');
  if (a.diets.length) l.push(`Making sure there's ${a.diets[0].toLowerCase()} food…`);
  if (a.styles.includes('Nightlife') || (a.vibes || []).includes('Party')) l.push('Looking for late nights…');
  if ((a.vibes || []).includes('Off the beaten path')) l.push('Skipping the tourist traps…');
  if (a.travelers.length > 1) l.push(`Keeping ${a.travelers.length} people happy…`);
  return l;
}

export function PlanningScreen({ answers, title, children }: { answers: Answers; title?: string; children?: ReactNode }) {
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
      </div>
    </div>
  );
}
