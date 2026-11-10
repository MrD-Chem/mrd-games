/* Particle Count Dash - game.js
   Part 1 (top): pure functions with no page code. They make questions, count particles,
   read charges, check answers and score points. They also run in Node for testing.
   Part 2 (bottom): the screens, buttons and timer. It only runs inside a web page. */
(function (root) {
  'use strict';

  var D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.PD_DATA;
  var T = D.TEXT, ELEMENTS = D.ELEMENTS, ALL = D.ALL, LEVELS = D.LEVELS;
  var MINUS = '−';          // a real minus sign, used when we show a negative charge
  var RETRY_POINTS = 50;         // points for a correct answer on the second try
  var STORE_KEY = 'mrd-particle-dash';

  /* ================= PART 1: PURE FUNCTIONS ================= */

  // ---- small helpers ----
  function fill(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (m, k) { return vars && k in vars ? vars[k] : m; });
  }
  function pick(arr, rnd) { return arr[Math.floor(rnd() * arr.length)]; }
  function elementByZ(Z) { return ALL[Z - 1]; }
  function curatedByZ(Z) {
    for (var i = 0; i < ELEMENTS.length; i++) if (ELEMENTS[i].Z === Z) return ELEMENTS[i];
    return null;
  }
  // Ions we can ask about: the atom must keep at least 1 electron (so no H+).
  function validIons(el) { return el.ions.filter(function (c) { return el.Z - c >= 1; }); }

  // ---- the core idea: count particles ----
  // protons = Z, neutrons = A - Z, electrons = protons - charge
  function countParticles(Z, A, charge) {
    return { p: Z, n: A - Z, e: Z - charge };
  }

  // ---- charge text ----
  // 0 -> "", +1 -> "+", -1 -> "−", +3 -> "3+", -2 -> "2−"
  function chargeText(c) {
    if (!c) return '';
    var m = Math.abs(c), s = c > 0 ? '+' : MINUS;
    return m === 1 ? s : m + s;
  }
  // always with a number: "1+", "2−" (used next to hyphen notation)
  function chargeLong(c) { return Math.abs(c) + (c > 0 ? '+' : MINUS); }

  // Read what a student typed as a charge. Returns an integer, or null if it can't be read.
  // OK: "", "0", "2+", "+2", "2-", "-2", "+", "-", "−" (unicode minus), spaces.
  function parseCharge(str) {
    var s = String(str == null ? '' : str).replace(/[\s ]/g, '').replace(/[−–—‒]/g, '-');
    if (s === '') return 0;
    var m = /^([+-]?)(\d{0,2})([+-]?)$/.exec(s);
    if (!m) return null;
    var lead = m[1], digits = m[2], trail = m[3];
    if (lead && trail) return null;                 // "+2+" is not a charge
    var sign = lead || trail;
    if (digits === '') return sign === '+' ? 1 : sign === '-' ? -1 : null;   // "+" or "-" alone
    var n = parseInt(digits, 10);
    if (n === 0) return 0;                          // "0", "+0"
    if (!sign) return null;                         // "2" alone: we need the sign
    return sign === '-' ? -n : n;
  }

  // Whole number from a text box, or null.
  function parseCount(str) {
    var s = String(str == null ? '' : str).trim();
    return /^\d{1,3}$/.test(s) ? parseInt(s, 10) : null;
  }

  // Normalise a typed symbol: "fE " -> "Fe". Returns null if it is not a real symbol.
  function parseSymbol(str) {
    var s = String(str == null ? '' : str).trim();
    if (!/^[A-Za-z]{1,2}$/.test(s)) return null;
    s = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    for (var i = 0; i < ALL.length; i++) if (ALL[i].sym === s) return s;
    return null;
  }

  // ---- notation (how a particle is written) ----
  // spec = { Z, A, charge, format }, format: 'full' | 'hyphenSym' | 'hyphenName' | 'massOnly'
  function notationText(spec) {
    var el = elementByZ(spec.Z), chg = spec.charge ? ' ' + chargeLong(spec.charge) : '';
    if (spec.format === 'hyphenName') return el.name.toLowerCase() + '-' + spec.A + chg;
    if (spec.format === 'hyphenSym') return el.sym + '-' + spec.A + chg;
    return spec.A + (spec.format === 'full' ? ' ' + spec.Z : '') + ' ' + el.sym + (spec.charge ? chargeText(spec.charge) : '');
  }
  function notationHTML(spec) {
    var el = elementByZ(spec.Z);
    if (spec.format === 'hyphenSym' || spec.format === 'hyphenName') {
      return '<span class="pd-hy">' + notationText(spec) + '</span>';
    }
    var z = spec.format === 'full' ? '<span class="pd-Z">' + spec.Z + '</span>'
                                   : '<span class="pd-Z pd-blank" aria-hidden="true">0</span>';
    return '<span class="pd-nuc"><span class="pd-nums"><span class="pd-A">' + spec.A + '</span>' + z + '</span>' +
      '<span class="pd-sym">' + el.sym + '</span>' +
      (spec.charge ? '<sup class="pd-chg">' + chargeText(spec.charge) + '</sup>' : '') + '</span>';
  }
  // Words for screen readers
  function notationLabel(spec) {
    var el = elementByZ(spec.Z);
    var chg = spec.charge ? fill(T.chargeSpoken, { c: Math.abs(spec.charge) + ' ' + (spec.charge > 0 ? T.plus : T.minus) }) : T.noCharge;
    if (spec.format === 'full') return fill(T.nuclideLabelFull, { sym: el.sym, A: spec.A, Z: spec.Z, chg: chg });
    if (spec.format === 'massOnly') return fill(T.nuclideLabelMass, { sym: el.sym, A: spec.A, chg: chg });
    return notationText(spec).replace('-', ' dash ').replace(MINUS, ' ' + T.minus).replace('+', ' ' + T.plus);
  }

  // ---- random atoms and ions ----
  function randomParticle(rnd, ion) {
    var pool = ELEMENTS.filter(function (e) { return !ion || validIons(e).length > 0; });
    var el = pick(pool, rnd);
    return { Z: el.Z, A: pick(el.isotopes, rnd), charge: ion ? pick(validIons(el), rnd) : 0 };
  }
  function withFormat(p, format) { return { Z: p.Z, A: p.A, charge: p.charge, format: format }; }
  function randomFormat(rnd, charge) {
    return pick(charge ? ['full', 'hyphenSym', 'massOnly'] : ['full', 'hyphenSym', 'hyphenName', 'massOnly'], rnd);
  }

  // ---- questions ----
  // A "count" question: read a particle, give p, n, e.
  function makeCount(rnd, level, ion, format) {
    var p = randomParticle(rnd, ion);
    if (format === 'hyphenName' && p.charge) format = 'hyphenSym';
    var spec = withFormat(p, format);
    return { kind: 'count', level: level, spec: spec, answer: countParticles(p.Z, p.A, p.charge),
             key: 'c' + notationText(spec) };
  }
  // A "build" question: given p, n, e, write symbol, A and charge.
  function makeBuild(rnd) {
    var p = randomParticle(rnd, rnd() < 0.5);
    var c = countParticles(p.Z, p.A, p.charge);
    return { kind: 'build', level: 4, counts: c, symbol: elementByZ(p.Z).sym, A: p.A, charge: p.charge,
             spec: withFormat(p, 'full'), key: 'b' + p.Z + '-' + p.A + '-' + p.charge };
  }

  // Decide how two particles relate. Returns 'isotopes' | 'atomion' | 'different' | 'same' | null.
  function classifyPair(a, b) {
    if (a.Z !== b.Z) return 'different';
    if (a.A === b.A && a.charge === b.charge) return 'same';
    if (a.A !== b.A && a.charge === 0 && b.charge === 0) return 'isotopes';
    if (a.A === b.A && ((a.charge === 0) !== (b.charge === 0))) return 'atomion';
    return null;   // not one of our four answers, never asked
  }

  // Pairs used for "different elements" traps, built once from the curated data.
  var SAME_MASS = [];        // different elements with a shared mass number (C-14 / N-14)
  var SAME_ELECTRONS = [];   // an ion and a neutral atom with equal electrons (Na+ / Ne)
  (function buildTraps() {
    var i, j, k;
    for (i = 0; i < ELEMENTS.length; i++) {
      for (j = i + 1; j < ELEMENTS.length; j++) {
        for (k = 0; k < ELEMENTS[i].isotopes.length; k++) {
          if (ELEMENTS[j].isotopes.indexOf(ELEMENTS[i].isotopes[k]) >= 0) {
            SAME_MASS.push([{ Z: ELEMENTS[i].Z, A: ELEMENTS[i].isotopes[k], charge: 0 },
                            { Z: ELEMENTS[j].Z, A: ELEMENTS[i].isotopes[k], charge: 0 }]);
          }
        }
      }
      validIons(ELEMENTS[i]).forEach(function (c) {
        var other = curatedByZ(ELEMENTS[i].Z - c);
        if (other) SAME_ELECTRONS.push({ el: ELEMENTS[i], charge: c, other: other });
      });
    }
  })();

  function pairForCategory(cat, rnd) {
    var a, b, el, isos, A1, A2, t;
    if (cat === 'isotopes') {
      el = pick(ELEMENTS.filter(function (e) { return e.isotopes.length >= 2; }), rnd);
      isos = el.isotopes.slice();
      A1 = pick(isos, rnd); isos.splice(isos.indexOf(A1), 1); A2 = pick(isos, rnd);
      return [{ Z: el.Z, A: A1, charge: 0 }, { Z: el.Z, A: A2, charge: 0 }];
    }
    if (cat === 'atomion') {
      el = pick(ELEMENTS.filter(function (e) { return validIons(e).length > 0; }), rnd);
      A1 = pick(el.isotopes, rnd);
      return [{ Z: el.Z, A: A1, charge: 0 }, { Z: el.Z, A: A1, charge: pick(validIons(el), rnd) }];
    }
    if (cat === 'same') {
      a = randomParticle(rnd, rnd() < 0.4);
      return [a, { Z: a.Z, A: a.A, charge: a.charge }];
    }
    // different elements: mass-number trap, electron-count trap, or just two elements
    t = rnd();
    if (t < 0.4) return pick(SAME_MASS, rnd).map(function (p) { return { Z: p.Z, A: p.A, charge: p.charge }; });
    if (t < 0.8) {
      var s = pick(SAME_ELECTRONS, rnd);
      return [{ Z: s.el.Z, A: pick(s.el.isotopes, rnd), charge: s.charge },
              { Z: s.other.Z, A: pick(s.other.isotopes, rnd), charge: 0 }];
    }
    do { a = randomParticle(rnd, rnd() < 0.3); b = randomParticle(rnd, rnd() < 0.3); } while (a.Z === b.Z);
    return [a, b];
  }

  // A "compare" question: two particles, choose one of four answers.
  function makeCompare(rnd) {
    var cat = pick(['isotopes', 'atomion', 'different', 'same'], rnd);
    var pair = pairForCategory(cat, rnd);
    if (rnd() < 0.5) pair = [pair[1], pair[0]];
    var fa = randomFormat(rnd, pair[0].charge), fb = randomFormat(rnd, pair[1].charge);
    var a, b, guard = 0;
    do {
      fb = randomFormat(rnd, pair[1].charge);
      a = withFormat(pair[0], fa); b = withFormat(pair[1], fb);
      guard++;
      // for "same", the two written forms must look different
    } while (cat === 'same' && notationText(a) === notationText(b) && guard < 50);
    return { kind: 'compare', level: 5, a: a, b: b, answer: classifyPair(a, b),
             key: 'x' + notationText(a) + '|' + notationText(b) };
  }

  var SPRINT_TYPES = [
    function (r) { return makeCount(r, 1, false, 'full'); },
    function (r) { return makeCount(r, 2, true, 'full'); },
    function (r) { return makeCount(r, 3, r() < 0.5, pick(['hyphenName', 'hyphenSym', 'massOnly'], r)); }
  ];

  // Make one question for a level id (1-6). `seen` is an object of keys already used (avoids repeats).
  function makeQuestion(levelId, rnd, seen) {
    rnd = rnd || Math.random;
    var q, tries = 0;
    do {
      switch (levelId) {
        case 1: q = makeCount(rnd, 1, false, 'full'); break;
        case 2: q = makeCount(rnd, 2, true, 'full'); break;
        case 3: q = makeCount(rnd, 3, rnd() < 0.5, pick(['hyphenName', 'hyphenSym', 'massOnly'], rnd)); break;
        case 4: q = makeBuild(rnd); break;
        case 5: q = makeCompare(rnd); break;
        default: q = pick(SPRINT_TYPES, rnd)(rnd);
      }
      tries++;
    } while (seen && seen[q.key] && tries < 40);
    if (seen) seen[q.key] = true;
    return q;
  }

  // ---- checking answers ----
  // input = { p, n, e } as typed strings. Returns which boxes are right.
  function checkCount(q, input) {
    var r = {
      p: parseCount(input.p) === q.answer.p,
      n: parseCount(input.n) === q.answer.n,
      e: parseCount(input.e) === q.answer.e
    };
    r.ok = r.p && r.n && r.e;
    return r;
  }
  // input = { symbol, A, charge } as typed strings.
  function checkBuild(q, input) {
    var sym = parseSymbol(input.symbol);
    var r = {
      symbol: sym === q.symbol,
      A: parseCount(input.A) === q.A,
      charge: parseCharge(input.charge) === q.charge
    };
    r.ok = r.symbol && r.A && r.charge;
    return r;
  }
  function checkCompare(q, choice) { return choice === q.answer; }

  // ---- targeted hints: look at the specific mistake ----
  function hintsForCount(q, input, res) {
    var hints = [], a = q.answer, c = q.spec.charge;
    var p = parseCount(input.p), n = parseCount(input.n), e = parseCount(input.e);
    if (!res.p) hints.push(q.spec.format === 'full' ? T.hintProtonsFull : T.hintProtonsNoZ);
    if (!res.n) hints.push(n === q.spec.A ? T.hintNeutronsIsA : T.hintNeutrons);
    if (!res.e) {
      if (c === 0) hints.push(T.hintElectronsNeutral);
      else if (e === a.p + c && c > 0) hints.push(T.hintElectronsLost);
      else if (e === a.p + c && c < 0) hints.push(T.hintElectronsGained);
      else if (e === a.p) hints.push(T.hintElectronsIon);
      else hints.push(T.hintElectronsGeneral);
    }
    return hints;
  }
  function hintsForBuild(q, input, res) {
    var hints = [], pC = parseCount(input.A), ch = parseCharge(input.charge), c = q.counts;
    if (!res.symbol) hints.push(parseSymbol(input.symbol) === null && String(input.symbol).trim() !== ''
      ? T.hintBuildSymbolFormat : T.hintBuildSymbol);
    if (!res.A) hints.push(pC === c.n ? T.hintBuildMassIsN : T.hintBuildMass);
    if (!res.charge) {
      if (ch === null) hints.push(T.hintBuildChargeFormat);
      else if (q.charge === 0) hints.push(T.hintBuildChargeNeutral);
      else if (ch === -q.charge) hints.push(T.hintBuildChargeSign);
      else hints.push(T.hintBuildCharge);
    }
    return hints;
  }
  function hintForCompare(q, choice) {
    var a = q.a, b = q.b;
    if (choice === 'different') return T.hintCmpDifferentWrong;
    if (choice === 'same') return T.hintCmpSameWrong;
    if (choice === 'isotopes') {
      if (a.Z !== b.Z) return T.hintCmpIsoProtons;
      if (a.A === b.A) return T.hintCmpIsoNeutrons;
      return T.hintCmpIsoCharge;
    }
    if (a.Z !== b.Z) return T.hintCmpAtomIonProtons;
    if (a.A !== b.A) return T.hintCmpAtomIonNeutrons;
    return T.hintCmpAtomIonElectrons;
  }

  // ---- worked lines ----
  function bracketed(n) { return n < 0 ? '(' + MINUS + Math.abs(n) + ')' : String(n); }
  function workedLine(q) {
    var el, a;
    if (q.kind === 'count') {
      el = elementByZ(q.spec.Z); a = q.answer;
      return fill(T.workedCount, { Z: q.spec.Z, A: q.spec.A, p: a.p, n: a.n, e: a.e, c: bracketed(q.spec.charge) }) +
        (q.spec.format === 'full' ? '' : fill(T.workedCountName, { name: el.name.toLowerCase() }));
    }
    if (q.kind === 'build') {
      el = elementByZ(q.spec.Z);
      return fill(T.workedBuild, { p: q.counts.p, n: q.counts.n, e: q.counts.e, A: q.A, sym: el.sym,
        name: el.name.toLowerCase(), chg: q.charge < 0 ? MINUS + Math.abs(q.charge) : String(q.charge) });
    }
    var why = T.compareWhy[q.answer];
    var pa = countParticles(q.a.Z, q.a.A, q.a.charge), pb = countParticles(q.b.Z, q.b.A, q.b.charge);
    if (q.answer === 'different') {
      if (q.a.A === q.b.A) why += ' ' + T.compareTrapMass;
      else if (pa.e === pb.e) why += ' ' + T.compareTrapElectrons;
    }
    return why;
  }
  function particleCounts(spec) { return countParticles(spec.Z, spec.A, spec.charge); }

  // ---- scoring ----
  function speedBonus(ms) { return Math.round(50 * Math.max(0, 1 - ms / 20000)); }   // 50 down to 0 over 20 s
  function multiplier(streakBefore) { return streakBefore >= 6 ? 2 : streakBefore >= 3 ? 1.5 : 1; }
  function pointsFirstTry(ms, streakBefore) { return Math.round((100 + speedBonus(ms)) * multiplier(streakBefore)); }
  function starsFor(levelDef, firstTry) {
    var t = levelDef.stars;
    return firstTry >= t[2] ? 3 : firstTry >= t[1] ? 2 : firstTry >= t[0] ? 1 : 0;
  }

  // ---- periodic table layout (row and column for each atomic number) ----
  // Rows 1-7 are the main table. Rows 9 and 10 hold the f-block (lanthanides, actinides).
  function tablePosition(Z) {
    if (Z === 1) return { row: 1, col: 1 };
    if (Z === 2) return { row: 1, col: 18 };
    if (Z <= 4) return { row: 2, col: Z - 2 };
    if (Z <= 10) return { row: 2, col: Z + 8 };
    if (Z <= 12) return { row: 3, col: Z - 10 };
    if (Z <= 18) return { row: 3, col: Z };
    if (Z <= 36) return { row: 4, col: Z - 18 };
    if (Z <= 54) return { row: 5, col: Z - 36 };
    if (Z <= 56) return { row: 6, col: Z - 54 };
    if (Z <= 71) return { row: 9, col: Z - 57 + 3 };
    if (Z <= 86) return { row: 6, col: Z - 68 };
    if (Z <= 88) return { row: 7, col: Z - 86 };
    if (Z <= 103) return { row: 10, col: Z - 89 + 3 };
    return { row: 7, col: Z - 100 };
  }

  // ---- saving (localStorage, every access guarded) ----
  // data shape: { levels: { "1": { best: 1234, stars: 2 }, ... } }
  function createStore(getStorage) {
    var memory = { levels: {} };
    function storage() { try { return getStorage(); } catch (e) { return null; } }
    function load() {
      var data = { levels: {} };
      try {
        var s = storage(), raw = s && s.getItem(STORE_KEY), parsed = raw ? JSON.parse(raw) : null;
        if (parsed && parsed.levels && typeof parsed.levels === 'object') {
          Object.keys(parsed.levels).forEach(function (k) {
            var v = parsed.levels[k] || {};
            data.levels[k] = { best: Math.max(0, Number(v.best) || 0), stars: Math.min(3, Math.max(0, Number(v.stars) || 0)) };
          });
        }
      } catch (e) { /* storage blocked or broken: start fresh */ }
      return data;
    }
    function save(data) {
      memory = data;
      try { var s = storage(); if (s) s.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    }
    var cache = load();
    return {
      get: function (id) { return cache.levels[id] || { best: 0, stars: 0 }; },
      // Save a finished run. Returns true if the score is a new best.
      record: function (id, score, stars) {
        var old = cache.levels[id] || { best: 0, stars: 0 };
        var isBest = score > old.best;
        cache.levels[id] = { best: Math.max(old.best, score), stars: Math.max(old.stars, stars) };
        save(cache);
        return isBest;
      },
      _memory: function () { return memory; }
    };
  }

  var PD = {
    countParticles: countParticles, parseCharge: parseCharge, parseCount: parseCount, parseSymbol: parseSymbol,
    chargeText: chargeText, notationText: notationText, notationHTML: notationHTML, notationLabel: notationLabel,
    makeQuestion: makeQuestion, classifyPair: classifyPair,
    checkCount: checkCount, checkBuild: checkBuild, checkCompare: checkCompare,
    hintsForCount: hintsForCount, hintsForBuild: hintsForBuild, hintForCompare: hintForCompare,
    workedLine: workedLine, particleCounts: particleCounts,
    speedBonus: speedBonus, multiplier: multiplier, pointsFirstTry: pointsFirstTry, starsFor: starsFor,
    tablePosition: tablePosition, createStore: createStore, RETRY_POINTS: RETRY_POINTS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = PD; }
  if (typeof document === 'undefined') return;

  /* ================= PART 2: THE PAGE ================= */

  var $ = function (id) { return document.getElementById(id); };
  function h(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  function init() {
    var store = createStore(function () { return window.localStorage; });
    var state = null, timerId = null;
    var screens = { start: $('pd-start'), play: $('pd-play'), end: $('pd-end') };
    var el = {
      levels: $('pd-levels'), hudLevel: $('pd-hud-level'), hudQ: $('pd-hud-q'), hudScore: $('pd-hud-score'),
      hudStreak: $('pd-hud-streak'), card: $('pd-card'), fx: $('pd-fx'), hudStreakBox: $('pd-hud-streak-box'), hudTime: $('pd-hud-time'),
      hudTimeLabel: $('pd-hud-time-label'), prompt: $('pd-prompt'), display: $('pd-display'),
      form: $('pd-form'), fields: $('pd-fields'), options: $('pd-options'), check: $('pd-check'),
      next: $('pd-next'), feedback: $('pd-feedback'), formula: $('pd-formula'), helperBtn: $('pd-helper-btn'),
      leave: $('pd-leave'), dialog: $('pd-pt'), grid: $('pd-pt-grid'), readout: $('pd-pt-readout'),
      endTitle: $('pd-end-title'), endScore: $('pd-end-score'), endFirst: $('pd-end-first'),
      endStars: $('pd-end-stars'), endBest: $('pd-end-best'), review: $('pd-review'),
      reviewTitle: $('pd-review-title'), again: $('pd-again'), choose: $('pd-choose')
    };

    // Fill all fixed text from data.js
    Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (n) {
      var v = T[n.getAttribute('data-copy')];
      if (typeof v === 'string') n.textContent = v;
    });

    function show(name, quiet) {
      Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== name; });
      if (quiet) return;
      var heading = screens[name].querySelector('[data-focus]');
      if (heading) heading.focus();
      window.scrollTo(0, 0);
    }
    function starString(n) { return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n); }

    /* ---- start screen ---- */
    function renderLevels() {
      el.levels.textContent = '';
      LEVELS.forEach(function (def) {
        var rec = store.get(def.id);
        var best = rec.best ? fill(T.bestLabel, { n: rec.best }) : T.noBest;
        var li = h('li');
        var b = h('button', 'pd-level panel');
        b.type = 'button';
        b.setAttribute('data-level', def.id);
        b.setAttribute('aria-label', fill(T.ariaLevelCard, {
          name: def.name, blurb: def.blurb, best: best, stars: fill(T.starsLabel, { n: rec.stars }) }));
        b.appendChild(h('span', 'pd-level-num', String(def.id)));
        b.appendChild(h('span', 'pd-level-name', def.name));
        b.appendChild(h('span', 'pd-level-blurb', def.blurb));
        b.appendChild(h('span', 'pd-level-count', def.count ? fill(T.questionsLabel, { n: def.count }) : T.sprintLabel));
        var meta = h('span', 'pd-level-meta');
        var st = h('span', 'pd-stars', starString(rec.stars)); st.setAttribute('aria-hidden', 'true');
        meta.appendChild(st); meta.appendChild(h('span', 'pd-level-best', best));
        b.appendChild(meta);
        li.appendChild(b); el.levels.appendChild(li);
      });
    }
    el.levels.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-level]');
      if (b) startLevel(Number(b.getAttribute('data-level')));
    });

    /* ---- timer: runs only while a level is on screen ---- */
    function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
    function startTimer() { stopTimer(); timerId = setInterval(tick, 1000); }
    function fmt(sec) { sec = Math.max(0, sec); return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); }
    function tick() {
      if (!state) return stopTimer();
      var elapsed = Math.floor((Date.now() - state.t0) / 1000);
      if (state.def.seconds) {
        var left = state.def.seconds - elapsed;
        el.hudTime.textContent = fmt(left);
        el.hudTime.classList.toggle('pd-low', left <= 10);
        if (left <= 0) finish(true);
      } else {
        el.hudTime.textContent = fmt(elapsed);
      }
    }

    /* ---- HUD ---- */
    function pop(node) {
      node.classList.remove('pd-pop'); void node.offsetWidth; node.classList.add('pd-pop');
    }
    el.hudScore.addEventListener('animationend', function () { el.hudScore.classList.remove('pd-pop'); });
    function updateHud() {
      var s = state;
      el.hudLevel.textContent = s.def.name;
      el.hudQ.textContent = s.def.count ? fill(T.hudQuestion, { n: s.idx, t: s.def.count }) : fill(T.hudQuestionOpen, { n: s.idx });
      el.hudScore.textContent = String(s.score);
      var m = multiplier(s.streak);
      el.hudStreak.textContent = s.streak + (m > 1 ? ' ×' + m : '');
      el.hudStreakBox.classList.toggle('pd-hot', s.streak >= 3);
      el.hudStreakBox.classList.toggle('pd-hotter', s.streak >= 6);
      // The question card glows while a streak is going (static glow, no loop).
      el.card.classList.toggle('pd-card--hot', s.streak >= 3);
      el.card.classList.toggle('pd-card--hotter', s.streak >= 6);
      el.hudTimeLabel.textContent = s.def.seconds ? T.hudTimeLeft : T.hudTime;
      tick();
    }
    /* ---- streak effects ----
       A burst of protons (+), neutrons and electrons (−) flies out of the symbol for every
       correct answer from 2 in a row on (bigger streak = bigger burst). At 3, 6, 10 and then
       every 5 in a row, a banner pops up. Everything removes itself when its animation ends,
       and nothing moves for students who turn on "reduce motion". */
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function streakBanner(n) {
      if (n === 3) return fill(T.streak3, { n: n });
      if (n === 6) return fill(T.streak6, { n: n });
      if (n === 10) return fill(T.streak10, { n: n });
      if (n > 10 && n % 5 === 0) return fill(T.streakMore, { n: n });
      return '';
    }
    function burst(n) {
      if (calm || !el.fx.animate) return;
      var card = el.card.getBoundingClientRect(), box = el.display.getBoundingClientRect();
      var ox = box.left - card.left + box.width / 2, oy = box.top - card.top + box.height / 2;
      var count = Math.min(10 + n * 3, 40), reach = Math.min(card.width / 2, 120 + n * 18);
      var kinds = ['pd-p', 'pd-n', 'pd-e'], marks = ['+', '', '−'];
      for (var i = 0; i < count; i++) {
        var k = i % 3, dot = h('span', 'pd-particle ' + kinds[k], marks[k]);
        dot.style.left = ox + 'px'; dot.style.top = oy + 'px';
        el.fx.appendChild(dot);
        var angle = Math.random() * Math.PI * 2;
        var dist = reach * (k === 2 ? 0.75 + Math.random() * 0.45 : 0.35 + Math.random() * 0.45);
        var dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist * 0.7;
        dot.animate([
          { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 1 },
          { transform: 'translate(calc(-50% + ' + dx * 0.7 + 'px), calc(-50% + ' + dy * 0.7 + 'px)) scale(1.15)', opacity: 1, offset: 0.6 },
          { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(0.6)', opacity: 0 }
        ], { duration: 750 + Math.random() * 450, easing: 'cubic-bezier(.15,.7,.3,1)' }).onfinish = (function (d) {
          return function () { d.remove(); };
        })(dot);
      }
    }
    function showBanner(text, kind) {
      var old = el.fx.querySelector('.pd-banner'); if (old) old.remove();
      var b = h('div', 'pd-banner pd-banner--' + kind, text);
      // Sit on the symbol (lower half), so it never covers the answer boxes.
      var card = el.card.getBoundingClientRect(), box = el.display.getBoundingClientRect();
      b.style.top = (box.top - card.top + box.height * 0.72) + 'px';
      el.fx.appendChild(b);
      var frames = calm
        ? [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }]
        : [{ opacity: 0, transform: 'translate(-50%, -50%) scale(0.4) rotate(-6deg)' },
           { opacity: 1, transform: 'translate(-50%, -50%) scale(1.12) rotate(2deg)', offset: 0.15 },
           { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0.25 },
           { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0.8 },
           { opacity: 0, transform: 'translate(-50%, -80%) scale(0.95)' }];
      if (b.animate) b.animate(frames, { duration: 1800, easing: 'ease-out' }).onfinish = function () { b.remove(); };
      else setTimeout(function () { b.remove(); }, 1800);
    }
    function celebrate(n) {
      if (n >= 2) burst(n);
      var text = streakBanner(n);
      if (text) {
        showBanner(text, n >= 10 ? 'max' : n >= 6 ? 'hotter' : 'hot');
        // Screen readers hear the milestone too (the banner itself is decorative).
        el.feedback.appendChild(h('p', 'sr-only', text));
      }
    }
    function streakLost(was) {
      if (was < 3) return;
      showBanner(T.streakLost, 'lost');
      if (!calm && el.hudStreakBox.animate) {
        el.hudStreakBox.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
          { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 400 });
      }
    }

    function addScore(pts) {
      state.score += pts; el.hudScore.textContent = String(state.score); pop(el.hudScore);
    }

    /* ---- starting and ending a level ---- */
    function startLevel(id) {
      var def = LEVELS[id - 1];
      state = { def: def, idx: 0, score: 0, streak: 0, firstTry: 0, missed: [], seen: {}, q: null,
                attempts: 0, phase: '', t0: Date.now(), qStart: 0, ended: false };
      el.helperBtn.hidden = !def.helper;
      show('play');
      startTimer();
      nextQuestion();
    }
    function finish(timeUp) {
      if (!state || state.ended) return;
      state.ended = true; stopTimer();
      var s = state, stars = starsFor(s.def, s.firstTry);
      var isBest = store.record(s.def.id, s.score, stars) && s.score > 0;
      el.endTitle.textContent = timeUp ? T.endTimeUp : T.endLevelDone;
      el.endScore.textContent = String(s.score);
      el.endFirst.textContent = s.def.count ? fill(T.endFirstTry, { n: s.firstTry, t: s.def.count })
                                            : fill(T.endFirstTrySprint, { n: s.firstTry });
      el.endStars.textContent = starString(stars);
      el.endStars.setAttribute('aria-label', fill(T.starsLabel, { n: stars }));
      el.endBest.hidden = !isBest;
      el.reviewTitle.textContent = T.reviewTitle;
      el.review.textContent = '';
      if (!s.missed.length) el.review.appendChild(h('li', 'pd-review-none', T.reviewNone));
      s.missed.forEach(function (q) {
        var li = h('li', 'pd-review-item');
        var d = h('div', 'pd-review-q'); d.innerHTML = displayHTML(q);
        li.appendChild(d);
        var a = h('p', 'pd-review-a'); a.innerHTML = '<strong>' + T.answerLabel + ':</strong> ' + answerHTML(q);
        li.appendChild(a);
        li.appendChild(h('p', 'pd-worked', workedLine(q)));
        el.review.appendChild(li);
      });
      renderLevels();
      show('end');
    }
    function leave() { stopTimer(); state = null; renderLevels(); show('start'); }
    el.leave.addEventListener('click', leave);
    el.choose.addEventListener('click', leave);
    el.again.addEventListener('click', function () { startLevel(state.def.id); });

    /* ---- showing a question ---- */
    // Notation (or counts) for a question, as HTML
    function displayHTML(q) {
      if (q.kind === 'count') return '<span class="pd-notation" role="img" aria-label="' + notationLabel(q.spec) + '">' + notationHTML(q.spec) + '</span>';
      if (q.kind === 'build') return '<span class="pd-counts">' + fill(T.buildCounts, q.counts) + '</span>';
      return '<span class="pd-pair"><span role="img" aria-label="' + notationLabel(q.a) + '">' + notationHTML(q.a) +
        '</span><span class="pd-vs" aria-hidden="true">vs</span><span role="img" aria-label="' + notationLabel(q.b) + '">' + notationHTML(q.b) + '</span></span>';
    }
    function answerHTML(q) {
      if (q.kind === 'count') return fill(T.answerCounts, q.answer);
      if (q.kind === 'build') return notationHTML({ Z: q.spec.Z, A: q.A, charge: q.charge, format: 'full' });
      return T.options[q.answer];
    }
    function countsTable(q) {
      var t = h('table', 'pd-table');
      t.appendChild(h('caption', 'pd-sr', T.tableCaption));
      var head = h('tr');
      [T.tableParticle, T.tableP, T.tableN, T.tableE].forEach(function (x) { var th = h('th', null, x); th.scope = 'col'; head.appendChild(th); });
      t.appendChild(head);
      [q.a, q.b].forEach(function (sp, i) {
        var c = particleCounts(sp), tr = h('tr'), th = h('th'); th.scope = 'row';
        th.innerHTML = '<span class="pd-table-n">' + (i + 1) + '</span> ' + notationHTML(sp);
        tr.appendChild(th);
        [c.p, c.n, c.e].forEach(function (v) { tr.appendChild(h('td', null, String(v))); });
        t.appendChild(tr);
      });
      return t;
    }

    function inputField(id, label, opts) {
      var wrap = h('div', 'pd-field');
      var lab = h('label', null, label); lab.setAttribute('for', id);
      var inp = h('input', 'pd-input'); inp.id = id; inp.type = 'text';
      inp.autocomplete = 'off'; inp.autocapitalize = 'off'; inp.spellcheck = false;
      if (opts.numeric) { inp.setAttribute('inputmode', 'numeric'); inp.setAttribute('pattern', '[0-9]*'); inp.maxLength = 3; }
      if (opts.placeholder) inp.placeholder = opts.placeholder;
      if (opts.maxLength) inp.maxLength = opts.maxLength;
      var note = h('span', 'pd-note'); note.id = id + '-note';
      inp.setAttribute('aria-describedby', note.id);
      wrap.appendChild(lab); wrap.appendChild(inp); wrap.appendChild(note);
      return wrap;
    }

    function nextQuestion() {
      var s = state;
      if (s.def.count && s.idx >= s.def.count) return finish(false);
      s.idx++;
      s.q = makeQuestion(s.def.id, Math.random, s.seen);
      s.attempts = 0; s.phase = 'answering'; s.qStart = Date.now();
      var q = s.q;
      el.feedback.textContent = ''; el.feedback.className = 'pd-feedback';
      el.next.hidden = true;
      el.fields.textContent = ''; el.options.textContent = '';
      el.display.innerHTML = displayHTML(q);
      el.display.className = 'pd-display pd-display--' + q.kind;
      var first;
      if (q.kind === 'count') {
        el.prompt.textContent = q.spec.charge ? T.promptIon : T.promptAtom;
        el.formula.textContent = T.formulaCount;
        el.fields.appendChild(inputField('pd-in-p', T.protons, { numeric: true }));
        el.fields.appendChild(inputField('pd-in-n', T.neutrons, { numeric: true }));
        el.fields.appendChild(inputField('pd-in-e', T.electrons, { numeric: true }));
        first = $('pd-in-p');
      } else if (q.kind === 'build') {
        el.prompt.textContent = T.promptBuild;
        el.formula.textContent = T.formulaBuild;
        el.fields.appendChild(inputField('pd-in-symbol', T.symbol, { placeholder: T.symbolPlaceholder, maxLength: 2 }));
        el.fields.appendChild(inputField('pd-in-A', T.massNumber, { numeric: true }));
        el.fields.appendChild(inputField('pd-in-charge', T.charge, { placeholder: T.chargePlaceholder, maxLength: 4 }));
        el.fields.appendChild(h('p', 'pd-help', T.buildHelp));
        first = $('pd-in-symbol');
      } else {
        el.prompt.textContent = T.promptCompare;
        el.formula.textContent = T.formulaCompare;
        ['isotopes', 'atomion', 'different', 'same'].forEach(function (id) {
          var b = h('button', 'pd-option btn btn-ghost', T.options[id]);
          b.type = 'button'; b.setAttribute('data-option', id);
          b.appendChild(h('span', 'pd-mark'));
          el.options.appendChild(b);
        });
        first = el.options.firstChild;
      }
      el.form.hidden = q.kind === 'compare';
      el.options.hidden = q.kind !== 'compare';
      el.check.hidden = false;
      updateHud();
      if (first) first.focus();
    }

    /* ---- answering ---- */
    function readInputs() {
      var q = state.q;
      if (q.kind === 'count') return { p: $('pd-in-p').value, n: $('pd-in-n').value, e: $('pd-in-e').value };
      return { symbol: $('pd-in-symbol').value, A: $('pd-in-A').value, charge: $('pd-in-charge').value };
    }
    function markFields(res) {
      Object.keys(res).forEach(function (k) {
        if (k === 'ok') return;
        var id = 'pd-in-' + k;
        var inp = $(id), note = $(id + '-note');
        inp.classList.toggle('pd-wrong', !res[k]); inp.classList.toggle('pd-right', !!res[k]);
        if (res[k]) inp.removeAttribute('aria-invalid'); else inp.setAttribute('aria-invalid', 'true');
        note.textContent = res[k] ? T.fieldOk : T.fieldBad;
      });
    }
    function setFeedback(kind, headline, hints) {
      el.feedback.textContent = '';
      el.feedback.className = 'pd-feedback pd-fb-' + kind;
      el.feedback.appendChild(h('p', 'pd-fb-head', headline));
      (hints || []).forEach(function (t) { el.feedback.appendChild(h('p', 'pd-hint', t)); });
    }
    function appendAnswer() {
      var q = state.q;
      var a = h('p', 'pd-answer'); a.innerHTML = '<strong>' + T.answerLabel + ':</strong> ' + answerHTML(q);
      el.feedback.appendChild(a);
      el.feedback.appendChild(h('p', 'pd-worked', workedLine(q)));
      if (q.kind === 'compare') el.feedback.appendChild(countsTable(q));
    }
    function endQuestion() {
      var s = state;
      s.phase = 'done';
      Array.prototype.forEach.call(el.fields.querySelectorAll('input'), function (i) { i.readOnly = true; });
      Array.prototype.forEach.call(el.options.children, function (b) { b.setAttribute('aria-disabled', 'true'); });
      el.check.hidden = true;
      el.next.textContent = s.def.count && s.idx >= s.def.count ? T.seeResults : T.next;
      el.next.hidden = false;
      el.next.focus();
    }

    // Common to all question types: ok = was the answer right, hints = list of hint strings
    function resolve(ok, hints) {
      var s = state, first = s.attempts === 0, sprint = !!s.def.seconds;
      if (ok) {
        var pts, msg;
        if (first) {
          var mult = multiplier(s.streak);
          pts = pointsFirstTry(Date.now() - s.qStart, s.streak);
          s.streak++; s.firstTry++;
          msg = fill(mult > 1 ? T.feedbackCorrectBonus : T.feedbackCorrect, { pts: pts, mult: mult });
        } else {
          pts = RETRY_POINTS; s.streak = 0;
          msg = fill(T.feedbackRetryCorrect, { pts: pts });
        }
        addScore(pts); updateHud();
        setFeedback('good', msg); appendAnswer(); endQuestion();
        if (first) celebrate(s.streak);
        return;
      }
      if (first) { s.missed.push(s.q); streakLost(s.streak); s.streak = 0; }
      s.attempts++; updateHud();
      if (sprint || s.attempts >= 2) {
        setFeedback('bad', sprint ? T.feedbackWrongSprint : T.feedbackReveal);
        appendAnswer(); endQuestion();
      } else {
        setFeedback('bad', T.feedbackWrong, hints);
      }
    }

    el.form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var s = state;
      if (!s || s.phase !== 'answering') return;
      var q = s.q, input = readInputs(), res;
      if (q.kind === 'count') {
        var bad = ['p', 'n', 'e'].filter(function (k) { return parseCount(input[k]) === null; });
        if (bad.length) { setFeedback('info', T.feedbackInvalid); $('pd-in-' + bad[0]).focus(); return; }
        res = checkCount(q, input); markFields(res);
        resolve(res.ok, res.ok ? [] : hintsForCount(q, input, res));
      } else {
        if (parseSymbol(input.symbol) === null && !String(input.symbol).trim()) { setFeedback('info', T.feedbackInvalidBuild); $('pd-in-symbol').focus(); return; }
        if (parseCount(input.A) === null) { setFeedback('info', T.feedbackInvalidBuild); $('pd-in-A').focus(); return; }
        res = checkBuild(q, input); markFields(res);
        resolve(res.ok, res.ok ? [] : hintsForBuild(q, input, res));
      }
      if (s.phase === 'answering') {
        var firstBad = el.fields.querySelector('.pd-wrong');
        if (firstBad) firstBad.focus();
      }
    });

    el.options.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-option]'), s = state;
      if (!b || !s || s.phase !== 'answering' || b.getAttribute('aria-disabled') === 'true') return;
      var choice = b.getAttribute('data-option'), ok = checkCompare(s.q, choice);
      b.classList.add(ok ? 'pd-right' : 'pd-wrong');
      b.lastChild.textContent = ok ? T.fieldOk : T.fieldBad;
      if (!ok) b.setAttribute('aria-disabled', 'true');
      var wasFirst = s.attempts === 0;
      resolve(ok, [hintForCompare(s.q, choice)]);
      if (s.phase === 'done') {
        var right = el.options.querySelector('[data-option="' + s.q.answer + '"]');
        if (right && !right.classList.contains('pd-right')) { right.classList.add('pd-right'); right.lastChild.textContent = T.fieldOk; }
        el.next.focus();
      } else if (wasFirst) {
        var nxt = el.options.querySelector('[data-option]:not([aria-disabled="true"])');
        if (nxt) nxt.focus();
      }
    });
    el.next.addEventListener('click', function () { if (state && state.phase === 'done') nextQuestion(); });

    /* ---- periodic table helper ---- */
    var cells = {};          // "row,col" -> element
    (function buildTable() {
      ALL.forEach(function (e) {
        var pos = tablePosition(e.Z);
        var c = h('span', 'pd-pt-cell');
        c.setAttribute('role', 'img');
        c.setAttribute('aria-label', fill(T.helperCell, { Z: e.Z, sym: e.sym, name: e.name }));
        c.title = e.name;
        c.tabIndex = e.Z === 1 ? 0 : -1;
        c.style.gridRow = String(pos.row); c.style.gridColumn = String(pos.col);
        c.appendChild(h('span', 'pd-pt-z', String(e.Z)));
        c.appendChild(h('span', 'pd-pt-s', e.sym));
        c.setAttribute('data-z', e.Z);
        cells[pos.row + ',' + pos.col] = c;
        el.grid.appendChild(c);
      });
      [[6, '57–71'], [7, '89–103']].forEach(function (m) {
        var g = h('span', 'pd-pt-gap', m[1]); g.setAttribute('aria-hidden', 'true');
        g.style.gridRow = String(m[0]); g.style.gridColumn = '3';
        el.grid.appendChild(g);
      });
      el.readout.textContent = T.helperPick;
    })();
    function describe(c) {
      var e = ALL[Number(c.getAttribute('data-z')) - 1];
      el.readout.textContent = fill(T.helperInfo, { name: e.name, sym: e.sym, Z: e.Z });
    }
    el.grid.addEventListener('mouseover', function (ev) { var c = ev.target.closest('.pd-pt-cell'); if (c) describe(c); });
    el.grid.addEventListener('focusin', function (ev) { var c = ev.target.closest('.pd-pt-cell'); if (c) describe(c); });
    el.grid.addEventListener('keydown', function (ev) {
      var c = ev.target.closest('.pd-pt-cell');
      var d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[ev.key];
      if (!c || !d) return;
      ev.preventDefault();
      var pos = tablePosition(Number(c.getAttribute('data-z'))), r = pos.row, col = pos.col, n;
      for (var i = 0; i < 20; i++) {
        r += d[0]; col += d[1];
        if (r < 1 || r > 10 || col < 1 || col > 18) return;
        n = cells[r + ',' + col];
        if (n) { c.tabIndex = -1; n.tabIndex = 0; n.focus(); return; }
      }
    });
    el.helperBtn.addEventListener('click', function () {
      try { el.dialog.showModal(); } catch (e) { el.dialog.setAttribute('open', ''); }
    });
    $('pd-pt-close').addEventListener('click', function () {
      if (el.dialog.close) el.dialog.close(); else el.dialog.removeAttribute('open');
      el.helperBtn.focus();
    });

    // Stop the clock if the page is closed or hidden for good
    window.addEventListener('pagehide', stopTimer);

    renderLevels();
    show('start', true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
