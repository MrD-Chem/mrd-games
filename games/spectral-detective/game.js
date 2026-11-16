"use strict";

// Pure science/checking functions. RGB channels are integers from 0 to 255.
// Standard piecewise visible-light approximation with edge attenuation and gamma.
function wavelengthToRGB(nm) {
  if (!Number.isFinite(nm) || nm < 380 || nm > 750) return [0, 0, 0];
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
  else r = 1;
  const factor = nm < 420 ? .3 + .7 * (nm - 380) / 40 : nm > 700 ? .3 + .7 * (780 - nm) / 80 : 1;
  return [r, g, b].map(channel => Math.round(255 * Math.pow(channel * factor, .8)));
}

function xForWavelength(nm, width) {
  return (nm - 380) / (750 - 380) * width;
}

// Takes element objects, returns sorted unique lines, and never changes the data.
// Only exactly equal wavelengths merge: nearby lines (such as Na) remain separate.
function mixLines(elements) {
  const merged = new Map();
  elements.forEach(element => element.lines.forEach(line => {
    const previous = merged.get(line.nm);
    merged.set(line.nm, {
      nm: line.nm,
      strong: Boolean(line.strong || (previous && previous.strong)),
      weak: previous ? Boolean(line.weak && previous.weak) : Boolean(line.weak)
    });
  }));
  return Array.from(merged.values()).sort((a, b) => a.nm - b.nm);
}

function checkSingle(selected, answer) {
  return selected !== null && selected !== undefined && selected === answer;
}

function checkSet(selected, answer) {
  const actual = new Set(selected), expected = new Set(answer);
  const missing = Array.from(expected).filter(id => !actual.has(id));
  const extra = Array.from(actual).filter(id => !expected.has(id));
  return { correct: missing.length === 0 && extra.length === 0, missing, extra };
}

function nearestLine(lines, nm) {
  if (!Number.isFinite(nm) || !lines.length) return null;
  return lines.reduce((best, line) => {
    const distance = Math.abs(line.nm - nm), bestDistance = Math.abs(best.nm - nm);
    return distance < bestDistance || (distance === bestDistance && line.nm < best.nm) ? line : best;
  });
}

function starsForAttempt(tries, correct) {
  return correct ? (tries === 1 ? 3 : 2) : 1;
}

function checkMeasurement(value, bounds) {
  return Number.isFinite(value) && value >= bounds[0] && value <= bounds[1];
}

if (typeof document !== "undefined") (() => {
  const data = window.SPECTRAL_DETECTIVE_DATA;
  const copy = data.text;
  const key = "mrd-spectral-detective";
  const $ = id => document.getElementById(`sd-${id}`);
  const t = (name, values = {}) => copy[name].replace(/\{(\w+)\}/g, (_, field) => String(values[field] === undefined ? "" : values[field]));
  const elementFor = id => data.elements.find(element => element.id === id);
  const elementLabel = id => t("elementLabel", { name: elementFor(id).name, symbol: id });
  const linesFor = ids => mixLines(ids.map(elementFor));
  const freshRecord = () => ({ tries: 0, stars: 0, solved: false });

  function readRecords() {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (!saved || saved.version !== 1 || !Array.isArray(saved.records)) return data.cases.map(freshRecord);
      return data.cases.map((_, index) => {
        const record = saved.records[index];
        if (!record || !Number.isInteger(record.stars) || record.stars < 0 || record.stars > 3) return freshRecord();
        // Normalize incomplete or malformed records instead of trusting storage.
        const stars = record.stars;
        return { stars, tries: stars ? (stars === 3 ? 1 : 2) : (record.tries === 1 ? 1 : 0), solved: stars >= 2 };
      });
    } catch (_) { return data.cases.map(freshRecord); }
  }

  const state = {
    screen: "start", index: 0, records: readRecords(), selection: [], measurement: "",
    meter: 550, pins: [], feedback: "", kind: "", openDetails: new Set()
  };
  let svgSequence = 0;
  const currentCase = () => data.cases[state.index];
  const currentRecord = () => state.records[state.index];
  const starsText = stars => "★".repeat(stars) + "☆".repeat(3 - stars);
  function totals() {
    return state.records.reduce((sum, record) => ({ stars: sum.stars + record.stars, solved: sum.solved + Number(record.solved), done: sum.done + Number(record.stars > 0) }), { stars: 0, solved: 0, done: 0 });
  }
  function save() {
    try { localStorage.setItem(key, JSON.stringify({ version: 1, records: state.records, card: t("card", totals()) })); }
    catch (_) { /* School settings may block storage. The in-memory game still works. */ }
  }
  function node(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }
  function svgNode(tag, attributes, parent, text) {
    const result = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([name, value]) => result.setAttribute(name, String(value)));
    if (text !== undefined) result.textContent = text;
    parent.append(result);
    return result;
  }
  function button(text, handler, className = "btn btn-ghost btn-sm") {
    const result = node("button", className, text);
    result.type = "button";
    result.addEventListener("click", handler);
    return result;
  }
  function focus(id) { $(id).focus(); }
  function statusText(record) {
    return record.stars ? t(record.solved ? "statusSolved" : "statusExplained", { stars: starsText(record.stars) }) : "";
  }
  function resultFeedback() {
    const record = currentRecord();
    return t(record.solved ? "correct" : "revealed", { stars: starsText(record.stars), explanation: currentCase().explanation });
  }

  function openCase(index) {
    state.screen = "play";
    state.index = index;
    state.selection = [];
    state.measurement = "";
    state.pins = [];
    state.openDetails.clear();
    state.feedback = currentRecord().stars ? resultFeedback() : currentRecord().tries ? copy.oneLeft : "";
    state.kind = currentRecord().solved ? "good" : "";
    render();
    focus("prompt");
  }
  function openScreen(screen) {
    state.screen = screen;
    state.feedback = "";
    render();
    focus(screen === "start" ? "start-title" : "end-title");
  }

  function renderFiles() {
    $("files").replaceChildren();
    $("picker").replaceChildren();
    data.cases.forEach((caseData, index) => {
      const record = state.records[index];
      const file = button("", () => openCase(index), "sd-file");
      file.append(node("span", "sd-file-number", `${t("caseNumber", { number: caseData.id })} · ${caseData.category}`), node("span", "sd-file-title", caseData.title));
      file.append(node("span", "sd-file-status", record.stars ? `${record.solved ? copy.solvedMark : copy.revealedMark} ${starsText(record.stars)}` : "☆☆☆"));
      $("files").append(file);
      const option = node("option", "", t("caseOption", { number: caseData.id, title: caseData.title, status: statusText(record) }));
      option.value = index;
      $("picker").append(option);
    });
    $("picker").value = state.index;
  }

  function lineText(line, matched) {
    let text = line.nm.toFixed(1);
    if (line.strong) text = t("strongLine", { nm: text });
    else if (line.weak) text = t("weakLine", { nm: text });
    return matched ? t("matchedLine", { line: text }) : text;
  }

  function togglePin(id, focusId) {
    const wasPinned = state.pins.includes(id);
    if (wasPinned) state.pins = state.pins.filter(pin => pin !== id);
    else {
      if (state.pins.length === 2) state.pins.shift();
      state.pins.push(id);
    }
    renderSpectra();
    // A pinned row can disappear; return focus to its reference on the shelf.
    const target = document.getElementById(focusId) || $(`pin-${id}`);
    if (target) target.focus({ preventScroll: true });
    $("feedback").textContent = t(wasPinned ? "unpinStatus" : "pinStatus", { element: elementFor(id).name }) + (state.feedback ? ` ${state.feedback}` : "");
  }

  function spectrumRow(label, lines, mode, rowId, referenceId) {
    const row = node("div", "sd-spectrum-row");
    // The unknown spectrum stays at the top of the screen while the student scrolls the references.
    if (rowId === "evidence") row.classList.add("sd-row-sticky");
    const isPinned = referenceId && state.pins.includes(referenceId);
    if (referenceId) {
      const pinId = `sd-${rowId}`;
      const heading = button("", () => togglePin(referenceId, pinId), "sd-spectrum-label");
      heading.id = pinId;
      heading.setAttribute("aria-pressed", String(Boolean(isPinned)));
      heading.setAttribute("aria-label", t(isPinned ? "unpin" : "pin", { element: elementLabel(referenceId) }));
      heading.append(node("span", "", label), node("span", "sd-pin-tag", isPinned ? copy.unpinShort : copy.pinShort));
      row.append(heading);
    } else row.append(node("div", "sd-spectrum-label", label));

    const finished = currentRecord().stars > 0;
    const evidenceLines = linesFor(currentCase().elements);
    const matches = line => finished && evidenceLines.some(evidence => evidence.nm === line.nm);
    const summaryLines = lines.map(line => lineText(line, matches(line))).join(", ");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1000 48");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("class", "sd-spectrum");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", t("spectrumSummary", { label, mode: copy[mode], lines: summaryLines }));
    if (mode === "absorption") {
      const gradientId = `sd-rainbow-${++svgSequence}`;
      const defs = svgNode("defs", {}, svg);
      const gradient = svgNode("linearGradient", { id: gradientId, x1: "0%", x2: "100%" }, defs);
      for (let nm = 380; nm <= 750; nm += 5) {
        svgNode("stop", { offset: `${xForWavelength(nm, 100)}%`, "stop-color": `rgb(${wavelengthToRGB(nm).join(",")})` }, gradient);
      }
      svgNode("rect", { x: 0, y: 0, width: 1000, height: 48, fill: `url(#${gradientId})` }, svg);
    }
    lines.forEach(line => {
      const x = xForWavelength(line.nm, 1000);
      const rgb = `rgb(${wavelengthToRGB(line.nm).join(",")})`;
      // Minimum screen-pixel widths keep lines visible without moving their centres.
      // Na's 0.6 nm doublet can blend at this scale; both exact values remain listed.
      svgNode("line", { x1: x, x2: x, y1: 3, y2: 45, stroke: mode === "absorption" ? "#000" : rgb,
        "stroke-width": line.strong ? 3.5 : line.weak ? 1.1 : 1.7, "vector-effect": "non-scaling-stroke",
        opacity: mode === "absorption" || line.strong ? 1 : line.weak ? .65 : .85 }, svg);
      if (matches(line)) {
        [3, 45].forEach(y => svgNode("line", { x1: x - 3, x2: x + 3, y1: y, y2: y, stroke: "#fff", "stroke-width": 2, "vector-effect": "non-scaling-stroke" }, svg));
      }
    });
    attachPointer(svg);
    row.append(svg);
    const scale = node("div", "sd-scale");
    scale.setAttribute("aria-hidden", "true");
    for (let nm = 400; nm <= 750; nm += 50) {
      const tick = node("span", "sd-tick", String(nm));
      tick.style.left = `${xForWavelength(nm, 100)}%`;
      scale.append(tick);
    }
    row.append(scale);
    const details = node("details", "sd-line-details");
    details.open = state.openDetails.has(rowId);
    details.append(node("summary", "", copy.linePositions), node("p", "", t("lineList", { lines: summaryLines })));
    if (referenceId === "Na") details.append(node("p", "", copy.sodiumPair));
    details.addEventListener("toggle", () => {
      if (details.open) state.openDetails.add(rowId);
      else state.openDetails.delete(rowId);
    });
    row.append(details);
    return row;
  }

  function renderSpectra() {
    const caseData = currentCase();
    const container = $("spectra");
    container.replaceChildren();
    const meter = node("div", "sd-meter");
    meter.id = "sd-meter";
    meter.setAttribute("aria-hidden", "true");
    container.append(meter);
    const lines = linesFor(caseData.elements);
    if (caseData.mode === "paired") {
      container.append(spectrumRow(copy.pairedEmission, lines, "emission", "evidence-emission"));
      container.append(spectrumRow(copy.pairedAbsorption, lines, "absorption", "evidence-absorption"));
    } else container.append(spectrumRow(caseData.mode === "absorption" ? copy.evidenceAbsorption : copy.evidenceEmission, lines, caseData.mode, "evidence"));
    if (state.pins.length) {
      container.append(node("h3", "sd-pin-heading", copy.pinned));
      state.pins.forEach(id => container.append(spectrumRow(t("pinnedLabel", { element: elementLabel(id) }), linesFor([id]), "emission", `pinned-${id}`, id)));
    }
    container.append(node("h3", "sd-shelf-heading", copy.shelf), node("p", "sd-muted sd-note", copy.pinHelp));
    caseData.refs.forEach(id => container.append(spectrumRow(elementLabel(id), linesFor([id]), "emission", `pin-${id}`, id)));
    $("match-key").hidden = !currentRecord().stars;
    updateMeter(state.meter);
  }

  function updateMeter(nm) {
    state.meter = Math.max(380, Math.min(750, Math.round(nm)));
    $("ruler").value = state.meter;
    $("ruler").setAttribute("aria-valuetext", t("reading", { nm: state.meter }));
    $("reading").textContent = t("reading", { nm: state.meter });
    if ($("meter")) $("meter").style.left = `${xForWavelength(state.meter, 100)}%`;
  }
  function attachPointer(svg) {
    let activePointer = null;
    const move = event => {
      const bounds = svg.getBoundingClientRect();
      if (bounds.width) updateMeter(380 + (event.clientX - bounds.left) / bounds.width * 370);
    };
    svg.addEventListener("pointerdown", event => {
      if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
      activePointer = event.pointerId;
      svg.setPointerCapture(event.pointerId);
      move(event);
    });
    svg.addEventListener("pointermove", event => { if (event.pointerId === activePointer) move(event); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => svg.addEventListener(type, () => { activePointer = null; }));
  }

  function renderAnswers() {
    const caseData = currentCase(), finished = currentRecord().stars > 0;
    const area = $("answer-area");
    area.replaceChildren();
    $("answer-title").textContent = copy[{ single: "answerSingle", set: "answerSet", notice: "answerNotice", measure: "answerMeasure" }[caseData.type]];
    if (caseData.type === "measure") {
      const label = node("label", "sd-number-label", copy.measurement);
      label.htmlFor = "sd-wavelength";
      const input = node("input", "sd-number");
      input.id = "sd-wavelength";
      input.type = "number";
      input.min = 380;
      input.max = 750;
      input.step = "any";
      input.inputMode = "decimal";
      input.value = finished ? caseData.wavelength : state.measurement;
      input.addEventListener("input", () => { state.measurement = input.value; });
      area.append(label, input, node("p", "sd-pick-label", copy.chooseElement));
    }
    const choices = node("div", `sd-choices${caseData.type === "notice" ? " sd-options-notice" : ""}`);
    const options = caseData.options || caseData.refs.map(id => ({ id, text: elementLabel(id) }));
    const selected = finished ? (caseData.type === "notice" ? [caseData.answer] : caseData.elements) : state.selection;
    options.forEach(option => {
      const label = node("label", "sd-option");
      const input = node("input");
      input.type = caseData.type === "set" ? "checkbox" : "radio";
      input.name = "sd-answer";
      input.value = option.id;
      input.checked = selected.includes(option.id);
      input.addEventListener("change", () => {
        if (caseData.type === "set") state.selection = input.checked ? Array.from(new Set([...state.selection, option.id])) : state.selection.filter(id => id !== option.id);
        else state.selection = [option.id];
      });
      label.append(input, node("span", "", option.text));
      choices.append(label);
    });
    area.append(choices);
    $("answer-fields").disabled = finished;
    $("check").hidden = finished;
    $("tries").textContent = finished ? copy.completed : t("tries", { count: 2 - currentRecord().tries });
  }

  function lineAbsentFrom(id, evidence) {
    return linesFor([id]).find(line => {
      const nearest = nearestLine(evidence, line.nm);
      return !nearest || nearest.nm !== line.nm;
    });
  }
  function hintFor(caseData, checkedSet, measurementOK) {
    if (caseData.type === "notice") return caseData.options.find(option => option.id === state.selection[0]).hint;
    if (caseData.type === "measure") {
      if (!measurementOK) return t("wrongMeasure", { nm: state.measurement });
      if (state.selection[0] === "Na") return copy.heliumTrap;
    }
    const evidence = linesFor(caseData.elements);
    if (caseData.type === "set") {
      if (checkedSet.extra.length) {
        const id = checkedSet.extra[0];
        return t("wrongExtra", { element: elementFor(id).name, nm: lineAbsentFrom(id, evidence).nm.toFixed(1) });
      }
      const chosenLines = linesFor(state.selection);
      const missingLine = lineAbsentFrom(checkedSet.missing[0], chosenLines);
      return t("wrongMissing", { nm: missingLine.nm.toFixed(1) });
    }
    const id = state.selection[0];
    return t("wrongSingle", { element: elementFor(id).name, nm: lineAbsentFrom(id, evidence).nm.toFixed(1) });
  }

  function checkAnswer(event) {
    event.preventDefault();
    const caseData = currentCase(), record = currentRecord();
    if (record.stars) return;
    const measurement = state.measurement.trim() === "" ? NaN : Number(state.measurement);
    if (!state.selection.length || (caseData.type === "measure" && (!Number.isFinite(measurement) || measurement < 380 || measurement > 750))) {
      state.feedback = caseData.type === "measure" ? copy.measureFirst : copy.chooseFirst;
      state.kind = "";
      renderFeedback();
      return;
    }
    const checkedSet = checkSet(state.selection, caseData.elements);
    const measurementOK = caseData.type !== "measure" || checkMeasurement(measurement, caseData.accept);
    const correct = caseData.type === "notice" ? checkSingle(state.selection[0], caseData.answer) : caseData.type === "set" ? checkedSet.correct : checkSingle(state.selection[0], caseData.elements[0]) && measurementOK;
    record.tries += 1;
    if (correct || record.tries === 2) {
      record.stars = starsForAttempt(record.tries, correct);
      record.solved = correct;
      state.feedback = resultFeedback();
      state.kind = correct ? "good" : "";
    } else {
      state.feedback = hintFor(caseData, checkedSet, measurementOK) + copy.retrySuffix;
      state.kind = "";
    }
    save();
    render();
    if (record.stars) focus("next");
    else focus("check");
  }

  function renderFeedback() {
    $("feedback").textContent = state.feedback;
    $("feedback").dataset.kind = state.kind;
  }
  function renderReport() {
    const total = totals();
    $("end-title").textContent = total.done === data.cases.length ? copy.reportDone : copy.reportPartial;
    $("end-score").textContent = t("reportScore", total);
    $("recap").replaceChildren(...copy.recap.map(text => node("li", "", text)));
    $("review").replaceChildren();
    let reviewed = 0;
    data.cases.forEach((caseData, index) => {
      const record = state.records[index];
      if (record.stars === 3) return;
      const card = node("article", "sd-review-card");
      card.append(node("h3", "", t("caseOption", { number: caseData.id, title: caseData.title, status: statusText(record) })));
      card.append(node("p", "", record.stars ? caseData.explanation : t("unfinished", { number: caseData.id })));
      card.append(button(t("reviewCase", { number: caseData.id }), () => openCase(index)));
      $("review").append(card);
      reviewed += 1;
    });
    if (!reviewed) $("review").append(node("p", "sd-muted", copy.reviewClear));
  }

  // All case/screen transitions use this render path. Pointer movement only moves
  // the ruler; no animation loop, timers, or hidden-tab work are needed.
  function render() {
    ["start", "play", "end"].forEach(screen => { $(screen).hidden = state.screen !== screen; });
    $("total").textContent = t("progress", totals());
    renderFiles();
    if (state.screen === "play") {
      const caseData = currentCase();
      $("category").textContent = `${t("caseNumber", { number: caseData.id })} · ${caseData.category}`;
      $("prompt").textContent = caseData.prompt;
      $("instructions").textContent = `${copy.instructions[caseData.type]} ${caseData.mode === "emission" ? copy.emissionDefinition : copy.absorptionDefinition}`;
      $("mode").textContent = caseData.mode === "paired" ? `${copy.emission} + ${copy.absorption}` : copy[caseData.mode];
      renderSpectra();
      renderAnswers();
      renderFeedback();
      $("next-actions").hidden = !currentRecord().stars;
      $("next").textContent = state.index === data.cases.length - 1 || totals().done === data.cases.length ? copy.finish : copy.next;
    } else if (state.screen === "end") renderReport();
  }

  document.querySelectorAll("[data-copy]").forEach(element => { element.textContent = copy[element.dataset.copy]; });
  $("begin").addEventListener("click", () => {
    const next = state.records.findIndex(record => !record.stars);
    openCase(next < 0 ? 0 : next);
  });
  $("picker").addEventListener("change", () => openCase(Number($("picker").value)));
  $("files-button").addEventListener("click", () => openScreen("start"));
  $("return").addEventListener("click", () => openScreen("start"));
  $("report").addEventListener("click", () => openScreen("end"));
  $("ruler").addEventListener("input", () => updateMeter(Number($("ruler").value)));
  $("form").addEventListener("submit", checkAnswer);
  $("next").addEventListener("click", () => {
    if (state.index === data.cases.length - 1 || totals().done === data.cases.length) openScreen("end");
    else openCase(state.index + 1);
  });
  $("reset").addEventListener("click", () => {
    try { localStorage.removeItem(key); } catch (_) { /* Reset in memory too. */ }
    state.records = data.cases.map(freshRecord);
    state.index = 0;
    state.selection = [];
    state.measurement = "";
    state.pins = [];
    state.openDetails.clear();
    state.meter = 550;
    openScreen("start");
  });
  render();
})();
