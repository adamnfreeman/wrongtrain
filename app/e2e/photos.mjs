// Photos: the Photos tab shows the sample's photos by day and by person; the viewer hearts a
// photo (and takes it back), adds and removes a comment, and sits above the bottom bar.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const DIST = process.argv[2];
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', '8088', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await wait(1000);
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
let failures = 0;
const errors = [];
const check = (c, m) => { if (!c) failures++; console.log((c ? 'PASS ' : 'FAIL ') + m); };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
await ctx.route(/supabase\.co/, r => r.abort('internetdisconnected'));
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:8088/');
await page.click('text=Explore a sample trip');
await page.waitForSelector('.tabs');
await page.tap('.tabs-in .tab[data-tab="photos"]');
await wait(1000);
const pane = page.locator('.pane[data-tab="photos"]');
check(await page.locator('.pane[aria-hidden="false"]').getAttribute('data-tab') === 'photos', 'the Photos tab opens its page');
check(await pane.locator('.pthumb').count() === 4, 'all the sample photos show');
check(await pane.locator('.phearts').count() > 0, '... with their hearts');
await pane.locator('text=By person').click();
check(await pane.locator('.sec h2, .sec .sec-h, .sec').first().textContent().then(t => /Sam|Jordan|Alex|Riley/.test(t)), 'By person groups them by who took them');
await pane.locator('text=By day').click();

await pane.locator('.pthumb').nth(1).click();
const v = page.locator('.pview');
await v.waitFor();
const heart = v.locator('.pact').nth(0);
const count = async () => Number((await heart.textContent()).replace(/\D/g, '') || 0);
const before = await count();
await heart.click();
check(await count() === before + 1 && await heart.getAttribute('aria-pressed') === 'true', 'hearting a photo counts you');
check(/You/.test(await v.locator('.pview-liked').textContent()), '... and says you hearted it');
await heart.click();
check(await count() === before, 'tapping again takes the heart back');
await v.locator('.pact').nth(1).click();
await v.locator('input[aria-label="Your comment"]').fill('Worth the climb');
await v.locator('text=Post').click();
check(await v.locator('.pcomment:has-text("Worth the climb")').count() === 1, 'a comment shows under the photo');
await v.locator('.pcomment:has-text("Worth the climb") >> [aria-label="Delete comment"]').click();
check(await v.locator('.pcomment:has-text("Worth the climb")').count() === 0, '... and can be deleted by its writer');
const onTop = await page.evaluate(() => { const a = document.querySelector('.pview-acts').getBoundingClientRect(); return document.elementFromPoint(a.left + 30, a.top + a.height / 2)?.closest('.pview') != null; });
check(onTop, 'the viewer sits above the bottom bar');
await v.locator('text=Close').click();

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exitCode = failures ? 1 : 0;
