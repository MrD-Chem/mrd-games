/* Offline race controller. The ordinary map session owns every question/answer. */
import { el, clear } from '../dom.js?v=20261022T1625';
import { MAPS } from '../maps/index.js?v=20261022T1625';
import { MAP_RULES } from '../session.js?v=20261022T1625';
import { randomCode, normalizeCode, deriveSeed } from '../rng.js?v=20261022T1625';
import { createRace } from './track.js?v=20261022T1625';
import { createCpu, CPU_DIFFICULTIES } from './cpu.js?v=20261022T1625';
import { countdownFor } from './countdown.js?v=20261022T1625';

const PLAYER = 'you';
const COLORS = ['#6ee7cf', '#fcd779', '#c4b5fd', '#fda4af'];

export function initComputer(app) {
  let settings = { map: 1, difficulty: 'medium', mode: 'solo' };
  let roundCode = null;
  let phase = 'idle';
  let track = null;
  let panel = null;
  let countdown = null;
  let finishTimer = null;
  let unsub = null;
  let cpus = [];
  let sessionDone = false;
  let final = [];

  function button(text, action, primary = false) {
    const b = el('button', { type: 'button', class: 'btn btn-lg ' + (primary ? 'btn-primary' : 'btn-ghost'), text });
    b.addEventListener('click', action);
    return b;
  }
  function screen(id, title) {
    const heading = el('h2', { class: 'mr-section-title', id: id + '-title', tabindex: '-1', text: title });
    const root = el('section', { id: 'mr-' + id, class: 'mr-screen', hidden: true, 'aria-labelledby': heading.id }, heading);
    app.host.appendChild(root);
    return { root, heading };
  }
  const setup = screen('cpu-settings', 'Race the computer');
  const form = el('form', { class: 'panel mr-online-card' });
  const inputs = {};
  function choice(name, label, options) {
    const pills = el('div', { class: 'mr-pills' });
    inputs[name] = options.map(([value, text]) => {
      const input = el('input', { type: 'radio', name: 'cpu-' + name, value, checked: String(settings[name]) === String(value) });
      pills.appendChild(el('label', { class: 'mr-pill' }, input, el('span', { class: 'mr-pill-face', text })));
      return input;
    });
    form.appendChild(el('fieldset', { class: 'mr-choice' }, el('legend', { class: 'mr-choice-legend', text: label }), pills));
  }
  choice('map', 'Map', MAPS.map(m => [m.id, 'Map ' + m.id + ' · ' + m.name]));
  choice('difficulty', 'Difficulty', Object.keys(CPU_DIFFICULTIES).map(d => [d, d[0].toUpperCase() + d.slice(1)]));
  choice('mode', 'Mode', [['solo', 'Solo · you vs 3 CPUs'], ['teams', 'Teams · you + Pip vs Dot + Mo']]);
  const error = el('p', { role: 'alert', class: 'mr-code-error' });
  form.append(el('p', { class: 'mr-field-help', text: 'Each correct answer moves your mole one step. Show me gives no step. Race again repeats the same questions and CPU timing.' }),
    el('button', { type: 'submit', class: 'btn btn-primary btn-lg', text: 'Start race' }), error);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const selected = Object.fromEntries(Object.entries(inputs).map(([key, radios]) => [key, radios.find(r => r.checked).value]));
    start(selected);
  });
  setup.root.append(button('← Back', back), form);

  const ready = screen('cpu-countdown', 'Get ready!');
  const count = el('p', { class: 'mr-cd-num', role: 'status', 'aria-live': 'assertive', 'aria-atomic': 'true' });
  ready.root.append(count, button('← Back', open));
  const waiting = screen('cpu-wait', 'Your questions are done');
  const waitHost = el('div');
  waiting.root.append(el('p', { text: 'Watch the remaining moles finish. Shown answers earn no steps.' }), waitHost, button('Leave race', open));
  const results = screen('cpu-results', 'Race results');
  const resultNote = el('p', { class: 'mr-results-msg' });
  const resultList = el('ol', { class: 'mr-rr-list', 'aria-label': 'Final places' });
  results.root.append(resultNote, resultList, el('div', { class: 'mr-actions' },
    button('Race again', () => start(settings, roundCode), true),
    button('Change settings', open), button('Back', back)));

  function dispose() {
    if (countdown) countdown.cancel();
    countdown = null;
    clearTimeout(finishTimer);
    finishTimer = null;
    cpus.forEach(c => c.stop());
    cpus = [];
    if (unsub) unsub();
    unsub = null;
    if (track) track.destroy();
    track = null;
    if (panel) panel.remove();
    panel = null;
    if (phase !== 'results') phase = 'idle';
  }
  function leave() { dispose(); app.stopRace(); }
  function back() { leave(); phase = 'idle'; app.openTitle(); }
  function open() {
    leave();
    phase = 'settings';
    error.textContent = '';
    for (const [key, radios] of Object.entries(inputs)) {
      radios.forEach(r => { r.checked = r.value === String(settings[key]); });
    }
    app.show('cpu-settings', setup.heading);
  }

  function finish(order) {
    if (phase !== 'race' && phase !== 'waiting') return;
    final = order;
    phase = 'results';
    leave();
    clear(resultList);
    for (const entry of final) {
      const name = settings.mode === 'teams'
        ? 'Team ' + entry.team + ' · ' + entry.members.map(m => m.name).join(' + ')
        : entry.name;
      resultList.appendChild(el('li', { class: 'mr-rr-row' },
        el('span', { class: 'mr-rr-place', text: String(entry.place) + '.' }),
        el('span', { class: 'mr-rr-name', text: name }),
        el('span', { class: 'mr-rr-steps', text: entry.steps + '/' + entry.totalSteps }),
        el('span', { class: 'mr-rr-result', text: entry.finished ? 'Finished' : 'Round ended' })));
    }
    results.heading.textContent = settings.mode === 'teams' ? 'Team ' + final[0].team + ' wins!' : final[0].name + ' wins!';
    resultNote.textContent = 'Map ' + settings.map + ' · ' + settings.difficulty + ' · Round ' + roundCode;
    app.show('cpu-results', results.heading);
  }
  function queueFinish(order) {
    // Map renderers finish their answer callback before their board is destroyed.
    if (finishTimer !== null) return;
    finishTimer = setTimeout(() => { finishTimer = null; finish(order); }, 0);
  }
  function members() {
    const order = track.standings();
    return settings.mode === 'teams' ? order.flatMap(t => t.members) : order;
  }
  function checkDone() {
    if (!track) return;
    if (settings.mode === 'solo' && sessionDone && members().filter(r => !r.isPlayer).every(r => r.finished)) {
      queueFinish(track.standings());
    }
  }
  function begin() {
    countdown = null;
    phase = 'race';
    const out = app.startRace(settings.map, roundCode, {
      quitLabel: 'Leave race', finishLabel: 'Finish round →', onQuit: open, onDispose: dispose,
      onSession(session) {
        const racers = ['You', 'Pip', 'Dot', 'Mo'].map((name, i) => ({
          id: i ? 'cpu-' + i : PLAYER, name, color: COLORS[i], isPlayer: i === 0,
          team: settings.mode === 'teams' ? (i < 2 ? 'A' : 'B') : null
        }));
        const canvas = el('canvas', { class: 'mr-race-canvas', 'aria-label': 'Computer race track' });
        panel = el('section', { class: 'mr-sp' }, canvas);
        app.sidebar.appendChild(panel);
        track = createRace({ canvas, racers, totalSteps: MAP_RULES[settings.map].length,
          mode: settings.mode, onFinish: queueFinish });
        track.start();
        cpus = racers.slice(1).map(r => {
          let cpu;
          cpu = createCpu({ racerId: r.id, difficulty: settings.difficulty,
            seed: deriveSeed(session.seed, 'cpu', settings.map, settings.mode, settings.difficulty, r.id),
            onAnswer(id, correct) {
              if (!track) return;
              if (correct) track.correct(id); else track.wrong(id);
              if (members().find(r => r.id === id).finished) cpu.stop();
              checkDone();
            } });
          return cpu;
        });
        unsub = session.onAnswer(correct => {
          if (!track) return;
          if (correct) track.correct(PLAYER); else track.wrong(PLAYER);
        });
      },
      onFinish() {
        sessionDone = true;
        if (unsub) unsub();
        unsub = null;
        phase = 'waiting';
        waitHost.appendChild(panel);
        app.show('cpu-wait', waiting.heading);
        checkDone();
      }
    });
    if (!out.ok) {
      open();
      error.textContent = out.reason;
      return;
    }
    cpus.forEach(c => c.start());
  }
  function start(options = settings, code = randomCode()) {
    const map = Number(options.map);
    const difficulty = String(options.difficulty).toLowerCase();
    const mode = options.mode;
    const norm = normalizeCode(code);
    if (!MAP_RULES[map] || !CPU_DIFFICULTIES[difficulty] || !['solo', 'teams'].includes(mode) || !norm) {
      return { ok: false, reason: 'Choose a map, difficulty and mode.' };
    }
    leave();
    settings = { map, difficulty, mode };
    roundCode = norm.display;
    sessionDone = false;
    final = [];
    phase = 'countdown';
    app.show('cpu-countdown', ready.heading);
    countdown = countdownFor(3, { onTick: n => { count.textContent = n ? String(n) : 'Go!'; }, onGo: begin });
    return { ok: true, code: roundCode };
  }
  window.addEventListener('pagehide', leave);
  return { open, dispose, test: Object.freeze({ start, leave: back, settings: open,
    current: () => ({ phase, settings: { ...settings }, code: roundCode,
      totalSteps: MAP_RULES[settings.map].length, standings: track ? track.standings() : final,
      active: !!track, countdown: !!countdown }) }) };
}
