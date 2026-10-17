// The Japan edition (dist-japan): signing in with the Japan page's name and passcode, the trip from
// the sheet, ticks and notes sent back to it, and Edit pointing at the sheet. The sheet's script is
// played here: it answers with e2e/fixtures/japan-sheet.json (or the file in RAW, for a look at a
// real copy) and records what the app asks of it.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const DIST = process.argv[2], OUT = process.argv[3];
const RAW = JSON.parse(readFileSync(process.env.RAW || 'e2e/fixtures/japan-sheet.json', 'utf8'));
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', '8099', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await wait(1000);
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Asia/Tokyo',
  geolocation: { latitude: 35.6595, longitude: 139.7005 }, permissions: ['geolocation'] });
await ctx.route(/overpass-api\.de/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: [
  { type: 'node', id: 1, lat: 35.6612, lon: 139.7012, tags: { amenity: 'restaurant', name: 'Ichiran Ramen', cuisine: 'ramen' } },
] }) }));
const asked = [];
let offline = false;
await ctx.route(/script\.google\.com/, r => {
  if (offline) return r.abort('internetdisconnected');
  const q = new URL(r.request().url()).searchParams;
  asked.push(Object.fromEntries(q));
  const body = q.get('code') !== 'right' ? { ok: false, error: 'signin' }
    : q.get('action') === 'check' ? { ok: true }
    : q.get('action') === 'note' ? { ok: true, noted: true, who: q.get('name'), text: q.get('text') }
    : { ...RAW, v: 2 };
  return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
});
await ctx.route(/supabase\.co/, r => r.abort('internetdisconnected'));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', d => { errors.push('dialog: ' + d.message()); d.dismiss(); });
let failures = 0;
const check = (c, m) => { if (!c) failures++; console.log((c ? 'PASS ' : 'FAIL ') + m); };

await page.goto('http://localhost:8099/');
await page.waitForSelector('text=Japan 2026');
await page.fill('#jn', 'Adam'); await page.fill('#jc', 'wrong'); await page.click('button:has-text("Sign in")');
await page.waitForSelector('[role=alert]');
check(/do not match/.test(await page.textContent('[role=alert]')), 'a wrong passcode says so');

await page.fill('#jc', 'right'); await page.click('button:has-text("Sign in")');
await page.waitForSelector('.tab:has-text("Today")');
check(true, 'signs in and opens the trip');
check(await page.locator('.tab:has-text("Wallet")').count() === 0, 'no Wallet tab');
if (OUT) await page.screenshot({ path: `${OUT}/japan-today.png` });

await page.click('.tab:has-text("Days")');
await page.waitForTimeout(500);
check(await page.locator('#view .dayhead h1, #view .board h1').count() > 0 && /plan/i.test(await page.locator('#view').textContent()), "the sheet's days show on Days");
await page.locator('#view button:has-text("Edit")').first().click();
await page.waitForSelector('.sheet-wrap >> text=Change it in the sheet');
check(true, 'Edit says the plan is changed in the sheet');
await page.click('.sheet-wrap >> text=Close');
if (OUT) await page.screenshot({ path: `${OUT}/japan-days.png` });

await page.click('.tab:has-text("To do")');
const box = page.locator('#view [aria-label^="Tick off:"]').first();
const what = (await box.getAttribute('aria-label')).replace('Tick off: ', '');
await box.click();
await page.waitForTimeout(300);
const tick = asked.find(a => a.action === 'check');
check(!!tick && /^\d+$/.test(tick.row) && tick.done === '1' && tick.text === what, `a tick goes to the sheet with its row (${tick && tick.row})`);
await page.fill('#gnote', 'Add a sento near the hotel');
await page.click('button:has-text("Add note")');
await page.waitForTimeout(300);
check(asked.some(a => a.action === 'note' && a.text === 'Add a sento near the hotel'), 'a group note goes to the sheet');
check(/Saved to the Group Notes tab/.test(await page.locator('#view').textContent()), 'and says where it went');

/* Something nearby: the trip is the sheet's, so a place goes to it as a note for the filer */
await page.click('.tab:has-text("Today")');
await page.click('#nearby >> button:has-text("Food")');
await page.waitForSelector('#nearby .sheet li', { timeout: 10000 });
await page.click('#nearby >> button:has-text("Add to the trip")');
await page.waitForTimeout(300);
const placed = asked.find(a => a.action === 'note' && /Ichiran Ramen/.test(a.text));
check(!!placed && /^Add Ichiran Ramen \(.*\) to the .*food ideas\. Found with Something nearby\. Coordinates: 35\.66120, 139\.70120\./.test(placed.text), `Something nearby's Add to the trip sends a note (${placed && placed.text})`);
check(/Sent to the sheet; it'll be filed in a minute/.test(await page.locator('#nearby').textContent()), 'and says it went to the sheet');

await page.reload();
await page.waitForSelector('.tab:has-text("Today")');
check(true, 'stays signed in, with the trip, after a reload');

/* no signal: once it has been opened, it opens again with the trip */
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForTimeout(1500);
offline = true; await ctx.setOffline(true);
await page.reload();
await page.waitForSelector('.tab:has-text("Today")', { timeout: 15000 }).catch(() => {});
check(await page.locator('.tab:has-text("Today")').count() === 1, 'opens with no signal after one visit');
await page.click('.tab:has-text("Days")');
check(/plan/i.test(await page.locator('#view').textContent()), 'and shows the days with no signal');
offline = false; await ctx.setOffline(false);

await page.click('.tab:has-text("Today")');
await page.click('#view .acctbtn');
await page.click('.sheet-wrap button:has-text("Sign out")');
await page.waitForSelector('#jn');
check(true, 'signs out from Account & settings');

/* someone who used the old Japan page on this phone: already signed in, and the trip shows from
   its saved copy even when the first open has no signal */
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx2.route(/script\.google\.com/, r => r.abort('internetdisconnected'));
await ctx2.route(/supabase\.co/, r => r.abort('internetdisconnected'));
await ctx2.addInitScript(raw => {
  if (sessionStorage.getItem('seeded')) return;
  sessionStorage.setItem('seeded', '1');
  localStorage.setItem('trip-auth', JSON.stringify({ name: 'Andrea', code: 'right', shown: 'Andrea' }));
  localStorage.setItem('trip-raw', JSON.stringify(raw));
}, RAW);
const page2 = await ctx2.newPage();
page2.on('pageerror', e => errors.push('old page: ' + e.message));
await page2.goto('http://localhost:8099/');
await page2.waitForSelector('.tab:has-text("Today")', { timeout: 15000 }).catch(() => {});
check(await page2.locator('.tab:has-text("Today")').count() === 1, 'coming from the old page: no sign-in, trip shows with no signal');
await ctx2.close();

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
