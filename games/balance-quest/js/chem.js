/*
  Balance Quest — chemistry logic.
  Pure functions only: no DOM, no Three.js, no storage. Everything the game decides
  about formulas, atom counts, balancing and hints lives here so the 3D game, the
  2D fallback and the test hook all agree.
*/

// ---------- Periodic table ----------

export const ELEMENT_SYMBOLS = Object.freeze((
  'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn ' +
  'Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce ' +
  'Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn ' +
  'Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl ' +
  'Mc Lv Ts Og'
).split(' '));

const SYMBOLS = new Set(ELEMENT_SYMBOLS);
const NONMETALS = new Set(['H', 'He', 'C', 'N', 'O', 'F', 'Ne', 'P', 'S', 'Cl', 'Ar', 'Se', 'Br', 'Kr', 'I', 'Xe', 'Rn', 'At', 'Ts', 'Og']);
const METALLOIDS = new Set(['B', 'Si', 'Ge', 'As', 'Sb', 'Te', 'Po']);

// Approximate atomic masses (g/mol). Only used to break ties when tilting the scale.
const MASSES = {
  H: 1.008, He: 4.003, Li: 6.94, Be: 9.012, B: 10.81, C: 12.011, N: 14.007, O: 15.999,
  F: 18.998, Ne: 20.18, Na: 22.99, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974,
  S: 32.06, Cl: 35.45, Ar: 39.95, K: 39.098, Ca: 40.078, Ti: 47.867, Cr: 51.996,
  Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, Br: 79.904,
  Sr: 87.62, Ag: 107.87, Sn: 118.71, I: 126.9, Ba: 137.33, Pt: 195.08, Au: 196.97,
  Hg: 200.59, Pb: 207.2, U: 238.03
};

export function isElement(symbol) {
  return SYMBOLS.has(symbol);
}

export function isMetal(symbol) {
  return SYMBOLS.has(symbol) && !NONMETALS.has(symbol) && !METALLOIDS.has(symbol);
}

// ---------- Formula parsing ----------

export class FormulaError extends Error {
  constructor(message, formula) {
    super(message);
    this.name = 'FormulaError';
    this.formula = formula;
  }
}

const MAX_FORMULA_LENGTH = 60;
const MAX_SUBSCRIPT = 99;
const MAX_DEPTH = 4;
const HYDRATE_DOTS = /[·•*]/;

/*
  parseFormulaTree('Al2(SO4)3') ->
    [ {el:'Al', n:2}, {group:[{el:'S',n:1},{el:'O',n:4}], n:3, text:'SO4'} ]
  Throws FormulaError with a student-friendly message when the formula is not valid.
*/
export function parseFormulaTree(str) {
  if (typeof str !== 'string') throw new FormulaError('Missing formula.', String(str));
  const s = str.trim();
  if (!s) throw new FormulaError('Missing formula.', s);
  if (s.length > MAX_FORMULA_LENGTH) throw new FormulaError('That formula is too long.', s);
  if (/\s/.test(s)) throw new FormulaError(`"${s}" has a space inside it. Write a formula without spaces, like Fe2O3.`, s);

  const parts = s.split(HYDRATE_DOTS);
  const items = [];
  parts.forEach((part, idx) => {
    let body = part;
    let mult = 1;
    if (idx > 0) {
      const m = /^(\d+)(.*)$/.exec(part);
      if (m) {
        mult = Number(m[1]);
        body = m[2];
        if (mult < 1 || mult > MAX_SUBSCRIPT) throw new FormulaError(`The number in "${s}" is out of range.`, s);
      }
    }
    if (!body) throw new FormulaError(`"${s}" has an empty part.`, s);
    const tree = parsePart(body, s);
    if (idx === 0) items.push(...tree);
    else items.push({ group: tree, n: mult, text: body, hydrate: true });
  });
  return items;
}

function parsePart(body, whole) {
  let i = 0;

  function readNumber() {
    const start = i;
    while (i < body.length && body[i] >= '0' && body[i] <= '9') i++;
    if (i === start) return 1;
    const digits = body.slice(start, i);
    const n = Number(digits);
    if (n === 0 || digits[0] === '0') throw new FormulaError(`A subscript in "${whole}" can't be 0 or start with 0.`, whole);
    if (n > MAX_SUBSCRIPT) throw new FormulaError(`A subscript in "${whole}" is too big.`, whole);
    return n;
  }

  function group(depth, closer) {
    const out = [];
    while (i < body.length) {
      const ch = body[i];
      if (ch === '(' || ch === '[') {
        if (depth >= MAX_DEPTH) throw new FormulaError(`Too many parentheses inside "${whole}".`, whole);
        const close = ch === '(' ? ')' : ']';
        const openAt = i;
        i++;
        const inner = group(depth + 1, close);
        if (body[i] !== close) throw new FormulaError(`A "${ch}" in "${whole}" is missing its "${close}".`, whole);
        i++;
        if (!inner.length) throw new FormulaError(`"${whole}" has empty parentheses.`, whole);
        const text = body.slice(openAt + 1, i - 1);
        out.push({ group: inner, n: readNumber(), text });
      } else if (ch === ')' || ch === ']') {
        if (ch !== closer) throw new FormulaError(`"${whole}" has a "${ch}" without a matching opening bracket.`, whole);
        return out;
      } else if (ch >= 'A' && ch <= 'Z') {
        let sym = ch;
        i++;
        if (i < body.length && body[i] >= 'a' && body[i] <= 'z') {
          sym += body[i];
          i++;
        }
        if (i < body.length && body[i] >= 'a' && body[i] <= 'z') {
          throw new FormulaError(`"${sym}${body[i]}…" in "${whole}" is not an element symbol. Symbols have one capital letter and at most one small letter.`, whole);
        }
        if (!SYMBOLS.has(sym)) {
          throw new FormulaError(`"${sym}" is not an element symbol.`, whole);
        }
        out.push({ el: sym, n: readNumber() });
      } else if (ch >= 'a' && ch <= 'z') {
        throw new FormulaError(`Element symbols start with a capital letter (Fe, not fe). Check "${whole}".`, whole);
      } else if (ch >= '0' && ch <= '9') {
        throw new FormulaError(`A number in "${whole}" is in the wrong place. Subscripts go right after a symbol, like H2O.`, whole);
      } else {
        throw new FormulaError(`"${ch}" can't be used in a formula ("${whole}").`, whole);
      }
    }
    if (closer) throw new FormulaError(`A bracket in "${whole}" is missing its "${closer}".`, whole);
    return out;
  }

  return group(0, null);
}

function flattenInto(items, mult, out) {
  for (const it of items) {
    if (it.el) out[it.el] = (out[it.el] || 0) + it.n * mult;
    else flattenInto(it.group, mult * it.n, out);
  }
  return out;
}

const formulaCache = new Map();

/* parseFormula('Ca(OH)2') -> { Ca: 1, O: 2, H: 2 }  (keys in order of first appearance) */
export function parseFormula(str) {
  const key = typeof str === 'string' ? str.trim() : str;
  const hit = formulaCache.get(key);
  if (hit) return { ...hit };
  const counts = flattenInto(parseFormulaTree(str), 1, {});
  if (formulaCache.size > 500) formulaCache.clear();
  formulaCache.set(key, counts);
  return { ...counts };
}

/* Same as parseFormula but never throws: { ok, counts } or { ok:false, error } */
export function tryParseFormula(str) {
  try {
    return { ok: true, counts: parseFormula(str) };
  } catch (err) {
    return { ok: false, error: err instanceof FormulaError ? err.message : 'That formula could not be read.' };
  }
}

export function atomTotal(formula) {
  const c = parseFormula(formula);
  let t = 0;
  for (const k in c) t += c[k];
  return t;
}

export function formulaMass(formula) {
  const c = parseFormula(formula);
  let m = 0;
  for (const k in c) m += (MASSES[k] || 50) * c[k];
  return m;
}

/*
  Split a formula into display pieces: digits after a symbol or ')' become subscripts.
  formulaParts('Al2(SO4)3') -> [{text:'Al'},{text:'2',sub:true},{text:'(SO'},{text:'4',sub:true},...]
*/
export function formulaParts(str) {
  const s = String(str);
  const parts = [];
  let prev = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const isDigit = ch >= '0' && ch <= '9';
    const sub = isDigit && prev !== '' && /[A-Za-z)\]]/.test(prev);
    const subRun = isDigit && parts.length && parts[parts.length - 1].sub && /[0-9]/.test(prev);
    const isSub = sub || subRun;
    const last = parts[parts.length - 1];
    if (last && !!last.sub === isSub) last.text += ch;
    else parts.push(isSub ? { text: ch, sub: true } : { text: ch });
    prev = ch;
  }
  return parts;
}

const SUB_DIGITS = '₀₁₂₃₄₅₆₇₈₉';

/* 'H2O' -> 'H₂O' (for canvas labels and plain-text messages) */
export function prettyFormula(str) {
  return formulaParts(str).map((p) => (p.sub ? p.text.replace(/[0-9]/g, (d) => SUB_DIGITS[d]) : p.text)).join('');
}

// ---------- Equations ----------

function speciesOf(equation) {
  return equation.reactants.concat(equation.products);
}

function isPosInt(n) {
  return typeof n === 'number' && Number.isInteger(n) && n > 0;
}

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

export function gcdList(list) {
  let g = 0;
  for (const n of list) g = gcd(g, n);
  return g;
}

/*
  tally({reactants, products}, coefficients) ->
    { H: {left: 4, right: 4}, O: {left: 2, right: 2} }   (elements in order of first appearance)
  A missing or invalid coefficient counts as 0.
*/
export function tally(equation, coefficients) {
  const species = speciesOf(equation);
  const nR = equation.reactants.length;
  const out = {};
  species.forEach((f, i) => {
    const counts = parseFormula(f);
    const c = isPosInt(coefficients[i]) ? coefficients[i] : 0;
    for (const el in counts) {
      if (!out[el]) out[el] = { left: 0, right: 0 };
      if (i < nR) out[el].left += c * counts[el];
      else out[el].right += c * counts[el];
    }
  });
  return out;
}

/*
  check(equation, coefficients) ->
    { valid, balanced, lowestTerms, gcd, correct, perElement:[{element,left,right,equal}], mismatched:[...] }
  correct = balanced AND lowest terms (the only state that opens a gate).
*/
export function check(equation, coefficients) {
  const species = speciesOf(equation);
  const valid = Array.isArray(coefficients) && coefficients.length === species.length && coefficients.every(isPosInt);
  const t = tally(equation, coefficients || []);
  const perElement = Object.keys(t).map((el) => ({
    element: el,
    left: t[el].left,
    right: t[el].right,
    equal: t[el].left === t[el].right
  }));
  const mismatched = perElement.filter((e) => !e.equal).map((e) => e.element);
  const balanced = valid && mismatched.length === 0;
  const g = valid ? gcdList(coefficients) : 0;
  const lowestTerms = valid && g === 1;
  return { valid, balanced, lowestTerms, gcd: g, correct: balanced && lowestTerms, perElement, mismatched };
}

// ---------- Exact rational balancing ----------

class TooLarge extends Error {}

function frac(n, d = 1) {
  if (d === 0) throw new Error('divide by zero');
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  n /= g;
  d /= g;
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) throw new TooLarge();
  return [n, d];
}
const fsub = (a, b) => frac(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const fmul = (a, b) => frac(a[0] * b[0], a[1] * b[1]);
const fdiv = (a, b) => frac(a[0] * b[1], a[1] * b[0]);

/*
  balance(['Fe','O2'], ['Fe2O3']) -> { ok:true, coefficients:[4,3,2] }
  or { ok:false, reason, message, ... } where reason is one of:
    'empty-side' | 'invalid-formula' | 'one-side' | 'no-solution' | 'multiple' | 'too-large'
*/
export function balance(reactants, products) {
  if (!Array.isArray(reactants) || !Array.isArray(products) || !reactants.length || !products.length) {
    return { ok: false, reason: 'empty-side', message: 'Each side of the arrow needs at least one formula.' };
  }
  const species = reactants.concat(products);
  const parsed = [];
  for (const f of species) {
    const r = tryParseFormula(f);
    if (!r.ok) return { ok: false, reason: 'invalid-formula', formula: String(f), message: r.error };
    parsed.push(r.counts);
  }

  // Every element must show up on both sides.
  const nR = reactants.length;
  const elements = [];
  const side = {};
  parsed.forEach((counts, j) => {
    for (const el in counts) {
      if (!side[el]) {
        side[el] = { left: false, right: false };
        elements.push(el);
      }
      if (j < nR) side[el].left = true;
      else side[el].right = true;
    }
  });
  for (const el of elements) {
    if (!side[el].left || !side[el].right) {
      const where = side[el].left ? 'left (reactant)' : 'right (product)';
      return {
        ok: false,
        reason: 'one-side',
        element: el,
        message: `${el} is only on the ${where} side, so this can't be balanced. Atoms can't appear or disappear.`
      };
    }
  }

  try {
    // Matrix: one row per element, one column per species (products negative).
    const rows = elements.map((el) => species.map((_, j) => frac((parsed[j][el] || 0) * (j < nR ? 1 : -1))));
    const nCols = species.length;
    const pivotCols = [];
    let r = 0;
    for (let c = 0; c < nCols && r < rows.length; c++) {
      let p = r;
      while (p < rows.length && rows[p][c][0] === 0) p++;
      if (p === rows.length) continue;
      [rows[r], rows[p]] = [rows[p], rows[r]];
      const pv = rows[r][c];
      rows[r] = rows[r].map((v) => fdiv(v, pv));
      for (let k = 0; k < rows.length; k++) {
        if (k === r || rows[k][c][0] === 0) continue;
        const factor = rows[k][c];
        rows[k] = rows[k].map((v, j) => fsub(v, fmul(factor, rows[r][j])));
      }
      pivotCols.push(c);
      r++;
    }

    const free = nCols - pivotCols.length;
    if (free === 0) {
      return { ok: false, reason: 'no-solution', message: "These formulas can't be balanced. Check each formula and which side it is on." };
    }
    if (free > 1) {
      return {
        ok: false,
        reason: 'multiple',
        message: 'This can be balanced in more than one way, so it is really two reactions mixed together. Try splitting it into two equations.'
      };
    }

    const freeCol = [...Array(nCols).keys()].find((c) => !pivotCols.includes(c));
    const sol = new Array(nCols).fill(null);
    sol[freeCol] = frac(1);
    pivotCols.forEach((c, row) => {
      sol[c] = frac(-rows[row][freeCol][0], rows[row][freeCol][1]);
    });

    let lcm = 1;
    for (const v of sol) {
      lcm = (lcm / gcd(lcm, v[1])) * v[1];
      if (!Number.isSafeInteger(lcm)) throw new TooLarge();
    }
    let ints = sol.map((v) => (v[0] * lcm) / v[1]);
    if (ints.every((n) => n <= 0)) ints = ints.map((n) => -n);
    if (!ints.every((n) => n > 0)) {
      return {
        ok: false,
        reason: 'no-solution',
        message: "There's no way to balance this with all positive numbers. Check the formulas and which side each one is on."
      };
    }
    const g = gcdList(ints);
    return { ok: true, coefficients: ints.map((n) => n / g) };
  } catch (err) {
    if (err instanceof TooLarge) return { ok: false, reason: 'too-large', message: 'The numbers needed are too big for this game.' };
    throw err;
  }
}

// ---------- Typed equations (custom practice) ----------

const ARROW = /\s*(?:-+>|→|⟶|⇒|=+>|=)\s*/;
const STATE = /\((?:s|l|g|aq)\)$/i;

/*
  parseEquationLine('Fe + O2 -> Fe2O3') -> { ok:true, reactants:['Fe','O2'], products:['Fe2O3'] }
  Accepts ->, →, = . Ignores coefficients the student typed and state symbols like (aq).
  Returns null for a blank line.
*/
export function parseEquationLine(line) {
  const text = String(line == null ? '' : line).trim();
  if (!text) return null;
  if (text.length > 200) return { ok: false, error: 'That line is too long.' };
  const sides = text.split(ARROW);
  if (sides.length !== 2) {
    return { ok: false, error: sides.length < 2 ? 'Put an arrow (->) between the reactants and the products.' : 'Use only one arrow per equation.' };
  }
  const out = [];
  for (const sideText of sides) {
    if (!sideText.trim()) return { ok: false, error: 'Each side of the arrow needs at least one formula.' };
    const list = [];
    for (const raw of sideText.split('+')) {
      let term = raw.trim().replace(STATE, '').trim();
      term = term.replace(/^\d+\s*/, '');
      if (!term) return { ok: false, error: 'Something is missing next to a "+".' };
      const r = tryParseFormula(term);
      if (!r.ok) return { ok: false, error: r.error };
      list.push(term);
    }
    out.push(list);
  }
  return { ok: true, reactants: out[0], products: out[1] };
}

// ---------- Hints ----------

const KNOWN_GROUPS = ['SO4', 'SO3', 'NO3', 'NO2', 'PO4', 'CO3', 'ClO3', 'ClO4', 'NH4', 'OH', 'CrO4', 'MnO4', 'C2H3O2', 'HCO3', 'CN'];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// How many copies of a polyatomic group a formula contains (0 if none).
function groupUnits(formula, g) {
  let units = 0;
  let rest = formula.replace(new RegExp('\\(' + escapeRe(g) + '\\)(\\d*)', 'g'), (_, n) => {
    units += n ? Number(n) : 1;
    return '#';
  });
  if (g === 'OH') {
    // Only a metal hydroxide like NaOH counts; CH3OH is not a hydroxide group.
    if (/^[A-Z][a-z]?OH$/.test(rest) && isMetal(rest.replace(/OH$/, ''))) units += 1;
    return units;
  }
  const bare = new RegExp(escapeRe(g) + '(?![a-z0-9])', 'g');
  rest.replace(bare, () => {
    units += 1;
    return '#';
  });
  return units;
}

/* Polyatomic groups that appear unchanged on both sides, e.g. ['SO4']. */
export function polyatomicGroups(equation) {
  const candidates = new Set(KNOWN_GROUPS);
  for (const f of speciesOf(equation)) {
    for (const m of String(f).matchAll(/\(([^()]+)\)/g)) candidates.add(m[1]);
  }
  const out = [];
  for (const g of candidates) {
    const left = equation.reactants.some((f) => groupUnits(f, g) > 0);
    const right = equation.products.some((f) => groupUnits(f, g) > 0);
    if (left && right) out.push(g);
  }
  return out;
}

/* Order to balance things in: metals, polyatomic groups, other nonmetals, then H, then O. */
export function strategyOrder(equation) {
  const elements = [];
  for (const f of speciesOf(equation)) {
    for (const el in parseFormula(f)) if (!elements.includes(el)) elements.push(el);
  }
  const metals = elements.filter((e) => isMetal(e)).map((e) => ({ kind: 'element', name: e }));
  const groups = polyatomicGroups(equation).map((g) => ({ kind: 'group', name: g }));
  const others = elements.filter((e) => !isMetal(e) && e !== 'H' && e !== 'O').map((e) => ({ kind: 'element', name: e }));
  const h = elements.includes('H') ? [{ kind: 'element', name: 'H' }] : [];
  const o = elements.includes('O') ? [{ kind: 'element', name: 'O' }] : [];
  return metals.concat(groups, others, h, o);
}

function sideCount(equation, coefs, item) {
  const nR = equation.reactants.length;
  let left = 0;
  let right = 0;
  speciesOf(equation).forEach((f, i) => {
    const c = isPosInt(coefs[i]) ? coefs[i] : 1;
    const n = item.kind === 'group' ? groupUnits(f, item.name) : parseFormula(f)[item.name] || 0;
    if (i < nR) left += c * n;
    else right += c * n;
  });
  return { left, right };
}

/*
  What should the student fix next?
  -> { kind:'element'|'group', name, left, right }   first unbalanced item in strategy order
  -> { kind:'simplify', divisor }                    balanced but not lowest terms
  -> { kind:'done' }                                  already correct
  Blank coefficients are treated as 1.
*/
export function hintTarget(equation, coefficients) {
  const coefs = speciesOf(equation).map((_, i) => (isPosInt(coefficients[i]) ? coefficients[i] : 1));
  for (const item of strategyOrder(equation)) {
    const { left, right } = sideCount(equation, coefs, item);
    if (left !== right) return { kind: item.kind, name: item.name, left, right };
  }
  const g = gcdList(coefs);
  if (g > 1) return { kind: 'simplify', divisor: g };
  return { kind: 'done' };
}

/* Does a species contain this element or group? */
export function speciesHas(formula, item) {
  if (!item) return false;
  if (item.kind === 'group') return groupUnits(formula, item.name) > 0;
  if (item.kind === 'element') return (parseFormula(formula)[item.name] || 0) > 0;
  return false;
}

/*
  Pick which coefficient to reveal for the level-3 hint.
  locked[i] = true for boxes the student can't change (given or already revealed).
  Prefers a wrong box in a formula that holds the element the hint points at.
  Returns an index, or -1 if every box is locked.
*/
export function pickRevealIndex(equation, coefficients, answer, locked) {
  const species = speciesOf(equation);
  const target = hintTarget(equation, coefficients);
  const open = species.map((_, i) => i).filter((i) => !locked[i]);
  if (!open.length) return -1;
  const wrong = open.filter((i) => coefficients[i] !== answer[i]);
  const focus = wrong.filter((i) => speciesHas(species[i], target));
  if (focus.length) return focus[0];
  if (wrong.length) return wrong[0];
  return open[0];
}

/*
  Signed tilt for the balance scale: > 0 means the left (reactant) pan is heavier.
  Uses total atom count; if the counts tie while the equation is still unbalanced,
  falls back to mass so the scale never looks level when it isn't balanced.
  Returns { atomsLeft, atomsRight, sign, amount } with amount in 0..1.
*/
export function scaleTilt(equation, coefficients) {
  const nR = equation.reactants.length;
  let aL = 0;
  let aR = 0;
  let mL = 0;
  let mR = 0;
  speciesOf(equation).forEach((f, i) => {
    const c = isPosInt(coefficients[i]) ? coefficients[i] : 0;
    const a = atomTotal(f) * c;
    const m = formulaMass(f) * c;
    if (i < nR) {
      aL += a;
      mL += m;
    } else {
      aR += a;
      mR += m;
    }
  });
  if (aL === 0 && aR === 0) return { atomsLeft: 0, atomsRight: 0, sign: 0, amount: 0 };
  const t = tally(equation, coefficients);
  let balanced = true;
  for (const el in t) if (t[el].left !== t[el].right) balanced = false;
  if (balanced) return { atomsLeft: aL, atomsRight: aR, sign: 0, amount: 0 };
  let sign = Math.sign(aL - aR);
  if (sign === 0) sign = Math.sign(mL - mR) || 1;
  const biggest = Math.max(aL, aR, 1);
  const amount = Math.min(1, 0.2 + (0.8 * Math.abs(aL - aR)) / biggest);
  return { atomsLeft: aL, atomsRight: aR, sign, amount };
}
