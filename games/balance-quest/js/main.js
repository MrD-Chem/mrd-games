/*
  Balance Quest — the game controller.
  Title screen, world select, practice equations, entering a world in 3D (or the
  Simple-mode list), the puzzle panel, world-complete screen, and the test hook.
  The backstory (story screens, Professor Mole, the ending) lives in story.js.
  The 3D engine (and Three.js) is only loaded when a 3D world is entered.
*/

import * as chem from './chem.js';
import { loadEquations, parseCustom, WORLDS, PRACTICE_WORLD, PRACTICE_EXAMPLE } from './data.js';
import { Progress } from './progress.js';
import { PuzzlePanel, newGateState } from './puzzle.js';
import { Input } from './input.js';
import { Board2D } from './world2d.js';
import { createScaleSVG } from './scale2d.js';
import { el, clear, rich, starText } from './dom.js';
import { Story } from './story.js';

// ---------- Setup ----------

const $ = (id) => document.getElementById(id);
const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const progress = new Progress();
const data = loadEquations(window.BQ_EQUATIONS);
if (data.warnings.length) console.warn('[Balance Quest] notes about equations.js:', data.warnings);

const ui = {
  title: $('bq-title'),
  worlds: $('bq-worlds'),
  worldsTitle: $('bq-worlds-title'),
  storyBtn: $('bq-story-btn'),
  dataError: $('bq-data-error'),
  optSimple: $('bq-opt-simple'),
  optTeacher: $('bq-opt-teacher'),
  no3d: $('bq-no3d'),
  practice: $('bq-practice'),
  practiceText: $('bq-practice-text'),
  practiceLive: $('bq-practice-live'),
  practicePlay: $('bq-practice-play'),
  practiceExample: $('bq-practice-example'),
  practiceReport: $('bq-practice-report'),
  game: $('bq-game'),
  stage: $('bq-stage'),
  view: $('bq-view'),
  canvas: $('bq-canvas'),
  hudWorld: $('bq-hud-world'),
  hudGates: $('bq-hud-gates'),
  hudStars: $('bq-hud-stars'),
  menu: $('bq-menu'),
  slow: $('bq-slow'),
  slowBtn: $('bq-slow-btn'),
  help: $('bq-help'),
  prompt: $('bq-prompt'),
  promptGate: $('bq-prompt-gate'),
  touch: $('bq-touch'),
  joystick: $('bq-joystick'),
  knob: $('bq-knob'),
  touchSolve: $('bq-touch-solve'),
  board: $('bq-board'),
  boardHeading: $('bq-board-title'),
  boardList: $('bq-gate-list'),
  boardNote: $('bq-board-note'),
  puzzle: $('bq-puzzle'),
  scaleBox: $('bq-pz-scale'),
  complete: $('bq-complete'),
  completeTitle: $('bq-complete-title'),
  completeStars: $('bq-complete-stars'),
  completeMole: $('bq-complete-mole'),
  completeList: $('bq-complete-list'),
  completeUnlock: $('bq-complete-unlock'),
  completeNext: $('bq-complete-next'),
  completeAgain: $('bq-complete-again'),
  completeMenu: $('bq-complete-menu'),
  lost: $('bq-lost'),
  lostReload: $('bq-lost-reload'),
  lostSimple: $('bq-lost-simple'),
  loading: $('bq-loading'),
  announce: $('bq-announce')
};

const state = {
  screen: 'title', // 'title' | 'world' | 'complete'
  mode: null, // '3d' | '2d'
  world: null,
  engine: null,
  engineFailed: false,
  near: -1,
  puzzleGate: -1,
  customGates: null,
  touch: false,
  slowTimer: 0,
  lastWorldCard: null,
  token: 0 // bumps whenever a world is entered or left, so slow async work can tell it is stale
};

let webglOk = null;
function canUse3D() {
  if (state.engineFailed) return false;
  if (webglOk === null) {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      webglOk = !!gl;
      const lose = gl && gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (err) {
      webglOk = false;
    }
  }
  return webglOk;
}

function announce(text) {
  ui.announce.textContent = '';
  window.setTimeout(() => {
    ui.announce.textContent = text;
  }, 30);
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Give the browser a moment to paint (e.g. the "Building the world" card) before heavy work.
function pause(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// ---------- Title screen ----------

function worldStats(n) {
  const eqs = data.byWorld[n] || [];
  let stars = 0;
  let solved = 0;
  for (const eq of eqs) {
    stars += progress.stars(eq.id);
    if (progress.isSolved(eq.id)) solved++;
  }
  return { gates: eqs.length, stars, solved };
}

function renderTitle() {
  clear(ui.worlds);
  ui.optSimple.checked = progress.simple;
  ui.optTeacher.checked = progress.teacher;
  ui.no3d.hidden = canUse3D();
  if (data.error) {
    ui.dataError.hidden = false;
    ui.dataError.textContent = data.error;
  }
  WORLDS.forEach((w, idx) => {
    const st = worldStats(w.n);
    const unlocked = progress.isUnlocked(w.n);
    const completed = progress.isCompleted(w.n);
    const empty = st.gates === 0;
    let label = 'Play';
    if (completed && st.solved === st.gates) label = 'Play again';
    else if (st.solved > 0) label = 'Continue';
    const btn = el('button', {
      type: 'button',
      class: 'btn ' + (unlocked && !empty ? 'btn-primary' : 'btn-ghost'),
      'aria-label': `${label}: World ${w.n}, ${w.name}`,
      text: empty ? 'Coming soon' : unlocked ? label : 'Locked'
    });
    btn.disabled = !unlocked || empty;
    btn.addEventListener('click', () => {
      state.lastWorldCard = w.n;
      startWorld(w.n);
    });
    btn.dataset.world = String(w.n);
    const progressText = empty
      ? 'No gates yet'
      : `${st.solved} of ${st.gates} gates open · ${st.stars} of ${st.gates * 3} stars`;
    const lockNote = !unlocked && idx > 0 ? `Beat the World ${idx} boss gate to unlock.` : '';
    ui.worlds.appendChild(
      el('li', { class: 'bq-world-card', 'data-theme': w.theme, 'data-locked': unlocked ? 'false' : 'true' },
        el('div', { class: 'bq-world-art', 'aria-hidden': 'true' }, el('span', { class: 'bq-world-num', text: String(w.n) })),
        el('div', { class: 'bq-world-body' },
          el('h3', { class: 'bq-world-name' }, el('span', { class: 'bq-world-kicker', text: `World ${w.n}` }), w.name),
          el('p', { class: 'bq-world-blurb', text: w.blurb }),
          el('p', { class: 'bq-world-progress' },
            completed ? el('span', { class: 'bq-world-done', text: '✓ Completed · ' }) : null,
            progressText),
          lockNote ? el('p', { class: 'bq-world-lock', text: lockNote }) : null,
          btn))
    );
  });
}

function showTitle() {
  state.screen = 'title';
  ui.game.hidden = true;
  ui.complete.hidden = true;
  ui.title.hidden = false;
  renderTitle();
  const back = state.lastWorldCard && ui.worlds.querySelector(`button[data-world="${state.lastWorldCard}"]:not([disabled])`);
  if (back) back.focus({ preventScroll: true });
}

// ---------- Practice equations ----------

function reportPractice(result) {
  clear(ui.practiceReport);
  const { gates, problems } = result;
  if (!gates.length && !problems.length) {
    ui.practiceReport.appendChild(el('p', { text: 'Type at least one equation first, like Fe + O2 -> Fe2O3.' }));
    return;
  }
  ui.practiceReport.appendChild(
    el('p', { class: gates.length ? 'bq-ok' : 'bq-bad', text: gates.length ? `${gates.length} equation${gates.length === 1 ? '' : 's'} ready to play.` : 'None of the lines could be used yet.' })
  );
  if (problems.length) {
    const list = el('ul', { class: 'bq-problems' });
    for (const p of problems) {
      list.appendChild(el('li', {}, el('strong', { text: `Line ${p.lineNo}` }), ` (${p.text}): ${p.reason}`));
    }
    ui.practiceReport.appendChild(list);
  }
}

function playPractice() {
  const text = ui.practiceText.value;
  progress.saveCustom(text);
  const result = parseCustom(text);
  reportPractice(result);
  if (!result.gates.length) return;
  state.customGates = result.gates;
  state.lastWorldCard = null;
  startWorld('custom');
}

// ---------- Entering and leaving a world ----------

function buildGateStates(key, eqs) {
  return eqs.map((eq, i) => {
    const g = newGateState(eq, i);
    if (key !== 'custom' && progress.isSolved(eq.id)) {
      g.solved = true;
      g.values = eq.coefficients.slice();
    }
    g.stars = key !== 'custom' ? progress.stars(eq.id) : 0;
    return g;
  });
}

async function startWorld(key, opts = {}) {
  const custom = key === 'custom';
  const info = custom ? PRACTICE_WORLD : WORLDS.find((w) => w.n === key);
  const eqs = custom ? state.customGates : data.byWorld[key];
  if (!info || !eqs || !eqs.length) return false;
  if (panel.isOpen) panel.close();
  story.dismiss();
  story.hideEnding();
  const token = ++state.token;
  if (!custom) {
    const ids = eqs.map((e) => e.id);
    const allSolved = ids.every((id) => progress.isSolved(id));
    if (allSolved || opts.fresh) progress.resetRun(ids);
  }
  state.world = {
    key,
    info,
    gates: buildGateStates(key, eqs),
    live: custom ? progress.practiceLive : info.liveCounter
  };
  state.screen = 'world';
  state.near = -1;
  state.puzzleGate = -1;
  ui.title.hidden = true;
  ui.complete.hidden = true;
  ui.lost.hidden = true;
  ui.game.hidden = false;
  window.scrollTo(0, 0);
  let ok = false;
  if (!progress.simple && canUse3D()) {
    ok = await enter3D(token);
    if (token !== state.token) return false;
    if (!ok) enter2D('3D could not start on this device, so the game switched to simple mode.');
  } else {
    enter2D(progress.simple ? '' : "This device can't show 3D, so the game is in simple mode.");
  }
  updateHud();
  story.sayWorldStart(info.n);
  return true;
}

function setMode(mode) {
  state.mode = mode;
  ui.game.classList.toggle('is-3d', mode === '3d');
  ui.game.classList.toggle('is-2d', mode === '2d');
  ui.view.hidden = mode !== '3d';
  ui.board.hidden = mode !== '2d';
  ui.scaleBox.hidden = mode !== '2d';
  ui.touch.hidden = !(mode === '3d' && state.touch);
  ui.help.hidden = mode !== '3d';
  ui.prompt.hidden = true;
  ui.slow.hidden = true;
  sizeStage();
}

function sizeStage() {
  if (state.mode !== '3d') {
    ui.stage.style.height = '';
    return;
  }
  const header = document.querySelector('.site-header');
  const top = header ? header.getBoundingClientRect().height : 0;
  ui.stage.style.height = Math.max(340, Math.floor(window.innerHeight - top - 10)) + 'px';
}

async function enter3D(token) {
  setMode('3d');
  ui.loading.hidden = false;
  await pause(30);
  try {
    if (!state.engine) {
      const mod = await import('./engine3d.js');
      if (token !== state.token) return false;
      state.engine = new mod.Engine({
        canvas: ui.canvas,
        reducedMotion,
        onNearGate,
        onFinish: () => showComplete(),
        onContextLost
      });
    }
  } catch (err) {
    console.warn('[Balance Quest] 3D could not start:', err);
    state.engineFailed = true;
    ui.loading.hidden = true;
    return false;
  }
  if (token !== state.token) {
    ui.loading.hidden = true;
    return false;
  }
  const w = state.world;
  try {
    const r = ui.view.getBoundingClientRect();
    state.engine.resize(r.width, r.height);
    const firstOpen = w.gates.findIndex((g) => !g.solved);
    state.engine.enter(
      {
        themeKey: w.info.theme,
        seed: w.key === 'custom' ? 4242 : 1000 + w.info.n * 7919,
        gates: w.gates.map((g) => ({ eq: g.eq, boss: g.boss, solved: g.solved, display: g.values.map((v) => (v == null ? 1 : v)) }))
      },
      Math.max(0, firstOpen)
    );
  } catch (err) {
    console.error('[Balance Quest] could not build the 3D world:', err);
    state.engine.exit();
    state.engineFailed = true;
    ui.loading.hidden = true;
    return false;
  }
  ui.loading.hidden = true;
  setHelpText();
  ui.help.classList.remove('is-faded');
  ui.view.focus({ preventScroll: true });
  window.clearTimeout(state.slowTimer);
  state.slowTimer = window.setTimeout(checkSlow, 7000);
  return true;
}

function enter2D(note) {
  if (state.engine) state.engine.exit();
  setMode('2d');
  ui.boardNote.textContent = note || 'Simple mode: solve the gates in order, top to bottom.';
  board.render(state.world);
  const next = board.nextIndex();
  board.refresh(next < 0 ? 0 : next);
}

function exitToTitle() {
  state.token++;
  ui.loading.hidden = true;
  if (panel.isOpen) panel.close();
  window.clearTimeout(state.slowTimer);
  if (state.engine) state.engine.exit();
  story.hideBubble();
  story.hideEnding();
  state.world = null;
  state.mode = null;
  input.reset();
  showTitle();
}

function updateHud() {
  const w = state.world;
  if (!w) return;
  const solved = w.gates.filter((g) => g.solved).length;
  const stars = w.gates.reduce((sum, g) => sum + (g.stars || 0), 0);
  ui.hudWorld.textContent = w.info.n ? `World ${w.info.n} · ${w.info.name}` : w.info.name;
  ui.hudGates.textContent = `${solved} / ${w.gates.length}`;
  ui.hudStars.textContent = String(stars);
}

function checkSlow() {
  if (state.mode !== '3d' || !state.engine) return;
  const s = state.engine.stats();
  if (s.fps && s.fps < 20 && s.framesRendered > 40) ui.slow.hidden = false;
}

// ---------- Gates and the puzzle panel ----------

function onNearGate(i) {
  state.near = i;
  updatePrompt(true);
}

function updatePrompt(speak) {
  const i = state.near;
  const w = state.world;
  const show = i >= 0 && !!w && state.screen === 'world' && state.mode === '3d' && !panel.isOpen;
  ui.prompt.hidden = !show;
  ui.touchSolve.disabled = !show;
  if (!show) return;
  const g = w.gates[i];
  ui.promptGate.textContent = `${g.boss ? 'Boss gate' : `Gate ${i + 1}`}${g.eq.name ? ': ' + g.eq.name : ''}`;
  if (speak) announce(`${ui.promptGate.textContent}. Press E or tap Solve to open the puzzle.`);
}

function interact() {
  if (state.screen !== 'world' || state.mode !== '3d' || panel.isOpen || !state.engine) return;
  const i = state.engine.nearGate;
  if (i >= 0) openGate(i);
}

function panelOverlap() {
  const v = ui.view.getBoundingClientRect();
  const p = ui.puzzle.querySelector('.bq-pz-card').getBoundingClientRect();
  if (!v.height) return 0;
  return Math.min(0.8, Math.max(0, (v.bottom - p.top) / v.height));
}

function openGate(i, returnFocus) {
  const w = state.world;
  const g = w && w.gates[i];
  if (!g) return false;
  state.puzzleGate = i;
  const total = w.gates.length;
  const kicker = [g.boss ? `Boss gate (${i + 1} of ${total})` : `Gate ${i + 1} of ${total}`];
  if (g.eq.type) kicker.push(capitalize(g.eq.type));
  ui.prompt.hidden = true;
  ui.help.classList.add('is-faded');
  ui.game.classList.add('is-puzzle');
  story.hideBubble();
  panel.open(g, {
    kicker: kicker.join(' · '),
    title: g.eq.name || (g.boss ? 'Boss gate' : `Gate ${i + 1}`),
    live: w.live,
    returnFocus: returnFocus || (state.mode === '3d' ? ui.view : null)
  });
  if (state.mode === '3d' && state.engine) state.engine.openPuzzle(i, panelOverlap());
  return true;
}

function onPanelChange(values) {
  const i = state.puzzleGate;
  const w = state.world;
  if (!w || i < 0) return;
  if (state.mode === '3d' && state.engine) state.engine.showCoefficients(i, values);
  else scaleSvg.update(w.gates[i].eq, values);
}

function onPanelSolved(gate, stars) {
  const w = state.world;
  if (!w) return;
  if (w.key !== 'custom') {
    progress.markSolved(gate.eq.id, stars);
    if (gate.boss) progress.completeWorld(w.info.n);
  }
  if (state.mode === '3d' && state.engine) state.engine.solveGate(gate.index);
  else scaleSvg.update(gate.eq, gate.eq.coefficients);
  updateHud();
  const left = w.gates.filter((g) => !g.solved).length;
  if (gate.boss && state.mode === '3d') ui.help.textContent = 'The boss gate is open! Walk through the glowing ring to finish this world.';
  else if (left === 0 && state.mode === '3d') ui.help.textContent = 'Every gate is open! Walk to the glowing ring.';
}

function onPanelClose(gate) {
  state.puzzleGate = -1;
  ui.game.classList.remove('is-puzzle');
  const w = state.world;
  if (!w) return;
  if (state.mode === '3d' && state.engine) {
    state.engine.closePuzzle();
    updatePrompt(false);
  } else if (state.mode === '2d') {
    const next = board.nextIndex();
    board.refresh(next < 0 ? gate.index : next);
    if (next < 0 && state.screen === 'world') showComplete();
  }
}

function showComplete() {
  const w = state.world;
  if (!w || state.screen === 'complete') return;
  if (panel.isOpen) panel.close();
  state.screen = 'complete';
  if (state.engine && state.mode === '3d') state.engine.setMode('idle');
  ui.prompt.hidden = true;
  story.hideBubble();
  story.renderCompleteLine(ui.completeMole, w.info.n);
  const total = w.gates.reduce((sum, g) => sum + (g.stars || 0), 0);
  ui.completeTitle.textContent = w.info.n ? `World ${w.info.n} complete!` : 'Practice complete!';
  rich(ui.completeStars, [{ b: `★ ${total} of ${w.gates.length * 3}` }, ' stars']);
  clear(ui.completeList);
  w.gates.forEach((g, i) => {
    const name = `${g.boss ? 'Boss gate' : `Gate ${i + 1}`}${g.eq.name ? ': ' + g.eq.name : ''}`;
    ui.completeList.appendChild(
      el('li', {},
        el('span', { class: 'bq-complete-name', text: name }),
        el('span', { class: 'bq-complete-stars', 'aria-label': `${g.stars} stars`, text: starText(g.stars || 0) }))
    );
  });
  const nextWorld = w.info.n ? WORLDS.find((x) => x.n === w.info.n + 1) : null;
  const nextReady = nextWorld && (data.byWorld[nextWorld.n] || []).length > 0 && progress.isUnlocked(nextWorld.n);
  ui.completeUnlock.hidden = !nextReady;
  if (nextReady) ui.completeUnlock.textContent = `World ${nextWorld.n}: ${nextWorld.name} is open!`;
  ui.completeNext.hidden = !nextReady;
  if (nextReady) ui.completeNext.textContent = `Go to World ${nextWorld.n}`;
  // After the last world's boss, the ending comes first; its "See my stars" button shows this card.
  const finale = w.key !== 'custom' && w.info.n === WORLDS[WORLDS.length - 1].n;
  ui.complete.hidden = finale;
  if (finale) {
    let stars = 0;
    let maxStars = 0;
    WORLDS.forEach((x) => {
      const st = worldStats(x.n);
      stars += st.stars;
      maxStars += st.gates * 3;
    });
    story.showEnding({
      stars,
      maxStars,
      onBack: exitToTitle,
      onStars: () => {
        ui.complete.hidden = false;
        ui.completeTitle.focus();
      }
    });
    return;
  }
  ui.completeTitle.focus();
  announce(`${ui.completeTitle.textContent} You earned ${total} stars.`);
}

function onContextLost() {
  state.engineFailed = true; // the 3D view stays off until the page is reloaded
  if (panel.isOpen) panel.close();
  ui.lost.hidden = false;
  ui.lostReload.focus();
}

// ---------- Wiring ----------

const story = new Story({
  progress,
  main: $('main'),
  title: ui.title,
  stage: ui.stage,
  reducedMotion,
  onOpen: () => {
    if (state.screen !== 'title') exitToTitle();
    ui.title.hidden = true;
  },
  onClose: ({ first }) => {
    ui.title.hidden = false;
    window.scrollTo(0, 0);
    // First visit: straight to the first world you can play. Replay: back to the Story button.
    const target = first ? ui.worlds.querySelector('button:not([disabled])') || ui.worldsTitle : ui.storyBtn;
    target.focus();
  },
  focusGame: () => {
    if (state.screen !== 'world') return;
    if (state.mode === '3d' && !ui.view.hidden) ui.view.focus({ preventScroll: true });
    else (ui.boardList.querySelector('.is-next button:not([disabled])') || ui.menu).focus();
  }
});
ui.storyBtn.addEventListener('click', () => story.show());

const scaleSvg = createScaleSVG();
ui.scaleBox.appendChild(scaleSvg.el);

const panel = new PuzzlePanel({ onChange: onPanelChange, onSolved: onPanelSolved, onClose: onPanelClose });

const board = new Board2D({
  list: ui.boardList,
  heading: ui.boardHeading,
  onOpen: (i, btn) => openGate(i, btn)
});

const input = new Input({
  joystick: ui.joystick,
  knob: ui.knob,
  interactBtn: ui.touchSolve,
  isActive: () => state.screen === 'world' && state.mode === '3d' && !panel.isOpen && ui.lost.hidden,
  onMove: (x, y) => {
    if (state.engine && state.mode === '3d') state.engine.setInput(x, y);
    if (x || y) ui.help.classList.add('is-faded');
  },
  onInteract: interact
});

// Keep Tab inside the world-complete and "3D stopped" cards while they are open.
function trapTab(overlay) {
  overlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const items = [...overlay.querySelectorAll('button, [tabindex="-1"]')].filter((n) => !n.hidden && !n.disabled && n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}
trapTab(ui.complete);
trapTab(ui.lost);

ui.prompt.addEventListener('click', interact);
ui.menu.addEventListener('click', exitToTitle);
ui.completeMenu.addEventListener('click', exitToTitle);
ui.completeAgain.addEventListener('click', () => {
  const w = state.world;
  if (w) startWorld(w.key, { fresh: true });
});
ui.completeNext.addEventListener('click', () => {
  const w = state.world;
  if (w && w.info.n) {
    state.lastWorldCard = w.info.n + 1;
    startWorld(w.info.n + 1);
  }
});
ui.lostReload.addEventListener('click', () => window.location.reload());
ui.lostSimple.addEventListener('click', () => {
  ui.lost.hidden = true;
  state.engineFailed = true;
  if (state.world) {
    state.screen = 'world';
    enter2D('The 3D view stopped, so the game switched to simple mode. Your progress is saved.');
    updateHud();
  }
});
ui.slowBtn.addEventListener('click', () => {
  progress.simple = true;
  if (panel.isOpen) panel.close();
  enter2D('Simple mode is on. You can turn 3D back on from the world list.');
  updateHud();
});

ui.optSimple.addEventListener('change', () => {
  progress.simple = ui.optSimple.checked;
});
ui.optTeacher.addEventListener('change', () => {
  progress.teacher = ui.optTeacher.checked;
  renderTitle();
  ui.optTeacher.focus();
});

ui.practicePlay.addEventListener('click', playPractice);
ui.practiceExample.addEventListener('click', () => {
  ui.practiceText.value = PRACTICE_EXAMPLE;
  progress.saveCustom(ui.practiceText.value);
  ui.practiceText.focus();
});
ui.practiceLive.addEventListener('change', () => {
  progress.practiceLive = ui.practiceLive.checked;
});
let draftTimer = 0;
ui.practiceText.addEventListener('input', () => {
  window.clearTimeout(draftTimer);
  draftTimer = window.setTimeout(() => progress.saveCustom(ui.practiceText.value), 400);
});
ui.practiceText.value = progress.loadCustom();
ui.practiceLive.checked = progress.practiceLive;

// Touch devices get the joystick.
const keyboardHelp = ui.help.cloneNode(true);
function setHelpText() {
  if (state.touch) ui.help.textContent = 'Use the joystick to walk. Tap Solve at a gate.';
  else ui.help.replaceChildren(...keyboardHelp.cloneNode(true).childNodes);
}
function enableTouch() {
  if (state.touch) return;
  state.touch = true;
  document.body.classList.add('bq-touch-device');
  setHelpText();
  if (state.mode === '3d') ui.touch.hidden = false;
}
if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) enableTouch();
window.addEventListener('touchstart', enableTouch, { passive: true, once: true });

// Keep the 3D view sized to the screen.
const resizeView = () => {
  if (state.mode === '3d') {
    sizeStage();
    if (state.engine) {
      const r = ui.view.getBoundingClientRect();
      state.engine.resize(r.width, r.height);
      if (panel.isOpen) state.engine.setOverlap(panelOverlap());
    }
  }
};
window.addEventListener('resize', resizeView);
if ('ResizeObserver' in window) {
  new ResizeObserver(resizeView).observe(ui.view);
  // The panel grows when hints or messages appear: keep the scale framed above it.
  new ResizeObserver(() => {
    if (panel.isOpen && state.mode === '3d' && state.engine) state.engine.setOverlap(panelOverlap());
  }).observe(ui.puzzle.querySelector('.bq-pz-card'));
}

// ---------- Test hook (harmless in production: it only drives the game) ----------

function stats() {
  const base = state.engine ? state.engine.stats() : { renderer: null, rafChains: 0, maxRafChains: 0, fps: null };
  return { ...base, mode: state.mode || (progress.simple || !canUse3D() ? '2d' : '3d'), screen: state.screen };
}

let resolveReady;
const ready = new Promise((resolve) => {
  resolveReady = resolve;
});

window.__BQ_TEST__ = Object.freeze({
  ready,
  listWorlds: () =>
    WORLDS.map((w) => ({
      n: w.n,
      name: w.name,
      gates: (data.byWorld[w.n] || []).length,
      unlocked: progress.isUnlocked(w.n),
      completed: progress.isCompleted(w.n)
    })),
  enterWorld: async (n) => {
    const ok = await startWorld(n);
    return { ok, mode: state.mode, gates: state.world ? state.world.gates.length : 0 };
  },
  gates: () => (state.world ? state.world.gates.map((g) => ({ id: g.eq.id, solved: g.solved, stars: g.stars, boss: g.boss })) : []),
  openGate: (i) => {
    story.dismiss();
    if (!state.world || state.screen !== 'world') return false;
    if (panel.isOpen) panel.close();
    if (state.mode === '3d' && state.engine) state.engine.teleportToGate(i);
    return openGate(i);
  },
  setCoefficients: (arr) => {
    panel.setCoefficients(Array.isArray(arr) ? arr : []);
    return panel.values();
  },
  check: () => panel.check(),
  hint: () => panel.hint(),
  solveCurrent: () => panel.solve(),
  closePuzzle: () => {
    panel.close();
    return true;
  },
  walkToNextGate: () => {
    const w = state.world;
    if (!w || state.screen !== 'world') return { finished: state.screen === 'complete' };
    const next = w.gates.findIndex((g) => !g.solved);
    if (state.mode === '3d' && state.engine) {
      if (next >= 0) {
        state.engine.teleportToGate(next);
        return { gate: next, near: state.engine.nearGate };
      }
      state.engine.teleportToFinish();
      return { finished: state.screen === 'complete' };
    }
    if (next >= 0) return { gate: next, near: next };
    showComplete();
    return { finished: true };
  },
  exitWorld: () => {
    exitToTitle();
    return stats();
  },
  stats,
  chem,
  story: Object.freeze({
    show: () => story.show(),
    skip: () => story.skip(),
    isShowing: () => story.isShowing()
  })
});

renderTitle();
if (!progress.storySeen) story.show({ first: true });
resolveReady(true);
