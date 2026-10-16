#!/usr/bin/env node
/* Turns the Japan 2026 sheet into a WrongTrain trip file, to open in the app with "Open a trip file".

   It fetches the sheet the way the Japan page does (its Apps Script web app, with your name and
   passcode, typed here and never stored), reads it with the page's own parser (parseTrip in
   template.html), and writes the trip as JSON. Run it again whenever the sheet changes; the
   trip keeps the same id, so opening the new file replaces the old one.

     node legacy/to-app.mjs                     ask for name and passcode, write to the Desktop
     node legacy/to-app.mjs --raw saved.json    convert a saved web-app response instead
     node legacy/to-app.mjs --out some/file.json
     node legacy/to-app.mjs --keep-raw saved.json   also save the sheet's response, for --raw later

   The file has booking numbers and logins from the sheet: keep it out of the repo. */
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { toTrip } from '../app/src/sheet/sheetTrip.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIVE_URL = 'https://script.google.com/macros/s/AKfycbwomx2AxfD05jvfIOhGDbaSaeL_-oBOonTAgQfSOFDpyI-G7Ptrugr_mciUOW81vUbe/exec';

const arg = n => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };
const OUT = arg('--out') || join(homedir(), 'Desktop', 'Japan 2026 (WrongTrain).json');

/* ---------- the page's own parser ---------- */
const tpl = readFileSync(join(HERE, 'template.html'), 'utf8');
const src = tpl.slice(tpl.indexOf('function parseTrip'), tpl.indexOf('/*PARSER-END*/'));
const parseTrip = new Function(src + '\nreturn parseTrip;')();

/* ---------- fetch ---------- */
function ask(q, hidden) {
  return new Promise(res => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = s => { if (s.startsWith(q)) rl.output.write(q); };
    rl.question(q, a => { rl.close(); if (hidden) process.stdout.write('\n'); res(a.trim()); });
  });
}
async function fetchRaw() {
  const name = await ask('Your name on the Japan page: ');
  const code = await ask('Your passcode (hidden): ', true);
  const u = `${LIVE_URL}?${new URLSearchParams({ t: String(Date.now()), name, code })}`;
  /* Google's script servers now and then answer 404 or 5xx for a moment; try a few times */
  let r;
  for (let i = 0; i < 4; i++) {
    r = await fetch(u, { redirect: 'follow' }).catch(() => null);
    if (r?.ok) break;
    await new Promise(res => setTimeout(res, 2000 * (i + 1)));
  }
  if (!r?.ok) throw new Error(`The sheet did not answer${r ? ` (HTTP ${r.status})` : ''}. Try again in a minute.`);
  const raw = await r.json();
  if (raw.ok === false) throw new Error(raw.error === 'locked' ? 'Too many tries for that name. Wait ten minutes.' : 'That name and passcode do not match.');
  if (!raw.tabs) throw new Error('The sheet answered, but without the trip.');
  return raw;
}

const raw = arg('--raw') ? JSON.parse(readFileSync(arg('--raw'), 'utf8')) : await fetchRaw().catch(e => { console.error(e.message); process.exit(1); });
if (arg('--keep-raw')) writeFileSync(arg('--keep-raw'), JSON.stringify(raw));
const trip = toTrip(parseTrip(raw));
writeFileSync(OUT, JSON.stringify({ wrongtrain: 1, trip }, null, 1));
console.log(`Saved ${trip.days.length} days, ${trip.legs.length} legs, ${trip.places.length} places and ${trip.todos.length} to-dos to:\n  ${OUT}`);
