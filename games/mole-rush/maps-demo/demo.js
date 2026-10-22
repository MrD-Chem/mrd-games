/* Standalone manual demo and full-bank regression check. No site navigation link. */

import { el, clear, announce } from '../js/dom.js?v=20261021T1624';
import { loadBank } from '../js/bank.js?v=20261021T1624';
import { hashString } from '../js/rng.js?v=20261021T1624';
import * as map2 from '../js/maps/map2.js?v=20261021T1624';
import * as map3 from '../js/maps/map3.js?v=20261021T1624';
import * as map4 from '../js/maps/map4.js?v=20261021T1624';

const maps = [
  { id: 2, name: 'Numbers', renderer: map2 },
  { id: 3, name: 'Blanks', renderer: map3 },
  { id: 4, name: 'Word problem', renderer: map4 }
];
const mapSelect = document.getElementById('demo-map');
const problemSelect = document.getElementById('demo-problem');
const stage = document.getElementById('demo-stage');
const testHost = document.getElementById('demo-test-host');
const testButton = document.getElementById('demo-test');
const testResult = document.getElementById('demo-test-result');
const failuresList = document.getElementById('demo-failures');
const result = document.getElementById('demo-result');
const loaded = loadBank();
const bank = loaded.bank;
let board = null;
let running = false;

function itemFor(problem) {
  return { kind: 'setup', id: problem.id, problem, seed: hashString(`maps-demo:${problem.id}`) };
}

function renderSelected() {
  if (board) board.destroy();
  result.textContent = '';
  const map = maps.find((m) => m.id === Number(mapSelect.value));
  const problem = bank.problemById.get(problemSelect.value);
  board = map.renderer.render(stage, itemFor(problem), { bank, onResult: (r) => {
    result.textContent = `Result: ${r.correct ? 'correct' : r.revealed ? 'revealed' : 'try again'} · tries ${r.tries} · final ${r.final}`;
  } });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/* One PASS per map/problem pair. Besides wrong → solve → check, check Show me,
   deterministic blanks, and destroy during cancellation (timers must be stopped). */
export async function runSelfTest() {
  if (running || !bank) return;
  running = true;
  testButton.disabled = true;
  testResult.className = '';
  testResult.textContent = 'Testing every map and problem…';
  clear(failuresList);
  failuresList.hidden = true;
  const failures = [];
  const destroyedRoots = [];
  const total = bank.problems.length * maps.length;
  let passed = 0;
  try {
    for (const map of maps) {
      for (const problem of bank.problems) {
        let testBoard;
        try {
          const events = [];
          const options = { bank, onResult: (r) => events.push(r) };
          testBoard = map.renderer.render(testHost, itemFor(problem), options);
          const initial = testBoard.state();
          testBoard.answerWrong();
          assert(events.length === 1 && events[0].correct === false && events[0].final === false && events[0].tries === 1, 'Wrong attempt did not report a nonfinal failure');
          testBoard.solve();
          testBoard.check();
          const right = events[events.length - 1];
          assert(right && right.correct === true && right.revealed === false && right.final === true && right.tries === 2, 'Solved attempt did not report success');
          destroyedRoots.push(testHost.firstChild);
          testBoard.destroy();
          assert(testHost.childNodes.length === 0, 'Destroy left DOM behind');
          testBoard = map.renderer.render(testHost, itemFor(problem), options);
          if (map.id === 3) {
            assert(JSON.stringify(initial.blanks) === JSON.stringify(testBoard.state().blanks), 'Blanks changed for the same item');
            assert(JSON.stringify(initial.tiles) === JSON.stringify(testBoard.state().tiles), 'Tile order changed for the same item');
            assert(initial.slots.length >= 2 && initial.slots.length <= 3, 'Expected 2–3 blanks');
            assert(initial.slots.some((s) => s.type === 'label') && initial.slots.some((s) => s.type === 'number'), 'Expected both a label and a number blank');
          }
          testBoard.answerWrong();
          testBoard.answerWrong();
          const show = testHost.querySelector('[data-action="show"]');
          assert(show && !show.hidden, 'Show me unavailable after two attempts');
          show.click();
          const shown = events[events.length - 1];
          assert(shown && shown.correct === false && shown.revealed === true && shown.final === true, 'Show me did not report revealed');
          destroyedRoots.push(testHost.firstChild);
          testBoard.destroy();
          assert(testHost.childNodes.length === 0, 'Reveal cleanup left DOM behind');
          passed++;
        } catch (err) {
          failures.push(`Map ${map.id}, ${problem.id}: ${err.message}`);
        } finally {
          if (testBoard) testBoard.destroy();
          clear(testHost);
        }
        if ((passed + failures.length) % 12 === 0) await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
    }
    // Longer than the longest bank track's cancellation: destroyed boards stay gone.
    const maxSteps = Math.max(...bank.problems.map((p) => p.steps.length));
    await new Promise((resolve) => window.setTimeout(resolve, maxSteps * 420 + 300));
    if (testHost.childNodes.length) failures.push('A delayed callback restored DOM after destroy.');
    if (destroyedRoots.some((root) => root.parentNode || root.classList.contains('is-worked'))) failures.push('A destroyed board remained attached or completed a stale animation.');
    testResult.textContent = `${failures.length ? 'FAIL' : 'PASS'} ${passed}/${total}`;
    testResult.className = failures.length ? 'is-fail' : 'is-pass';
    failures.forEach((text) => failuresList.appendChild(el('li', { text })));
    failuresList.hidden = !failures.length;
    announce(testResult.textContent);
    return { passed, total, failures };
  } finally {
    running = false;
    testButton.disabled = false;
  }
}

if (!loaded.ok || loaded.warnings.length || bank.problems.length !== window.MR_BANK.problems.length) {
  testResult.textContent = `Bank could not load completely: ${loaded.error || loaded.warnings.join('; ') || 'missing problems'}`;
  testResult.className = 'is-fail';
  testButton.disabled = true;
} else {
  maps.forEach((m) => mapSelect.appendChild(el('option', { value: String(m.id), text: `Map ${m.id} · ${m.name}` })));
  bank.problems.forEach((p) => problemSelect.appendChild(el('option', { value: p.id, text: `${p.id} · ${p.type} · ${p.text}` })));
  mapSelect.addEventListener('change', renderSelected);
  problemSelect.addEventListener('change', renderSelected);
  document.getElementById('demo-reset').addEventListener('click', renderSelected);
  testButton.addEventListener('click', runSelfTest);
  renderSelected();
}
