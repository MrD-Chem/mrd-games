/*
  Balance Quest — Simple mode (no 3D): the gates of a world as a plain list.
  Gates open in order, just like on the walkway.
*/

import { el, clear, formulaNode, starText } from './dom.js?v=20261014T1252';
import { yieldsArrow } from './arrow.js?v=20261014T1252';

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function skeleton(eq) {
  const span = el('span', { class: 'bq-gate2d-eq' });
  const species = eq.reactants.concat(eq.products);
  species.forEach((f, j) => {
    if (j === eq.reactants.length) span.append(' ', yieldsArrow('bq-yields--inline'), ' ');
    else if (j > 0) span.append(' + ');
    span.appendChild(formulaNode(f));
  });
  return span;
}

export class Board2D {
  constructor({ list, heading, onOpen }) {
    this.list = list;
    this.heading = heading;
    this.onOpen = onOpen;
    this.world = null;
  }

  render(world) {
    this.world = world;
    this.heading.textContent = world.info.n ? `World ${world.info.n}: ${world.info.name}` : world.info.name;
    this.refresh();
  }

  /* First gate that isn't solved yet (the only one you can work on). */
  nextIndex() {
    return this.world ? this.world.gates.findIndex((g) => !g.solved) : -1;
  }

  refresh(focusIndex) {
    const world = this.world;
    if (!world) return;
    clear(this.list);
    const next = this.nextIndex();
    world.gates.forEach((g, i) => {
      const locked = !g.solved && i !== next;
      const status = g.solved ? 'is-solved' : locked ? 'is-locked' : 'is-next';
      const title = `${g.boss ? 'Boss gate' : `Gate ${i + 1}`}${g.eq.name ? ': ' + g.eq.name : ''}`;
      const meta = [];
      if (g.eq.type) meta.push(capitalize(g.eq.type));
      if (g.solved) meta.push(`${g.stars} star${g.stars === 1 ? '' : 's'}`);
      else if (locked) meta.push('Locked: solve the gate before it first');
      const btn = el('button', {
        type: 'button',
        class: 'btn ' + (g.solved || locked ? 'btn-ghost' : 'btn-primary'),
        'data-gate': String(i),
        text: g.solved ? 'Look again' : locked ? 'Locked' : 'Solve',
        'aria-label': g.solved ? `Look again at ${title}` : locked ? `${title} is locked` : `Solve ${title}`
      });
      btn.disabled = locked;
      btn.addEventListener('click', () => this.onOpen(i, btn));
      const li = el('li', { class: `bq-gate2d ${status}${g.boss ? ' is-boss' : ''}` },
        el('div', { class: 'bq-gate2d-badge', 'aria-hidden': 'true', text: g.solved ? starText(g.stars) : g.boss ? '♛' : String(i + 1) }),
        el('div', { class: 'bq-gate2d-text' },
          el('h3', { class: 'bq-gate2d-title', text: title }),
          skeleton(g.eq),
          el('p', { class: 'bq-gate2d-meta', text: meta.join(' · ') })),
        btn);
      this.list.appendChild(li);
    });
    if (focusIndex !== undefined) {
      const target = this.list.querySelector(`button[data-gate="${focusIndex}"]:not([disabled])`) || this.list.querySelector('button:not([disabled])');
      if (target) target.focus();
    }
  }
}
