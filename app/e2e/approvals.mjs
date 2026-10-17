// Changes that need the owner's OK, without reaching the server: a trip shared with you as a
// contributor ("can add ideas") keeps additions but turns a rename into a request, kept on the phone
// until there is signal; as a viewer, only notes go in.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const DIST = process.argv[2], OUT = process.argv[3];
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', '8093', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await wait(1000);
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.route(/supabase\.co/, r => r.abort('internetdisconnected'));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
let failures = 0;
const check = (c, m) => { if (!c) failures++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const sheet = page.locator('.sheet-wrap').last();
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('wrongtrain')));
/** Marks the open trip as shared with you, in this role. */
const shareAs = async role => {
  await page.evaluate(role => {
    const s = JSON.parse(localStorage.getItem('wrongtrain'));
    const t = s.trips.find(x => x.id === s.activeId);
    s.sync = { [t.id]: { version: 3, base: t, dirty: false, rule: 'approve', role } };
    s.me = 'Ben';
    localStorage.setItem('wrongtrain', JSON.stringify(s));
    localStorage.removeItem('wt-outbox');
  }, role);
  await page.reload();
  await page.waitForSelector('.tabs');
};

await page.goto('http://localhost:8093/');
await page.click('text=Plan it myself');
await sheet.getByLabel('Stop 1').fill('Lisbon');
await sheet.getByText('Create').click();
await page.waitForSelector('.tabs');
await shareAs('contributor');

/* a contributor's rename becomes a request */
await page.click('.tab:has-text("Trip")').then(() => page.click('.hubrows button:has-text("Trip settings")'));
await sheet.waitFor();
check(await sheet.locator('text=Your level').count() === 1 && await sheet.locator('text=Can add ideas').count() > 0, 'settings say what your level lets you do');
await sheet.getByLabel('Trip name').fill('Ben’s trip');
await sheet.getByText('Save', { exact: true }).click();
await page.waitForSelector('.toast');
const toast = await page.textContent('.toast');
check(/for approval/.test(toast) && /Rename the trip/.test(toast), `the rename goes off for approval: "${toast}"`);
const after = await stored();
check(after.trips[0].name === 'Lisbon', '... and the trip keeps its name meanwhile');
check(!after.sync[after.activeId].dirty, '... with nothing unsaved');
const box = await page.evaluate(() => JSON.parse(localStorage.getItem('wt-outbox') || '[]'));
check(box.length === 1 && box[0].after.name === 'Ben’s trip' && !('days' in box[0].after), 'the request holds just the change, kept for when there is signal');
await wait(300);
await page.screenshot({ path: `${OUT}/a-1-sent.png` });

/* it shows on the To do tab, and can be withdrawn */
await page.click('.tab:has-text("Trip")').then(() => page.click('.tile:has-text("To do")'));
check(await page.locator('#requests >> text=Waiting for approval').count() === 1, 'To do lists it under Waiting for approval');
check(await page.locator('#requests >> text=waiting for signal').count() === 1, '... marked as waiting for signal');
check(await page.locator('.tabn').count() === 0, 'no badge for someone who cannot approve');
await page.screenshot({ path: `${OUT}/a-2-waiting.png` });

/* additions go straight in */
await page.locator('text=+ Add a to-do').first().click();
await sheet.waitFor();
await sheet.getByLabel('To do', { exact: true }).fill('Buy a Viva Viagem card');
await sheet.getByText('Save', { exact: true }).click();
check((await stored()).trips[0].todos.some(t => t.text === 'Buy a Viva Viagem card'), 'a new to-do goes straight in');
check((await stored()).sync[after.activeId].dirty, '... waiting to be saved for everyone');

await page.locator('#requests >> text=Withdraw').click();
check(await page.locator('#requests').count() === 0, 'withdrawing it takes it off the list');
check((await page.evaluate(() => localStorage.getItem('wt-outbox'))) === '[]', '... and off the phone');

/* a viewer only leaves notes */
await shareAs('viewer');
await page.click('.tab:has-text("Trip")').then(() => page.click('.hubrows button:has-text("Trip settings")'));
await sheet.waitFor();
check(await sheet.locator('text=They see everything and leave notes').count() === 1 && await sheet.locator('text=Look and leave notes').count() > 0, 'settings tell a viewer what they can do');
await sheet.getByLabel('Trip name').fill('Mine now');
await sheet.getByText('Save', { exact: true }).click();
await page.waitForSelector('.toast.bad');
check(/leave notes/.test(await page.textContent('.toast')), 'a viewer’s change is refused, with a reason');
check((await stored()).trips[0].name === 'Lisbon', '... and nothing changes');
check((await page.evaluate(() => localStorage.getItem('wt-outbox') || '[]')) === '[]', '... and no request is made');
await page.click('.tab:has-text("Trip")').then(() => page.click('.tile:has-text("To do")'));
await page.fill('#gnote', 'Can we go to Sintra?');
await page.click('text=Add note');
check((await stored()).trips[0].notes.some(n => n.text === 'Can we go to Sintra?'), 'a viewer can still leave a note');

/* the owner's side, against a stand-in for the server: Ben asked to rename the trip */
const tripState = await stored();
const trip = tripState.trips[0];
const UID = '00000000-0000-0000-0000-00000000000a';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UID, role: 'authenticated', exp: 4102444800 })}.x`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user: { id: UID, email: 'ana@example.com', aud: 'authenticated' } };
const req = { id: 'req-1', trip_id: trip.id, author: 'ben-id', author_name: 'Ben', summary: ['Rename the trip to “Lisboa”'],
  before: { name: trip.name }, after: { name: 'Lisboa' }, status: 'pending', created_at: new Date().toISOString() };
let saved = null, decided = null;
const owner = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await owner.route(/supabase\.co/, async r => {
  const u = r.request().url(), json = b => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
  if (/\/rest\/v1\/trips/.test(u)) return json([{ id: trip.id, data: trip, version: 3, rule: 'approve' }]);
  if (/\/rest\/v1\/trip_members/.test(u)) return json([{ trip_id: trip.id, role: 'owner' }]);
  if (/\/rest\/v1\/trip_requests/.test(u)) return json(decided ? [{ ...req, status: 'approved' }] : [req]);
  if (/\/rpc\/decide_request/.test(u)) { decided = JSON.parse(r.request().postData()); saved = decided.trip_data; return json(4); }
  return r.abort('internetdisconnected');
});
const op = await owner.newPage();
op.on('pageerror', e => errors.push(e.message));
await op.goto('http://localhost:8093/');
await op.evaluate(([t, s]) => {
  localStorage.setItem('wrongtrain', JSON.stringify({ trips: [t], activeId: t.id, me: 'Ana', sync: { [t.id]: { version: 3, base: t, dirty: false, rule: 'approve', role: 'owner' } } }));
  localStorage.setItem('wt-auth', JSON.stringify(s));
}, [trip, session]);
await op.reload();
await op.waitForSelector('.tabn', { timeout: 10000 }).catch(() => {});
check(await op.locator('.tabn').textContent().catch(() => '') === '1', 'the owner sees a badge on To do');
await op.click('.tab:has-text("Trip")').then(() => op.click('.tile:has-text("To do")'));
check(await op.locator('#requests >> text=Waiting for your OK').count() === 1, '... and the request, waiting for her OK');
check(await op.locator('#requests >> text=Rename the trip to “Lisboa”').count() === 1, '... in words');
await op.locator('#requests').screenshot({ path: `${OUT}/a-3-owner.png` });
await op.locator('#requests >> text=Approve').click();
await op.waitForFunction(() => JSON.parse(localStorage.getItem('wrongtrain')).trips[0].name === 'Lisboa', null, { timeout: 5000 }).catch(() => {});
check(decided && decided.approve === true && decided.base_version === 3, 'approving tells the server, from the version she has');
check(saved && saved.name === 'Lisboa' && saved.days.length === trip.days.length, '... sending the trip with the change made');
const mine = await op.evaluate(() => JSON.parse(localStorage.getItem('wrongtrain')));
check(mine.trips[0].name === 'Lisboa' && mine.sync[trip.id].version === 4 && !mine.sync[trip.id].dirty, '... and her phone has it, saved at the new version');
check(await op.locator('.tabn').count() === 0, 'the badge goes once it is decided');
await op.click('.tab:has-text("Trip")').then(() => op.click('.hubrows button:has-text("Trip settings")'));
await op.locator('.sheet-wrap').last().waitFor();
check(await op.locator('.sheet-wrap .sayopt').count() === 3 && await op.locator('.sheet-wrap .sayopt[aria-checked="true"]:has-text("near the hotels")').count() === 1, 'the owner can set the level people join with');
await op.locator('.sheet-wrap').last().screenshot({ path: `${OUT}/a-4-settings.png` });
await owner.close();

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
