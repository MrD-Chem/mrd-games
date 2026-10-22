/*
  Mole Rush — pieces shared by every stoichiometry map (Maps 1–4):
  the problem card (text, balanced equation, molar masses), the dimensional-analysis
  "train track", the cancelling-units animation and the worked solution.
  Each map decides what goes in the track's cells (tiles, number boxes, blanks...).
*/

import { el, reducedMotion } from '../dom.js?v=20261022T1625';
import { equationNode, equationText, labelNode, molarMassBox, reactionFor, typeLabel, stepKind } from '../bank.js?v=20261022T1625';
import { formatCalc, formatSig, formatStepValue, formulaText } from '../chem.js?v=20261022T1625';

/* Problem card. Returns { root, title } — focus `title` when the question appears. */
export function problemHeader(bank, problem, { kicker, position }) {
  const reaction = reactionFor(bank, problem);
  const title = el('h2', { class: 'mr-q-text', id: 'mr-q-text', tabindex: '-1', text: problem.text });
  const chips = el('p', { class: 'mr-q-chips' },
    position ? el('span', { class: 'mr-chip mr-chip-pos', text: position }) : null,
    el('span', { class: 'mr-chip', text: kicker }),
    el('span', { class: 'mr-chip mr-chip-type' }, el('span', { class: 'sr-only', text: 'Type: ' }), typeLabel(problem.type)));
  const eq = el('div', { class: 'mr-eq-box' },
    el('p', { class: 'mr-eq-label', text: 'Balanced equation' }),
    equationNode(reaction),
    el('p', { class: 'sr-only', text: equationText(reaction) }));
  eq.querySelector('.mr-equation').setAttribute('aria-hidden', 'true');
  const main = el('div', { class: 'mr-q-main' }, chips, title, eq);
  return { root: el('div', { class: 'mr-q' }, main, molarMassBox(bank, reaction)), title };
}

function op(symbol, spoken) {
  return el('span', { class: 'mr-op' }, el('span', { 'aria-hidden': 'true', text: symbol }), el('span', { class: 'sr-only', text: spoken }));
}

/*
  The train track:  [given]  ×  [top/bottom]  ×  [top/bottom]  =  [answer unit]
  makeCell(stepIndex, 'num' | 'den', expectedQuantity) -> { node, getLabel() }
    getLabel() returns the label element that should be struck through when units cancel.
  Returns refs used by the animation and the worked solution.
*/
export function buildTrack(problem, makeCell) {
  const root = el('div', { class: 'mr-track', role: 'group', 'aria-label': 'Your setup' });
  const givenLabel = labelNode(problem.given);
  const given = el('div', { class: 'mr-term mr-given' },
    el('span', { class: 'mr-num', text: problem.givenText }),
    givenLabel);
  root.appendChild(el('div', { class: 'mr-seg mr-seg-given' }, el('span', { class: 'sr-only', text: 'Start with ' }), given));
  const fracs = problem.steps.map((step, i) => {
    const top = makeCell(i, 'num', step.num);
    const bot = makeCell(i, 'den', step.den);
    const frac = el('div', { class: 'mr-frac', role: 'group', 'aria-label': `Fraction ${i + 1}` },
      el('span', { class: 'mr-frac-badge', 'aria-hidden': 'true', text: String(i + 1) }),
      el('div', { class: 'mr-cell mr-cell-num' }, top.node),
      el('div', { class: 'mr-frac-bar', 'aria-hidden': 'true' }),
      el('div', { class: 'mr-cell mr-cell-den' }, bot.node));
    root.appendChild(el('div', { class: 'mr-seg' }, op('×', 'times'), frac));
    return { frac, top, bot };
  });
  const answerNum = el('span', { class: 'mr-num mr-answer-num', text: '?' });
  const answerLabel = labelNode(problem.find);
  const answer = el('div', { class: 'mr-term mr-answer' }, answerNum, answerLabel);
  root.appendChild(el('div', { class: 'mr-seg mr-seg-answer' }, op('=', 'equals'), answer));
  return { root, givenLabel, fracs, answerNum, answerLabel, answer };
}

/*
  Strike through each pair of cancelling units, one pair after another, then call
  onDone. Returns a function that stops the timers (used by destroy()).
  Pairs: given ↔ bottom of fraction 1, top of fraction 1 ↔ bottom of fraction 2, ...
*/
export function playCancel(track, onDone) {
  const pairs = [];
  track.fracs.forEach((f, i) => {
    const before = i === 0 ? track.givenLabel : track.fracs[i - 1].top.getLabel();
    pairs.push([before, f.bot.getLabel()]);
  });
  const survivor = track.fracs[track.fracs.length - 1].top.getLabel();
  const quick = reducedMotion();
  const STEP = quick ? 0 : 420;
  const timers = [];
  track.root.classList.add('is-cancelling');
  pairs.forEach((pair, i) => {
    timers.push(window.setTimeout(() => {
      pair.forEach((label) => label && label.classList.add('is-cancel'));
    }, i * STEP));
  });
  timers.push(window.setTimeout(() => {
    if (survivor) survivor.classList.add('is-survivor');
    track.answerLabel.classList.add('is-survivor');
    track.root.classList.remove('is-cancelling');
    track.root.classList.add('is-cancelled');
    onDone();
  }, pairs.length * STEP + (quick ? 0 : 260)));
  return () => timers.forEach((t) => window.clearTimeout(t));
}

/* Put every number into the track (Map 1 hides them until the setup is right). */
export function revealNumbers(track, problem) {
  track.fracs.forEach((f, i) => {
    const s = problem.steps[i];
    f.top.setNumber(formatStepValue(s.num.value, s.num.unit));
    f.bot.setNumber(formatStepValue(s.den.value, s.den.unit));
  });
  track.answerNum.textContent = formatSig(problem.answer.value, problem.answer.sigFigs);
  track.answer.classList.add('is-done');
  track.root.classList.add('is-numbered');
}

/* What each fraction does, in words, for the worked solution. */
export function stepMeaning(step) {
  const kind = stepKind(step.num, step.den);
  if (kind === 'mole-ratio') return `mole ratio from the balanced equation (${formulaText(step.den.formula)} → ${formulaText(step.num.formula)})`;
  if (kind === 'to-moles') return `molar mass, flipped (grams → moles of ${formulaText(step.num.formula)})`;
  return `molar mass (moles → grams of ${formulaText(step.num.formula)})`;
}

/* The reward: the full calculation and the answer. */
export function workedSolution(problem) {
  const tops = [problem.givenText];
  const bottoms = [];
  for (const s of problem.steps) {
    const t = formatStepValue(s.num.value, s.num.unit);
    const b = formatStepValue(s.den.value, s.den.unit);
    if (t !== '1') tops.push(t);
    if (b !== '1') bottoms.push(b);
  }
  const top = tops.join(' × ');
  let math;
  if (!bottoms.length) math = top;
  else if (bottoms.length === 1) math = `${tops.length > 1 ? '(' + top + ')' : top} ÷ ${bottoms[0]}`;
  else math = `${tops.length > 1 ? '(' + top + ')' : top} ÷ (${bottoms.join(' × ')})`;
  const raw = formatCalc(problem.worked);
  const ans = formatSig(problem.answer.value, problem.answer.sigFigs);
  const unit = `${problem.answer.unit} ${formulaText(problem.answer.formula)}`;
  const steps = el('ol', { class: 'mr-worked-steps' });
  problem.steps.forEach((s, i) => {
    steps.appendChild(el('li', null, el('span', { class: 'mr-worked-n', text: `Fraction ${i + 1}: ` }), stepMeaning(s)));
  });
  return el('div', { class: 'mr-worked' },
    el('p', { class: 'mr-worked-title', text: 'How the numbers work' }),
    steps,
    el('p', { class: 'mr-worked-math' },
      el('span', { class: 'mr-worked-rule', text: 'Multiply the tops, divide by the bottoms: ' }),
      el('span', { class: 'mr-worked-calc', text: `${math} = ${raw}` })),
    el('p', { class: 'mr-worked-answer' },
      `Answer (${problem.answer.sigFigs} significant figure${problem.answer.sigFigs === 1 ? '' : 's'}): `,
      el('strong', { text: `${ans} ${unit}` })));
}
