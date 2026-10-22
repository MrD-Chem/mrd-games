/*
  Balance Quest — 3D engine: renderer, the single render loop, player movement,
  follow camera, gate animations. Rendering is on demand: the loop only runs while
  something is moving or animating, and stops when the tab is hidden.
*/

import * as THREE from '../vendor/three.module.min.js?v=r170';
import { buildWorld, updatePans, placePans, HALF_WIDTH, PIVOT_Y, BURST_COUNT } from './scene3d.js?v=20261022T1625';
import { scaleTilt } from './chem.js?v=20261022T1625';

const SPEED = 6.4;
const SIDE_SPEED = 4.8;
const MAX_TILT = 0.3;
const FOLLOW_DIST = 7.4;
const FOLLOW_HEIGHT = 4.1;
const NEAR_RANGE = 6.5;
const PIXEL_CAP = 1600000; // max backing-store pixels (keeps Chromebooks smooth)
const OPEN_LIFT = 1.8;
const DOOR_DOWN = -7.6;

/* Can this browser make a WebGL2 context at all? (Three.js r170 needs WebGL2.) */
export function hasWebGL2() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return true;
  } catch (err) {
    return false;
  }
}

function approachAngle(cur, target, rate) {
  let d = target - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return cur + d * rate;
}

export class Engine {
  constructor({ canvas, reducedMotion = false, onNearGate, onFinish, onContextLost }) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas = canvas;
    this.reducedMotion = reducedMotion;
    this.onNearGate = onNearGate || (() => {});
    this.onFinish = onFinish || (() => {});
    this.onContextLost = onContextLost || (() => {});

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: dpr <= 1,
      powerPreference: 'default',
      stencil: false,
      alpha: false
    });
    this.renderer.setClearColor(0x08090b, 1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.3, 90);
    this.baseline = { geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures };

    this.world = null;
    this.mode = 'idle'; // 'walk' | 'puzzle' | 'idle'
    this.input = { x: 0, y: 0 };
    this.width = 0;
    this.height = 0;
    this.pixelRatio = 1;
    this.portrait = 0;
    this.overlap = 0; // share of the 3D view covered by the puzzle panel (target)
    this.overlapShown = 0; // eased value the camera uses
    this.puzzleGate = -1;
    this.camBlend = 0;
    this.nearGate = -1;
    this.finished = false;

    // Player state
    this.s = 4;
    this.d = 0;
    this.yaw = Math.PI;
    this.walk = 0;
    this.legAmp = 0;

    // Loop state
    this._raf = 0;
    this._pending = 0;
    this._maxPending = 0;
    this._last = 0;
    this._hidden = document.visibilityState === 'hidden';
    this._lost = false;
    this._frameMs = new Float32Array(30);
    this._frameIdx = 0;
    this._frameCount = 0;
    this._calls = 0;
    this._triangles = 0;
    this._frames = 0;

    // Reused math objects (no allocations inside the loop)
    this._P = new THREE.Vector3();
    this._T = new THREE.Vector3();
    this._P2 = new THREE.Vector3();
    this._T2 = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._player = new THREE.Vector3();
    this._followPos = new THREE.Vector3();
    this._followTarget = new THREE.Vector3();
    this._wantPos = new THREE.Vector3();
    this._wantTarget = new THREE.Vector3();
    this._puzPos = new THREE.Vector3();
    this._puzTarget = new THREE.Vector3();
    this._camTarget = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._sc = new THREE.Vector3();

    this._frame = this._frame.bind(this);
    this._onVisibility = this._onVisibility.bind(this);
    this._onLost = this._onLost.bind(this);
    document.addEventListener('visibilitychange', this._onVisibility);
    canvas.addEventListener('webglcontextlost', this._onLost, false);
  }

  // ---------- Loop ----------

  wake() {
    if (this._raf || !this.world || this._hidden || this._lost) return;
    this._pending++;
    if (this._pending > this._maxPending) this._maxPending = this._pending;
    this._raf = requestAnimationFrame(this._frame);
  }

  _stopLoop() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
      this._pending--;
    }
    this._last = 0;
  }

  _frame(now) {
    this._raf = 0;
    this._pending--;
    if (!this.world || this._lost) return;
    let dt = 1 / 60;
    if (this._last) {
      const ms = now - this._last;
      this._frameMs[this._frameIdx] = ms;
      this._frameIdx = (this._frameIdx + 1) % this._frameMs.length;
      if (this._frameCount < this._frameMs.length) this._frameCount++;
      dt = Math.min(0.05, Math.max(0.001, ms / 1000));
    }
    this._last = now;
    const busy = this._update(dt);
    this.renderer.render(this.scene, this.camera);
    this._frames++;
    this._calls = this.renderer.info.render.calls;
    this._triangles = this.renderer.info.render.triangles;
    if (busy) this.wake();
    else this._last = 0;
  }

  _onVisibility() {
    this._hidden = document.visibilityState === 'hidden';
    if (this._hidden) this._stopLoop();
    else this.wake();
  }

  _onLost(event) {
    event.preventDefault();
    this._lost = true;
    this._stopLoop();
    this.onContextLost();
  }

  /* Render one frame right now (used by tests and after big changes). */
  renderNow() {
    if (!this.world || this._lost) return;
    this._updateCamera(1, true);
    this.renderer.render(this.scene, this.camera);
    this._frames++;
    this._calls = this.renderer.info.render.calls;
    this._triangles = this.renderer.info.render.triangles;
  }

  // ---------- Size ----------

  resize(width, height) {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    let pr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (w * h * pr * pr > PIXEL_CAP) pr = Math.max(0.5, Math.sqrt(PIXEL_CAP / (w * h)));
    this.width = w;
    this.height = h;
    this.pixelRatio = pr;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Tall phone screens get a wider view (and the camera backs up more near gates).
    const hfov = (48 * Math.PI) / 180;
    const vfov = (2 * Math.atan(Math.tan(hfov / 2) / this.camera.aspect) * 180) / Math.PI;
    this.camera.fov = Math.min(80, Math.max(55, vfov));
    this.portrait = Math.min(1, Math.max(0, (1.1 - this.camera.aspect) / 0.6));
    this._applyViewOffset();
    this.camera.updateProjectionMatrix();
    this.wake();
  }

  _applyViewOffset() {
    const e = this._ease(this.camBlend);
    const shift = (this.overlapShown * this.height * e) / 2;
    if (shift > 0.5) this.camera.setViewOffset(this.width, this.height, 0, shift, this.width, this.height);
    else if (this.camera.view && this.camera.view.enabled) this.camera.clearViewOffset();
  }

  // ---------- World lifecycle ----------

  /*
    enter({ themeKey, seed, gates:[{eq, boss, solved, coefficients}] }, startGate)
    Builds the world and places the player just before gate startGate.
  */
  enter(def, startGate = 0) {
    this.exit();
    const world = buildWorld(def);
    this.world = world;
    const theme = world.theme;
    this.scene.background = new THREE.Color(theme.sky);
    this.scene.fog = new THREE.Fog(theme.sky, theme.fogNear, theme.fogFar);
    this.camera.far = theme.fogFar + 6;
    this.camera.updateProjectionMatrix();
    this.scene.add(world.root);

    def.gates.forEach((g, i) => {
      const gate = world.gates[i];
      if (g.solved) this._setOpen(gate, true);
      this.showCoefficients(i, g.solved ? g.eq.coefficients : g.display || []);
      gate.tilt = gate.tiltTarget;
      placePans(gate);
    });

    this.finished = false;
    this.mode = 'walk';
    this.puzzleGate = -1;
    this.camBlend = 0;
    this.nearGate = -1;
    const firstClosed = world.gates.findIndex((g) => !g.open);
    const startS = startGate > 0 && firstClosed > 0 ? world.gates[Math.min(startGate, firstClosed) - 1].s + 4 : 4;
    this.teleport(startS, 0);
    this.renderNow();
    this.wake();
    return world.gates.length;
  }

  exit() {
    this._stopLoop();
    if (!this.world) return;
    this.scene.remove(this.world.root);
    this.world.tracker.disposeAll();
    this.world = null;
    this.scene.background = null;
    this.scene.fog = null;
    this.renderer.renderLists.dispose();
    this.camera.clearViewOffset();
    this.mode = 'idle';
    this.input.x = 0;
    this.input.y = 0;
  }

  destroy() {
    this.exit();
    document.removeEventListener('visibilitychange', this._onVisibility);
    this.canvas.removeEventListener('webglcontextlost', this._onLost, false);
    this.renderer.dispose();
  }

  // ---------- Player ----------

  setInput(x, y) {
    this.input.x = x;
    this.input.y = y;
    if (x || y) this.wake();
  }

  setMode(mode) {
    this.mode = mode;
    if (mode !== 'walk') {
      this.input.x = 0;
      this.input.y = 0;
    }
    this.wake();
  }

  teleport(s, d = 0) {
    if (!this.world) return;
    this.s = Math.min(Math.max(s, 0.5), this._maxS());
    this.d = d;
    this._placePlayer();
    this._computeFollow(this._wantPos, this._wantTarget);
    this._followPos.copy(this._wantPos);
    this._followTarget.copy(this._wantTarget);
    this._checkNear();
    this.wake();
  }

  teleportToGate(i) {
    const g = this.world && this.world.gates[i];
    if (!g) return;
    this.s = g.s - 3;
    this.teleport(g.s - 3, 0);
  }

  teleportToFinish() {
    if (!this.world) return;
    this.teleport(this.world.plan.finishS, 0);
  }

  _maxS() {
    const w = this.world;
    for (let i = 0; i < w.gates.length; i++) {
      const g = w.gates[i];
      if (!g.open) return g.s - 2.4 * g.scale;
    }
    return w.plan.finishS + 3;
  }

  _placePlayer() {
    const w = this.world;
    w.path.sample(this.s, this._P, this._T);
    this._player.set(this._P.x - this._T.z * this.d, 0, this._P.z + this._T.x * this.d);
    w.player.group.position.copy(this._player);
    w.player.group.rotation.y = this.yaw;
  }

  _checkNear() {
    const w = this.world;
    let near = -1;
    for (let i = 0; i < w.gates.length; i++) {
      const g = w.gates[i];
      if (!g.open) {
        if (this.s >= g.s - NEAR_RANGE * g.scale) near = i;
        break;
      }
    }
    if (near !== this.nearGate) {
      this.nearGate = near;
      this.onNearGate(near);
    }
    if (!this.finished && this.s >= w.plan.finishS - 1.2) {
      let allOpen = true;
      for (let i = 0; i < w.gates.length; i++) if (!w.gates[i].open) allOpen = false;
      if (allOpen) {
        this.finished = true;
        this.onFinish();
      }
    }
  }

  _updatePlayer(dt) {
    const ix = this.input.x;
    const iy = this.input.y;
    const moving = this.mode === 'walk' && (ix !== 0 || iy !== 0);
    const w = this.world;
    if (moving) {
      w.path.sample(this.s, this._P, this._T);
      this.s = Math.min(Math.max(this.s + iy * SPEED * dt, 0.5), this._maxS());
      const lim = HALF_WIDTH - 0.45;
      this.d = Math.min(Math.max(this.d + ix * SIDE_SPEED * dt, -lim), lim);
      const vx = this._T.x * iy * SPEED - this._T.z * ix * SIDE_SPEED;
      const vz = this._T.z * iy * SPEED + this._T.x * ix * SIDE_SPEED;
      this.yaw = approachAngle(this.yaw, Math.atan2(vx, vz), Math.min(1, dt * 12));
      this.walk += dt * 11 * Math.min(1, Math.hypot(ix, iy));
      this._placePlayer();
      this._checkNear();
    }
    const targetAmp = moving ? 1 : 0;
    const prevAmp = this.legAmp;
    this.legAmp += (targetAmp - this.legAmp) * Math.min(1, dt * 10);
    if (Math.abs(this.legAmp - targetAmp) < 0.01) this.legAmp = targetAmp;
    if (moving || prevAmp !== this.legAmp) {
      const swing = Math.sin(this.walk) * 0.7 * this.legAmp;
      const pl = w.player;
      pl.legs[0].rotation.x = swing;
      pl.legs[1].rotation.x = -swing;
      pl.body.position.y = Math.abs(Math.cos(this.walk)) * 0.07 * this.legAmp;
      return true;
    }
    return false;
  }

  // ---------- Camera ----------

  _ease(t) {
    return t * t * (3 - 2 * t);
  }

  _computeFollow(outPos, outTarget) {
    const w = this.world;
    w.path.sample(this.s, this._P, this._T);
    w.path.sample(Math.min(this.s + 4, w.path.length), this._P2, this._T2);
    this._dir.copy(this._T).add(this._T2).normalize();
    // Near a closed gate the camera backs up and looks higher so the whole scale shows.
    let nf = 0;
    for (let i = 0; i < w.gates.length; i++) {
      const g = w.gates[i];
      if (!g.open) {
        const gap = (g.s - this.s) / g.scale;
        nf = Math.min(1, Math.max(0, (10 - gap) / 7));
        nf = nf * nf * (3 - 2 * nf);
        break;
      }
    }
    const back = 3.2 + 4.5 * this.portrait;
    outPos.copy(this._player).addScaledVector(this._dir, -(FOLLOW_DIST + back * nf));
    outPos.y = FOLLOW_HEIGHT + (1.4 + 1.2 * this.portrait) * nf;
    outTarget.copy(this._player).addScaledVector(this._dir, 2.6 + 1.5 * nf);
    outTarget.y = 1.3 + 2.4 * nf;
  }

  _computePuzzle(outPos, outTarget) {
    const g = this.world.gates[this.puzzleGate];
    const ry = g.group.rotation.y;
    const fx = Math.sin(ry);
    const fz = Math.cos(ry);
    const sc = g.scale;
    outTarget.copy(g.group.position);
    outTarget.y = (PIVOT_Y - 1.35) * sc;
    const tanV = Math.tan((this.camera.fov * Math.PI) / 360);
    const aspect = this.width / Math.max(1, this.height);
    const visible = Math.max(0.2, 1 - this.overlapShown);
    const W = 12.8 * sc;
    const H = 5.6 * sc;
    const dist = Math.max(W / 2 / (tanV * aspect), H / 2 / (tanV * visible)) + 1.2;
    outPos.set(outTarget.x + fx * dist, outTarget.y + 0.9, outTarget.z + fz * dist);
    return dist;
  }

  _updateCamera(dt, snap = false) {
    if (!this.world) return false;
    let busy = false;
    this._computeFollow(this._wantPos, this._wantTarget);
    if (snap || this.reducedMotion) {
      this._followPos.copy(this._wantPos);
      this._followTarget.copy(this._wantTarget);
    } else {
      const k = 1 - Math.exp(-dt * 6);
      this._followPos.lerp(this._wantPos, k);
      this._followTarget.lerp(this._wantTarget, k);
      if (this._followPos.distanceToSquared(this._wantPos) > 1e-5 || this._followTarget.distanceToSquared(this._wantTarget) > 1e-5) busy = true;
    }
    // Ease toward the panel's current height (it grows when a hint appears).
    if (this.overlapShown !== this.overlap) {
      if (snap || this.reducedMotion || this.camBlend === 0) this.overlapShown = this.overlap;
      else {
        this.overlapShown += (this.overlap - this.overlapShown) * (1 - Math.exp(-dt * 6));
        if (Math.abs(this.overlap - this.overlapShown) < 0.002) this.overlapShown = this.overlap;
        busy = true;
      }
    }
    const wantBlend = this.puzzleGate >= 0 ? 1 : 0;
    if (this.camBlend !== wantBlend) {
      if (this.reducedMotion || snap) this.camBlend = wantBlend;
      else {
        const step = dt / 0.7;
        this.camBlend = wantBlend > this.camBlend ? Math.min(1, this.camBlend + step) : Math.max(0, this.camBlend - step);
        busy = true;
      }
    }
    const e = this._ease(this.camBlend);
    const cam = this.camera;
    const theme = this.world.theme;
    let extra = 0;
    if (e > 0 && this.puzzleGate >= 0) {
      const dist = this._computePuzzle(this._puzPos, this._puzTarget);
      cam.position.copy(this._followPos).lerp(this._puzPos, e);
      this._camTarget.copy(this._followTarget).lerp(this._puzTarget, e);
      // A far-back puzzle camera clips away anything in front of the gate (like the
      // previous gate) with the near plane, and pushes the fog back by the same amount.
      extra = Math.max(0, dist - 9) * e;
    } else {
      cam.position.copy(this._followPos);
      this._camTarget.copy(this._followTarget);
    }
    cam.near = 0.3 + extra;
    cam.far = theme.fogFar + 6 + extra;
    if (this.scene.fog) {
      this.scene.fog.near = theme.fogNear + extra;
      this.scene.fog.far = theme.fogFar + extra;
    }
    cam.lookAt(this._camTarget);
    this._applyViewOffset();
    cam.updateProjectionMatrix();
    return busy;
  }

  // ---------- Puzzle camera ----------

  openPuzzle(i, overlap) {
    this.puzzleGate = i;
    this.overlap = Math.min(0.8, Math.max(0, overlap || 0));
    if (this.camBlend === 0) this.overlapShown = this.overlap;
    this.setMode('puzzle');
  }

  setOverlap(overlap) {
    this.overlap = Math.min(0.8, Math.max(0, overlap || 0));
    this.wake();
  }

  closePuzzle() {
    this.puzzleGate = -1;
    this.setMode('walk');
    if (this.reducedMotion) this.camBlend = 0;
  }

  // ---------- Gates ----------

  showCoefficients(i, coefficients) {
    const g = this.world && this.world.gates[i];
    if (!g) return;
    updatePans(this.world.kit, g, coefficients);
    if (!g.open) {
      const t = scaleTilt(g.eq, coefficients);
      g.tiltTarget = t.sign * t.amount * MAX_TILT;
    }
    this.wake();
  }

  /* The gate was solved: level the scale, sparkle, then open the door. */
  solveGate(i) {
    const g = this.world && this.world.gates[i];
    if (!g || g.open) return;
    updatePans(this.world.kit, g, g.eq.coefficients);
    g.open = true;
    g.tiltTarget = 0;
    if (this.reducedMotion) {
      g.tilt = 0;
      g.tiltVel = 0;
      this._setOpen(g, true);
    } else {
      g.celebrateAt = 0;
      g.burstFired = false;
    }
    this._checkNear();
    this.wake();
  }

  _setOpen(g, instant) {
    g.open = true;
    g.gem.material = this.world.kit.gemOpen;
    g.doorTarget = DOOR_DOWN;
    g.liftTarget = OPEN_LIFT;
    g.tiltTarget = 0;
    if (instant) {
      g.doorY = DOOR_DOWN;
      g.lift = OPEN_LIFT;
      g.tilt = 0;
      g.door.visible = false;
      placePans(g);
    }
  }

  _animateGate(g, dt) {
    let changed = false;
    const diff = g.tiltTarget - g.tilt;
    if (Math.abs(diff) > 0.0004 || Math.abs(g.tiltVel) > 0.0004) {
      if (this.reducedMotion) {
        g.tilt += diff * Math.min(1, dt * 12);
        g.tiltVel = 0;
        if (Math.abs(diff) < 0.003) g.tilt = g.tiltTarget;
      } else {
        const acc = 40 * diff - 7 * g.tiltVel;
        g.tiltVel += acc * dt;
        g.tilt += g.tiltVel * dt;
      }
      changed = true;
    } else if (g.tilt !== g.tiltTarget) {
      g.tilt = g.tiltTarget;
      g.tiltVel = 0;
      changed = true;
    }
    if (g.celebrateAt >= 0) {
      g.celebrateAt += dt;
      if (g.celebrateAt > 0.45 && !g.burstFired) {
        g.burstFired = true;
        g.gem.material = this.world.kit.gemOpen;
        this._fireBurst(g);
      }
      if (g.celebrateAt > 0.95) this._setOpen(g, false);
      if (g.celebrateAt > 3) g.celebrateAt = -1;
      changed = true;
    }
    if (g.doorY !== g.doorTarget) {
      const step = dt * 5.5;
      g.doorY = g.doorTarget < g.doorY ? Math.max(g.doorTarget, g.doorY - step) : Math.min(g.doorTarget, g.doorY + step);
      g.door.visible = g.doorY > DOOR_DOWN + 0.01;
      changed = true;
    }
    if (g.lift !== g.liftTarget) {
      const step = dt * 1.6;
      g.lift = g.liftTarget > g.lift ? Math.min(g.liftTarget, g.lift + step) : Math.max(g.liftTarget, g.lift - step);
      changed = true;
    }
    if (changed) placePans(g);
    return changed;
  }

  _fireBurst(g) {
    const b = this.world.burst;
    this._tmp.set(0, PIVOT_Y, 0.4);
    g.group.localToWorld(this._tmp);
    for (let i = 0; i < BURST_COUNT; i++) {
      const a = (i / BURST_COUNT) * Math.PI * 2;
      const up = 3 + ((i * 7) % 5);
      b.pos[i * 3] = this._tmp.x;
      b.pos[i * 3 + 1] = this._tmp.y;
      b.pos[i * 3 + 2] = this._tmp.z;
      b.vel[i * 3] = Math.cos(a) * (3 + (i % 3));
      b.vel[i * 3 + 1] = up;
      b.vel[i * 3 + 2] = Math.sin(a) * (3 + (i % 4)) * 0.6;
    }
    b.t = 0;
    b.mesh.visible = true;
  }

  _updateBurst(dt) {
    const b = this.world.burst;
    if (b.t < 0) return false;
    b.t += dt;
    const life = 1.4;
    if (b.t > life) {
      b.t = -1;
      b.mesh.visible = false;
      return true;
    }
    const size = 1 - b.t / life;
    for (let i = 0; i < BURST_COUNT; i++) {
      b.vel[i * 3 + 1] -= 9 * dt;
      b.pos[i * 3] += b.vel[i * 3] * dt;
      b.pos[i * 3 + 1] += b.vel[i * 3 + 1] * dt;
      b.pos[i * 3 + 2] += b.vel[i * 3 + 2] * dt;
      this._tmp.set(b.pos[i * 3], b.pos[i * 3 + 1], b.pos[i * 3 + 2]);
      this._q.identity();
      this._sc.setScalar(size * 1.4);
      this._m.compose(this._tmp, this._q, this._sc);
      b.mesh.setMatrixAt(i, this._m);
    }
    b.mesh.instanceMatrix.needsUpdate = true;
    return true;
  }

  _update(dt) {
    let busy = this._updatePlayer(dt);
    if (this.camBlend > 0 && this.puzzleGate < 0 && this.mode === 'walk') busy = true;
    const gates = this.world.gates;
    for (let i = 0; i < gates.length; i++) {
      if (this._animateGate(gates[i], dt)) busy = true;
    }
    if (this._updateBurst(dt)) busy = true;
    if (this._updateCamera(dt)) busy = true;
    return busy;
  }

  // ---------- Info ----------

  isAnimating() {
    return this._raf !== 0;
  }

  stats() {
    const info = this.renderer.info;
    let sum = 0;
    for (let i = 0; i < this._frameCount; i++) sum += this._frameMs[i];
    const fps = this._frameCount ? Math.round((1000 * this._frameCount) / sum) : null;
    return {
      mode: '3d',
      renderer: {
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs ? info.programs.length : null,
        calls: this._calls,
        triangles: this._triangles,
        baseline: { ...this.baseline }
      },
      rafChains: this._pending,
      maxRafChains: this._maxPending,
      fps,
      framesRendered: this._frames,
      camera: { blend: Math.round(this.camBlend * 100) / 100, overlap: Math.round(this.overlap * 100) / 100, puzzleGate: this.puzzleGate, viewOffset: !!(this.camera.view && this.camera.view.enabled) },
      player: { s: Math.round(this.s * 10) / 10, d: Math.round(this.d * 10) / 10, nearGate: this.nearGate },
      pixelRatio: this.pixelRatio,
      size: [this.width, this.height],
      contextLost: this._lost
    };
  }
}
