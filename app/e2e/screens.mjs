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
  /* the app opens dark; the light pass sets Appearance to follow the phone */
  if (scheme === 'light') { await page.evaluate(() => localStorage.setItem('wt-pref-theme', '"auto"')); await page.reload(); }
  await page.waitForSelector('text=Explore a sample trip');
  /* the bottom bar has Today, Days, Map, Wallet and Trip; the rest open from Trip */
  const open = async name => {
    if (['Today', 'Days', 'Map', 'Wallet', 'Trip'].includes(name)) return page.click(`.tab:has-text("${name}")`);
    await page.click('.tab:has-text("Trip")'); await page.click(`.tile:has-text("${name}")`);
  };
  if (scheme === 'light') await page.screenshot({ path: `${OUT}/0-welcome.png` });
  await page.click('text=Explore a sample trip');
  await page.waitForSelector('.dayhead h1');
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!wide, `${scheme}: no sideways scroll at phone width`);

  const h1 = await page.textContent('.dayhead h1');
  check(/Kyoto/.test(h1), `${scheme}: Today shows day 2 in Kyoto ("${h1}")`);
  const big = await page.textContent('.bigtime');
  check(!!big, `${scheme}: "How much time do I have?" says "${big}"`);
  if (scheme === 'light') await page.screenshot({ path: `${OUT}/1-today.png`, fullPage: true });

  for (const [tab, sel, name] of [['Days', '.dslider', '2-days'], ['Wallet', '.seg', '2b-wallet'], ['Trip', '.hub', '2c-trip'], ['Transit', '.page-h', '3-transit'], ['Places', '.seg', '4-places'], ['Map', '.map', '5-map'], ['Phrases', '.phrase', '6-phrases'], ['To do', '#gnotes', '7-todo']]) {
    await open(tab);
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
    await open('To do');
    const text = await page.textContent('#view');
    check(text.includes('Test note from the browser run'), 'note kept after reload');
    const still = await page.locator(`[aria-label="${label.replace('Tick off: ', 'Untick: ')}"]`).count();
    check(still === 1, 'tick kept after reload');

    // search
    await open('Trip');
    await page.fill('.hub-search input[type=search]', 'ramen');
    await wait(200);
    const res = await page.textContent('#view');
    check(/results? across the whole trip/.test(res), 'search finds ramen: ' + (res.match(/\d+ results?/) || ['?'])[0]);
    await page.screenshot({ path: `${OUT}/8-search.png` });
    await page.click('.sclear');

    // day navigation: tap the next day on the slider; then swipe between tabs; then Places food filter
    await open('Days');
    await page.click('.dbox[aria-current="true"] + .dbox');
    await page.waitForFunction(() => /Day 3 of 10/.test(document.querySelector('.board .kicker')?.textContent || ''), null, { timeout: 4000 }).catch(() => {});
    const k = await page.textContent('.board .kicker');
    check(/Day 3 of 10/.test(k), 'tapping the next day on the slider moves to day 3 (' + k + ')');
    const swipe = (from, to) => page.evaluate(([a, b]) => {
      const el = document.querySelector('.board'), mk = x => new Touch({ identifier: 1, target: el, clientX: x, clientY: 400 });
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [mk(a)], changedTouches: [mk(a)] }));
      el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [mk(b)] }));
    }, [from, to]);
    await swipe(300, 80);
    check(await page.locator('.tab[aria-current="page"]:has-text("Map")').count() === 1, 'swiping left on Days goes to the next tab, Map');
    await open('Days'); await swipe(80, 300);
    check(await page.locator('.tab[aria-current="page"]:has-text("Today")').count() === 1, '... and swiping right goes back to Today');
    await open('Places');
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
