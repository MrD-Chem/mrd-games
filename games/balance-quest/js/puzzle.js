/*
  Balance Quest — the puzzle panel (HTML overlay).
  Coefficient boxes with steppers, the atom counter, Check, and three hint levels.
  The gate object passed to open() keeps its own state, so closing and reopening a
  gate keeps the student's numbers and hints.
*/

import { check, hintTarget, pickRevealIndex, polyatomicGroups } from './chem.js?v=20261014T1252';
import { el, clear, formulaNode, rich, starText } from './dom.js?v=20261014T1252';
import { MAX_COEFFICIENT } from './data.js?v=20261014T1252';
import { yieldsArrow } from './arrow.js?v=20261014T1252';

const MIN = 1;
const MAX = MAX_COEFFICIENT;

/* Gate state helpers (the controller creates these objects). */
export function newGateState(eq, index) {
  const n = eq.reactants.length + eq.products.length;
  return {
    eq,
    index,
    boss: !!eq.boss,
    solved: false,
    stars: 0,
    values: eq.given.map((g, i) => (g ? eq.coefficients[i] : null)),
    locked: eq.given.map((g) => !!g),
    revealed: new Array(n).fill(false),
    hintLevel: 0,
    checked: null
  };
}

export function starsFor(gate) {
  if (gate.hintLevel >= 3) return 1;
  if (gate.hintLevel >= 1) return 2;
  return 3;
}

function listNames(items) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

export class PuzzlePanel {
  constructor({ onChange, onSolved, onClose }) {
    this.onChange = onChange;
    this.onSolved = onSolved;
    this.onClose = onClose;
    this.root = document.getElementById('bq-puzzle');
    this.card = this.root.querySelector('.bq-pz-card');
    this.kicker = document.getElementById('bq-pz-kicker');
    this.title = document.getElementById('bq-pz-title');
    this.eqBox = document.getElementById('bq-eq');
    this.counterWrap = document.getElementById('bq-counter-wrap');
    this.counterBody = document.getElementById('bq-counter-body');
    this.counterCap = document.getElementById('bq-counter-cap');
    this.counterNote = document.getElementById('bq-counter-note');
    this.feedback = document.getElementById('bq-feedback');
    this.hintBox = document.getElementById('bq-hint');
    this.starsBox = document.getElementById('bq-pz-stars');
    this.checkBtn = document.getElementById('bq-pz-check');
    this.hintBtn = document.getElementById('bq-pz-hint');
    this.continueBtn = document.getElementById('bq-pz-continue');
    this.closeBtn = document.getElementById('bq-pz-close');
    this.gate = null;
    this.inputs = [];
    this.returnFocus = null;
    this.live = true;

    this.checkBtn.addEventListener('click', () => this.check());
    this.hintBtn.addEventListener('click', () => this.hint());
    this.continueBtn.addEventListener('click', () => this.close());
    this.closeBtn.addEventListener('click', () => this.close());
    this.root.addEventListener('keydown', (e) => this._onKeydown(e));
  }

  get isOpen() {
    return !this.root.hidden;
  }

  // ---------- Open / close ----------

  /*
    open(gate, { kicker, title, live, returnFocus })
    live = true shows the atom counter while typing (worlds 1–2).
  */
  open(gate, opts) {
    this.gate = gate;
    this.live = !!opts.live;
    this.returnFocus = opts.returnFocus || document.activeElement;
    this.kicker.textContent = opts.kicker || '';
    this.title.textContent = opts.title || 'Balance the equation';
    this.root.classList.toggle('is-boss', gate.boss);
    this._buildEquation();
    clear(this.feedback);
    clear(this.hintBox);
    this.starsBox.hidden = true;
    this.feedback.className = 'bq-feedback';
    if (gate.solved) this._showSolvedState();
    else this._setSolvedUI(false);
    this._renderCounter();
    this._updateHintButton();
    this.root.hidden = false;
    this.root.setAttribute('aria-hidden', 'false');
    this.card.scrollTop = 0;
    const first = this.inputs.find((inp) => inp && !inp.readOnly);
    (first || this.title).focus({ preventScroll: true });
    this.onChange(this.values());
  }

  close() {
    if (!this.isOpen) return;
    this.root.hidden = true;
    this.root.setAttribute('aria-hidden', 'true');
    const gate = this.gate;
    this.gate = null;
    this.onClose(gate);
    const back = this.returnFocus;
    this.returnFocus = null;
    if (back && document.contains(back) && back.offsetParent !== null) back.focus();
  }

  /* A blank box counts as 1 (an unwritten coefficient means 1 in chemistry). */
  values() {
    return this.gate ? this.gate.values.map((v) => (v == null ? 1 : v)) : [];
  }

  // ---------- Equation boxes ----------

  _buildEquation() {
    const g = this.gate;
    const eq = g.eq;
    const species = eq.reactants.concat(eq.products);
    const nR = eq.reactants.length;
    clear(this.eqBox);
    this.inputs = [];
    const letters = species.join('').length;
    this.eqBox.classList.toggle('is-long', species.length >= 4 || letters > 16);
    species.forEach((formula, j) => {
      const term = el('div', { class: 'bq-term' });
      // The "+" travels with the formula after it, so a wrapped line never ends with one.
      // The "yields" arrow is its own item (on narrow screens it can take a line of its own).
      if (j === nR) this.eqBox.appendChild(yieldsArrow('bq-eq-yields'));
      else if (j > 0) term.appendChild(el('span', { class: 'bq-plus', 'aria-hidden': 'true', text: '+' }));
      if (g.locked[j] && !g.revealed[j]) {
        const v = eq.coefficients[j];
        term.appendChild(el('span', { class: 'bq-coef-fixed' + (v === 1 ? ' is-one' : ''), title: 'Given' },
          el('span', { class: 'sr-only', text: 'Given coefficient ' }), String(v)));
        this.inputs.push(null);
      } else {
        const name = formula;
        const box = el('div', { class: 'bq-coef' + (g.revealed[j] ? ' is-revealed' : '') });
        const up = el('button', { type: 'button', class: 'bq-step bq-step-up', tabindex: '-1', 'aria-label': `One more ${name}`, text: '+' });
        const input = el('input', {
          type: 'text',
          class: 'bq-coef-input',
          inputmode: 'numeric',
          enterkeyhint: 'done',
          autocomplete: 'off',
          maxlength: '2',
          role: 'spinbutton',
          'aria-valuemin': String(MIN),
          'aria-valuemax': String(MAX),
          'aria-label': `Coefficient for ${name}`,
          placeholder: '1'
        });
        const down = el('button', { type: 'button', class: 'bq-step bq-step-down', tabindex: '-1', 'aria-label': `One fewer ${name}`, text: '−' });
        input.value = g.values[j] == null ? '' : String(g.values[j]);
        this._syncAria(input, g.values[j]);
        if (g.revealed[j] || g.solved) {
          input.readOnly = true;
          up.disabled = true;
          down.disabled = true;
        }
        up.addEventListener('click', () => this._step(j, 1));
        down.addEventListener('click', () => this._step(j, -1));
        input.addEventListener('focus', () => input.select());
        input.addEventListener('input', () => this._typed(j));
        input.addEventListener('keydown', (e) => this._inputKey(e, j));
        box.append(up, input, down);
        term.appendChild(box);
        this.inputs.push(input);
      }
      term.appendChild(formulaNode(formula));
      this.eqBox.appendChild(term);
    });
  }

  _syncAria(input, value) {
    if (value == null) {
      input.setAttribute('aria-valuenow', '1');
      input.setAttribute('aria-valuetext', '1 (blank)');
    } else {
      input.setAttribute('aria-valuenow', String(value));
      input.removeAttribute('aria-valuetext');
    }
  }

  _inputKey(e, j) {
    const k = e.key;
    if (k === 'ArrowUp' || k === '+' || k === '=') {
      e.preventDefault();
      this._step(j, 1);
    } else if (k === 'ArrowDown' || k === '-' || k === '_') {
      e.preventDefault();
      this._step(j, -1);
    } else if (k === 'Enter') {
      e.preventDefault();
      this.check();
    } else if (k.length === 1 && !/[0-9]/.test(k) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  }

  _step(j, delta) {
    const g = this.gate;
    if (!g || g.solved || g.revealed[j] || g.locked[j]) return;
    const cur = g.values[j] == null ? 1 : g.values[j];
    const next = Math.min(MAX, Math.max(MIN, cur + delta));
    this._setValue(j, next, true);
  }

  _typed(j) {
    const g = this.gate;
    const input = this.inputs[j];
    const digits = input.value.replace(/[^0-9]/g, '').slice(0, 2);
    let value = digits === '' ? null : Number(digits);
    let note = '';
    if (value !== null && value > MAX) {
      value = MAX;
      note = `Coefficients go from ${MIN} to ${MAX}.`;
    }
    if (value === 0) {
      value = null;
      note = `Coefficients go from ${MIN} to ${MAX}. Zero would mean the substance isn't there at all.`;
    }
    input.value = digits === '' ? '' : value === null ? digits : String(value);
    g.values[j] = value;
    this._syncAria(input, value);
    this._changed();
    if (note) this._say(note, 'info');
  }

  _setValue(j, value, fromStep) {
    const g = this.gate;
    g.values[j] = value;
    const input = this.inputs[j];
    if (input) {
      input.value = value == null ? '' : String(value);
      this._syncAria(input, value);
      if (fromStep && document.activeElement !== input) input.focus({ preventScroll: true });
    }
    this._changed();
  }

  _changed() {
    if (this.gate.checked) this.gate.checked.stale = true;
    clear(this.feedback);
    this.feedback.className = 'bq-feedback';
    this._renderCounter();
    this.onChange(this.values());
  }

  /* Test hook: set every editable box at once. */
  setCoefficients(arr) {
    const g = this.gate;
    if (!g || g.solved) return;
    g.values.forEach((_, j) => {
      if (g.locked[j] || g.revealed[j] || j >= arr.length) return;
      const n = Number(arr[j]);
      g.values[j] = Number.isInteger(n) && n >= MIN && n <= MAX ? n : null;
      const input = this.inputs[j];
      if (input) {
        input.value = g.values[j] == null ? '' : String(g.values[j]);
        this._syncAria(input, g.values[j]);
      }
    });
    this._changed();
  }

  // ---------- Atom counter ----------

  _renderCounter() {
    const g = this.gate;
    if (!g) return;
    let rows = null;
    let stale = false;
    if (this.live || g.solved) {
      rows = check(g.eq, this.values()).perElement;
      this.counterCap.textContent = 'Atom counter';
    } else if (g.checked) {
      rows = g.checked.rows;
      stale = g.checked.stale;
      this.counterCap.textContent = 'Atom count at your last check';
    }
    this.counterWrap.classList.toggle('is-waiting', !rows);
    this.counterWrap.classList.toggle('is-stale', stale);
    this.counterNote.hidden = !!rows && !stale;
    this.counterNote.textContent = rows ? 'You changed a number. Press Check to count again.' : 'Press Check to count the atoms on each side.';
    clear(this.counterBody);
    if (!rows) return;
    for (const r of rows) {
      const none = r.left === 0 && r.right === 0;
      const ok = !none && r.left === r.right;
      this.counterBody.appendChild(
        el('tr', { class: none ? 'is-empty' : ok ? 'is-equal' : 'is-off' },
          el('th', { scope: 'row', text: r.element }),
          el('td', { text: String(r.left) }),
          el('td', { text: String(r.right) }),
          el('td', { class: 'bq-counter-mark' },
            el('span', { 'aria-hidden': 'true', text: none ? '–' : ok ? '✓' : '✗' }),
            el('span', { class: 'sr-only', text: none ? 'none yet' : ok ? 'equal' : 'not equal' })))
      );
    }
  }

  // ---------- Check ----------

  _say(content, kind) {
    this.feedback.className = 'bq-feedback' + (kind ? ` is-${kind}` : '');
    rich(this.feedback, Array.isArray(content) ? content : [content]);
  }

  check() {
    const g = this.gate;
    if (!g) return { correct: false, message: 'No puzzle is open.' };
    if (g.solved) return { correct: true, balanced: true, lowestTerms: true, gcd: 1, message: 'Already solved.' };
    const r = check(g.eq, this.values());
    g.checked = { rows: r.perElement, stale: false };
    this._renderCounter();
    let message;
    if (r.correct) {
      this._success();
      message = this.feedback.textContent;
    } else if (r.balanced) {
      this._say(`Balanced! Now simplify — every coefficient can be divided by ${r.gcd}.`, 'almost');
      message = this.feedback.textContent;
    } else {
      const off = r.perElement.filter((e) => !e.equal);
      const parts = off.slice(0, 3).map((e) => `${e.element} (${e.left} on the left, ${e.right} on the right)`);
      const more = off.length > 3 ? ` and ${off.length - 3} more` : '';
      this._say(`Not balanced yet. These atoms don't match: ${listNames(parts)}${more}. Keep going!`, 'no');
      message = this.feedback.textContent;
    }
    return { correct: r.correct, balanced: r.balanced, lowestTerms: r.lowestTerms, gcd: r.gcd, mismatched: r.mismatched, message };
  }

  /* Test hook: put in the right answer and check it. */
  solve() {
    const g = this.gate;
    if (!g) return { correct: false, message: 'No puzzle is open.' };
    if (!g.solved) this.setCoefficients(g.eq.coefficients);
    return this.check();
  }

  _success() {
    const g = this.gate;
    const stars = starsFor(g);
    g.solved = true;
    g.stars = Math.max(g.stars || 0, stars);
    const lines = ['Balanced! Every atom on the left is also on the right.'];
    lines.push(g.boss ? ' You beat the boss gate!' : ' The gate is opening.');
    this._say(lines.join(''), 'yes');
    this.starsBox.hidden = false;
    clear(this.starsBox);
    this.starsBox.append(
      el('span', { class: 'bq-stars-icons', 'aria-hidden': 'true', text: starText(stars) }),
      el('span', { class: 'bq-stars-text', text: stars === 3 ? ' 3 stars — no hints needed!' : stars === 2 ? ' 2 stars' : ' 1 star' })
    );
    this._setSolvedUI(true);
    this.inputs.forEach((inp) => {
      if (inp) inp.readOnly = true;
    });
    this.eqBox.querySelectorAll('.bq-step').forEach((b) => {
      b.disabled = true;
    });
    this.root.classList.add('is-solved');
    this.onSolved(g, stars);
    this.continueBtn.focus();
  }

  _showSolvedState() {
    this._setSolvedUI(true);
    this._say('This gate is already open.', 'yes');
  }

  _setSolvedUI(solved) {
    this.root.classList.toggle('is-solved', solved);
    this.checkBtn.hidden = solved;
    this.hintBtn.hidden = solved;
    this.continueBtn.hidden = !solved;
  }

  // ---------- Hints ----------

  _updateHintButton() {
    const lvl = this.gate ? this.gate.hintLevel : 0;
    const label = lvl === 0 ? 'Hint' : lvl === 1 ? 'Next hint (2 of 3)' : lvl === 2 ? 'Show me a number (3 of 3)' : 'Show another number';
    this.hintBtn.textContent = label;
  }

  hint() {
    const g = this.gate;
    if (!g || g.solved) return null;
    g.hintLevel = Math.min(3, g.hintLevel + 1);
    const level = g.hintLevel;
    if (level === 1) {
      const parts = ['Strategy: balance metals first, then other nonmetals, then H, then O. If a group like ', { f: 'SO4' }, ' appears unchanged on both sides, balance it as one unit.'];
      const groups = polyatomicGroups(g.eq);
      if (groups.length) parts.push(' Here, ', { f: groups[0] }, ' is on both sides.');
      rich(this.hintBox, parts);
    } else if (level === 2) {
      this._pointHint();
    } else {
      this._revealHint();
    }
    this.hintBox.className = 'bq-hint is-level-' + level;
    this._updateHintButton();
    return { level, text: this.hintBox.textContent };
  }

  _pointHint() {
    const g = this.gate;
    const t = hintTarget(g.eq, this.values());
    const parts = [];
    if (t.kind === 'element') {
      parts.push('Look at ', { b: t.name }, `: ${t.left} on the left, ${t.right} on the right. Change the number in front of a formula that has ${t.name}.`);
    } else if (t.kind === 'group') {
      parts.push('Look at the ', { f: t.name }, ` group: ${t.left} on the left, ${t.right} on the right. Balance it as one unit.`);
    } else if (t.kind === 'simplify') {
      parts.push(`Every atom matches! Now divide every coefficient by ${t.divisor}.`);
    } else {
      parts.push('It looks balanced. Press Check!');
    }
    rich(this.hintBox, parts);
  }

  _revealHint() {
    const g = this.gate;
    const species = g.eq.reactants.concat(g.eq.products);
    const lockedNow = g.locked.map((l, i) => l || g.revealed[i]);
    const j = pickRevealIndex(g.eq, this.values(), g.eq.coefficients, lockedNow);
    if (j < 0) {
      rich(this.hintBox, ['Every number is already showing. Press Check!']);
      return;
    }
    g.revealed[j] = true;
    g.values[j] = g.eq.coefficients[j];
    this._buildEquation();
    this._changed();
    rich(this.hintBox, ["Here's one: the coefficient in front of ", { f: species[j] }, ` is ${g.eq.coefficients[j]}.`]);
    const next = this.inputs.find((inp) => inp && !inp.readOnly);
    if (next) next.focus({ preventScroll: true });
    else this.checkBtn.focus();
  }

  // ---------- Keyboard: Esc, Tab trap ----------

  _onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.close();
      return;
    }
    if (e.key === 'Enter' && e.target === this.title) {
      e.preventDefault();
      this.check();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = [...this.root.querySelectorAll('input, button, [tabindex="0"]')].filter(
      (n) => !n.disabled && !n.hidden && n.tabIndex >= 0 && n.offsetParent !== null
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === this.title)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

