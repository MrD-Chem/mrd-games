/*
  Balance Quest — the "yields" arrow between reactants and products.
  A bold inline-SVG arrow with the word "yields" under it. The arrow drawing is
  hidden from screen readers; the visible word "yields" is what they read.
  Styles: .bq-yields in style.css.
*/

const SVG_NS = 'http://www.w3.org/2000/svg';

/* yieldsArrow('bq-eq-yields') -> <span class="bq-yields bq-eq-yields">[svg arrow]<span>yields</span></span> */
export function yieldsArrow(extraClass) {
  const wrap = document.createElement('span');
  wrap.className = 'bq-yields' + (extraClass ? ' ' + extraClass : '');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'bq-yields-arrow');
  svg.setAttribute('viewBox', '0 0 64 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M2 8.5h40V1.5L62 12 42 22.5v-7H2z');
  svg.appendChild(path);
  const word = document.createElement('span');
  word.className = 'bq-yields-word';
  word.textContent = 'yields';
  wrap.append(svg, word);
  return wrap;
}
