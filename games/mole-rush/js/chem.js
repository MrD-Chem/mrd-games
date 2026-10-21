/*
  Mole Rush — chemistry helpers. Pure functions only (no DOM, no storage):
  reading formulas, counting atoms, checking balanced equations, and number
  formatting with significant figures.
*/

const SUB_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
const DOTS = '·•*';

/*
  Split an ASCII formula into plain and subscript runs.
  formulaParts('Ca(OH)2') -> [{text:'Ca(OH)', sub:false}, {text:'2', sub:true}]
  Digits right after an element or a closing bracket are subscripts; digits at the
  start of a hydrate part (CuSO4·5H2O) are a coefficient, so they stay full size.
*/
export function formulaParts(formula) {
  const s = String(formula == null ? '' : formula);
  const parts = [];
  let prevAllowsSub = false;
  const push = (ch, sub) => {
    const last = parts[parts.length - 1];
    if (last && last.sub === sub) last.text += ch;
    else parts.push({ text: ch, sub });
  };
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') {
      push(ch, prevAllowsSub);
      continue;
    }
    if (DOTS.includes(ch) || ch === '.') {
      push('·', false);
      prevAllowsSub = false;
      continue;
    }
    push(ch, false);
    prevAllowsSub = /[A-Za-z)\]]/.test(ch);
  }
  return parts;
}

/* 'H2O' -> 'H₂O' (for aria-labels, titles and plain text). */
export function formulaText(formula) {
  return formulaParts(formula)
    .map((p) => (p.sub ? p.text.replace(/[0-9]/g, (d) => SUB_DIGITS[Number(d)]) : p.text))
    .join('');
}

/*
  Count atoms: countAtoms('Ca(OH)2') -> { Ca: 1, O: 2, H: 2 }.
  Handles nested ( ) and [ ] groups and hydrate dots. Throws on anything odd.
*/
export function countAtoms(formula) {
  const s = String(formula || '').trim();
  if (!s || s.length > 60) throw new Error('Bad formula');
  const total = {};
  const pieces = s.split(/[·•*.]/);
  for (let p = 0; p < pieces.length; p++) {
    let body = pieces[p];
    let mult = 1;
    if (p > 0) {
      const m = /^(\d+)(.*)$/.exec(body);
      if (m) {
        mult = Number(m[1]);
        body = m[2];
      }
    }
    if (!body) throw new Error('Bad formula');
    const counts = parseGroup(body, { i: 0 }, 0);
    for (const k of Object.keys(counts)) total[k] = (total[k] || 0) + counts[k] * mult;
  }
  return total;
}

function readNumber(str, pos) {
  let digits = '';
  while (pos.i < str.length && str[pos.i] >= '0' && str[pos.i] <= '9') digits += str[pos.i++];
  return digits ? Number(digits) : 1;
}

function parseGroup(str, pos, depth) {
  if (depth > 4) throw new Error('Bad formula');
  const counts = {};
  const add = (k, n) => {
    counts[k] = (counts[k] || 0) + n;
  };
  while (pos.i < str.length) {
    const ch = str[pos.i];
    if (ch === '(' || ch === '[') {
      pos.i++;
      const inner = parseGroup(str, pos, depth + 1);
      const close = str[pos.i];
      if ((ch === '(' && close !== ')') || (ch === '[' && close !== ']')) throw new Error('Bad formula');
      pos.i++;
      const n = readNumber(str, pos);
      for (const k of Object.keys(inner)) add(k, inner[k] * n);
    } else if (ch === ')' || ch === ']') {
      if (depth === 0) throw new Error('Bad formula');
      return counts;
    } else if (ch >= 'A' && ch <= 'Z') {
      let sym = ch;
      pos.i++;
      if (pos.i < str.length && str[pos.i] >= 'a' && str[pos.i] <= 'z') sym += str[pos.i++];
      add(sym, readNumber(str, pos));
    } else {
      throw new Error('Bad formula');
    }
  }
  if (depth > 0) throw new Error('Bad formula');
  return counts;
}

export function tryCountAtoms(formula) {
  try {
    return countAtoms(formula);
  } catch (err) {
    return null;
  }
}

/* Molar mass from atomic masses, rounded to 2 decimals (null if an element is missing). */
export function computeMolarMass(formula, atomicMasses) {
  const counts = tryCountAtoms(formula);
  if (!counts || !atomicMasses) return null;
  let sum = 0;
  for (const k of Object.keys(counts)) {
    const m = atomicMasses[k];
    if (typeof m !== 'number' || !isFinite(m)) return null;
    sum += m * counts[k];
  }
  return Math.round(sum * 100) / 100;
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function gcdAll(list) {
  return list.reduce((g, n) => gcd(g, n), 0);
}

/*
  Atom count on each side for the given coefficients, in order of first appearance.
  -> { rows: [{ element, left, right, equal }], balanced, gcd, correct }
*/
export function checkBalance(reactants, products, coefficients) {
  const order = [];
  const left = {};
  const right = {};
  const tally = (list, offset, side) => {
    list.forEach((f, i) => {
      const counts = countAtoms(f);
      const c = coefficients[offset + i];
      for (const k of Object.keys(counts)) {
        if (!order.includes(k)) order.push(k);
        side[k] = (side[k] || 0) + counts[k] * c;
      }
    });
  };
  tally(reactants, 0, left);
  tally(products, reactants.length, right);
  const rows = order.map((k) => ({ element: k, left: left[k] || 0, right: right[k] || 0, equal: (left[k] || 0) === (right[k] || 0) }));
  const balanced = rows.every((r) => r.equal);
  const g = gcdAll(coefficients);
  return { rows, balanced, gcd: g, correct: balanced && g === 1 };
}

// ---------- Numbers ----------

/* Format with a number of significant figures, never in e-notation: (4, 3) -> '4.00'. */
export function formatSig(value, sigFigs) {
  const n = Number(value);
  if (!isFinite(n)) return '';
  const sf = Math.max(1, Math.min(8, Math.round(sigFigs || 3)));
  if (n === 0) return sf > 1 ? '0.' + '0'.repeat(sf - 1) : '0';
  const mag = Math.floor(Math.log10(Math.abs(n)));
  const decimals = sf - 1 - mag;
  if (decimals >= 0) return n.toFixed(Math.min(decimals, 10));
  const factor = Math.pow(10, -decimals);
  return String(Math.round(n / factor) * factor);
}

/* A tidy calculator-style number: drops floating-point noise. 72.08000001 -> '72.08' */
export function formatCalc(value) {
  const n = Number(value);
  if (!isFinite(n)) return '';
  const abs = Math.abs(n);
  if (abs >= 1000) return String(Math.round(n * 10) / 10);
  return String(Number(n.toPrecision(4)));
}

/* Values inside a setup: coefficients as whole numbers, molar masses with 2 decimals. */
export function formatStepValue(value, unit) {
  const n = Number(value);
  if (Number.isInteger(n) && (unit === 'mol' || n === 1)) return String(n);
  if (unit === 'g') return n.toFixed(2);
  return String(n);
}
