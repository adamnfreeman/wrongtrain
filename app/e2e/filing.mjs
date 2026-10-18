// Claude filing group notes, with the file-note Edge Function and the database stood in for.
// A contributor's note ("can add ideas"): the idea and the to-do go straight in, putting it on a day goes to the owner
// as a request. The owner's note: everything goes in, and Undo takes it all back. Then a trip
// whose free allowance is used up, and a viewer, who cannot file.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const DIST = process.argv[2], OUT = process.argv[3];
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', '8094', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await wait(1000);
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
let failures = 0;
const check = (c, m) => { if (!c) failures++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('wrongtrain')));

/* a trip of our own to share */
await ctx.route(/supabase\.co/, r => r.abort('internetdisconnected'));
await page.goto('http://localhost:8094/');
await page.click('text=Plan it myself');
const sheet = page.locator('.sheet-wrap').last();
await sheet.getByLabel('Stop 1').fill('Lisbon');
await sheet.getByText('Create').click();
await page.waitForSelector('.tabs');
const trip = (await stored()).trips[0];
const day = trip.days[1] || trip.days[0], dest = trip.destinations[0];

/* the stand-in server */
const UID = '00000000-0000-0000-0000-00000000000b';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UID, role: 'authenticated', exp: 4102444800 })}.x`;
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user: { id: UID, email: 'ben@example.com', aud: 'authenticated' } };
let role = 'contributor', version = 3, calls = [], requests = [], answer = null;
await ctx.unroute(/supabase\.co/);
await ctx.route(/supabase\.co/, async r => {
  const u = r.request().url(), json = (b, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(b) });
  if (/\/functions\/v1\/file-note/.test(u)) {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
    calls.push({ body: JSON.parse(r.request().postData()), auth: r.request().headers().authorization });
    return answer.status ? json(answer.body, answer.status) : json(answer);
  }
  if (/\/rest\/v1\/trips/.test(u)) return json([{ id: trip.id, data: trip, version: 3, rule: 'approve' }]);
  if (/\/rest\/v1\/trip_members/.test(u)) return json([{ trip_id: trip.id, role }]);
  if (/\/rest\/v1\/trip_requests/.test(u)) return json([]);
  if (/\/rpc\/save_trip/.test(u)) return json(++version);
  if (/\/rpc\/request_change/.test(u)) { requests.push(JSON.parse(r.request().postData())); return json('req-' + requests.length); }
  return r.abort('internetdisconnected');
});
const signInAs = async who => {
  role = who;
  await page.evaluate(([t, s, who]) => {
    localStorage.setItem('wrongtrain', JSON.stringify({ trips: [t], activeId: t.id, me: 'Ben', sync: { [t.id]: { version: 3, base: t, dirty: false, rule: 'approve', role: who } } }));
    localStorage.setItem('wt-auth', JSON.stringify(s));
    localStorage.removeItem('wt-outbox');
  }, [trip, session, who]);
  await page.reload();
  await page.waitForSelector('.tabs');
  await page.click('.tab:has-text("Trip")').then(() => page.click('.tile:has-text("To do")'));
};
const fileAnswer = {
  changes: [
    { type: 'place', key: 'p1', name: 'Time Out Market', kind: 'food', destinationId: dest.id, area: 'Cais do Sodré', notes: 'Food hall with stalls from local chefs.', link: null, wishlist: false, dayIds: [day.id] },
    { type: 'todo', group: 'Tickets', text: 'Buy a Viva Viagem card', details: null, when: 'On arrival' },
    { type: 'plan', dayId: day.id, text: 'Lunch at Time Out Market', time: '13:00', end: null, fixed: false, placeId: 'p1' },
  ],
  reply: 'Added Time Out Market to the Lisbon ideas and a to-do for the Viva Viagem card.', done: true, left: 3,
};

/* a contributor's note */
await signInAs('contributor');
check(await page.locator('#gnotes >> text=WrongTrain files it into the trip').count() === 1, 'the notes box says notes are filed for everyone');
answer = fileAnswer;
await page.fill('#gnote', 'Lunch at Time Out Market on day 2, and we need Viva Viagem cards');
await page.click('text=Add note');
await page.waitForSelector('#gnotes .filed >> text=Undo', { timeout: 5000 }).catch(() => {});
check(calls.length === 1 && calls[0].body.trip_id === trip.id && /Time Out Market/.test(calls[0].body.note.text), 'adding a note sends it to the file-note function');
check(calls[0]?.auth === `Bearer ${jwt}`, '... signed in as the person who wrote it');
const shown = await page.locator('#gnotes .filed').first().textContent();
check(/Added “Time Out Market” to places in Lisbon/.test(shown) && /Added the to-do “Buy a Viva Viagem card” \(Tickets\)/.test(shown), `it shows what was filed: "${shown}"`);
check(/add “Lunch at Time Out Market” at 1:00 PM \(sent to the owner for approval\)/.test(shown), '... and that the plan change went to the owner');
check(/3 free filings left/.test(shown), '... and that the free allowance is running low');
let s = await stored();
let t = s.trips[0];
const tom = t.places.find(p => p.name === 'Time Out Market');
check(tom && tom.wishlist && !tom.dayIds && tom.lat === undefined && tom.area === 'Cais do Sodré', 'the place goes straight in as an idea, with no map pin guessed');
check(t.todos.some(x => x.text === 'Buy a Viva Viagem card' && x.group === 'Tickets') && t.todoGroups.includes('Tickets'), '... and the to-do, in a new group');
check(!t.days.some(d => d.plan.some(i => i.text === 'Lunch at Time Out Market')), '... but the plan item waits');
const note = t.notes.at(-1);
check(note.done && /Added Time Out Market/.test(note.filed), 'the note is marked dealt with, with Claude’s reply');
await wait(1500);
check(requests.length === 1 && requests[0].summary.some(l => /Put “Time Out Market” on/.test(l)) && requests[0].summary.some(l => /add “Lunch at Time Out Market”/.test(l)), 'the plan part is sent as one request');
await page.locator('#gnotes').screenshot({ path: `${OUT}/f-1-editor.png` });

/* the owner's note: all of it goes in, and Undo takes it back */
calls = []; requests = [];
await signInAs('owner');
await page.fill('#gnote', 'Lunch at Time Out Market on day 2, and we need Viva Viagem cards');
await page.click('text=Add note');
await page.waitForSelector('#gnotes .filed >> text=Undo', { timeout: 5000 }).catch(() => {});
t = (await stored()).trips[0];
check(t.days.find(d => d.id === day.id).plan.some(i => i.text === 'Lunch at Time Out Market' && i.time === '13:00'), 'for the owner, the plan item goes straight in');
check(t.places.find(p => p.name === 'Time Out Market')?.dayIds?.[0] === day.id, '... and the place is on the day');
check(!/approval/.test(await page.locator('#gnotes .filed').first().textContent()), '... with nothing waiting for approval');
await page.locator('#gnotes .filed >> text=Undo').click();
t = (await stored()).trips[0];
check(!t.places.some(p => p.name === 'Time Out Market') && !t.todos.some(x => x.text === 'Buy a Viva Viagem card') && !t.todoGroups.includes('Tickets'), 'Undo takes the place, the to-do and its group back');
check(!t.days.some(d => d.plan.some(i => i.text === 'Lunch at Time Out Market')), '... and the plan item');
check(!t.notes.at(-1).done && !t.notes.at(-1).filed, '... and reopens the note');
check(await page.locator('#gnotes >> text=File it into the trip').count() === 1, 'an open note can be filed again');

/* the free allowance is used up */
answer = { status: 402, body: { error: 'allowance', message: 'This trip has used its free filings. The note stays open for the owner.' } };
await page.locator('#gnotes >> text=File it into the trip').click();
await page.waitForSelector('#gnotes .filed.bad', { timeout: 5000 }).catch(() => {});
check(/used its free filings/.test(await page.locator('#gnotes .filed.bad').textContent().catch(() => '')), 'when the allowance is used up, it says so');
check(!(await stored()).trips[0].notes.at(-1).done, '... and the note stays open');
check(await page.locator('#gnotes .filed.bad >> text=Try again').count() === 1, '... with a way to try again');
await page.locator('#gnotes').screenshot({ path: `${OUT}/f-2-allowance.png` });

/* a viewer's note is left for someone who can edit */
calls = [];
await signInAs('viewer');
await page.fill('#gnote', 'Can we go to Sintra?');
await page.click('text=Add note');
await wait(500);
check(calls.length === 0, 'a viewer’s note is not sent to Claude');
check(await page.locator('#gnotes >> text=File it into the trip').count() === 0, '... and a viewer gets no button for it');

/* the Add button on any page files the same way, and shows what was filed in its box */
calls = []; answer = fileAnswer;
await signInAs('owner');
await page.locator('.addfab').click();
const box = page.locator('.sheet-wrap[aria-label="Add anything"]');
await box.locator('textarea').fill('Lunch at Time Out Market on day 2, and we need Viva Viagem cards');
await box.getByRole('button', { name: 'Add it to the trip' }).click();
await box.locator('text=Undo').waitFor({ timeout: 5000 }).catch(() => {});
check(calls.length === 1, 'the Add button sends what you typed to be filed');
check(/Time Out Market/.test(await box.locator('.addlog').textContent()), '... and shows what was filed, in the box');
await box.getByRole('button', { name: 'Done' }).click();

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
