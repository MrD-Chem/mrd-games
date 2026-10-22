/*
  Mole Rush — Map 1 "Setup": one dimensional-analysis problem.

  The student fills every top/bottom box of the train track with a UNIT + CHEMICAL
  tile ("mol H₂", "g H₂O"). Numbers stay hidden until the setup is right; then the
  cancelling units are struck through and the full worked setup appears.

  Ways to place a tile (all lead to the same _placeAt()):
    tap/click a tile, then tap/click a box
    drag a tile (or a filled box) onto a box — pointer events, so mouse, pen and touch
    keyboard: Tab to a tile, Enter picks it up (focus jumps to the first empty box),
              Tab/arrow keys to a box, Enter places it; Backspace/Delete clears a box;
              Escape puts a picked-up tile back.

  Interface shared by every map:  render(container, item, { bank, onResult })
    -> { destroy(), focus(), check(), solve(), answerWrong(), state() }
  onResult({ correct, revealed, tries, final }) runs after every Check / "Show me".
*/

import { el, clear, announce } from '../dom.js?v=20261022T1604';
import { labelNode, labelText, reactionFor, reactionFormulas, stepKind, molarMass } from '../bank.js?v=20261022T1604';
import { formulaText } from '../chem.js?v=20261022T1604';
import { mulberry32, seededShuffle } from '../rng.js?v=20261022T1604';
import { problemHeader, buildTrack, playCancel, revealNumbers, workedSolution } from './setup-view.js?v=20261022T1604';

export const kind = 'setup';

export function render(container, item, opts) {
  return new SetupBoard(container, item, opts || {});
}

const DRAG_START_PX = 8;
const SHOW_ME_AFTER = 2;

function sameQ(a, b) {
  return !!a && !!b && a.unit === b.unit && a.formula === b.formula;
}

/*
  The tile tray: every tile the setup needs (once each: tiles can be used again)
  plus 2–3 plausible wrong ones — the same chemical with g and mol swapped, and
  other chemicals from the same reaction. Order comes from the item's seed, so
  everyone racing on the same code sees the same tray.
*/
export function makeTiles(bank, problem, seed) {
  const rng = mulberry32(seed);
  const correct = [];
  const add = (list, q) => {
    if (!list.some((x) => sameQ(x, q))) list.push({ unit: q.unit, formula: q.formula });
  };
  for (const s of problem.steps) {
    add(correct, s.num);
    add(correct, s.den);
  }
  const usedFormulas = new Set(correct.map((q) => q.formula));
  const swaps = [];
  for (const q of correct) {
    const flipped = { unit: q.unit === 'mol' ? 'g' : 'mol', formula: q.formula };
    if (!correct.some((x) => sameQ(x, flipped))) add(swaps, flipped);
  }
  const others = [];
  const reaction = reactionFor(bank, problem);
  for (const f of reaction ? reactionFormulas(reaction) : []) {
    if (usedFormulas.has(f)) continue;
    add(others, { unit: 'mol', formula: f });
    add(others, { unit: 'g', formula: f });
  }
  const want = correct.length >= 4 ? 2 : 3;
  const a = seededShuffle(swaps, rng);
  const b = seededShuffle(others, rng);
  const distractors = [];
  while (distractors.length < want && (a.length || b.length)) {
    const fromSwap = distractors.length % 2 === 0 ? a.length > 0 : b.length === 0;
    distractors.push(fromSwap ? a.shift() : b.shift());
  }
  return seededShuffle(correct.concat(distractors), rng);
}

class SetupBoard {
  constructor(container, item, opts) {
    this.container = container;
    this.item = item;
    this.problem = item.problem;
    this.bank = opts.bank;
    this.onResult = typeof opts.onResult === 'function' ? opts.onResult : () => {};
    this.slots = [];
    this.picked = null; // { q, source: 'tray' | slot index }
    this.drag = null;
    this.suppress = null; // { node, until }: ignore the click a finished drag leaves on its tile
    this.tries = 0;
    this.done = false;
    this.revealed = false;
    this.stopCancel = null;
    this.tiles = makeTiles(this.bank, this.problem, item.seed);

    this._onClick = (e) => this._click(e);
    this._onKey = (e) => this._key(e);
    this._onPointerDown = (e) => this._pointerDown(e);
    this._onPointerMove = (e) => this._pointerMove(e);
    this._onPointerUp = (e) => this._pointerUp(e);
    this._onPointerCancel = (e) => this._pointerCancel(e);
    this._build();
  }

  // ---------- Building ----------

  _build() {
    const p = this.problem;
    clear(this.container);
    const header = problemHeader(this.bank, p, { kicker: 'Map 1 · Setup' });
    this.title = header.title;
    this.track = buildTrack(p, (step, pos, expected) => this._makeSlot(step, pos, expected));

    this.tray = el('div', { class: 'mr-tray', role: 'group', 'aria-label': 'Tiles. Pick one, then choose a box.' });
    this.tileButtons = this.tiles.map((q, i) => {
      const b = el('button', { type: 'button', class: 'mr-tile', 'data-tile': String(i), 'aria-pressed': 'false', 'aria-label': labelText(q) }, labelNode(q));
      this.tray.appendChild(b);
      return b;
    });
    this.howto = el('p', { class: 'mr-howto' },
      el('span', { class: 'mr-howto-touch', text: 'Tap a tile, then tap a box (or drag it there). Units must cancel from left to right.' }),
      el('span', { class: 'mr-howto-keys', text: ' Keys: Enter picks up and places, Backspace clears.' }));

    this.checkBtn = el('button', { type: 'button', class: 'btn btn-primary mr-check', 'data-action': 'check', text: 'Check' });
    this.clearBtn = el('button', { type: 'button', class: 'btn btn-ghost mr-clear', 'data-action': 'clear', text: 'Clear all' });
    this.showBtn = el('button', { type: 'button', class: 'btn btn-ghost mr-show', 'data-action': 'show', text: 'Show me', hidden: true });
    this.actions = el('div', { class: 'mr-actions' }, this.checkBtn, this.clearBtn, this.showBtn);
    this.feedback = el('p', { class: 'mr-feedback', role: 'status' });
    this.hints = el('ul', { class: 'mr-hints', hidden: true });
    this.workedHost = el('div', { class: 'mr-worked-host', hidden: true });

    this.work = el('section', { class: 'mr-work panel', 'aria-label': 'Build the setup' },
      this.track.root, this.howto, this.tray, this.actions, this.feedback, this.hints, this.workedHost);
    this.root = el('div', { class: 'mr-board mr-board-setup' }, header.root, this.work);
    this.root.addEventListener('click', this._onClick);
    this.root.addEventListener('keydown', this._onKey);
    this.root.addEventListener('pointerdown', this._onPointerDown);
    this.container.appendChild(this.root);
  }

  _makeSlot(step, pos, expected) {
    const index = this.slots.length;
    const where = `fraction ${step + 1}, ${pos === 'num' ? 'top' : 'bottom'}`;
    const num = el('span', { class: 'mr-num mr-num-hidden', 'aria-hidden': 'true' });
    const btn = el('button', { type: 'button', class: 'mr-slot-btn', 'data-slot': String(index) });
    const x = el('button', { type: 'button', class: 'mr-slot-x', tabindex: '-1', 'data-clear': String(index), 'aria-label': `Clear ${where}`, hidden: true },
      el('span', { 'aria-hidden': 'true', text: '×' }));
    const markEl = el('span', { class: 'mr-mark', 'aria-hidden': 'true' });
    const node = el('div', { class: 'mr-slot', 'data-pos': pos }, num, el('div', { class: 'mr-slot-box' }, btn, x, markEl));
    const slot = { index, step, pos, where, expected, value: null, mark: null, wrongCount: 0, node, btn, x, markEl, num, label: null };
    this.slots.push(slot);
    this._renderSlot(slot);
    return {
      node,
      getLabel: () => slot.label,
      setNumber: (text) => {
        num.textContent = text;
        num.classList.remove('mr-num-hidden');
        num.classList.add('is-shown');
      }
    };
  }

  _renderSlot(slot) {
    clear(slot.btn);
    if (slot.value) {
      slot.label = labelNode(slot.value);
      slot.btn.appendChild(slot.label);
    } else {
      slot.label = null;
      slot.btn.appendChild(el('span', { class: 'mr-slot-ph', 'aria-hidden': 'true', text: '?' }));
    }
    const n = slot.node;
    n.classList.toggle('is-empty', !slot.value);
    n.classList.toggle('is-filled', !!slot.value);
    n.classList.toggle('is-ok', slot.mark === 'ok');
    n.classList.toggle('is-bad', slot.mark === 'bad');
    if (slot.value) n.classList.remove('is-missing');
    slot.x.hidden = !slot.value || this.done;
    slot.markEl.textContent = slot.mark === 'ok' ? '✓' : slot.mark === 'bad' ? '✗' : '';
    const state = slot.mark === 'ok' ? ', right' : slot.mark === 'bad' ? ', not right yet' : '';
    slot.btn.setAttribute('aria-label', `${slot.where[0].toUpperCase()}${slot.where.slice(1)}: ${slot.value ? labelText(slot.value) : 'empty'}${state}`);
  }

  _setSlot(index, q) {
    const slot = this.slots[index];
    if (!slot) return;
    slot.value = q ? { unit: q.unit, formula: q.formula } : null;
    slot.mark = null;
    this._renderSlot(slot);
  }

  _pop(slot) {
    slot.node.classList.remove('is-pop');
    void slot.node.offsetWidth; // restart the CSS animation
    slot.node.classList.add('is-pop');
  }

  _say(text, tone) {
    this.feedback.textContent = text;
    this.feedback.className = 'mr-feedback' + (tone ? ' is-' + tone : '');
  }

  // ---------- Picking and placing ----------

  _pick(q, source, fromKeyboard) {
    this.picked = { q, source };
    this.root.classList.add('is-picking');
    this.tileButtons.forEach((b, i) => {
      const on = source === 'tray' && sameQ(this.tiles[i], q);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('is-picked', on);
    });
    if (typeof source === 'number') {
      announce(`Picked up ${labelText(q)}. Choose a box, or press Escape to put it back.`);
    } else {
      announce(`Picked up ${labelText(q)}. Now choose a box.`);
    }
    if (fromKeyboard) {
      const target = this.slots.find((s) => !s.value) || this.slots[0];
      target.btn.focus();
    }
  }

  _unpick() {
    this.picked = null;
    this.root.classList.remove('is-picking');
    this.tileButtons.forEach((b) => {
      b.setAttribute('aria-pressed', 'false');
      b.classList.remove('is-picked');
    });
  }

  /* A tile picked up out of a box goes back there if it isn't placed. */
  _putBack() {
    const p = this.picked;
    if (p && typeof p.source === 'number' && !this.slots[p.source].value) this._setSlot(p.source, p.q);
    this._unpick();
  }

  _placeAt(index, q, fromKeyboard, source) {
    const slot = this.slots[index];
    this._unpick();
    this._setSlot(index, q);
    this._pop(slot);
    announce(`${labelText(q)} placed in ${slot.where}.`);
    if (this.feedback.classList.contains('is-warn')) this._say('', '');
    if (!fromKeyboard) return;
    if (!this.slots.some((s) => !s.value)) {
      this.checkBtn.focus();
    } else if (source === 'tray') {
      const t = this.tileButtons[this.tiles.findIndex((x) => sameQ(x, q))];
      if (t) t.focus();
    }
  }

  _clearSlot(index, fromKeyboard) {
    const slot = this.slots[index];
    if (!slot || !slot.value || this.done) return;
    this._setSlot(index, null);
    announce(`Cleared ${slot.where}.`);
    if (!fromKeyboard) slot.btn.focus({ preventScroll: true });
  }

  clearAll() {
    if (this.done) return;
    this._unpick();
    this.slots.forEach((s) => this._setSlot(s.index, null));
    this._say('', '');
    this.hints.hidden = true;
    announce('All boxes cleared.');
  }

  // ---------- Events ----------

  _click(e) {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const sup = this.suppress;
    if (sup) {
      this.suppress = null;
      if (performance.now() < sup.until && sup.node.contains(t)) {
        e.preventDefault();
        return;
      }
    }
    const fromKeyboard = e.detail === 0;
    const clearBtn = t.closest('[data-clear]');
    if (clearBtn) {
      this._clearSlot(Number(clearBtn.getAttribute('data-clear')), false);
      return;
    }
    const tile = t.closest('[data-tile]');
    if (tile) {
      this._tileClicked(Number(tile.getAttribute('data-tile')), fromKeyboard);
      return;
    }
    const slotBtn = t.closest('[data-slot]');
    if (slotBtn) {
      this._slotClicked(Number(slotBtn.getAttribute('data-slot')), fromKeyboard);
      return;
    }
    const action = t.closest('[data-action]');
    if (!action) return;
    const name = action.getAttribute('data-action');
    if (name === 'check') this.check();
    else if (name === 'clear') this.clearAll();
    else if (name === 'show') this.showMe();
  }

  _tileClicked(i, fromKeyboard) {
    if (this.done) return;
    const q = this.tiles[i];
    if (this.picked && this.picked.source === 'tray' && sameQ(this.picked.q, q)) {
      this._unpick();
      announce('Tile put back.');
      return;
    }
    if (this.picked) this._putBack();
    this._pick(q, 'tray', fromKeyboard);
  }

  _slotClicked(index, fromKeyboard) {
    if (this.done) return;
    const slot = this.slots[index];
    if (this.picked) {
      this._placeAt(index, this.picked.q, fromKeyboard, this.picked.source);
      return;
    }
    if (slot.value) {
      // Pick the tile up out of this box, to move it somewhere else.
      const q = slot.value;
      this._setSlot(index, null);
      this._pick(q, index, false);
      return;
    }
    this._say('Pick a tile first, then choose a box.', 'warn');
    if (fromKeyboard && this.tileButtons[0]) this.tileButtons[0].focus();
  }

  _key(e) {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (e.key === 'Escape' && (this.picked || this.drag)) {
      e.preventDefault();
      e.stopPropagation();
      this._cancelDrag(true);
      if (this.picked) {
        const { source, q } = this.picked;
        this._putBack();
        announce('Tile put back.');
        if (typeof source === 'number') {
          this.slots[source].btn.focus();
        } else {
          const tile = this.tileButtons[this.tiles.findIndex((x) => sameQ(x, q))];
          if (tile) tile.focus();
        }
      }
      return;
    }
    const slotBtn = t.closest('[data-slot]');
    if (slotBtn) {
      const i = Number(slotBtn.getAttribute('data-slot'));
      if ((e.key === 'Backspace' || e.key === 'Delete') && !this.done) {
        e.preventDefault();
        this._clearSlot(i, true);
        return;
      }
      const slot = this.slots[i];
      let j = -1;
      if (e.key === 'ArrowRight') j = i + 2;
      else if (e.key === 'ArrowLeft') j = i - 2;
      else if (e.key === 'ArrowDown' && slot.pos === 'num') j = i + 1;
      else if (e.key === 'ArrowUp' && slot.pos === 'den') j = i - 1;
      if (j >= 0 && j < this.slots.length) {
        e.preventDefault();
        this.slots[j].btn.focus();
      }
      return;
    }
    const tile = t.closest('[data-tile]');
    if (tile && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      const i = Number(tile.getAttribute('data-tile'));
      const n = this.tileButtons.length;
      this.tileButtons[(i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n].focus();
    }
  }

  // ---------- Drag and drop (pointer events: mouse, pen and touch) ----------

  _pointerDown(e) {
    if (this.done || this.drag || e.button !== 0 || !e.isPrimary) return;
    const t = e.target;
    if (!(t instanceof Element) || t.closest('[data-clear]')) return;
    const tile = t.closest('[data-tile]');
    const slotBtn = tile ? null : t.closest('[data-slot]');
    let q;
    let source;
    let node;
    if (tile) {
      q = this.tiles[Number(tile.getAttribute('data-tile'))];
      source = 'tray';
      node = tile;
    } else if (slotBtn) {
      const s = this.slots[Number(slotBtn.getAttribute('data-slot'))];
      if (!s.value) return;
      q = s.value;
      source = s.index;
      node = slotBtn;
    } else {
      return;
    }
    this.drag = { q, source, node, id: e.pointerId, x0: e.clientX, y0: e.clientY, started: false, ghost: null, over: null, touch: e.pointerType !== 'mouse' };
    try {
      node.setPointerCapture(e.pointerId);
    } catch (err) {
      // Capture is a nicety; dragging still works without it on most browsers.
    }
    node.addEventListener('pointermove', this._onPointerMove);
    node.addEventListener('pointerup', this._onPointerUp);
    node.addEventListener('pointercancel', this._onPointerCancel);
  }

  _slotAt(x, y) {
    const hit = document.elementFromPoint(x, y);
    const node = hit && hit.closest ? hit.closest('.mr-slot') : null;
    return node ? this.slots.find((s) => s.node === node) || null : null;
  }

  _pointerMove(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    if (!d.started) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < DRAG_START_PX) return;
      d.started = true;
      if (this.picked) this._putBack();
      if (typeof d.source === 'number') this._setSlot(d.source, null);
      d.ghost = el('div', { class: 'mr-ghost' + (d.touch ? ' is-touch' : ''), 'aria-hidden': 'true' },
        el('div', { class: 'mr-ghost-inner' }, labelNode(d.q)));
      document.body.appendChild(d.ghost);
      this.root.classList.add('is-picking', 'is-dragging');
      d.node.classList.add('is-drag-source');
    }
    e.preventDefault();
    // CSSOM transform (allowed by the page's CSP; no style attribute is written).
    d.ghost.style.transform = `translate(${Math.round(e.clientX)}px, ${Math.round(e.clientY)}px)`;
    const over = this._slotAt(e.clientX, e.clientY);
    if (over !== d.over) {
      if (d.over) d.over.node.classList.remove('is-over');
      if (over) over.node.classList.add('is-over');
      d.over = over;
    }
  }

  _pointerUp(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    if (d.started) {
      this.suppress = { node: d.node, until: performance.now() + 600 };
      const target = this._slotAt(e.clientX, e.clientY);
      this._endDrag();
      if (target && !this.done) this._placeAt(target.index, d.q, false, d.source);
      else if (typeof d.source === 'number') announce(`Removed ${labelText(d.q)}.`);
      return;
    }
    this._endDrag();
  }

  _pointerCancel(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this._cancelDrag(true);
  }

  /* Stop a drag; a tile dragged out of a box goes back unless it was dropped. */
  _cancelDrag(restore) {
    const d = this.drag;
    if (!d) return;
    this._endDrag();
    if (restore && d.started && typeof d.source === 'number' && !this.slots[d.source].value) this._setSlot(d.source, d.q);
  }

  _endDrag() {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    d.node.removeEventListener('pointermove', this._onPointerMove);
    d.node.removeEventListener('pointerup', this._onPointerUp);
    d.node.removeEventListener('pointercancel', this._onPointerCancel);
    try {
      if (d.node.hasPointerCapture && d.node.hasPointerCapture(d.id)) d.node.releasePointerCapture(d.id);
    } catch (err) {
      // already released
    }
    if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
    if (d.over) d.over.node.classList.remove('is-over');
    d.node.classList.remove('is-drag-source');
    this.root.classList.remove('is-dragging');
    if (!this.picked) this.root.classList.remove('is-picking');
  }

  // ---------- Checking ----------

  check() {
    if (this.done) return { correct: !this.revealed, done: true, tries: this.tries };
    this._cancelDrag(true);
    if (this.picked) this._putBack();
    const empty = this.slots.filter((s) => !s.value);
    if (empty.length) {
      empty.forEach((s) => s.node.classList.add('is-missing'));
      this._say(`Fill every box first: ${empty.length} still empty.`, 'warn');
      return { correct: false, incomplete: true, tries: this.tries };
    }
    this.tries++;
    const bad = [];
    for (const s of this.slots) {
      const ok = sameQ(s.value, s.expected);
      s.mark = ok ? 'ok' : 'bad';
      if (!ok) {
        s.wrongCount++;
        bad.push(s);
      }
      this._renderSlot(s);
    }
    if (!bad.length) {
      this._finish(false);
      return { correct: true, tries: this.tries };
    }
    const right = this.slots.length - bad.length;
    this._say(`${right} of ${this.slots.length} boxes are right. ${this.tries >= SHOW_ME_AFTER ? 'Fix the red ones, or press "Show me".' : 'Fix the red ones and check again.'}`, 'no');
    this._showHints(bad);
    if (this.tries >= SHOW_ME_AFTER) this.showBtn.hidden = false;
    this.onResult({ correct: false, revealed: false, tries: this.tries, final: false });
    return { correct: false, tries: this.tries, wrong: bad.length };
  }

  showMe() {
    if (this.done) return { correct: false, done: true };
    this._cancelDrag(false);
    this._unpick();
    this.slots.forEach((s) => this._setSlot(s.index, s.expected));
    this._finish(true);
    return { correct: false, revealed: true, tries: this.tries };
  }

  _finish(revealed) {
    this.done = true;
    this.revealed = revealed;
    this._unpick();
    for (const s of this.slots) {
      s.mark = 'ok';
      this._renderSlot(s);
      s.btn.setAttribute('aria-disabled', 'true');
    }
    this.root.classList.add('is-done');
    this.hints.hidden = true;
    this.tray.hidden = true;
    this.howto.hidden = true;
    this.actions.hidden = true;
    this._say(revealed ? 'Here is the setup. Each bottom cancels the unit on top just before it.' : 'Every box is right! Watch the units cancel.', revealed ? 'info' : 'yes');
    this.onResult({ correct: !revealed, revealed, tries: this.tries, final: true });
    this.stopCancel = playCancel(this.track, () => {
      this.stopCancel = null;
      revealNumbers(this.track, this.problem);
      this.workedHost.appendChild(workedSolution(this.problem));
      this.workedHost.hidden = false;
      this.root.classList.add('is-worked');
      const left = labelText(this.problem.find);
      this._say(`Every unit cancels except ${left}: exactly what the question asks for.`, revealed ? 'info' : 'yes');
      announce(`The units cancel, leaving ${left}. ${this.workedHost.querySelector('.mr-worked-calc').textContent}.`);
    });
  }

  // ---------- Hints ----------

  _showHints(bad) {
    clear(this.hints);
    const flipped = new Set();
    const items = [];
    for (const s of bad) {
      const partner = this.slots[s.index ^ 1];
      if (partner && partner.value && sameQ(s.value, partner.expected) && sameQ(partner.value, s.expected)) {
        if (flipped.has(s.step)) continue;
        flipped.add(s.step);
        const den = s.pos === 'den' ? s : partner;
        items.push({ where: `Fraction ${s.step + 1}`, text: `It is upside down. Flip it so ${labelText(den.expected)} is on the bottom, where it cancels ${this._before(den.step)}.` });
        continue;
      }
      items.push({ where: `Fraction ${s.step + 1}, ${s.pos === 'num' ? 'top' : 'bottom'}`, text: this._hintText(s) });
    }
    for (const h of items.slice(0, 3)) {
      this.hints.appendChild(el('li', null, el('strong', { class: 'mr-hint-where', text: h.where + ': ' }), h.text));
    }
    if (items.length > 3) this.hints.appendChild(el('li', { class: 'mr-hint-more', text: `…and ${items.length - 3} more red box${items.length - 3 === 1 ? '' : 'es'}.` }));
    this.hints.hidden = false;
  }

  /* "the 4.00 mol H₂ you start with" / "the mol H₂O on top of fraction 1" */
  _before(stepIndex) {
    const p = this.problem;
    if (stepIndex === 0) return `the ${p.givenText} ${labelText(p.given)} you start with`;
    return `the ${labelText(p.steps[stepIndex - 1].num)} on top of fraction ${stepIndex}`;
  }

  _hintText(s) {
    const p = this.problem;
    const step = p.steps[s.step];
    const got = s.value;
    const exp = s.expected;
    const L = labelText;
    const second = s.wrongCount >= 2;
    if (s.pos === 'den') {
      const prev = s.step === 0 ? p.given : p.steps[s.step - 1].num;
      if (second) return `Units must cancel: ${L(prev)} on top cancels ${L(exp)} on the bottom.`;
      if (got.formula === exp.formula) return `Right chemical, wrong unit. The bottom must cancel ${this._before(s.step)}.`;
      if (got.unit === exp.unit) return `Right unit, wrong chemical. The bottom must cancel ${this._before(s.step)}.`;
      return `Units must cancel: the bottom has to match ${this._before(s.step)}.`;
    }
    const isLast = s.step === p.steps.length - 1;
    const f = formulaText(exp.formula);
    const kind = stepKind(step.num, step.den);
    let text;
    if (kind === 'mole-ratio') {
      if (second) text = `Put ${L(exp)} on top. This mole ratio changes ${formulaText(step.den.formula)} into ${f}, using the coefficients from the balanced equation.`;
      else if (got.unit === 'g') text = 'A mole ratio compares moles, so the top needs mol, not g.';
      else if (got.formula === step.den.formula) text = 'The top and bottom of a mole ratio are different chemicals. Put the chemical you are changing to on top.';
      else text = `This fraction is the mole ratio from the balanced equation. The top is moles of the chemical you are changing to${isLast ? ' (the one the question asks about)' : ''}.`;
    } else if (kind === 'molar-mass') {
      const mm = molarMass(this.bank, exp.formula);
      if (second) text = `Put ${L(exp)} on top: 1 mol ${f} has a mass of ${mm.toFixed(2)} g.`;
      else if (got.formula === exp.formula) text = 'Same chemical, but grams go on top: this molar mass changes mol into g.';
      else text = 'This fraction is a molar mass. It changes moles of a chemical into grams of the same chemical.';
    } else {
      const mm = molarMass(this.bank, exp.formula);
      if (second) text = `Put ${L(exp)} on top: use the molar mass flipped, 1 mol ${f} over ${mm.toFixed(2)} g ${f}.`;
      else if (got.formula === exp.formula) text = 'To turn grams into moles, flip the molar mass: mol on top, g on the bottom.';
      else text = 'This fraction changes grams of a chemical into moles of the same chemical.';
    }
    if (isLast && !second) text += ` Whatever is left on top at the end is the unit of the answer: ${L(p.find)}.`;
    return text;
  }

  // ---------- Shared map interface ----------

  focus() {
    this.title.focus({ preventScroll: false });
  }

  /* Test hook: put in the right tiles and press Check. */
  solve() {
    if (this.done) return { correct: !this.revealed, done: true, tries: this.tries };
    this._unpick();
    this.slots.forEach((s) => this._setSlot(s.index, s.expected));
    return this.check();
  }

  /* Test hook: fill every box with a wrong tile and press Check. */
  answerWrong() {
    if (this.done) return { correct: false, done: true, tries: this.tries };
    this._unpick();
    this.slots.forEach((s) => {
      const wrong = this.tiles.find((q) => !sameQ(q, s.expected));
      this._setSlot(s.index, wrong);
    });
    return this.check();
  }

  state() {
    return {
      kind,
      id: this.problem.id,
      type: this.problem.type,
      done: this.done,
      revealed: this.revealed,
      tries: this.tries,
      tiles: this.tiles.map(labelText),
      slots: this.slots.map((s) => ({ where: s.where, expected: labelText(s.expected), value: s.value ? labelText(s.value) : null, mark: s.mark }))
    };
  }

  destroy() {
    if (this.stopCancel) this.stopCancel();
    this.stopCancel = null;
    this._cancelDrag(false);
    this.root.removeEventListener('click', this._onClick);
    this.root.removeEventListener('keydown', this._onKey);
    this.root.removeEventListener('pointerdown', this._onPointerDown);
    clear(this.container);
  }
}

