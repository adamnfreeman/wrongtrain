// Trip files: the Japan sheet (a small made-up slice of it, in e2e/fixtures) made into a trip by
// legacy/to-app.mjs, opened with "Open a trip file", then opened again to update it.
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIST = process.argv[2];
const wait = ms => new Promise(r => setTimeout(r, ms));
const dir = mkdtempSync(join(tmpdir(), 'wt-tripfile-'));
const FILE = join(dir, 'japan.json');
execFileSync('node', ['../legacy/to-app.mjs', '--raw', 'e2e/fixtures/japan-sheet.json', '--out', FILE]);

const srv = spawn('python3', ['-m', 'http.server', '8097', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await wait(1000);
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Asia/Tokyo' });
await ctx.route(/supabase\.co/, r => r.abort('internetdisconnected'));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
let failures = 0;
const check = (c, m) => { if (!c) failures++; console.log((c ? 'PASS ' : 'FAIL ') + m); };

await page.goto('http://localhost:8097/');
await page.waitForSelector('text=Open a trip file');
await page.setInputFiles('input[aria-label="Trip file"]', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":1}') });
await page.waitForSelector('[role=alert]:has-text("not a trip file")', { timeout: 5000 }).catch(() => {});
check(await page.locator('[role=alert]:has-text("not a trip file")').count() === 1, 'a file that is not a trip says so');

await page.setInputFiles('input[aria-label="Trip file"]', FILE);
await page.waitForSelector('.tab:has-text("Days")');
await page.click('.tab:has-text("Days")');
await page.waitForSelector('#view .dayhead h1, #view .board h1');
const days = await page.locator('#view').textContent();
check(/Kyoto/.test(days), 'the trip opens, with its Kyoto day');
check(/teamLab Biovortex/.test(days), "the day's plan came across");

/* tick a to-do, then open a newer file: the change arrives, the tick stays */
await page.click('.tab:has-text("To do")');
await page.click('[aria-label="Tick off: Add Suica to Apple Wallet"]');
const trip = JSON.parse(readFileSync(FILE, 'utf8'));
trip.trip.days[0].summary = 'Updated in the sheet';
writeFileSync(FILE, JSON.stringify(trip));
await page.click('.tab:has-text("Trip")'); await page.click('.pane[data-tab="trip"] .acctbtn'); await page.click('text=All trips');
await page.waitForSelector('text=Open a trip file');
page.once('dialog', d => d.accept());
await page.setInputFiles('input[aria-label="Trip file"]', FILE);
await page.waitForSelector('.tab:has-text("Trip")');
await page.click('.tab:has-text("Trip")');
await page.waitForTimeout(400);
check(/Updated in the sheet/.test(await page.locator('#view').textContent()), 'a newer file updates the trip');
await page.click('.tab:has-text("To do")');
check(await page.locator('[aria-label="Untick: Add Suica to Apple Wallet"]').count() === 1, 'and the tick made in the app stays');
await page.click('.tab:has-text("Trip")'); await page.click('.pane[data-tab="trip"] .acctbtn'); await page.click('text=All trips');
check(await page.locator('.sheet li:has-text("Japan 2026")').count() === 1, 'still one Japan trip, not two');

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
