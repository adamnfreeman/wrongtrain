// "Something nearby" on Today, with OpenStreetMap and the server stood in: on the sample you get
// the five nearest; on a shared trip, Claude's five with a line each; either can go to Ideas.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const DIST = process.argv[2], OUT = process.argv[3];
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', '8094', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await wait(1000);
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
let failures = 0;
const errors = [];
const check = (c, m) => { if (!c) failures++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const here = { latitude: 35.0037, longitude: 135.7788 };
const places = Array.from({ length: 12 }, (_, i) => ({
  type: 'node', id: 100 + i, lat: here.latitude + (i + 1) * 0.0004, lon: here.longitude,
  tags: { amenity: 'restaurant', name: `Place ${i + 1}`, cuisine: 'ramen', opening_hours: 'Mo-Su 11:00-22:00' },
}));
let overpassAsked = '';

async function open(setup) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, geolocation: here, permissions: ['geolocation'] });
  await ctx.route(/overpass-api\.de/, r => { overpassAsked = decodeURIComponent(r.request().postData() || ''); return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: places }) }); });
  await setup?.(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  return { ctx, page };
}

/* the sample: nearest five, saved to Ideas */
{
  const { ctx, page } = await open(c => c.route(/supabase\.co/, r => r.abort('internetdisconnected')));
  await page.goto('http://localhost:8094/');
  await page.click('text=Explore a sample trip');
  await page.waitForSelector('#nearby');
  await page.click('#nearby >> button:has-text("Food")');
  await page.waitForSelector('#nearby .sheet li', { timeout: 10000 });
  check(/amenity.*restaurant/.test(overpassAsked) && /around:1000,35\.00370,135\.77880/.test(overpassAsked), 'asks OpenStreetMap for food around you');
  check(await page.locator('#nearby .sheet li').count() === 5, 'shows five places');
  check((await page.locator('#nearby .item-n').first().textContent()) === 'Place 1', '... nearest first');
  check(await page.locator('#nearby >> text=Claude picks the best five').count() === 1, '... and says Claude picks on your own shared trips');
  check(/Restaurant · ramen · \d+ m · about \d+ min on foot/.test(await page.locator('#nearby .when').first().textContent()), 'each says what it is and how far');
  await page.locator('#nearby .sheet li').first().locator('text=Save to Ideas').click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('wrongtrain')).trips[0].places.find(p => p.name === 'Place 1'));
  check(saved && saved.wishlist && saved.kind === 'food' && saved.lat > 35, 'Save to Ideas adds it with its location');
  await page.locator('#nearby').screenshot({ path: `${OUT}/n-1-nearest.png` });
  await ctx.close();
}

/* a shared trip, signed in: Claude's five */
{
  const UID = '00000000-0000-0000-0000-00000000000a';
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UID, role: 'authenticated', exp: 4102444800 })}.x`;
  const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user: { id: UID, email: 'ana@example.com', aud: 'authenticated' } };
  let asked = null, sharedTrip = null;
  const { ctx, page } = await open(c => c.route(/supabase\.co/, async r => {
    const u = r.request().url(), json = b => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (/functions\/v1\/suggest-nearby/.test(u)) {
      asked = JSON.parse(r.request().postData());
      return json({ picks: [{ id: 'node/104', why: 'A quiet ramen counter, open now.' }, { id: 'node/101', why: 'The closest, if you are hungry now.' }], left: 18 });
    }
    if (/\/rest\/v1\/trips/.test(u)) return json(sharedTrip ? [{ id: 'shared1', data: sharedTrip, version: 1, rule: 'approve' }] : []);
    if (/\/rest\/v1\/trip_members/.test(u)) return json([{ trip_id: 'shared1', role: 'owner' }]);
    if (/\/rest\/v1\/trip_requests/.test(u)) return json([]);
    return r.abort('internetdisconnected');
  }));
  await page.goto('http://localhost:8094/');
  await page.click('text=Explore a sample trip');
  sharedTrip = await page.evaluate(([s]) => {
    const st = JSON.parse(localStorage.getItem('wrongtrain'));
    const t = { ...st.trips[0], sample: undefined, id: 'shared1' };
    localStorage.setItem('wrongtrain', JSON.stringify({ trips: [t], activeId: t.id, me: 'Ana', sync: { [t.id]: { version: 1, base: t, dirty: false, rule: 'approve', role: 'owner' } } }));
    localStorage.setItem('wt-auth', JSON.stringify(s));
    return t;
  }, [session]);
  await page.reload();
  await page.waitForSelector('#nearby');
  await page.click('#nearby >> button:has-text("Food")');
  await page.waitForSelector('#nearby .sheet li', { timeout: 10000 });
  check(asked && asked.mood === 'food' && asked.trip_id === 'shared1' && asked.candidates.length === 12, 'sends the mood and the places found to Claude');
  check((await page.locator('#nearby .item-n').allTextContents()).join() === 'Place 5,Place 2', 'shows Claude’s picks, in its order');
  check(await page.locator('#nearby >> text=A quiet ramen counter, open now.').count() === 1, '... each with its line on why');
  check(await page.locator('#nearby >> text=Picked by Claude').count() === 1, '... and says Claude picked them');
  await page.locator('#nearby').screenshot({ path: `${OUT}/n-2-claude.png` });
  await ctx.close();
}

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
