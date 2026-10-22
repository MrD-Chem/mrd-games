/*
  Mole Rush — screens and game flow: title → map select → play → results.

  Later phases plug in here without changing the maps:
  - a race layer subscribes to the Session's onItem / onAnswer / onFinish events
    (see session.js) to move CPU racers, teams or online-room players;
  - online rooms only need to agree on a map id and a race code: createSession()
    turns the same code into the same questions on every device.
*/

import { loadBank, formulaText } from './bank.js?v=20261022T1625';
import { el, clear, announce } from './dom.js?v=20261022T1625';
import { MAPS, getMap, isPlayable, rendererFor } from './maps/index.js?v=20261022T1625';
import { createSession, buildSequence } from './session.js?v=20261022T1625';
import { normalizeCode, randomCode, codeToSeed } from './rng.js?v=20261022T1625';
import { initComputer } from './race/computer.js?v=20261022T1625';
import { getBest, recordResult } from './storage.js?v=20261022T1625';

const $ = (id) => document.getElementById(id);

const ui = {
  title: $('mr-title'),
  titleHeading: $('mr-title-heading'),
  error: $('mr-error'),
  start: $('mr-start'),
  practice: $('mr-practice'),
  online: $('mr-online'),
  onlineError: $('mr-online-error'),
  codeToggle: $('mr-code-toggle'),
  codeForm: $('mr-code-form'),
  codeInput: $('mr-code-input'),
  codeError: $('mr-code-error'),
  maps: $('mr-maps'),
  mapsTitle: $('mr-maps-title'),
  mapsBack: $('mr-maps-back'),
  mode: $('mr-mode'),
  mapList: $('mr-map-list'),
  play: $('mr-play'),
  raceSide: $('mr-race-side'),
  hud: $('mr-hud'),
  quit: $('mr-quit'),
  hudPos: $('mr-hud-pos'),
  progress: $('mr-progress'),
  hudScore: $('mr-hud-score'),
  hudStreak: $('mr-hud-streak'),
  stage: $('mr-stage'),
  nextBar: $('mr-next-bar'),
  nextMsg: $('mr-next-msg'),
  next: $('mr-next'),
  results: $('mr-results'),
  resultsKicker: $('mr-results-kicker'),
  resultsTitle: $('mr-results-title'),
  resultsMsg: $('mr-results-msg'),
  stats: $('mr-stats'),
  resultsCode: $('mr-results-code'),
  resultsList: $('mr-results-list'),
  again: $('mr-again'),
  toMaps: $('mr-to-maps')
};

const loaded = loadBank();
const bank = loaded.ok ? loaded.bank : null;

const state = {
  screen: 'title',
  mode: 'practice', // 'practice' (a fresh random code each round) or 'code' (a typed race code)
  code: null, // the typed race code (display form), in 'code' mode
  map: null,
  session: null,
  board: null,
  unsub: [],
  hooks: null, // online/computer race controller; null for practice and race codes
  lastSummary: null
};

// ---------- Screens ----------

/* Every <section class="mr-screen" id="mr-NAME">: title, maps, play, results, and the online
   screens (nick, lobby, room, countdown, race-results). */
function show(screen, focusTarget) {
  for (const section of document.querySelectorAll('.mr-screen')) section.hidden = section.id !== 'mr-' + screen;
  state.screen = screen;
  window.scrollTo(0, 0);
  if (focusTarget) focusTarget.focus({ preventScroll: true });
}

function formatTime(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------- Title ----------

function initTitle() {
  if (!bank) {
    ui.error.hidden = false;
    ui.error.textContent = loaded.error === 'missing'
      ? "The questions for Mole Rush didn't load, so the game can't start yet. Try refreshing the page. If it keeps happening, let Mr. D know."
      : "The question list for Mole Rush has a problem, so the game can't start. Please let Mr. D know.";
    ui.start.hidden = true;
    return;
  }
  $('mr-computer').addEventListener('click', () => computer.open());
  ui.practice.addEventListener('click', () => {
    state.mode = 'practice';
    state.code = null;
    openMaps();
  });
  ui.online.addEventListener('click', () => {
    ui.onlineError.hidden = true;
    ui.online.disabled = true;
    loadOnline()
      .then((online) => {
        endSession();
        online.open();
      })
      .catch(() => {
        ui.onlineError.textContent = 'Online races didn’t load. Check the internet connection and try again, or play Practice.';
        ui.onlineError.hidden = false;
      })
      .finally(() => {
        ui.online.disabled = false;
      });
  });
  ui.codeToggle.addEventListener('click', () => {
    const open = ui.codeForm.hidden;
    setCodeForm(open);
    if (open) ui.codeInput.focus();
  });
  ui.codeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = normalizeCode(ui.codeInput.value);
    if (!code) {
      ui.codeError.textContent = ui.codeInput.value.trim()
        ? 'That code doesn’t look right. Codes are 2 to 12 letters or numbers, like MOLE-38.'
        : 'Type a race code first, like MOLE-38.';
      ui.codeInput.setAttribute('aria-invalid', 'true');
      ui.codeInput.focus();
      return;
    }
    ui.codeError.textContent = '';
    ui.codeInput.removeAttribute('aria-invalid');
    ui.codeInput.value = code.display;
    state.mode = 'code';
    state.code = code.display;
    openMaps();
  });
  ui.codeInput.addEventListener('input', () => {
    if (ui.codeError.textContent) {
      ui.codeError.textContent = '';
      ui.codeInput.removeAttribute('aria-invalid');
    }
  });
}

function setCodeForm(open) {
  ui.codeForm.hidden = !open;
  ui.codeToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function openTitle(withCodeForm) {
  endSession();
  setCodeForm(!!withCodeForm);
  show('title', withCodeForm ? ui.codeInput : ui.titleHeading);
}

// ---------- Map select ----------

function renderMode() {
  clear(ui.mode);
  if (state.mode === 'code') {
    const change = el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Change code' });
    change.addEventListener('click', () => openTitle(true));
    ui.mode.append(
      el('p', { class: 'mr-mode-text' },
        'Race code ', el('strong', { class: 'mr-code-tag', text: state.code }),
        ': pick the same map as your classmates to get the same questions in the same order.'),
      change);
    ui.mode.className = 'mr-mode panel is-code';
  } else {
    const useCode = el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Use a race code' });
    useCode.addEventListener('click', () => openTitle(true));
    ui.mode.append(
      el('p', { class: 'mr-mode-text' }, el('strong', { text: 'Practice: ' }), 'you get a fresh set of questions every round.'),
      useCode);
    ui.mode.className = 'mr-mode panel';
  }
}

function renderMapList() {
  clear(ui.mapList);
  for (const map of MAPS) {
    const ready = isPlayable(map);
    const best = ready ? getBest(map.id) : null;
    const body = el('div', { class: 'mr-map-body' },
      el('p', { class: 'mr-map-kicker', text: `Map ${map.id}` }),
      el('h3', { class: 'mr-map-name', text: map.name }),
      el('p', { class: 'mr-map-blurb', text: map.blurb }),
      best ? el('p', { class: 'mr-map-best' }, 'Your best: ', el('strong', { text: `${best.score} points` }), ` · ${best.accuracy}% first try`) : null);
    let action;
    if (ready) {
      action = el('button', { type: 'button', class: 'btn btn-primary mr-map-play', 'data-map': String(map.id), 'aria-label': `Play Map ${map.id}: ${map.name}`, text: 'Play' });
      action.addEventListener('click', () => startMap(map.id, state.mode === 'code' ? state.code : null));
    } else {
      action = el('span', { class: 'badge', text: 'Coming soon' });
    }
    ui.mapList.appendChild(el('li', { class: 'mr-map-card', 'data-status': ready ? 'ready' : 'coming-soon', 'data-map': String(map.id) },
      el('div', { class: 'mr-map-art', 'aria-hidden': 'true' }, el('span', { class: 'mr-map-num', text: String(map.id) })),
      body,
      el('div', { class: 'mr-map-actions' }, action)));
  }
}

function openMaps() {
  endSession();
  renderMode();
  renderMapList();
  show('maps', ui.mapsTitle);
}

// ---------- Play ----------

function endSession(keepRace = false) {
  const previousHooks = state.hooks;
  state.hooks = null;
  if (!keepRace && previousHooks && previousHooks.onDispose) previousHooks.onDispose();
  state.unsub.forEach((fn) => fn());
  state.unsub = [];
  if (state.board) state.board.destroy();
  state.board = null;
  state.session = null;
  ui.nextBar.hidden = true;
  if (previousHooks) {
    ui.quit.textContent = '← Maps';
    ui.play.classList.remove('is-online');
  }
}

/*
  Start a round. code: a race code, or null/undefined for a fresh practice code.
  hooks (online/computer): { quitLabel, finishLabel, onQuit(), onSession(session), onFinish(summary), onDispose?() }
  With hooks, the round ends in hooks.onFinish instead of the practice results screen.
*/
function startMap(mapId, code, hooks) {
  const map = getMap(mapId);
  if (!bank) return { ok: false, reason: 'The question bank did not load.' };
  if (!isPlayable(map)) return { ok: false, reason: `Map ${mapId} is not playable yet.` };
  const norm = normalizeCode(code ? String(code) : randomCode());
  if (!norm) return { ok: false, reason: 'Bad race code.' };
  endSession();
  const session = createSession(bank, map.id, norm.display);
  if (!session.items.length) return { ok: false, reason: 'No questions available.' };
  state.session = session;
  state.map = map;
  state.unsub.push(session.onItem((item, index) => renderItem(item, index)));
  state.unsub.push(session.onAnswer(() => updateHud()));
  state.unsub.push(session.onFinish((summary) => (state.hooks ? finishHooked(summary) : showResults(summary))));
  if (hooks) {
    state.hooks = hooks;
    ui.quit.textContent = hooks.quitLabel || '← Leave';
    ui.play.classList.add('is-online');
    if (hooks.onSession) hooks.onSession(session);
  }
  buildProgress();
  show('play');
  session.start();
  return { ok: true, code: session.code, total: session.total, ids: session.items.map((i) => i.id) };
}

function buildProgress() {
  clear(ui.progress);
  state.session.items.forEach((item) => {
    ui.progress.appendChild(el('li', { class: 'mr-progress-dot' + (item.kind === 'balance' ? ' is-balance' : '') }));
  });
}

function updateHud() {
  const s = state.session;
  if (!s) return;
  const st = s.stats();
  ui.hudPos.textContent = `Question ${Math.min(st.index + 1, st.total)} of ${st.total}`;
  ui.hudScore.textContent = String(st.score);
  ui.hudStreak.textContent = String(st.streak);
  [...ui.progress.children].forEach((dot, i) => {
    const r = s.records[i];
    dot.classList.toggle('is-current', i === st.index && !s.finished);
    dot.classList.toggle('is-first', r.done && r.firstTry);
    dot.classList.toggle('is-later', r.done && r.correct && !r.firstTry);
    dot.classList.toggle('is-shown', r.done && r.revealed);
  });
}

function renderItem(item) {
  if (state.board) state.board.destroy();
  state.board = null;
  ui.nextBar.hidden = true;
  const renderer = rendererFor(state.map, item);
  if (!renderer) return;
  state.board = renderer.render(ui.stage, item, { bank, onResult });
  updateHud();
  if (ui.hud.getBoundingClientRect().top < 0) ui.hud.scrollIntoView({ block: 'start' });
  state.board.focus();
}

function onResult(r) {
  const s = state.session;
  if (!s) return;
  const rec = r.revealed ? s.reveal() : s.answer(r.correct);
  updateHud();
  if (!r.final) return;
  const last = s.index >= s.total - 1;
  if (rec && rec.revealed) ui.nextMsg.textContent = 'No points this time. You will get it next time!';
  else if (rec && rec.firstTry) ui.nextMsg.textContent = `First try! +${rec.points} points${s.streak > 1 ? ` · streak ${s.streak}` : ''}`;
  else ui.nextMsg.textContent = `Got it! +${rec ? rec.points : 0} points`;
  ui.nextBar.classList.toggle('is-shown-answer', !!(rec && rec.revealed));
  ui.next.textContent = last ? (state.hooks && state.hooks.finishLabel) || 'See results →' : 'Next question →';
  ui.nextBar.hidden = false;
  ui.next.focus({ preventScroll: true });
}

function goNext() {
  const s = state.session;
  if (!s || !s.record || !s.record.done) return false;
  s.next(); // fires onItem (next question) or onFinish (results)
  return true;
}

/* An online race's round is over: tidy the board away and hand the summary to the race layer. */
function finishHooked(summary) {
  const hooks = state.hooks;
  endSession(true);
  if (hooks && hooks.onFinish) hooks.onFinish(summary);
}

// ---------- Online races (loaded only when "Race online" is pressed) ----------

let onlinePromise = null;
let onlineApi = null;

function loadOnline() {
  if (!onlinePromise) {
    onlinePromise = import('./online/online.js?v=20261022T1625')
      .then((mod) => {
        onlineApi = mod.initOnline({
          show,
          openTitle: () => openTitle(false),
          openPractice: () => {
            state.mode = 'practice';
            state.code = null;
            openMaps();
          },
          startRace: (mapId, code, hooks) => startMap(mapId, code, hooks),
          stopRace: () => endSession(),
          focusBoard: () => {
            if (state.board) state.board.focus();
          },
          sidebar: ui.raceSide
        });
        return onlineApi;
      })
      .catch((err) => {
        onlinePromise = null; // let the student try again (e.g. after the Wi-Fi comes back)
        throw err;
      });
  }
  return onlinePromise;
}

// ---------- Computer races ----------

const computer = initComputer({
  host: $('main'), sidebar: ui.raceSide, show,
  openTitle: () => openTitle(false),
  startRace: startMap, stopRace: endSession
});
window.addEventListener('pagehide', () => endSession());

// ---------- Results ----------

function itemLabel(item) {
  if (item.kind === 'balance') {
    const side = (list) => list.map(formulaText).join(' + ');
    return `Balance ${side(item.eq.reactants)} → ${side(item.eq.products)}`;
  }
  return item.problem.text;
}

function showResults(summary) {
  const map = state.map;
  const session = state.session;
  if (state.board) state.board.destroy();
  state.board = null;
  ui.nextBar.hidden = true;
  state.lastSummary = summary;
  const saved = recordResult(map.id, summary);
  const best = getBest(map.id);

  ui.resultsKicker.textContent = `Map ${map.id} · ${map.name}`;
  const acc = summary.accuracy;
  ui.resultsTitle.textContent = acc >= 90 ? 'Outstanding!' : acc >= 70 ? 'Great run!' : acc >= 40 ? 'Nice work!' : 'Good practice!';
  let msg = `You got ${summary.firstTry} of ${summary.total} right on the first try.`;
  if (!saved.saved) msg += ' This browser is not keeping scores right now, so this one will not be saved.';
  else if (saved.newBest) msg += ' New best score!';
  else if (saved.first) msg += ' Your first score on this map is saved.';
  else if (best) msg += ` Your best is ${best.score} points.`;
  ui.resultsMsg.textContent = msg;

  clear(ui.stats);
  const stat = (label, value, extra) => ui.stats.appendChild(el('div', { class: 'mr-stat' + (extra ? ' ' + extra : '') },
    el('dt', { text: label }), el('dd', { text: value })));
  stat('Score', String(summary.score), saved.newBest ? 'is-best' : '');
  stat('Accuracy', `${acc}%`);
  stat('Time', formatTime(summary.timeMs));
  stat('Best streak', String(summary.bestStreak));

  clear(ui.resultsCode);
  ui.resultsCode.append(
    el('p', { class: 'mr-code-line' }, 'Race code ', el('strong', { class: 'mr-code-tag', text: summary.code })),
    el('p', { class: 'mr-code-note', text: state.mode === 'code'
      ? `Everyone who plays Map ${map.id} with this code gets these same ${summary.total} questions in the same order.`
      : `Want a rematch? Share this code: classmates who choose “Use a race code” and Map ${map.id} get these same ${summary.total} questions.` }));

  clear(ui.resultsList);
  summary.items.forEach((r, i) => {
    const item = session ? session.items[i] : null;
    const tag = r.revealed ? 'Shown' : r.firstTry ? 'First try ✓' : r.correct ? `${r.checks} tries ✓` : 'Skipped';
    ui.resultsList.appendChild(el('li', { class: 'mr-result-row' + (r.firstTry ? ' is-first' : r.revealed ? ' is-shown' : '') },
      el('span', { class: 'mr-result-text', text: item ? itemLabel(item) : r.id }),
      el('span', { class: 'mr-result-tag', text: tag })));
  });

  ui.again.textContent = state.mode === 'code' ? 'Play this code again' : 'Play again';
  state.unsub.forEach((fn) => fn());
  state.unsub = [];
  show('results', ui.resultsTitle);
  announce(`${ui.resultsTitle.textContent} Score ${summary.score}. Accuracy ${acc} percent.`);
}

// ---------- Wiring ----------

ui.mapsBack.addEventListener('click', () => openTitle(false));
ui.quit.addEventListener('click', () => (state.hooks && state.hooks.onQuit ? state.hooks.onQuit() : openMaps()));
ui.next.addEventListener('click', () => goNext());
ui.toMaps.addEventListener('click', () => openMaps());
ui.again.addEventListener('click', () => {
  const s = state.lastSummary;
  if (!s) return;
  startMap(s.mapId, state.mode === 'code' ? s.code : null);
});

initTitle();

// ---------- Test hook (harmless in production: it only drives the game) ----------

function current() {
  const s = state.session;
  if (state.screen !== 'play' || !s) return { screen: state.screen };
  const item = s.item;
  return {
    screen: state.screen,
    index: s.index,
    total: s.total,
    kind: item ? item.kind : null,
    id: item ? item.id : null,
    code: s.code,
    stats: s.stats(),
    nextVisible: !ui.nextBar.hidden,
    board: state.board ? state.board.state() : null
  };
}

let resolveReady;
const ready = new Promise((resolve) => {
  resolveReady = resolve;
});

// The helpers that answer for you would be cheating in an online race, so during one they only work
// when the page was opened with ?mrtest=1 (the automated checks do that; students never see it).
const checking = (() => {
  try {
    return new URLSearchParams(window.location.search).has('mrtest');
  } catch (err) {
    return false;
  }
})();
const answering = () => !state.hooks || checking;

window.__MR_TEST__ = Object.freeze({
  ready,
  startMap: (mapId, code) => startMap(mapId, code),
  current,
  computer: () => computer.test,
  solveCurrent: () => (state.board && answering() ? state.board.solve() : null),
  answerWrong: () => (state.board && answering() ? state.board.answerWrong() : null),
  next: () => {
    if (!goNext()) return { ok: false, reason: 'The current question is not finished.', ...current() };
    return state.screen === 'results' ? { ok: true, finished: true, summary: state.lastSummary } : { ok: true, ...current() };
  },
  summary: () => (state.session ? state.session.summary() : state.lastSummary),
  // Extras for checks: the question order a code gives, and what the bank loaded.
  sequence: (mapId, code) => (bank ? buildSequence(bank, Number(mapId), codeToSeed(String(code))).map((i) => i.id) : []),
  bankReport: () => ({
    ok: loaded.ok,
    error: loaded.error || null,
    problems: bank ? bank.problems.length : 0,
    balancing: bank ? bank.balancing.length : 0,
    byDifficulty: bank ? [1, 2, 3].map((d) => bank.problems.filter((p) => p.difficulty === d).length) : [],
    warnings: loaded.warnings.slice()
  }),
  screen: () => state.screen,
  showMe: () => (state.board && answering() ? (state.board.showMe ? state.board.showMe() : null) : null),
  // Online races: loadOnline() resolves once the online code is in; online() gives its read-only hooks.
  loadOnline: () => loadOnline().then(() => true),
  online: () => (onlineApi ? onlineApi.test : null)
});

resolveReady({ ok: loaded.ok, error: loaded.error || null });
