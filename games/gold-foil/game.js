"use strict";

/* Gold Foil Shooter - game logic.
   Part 1: pure functions (science, path geometry, answer checking, scoring). No page or storage access.
   Part 2: the page (only runs in a browser). */

const SCIENCE = window.GOLD_FOIL_DATA.science;
const MAX_STARS = 27;
const LEVEL_COUNT = 9;

/* The picture is 480 x 480 "pixels" (it scales to fit the screen). */
const GEOM = {
  size: 480, cx: 240, cy: 240,
  ringR: 215,            // detector screen radius
  startX: 80,            // where every particle starts (the source is a tall bar on the left)
  wholeR: 22, rowGap: 44, rows: 2,   // whole-foil view: atom radius, spacing, rows above/below centre
  closeR: 130            // close-up view: atom radius
};

/* ---------- Physics ---------- */

/* Rutherford scattering (truthful simplification).
   For a point-like positive nucleus that repels an alpha particle with the 1/r^2 Coulomb force, the exact result is
   tan(theta/2) = K / b, i.e. theta = 2 * atan(K / b), where b is the distance of the particle's line of flight from the nucleus.
   Simplifications: (1) we use one nucleus per particle (a real foil is thousands of layers thick, and the real beam is
   spread over the atom's AREA, which would make bounces far rarer: about 1 in 8000); (2) b is spread evenly from 0 to R,
   and K = kRatio * R is chosen so the percentages match the notes. b here is given as a fraction of R (0 to 1). */
function scatterAngle(b) {
  if (!(b > 0)) return 180;
  return 2 * Math.atan(SCIENCE.kRatio / b) * 180 / Math.PI;
}

/* Which tally bin does an angle (degrees, sign ignored) belong in? */
function classifyAngle(deg) {
  const a = Math.abs(deg);
  if (a < SCIENCE.straightBelow) return "straight";
  if (a > SCIENCE.backAbove) return "back";
  return "bent";
}

/* Small seeded random number generator (mulberry32), so tests are repeatable. */
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* One alpha particle. u = impact distance as a fraction of the atom radius; side = which side of the nucleus
   (-1 above, +1 below); turn = which way it bends (+1 down, -1 up); theta = size of the bend in degrees. */
function shoot(foil, rng) {
  const side = rng() < 0.5 ? -1 : 1;
  const u = rng();
  if (foil === "plum") {
    // Thomson: no concentrated charge, so only a tiny random wobble (at most plumMaxDeg either way).
    const theta = rng() * SCIENCE.plumMaxDeg;
    return { u, side, turn: rng() < 0.5 ? -1 : 1, theta, bin: classifyAngle(theta) };
  }
  // Nuclear atom ("real" foil uses the same physics): a positive nucleus pushes the particle away from itself.
  const theta = scatterAngle(u);
  return { u, side, turn: side, theta, bin: classifyAngle(theta) };
}

function emptyCounts() { return { straight: 0, bent: 0, back: 0 }; }
const firedAt = {};   // per foil: how many particles were fired and whether one has bounced back yet (see fireVolley)

function simulate(foil, n, rng) {
  const c = emptyCounts();
  for (let i = 0; i < n; i++) c[shoot(foil, rng).bin]++;
  return c;
}

const percent = (n, total) => total ? 100 * n / total : 0;
function formatPercent(n, total) {
  const p = percent(n, total);
  return (p === 0 || p === 100 ? String(p) : p.toFixed(1)) + "%";
}

/* Close-up view lens: the nucleus is drawn far too big, and paths near it are stretched so students can see them.
   The drawn offset from the nucleus is R * sqrt(u). The aim slider (-100..100) uses the same lens, so a drawn
   offset of a/100 * R means u = (a/100)^2. */
const lensOffset = (u, R) => R * Math.sqrt(u);
const aimToImpact = a => Math.pow(Math.min(1, Math.abs(a) / 100), 2);

/* ---------- Path geometry (all points in picture pixels, y grows downward) ---------- */

/* Where does a ray from (px,py) in direction (dx,dy) leave a circle centred (cx,cy) of radius R? (start is inside) */
function rayToCircle(px, py, dx, dy, cx, cy, R) {
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  const fx = px - cx, fy = py - cy;
  const bq = fx * dx + fy * dy;
  const disc = bq * bq - (fx * fx + fy * fy - R * R);
  const t = -bq + Math.sqrt(Math.max(0, disc));
  return { x: px + dx * t, y: py + dy * t };
}

/* The exact repulsive-Coulomb orbit (a hyperbola) around a nucleus at the origin.
   b = distance of the incoming line from the nucleus (pixels), thetaDeg = total bend, side = -1 passes above, +1 below.
   The particle arrives travelling to the right and leaves bent AWAY from the nucleus. Returns points and the apex index. */
function hyperbolaPath(b, thetaDeg, side, rMax, nEach) {
  const th = Math.min(179.5, thetaDeg) * Math.PI / 180;
  if (thetaDeg < 0.02) return { pts: [{ x: -rMax, y: side * b }, { x: 0, y: side * b }, { x: rMax, y: side * b }], apex: 1 };
  const s = Math.sin(th / 2), e = 1 / s;
  const p = b * Math.cos(th / 2) / s;          // semi-latus rectum
  const rmin = p / (e - 1);                    // closest approach
  const rm = Math.max(rMax, rmin * 1.5);
  const rot = -(Math.PI / 2 + th / 2);         // turns the orbit so the particle arrives heading right
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const at = (r, sign) => {
    const phi = sign * Math.acos(Math.min(1, (p / r + 1) / e));
    const x = r * Math.cos(phi), y = r * Math.sin(phi);
    return { x: x * cr - y * sr, y: x * sr + y * cr };
  };
  const pts = [];
  for (let i = nEach; i >= 0; i--) pts.push(at(rmin * Math.pow(rm / rmin, i / nEach), -1));
  const apex = pts.length - 1;
  for (let i = 1; i <= nEach; i++) pts.push(at(rmin * Math.pow(rm / rmin, i / nEach), 1));
  // The orbit above is the "passes above" version (it bends upward); mirror it for the other side.
  if (side > 0) pts.forEach(q => { q.y = -q.y; });
  return { pts, apex };
}

/* Cut a long path so it starts at x = startX and stops where it meets the detector ring. */
function clipPath(pts, apex, startX, cx, cy, ringR) {
  let i = 0;
  while (i < apex && pts[i].x < startX) i++;
  const out = [];
  if (i > 0 && pts[i].x !== pts[i - 1].x) {
    const f = (startX - pts[i - 1].x) / (pts[i].x - pts[i - 1].x);
    out.push({ x: startX, y: pts[i - 1].y + f * (pts[i].y - pts[i - 1].y) });
  }
  let j = Math.max(i, apex);
  for (let k = i; k <= j; k++) out.push(pts[k]);
  while (j + 1 < pts.length && Math.hypot(pts[j + 1].x - cx, pts[j + 1].y - cy) < ringR) { j++; out.push(pts[j]); }
  const a = pts[j], c = pts[Math.min(j + 1, pts.length - 1)];
  out.push(rayToCircle(a.x, a.y, c.x - a.x, c.y - a.y, cx, cy, ringR));
  return out;
}

/* Plum pudding path: a straight line that turns smoothly (and only a little) while crossing the atom. */
function bendPath(y0, signedDeg, xa, xb, startX, cx, cy, ringR) {
  const pts = [{ x: startX, y: y0 }, { x: xa, y: y0 }];
  let y = y0;
  const steps = 16, dx = (xb - xa) / steps;
  for (let i = 1; i <= steps; i++) {
    const t = (i - 0.5) / steps, sm = t * t * (3 - 2 * t);
    y += Math.tan(signedDeg * sm * Math.PI / 180) * dx;
    pts.push({ x: xa + i * dx, y });
  }
  const ang = signedDeg * Math.PI / 180;
  const last = pts[pts.length - 1];
  pts.push(rayToCircle(last.x, last.y, Math.cos(ang), Math.sin(ang), cx, cy, ringR));
  return pts;
}

/* Full path for one shot. row = which atom in the column (whole view only). Returns { pts, landing angle in radians }. */
function buildPath(shot, foil, zoom, row) {
  const G = GEOM, R = zoom === "close" ? G.closeR : G.wholeR;
  const ny = zoom === "close" ? G.cy : G.cy + row * G.rowGap;
  let pts;
  if (foil === "plum") {
    pts = bendPath(ny + shot.side * shot.u * R, shot.turn * shot.theta, G.cx - R, G.cx + R, G.startX, G.cx, G.cy, G.ringR);
  } else {
    // Keep the drawn turn at least a few pixels wide so the path always bends smoothly, never in a sharp corner.
    // (Near the nucleus the closest approach is b * sqrt((e+1)/(e-1)) where e = 1 / sin(theta/2).)
    const e = 1 / Math.sin(Math.min(179.5, Math.max(0.05, shot.theta)) * Math.PI / 360);
    const minTurn = zoom === "close" ? 8 : 6;
    const b = Math.max(0.25, lensOffset(shot.u, R), minTurn / Math.sqrt((e + 1) / (e - 1)));
    const h = hyperbolaPath(b, shot.theta, shot.side, 420, 56);
    const moved = h.pts.map(q => ({ x: q.x + G.cx, y: q.y + ny }));
    pts = clipPath(moved, h.apex, G.startX, G.cx, G.cy, G.ringR);
  }
  const end = pts[pts.length - 1];
  return { pts, angle: Math.atan2(end.y - G.cy, end.x - G.cx) };
}

/* ---------- Answer checking and scoring ---------- */

/* order: array of model ids as the student arranged them. */
function checkOrder(order, answer) {
  const right = answer.map((id, i) => order[i] === id);
  return { ok: right.every(Boolean) && order.length === answer.length, right };
}

/* pairs: { scientistId: evidenceId }. Evidence cards use the same ids as their scientist. */
function checkMatch(pairs, ids) {
  const right = {};
  ids.forEach(id => { right[id] = pairs[id] === id; });
  return { ok: ids.every(id => right[id]), right };
}

/* 3 stars first try, 2 second try, 1 if the answer was shown. Do-levels give 3 when finished. */
function starsFor(doLevel, misses, revealed) {
  if (doLevel) return 3;
  if (revealed) return 1;
  return misses > 0 ? 2 : 3;
}

function cardText(stars, done) {
  return "★ " + stars + " of " + MAX_STARS + " · " + done + " of " + LEVEL_COUNT + " levels";
}

/* ======================================================================= */

if (typeof document !== "undefined") (() => {
  const data = window.GOLD_FOIL_DATA;
  const copy = data.text;
  const levels = data.levels;
  const storageKey = "mrd-gold-foil";
  const $ = id => document.getElementById("gf-" + id);
  const format = (tpl, v = {}) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
  const t = (key, v) => format(copy[key], v);
  const BINS = ["straight", "bent", "back"];
  const COMPARE_MIN = 500, COMPARE_TOTAL = 2000;   // side-by-side table: top up foils with fewer than 500 shots to 2000
  const BIN_NAME = { straight: copy.binStraight, bent: copy.binBent, back: copy.binBack };
  const BIN_RANGE = { straight: copy.binStraightRange, bent: copy.binBentRange, back: copy.binBackRange };
  const BIN_GLYPH = { straight: "●", bent: "◆", back: "■" };
  const FOIL_BUTTONS = [["plum", copy.foilPlum], ["nuclear", copy.foilNuclear], ["real", copy.foilReal]];
  const motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  function node(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function svg(tag, attrs, parent) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (parent) parent.append(el);
    return el;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const model = id => data.models.find(m => m.id === id);
  const foilName = foil => data.foils[foil].name;
  const starText = n => "★".repeat(n) + "☆".repeat(3 - n);

  /* ---------- Saved progress ---------- */
  function readSaved() {
    try {
      const s = JSON.parse(localStorage.getItem(storageKey));
      return s && typeof s === "object" ? s : {};
    } catch (_) { return {}; }
  }
  const saved = readSaved();
  const starsById = {};   // level id -> best stars (1-3)
  levels.forEach(l => {
    const v = saved.levels && Number(saved.levels[l.id]);
    if (v >= 1 && v <= 3) starsById[l.id] = Math.round(v);
  });
  const totalStars = () => Object.values(starsById).reduce((a, b) => a + b, 0);
  const doneCount = () => Object.keys(starsById).length;
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ v: 1, levels: starsById, card: cardText(totalStars(), doneCount()) })); }
    catch (_) { /* Storage may be blocked at school. The game still works. */ }
  }

  /* ---------- State ---------- */
  const state = {
    screen: "start", levelIdx: 0, token: 0,
    foil: "real", zoom: "whole", aim: 40,
    lock: { foil: false, zoom: false, fire: false },
    counts: { plum: emptyCounts(), nuclear: emptyCounts(), real: emptyCounts() },
    hits: { plum: [], nuclear: [], real: [] }
  };
  let run = null;       // progress through the current level
  let parts = [];       // particles in flight, and fading paths
  let raf = 0;
  let dirty = false;    // tally changed since last UI update
  let lastSummary = ""; // last text sent to the screen-reader summary

  const level = () => levels[state.levelIdx];
  const labOn = () => !!level().lab;

  /* ---------- Page text ---------- */
  document.querySelectorAll("[data-copy]").forEach(el => {
    const v = copy[el.dataset.copy];
    if (typeof v === "string") el.textContent = v;
  });

  /* ---------- Screens ---------- */
  function show(name) {
    state.screen = name;
    $("start").hidden = name !== "start";
    $("play").hidden = name !== "play";
    $("end").hidden = name !== "end";
    if (name !== "play") flushParticles();
    const heading = name === "start" ? $("title") : name === "end" ? $("end-title") : $("card-title");
    window.scrollTo(0, 0);
    heading.focus({ preventScroll: true });
  }

  function nextTarget(from) {
    for (let i = from + 1; i < levels.length; i++) if (!starsById[levels[i].id]) return i;
    for (let i = 0; i < levels.length; i++) if (!starsById[levels[i].id]) return i;
    return -1;
  }

  function renderStart() {
    const list = $("levels");
    list.textContent = "";
    levels.forEach((l, i) => {
      const li = node("li");
      const btn = node("button", "btn btn-ghost gf-level");
      btn.type = "button";
      btn.append(node("span", "gf-level-num", String(l.id)));
      btn.append(node("span", "gf-level-name", l.name));
      btn.append(node("span", "gf-level-blurb", l.blurb));
      const s = starsById[l.id];
      const meta = node("span", "gf-level-meta");
      if (s) {
        meta.append(node("span", "gf-check", "✓"));
        const st = node("span", "gf-stars", starText(s));
        st.setAttribute("role", "img");
        st.setAttribute("aria-label", t("levelStars", { stars: s }));
        meta.append(st);
      } else meta.append(node("span", "gf-muted", l.part === "A" ? copy.partA : copy.partB));
      btn.append(meta);
      btn.addEventListener("click", () => enterLevel(i));
      li.append(btn);
      list.append(li);
    });
    const any = doneCount() > 0, next = nextTarget(-1);
    $("go").textContent = next === -1 ? copy.resultsBtn : any ? copy.continueBtn : copy.startBtn;
    $("start-total").textContent = any ? t("starsTotal", { stars: totalStars(), max: MAX_STARS }) : "";
  }

  function renderChips() {
    const ol = $("chips");
    ol.textContent = "";
    levels.forEach((l, i) => {
      const li = node("li");
      const s = starsById[l.id];
      const b = node("button", "gf-chip" + (i === state.levelIdx ? " gf-current" : "") + (s ? " gf-done" : ""), String(l.id) + (s ? " ✓" : ""));
      b.type = "button";
      b.setAttribute("aria-label", t("chipLabel", { n: l.id, name: l.name, state: s ? t("chipDone", { stars: s }) : copy.chipTodo }));
      if (i === state.levelIdx) b.setAttribute("aria-current", "step");
      b.title = l.name;
      b.addEventListener("click", () => enterLevel(i));
      li.append(b);
      ol.append(li);
    });
    $("total").textContent = t("starsTotal", { stars: totalStars(), max: MAX_STARS });
  }

  /* ---------- Levels and steps ---------- */
  function enterLevel(idx) {
    flushParticles();
    state.token++;
    state.levelIdx = idx;
    run = { stepIdx: 0, misses: 0, revealed: false, stepDone: false, done: false, ss: null, compare: null };
    const l = level();
    $("grid").classList.toggle("gf-wide", !l.lab);
    ["lab", "ctrl", "tally-box"].forEach(id => { $(id).hidden = !l.lab; });
    if (l.lab) {
      state.foil = l.lab.foil;
      state.zoom = l.lab.foil === "real" ? "whole" : l.lab.zoom;
      state.lock = { foil: !!l.lab.lockFoil, zoom: !!l.lab.lockZoom, fire: !!l.lab.fireLockedUntilDone };
      $("fire-row").hidden = !!l.lab.aim;
      $("aim-row").hidden = !l.lab.aim;
      $("tally-box").hidden = !!l.lab.aim;   // aimed shots are not counted, so no tally on that level
    }
    $("eyebrow").textContent = t("levelWord") + " " + l.id + " " + copy.ofWord + " " + LEVEL_COUNT + " · " + (l.part === "A" ? copy.partA : copy.partB);
    $("card-title").textContent = l.name;
    setFeedback("", []);
    enterStep();
    show("play");
    renderChips();
    renderLab();
  }

  function enterStep() {
    const step = level().steps[run.stepIdx];
    run.stepDone = false;
    if (step.type === "choice") run.ss = { order: shuffle(step.options.map((_, i) => i)), wrong: [], done: false };
    else if (step.type === "fire") run.ss = { base: totalOf(step.foil) };
    else if (step.type === "order") run.ss = { items: data.orderStart.slice(), tries: 0, marks: null, done: false };
    else if (step.type === "match") run.ss = { pairs: {}, sequence: [], locked: {}, selSci: null, selEv: null, tries: 0, done: false };
    else run.ss = { text: "" };
    renderStep();
    renderNext();
    renderLab();
  }

  function totalOf(foil) {
    const c = state.counts[foil];
    return c.straight + c.bent + c.back;
  }

  function setFeedback(kind, lines) {
    const box = $("feedback");
    box.textContent = "";
    box.className = "gf-feedback" + (kind ? " gf-fb-" + kind : "");
    lines.forEach((line, i) => box.append(node("p", i === 0 && kind ? "gf-fb-head" : "", line)));
  }

  function renderNext() {
    const btn = $("next");
    const l = level();
    const last = run.stepIdx >= l.steps.length - 1;
    btn.hidden = !run.stepDone;
    if (run.stepDone) btn.textContent = !last ? copy.next : nextTarget(state.levelIdx) === -1 ? copy.nextFinal : copy.next;
    $("replay").hidden = !run.done;
  }

  /* A step is finished. If it was the last one, the level is complete. */
  function finishStep(kind, lines) {
    const l = level();
    run.stepDone = true;
    if (run.stepIdx >= l.steps.length - 1) {
      const stars = starsFor(!!l.doLevel, run.misses, run.revealed);
      starsById[l.id] = Math.max(starsById[l.id] || 0, stars);
      run.done = true;
      save();
      renderChips();
      lines = lines.concat([copy.levelDone + " " + starText(stars)]);
      if (l.afterNote) lines.push(l.afterNote);
      if (l.compare) run.compare = run.compare || makeCompare();
    }
    setFeedback(kind, lines);
    renderStep();
    renderNext();
    renderLab();
    const next = $("next");
    if (!next.hidden) next.focus({ preventScroll: true });
  }

  $("next").addEventListener("click", () => {
    const l = level();
    if (run.stepIdx < l.steps.length - 1) {
      run.stepIdx++;
      setFeedback("", []);
      enterStep();
      return;
    }
    const target = nextTarget(state.levelIdx);
    if (target === -1) showEnd(); else enterLevel(target);
  });
  $("replay").addEventListener("click", () => enterLevel(state.levelIdx));

  /* ---------- Step views ---------- */
  function renderStep() {
    const box = $("step");
    box.textContent = "";
    const step = level().steps[run.stepIdx];
    const ss = run.ss;
    if (run.stepIdx > 0) {
      level().steps.slice(0, run.stepIdx).forEach(s => {
        if (s.type === "fire") box.append(node("p", "gf-donestep", "✓ " + t("fireDoneLine", { n: s.min + "+", foil: foilName(s.foil) })));
      });
    }
    if (step.type === "choice") renderChoice(box, step, ss);
    else if (step.type === "fire") renderFire(box, step, ss);
    else if (step.type === "aim") renderAimStep(box, step);
    else if (step.type === "order") renderOrder(box, step, ss);
    else if (step.type === "match") renderMatch(box, step, ss);
    if (run.compare && run.done) box.append(renderCompare(run.compare));
  }

  /* -- choice -- */
  function renderChoice(box, step, ss) {
    const prompt = node("p", "gf-prompt", step.prompt);
    prompt.id = "gf-prompt";
    box.append(prompt);
    const group = node("div", "gf-options");
    group.setAttribute("role", "group");
    group.setAttribute("aria-labelledby", "gf-prompt");
    ss.order.forEach(i => {
      const isRight = i === step.answer, wasWrong = ss.wrong.includes(i);
      const btn = node("button", "btn btn-ghost gf-option" + (wasWrong ? " gf-wrong" : "") + (ss.done && isRight ? " gf-right" : ""));
      btn.type = "button";
      btn.append(node("span", "gf-option-text", step.options[i].text));
      if (wasWrong) btn.append(node("span", "gf-mark", copy.markWrongOpt));
      if (ss.done && isRight) btn.append(node("span", "gf-mark", copy.markAnswer));
      if (ss.done || wasWrong) btn.setAttribute("aria-disabled", "true");
      btn.addEventListener("click", () => onChoice(step, ss, i));
      group.append(btn);
    });
    box.append(group);
  }

  function onChoice(step, ss, i) {
    if (ss.done || ss.wrong.includes(i)) return;
    if (i === step.answer) {
      ss.done = true;
      finishStep("good", [copy.right, step.why]);
      return;
    }
    ss.wrong.push(i);
    run.misses++;
    if (ss.wrong.length >= 2) {
      ss.done = true;
      run.revealed = true;
      finishStep("bad", [copy.notQuite, step.options[i].hint, copy.answerIs + " " + step.options[step.answer].text, step.why].filter(Boolean));
    } else {
      setFeedback("bad", [copy.notQuite, step.options[i].hint, copy.tryAgainNote].filter(Boolean));
      renderStep();
      const first = $("step").querySelector(".gf-option:not([aria-disabled])");
      if (first) first.focus({ preventScroll: true });
    }
  }

  /* -- fire (do) -- */
  function renderFire(box, step, ss) {
    box.append(node("p", "gf-prompt", t("firePrompt", { min: step.min, foil: foilName(step.foil) })));
    const wrap = node("div", "gf-progress");
    const label = node("p", "gf-progress-label");
    label.id = "gf-fire-progress";
    const bar = node("progress");
    bar.id = "gf-fire-bar";
    bar.max = step.min;
    bar.setAttribute("aria-labelledby", "gf-fire-progress");
    wrap.append(label, bar);
    box.append(wrap);
    if (step.foil === "real") box.append(node("p", "gf-small", copy.rareNote));
    updateFireProgress();
  }

  function updateFireProgress() {
    const step = level().steps[run.stepIdx];
    if (!step || step.type !== "fire" || !$("fire-bar")) return;
    const n = Math.min(step.min, totalOf(step.foil) - run.ss.base);
    $("fire-bar").value = n;
    $("fire-progress").textContent = t("firedProgress", { foil: foilName(step.foil), n, min: step.min });
  }

  function checkFireStep() {
    const step = level().steps[run.stepIdx];
    if (!step || step.type !== "fire" || run.stepDone) return;
    updateFireProgress();
    if (totalOf(step.foil) - run.ss.base >= step.min) {
      run.stepIdx++;
      enterStep();
      setFeedback("good", [copy.fireNowAnswer]);
    }
  }

  /* -- aim (level 7) -- */
  function renderAimStep(box, step) {
    box.append(node("p", "gf-prompt", step.prompt));
    box.append(node("p", "gf-small", copy.aimNote));
    const res = node("p", "gf-aim-result", run.ss.text || "");
    box.append(res);
  }

  /* -- order (level 8) -- */
  function modelSvg(id) {
    const s = svg("svg", { viewBox: "0 0 64 64", width: 56, height: 56, "aria-hidden": "true", focusable: "false", class: "gf-model-svg" });
    const dot = (x, y, r, cls) => svg("circle", { cx: x, cy: y, r, class: cls }, s);
    if (id === "dalton") {
      dot(32, 32, 24, "gf-m-sphere");
      svg("path", { d: "M18 26 A16 16 0 0 1 30 15", class: "gf-m-shine", fill: "none" }, s);
    } else if (id === "thomson") {
      dot(32, 32, 26, "gf-m-pudding");
      [[22, 22], [40, 20], [32, 33], [20, 41], [44, 40], [34, 47], [46, 30]].forEach(([x, y]) => dot(x, y, 2.6, "gf-m-e"));
    } else if (id === "rutherford") {
      dot(32, 32, 26, "gf-m-ring");
      dot(32, 32, 3.2, "gf-m-nuc");
      [[14, 24], [50, 40], [38, 52]].forEach(([x, y]) => dot(x, y, 2.4, "gf-m-e"));
    } else {
      dot(32, 32, 4, "gf-m-nuc");
      [10, 18, 27].forEach(r => dot(32, 32, r, "gf-m-orbit"));
      dot(42, 32, 2.4, "gf-m-e"); dot(14, 32, 2.4, "gf-m-e"); dot(32, 59, 2.4, "gf-m-e");
    }
    return s;
  }

  function renderOrder(box, step, ss) {
    const prompt = node("p", "gf-prompt", step.prompt);
    prompt.id = "gf-prompt";
    box.append(prompt, node("p", "gf-small", copy.orderHelp));
    const ol = node("ol", "gf-order");
    ol.id = "gf-order";
    ol.setAttribute("aria-labelledby", "gf-prompt");
    ss.items.forEach((id, pos) => {
      const m = model(id);
      const mark = ss.marks ? ss.marks[pos] : null;
      const li = node("li", "gf-card-model" + (mark === true ? " gf-right" : mark === false ? " gf-wrong" : ""));
      li.dataset.id = id;
      const grip = node("button", "gf-grip", "☰");
      grip.type = "button";
      grip.disabled = ss.done;
      grip.dataset.id = id;
      grip.setAttribute("aria-label", t("orderHandle", { name: m.scientist }));
      grip.addEventListener("keydown", e => {
        if (e.key === "ArrowUp") { e.preventDefault(); moveItem(pos, -1); }
        else if (e.key === "ArrowDown") { e.preventDefault(); moveItem(pos, 1); }
      });
      grip.addEventListener("pointerdown", e => startDrag(e, ol, li));
      li.append(grip, modelSvg(id));
      const text = node("div", "gf-model-text");
      text.append(node("p", "gf-model-name", m.scientist + " · " + m.label));
      text.append(node("p", "gf-model-idea", m.idea));
      text.append(node("p", "gf-model-year", ss.done ? t("yearKnown", { year: m.year }) : copy.yearUnknown));
      const where = pos === 0 ? copy.orderOldest : pos === ss.items.length - 1 ? copy.orderNewest : t("positionLabel", { n: pos + 1, total: ss.items.length });
      text.append(node("p", "gf-model-pos", where + (mark === true ? " · " + copy.markOk : mark === false ? " · " + copy.markNo : "")));
      li.append(text);
      const btns = node("div", "gf-move");
      const up = node("button", "btn btn-ghost btn-sm gf-move-btn", "▲");
      up.type = "button"; up.disabled = ss.done || pos === 0;
      up.setAttribute("aria-label", t("moveUp", { name: m.scientist }));
      up.addEventListener("click", () => moveItem(pos, -1, "up"));
      const dn = node("button", "btn btn-ghost btn-sm gf-move-btn", "▼");
      dn.type = "button"; dn.disabled = ss.done || pos === ss.items.length - 1;
      dn.setAttribute("aria-label", t("moveDown", { name: m.scientist }));
      dn.addEventListener("click", () => moveItem(pos, 1, "down"));
      btns.append(up, dn);
      li.append(btns);
      ol.append(li);
    });
    box.append(ol);
    const check = node("button", "btn btn-primary gf-check-btn", copy.orderCheck);
    check.type = "button";
    check.disabled = ss.done;
    check.addEventListener("click", onOrderCheck);
    box.append(check);
  }

  function moveItem(pos, delta, which) {
    const ss = run.ss;
    const to = pos + delta;
    if (ss.done || to < 0 || to >= ss.items.length) return;
    const id = ss.items[pos];
    ss.items.splice(pos, 1);
    ss.items.splice(to, 0, id);
    ss.marks = null;
    renderStep();
    const sel = which === "up" ? ".gf-move-btn:first-child" : which === "down" ? ".gf-move-btn:last-child" : ".gf-grip";
    const li = $("order").querySelector('li[data-id="' + id + '"]');
    let target = li.querySelector(sel);
    if (!target || target.disabled) target = li.querySelector(".gf-grip");
    target.focus({ preventScroll: true });
    setFeedback("", [t("positionLabel", { n: to + 1, total: ss.items.length }) + ": " + model(id).scientist]);
  }

  /* Drag with a pointer: the whole list captures the pointer, and the dragged card follows it. */
  function startDrag(e, ol, li) {
    if (run.ss.done || (e.button !== undefined && e.button !== 0)) return;
    e.preventDefault();
    ol.setPointerCapture(e.pointerId);
    li.classList.add("gf-dragging");
    const move = ev => {
      const others = [...ol.children].filter(c => c !== li);
      let idx = 0;
      others.forEach(c => { const r = c.getBoundingClientRect(); if (ev.clientY > r.top + r.height / 2) idx++; });
      const ref = others[idx] || null;
      if (ref !== li.nextElementSibling) ol.insertBefore(li, ref);
    };
    const end = () => {
      ol.removeEventListener("pointermove", move);
      ol.removeEventListener("pointerup", end);
      ol.removeEventListener("pointercancel", end);
      li.classList.remove("gf-dragging");
      const ss = run.ss;
      const ids = [...ol.children].map(c => c.dataset.id);
      if (ids.join() !== ss.items.join()) { ss.items = ids; ss.marks = null; }
      renderStep();
      const grip = $("order").querySelector('.gf-grip[data-id="' + li.dataset.id + '"]');
      if (grip) grip.focus({ preventScroll: true });
      const pos = ss.items.indexOf(li.dataset.id);
      setFeedback("", [t("positionLabel", { n: pos + 1, total: ss.items.length }) + ": " + model(li.dataset.id).scientist]);
    };
    ol.addEventListener("pointermove", move);
    ol.addEventListener("pointerup", end);
    ol.addEventListener("pointercancel", end);
  }

  function onOrderCheck() {
    const ss = run.ss, step = level().steps[run.stepIdx];
    if (ss.done) return;
    const res = checkOrder(ss.items, data.orderAnswer);
    if (res.ok) {
      ss.done = true; ss.marks = null;
      finishStep("good", [copy.right, step.why]);
      return;
    }
    ss.tries++;
    run.misses++;
    if (ss.tries >= 2) {
      ss.done = true; ss.marks = null; run.revealed = true;
      ss.items = data.orderAnswer.slice();
      finishStep("bad", [copy.notQuite, copy.answerIs + " " + data.orderAnswer.map(id => model(id).scientist + " (" + model(id).year + ")").join(" → "), step.why]);
    } else {
      ss.marks = res.right;
      setFeedback("bad", [copy.notQuite, step.hint1, copy.tryAgainNote]);
      renderStep();
    }
  }

  /* -- match (level 9) -- */
  function renderMatch(box, step, ss) {
    const prompt = node("p", "gf-prompt", step.prompt);
    prompt.id = "gf-prompt";
    box.append(prompt, node("p", "gf-small", copy.matchHelp));
    const cols = node("div", "gf-match");
    const colA = node("div", "gf-match-col"), colB = node("div", "gf-match-col");
    colA.append(node("h3", "gf-h3", copy.matchScientists));
    colB.append(node("h3", "gf-h3", copy.matchEvidence));
    const pairNo = id => ss.sequence.indexOf(id) + 1;
    const evidenceOwner = ev => Object.keys(ss.pairs).find(sci => ss.pairs[sci] === ev);
    const makeBtn = (kind, id) => {
      const m = model(id);
      const owner = kind === "sci" ? (ss.pairs[id] ? id : null) : evidenceOwner(id);
      const paired = !!owner, locked = paired && ss.locked[owner];
      const selected = (kind === "sci" ? ss.selSci : ss.selEv) === id;
      const cls = "btn btn-ghost gf-match-btn" + (paired ? " gf-paired" : "") + (selected ? " gf-selected" : "") + (locked ? " gf-right" : "");
      const btn = node("button", cls);
      btn.type = "button";
      btn.dataset.kind = kind; btn.dataset.id = id;
      if (paired) btn.append(node("span", "gf-badge", String(pairNo(owner))));
      btn.append(node("span", "gf-match-text", kind === "sci" ? m.scientist : m.evidence));
      if (locked) btn.append(node("span", "gf-mark", copy.matchLocked));
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
      if (paired) btn.setAttribute("aria-label", (kind === "sci" ? m.scientist : m.evidence) + ". " + t("matchPair", { n: pairNo(owner) }) + (locked ? ". " + copy.matchLocked : ""));
      if (ss.done || locked) btn.setAttribute("aria-disabled", "true");
      btn.addEventListener("click", () => onMatchClick(kind, id));
      return btn;
    };
    data.orderAnswer.forEach(id => colA.append(makeBtn("sci", id)));
    data.evidenceOrder.forEach(id => colB.append(makeBtn("ev", id)));
    cols.append(colA, colB);
    box.append(cols);
    const check = node("button", "btn btn-primary gf-check-btn", copy.matchCheck);
    check.type = "button";
    check.disabled = ss.done || ss.sequence.length < data.orderAnswer.length;
    check.addEventListener("click", onMatchCheck);
    box.append(check);
  }

  function onMatchClick(kind, id) {
    const ss = run.ss;
    if (ss.done) return;
    const owner = kind === "sci" ? (ss.pairs[id] ? id : null) : Object.keys(ss.pairs).find(s => ss.pairs[s] === id);
    if (owner) {                       // tap a pair to undo it (unless it is already confirmed correct)
      if (ss.locked[owner]) return;
      delete ss.pairs[owner];
      ss.sequence = ss.sequence.filter(s => s !== owner);
      renderStep();
      return;
    }
    if (kind === "sci") ss.selSci = ss.selSci === id ? null : id;
    else ss.selEv = ss.selEv === id ? null : id;
    if (ss.selSci && ss.selEv) {
      ss.pairs[ss.selSci] = ss.selEv;
      ss.sequence.push(ss.selSci);
      ss.selSci = ss.selEv = null;
      setFeedback("", []);
    } else if (ss.selSci) setFeedback("", [t("matchPicked", { name: model(ss.selSci).scientist })]);
    renderStep();
    const again = $("step").querySelector('.gf-match-btn[data-kind="' + kind + '"][data-id="' + id + '"]');
    if (again) again.focus({ preventScroll: true });
  }

  function onMatchCheck() {
    const ss = run.ss, step = level().steps[run.stepIdx];
    if (ss.done || ss.sequence.length < data.orderAnswer.length) return;
    const res = checkMatch(ss.pairs, data.orderAnswer);
    if (res.ok) {
      ss.done = true;
      data.orderAnswer.forEach(id => { ss.locked[id] = true; });
      finishStep("good", [copy.right, step.why]);
      return;
    }
    ss.tries++;
    run.misses++;
    if (ss.tries >= 2) {
      ss.done = true; run.revealed = true;
      data.orderAnswer.forEach(id => { ss.pairs[id] = id; ss.locked[id] = true; });
      ss.sequence = data.orderAnswer.slice();
      const lines = [copy.notQuite, copy.answerIs].concat(data.orderAnswer.map(id => model(id).scientist + ": " + model(id).evidence), [step.why]);
      finishStep("bad", lines);
    } else {
      const wrong = data.orderAnswer.filter(id => !res.right[id]);
      data.orderAnswer.forEach(id => { if (res.right[id]) ss.locked[id] = true; });
      const hints = wrong.map(id => copy.matchWrongMark + " " + model(id).scientist + ". " + model(id).matchHint);
      // Keep right pairs, take away wrong ones so the student can try again.
      wrong.forEach(id => { delete ss.pairs[id]; });
      ss.sequence = ss.sequence.filter(id => res.right[id]);
      setFeedback("bad", [copy.notQuite].concat(hints, [copy.tryAgainNote]));
      renderStep();
    }
  }

  /* -- compare table (level 6) -- */
  function makeCompare() {
    const rows = [], filled = [];
    ["plum", "real", "nuclear"].forEach(foil => {
      const c = Object.assign({}, state.counts[foil]);
      let total = c.straight + c.bent + c.back;
      if (total < COMPARE_MIN) {
        // Not enough of your own shots for a fair table (bounces are rare), so run more at once (not drawn).
        const more = simulate(foil, COMPARE_TOTAL - total, Math.random);
        BINS.forEach(b => { c[b] += more[b]; });
        total = COMPARE_TOTAL;
        filled.push(foilName(foil));
      }
      rows.push({ foil, c, total });
    });
    return { rows, filled };
  }

  function renderCompare(cmp) {
    const wrap = node("div", "gf-compare");
    wrap.append(node("h3", "gf-h3", copy.compareTitle));
    const table = node("table", "gf-table");
    const head = node("tr");
    head.append(node("th", "", copy.compareFoil));
    BINS.forEach(b => head.append(node("th", "", BIN_GLYPH[b] + " " + BIN_NAME[b])));
    table.append(head);
    cmp.rows.forEach(r => {
      const tr = node("tr", r.foil === "nuclear" || r.foil === "real" ? "gf-row-match" : "");
      const th = node("th", "", { plum: copy.foilPlum, real: copy.foilReal, nuclear: copy.foilNuclear }[r.foil]);
      th.scope = "row";
      tr.append(th);
      BINS.forEach(b => tr.append(node("td", "", r.c[b] + " (" + formatPercent(r.c[b], r.total) + ")")));
      table.append(tr);
    });
    wrap.append(table);
    if (cmp.filled.length) wrap.append(node("p", "gf-small", t("compareNote", { names: cmp.filled.join(", "), min: COMPARE_MIN, n: COMPARE_TOTAL })));
    wrap.append(node("p", "gf-compare-end", copy.compareConclusion));
    return wrap;
  }

  /* ---------- Lab controls ---------- */
  function buildLabControls() {
    const foils = $("foils");
    FOIL_BUTTONS.forEach(([id, label]) => {
      const b = node("button", "btn btn-ghost btn-sm gf-toggle", label);
      b.type = "button"; b.dataset.foil = id;
      b.addEventListener("click", () => setFoil(id));
      foils.append(b);
    });
    const zooms = $("zooms");
    [["whole", copy.zoomWhole], ["close", copy.zoomClose]].forEach(([id, label]) => {
      const b = node("button", "btn btn-ghost btn-sm gf-toggle", label);
      b.type = "button"; b.dataset.zoom = id;
      b.addEventListener("click", () => setZoom(id));
      zooms.append(b);
    });
    const bins = $("bins");
    BINS.forEach(b => {
      const li = node("li", "gf-bin gf-bin-" + b);
      li.dataset.bin = b;
      const top = node("div", "gf-bin-top");
      top.append(node("span", "gf-bin-glyph", BIN_GLYPH[b]));
      const name = node("span", "gf-bin-name", BIN_NAME[b]);
      name.append(node("span", "gf-bin-range", " (" + BIN_RANGE[b] + ")"));
      top.append(name, node("span", "gf-bin-count"), node("span", "gf-bin-pct"));
      const track = node("div", "gf-bar-track");
      track.append(node("div", "gf-bar-fill"));
      li.append(top, track);
      bins.append(li);
    });
  }

  function setFoil(id) {
    if (state.lock.foil || id === state.foil) return;
    flushParticles();
    state.foil = id;
    if (id === "real") state.zoom = "whole";
    renderLab(); draw(performance.now());
  }
  function setZoom(id) {
    if (state.lock.zoom || state.foil === "real" || id === state.zoom) return;
    flushParticles();
    state.zoom = id;
    renderLab(); draw(performance.now());
  }

  function renderLab() {
    if (!labOn()) return;
    $("foils").querySelectorAll("button").forEach(b => {
      b.setAttribute("aria-pressed", String(b.dataset.foil === state.foil));
      b.disabled = state.lock.foil && b.dataset.foil !== state.foil;
    });
    $("zooms").querySelectorAll("button").forEach(b => {
      b.setAttribute("aria-pressed", String(b.dataset.zoom === state.zoom));
      b.disabled = (state.lock.zoom && b.dataset.zoom !== state.zoom) || (state.foil === "real" && b.dataset.zoom === "close");
    });
    $("zoom-note").textContent = state.foil === "real" ? copy.sceneMystery + " " + copy.zoomLockedMystery : state.zoom === "close" ? copy.drawNotScale : copy.sceneWhole;
    const locked = state.lock.fire && !(run && run.done);
    $("fire-row").querySelectorAll("button").forEach(b => { b.disabled = locked; });
    $("locked").hidden = !locked;
    $("keys").hidden = locked;
    $("aim-out").textContent = String(state.aim);
    $("aim").value = state.aim;
    renderTally();
    updateSummary();
    draw(performance.now());
  }

  function renderTally() {
    const c = state.counts[state.foil], total = totalOf(state.foil);
    $("tally-for").textContent = t("tallyFor", { foil: { plum: copy.foilPlum, nuclear: copy.foilNuclear, real: copy.foilReal }[state.foil] });
    $("bins").querySelectorAll(".gf-bin").forEach(li => {
      const b = li.dataset.bin;
      li.querySelector(".gf-bin-count").textContent = String(c[b]);
      li.querySelector(".gf-bin-pct").textContent = formatPercent(c[b], total);
      li.querySelector(".gf-bar-fill").style.width = percent(c[b], total) + "%";
    });
    $("fired").textContent = total ? t("tallyFired", { n: total }) : copy.emptyTally;
  }

  /* Text summary for screen readers (updated when particles stop moving). */
  function updateSummary() {
    if (!labOn()) return;
    const c = state.counts[state.foil], total = totalOf(state.foil);
    const foil = { plum: copy.foilPlum, nuclear: copy.foilNuclear, real: copy.foilReal }[state.foil];
    const view = state.zoom === "close" ? copy.viewClose : copy.viewWhole;
    const text = total ? t("labSummary", { foil, view, n: total, s: c.straight, b: c.bent, k: c.back }) : t("labSummaryEmpty", { foil, view });
    if (text === lastSummary) return;
    lastSummary = text;
    $("labsum").textContent = text;
    $("canvas").setAttribute("aria-label", copy.canvasLabel + " " + text);
  }

  $("tally-reset").addEventListener("click", () => {
    flushParticles();
    state.counts[state.foil] = emptyCounts();
    delete firedAt[state.foil];
    state.hits[state.foil] = [];
    parts = [];
    renderTally(); updateSummary(); updateFireProgress(); draw(performance.now());
  });

  $("aim").addEventListener("input", () => {
    state.aim = Number($("aim").value);
    $("aim-out").textContent = String(state.aim);
    draw(performance.now());
  });

  /* ---------- Firing ---------- */
  function fireVolley(n, aimed) {
    if (state.screen !== "play" || !labOn()) return;
    if (!aimed && state.lock.fire && !run.done) return;
    if (parts.length > 600) return;
    const foil = state.foil, zoom = state.zoom, token = state.token;
    const reduced = motionQuery.matches;
    const now = performance.now();
    const span = Math.min(2200, n * 22);       // a "Fire 100" volley takes about 3 seconds in all
    for (let i = 0; i < n; i++) {
      let shot, row = Math.floor(Math.random() * (2 * GEOM.rows + 1)) - GEOM.rows;
      if (aimed) {
        const u = aimToImpact(state.aim), side = state.aim < 0 ? -1 : 1, theta = scatterAngle(u);
        shot = { u, side, turn: side, theta, bin: classifyAngle(theta) };
        row = 0;
      } else {
        shot = shoot(foil, Math.random);
        // Teaching aid: bounces are rare, so a student could fire 200 particles and never see one. If 150 particles have
        // been fired at a nuclear foil with no bounce yet, the next one is aimed almost straight at a nucleus.
        if (foil !== "plum") {
          const seen = firedAt[foil] || (firedAt[foil] = { n: 0, back: false });
          seen.n++;
          if (!seen.back && seen.n >= 150 && shot.bin !== "back") {
            const u = SCIENCE.kRatio * (0.2 + 0.6 * Math.random()), theta = scatterAngle(u);
            shot = { u, side: shot.side, turn: shot.side, theta, bin: classifyAngle(theta) };
          }
          if (shot.bin === "back") seen.back = true;
        }
      }
      const path = buildPath(shot, foil, zoom, row);
      const cum = [0];
      for (let k = 1; k < path.pts.length; k++) cum.push(cum[k - 1] + Math.hypot(path.pts[k].x - path.pts[k - 1].x, path.pts[k].y - path.pts[k - 1].y));
      const total = cum[cum.length - 1];
      parts.push({
        pts: path.pts, cum, total, angle: path.angle, bin: shot.bin, theta: shot.theta, foil, token, counted: !aimed, aimed,
        t0: now + (n > 1 ? i * span / n : 0), dur: total / 0.5,    // 0.5 pixels per millisecond: fast
        landed: false, tLand: 0,
        fade: reduced ? Infinity : shot.bin === "straight" ? 1200 : 4500
      });
    }
    if (reduced) { stepParts(Infinity); cull(); draw(now); finishFrame(); }
    else ensureLoop();
  }

  function land(p, now) {
    p.landed = true;
    p.tLand = now;
    const hits = state.hits[p.foil];     // every landing flashes on the screen...
    hits.push({ ang: p.angle, bin: p.bin, t: now });
    if (hits.length > 400) hits.shift();
    if (p.counted) { state.counts[p.foil][p.bin]++; dirty = true; }   // ...but aimed shots are not tallied
    if (p.aimed && p.token === state.token) onAimLanded(p);
  }

  /* Land every particle whose time has come (now = Infinity lands them all). Drop faded paths. */
  function stepParts(now) {
    parts.forEach(p => { if (!p.landed && now >= p.t0 + p.dur) land(p, Number.isFinite(now) ? now : performance.now()); });
    parts = parts.filter(p => !p.landed || !Number.isFinite(p.fade) || now - p.tLand < p.fade);
  }

  /* Keep the picture readable: when there are very many static paths, drop the oldest straight ones first. */
  function cull() {
    const max = 120;
    if (parts.length <= max) return;
    const keep = parts.filter(p => !p.landed || p.bin !== "straight");
    const straight = parts.filter(p => p.landed && p.bin === "straight");
    const room = Math.max(0, max - keep.length);
    const keepStraight = new Set(straight.slice(straight.length - room));
    parts = parts.filter(p => !(p.landed && p.bin === "straight") || keepStraight.has(p));
  }

  function flushParticles() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (parts.length) {
      parts.forEach(p => { if (!p.landed) land(p, performance.now()); });
      parts = [];
      finishFrame();
    }
    if (labOn()) draw(performance.now());
  }

  const animating = () => parts.some(p => !p.landed || Number.isFinite(p.fade));

  function ensureLoop() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    stepParts(now);
    cull();
    draw(now);
    if (!parts.some(p => !p.landed)) finishFrame();      // nothing in flight: update tally, summary, level progress
    else if (dirty) renderTally();
    if (animating() && !document.hidden) raf = requestAnimationFrame(frame);
  }
  /* Called when the tally changed or movement stopped. */
  function finishFrame() {
    if (dirty) { dirty = false; renderTally(); checkFireStep(); }
    if (!parts.some(p => !p.landed)) updateSummary();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) flushParticles();
    else if (labOn()) draw(performance.now());
  });

  /* ---------- Aim level ---------- */
  function onAimLanded(p) {
    const deg = Math.round(p.theta);
    if (run.done) { setFeedback("", [t(p.bin === "back" ? "aimBack" : p.bin === "bent" ? "aimBent" : "aimStraight", { deg })]); return; }
    if (p.bin === "back") {
      finishStep("good", [copy.right, t("aimBack", { deg })]);
    } else {
      const msg = t(p.bin === "bent" ? "aimBent" : "aimStraight", { deg });
      run.ss.text = msg;
      setFeedback("", [msg]);
      const res = $("step").querySelector(".gf-aim-result");
      if (res) res.textContent = msg;
    }
  }

  $("aim-fire").addEventListener("click", () => fireVolley(1, true));

  /* ---------- Keys ---------- */
  document.addEventListener("keydown", e => {
    if (state.screen !== "play" || !labOn() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (level().lab.aim || (state.lock.fire && !run.done)) return;
    const tag = e.target && e.target.tagName;
    if (tag === "INPUT" && e.target.type !== "range") return;
    if (tag === "TEXTAREA" || tag === "SELECT") return;
    const n = { 1: 1, 2: 20, 3: 100 }[e.key];
    if (n) { e.preventDefault(); fireVolley(n, false); }
  });

  document.querySelectorAll("#gf-fire-row button[data-n]").forEach(b =>
    b.addEventListener("click", () => fireVolley(Number(b.dataset.n), false)));

  /* ---------- Drawing ---------- */
  const canvas = $("canvas");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = GEOM.size * dpr;
  canvas.height = GEOM.size * dpr;
  const css = getComputedStyle(document.documentElement);
  const cv = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const pal = {
    bg: cv("--bg-raised", "#111418"), text: cv("--text", "#f7f6f3"), muted: cv("--muted", "#aeb3bb"), line: cv("--line-strong", "rgba(255,255,255,0.2)"),
    straight: cv("--teal", "#2dd4bf"), bent: cv("--amber", "#fbbf24"), back: cv("--bad", "#fb7185"),
    violet: cv("--violet", "#a78bfa"), gold: "#e0b030"
  };
  // Fixed spots for electrons inside the close-up atom (golden-angle spiral, so they look scattered).
  const electronSpots = Array.from({ length: 14 }, (_, i) => {
    const r = Math.sqrt((i + 0.6) / 14) * 0.92, a = i * 2.39996;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });

  function mark(x, y, bin, size) {
    ctx.beginPath();
    if (bin === "straight") ctx.arc(x, y, size, 0, Math.PI * 2);
    else if (bin === "bent") { ctx.moveTo(x, y - size * 1.2); ctx.lineTo(x + size * 1.2, y); ctx.lineTo(x, y + size * 1.2); ctx.lineTo(x - size * 1.2, y); ctx.closePath(); }
    else ctx.rect(x - size, y - size, size * 2, size * 2);
    ctx.fill();
  }

  function label(text, x, y, align) {
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = align || "center";
    ctx.lineJoin = "round"; ctx.lineWidth = 4; ctx.strokeStyle = pal.bg;   // dark outline keeps text readable over paths
    ctx.strokeText(text, x, y);
    ctx.fillStyle = pal.muted;
    ctx.fillText(text, x, y);
  }

  function drawScene() {
    const G = GEOM, foil = state.foil, close = state.zoom === "close";
    const half = close ? G.closeR + 8 : G.rows * G.rowGap + G.wholeR + 6;   // half the height of the beam and source bar
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, G.size, G.size);
    // detector screen
    ctx.strokeStyle = pal.line; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(G.cx, G.cy, G.ringR, 0, Math.PI * 2); ctx.stroke();
    label(copy.drawDetector, G.cx, 14);
    // source bar and beam
    ctx.save();
    ctx.beginPath(); ctx.arc(G.cx, G.cy, G.ringR + 3, 0, Math.PI * 2); ctx.clip();   // keep the beam inside the screen
    ctx.fillStyle = "rgba(251,113,133,0.07)";
    ctx.fillRect(G.startX, G.cy - half, G.cx - G.startX, half * 2);
    ctx.fillStyle = pal.muted;
    ctx.fillRect(G.startX - 14, G.cy - half - 2, 12, half * 2 + 4);
    ctx.restore();
    label(copy.drawSource, G.startX - 30, G.cy + half + 38, "left");
    // foil
    if (foil === "real") {
      ctx.fillStyle = pal.gold;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(G.cx - G.wholeR, G.cy - half, G.wholeR * 2, half * 2);
      ctx.globalAlpha = 1;
      label(copy.drawFoil + ": " + copy.drawMystery, G.cx, G.cy - half - 12);
    } else if (close) {
      drawAtom(G.cx, G.cy, G.closeR, foil, true);
    } else {
      for (let k = -G.rows; k <= G.rows; k++) drawAtom(G.cx, G.cy + k * G.rowGap, G.wholeR, foil, false);
      label(copy.drawFoil, G.cx, G.cy - half - 12);
    }
  }

  function drawAtom(x, y, R, foil, big) {
    ctx.lineWidth = 1.5;
    if (foil === "plum") {
      ctx.fillStyle = "rgba(251,113,133,0.22)";
      ctx.strokeStyle = pal.back;
      ctx.beginPath(); ctx.arc(x, y, R - 1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = pal.straight;
      if (big) {
        electronSpots.forEach(s => { ctx.beginPath(); ctx.arc(x + s.x * R, y + s.y * R, 5, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = pal.bg;
        ctx.font = "bold 9px system-ui, sans-serif"; ctx.textAlign = "center";
        electronSpots.forEach(s => ctx.fillText("−", x + s.x * R, y + s.y * R + 3));
        label(copy.drawPudding, x, y + R + 18);
        label(copy.drawElectron, x, y + R + 33);
      } else {
        [[-0.4, -0.3], [0.35, -0.45], [0, 0.1], [-0.3, 0.5], [0.45, 0.35]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(x + a * R, y + b * R, 2, 0, Math.PI * 2); ctx.fill(); });
      }
    } else {
      ctx.strokeStyle = pal.muted;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.arc(x, y, R - 1, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = pal.straight;
      const es = big ? electronSpots.filter((_, i) => i % 3 === 0) : [];
      es.forEach(s => { ctx.beginPath(); ctx.arc(x + s.x * R, y + s.y * R, 4, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = pal.back;
      ctx.beginPath(); ctx.arc(x, y, big ? 5 : 3, 0, Math.PI * 2); ctx.fill();
      if (big) {
        ctx.fillStyle = pal.text; ctx.font = "bold 10px system-ui, sans-serif"; ctx.textAlign = "center";
        label(copy.drawNucleus, x + 10, y + 24, "left");
        label(copy.drawEmpty, x, y + R + 18);
      }
    }
  }

  function drawParticle(p, now) {
    if (now < p.t0) return;
    const s = p.landed ? p.total : Math.min(1, (now - p.t0) / p.dur) * p.total;
    let alpha = p.bin === "straight" ? 0.4 : 0.95;
    if (p.landed && Number.isFinite(p.fade)) alpha *= Math.max(0, 1 - (now - p.tLand) / p.fade);
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = pal[p.bin];
    ctx.lineWidth = p.bin === "straight" ? 1.2 : 2.2;
    ctx.beginPath();
    ctx.moveTo(p.pts[0].x, p.pts[0].y);
    let hx = p.pts[0].x, hy = p.pts[0].y;
    for (let k = 1; k < p.pts.length; k++) {
      if (p.cum[k] <= s) { ctx.lineTo(p.pts[k].x, p.pts[k].y); hx = p.pts[k].x; hy = p.pts[k].y; }
      else {
        const f = (s - p.cum[k - 1]) / (p.cum[k] - p.cum[k - 1] || 1);
        hx = p.pts[k - 1].x + f * (p.pts[k].x - p.pts[k - 1].x);
        hy = p.pts[k - 1].y + f * (p.pts[k].y - p.pts[k - 1].y);
        ctx.lineTo(hx, hy);
        break;
      }
    }
    ctx.stroke();
    if (!p.landed) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  function draw(now) {
    if (!labOn()) return;
    const G = GEOM;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScene();
    // aim line (level 7)
    if (level().lab.aim) {
      const y = G.cy + state.aim / 100 * G.closeR;   // same stretched scale as the drawn paths
      ctx.strokeStyle = pal.bent; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(G.startX, y); ctx.lineTo(G.cx - 14, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = pal.bent;
      ctx.beginPath(); ctx.moveTo(G.startX + 2, y - 6); ctx.lineTo(G.startX + 14, y); ctx.lineTo(G.startX + 2, y + 6); ctx.closePath(); ctx.fill();
    }
    parts.forEach(p => drawParticle(p, now));
    // detector flashes: every landing leaves a mark, and a new one glows for a moment
    state.hits[state.foil].forEach(h => {
      const x = G.cx + G.ringR * Math.cos(h.ang), y = G.cy + G.ringR * Math.sin(h.ang);
      const age = now - h.t;
      ctx.fillStyle = pal[h.bin];
      if (age < 500 && !motionQuery.matches) { ctx.globalAlpha = 0.45 * (1 - age / 500); mark(x, y, h.bin, 11); }
      ctx.globalAlpha = 0.95;
      mark(x, y, h.bin, 3.5);
      ctx.globalAlpha = 1;
    });
  }

  /* ---------- End screen ---------- */
  function showEnd() {
    $("end-stars").textContent = t("endStars", { stars: totalStars(), max: MAX_STARS });
    const recap = $("recap");
    recap.textContent = "";
    data.recap.forEach(r => recap.append(node("li", "", r)));
    const review = $("review");
    review.textContent = "";
    const missed = levels.filter(l => (starsById[l.id] || 0) < 3);
    if (!missed.length) review.append(node("li", "gf-review-none", copy.endReviewNone));
    missed.forEach(l => {
      const li = node("li", "gf-review-item");
      li.append(node("p", "gf-review-name", t("levelWord") + " " + l.id + ": " + l.name));
      const why = l.steps.map(s => s.why).filter(Boolean)[0] || l.blurb;
      li.append(node("p", "", why));
      const b = node("button", "btn btn-ghost btn-sm", copy.replay);
      b.type = "button";
      b.addEventListener("click", () => enterLevel(levels.indexOf(l)));
      li.append(b);
      review.append(li);
    });
    show("end");
  }

  /* ---------- Wiring ---------- */
  $("go").addEventListener("click", () => {
    const n = nextTarget(-1);
    if (n === -1) showEnd(); else enterLevel(n);
  });
  $("home").addEventListener("click", () => { renderStart(); show("start"); });
  $("end-back").addEventListener("click", () => { renderStart(); show("start"); });
  $("reset").addEventListener("click", () => { $("reset").hidden = true; $("reset-ask").hidden = false; $("reset-no").focus(); });
  $("reset-no").addEventListener("click", () => { $("reset-ask").hidden = true; $("reset").hidden = false; $("reset").focus(); });
  $("reset-yes").addEventListener("click", () => {
    Object.keys(starsById).forEach(k => delete starsById[k]);
    try { localStorage.removeItem(storageKey); } catch (_) { /* nothing to clear */ }
    state.counts = { plum: emptyCounts(), nuclear: emptyCounts(), real: emptyCounts() };
    state.hits = { plum: [], nuclear: [], real: [] };
    $("reset-ask").hidden = true; $("reset").hidden = false;
    renderStart();
    $("go").focus();
  });

  buildLabControls();
  renderStart();
})();
