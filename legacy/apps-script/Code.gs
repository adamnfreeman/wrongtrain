/**
 * Japan 2026: connects the trip page to this spreadsheet. Sign-in required.
 *
 * Nothing is returned without a name and passcode from the "Accounts" tab.
 * Reading: every tab's cells exactly as displayed, plus links (never the Accounts tab).
 * Writing, two things only:
 *   - a checkbox in column A of the "To Do" tab, when someone ticks a to-do on the page
 *   - a new row at the bottom of the "Group Notes" tab, when someone leaves a note on the page
 * A new note is then filed into the sheet within about a minute (Filer.gs).
 *
 * To add or remove people, edit the Accounts tab: one row each, Name and Passcode.
 * Changes there take effect straight away; this script does not need redeploying.
 *
 * @OnlyCurrentDoc
 */
var ACCOUNTS_TAB = 'Accounts';
var NOTES_TAB = 'Group Notes';
var MAX_NOTE = 600;         // characters kept from one note
var MAX_NOTES = 20;         // notes one person can add within LOCK_SECONDS
var STARTER_NAMES = ['Adam', 'Andrea', 'Drew', 'Jared', 'Michael'];
var MAX_TRIES = 8;          // wrong passcodes allowed per name ...
var LOCK_SECONDS = 600;     // ... within this many seconds

function doGet(e) {
  var p = (e && e.parameter) || {};
  var login = checkLogin_(p);
  if (!login.ok) return respond_(p, { v: 2, ok: false, error: login.error });

  if (p.action === 'check') {
    var result = setCheck_(p);
    result.v = 2;
    return respond_(p, result);
  }
  if (p.action === 'note') {
    var noted = addNote_(p, login.name);
    noted.v = 2;
    if (noted.ok) { try { fileSoon_(); } catch (err) { /* the hourly sweep files it instead */ } }
    return respond_(p, noted);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabs = [];
  ss.getSheets().forEach(function (sh) {
    if (sh.getName() === ACCOUNTS_TAB) return;          // never sent to the page
    var range = sh.getDataRange();
    var values = range.getDisplayValues();
    var rich = range.getRichTextValues();
    var links = {};
    var rows = values.map(function (row, r) {
      var last = row.length;
      while (last > 0 && row[last - 1] === '') last--;
      for (var c = 0; c < last; c++) {
        var cell = rich[r] && rich[r][c];
        var url = cell ? cell.getLinkUrl() : null;
        if (url) links[r + ',' + c] = url;
      }
      return row.slice(0, last);
    });
    while (rows.length && rows[rows.length - 1].length === 0) rows.pop();
    tabs.push({ title: sh.getName(), rows: rows, links: links });
  });
  return respond_(p, { v: 2, ok: true, name: login.name, updated: new Date().toISOString(), tabs: tabs });
}

/** Is this name and passcode in the Accounts tab? Locks a name for a while after too many wrong tries. */
function checkLogin_(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ACCOUNTS_TAB) || createAccounts_(ss);
  var name = norm_(p.name), code = norm_(p.code);
  if (!name || !code) return { ok: false, error: 'signin' };

  var cache = CacheService.getScriptCache();
  var key = 'tries:' + name.slice(0, 60);
  var tries = parseInt(cache.get(key) || '0', 10);
  if (tries >= MAX_TRIES) return { ok: false, error: 'locked' };

  var rows = sh.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    var rowCode = norm_(rows[i][1]);
    if (norm_(rows[i][0]) === name && rowCode && rowCode === code) {
      return { ok: true, name: String(rows[i][0]).trim() };
    }
  }
  cache.put(key, String(tries + 1), LOCK_SECONDS);
  return { ok: false, error: 'signin' };
}

/** First run only: makes the Accounts tab with a random passcode for each starter name. */
function createAccounts_(ss) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = ss.getSheetByName(ACCOUNTS_TAB);
    if (sh) return sh;
    sh = ss.insertSheet(ACCOUNTS_TAB, ss.getSheets().length);
    var rows = [['Name', 'Passcode', 'One row per person. Edit, add or delete rows any time; changes apply straight away.']];
    STARTER_NAMES.forEach(function (n) { rows.push([n, newCode_(), '']); });
    sh.getRange(1, 1, rows.length, 3).setValues(rows);
    sh.getRange(1, 1, 1, 3).setFontWeight('bold');
    sh.setFrozenRows(1);
    SpreadsheetApp.flush();
    return sh;
  } finally {
    lock.releaseLock();
  }
}

function newCode_() {
  var letters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O or 1/I/L, so codes are easy to read out
  var out = '';
  for (var i = 0; i < 6; i++) out += letters.charAt(Math.floor(Math.random() * letters.length));
  return out;
}

/** Names and passcodes are compared without regard to capitals or spaces. */
function norm_(s) {
  return String(s == null ? '' : s).replace(/\s+/g, '').toLowerCase();
}

/** Add one note, with the signed-in person's name, to the bottom of the Group Notes tab. */
function addNote_(p, who) {
  var text = String(p.text || '').replace(/[ \t]+/g, ' ').trim();
  if (!text) return { ok: false, error: 'Empty note' };
  if (text.length > MAX_NOTE) text = text.slice(0, MAX_NOTE);

  var cache = CacheService.getScriptCache();
  var key = 'notes:' + norm_(who).slice(0, 60);
  var count = parseInt(cache.get(key) || '0', 10);
  if (count >= MAX_NOTES) return { ok: false, error: 'Too many notes in a short time; try again in a few minutes' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var when = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'MMM d, h:mm a');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = ss.getSheetByName(NOTES_TAB);
    if (!sh) {
      sh = ss.insertSheet(NOTES_TAB, ss.getSheets().length);
      sh.getRange(1, 1, 1, 4).setValues([['When', 'Who', 'Note', 'Done']]).setFontWeight('bold');
      sh.setFrozenRows(1);
      sh.setColumnWidth(3, 520);
    }
    var row = Math.max(sh.getLastRow(), 1) + 1;
    var cells = sh.getRange(row, 1, 1, 3);
    cells.setNumberFormat('@');                 // plain text, so a note starting with "=" can never run as a formula
    cells.setValues([[when, who, text]]);
    cells.setWrap(true);
    sh.getRange(row, 4).insertCheckboxes();     // tick it once the note has been dealt with
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  cache.put(key, String(count + 1), LOCK_SECONDS);
  return { ok: true, noted: true, when: when, who: who, text: text };
}

/** Tick or untick one to-do. Finds the row by its task text, so a moved row is still the right one. */
function setCheck_(p) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('To Do');
  if (!sh) return { ok: false, error: 'No "To Do" tab' };
  var want = String(p.text || '').trim();
  if (!want) return { ok: false, error: 'No task given' };
  var last = sh.getLastRow();
  var tasks = sh.getRange(1, 3, last, 1).getDisplayValues();   // column C holds the task
  var row = parseInt(p.row, 10);
  if (!(row >= 1 && row <= last && String(tasks[row - 1][0]).trim() === want)) {
    row = -1;
    for (var i = 0; i < tasks.length; i++) {
      if (String(tasks[i][0]).trim() === want) { row = i + 1; break; }
    }
  }
  if (row < 1) return { ok: false, error: 'Task not found' };
  var box = sh.getRange(row, 1);
  var now = box.getValue();
  if (now !== true && now !== false) return { ok: false, error: 'Not a checkbox' };
  var done = p.done === '1' || p.done === 'true';
  box.setValue(done);
  SpreadsheetApp.flush();
  return { ok: true, row: row, done: done };
}

/** JSON normally; ?callback=name wraps it for pages that must load it as a script. */
function respond_(p, obj) {
  var body = JSON.stringify(obj);
  var cb = p.callback;
  if (cb && /^[A-Za-z_$][\w$]*$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + body + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}
