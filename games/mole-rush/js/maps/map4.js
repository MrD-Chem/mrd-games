/* Mole Rush — Map 4: final answer only, with hints for recognizable mistakes. */

import { NumberBoard, within } from './map2.js?v=20261022T1625';
import { reactionFor, reactionFormulas, molarMass, stepKind } from '../bank.js?v=20261022T1625';
import { formulaText } from '../chem.js?v=20261022T1625';

export const kind = 'setup';

export function render(container, item, opts) {
  const options = opts || {};
  return new NumberBoard(container, item, options, {
    id: 4, name: 'Word problem', word: true,
    answerHint: (value) => mistakeHint(value, item.problem, options.bank)
  });
}

/* Compare with one-mistake calculations, using unrounded math. If several match,
   choose the closest, and phrase it as a suggestion rather than a diagnosis. */
export function mistakeHint(value, problem, bank) {
  const candidates = [];
  const exact = problem.steps.reduce((n, s) => n * s.num.value / s.den.value, problem.given.value);
  const add = (n, hint) => {
    if (Number.isFinite(n) && n > 0 && Math.abs(n - exact) > exact * problem.answer.tolerancePct / 100) candidates.push({ n, hint });
  };
  for (const s of problem.steps) {
    const ratio = s.num.value / s.den.value;
    if (stepKind(s.num, s.den) === 'mole-ratio') {
      const hint = 'Check the mole ratio from the balanced equation.';
      add(exact / ratio, hint); // left out the ratio
      add(exact / (ratio * ratio), hint); // flipped the ratio
      add(exact / s.num.value, hint); // left out one coefficient
      add(exact * s.den.value, hint);
    } else {
      const toMoles = s.den.unit === 'g';
      const hint = toMoles ? 'Did you convert grams to moles first?'
        : 'Your result may still be in moles. Convert moles to grams using the molar mass.';
      add(exact / ratio, hint);
      add(exact / (ratio * ratio), hint);
      const q = toMoles ? s.den : s.num;
      for (const formula of reactionFormulas(reactionFor(bank, problem))) {
        if (formula === q.formula) continue;
        const wrongMass = molarMass(bank, formula);
        add(exact * (toMoles ? q.value / wrongMass : wrongMass / q.value),
          `Check the molar mass you used for ${formulaText(q.formula)}. Use its row in the molar-mass box.`);
      }
    }
  }
  const match = candidates.filter((c) => within(value, c.n, c.n * problem.answer.tolerancePct / 100))
    .sort((a, b) => Math.abs(value / a.n - 1) - Math.abs(value / b.n - 1))[0];
  return match ? match.hint : 'Start with the given amount. Use the mole ratio, and check that the final units match the question.';
}
