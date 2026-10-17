// Right now: on a trip day, a booked train half an hour away opens the page by itself, with its tab
// left of Today, in big type; once the train has gone, the page and its tab go away again. The
// clock is set by the test.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const DIST = process.argv[2], OUT = process.argv[3];
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', '8087', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await wait(1000);
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
let failures = 0;
const errors = [];
const check = (c, m) => { if (!c) failures++; console.log((c ? 'PASS ' : 'FAIL ') + m); };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Lisbon' });
await ctx.route(/supabase\.co/, r => r.abort('internetdisconnected'));
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message));
/* 10:30 in Lisbon on May 2, 2027: day 2 of the trip */
await page.clock.install({ time: new Date('2027-05-02T09:30:00Z') });
await page.goto('http://localhost:8087/');
await page.waitForSelector('text=Plan it myself');
await page.click('text=Plan it myself');
const sheet = page.locator('.sheet-wrap').last();
await sheet.getByLabel('First day').fill('2027-05-01');
await sheet.getByLabel('Stop 1').fill('Lisbon');
await sheet.getByText('Create').click();
await page.waitForSelector('.tabs');
check(await page.locator('.tab[data-tab="now"]').count() === 0, 'with nothing coming up, there is no Right now tab');

/* a booked train at 11:00 today */
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('wrongtrain')), t = s.trips[0], d = t.days[1];
  t.legs.push({ id: 'l-ap', dayId: d.id, from: 'Lisbon', to: 'Porto', mode: 'train', how: 'Alfa Pendular 123', depart: '11:00', arrive: '13:49', status: 'booked', details: 'Car 4, seats 21 and 22' });
  localStorage.setItem('wrongtrain', JSON.stringify(s));
});
await page.reload();
await page.waitForSelector('.tab[data-tab="now"]', { timeout: 10000 }).catch(() => {});
const first = await page.locator('.tabs .tab').first().getAttribute('data-tab');
check(first === 'now', 'the Right now tab appears, left of Today');
await page.waitForSelector('#view .rn', { timeout: 5000 }).catch(() => {});
check(await page.locator('#view .rn').count() === 1, '... and the page opens by itself');
const text = await page.locator('#view .rn').textContent().catch(() => '');
check(/Lisbon → Porto/.test(text) && /11:00/.test(text) && /in 30 min/.test(text), `with the train, its time and how long: "${text.slice(0, 80)}"`);
check(/Leave by/.test(text) && /Alfa Pendular 123/.test(text) && /Car 4, seats 21 and 22/.test(text), '... when to leave, which train and the seats');
await page.waitForTimeout(1500);
check(await page.locator('.tab[aria-current="page"]').getAttribute('data-tab') === 'now', '... and the bar shows it as the open page');
if (OUT) await page.screenshot({ path: `${OUT}/rightnow.png` });

/* it opens by itself only once: go to Today, reload, and it stays on Today */
await page.click('.tab[data-tab="today"]');
await page.reload();
await page.waitForSelector('.tabs');
await page.waitForTimeout(800);
check(await page.locator('#view .rn').count() === 0 && await page.locator('.tab[data-tab="now"]').count() === 1, 'it opens by itself only once; the tab stays while the train is coming');

/* the train has gone: the page and its tab go */
await page.clock.fastForward('45:00');
await page.waitForTimeout(800);
check(await page.locator('.tab[data-tab="now"]').count() === 0, 'once the train has gone, the tab goes too');

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
