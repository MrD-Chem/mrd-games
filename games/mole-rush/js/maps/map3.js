/* Mole Rush — Map 3: two or three blanks, stable for the same item id. */

import { NumberBoard } from './map2.js?v=20261021T1624';
import { makeTiles } from './map1.js?v=20261021T1624';
import { hashString, mulberry32, seededShuffle } from '../rng.js?v=20261021T1624';

export const kind = 'setup';

export function render(container, item, opts) {
  const options = opts || {};
  const seed = hashString(`map3:blanks:v1:${item.id || item.problem.id}`);
  const rng = mulberry32(seed);
  const cells = [];
  item.problem.steps.forEach((step, i) => {
    for (const pos of ['num', 'den']) cells.push({ key: `${i}:${pos}`, q: step[pos] });
  });
  const shuffled = seededShuffle(cells, rng);
  // Always mix a label and a number, in different cells. Half also hide the answer.
  const blanks = new Set([`${shuffled[0].key}:label`, `${shuffled[1].key}:number`]);
  if (rng() < 0.5) blanks.add('answer');
  const needed = shuffled[0].q;
  const distractors = makeTiles(options.bank, item.problem, seed)
    .filter((q) => q.unit !== needed.unit || q.formula !== needed.formula).slice(0, 3);
  const tiles = seededShuffle([needed, ...distractors], rng);
  return new NumberBoard(container, item, options, { id: 3, name: 'Blanks', blanks, tiles });
}
