/*
  Mole Rush — tiny DOM helpers. Everything is built with DOM APIs and textContent
  (never innerHTML), so question data can never inject markup.
*/

/* el('p', { class: 'x', text: 'Hi', 'aria-label': '...' }, child, 'text') */
export function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const key of Object.keys(attrs)) {
      const value = attrs[key];
      if (value === undefined || value === null || value === false) continue;
      if (key === 'text') node.textContent = String(value);
      else if (key === 'class') node.className = value;
      else node.setAttribute(key, value === true ? '' : String(value));
    }
  }
  for (const child of children) append(node, child);
  return node;
}

export function append(node, child) {
  if (child === undefined || child === null || child === false) return node;
  if (Array.isArray(child)) child.forEach((c) => append(node, c));
  else if (typeof child === 'string' || typeof child === 'number') node.appendChild(document.createTextNode(String(child)));
  else node.appendChild(child);
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/* Is the user asking for less motion? (Read each time: it can change mid-game.) */
export function reducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (err) {
    return false;
  }
}

/* Polite screen-reader announcement through one shared live region. */
let announcer = null;
let announceTimer = 0;
export function announce(text) {
  if (!announcer) announcer = document.getElementById('mr-announce');
  if (!announcer) return;
  announcer.textContent = '';
  window.clearTimeout(announceTimer);
  announceTimer = window.setTimeout(() => {
    announcer.textContent = text;
  }, 60);
}
