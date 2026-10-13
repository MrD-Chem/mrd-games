/*
  Balance Quest — ball-and-stick layouts.
  Turns a formula into atom positions + bonds for the 3D pans (no DOM, no Three.js).
  It is a friendly "toy model": it guesses a sensible bonding tree (center atom,
  carbon chains, metal-oxygen chains, polyatomic groups) and relaxes it with a small
  spring layout. Lone-pair "ghosts" give water its bend and ammonia its pyramid.
*/

import { parseFormulaTree, isMetal } from './chem.js';

// ---------- Colors (CPK-like) and sizes ----------

const COLORS = {
  H: 0xf4f6f8, O: 0xe5322d, C: 0x3b3f45, N: 0x3a66e8, Cl: 0x2fc65a, F: 0x9be870,
  Br: 0x9b3a2a, I: 0x8a3fc2, S: 0xf4cf2a, P: 0xff8a1f, Si: 0xd9b48f, B: 0xf3a6a6,
  Na: 0x9b5cf0, K: 0x7d3fd0, Li: 0xb98af5, Rb: 0x6f2fb8, Cs: 0x5d2a9e,
  Ca: 0xdcdcd6, Mg: 0xc4ccd4, Al: 0xaeb9c8, Ba: 0xc9cbb8, Sr: 0xd2c9b8, Be: 0xc8d6c2,
  Fe: 0xc06a3e, Cu: 0xd27d46, Ag: 0xc9ccd2, Au: 0xf2c53d, Zn: 0x8f9bb3, Pb: 0x5d6270,
  Sn: 0x9aa4ab, Ni: 0x7fb08c, Co: 0x6d7fd6, Cr: 0x8a99c7, Mn: 0x9c7ac7, Hg: 0xb8bad0,
  Pt: 0xd0d0da, Ti: 0xa7adb5
};
const DEFAULT_COLOR = 0xf06ab0;

export function atomColor(el) {
  return COLORS[el] !== undefined ? COLORS[el] : DEFAULT_COLOR;
}

export function atomRadius(el) {
  if (el === 'H') return 0.24;
  if (isMetal(el)) return 0.42;
  if (el === 'C' || el === 'N' || el === 'O' || el === 'F') return 0.33;
  return 0.38;
}

// ---------- Bonding tree ----------

const CENTER_PRIORITY = ['C', 'Si', 'B', 'P', 'N', 'S', 'Se', 'As', 'Cl', 'Br', 'I', 'F'];
const HALOGENS = new Set(['F', 'Cl', 'Br', 'I', 'At']);
const VALENCE = { H: 1, C: 4, Si: 4, N: 3, P: 3, B: 3, S: 2, Se: 2, O: 2, F: 1, Cl: 1, Br: 1, I: 1 };
const MAX_BONDS = { C: 4, Si: 4, N: 4, P: 5, B: 4, S: 6, Se: 6, Cl: 7, Br: 7, I: 7, O: 2, H: 1 };

function flatSymbols(items, out = []) {
  for (const it of items) {
    if (it.el) for (let k = 0; k < it.n; k++) out.push(it.el);
    else for (let k = 0; k < it.n; k++) flatSymbols(it.group, out);
  }
  return out;
}

class Graph {
  constructor() {
    this.el = [];
    this.nb = [];
    this.bonds = [];
  }
  add(el) {
    this.el.push(el);
    this.nb.push([]);
    return this.el.length - 1;
  }
  bond(a, b) {
    if (a === b || this.nb[a].includes(b)) return;
    this.nb[a].push(b);
    this.nb[b].push(a);
    this.bonds.push([a, b]);
  }
  deg(i) {
    return this.nb[i].length;
  }
}

// Pick the atom (from candidates) with the most room left; ties -> earliest.
function roomiest(g, candidates, limitOf) {
  let best = -1;
  let bestRoom = -Infinity;
  for (const i of candidates) {
    const room = limitOf(i) - g.deg(i);
    if (room > bestRoom) {
      bestRoom = room;
      best = i;
    }
  }
  return { index: best, room: bestRoom };
}

/* Build atoms + bonds for a flat list of symbols. Returns the indices it created. */
function buildCluster(g, symbols) {
  const made = symbols.map((s) => g.add(s));
  if (made.length === 1) return made;

  const kinds = [...new Set(symbols)];
  if (kinds.length === 1) {
    // Elements: H2, O2, O3, P4, S8 ...
    if (made.length === 4) {
      for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) g.bond(made[a], made[b]);
    } else {
      for (let k = 1; k < made.length; k++) g.bond(made[k - 1], made[k]);
      if (made.length >= 5) g.bond(made[made.length - 1], made[0]);
    }
    return made;
  }

  const of = (el) => made.filter((i) => g.el[i] === el);
  const metals = made.filter((i) => isMetal(g.el[i]));
  const oxygens = of('O');
  const hydrogens = of('H');
  let center = CENTER_PRIORITY.find((e) => symbols.includes(e));
  if (center && HALOGENS.has(center) && metals.length) center = null;

  if (center) {
    // Backbone (a chain if there are several, e.g. carbon chains).
    const spine = of(center);
    for (let k = 1; k < spine.length; k++) g.bond(spine[k - 1], spine[k]);
    const spineLimit = (i) => MAX_BONDS[g.el[i]] || 4;
    const others = made.filter((i) => !spine.includes(i) && g.el[i] !== 'O' && g.el[i] !== 'H' && !isMetal(g.el[i]));
    for (const o of oxygens.concat(others)) {
      const fewest = spine.reduce((a, b) => (g.deg(b) < g.deg(a) ? b : a));
      if (g.deg(fewest) < spineLimit(fewest)) g.bond(o, fewest);
      else g.bond(o, oxygens.find((x) => x !== o) ?? spine[0]);
    }
    for (const m of metals) {
      const site = oxygens.find((o) => g.deg(o) === 1 && !g.nb[o].some((n) => isMetal(g.el[n])));
      g.bond(m, site !== undefined ? site : spine[spine.length - 1]);
    }
    for (const h of hydrogens) {
      let pick = roomiest(g, spine, (i) => VALENCE[g.el[i]] || 4);
      if (pick.room <= 0) {
        const sites = oxygens.concat(others).filter((i) => g.deg(i) < (VALENCE[g.el[i]] || 1));
        pick = sites.length ? { index: sites[0], room: 1 } : roomiest(g, spine, () => 6);
      }
      g.bond(h, pick.index);
    }
    return made;
  }

  const halogens = made.filter((i) => HALOGENS.has(g.el[i]));
  if (halogens.length && metals.length) {
    // Salts like CaCl2, FeCl3, NaCl.
    if (metals.length === 1) {
      for (const x of halogens.concat(oxygens, hydrogens)) g.bond(x, metals[0]);
    } else {
      alternate(g, metals, halogens);
      for (const x of oxygens.concat(hydrogens)) g.bond(x, metals[0]);
    }
    return made;
  }

  if (oxygens.length && metals.length) {
    // Oxides and hydroxides: Fe2O3 -> O-Fe-O-Fe-O, Na2O -> Na-O-Na.
    alternate(g, metals, oxygens);
    for (const h of hydrogens) {
      const o = oxygens.find((x) => g.deg(x) < 2) ?? oxygens[0];
      g.bond(h, o);
    }
    return made;
  }

  if (oxygens.length) {
    // H2O, H2O2: oxygen backbone with H on the ends.
    for (let k = 1; k < oxygens.length; k++) g.bond(oxygens[k - 1], oxygens[k]);
    for (const h of hydrogens) g.bond(h, roomiest(g, oxygens, () => 2).index);
    const rest = made.filter((i) => !oxygens.includes(i) && !hydrogens.includes(i));
    for (const r of rest) g.bond(r, oxygens[0]);
    return made;
  }

  // Anything else: a simple chain.
  for (let k = 1; k < made.length; k++) g.bond(made[k - 1], made[k]);
  return made;
}

// Chain two kinds of atoms so they alternate; a single "b" becomes the center of a star.
function alternate(g, a, b) {
  let more = a.length >= b.length ? a : b;
  let fewer = more === a ? b : a;
  if (fewer.length === 1) {
    for (const x of more) g.bond(x, fewer[0]);
    return;
  }
  const seq = [];
  for (let k = 0; k < more.length; k++) {
    seq.push(more[k]);
    if (k < fewer.length) seq.push(fewer[k]);
  }
  for (let k = 1; k < seq.length; k++) g.bond(seq[k - 1], seq[k]);
}

// Atom of a group that bonds to the rest of the molecule (a free O if possible).
function linkerOf(g, members) {
  const freeO = members.find((i) => g.el[i] === 'O' && g.deg(i) < 2);
  if (freeO !== undefined) return freeO;
  const heavy = members.filter((i) => g.el[i] !== 'H');
  return heavy.length ? heavy.reduce((a, b) => (g.deg(b) < g.deg(a) ? b : a)) : members[0];
}

function buildGraph(formula) {
  const tree = parseFormulaTree(formula);
  const g = new Graph();
  const pool = [];
  const groups = [];
  for (const it of tree) {
    if (it.el) for (let k = 0; k < it.n; k++) pool.push(it.el);
    else for (let k = 0; k < it.n; k++) groups.push(flatSymbols(it.group));
  }
  if (!groups.length) {
    buildCluster(g, pool);
    return g;
  }
  const metalSyms = pool.filter((e) => isMetal(e));
  const restSyms = pool.filter((e) => !isMetal(e));
  const groupMembers = groups.map((syms) => buildCluster(g, syms));
  const metals = metalSyms.map((e) => g.add(e));
  if (restSyms.length) {
    const core = buildCluster(g, restSyms);
    for (const m of groupMembers) g.bond(linkerOf(g, m), linkerOf(g, core));
    for (const m of metals) g.bond(m, linkerOf(g, core));
    return g;
  }
  if (!metals.length) {
    for (let k = 1; k < groupMembers.length; k++) g.bond(linkerOf(g, groupMembers[k - 1]), linkerOf(g, groupMembers[k]));
    return g;
  }
  if (metals.length === 1) {
    for (const m of groupMembers) g.bond(linkerOf(g, m), metals[0]);
    return g;
  }
  // Ca3(PO4)2 -> Ca-PO4-Ca-PO4-Ca ; Al2(SO4)3 -> SO4-Al-SO4-Al-SO4
  const units = [];
  const more = metals.length >= groupMembers.length ? 'm' : 'g';
  const nMore = Math.max(metals.length, groupMembers.length);
  for (let k = 0; k < nMore; k++) {
    if (more === 'm') {
      if (k < metals.length) units.push({ m: metals[k] });
      if (k < groupMembers.length) units.push({ g: groupMembers[k] });
    } else {
      if (k < groupMembers.length) units.push({ g: groupMembers[k] });
      if (k < metals.length) units.push({ m: metals[k] });
    }
  }
  for (let k = 1; k < units.length; k++) {
    const a = units[k - 1].m !== undefined ? units[k - 1].m : linkerOf(g, units[k - 1].g);
    const b = units[k].m !== undefined ? units[k].m : linkerOf(g, units[k].g);
    g.bond(a, b);
  }
  return g;
}

// ---------- Spring layout ----------

function lonePairs(el, deg) {
  if (deg < 2) return 0;
  if (el === 'O' && deg === 2) return 2;
  if (el === 'N' && deg <= 3) return 1;
  if ((el === 'S' || el === 'Se') && deg === 2) return 2;
  return 0;
}

function relax(g) {
  const n = g.el.length;
  const radius = g.el.map(atomRadius);
  const ghostOf = [];
  for (let i = 0; i < n; i++) {
    const lp = lonePairs(g.el[i], g.deg(i));
    for (let k = 0; k < lp; k++) ghostOf.push(i);
  }
  const total = n + ghostOf.length;
  const pos = new Float64Array(total * 3);
  // Deterministic start: points on a spiral.
  for (let i = 0; i < total; i++) {
    const t = i + 0.5;
    const phi = Math.acos(1 - (2 * t) / (total + 1));
    const th = t * 2.399963;
    const r = 0.8 + 0.25 * Math.sqrt(total);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(th);
  }
  // Start ghosts next to their atom.
  ghostOf.forEach((a, k) => {
    const gi = n + k;
    pos[gi * 3] = pos[a * 3] + 0.3 * Math.cos(k * 2.1);
    pos[gi * 3 + 1] = pos[a * 3 + 1] + 0.3;
    pos[gi * 3 + 2] = pos[a * 3 + 2] + 0.3 * Math.sin(k * 2.1);
  });

  const springs = g.bonds.map(([a, b]) => [a, b, radius[a] + radius[b] + 0.32]);
  ghostOf.forEach((a, k) => springs.push([a, n + k, radius[a] + 0.45]));
  const force = new Float64Array(total * 3);
  const steps = 260;
  for (let step = 0; step < steps; step++) {
    force.fill(0);
    for (let i = 0; i < total; i++) {
      for (let j = i + 1; j < total; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const d2 = Math.max(dx * dx + dy * dy + dz * dz, 0.01);
        const w = (i >= n ? 0.6 : 1) * (j >= n ? 0.6 : 1);
        const f = (0.55 * w) / d2;
        const d = Math.sqrt(d2);
        force[i * 3] += (dx / d) * f;
        force[i * 3 + 1] += (dy / d) * f;
        force[i * 3 + 2] += (dz / d) * f;
        force[j * 3] -= (dx / d) * f;
        force[j * 3 + 1] -= (dy / d) * f;
        force[j * 3 + 2] -= (dz / d) * f;
      }
    }
    for (const [a, b, len] of springs) {
      const dx = pos[b * 3] - pos[a * 3];
      const dy = pos[b * 3 + 1] - pos[a * 3 + 1];
      const dz = pos[b * 3 + 2] - pos[a * 3 + 2];
      const d = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 0.001);
      const f = 2.2 * (d - len);
      force[a * 3] += (dx / d) * f;
      force[a * 3 + 1] += (dy / d) * f;
      force[a * 3 + 2] += (dz / d) * f;
      force[b * 3] -= (dx / d) * f;
      force[b * 3 + 1] -= (dy / d) * f;
      force[b * 3 + 2] -= (dz / d) * f;
    }
    const stepSize = 0.06 * (1 - step / steps) + 0.01;
    for (let i = 0; i < total * 3; i++) {
      pos[i] += Math.max(-0.3, Math.min(0.3, force[i] * stepSize));
    }
  }
  return pos;
}

// ---------- Public ----------

const cache = new Map();

/*
  moleculeLayout('H2O') -> { atoms:[{el,x,y,z,r}], bonds:[[0,1],[0,2]], radius }
  Centered on the origin. radius = bounding sphere including atom size.
*/
export function moleculeLayout(formula) {
  const key = String(formula);
  const hit = cache.get(key);
  if (hit) return hit;
  const g = buildGraph(key);
  const pos = relax(g);
  const n = g.el.length;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < n; i++) {
    cx += pos[i * 3];
    cy += pos[i * 3 + 1];
    cz += pos[i * 3 + 2];
  }
  cx /= n;
  cy /= n;
  cz /= n;
  let radius = 0;
  const atoms = g.el.map((el, i) => {
    const a = { el, x: pos[i * 3] - cx, y: pos[i * 3 + 1] - cy, z: pos[i * 3 + 2] - cz, r: atomRadius(el) };
    radius = Math.max(radius, Math.hypot(a.x, a.y, a.z) + a.r);
    return a;
  });
  const out = Object.freeze({ atoms, bonds: g.bonds.slice(), radius });
  if (cache.size > 200) cache.clear();
  cache.set(key, out);
  return out;
}
