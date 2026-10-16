// "Plan a trip for me", end to end, with the plan-trip function stood in: the questions, the
// outline (cities and nights, adjustable), filling in each city, and the trip it makes.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const DIST = process.argv[2], OUT = process.argv[3];
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', '8096', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await wait(1000);
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
let failures = 0;
const errors = [];
const check = (c, m) => { if (!c) failures++; console.log((c ? 'PASS ' : 'FAIL ') + m); };

const UID = '00000000-0000-0000-0000-00000000000a';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UID, role: 'authenticated', exp: 4102444800 })}.x`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user: { id: UID, email: 'adam@example.com', aud: 'authenticated' } };

const outline = {
  title: 'Japan in spring', summary: 'Osaka for food, Kyoto for temples, Tokyo for everything else.', start: '2027-04-01', arrival: 'Fly into Kansai (KIX), home from Haneda (HND).', tips: ['Book teamLab early.'],
  stops: [
    { city: 'Osaka', country: 'JP', timeZone: 'Asia/Tokyo', nights: 3, why: 'Street food in Dotonbori.' },
    { city: 'Kyoto', country: 'JP', timeZone: 'Asia/Tokyo', nights: 4, why: 'Temples and gardens.' },
    { city: 'Tokyo', country: 'JP', timeZone: 'Asia/Tokyo', nights: 5, why: 'Neighbourhoods to explore.' },
  ],
  hops: [{ from: 'Osaka', to: 'Kyoto', mode: 'train', how: 'JR Special Rapid', duration: '30 min' }, { from: 'Kyoto', to: 'Tokyo', mode: 'train', how: 'Shinkansen Nozomi', duration: '2 h 15 min' }],
};
const stopFor = (dates, city) => ({
  hotels: [{ name: `${city} Grand`, area: 'Centre', price: 3, why: 'Near the station.', link: null, pick: true }, { name: `${city} Hostel`, area: 'Centre', price: 1, why: 'Cheap and close.', link: null, pick: false }],
  places: [{ key: 'p1', name: `${city} Ramen`, kind: 'food', area: 'Centre', notes: 'Great broth.', link: null, veg: true, bookAhead: false }],
  days: dates.map((date, i) => ({ date, title: i === 0 ? `Arrive in ${city}` : `${city} day ${i + 1}`, summary: 'A day.', plan: [{ time: '19:00', text: 'Dinner', placeKey: 'p1', fixed: false }] })),
  around: [], todos: [],
});
const steps = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.route(/supabase\.co/, async r => {
  const u = r.request().url(), json = (b, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
  if (/functions\/v1\/plan-trip/.test(u)) {
    const b = JSON.parse(r.request().postData());
    steps.push(b.step + (b.index != null ? b.index : ''));
    if (b.step === 'outline') return json({ plan_id: 'plan1', left: 4, outline });
    if (b.step === 'research') return json({ notes: `Notes for ${b.outline.stops[b.index].city}` });
    if (b.step === 'build') {
      const o = b.outline, before = o.stops.slice(0, b.index).reduce((n, s) => n + s.nights, 0);
      const dates = Array.from({ length: o.stops[b.index].nights }, (_, i) => { const d = new Date(o.start + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + before + i); return d.toISOString().slice(0, 10); });
      return json({ stop: stopFor(dates, o.stops[b.index].city) });
    }
  }
  if (/\/rest\/v1\//.test(u)) return json([]);
  return r.abort('internetdisconnected');
});
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message));
const sheet = page.locator('.sheet-wrap').last();
const next = () => sheet.locator('.sheet-bar .linkbtn.strong').click();

await page.goto('http://localhost:8096/');
await page.evaluate(s => localStorage.setItem('wt-auth', JSON.stringify(s)), session);
await page.reload();
await page.click('text=Plan a trip for me');
await sheet.getByLabel('Where to').fill('Japan');
await sheet.getByLabel('Anything you must see or do').fill('teamLab, a sumo match');
await sheet.getByLabel('One day more').click();
await sheet.getByLabel('One day more').click();
await sheet.getByLabel('One day more').click();
check(await sheet.locator('text=13 days').count() === 1, 'the trip length goes up and down');
await next();
await sheet.getByLabel('Name', { exact: true }).fill('Adam');
await sheet.getByLabel('From').first().fill('Chicago');
await sheet.locator('text=+ Add a person').click();
await sheet.getByLabel('Person 2').fill('Sarah');
await next();
await sheet.locator('button:has-text("$$$$")').first().click();
await sheet.locator('button:has-text("Food")').first().click();
await sheet.locator('button:has-text("A neighbourhood and a list")').click();
await sheet.locator('button:has-text("Vegetarian")').click();
await page.screenshot({ path: `${OUT}/p-1-style.png` });
await next();
await sheet.locator('text=Japan in spring').waitFor({ timeout: 10000 });
check(steps[0] === 'outline', 'asks for an outline first');
check((await sheet.locator('.item-n').allTextContents()).join() === 'Osaka,Kyoto,Tokyo', 'shows the cities in order');
check(await sheet.locator('text=12 nights.').count() === 1, '... adding up to the nights in 13 days');
await sheet.getByLabel('One night more in Tokyo').click();
check(await sheet.locator('text=6 nights').count() === 1 && await sheet.locator('.fhint.warn').count() === 1, 'nights can be changed, with a note when they no longer match');
await sheet.getByLabel('One night fewer in Tokyo').click();
await page.screenshot({ path: `${OUT}/p-2-outline.png` });
await next();
await sheet.locator('.pill:has-text("Done")').nth(2).waitFor({ timeout: 15000 });
check(['research0', 'build0', 'research1', 'build1', 'research2', 'build2'].every(s => steps.includes(s)), 'each city is researched, then planned');
await page.screenshot({ path: `${OUT}/p-3-filled.png` });
await next();
await page.waitForSelector('.tabs');
const t = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('wrongtrain')); return s.trips.find(x => x.id === s.activeId); });
check(t.name === 'Japan in spring' && t.days.length === 13 && t.days[12].travel, 'makes a 13-day trip ending with the trip home');
check(t.travelers.join() === 'Adam,Sarah', '... with everyone on it');
check(t.days.slice(7, 12).every(d => d.stayId === t.places.find(p => p.name === 'Tokyo Grand').id), '... staying at the picked hotel in each city');
check(t.places.find(p => p.name === 'Tokyo Hostel').wishlist === true, '... with the other hotels kept as options');
check(t.legs.length === 2 && t.legs[1].how === 'Shinkansen Nozomi', '... and the trains between cities, to book');
check(!(await page.evaluate(() => localStorage.getItem('wt-plan-draft'))), 'the plan in progress is cleared once the trip is made');

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
