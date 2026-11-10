/* Graph Lab: plain browser JavaScript. No requests, timers, or libraries.
   Text and measurements come from labs.js. Glossary data is optional. */
(() => {
  'use strict';
  const DATA = window.GRAPH_LAB_DATA;
  const T = DATA.ui;
  const GLOSSARY = window.GRAPH_LAB_GLOSSARY;
  const hasGlossary = !!(GLOSSARY && Array.isArray(GLOSSARY.terms) && Array.isArray(GLOSSARY.languages));
  const terms = new Map(hasGlossary ? GLOSSARY.terms.map(term => [term.id, term]) : []);
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const STORAGE_KEY = 'mrd-graph-lab';
  const GRID = { left: 100, top: 60, size: 400, box: 40, bottom: 460 };
  let saved = readSave();
  let lab = DATA.labs[0];
  let state;
  let history = [];
  let tries = [];
  let lastTerm = null;
  let selectedCard = null;
  let cursor = { x: 0, y: 0 };
  let pointerStart = null;

  // These checks are pure: useful when changing a lab's numbers.
  function validateScale(choice, maximum, boxes = 10) {
    if (!Number.isFinite(choice) || choice <= 0) return 'missing';
    if (choice * boxes < maximum) return 'small';
    if (maximum < choice * boxes / 2) return 'large';
    return 'ok';
  }
  function pointWithinTolerance(actual, expected, scale, tolerance = 0.25) {
    if (![actual.x, actual.y, expected.x, expected.y, scale.x, scale.y].every(Number.isFinite) || scale.x <= 0 || scale.y <= 0) return false;
    return Math.hypot((actual.x - expected.x) / scale.x, (actual.y - expected.y) / scale.y) <= tolerance;
  }
  // Small public surface for teacher/developer checks; it does not change play.
  window.GRAPH_LAB_CHECKS = Object.freeze({ validateScale, pointWithinTolerance });

  function readSave() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (value && value.v === 1 && value.labs && typeof value.labs === 'object') {
        return { v: 1, labs: value.labs, lang: typeof value.lang === 'string' ? value.lang : 'es' };
      }
    } catch (_) { /* Storage may be blocked on school devices. */ }
    return { v: 1, labs: {}, lang: 'es' };
  }
  function writeSave() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch (_) { /* Play still works. */ }
  }
  function saveProgress() {
    const old = saved.labs[lab.id] || {};
    const stars = state.stars.filter(Boolean).length;
    saved.labs[lab.id] = {
      highestStepReached: Math.max(Number(old.highestStepReached) || 0, Math.min(state.step + 1, 9)),
      bestStars: Math.max(Number(old.bestStars) || 0, stars)
    };
    writeSave();
  }
  function format(template, values = {}) {
    return template.replace(/\{([A-Za-z]+)\}/g, (match, key) => values[key] === undefined ? match : String(values[key]));
  }
  function plain(text) { return text.replace(/\{\{[^|]+\|([^}]+)\}\}/g, '$1').replace(/\*\*/g, ''); }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  // Only our tiny markup is interpreted; glossary entries stay plain text.
  function rich(node, text) {
    node.replaceChildren();
    const pattern = /\{\{([^|]+)\|([^}]+)\}\}|\*\*([^*]+)\*\*|\n/g;
    let start = 0;
    for (const match of text.matchAll(pattern)) {
      node.append(document.createTextNode(text.slice(start, match.index)));
      if (match[1]) {
        if (terms.has(match[1])) {
          const button = element('button', 'gl-term', match[2]);
          button.type = 'button';
          button.dataset.term = match[1];
          node.append(button);
        } else node.append(document.createTextNode(match[2]));
      } else if (match[3]) node.append(element('strong', '', match[3]));
      else node.append(document.createElement('br'));
      start = match.index + match[0].length;
    }
    node.append(document.createTextNode(text.slice(start)));
    return node;
  }
  function button(text, action, className = 'gl-button') {
    const node = rich(element('button', className), text);
    node.type = 'button';
    if (action) node.addEventListener('click', action);
    return node;
  }
  function termText(axis) { return `{{${axis.term}|${axis.name}}}`; }
  function axisHeading(axis) { return `${termText(axis)} ({{${axis.unitTerm}|${axis.unit}}})`; }
  function snapshot() {
    history.push(JSON.stringify(state));
    if (history.length > 100) history.shift();
    $('gl-undo').disabled = false;
  }
  function feedback(text = '', isError = false) {
    rich($('gl-feedback'), text);
    $('gl-feedback').className = `gl-feedback ${isError ? 'gl-error' : 'gl-success'}`;
  }
  function mistake(text) {
    tries[state.step].wrong++;
    feedback(text, true);
  }
  function cancelSpeech() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
  function speak(text, lang = 'en-US', voice = null) {
    if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) return;
    cancelSpeech();
    const utterance = new SpeechSynthesisUtterance(plain(text));
    utterance.lang = lang;
    utterance.rate = 0.9;
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }
  function startLab(id) {
    cancelSpeech();
    lab = DATA.labs.find(item => item.id === id) || DATA.labs[0];
    state = {
      step: 0, ready: false, series: 0, measured: [0, 0], viewing: [0, 0],
      readings: lab.series.map(series => series.values.map((value, i) => i === 0 ? String(value) : '')),
      cells: lab.series.map(() => Array(6).fill('')),
      labels: { x: '', y: '', xUnit: '', yUnit: '', titleX: '', titleY: '' },
      scale: { x: 0, y: 0 }, ticks: { x: 0, y: 0 },
      points: [[], []], lineCounts: [0, 0], legend: ['', ''], claims: ['', ''], stars: []
    };
    tries = Array.from({ length: 8 }, () => ({ wrong: 0, hints: 0 }));
    history = [];
    selectedCard = null;
    cursor = { x: 0, y: 0 };
    $('gl-equipment').replaceChildren();
    $('gl-lab').value = lab.id;
    saveProgress();
    render();
  }
  function currentPlot() {
    const series = state.points[0].length < lab.xs.length ? 0 : 1;
    return { series, row: state.points[series].length };
  }
  function currentLine() {
    const series = state.lineCounts[0] < lab.xs.length ? 0 : 1;
    return { series, row: state.lineCounts[series] };
  }
  function instruction() {
    if (state.step === 0) return lab.testInstruction;
    if (state.step === 1) return format(T.instructions[1], { unitNote: lab.unitNote });
    if (state.step === 3) {
      const axis = state.ticks.x < 10 ? 'x' : 'y';
      return `${format(T.scaleTask, { axis: T[axis === 'x' ? 'axisX' : 'axisY'], max: axisMaximum(axis) })}\n${T.scaleRule}`;
    }
    if (state.step === 4) {
      const { series, row } = currentPlot();
      if (row >= lab.xs.length) return T.plotDone;
      return format(T.plotTask, { series: lab.series[series].name, x: lab.x.short, y: lab.y.short, xValue: lab.xs[row], yValue: lab.series[series].values[row], xUnit: lab.x.unit, yUnit: lab.y.unit });
    }
    if (state.step === 5) {
      const { series, row } = currentLine();
      return row >= lab.xs.length ? T.lineDone : format(T.lineTask, { series: lab.series[series].name, x: lab.xs[row] });
    }
    if (state.step === 8) return T.starRule;
    return T.instructions[state.step];
  }
  function render() {
    $('gl-lab-name').textContent = lab.name;
    const progress = saved.labs[lab.id] || {};
    rich($('gl-progress'), format(T.progress, { step: Math.min(progress.highestStepReached || 1, 8), stars: progress.bestStars || 0 }));
    $('gl-steps').replaceChildren(...T.steps.map((name, i) => {
      const status = i < state.step || (i === state.step && state.ready) ? 'done' : i === state.step ? 'current' : 'locked';
      const item = element('li', `gl-step gl-${status}`);
      item.append(element('span', 'gl-step-number', status === 'done' ? '✓' : String(i + 1)), document.createTextNode(name));
      item.setAttribute('aria-label', format(T.stepStatus, { number: i + 1, step: name, status: T[status] }));
      if (status === 'current') item.setAttribute('aria-current', 'step');
      return item;
    }));
    rich($('gl-table-title'), T.table);
    $('gl-stage-title').textContent = state.step === 8 ? T.finish : `${state.step + 1}. ${T.steps[state.step]}`;
    rich($('gl-instruction'), instruction());
    $('gl-hint').hidden = true;
    feedback();
    renderTable();
    const testing = state.step < 2;
    $('gl-equipment').hidden = !testing;
    $('gl-equipment-controls').hidden = !testing;
    $('gl-graph-wrap').hidden = testing;
    $('gl-view-title').textContent = testing ? T.equipment : state.step >= 7 ? T.completedGraph : T.graph;
    if (testing) renderEquipment(); else renderGraph(state);
    renderActivity();
    $('gl-hint-button').hidden = state.step === 8;
    $('gl-hint-button').disabled = state.ready;
    $('gl-undo').hidden = state.step === 8;
    $('gl-undo').disabled = history.length === 0 || state.ready;
    $('gl-check').textContent = state.step === 8 ? (lab.id === 'spring' ? T.nextLab : T.playAgain) : state.ready ? T.next : T.check;
  }
  function renderTable() {
    const table = element('table', 'gl-table');
    const head = element('thead');
    const headings = element('tr');
    const xHeading = rich(element('th'), axisHeading(lab.x));
    xHeading.scope = 'col';
    headings.append(xHeading);
    lab.series.forEach((series, index) => {
      const th = element('th');
      th.scope = 'col';
      const name = element('div', `gl-series-${index}`);
      name.append(element('span', 'gl-symbol', index ? '■' : '●'), document.createTextNode(series.name));
      th.append(name, rich(element('div'), axisHeading(lab.y)));
      headings.append(th);
    });
    head.append(headings);
    const body = element('tbody');
    const active = state.step === 4 ? currentPlot() : state.step === 5 ? currentLine() : { series: state.series, row: state.viewing[state.series] };
    lab.xs.forEach((x, row) => {
      const tr = element('tr', row === active.row && state.step < 6 ? 'gl-highlight' : '');
      const th = element('th');
      th.scope = 'row';
      if (state.step < 2) {
        const review = button(`**${x}**`, () => {
          state.viewing[state.series] = row;
          if (lab.id === 'cooling') state.viewing = [row, row];
          renderTable(); renderEquipment();
        }, 'gl-button gl-row-button');
        review.disabled = row > state.measured[state.series];
        review.setAttribute('aria-label', format(T.reviewReading, { value: x, unit: lab.x.unit }));
        th.append(review);
      } else th.append(element('strong', '', String(x)));
      tr.append(th);
      lab.series.forEach((series, s) => {
        const td = element('td', active.row === row && active.series === s && state.step < 6 ? 'gl-active-cell' : '');
        const input = element('input');
        input.type = 'text';
        input.inputMode = 'decimal';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.value = state.readings[s][row];
        input.dataset.series = s;
        input.dataset.row = row;
        input.setAttribute('aria-label', format(T.readingLabel, { series: series.name, x: lab.x.name, value: x, unit: lab.x.unit, y: lab.y.name, yUnit: lab.y.unit }));
        input.readOnly = row === 0 || state.step > 1 || state.ready;
        if (input.readOnly) input.tabIndex = -1;
        if (state.cells[s][row]) input.className = `gl-${state.cells[s][row]}`;
        if (state.cells[s][row] === 'invalid') input.setAttribute('aria-invalid', 'true');
        input.addEventListener('input', () => {
          snapshot();
          state.readings[s][row] = input.value;
          state.cells[s][row] = '';
          input.className = '';
          input.removeAttribute('aria-invalid');
          feedback();
        });
        input.addEventListener('focus', () => {
          if (state.step < 2 && row <= state.measured[s]) {
            state.series = s;
            state.viewing[s] = row;
            if (lab.id === 'cooling') state.viewing = [row, row];
            renderEquipment();
          }
        });
        td.append(input);
        tr.append(td);
      });
      body.append(tr);
    });
    table.append(head, body);
    $('gl-table').replaceChildren(table, element('p', 'gl-table-note', state.step < 2 ? `${T.example} ${T.review}` : T.example));
  }
  function svgNode(tag, attrs = {}, text) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function svgText(svg, x, y, text, attrs = {}) { svg.append(svgNode('text', { x, y, class: 'gl-svg-text', 'font-size': 14, ...attrs }, text)); }
  function svgLine(svg, x1, y1, x2, y2, attrs = {}) { svg.append(svgNode('line', { x1, y1, x2, y2, stroke: 'currentColor', ...attrs })); }
  function springPath(bottom) {
    let d = 'M 110 42 L 110 58';
    for (let i = 0; i < 14; i++) d += ` L ${i % 2 ? 125 : 95} ${58 + (bottom - 70) * i / 13}`;
    return `${d} L 110 ${bottom}`;
  }
  function renderEquipment() {
    const controls = $('gl-equipment-controls');
    controls.replaceChildren();
    lab.series.forEach((series, s) => {
      const toggle = button(series.name, () => { state.series = s; renderTable(); renderEquipment(); });
      toggle.setAttribute('aria-pressed', String(state.series === s));
      controls.append(toggle);
    });
    const advance = button(lab.id === 'spring' ? T.addMass : T.wait, () => {
      snapshot();
      if (lab.id === 'spring') {
        const s = state.series;
        state.measured[s] = Math.min(5, state.measured[s] + 1);
        state.viewing[s] = state.measured[s];
      } else {
        const next = Math.min(5, state.measured[0] + 1);
        state.measured = [next, next];
        state.viewing = [next, next];
      }
      renderTable(); renderEquipment(); feedback();
      if (state.measured.every(row => row === 5)) feedback(T.testDone);
    }, 'gl-button gl-primary');
    advance.disabled = state.measured[state.series] >= 5 || state.ready;
    controls.append(advance);
    const s = state.series;
    const row = state.viewing[s];
    const reading = lab.series[s].values[row];
    let svg = $('gl-equipment-svg');
    if (!svg) {
      svg = svgNode('svg', { id: 'gl-equipment-svg', viewBox: '0 0 560 420', role: 'img' });
      $('gl-equipment').append(svg);
      if (lab.id === 'spring') {
        svgLine(svg, 60, 40, 160, 40, { stroke: '#aeb3bb', 'stroke-width': 8 });
        svg.append(svgNode('path', { id: 'gl-spring-path', class: 'gl-equipment-spring', fill: 'none', 'stroke-width': 4 }));
        const weight = svgNode('g', { id: 'gl-weight', class: 'gl-equipment-weight' });
        weight.append(svgNode('rect', { x: 75, y: 5, width: 70, height: 36, rx: 5, fill: '#29333f', stroke: '#aeb3bb' }));
        svgText(weight, 110, 29, '', { id: 'gl-weight-label', 'text-anchor': 'middle' });
        svg.append(weight);
        for (let n = 0; n <= 30; n++) {
          const y = 110 + n * 8;
          svgLine(svg, 185, y, n % 5 ? 200 : 212, y, { stroke: '#aeb3bb' });
          if (n % 5 === 0) svgText(svg, 220, y + 5, n);
        }
        svgText(svg, 185, 85, lab.y.unit);
      } else {
        lab.series.forEach((series, index) => {
          const x = 60 + index * 145;
          svg.append(svgNode('path', { d: `M${x} 235 L${x + 10} 340 L${x + 95} 340 L${x + 105} 235 Z`, fill: '#172f3c', stroke: series.colour, 'stroke-width': 2 }));
          if (index === 0) svgLine(svg, x - 5, 235, x + 110, 235, { stroke: series.colour, 'stroke-width': 6 });
          svg.append(svgNode('rect', { x: x + 42, y: 80, width: 20, height: 220, rx: 10, fill: '#202933', stroke: '#aeb3bb' }));
          svg.append(svgNode('rect', { id: `gl-mercury-${index}`, x: x + 49, width: 6, fill: series.colour }));
          svg.append(svgNode('circle', { cx: x + 52, cy: 302, r: 12, fill: series.colour }));
          for (let n = 0; n <= 100; n += 20) {
            svgLine(svg, x + 66, 290 - n * 2, x + 76, 290 - n * 2, { stroke: '#aeb3bb' });
            svgText(svg, x + 80, 295 - n * 2, n, { 'font-size': 12 });
          }
          svgText(svg, x + 52, 365, series.name, { 'text-anchor': 'middle', 'font-size': 12 });
        });
      }
      svg.append(svgNode('g', { id: 'gl-zoom-view' }));
      svgText(svg, 280, 405, '', { id: 'gl-reading-caption', 'text-anchor': 'middle' });
    }
    svg.setAttribute('aria-label', format(T.equipmentLabel, { series: lab.series[s].name, x: lab.x.name, value: lab.xs[row], unit: lab.x.unit, y: lab.y.name, reading, yUnit: lab.y.unit }));
    if (lab.id === 'spring') {
      const bottom = 110 + reading * 8;
      $('gl-spring-path').setAttribute('d', springPath(bottom));
      $('gl-spring-path').setAttribute('stroke', lab.series[s].colour);
      $('gl-weight').setAttribute('transform', `translate(0 ${bottom})`);
      $('gl-weight-label').textContent = `${lab.xs[row]} ${lab.x.unit}`;
    } else {
      lab.series.forEach((series, index) => {
        const value = series.values[state.viewing[index]];
        $(`gl-mercury-${index}`).setAttribute('y', 290 - value * 2);
        $(`gl-mercury-${index}`).setAttribute('height', value * 2 + 12);
      });
    }
    const zoom = $('gl-zoom-view');
    zoom.replaceChildren(svgNode('rect', { x: 365, y: 70, width: 175, height: 280, rx: 14, class: 'gl-zoom' }));
    svgText(zoom, 452, 97, `${T.zoom} · ${lab.y.unit}`, { 'text-anchor': 'middle' });
    for (let n = Math.max(0, reading - 5); n <= reading + 5; n++) {
      const y = lab.id === 'spring' ? 220 + (n - reading) * 20 : 220 - (n - reading) * 20;
      svgLine(zoom, 395, y, n % 5 === 0 ? 430 : 420, y, { stroke: '#f7f6f3', 'stroke-width': 2 });
      svgText(zoom, 439, y + 5, n, { 'font-weight': n === reading ? 800 : 400 });
    }
    svgLine(zoom, 380, 220, 428, 220, { stroke: lab.series[s].colour, 'stroke-width': 4 });
    zoom.append(svgNode('path', { d: 'M 428 220 l -10 -6 v 12 Z', fill: lab.series[s].colour }));
    $('gl-reading-caption').textContent = plain(format(T.reading, { name: lab.x.name, value: lab.xs[row], unit: lab.x.unit }));
  }

  function graphPosition(x, y) {
    return { x: GRID.left + x / state.scale.x * GRID.box, y: GRID.bottom - y / state.scale.y * GRID.box };
  }
  function graphSymbol(parent, series, x, y, radius = 6) {
    parent.append(lab.series[series].symbol === 'circle'
      ? svgNode('circle', { cx: x, cy: y, r: radius, fill: lab.series[series].colour, stroke: '#08090b', 'stroke-width': 1.5 })
      : svgNode('rect', { x: x - radius, y: y - radius, width: radius * 2, height: radius * 2, fill: lab.series[series].colour, stroke: '#08090b', 'stroke-width': 1.5 }));
  }
  // This is the only renderer for the graph, at every learning step.
  function renderGraph(current) {
    const svg = $('gl-graph');
    svg.replaceChildren();
    svg.setAttribute('viewBox', current.step >= 6 ? '0 0 600 610' : '0 0 600 530');
    svg.setAttribute('role', current.step === 4 ? 'application' : 'group');
    svg.setAttribute('aria-label', format(T.graphLabel, { title: lab.title, x: lab.x.name, y: lab.y.name, xUnit: lab.x.unit, yUnit: lab.y.unit }));
    svg.setAttribute('tabindex', current.step === 4 ? '0' : '-1');
    svg.classList.toggle('gl-plotting', current.step === 4 && !current.ready);
    const title = current.step > 2 ? lab.title : [current.labels.titleY || '…', T.versus, current.labels.titleX || '…'].join(' ');
    svgText(svg, 300, 26, title, { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 19 });
    for (let i = 0; i <= 10; i++) {
      const x = GRID.left + i * GRID.box;
      const y = GRID.bottom - i * GRID.box;
      svgLine(svg, x, GRID.top, x, GRID.bottom, { class: 'gl-grid' });
      svgLine(svg, GRID.left, y, GRID.left + GRID.size, y, { class: 'gl-grid' });
      if (current.step >= 3) {
        if (i <= current.ticks.x) svgText(svg, x, GRID.bottom + 23, i * current.scale.x, { 'text-anchor': 'middle' });
        if (i <= current.ticks.y) svgText(svg, GRID.left - 12, y + 5, i * current.scale.y, { 'text-anchor': 'end' });
      }
    }
    svgLine(svg, GRID.left, GRID.top - 4, GRID.left, GRID.bottom, { class: 'gl-axis' });
    svgLine(svg, GRID.left, GRID.bottom, GRID.left + GRID.size + 4, GRID.bottom, { class: 'gl-axis' });
    const xName = current.labels.x;
    const yName = current.labels.y;
    svgText(svg, 300, 516, xName ? `${xName} (${current.labels.xUnit || '…'})` : plain(T.axisX), { 'text-anchor': 'middle', 'font-weight': 700 });
    svgText(svg, 0, 0, yName ? `${yName} (${current.labels.yUnit || '…'})` : plain(T.axisY), { transform: 'translate(25 260) rotate(-90)', 'text-anchor': 'middle', 'font-weight': 700 });
    if (current.step >= 4) {
      lab.series.forEach((series, s) => {
        if (current.lineCounts[s] > 1) {
          const points = lab.xs.slice(0, current.lineCounts[s]).map((x, row) => {
            const p = graphPosition(x, series.values[row]);
            return `${p.x},${p.y}`;
          }).join(' ');
          svg.append(svgNode('polyline', { points, fill: 'none', stroke: series.colour, 'stroke-width': 3 }));
        }
        current.points[s].forEach(row => {
          const p = graphPosition(lab.xs[row], series.values[row]);
          graphSymbol(svg, s, p.x, p.y, s ? 5 : 8);
        });
      });
    }
    if (current.step === 4) {
      svg.append(svgNode('g', { id: 'gl-guides', 'aria-hidden': 'true' }));
      drawCursor();
    }
    if (current.step === 5 && !current.ready) {
      const next = currentLine();
      // Put the next point's hit area on top when small screens overlap targets.
      const order = lab.xs.map((_, row) => row).filter(row => row !== next.row).concat(next.row);
      if (next.row < lab.xs.length) order.forEach(row => {
        const x = lab.xs[row];
        const p = graphPosition(x, lab.series[next.series].values[row]);
        const hitRadius = Math.max(22, 22 * 600 / (svg.getBoundingClientRect().width || 600));
        const hit = svgNode('circle', { cx: p.x, cy: p.y, r: hitRadius, class: 'gl-point-target', tabindex: 0, role: 'button', 'data-point': row,
          'aria-label': format(T.pointLabel, { series: lab.series[next.series].name, x, y: lab.series[next.series].values[row] }) });
        hit.addEventListener('click', () => connectPoint(next.series, row));
        hit.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); connectPoint(next.series, row, true); }
        });
        svg.append(hit);
      });
    }
    if (current.step >= 6) {
      svg.append(svgNode('rect', { x: 100, y: 540, width: 400, height: 63, rx: 8, fill: '#111418', stroke: '#aeb3bb' }));
      lab.series.forEach((series, s) => {
        graphSymbol(svg, s, 119, 559 + s * 25);
        svgText(svg, 136, 564 + s * 25, current.legend[s] || '…');
      });
    }
    rich($('gl-graph-instructions'), current.step === 4 ? `${T.keyboard}\n${format(T.fineMove, { x: round(current.scale.x / 10), y: round(current.scale.y / 10) })}` : current.step === 5 ? T.lineKeyboard : '');
    $('gl-readout').hidden = current.step !== 4;
  }
  function round(n) { return Math.round(n * 100) / 100; }
  function drawCursor(announce = true) {
    const guides = $('gl-guides');
    if (!guides) return;
    const p = graphPosition(cursor.x, cursor.y);
    guides.replaceChildren();
    svgLine(guides, GRID.left, p.y, p.x, p.y, { class: 'gl-guide' });
    svgLine(guides, p.x, GRID.bottom, p.x, p.y, { class: 'gl-guide' });
    guides.append(svgNode('circle', { cx: p.x, cy: p.y, r: 10, class: 'gl-cursor' }));
    if (announce) $('gl-readout').textContent = format(T.readout, { x: Math.round(cursor.x), y: Math.round(cursor.y) });
  }
  function placePoint() {
    if (state.step !== 4 || state.ready) return;
    const { series, row } = currentPlot();
    if (row >= lab.xs.length) return;
    const expected = { x: lab.xs[row], y: lab.series[series].values[row] };
    if (pointWithinTolerance(cursor, expected, state.scale)) {
      snapshot();
      state.points[series].push(row);
      cursor = expected;
      render();
      feedback(T.plotGood);
    } else {
      const xDifference = Math.abs(cursor.x - expected.x) / state.scale.x;
      const yDifference = Math.abs(cursor.y - expected.y) / state.scale.y;
      const axis = xDifference >= yDifference ? 'x' : 'y';
      const message = axis === 'x' ? (cursor.x < expected.x ? T.moveRight : T.moveLeft) : (cursor.y < expected.y ? T.moveUp : T.moveDown);
      mistake(format(message, { at: Math.round(cursor[axis]), target: expected[axis] }));
    }
  }
  function connectPoint(series, row, keyboard = false) {
    const next = currentLine();
    if (next.row >= lab.xs.length || state.ready) return;
    if (next.series !== series || next.row !== row) {
      mistake(format(T.lineWrong, { x: lab.xs[next.row] }));
      return;
    }
    snapshot();
    state.lineCounts[series]++;
    render();
    feedback(T.lineGood);
    if (keyboard) {
      const target = $('gl-graph').querySelector(`[data-point="${currentLine().row}"]`);
      (target || $('gl-check')).focus();
    }
  }

  function cardGroup(parent, heading, values, kind) {
    const headingNode = element('h3', 'gl-activity-heading', heading);
    const group = element('div', 'gl-cards');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', heading);
    values.forEach(value => {
      const card = button(value, () => {
        selectedCard = { kind, value };
        renderActivity();
        feedback(T.selectedCard);
        // Keep keyboard focus on the selected card after rebuilding cards.
        const match = [...$('gl-activity').querySelectorAll('[data-card]')].find(node => node.dataset.card === value && node.dataset.kind === kind);
        if (match) match.focus();
      }, 'gl-card');
      card.draggable = !state.ready;
      card.disabled = state.ready;
      card.dataset.card = value;
      card.dataset.kind = kind;
      card.setAttribute('aria-pressed', String(!!selectedCard && selectedCard.kind === kind && selectedCard.value === value));
      card.addEventListener('dragstart', event => {
        selectedCard = { kind, value };
        event.dataTransfer.setData('text/plain', JSON.stringify(selectedCard));
        event.dataTransfer.effectAllowed = 'copy';
      });
      group.append(card);
    });
    parent.append(headingNode, group);
  }
  function target(label, value, kind, apply) {
    const targetId = `${kind}:${plain(label)}`;
    const node = button('', () => {
      if (!selectedCard || selectedCard.kind !== kind) { feedback(T.chooseCard); return; }
      snapshot(); apply(selectedCard.value); selectedCard = null;
      renderActivity(); renderGraph(state); feedback();
      const replacement = [...$('gl-activity').querySelectorAll('[data-target]')].find(item => item.dataset.target === targetId);
      if (replacement) replacement.focus();
    }, `gl-target${value ? ' gl-filled' : ''}`);
    node.dataset.target = targetId;
    node.disabled = state.ready;
    node.append(element('span', 'gl-target-title', plain(label)), element('span', '', value || T.chooseCard));
    node.setAttribute('aria-label', format(T.labelTarget, { target: plain(label), value: value || T.chooseCard }));
    node.addEventListener('dragover', event => {
      if (selectedCard && selectedCard.kind === kind && !state.ready) event.preventDefault();
    });
    node.addEventListener('drop', event => { event.preventDefault(); node.click(); });
    return node;
  }
  function renderActivity() {
    const activity = $('gl-activity');
    activity.replaceChildren();
    if (state.step === 0 && lab.id === 'cooling') activity.append(element('p', 'gl-table-note', T.simulated));
    if (state.step === 2) {
      cardGroup(activity, T.variableCards, [lab.x.name, lab.y.name, ...lab.distractors], 'variable');
      const axes = element('div', 'gl-targets');
      ['x', 'y'].forEach(axis => axes.append(target(T[axis === 'x' ? 'axisX' : 'axisY'], state.labels[axis], 'variable', value => { state.labels[axis] = value; })));
      activity.append(axes);
      cardGroup(activity, T.unitCards, DATA.units, 'unit');
      const units = element('div', 'gl-targets');
      ['x', 'y'].forEach(axis => units.append(target(`${T[axis === 'x' ? 'axisX' : 'axisY']} · ${T.unit}`, state.labels[`${axis}Unit`], 'unit', value => { state.labels[`${axis}Unit`] = value; })));
      activity.append(units);
      cardGroup(activity, T.titleCards, [lab.x.short, lab.y.short, ...lab.distractors], 'title');
      const title = element('div', 'gl-title-builder');
      title.append(target(T.titleY, state.labels.titleY, 'title', value => { state.labels.titleY = value; }), element('span', '', T.versus), target(T.titleX, state.labels.titleX, 'title', value => { state.labels.titleX = value; }));
      activity.append(title);
    }
    if (state.step === 3) {
      ['x', 'y'].forEach(axis => {
        const section = element('div', 'gl-scale-block');
        const max = axisMaximum(axis);
        section.append(rich(element('p'), format(T.scaleTask, { axis: T[axis === 'x' ? 'axisX' : 'axisY'], max })));
        const choices = element('div', 'gl-cards');
        choices.setAttribute('role', 'group');
        choices.setAttribute('aria-label', format(T.scaleFor, { axis: plain(T[axis === 'x' ? 'axisX' : 'axisY']) }));
        DATA.scaleChoices.forEach(value => {
          const choice = button(`**${value}**`, () => {
            snapshot(); state.scale[axis] = value; state.ticks[axis] = 0;
            renderActivity(); renderGraph(state);
            rich($('gl-instruction'), instruction());
            const result = validateScale(value, max);
            if (result !== 'ok') mistake(scaleMessage(result, axis)); else feedback(T.scaleRule);
            $('gl-activity').querySelector(`[data-scale="${axis}-${value}"]`).focus();
          });
          choice.dataset.scale = `${axis}-${value}`;
          choice.setAttribute('aria-pressed', String(state.scale[axis] === value));
          if (state.scale[axis] === value) choice.classList.add('gl-selected');
          choice.disabled = state.ready;
          choices.append(choice);
        });
        const count = button(format(T.countBy, { value: state.scale[axis] || '…' }), () => {
          snapshot(); state.ticks[axis] = Math.min(10, state.ticks[axis] + 1);
          renderActivity(); renderGraph(state); feedback(T.scaleRule);
          rich($('gl-instruction'), instruction());
          const nextButton = $('gl-activity').querySelector(`[data-count="${axis}"]`);
          if (nextButton && !nextButton.disabled) nextButton.focus();
        }, 'gl-button gl-primary');
        count.dataset.count = axis;
        count.disabled = validateScale(state.scale[axis], max) !== 'ok' || state.ticks[axis] === 10 || state.ready;
        section.append(choices, count);
        if (state.scale[axis]) section.append(element('p', 'gl-scale-pattern', Array.from({ length: state.ticks[axis] + 1 }, (_, i) => i * state.scale[axis]).join(', ')));
        activity.append(section);
      });
      activity.append(rich(element('p'), T.scaleRule));
    }
    if (state.step === 5 && !state.ready) {
      const next = currentLine();
      if (next.row < lab.xs.length) {
        activity.append(element('p', 'gl-table-note', T.pointButtons));
        const points = element('div', 'gl-cards');
        lab.xs.forEach((x, row) => {
          const join = button(format(T.joinAt, { x }), () => connectPoint(next.series, row, true));
          join.disabled = row < next.row;
          points.append(join);
        });
        activity.append(points);
      }
    }
    if (state.step === 6) {
      cardGroup(activity, T.variableCards, lab.series.map(series => series.name), 'legend');
      lab.series.forEach((series, s) => {
        const row = target(series.symbolName, state.legend[s], 'legend', value => { state.legend[s] = value; });
        row.classList.add(`gl-series-${s}`);
        activity.append(row);
      });
    }
    if (state.step >= 7 || (state.step === 6 && state.ready)) {
      activity.append(element('h3', 'gl-activity-heading', T.checklist));
      const checklist = element('ul', 'gl-checklist');
      T.checklistItems.forEach(item => checklist.append(element('li', '', `✓ ${item}`)));
      activity.append(checklist);
    }
    if (state.step === 7) {
      lab.claimFrames.forEach((frame, index) => {
        const label = element('label', 'gl-claim-frame');
        const pieces = frame.split('{answer}');
        label.append(rich(element('span'), pieces[0]));
        const select = element('select');
        select.append(new Option(T.choose, ''));
        lab.claimOptions[index].forEach(value => select.append(new Option(value, value)));
        select.value = state.claims[index];
        select.disabled = state.ready;
        select.setAttribute('aria-label', plain(frame.replace('{answer}', '…')));
        select.addEventListener('change', () => { snapshot(); state.claims[index] = select.value; feedback(); });
        label.append(select, rich(element('span'), pieces[1]));
        activity.append(label);
      });
    }
    if (state.step === 8) {
      const stars = state.stars.filter(Boolean).length;
      activity.append(element('h3', 'gl-activity-heading', T.finish));
      const starLine = element('p', 'gl-stars', '★'.repeat(stars) + '☆'.repeat(8 - stars));
      starLine.setAttribute('aria-hidden', 'true');
      activity.append(starLine, rich(element('p'), format(T.starScore, { stars })), element('p', '', T.saved));
      const list = element('ul', 'gl-checklist');
      T.steps.forEach((step, index) => list.append(element('li', '', `${state.stars[index] ? '★' : '☆'} ${step}`)));
      activity.append(list);
    }
  }
  function axisMaximum(axis) { return axis === 'x' ? Math.max(...lab.xs) : Math.max(...lab.series.flatMap(series => series.values)); }
  function scaleMessage(result, axis) {
    return result === 'small' ? format(T.scaleSmall, { max: axisMaximum(axis), end: 10 * state.scale[axis] }) : result === 'large' ? T.scaleLarge : T.scaleMissing;
  }
  function acceptStep(message) {
    state.ready = true;
    state.stars[state.step] = tries[state.step].wrong === 0 && tries[state.step].hints <= 1;
    saveProgress();
    render();
    feedback(message);
  }
  function check() {
    if (state.step === 8) { startLab(lab.id === 'spring' ? 'cooling' : 'spring'); return; }
    if (state.ready) {
      cancelSpeech();
      state.step++; state.ready = false; history = []; selectedCard = null;
      cursor = { x: 0, y: 0 };
      saveProgress(); render(); $('gl-stage-title').focus();
      return;
    }
    switch (state.step) {
      case 0:
        if (state.measured.some(row => row < 5)) mistake(T.testMissing);
        else acceptStep(T.testGood);
        break;
      case 1: {
        let invalid = null;
        lab.series.forEach((series, s) => series.values.forEach((value, row) => {
          const input = state.readings[s][row].trim().replace(',', '.');
          const valid = input !== '' && Number.isFinite(Number(input)) && Number(input) === value;
          state.cells[s][row] = valid ? 'valid' : 'invalid';
          if (!valid && !invalid) invalid = { s, row, empty: input === '' };
        }));
        if (invalid) {
          state.series = invalid.s; state.viewing[invalid.s] = invalid.row;
          if (lab.id === 'cooling') state.viewing = [invalid.row, invalid.row];
          renderTable(); renderEquipment();
          mistake(invalid.empty ? T.tableMissing : lab.id === 'spring' ? T.tableWrongSpring : T.tableWrongCooling);
          $('gl-table').querySelector(`[data-series="${invalid.s}"][data-row="${invalid.row}"]`).focus();
        } else acceptStep(T.tableGood);
        break;
      }
      case 2: {
        const labels = state.labels;
        if (Object.values(labels).some(value => !value)) { mistake(T.labelMissing); break; }
        const wrongAxis = ['x', 'y'].find(axis => labels[axis] !== lab[axis].name);
        const wrongUnit = ['x', 'y'].find(axis => labels[`${axis}Unit`] !== lab[axis].unit);
        if (wrongAxis) mistake(format(T.labelWrong, { name: termText(lab[wrongAxis]), axis: T[wrongAxis === 'x' ? 'axisX' : 'axisY'] }));
        else if (wrongUnit) mistake(format(T.unitWrong, { unit: lab[wrongUnit].unit, axis: T[wrongUnit === 'x' ? 'axisX' : 'axisY'] }));
        else if (labels.titleY !== lab.y.short || labels.titleX !== lab.x.short) mistake(format(T.titleWrong, { y: lab.y.short, x: lab.x.short }));
        else acceptStep(T.labelsGood);
        break;
      }
      case 3: {
        const invalid = ['x', 'y'].find(axis => validateScale(state.scale[axis], axisMaximum(axis)) !== 'ok');
        if (invalid) mistake(scaleMessage(validateScale(state.scale[invalid], axisMaximum(invalid)), invalid));
        else if (state.ticks.x < 10 || state.ticks.y < 10) mistake(T.scaleFill);
        else acceptStep(T.scaleGood);
        break;
      }
      case 4:
        if (state.points.some(points => points.length < lab.xs.length)) mistake(T.plotMissing);
        else acceptStep(T.plotChecked);
        break;
      case 5:
        if (state.lineCounts.some(count => count < lab.xs.length)) mistake(T.lineMissing);
        else acceptStep(T.lineChecked);
        break;
      case 6: {
        const wrong = state.legend.findIndex((name, s) => name !== lab.series[s].name);
        if (state.legend.some(name => !name)) mistake(T.legendMissing);
        else if (wrong !== -1) mistake(format(T.legendWrong, { symbol: lab.series[wrong].symbolName, series: lab.series[wrong].name }));
        else acceptStep(T.legendGood);
        break;
      }
      case 7: {
        const wrong = state.claims.findIndex((value, index) => value !== lab.claimAnswers[index]);
        if (state.claims.some(value => !value)) mistake(T.claimMissing);
        else if (wrong !== -1) mistake(lab.claimFix[wrong]);
        else acceptStep(T.claimGood);
        break;
      }
    }
  }

  // Word help is optional: missing glossary data never blocks the lab.
  function currentLanguage() { return hasGlossary ? GLOSSARY.languages.find(language => language.code === saved.lang) : null; }
  function matchingVoice(language) {
    if (!language || !('speechSynthesis' in window)) return null;
    const code = language.speech.toLowerCase();
    return window.speechSynthesis.getVoices().find(voice => voice.lang.toLowerCase() === code) || null;
  }
  function renderWords() {
    const language = currentLanguage();
    const list = $('gl-word-list');
    list.replaceChildren();
    DATA.wordGroups.forEach((ids, index) => {
      list.append(element('h3', '', T.groups[index]));
      ids.forEach(id => {
        const term = terms.get(id);
        if (!term) return;
        const row = element('div', 'gl-word-row');
        const word = button(term.en, () => showTerm(id), 'gl-term');
        const translated = element('span', '', language && term.tr && term.tr[language.code] ? term.tr[language.code].word : term.en);
        translated.lang = language ? language.code : 'en';
        translated.dir = language ? language.dir : 'ltr';
        row.append(word, translated);
        list.append(row);
      });
    });
  }
  function updateTermVoice() {
    const language = currentLanguage();
    const voice = matchingVoice(language);
    const term = terms.get(lastTerm);
    $('gl-term-speak').hidden = !(voice && term && term.tr && language && term.tr[language.code]);
  }
  function showTerm(id) {
    const term = terms.get(id);
    if (!term) return;
    lastTerm = id;
    $('gl-term-title').textContent = term.en;
    $('gl-term-english').textContent = term.def;
    const language = currentLanguage();
    const translation = language && term.tr ? term.tr[language.code] : null;
    $('gl-translation').hidden = !translation;
    if (translation) {
      $('gl-translation').lang = language.code;
      $('gl-translation').dir = language.dir;
      $('gl-term-word').textContent = translation.word;
      $('gl-term-meaning').textContent = translation.def;
    }
    updateTermVoice();
    if (!$('gl-definition').open) $('gl-definition').showModal();
  }
  function initializeWords() {
    $('gl-help').hidden = !hasGlossary;
    if (!hasGlossary) return;
    const picker = $('gl-language');
    picker.append(new Option(T.english, 'en'));
    GLOSSARY.languages.forEach(language => picker.append(new Option(language.name, language.code)));
    if (saved.lang !== 'en' && !currentLanguage()) saved.lang = 'en';
    picker.value = saved.lang;
    picker.addEventListener('change', () => { saved.lang = picker.value; writeSave(); renderWords(); });
    $('gl-help').addEventListener('click', () => { renderWords(); $('gl-words').showModal(); });
    $('gl-close-words').addEventListener('click', () => $('gl-words').close());
    $('gl-close-definition').addEventListener('click', () => $('gl-definition').close());
    $('gl-definition').addEventListener('close', cancelSpeech);
    $('gl-term-speak').addEventListener('click', () => {
      const language = currentLanguage();
      const term = terms.get(lastTerm);
      const voice = matchingVoice(language);
      if (voice && term && language && term.tr[language.code]) {
        const translation = term.tr[language.code];
        speak(`${translation.word}. ${translation.def}`, language.speech, voice);
      }
    });
    if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', updateTermVoice);
    document.addEventListener('click', event => {
      const term = event.target.closest('[data-term]');
      if (term) showTerm(term.dataset.term);
    });
  }

  function pointerPosition(event) {
    const svg = $('gl-graph');
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    if (local.x < GRID.left - 10 || local.x > GRID.left + GRID.size + 10 || local.y < GRID.top - 10 || local.y > GRID.bottom + 10) return null;
    return {
      x: Math.max(0, Math.min(10 * state.scale.x, (local.x - GRID.left) / GRID.box * state.scale.x)),
      y: Math.max(0, Math.min(10 * state.scale.y, (GRID.bottom - local.y) / GRID.box * state.scale.y))
    };
  }
  function bindEvents() {
    $('gl-lab').addEventListener('change', event => startLab(event.target.value));
    $('gl-restart').addEventListener('click', () => startLab(lab.id));
    $('gl-check').addEventListener('click', check);
    $('gl-undo').addEventListener('click', () => {
      if (!history.length || state.ready) return;
      state = JSON.parse(history.pop());
      render();
    });
    $('gl-hint-button').addEventListener('click', () => {
      tries[state.step].hints++;
      let text = T.hints[state.step];
      if (state.step === 3) text = `${format(T.scaleHint, { x: lab.preferredScale[0], y: lab.preferredScale[1] })}\n${T.scaleBad}\n${T.scalePattern}`;
      rich($('gl-hint'), text);
      $('gl-hint').hidden = false;
    });
    $('gl-read').hidden = !('speechSynthesis' in window && window.SpeechSynthesisUtterance);
    $('gl-read').addEventListener('click', () => speak(instruction()));
    const svg = $('gl-graph');
    svg.addEventListener('pointerdown', event => {
      if (state.step !== 4 || state.ready) return;
      const point = pointerPosition(event);
      if (!point) return;
      pointerStart = event.pointerId;
      cursor = point;
      svg.setPointerCapture(event.pointerId);
      svg.focus({ preventScroll: true }); // without preventScroll the page jumps and the tap misses
      drawCursor();
    });
    svg.addEventListener('pointermove', event => {
      if (state.step !== 4 || state.ready) return;
      const point = pointerPosition(event);
      if (point) { cursor = point; drawCursor(); }
    });
    svg.addEventListener('pointerup', event => {
      if (pointerStart !== event.pointerId) return;
      pointerStart = null;
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
      const point = pointerPosition(event);
      if (point) { cursor = point; placePoint(); }
    });
    svg.addEventListener('pointercancel', () => { pointerStart = null; });
    svg.addEventListener('keydown', event => {
      if (state.step !== 4 || state.ready) return;
      const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
      if (moves[event.key]) {
        event.preventDefault();
        const [x, y] = moves[event.key];
        const divisor = event.shiftKey ? 10 : 1;
        cursor.x = round(Math.max(0, Math.min(state.scale.x * 10, cursor.x + x * state.scale.x / divisor)));
        cursor.y = round(Math.max(0, Math.min(state.scale.y * 10, cursor.y + y * state.scale.y / divisor)));
        drawCursor();
      } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); placePoint(); }
    });
    window.addEventListener('pagehide', cancelSpeech);
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelSpeech(); });
  }

  document.querySelectorAll('[data-copy]').forEach(node => { node.textContent = T[node.dataset.copy]; });
  document.title = T.pageTitle;
  document.querySelector('meta[name="description"]').content = T.description;
  DATA.labs.forEach(item => $('gl-lab').append(new Option(item.name, item.id)));
  initializeWords();
  bindEvents();
  startLab(lab.id);
})();
