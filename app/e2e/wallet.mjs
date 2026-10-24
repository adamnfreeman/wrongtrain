// Wallet and photos: a shared ticket and a private ID (kept on the phone), expenses split three
// ways with settling up and Venmo, a payment in yen, and photos on a day of a shared trip, with
// exchange rates and the server stood in.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const DIST = process.argv[2], OUT = process.argv[3];
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', '8095', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
/* wait until the server answers (a fixed second wasn't always enough) */
for (let i = 0; i < 100; i++) { try { await fetch('http://127.0.0.1:8095/'); break; } catch { await wait(100); } }
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
let failures = 0;
const errors = [];
const check = (c, m) => { if (!c) failures++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
/* a tiny real PNG, as a "scan" */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.route(/supabase\.co/, r => r.abort('internetdisconnected'));
await ctx.route(/frankfurter/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ rates: { USD: 0.0067 } }) }));
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message));
const sheet = page.locator('.sheet-wrap').last();
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('wrongtrain')).trips[0]);

await page.goto('http://localhost:8095/');
await page.click('text=Plan it myself');
await sheet.getByLabel('Stop 1').fill('Kyoto');
await sheet.getByText('Create').click();
await page.waitForSelector('.tabs');

/* documents */
await page.click('.tab:has-text("Wallet")');
check(await page.locator('text=Keep tickets, bookings and IDs here').count() === 1, 'Wallet starts empty, saying what it is for');
await page.click('text=+ Add a document');
await sheet.getByLabel('What it is').fill('JR Pass');
await sheet.locator('input[type=file]').setInputFiles({ name: 'jrpass.png', mimeType: 'image/png', buffer: PNG });
await sheet.getByText('Save', { exact: true }).click();
await page.waitForSelector('text=JR Pass');
const t1 = await stored();
check(t1.docs?.length === 1 && t1.docs[0].file?.path.startsWith(t1.id + '/docs/'), 'a ticket is part of the trip, with its file');
const kept = await page.evaluate(p => new Promise(ok => { const r = indexedDB.open('wt-files'); r.onsuccess = () => { const g = r.result.transaction('files').objectStore('files').get(p); g.onsuccess = () => ok(!!g.result); }; }), t1.docs[0].file.path);
check(kept, '... and the file is kept on the phone');
await page.click('text=+ Add a document');
await sheet.getByLabel('What it is').fill('Adam passport');
await sheet.getByLabel('Kind').selectOption('id');
check(await sheet.getByLabel('Who can see it').inputValue() === 'me', 'an ID is just yours, on this phone, by default');
await sheet.locator('input[type=file]').setInputFiles({ name: 'passport.png', mimeType: 'image/png', buffer: PNG });
await sheet.getByText('Save', { exact: true }).click();
await page.waitForSelector('text=Adam passport');
const priv = await page.evaluate(() => JSON.parse(localStorage.getItem('wt-private-docs')));
check((await stored()).docs.length === 1 && Object.values(priv)[0][0].file.path.startsWith('private/'), '... kept apart from the trip, never to be uploaded');
check(await page.locator('.pill:has-text("Private")').count() === 1, '... and marked Private');
await page.screenshot({ path: `${OUT}/w-1-docs.png` });

/* money: who is going, and who I am */
await page.click('.tab:has-text("Trip")').then(() => page.click('.hubrows button:has-text("Trip settings")'));
await sheet.getByLabel("Who's going").fill('Adam, Ben, Cat');
await sheet.getByText('Save', { exact: true }).click();
await page.click('#view .acctbtn'); await page.getByLabel('Your name, for notes and ticks').fill('Adam'); await page.click('.sheet-wrap >> text=Done');
await page.click('.tab:has-text("Wallet")');
await page.click('.seg >> text=Money');
await page.click('text=+ Add an expense');
await sheet.getByLabel('What for').fill('Dinner in Pontocho');
await sheet.getByLabel('Amount', { exact: true }).fill('90');
await sheet.getByText('Save', { exact: true }).click();
await page.waitForSelector('text=Dinner in Pontocho');
const settle = await page.locator('.blk:has-text("Settle up") .sheet li').allTextContents();
check(settle.length === 2 && settle.every(s => /→ you/.test(s) && /\$30\.00/.test(s)), `split three ways, Ben and Cat each owe $30: ${settle.join(' | ')}`);

/* a payment in yen, at today's rate */
await page.click('text=+ Add an expense');
await sheet.getByLabel('What for').fill('Temple tickets');
await sheet.getByLabel('Amount', { exact: true }).fill('3000');
await sheet.getByLabel('Currency').selectOption('JPY');
await wait(300);
check((await sheet.getByLabel('USD per JPY').inputValue()) === '0.0067', "the rate is filled in from today's rates");
await sheet.getByLabel('Paid by').selectOption('Ben');
await sheet.getByText('Save', { exact: true }).click();
await page.waitForSelector('text=Temple tickets');
check(await page.locator('text=≈ $20.10').count() === 1, '... and shown in the trip currency');

/* Venmo: Adam sets his username; Ben sees a button to pay him */
await page.fill('[aria-label="Your Venmo username"]', '@adam-f'); await page.locator('[aria-label="Your Venmo username"]').blur();
await page.click('#view .acctbtn'); await page.getByLabel('Your name, for notes and ticks').fill('Ben'); await page.click('.sheet-wrap >> text=Done');
await page.click('.tab:has-text("Today")'); await page.click('.tab:has-text("Wallet")');
const venmo = page.locator('a:has-text("Pay with Venmo")');
check(await venmo.count() === 1 && /venmo\.com\/adam-f\?txn=pay&amount=16\.60/.test(await venmo.getAttribute('href')), 'Ben gets a Pay with Venmo link to Adam, for $30 less his share of what he paid ($16.60)');
await page.screenshot({ path: `${OUT}/w-2-money.png` });
page.once('dialog', d => d.accept());
await page.locator('.blk:has-text("Settle up") li:has-text("You →") >> text=Mark as paid').click();
await wait(200);
check((await stored()).settlements?.length === 1 && await page.locator('.blk:has-text("Settle up") li:not(.paid):has-text("You →")').count() === 0, 'marking it paid settles Ben up');
check(await page.locator('.paidlist li.paid:has-text("You →") .stamp').count() === 1, '... and the payment stays, stamped PAID');

/* photos on a shared trip, against a stand-in server */
{
  const trip = await stored();
  const UID = '00000000-0000-0000-0000-00000000000a';
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UID, role: 'authenticated', exp: 4102444800 })}.x`;
  const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user: { id: UID, email: 'adam@example.com', aud: 'authenticated' } };
  const uploads = [], photoRows = [];
  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await c2.route(/supabase\.co/, async r => {
    const u = r.request().url(), m = r.request().method(), json = (b, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
    if (/\/storage\/v1\/object\/trip-files\//.test(u) && m === 'POST') { uploads.push(u.split('trip-files/')[1]); return json({ Key: 'x' }); }
    if (/\/rest\/v1\/trip_photos/.test(u) && m === 'POST') { const row = { ...JSON.parse(r.request().postData()), author_name: 'Adam', created_at: new Date().toISOString() }; photoRows.push(row); return json(row, 201); }
    if (/\/rest\/v1\/trip_photos/.test(u)) return json(photoRows);
    if (/\/rest\/v1\/trips/.test(u)) return json([{ id: trip.id, data: trip, version: 1, rule: 'approve' }]);
    if (/\/rest\/v1\/trip_members/.test(u)) return json([{ trip_id: trip.id, role: 'owner' }]);
    if (/\/rest\/v1\/trip_requests/.test(u)) return json([]);
    return r.abort('internetdisconnected');
  });
  const p2 = await c2.newPage();
  p2.on('pageerror', e => errors.push(e.message));
  await p2.goto('http://localhost:8095/');
  await p2.evaluate(([t, s]) => {
    localStorage.setItem('wrongtrain', JSON.stringify({ trips: [t], activeId: t.id, me: 'Adam', sync: { [t.id]: { version: 1, base: t, dirty: false, rule: 'approve', role: 'owner' } } }));
    localStorage.setItem('wt-auth', JSON.stringify(s));
  }, [trip, session]);
  await p2.reload();
  await p2.click('.tab:has-text("Photos")');
  const ph = '.pane[data-tab="photos"]';
  await p2.waitForSelector('.addfab:has-text("Add photos")');
  await p2.locator('input.photopick').setInputFiles([{ name: 'a.png', mimeType: 'image/png', buffer: PNG }, { name: 'b.png', mimeType: 'image/png', buffer: PNG }]);
  await p2.waitForFunction(() => document.querySelectorAll('.pane[data-tab="photos"] .pthumb img').length === 2, null, { timeout: 10000 }).catch(() => {});
  check(await p2.locator(ph + ' .pthumb').count() === 2, 'two photos show on the Photos page');
  await p2.waitForFunction(() => !document.querySelector('.pwait'), null, { timeout: 10000 }).catch(() => {});
  check(uploads.length === 4 && uploads.every(u => u.startsWith(trip.id + '/photos/')), 'each is uploaded with a thumbnail, under the trip');
  check(photoRows.length === 2 && photoRows.every(r => r.thumb.endsWith('.t.jpg')), '... and listed for everyone');
  await p2.locator(ph + ' .pthumb').first().click();
  check(await p2.locator('.pview >> text=1 of 2').count() === 1, 'tapping one opens it full screen');
  await p2.screenshot({ path: `${OUT}/w-3-photo.png` });
  await c2.close();
}

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
