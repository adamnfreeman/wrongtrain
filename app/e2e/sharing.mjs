// The sharing screens, without reaching the server: share asks you to sign in, the sign-in
// sheet takes an email, the join sheet opens from the welcome screen and from an invite link.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const DIST = process.argv[2], OUT = process.argv[3];
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', '8092', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await wait(1000);
/* the server is out of reach on purpose: these checks are about the screens */
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.route(/supabase\.co/, r => r.abort('internetdisconnected'));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
let failures = 0;
const check = (c, m) => { if (!c) failures++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const sheet = page.locator('.sheet-wrap').last();

await page.goto('http://localhost:8092/');
await page.waitForSelector('text=Explore a sample trip');
check(await page.locator('text=Join a trip with a code').count() === 1, 'welcome offers joining with a code');
check(await page.locator('.acct >> text=Sign in').count() === 1, 'welcome offers signing in');

/* a trip of your own, then share it */
await page.click('text=Plan your own trip');
await sheet.getByLabel('Stop 1').fill('Lisbon');
await sheet.getByText('Create').click();
await page.click('text=Trip settings');
check(await page.locator('text=Only on this phone right now').count() === 1, 'settings says the trip is only on this phone');
await page.click('text=Share with the group');
await page.waitForSelector('.sheet-wrap >> text=Sign in to share this trip');
check(true, 'sharing while signed out asks you to sign in');
const send = sheet.locator('.sheet-bar .linkbtn.strong');
check(await send.isDisabled(), 'Send code waits for a real email address');
await sheet.getByLabel('Email').fill('ana@example.com');
check(!(await send.isDisabled()), '... and is ready once there is one');
await wait(400);
await page.screenshot({ path: `${OUT}/s-1-sign-in.png` });
await sheet.getByText('Send code', { exact: true }).last().click();
await page.waitForSelector('.sheet-wrap [role=alert]', { timeout: 15000 });
const alert = await page.textContent('.sheet-wrap [role=alert]');
check(/No connection/.test(alert), `no connection is reported, not swallowed: "${alert.slice(0, 60)}"`);

/* the sample cannot be shared as it is */
await page.goto('http://localhost:8092/');
await page.evaluate(() => localStorage.clear());
await page.goto('http://localhost:8092/');
await page.click('text=Explore a sample trip');
await page.click('text=Trip settings');
check(await page.locator('text=start your own copy of it').count() === 1, 'the sample points you to making a copy before sharing');

/* an invite link opens the join sheet with the code filled in */
await page.goto('http://localhost:8092/#join=k7pq2mxa');
await page.waitForSelector('.sheet-wrap');
check(await page.getByLabel('Invite code').inputValue() === 'K7PQ2MXA', 'invite link fills in the code');
check(!(await page.evaluate(() => location.hash.includes('join'))), '... and is cleared from the address');
await wait(400);
await page.screenshot({ path: `${OUT}/s-2-join.png` });
await page.locator('.sheet-bar .linkbtn.strong').last().click();
await page.waitForSelector('.sheet-wrap >> text=Sign in to join the trip');
check(true, 'joining while signed out asks you to sign in first');

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
