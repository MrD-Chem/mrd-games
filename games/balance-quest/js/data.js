/*
  Balance Quest — equation data.
  Reads window.BQ_EQUATIONS (from equations.js), checks every entry with the
  balancer, and groups the gates by world. Also turns typed practice equations
  into a custom world.
*/

import { balance, check, parseEquationLine, tryParseFormula } from './chem.js?v=20261021T1624';

export const MAX_COEFFICIENT = 12;
const MAX_CUSTOM = 20;

export const WORLDS = [
  { n: 1, key: 'w1', name: 'Lab Meadow', theme: 'meadow', liveCounter: true, blurb: 'A gentle warm-up: synthesis and decomposition.' },
  { n: 2, key: 'w2', name: 'Crystal Caves', theme: 'caves', liveCounter: true, blurb: 'Single and double replacement reactions.' },
  { n: 3, key: 'w3', name: 'Volcano Ridge', theme: 'volcano', liveCounter: false, blurb: 'Combustion and metal oxides. Every box is blank.' },
  { n: 4, key: 'w4', name: 'Ocean Ruins', theme: 'ocean', liveCounter: false, blurb: 'Polyatomic groups like SO₄ and NO₃. Every box is blank.' }
];

export const PRACTICE_WORLD = { n: 0, key: 'custom', name: 'Practice Lab', theme: 'lab', liveCounter: true, blurb: 'Your own equations.' };

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const TYPES = ['synthesis', 'decomposition', 'single replacement', 'double replacement', 'combustion'];

function cleanText(value, max) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '';
}

function isFormulaList(list) {
  return Array.isArray(list) && list.length > 0 && list.length <= 6 && list.every((f) => typeof f === 'string' && tryParseFormula(f).ok);
}

/* Turn one raw entry into a gate equation, or return { warning }. */
function prepareEntry(raw) {
  if (!raw || typeof raw !== 'object') return { warning: 'An entry is not an object.' };
  const id = typeof raw.id === 'string' && ID_RE.test(raw.id) ? raw.id : null;
  if (!id) return { warning: 'An entry has a missing or odd id.' };
  if (!Number.isInteger(raw.world) || raw.world < 1 || raw.world > WORLDS.length) return { warning: `${id}: world must be 1–${WORLDS.length}.` };
  if (!isFormulaList(raw.reactants) || !isFormulaList(raw.products)) return { warning: `${id}: a formula could not be read.` };
  const reactants = raw.reactants.map((f) => f.trim());
  const products = raw.products.map((f) => f.trim());
  const n = reactants.length + products.length;
  const solved = balance(reactants, products);
  if (!solved.ok) return { warning: `${id}: ${solved.message}` };
  let answer = solved.coefficients;
  let warning = null;
  const eq = { reactants, products };
  if (Array.isArray(raw.coefficients) && raw.coefficients.length === n) {
    const r = check(eq, raw.coefficients);
    if (r.correct) answer = raw.coefficients.slice();
    else warning = `${id}: listed coefficients are not the lowest balanced numbers; using ${answer.join(', ')}.`;
  } else {
    warning = `${id}: coefficients missing; using ${answer.join(', ')}.`;
  }
  if (Math.max(...answer) > MAX_COEFFICIENT) return { warning: `${id}: needs a coefficient above ${MAX_COEFFICIENT}.` };
  const given = Array.isArray(raw.given) && raw.given.length === n ? raw.given.map((g) => (g === 1 || g === true ? 1 : 0)) : new Array(n).fill(0);
  return {
    eq: {
      id,
      world: raw.world,
      type: TYPES.includes(raw.type) ? raw.type : cleanText(raw.type, 30),
      name: cleanText(raw.name, 80),
      reactants,
      products,
      coefficients: answer,
      given,
      boss: false
    },
    warning
  };
}

/*
  loadEquations(window.BQ_EQUATIONS) ->
    { byWorld: { 1:[eq...], 2:[...], ... }, warnings: [...], error: string|null }
  The last entry of each world is always its boss gate.
*/
export function loadEquations(raw) {
  const byWorld = {};
  WORLDS.forEach((w) => {
    byWorld[w.n] = [];
  });
  const warnings = [];
  if (!Array.isArray(raw)) {
    return { byWorld, warnings, error: "The equation list (equations.js) didn't load. Try reloading the page." };
  }
  const seen = new Set();
  for (const entry of raw) {
    const r = prepareEntry(entry);
    if (r.warning) warnings.push(r.warning);
    if (!r.eq) continue;
    if (seen.has(r.eq.id)) {
      warnings.push(`${r.eq.id}: duplicate id skipped.`);
      continue;
    }
    seen.add(r.eq.id);
    byWorld[r.eq.world].push(r.eq);
  }
  for (const n in byWorld) {
    const list = byWorld[n];
    list.forEach((eq, i) => {
      eq.boss = i === list.length - 1;
    });
  }
  return { byWorld, warnings, error: null };
}

/*
  parseCustom(text) -> { gates:[eq...], problems:[{ lineNo, text, reason }] }
  One equation per line; each is auto-balanced. All coefficients are blank.
*/
export function parseCustom(text) {
  const gates = [];
  const problems = [];
  const lines = String(text || '').split(/\r?\n/);
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const shown = trimmed.length > 60 ? trimmed.slice(0, 57) + '…' : trimmed;
    if (gates.length >= MAX_CUSTOM) {
      problems.push({ lineNo: idx + 1, text: shown, reason: `Only the first ${MAX_CUSTOM} equations are used.` });
      return;
    }
    const parsed = parseEquationLine(trimmed);
    if (!parsed) return;
    if (!parsed.ok) {
      problems.push({ lineNo: idx + 1, text: shown, reason: parsed.error });
      return;
    }
    const solved = balance(parsed.reactants, parsed.products);
    if (!solved.ok) {
      problems.push({ lineNo: idx + 1, text: shown, reason: solved.message });
      return;
    }
    if (Math.max(...solved.coefficients) > MAX_COEFFICIENT) {
      problems.push({ lineNo: idx + 1, text: shown, reason: `It needs a coefficient bigger than ${MAX_COEFFICIENT}, which is too big for this game.` });
      return;
    }
    const n = parsed.reactants.length + parsed.products.length;
    gates.push({
      id: `custom-${gates.length + 1}`,
      world: 0,
      type: '',
      name: '',
      reactants: parsed.reactants,
      products: parsed.products,
      coefficients: solved.coefficients,
      given: new Array(n).fill(0),
      boss: false
    });
  });
  if (gates.length) gates[gates.length - 1].boss = true;
  return { gates, problems };
}

export const PRACTICE_EXAMPLE = ['Fe + O2 -> Fe2O3', 'C3H8 + O2 -> CO2 + H2O', 'KClO3 -> KCl + O2', 'Al + HCl -> AlCl3 + H2', 'Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O'].join('\n');
