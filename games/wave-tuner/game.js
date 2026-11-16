"use strict";

/* ===== Science data and pure functions (no page or storage access) =====
   Simplification (truthful): the picture is not to scale. Real light waves are about a
   million times too small to see, so the ruler is a teaching device only.
   Frequencies are exact for c = 3.00 × 10⁸ m/s. */
const LIGHT_SPEED = 3.00e8;   // c, metres per second
const PLANCK = 6.626e-34;     // h, joule seconds
const MIN_NM = 380, MAX_NM = 750;
const MIN_AMP = 10, MAX_AMP = 100;   // amplitude slider (brightness), 10 = dim, 100 = bright
const BANDS = [[450, "violet"], [495, "blue"], [570, "green"], [590, "yellow"], [620, "orange"], [750.0001, "red"]];

function frequencyHz(nm) { return LIGHT_SPEED / (nm * 1e-9); }              // ν = c ÷ λ
function photonEnergyJ(nm) { return PLANCK * frequencyHz(nm); }             // E = h × ν

function colourName(nm) {
  if (!(nm >= MIN_NM && nm <= MAX_NM)) return "outside visible light";
  return BANDS.find(band => nm < band[0])[1];
}

// Standard piecewise approximation of the colour of light, returns [r, g, b] as 0 to 255.
function wavelengthToRGB(nm) {
  if (!(nm >= MIN_NM && nm <= MAX_NM)) return [0, 0, 0];
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
  else { r = 1; }
  // The eye is less sensitive at the two ends of the spectrum.
  let factor = 1;
  if (nm < 420) factor = 0.3 + 0.7 * (nm - 380) / 40;
  else if (nm > 700) factor = 0.3 + 0.7 * (750 - nm) / 50;
  return [r, g, b].map(v => Math.round(255 * Math.pow(v * factor, 0.8)));
}

// A brighter version for drawing on the dark page: same hue, strongest channel at 255.
function displayRGB(nm) {
  const rgb = wavelengthToRGB(nm), top = Math.max(...rgb, 1);
  return rgb.map(v => Math.round(v * 255 / top));
}

function sciValue(coefficient, exponent) { return coefficient * Math.pow(10, exponent); }

function superscript(n) {
  const map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  return String(n).split("").map(ch => map[ch] || ch).join("");
}

// Splits a number into a coefficient string (2 decimals) and a power of ten, for display.
function sciParts(value) {
  let exp = Math.floor(Math.log10(value));
  let coef = value / Math.pow(10, exp);
  if (coef.toFixed(2) === "10.00") { coef = 1; exp += 1; }
  return { coef: coef.toFixed(2), exp };
}

function parseNumber(text) {
  const s = String(text).trim().replace(",", ".");
  return s === "" ? NaN : Number(s);
}

const near = (value, target, tol) => Number.isFinite(value) && Math.abs(value - target) <= tol + 1e-9;

// Challenge 5. Wavelength within ±tolNm, amplitude within ±tolAmp (slider points).
function checkMatch(nm, amp, targetNm, targetAmp, tolNm = 10, tolAmp = 8) {
  const wavelength = near(nm, targetNm, tolNm), amplitude = near(amp, targetAmp, tolAmp);
  return { wavelength, amplitude, ok: wavelength && amplitude };
}

// Challenge 6. Red is 620–750 nm; "lowest third" of a 10–100 slider is 10–40.
function checkRedDim(nm, amp) {
  const lowThird = MIN_AMP + (MAX_AMP - MIN_AMP) / 3;
  const red = colourName(nm) === "red", dim = amp <= lowThird + 1e-9;
  return { red, dim, ok: red && dim };
}

// Challenge 7. Within 5 nm of the short end.
function checkHighFreq(nm) { return nm <= 385; }

// Challenge 11. Compares VALUES (so 0.6 × 10¹⁵ and 60 × 10¹³ are accepted too), within 2%.
// kind: ok | empty | multiplied (used × instead of ÷) | exponent (right digits, wrong power) | wrong
function checkSci(coefficient, exponent, target, trap, tol = 0.02) {
  if (!Number.isFinite(coefficient) || !Number.isFinite(exponent)) return { ok: false, kind: "empty" };
  const value = sciValue(coefficient, exponent);
  if (Math.abs(value / target - 1) <= tol + 1e-12) return { ok: true, kind: "ok" };
  if (trap && Math.abs(value / trap - 1) <= 0.05) return { ok: false, kind: "multiplied" };
  if (value > 0) {
    const lr = Math.log10(value / target);
    if (Math.round(lr) !== 0 && Math.abs(lr - Math.round(lr)) < 0.009) return { ok: false, kind: "exponent" };
  }
  return { ok: false, kind: "wrong" };
}

// Challenge 12. Accept 2.9 to 3.1 m.
// kind: ok | empty | flipped (ν ÷ c) | power (right digits, wrong power of ten) | wrong
function checkMetres(value, min = 2.9, max = 3.1, target = 3.0) {
  if (!Number.isFinite(value)) return { ok: false, kind: "empty" };
  if (value >= min - 1e-9 && value <= max + 1e-9) return { ok: true, kind: "ok" };
  if (Math.abs(value / (1 / target) - 1) < 0.05) return { ok: false, kind: "flipped" };
  if (value > 0) {
    const lr = Math.log10(value / target);
    if (Math.round(lr) !== 0 && Math.abs(lr - Math.round(lr)) < 0.02) return { ok: false, kind: "power" };
  }
  return { ok: false, kind: "wrong" };
}

// 3 stars first try, 2 after a miss, 1 if the answer had to be shown.
function starsFor(misses, revealed) { return revealed ? 1 : misses === 0 ? 3 : 2; }

function cardText(stars, total) {
  const values = Object.values(stars);
  return `★ ${values.reduce((a, b) => a + b, 0)} of ${total * 3} · ${values.length} of ${total} done`;
}

/* ===== The game ===== */
if (typeof document !== "undefined") (() => {
  const D = window.WAVE_TUNER_DATA;
  const T = D.text;
  const storageKey = "mrd-wave-tuner";
  const total = D.challenges.length;
  const $ = id => document.getElementById(`wt-${id}`);
  const fmt = (template, values = {}) => template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ""));
  const t = (key, values) => fmt(T[key], values);
  const SVGNS = "http://www.w3.org/2000/svg";
  const SPEED = 60;                       // drift speed, screen units per second
  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---- saved progress ----
  function readSaved() {
    try {
      const s = JSON.parse(localStorage.getItem(storageKey));
      return s && typeof s === "object" ? s : {};
    } catch (_) { return {}; }
  }
  const ids = new Set(D.challenges.map(c => c.id));
  const savedStars = {};
  const rawStars = readSaved().stars;
  if (rawStars && typeof rawStars === "object") {
    Object.keys(rawStars).forEach(id => { if (ids.has(id) && [1, 2, 3].includes(rawStars[id])) savedStars[id] = rawStars[id]; });
  }

  const state = {
    screen: "start", tab: "challenges", stars: savedStars,
    nm: 550, amp: 60, p: 0, paused: false, labels: false,
    idx: 0, step: 0, misses: 0, totalMisses: 0, revealedAny: false,
    stepDone: false, revealedStep: false, picked: new Set(), feedback: "", feedbackKind: ""
  };
  let pic = null;       // handles to the current picture's SVG elements
  let raf = 0, lastTs = 0;

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ v: 1, card: cardText(state.stars, total), stars: state.stars })); }
    catch (_) { /* storage may be blocked at school; the game still works */ }
  }
  function clearSaved() { try { localStorage.removeItem(storageKey); } catch (_) { /* ignore */ } }

  // ---- small helpers ----
  function node(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function svgEl(tag, attrs, parent) {
    const el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(k => el.setAttribute(k, attrs[k]));
    if (parent) parent.append(el);
    return el;
  }
  const cur = () => D.challenges[state.idx];
  const curStep = () => cur().steps[state.step];
  const curView = () => state.tab === "explore" ? "tuner" : curStep().picture;
  const starText = n => "★".repeat(n) + "☆".repeat(3 - n);
  const freqText = nm => (frequencyHz(nm) / 1e14).toFixed(2);
  const energyText = nm => `${(photonEnergyJ(nm) / 1e-19).toFixed(2)} × 10⁻¹⁹ J`;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ---- picture geometry ----
  function wavePath(W, L, A, p, cy) {
    let d = "";
    for (let x = 0; x <= W + 3; x += 3) {
      d += `${x ? "L" : "M"}${x} ${(cy - A * Math.sin(2 * Math.PI * (x / L - p))).toFixed(1)} `;
    }
    return d;
  }
  function arrowPath(x1, y1, x2, y2, both) {
    const s = 8, head = (x, y, a) =>
      `M${(x + s * Math.cos(a + 2.6)).toFixed(1)} ${(y + s * Math.sin(a + 2.6)).toFixed(1)}L${x} ${y}L${(x + s * Math.cos(a - 2.6)).toFixed(1)} ${(y + s * Math.sin(a - 2.6)).toFixed(1)}`;
    const a = Math.atan2(y2 - y1, x2 - x1);
    return `M${x1} ${y1}L${x2} ${y2}` + head(x2, y2, a) + (both ? head(x1, y1, a + Math.PI) : "");
  }
  function svgText(parent, cls, x, y, text, anchor) {
    const el = svgEl("text", { class: cls, x, y, "text-anchor": anchor || "middle" }, parent);
    el.textContent = text;
    return el;
  }

  function buildPicture() {
    const svg = $("picture");
    const view = curView();
    svg.replaceChildren(svgEl("title", { id: "wt-svg-title" }));
    svg.firstChild.textContent = view === "tuner" ? "Travelling light wave with a ruler" : view === "tap" ? "Wave with four points" : "Wave with two arrows";
    pic = null;
    if (view === "none") return;
    const W = Math.round(svg.getBoundingClientRect().width) || 760;
    const cy = view === "tuner" ? 150 : 135;
    pic = { view, W, cy };
    if (view === "tuner") buildTuner(svg, W, cy);
    else buildStatic(svg, view, W, cy);
    updateSummary();
  }

  function buildTuner(svg, W, cy) {
    const H = 318, K = clamp(W / 3200, 0.1, 0.25);   // screen units per nm (the ruler scale)
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    pic.K = K;
    svgEl("line", { class: "wt-rest", x1: 0, y1: cy, x2: W, y2: cy }, svg);
    pic.restLabel = svgText(svg, "wt-svg-label wt-lbl", 6, cy + 18, "rest line", "start");
    const ghostStep = state.tab === "challenges" && curStep().type === "match";
    pic.ghost = ghostStep ? svgEl("path", { class: "wt-ghost" }, svg) : null;
    pic.glow = svgEl("path", { class: "wt-glow" }, svg);
    pic.wave = svgEl("path", { class: "wt-wave" }, svg);
    // Labels (crest, trough, wavelength, amplitude)
    pic.lbl = svgEl("g", { class: "wt-lbl" }, svg);
    pic.dropA = svgEl("path", { class: "wt-drop" }, pic.lbl);
    pic.lam = svgEl("path", { class: "wt-arrow wt-arrow-a" }, pic.lbl);
    pic.lamTxt = svgText(pic.lbl, "wt-svg-label wt-teal", 0, 0, "wavelength (λ)");
    pic.amp = svgEl("path", { class: "wt-arrow wt-arrow-b" }, pic.lbl);
    pic.ampTxt = svgText(pic.lbl, "wt-svg-label wt-amber", 0, 0, "amplitude", "start");
    pic.crestTxt = svgText(pic.lbl, "wt-svg-label", 0, 0, "crest", "start");
    pic.troughTxt = svgText(pic.lbl, "wt-svg-label", 0, 0, "trough");
    // Ruler (fixed): ticks every 50 nm, labels every 250 or 500 nm
    const ry = 274;
    svgEl("rect", { class: "wt-ruler-bg", x: 0, y: ry, width: W, height: 34, rx: 4 }, svg);
    const minor = K * 50 >= 6 ? 50 : 100, major = K * 250 >= 44 ? 250 : 500;
    for (let nm = 0; nm * K <= W; nm += minor) {
      const x = nm * K, big = nm % major === 0;
      svgEl("line", { class: "wt-tick", x1: x, y1: ry, x2: x, y2: ry + (big ? 12 : 6) }, svg);
      if (big) svgText(svg, "wt-svg-small", Math.min(Math.max(x, 12), W - 14), ry + 26, nm === 0 ? "0 nm" : String(nm), "middle");
    }
    pic.bar = svgEl("line", { class: "wt-ruler-bar", y1: ry + 2, y2: ry + 2, x1: 0 }, svg);
    $("caption").textContent = T.rulerCaption + (ghostStep ? " " + T.ghostNote : "");
    drawTuner();
  }

  function drawTuner() {
    if (!pic || pic.view !== "tuner") return;
    const { W, cy, K } = pic;
    const L = state.nm * K, A = state.amp * 0.9, p = state.p;
    const rgb = displayRGB(state.nm), colour = `rgb(${rgb.join(",")})`;
    const d = wavePath(W, L, A, p, cy);
    pic.wave.setAttribute("d", d);
    pic.wave.setAttribute("stroke", colour);
    pic.glow.setAttribute("d", d);
    pic.glow.setAttribute("stroke", colour);
    pic.glow.setAttribute("opacity", (0.1 + 0.35 * state.amp / MAX_AMP).toFixed(2));
    if (pic.ghost) {
      const g = curStep().target;
      pic.ghost.setAttribute("d", wavePath(W, g.nm * K, g.amp * 0.9, p, cy));
    }
    pic.bar.setAttribute("x2", L.toFixed(1));
    pic.lbl.style.display = state.labels ? "" : "none";
    pic.restLabel.style.display = state.labels ? "" : "none";
    if (!state.labels) return;
    // First crest at least 30 units from the left edge, then the next two.
    const n1 = Math.ceil(30 / L - p - 0.25);
    const x1 = L * (p + 0.25 + n1), x2 = x1 + L, x3 = x2 + L, top = cy - A;
    const ay = top - 32;
    pic.lam.setAttribute("d", arrowPath(x1 + 2, ay, x2 - 2, ay, true));
    pic.dropA.setAttribute("d", `M${x1} ${ay} L${x1} ${top} M${x2} ${ay} L${x2} ${top}`);
    pic.lamTxt.setAttribute("x", ((x1 + x2) / 2).toFixed(1)); pic.lamTxt.setAttribute("y", ay - 7);
    pic.amp.setAttribute("d", arrowPath(x3, cy - 2, x3, top + 3, false));
    pic.ampTxt.setAttribute("x", (x3 + 8).toFixed(1)); pic.ampTxt.setAttribute("y", (cy - A / 2 + 4).toFixed(1));
    pic.crestTxt.setAttribute("x", (x1 + 9).toFixed(1)); pic.crestTxt.setAttribute("y", top - 6);
    pic.troughTxt.setAttribute("x", (x1 + L / 2).toFixed(1)); pic.troughTxt.setAttribute("y", cy + A + 20);
  }

  // Static pictures for challenges 1–4.
  function buildStatic(svg, view, W, cy) {
    const H = 250, A = 60;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const L = W / 3;
    svgEl("line", { class: "wt-rest", x1: 0, y1: cy, x2: W, y2: cy }, svg);
    if (view === "arrows") {
      svgEl("path", { class: "wt-wave", stroke: "#e8e6e1", d: wavePath(W, L, A, 0.25, cy) }, svg);
      const x1 = L * 0.5, x2 = L * 1.5, x3 = L * 2.5, top = cy - A, ay = top - 30;
      svgEl("path", { class: "wt-drop", d: `M${x1} ${ay} L${x1} ${top} M${x2} ${ay} L${x2} ${top}` }, svg);
      svgEl("path", { class: "wt-arrow wt-arrow-a", d: arrowPath(x1 + 2, ay, x2 - 2, ay, true) }, svg);
      svgText(svg, "wt-svg-big wt-teal", (x1 + x2) / 2, ay - 8, "A");
      svgEl("path", { class: "wt-arrow wt-arrow-b", d: arrowPath(x3, cy - 2, x3, top + 3, false) }, svg);
      svgText(svg, "wt-svg-big wt-amber", x3 + 14, cy - A / 2 + 8, "B", "start");
      $("caption").textContent = "";
      return;
    }
    svgEl("path", { class: "wt-wave", stroke: "#e8e6e1", d: wavePath(W, L, A, 0, cy) }, svg);
    pic.hots = {};
    D.points.forEach((pt, i) => {
      const x = L * (0.75 + i * 0.5), y = pt.kind === "crest" ? cy - A : cy + A;
      const g = svgEl("g", { class: "wt-hot", role: "button", tabindex: "0", "aria-label": pt.sr, "data-id": pt.id }, svg);
      svgEl("circle", { class: "wt-hot-ring", cx: x, cy: y, r: 24 }, g);
      svgText(g, "wt-hot-letter", x, y + 6, pt.id);
      const pick = () => { if (!state.stepDone && !state.picked.has(pt.id)) submit(pt.id); };
      g.addEventListener("click", pick);
      g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      pic.hots[pt.id] = g;
    });
    $("caption").textContent = "";
    markHotspots();
  }

  function markHotspots() {
    if (!pic || !pic.hots) return;
    const step = curStep();
    D.points.forEach(pt => {
      const g = pic.hots[pt.id];
      g.classList.toggle("wt-hot-wrong", state.picked.has(pt.id) && pt.kind !== step.target);
      g.classList.toggle("wt-hot-answer", state.stepDone && pt.kind === step.target);
    });
  }

  function updateSummary() {
    if (!pic) { $("summary").textContent = ""; return; }
    if (pic.view === "tap") $("summary").textContent = T.summaryTap;
    else if (pic.view === "arrows") $("summary").textContent = T.summaryArrows;
    else {
      const L = state.nm * pic.K;
      $("summary").textContent = t("summaryTuner", { colour: colourName(state.nm), nm: state.nm, freq: freqText(state.nm), amp: state.amp, crests: Math.round(pic.W / L) });
    }
  }

  // ---- readouts and controls ----
  function updateReadouts() {
    const nm = state.nm, f = freqText(nm), name = colourName(nm);
    $("r-nm").textContent = `${nm} nm`;
    $("r-freq").textContent = `${f} × 10¹⁴ Hz`;
    $("r-colour").textContent = `${name[0].toUpperCase()}${name.slice(1)} (${nm} nm)`;
    $("swatch").style.background = `rgb(${displayRGB(nm).join(",")})`;
    const e = photonEnergyJ(nm), lo = photonEnergyJ(MAX_NM), hi = photonEnergyJ(MIN_NM);
    const ePct = Math.round(4 + 96 * (e - lo) / (hi - lo));
    $("e-fill").style.width = `${ePct}%`;
    $("e-num").textContent = energyText(nm);
    $("e-meter").setAttribute("aria-valuenow", ePct);
    $("e-meter").setAttribute("aria-valuetext", energyText(nm));
    $("b-fill").style.width = `${state.amp}%`;
    $("b-num").textContent = `${state.amp}%`;
    $("b-meter").setAttribute("aria-valuenow", state.amp);
    $("formula").textContent = t("formulaLine", { nm, freq: f });
  }

  function syncControls() {
    $("nm-range").value = state.nm;
    if (document.activeElement !== $("nm-box")) $("nm-box").value = state.nm;
    $("amp-range").value = state.amp;
  }

  function setWavelength(nm) { state.nm = clamp(Math.round(nm), MIN_NM, MAX_NM); }

  function refreshTuner() {
    syncControls(); updateReadouts(); drawTuner(); updateSummary();
  }

  function initControls() {
    const stops = [];
    for (let nm = MIN_NM; nm <= MAX_NM; nm += 18.5) stops.push(`rgb(${displayRGB(nm).join(",")})`);
    $("nm-range").style.setProperty("--wt-track", `linear-gradient(90deg, ${stops.join(",")})`);
    $("amp-range").style.setProperty("--wt-track", "linear-gradient(90deg, #2a2d33, #fbbf24)");

    $("nm-range").addEventListener("input", e => {
      const old = state.nm;
      setWavelength(Number(e.target.value));
      $("note").textContent = state.nm === old ? $("note").textContent : state.nm > old ? T.noteLonger : T.noteShorter;
      refreshTuner();
    });
    $("nm-box").addEventListener("input", e => {
      const v = parseNumber(e.target.value);
      if (Number.isFinite(v) && v >= MIN_NM && v <= MAX_NM) {
        const old = state.nm;
        setWavelength(v);
        if (state.nm !== old) $("note").textContent = state.nm > old ? T.noteLonger : T.noteShorter;
        refreshTuner();
      }
    });
    $("nm-box").addEventListener("change", e => {
      const v = parseNumber(e.target.value);
      setWavelength(Number.isFinite(v) ? v : state.nm);
      refreshTuner();
    });
    $("amp-range").addEventListener("input", e => {
      const old = state.amp;
      state.amp = clamp(Math.round(Number(e.target.value)), MIN_AMP, MAX_AMP);
      if (state.amp !== old) $("note").textContent = state.amp > old ? T.noteTaller : T.noteSmaller;
      refreshTuner();
    });
    // Screen readers hear one summary when the slider is released (not on every step).
    const announce = () => { $("live").textContent = `${state.nm} nm, ${colourName(state.nm)}. Frequency ${freqText(state.nm)} × 10 to the 14 hertz. Energy of each photon ${energyText(state.nm)}. Amplitude ${state.amp}.`; };
    ["nm-range", "amp-range", "nm-box"].forEach(id => $(id).addEventListener("change", announce));

    $("labels").addEventListener("change", e => { state.labels = e.target.checked; drawTuner(); });
    $("pause").addEventListener("click", () => { state.paused = !state.paused; renderPause(); syncLoop(); });
  }

  function renderPause() {
    const still = reduceQuery.matches;
    const b = $("pause");
    b.disabled = still;
    b.textContent = still ? T.reducedNote : state.paused ? T.playBtn : T.pauseBtn;
    b.setAttribute("aria-pressed", String(state.paused));
    b.classList.toggle("wt-pause-note", still);
  }

  // ---- animation: runs only while the wave is on screen, moving and the tab is visible ----
  function needsAnim() {
    return state.screen === "play" && curView() === "tuner" && !state.paused && !reduceQuery.matches && !document.hidden;
  }
  function frame(ts) {
    raf = 0;
    if (!needsAnim() || !pic || !pic.K) { lastTs = 0; return; }
    const dt = lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    state.p = (state.p + SPEED * dt / (state.nm * pic.K)) % 1;
    drawTuner();
    raf = requestAnimationFrame(frame);
  }
  function syncLoop() {
    if (needsAnim()) { if (!raf) { lastTs = 0; raf = requestAnimationFrame(frame); } }
    else if (raf) { cancelAnimationFrame(raf); raf = 0; lastTs = 0; }
  }

  // ---- screens ----
  function showScreen(name, focusHeading) {
    state.screen = name;
    $("start").hidden = name !== "start";
    $("play").hidden = name !== "play";
    $("end").hidden = name !== "end";
    if (name === "start") renderStart();
    if (name === "end") renderEnd();
    if (name === "play") applyLayout();
    syncLoop();
    window.scrollTo(0, 0);
    if (focusHeading) { const h = name === "start" ? $("title") : $("end-title"); if (h) h.focus(); }
  }

  const doneCount = () => Object.keys(state.stars).length;
  const starTotal = () => Object.values(state.stars).reduce((a, b) => a + b, 0);
  const firstOpen = () => { const i = D.challenges.findIndex(c => !state.stars[c.id]); return i < 0 ? 0 : i; };

  function renderStart() {
    const n = doneCount();
    $("saved").textContent = n ? t("savedLine", { done: n, total, stars: starTotal(), max: total * 3 }) : "";
    $("go").textContent = n ? T.continueBtn : T.startBtn;
    $("reset-start").hidden = !n;
  }

  function applyLayout() {
    const view = curView(), explore = state.tab === "explore";
    $("tab-explore").setAttribute("aria-pressed", String(explore));
    $("tab-challenges").setAttribute("aria-pressed", String(!explore));
    $("challenge").hidden = explore;
    $("grid").hidden = view === "none";
    $("grid").classList.toggle("wt-grid-one", view !== "tuner");
    $("controls").hidden = view !== "tuner";
    $("readouts").hidden = view !== "tuner";
    $("words").hidden = !explore;
    $("pic-tools").hidden = view !== "tuner";
    if (explore && !$("note").textContent) $("note").textContent = T.noteStart;
    renderPause();
    buildPicture();
    if (view === "tuner") refreshTuner();
    syncLoop();
  }

  // ---- challenge flow ----
  function renderChips() {
    const box = $("chips");
    box.replaceChildren();
    let group = -1, row = null;
    D.challenges.forEach((c, i) => {
      if (c.group !== group) {
        group = c.group;
        row = node("div", "wt-chip-group");
        row.append(node("span", "wt-chip-title", T.groups[group]));
        const list = node("div", "wt-chip-list");
        row.append(list); row.list = list; box.append(row);
      }
      const s = state.stars[c.id];
      const b = node("button", "btn btn-sm wt-chip");
      b.type = "button";
      b.append(node("span", "wt-chip-n", String(i + 1)), node("span", "wt-chip-s", s ? starText(s) : "–"));
      b.setAttribute("aria-label", `Challenge ${i + 1}: ${c.name}, ${s ? t("chipStatusStars", { n: s }) : T.chipStatusNone}`);
      if (i === state.idx) b.setAttribute("aria-current", "step");
      if (s) b.classList.add("wt-chip-done");
      b.addEventListener("click", () => { state.tab = "challenges"; enterChallenge(i); });
      row.list.append(b);
    });
    box.setAttribute("aria-label", T.chipsLabel);
  }

  function enterChallenge(i) {
    state.idx = i; state.step = 0; state.totalMisses = 0; state.revealedAny = false;
    enterStep();
    if (state.screen !== "play") showScreen("play");
  }

  function enterStep() {
    const step = curStep();
    state.misses = 0; state.stepDone = false; state.revealedStep = false;
    state.picked = new Set(); state.feedback = ""; state.feedbackKind = "";
    if (step.start) { state.nm = step.start.nm; state.amp = step.start.amp; state.p = 0; }
    renderChips();
    renderStepText();
    renderAnswer();
    renderFeedback();
    if (state.screen === "play" && state.tab === "challenges") applyLayout();
  }

  function renderStepText() {
    const ch = cur(), step = curStep();
    let eyebrow = `${T.groups[ch.group]} · ${t("challengeOf", { n: state.idx + 1, total })}`;
    if (ch.steps.length > 1) eyebrow += ` · ${t("stepOf", { n: state.step + 1, total: ch.steps.length })}`;
    $("eyebrow").textContent = eyebrow;
    $("prompt").textContent = step.prompt;
    $("instr").textContent = step.instructions || "";
  }

  // Answer area: option buttons, tap buttons, or number boxes.
  function renderAnswer() {
    const step = curStep(), area = $("answer");
    area.replaceChildren();
    const needsCheck = ["match", "tune", "sci", "number"].includes(step.type);
    $("check").hidden = !needsCheck || state.stepDone;
    $("next").hidden = !state.stepDone;
    if (step.type === "choice") {
      const list = node("div", "wt-options");
      list.setAttribute("role", "group"); list.setAttribute("aria-labelledby", "wt-prompt");
      step.options.forEach(o => {
        const wrong = state.picked.has(o.id) && o.id !== step.answer;
        const right = state.stepDone && o.id === step.answer;
        const b = node("button", "btn btn-ghost wt-option", `${right ? "✓ " : wrong ? "✗ " : ""}${o.label}`);
        b.type = "button";
        b.disabled = state.stepDone || wrong;
        if (wrong) b.classList.add("wt-wrong");
        if (right) b.classList.add("wt-right");
        b.addEventListener("click", () => submit(o.id));
        list.append(b);
      });
      area.append(list);
    } else if (step.type === "tap") {
      const list = node("div", "wt-options");
      list.setAttribute("role", "group"); list.setAttribute("aria-labelledby", "wt-prompt");
      D.points.forEach(pt => {
        const wrong = state.picked.has(pt.id) && pt.kind !== step.target;
        const right = state.stepDone && pt.kind === step.target;
        const b = node("button", "btn btn-ghost wt-option wt-point-btn", `${right ? "✓ " : wrong ? "✗ " : ""}${t("pointLabel", { id: pt.id })}`);
        b.type = "button";
        b.disabled = state.stepDone || wrong;
        if (wrong) b.classList.add("wt-wrong");
        if (right) b.classList.add("wt-right");
        b.addEventListener("click", () => submit(pt.id));
        list.append(b);
      });
      area.append(list);
    } else if (step.type === "sci") {
      const row = node("div", "wt-sci");
      const coef = node("input", "wt-box wt-box-wide"); coef.id = "wt-coef"; coef.type = "number"; coef.step = "any"; coef.inputMode = "decimal"; coef.setAttribute("aria-label", T.coefLabel);
      const exp = node("input", "wt-box"); exp.id = "wt-exp"; exp.type = "number"; exp.step = "1"; exp.setAttribute("aria-label", T.expLabel);
      const times = node("span", "wt-sci-x", T.times10);
      times.setAttribute("aria-hidden", "true");
      const sup = node("span", "wt-sci-sup");
      sup.append(exp);
      row.append(coef, times, sup, node("span", "wt-sci-unit", step.unit));
      coef.disabled = exp.disabled = state.stepDone;
      area.append(row);
    } else if (step.type === "number") {
      const row = node("div", "wt-sci");
      const box = node("input", "wt-box wt-box-wide"); box.id = "wt-len"; box.type = "number"; box.step = "any"; box.inputMode = "decimal"; box.setAttribute("aria-label", T.numberLabel);
      box.disabled = state.stepDone;
      row.append(box, node("span", "wt-sci-unit", step.unit));
      area.append(row);
    }
  }

  function renderFeedback() {
    const f = $("feedback");
    f.textContent = state.feedback;
    f.dataset.kind = state.feedbackKind;
    const last = state.step === cur().steps.length - 1;
    $("next").textContent = !last ? T.nextStep : state.idx < total - 1 ? T.nextChallenge : T.toRecap;
    $("next").hidden = !state.stepDone;
  }

  // Decide whether an answer is right. Returns { ok, invalid, hint }.
  function evaluate(step, answer) {
    switch (step.type) {
      case "tap": {
        const pt = D.points.find(p => p.id === answer);
        return { ok: pt.kind === step.target, hint: step.hints[pt.kind] || "" };
      }
      case "choice": {
        const o = step.options.find(opt => opt.id === answer);
        return { ok: answer === step.answer, hint: o.hint };
      }
      case "match": {
        const r = checkMatch(state.nm, state.amp, step.target.nm, step.target.amp, step.tolNm, step.tolAmp);
        const hints = [];
        if (!r.wavelength) hints.push(state.nm > step.target.nm ? T.matchLong : T.matchShort);
        if (!r.amplitude) hints.push(state.amp > step.target.amp ? T.matchTall : T.matchLow);
        return { ok: r.ok, hint: hints.join(" ") };
      }
      case "tune": {
        if (step.rule === "redDim") {
          const r = checkRedDim(state.nm, state.amp), hints = [];
          if (!r.red) hints.push(t("redNotRed", { colour: colourName(state.nm) }));
          if (!r.dim) hints.push(T.redTooBright);
          return { ok: r.ok, hint: hints.join(" ") };
        }
        return { ok: checkHighFreq(state.nm), hint: T.highHint };
      }
      case "sci": {
        const r = checkSci(parseNumber($("coef").value), parseNumber($("exp").value), step.target, step.trap);
        if (r.kind === "empty") return { invalid: true, hint: T.sciEmpty };
        return { ok: r.ok, hint: { exponent: T.sciExponent, multiplied: T.sciMultiplied, wrong: T.sciWrong }[r.kind] || "" };
      }
      default: {   // number
        const r = checkMetres(parseNumber($("len").value), step.min, step.max, step.target);
        if (r.kind === "empty") return { invalid: true, hint: T.lenEmpty };
        return { ok: r.ok, hint: { flipped: T.lenFlipped, power: T.lenPower, wrong: T.lenWrong }[r.kind] || "" };
      }
    }
  }

  function revealText(step) {
    let text = `${T.answerIs} ${step.reason}`;
    if (step.type === "match") text = `${T.answerIs} ${t("matchReveal", step.target)} ${step.reason}`;
    if (step.type === "tune") text = `${T.answerIs} ${step.rule === "redDim" ? T.redReveal : T.highReveal}`;
    return text;
  }

  function submit(answer) {
    if (state.stepDone) return;
    const step = curStep();
    const res = evaluate(step, answer);
    if (res.invalid) { state.feedback = res.hint; state.feedbackKind = "bad"; renderFeedback(); return; }
    if (answer !== undefined) state.picked.add(answer);
    if (res.ok) {
      state.stepDone = true;
      state.feedback = `${T.correct} ${step.reason}${step.after ? " " + step.after : ""}`;
      state.feedbackKind = "good";
    } else {
      state.misses++; state.totalMisses++;
      if (state.misses >= 2) {
        state.stepDone = true; state.revealedStep = true; state.revealedAny = true;
        state.feedback = `${res.hint} ${revealText(step)}${step.after ? " " + step.after : ""}`;
        state.feedbackKind = "bad";
        showAnswer(step);
      } else {
        state.feedback = `${res.hint} ${T.tryLeft}`;
        state.feedbackKind = "bad";
      }
    }
    if (state.stepDone && state.step === cur().steps.length - 1) finishChallenge();
    renderAnswer();
    renderFeedback();
    markHotspots();
    if (state.stepDone) $("next").focus();
    else focusFirstOpen(step);
  }

  // After the second miss, put the pictures and boxes in the answer state.
  function showAnswer(step) {
    if (step.type === "match") { state.nm = step.target.nm; state.amp = step.target.amp; refreshTuner(); }
    if (step.type === "tune") { state.nm = step.reveal.nm; state.amp = step.reveal.amp; refreshTuner(); }
  }

  function focusFirstOpen(step) {
    if (step.type === "choice" || step.type === "tap") {
      const b = $("answer").querySelector("button:not(:disabled)");
      if (b) b.focus();
    }
  }

  function finishChallenge() {
    const id = cur().id, earned = starsFor(state.totalMisses, state.revealedAny);
    if (!state.stars[id] || earned > state.stars[id]) state.stars[id] = earned;
    save();
    renderChips();
    // The star line comes after the explanation so the explanation is read first.
    state.feedback = `${state.feedback} ${starText(earned)} ${t("starsEarned", { n: earned })}`;
  }

  function onNext() {
    const last = state.step === cur().steps.length - 1;
    if (!last) { state.step++; enterStep(); return; }
    if (state.idx < total - 1) { enterChallenge(state.idx + 1); return; }
    showScreen("end", true);
  }

  // ---- end screen ----
  function renderEnd() {
    $("end-score").textContent = t("endScore", { stars: starTotal(), max: total * 3, done: doneCount(), total });
    const recap = $("recap");
    recap.replaceChildren();
    T.recap.forEach(line => recap.append(node("li", "", line)));
    const list = $("review");
    list.replaceChildren();
    let any = false;
    D.challenges.forEach((c, i) => {
      const s = state.stars[c.id];
      if (s === 3) return;
      any = true;
      const li = node("li", "wt-review-item panel");
      li.append(node("strong", "", `${i + 1}. ${c.name}`));
      li.append(node("span", "wt-review-stars", s ? ` ${starText(s)}` : ""));
      const last = c.steps[c.steps.length - 1];
      li.append(node("p", "wt-review-q", c.steps[0].prompt));
      li.append(node("p", "wt-muted", s ? last.reason : T.reviewNotDone));
      const b = node("button", "btn btn-ghost btn-sm", T.reviewTryAgain);
      b.type = "button";
      b.addEventListener("click", () => { state.tab = "challenges"; enterChallenge(i); });
      li.append(b);
      list.append(li);
    });
    if (!any) list.append(node("li", "wt-muted", T.reviewNone));
  }

  // ---- start over (needs a second press) ----
  function wireReset(btn) {
    const label = btn.textContent;
    btn.addEventListener("click", () => {
      if (btn.dataset.sure !== "1") { btn.dataset.sure = "1"; btn.textContent = T.startOverSure; return; }
      btn.dataset.sure = ""; btn.textContent = label;
      state.stars = {}; clearSaved();
      state.idx = 0; state.tab = "challenges";
      showScreen("start", true);
    });
    btn.addEventListener("blur", () => { btn.dataset.sure = ""; btn.textContent = label; });
  }

  // ---- wire up ----
  document.querySelectorAll("[data-copy]").forEach(el => { if (T[el.dataset.copy] !== undefined) el.textContent = T[el.dataset.copy]; });
  const learn = $("learn-list");
  T.startIntro.forEach(line => learn.append(node("li", "", line)));
  const words = $("words-list");
  T.words.forEach(([term, def]) => { words.append(node("dt", "", term)); words.append(node("dd", "", def)); });
  $("tabs").setAttribute("aria-label", T.tabs);

  initControls();
  ["reset-start", "reset-play", "reset-end"].forEach(id => wireReset($(id)));
  $("go").addEventListener("click", () => { state.tab = "challenges"; enterChallenge(firstOpen()); });
  $("go-tuner").addEventListener("click", () => { state.tab = "explore"; $("note").textContent = T.noteStart; showScreen("play"); });
  $("tab-explore").addEventListener("click", () => { state.tab = "explore"; applyLayout(); });
  $("tab-challenges").addEventListener("click", () => { state.tab = "challenges"; enterStep(); });
  $("recap-btn").addEventListener("click", () => showScreen("end", true));
  $("end-back").addEventListener("click", () => { state.tab = "challenges"; enterChallenge(firstOpen()); });
  $("next").addEventListener("click", onNext);
  $("form").addEventListener("submit", e => { e.preventDefault(); if (!state.stepDone) submit(undefined); });
  document.addEventListener("visibilitychange", syncLoop);
  reduceQuery.addEventListener("change", () => { renderPause(); syncLoop(); });
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    if (state.screen !== "play" || curView() === "none") return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { buildPicture(); if (curView() === "tuner") refreshTuner(); }, 120);
  });

  state.idx = firstOpen();
  enterStep();
  showScreen("start");
})();
