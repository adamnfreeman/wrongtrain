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
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Asia/Tokyo' });
const asked = [];
await ctx.route(/script\.google\.com/, r => {
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

await page.reload();
await page.waitForSelector('.tab:has-text("Today")');
check(true, 'stays signed in, with the trip, after a reload');

await page.click('#view .acctbtn');
await page.click('.sheet-wrap button:has-text("Sign out")');
await page.waitForSelector('#jn');
check(true, 'signs out from Account & settings');

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
