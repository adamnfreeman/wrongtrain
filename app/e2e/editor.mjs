// Plan a trip from nothing in the WrongTrain build, edit every kind of thing, reload, and check it all stuck.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const DIST = process.argv[2], OUT = process.argv[3];
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', '8091', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await wait(1000);
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'America/Chicago' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/tile.openstreetmap|ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });
page.on('dialog', d => d.accept());
let failures = 0;
const check = (c, m) => { if (!c) failures++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const view = () => page.textContent('#view');
const sheet = page.locator('.sheet-wrap');
const shot = async n => { await wait(400); return page.screenshot({ path: `${OUT}/e-${n}.png` }); };

await page.goto('http://localhost:8091/');
await page.click('text=Plan your own trip');
await sheet.waitFor();
await sheet.getByLabel('Trip name').fill('Italy in May');
await sheet.getByLabel('First day').fill('2027-05-01');
await sheet.getByLabel('Stop 1').fill('Rome');
await page.fill('#n0', '3');
await sheet.getByText('+ Add a stop').click();
await sheet.getByLabel('Stop 2').fill('Florence');
await page.fill('#n1', '2');
const hint = await sheet.textContent('.sheet-body');
check(/Rome \(Europe\)/.test(hint), 'time zone guessed from the stop name (Rome → Europe/Rome)');
check(/6 days: 5 nights away/.test(hint), 'counts the days: 6 days for 5 nights');
await shot('1-new-trip');
await sheet.getByText('Create').click();
await page.waitForSelector('.board h1');
check(/days to go/.test(await page.textContent('.board h1')), 'new trip opens on Today with a countdown');
check(/Italy in May/.test(await page.textContent('.board .kicker')), 'trip name on the board');

/* plan day 1 */
await page.click('.tab:has-text("Days")');
check((await view()).includes('Nothing planned for this day yet'), 'empty day says so');
await page.click('text=Plan this day');
await sheet.waitFor();
await sheet.getByLabel('In one line').fill('Ancient Rome: Colosseum and the Forum');
await sheet.getByText('+ Add to the plan').click();
await sheet.getByLabel('Time for item 1').fill('09:00');
await sheet.getByLabel('Plan item 1').fill('Colosseum, timed entry');
await sheet.getByText('Be on time').click();
await sheet.getByText('+ Add to the plan').click();
await sheet.getByLabel('Time for item 2').fill('08:00');
await sheet.getByLabel('Plan item 2').fill('Breakfast near the hotel');
await sheet.getByText('Sort by time').click();
check(await sheet.getByLabel('Plan item 1').inputValue() === 'Breakfast near the hotel', 'Sort by time puts 8:00 first');
await sheet.getByLabel('Where you sleep').selectOption('__new');
await sheet.getByLabel('Name of the place to stay').fill('Hotel near Termini');
await shot('2-day-editor');
await sheet.getByText('Save', { exact: true }).click();
await sheet.waitFor({ state: 'detached' });
let v = await view();
check(v.includes('Colosseum, timed entry') && v.includes('Be on time for'), 'day shows the plan and the fixed time');
check((await page.textContent('.board-sub')).includes('Hotel near Termini'), 'new stay shows on the board');
await shot('3-day');

/* a place with a pasted pin, on day 1 */
await page.click('.tab:has-text("Places")');
await page.click('text=+ Add a place');
await sheet.waitFor();
await sheet.getByLabel('Name', { exact: true }).fill('Trevi Fountain');
await sheet.locator('.chipbtn', { hasText: /^Sight$/ }).click();
await sheet.getByLabel('Paste coordinates or a maps link').fill('41.9009, 12.4833');
check((await sheet.textContent('.sheet-body')).includes('Pin at 41.90090, 12.48330'), 'pasted coordinates set the pin');
await sheet.getByLabel(/^Day 1,/).click();
await shot('4-place-editor');
await sheet.getByText('Save', { exact: true }).click();
await page.click('text=Things to do');
check((await view()).includes('Trevi Fountain'), 'place listed under Things to do');
await page.click('.tab:has-text("Map")');
check(await page.locator('.leaflet-interactive').count() >= 1, 'place has a pin on the map');

/* a booked leg on the Florence day */
await page.click('.tab:has-text("Transit")');
await page.click('text=+ Add a leg');
await sheet.waitFor();
const opts = await sheet.getByLabel('When').locator('option').allTextContents();
await sheet.getByLabel('When').selectOption({ label: opts.find(o => o.startsWith('Day 4')) });
await sheet.getByLabel('From', { exact: true }).fill('Rome');
await sheet.getByLabel('To', { exact: true }).fill('Florence');
await sheet.getByLabel('Leaves', { exact: true }).fill('10:00');
await sheet.locator('.chipbtn', { hasText: /^Booked$/ }).click();
await sheet.getByText('Save', { exact: true }).click();
v = await view();
check(v.includes('Rome → Florence') && v.includes('1 booked'), 'leg listed and counted as booked');
check(/Florence/.test(v), 'leg filed under the Florence day');

/* a to-do, ticked */
await page.click('.tab:has-text("To do")');
await page.locator('text=+ Add a to-do').first().click();
await sheet.waitFor();
await sheet.getByLabel('To do', { exact: true }).fill('Book Colosseum tickets');
await sheet.getByText('Save', { exact: true }).click();
await page.click('[aria-label="Tick off: Book Colosseum tickets"]');
check(await page.locator('[aria-label="Untick: Book Colosseum tickets"]').count() === 1, 'new to-do can be ticked');

/* settings: rename, add a day at the end */
await page.click('button:has-text("Trip settings")');
await sheet.waitFor();
await sheet.getByLabel('Trip name').fill('Rome and Florence');
await shot('5-settings');
await sheet.getByText('+ Add a day at the end').click();
await page.click('.tab:has-text("Days")');
check(await page.locator('.daychip').count() === 7, 'a day added at the end (7 days)');

/* delete day 2: later days move up, the Florence leg stays on its day */
await page.locator('.daychip').nth(1).click();
await page.click('.editbtn');
await sheet.waitFor();
await sheet.getByText('Delete this day').click();
await sheet.waitFor({ state: 'detached' });
check(await page.locator('.daychip').count() === 6, 'day deleted (6 days)');

/* everything survives a reload */
await page.reload();
await page.waitForSelector('.tab');
await page.click('.tab:has-text("Today")');
check(/Rome and Florence/.test(await page.textContent('.board .kicker')), 'new name kept after reload');
await page.click('.tab:has-text("Transit")');
v = await view();
check(v.includes('Rome → Florence'), 'leg kept after reload');
const legDay = await page.locator('.blk .sec-h h2').allTextContents();
check(legDay.some(t => /May 3 · (Rome → )?Florence/.test(t)), 'leg moved with its day to May 3: ' + legDay.join(' | '));
await page.click('.tab:has-text("Days")');
await page.locator('.daychip').first().click();
check((await view()).includes('Colosseum, timed entry'), 'day 1 plan kept after reload');

/* start from the sample */
await page.click('text=All trips');
await page.click('text=Start from the sample');
await sheet.waitFor();
await sheet.getByLabel('First day').fill('2027-10-01');
await sheet.getByText('Create').click();
await page.waitForSelector('.board h1');
check(/Our Japan trip/.test(await page.textContent('.board .kicker')), 'copy of the sample opens');
await page.click('.tab:has-text("Days")');
check((await page.textContent('.board .kicker')).includes('Oct 1'), 'copy starts on the chosen date');
await page.click('text=All trips');
check((await page.locator('.gate .sheet li').count()) === 2, 'welcome lists both trips');
await shot('6-welcome-trips');

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
