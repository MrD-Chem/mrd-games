/** Demo controller: creates disposable races, seeded CPUs and a five-second GO.
 * The track owns its accessible summary. This file owns controls and results.
 */
import { createRace } from '../js/race/track.js?v=20261022T1625';
import { createCpu } from '../js/race/cpu.js?v=20261022T1625';
import { countdownFor } from '../js/race/countdown.js?v=20261022T1625';

const canvas = document.querySelector('#track');
const mode = document.querySelector('#mode');
const steps = document.querySelector('#steps');
const settings = document.querySelector('#settings');
const start = document.querySelector('#start');
const correct = document.querySelector('#correct');
const wrong = document.querySelector('#wrong');
const phase = document.querySelector('#phase');
const clock = document.querySelector('#countdown');
const feedback = document.querySelector('#feedback');
const results = document.querySelector('#results');
const cpuSelects = [1, 2, 3].map(i => document.querySelector('#cpu-' + i));
let race;
let cpus = [];
let countdown;
let racing = false;

function lockAnswers(locked) { correct.disabled = locked; wrong.disabled = locked; }

function dispose() {
  countdown?.cancel();
  countdown = null;
  for (const cpu of cpus) cpu.stop();
  cpus = [];
  race?.destroy();
  racing = false;
}

function finish(order) {
  racing = false;
  for (const cpu of cpus) cpu.stop();
  lockAnswers(true);
  settings.disabled = false;
  start.textContent = 'Race again · 5 second countdown';
  phase.textContent = 'RACE COMPLETE';
  clock.textContent = 'Finished';
  feedback.textContent = (mode.value === 'teams' ? 'Team ' + order[0].team : order[0].name) + ' wins!';
  results.replaceChildren();
  for (const entry of order) {
    const item = document.createElement('li');
    item.textContent = mode.value === 'teams'
      ? 'Team ' + entry.team + ' — ' + entry.steps + '/' + entry.totalSteps + ' steps (' + entry.members.map(r => r.name).join(' + ') + ')'
      : entry.name + ' — ' + entry.steps + '/' + entry.totalSteps + ' steps';
    results.append(item);
  }
  results.hidden = false;
}

function setup() {
  dispose();
  settings.disabled = false;
  lockAnswers(true);
  results.hidden = true;
  results.replaceChildren();
  const teams = mode.value === 'teams';
  race = createRace({ canvas, totalSteps: Number(steps.value), mode: mode.value, onFinish: finish,
    racers: [
      { id: 'you', name: 'You', color: '#5eead4', isPlayer: true, team: teams ? 'A' : null },
      { id: 'pip', name: 'Pip', color: '#fcd34d', isPlayer: false, team: teams ? 'A' : null },
      { id: 'dot', name: 'Dot', color: '#c4b5fd', isPlayer: false, team: teams ? 'B' : null },
      { id: 'mo', name: 'Mo', color: '#fda4af', isPlayer: false, team: teams ? 'B' : null }
    ]
  });
  document.querySelector('#rules').textContent = teams
    ? 'Team A: You + Pip. Team B: Dot + Mo. First team to ' + Number(steps.value) * 2 + ' combined steps wins; each mole contributes up to ' + steps.value + '.'
    : 'First mole across wins. Keep racing to settle every place.';
  phase.textContent = 'READY AT THE START';
  clock.textContent = 'Ready';
  feedback.textContent = 'Choose your opponents, then start your engines.';
  start.textContent = 'Start race · 5 second countdown';
}

function answer(id, isCorrect) {
  if (!racing) return;
  if (isCorrect) race.correct(id);
  else race.wrong(id);
  const order = race.standings();
  const entries = mode.value === 'teams' ? order.flatMap(t => t.members) : order;
  const entry = entries.find(r => r.id === id);
  if (entry.finished) {
    if (id === 'you') {
      lockAnswers(true);
      if (racing) feedback.textContent = 'You reached the finish! Watching the other moles settle the race.';
    } else cpus[['pip', 'dot', 'mo'].indexOf(id)].stop();
  } else if (id === 'you' && racing) {
    feedback.textContent = isCorrect ? 'Correct! One step closer.' : 'A little stumble. Try again — no steps lost.';
  }
}

start.addEventListener('click', () => {
  setup();
  settings.disabled = true;
  phase.textContent = 'ON YOUR MARKS';
  start.textContent = 'Restart · 5 second countdown';
  cpus = ['pip', 'dot', 'mo'].map((racerId, i) => createCpu({
    racerId, difficulty: cpuSelects[i].value, seed: 'mole-cup-' + i, onAnswer: answer
  }));
  countdown = countdownFor(5, {
    onTick(seconds) { clock.textContent = seconds ? String(seconds) : 'GO!'; },
    onGo() {
      phase.textContent = 'RACE IN PROGRESS';
      feedback.textContent = 'Go! Answer correctly to move your mole.';
      racing = true;
      race.start();
      lockAnswers(false);
      for (const cpu of cpus) cpu.start();
    }
  });
});
settings.addEventListener('change', setup);
correct.addEventListener('click', () => answer('you', true));
wrong.addEventListener('click', () => answer('you', false));
window.addEventListener('pagehide', dispose);
window.addEventListener('pageshow', event => { if (event.persisted) setup(); });
setup();
