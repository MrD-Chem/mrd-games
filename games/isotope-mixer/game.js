"use strict";

// Pure math and checking functions: no page or storage access.
function weightedAverage(isotopes, counts) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  return total ? isotopes.reduce((sum, isotope, i) => sum + isotope.mass * counts[i], 0) / total : null;
}

function plainAverage(isotopes) {
  return isotopes.length ? isotopes.reduce((sum, isotope) => sum + isotope.mass, 0) / isotopes.length : null;
}

function tiltAngle(avg, guess) {
  return Math.max(-12, Math.min(12, (avg - guess) * 8));
}

function withinTolerance(value, answer, tolerance) {
  return Number.isFinite(value) && Math.abs(value - answer) <= tolerance + 1e-9;
}

function checkPrediction(isotopes, counts, guess, tolerance) {
  const avg = weightedAverage(isotopes, counts);
  return avg !== null && withinTolerance(guess, avg, tolerance);
}

function checkBuild(isotopes, counts, challenge) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const avg = weightedAverage(isotopes, counts);
  if (!total) return "emptyBag";
  if (challenge.maxAtoms && total > challenge.maxAtoms) return "buildMax";
  if (challenge.exactAtoms && total !== challenge.exactAtoms) return "buildExact";
  return withinTolerance(avg, challenge.target, challenge.tolerance) ? "success" : "buildWrong";
}

function checkCalculation(isotopes, contributions, total, tolerance = 0.02) {
  const expected = isotopes.map(isotope => isotope.mass * isotope.abundance / 100);
  return {
    fields: expected.map((value, i) => withinTolerance(contributions[i], value, 0.01)),
    total: withinTolerance(total, expected.reduce((sum, value) => sum + value, 0), tolerance)
  };
}

function checkReverse(value, answer, tolerance = 1) {
  return value >= 0 && value <= 100 && withinTolerance(value, answer, tolerance);
}

function checkChoice(value, answer) {
  return value === answer;
}

if (typeof document !== "undefined") (() => {
  const data = window.ISOTOPE_MIXER_DATA;
  const copy = data.text;
  const storageKey = "mrd-isotope-mixer";
  const $ = id => document.getElementById(`im-${id}`);
  const format = (template, values = {}) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
  const t = (key, values) => format(copy[key], values);
  const sum = counts => counts.reduce((total, count) => total + count, 0);
  const numberFrom = value => String(value).trim() === "" ? NaN : Number(value);
  const clampCount = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  function naturalCounts(isotopes) {
    const counts = isotopes.map(isotope => Math.round(isotope.abundance));
    // Neon rounds to 99. Put a leftover atom where rounding lost the most,
    // so the button always gives the promised 100-atom sample.
    while (sum(counts) !== 100) {
      const direction = sum(counts) < 100 ? 1 : -1;
      const residuals = isotopes.map((isotope, i) => direction * (isotope.abundance - counts[i]));
      const index = residuals.indexOf(Math.max(...residuals));
      counts[index] += direction;
    }
    return counts;
  }
  const massText = mass => state.element.fictional ? String(mass) : mass.toFixed(3);
  const getChallenge = () => state.tab === "challenges" ? data.challenges[state.challengeIndex] : null;
  const isFixed = () => ["predict", "calc", "choice"].includes(getChallenge()?.type);
  const isHidden = () => ["predict", "calc"].includes(getChallenge()?.type) && !state.revealed;
  const canGuess = () => getChallenge()?.type === "predict" && !state.revealed;

  // A single record holds completed IDs and the last tab. Blocked storage is OK.
  function readSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return saved && typeof saved === "object" ? saved : {};
    } catch (_) { return {}; }
  }
  const saved = readSaved();
  const knownIds = new Set(data.challenges.map(challenge => challenge.id));
  const completed = new Set((Array.isArray(saved.completed) ? saved.completed : []).filter(id => knownIds.has(id)));
  const state = {
    tab: saved.tab === "challenges" ? "challenges" : "sandbox", completed,
    challengeIndex: 0, element: data.elements[0], isotopes: [], counts: [],
    sandbox: { element: "Ms", counts: [3, 0, 1, 0] },
    compare: false, guess: 0, tries: 0, revealed: false, solved: false,
    checked: false, angle: 0, animate: false, feedback: "", feedbackKind: "",
    choice: null, calcValues: [], totalValue: "", reverseValue: "", validation: null
  };
  let animations = [];
  let dragPointer = null;
  let geometry = null;

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ completed: [...state.completed], tab: state.tab })); }
    catch (_) { /* Keep playing even if school settings block storage. */ }
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function svgNode(tag, attributes, text, parent = $("picture")) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    if (text !== undefined) element.textContent = text;
    parent.append(element);
    return element;
  }

  function resetAttempt() {
    state.tries = 0;
    state.revealed = false;
    state.solved = false;
    state.checked = false;
    state.angle = 0;
    state.animate = false;
    state.feedback = "";
    state.feedbackKind = "";
    state.choice = null;
    state.calcValues = state.isotopes.map(() => "");
    state.totalValue = "";
    state.reverseValue = "";
    state.validation = null;
    state.guess = Number(plainAverage(state.isotopes).toFixed(2));
  }

  function loadSample() {
    const challenge = getChallenge();
    state.element = data.elements.find(element => element.id === (challenge?.element || state.sandbox.element));
    state.isotopes = challenge?.isotopes ? challenge.isotopes.map(index => state.element.isotopes[index]) : state.element.isotopes;
    if (!challenge) state.counts = [...state.sandbox.counts];
    else if (challenge.counts) state.counts = [...challenge.counts];
    else if (["calc", "choice"].includes(challenge.type)) state.counts = naturalCounts(state.isotopes);
    else state.counts = state.isotopes.map(() => 0);
    resetAttempt();
    buildControls();
    buildAnswerArea();
    render();
  }

  function setTab(tab) {
    if (state.tab === tab) return;
    state.tab = tab;
    save();
    loadSample();
  }

  function buildControls() {
    $("element").value = state.element.id;
    $("element").disabled = Boolean(getChallenge());
    $("isotopes").replaceChildren();
    state.isotopes.forEach((isotope, i) => {
      const row = node("div", `im-isotope im-color-${i}`);
      const head = node("div", "im-isotope-head");
      const name = node("strong", "", isotope.name);
      head.append(name, node("span", "im-muted", t("massValue", { mass: massText(isotope.mass) })));
      const controls = node("div", "im-isotope-controls");
      const label = node("label", "sr-only", copy.countShort);
      label.htmlFor = `im-count-${i}`;
      const input = node("input", "im-count");
      input.id = `im-count-${i}`;
      input.type = "number";
      input.min = "0";
      input.max = "100";
      input.step = "1";
      input.inputMode = "numeric";
      input.setAttribute("aria-label", t("countLabel", { isotope: isotope.name }));
      input.readOnly = isFixed();
      input.addEventListener("input", () => {
        if (isFixed()) return;
        updateCount(i, input.value);
      });
      input.addEventListener("blur", () => { input.value = state.counts[i]; });
      controls.append(label);
      [[-1, "subtract"], [1, "add"], [10, "addTen"]].forEach(([delta, key], buttonIndex) => {
        if (buttonIndex === 1) controls.append(input);
        const button = node("button", "btn btn-ghost btn-sm", copy[key]);
        button.type = "button";
        button.dataset.delta = delta;
        button.setAttribute("aria-label", t("changeCount", { action: copy[key], isotope: isotope.name }));
        button.hidden = isFixed();
        button.addEventListener("click", () => updateCount(i, state.counts[i] + delta));
        controls.append(button);
      });
      const percentage = node("span", "im-isotope-percent");
      percentage.id = `im-percent-${i}`;
      controls.append(percentage);
      row.append(head, controls);
      $("isotopes").append(row);
    });
  }

  function updateCount(index, value) {
    state.counts[index] = clampCount(value);
    if (state.tab === "sandbox") state.sandbox.counts = [...state.counts];
    clearFeedback();
    render();
  }

  function clearFeedback() {
    state.feedback = "";
    state.feedbackKind = "";
    if (!isFixed()) state.solved = false;
  }

  function addNumberInput(id, labelText, parent, onInput, options = {}) {
    const label = node("label", "", labelText);
    label.htmlFor = `im-${id}`;
    const input = node("input");
    input.id = `im-${id}`;
    input.type = "number";
    input.step = "any";
    input.inputMode = "decimal";
    Object.entries(options).forEach(([key, value]) => input.setAttribute(key, value));
    input.addEventListener("input", () => {
      onInput(input.value);
      input.removeAttribute("aria-invalid");
      input.removeAttribute("data-valid");
      clearFeedback();
      if (getChallenge()?.type === "calc") {
        state.solved = false;
        state.revealed = false;
      }
      render();
    });
    parent.append(label, input);
    return input;
  }

  function buildAnswerArea() {
    const challenge = getChallenge();
    const area = $("answer-area");
    area.replaceChildren();
    if (!challenge) return;
    if (challenge.type === "choice") {
      const choices = node("div", "im-options");
      challenge.options.forEach((option, index) => {
        const button = node("button", "btn btn-ghost im-option", option);
        button.type = "button";
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", () => {
          state.choice = index;
          const correct = checkChoice(index, challenge.answer);
          state.feedback = t(correct ? "choiceRight" : "choiceWrong", { explanation: challenge.explanation });
          state.feedbackKind = correct ? "good" : "bad";
          state.revealed = true;
          if (correct) markComplete();
          render();
        });
        choices.append(button);
      });
      area.append(choices);
    }
    if (challenge.type === "calc") {
      const table = node("table", "im-calc-table");
      const caption = node("caption", "sr-only", challenge.prompt);
      const head = node("thead");
      const row = node("tr");
      ["isotope", "mass", "abundance", "contribution"].forEach(key => {
        const th = node("th", "", copy[key]); th.scope = "col"; row.append(th);
      });
      head.append(row);
      const body = node("tbody");
      state.isotopes.forEach((isotope, index) => {
        const tr = node("tr");
        const th = node("th", "", isotope.name); th.scope = "row";
        tr.append(th, node("td", "", massText(isotope.mass)), node("td", "", t("percentOnly", { value: isotope.abundance })));
        const td = node("td");
        const input = addNumberInput(`contribution-${index}`, t("contributionLabel", { name: isotope.name }), td, value => {
          state.calcValues[index] = value;
          if (state.validation) state.validation.fields[index] = null;
        });
        td.querySelector("label").className = "sr-only";
        input.setAttribute("aria-describedby", `im-hint-${index}`);
        const hint = node("p", "im-field-hint"); hint.id = `im-hint-${index}`;
        td.append(hint); tr.append(td); body.append(tr);
      });
      table.append(caption, head, body);
      const total = node("div", "im-total-row");
      addNumberInput("total", copy.totalLabel, total, value => {
        state.totalValue = value;
        if (state.validation) state.validation.total = null;
      }, { "aria-describedby": "im-total-hint" });
      const totalHint = node("p", "im-field-hint"); totalHint.id = "im-total-hint";
      area.append(table, total, totalHint);
    }
    if (challenge.type === "reverse") {
      const row = node("div", "im-reverse-row");
      addNumberInput("reverse", t("reverseLabel", { name: state.isotopes[0].name }), row,
        value => { state.reverseValue = value; }, { min: "0", max: "100", "aria-describedby": "im-reverse-hint" });
      const hint = node("p", "im-muted im-note", copy.reverseHint); hint.id = "im-reverse-hint";
      area.append(row, hint);
    }
  }

  function markComplete() {
    state.solved = true;
    state.revealed = true;
    state.completed.add(getChallenge().id);
    save();
  }

  function checkAnswer() {
    const challenge = getChallenge();
    if (!challenge || state.solved) return;
    const avg = weightedAverage(state.isotopes, state.counts);
    state.feedbackKind = "bad";
    if (challenge.type === "predict") {
      if (state.revealed) return;
      state.tries += 1;
      state.checked = true;
      state.animate = true;
      const correct = checkPrediction(state.isotopes, state.counts, state.guess, challenge.tolerance);
      state.angle = correct ? 0 : tiltAngle(avg, state.guess);
      if (correct) {
        markComplete(); state.feedbackKind = "good";
        state.feedback = t("predictSuccess", { value: avg.toFixed(3) });
      } else if (state.tries >= 2) {
        state.revealed = true;
        state.feedback = t("predictReveal", { value: avg.toFixed(3) });
      } else {
        state.feedback = t("predictAgain", { side: avg > state.guess ? copy.right : copy.left });
      }
    }
    if (challenge.type === "build") {
      const result = checkBuild(state.isotopes, state.counts, challenge);
      state.feedback = result === "success" ? t("buildSuccess", { value: avg.toFixed(3) }) : t(result, {
        value: avg?.toFixed(3), target: challenge.target, tolerance: challenge.tolerance,
        count: challenge.maxAtoms || challenge.exactAtoms, total: sum(state.counts)
      });
      if (result === "success") { markComplete(); state.feedbackKind = "good"; }
    }
    if (challenge.type === "calc") {
      const result = checkCalculation(state.isotopes, state.calcValues.map(numberFrom), numberFrom(state.totalValue), challenge.tolerance);
      state.validation = result;
      if (result.total && result.fields.every(Boolean)) {
        markComplete(); state.feedbackKind = "good";
        const exact = weightedAverage(state.isotopes, state.isotopes.map(isotope => isotope.abundance));
        state.feedback = t("calcSuccess", { value: exact.toFixed(3) });
      } else state.feedback = copy.calcWrong;
    }
    if (challenge.type === "reverse") {
      const correct = checkReverse(numberFrom(state.reverseValue), challenge.answer, challenge.tolerance);
      $("reverse").setAttribute("aria-invalid", String(!correct));
      state.feedback = correct ? t("reverseSuccess", { value: challenge.answer, name: state.isotopes[0].name }) : copy.reverseWrong;
      if (correct) { markComplete(); state.feedbackKind = "good"; }
    }
    render();
  }

  function renderMath() {
    const area = $("math");
    area.replaceChildren();
    const challenge = getChallenge();
    if (isHidden()) area.append(node("p", "im-muted", challenge.type === "calc" ? copy.calcHidden : copy.mathHidden));
    else if (!sum(state.counts)) area.append(node("p", "im-muted", copy.emptyBag));
    else {
      // Calculations use exact abundances; the picture always uses whole atoms.
      const counts = challenge?.type === "calc" ? state.isotopes.map(isotope => isotope.abundance) : state.counts;
      const total = sum(counts);
      const terms = state.isotopes.map((isotope, i) => ({ mass: massText(isotope.mass), count: counts[i], fraction: counts[i] / total, contribution: isotope.mass * counts[i] / total }));
      area.append(node("p", "im-math-line im-formula", copy.formula));
      [
        terms.map(term => `(${term.mass} × ${term.count}/${total})`),
        terms.map(term => `(${term.mass} × ${term.fraction.toFixed(3)})`),
        terms.map(term => term.contribution.toFixed(3))
      ].forEach(parts => {
        const line = node("p", "im-math-line");
        line.append(document.createTextNode("= "));
        parts.forEach((part, i) => {
          if (i) line.append(document.createTextNode(" + "));
          line.append(node("span", "im-term", part));
        });
        area.append(line);
      });
      area.append(node("p", "im-math-line im-math-result", t("averageLabel", { value: weightedAverage(state.isotopes, counts).toFixed(3) })));
      area.append(node("p", "im-note", copy.mathRounding));
    }
    $("periodic").hidden = !state.element.periodic || isHidden();
    $("periodic").textContent = state.element.periodic ? t("periodic", { value: state.element.periodic }) : "";
  }

  function renderPicture() {
    animations.forEach(animation => animation.cancel());
    animations = [];
    const svg = $("picture");
    svg.replaceChildren();
    const width = Math.max(280, Math.round(svg.getBoundingClientRect().width));
    const height = 470;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svgNode("title", { id: "im-svg-title" }, copy.svgTitle);
    const low = Math.min(...state.isotopes.map(isotope => isotope.mass)) - 1;
    const high = Math.max(...state.isotopes.map(isotope => isotope.mass)) + 1;
    const x = mass => 35 + (mass - low) / (high - low) * (width - 70);
    const beamY = 182;
    geometry = { low, high, width };
    const challenge = getChallenge();
    const prediction = challenge?.type === "predict";
    const hidden = isHidden();
    const total = sum(state.counts);
    const avg = weightedAverage(state.isotopes, state.counts);
    // Keep the pivot at the student's guess during a wrong tilt.
    const pivot = prediction && !state.solved ? state.guess : avg;
    const pivotX = pivot === null ? width / 2 : x(pivot);
    const beam = svgNode("g", { class: "im-beam" });
    beam.style.transformOrigin = `${pivotX}px ${beamY}px`;
    beam.style.transform = `rotate(${state.angle}deg)`;
    svgNode("line", { x1: x(low), y1: beamY, x2: x(high), y2: beamY, class: "im-beam-line" }, undefined, beam);
    for (let tick = Math.ceil(low); tick <= Math.floor(high); tick++) {
      svgNode("line", { x1: x(tick), y1: beamY, x2: x(tick), y2: beamY + 7, class: "im-tick" }, undefined, beam);
      // Numbers sit on a fixed ruler (not on the beam) so they stay readable when the beam tilts.
      svgNode("text", { x: x(tick), y: beamY + 52, "text-anchor": "middle", class: "im-svg-muted" }, tick);
    }
    const distances = state.isotopes.slice(1).map((isotope, i) => x(isotope.mass) - x(state.isotopes[i].mass));
    // Atoms are drawn as big as possible: try large circles first, shrink only when a stack
    // would not fit between its neighbours (columns) or below the labels (rows).
    const minGap = Math.min(...distances);
    const maxCount = Math.max(...state.counts);
    let radius, step, cols, capacity;
    for (radius of [8, 6, 4.5, 3]) {
      step = radius * 2 + 2;
      cols = Math.max(1, Math.min(5, Math.floor((minGap - 6) / step)));
      capacity = cols * Math.max(1, Math.floor(118 / step));
      if (maxCount <= capacity) break;
    }
    const atomsPerCircle = Math.max(1, Math.ceil(maxCount / capacity));
    state.isotopes.forEach((isotope, i) => {
      const stack = svgNode("g", { class: `im-color-${i}` }, undefined, beam);
      const circleCount = Math.ceil(state.counts[i] / atomsPerCircle);
      const columns = Math.min(cols, circleCount);
      const rows = Math.ceil(circleCount / cols);
      for (let dot = 0; dot < circleCount; dot++) {
        const cx = x(isotope.mass) + ((dot % cols) - (columns - 1) / 2) * step;
        const cy = beamY - radius - 3 - Math.floor(dot / cols) * step;
        const remainder = Math.min(atomsPerCircle, state.counts[i] - dot * atomsPerCircle);
        if (remainder < atomsPerCircle) {
          const clip = svgNode("clipPath", { id: `im-partial-${i}` }, undefined, stack);
          const fillHeight = radius * 2 * remainder / atomsPerCircle;
          svgNode("rect", { x: cx - radius, y: cy + radius - fillHeight, width: radius * 2, height: fillHeight }, undefined, clip);
          svgNode("circle", { cx, cy, r: radius, class: "im-atom-outline" }, undefined, stack);
          svgNode("circle", { cx, cy, r: radius, class: "im-atom", "clip-path": `url(#im-partial-${i})` }, undefined, stack);
        } else svgNode("circle", { cx, cy, r: radius, class: "im-atom" }, undefined, stack);
      }
      // Two short lines remain readable when isotope masses are close together.
      const labelY = beamY - Math.max(1, rows) * step - 20;
      svgNode("text", { x: x(isotope.mass), y: labelY, "text-anchor": "middle", class: "im-svg-text" }, isotope.name, stack);
      svgNode("text", { x: x(isotope.mass), y: labelY + 14, "text-anchor": "middle", class: "im-svg-text" }, state.counts[i], stack);
    });
    if (atomsPerCircle > 1) svgNode("text", { x: 12, y: 17, class: "im-svg-muted" }, t("circleKey", { count: atomsPerCircle }));
    if (state.counts.some(count => count % atomsPerCircle)) svgNode("text", { x: 12, y: 34, class: "im-svg-muted" }, copy.partialKey);

    const posts = svgNode("g", { class: `im-posts${state.checked ? " im-dropped" : ""}` });
    if (prediction) [low + 0.2, high - 0.2].forEach(mass => {
      svgNode("line", { x1: x(mass), x2: x(mass), y1: beamY + 4, y2: beamY + 43, class: "im-post" }, undefined, posts);
    });
    // In a calculation, even the triangle would give away the hidden answer.
    if (total && (!hidden || prediction)) {
      svgNode("path", { d: `M ${pivotX} ${beamY + 3} l -15 31 h 30 Z`, class: `im-fulcrum${prediction && !state.solved ? " im-guess-triangle" : ""}` });
      const label = hidden ? t("guessMarker", { value: state.guess.toFixed(2) }) : t("averageLabel", { value: avg.toFixed(3) });
      svgNode("text", { x: width / 2, y: beamY + 80, "text-anchor": "middle", class: hidden ? "im-svg-guess" : "im-svg-average" }, label);
      if (prediction && state.revealed && !state.solved) {
        // Show where the true pivot belongs without moving the tilted beam.
        svgNode("line", { x1: x(avg), x2: x(avg), y1: beamY + 32, y2: beamY + 64, class: "im-ghost" });
      }
    } else if (!total) {
      svgNode("text", { x: width / 2, y: beamY + 80, "text-anchor": "middle", class: "im-svg-muted" }, copy.emptyBag);
    }
    if (state.compare && !hidden && total) {
      const plainX = x(plainAverage(state.isotopes));
      svgNode("line", { x1: plainX, x2: plainX, y1: beamY - 10, y2: beamY + 64, class: "im-ghost" });
      svgNode("text", { x: width / 2, y: beamY + 100, "text-anchor": "middle", class: "im-svg-muted" }, copy.plainLabel);
    }

    const spectrumBase = 410;
    svgNode("line", { x1: x(low), x2: x(high), y1: spectrumBase, y2: spectrumBase, class: "im-axis" });
    state.isotopes.forEach((isotope, i) => {
      const percent = total ? state.counts[i] / total * 100 : 0;
      const barHeight = percent * 0.85;
      svgNode("rect", { x: x(isotope.mass) - 10, y: spectrumBase - barHeight, width: 20, height: barHeight, rx: 3, class: `im-bar im-color-${i}` });
      svgNode("text", { x: x(isotope.mass), y: spectrumBase - barHeight - 7, "text-anchor": "middle", class: "im-svg-text" }, t("percentOnly", { value: percent.toFixed(1) }));
    });
    for (let tick = Math.ceil(low); tick <= Math.floor(high); tick++) {
      svgNode("line", { x1: x(tick), x2: x(tick), y1: spectrumBase, y2: spectrumBase + 5, class: "im-tick" });
      svgNode("text", { x: x(tick), y: spectrumBase + 18, "text-anchor": "middle", class: "im-svg-muted" }, tick);
    }
    svgNode("text", { x: width / 2, y: 447, "text-anchor": "middle", class: "im-svg-muted" }, copy.scale);
    svgNode("text", { x: width / 2, y: 465, "text-anchor": "middle", class: "im-svg-text" }, copy.spectrum);

    const summary = total ? state.isotopes.map((isotope, i) => t("summaryPart", {
      name: isotope.name, count: state.counts[i], percent: (state.counts[i] / total * 100).toFixed(1)
    })) : [copy.emptyBag];
    if (total) summary.push(hidden ? copy.summaryHidden : t("summaryAverage", { value: avg.toFixed(3) }));
    if (prediction) summary.push(t("summaryGuess", { value: state.guess.toFixed(2) }));
    if (state.checked) summary.push(state.angle ? t("summaryTilt", { side: state.angle > 0 ? copy.right : copy.left }) : copy.summaryLevel);
    if (state.compare && !hidden && total) summary.push(t("plainValue", { value: plainAverage(state.isotopes).toFixed(3) }));
    $("summary").textContent = summary.join(" ");
    svg.classList.toggle("im-draggable", canGuess());
    if (state.animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && beam.animate) {
      animations.push(beam.animate([{ transform: "rotate(0deg)" }, { transform: `rotate(${state.angle}deg)` }], { duration: 600, easing: "ease-in-out" }));
      animations.push(posts.animate([{ opacity: 1, transform: "translateY(0px)" }, { opacity: 0, transform: "translateY(30px)" }], { duration: 600, easing: "ease-in" }));
    }
    state.animate = false;
  }

  // Every state change comes here. Inputs stay mounted so keyboard focus is kept.
  function render() {
    const challenge = getChallenge();
    const total = sum(state.counts);
    ["sandbox", "challenges"].forEach(tab => {
      $(`${tab}-tab`).setAttribute("aria-selected", String(state.tab === tab));
      $(`${tab}-tab`).tabIndex = state.tab === tab ? 0 : -1;
    });
    $("workspace").setAttribute("aria-labelledby", `im-${state.tab}-tab`);
    $("challenge").hidden = !challenge;
    $("complete").hidden = !challenge || state.completed.size !== data.challenges.length;
    $("progress").textContent = t("progress", { done: state.completed.size, total: data.challenges.length });
    [...$("challenge-picker").options].forEach((option, i) => {
      const item = data.challenges[i];
      option.textContent = t("challengeOption", { mark: state.completed.has(item.id) ? copy.doneMark : "", number: i + 1, name: item.name });
    });
    $("challenge-picker").value = state.challengeIndex;
    if (challenge) {
      $("challenge-type").textContent = copy.types[challenge.type];
      $("prompt").textContent = challenge.prompt;
      $("instructions").textContent = copy.instructions[challenge.type];
      $("check").hidden = challenge.type === "choice";
      $("check").disabled = state.solved || (challenge.type === "predict" && state.revealed);
      $("retry").hidden = !state.revealed;
      $("next").disabled = state.challengeIndex === data.challenges.length - 1;
      if (challenge.type === "choice") {
        $("answer-area").querySelectorAll("button").forEach((button, i) => {
          button.setAttribute("aria-pressed", String(state.choice === i));
          button.classList.toggle("im-correct", state.solved && i === challenge.answer);
          button.disabled = state.solved;
        });
      }
      if (challenge.type === "calc") {
        state.isotopes.forEach((isotope, i) => {
          const valid = state.validation?.fields[i];
          $(`contribution-${i}`).setAttribute("aria-invalid", String(valid === false));
          $(`contribution-${i}`).dataset.valid = String(valid === true);
          $(`hint-${i}`).textContent = valid === false ? t("decimalHint", { percent: isotope.abundance, decimal: +(isotope.abundance / 100).toFixed(4) }) : "";
        });
        $("total").setAttribute("aria-invalid", String(state.validation?.total === false));
        $("total").dataset.valid = String(state.validation?.total === true);
        $("total-hint").textContent = state.validation?.total === false ? copy.totalHint : "";
      }
    }
    $("feedback").textContent = state.feedback;
    $("feedback").dataset.kind = state.feedbackKind;
    $("bag").textContent = t("bag", { count: total });
    $("readonly").hidden = !isFixed();
    $("mix-actions").hidden = isFixed();
    $("natural").hidden = Boolean(state.element.fictional);
    $("sample-note").textContent = state.element.fictional ? copy.madeUp : copy.naturalNote;
    $("visual-note").textContent = challenge?.type === "calc" ? copy.visualCalc : canGuess() ? copy.visualPredict : copy.visualIntro;
    $("compare-label").hidden = isHidden();
    $("compare").checked = state.compare;
    state.isotopes.forEach((isotope, i) => {
      const input = $(`count-${i}`);
      // Let an empty focused field stay empty while the student replaces its value.
      if (document.activeElement !== input || input.value !== "") input.value = state.counts[i];
      $(`percent-${i}`).textContent = t("percentOnly", { value: (total ? state.counts[i] / total * 100 : 0).toFixed(1) });
      input.closest(".im-isotope").querySelectorAll("button").forEach(button => {
        button.disabled = Number(button.dataset.delta) < 0 ? state.counts[i] === 0 : state.counts[i] === 100;
      });
    });
    $("guess-controls").hidden = challenge?.type !== "predict";
    $("guess").disabled = !canGuess();
    $("guess").min = (Math.min(...state.isotopes.map(isotope => isotope.mass)) - 1).toFixed(2);
    $("guess").max = (Math.max(...state.isotopes.map(isotope => isotope.mass)) + 1).toFixed(2);
    $("guess").value = state.guess;
    $("guess-value").value = t("guessValue", { value: state.guess.toFixed(2) });
    $("guess").setAttribute("aria-valuetext", t("guessValue", { value: state.guess.toFixed(2) }));
    renderMath();
    renderPicture();
  }

  function updateGuess(value) {
    if (!canGuess()) return;
    state.guess = Number(Math.max(Number($("guess").min), Math.min(Number($("guess").max), value)).toFixed(2));
    state.checked = false;
    state.angle = 0;
    clearFeedback();
    render();
  }

  function pointerGuess(event) {
    const rectangle = $("picture").getBoundingClientRect();
    const svgX = (event.clientX - rectangle.left) * geometry.width / rectangle.width;
    updateGuess(geometry.low + (svgX - 35) / (geometry.width - 70) * (geometry.high - geometry.low));
  }

  document.querySelectorAll("[data-copy]").forEach(element => { element.textContent = copy[element.dataset.copy]; });
  $("tabs").setAttribute("aria-label", copy.tabs);
  data.elements.forEach(element => {
    const option = node("option", "", t("elementOption", { name: element.name, symbol: element.id }));
    option.value = element.id; $("element").append(option);
  });
  data.challenges.forEach((challenge, index) => {
    const option = node("option"); option.value = index; $("challenge-picker").append(option);
  });
  $("tabs").addEventListener("click", event => {
    const tab = event.target.closest("[data-tab]");
    if (tab) setTab(tab.dataset.tab);
  });
  $("tabs").addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tab = event.key === "Home" ? "sandbox" : event.key === "End" ? "challenges" : state.tab === "sandbox" ? "challenges" : "sandbox";
    setTab(tab); $(`${tab}-tab`).focus();
  });
  $("element").addEventListener("change", () => {
    state.sandbox.element = $("element").value;
    state.sandbox.counts = data.elements.find(element => element.id === state.sandbox.element).isotopes.map(() => 0);
    loadSample();
  });
  $("challenge-picker").addEventListener("change", () => { state.challengeIndex = Number($("challenge-picker").value); loadSample(); });
  $("next").addEventListener("click", () => {
    if (state.challengeIndex < data.challenges.length - 1) { state.challengeIndex += 1; loadSample(); }
  });
  $("retry").addEventListener("click", loadSample);
  $("start-over").addEventListener("click", () => { state.completed.clear(); state.challengeIndex = 0; save(); loadSample(); $("challenge-picker").focus(); });
  $("check").addEventListener("click", checkAnswer);
  $("answer-area").addEventListener("keydown", event => {
    if (event.key === "Enter" && event.target.matches("input")) { event.preventDefault(); checkAnswer(); }
  });
  $("natural").addEventListener("click", () => {
    state.counts = naturalCounts(state.isotopes);
    if (state.tab === "sandbox") state.sandbox.counts = [...state.counts];
    clearFeedback(); render();
  });
  $("empty").addEventListener("click", () => {
    state.counts.fill(0);
    if (state.tab === "sandbox") state.sandbox.counts = [...state.counts];
    clearFeedback(); render();
  });
  $("compare").addEventListener("change", () => { state.compare = $("compare").checked; render(); });
  $("guess").addEventListener("input", () => updateGuess(Number($("guess").value)));
  $("picture").addEventListener("pointerdown", event => {
    if (!canGuess() || !event.isPrimary || event.button !== 0) return;
    const rectangle = $("picture").getBoundingClientRect();
    const y = (event.clientY - rectangle.top) * 440 / rectangle.height;
    if (y < 115 || y > 215) return;
    event.preventDefault();
    dragPointer = event.pointerId;
    $("picture").setPointerCapture(dragPointer);
    pointerGuess(event);
  });
  $("picture").addEventListener("pointermove", event => { if (event.pointerId === dragPointer) pointerGuess(event); });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => $("picture").addEventListener(type, () => { dragPointer = null; }));
  window.addEventListener("pagehide", () => { animations.forEach(animation => animation.cancel()); });
  loadSample();
  // Redraw the shared scale at the actual panel width, keeping labels readable.
  let lastWidth = $("picture").getBoundingClientRect().width;
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (Math.abs(width - lastWidth) > 1) { lastWidth = width; render(); }
  }).observe($("picture"));
})();
