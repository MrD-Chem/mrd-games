/*
  Balance Quest — tiny DOM helpers. Everything is built with DOM APIs (never
  innerHTML), so equation data can't inject markup.
*/

import { formulaParts } from './chem.js?v=20261021T1624';

/* el('p', { class: 'x', text: 'Hi', 'aria-label': '...' }, child, 'text') */
export function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const key of Object.keys(attrs)) {
      const value = attrs[key];
      if (value === undefined || value === null || value === false) continue;
      if (key === 'text') node.textContent = value;
      else if (key === 'class') node.className = value;
      else node.setAttribute(key, value === true ? '' : String(value));
    }
  }
  for (const child of children) append(node, child);
  return node;
}

function append(node, child) {
  if (child === undefined || child === null || child === false) return;
  if (Array.isArray(child)) child.forEach((c) => append(node, c));
  else if (typeof child === 'string' || typeof child === 'number') node.appendChild(document.createTextNode(String(child)));
  else node.appendChild(child);
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/* A formula with real subscripts: H2O -> H<sub>2</sub>O */
export function formulaNode(formula, className = 'bq-formula') {
  const span = el('span', { class: className });
  for (const part of formulaParts(formula)) {
    if (part.sub) span.appendChild(el('sub', { text: part.text }));
    else span.appendChild(document.createTextNode(part.text));
  }
  return span;
}

/*
  Fill a node with mixed text: rich(node, ['Look at ', {f:'SO4'}, ' now.', {b:'bold'}])
*/
export function rich(node, parts) {
  clear(node);
  for (const p of parts) {
    if (typeof p === 'string') node.appendChild(document.createTextNode(p));
    else if (p && p.f) node.appendChild(formulaNode(p.f));
    else if (p && p.b) node.appendChild(el('strong', { text: p.b }));
  }
  return node;
}

export function starText(n) {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
}
