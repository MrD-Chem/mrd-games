/** Dependency-free API regression checks. Open tests.html via a static server.
 * Fake clocks make CPU, countdown and animation checks immediate/reproducible.
 * Globals are restored after every test; no external requests are made.
 */
import { fakeClock } from './fake-clock.js?v=20261022T1625';
import { createRace } from '../js/race/track.js?v=20261022T1625';
import { createCpu, CPU_DIFFICULTIES } from '../js/race/cpu.js?v=20261022T1625';
import { countdownTo, countdownFor } from '../js/race/countdown.js?v=20261022T1625';

const output = document.querySelector('#test-results');
const canvas = document.querySelector('#track');
const report = [];
let failures = 0;

function assert(condition, message) { if (!condition) throw new Error(message); }
function equal(actual, expected, message) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message + ': ' + JSON.stringify(actual));
}
function racers(count = 4) {
  return Array.from({ length: count }, (_, i) => ({ id: 'r' + i, name: 'Mole ' + i,
    color: '#6ee7cf', isPlayer: i === 0, team: i < 2 ? 'A' : 'B' }));
}


function test(name, run) {
  const clock = fakeClock();
  const cleanups = [];
  function race(options = {}) {
    const value = createRace({ canvas, racers: racers(), totalSteps: 2, ...options });
    cleanups.push(() => value.destroy());
    return value;
  }
  function cpu(options) {
    const value = createCpu(options);
    cleanups.push(() => value.stop());
    return value;
  }
  try { run({ clock, race, cpu, cleanups }); report.push('PASS  ' + name); }
  catch (error) { failures++; report.push('FAIL  ' + name + '\n      ' + error.message); }
  finally { for (const cleanup of cleanups) cleanup(); clock.restore(); }
}

test('Solo preserves all finish places, clamps steps, fires once and snapshots are isolated', ({ race }) => {
  let calls = 0;
  let final;
  const r = race({ onFinish: value => { calls++; final = value; } });
  r.correct('r0');
  assert(r.standings()[0].steps === 0, 'Pre-start answer counted');
  r.start(); r.start(); r.wrong('r0'); r.correct('unknown');
  equal(r.standings().map(x => x.steps), [0, 0, 0, 0], 'Wrong/unknown changed progress');
  for (const id of ['r2', 'r0', 'r3', 'r1']) { r.correct(id); r.correct(id); r.correct(id); }
  equal(final.map(x => x.id), ['r2', 'r0', 'r3', 'r1'], 'Wrong finish order');
  equal(final.map(x => x.place), [1, 2, 3, 4], 'Wrong finish places');
  assert(calls === 1, 'Finish callback not once');
  final[0].steps = 500;
  assert(r.standings()[0].steps === 2, 'Snapshot mutated state');
});

test('Ties share place until crossing; winner is fixed before final callback', ({ race }) => {
  let calls = 0;
  const r = race({ onFinish: () => calls++ }); r.start();
  r.correct('r1'); r.correct('r0');
  equal(r.standings().map(x => x.place), [1, 1, 3, 3], 'Ties');
  r.correct('r1');
  assert(r.standings()[0].id === 'r1' && calls === 0, 'Winner not fixed, or callback too early');
  r.correct('r0');
  equal(r.standings().slice(0, 2).map(x => x.place), [1, 2], 'Crossing ties');
});

test('Teams sum both racers, cap individuals and stop on first team finish', ({ race }) => {
  let calls = 0;
  const r = race({ mode: 'teams', onFinish: () => calls++ }); r.start();
  r.correct('r0'); r.correct('r0'); r.correct('r0');
  assert(r.standings()[0].steps === 2 && calls === 0, 'Solo mole completed team');
  r.correct('r2'); r.correct('r1'); r.correct('r1');
  assert(calls === 1, 'Missing team finish');
  const final = r.standings();
  r.correct('r3'); r.correct('r3');
  equal(r.standings(), final, 'Race changed after team win');
  assert(final[0].team === 'A' && final[0].steps === 4 && final[0].finished, 'Wrong team winner');
});

test('Animation has one loop, pauses hidden, settles idle and destroys cleanly', ({ clock, race }) => {
  const r = race({ reducedMotion: false });
  assert(clock.frames.size === 0, 'Idle race scheduled frames');
  r.start(); r.correct('r0'); r.correct('r1'); r.wrong('r1');
  assert(clock.frames.size === 1, 'Multiple animation loops');
  clock.visibility(true);
  assert(clock.frames.size === 0, 'Hidden frame remained');
  clock.advance(100000); clock.visibility(false);
  assert(clock.frames.size === 1, 'Did not resume');
  for (let i = 0; i < 120; i++) { clock.frame(); assert(clock.frames.size <= 1, 'Duplicate loop'); }
  assert(clock.frames.size === 0, 'Animation did not stop');
  r.wrong('r0'); r.destroy(); r.destroy(); r.correct('r0');
  assert(clock.frames.size === 0 && !document.querySelector('.race-summary'), 'Destroy leaked');
});

test('Reduced motion updates state immediately without animation', ({ clock, race }) => {
  const r = race({ reducedMotion: true }); r.start(); r.correct('r0'); r.wrong('r0');
  assert(clock.frames.size === 0 && r.standings()[0].steps === 1, 'Reduced motion animated or lost progress');
});

test('2–4 racer validation, invalid teams and pixel-ratio cap', ({ race }) => {
  race({ racers: racers(2) }).destroy();
  let threw = false;
  try { race({ mode: 'teams', racers: racers(3) }); } catch { threw = true; }
  assert(threw, 'Invalid teams accepted');
  threw = false;
  try { race({ racers: [racers()[0], racers()[0]] }); } catch { threw = true; }
  assert(threw, 'Duplicate ids accepted');
  race();
  // The test canvas can be 0px wide (the renderer keeps a 1px minimum), so check the height.
  assert(canvas.height <= Math.round(Math.max(1, canvas.getBoundingClientRect().height) * 1.5), 'DPR over cap');
});

test('Live rooms accept depleted/uneven rosters and keep racing after a team finishes', ({ race }) => {
  const r = race({ live: true, mode: 'teams', racers: racers(3) }); r.start();
  r.correct('r2'); r.correct('r2'); r.correct('r0');
  r.syncStatus([{ id: 'r0', place: 2, finished: true }, { id: 'r2', place: 1, finished: true }],
    [{ team: 'A', place: 2, done: false }, { team: 'B', place: 1, done: true }]);
  const order = r.standings();
  assert(order[0].team === 'B' && order[0].totalSteps === 2, 'Wrong live team target/order');
  assert(order[1].steps === 1 && order[1].members[0].finished, 'Live status/progress lost');
  r.destroy();
  const solo = race({ live: true, racers: racers(1) }); solo.start(); solo.correct('r0');
  assert(solo.standings().length === 1, 'Last remaining racer missing');
});

test('CPU seeded answer sequence and timing repeat; all tuning ranges hold', ({ clock, cpu }) => {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    function sample() {
      const events = []; let last = performance.now(); let bot;
      bot = cpu({ racerId: 'cpu', difficulty, seed: 42, onAnswer: (id, correct) => {
        events.push([Math.round(performance.now() - last), correct]); last = performance.now();
        if (events.length === 2000) bot.stop();
      } });
      bot.start(); bot.start();
      assert(clock.tasks.size === 1, 'Duplicate CPU timers');
      clock.advance(60000000);
      return events;
    }
    const a = sample(); const b = sample();
    equal(a, b, difficulty + ' not reproducible');
    const settings = CPU_DIFFICULTIES[difficulty];
    assert(a.length === 2000, 'Wrong answer count');
    assert(a.every(e => e[0] >= settings.minSeconds * 1000 && e[0] <= settings.maxSeconds * 1000), 'Time out of range');
    const accuracy = a.filter(e => e[1]).length / a.length;
    assert(Math.abs(accuracy - settings.accuracy) < 0.04, 'Accuracy out of tolerance');
    assert(clock.tasks.size === 0, 'Callback stop left a timer');
  }
});

test('CPU visibility and stop/start retain question time without catch-up', ({ clock, cpu }) => {
  let answers = 0;
  const bot = cpu({ racerId: 'r', difficulty: 'Easy', seed: 'pause', onAnswer: () => answers++ });
  bot.start(); clock.advance(5000);
  clock.visibility(true); clock.advance(100000);
  assert(answers === 0 && clock.tasks.size === 0, 'Hidden CPU answered');
  clock.visibility(false); clock.advance(14000);
  assert(answers === 0, 'Hidden time consumed wait');
  clock.advance(12000); assert(answers === 1, 'CPU failed to resume');
  bot.stop(); bot.stop(); clock.advance(100000);
  assert(answers === 1 && clock.tasks.size === 0, 'Stop failed');
  bot.start(); clock.advance(30000); assert(answers >= 2, 'Restart failed');
});

test('Countdown aligns fractional epochs and fires 3, 2, 1, GO exactly once', ({ clock, cleanups }) => {
  const ticks = []; let go = 0;
  const c = countdownTo(Date.now() + 3500, { onTick: n => ticks.push(n), onGo: () => go++ });
  cleanups.push(c.cancel);
  clock.advance(3499); equal(ticks, [4, 3, 2, 1], 'Misaligned ticks');
  assert(go === 0, 'Early GO');
  clock.advance(1); equal(ticks, [4, 3, 2, 1, 0], 'Missing zero');
  clock.visibility(true); clock.visibility(false); clock.advance(10000);
  assert(go === 1 && clock.tasks.size === 0, 'GO repeated or leaked');
});

test('Countdown cancellation, elapsed deadlines and late task catch-up', ({ clock, cleanups }) => {
  let go = 0;
  const c = countdownFor(5, { onGo: () => go++ }); cleanups.push(c.cancel);
  c.cancel(); c.cancel(); clock.advance(10000); assert(go === 0, 'Cancelled countdown fired');
  countdownTo(Date.now() - 1, { onGo: () => go++ }); assert(go === 1, 'Past epoch did not fire');
  const ticks = [];
  const late = countdownFor(5, { onTick: n => ticks.push(n), onGo: () => go++ }); cleanups.push(late.cancel);
  clock.jump(7000); clock.flush();
  equal(ticks, [5, 0], 'Late task replayed old ticks');
  assert(go === 2 && clock.tasks.size === 0, 'Late GO not exactly once');
});

test('Countdown callback can cancel without scheduling another tick', ({ clock, cleanups }) => {
  let c; let go = 0;
  c = countdownFor(3, { onTick: n => { if (n === 2) c.cancel(); }, onGo: () => go++ });
  cleanups.push(c.cancel); clock.advance(10000);
  assert(go === 0 && clock.tasks.size === 0, 'Cancel during tick failed');
});

output.textContent = report.join('\n') + '\n\n' + (report.length - failures) + '/' + report.length + ' checks passed.';
document.title = failures ? 'FAIL — Mole Rush checks' : 'PASS — Mole Rush checks';
