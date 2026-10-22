/*
  Mole Rush — a balancing item (mixed into Map 1).

  The unbalanced equation with a coefficient box and − / + steppers in front of each
  formula, plus a live atom counter. Correct only when balanced in LOWEST whole numbers.
  Keyboard: Tab to a box, type a number or use the up/down arrow keys, Enter checks.

  Same interface as every map: render(container, item, { onResult })
    -> { destroy(), focus(), check(), solve(), answerWrong(), state() }
*/

import { el, clear, announce } from '../dom.js?v=20261022T1625';
import { formulaNode } from '../bank.js?v=20261022T1625';
import { checkBalance, formulaText } from '../chem.js?v=20261022T1625';

export const kind = 'balance';

export function render(container, item, opts) {
  return new BalanceBoard(container, item, opts || {});
}

const MIN = 1;
const MAX = 12;
const SHOW_ME_AFTER = 2;

class BalanceBoard {
  constructor(container, item, opts) {
    this.container = container;
    this.item = item;
    this.eq = item.eq;
    this.onResult = typeof opts.onResult === 'function' ? opts.onResult : () => {};
    this.species = this.eq.reactants.concat(this.eq.products);
    this.values = this.species.map(() => 1);
    this.tries = 0;
    this.done = false;
    this.revealed = false;
    this.inputs = [];
    this.steppers = [];
    this._onClick = (e) => this._click(e);
    this._onKey = (e) => this._key(e);
    this._onInput = (e) => this._typed(e);
    this._build();
  }

  _build() {
    clear(this.container);
    this.title = el('h2', { class: 'mr-q-text', id: 'mr-q-text', tabindex: '-1', text: 'Balance this equation.' });
    const chips = el('p', { class: 'mr-q-chips' }, el('span', { class: 'mr-chip mr-chip-bal', text: 'Balancing' }));
    const help = el('p', { class: 'mr-bal-help', id: 'mr-bal-help', text: 'Change the coefficients with − and + (or type a number) until every atom matches. Use the lowest whole numbers.' });

    this.eqRow = el('div', { class: 'mr-bal-eq', role: 'group', 'aria-label': 'Equation', 'aria-describedby': 'mr-bal-help' });
    const nR = this.eq.reactants.length;
    this.species.forEach((formula, j) => {
      const term = el('div', { class: 'mr-bal-term' });
      // The "+" and the "→" travel with the term after them (no operator ends a line).
      if (j === nR) term.appendChild(el('span', { class: 'mr-eq-arrow', role: 'img', 'aria-label': 'yields', text: '→' }));
      else if (j > 0) term.appendChild(el('span', { class: 'mr-eq-plus', 'aria-hidden': 'true', text: '+' }));
      const name = formulaText(formula);
      const up = el('button', { type: 'button', class: 'mr-step', tabindex: '-1', 'data-step': `${j}:1`, 'aria-label': `One more ${name}`, text: '+' });
      const input = el('input', {
        type: 'text',
        class: 'mr-coef',
        inputmode: 'numeric',
        enterkeyhint: 'done',
        autocomplete: 'off',
        maxlength: '2',
        role: 'spinbutton',
        'aria-valuemin': String(MIN),
        'aria-valuemax': String(MAX),
        'aria-label': `Coefficient for ${name}`,
        'data-coef': String(j)
      });
      input.value = '1';
      const down = el('button', { type: 'button', class: 'mr-step', tabindex: '-1', 'data-step': `${j}:-1`, 'aria-label': `One fewer ${name}`, text: '−' });
      term.appendChild(el('div', { class: 'mr-coef-box' }, up, input, down));
      term.appendChild(formulaNode(formula, 'mr-formula mr-bal-formula'));
      this.eqRow.appendChild(term);
      this.inputs.push(input);
      this.steppers.push(up, down);
    });

    this.counterBody = el('tbody');
    const counter = el('table', { class: 'mr-counter' },
      el('caption', { text: 'Atom counter' }),
      el('thead', null, el('tr', null,
        el('th', { scope: 'col', text: 'Atom' }),
        el('th', { scope: 'col', text: 'Left' }),
        el('th', { scope: 'col', text: 'Right' }),
        el('th', { scope: 'col' }, el('span', { class: 'sr-only', text: 'Match?' })))),
      this.counterBody);

    this.checkBtn = el('button', { type: 'button', class: 'btn btn-primary', 'data-action': 'check', text: 'Check' });
    this.showBtn = el('button', { type: 'button', class: 'btn btn-ghost', 'data-action': 'show', text: 'Show me', hidden: true });
    this.actions = el('div', { class: 'mr-actions' }, this.checkBtn, this.showBtn);
    this.feedback = el('p', { class: 'mr-feedback', role: 'status' });

    const work = el('section', { class: 'mr-work panel mr-bal-work', 'aria-label': 'Balance the equation' },
      el('div', { class: 'mr-bal-grid' },
        el('div', { class: 'mr-bal-main' }, this.eqRow, this.actions, this.feedback),
        el('div', { class: 'mr-bal-side' }, counter)));
    this.root = el('div', { class: 'mr-board mr-board-balance' },
      el('div', { class: 'mr-q mr-q-bal' }, el('div', { class: 'mr-q-main' }, chips, this.title, help)),
      work);
    this.root.addEventListener('click', this._onClick);
    this.root.addEventListener('keydown', this._onKey);
    this.root.addEventListener('input', this._onInput);
    this.container.appendChild(this.root);
    this._sync();
  }

  // ---------- Values ----------

  _set(j, value) {
    if (this.done) return;
    const v = Math.max(MIN, Math.min(MAX, value));
    this.values[j] = v;
    this.inputs[j].value = String(v);
    this._sync();
  }

  _sync() {
    this.inputs.forEach((input, j) => {
      input.setAttribute('aria-valuenow', String(this.values[j]));
    });
    const res = checkBalance(this.eq.reactants, this.eq.products, this.values);
    clear(this.counterBody);
    for (const r of res.rows) {
      this.counterBody.appendChild(el('tr', { class: r.equal ? 'is-equal' : 'is-off' },
        el('th', { scope: 'row', text: r.element }),
        el('td', { text: String(r.left) }),
        el('td', { text: String(r.right) }),
        el('td', { class: 'mr-counter-mark' },
          el('span', { 'aria-hidden': 'true', text: r.equal ? '✓' : '✗' }),
          el('span', { class: 'sr-only', text: r.equal ? 'equal' : 'not equal' }))));
    }
    if (!this.done && this.feedback.classList.contains('is-no')) this._say('', '');
    return res;
  }

  _say(text, tone) {
    this.feedback.textContent = text;
    this.feedback.className = 'mr-feedback' + (tone ? ' is-' + tone : '');
  }

  // ---------- Events ----------

  _click(e) {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const step = t.closest('[data-step]');
    if (step) {
      const [j, d] = step.getAttribute('data-step').split(':').map(Number);
      this._set(j, this.values[j] + d);
      return;
    }
    const action = t.closest('[data-action]');
    if (!action) return;
    if (action.getAttribute('data-action') === 'check') this.check();
    else this.showMe();
  }

  _key(e) {
    const t = e.target;
    if (!(t instanceof Element) || !t.hasAttribute('data-coef')) return;
    const j = Number(t.getAttribute('data-coef'));
    if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
      e.preventDefault();
      this._set(j, this.values[j] + 1);
    } else if (e.key === 'ArrowDown' || e.key === '-' || e.key === '_') {
      e.preventDefault();
      this._set(j, this.values[j] - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.check();
    } else if (e.key.length === 1 && !/[0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  }

  _typed(e) {
    const t = e.target;
    if (!(t instanceof Element) || !t.hasAttribute('data-coef') || this.done) return;
    const j = Number(t.getAttribute('data-coef'));
    const digits = t.value.replace(/[^0-9]/g, '').slice(0, 2);
    if (digits === '') {
      // Leave the box empty while typing; it counts as 1 (like an unwritten coefficient).
      t.value = '';
      this.values[j] = 1;
      this._sync();
      return;
    }
    let v = Number(digits);
    if (v < MIN) v = MIN;
    if (v > MAX) v = MAX;
    this.values[j] = v;
    t.value = String(v);
    this._sync();
  }

  // ---------- Checking ----------

  check() {
    if (this.done) return { correct: !this.revealed, done: true, tries: this.tries };
    this.inputs.forEach((input, j) => {
      if (input.value === '') input.value = String(this.values[j]);
    });
    this.tries++;
    const res = checkBalance(this.eq.reactants, this.eq.products, this.values);
    if (res.correct) {
      this._finish(false);
      return { correct: true, tries: this.tries };
    }
    if (res.balanced) {
      this._say(`Balanced, but not in lowest terms. Every coefficient can be divided by ${res.gcd}.`, 'no');
    } else {
      const off = res.rows.filter((r) => !r.equal);
      const list = off.slice(0, 3).map((r) => `${r.element} (${r.left} on the left, ${r.right} on the right)`);
      this._say(`Not balanced yet. These atoms don't match: ${list.join(', ')}${off.length > 3 ? ', and more' : ''}.`, 'no');
    }
    if (this.tries >= SHOW_ME_AFTER) this.showBtn.hidden = false;
    this.feedback.classList.add('is-no');
    this.onResult({ correct: false, revealed: false, tries: this.tries, final: false });
    return { correct: false, tries: this.tries, balanced: res.balanced };
  }

  showMe() {
    if (this.done) return { correct: false, done: true };
    this.eq.coefficients.forEach((c, j) => {
      this.values[j] = c;
      this.inputs[j].value = String(c);
    });
    this._sync();
    this._finish(true);
    return { correct: false, revealed: true, tries: this.tries };
  }

  _finish(revealed) {
    this.done = true;
    this.revealed = revealed;
    this.inputs.forEach((input) => {
      input.readOnly = true;
    });
    this.steppers.forEach((b) => {
      b.disabled = true;
    });
    this.actions.hidden = true;
    this.root.classList.add('is-done');
    this._say(revealed ? 'Here are the coefficients. Count the atoms: every row matches.' : 'Balanced in lowest whole numbers!', revealed ? 'info' : 'yes');
    announce(this.feedback.textContent);
    this.onResult({ correct: !revealed, revealed, tries: this.tries, final: true });
  }

  // ---------- Shared map interface ----------

  focus() {
    this.title.focus({ preventScroll: false });
  }

  solve() {
    if (this.done) return { correct: !this.revealed, done: true, tries: this.tries };
    this.eq.coefficients.forEach((c, j) => {
      this.values[j] = c;
      this.inputs[j].value = String(c);
    });
    this._sync();
    return this.check();
  }

  answerWrong() {
    if (this.done) return { correct: false, done: true, tries: this.tries };
    // All 1s is never right (the bank skips equations that are balanced as written).
    this.values = this.species.map(() => 1);
    this.inputs.forEach((input) => {
      input.value = '1';
    });
    this._sync();
    return this.check();
  }

  state() {
    return { kind, id: this.eq.id, done: this.done, revealed: this.revealed, tries: this.tries, values: this.values.slice(), answer: this.eq.coefficients.slice() };
  }

  destroy() {
    this.root.removeEventListener('click', this._onClick);
    this.root.removeEventListener('keydown', this._onKey);
    this.root.removeEventListener('input', this._onInput);
    clear(this.container);
  }
}
