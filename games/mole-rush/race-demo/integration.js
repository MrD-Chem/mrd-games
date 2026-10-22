/* No Firebase/network dependency: room snapshots are fixtures, CPU rounds run
   through the real main.js hook and real map renderers under a fake clock. */
import { createStandings } from '../js/online/standings.js?v=20261022T1625';
import { fakeClock } from './fake-clock.js?v=20261022T1625';

const output = document.getElementById('test-results');
const host = document.getElementById('adapter-host');
const frame = document.getElementById('game');
const report = [];
let failures = 0;
function assert(ok, message) { if (!ok) throw new Error(message); }
function equal(a, b, message) { assert(JSON.stringify(a) === JSON.stringify(b), message + ': ' + JSON.stringify(a)); }
function test(name, fn) {
  try { fn(); report.push('PASS ' + name); }
  catch (e) { failures++; report.push('FAIL ' + name + ': ' + e.message); }
}
function entries(n = 4) {
  return Array.from({ length: n }, (_, i) => ({ slot: 's' + i, uid: 'u' + i,
    name: i ? ['Pip', 'Dot', 'Mo'][i - 1] : '<You & me>', isMe: !i,
    steps: 0, place: 1, team: i < 2 ? 'A' : 'B', finished: false, connected: true }));
}
function adapterTest(name, fn) {
  test(name, () => {
    const clock = fakeClock();
    const panel = createStandings(host, { questionCount: 10 });
    try { fn(panel, clock); }
    finally {
      panel.destroy();
      const clean = !host.childNodes.length && clock.frames.size === 0;
      clock.restore();
      assert(clean, 'Adapter leaked DOM/frames');
    }
  });
}
adapterTest('Snapshots: delta steps, duplicate delivery, server places and safe nicknames', panel => {
  const e = entries();
  panel.update({ mode: 'solo', entries: e });
  e[1].steps = 3; e[1].place = 1; e[0].steps = 2; e[0].place = 2;
  panel.update({ mode: 'solo', entries: e });
  panel.update({ mode: 'solo', entries: e });
  equal(panel.standings().find(r => r.id === 's1').steps, 3, 'Duplicate counted');
  const me = panel.standings().find(r => r.isPlayer);
  assert(me.name === '<You & me>' && me.steps === 2 && me.place === 2, 'Nickname/player mapping');
  assert(!host.querySelector('you') && host.textContent.includes('<You & me>'), 'Unsafe/missing summary');
  e[0].finished = true; e[0].place = 1; e[1].place = 2;
  panel.update({ mode: 'solo', entries: e });
  assert(panel.standings()[0].id === 's0' && panel.standings()[0].finished, 'Server finish order ignored');
});
adapterTest('Leaving, last racer, empty roster, rollback and round length changes', panel => {
  const e = entries(2); e[0].steps = 6;
  panel.update({ mode: 'solo', entries: e });
  panel.update({ mode: 'solo', entries: e.slice(0, 1) });
  equal(panel.standings().map(r => r.steps), [6], 'Leaving lost progress');
  e[0].steps = 2;
  panel.update({ mode: 'solo', entries: e.slice(0, 1) }, { questionCount: 8 });
  assert(panel.standings()[0].steps === 2 && panel.standings()[0].totalSteps === 8, 'Round not reset');
  panel.update({ mode: 'solo', entries: [] });
  equal(panel.standings(), [], 'Empty roster retained racers');
});
adapterTest('Teams: combined steps, uneven roster and updates after first team finish', panel => {
  const e = entries(); e[0].steps = 10; e[1].steps = 10; e[2].steps = 4;
  const teams = [{ team: 'A', place: 1, done: true }, { team: 'B', place: 2, done: false }];
  panel.update({ mode: 'teams', entries: e, teams });
  e[2].steps = 6;
  panel.update({ mode: 'teams', entries: e, teams });
  equal(panel.standings().map(t => t.steps), [20, 6], 'Team winner froze live race');
  panel.update({ mode: 'teams', entries: e.slice(1), teams });
  equal(panel.standings().map(t => [t.steps, t.totalSteps]), [[10, 10], [6, 20]], 'Uneven team roster');
});

async function runGameChecks() {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Game iframe did not load; serve this page over HTTP.')), 15000);
    frame.addEventListener('load', () => { clearTimeout(timeout); resolve(); }, { once: true });
    frame.src = '../index.html?mrtest=1';
  });
  const win = frame.contentWindow;
  const game = win.__MR_TEST__;
  assert(game, 'Missing game hooks');
  assert((await game.ready).ok, 'Question bank failed');
  const cpu = game.computer();
  function roundTest(name, fn) {
    test(name, () => {
      const clock = fakeClock(win);
      try { fn(clock); }
      finally {
        cpu.leave(); clock.advance(1000);
        const clean = !cpu.current().active && !win.document.querySelector('.race-summary') && clock.tasks.size === 0 && clock.frames.size === 0;
        clock.restore();
        assert(clean, 'Race leaked timers, frames or summary');
      }
    });
  }
  function start(clock, map = 1, mode = 'solo', difficulty = 'easy') {
    assert(cpu.start({ map, mode, difficulty }, 'MOLE-38').ok, 'Start failed');
    assert(game.screen() === 'cpu-countdown', 'Missing countdown screen');
    clock.advance(2999);
    assert(game.screen() === 'cpu-countdown' && !cpu.current().active, 'Race started early');
    clock.advance(1);
    assert(game.screen() === 'play' && cpu.current().active, 'GO did not start session');
    equal(game.current().total, map === 4 ? 8 : 10, 'Wrong map length');
    equal(cpu.current().totalSteps, game.current().total, 'Track/session length mismatch');
  }
  function solve() {
    game.solveCurrent();
    // Maps 2–4 intentionally fill without submitting in their solve helper.
    if (!game.current().nextVisible) win.document.querySelector('#mr-stage [data-action="check"]').click();
    assert(game.current().nextVisible, 'Correct answer did not advance session');
  }
  for (const map of [1, 2, 3, 4]) {
    roundTest('Map ' + map + ': countdown, wrong/correct, solo finish, stopped CPUs', clock => {
      start(clock, map);
      game.answerWrong();
      assert(cpu.current().standings.find(r => r.isPlayer).steps === 0, 'Wrong answer advanced');
      const n = game.current().total;
      for (let i = 0; i < n; i++) { solve(); game.next(); }
      assert(game.screen() === 'cpu-wait', 'Player finish should wait for CPU places');
      clock.advance(1200000);
      const result = cpu.current();
      assert(game.screen() === 'cpu-results' && result.standings.length === 4, 'No solo results');
      equal(result.standings.map(r => r.place), [1, 2, 3, 4], 'Missing places');
      assert(result.standings[0].isPlayer && !result.active, 'Wrong winner/track retained');
      assert(clock.tasks.size === 0 && clock.frames.size === 0, 'Finish leaked timers');
    });
  }
  roundTest('Teams finish on first team; CPU winners interrupt an unfinished session', clock => {
    start(clock, 4, 'teams', 'hard');
    clock.advance(1200000);
    const result = cpu.current();
    assert(result.phase === 'results' && result.standings[0].team === 'B', 'Wrong team winner');
    assert(result.standings[0].steps === 16 && !result.active && game.screen() === 'cpu-results', 'Bad teams finish');
    assert(clock.tasks.size === 0 && clock.frames.size === 0, 'Winning team left CPUs running');
  });
  roundTest('Teams: you and Pip can win together', clock => {
    start(clock, 2, 'teams', 'medium');
    for (let i = 0; i < 10; i++) { solve(); game.next(); }
    clock.advance(1200000);
    const result = cpu.current();
    assert(result.phase === 'results' && result.standings[0].finished && result.standings[0].team === 'A', 'You + Pip did not win');
    assert(result.standings[0].steps === 20, 'Wrong team target');
  });
  roundTest('Show me earns no step and solo round still terminates', clock => {
    start(clock, 4);
    game.answerWrong(); game.answerWrong(); game.showMe(); game.next();
    for (let i = 1; i < 8; i++) { solve(); game.next(); }
    clock.advance(1200000);
    const result = cpu.current();
    assert(result.phase === 'results', 'Revealed question stranded race');
    const me = result.standings.find(r => r.isPlayer);
    assert(me.steps === 7 && !me.finished && me.place === 4, 'Reveal credited a step/place');
  });
  roundTest('Replay repeats CPU progress; leaving/countdown restart/pagehide cancel work', clock => {
    start(clock, 3, 'solo', 'medium'); clock.advance(60000);
    const first = cpu.current().standings;
    cpu.leave(); start(clock, 3, 'solo', 'medium'); clock.advance(60000);
    equal(cpu.current().standings, first, 'CPU replay changed');
    win.document.getElementById('mr-quit').click();
    assert(game.screen() === 'cpu-settings' && !cpu.current().active, 'Leave failed');
    cpu.start({ map: 1, mode: 'solo', difficulty: 'easy' }, 'MOLE-38');
    cpu.start({ map: 4, mode: 'teams', difficulty: 'hard' }, 'MOLE-38');
    cpu.leave(); clock.advance(10000);
    assert(game.screen() === 'title' && !cpu.current().active, 'Cancelled countdown restarted');
    start(clock); win.dispatchEvent(new win.Event('pagehide')); clock.advance(1000);
    assert(!cpu.current().active && !clock.tasks.size && !clock.frames.size, 'Pagehide leaked');
  });
  roundTest('Practice and race-code map sessions still finish normally', clock => {
    for (const map of [1, 2, 3, 4]) {
      assert(game.startMap(map, 'ATOM-52').ok, 'Practice/code start failed');
      const n = game.current().total;
      for (let i = 0; i < n; i++) { solve(); game.next(); }
      assert(game.screen() === 'results' && game.summary().total === n, 'Normal results failed');
    }
    clock.advance(1000);
  });
}
try { await runGameChecks(); }
catch (e) { failures++; report.push('FAIL Game checks: ' + e.message); }
const passed = report.length - failures;
output.textContent = report.join('\n') + '\n\n' + (failures ? 'FAIL ' : 'PASS ') + passed + '/' + report.length;
document.title = (failures ? 'FAIL ' : 'PASS ') + passed + '/' + report.length + ' — Mole Rush integration';
