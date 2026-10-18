// Add anything: the round Add button is on every page but Right now; it opens a box where
// whatever you type becomes a group note (filed into the trip on shared trips; see filing.mjs).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const DIST = process.argv[2];
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', '8089', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await wait(1000);
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
let failures = 0;
const errors = [];
const check = (c, m) => { if (!c) failures++; console.log((c ? 'PASS ' : 'FAIL ') + m); };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
await ctx.route(/supabase\.co/, r => r.abort('internetdisconnected'));
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:8089/');
await page.click('text=Explore a sample trip');
await page.waitForSelector('.tabs');
await wait(500);
check(await page.locator('.addfab').isVisible(), 'the Add button shows on Today');
await page.tap('.tabs-in .tab[data-tab="places"]'); await wait(900);
check(await page.locator('.addfab').isVisible(), '... and on other pages, like Places');
await page.locator('.addfab').click();
const sheet = page.locator('.sheet-wrap[aria-label="Add anything"]');
await sheet.waitFor();
check(!(await page.locator('.addfab').isVisible()), 'the button steps aside while the box is open');
await sheet.locator('.addeg >> text=muji').click();
check(await sheet.locator('textarea').inputValue() === 'muji, donqui and uniqlo', 'an example fills the box');
await sheet.getByRole('button', { name: 'Add it' }).click();
const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('wrongtrain')).trips.find(t => t.sample).notes.map(n => n.text));
check(notes.includes('muji, donqui and uniqlo'), 'what you add is kept as a group note');
check(await sheet.locator('.addlog >> text=muji').count() === 1, '... and listed in the box');
check(await sheet.locator('textarea').inputValue() === '', '... which is ready for the next one');
await sheet.getByRole('button', { name: 'Done' }).click();
check(await page.locator('.addfab').isVisible(), 'Done closes the box');

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exitCode = failures ? 1 : 0;
