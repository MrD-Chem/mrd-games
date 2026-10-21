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
  return Object.assign(new Events(), {
    id, textContent: '', value: '', disabled: false, hidden: false, children: [],
    setAttribute() {},
    getContext: () => context2d,
    getBoundingClientRect: () => ({ width: 1000, height: 540 }),
    after(value) { summaries.push(value); },
    remove() { const i = summaries.indexOf(this); if (i !== -1) summaries.splice(i, 1); },
    replaceChildren(...values) { this.children = values; },
    append(value) { this.children.push(value); }
  });
}
const document = Object.assign(new Events(), {
  hidden: false, baseURI: 'http://localhost/games/mole-rush/race-demo/', title: '',
  createElement: () => node(),
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
for (const path of ['../js/race/track.js', '../js/race/cpu.js', '../js/race/countdown.js', './tests.js']) {
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
