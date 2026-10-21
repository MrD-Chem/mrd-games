/*
  Mole Rush — helpers over the question bank (window.MR_BANK, from data/bank.js).

  loadBank() checks every reaction, problem and balancing item once, keeps only the
  ones that are safe to play (units chain and cancel, numbers work out, equations
  balance) and returns lookups. Everything that draws a formula goes through
  formulaNode(), which builds real <sub> elements with DOM APIs.
*/

import { el } from './dom.js?v=20261021T1624';
import { formulaParts, formulaText, tryCountAtoms, computeMolarMass, checkBalance, formatSig } from './chem.js?v=20261021T1624';

export const UNITS = ['mol', 'g'];
const TYPES = ['mol-mol', 'g-mol', 'mol-g', 'g-g'];
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const MAX_TEXT = 400;

// ---------- Loading and checking ----------

function isPosNum(n) {
  return typeof n === 'number' && isFinite(n) && n > 0;
}

function cleanText(value, max) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '';
}

export function key(q) {
  return q.unit + '|' + q.formula;
}

function sameQty(a, b) {
  return a.unit === b.unit && a.formula === b.formula;
}

function quantity(raw, compounds, needValue) {
  if (!raw || typeof raw !== 'object') return null;
  if (!UNITS.includes(raw.unit)) return null;
  if (typeof raw.formula !== 'string' || !compounds[raw.formula]) return null;
  if (needValue && !isPosNum(raw.value)) return null;
  const q = { unit: raw.unit, formula: raw.formula };
  if (needValue) q.value = raw.value;
  return q;
}

/* Largest allowed gap between the worked-out answer and the bank's answer. */
function answerSlack(answer) {
  const v = Math.abs(answer.value);
  const halfLastPlace = 0.5 * Math.pow(10, Math.floor(Math.log10(v)) - answer.sigFigs + 1);
  const pct = (isPosNum(answer.tolerancePct) ? answer.tolerancePct : 1) / 100;
  return halfLastPlace * 1.02 + v * Math.min(pct, 0.05);
}

/*
  What a fraction does, read from its units (the data's "kind" label is not trusted):
  'mole-ratio'   mol B / mol A
  'molar-mass'   g X / mol X     (moles → grams)
  'to-moles'     mol X / g X     (grams → moles: the molar mass flipped)
*/
export function stepKind(num, den) {
  if (num.unit === 'mol' && den.unit === 'mol' && num.formula !== den.formula) return 'mole-ratio';
  if (num.formula === den.formula && num.unit === 'g' && den.unit === 'mol') return 'molar-mass';
  if (num.formula === den.formula && num.unit === 'mol' && den.unit === 'g') return 'to-moles';
  return null;
}

export function computeAnswer(problem) {
  let x = problem.given.value;
  for (const s of problem.steps) x = (x * s.num.value) / s.den.value;
  return x;
}

function prepareProblem(raw, compounds, reactions, warn) {
  if (!raw || typeof raw !== 'object') return warn('A problem is not an object.');
  const id = typeof raw.id === 'string' && ID_RE.test(raw.id) ? raw.id : null;
  if (!id) return warn('A problem has a missing or odd id.');
  const reaction = reactions.get(raw.reaction);
  if (!reaction) return warn(`${id}: unknown reaction "${raw.reaction}".`);
  const text = cleanText(raw.text, MAX_TEXT);
  if (!text) return warn(`${id}: missing text.`);
  const given = quantity(raw.given, compounds, true);
  const find = quantity(raw.find, compounds, false);
  if (!given || !find) return warn(`${id}: given or find is not readable.`);
  // The type always follows the units (mol → g is "mol-g"), whatever the data says.
  const type = given.unit + '-' + find.unit;
  if (!TYPES.includes(type)) return warn(`${id}: unknown type.`);
  if (raw.type !== type) warn(`${id}: type "${raw.type}" changed to "${type}" to match the units.`);
  if (!Array.isArray(raw.steps) || raw.steps.length < 1 || raw.steps.length > 4) return warn(`${id}: needs 1 to 4 steps.`);
  const steps = [];
  for (const s of raw.steps) {
    const num = s && quantity(s.num, compounds, true);
    const den = s && quantity(s.den, compounds, true);
    if (!num || !den) return warn(`${id}: a step is not readable.`);
    const kind = stepKind(num, den);
    if (!kind) return warn(`${id}: a step is neither a mole ratio nor a molar mass.`);
    if (kind === 'mole-ratio') {
      const cn = coefficientOf(reaction, num.formula);
      const cd = coefficientOf(reaction, den.formula);
      if (!cn || !cd) return warn(`${id}: a mole ratio uses a chemical that is not in the reaction.`);
      if (Math.abs(num.value / den.value - cn / cd) > 1e-6) return warn(`${id}: a mole ratio does not match the balanced equation.`);
    } else {
      const g = num.unit === 'g' ? num : den;
      const m = num.unit === 'mol' ? num : den;
      if (Math.abs(m.value - 1) > 1e-9) return warn(`${id}: a molar-mass step should use 1 mol.`);
      if (Math.abs(g.value - compounds[g.formula].molarMass) > 0.011) return warn(`${id}: a molar mass does not match the compound list.`);
    }
    steps.push({ num, den, kind });
  }
  // Units must chain: the bottom of each fraction cancels the top before it.
  let top = given;
  for (let i = 0; i < steps.length; i++) {
    if (!sameQty(steps[i].den, top)) return warn(`${id}: step ${i + 1} does not cancel the unit before it.`);
    if (sameQty(steps[i].num, steps[i].den)) return warn(`${id}: step ${i + 1} has the same unit on top and bottom.`);
    top = steps[i].num;
  }
  if (!sameQty(top, find)) return warn(`${id}: the last step does not end in the unit asked for.`);
  const a = raw.answer;
  if (!a || !isPosNum(a.value) || !Number.isInteger(a.sigFigs) || a.sigFigs < 1 || a.sigFigs > 6) return warn(`${id}: answer is not readable.`);
  const answer = {
    value: a.value,
    unit: find.unit,
    formula: find.formula,
    sigFigs: a.sigFigs,
    tolerancePct: isPosNum(a.tolerancePct) ? a.tolerancePct : 1
  };
  const problem = {
    id,
    reaction: reaction.id,
    type,
    text,
    given,
    find,
    steps,
    answer,
    difficulty: [1, 2, 3].includes(raw.difficulty) ? raw.difficulty : 2
  };
  const worked = computeAnswer(problem);
  if (Math.abs(worked - answer.value) > answerSlack(answer)) return warn(`${id}: the steps give ${worked.toPrecision(4)}, not ${answer.value}.`);
  problem.worked = worked;
  problem.givenText = givenNumberText(problem);
  return problem;
}

/* The given number exactly as the problem text writes it ("4.00"), so sig figs show. */
function givenNumberText(problem) {
  const matches = problem.text.match(/\d[\d,]*(?:\.\d+)?|\.\d+/g) || [];
  for (const m of matches) {
    const n = Number(m.replace(/,/g, ''));
    if (isFinite(n) && Math.abs(n - problem.given.value) < 1e-9 * Math.max(1, n)) return m;
  }
  return formatSig(problem.given.value, problem.answer.sigFigs);
}

function prepareReaction(raw, compounds, warn) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !ID_RE.test(raw.id)) return warn('A reaction has a missing or odd id.');
  const side = (list) =>
    Array.isArray(list) && list.length >= 1 && list.length <= 6
      ? list.map((t) => (t && compounds[t.formula] && Number.isInteger(t.coef) && t.coef >= 1 && t.coef <= 20 ? { formula: t.formula, coef: t.coef } : null))
      : null;
  const reactants = side(raw.reactants);
  const products = side(raw.products);
  if (!reactants || !products || reactants.includes(null) || products.includes(null)) return warn(`${raw.id}: a formula or coefficient is not readable.`);
  const r = { id: raw.id, name: cleanText(raw.name, 80), reactants, products };
  try {
    const res = checkBalance(r.reactants.map((t) => t.formula), r.products.map((t) => t.formula), r.reactants.concat(r.products).map((t) => t.coef));
    if (!res.balanced) return warn(`${raw.id}: the equation is not balanced.`);
  } catch (err) {
    return warn(`${raw.id}: a formula could not be read.`);
  }
  return r;
}

function prepareBalancing(raw, warn) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !ID_RE.test(raw.id)) return warn('A balancing item has a missing or odd id.');
  const ok = (list) => Array.isArray(list) && list.length >= 1 && list.length <= 5 && list.every((f) => typeof f === 'string' && tryCountAtoms(f));
  if (!ok(raw.reactants) || !ok(raw.products)) return warn(`${raw.id}: a formula could not be read.`);
  const n = raw.reactants.length + raw.products.length;
  const c = raw.coefficients;
  if (!Array.isArray(c) || c.length !== n || !c.every((x) => Number.isInteger(x) && x >= 1 && x <= 12)) return warn(`${raw.id}: coefficients are not readable.`);
  const res = checkBalance(raw.reactants, raw.products, c);
  if (!res.correct) return warn(`${raw.id}: the coefficients are not balanced in lowest terms.`);
  // Already balanced with every coefficient 1? Then there is nothing to do: skip it.
  if (c.every((x) => x === 1)) return warn(`${raw.id}: already balanced as written.`);
  return { id: raw.id, reactants: raw.reactants.slice(), products: raw.products.slice(), coefficients: c.slice() };
}

/*
  loadBank(raw = window.MR_BANK) -> { ok, error, bank, warnings }
  bank: { version, atomicMasses, compounds, reactions: Map, problems: [], balancing: [],
          problemById: Map, balancingById: Map }
*/
export function loadBank(raw) {
  const src = raw === undefined ? window.MR_BANK : raw;
  const warnings = [];
  const warn = (msg) => {
    if (warnings.length < 200) warnings.push(msg);
    return null;
  };
  if (!src || typeof src !== 'object') return { ok: false, error: 'missing', warnings };
  if (src.version !== 1) return { ok: false, error: 'version', warnings };
  const atomicMasses = src.atomicMasses && typeof src.atomicMasses === 'object' ? src.atomicMasses : {};
  const compounds = {};
  if (src.compounds && typeof src.compounds === 'object') {
    for (const f of Object.keys(src.compounds)) {
      const c = src.compounds[f];
      if (!tryCountAtoms(f)) {
        warn(`Compound "${f}" could not be read.`);
        continue;
      }
      const mm = c && isPosNum(c.molarMass) ? c.molarMass : computeMolarMass(f, atomicMasses);
      if (!mm) {
        warn(`Compound "${f}" has no molar mass.`);
        continue;
      }
      compounds[f] = { name: cleanText(c && c.name, 60), molarMass: Math.round(mm * 100) / 100 };
    }
  }
  const reactions = new Map();
  for (const r of Array.isArray(src.reactions) ? src.reactions : []) {
    const prepared = prepareReaction(r, compounds, warn);
    if (prepared && !reactions.has(prepared.id)) reactions.set(prepared.id, prepared);
  }
  const problems = [];
  const problemById = new Map();
  for (const p of Array.isArray(src.problems) ? src.problems : []) {
    const prepared = prepareProblem(p, compounds, reactions, warn);
    if (prepared && !problemById.has(prepared.id)) {
      problems.push(prepared);
      problemById.set(prepared.id, prepared);
    }
  }
  const balancing = [];
  const balancingById = new Map();
  for (const b of Array.isArray(src.balancing) ? src.balancing : []) {
    const prepared = prepareBalancing(b, warn);
    if (prepared && !balancingById.has(prepared.id)) {
      balancing.push(prepared);
      balancingById.set(prepared.id, prepared);
    }
  }
  if (!problems.length) return { ok: false, error: 'empty', warnings };
  return {
    ok: true,
    warnings,
    bank: { version: 1, atomicMasses, compounds, reactions, problems, balancing, problemById, balancingById }
  };
}

// ---------- Lookups ----------

export function molarMass(bank, formula) {
  const c = bank.compounds[formula];
  if (c) return c.molarMass;
  return computeMolarMass(formula, bank.atomicMasses);
}

export function compoundName(bank, formula) {
  const c = bank.compounds[formula];
  return c && c.name ? c.name : '';
}

export function reactionFor(bank, problem) {
  return bank.reactions.get(problem.reaction) || null;
}

export function getProblem(bank, id) {
  return bank.problemById.get(id) || null;
}

export function getBalancing(bank, id) {
  return bank.balancingById.get(id) || null;
}

/* Every formula in a reaction, reactants first, without repeats. */
export function reactionFormulas(reaction) {
  const out = [];
  for (const t of reaction.reactants.concat(reaction.products)) if (!out.includes(t.formula)) out.push(t.formula);
  return out;
}

export function coefficientOf(reaction, formula) {
  const t = reaction.reactants.concat(reaction.products).find((x) => x.formula === formula);
  return t ? t.coef : null;
}

// ---------- Drawing ----------

/* A formula with real subscripts: H2O -> <span>H<sub>2</sub>O</span> */
export function formulaNode(formula, className = 'mr-formula') {
  const span = el('span', { class: className });
  for (const part of formulaParts(formula)) {
    if (part.sub) span.appendChild(el('sub', { text: part.text }));
    else span.appendChild(document.createTextNode(part.text));
  }
  return span;
}

export { formulaText };

/* "mol H₂" as text */
export function labelText(q) {
  return `${q.unit} ${formulaText(q.formula)}`;
}

/* "mol H₂" as a node: <span class="mr-label"><span class="mr-unit is-mol">mol</span> H<sub>2</sub></span> */
export function labelNode(q, extraClass) {
  return el('span', { class: 'mr-label' + (extraClass ? ' ' + extraClass : '') },
    el('span', { class: 'mr-unit is-' + q.unit, text: q.unit }),
    ' ',
    formulaNode(q.formula));
}

/*
  A balanced equation: 2 H₂ + O₂ → 2 H₂O (coefficients of 1 are left out).
  terms: { reactants: [{formula, coef}], products: [...] }
*/
export function equationNode(reaction, className = 'mr-equation') {
  const p = el('p', { class: className });
  // Each "+" and the "→" travel with the term after them, so a wrapped line never
  // ends with an operator.
  const side = (list, first) =>
    list.forEach((t, i) => {
      const op = i > 0
        ? el('span', { class: 'mr-eq-plus', text: '+' })
        : first;
      p.appendChild(el('span', { class: 'mr-eq-term' },
        op,
        t.coef > 1 ? el('span', { class: 'mr-eq-coef', text: String(t.coef) }) : null,
        formulaNode(t.formula)));
    });
  side(reaction.reactants, null);
  side(reaction.products, el('span', { class: 'mr-eq-arrow', 'aria-label': 'yields', role: 'img', text: '→' }));
  return p;
}

/* Plain-text equation for screen readers and summaries. */
export function equationText(reaction) {
  const side = (list) => list.map((t) => (t.coef > 1 ? t.coef + ' ' : '') + formulaText(t.formula)).join(' + ');
  return `${side(reaction.reactants)} → ${side(reaction.products)}`;
}

/* The "Molar masses" box: every compound in the reaction, g/mol with 2 decimals. */
export function molarMassBox(bank, reaction) {
  const list = el('dl', { class: 'mr-mm-list' });
  for (const f of reactionFormulas(reaction)) {
    const mm = molarMass(bank, f);
    list.appendChild(el('div', { class: 'mr-mm-row' },
      el('dt', null, formulaNode(f)),
      el('dd', null, el('span', { class: 'mr-mm-num', text: mm == null ? '—' : mm.toFixed(2) }), ' g/mol')));
  }
  return el('aside', { class: 'mr-mm', 'aria-label': 'Molar masses' },
    el('p', { class: 'mr-mm-title', text: 'Molar masses' }),
    list);
}

/* "mol → g" style label for a problem type. */
export function typeLabel(type) {
  const [a, b] = String(type).split('-');
  return `${a} → ${b}`;
}
