/* Mole Rush — Map 2, and the shared input/checking lifecycle for Maps 2–4.
   The track, equation, cancellation and worked math belong to setup-view.js. */

import { el, clear, announce } from '../dom.js?v=20261022T1604';
import { labelNode, labelText, stepKind } from '../bank.js?v=20261022T1604';
import { formatStepValue, formatSig, formulaText } from '../chem.js?v=20261022T1604';
import { problemHeader, buildTrack, revealNumbers, workedSolution, playCancel } from './setup-view.js?v=20261022T1604';

export const kind = 'setup';

export function render(container, item, opts) {
  return new NumberBoard(container, item, opts || {}, { id: 2, name: 'Numbers' });
}

/* Text inputs allow decimals and calculator e-notation without browser spinners.
   Reject partial numbers, hex, Infinity and empty input instead of coercing them. */
export function readNumber(text) {
  const s = String(text).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function within(value, expected, tolerance) {
  return Number.isFinite(value) && value > 0 &&
    Math.abs(value - expected) <= tolerance + Number.EPSILON * Math.max(1, Math.abs(expected)) * 4;
}

export function answerCorrect(value, answer) {
  return within(value, answer.value, Math.abs(answer.value) * answer.tolerancePct / 100);
}

function sameQ(a, b) {
  return !!a && !!b && a.unit === b.unit && a.formula === b.formula;
}

let boardId = 0;

export class NumberBoard {
  constructor(container, item, opts, config) {
    this.container = container;
    this.item = item;
    this.problem = item.problem;
    this.bank = opts.bank;
    this.onResult = typeof opts.onResult === 'function' ? opts.onResult : () => {};
    this.config = config;
    this.prefix = `mr-entry-${++boardId}`;
    this.fields = [];
    this.tries = 0;
    this.done = false;
    this.revealed = false;
    this.destroyed = false;
    this.picked = null;
    this.stopCancel = null;
    this._onClick = (e) => this._click(e);
    this._onKey = (e) => this._key(e);
    this._onInput = (e) => {
      const field = this.fields.find((f) => f.control === e.target);
      if (field && !this.done) this._mark(field, null);
    };
    this._build();
  }

  _build() {
    clear(this.container);
    const c = this.config;
    const p = this.problem;
    const header = problemHeader(this.bank, p, { kicker: `Map ${c.id} · ${c.name}` });
    this.title = header.title;
    this.title.id = `${this.prefix}-title`;
    this.trackHost = el('div', { class: 'mr-track-host', hidden: !!c.word });
    if (!c.word) {
      this.track = buildTrack(p, (step, pos, q) => this._cell(step, pos, q));
      this.trackHost.appendChild(this.track.root);
      if (c.blanks) {
        this.track.answerNum.textContent = formatSig(p.answer.value, p.answer.sigFigs);
        if (c.blanks.has('answer')) {
          this.track.answerNum.textContent = '';
          this.track.answerNum.appendChild(this._field('answer', 'Final answer', p.answer.value).node);
        }
      }
    }
    this.answerRow = c.word ? el('div', { class: 'mr-final-entry' },
      el('span', { text: 'Your answer' }),
      this._field('answer', `Final answer in ${labelText(p.find)}`, p.answer.value).node,
      labelNode(p.find)) : null;
    const instruction = c.word
      ? 'Work out the answer, then press Enter or Check. Aim for 3 significant figures; extra digits are OK.'
      : c.blanks
        ? 'Fill the blanks. Tap a tile, then a label box. Type missing numbers, then press Enter or Check. Use molar masses to 2 decimals.'
        : 'Fill every number, including the 1s. Use the equation coefficients and the molar masses to 2 decimals. Press Enter or Check.';
    this.howto = el('p', { class: 'mr-howto', text: instruction });
    this.tray = el('div', { class: 'mr-tray', role: 'group', 'aria-label': 'Tiles. Pick one, then choose a label box.', hidden: !c.tiles });
    this.tileButtons = (c.tiles || []).map((q, i) => {
      const b = el('button', { type: 'button', class: 'mr-tile', 'data-tile': String(i), 'aria-pressed': 'false', 'aria-label': labelText(q) }, labelNode(q));
      this.tray.appendChild(b);
      return b;
    });
    this.checkBtn = el('button', { type: 'button', class: 'btn btn-primary', 'data-action': 'check', text: 'Check' });
    this.showBtn = el('button', { type: 'button', class: 'btn btn-ghost', 'data-action': 'show', text: 'Show me', hidden: true });
    this.actions = el('div', { class: 'mr-actions' }, this.checkBtn,
      el('button', { type: 'button', class: 'btn btn-ghost', 'data-action': 'clear', text: 'Clear all' }), this.showBtn);
    this.feedback = el('p', { class: 'mr-feedback', role: 'status', tabindex: '-1' });
    this.hints = el('ul', { class: 'mr-hints', hidden: true });
    this.workedHost = el('div', { class: 'mr-worked-host', hidden: true });
    const work = el('section', { class: 'mr-work panel', 'aria-label': c.word ? 'Give the final answer' : 'Complete the setup' },
      this.answerRow, this.trackHost, this.howto, this.tray, this.actions, this.feedback, this.hints, this.workedHost);
    this.root = el('div', { class: `mr-board mr-board-entry mr-board-map${c.id}` }, header.root, work);
    this.root.addEventListener('click', this._onClick);
    this.root.addEventListener('keydown', this._onKey);
    this.root.addEventListener('input', this._onInput);
    this.container.appendChild(this.root);
  }

  _field(type, where, expected, step, pos) {
    const index = this.fields.length;
    const control = type === 'label'
      ? el('button', { type: 'button', class: 'mr-blank-label', 'data-field': String(index), 'aria-label': `${where}: empty`, text: '?' })
      : el('input', { type: 'text', class: 'mr-number-input', inputmode: 'decimal', enterkeyhint: 'done', autocomplete: 'off', spellcheck: 'false', 'aria-label': where, 'data-field': String(index) });
    const markEl = el('span', { class: 'mr-entry-mark', 'aria-hidden': 'true' });
    const node = el('span', { class: 'mr-entry-field' }, control, markEl);
    const field = { type, where, expected, step, pos, control, markEl, node, value: null, mark: null, hintId: `${this.prefix}-hint-${index}` };
    this.fields.push(field);
    return field;
  }

  _cell(step, pos, q, filled = false) {
    const blanks = this.config.blanks;
    const where = `${pos === 'num' ? 'Top' : 'Bottom'}`;
    const numberBlank = !filled && (!blanks || blanks.has(`${step}:${pos}:number`));
    const labelBlank = !filled && blanks && blanks.has(`${step}:${pos}:label`);
    const number = numberBlank ? this._field('number', `${where} number of fraction ${step + 1}`, q.value, step, pos) : null;
    const label = labelBlank ? this._field('label', `${where} label of fraction ${step + 1}`, q, step, pos) : null;
    const num = number ? number.node : el('span', { class: 'mr-num', text: formatStepValue(q.value, q.unit) });
    const fixedLabel = label ? null : labelNode(q);
    return {
      node: el('div', { class: 'mr-entry-cell' }, num, label ? label.node : fixedLabel),
      getLabel: () => label ? label.control.querySelector('.mr-label') : fixedLabel,
      setNumber: (text) => {
        if (number) number.control.value = text;
        else num.textContent = text;
      }
    };
  }

  _mark(field, mark) {
    field.mark = mark;
    field.node.classList.toggle('is-ok', mark === 'ok');
    field.node.classList.toggle('is-bad', mark === 'bad');
    field.markEl.textContent = mark === 'ok' ? '✓' : mark === 'bad' ? '✗' : '';
    field.control.setAttribute('aria-invalid', mark === 'bad' ? 'true' : 'false');
    if (mark === 'bad') field.control.setAttribute('aria-describedby', field.hintId);
    else field.control.removeAttribute('aria-describedby');
  }

  _label(field, q) {
    field.value = q;
    clear(field.control);
    field.control.appendChild(q ? labelNode(q) : el('span', { text: '?' }));
    field.control.setAttribute('aria-label', `${field.where}: ${q ? labelText(q) : 'empty'}`);
    this._mark(field, null);
  }

  _unpick() {
    this.picked = null;
    this.tileButtons.forEach((b) => {
      b.setAttribute('aria-pressed', 'false');
      b.classList.remove('is-picked');
    });
  }

  _click(e) {
    if (this.done || this.destroyed || !(e.target instanceof Element)) return;
    const tile = e.target.closest('[data-tile]');
    if (tile) {
      this._unpick();
      this.picked = this.config.tiles[Number(tile.getAttribute('data-tile'))];
      tile.setAttribute('aria-pressed', 'true');
      tile.classList.add('is-picked');
      announce(`Picked up ${labelText(this.picked)}. Choose a label box.`);
      if (e.detail === 0) {
        const target = this.fields.find((f) => f.type === 'label' && !f.value) || this.fields.find((f) => f.type === 'label');
        target.control.focus();
      }
      return;
    }
    const box = e.target.closest('[data-field]');
    const field = box && this.fields[Number(box.getAttribute('data-field'))];
    if (field && field.type === 'label') {
      if (this.picked) {
        this._label(field, this.picked);
        this._unpick();
        announce(`${labelText(field.value)} placed in ${field.where.toLowerCase()}.`);
        if (e.detail === 0) (this.fields.find((f) => f.type !== 'label' && !f.control.value)?.control || this.checkBtn).focus();
      } else {
        announce('Pick a tile, then choose this label box.');
        this.tileButtons[0]?.focus();
      }
      return;
    }
    const action = e.target.closest('[data-action]')?.getAttribute('data-action');
    if (action === 'check') this.check();
    else if (action === 'show') this.showMe();
    else if (action === 'clear') this.clearAll();
  }

  _key(e) {
    if (this.done || this.destroyed) return;
    const field = this.fields.find((f) => f.control === e.target);
    if (e.key === 'Enter' && field && field.type !== 'label') {
      e.preventDefault();
      this.check();
    } else if (e.key === 'Escape' && this.picked) {
      e.preventDefault();
      const index = this.config.tiles.indexOf(this.picked);
      this._unpick();
      this.tileButtons[index].focus();
      announce('Tile put back.');
    } else if (field && field.type === 'label' && ['Backspace', 'Delete'].includes(e.key)) {
      e.preventDefault();
      this._label(field, null);
      announce(`${field.where} cleared.`);
    }
  }

  _correct(field) {
    if (field.type === 'label') return sameQ(field.value, field.expected);
    const value = readNumber(field.control.value);
    if (field.type === 'answer') return answerCorrect(value, this.problem.answer);
    const q = this.problem.steps[field.step][field.pos];
    return q.unit === 'g' ? within(value, field.expected, 0.005) : value === field.expected;
  }

  _hint(field) {
    if (field.type === 'label') return 'Match both the unit and the chemical so the units cancel from left to right.';
    const value = readNumber(field.control.value);
    if (!Number.isFinite(value) || value <= 0) return 'Enter a positive number, such as 2 or 18.02.';
    if (field.type === 'answer') return this.config.answerHint
      ? this.config.answerHint(value)
      : 'Multiply the given amount by every top number, then divide by every bottom number.';
    const step = this.problem.steps[field.step];
    if (stepKind(step.num, step.den) === 'mole-ratio') return 'Use the coefficients from the balanced equation. Keep them as written, even if the ratio can simplify.';
    const q = step[field.pos];
    return q.unit === 'g'
      ? `Look up the molar mass of ${formulaText(q.formula)} in the box. Use 2 decimal places.`
      : 'A molar mass tells you the mass of 1 mole. Enter 1 here.';
  }

  _say(text, tone) {
    this.feedback.textContent = text;
    this.feedback.className = `mr-feedback is-${tone}`;
    announce(text);
  }

  _result() {
    const result = { correct: this.done && !this.revealed, revealed: this.revealed, tries: this.tries, final: this.done };
    if (!this.destroyed) this.onResult(result);
    return result;
  }

  check() {
    if (this.destroyed) return;
    if (this.done) return this._result();
    this.tries++;
    clear(this.hints);
    const bad = this.fields.filter((f) => {
      const ok = this._correct(f);
      this._mark(f, ok ? 'ok' : 'bad');
      return !ok;
    });
    if (!bad.length) return this._finish(false);
    for (const f of bad) {
      this.hints.appendChild(el('li', { id: f.hintId }, el('strong', { text: `${f.where}: ` }), this._hint(f)));
    }
    this.hints.hidden = false;
    this.showBtn.hidden = this.tries < 2;
    const lead = this.fields.length === 1
      ? 'Not quite. Try again.'
      : `${this.fields.length - bad.length} of ${this.fields.length} boxes are right. Try the marked boxes again.`;
    this._say(`${lead} ${this._hint(bad[0])}${this.config.word ? ' Aim for 3 significant figures; extra digits are OK.' : ''}`, 'no');
    bad[0].control.focus({ preventScroll: false });
    return this._result();
  }

  showMe() {
    if (this.destroyed) return;
    if (this.done) return this._result();
    this.solve();
    return this._finish(true);
  }

  _finish(revealed) {
    this.done = true;
    this.revealed = revealed;
    this._unpick();
    this.fields.forEach((f) => {
      this._mark(f, 'ok');
      if (f.type === 'label') f.control.disabled = true;
      else f.control.readOnly = true;
    });
    this.hints.hidden = true;
    this.tray.hidden = true;
    this.howto.hidden = true;
    this.actions.hidden = true;
    this.root.classList.add('is-done');
    if (this.config.word) {
      this.track = buildTrack(this.problem, (step, pos, q) => this._cell(step, pos, q, true));
      this.trackHost.appendChild(this.track.root);
      this.trackHost.hidden = false;
    }
    this._say(`${revealed ? 'Here is the worked setup.' : 'You got it!'} Watch the units cancel.${this.config.word ? ' Aim for 3 significant figures; extra digits are OK.' : ''}`, revealed ? 'info' : 'yes');
    this.feedback.focus({ preventScroll: true });
    this.stopCancel = playCancel(this.track, () => {
      this.stopCancel = null;
      if (this.destroyed) return;
      revealNumbers(this.track, this.problem);
      this.workedHost.appendChild(workedSolution(this.problem));
      this.workedHost.hidden = false;
      this.root.classList.add('is-worked');
      announce(`${this.feedback.textContent} ${this.workedHost.querySelector('.mr-worked-calc').textContent}. The answer is ${formatSig(this.problem.answer.value, this.problem.answer.sigFigs)} ${labelText(this.problem.find)}.`);
    });
    return this._result();
  }

  clearAll() {
    if (this.done || this.destroyed) return;
    this._unpick();
    this.fields.forEach((f) => {
      if (f.type === 'label') this._label(f, null);
      else f.control.value = '';
      this._mark(f, null);
    });
    this.hints.hidden = true;
    this._say('All blanks cleared.', 'info');
    this.fields[0].control.focus();
  }

  focus() {
    if (!this.destroyed) this.title.focus({ preventScroll: false });
  }

  /* Fill only; the caller presses Check (or calls check()) to submit. */
  solve() {
    if (this.done || this.destroyed) return;
    this.fields.forEach((f) => {
      if (f.type === 'label') this._label(f, f.expected);
      else f.control.value = f.type === 'answer' ? String(f.expected)
        : formatStepValue(f.expected, this.problem.steps[f.step][f.pos].unit);
      this._mark(f, null);
    });
  }

  answerWrong() {
    if (this.done || this.destroyed) return;
    this.fields.forEach((f) => {
      if (f.type === 'label') this._label(f, this.config.tiles.find((q) => !sameQ(q, f.expected)));
      else f.control.value = '0';
    });
    return this.check();
  }

  state() {
    return {
      kind, id: this.problem.id, type: this.problem.type,
      done: this.done, revealed: this.revealed, tries: this.tries,
      blanks: this.config.blanks ? [...this.config.blanks] : [],
      tiles: (this.config.tiles || []).map(labelText),
      slots: this.fields.map((f) => ({ type: f.type, where: f.where, expected: f.type === 'label' ? labelText(f.expected) : f.expected,
        value: f.type === 'label' ? (f.value ? labelText(f.value) : null) : f.control.value, mark: f.mark }))
    };
  }

  destroy() {
    this.destroyed = true;
    if (this.stopCancel) this.stopCancel();
    this.stopCancel = null;
    this.root.removeEventListener('click', this._onClick);
    this.root.removeEventListener('keydown', this._onKey);
    this.root.removeEventListener('input', this._onInput);
    this.root.remove();
  }
}
