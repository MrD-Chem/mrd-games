/** Optional Node-only runner: node games/mole-rush/race-demo/run-tests.mjs.
 * Runs the browser checks against DOM/canvas doubles; no packages or server.
 * This verifies logic, not browser rendering or CSP enforcement.
 */
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

class Events {
  listeners = new Map();
  addEventListener(name, callback) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(callback);
  }
  removeEventListener(name, callback) { this.listeners.get(name)?.delete(callback); }
  dispatchEvent(event) { for (const callback of this.listeners.get(event.type) || []) callback(event); }
}

const nodes = new Map();
const summaries = [];
const context2d = new Proxy({}, { get: (target, key) => target[key] ?? (() => {}),
  set: (target, key, value) => { target[key] = value; return true; } });
function node(id = '') {
  const result = Object.assign(new Events(), {
    id, textContent: '', value: '', disabled: false, hidden: false, children: [],
    setAttribute(key, value) { this[key === 'class' ? 'className' : key] = value; },
    focus() {},
    getContext: () => context2d,
    getBoundingClientRect: () => ({ width: 1000, height: 540 }),
    after(value) { summaries.push(value); },
    remove() {
      const i = summaries.indexOf(this); if (i !== -1) summaries.splice(i, 1);
      if (this.parentNode) this.parentNode.removeChild(this);
    },
    removeChild(value) { this.children.splice(this.children.indexOf(value), 1); value.parentNode = null; },
    appendChild(value) { value.remove?.(); this.children.push(value); value.parentNode = this; return value; },
    replaceChildren(...values) { for (const child of [...this.children]) this.removeChild(child); this.append(...values); },
    append(...values) { for (const value of values) this.appendChild(value); }
  });
  Object.defineProperty(result, 'firstChild', { get() { return this.children[0] || null; } });
  return result;
}
const document = Object.assign(new Events(), {
  hidden: false, baseURI: 'http://localhost/games/mole-rush/race-demo/', title: '',
  createElement: () => node(),
  createTextNode: text => Object.assign(node(), { textContent: text }),
  querySelector(selector) {
    if (selector === '.race-summary') return summaries[0] || null;
    if (!nodes.has(selector)) nodes.set(selector, node(selector));
    return nodes.get(selector);
  }
});
const media = Object.assign(new Events(), { matches: false });
const window = Object.assign(new Events(), {
  devicePixelRatio: 3, location: { origin: 'http://localhost' }, matchMedia: () => media
});
const sandbox = { document, window, console, URL, performance: { now: () => 0 },
  setTimeout, clearTimeout, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  Event: class { constructor(type) { this.type = type; } },
  ResizeObserver: class { observe() {} disconnect() {} },
  Image: class { naturalWidth = 64; naturalHeight = 64; }
};
const context = vm.createContext(sandbox);
for (const path of ['../js/race/track.js', '../js/race/cpu.js', '../js/race/countdown.js', './fake-clock.js', './tests.js']) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  // Keep each production module in its own scope, exposing just its named exports.
  const names = [...source.matchAll(/^export (?:function|const) (\w+)/gm)].map(match => match[1]);
  const body = source.replace(/^import .* from .*;\n/gm, '').replace(/^export /gm, '');
  const helpers = path === './tests.js' ? '\nglobalThis.testClock = fakeClock;' : '';
  new vm.Script('{\n' + body + '\n' + names.map(name => 'globalThis.' + name + ' = ' + name + ';').join('\n') + helpers + '\n}', { filename: path }).runInContext(context);
}
console.log(nodes.get('#test-results').textContent);
if (document.title.startsWith('FAIL')) throw new Error('Race regression checks failed.');
for (const target of [document, window, media]) {
  for (const callbacks of target.listeners.values()) {
    if (callbacks.size) throw new Error('Listener leaked after tests.');
  }
}
if (summaries.length) throw new Error('Live summary leaked after tests.');
console.log('PASS  No document/window/media listeners or live summaries leaked.');

// Run the actual demo controller against the same deterministic event/clock API.
document.querySelector('#mode').value = 'solo';
document.querySelector('#steps').value = '3';
for (const [i, difficulty] of ['easy', 'medium', 'hard'].entries()) {
  document.querySelector('#cpu-' + (i + 1)).value = difficulty;
}
vm.runInContext('globalThis.demoClock = testClock();', context);
try {
  const demo = await readFile(new URL('./demo.js', import.meta.url), 'utf8');
  new vm.Script('{\n' + demo.replace(/^import .* from .*;\n/gm, '') + '\n}', { filename: 'demo.js' }).runInContext(context);
  for (const mode of ['solo', 'teams']) {
    document.querySelector('#mode').value = mode;
    document.querySelector('#settings').dispatchEvent({ type: 'change' });
    document.querySelector('#start').dispatchEvent({ type: 'click' });
    // Restart during countdown must cancel the first countdown and its CPUs.
    document.querySelector('#start').dispatchEvent({ type: 'click' });
    vm.runInContext('demoClock.advance(4999);', context);
    if (!document.querySelector('#correct').disabled) throw new Error('Demo enabled answers before GO.');
    vm.runInContext('demoClock.advance(1);', context);
    if (document.querySelector('#correct').disabled) throw new Error('Demo did not start.');
    document.querySelector('#wrong').dispatchEvent({ type: 'click' });
    for (let i = 0; i < 3; i++) document.querySelector('#correct').dispatchEvent({ type: 'click' });
    vm.runInContext('demoClock.advance(600000); for (let i = 0; i < 150; i++) demoClock.frame();', context);
    const results = document.querySelector('#results');
    if (results.hidden || results.children.length !== (mode === 'solo' ? 4 : 2)) throw new Error('Demo did not finish ' + mode);
    if (vm.runInContext('demoClock.tasks.size + demoClock.frames.size', context)) throw new Error('Demo leaked timers after ' + mode);
    console.log('PASS  Demo ' + mode + ': restart, countdown, answers, CPU finish and results.');
  }
  window.dispatchEvent({ type: 'pagehide' });
  if (summaries.length) throw new Error('Demo pagehide leaked summary.');
  console.log('PASS  Demo pagehide disposes race.');
} finally {
  vm.runInContext('demoClock.restore();', context);
}

// Integration logic without a browser: DOM doubles plus the real Session events.
// The integration.html page additionally exercises main.js and every map renderer.
vm.runInContext('globalThis.map1 = {}; globalThis.map2 = {}; globalThis.map3 = {}; globalThis.map4 = {}; globalThis.balance = {};', context);
for (const path of ['../js/dom.js', '../js/rng.js', '../js/session.js', '../js/maps/index.js', '../js/online/standings.js', '../js/race/computer.js']) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const names = [...source.matchAll(/^export (?:function|const|class) (\w+)/gm)].map(match => match[1]);
  const body = source.replace(/^import .* from .*;\n/gm, '').replace(/^export /gm, '');
  new vm.Script('{\n' + body + '\n' + names.map(name => 'globalThis.' + name + ' = ' + name + ';').join('\n') + '\n}', { filename: path }).runInContext(context);
}
vm.runInContext(`{
  const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
  const clock = fakeClock();
  const host = el('div');
  const panel = createStandings(host, { questionCount: 8 });
  const entries = [0, 1, 2, 3].map(i => ({ slot: 's' + i, name: 'Mole ' + i,
    steps: 0, team: i < 2 ? 'A' : 'B', isMe: i === 0, place: i + 1 }));
  panel.update({ mode: 'solo', entries });
  entries[0].steps = 5;
  panel.update({ mode: 'solo', entries }); panel.update({ mode: 'solo', entries });
  assert(panel.standings()[0].steps === 5, 'Adapter double-counted snapshot');
  panel.update({ mode: 'solo', entries: entries.slice(0, 1) });
  assert(panel.standings().length === 1 && panel.standings()[0].steps === 5, 'Leaving lost progress');
  entries[0].steps = 8; entries[1].steps = 8; entries[2].steps = 6;
  panel.update({ mode: 'teams', entries });
  entries[3].steps = 3;
  panel.update({ mode: 'teams', entries });
  assert(panel.standings()[1].steps === 9, 'Team win froze live race');
  panel.destroy();
  assert(!clock.frames.size && !host.children.length, 'Adapter cleanup failed');
  console.log('PASS  Adapter snapshots: deltas, duplicates, leaving, teams and cleanup.');

  let screen = '';
  let session = null;
  let hooks = null;
  const app = {
    host: el('main'), sidebar: el('aside'),
    show(value) { screen = value; }, openTitle() { screen = 'title'; },
    stopRace() { const old = hooks; hooks = null; session = null; old?.onDispose?.(); },
    startRace(map, code, nextHooks) {
      this.stopRace(); hooks = nextHooks;
      session = new Session({ mapId: map, code, seed: codeToSeed(code),
        items: Array.from({ length: MAP_RULES[map].length }, (_, i) => ({ id: 'q' + i, kind: 'setup' })) });
      session.onFinish(summary => {
        const old = hooks; hooks = null; session = null; old.onFinish(summary);
      });
      hooks.onSession(session); screen = 'play'; session.start();
      return { ok: true };
    }
  };
  const computer = initComputer(app).test;
  function start(map, mode, difficulty = 'easy') {
    assert(computer.start({ map, mode, difficulty }, 'MOLE-38').ok, 'CPU start failed');
    clock.advance(2999); assert(!computer.current().active, 'Early countdown');
    clock.advance(1); assert(computer.current().active && screen === 'play', 'GO failed');
    assert(session.total === computer.current().totalSteps, 'Wrong round length');
  }
  function solveRound(reveal = false) {
    const total = session.total;
    for (let i = 0; i < total; i++) {
      if (reveal && !i) session.reveal(); else session.answer(true);
      session.next();
    }
  }
  try {
    for (const map of [1, 2, 3, 4]) {
      start(map, 'solo'); session.answer(false);
      assert(computer.current().standings.find(r => r.isPlayer).steps === 0, 'Wrong counted');
      solveRound(); assert(screen === 'cpu-wait', 'No waiting screen');
      clock.advance(1200000);
      assert(screen === 'cpu-results' && computer.current().standings[0].isPlayer, 'Solo results failed');
      assert(!clock.tasks.size && !clock.frames.size && !computer.current().active, 'Finish leaked');
    }
    console.log('PASS  Computer: all four session lengths, answers, solo places and cleanup.');
    start(4, 'teams', 'hard'); clock.advance(1200000);
    assert(screen === 'cpu-results' && computer.current().standings[0].team === 'B', 'CPU teams win failed');
    start(2, 'teams', 'medium'); solveRound(); clock.advance(1200000);
    assert(computer.current().standings[0].team === 'A', 'You + Pip win failed');
    start(4, 'solo'); solveRound(true); clock.advance(1200000);
    const me = computer.current().standings.find(r => r.isPlayer);
    assert(screen === 'cpu-results' && me.steps === 7 && !me.finished && me.place === 4, 'Reveal stranded race');
    console.log('PASS  Computer: both teams can win; Show me ends without an unearned step.');
    start(3, 'solo', 'medium'); clock.advance(60000);
    const first = JSON.stringify(computer.current().standings);
    computer.leave(); start(3, 'solo', 'medium'); clock.advance(60000);
    assert(first === JSON.stringify(computer.current().standings), 'Replay changed');
    computer.settings(); assert(screen === 'cpu-settings' && !computer.current().active, 'Change settings failed');
    computer.start({ map: 1, mode: 'solo', difficulty: 'easy' }, 'MOLE-38');
    computer.start({ map: 4, mode: 'teams', difficulty: 'hard' }, 'MOLE-38');
    computer.leave(); clock.advance(10000);
    assert(screen === 'title' && !clock.tasks.size && !clock.frames.size, 'Countdown leave leaked');
    start(1, 'solo'); window.dispatchEvent(new Event('pagehide'));
    assert(!clock.tasks.size && !clock.frames.size && !computer.current().active, 'Pagehide leaked');
    console.log('PASS  Computer: seeded replay, settings, countdown restart/leave and pagehide.');
  } finally { computer.leave(); clock.restore(); }
}`, context);
