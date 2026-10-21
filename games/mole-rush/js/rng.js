/*
  Mole Rush — seeded randomness.
  The same race code must always give the same questions in the same order, on every
  device, so classmates (and, later, online rooms) can race on identical sets.
  Nothing here uses Math.random except randomCode(), which only invents a new code.
*/

/* mulberry32: a tiny, fast PRNG. mulberry32(seed)() -> number in [0, 1) */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* 32-bit string hash (FNV-1a with a final avalanche, so similar codes spread apart). */
export function hashString(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/* Mix a seed with labels to get an independent sub-seed: deriveSeed(seed, 'map', 1) */
export function deriveSeed(seed, ...parts) {
  return hashString((seed >>> 0) + ':' + parts.join(':'));
}

export function randInt(rng, n) {
  return Math.floor(rng() * n);
}

/* Fisher–Yates on a copy. */
export function seededShuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/*
  Race codes. Students type them by hand, so case, spaces and dashes don't matter:
  "mole-38", "MOLE 38" and "Mole38" are all the same code, shown as "MOLE-38".
  -> { key: 'MOLE38', display: 'MOLE-38' } or null when it can't be a code.
*/
export const CODE_MIN = 2;
export const CODE_MAX = 12;

export function normalizeCode(input) {
  if (typeof input !== 'string') return null;
  const keyStr = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (keyStr.length < CODE_MIN || keyStr.length > CODE_MAX) return null;
  const m = /^([A-Z]+)([0-9]+)$/.exec(keyStr);
  return { key: keyStr, display: m ? `${m[1]}-${m[2]}` : keyStr };
}

/* The seed for a race code (any spelling of the same code gives the same seed). */
export function codeToSeed(code) {
  const n = normalizeCode(code);
  return hashString('mole-rush:' + (n ? n.key : String(code)));
}

const WORDS = ['MOLE', 'ATOM', 'GRAM', 'BOND', 'MASS', 'IONS', 'ACID', 'BASE', 'SALT', 'FLASK', 'RATIO', 'YIELD'];

/* A fresh, easy-to-say code for a practice round, like "ATOM-52". */
export function randomCode() {
  let r1;
  let r2;
  try {
    const buf = new Uint32Array(2);
    window.crypto.getRandomValues(buf);
    r1 = buf[0];
    r2 = buf[1];
  } catch (err) {
    r1 = Math.floor(Math.random() * 4294967296);
    r2 = Math.floor(Math.random() * 4294967296);
  }
  return `${WORDS[r1 % WORDS.length]}-${10 + (r2 % 90)}`;
}
