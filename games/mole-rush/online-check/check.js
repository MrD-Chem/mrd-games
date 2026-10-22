/*
  Mole Rush — online race check (for teachers).
  Runs six checks one after another and explains each result in plain words:
    internet, sign-in, database read, database write, live updates, server clock.
  The write, live-update and clock checks each make a hidden temporary room (status
  'finished', so it never shows in the lobby) and delete it again when they are done.
  The page sets data-oc-state on <body> to 'running', then 'pass' or 'fail' (used by tests).
*/

import { signIn, get, put, patch, del, stream, syncClock, TIMESTAMP, isOnlineError, lastCspViolation } from '../js/online/firebase.js?v=20261022T1625';
import { el, clear } from '../js/dom.js?v=20261022T1625';

const DB_HOST = 'mr-d-chemistry-default-rtdb.firebaseio.com';
const CODE_CHARS = 'CDFGHJKMNPQRTVWXY234679';

const $ = (id) => document.getElementById(id);
const ui = {
  run: $('oc-run'),
  list: $('oc-list'),
  summary: $('oc-summary'),
  summaryIcon: $('oc-summary-icon'),
  summaryTitle: $('oc-summary-title'),
  summaryText: $('oc-summary-text'),
  summaryList: $('oc-summary-list'),
  it: $('oc-it'),
  report: $('oc-report'),
  copy: $('oc-copy'),
  copyMsg: $('oc-copy-msg')
};

const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));
const now = () => (window.performance && performance.now ? performance.now() : Date.now());

function secs(ms) {
  const s = ms / 1000;
  return (s < 10 ? s.toFixed(2) : String(Math.round(s))) + ' seconds';
}

function duration(ms) {
  const a = Math.abs(ms);
  if (a < 1000) return (a / 1000).toFixed(1) + ' seconds';
  if (a < 120000) return Math.round(a / 1000) + ' seconds';
  if (a < 2 * 3600000) return Math.round(a / 60000) + ' minutes';
  return Math.round(a / 3600000) + ' hours';
}

class CheckFailed extends Error {
  constructor(text, blocked, detail) {
    super(text);
    this.blocked = blocked;
    this.detail = detail || '';
  }
}

/* Turn an OnlineError into a plain sentence about the part that failed. */
function explain(err, part) {
  const code = isOnlineError(err) ? err.code : 'server';
  const v = lastCspViolation();
  const detail = (isOnlineError(err) ? err.code + (err.detail ? ': ' + err.detail : '') : String(err && err.message)) + (v && Date.now() - v.at < 15000 ? ' [CSP blocked ' + v.uri + ']' : '');
  if (code === 'offline') return new CheckFailed('This device went offline during the check. Reconnect to the Wi-Fi and run it again.', 'The device is offline', detail);
  if (code === 'timeout') return new CheckFailed(`The ${part.name} took too long to answer. The network may be very slow or overloaded right now.`, `The ${part.name} is too slow to answer`, detail);
  if (code === 'blocked') return new CheckFailed(`The network blocked the ${part.name} (${part.hosts}). A school web filter is the usual cause: ask IT to allow it.`, `The ${part.name} is blocked (${part.hosts})`, detail);
  if (code === 'denied') return new CheckFailed(`The ${part.name} refused the request: ${err.message} ${part.deniedHelp}`, `The ${part.name} refused the request`, detail);
  if (isOnlineError(err) && err.detail === 'TOO_MANY_ATTEMPTS') return new CheckFailed('Google is limiting new players that sign in from this network for now (too many new players in the last hour). Wait a few minutes and run the check again. Students who have raced before keep their sign-in and are not affected.', 'Sign-in is limited for a few minutes', detail);
  return new CheckFailed(`Something went wrong talking to the ${part.name}. Try again in a minute. (${detail})`, `The ${part.name} had an error`, detail);
}

const SIGN_IN = { name: 'sign-in server', hosts: 'identitytoolkit.googleapis.com and securetoken.googleapis.com', deniedHelp: 'In the Firebase console, check that Anonymous sign-in is turned on.' };
const DATABASE = { name: 'race database', hosts: DB_HOST + ' and *.firebaseio.com', deniedHelp: 'The database rules may have changed: re-publish the Mole Rush rules in the Firebase console.' };

function tempCode() {
  const r = new Uint32Array(5);
  window.crypto.getRandomValues(r);
  return 'ZCK' + Array.from(r, (n) => CODE_CHARS[n % CODE_CHARS.length]).join('');
}

/* A hidden room just for this check. status 'finished' keeps it out of the lobby list. */
async function withTempRoom(fn) {
  const { uid } = await signIn();
  const code = tempCode();
  const player = { uid, name: 'Network check', steps: 0, finished: false, joinedAt: TIMESTAMP, lastSeen: TIMESTAMP };
  await put('rooms/' + code, { hostUid: uid, hostName: 'Network check', map: 1, mode: 'solo', seed: 'CHECK', maxPlayers: 2, questionCount: 5, status: 'finished', createdAt: TIMESTAMP, slots: { s0: player } });
  try {
    return await fn(code, uid);
  } finally {
    await del('rooms/' + code).catch(() => {});
  }
}

/* ---------------- The checks ---------------- */

async function checkInternet() {
  if (navigator.onLine === false) throw new CheckFailed('This device says it is offline. Connect to the school Wi-Fi, then run the check again.', 'The device is offline', 'navigator.onLine = false');
  const t0 = now();
  let ctrl = null;
  try {
    ctrl = new AbortController();
  } catch (err) {
    ctrl = null;
  }
  const timer = ctrl ? window.setTimeout(() => ctrl.abort(), 12000) : 0;
  try {
    const res = await fetch('../../../assets/favicon.svg?check=' + Date.now(), { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    await res.text();
  } catch (err) {
    throw new CheckFailed('Could not reach the games website just now. Check the Wi-Fi connection, then run the check again.', 'The games website could not be reached', String(err && err.message));
  } finally {
    window.clearTimeout(timer);
  }
  const ms = now() - t0;
  return { text: `This device is online and reached the games website in ${secs(ms)}.`, detail: `site fetch ${Math.round(ms)} ms` };
}

async function checkSignIn() {
  const t0 = now();
  let uid;
  try {
    uid = (await signIn()).uid;
  } catch (err) {
    throw explain(err, SIGN_IN);
  }
  const ms = now() - t0;
  return { text: `Signed in as an anonymous test player in ${secs(ms)}. Students never need an account or a password.`, detail: `anonymous uid …${uid.slice(-4)}, ${Math.round(ms)} ms` };
}

async function checkRead() {
  const t0 = now();
  let data;
  try {
    data = await get('rooms', { orderBy: 'status', equalTo: 'open' });
  } catch (err) {
    throw explain(err, DATABASE);
  }
  const ms = now() - t0;
  const n = data && typeof data === 'object' ? Object.keys(data).length : 0;
  return { text: `Read the list of open race rooms in ${secs(ms)} (${n === 0 ? 'none are open right now' : n === 1 ? '1 is open right now' : n + ' are open right now'}).`, detail: `GET open rooms ${Math.round(ms)} ms, ${n} open` };
}

async function checkWrite() {
  const t0 = now();
  const { uid } = await signIn();
  const code = tempCode();
  try {
    await put('rooms/' + code, {
      hostUid: uid, hostName: 'Network check', map: 1, mode: 'solo', seed: 'CHECK', maxPlayers: 2, questionCount: 5, status: 'finished', createdAt: TIMESTAMP,
      slots: { s0: { uid, name: 'Network check', steps: 0, finished: false, joinedAt: TIMESTAMP, lastSeen: TIMESTAMP } }
    });
  } catch (err) {
    throw explain(err, DATABASE);
  }
  let back;
  try {
    back = await get('rooms/' + code);
  } catch (err) {
    await del('rooms/' + code).catch(() => {});
    throw explain(err, DATABASE);
  }
  if (!back || back.hostUid !== uid) throw new CheckFailed('The test room was saved, but reading it back gave something different. Try again in a minute.', 'Saving a room did not work', 'read-back mismatch');
  try {
    await del('rooms/' + code);
    const gone = await get('rooms/' + code);
    if (gone !== null) throw new Error('still there after delete');
  } catch (err) {
    throw new CheckFailed('The test room was saved but could not be deleted. It will be cleaned up automatically after 3 hours.', 'Deleting a room did not work', String(err && err.message));
  }
  const ms = now() - t0;
  return { text: `Created a test race room, read it back and deleted it, in ${secs(ms)} altogether.`, detail: `create/read/delete ${Math.round(ms)} ms` };
}

async function checkLive() {
  try {
    return await withTempRoom(async (code) => {
      const events = [];
      let streamError = null;
      const handle = stream('rooms/' + code, null, (ev) => {
        if (ev.type === 'put' || ev.type === 'patch') events.push(now());
        else if (ev.type === 'state' && ev.state === 'retrying') streamError = ev.error;
      });
      const waitFor = async (n, ms) => {
        const end = now() + ms;
        while (events.length < n && now() < end) await sleep(20);
        return events.length >= n;
      };
      try {
        const t0 = now();
        if (!(await waitFor(1, 12000))) {
          if (streamError && streamError.code === 'blocked') throw new CheckFailed(`The network blocked live updates from the race database (${DB_HOST} and *.firebaseio.com). Ask IT to allow them, including streaming (text/event-stream) connections.`, 'Live updates are blocked', 'EventSource error');
          throw new CheckFailed('Live updates never arrived (waited 12 seconds). The web filter or proxy may be holding back streaming connections. Ask IT to allow *.firebaseio.com without buffering (text/event-stream).', 'Live updates are being held back', 'no initial event in 12 s');
        }
        const connectMs = events[0] - t0;
        const delays = [];
        for (let i = 0; i < 3; i++) {
          const n = events.length;
          const s = now();
          await patch('rooms/' + code + '/slots/s0', { lastSeen: TIMESTAMP });
          if (!(await waitFor(n + 1, 8000))) throw new CheckFailed('The live connection opened, but changes stopped arriving. A proxy may be holding back streaming data. Ask IT to allow *.firebaseio.com without buffering.', 'Live updates stall', 'update ' + (i + 1) + ' never arrived');
          delays.push(events[n] - s);
          await sleep(200);
        }
        delays.sort((a, b) => a - b);
        const median = delays[1];
        const detail = `stream connect ${Math.round(connectMs)} ms; update delays ${delays.map((d) => Math.round(d)).join(', ')} ms`;
        if (median > 5000) throw new CheckFailed(`Live updates work but are very slow (${secs(median)} each). Races would freeze and jump.`, 'Live updates are too slow', detail);
        const slow = median > 1500 ? ' That is a little slow: other racers will jump forward instead of moving smoothly, but races will work.' : '';
        return { text: `Changes made by one player reached this device ${secs(median)} after they were sent (the live connection opened in ${secs(connectMs)}).${slow}`, detail };
      } finally {
        handle.close();
      }
    });
  } catch (err) {
    if (err instanceof CheckFailed) throw err;
    throw explain(err, DATABASE);
  }
}

async function checkClock() {
  let info;
  try {
    info = await withTempRoom((code) => syncClock('rooms/' + code + '/slots/s0/lastSeen', 5));
  } catch (err) {
    throw explain(err, DATABASE);
  }
  const off = info.offset; /* server minus this device */
  const detail = `offset ${off} ms (server ${off >= 0 ? 'ahead' : 'behind'}), ±${info.error} ms`;
  if (!info.calibrated || info.error > 2000) {
    throw new CheckFailed('Could not line this device up with the server clock: each round trip took more than 4 seconds. Race starts would not be in sync.', 'The connection is too slow to sync race starts', detail);
  }
  const which = off > 0 ? 'behind' : 'ahead of';
  const first = Math.abs(off) < 250 ? `This device's clock matches the race server's (within ${duration(Math.max(Math.abs(off), 100))}).` : `This device's clock is ${duration(off)} ${which} the race server's.`;
  const wrong = Math.abs(off) > 5 * 60000 ? ' The date and time settings on this device look wrong. Races still work, but fixing them is a good idea.' : '';
  return { text: `${first} Mole Rush corrects for this, so everyone's countdown ends together (to within about ${secs(Math.max(info.error, 10))}).${wrong}`, detail };
}

const CHECKS = [
  { id: 'internet', title: 'Internet connection', run: checkInternet, needs: [] },
  { id: 'signin', title: 'Sign-in to the race server', run: checkSignIn, needs: [] },
  { id: 'read', title: 'Database read', run: checkRead, needs: ['signin'] },
  { id: 'write', title: 'Database write (a temporary room)', run: checkWrite, needs: ['signin'] },
  { id: 'live', title: 'Live updates', run: checkLive, needs: ['write'] },
  { id: 'clock', title: 'Server clock', run: checkClock, needs: ['write'] }
];

/* ---------------- Page ---------------- */

const ICONS = { pending: '', running: '…', pass: '✓', fail: '✗', skip: '–' };
const SR_STATE = { pending: 'Not run yet.', running: 'Checking now.', pass: 'Passed.', fail: 'Failed.', skip: 'Skipped.' };
const rows = new Map();

function buildList() {
  clear(ui.list);
  for (const c of CHECKS) {
    const icon = el('span', { class: 'oc-icon', 'aria-hidden': 'true' });
    const sr = el('span', { class: 'sr-only' });
    const text = el('p', { class: 'oc-check-text', text: 'Waiting…' });
    const li = el('li', { class: 'oc-check', 'data-state': 'pending' }, icon, el('div', { class: 'oc-check-body' }, el('h3', { class: 'oc-check-title' }, sr, c.title), text));
    rows.set(c.id, { li, icon, sr, text });
    ui.list.appendChild(li);
  }
}

function setRow(id, state, message) {
  const r = rows.get(id);
  r.li.setAttribute('data-state', state);
  r.icon.textContent = ICONS[state];
  r.sr.textContent = SR_STATE[state] + ' ';
  r.text.textContent = message;
}

function showSummary(results, focus) {
  const failed = results.filter((r) => r.state === 'fail');
  ui.summary.hidden = false;
  ui.summary.setAttribute('data-state', failed.length ? 'fail' : 'pass');
  clear(ui.summaryList);
  if (!failed.length) {
    ui.summaryIcon.textContent = '✓';
    ui.summaryTitle.textContent = 'Online races will work on this network';
    ui.summaryText.textContent = 'Everything an online race needs got through: sign-in, the race database, live updates and the clock. Students can create and join rooms from this network.';
  } else {
    ui.summaryIcon.textContent = '✗';
    ui.summaryTitle.textContent = "Online races won't work on this network yet";
    ui.summaryText.textContent = 'This is what got blocked. Practice mode still works without any of it. “Details for your IT department” below lists the exact addresses to allow.';
    const reasons = [...new Set(failed.map((r) => r.blocked || r.title))];
    for (const reason of reasons) ui.summaryList.appendChild(el('li', { text: reason }));
    ui.it.open = true;
  }
  if (focus) ui.summaryTitle.focus();
}

function writeReport(results) {
  const lines = [
    'Mole Rush online race check',
    'When: ' + new Date().toString(),
    'Page: ' + window.location.origin + window.location.pathname,
    'Browser: ' + navigator.userAgent,
    ''
  ];
  for (const r of results) lines.push(`${r.state.toUpperCase().padEnd(4)}  ${r.title}${r.detail ? ' — ' + r.detail : ''}`);
  lines.push('', results.every((r) => r.state === 'pass') ? 'Result: online races will work on this network.' : 'Result: online races are blocked on this network.');
  ui.report.textContent = lines.join('\n');
}

let running = false;

async function runAll(fromButton) {
  if (running) return;
  running = true;
  document.body.setAttribute('data-oc-state', 'running');
  ui.run.disabled = true;
  ui.run.textContent = 'Checking…';
  ui.summary.hidden = true;
  ui.copyMsg.textContent = '';
  CHECKS.forEach((c) => setRow(c.id, 'pending', 'Waiting…'));
  const passed = new Set();
  const results = [];
  for (const c of CHECKS) {
    const missing = c.needs.find((n) => !passed.has(n));
    if (missing) {
      const dep = CHECKS.find((x) => x.id === missing);
      setRow(c.id, 'skip', `Skipped, because “${dep.title}” did not work.`);
      results.push({ id: c.id, title: c.title, state: 'skip', detail: 'skipped' });
      continue;
    }
    setRow(c.id, 'running', 'Checking…');
    try {
      const res = await c.run();
      passed.add(c.id);
      setRow(c.id, 'pass', res.text);
      results.push({ id: c.id, title: c.title, state: 'pass', detail: res.detail });
    } catch (err) {
      const f = err instanceof CheckFailed ? err : new CheckFailed('Something unexpected went wrong: ' + String(err && err.message), c.title + ' did not work', String(err && err.stack));
      setRow(c.id, 'fail', f.message);
      results.push({ id: c.id, title: c.title, state: 'fail', blocked: f.blocked, detail: f.detail });
    }
  }
  /* a skipped check counts as not working too */
  const final = results.map((r) => (r.state === 'skip' ? Object.assign({}, r, { state: 'fail', blocked: r.title + ' (could not be tested)' }) : r));
  showSummary(final, fromButton);
  writeReport(results);
  document.body.setAttribute('data-oc-state', final.every((r) => r.state === 'pass') ? 'pass' : 'fail');
  ui.run.disabled = false;
  ui.run.textContent = 'Run the checks again';
  running = false;
}

async function copyReport() {
  const text = ui.report.textContent;
  try {
    await navigator.clipboard.writeText(text);
    ui.copyMsg.textContent = 'Copied. You can paste it into an email.';
  } catch (err) {
    try {
      const range = document.createRange();
      range.selectNodeContents(ui.report);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      ui.copyMsg.textContent = 'The report is selected: press Ctrl+C (or ⌘+C) to copy it.';
    } catch (e) {
      ui.copyMsg.textContent = 'Select the report text and copy it.';
    }
  }
}

buildList();
ui.run.addEventListener('click', () => runAll(true));
ui.copy.addEventListener('click', copyReport);
runAll(false);
