// Account & settings, signed in: changing the email the account signs in with. Supabase's sign-in
// server is played here: a code goes to the new address, and entering it makes the switch.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const DIST = process.argv[2], OUT = process.argv[3];
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', '8089', '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await wait(1000);
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
let failures = 0;
const errors = [];
const check = (c, m) => { if (!c) failures++; console.log((c ? 'PASS ' : 'FAIL ') + m); };

const UID = '00000000-0000-0000-0000-00000000000a';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UID, role: 'authenticated', exp: 4102444800 })}.x`;
const user = email => ({ id: UID, email, aud: 'authenticated', role: 'authenticated' });
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user: user('adam@example.com') };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const asked = [];
await ctx.route(/supabase\.co/, async r => {
  const u = r.request().url(), m = r.request().method();
  const json = b => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
  if (/\/auth\/v1\/user/.test(u) && m === 'PUT') { asked.push({ change: JSON.parse(r.request().postData()) }); return json(user('adam@example.com')); }
  if (/\/auth\/v1\/user/.test(u)) return json(user('adam@example.com'));
  if (/\/auth\/v1\/verify/.test(u)) {
    const b = JSON.parse(r.request().postData()); asked.push({ verify: b });
    if (b.token !== '123456') return r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' }) });
    return json({ ...session, user: user('adam@wrongtrain.lol') });
  }
  if (/\/rest\/v1\/trip_members/.test(u) && m === 'PATCH') {
    /* the first time, the database hasn't been updated yet: the error Adam saw */
    if (!asked.some(a => 'avatar' in a)) { asked.push({ avatar: 'refused' }); return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST204', message: "Could not find the 'avatar' column of 'trip_members' in the schema cache" }) }); }
    asked.push({ avatar: JSON.parse(r.request().postData()).avatar }); return r.fulfill({ status: 204, body: '' });
  }
  if (/\/rest\/v1\//.test(u)) return json([]);
  return r.abort('internetdisconnected');
});
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:8089/');
await page.evaluate(s => localStorage.setItem('wt-auth', JSON.stringify(s)), session);
await page.reload();
await page.waitForSelector('text=Explore a sample trip');

await page.click('.acctbtn');
await page.waitForSelector('.sheet-wrap >> text=Signed in as');

/* test mode, while the app is invite-only */
await page.getByLabel('Test mode').check();
check(await page.evaluate(() => localStorage.getItem('wt-pref-plan-test-dev')) === 'true', 'Account & settings has a Test mode switch for the planner');
await page.getByLabel('Test mode').uncheck();

/* a profile picture: chosen, shrunk to a small square, shown, and put on your trips */
await page.setInputFiles('input[aria-label="Profile photo"]', 'public/apple-touch-icon.png');
await page.waitForSelector('.photopick img.avatar');
await page.waitForSelector('.photopick >> text=Saved on this phone');
check(await page.locator('.photopick [role=alert]').count() === 0, 'before the database is ready: no error, the picture is kept on the phone and says so');
await page.setInputFiles('input[aria-label="Profile photo"]', 'public/apple-touch-icon.png');
await page.waitForFunction(() => !document.querySelector('.photopick .fhint'));
const pic = await page.getAttribute('.photopick img.avatar', 'src');
check(/^data:image\/jpeg;base64,/.test(pic) && pic.length < 60000, `the photo becomes a small JPEG (${Math.round(pic.length / 1024)} KB as text)`);
check(asked.some(a => a.avatar === pic), '... and goes on your trips');
check(await page.locator('.acctbtn.pic img').count() > 0, 'the corner button shows it');
await page.click('.photopick button:has-text("Remove")');
await page.waitForSelector('.photopick .avatar.initials');
check(asked.some(a => a.avatar === null), 'Remove takes it off again');
await page.click('.sheet-wrap button:has-text("Change email")');
const sheet = page.locator('.sheet-wrap').last();
await sheet.getByLabel('New email').fill('adam@example.com');
check(await sheet.locator('button:has-text("Send code")').last().isDisabled(), 'the same address as now cannot be sent');
await sheet.getByLabel('New email').fill('adam@wrongtrain.lol');
await sheet.locator('.chips button:has-text("Send code")').click();
await sheet.getByLabel('Code').waitFor();
check(asked.some(a => a.change && a.change.email === 'adam@wrongtrain.lol'), 'asks Supabase to move the account to the new address');
await sheet.getByLabel('Code').fill('999999');
await sheet.locator('.chips button:has-text("Change email")').click();
await sheet.locator('[role=alert]').waitFor();
check(true, 'a wrong code says so');
await sheet.getByLabel('Code').fill('123456');
await sheet.locator('.chips button:has-text("Change email")').click();
await sheet.locator('text=You now sign in with').waitFor();
check(asked.some(a => a.verify && a.verify.type === 'email_change' && a.verify.email === 'adam@wrongtrain.lol'), 'the code is checked as an email change for the new address');
if (OUT) await sheet.screenshot({ path: `${OUT}/acct-email.png` });

check(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
srv.kill();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
