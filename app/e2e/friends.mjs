// Where everyone is: on a shared trip, a friend who is sharing shows on the map and in the list,
// and you share your own position for a time you pick, then stop. The server is played here.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const DIST = process.argv[2], OUT = process.argv[3];
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', '8088', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await wait(1000);
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
let failures = 0;
const errors = [];
const check = (c, m) => { if (!c) failures++; console.log((c ? 'PASS ' : 'FAIL ') + m); };

const UID = '00000000-0000-0000-0000-00000000000a', CAT = '00000000-0000-0000-0000-00000000000c';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UID, role: 'authenticated', exp: 4102444800 })}.x`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user: { id: UID, email: 'ana@example.com', aud: 'authenticated' } };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['geolocation'], geolocation: { latitude: 38.7139, longitude: -9.1394 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message));
await ctx.route(/supabase\.co/, r => r.abort('internetdisconnected'));
await page.goto('http://localhost:8088/');
await page.waitForSelector('text=Plan it myself');
await page.click('text=Plan it myself');
const sheet = page.locator('.sheet-wrap').last();
await sheet.getByLabel('Stop 1').fill('Lisbon');
await sheet.getByText('Create').click();
await page.waitForSelector('.tabs');
const trip = await page.evaluate(() => JSON.parse(localStorage.getItem('wrongtrain')).trips[0]);

const rpc = [];
await ctx.unroute(/supabase\.co/);
await ctx.route(/supabase\.co/, async r => {
  const u = r.request().url(), json = b => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
  const m = /\/rpc\/(\w+)/.exec(u);
  if (m) { rpc.push({ fn: m[1], body: JSON.parse(r.request().postData() || '{}') }); return json(null); }
  if (/\/rest\/v1\/trip_locations/.test(u)) return json([
    { user_id: CAT, lat: 38.7107, lng: -9.1366, acc: 12, at: new Date(Date.now() - 120000).toISOString(), until: new Date(Date.now() + 3600000).toISOString() },
  ]);
  if (/\/rest\/v1\/trip_members/.test(u)) return json([{ trip_id: trip.id, user_id: UID, name: 'Ana', role: 'owner', avatar: null }, { trip_id: trip.id, user_id: CAT, name: 'Cat', role: 'editor', avatar: null }]);
  if (/\/rest\/v1\/trips/.test(u)) return json([{ id: trip.id, data: trip, version: 3, rule: 'open' }]);
  if (/\/rest\/v1\//.test(u)) return json([]);
  return r.abort('internetdisconnected');
});
await page.evaluate(([t, s]) => {
  localStorage.setItem('wrongtrain', JSON.stringify({ trips: [t], activeId: t.id, me: 'Ana', sync: { [t.id]: { version: 3, base: t, dirty: false, rule: 'open', role: 'owner' } } }));
  localStorage.setItem('wt-auth', JSON.stringify(s));
}, [trip, session]);
await page.reload();
await page.waitForSelector('.tabs');
await page.click('.tab:has-text("Map")');
await page.waitForSelector('#friends >> text=Cat');
check(await page.locator('#friends >> text=2 min ago').count() === 1, 'a friend who is sharing shows in the list, with when');
check(await page.locator('.leaflet-marker-icon.friend').count() === 1, '... and on the map');

await page.click('#friends button:has-text("1 hour")');
await page.waitForSelector('#friends >> text=Sharing where you are until');
for (let i = 0; i < 20 && !rpc.some(x => x.fn === 'share_location'); i++) await wait(250);
const sent = rpc.find(x => x.fn === 'share_location');
check(!!sent && Math.abs(sent.body.lat - 38.7139) < 0.001 && new Date(sent.body.until) > new Date(), 'sharing for an hour sends where you are, with the end time');
check(/away/.test(await page.locator('#friends').textContent()), 'and shows how far away the friend is');
if (OUT) await page.locator('#friends').screenshot({ path: `${OUT}/friends.png` });
await page.click('#friends button:has-text("Stop")');
for (let i = 0; i < 20 && !rpc.some(x => x.fn === 'stop_sharing_location'); i++) await wait(250);
check(rpc.some(x => x.fn === 'stop_sharing_location'), 'Stop takes it off');
check(await page.locator('#friends button:has-text("1 hour")').count() === 1, '... and offers sharing again');

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
