/* The Japan 2026 sheet as a WrongTrain trip. Takes what the Japan page's own parser (parseTrip in
   legacy/template.html) makes of the sheet and maps it onto the trip model (model/types.ts).

   Shared by legacy/to-app.mjs (the trip file) and the Japan edition of the app (sheet/live.ts),
   so plain JavaScript that both Node and the browser run as is. To-dos keep their sheet row in
   their id ("t-row-12"), which is how a tick finds its way back to the sheet. */

export const TRIP_ID = 'japan-2026';
const TZ = 'Asia/Tokyo';

const slug = s => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const CITIES = [
  { id: 'kyoto', name: 'Kyoto', color: 'violet' },
  { id: 'nara', name: 'Nara', color: 'amber' },
  { id: 'osaka', name: 'Osaka', color: 'red' },
  { id: 'tokyo', name: 'Tokyo', color: 'green' },
];
const cityId = name => CITIES.find(c => c.name === name)?.id;
const cityIn = text => CITIES.filter(c => (text || '').includes(c.name)).map(c => c.id);

/** "5:00 PM" → "17:00"; "8:46" with a later "PM" takes that half of the day. */
function clock(h, m, ap) {
  let hh = +h % 12; if (/pm/i.test(ap)) hh += 12;
  return `${String(hh).padStart(2, '0')}:${m || '00'}`;
}
const TIME = /\b(\d{1,2}):(\d{2})\s*(AM|PM)?/gi;
/** Clear booking times only: a range with minutes ("12:15–2:45 PM"), or "at 9:00 AM". Opening
    hours ("11 AM–8 PM") and "from 2:00 PM" are left as text. An end that lands the next day
    ("lands 6:50 PM Oct 27") is dropped. With first, a leg takes the first clock time it names,
    so "AA 60 (5:30 PM, lands 2:20 PM) and AA 2611 (3:57–5:04 PM)" leaves at 5:30 PM. */
function timesIn(text, first) {
  const m = /\b(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)\b/i.exec(text);
  const lone = [...text.matchAll(TIME)].find(x => x[3]);
  if (m && (!first || !lone || lone.index >= m.index)) {
    const ap1 = m[3] || (+m[1] <= +m[4] || +m[1] === 12 ? m[6] : (/pm/i.test(m[6]) ? 'AM' : 'PM'));
    const time = clock(m[1], m[2], ap1), end = clock(m[4], m[5], m[6]);
    return end > time && !/\blands\b|next day/i.test(text) ? { time, end } : { time };
  }
  if (first && lone) return { time: clock(lone[1], lone[2], lone[3]) };
  const at = /\bat (\d{1,2}):(\d{2})\s*(AM|PM)\b/i.exec(text) || /^(\d{1,2}):(\d{2})\s*(AM|PM)\b/i.exec(text);
  return at ? { time: clock(at[1], at[2], at[3]) } : {};
}
const FIXED = /\bbooked\b|\btour\b|reserv|timed entry|appointment|\bmeet\b/i;

const KIND = {
  'Hotel': 'stay', 'Booked event': 'event', 'Transit hub': 'transit', 'Meeting point': 'transit', 'Neighborhood': 'area',
  'Sight': 'sight', 'Coffee shop': 'coffee', 'Wishlist': 'sight', 'Restaurant': 'food', 'Food': 'food', 'Shop': 'shop', 'Shopping': 'shop',
};
const diet = vk => vk === 'yes' ? 'veg' : vk === 'some' ? 'veg-some' : vk === 'no' ? 'no' : undefined;

export function toTrip(d, now = new Date().toISOString()) {
  const places = [], byName = new Map();
  const place = p => {
    const key = p.name.toLowerCase().trim();
    const had = byName.get(key);
    if (had) {
      for (const [k, v] of Object.entries(p)) if (v != null && v !== '' && had[k] == null) had[k] = v;
      if (p.dayIds) had.dayIds = [...new Set([...(had.dayIds || []), ...p.dayIds])];
      if (had.wishlist && p.wishlist === false) delete had.wishlist;
      return had;
    }
    const n = { id: 'p-' + slug(p.name) + (places.some(x => x.id === 'p-' + slug(p.name)) ? '-' + places.length : ''), ...p };
    for (const k of Object.keys(n)) if (n[k] == null || n[k] === '') delete n[k];
    places.push(n); byName.set(key, n); return n;
  };

  /* pins from the Maps tab: the places with coordinates, hotels among them */
  for (const s of d.pins) for (const p of s.items) {
    if (!p.name) continue;
    place({
      name: p.name, kind: KIND[p.type] || 'other', destinationId: cityId(s.city), lat: p.lat ?? undefined, lng: p.lng ?? undefined,
      notes: p.notes, link: p.link, wishlist: p.type === 'Wishlist' || undefined,
    });
  }

  /* days */
  const days = d.days.map(x => {
    const ids = cityIn(x.city);
    const travel = x.key === 'travel';
    const day = {
      id: 'd-' + x.id, date: x.iso, summary: x.glance || '',
      plan: [], tips: [], around: [], eatIds: [],
    };
    if (!travel && cityId(x.key[0].toUpperCase() + x.key.slice(1))) day.destinationId = cityId(x.key[0].toUpperCase() + x.key.slice(1));
    if (travel) day.travel = true;
    if (ids.length > 1) { day.route = ids; day.title = x.city; }
    if (x.hotel) day.stayId = place({ name: x.hotel.name, kind: 'stay', link: x.hotel.link, destinationId: day.destinationId }).id;
    else if (x.stay && x.stay !== '—' && !/checkout|in transit/i.test(x.stay)) day.stayId = place({ name: x.stay.replace(/\s*\(.*\)\s*$/, ''), kind: 'stay', destinationId: day.destinationId }).id;
    let n = 0;
    for (const s of x.sections) {
      const items = s.items.filter(i => i.t);
      if (s.title === "TODAY'S PLAN") {
        for (const i of items) {
          const t = timesIn(i.t);
          day.plan.push({ id: `${day.id}-${++n}`, text: i.t, ...t, ...(t.time && FIXED.test(i.t) ? { fixed: true } : {}), ...(i.sub.length ? { sub: i.sub } : {}) });
        }
      } else if (s.title === 'GETTING AROUND') {
        day.around.push(...items.map(i => ({ text: i.t, ...(i.sub.length ? { sub: i.sub } : {}) })));
      } else if (s.title === 'GOOD TO KNOW') {
        day.tips.push(...items.map(i => ({ text: i.t, ...(i.sub.length ? { sub: i.sub } : {}) })));
      } else {
        /* SHOPPING and other headed lists: one "good to know" bullet each, the list under it */
        const head = s.title[0] + s.title.slice(1).toLowerCase();
        day.tips.push({ text: head, sub: items.map(i => i.t + (i.sub.length ? ' ' + i.sub.join(' ') : '')) });
      }
    }
    for (const e of x.eats) {
      if (!e.name) continue;
      const p = place({
        name: e.name, kind: 'food', destinationId: day.destinationId, area: e.loc, notes: [e.desc, e.hours && `Hours: ${e.hours}`].filter(Boolean).join(' '),
        diet: diet(e.vk), dietNote: e.vk && e.vk !== 'yes' && e.vk !== 'no' ? e.veg : undefined, closed: e.closed === 'perm' || undefined, dayIds: [day.id],
      });
      day.eatIds.push(p.id);
    }
    return { day, label: x.label };
  });
  const dayByLabel = new Map(days.map(x => [x.label, x.day.id]));

  /* food tab and the ideas tabs: places not yet on a day */
  for (const s of d.food) for (const f of s.items) {
    if (!f.name) continue;
    place({ name: f.name, kind: 'food', destinationId: cityId(f.city), area: f.loc, notes: f.desc, diet: diet(f.vk), closed: f.closed === 'perm' || undefined, wishlist: true });
  }
  for (const s of d.ideas) for (const i of s.items) {
    if (!i.name) continue;
    const kind = /coffee|cafe|café|kissaten/i.test(s.title) ? 'coffee' : /food|eat|restaurant|ramen|sushi/i.test(s.title) ? 'food' : /shop/i.test(s.title) ? 'shop' : 'sight';
    place({ name: i.name, kind, destinationId: cityId(i.city), notes: [i.desc, i.extra].filter(Boolean).join(' '), wishlist: true });
  }

  /* a place on a day's list is planned, not just an idea */
  for (const p of places) if (p.dayIds?.length) delete p.wishlist;

  /* legs */
  const MODE = [[/flight|\bAA \d|\bJAL\b/i, 'flight'], [/shinkansen|limited express|train|JR |line|kintetsu|odakyu|enoden|haruka/i, 'train'], [/subway|metro/i, 'subway'],
    [/bus/i, 'bus'], [/taxi|van|car\b/i, 'car'], [/walk/i, 'walk']];
  /* "Around Kyoto" rows are the day's getting-around notes, already on the day; legs go somewhere */
  const legs = d.legs.filter(l => l.route.includes('→')).map((l, i) => {
    const bags = /^bags:/i.test(l.route);
    const ends = l.route.replace(/^\([^)]*\)\s*/, '').replace(/^bags:\s*/i, '').split('→').map(s => s.trim()).filter(Boolean);
    const t = timesIn(l.how, true);
    return {
      id: `l-${i + 1}`, ...(dayByLabel.get(l.date) ? { dayId: dayByLabel.get(l.date) } : {}),
      from: ends[0] || l.route, to: ends.length > 1 ? ends[ends.length - 1] : '',
      mode: bags || /luggage/i.test(l.how) ? 'other' : (MODE.find(([re]) => re.test(l.how))?.[1] || 'other'),
      how: bags ? `Bags: ${l.how}` : l.how, ...(t.time ? { depart: t.time } : {}), ...(t.end ? { arrive: t.end } : {}),
      status: l.sk === 'ok' ? 'booked' : l.sk === 'none' ? 'none' : 'todo', statusText: l.status,
      ...(l.buy ? { tickets: l.buy } : {}), ...(l.details ? { details: l.details } : {}),
    };
  });

  /* to do */
  const todoGroups = d.todo.groups.map(g => g.title || 'To do');
  const todos = d.todo.groups.flatMap((g, gi) => g.items.filter(t => t.what).map((t, i) => ({
    id: t.row ? `t-row-${t.row}` : `t-${gi + 1}-${i + 1}`, group: todoGroups[gi], text: t.what, done: !!t.done,
    ...(t.when ? { when: t.when } : {}), ...([t.details, t.where].filter(Boolean).length ? { details: [t.details, t.where].filter(Boolean).join(' ') } : {}),
    ...(t.link ? { link: t.link } : {}),
  })));

  /* reference tabs, as guides; group notes as notes */
  const guides = d.notes.map((s, i) => ({
    id: `g-${i + 1}`, group: s.src, title: s.title || s.src,
    items: s.rows.filter(r => r.some(Boolean)).map(r => ({ title: r[0] || '', body: r.slice(1).filter(Boolean).join(' — ') })),
  }));
  const notes = d.gnotes.map((g, i) => ({ id: `n-${i + 1}`, author: g.who || 'Someone', text: g.text, at: now, done: g.done }));

  return {
    id: TRIP_ID, name: 'Japan 2026', travelers: ['Adam', 'Andrea', 'Drew', 'Jared'],
    destinations: CITIES.map(c => ({ id: c.id, name: c.name, country: 'JP', timeZone: TZ, color: c.color })),
    days: days.map(x => x.day), legs, places, todoGroups, todos, notes, guides, phrasePack: 'ja', currency: 'USD',
    createdAt: now, updatedAt: now,
  };
}

