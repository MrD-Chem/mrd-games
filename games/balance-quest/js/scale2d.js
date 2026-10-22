/*
  Balance Quest — the flat (SVG) balance scale used in Simple mode.
  The beam tilts toward the heavier side; each pan shows one dot per molecule.
*/

import { scaleTilt, parseFormula, prettyFormula } from './chem.js?v=20261022T1625';
import { atomColor } from './molecule.js?v=20261022T1625';

const NS = 'http://www.w3.org/2000/svg';
const CAP = 8;
const PIVOT_X = 160;
const PIVOT_Y = 34;
const HALF = 106;
const MAX_DEG = 15;

function svg(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const k of Object.keys(attrs || {})) node.setAttribute(k, String(attrs[k]));
  return node;
}

function speciesColor(formula) {
  const counts = parseFormula(formula);
  const els = Object.keys(counts);
  const main = els.find((e) => e !== 'H' && e !== 'O') || els.find((e) => e === 'O') || els[0];
  return '#' + atomColor(main).toString(16).padStart(6, '0');
}

export function createScaleSVG() {
  const root = svg('svg', { viewBox: '0 0 320 200', class: 'bq-svg-scale', 'aria-hidden': 'true', focusable: 'false' });
  root.appendChild(svg('rect', { x: 118, y: 186, width: 84, height: 9, rx: 4, class: 'bq-svg-base' }));
  root.appendChild(svg('rect', { x: 156, y: PIVOT_Y, width: 8, height: 154, rx: 3, class: 'bq-svg-post' }));

  const beam = svg('g', { class: 'bq-svg-beam' });
  beam.appendChild(svg('rect', { x: PIVOT_X - HALF - 6, y: PIVOT_Y - 4, width: HALF * 2 + 12, height: 8, rx: 4, class: 'bq-svg-bar' }));
  beam.appendChild(svg('line', { x1: PIVOT_X, y1: PIVOT_Y, x2: PIVOT_X, y2: PIVOT_Y + 34, class: 'bq-svg-needle' }));
  beam.appendChild(svg('circle', { cx: PIVOT_X, cy: PIVOT_Y, r: 8, class: 'bq-svg-pivot' }));
  root.appendChild(beam);

  const pans = [0, 1].map(() => {
    const g = svg('g', { class: 'bq-svg-pan' });
    g.appendChild(svg('line', { x1: 0, y1: 0, x2: -44, y2: 70, class: 'bq-svg-string' }));
    g.appendChild(svg('line', { x1: 0, y1: 0, x2: 44, y2: 70, class: 'bq-svg-string' }));
    g.appendChild(svg('path', { d: 'M -52 70 Q 0 102 52 70 Z', class: 'bq-svg-dish' }));
    const items = svg('g', {});
    g.appendChild(items);
    root.appendChild(g);
    return { g, items };
  });

  function place(deg) {
    const r = (deg * Math.PI) / 180;
    beam.style.transform = `rotate(${deg}deg)`;
    const ends = [
      [PIVOT_X - HALF * Math.cos(r), PIVOT_Y - HALF * Math.sin(r)],
      [PIVOT_X + HALF * Math.cos(r), PIVOT_Y + HALF * Math.sin(r)]
    ];
    pans.forEach((p, i) => {
      p.g.style.transform = `translate(${ends[i][0].toFixed(2)}px, ${ends[i][1].toFixed(2)}px)`;
    });
  }

  function update(eq, coefficients) {
    const t = scaleTilt(eq, coefficients);
    // Left heavier -> left end down (negative SVG rotation).
    place(-t.sign * t.amount * MAX_DEG);
    const nR = eq.reactants.length;
    const species = eq.reactants.concat(eq.products);
    pans.forEach((p, side) => {
      while (p.items.firstChild) p.items.removeChild(p.items.firstChild);
      const mine = species.map((f, j) => ({ f, j })).filter((s) => (s.j < nR ? 0 : 1) === side);
      // Rows stack upward from the dish, one row per formula.
      mine.forEach((s, row) => {
        const raw = coefficients[s.j];
        const c = Number.isInteger(raw) && raw > 0 ? raw : 0;
        const shown = Math.min(c, CAP);
        const y = 62 - row * 15;
        const color = speciesColor(s.f);
        const width = shown * 11;
        for (let k = 0; k < shown; k++) {
          p.items.appendChild(svg('circle', { cx: -width / 2 + 5.5 + k * 11, cy: y, r: 5, fill: color, class: 'bq-svg-dot' }));
        }
        if (c > CAP || c === 0) {
          const label = svg('text', { x: c === 0 ? 0 : width / 2 + 4, y: y + 4, class: 'bq-svg-label', 'text-anchor': c === 0 ? 'middle' : 'start' });
          label.textContent = c === 0 ? `? ${prettyFormula(s.f)}` : `×${c}`;
          p.items.appendChild(label);
        }
      });
    });
  }

  place(0);
  return { el: root, update };
}
