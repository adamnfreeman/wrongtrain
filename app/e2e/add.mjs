// Add anything: the round Add button is on every page but Right now; it opens a box where
// whatever you type becomes a group note (filed into the trip on shared trips; see filing.mjs).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const DIST = process.argv[2];
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', '8089', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
/* wait until the server answers (a fixed second wasn't always enough) */
for (let i = 0; i < 100; i++) { try { await fetch('http://127.0.0.1:8089/'); break; } catch { await wait(100); } }
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
await page.tap('.tabs-in .tab[data-tab="phrases"]'); await wait(900);
check(!(await page.locator('.addfab').isVisible()), '... but not on Phrases, where there is nothing to add');
await page.tap('.tabs-in .tab[data-tab="days"]'); await wait(900);
check(/Add/.test(await page.locator('.addfab').textContent()), '... and is back on Days');
await page.locator('.addfab').click();
const sheet = page.locator('.sheet-wrap[aria-label="Add to the plan"]');
await sheet.waitFor();
check(!(await page.locator('.addfab').isVisible()), 'the button steps aside while the box is open');
await sheet.locator('.addeg >> text=Ichiran').click();
check(await sheet.locator('textarea').inputValue() === 'dinner at Ichiran on day 3 at 8', 'an example fills the box');
await sheet.getByRole('button', { name: 'Add it' }).click();
const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('wrongtrain')).trips.find(t => t.sample).notes.map(n => n.text));
check(notes.includes('dinner at Ichiran on day 3 at 8'), 'what you add is kept as a group note');
check(await sheet.locator('.addlog >> text=Ichiran').count() === 1, '... and listed in the box');
check(await sheet.locator('textarea').inputValue() === '', '... which is ready for the next one');
await sheet.getByRole('button', { name: 'Done' }).click();
check(await page.locator('.addfab').isVisible(), 'Done closes the box');

/* Phrases: star one and it heads a Favourites section */
await page.tap('.tabs-in .tab[data-tab="phrases"]'); await wait(900);
const ph = page.locator('.pane[data-tab="phrases"]');
await ph.locator('.pstar').first().click();
check(await ph.locator('.catstrip button:has-text("Favourites")').count() === 1, 'starring a phrase adds a Favourites category');
check(await ph.locator('#phraselist h3').first().textContent() === '★ Favourites', '... shown first');

/* Days: tap a plan item to edit it, move it to a better day, and say you're out (as Alex) */
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('wrongtrain')); s.me = 'Alex'; localStorage.setItem('wrongtrain', JSON.stringify(s)); });
await page.reload(); await page.waitForSelector('.tabs');
await page.tap('.tabs-in .tab[data-tab="days"]'); await wait(900);
const dpane = page.locator('.pane[data-tab="days"]');
const where = () => page.evaluate(() => Object.fromEntries(JSON.parse(localStorage.getItem('wrongtrain')).trips.find(t => t.sample).days.flatMap((d, i) => d.plan.map(p => [p.id, i]))));
const before = await where();
await dpane.locator('.plan .planitem').first().click();
const ed = page.locator('.sheet-wrap[aria-label="Plan item"]');
await ed.waitFor();
check(await ed.locator('.bestdays .chipbtn').count() > 0, 'tapping a plan item opens its editor, with the days it fits best');
await ed.locator('.bestdays .chipbtn').first().click();
await ed.getByRole('button', { name: 'Save' }).click();
const after = await where();
check(Object.keys(before).filter(id => after[id] !== before[id]).length === 1, 'saving moves it to the day picked');
await dpane.locator('.gobtn-s').first().click();
check(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('wrongtrain')).trips.find(t => t.sample).going || {}).length === 1), "I'm out marks you out of that item only");

/* Notes: the last tab, kept on this phone */
await page.tap('.tabs-in .tab[data-tab="notes"]'); await wait(900);
await page.locator('.pane[data-tab="notes"] textarea').fill('Buy omiyage for the office');
await wait(500);
check(await page.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('wt-pref-mynotes-') && localStorage.getItem(k).includes('omiyage'))), 'Notes are saved on the phone as you type');

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exitCode = failures ? 1 : 0;
