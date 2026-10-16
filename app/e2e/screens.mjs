// Drive the WrongTrain build: welcome → sample → every tab, in light and dark, phone-sized.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const DIST = process.argv[2], OUT = process.argv[3];
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', '8090', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await wait(1000);
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
let failures = 0;
const check = (c, m) => { if (!c) failures++; ok(c, m); };

for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, timezoneId: 'America/Chicago' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/tile.openstreetmap|ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });

  await page.goto('http://localhost:8090/');
  await page.waitForSelector('text=Explore a sample trip');
  if (scheme === 'light') await page.screenshot({ path: `${OUT}/0-welcome.png` });
  await page.click('text=Explore a sample trip');
  await page.waitForSelector('.board h1');
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!wide, `${scheme}: no sideways scroll at phone width`);

  const h1 = await page.textContent('.board h1');
  check(/Kyoto/.test(h1), `${scheme}: Today shows day 2 in Kyoto ("${h1}")`);
  const big = await page.textContent('.bigtime');
  check(!!big, `${scheme}: "How much time do I have?" says "${big}"`);
  if (scheme === 'light') await page.screenshot({ path: `${OUT}/1-today.png`, fullPage: true });

  for (const [tab, sel, name] of [['Days', '.daystrip', '2-days'], ['Transit', '.page-h', '3-transit'], ['Places', '.seg', '4-places'], ['Map', '.map', '5-map'], ['Phrases', '.phrase', '6-phrases'], ['To do', '#gnotes', '7-todo']]) {
    await page.click(`.tab:has-text("${tab}")`);
    await page.waitForSelector(sel, { timeout: 5000 });
    await wait(300);
    const w = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    check(!w, `${scheme}: ${tab} fits the screen`);
    if (scheme === 'light' || tab === 'Days') await page.screenshot({ path: `${OUT}/${name}${scheme === 'dark' ? '-dark' : ''}.png`, fullPage: tab !== 'Map' });
  }

  if (scheme === 'light') {
    // ticks and notes stick across a reload
    const first = page.locator('#view section.blk:not(#gnotes) li.todo:not(.done) button.box').first();
    const label = await first.getAttribute('aria-label');
    await first.click();
    await page.fill('#gnote', 'Test note from the browser run');
    await page.click('text=Add note');
    await page.reload();
    await page.waitForSelector('.tab');
    await page.click('.tab:has-text("To do")');
    const text = await page.textContent('#view');
    check(text.includes('Test note from the browser run'), 'note kept after reload');
    const still = await page.locator(`[aria-label="${label.replace('Tick off: ', 'Untick: ')}"]`).count();
    check(still === 1, 'tick kept after reload');

    // search
    await page.fill('.sbar input[type=search]', 'ramen');
    await wait(200);
    const res = await page.textContent('#view');
    check(/results? across the whole trip/.test(res), 'search finds ramen: ' + (res.match(/\d+ results?/) || ['?'])[0]);
    await page.screenshot({ path: `${OUT}/8-search.png` });
    await page.click('.sclear');

    // day navigation: next day button and Places food filter
    await page.click('.tab:has-text("Days")');
    await page.click('.band-btn.next');
    const k = await page.textContent('.board .kicker');
    check(/Day 3 of 10/.test(k), 'next-day button moves to day 3 (' + k + ')');
    await page.click('.tab:has-text("Places")');
    await page.click('text=Veg-friendly only');
    const nonVeg = await page.locator('#results .pill:has-text("Not veg")').count();
    check(nonVeg === 0, 'veg filter hides non-veg places');
    await page.click('text=Things to do');
    check(await page.locator('#results details').count() > 0, 'Things to do lists places by destination');
  }
  check(errors.length === 0, `${scheme}: no script errors` + (errors.length ? ': ' + errors.join(' | ') : ''));
  await ctx.close();
}
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
