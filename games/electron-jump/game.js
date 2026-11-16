"use strict";

// Pure science helpers; no DOM, animation or storage dependencies.
function levelEnergy(n) {
  return EJ_DATA.physics.levels.includes(n) ? -EJ_DATA.physics.groundEV / (n * n) : NaN;
}
function jumpEnergy(hi, lo) {
  return hi > lo && Number.isFinite(levelEnergy(hi)) && Number.isFinite(levelEnergy(lo))
    ? EJ_DATA.physics.groundEV * (1 / (lo * lo) - 1 / (hi * hi)) : NaN;
}
function wavelengthNm(hi, lo) { return EJ_DATA.physics.photonEVnm / jumpEnergy(hi, lo); }
function classify(nm) {
  if (!Number.isFinite(nm) || nm <= 0) return null;
  if (nm < 380) return "ultraviolet";
  if (nm > 750) return "infrared";
  return EJ_DATA.physics.bands.find(band => nm < band[0])[1];
}
function absorbTarget(fromLevel, nm, toleranceNm = 2) {
  if (!Number.isFinite(levelEnergy(fromLevel)) || !Number.isFinite(nm) || nm <= 0 ||
      !Number.isFinite(toleranceNm) || toleranceNm < 0) return null;
  // Choose the nearest allowed line if a caller supplies a large tolerance.
  let target = null, nearest = Infinity;
  for (const n of EJ_DATA.physics.levels) {
    if (n <= fromLevel) continue;
    const difference = Math.abs(wavelengthNm(n, fromLevel) - nm);
    if (difference <= toleranceNm && difference < nearest) { nearest = difference; target = n; }
  }
  return target;
}
function wavelengthToRGB(nm) {
  // Standard piecewise visible-spectrum approximation, gamma 0.8 with dimmer ends.
  // It is a display approximation, not a calibrated prediction of human colour vision.
  if (!Number.isFinite(nm) || nm < 380 || nm > 750) return [200, 205, 214];
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
  else r = 1;
  const intensity = nm < 420 ? .3 + .7 * (nm - 380) / 40 : nm > 700 ? .3 + .7 * (750 - nm) / 50 : 1;
  return [r, g, b].map(channel => Math.round(255 * Math.pow(channel * intensity, .8)));
}
function challengeWorkMatches(challenge, observed, order) {
  if (challenge.type === "order") return order.length === challenge.answer.length && order.every((item, i) => item === challenge.answer[i]);
  return Boolean(challenge.targets) && challenge.targets.every(target => observed.includes(target));
}

if (typeof document !== "undefined") (() => {
  const data = EJ_DATA, copy = data.text, key = "mrd-electron-jump";
  const $ = id => document.getElementById(`ej-${id}`);
  const format = (template, values = {}) => template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
  const t = (name, values) => format(copy[name], values);
  const colour = nm => ["ultraviolet", "infrared"].includes(classify(nm)) ? t("invisible", { colour: classify(nm) }) : classify(nm);
  const rgb = nm => `rgb(${wavelengthToRGB(nm).join(",")})`;
  const displayNm = (hi, lo) => data.physics.wavelengths[`${hi}-${lo}`] || Math.round(wavelengthNm(hi, lo));
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key)) || {}; } catch (_) { /* Storage may be blocked. */ }
  const validIds = values => (Array.isArray(values) ? values : []).filter(id => data.challenges.some(c => c.id === id));
  const state = {
    started: false, end: false, tab: "explore", mode: "emit", level: 2, startLevel: 2,
    compare: false, index: 0, completed: new Set(validIds(saved.completed)), missed: new Set(validIds(saved.missed)),
    lines: [], logs: [], last: null, status: copy.ready, feedback: "", choice: null, tries: 0,
    solved: false, revealed: false, predicted: false, firedGreen: false, observed: [], order: []
  };
  let animation = null;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const challenge = () => state.tab === "challenges" ? data.challenges[state.index] : null;
  function save() {
    try { localStorage.setItem(key, JSON.stringify({ version: 1, completed: [...state.completed], missed: [...state.missed], card: t("progress", { done: state.completed.size }) })); }
    catch (_) { /* The lab still works without persistent progress. */ }
  }
  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function svg(tag, attrs, content, parent) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs || {}).forEach(([name, value]) => node.setAttribute(name, value));
    if (content !== undefined && content !== null) node.textContent = content;
    if (parent) parent.append(node);
    return node;
  }
  function button(label, id, action) {
    const node = el("button", "btn btn-ghost btn-sm", label);
    node.type = "button";
    if (id) node.id = `ej-${id}`;
    node.addEventListener("click", action);
    return node;
  }
  function stopFlight() {
    if (animation) animation.cancel();
    animation = null;
  }
  function photonPath(width, jump) {
    const cx = width * .38, radius = Math.min(width * .32, 145);
    const n = jump.kind === "emit" ? jump.from : jump.to;
    const r = radius * (.17 + ((n || 2) - 1) * .166);
    const electron = [cx - r * .707, 180 - r * .707];
    const outside = [width - 100, 25];
    return jump.kind === "emit" ? [electron, outside] : jump.kind === "absorb" ? [outside, electron] : [[width - 90, 180], [22, 180]];
  }
  function fly(kind) {
    stopFlight();
    const packet = $("packet");
    if (!packet || reducedMotion.matches || document.hidden || typeof packet.animate !== "function") return;
    const width = Number($("atom").getAttribute("viewBox").split(" ")[2]);
    const [start, end] = photonPath(width, state.last);
    animation = packet.animate([
      { transform: `translate(${start[0]}px, ${start[1]}px)`, opacity: 1 },
      { transform: `translate(${end[0]}px, ${end[1]}px)`, opacity: kind === "emit" ? 1 : 0 }
    ], { duration: kind === "pass" ? 1000 : 800, easing: "ease-in-out" });
    animation.onfinish = () => { animation = null; };
  }
  function lineList() {
    return state.lines.filter(line => state.compare || line.kinds.includes(state.mode)).sort((a, b) => a.nm - b.nm);
  }
  function log(message) { state.logs.unshift(message); state.logs = state.logs.slice(0, 12); }
  function resetExperiment() {
    stopFlight(); state.level = 2; state.startLevel = 2; state.lines = []; state.logs = []; state.last = null;
    state.status = copy.ready; state.observed = []; state.firedGreen = false;
  }
  function loadChallenge(index) {
    resetExperiment(); state.index = index; state.mode = challenge().mode;
    state.feedback = ""; state.choice = null; state.tries = 0; state.solved = false; state.revealed = false; state.predicted = false;
    state.order = [...(challenge().jumps || [])];
    if (state.mode === "absorb") state.status = t("resetMessage", { n: 2 });
    render();
  }
  function setTab(tab) {
    state.tab = tab; state.end = false;
    if (tab === "challenges") loadChallenge(state.index);
    else { resetExperiment(); state.mode = "emit"; render(); }
  }
  function recordJump(from, to, kind) {
    const hi = Math.max(from, to), lo = Math.min(from, to), nm = displayNm(hi, lo), energy = jumpEnergy(hi, lo);
    state.level = to;
    state.last = { from, to, kind, nm, energy };
    state.status = t(kind === "emit" ? "emitted" : "absorbed", { from, to, energy: energy.toFixed(2), nm, colour: colour(nm) });
    log(state.status);
    const existing = state.lines.find(line => line.hi === hi && line.lo === lo);
    if (!existing) state.lines.push({ hi, lo, nm, kinds: [kind] });
    else if (!existing.kinds.includes(kind)) existing.kinds.push(kind);
    // Prediction evidence counts only after the prediction has been checked.
    if (challenge()?.type !== "predict" || state.predicted) {
      const event = `${kind}:${from}-${to}`;
      if (!state.observed.includes(event)) state.observed.push(event);
    }
    render(); fly(kind);
  }
  function selectLevel(n) {
    if (state.mode === "absorb") { state.status = copy.usePhoton; render(); return; }
    if (n === state.level) { state.status = t("sameLevel", { n }); render(); return; }
    if (n > state.level) {
      stopFlight(); state.level = n; state.last = null;
      state.status = t("energized", { n }); log(state.status); render();
    } else recordJump(state.level, n, "emit");
  }
  function fire(nm) {
    const from = state.level, target = absorbTarget(from, nm);
    if (target !== null) recordJump(from, target, "absorb");
    else {
      if (from === 2 && nm === 550) state.firedGreen = true;
      state.status = t("passed", { energy: (data.physics.photonEVnm / nm).toFixed(2), n: from });
      state.last = { kind: "pass", nm };
      log(t("passLog", { nm, colour: colour(nm), n: from })); render(); fly("pass");
    }
  }
  function complete() {
    state.solved = true; state.completed.add(challenge().id);
    state.feedback = t("correct", { reason: challenge().reason }); save();
  }
  function miss(hint) {
    const c = challenge();
    state.tries += 1; state.missed.add(c.id); save();
    if (state.tries >= 2) {
      state.revealed = true;
      const answer = c.type === "order" ? c.answer.join(" < ") : c.options ? c.options[c.answer] : c.answer;
      state.feedback = t("revealed", { answer, reason: c.reason });
      if (c.type === "predict" && state.predicted) state.feedback += ` ${c.hint}`;
    } else state.feedback = `${hint} ${copy.oneTry}`;
  }
  function check() {
    const c = challenge();
    if (!c || state.solved || state.revealed) return;
    if (c.prerequisite && !state.firedGreen) { state.feedback = copy.prerequisite; render(); return; }
    if (c.type === "choice" || (c.type === "predict" && !state.predicted)) {
      if (state.choice === null) { state.feedback = copy.selectAnswer; render(); return; }
      if (state.choice === c.answer) {
        if (c.type === "predict") {
          state.predicted = true; state.tries = 0; state.observed = [];
          state.feedback = copy.predictionRight;
        } else complete();
      } else miss(c.hints[state.choice]);
    } else if (challengeWorkMatches(c, state.observed, state.order)) complete();
    else miss(c.type === "order" ? copy.orderHint : c.hint);
    render();
  }
  function moveOrder(index, direction) {
    const destination = index + direction;
    if (destination < 0 || destination >= state.order.length || state.solved || state.revealed) return;
    [state.order[index], state.order[destination]] = [state.order[destination], state.order[index]];
    render(); $(`order-${destination}`).focus();
  }
  function renderChallenge() {
    const c = challenge(); $("challenge").hidden = !c;
    if (!c) return;
    $("picker").value = String(state.index);
    [...$("picker").options].forEach((option, i) => {
      option.textContent = t("challengeOption", { mark: state.completed.has(data.challenges[i].id) ? "✓ " : "", number: i + 1, name: data.challenges[i].name });
    });
    $("progress").textContent = t("progress", { done: state.completed.size });
    $("prompt").textContent = c.prompt;
    $("instructions").textContent = c.prerequisite && !state.firedGreen ? copy.prerequisite : c.type === "predict" ? (state.predicted ? copy.testHelp : copy.predictHelp) : c.type === "order" ? copy.orderHelp : c.type === "choice" ? copy.choiceHelp : copy.doHelp;
    $("answers").replaceChildren();
    if (c.options && !(c.type === "predict" && state.predicted)) c.options.forEach((option, i) => {
      const node = button(option, `answer-${i}`, () => { state.choice = i; render(); });
      node.classList.add("ej-answer"); node.setAttribute("aria-pressed", String(state.choice === i));
      node.disabled = state.solved || state.revealed || Boolean(c.prerequisite && !state.firedGreen);
      $("answers").append(node);
    });
    if (c.type === "order") {
      const list = el("div", "ej-order");
      state.order.forEach((jump, i) => {
        const row = el("div", "ej-order-row");
        const item = button(`${i + 1}. ${jump}`, `order-${i}`, () => {});
        item.classList.add("ej-order-jump"); item.setAttribute("aria-label", t("orderLabel", { jump, position: i + 1 }));
        item.addEventListener("keydown", event => {
          if (["ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); moveOrder(i, event.key === "ArrowUp" ? -1 : 1); }
        });
        const up = button(copy.moveUp, `up-${i}`, () => moveOrder(i, -1));
        const down = button(copy.moveDown, `down-${i}`, () => moveOrder(i, 1));
        up.disabled = i === 0 || state.solved || state.revealed;
        down.disabled = i === state.order.length - 1 || state.solved || state.revealed;
        row.append(item, up, down); list.append(row);
      });
      $("answers").append(list);
    }
    const observed = (c.targets || []).filter(target => state.observed.includes(target)).map(target => target.split(":")[1].replace("-", " → "));
    $("observed").textContent = c.targets ? t("observed", { items: observed.length ? observed.join(" · ") : copy.noneYet }) : "";
    $("check").disabled = state.solved || state.revealed;
    $("retry").hidden = !state.revealed && !state.solved;
    $("next").textContent = state.index === data.challenges.length - 1 || state.completed.size === 10 ? copy.finish : copy.next;
    $("feedback").textContent = state.feedback;
    $("feedback").dataset.good = String(state.solved || (state.predicted && state.feedback === copy.predictionRight));
  }
  function control(parent, n, x, y, width, label, prefix) {
    const group = svg("g", { id: `ej-${prefix}-${n}`, class: "ej-level-control", role: "button", tabindex: 0,
      "aria-label": prefix === "rung" ? label : t("selectLevel", { n }), "aria-pressed": String(state.level === n), "data-level": n }, null, parent);
    svg("rect", { x, y, width, height: 44, rx: 8, class: "ej-level-box" }, null, group);
    svg("text", { x: x + width / 2, y: y + 28, "text-anchor": "middle", class: "ej-svg-text" }, label, group);
    return group;
  }
  function renderPictures() {
    stopFlight();
    const atom = $("atom"), ladder = $("ladder");
    const w = Math.max(280, atom.getBoundingClientRect().width || 480);
    const lw = Math.max(280, ladder.getBoundingClientRect().width || 480);
    atom.setAttribute("viewBox", `0 0 ${w} 360`); ladder.setAttribute("viewBox", `0 0 ${lw} 360`);
    atom.replaceChildren(); ladder.replaceChildren();
    svg("title", { id: "ej-atom-title" }, copy.atom, atom); svg("title", { id: "ej-ladder-title" }, copy.ladder, ladder);
    const cx = w * .38, cy = 180, radius = Math.min(w * .32, 145);
    // Bohr model: useful for hydrogen; orbit radii are deliberately not to physical scale.
    data.physics.levels.forEach(n => {
      const r = radius * (.17 + (n - 1) * .166);
      const group = control(atom, n, w - 70, 24 + (6 - n) * 51, 66, t("levelButton", { n }), "ring");
      const circle = svg("circle", { cx, cy, r, class: "ej-ring" }); group.prepend(circle);
      const hit = svg("circle", { cx, cy, r, class: "ej-hit" }); group.append(hit);
    });
    svg("circle", { cx, cy, r: 16, fill: "#3c273f", stroke: "#a78bfa" }, null, atom);
    svg("text", { x: cx, y: cy + 6, "text-anchor": "middle", class: "ej-svg-text" }, "+", atom);
    const er = radius * (.17 + (state.level - 1) * .166);
    svg("circle", { cx: cx - er * .707, cy: cy - er * .707, r: 6, class: "ej-electron" }, null, atom);
    const rungY = n => 330 - (levelEnergy(n) + data.physics.groundEV) / data.physics.groundEV * 280;
    const labelX = lw - 166, rungEnd = Math.max(65, labelX - 55), labelY = [0, 308, 220, 168, 118, 68, 18];
    data.physics.levels.forEach(n => {
      const y = rungY(n);
      svg("path", { d: `M ${rungEnd} ${y} L ${rungEnd + 20} ${y} L ${labelX - 8} ${labelY[n] + 22} L ${labelX} ${labelY[n] + 22}`, class: "ej-leader" }, null, ladder);
      const group = control(ladder, n, labelX, labelY[n], 162, t("energyLabel", { n, energy: data.physics.energies[n - 1] }), "rung");
      svg("line", { x1: 24, x2: rungEnd, y1: y, y2: y, class: "ej-ring" }, null, group);
    });
    svg("circle", { cx: 38, cy: rungY(state.level), r: 6, class: "ej-electron" }, null, ladder);
    if (state.last && state.last.kind !== "pass") {
      const a = state.last, x = 14, y1 = rungY(a.from), y2 = rungY(a.to), direction = Math.sign(y2 - y1);
      svg("path", { d: `M ${x} ${y1} L ${x} ${y2} m -5 ${-direction * 7} l 5 ${direction * 7} l 5 ${-direction * 7}`, class: "ej-jump-arrow" }, null, ladder);
      svg("text", { x: 28, y: 274, class: "ej-svg-small" }, t("arrowEnergy", { energy: a.energy.toFixed(2) }), ladder);
      svg("text", { x: 28, y: 294, class: "ej-svg-small" }, t("arrowWavelength", { nm: a.nm }), ladder);
    }
    if (state.last) {
      const nm = state.last.nm;
      const [, end] = photonPath(w, state.last);
      const packet = svg("g", { id: "ej-packet", transform: `translate(${end[0]},${end[1]})`, opacity: state.last.kind === "emit" ? 1 : 0, "aria-hidden": "true", "pointer-events": "none" }, null, atom);
      svg("rect", { x: -24, y: -12, width: 48, height: 24, rx: 10, fill: "#111418", stroke: rgb(nm), "stroke-dasharray": nm < 380 || nm > 750 ? "4 3" : "none" }, null, packet);
      svg("path", { d: "M -20 0 Q -15 -14 -10 0 T 0 0 T 10 0 T 20 0", fill: "none", stroke: rgb(nm), "stroke-width": 3 }, null, packet);
      svg("text", { x: 8, y: 350, class: "ej-svg-small" }, t("photonLabel", { nm, colour: colour(nm) }), atom);
    }
    $("atom-summary").textContent = t("atomSummary", { n: state.level });
    $("ladder-summary").textContent = t("ladderSummary", { n: state.level });
  }
  function renderSpectra() {
    $("spectra").replaceChildren(); $("line-key").replaceChildren();
    const lines = lineList(), labels = lines.map(line => t("photonLabel", { nm: line.nm, colour: colour(line.nm) }));
    // The same measured gaps are shown as bright or dark lines in the paired comparison.
    const views = state.compare ? ["emit", "absorb"] : [state.mode];
    const width = Math.max(260, $("spectra").getBoundingClientRect().width || 600), left = 44, span = width - 88;
    views.forEach(view => {
      const heading = el("p", "ej-spectrum-heading", view === "emit" ? copy.emission : copy.absorption);
      const picture = svg("svg", { viewBox: `0 0 ${width} 84`, class: "ej-spectrum", role: "img",
        "aria-label": t("spectrumSummary", { view: heading.textContent, lines: labels.join("; ") || copy.noLines }) });
      svg("rect", { x: 0, y: 0, width, height: 48, rx: 5, fill: "#000" }, null, picture);
      for (let nm = 380; nm < 750; nm += 2) svg("rect", { x: left + (nm - 380) / 370 * span, y: view === "absorb" ? 0 : 44,
        width: span * 2 / 370 + .3, height: view === "absorb" ? 48 : 4, fill: rgb(nm) }, null, picture);
      svg("rect", { x: 0, y: 0, width: 40, height: 48, fill: "#242a33", stroke: "#aeb3bb", "stroke-dasharray": "3 3" }, null, picture);
      svg("rect", { x: width - 40, y: 0, width: 40, height: 48, fill: "#242a33", stroke: "#aeb3bb", "stroke-dasharray": "3 3" }, null, picture);
      svg("text", { x: 20, y: 29, class: "ej-svg-small", "text-anchor": "middle" }, copy.uv, picture);
      svg("text", { x: width - 20, y: 29, class: "ej-svg-small", "text-anchor": "middle" }, copy.ir, picture);
      lines.forEach((line, i) => {
        const nm = line.nm, invisible = nm < 380 || nm > 750;
        const x = nm < 380 ? 5 + (i % 4) * 8 : nm > 750 ? width - 35 + (i % 4) * 8 : left + (nm - 380) / 370 * span;
        svg("line", { x1: x, x2: x, y1: invisible ? 34 : 2, y2: 46, stroke: invisible ? "#c8cdd6" : view === "emit" ? rgb(nm) : "#000", "stroke-width": 3,
          "stroke-dasharray": invisible ? "3 2" : "none" }, null, picture);
      });
      [380, 450, 550, 650, 750].forEach(nm => {
        const x = left + (nm - 380) / 370 * span;
        svg("line", { x1: x, x2: x, y1: 49, y2: 54, stroke: "#aeb3bb" }, null, picture);
        svg("text", { x, y: 72, class: "ej-svg-small", "text-anchor": "middle" }, String(nm), picture);
      });
      $("spectra").append(heading, picture);
    });
    if (!lines.length) $("line-key").append(el("span", "ej-muted", copy.noLines));
    lines.forEach((line, i) => {
      const item = el("span", "ej-line-item"), swatch = el("span", "ej-swatch"); swatch.style.backgroundColor = rgb(line.nm);
      if (line.nm < 380 || line.nm > 750) swatch.classList.add("ej-invisible");
      item.append(swatch, el("span", "", labels[i])); $("line-key").append(item);
    });
    $("compare-note").hidden = !state.compare;
  }
  function renderEnd() {
    $("end-progress").textContent = t("recapIntro", { done: state.completed.size });
    $("review").replaceChildren();
    if (!state.missed.size) $("review").append(el("li", "", copy.noMisses));
    data.challenges.filter(c => state.missed.has(c.id)).forEach(c => $("review").append(el("li", "", `${c.name}: ${c.reason}`)));
  }
  function render() {
    const focused = document.activeElement?.id;
    $("start").hidden = state.started; $("lab").hidden = !state.started || state.end; $("end").hidden = !state.end;
    for (const tab of ["explore", "challenges"]) {
      $(`${tab}-tab`).setAttribute("aria-selected", String(state.tab === tab));
      $(`${tab}-tab`).tabIndex = state.tab === tab ? 0 : -1;
    }
    $("workspace").setAttribute("aria-labelledby", `ej-${state.tab}-tab`);
    for (const mode of ["emit", "absorb"]) {
      $(mode).setAttribute("aria-pressed", String(state.mode === mode));
      $(mode).disabled = Boolean(challenge());
    }
    $("level").textContent = t("level", { n: state.level });
    $("help").textContent = state.mode === "emit" ? copy.emitHelp : copy.absorbHelp;
    $("emit-controls").hidden = state.mode !== "emit"; $("absorb-controls").hidden = state.mode !== "absorb";
    $("give").disabled = state.level === 6;
    $("start-level").value = String(state.startLevel); $("start-level").disabled = Boolean(challenge());
    $("status").textContent = state.status;
    $("compare").checked = state.compare;
    const a = state.last;
    $("jump").textContent = a && a.kind !== "pass" ? t("jumpReadout", { action: a.kind === "emit" ? copy.emit : copy.absorb, from: a.from, to: a.to, energy: a.energy.toFixed(2), nm: a.nm, colour: colour(a.nm) }) : "";
    renderChallenge();
    if (state.started && !state.end) { renderPictures(); renderSpectra(); }
    $("log").replaceChildren();
    (state.logs.length ? state.logs : [copy.emptyLog]).forEach(entry => $("log").append(el("li", "", entry)));
    if (state.end) renderEnd();
    if (focused && document.activeElement?.id !== focused) {
      const replacement = document.getElementById(focused);
      if (replacement && !replacement.disabled && !replacement.closest("[hidden]")) replacement.focus({ preventScroll: true });
    }
  }

  document.querySelectorAll("[data-copy]").forEach(node => { node.textContent = copy[node.dataset.copy]; });
  $("tabs").setAttribute("aria-label", copy.tabs);
  copy.recap.forEach(item => $("recap").append(el("li", "", item)));
  data.challenges.forEach((c, i) => { const option = el("option", "", c.name); option.value = i; $("picker").append(option); });
  data.physics.photons.forEach(nm => {
    const node = button("", `photon-${nm}`, () => fire(nm)); node.classList.add("ej-photon-button");
    node.setAttribute("aria-label", t("fireLabel", { nm, colour: colour(nm) }));
    const swatch = el("span", "ej-swatch"); swatch.style.backgroundColor = rgb(nm); swatch.setAttribute("aria-hidden", "true");
    node.append(swatch, el("span", "", t("photonLabel", { nm, colour: colour(nm) }))); $("photons").append(node);
  });
  $("start-button").addEventListener("click", () => { state.started = true; render(); $("explore-tab").focus(); });
  $("tabs").addEventListener("click", event => { const target = event.target.closest("[data-tab]"); if (target) setTab(target.dataset.tab); });
  $("tabs").addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tab = event.key === "Home" ? "explore" : event.key === "End" ? "challenges" : state.tab === "explore" ? "challenges" : "explore";
    setTab(tab); $(`${tab}-tab`).focus();
  });
  $("mode").addEventListener("click", event => {
    const target = event.target.closest("[data-mode]");
    if (!target || challenge()) return;
    state.mode = target.dataset.mode; state.level = state.mode === "absorb" ? state.startLevel : 2; state.last = null;
    state.status = t("resetMessage", { n: state.level }); render();
  });
  ["atom", "ladder"].forEach(id => {
    $(id).addEventListener("click", event => {
      const target = event.target.closest("[data-level]");
      if (target) selectLevel(Number(target.dataset.level));
      else { state.status = copy.onLevel; render(); }
    });
    $(id).addEventListener("keydown", event => {
      if (["Enter", " "].includes(event.key) && event.target.dataset.level) { event.preventDefault(); selectLevel(Number(event.target.dataset.level)); }
    });
  });
  $("give").addEventListener("click", () => { if (state.level < 6) selectLevel(state.level + 1); });
  $("start-level").addEventListener("change", () => {
    state.startLevel = Number($("start-level").value); state.level = state.startLevel; state.last = null;
    state.status = t("resetMessage", { n: state.level }); render();
  });
  $("reset-atom").addEventListener("click", () => {
    state.level = state.startLevel; state.last = null; state.status = t("resetMessage", { n: state.level }); render();
  });
  $("fall").addEventListener("click", () => {
    if (state.level > state.startLevel) recordJump(state.level, state.startLevel, "emit");
    else { state.status = copy.cannotFall; render(); }
  });
  $("compare").addEventListener("change", () => { state.compare = $("compare").checked; render(); });
  $("clear").addEventListener("click", () => { state.lines = []; render(); });
  $("picker").addEventListener("change", () => { loadChallenge(Number($("picker").value)); });
  $("check").addEventListener("click", check);
  $("retry").addEventListener("click", () => { loadChallenge(state.index); $("prompt").focus(); });
  $("next").addEventListener("click", () => {
    if (state.index === data.challenges.length - 1 || state.completed.size === 10) { state.end = true; stopFlight(); render(); $("end-title").focus(); }
    else { loadChallenge(state.index + 1); $("prompt").focus(); }
  });
  $("back").addEventListener("click", () => { state.end = false; render(); $("challenges-tab").focus(); });
  $("start-over").addEventListener("click", () => {
    try { localStorage.removeItem(key); } catch (_) { /* Clearing is optional if storage is blocked. */ }
    state.completed.clear(); state.missed.clear(); state.index = 0; state.tab = "explore"; state.mode = "emit";
    state.started = false; state.end = false; state.compare = false; resetExperiment(); render(); $("start-button").focus();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopFlight(); });
  window.addEventListener("pagehide", stopFlight);
  reducedMotion.addEventListener("change", () => { if (reducedMotion.matches) stopFlight(); });
  let lastWidth = 0;
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (state.started && !state.end && width > 0 && Math.abs(width - lastWidth) > 1) { lastWidth = width; render(); }
  }).observe($("workspace"));
  render();
})();
