/*
  Balance Quest — builds the 3D world (walkway, scenery, gates, player).
  Everything created here is registered with a Tracker so the engine can dispose
  every geometry, material, texture and instanced buffer when the world is left.
*/

import * as THREE from '../vendor/three.module.min.js?v=r170';
import { moleculeLayout, atomColor } from './molecule.js?v=20261021T1624';
import { prettyFormula } from './chem.js?v=20261021T1624';

export const VISIBLE_CAP = 8;
export const HALF_WIDTH = 2.6;
export const PIVOT_Y = 5.9;
export const HANG = 2.7;
export const BEAM_HALF = 4.2;
export const BOSS_SCALE = 1.3;

const GATE_START = 18;
const GATE_SPACING = 18;
const BOSS_EXTRA = 5;
const FINISH_AFTER = 15;
const END_PAD = 12;
const PAN_USABLE = 1.42;

// ---------- Themes ----------

export const THEMES = {
  meadow: {
    sky: 0xbfe3f7, fogNear: 26, fogFar: 74, hemiSky: 0xffffff, hemiGround: 0x7a9a5a, hemi: 2.1, sun: 0xfff1d6, sunI: 2.2,
    ground: 0x86c66b, ground2: 0x6aae58, hills: 1.8, path: 0xeedcae, path2: 0xe0cb98, edge: 0xb39566,
    stone: 0xf1ece0, stone2: 0xd8d0bf, metal: 0x9aa4ae, brass: 0xd9b45a, accent: 0x2dd4bf, field: 0x5eead4, scenery: 'meadow'
  },
  caves: {
    sky: 0x1a1430, fogNear: 16, fogFar: 60, hemiSky: 0xb3a6ff, hemiGround: 0x241a3a, hemi: 1.9, sun: 0xd9d0ff, sunI: 1.3,
    ground: 0x2f2749, ground2: 0x3b3159, hills: 3.4, path: 0x7c7596, path2: 0x6d6788, edge: 0xa78bfa,
    stone: 0xc2bbd8, stone2: 0x9a92b6, metal: 0x9a90bd, brass: 0xc7b26a, accent: 0xa78bfa, field: 0xc4b5fd, scenery: 'caves'
  },
  volcano: {
    sky: 0x47231a, fogNear: 18, fogFar: 66, hemiSky: 0xffc09a, hemiGround: 0x2d1c16, hemi: 1.8, sun: 0xffc9a0, sunI: 2.0,
    ground: 0x3d322e, ground2: 0x302825, hills: 2.8, path: 0x75685f, path2: 0x695d55, edge: 0xff7a2e,
    stone: 0xa4968c, stone2: 0x847870, metal: 0x857c76, brass: 0xd49a4a, accent: 0xfb923c, field: 0xffa45c, scenery: 'volcano'
  },
  ocean: {
    sky: 0x11596b, fogNear: 16, fogFar: 62, hemiSky: 0xb1f6ff, hemiGround: 0x2d4f4c, hemi: 2.0, sun: 0xe0fcff, sunI: 1.6,
    ground: 0xd8c591, ground2: 0xc8b47f, hills: 1.5, path: 0xb0c6c0, path2: 0xa0b7b1, edge: 0x5fb3b3,
    stone: 0xeae4d4, stone2: 0xcfc6b1, metal: 0x8aa6a9, brass: 0xd8b860, accent: 0x38bdf8, field: 0x7dd3fc, scenery: 'ocean'
  },
  lab: {
    sky: 0xdce6ef, fogNear: 26, fogFar: 74, hemiSky: 0xffffff, hemiGround: 0x8090a0, hemi: 2.1, sun: 0xffffff, sunI: 2.0,
    ground: 0xc4ced8, ground2: 0xb6c1cc, hills: 0.6, path: 0xf2f4f6, path2: 0xe3e7eb, edge: 0x8b97a3,
    stone: 0xf4f4f4, stone2: 0xd6dade, metal: 0x9aa4ae, brass: 0xd9b45a, accent: 0x2dd4bf, field: 0x5eead4, scenery: 'lab'
  }
};

// ---------- Helpers ----------

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Tracker {
  constructor() {
    this.items = new Set();
  }
  add(x) {
    this.items.add(x);
    return x;
  }
  disposeAll() {
    for (const x of this.items) x.dispose();
    this.items.clear();
  }
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _e = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);
const IDQ = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();

/* Merge simple geometries (each with its own matrix and color) into one vertex-colored geometry. */
function mergeParts(parts) {
  const prepared = parts.map((p) => {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    g.applyMatrix4(p.matrix || new THREE.Matrix4());
    p.geo.dispose();
    return { g, color: new THREE.Color(p.color) };
  });
  let total = 0;
  for (const p of prepared) total += p.g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  let o = 0;
  for (const p of prepared) {
    const n = p.g.attributes.position.count;
    pos.set(p.g.attributes.position.array, o * 3);
    nor.set(p.g.attributes.normal.array, o * 3);
    for (let i = 0; i < n; i++) {
      col[(o + i) * 3] = p.color.r;
      col[(o + i) * 3 + 1] = p.color.g;
      col[(o + i) * 3 + 2] = p.color.b;
    }
    o += n;
    p.g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

function mat4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.clone(), new THREE.Vector3(sx, sy, sz));
}

// A cylinder from point a to point b (for strings and bars).
function rodMatrix(a, b, radius) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return new THREE.Matrix4().compose(mid, q, new THREE.Vector3(radius, len, radius));
}

// ---------- Walkway path ----------

const DS = 0.5;

export class PathData {
  constructor(length, seed) {
    const rng = mulberry32(seed);
    const a1 = 4.5 + rng() * 3;
    const k1 = 0.035 + rng() * 0.015;
    const p1 = rng() * 6.283;
    const a2 = 1.2 + rng() * 1.4;
    const k2 = 0.085 + rng() * 0.04;
    const p2 = rng() * 6.283;
    const xAt = (z) => {
      const t = Math.min(1, Math.max(0, (-z - 2) / 22));
      const ramp = t * t * (3 - 2 * t);
      return ramp * (a1 * Math.sin(k1 * z + p1) + a2 * Math.sin(k2 * z + p2));
    };
    // Fine polyline, then resample at even arc-length steps.
    const fx = [];
    const fz = [];
    const fs = [];
    let z = 4;
    let s = 0;
    let px = xAt(z);
    let pz = z;
    fx.push(px);
    fz.push(pz);
    fs.push(0);
    while (s < length + 2) {
      z -= 0.2;
      const x = xAt(z);
      s += Math.hypot(x - px, z - pz);
      fx.push(x);
      fz.push(z);
      fs.push(s);
      px = x;
      pz = z;
    }
    this.length = length;
    const n = Math.floor(length / DS) + 2;
    this.n = n;
    this.x = new Float32Array(n);
    this.z = new Float32Array(n);
    this.tx = new Float32Array(n);
    this.tz = new Float32Array(n);
    let j = 0;
    for (let i = 0; i < n; i++) {
      const target = i * DS;
      while (j < fs.length - 2 && fs[j + 1] < target) j++;
      const f = Math.min(1, Math.max(0, (target - fs[j]) / (fs[j + 1] - fs[j] || 1)));
      this.x[i] = fx[j] + (fx[j + 1] - fx[j]) * f;
      this.z[i] = fz[j] + (fz[j + 1] - fz[j]) * f;
    }
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1);
      const b = Math.min(n - 1, i + 1);
      const dx = this.x[b] - this.x[a];
      const dz = this.z[b] - this.z[a];
      const l = Math.hypot(dx, dz) || 1;
      this.tx[i] = dx / l;
      this.tz[i] = dz / l;
    }
  }

  /* Position and forward tangent at arc length s (no allocations). */
  sample(s, outPos, outTan) {
    const u = Math.min(Math.max(s / DS, 0), this.n - 1.001);
    const i = Math.floor(u);
    const f = u - i;
    outPos.set(this.x[i] + (this.x[i + 1] - this.x[i]) * f, 0, this.z[i] + (this.z[i + 1] - this.z[i]) * f);
    if (outTan) {
      const tx = this.tx[i] + (this.tx[i + 1] - this.tx[i]) * f;
      const tz = this.tz[i] + (this.tz[i + 1] - this.tz[i]) * f;
      const l = Math.hypot(tx, tz) || 1;
      outTan.set(tx / l, 0, tz / l);
    }
    return outPos;
  }

  /* Distance from (x, z) to the walkway centerline (coarse, for scenery placement). */
  distance(x, z) {
    let best = Infinity;
    for (let i = 0; i < this.n; i += 4) {
      const dx = this.x[i] - x;
      const dz = this.z[i] - z;
      const d = dx * dx + dz * dz;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }
}

// ---------- Layout of a world ----------

export function planWorld(gateCount) {
  const positions = [];
  let s = GATE_START;
  for (let i = 0; i < gateCount; i++) {
    if (i === gateCount - 1 && gateCount > 1) s += BOSS_EXTRA;
    positions.push(s);
    s += GATE_SPACING;
  }
  const last = positions.length ? positions[positions.length - 1] : GATE_START;
  const finish = last + FINISH_AFTER;
  return { gateS: positions, finishS: finish, length: finish + END_PAD };
}

// ---------- Ground + walkway ----------

function noise2(x, z) {
  return (
    Math.sin(x * 0.19 + 1.3) * Math.sin(z * 0.15 + 0.7) * 0.55 +
    Math.sin(x * 0.07 - z * 0.05 + 2.1) * 0.35 +
    Math.sin(x * 0.41 + z * 0.37) * 0.1
  );
}

function buildGround(theme, path, tracker, rng) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < path.n; i++) {
    minX = Math.min(minX, path.x[i]);
    maxX = Math.max(maxX, path.x[i]);
    minZ = Math.min(minZ, path.z[i]);
    maxZ = Math.max(maxZ, path.z[i]);
  }
  const margin = 70;
  const w = maxX - minX + margin * 2;
  const d = maxZ - minZ + margin * 2;
  const segW = Math.min(48, Math.ceil(w / 4));
  const segD = Math.min(90, Math.ceil(d / 4));
  const geo = new THREE.PlaneGeometry(w, d, segW, segD);
  geo.rotateX(-Math.PI / 2);
  geo.translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c1 = new THREE.Color(theme.ground);
  const c2 = new THREE.Color(theme.ground2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const dist = path.distance(x, z);
    const t = Math.min(1, Math.max(0, (dist - HALF_WIDTH - 3) / 10));
    const n = noise2(x, z);
    const h = t * theme.hills * (1.2 + n + (rng() - 0.5) * 0.5) * (0.6 + Math.min(1, dist / 40));
    pos.setY(i, Math.max(0, h) - 0.06);
    _c.copy(c1).lerp(c2, Math.min(1, Math.max(0, 0.5 + n * 0.8 + (rng() - 0.5) * 0.3)));
    colors[i * 3] = _c.r;
    colors[i * 3 + 1] = _c.g;
    colors[i * 3 + 2] = _c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  tracker.add(geo);
  const mat = tracker.add(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  return new THREE.Mesh(geo, mat);
}

function ribbon(path, inner, outer, y, colorA, colorB, band) {
  const segs = Math.floor(path.length);
  const pos = new Float32Array(segs * 6 * 3);
  const nor = new Float32Array(segs * 6 * 3);
  const col = new Float32Array(segs * 6 * 3);
  const ca = new THREE.Color(colorA);
  const cb = new THREE.Color(colorB);
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const corner = (s, off) => {
    path.sample(s, p, t);
    return [p.x - t.z * off, y, p.z + t.x * off];
  };
  let o = 0;
  const push = (v, c) => {
    pos[o * 3] = v[0];
    pos[o * 3 + 1] = v[1];
    pos[o * 3 + 2] = v[2];
    nor[o * 3 + 1] = 1;
    col[o * 3] = c.r;
    col[o * 3 + 1] = c.g;
    col[o * 3 + 2] = c.b;
    o++;
  };
  const tri = (a, b, c, color) => {
    // keep the face pointing up
    const cross = (b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0]);
    if (cross > 0) {
      push(a, color);
      push(c, color);
      push(b, color);
    } else {
      push(a, color);
      push(b, color);
      push(c, color);
    }
  };
  for (let k = 0; k < segs; k++) {
    const s0 = k;
    const s1 = k + 1;
    const color = Math.floor(k / band) % 2 ? cb : ca;
    const a0 = corner(s0, inner);
    const b0 = corner(s0, outer);
    const a1 = corner(s1, inner);
    const b1 = corner(s1, outer);
    tri(a0, b0, a1, color);
    tri(b0, b1, a1, color);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  return geo;
}

function buildWalkway(theme, path, tracker) {
  const group = new THREE.Group();
  const mat = tracker.add(new THREE.MeshLambertMaterial({ vertexColors: true }));
  const floor = tracker.add(ribbon(path, -HALF_WIDTH, HALF_WIDTH, 0.02, theme.path, theme.path2, 2));
  group.add(new THREE.Mesh(floor, mat));
  const left = tracker.add(ribbon(path, -HALF_WIDTH - 0.45, -HALF_WIDTH, 0.07, theme.edge, theme.edge, 4));
  const right = tracker.add(ribbon(path, HALF_WIDTH, HALF_WIDTH + 0.45, 0.07, theme.edge, theme.edge, 4));
  group.add(new THREE.Mesh(left, mat));
  group.add(new THREE.Mesh(right, mat));
  return group;
}

// ---------- Scenery ----------

function scatterPoints(path, rng, count, minD, maxD, avoid) {
  const pts = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  let guard = 0;
  while (pts.length < count && guard++ < count * 20) {
    const s = -14 + rng() * (path.length + 34);
    path.sample(Math.min(Math.max(s, 0), path.length), p, t);
    const side = rng() < 0.5 ? -1 : 1;
    const off = minD + rng() * (maxD - minD);
    let x = p.x - t.z * off * side;
    let z = p.z + t.x * off * side;
    if (s < 0) z += -s;
    if (s > path.length) z -= s - path.length;
    if (path.distance(x, z) < minD - 0.5) continue;
    if (avoid.some((a) => (a.x - x) ** 2 + (a.z - z) ** 2 < a.r * a.r)) continue;
    pts.push({ x, z, s: rng(), r: rng() });
  }
  return pts;
}

function instanced(tracker, geo, mat, list, place, colorFn) {
  const mesh = tracker.add(new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)));
  mesh.count = list.length;
  list.forEach((pt, i) => {
    place(pt, _v, _q, _s);
    _m.compose(_v, _q, _s);
    mesh.setMatrixAt(i, _m);
    if (colorFn) mesh.setColorAt(i, _c.set(colorFn(pt, i)));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function yawQ(q, yaw, tiltX = 0, tiltZ = 0) {
  _e.set(tiltX, yaw, tiltZ);
  return q.setFromEuler(_e);
}

function buildScenery(theme, path, tracker, rng, avoid) {
  const group = new THREE.Group();
  const lambert = (color, flat = true) => tracker.add(new THREE.MeshLambertMaterial({ color, flatShading: flat }));
  const lambertWhite = () => tracker.add(new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }));
  const basicWhite = () => tracker.add(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const geo = (g) => tracker.add(g);
  const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];

  if (theme.scenery === 'meadow' || theme.scenery === 'lab') {
    const lab = theme.scenery === 'lab';
    const trees = scatterPoints(path, rng, lab ? 40 : 90, HALF_WIDTH + 4, 34, avoid);
    const trunkGeo = geo(new THREE.CylinderGeometry(0.18, 0.28, 1.6, 5));
    trunkGeo.translate(0, 0.8, 0);
    const crownGeo = geo(new THREE.ConeGeometry(1.25, 2.8, 6));
    crownGeo.translate(0, 2.9, 0);
    const scaleOf = (pt) => 0.8 + pt.s * 0.9;
    group.add(instanced(tracker, trunkGeo, lambert(0x8a6a4a), trees, (pt, v, q, s) => {
      v.set(pt.x, -0.05, pt.z);
      yawQ(q, pt.r * 6.28);
      s.setScalar(scaleOf(pt));
    }));
    group.add(instanced(tracker, crownGeo, lambertWhite(), trees, (pt, v, q, s) => {
      v.set(pt.x, -0.05, pt.z);
      yawQ(q, pt.r * 6.28);
      s.setScalar(scaleOf(pt));
    }, (pt) => (lab ? pick([0x7fb08c, 0x6fa080, 0x8fc09a], pt.r) : pick([0x3f9d4f, 0x4cae5a, 0x2f8a45, 0x5bbf66], pt.r))));
    const bushes = scatterPoints(path, rng, 60, HALF_WIDTH + 1.4, 20, avoid);
    group.add(instanced(tracker, geo(new THREE.IcosahedronGeometry(0.6, 0)), lambertWhite(), bushes, (pt, v, q, s) => {
      v.set(pt.x, 0.2, pt.z);
      yawQ(q, pt.r * 6.28);
      s.set(1 + pt.s, 0.7 + pt.s * 0.5, 1 + pt.s);
    }, (pt) => pick([0x58b85d, 0x66c46a, 0x4aa654], pt.r)));
    const flowers = scatterPoints(path, rng, lab ? 20 : 140, HALF_WIDTH + 0.9, 16, avoid);
    group.add(instanced(tracker, geo(new THREE.IcosahedronGeometry(0.16, 0)), basicWhite(), flowers, (pt, v, q, s) => {
      v.set(pt.x, 0.18, pt.z);
      q.identity();
      s.setScalar(0.8 + pt.s);
    }, (pt) => pick([0xff6b8a, 0xffd23f, 0xffffff, 0xb28dff, 0xff9f43], pt.r)));
    // Giant lab flasks as landmarks
    const flasks = scatterPoints(path, rng, lab ? 26 : 10, HALF_WIDTH + 4, 22, avoid);
    // Erlenmeyer flask: wide bottom, narrow neck.
    const bulb = geo(new THREE.CylinderGeometry(0.38, 1.1, 1.7, 8));
    bulb.translate(0, 0.85, 0);
    const neck = geo(new THREE.CylinderGeometry(0.34, 0.34, 1.0, 8));
    neck.translate(0, 2.2, 0);
    const flaskPlace = (pt, v, q, s) => {
      v.set(pt.x, 0, pt.z);
      yawQ(q, pt.r * 6.28);
      s.setScalar(0.9 + pt.s * 1.2);
    };
    group.add(instanced(tracker, bulb, lambertWhite(), flasks, flaskPlace, (pt) => pick([0x2dd4bf, 0xa78bfa, 0xfbbf24, 0xfb7185], pt.r)));
    group.add(instanced(tracker, neck, lambert(0xdff3f1), flasks, flaskPlace));
    if (lab) {
      const benches = scatterPoints(path, rng, 22, HALF_WIDTH + 3, 18, avoid);
      const top = geo(new THREE.BoxGeometry(3.2, 0.25, 1.4));
      top.translate(0, 1.0, 0);
      const legs = geo(new THREE.BoxGeometry(2.9, 0.9, 1.1));
      legs.translate(0, 0.45, 0);
      const bPlace = (pt, v, q, s) => {
        v.set(pt.x, 0, pt.z);
        yawQ(q, pt.r * 6.28);
        s.setScalar(1);
      };
      group.add(instanced(tracker, top, lambert(0x2c3e50), benches, bPlace));
      group.add(instanced(tracker, legs, lambert(0xb9c3cc), benches, bPlace));
    }
  }

  if (theme.scenery === 'caves') {
    const walls = scatterPoints(path, rng, 120, 9, 26, avoid);
    group.add(instanced(tracker, geo(new THREE.DodecahedronGeometry(2.6, 0)), lambertWhite(), walls, (pt, v, q, s) => {
      v.set(pt.x, 0.6, pt.z);
      yawQ(q, pt.r * 6.28, pt.s);
      s.set(1 + pt.s * 1.4, 1.2 + pt.r * 2.2, 1 + pt.r);
    }, (pt) => pick([0x3a3157, 0x2f2848, 0x453a66], pt.r)));
    const crystals = scatterPoints(path, rng, 110, HALF_WIDTH + 1.2, 18, avoid);
    const cGeo = geo(new THREE.OctahedronGeometry(0.6, 0));
    cGeo.translate(0, 0.55, 0);
    group.add(instanced(tracker, cGeo, basicWhite(), crystals, (pt, v, q, s) => {
      v.set(pt.x, 0, pt.z);
      yawQ(q, pt.r * 6.28, (pt.s - 0.5) * 0.6, (pt.r - 0.5) * 0.6);
      s.set(0.6 + pt.s * 0.6, 1.2 + pt.s * 2.4, 0.6 + pt.s * 0.6);
    }, (pt) => pick([0xa78bfa, 0x67e8f9, 0xf0abfc, 0x818cf8, 0x5eead4], pt.r)));
    const mites = scatterPoints(path, rng, 60, HALF_WIDTH + 2, 24, avoid);
    group.add(instanced(tracker, geo(new THREE.ConeGeometry(0.7, 3, 5)), lambert(0x5b5079), mites, (pt, v, q, s) => {
      v.set(pt.x, 1.4 * (0.6 + pt.s), pt.z);
      yawQ(q, pt.r * 6.28);
      s.setScalar(0.6 + pt.s);
    }));
    const shrooms = scatterPoints(path, rng, 40, HALF_WIDTH + 1, 12, avoid);
    const cap = geo(new THREE.SphereGeometry(0.4, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2));
    cap.translate(0, 0.55, 0);
    group.add(instanced(tracker, cap, basicWhite(), shrooms, (pt, v, q, s) => {
      v.set(pt.x, 0, pt.z);
      q.identity();
      s.setScalar(0.7 + pt.s);
    }, (pt) => pick([0x67e8f9, 0x5eead4, 0xf0abfc], pt.r)));
  }

  if (theme.scenery === 'volcano') {
    const rocks = scatterPoints(path, rng, 130, HALF_WIDTH + 2, 30, avoid);
    group.add(instanced(tracker, geo(new THREE.DodecahedronGeometry(1, 0)), lambertWhite(), rocks, (pt, v, q, s) => {
      v.set(pt.x, 0.2, pt.z);
      yawQ(q, pt.r * 6.28, pt.s);
      s.set(0.7 + pt.s * 2, 0.6 + pt.r * 1.6, 0.7 + pt.r * 1.8);
    }, (pt) => pick([0x2a2422, 0x3a302c, 0x4a3d37], pt.r)));
    const lava = scatterPoints(path, rng, 26, HALF_WIDTH + 4, 24, avoid);
    const pool = geo(new THREE.CircleGeometry(1, 7));
    pool.rotateX(-Math.PI / 2);
    group.add(instanced(tracker, pool, basicWhite(), lava, (pt, v, q, s) => {
      v.set(pt.x, 0.05 + pt.s * 0.01, pt.z);
      yawQ(q, pt.r * 6.28);
      s.set(1.2 + pt.s * 2.4, 1, 1 + pt.r * 2);
    }, (pt) => pick([0xff5a1f, 0xff7a2e, 0xffa23a], pt.r)));
    const trees = scatterPoints(path, rng, 30, HALF_WIDTH + 3, 20, avoid);
    const deadGeo = geo(new THREE.CylinderGeometry(0.08, 0.2, 3, 4));
    deadGeo.translate(0, 1.5, 0);
    group.add(instanced(tracker, deadGeo, lambert(0x1e1816), trees, (pt, v, q, s) => {
      v.set(pt.x, 0, pt.z);
      yawQ(q, pt.r * 6.28, (pt.s - 0.5) * 0.4);
      s.setScalar(0.7 + pt.s);
    }));
    // Big volcanoes on the horizon
    const cones = [];
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Vector3();
      path.sample(path.length * (0.2 + i * 0.25), p);
      cones.push({ x: p.x + (i % 2 ? 1 : -1) * (38 + i * 4), z: p.z - 10, s: 0.6 + (i % 3) * 0.25, r: i / 4 });
    }
    const coneGeo = geo(new THREE.ConeGeometry(14, 16, 7, 1, true));
    coneGeo.translate(0, 8, 0);
    group.add(instanced(tracker, coneGeo, lambert(0x3b2a24), cones, (pt, v, q, s) => {
      v.set(pt.x, -1, pt.z);
      yawQ(q, pt.r * 6);
      s.set(1 + pt.s * 0.4, 0.8 + pt.s, 1 + pt.s * 0.4);
    }));
    const glowGeo = geo(new THREE.CylinderGeometry(2.6, 3.6, 1.6, 7));
    glowGeo.translate(0, 15.2, 0);
    group.add(instanced(tracker, glowGeo, tracker.add(new THREE.MeshBasicMaterial({ color: 0xff7a2e })), cones, (pt, v, q, s) => {
      v.set(pt.x, -1, pt.z);
      yawQ(q, pt.r * 6);
      s.set(1 + pt.s * 0.4, 0.8 + pt.s, 1 + pt.s * 0.4);
    }));
  }

  if (theme.scenery === 'ocean') {
    const cols = scatterPoints(path, rng, 46, HALF_WIDTH + 2.5, 22, avoid);
    const colGeo = geo(new THREE.CylinderGeometry(0.45, 0.5, 4, 8));
    colGeo.translate(0, 2, 0);
    group.add(instanced(tracker, colGeo, lambert(theme.stone), cols, (pt, v, q, s) => {
      v.set(pt.x, -0.1, pt.z);
      const fallen = pt.s > 0.8;
      yawQ(q, pt.r * 6.28, fallen ? 1.45 : (pt.r - 0.5) * 0.12);
      s.set(1, fallen ? 1 : 0.35 + pt.s * 0.9, 1);
    }));
    const caps = cols.filter((pt) => pt.s <= 0.8 && pt.s > 0.35);
    const capGeo = geo(new THREE.BoxGeometry(1.4, 0.35, 1.4));
    group.add(instanced(tracker, capGeo, lambert(theme.stone2), caps, (pt, v, q, s) => {
      v.set(pt.x, -0.1 + 4 * (0.35 + pt.s * 0.9) + 0.15, pt.z);
      yawQ(q, pt.r * 6.28);
      s.setScalar(1);
    }));
    const coral = scatterPoints(path, rng, 120, HALF_WIDTH + 1, 20, avoid);
    const coralGeo = geo(new THREE.ConeGeometry(0.35, 1.4, 5));
    coralGeo.translate(0, 0.7, 0);
    group.add(instanced(tracker, coralGeo, lambertWhite(), coral, (pt, v, q, s) => {
      v.set(pt.x, 0, pt.z);
      yawQ(q, pt.r * 6.28, (pt.s - 0.5) * 0.7, (pt.r - 0.5) * 0.7);
      s.set(1, 0.6 + pt.s * 1.4, 1);
    }, (pt) => pick([0xff7f6e, 0xff9eb5, 0xffb347, 0xf0abfc], pt.r)));
    const weeds = scatterPoints(path, rng, 110, HALF_WIDTH + 1.5, 26, avoid);
    const weedGeo = geo(new THREE.ConeGeometry(0.22, 3.4, 4));
    weedGeo.translate(0, 1.7, 0);
    group.add(instanced(tracker, weedGeo, lambertWhite(), weeds, (pt, v, q, s) => {
      v.set(pt.x, 0, pt.z);
      yawQ(q, pt.r * 6.28, (pt.s - 0.5) * 0.4);
      s.set(1, 0.6 + pt.s, 1);
    }, (pt) => pick([0x2f9e6e, 0x3fb57d, 0x1f7f5c], pt.r)));
    const shells = scatterPoints(path, rng, 50, HALF_WIDTH + 0.8, 10, avoid);
    group.add(instanced(tracker, geo(new THREE.SphereGeometry(0.22, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2)), lambertWhite(), shells, (pt, v, q, s) => {
      v.set(pt.x, 0, pt.z);
      yawQ(q, pt.r * 6.28);
      s.set(1.2, 0.6, 1);
    }, (pt) => pick([0xfff1e0, 0xffd1dc, 0xf6d6a8], pt.r)));
  }
  return group;
}

// ---------- Shared gate parts ----------

function buildGateKit(theme, tracker) {
  const lambertVC = tracker.add(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));

  const frameParts = [];
  for (const side of [-1, 1]) {
    frameParts.push({ geo: new THREE.BoxGeometry(1.2, 7.2, 1.2), matrix: mat4(side * 6.6, 3.6, 0), color: theme.stone });
    frameParts.push({ geo: new THREE.BoxGeometry(1.7, 0.5, 1.7), matrix: mat4(side * 6.6, 0.25, 0), color: theme.stone2 });
    frameParts.push({ geo: new THREE.ConeGeometry(0.95, 1.0, 4), matrix: mat4(side * 6.6, 8.55, 0, 0, Math.PI / 4), color: theme.accent });
  }
  frameParts.push({ geo: new THREE.BoxGeometry(14.6, 1.0, 1.5), matrix: mat4(0, 7.55, 0), color: theme.stone });
  frameParts.push({ geo: new THREE.CylinderGeometry(0.11, 0.11, 1.2, 6), matrix: mat4(0, 6.5, 0), color: theme.metal });
  const frameGeo = tracker.add(mergeParts(frameParts));

  const beamGeo = tracker.add(mergeParts([
    { geo: new THREE.BoxGeometry(BEAM_HALF * 2 + 0.4, 0.3, 0.42), color: theme.metal },
    { geo: new THREE.SphereGeometry(0.36, 10, 6), color: theme.accent },
    { geo: new THREE.BoxGeometry(0.1, 1.2, 0.1), matrix: mat4(0, -0.75, 0.25), color: theme.brass },
    { geo: new THREE.SphereGeometry(0.16, 8, 4), matrix: mat4(-BEAM_HALF, 0, 0), color: theme.brass },
    { geo: new THREE.SphereGeometry(0.16, 8, 4), matrix: mat4(BEAM_HALF, 0, 0), color: theme.brass }
  ]));

  // Pan: dish + three strings meeting at the hook (pan origin = top of the dish).
  const panParts = [
    { geo: new THREE.CylinderGeometry(1.75, 1.25, 0.3, 14), matrix: mat4(0, -0.15, 0), color: theme.brass },
    { geo: new THREE.SphereGeometry(0.14, 8, 4), matrix: mat4(0, HANG, 0), color: theme.metal }
  ];
  const apex = new THREE.Vector3(0, HANG, 0);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 2;
    const rim = new THREE.Vector3(Math.cos(a) * 1.62, 0.02, Math.sin(a) * 1.62);
    panParts.push({ geo: new THREE.CylinderGeometry(1, 1, 1, 5, 1, true), matrix: rodMatrix(rim, apex, 0.035), color: 0x4b5563 });
  }
  const panGeo = tracker.add(mergeParts(panParts));

  // Gauge under the pivot: a little arc with a center tick.
  const gaugeGeo = tracker.add(mergeParts([
    { geo: new THREE.TorusGeometry(0.95, 0.05, 4, 16, Math.PI * 0.6), matrix: mat4(0, PIVOT_Y - 0.1, 0.2, 0, 0, Math.PI * 1.2), color: theme.stone2 },
    { geo: new THREE.BoxGeometry(0.06, 0.28, 0.06), matrix: mat4(0, PIVOT_Y - 1.05, 0.2), color: theme.accent }
  ]));

  // Door: bars plus a glowing field behind the scale.
  const doorParts = [];
  for (let k = 0; k < 9; k++) {
    const x = -6 + k * 1.5;
    doorParts.push({ geo: new THREE.CylinderGeometry(0.08, 0.08, 6.9, 6), matrix: mat4(x, 3.45, 0), color: theme.metal });
  }
  doorParts.push({ geo: new THREE.BoxGeometry(12.2, 0.18, 0.2), matrix: mat4(0, 1.4, 0), color: theme.metal });
  doorParts.push({ geo: new THREE.BoxGeometry(12.2, 0.18, 0.2), matrix: mat4(0, 5.4, 0), color: theme.metal });
  const barsGeo = tracker.add(mergeParts(doorParts));
  const fieldGeo = tracker.add(new THREE.PlaneGeometry(12, 6.9));
  fieldGeo.translate(0, 3.45, 0);
  const fieldMat = tracker.add(new THREE.MeshBasicMaterial({ color: theme.field, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));

  const gemGeo = tracker.add(new THREE.OctahedronGeometry(0.42, 0));
  const gemLocked = tracker.add(new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
  const gemBoss = tracker.add(new THREE.MeshBasicMaterial({ color: 0xf472b6 }));
  const gemOpen = tracker.add(new THREE.MeshBasicMaterial({ color: 0x34d399 }));

  // Boss crown: rings on the lintel.
  const crownGeo = tracker.add(mergeParts([
    { geo: new THREE.TorusGeometry(0.9, 0.14, 6, 16), matrix: mat4(0, 9.0, 0), color: theme.brass },
    { geo: new THREE.ConeGeometry(0.35, 0.9, 5), matrix: mat4(-1.4, 8.4, 0), color: theme.accent },
    { geo: new THREE.ConeGeometry(0.35, 0.9, 5), matrix: mat4(1.4, 8.4, 0), color: theme.accent },
    { geo: new THREE.BoxGeometry(4.2, 0.35, 0.8), matrix: mat4(0, 8.15, 0), color: theme.stone2 }
  ]));

  // Molecules
  const atomGeo = tracker.add(new THREE.IcosahedronGeometry(1, 1));
  const bondGeo = tracker.add(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true));
  const bondMat = tracker.add(new THREE.MeshLambertMaterial({ color: 0xc8ccd2 }));

  return {
    lambertVC, frameGeo, beamGeo, panGeo, gaugeGeo, barsGeo, fieldGeo, fieldMat, gemGeo, gemLocked, gemBoss, gemOpen,
    crownGeo, atomGeo, bondGeo, bondMat, atomMats: new Map(), labelTex: new Map(), tracker
  };
}

function atomMaterial(kit, color) {
  let m = kit.atomMats.get(color);
  if (!m) {
    m = kit.tracker.add(new THREE.MeshLambertMaterial({ color }));
    kit.atomMats.set(color, m);
  }
  return m;
}

// ---------- Gates ----------

function slotGrid(spacing, needed) {
  // Hex grid inside the pan, filled back row first; extra molecules stack in layers.
  const slots = [];
  const rowStep = spacing * 0.866;
  const R = PAN_USABLE;
  let layer = 0;
  while (slots.length < needed && layer < 6) {
    const layerSlots = [];
    const rows = Math.floor((2 * R) / rowStep) + 1;
    for (let r = 0; r < rows; r++) {
      const z = -R + r * rowStep + (layer % 2) * rowStep * 0.5;
      const shift = (r % 2) * spacing * 0.5;
      for (let x = -R + shift; x <= R + 1e-6; x += spacing) {
        if (x * x + z * z <= R * R + 1e-6) layerSlots.push({ x, z, layer });
      }
    }
    if (!layerSlots.length) layerSlots.push({ x: 0, z: 0, layer });
    slots.push(...layerSlots);
    layer++;
  }
  return slots;
}

function buildGate(kit, eq, index, boss, theme) {
  const nR = eq.reactants.length;
  const species = eq.reactants.concat(eq.products).map((formula, j) => {
    const layout = moleculeLayout(formula);
    const colors = new Map();
    for (const a of layout.atoms) {
      const col = atomColor(a.el);
      colors.set(col, (colors.get(col) || 0) + 1);
    }
    return { formula, layout, colors, side: j < nR ? 0 : 1, j };
  });

  // Slot size from the answer (capped), so the solved pans look tidy.
  const perSide = [0, 0];
  species.forEach((sp) => {
    perSide[sp.side] += Math.min(VISIBLE_CAP, eq.coefficients[sp.j] || 1);
  });
  const N = Math.max(perSide[0], perSide[1], 1);
  const spacing = Math.min(1.5, Math.max(0.5, Math.sqrt((Math.PI * PAN_USABLE * PAN_USABLE * 0.78) / (0.866 * N))));
  const maxR = Math.max(...species.map((sp) => sp.layout.radius));
  // Bigger molecules still look bigger, but small ones aren't shrunk to specks.
  species.forEach((sp) => {
    sp.unit = ((0.52 * spacing) / sp.layout.radius) * Math.pow(sp.layout.radius / maxR, 0.3);
  });

  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);
  const beam = new THREE.Mesh(kit.beamGeo, kit.lambertVC);
  beam.position.y = PIVOT_Y;
  rig.add(beam);
  const gauge = new THREE.Mesh(kit.gaugeGeo, kit.lambertVC);
  rig.add(gauge);

  const pans = [0, 1].map((side) => {
    const pan = new THREE.Group();
    pan.add(new THREE.Mesh(kit.panGeo, kit.lambertVC));
    const mine = species.filter((sp) => sp.side === side);
    const capacity = new Map();
    let bondCap = 0;
    let molCap = 0;
    for (const sp of mine) {
      for (const [col, n] of sp.colors) capacity.set(col, (capacity.get(col) || 0) + n * VISIBLE_CAP);
      bondCap += sp.layout.bonds.length * VISIBLE_CAP;
      molCap += VISIBLE_CAP;
    }
    const atomMeshes = new Map();
    for (const [col, cap] of capacity) {
      const mesh = kit.tracker.add(new THREE.InstancedMesh(kit.atomGeo, atomMaterial(kit, col), cap));
      mesh.count = 0;
      pan.add(mesh);
      atomMeshes.set(col, mesh);
    }
    let bonds = null;
    if (bondCap > 0) {
      bonds = kit.tracker.add(new THREE.InstancedMesh(kit.bondGeo, kit.bondMat, bondCap));
      bonds.count = 0;
      pan.add(bonds);
    }
    rig.add(pan);
    const slots = slotGrid(spacing, molCap);
    const layerCap = Math.max(1, slots.filter((sl) => sl.layer === 0).length);
    return { group: pan, species: mine, atomMeshes, bonds, slots, layerCap, labels: [] };
  });

  const door = new THREE.Group();
  door.position.z = -1.05;
  door.add(new THREE.Mesh(kit.barsGeo, kit.lambertVC));
  door.add(new THREE.Mesh(kit.fieldGeo, kit.fieldMat));
  group.add(door);

  const gem = new THREE.Mesh(kit.gemGeo, boss ? kit.gemBoss : kit.gemLocked);
  gem.position.set(0, 7.55, 0.8);
  group.add(gem);
  if (boss) group.add(new THREE.Mesh(kit.crownGeo, kit.lambertVC));

  return {
    index,
    eq,
    boss,
    scale: boss ? BOSS_SCALE : 1,
    group,
    rig,
    beam,
    pans,
    door,
    gem,
    spacing,
    species,
    open: false,
    tilt: 0,
    tiltVel: 0,
    tiltTarget: 0,
    lift: 0,
    liftTarget: 0,
    doorY: 0,
    doorTarget: 0,
    celebrateAt: -1
  };
}

/* Place the hanging pans for the current beam angle (called every animated frame). */
export function placePans(gate) {
  const c = Math.cos(gate.tilt);
  const s = Math.sin(gate.tilt);
  gate.beam.rotation.z = gate.tilt;
  gate.pans[0].group.position.set(-BEAM_HALF * c, PIVOT_Y - BEAM_HALF * s - HANG, 0);
  gate.pans[1].group.position.set(BEAM_HALF * c, PIVOT_Y + BEAM_HALF * s - HANG, 0);
  gate.rig.position.y = gate.lift;
  gate.door.position.y = gate.doorY;
}

function labelTexture(kit, text) {
  let entry = kit.labelTex.get(text);
  if (entry) return entry;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(8,9,11,0.82)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(4, 6, 248, 52, 26);
  else ctx.rect(4, 6, 248, 52);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 33);
  const tex = kit.tracker.add(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = kit.tracker.add(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  entry = { tex, mat };
  kit.labelTex.set(text, entry);
  return entry;
}

/*
  Show coefficients on the pans: one ball-and-stick model per coefficient unit,
  capped at VISIBLE_CAP per species with a "×n" label beyond that.
*/
export function updatePans(kit, gate, coefficients) {
  for (const pan of gate.pans) {
    const counters = new Map();
    for (const [col, mesh] of pan.atomMeshes) counters.set(col, 0);
    let bondCount = 0;
    let slot = 0;
    let labelRow = 0;
    for (const lbl of pan.labels) lbl.visible = false;
    // Too many molecules for one layer? Shrink them so they still fit on the pan.
    let total = 0;
    for (const sp of pan.species) {
      const raw = coefficients[sp.j];
      total += Math.min(VISIBLE_CAP, Number.isInteger(raw) && raw > 0 ? raw : 0);
    }
    let slots = pan.slots;
    let shrink = 1;
    if (total > pan.layerCap) {
      shrink = Math.max(0.4, Math.sqrt(pan.layerCap / total) * 0.95);
      slots = slotGrid(gate.spacing * shrink, total);
    }
    for (const sp of pan.species) {
      const raw = coefficients[sp.j];
      const c = Number.isInteger(raw) && raw > 0 ? raw : 0;
      const shown = Math.min(c, VISIBLE_CAP);
      const unit = sp.unit * shrink;
      for (let m = 0; m < shown; m++) {
        const sl = slots[Math.min(slot, slots.length - 1)];
        slot++;
        const lift = sp.layout.radius * unit * 0.75 + sl.layer * gate.spacing * shrink * 0.8;
        _e.set(((sp.j * 7 + m * 3) % 11) * 0.57, ((sp.j * 5 + m * 7) % 13) * 0.48, ((m * 11) % 7) * 0.3);
        _q.setFromEuler(_e);
        for (const a of sp.layout.atoms) {
          const col = atomColor(a.el);
          const mesh = pan.atomMeshes.get(col);
          const k = counters.get(col);
          _v.set(a.x, a.y, a.z).multiplyScalar(unit).applyQuaternion(_q);
          _v.x += sl.x;
          _v.y += lift;
          _v.z += sl.z;
          _s.setScalar(a.r * unit);
          _m.compose(_v, IDQ, _s);
          mesh.setMatrixAt(k, _m);
          counters.set(col, k + 1);
        }
        for (const [ia, ib] of sp.layout.bonds) {
          const A = sp.layout.atoms[ia];
          const B = sp.layout.atoms[ib];
          _v.set(A.x, A.y, A.z).multiplyScalar(unit).applyQuaternion(_q);
          _v2.set(B.x, B.y, B.z).multiplyScalar(unit).applyQuaternion(_q);
          const len = _v.distanceTo(_v2);
          const mid = _v.add(_v2).multiplyScalar(0.5);
          _v2.sub(mid).normalize();
          _q2.setFromUnitVectors(UP, _v2);
          mid.x += sl.x;
          mid.y += lift;
          mid.z += sl.z;
          _s.set(0.1 * unit, len, 0.1 * unit);
          _m.compose(mid, _q2, _s);
          pan.bonds.setMatrixAt(bondCount++, _m);
        }
      }
      if (c > VISIBLE_CAP) {
        let lbl = pan.labels[labelRow];
        const text = `${prettyFormula(sp.formula)} ×${c}`;
        const entry = labelTexture(kit, text);
        if (!lbl) {
          lbl = new THREE.Sprite(entry.mat);
          kit.tracker.add(lbl.geometry); // Three.js shares one sprite geometry; free its GPU copy on exit too
          lbl.renderOrder = 10;
          pan.labels.push(lbl);
          pan.group.add(lbl);
        }
        lbl.material = entry.mat;
        lbl.visible = true;
        lbl.scale.set(2.6, 0.65, 1);
        lbl.position.set(0, 2.0 + labelRow * 0.7, 0.6);
        labelRow++;
      }
    }
    for (const [col, mesh] of pan.atomMeshes) {
      mesh.count = counters.get(col);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    if (pan.bonds) {
      pan.bonds.count = bondCount;
      pan.bonds.instanceMatrix.needsUpdate = true;
      pan.bonds.computeBoundingSphere();
    }
  }
}

// ---------- Player ----------

function blobTexture(tracker) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return tracker.add(new THREE.CanvasTexture(canvas));
}

function buildPlayer(tracker) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const coat = tracker.add(new THREE.MeshLambertMaterial({ color: 0xf8fafc, flatShading: true }));
  const skin = tracker.add(new THREE.MeshLambertMaterial({ color: 0xe8b48e, flatShading: true }));
  const dark = tracker.add(new THREE.MeshLambertMaterial({ color: 0x1f2937 }));
  const teal = tracker.add(new THREE.MeshLambertMaterial({ color: 0x14b8a6, flatShading: true }));
  const lens = tracker.add(new THREE.MeshBasicMaterial({ color: 0x99f6e4 }));

  const torso = new THREE.Mesh(tracker.add(new THREE.CapsuleGeometry(0.4, 0.55, 3, 8)), coat);
  torso.position.y = 1.0;
  body.add(torso);
  const head = new THREE.Mesh(tracker.add(new THREE.IcosahedronGeometry(0.36, 1)), skin);
  head.position.y = 1.86;
  body.add(head);
  const hair = new THREE.Mesh(tracker.add(new THREE.SphereGeometry(0.38, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2)), dark);
  hair.position.y = 1.92;
  body.add(hair);
  const strap = new THREE.Mesh(tracker.add(new THREE.CylinderGeometry(0.375, 0.375, 0.1, 10, 1, true)), dark);
  strap.position.y = 1.9;
  body.add(strap);
  const lensGeo = tracker.add(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 8));
  lensGeo.rotateX(Math.PI / 2);
  for (const x of [-0.14, 0.14]) {
    const l = new THREE.Mesh(lensGeo, lens);
    l.position.set(x, 1.9, 0.34);
    body.add(l);
  }
  const tank = new THREE.Mesh(tracker.add(new THREE.CylinderGeometry(0.2, 0.2, 0.62, 8)), teal);
  tank.position.set(0, 1.08, -0.42);
  body.add(tank);
  const belt = new THREE.Mesh(tracker.add(new THREE.CylinderGeometry(0.41, 0.41, 0.12, 10, 1, true)), teal);
  belt.position.y = 0.82;
  body.add(belt);

  const legGeo = tracker.add(new THREE.CylinderGeometry(0.11, 0.1, 0.55, 6));
  legGeo.translate(0, -0.27, 0);
  const legs = [-0.17, 0.17].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.58, 0);
    pivot.add(new THREE.Mesh(legGeo, dark));
    group.add(pivot);
    return pivot;
  });

  const shadowGeo = tracker.add(new THREE.PlaneGeometry(1.6, 1.6));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = tracker.add(new THREE.MeshBasicMaterial({ map: blobTexture(tracker), transparent: true, depthWrite: false }));
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.04;
  shadow.renderOrder = 1;
  group.add(shadow);

  return { group, body, legs };
}

// ---------- Finish portal ----------

function buildFinish(theme, tracker) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(tracker.add(new THREE.TorusGeometry(2.4, 0.32, 6, 24)), tracker.add(new THREE.MeshBasicMaterial({ color: theme.accent })));
  ring.position.y = 2.7;
  group.add(ring);
  const discGeo = tracker.add(new THREE.CircleGeometry(2.1, 24));
  const disc = new THREE.Mesh(discGeo, tracker.add(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })));
  disc.position.y = 2.7;
  group.add(disc);
  const base = new THREE.Mesh(tracker.add(new THREE.CylinderGeometry(2.8, 3.1, 0.3, 10)), tracker.add(new THREE.MeshLambertMaterial({ color: theme.stone2, flatShading: true })));
  base.position.y = 0.15;
  group.add(base);
  return group;
}

// ---------- Sparkle burst ----------

export const BURST_COUNT = 28;

function buildBurst(tracker, theme) {
  const mesh = tracker.add(new THREE.InstancedMesh(tracker.add(new THREE.OctahedronGeometry(0.16, 0)), tracker.add(new THREE.MeshBasicMaterial({ color: 0xffffff })), BURST_COUNT));
  const palette = [theme.accent, 0xfde68a, 0xffffff, 0x34d399];
  for (let i = 0; i < BURST_COUNT; i++) mesh.setColorAt(i, _c.set(palette[i % palette.length]));
  mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, vel: new Float32Array(BURST_COUNT * 3), pos: new Float32Array(BURST_COUNT * 3), t: -1 };
}

// ---------- Whole world ----------

/*
  buildWorld({ themeKey, seed, equations:[{eq, boss}] }) -> world object.
  The engine adds world.root to its scene and disposes world.tracker on exit.
*/
export function buildWorld({ themeKey, seed, gates: gateDefs }) {
  const theme = THEMES[themeKey] || THEMES.meadow;
  const tracker = new Tracker();
  const rng = mulberry32(seed);
  const plan = planWorld(gateDefs.length);
  const path = new PathData(plan.length, seed);
  const root = new THREE.Group();

  const hemi = new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, theme.hemi);
  const sun = new THREE.DirectionalLight(theme.sun, theme.sunI);
  sun.position.set(-20, 40, 15);
  root.add(hemi, sun, sun.target);

  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const avoid = [];
  plan.gateS.forEach((s) => {
    path.sample(s, p);
    avoid.push({ x: p.x, z: p.z, r: 11 });
  });
  path.sample(plan.finishS, p);
  avoid.push({ x: p.x, z: p.z, r: 8 });
  path.sample(2, p);
  avoid.push({ x: p.x, z: p.z, r: 5 });

  root.add(buildGround(theme, path, tracker, rng));
  root.add(buildWalkway(theme, path, tracker));
  root.add(buildScenery(theme, path, tracker, rng, avoid));

  const kit = buildGateKit(theme, tracker);
  const frames = tracker.add(new THREE.InstancedMesh(kit.frameGeo, kit.lambertVC, Math.max(1, gateDefs.length)));
  frames.count = gateDefs.length;
  const gates = gateDefs.map((def, i) => {
    const gate = buildGate(kit, def.eq, i, def.boss, theme);
    gate.s = plan.gateS[i];
    path.sample(gate.s, p, t);
    gate.group.position.copy(p);
    gate.group.rotation.y = Math.atan2(-t.x, -t.z);
    gate.group.scale.setScalar(gate.scale);
    gate.group.updateMatrix();
    frames.setMatrixAt(i, gate.group.matrix);
    root.add(gate.group);
    placePans(gate);
    return gate;
  });
  frames.instanceMatrix.needsUpdate = true;
  frames.computeBoundingSphere();
  root.add(frames);

  const finish = buildFinish(theme, tracker);
  path.sample(plan.finishS, p, t);
  finish.position.copy(p);
  finish.rotation.y = Math.atan2(-t.x, -t.z);
  root.add(finish);

  const player = buildPlayer(tracker);
  root.add(player.group);

  const burst = buildBurst(tracker, theme);
  root.add(burst.mesh);

  return { theme, tracker, root, path, plan, gates, kit, player, finish, burst, frames };
}
