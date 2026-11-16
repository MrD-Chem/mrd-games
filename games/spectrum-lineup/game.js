/* Spectrum Line-Up - game.js
   Part 1 (top): pure functions with no page code. They check orders, move cards, make
   questions, count stars and keep the saved progress. They also run in a test script.
   Part 2 (bottom): the screens, dragging, buttons and timer. It only runs inside a web page. */
(function (root) {
  'use strict';

  var D = root.SL_DATA;
  var T = D.TEXT, REGIONS = D.REGIONS, COLOURS = D.COLOURS, CLUES = D.CLUES, LEVELS = D.LEVELS;
  var STORE_KEY = 'mrd-spectrum-lineup';
  var RETRY_POINTS = 50;      // level 5: points for a right answer on the second try
  var MAX_STARS = LEVELS.length * 3;

  /* ================= PART 1: PURE FUNCTIONS ================= */

  function fill(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (m, k) { return vars && k in vars ? vars[k] : m; });
  }
  function pick(arr, rnd) { return arr[Math.floor(rnd() * arr.length)]; }
  function listFor(kind) { return kind === 'colours' ? COLOURS : REGIONS; }
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function itemById(id) { return byId(REGIONS, id) || byId(COLOURS, id); }

  // The right order (list of ids) for an ordering level.
  function targetOrder(def) {
    var ids = listFor(def.items).map(function (x) { return x.id; });
    return def.dir === 'desc' ? ids.reverse() : ids;
  }

  // Which positions hold the wrong card? Returns a list of positions (0 = first).
  function wrongPositions(order, target) {
    var out = [];
    for (var i = 0; i < target.length; i++) if (order[i] !== target[i]) out.push(i);
    return out;
  }

  // Take the card at position i and put it at position j. The cards between shift by one.
  // Returns a new array.
  function moveItem(arr, i, j) {
    var out = arr.slice();
    if (i < 0 || j < 0 || i >= out.length || j >= out.length || i === j) return out;
    var item = out.splice(i, 1)[0];
    out.splice(j, 0, item);
    return out;
  }

  // Same as moveItem, but the positions in `lockedIdx` never change. The cards that are
  // not locked move among themselves. If i or j is locked nothing moves.
  function moveAmong(arr, lockedIdx, i, j) {
    if (lockedIdx.indexOf(i) !== -1 || lockedIdx.indexOf(j) !== -1) return arr.slice();
    var free = [];
    for (var k = 0; k < arr.length; k++) if (lockedIdx.indexOf(k) === -1) free.push(k);
    var moved = moveItem(free.map(function (p) { return arr[p]; }), free.indexOf(i), free.indexOf(j));
    var out = arr.slice();
    free.forEach(function (p, n) { out[p] = moved[n]; });
    return out;
  }

  // Start position for a puzzle: shuffled, with the cards at lockedIdx already in place,
  // and clearly not solved (at least 3 free cards in the wrong place).
  function shuffleOrder(rnd, target, lockedIdx) {
    var free = [];
    for (var k = 0; k < target.length; k++) if (lockedIdx.indexOf(k) === -1) free.push(k);
    var need = Math.max(3, free.length - 3);
    var out = target.slice();
    for (var tries = 0; tries < 200; tries++) {
      var vals = free.map(function (p) { return target[p]; });
      for (var i = vals.length - 1; i > 0; i--) {
        var j = Math.floor(rnd() * (i + 1)), t = vals[i]; vals[i] = vals[j]; vals[j] = t;
      }
      free.forEach(function (p, n) { out[p] = vals[n]; });
      if (wrongPositions(out, target).length >= need) return out;
    }
    // Fallback (practically never used): rotate the free cards by 2.
    free.forEach(function (p, n) { out[p] = target[free[(n + 2) % free.length]]; });
    return out;
  }

  // Stars for levels 1 to 4: first Check = 3, second = 2, later = 1.
  function starsForOrder(checks) { return checks <= 1 ? 3 : checks === 2 ? 2 : 1; }
  // Stars for levels 5 and 6 from the number correct (thresholds are in data.js).
  function starsForCount(def, n) {
    var th = def.thresholds, stars = 0;
    for (var i = 0; i < th.length; i++) if (n >= th[i]) stars = i + 1;
    return stars;
  }
  function pointsForOrder(stars) { return stars * 100; }

  // Level 5 streak multiplier
  function multiplier(streakBefore) { return streakBefore >= 6 ? 2 : streakBefore >= 3 ? 1.5 : 1; }

  // ---- level 5: twelve clues, at least one for every region ----
  function makeMatchSet(rnd) {
    var chosen = [], rest = [];
    REGIONS.forEach(function (r) {
      var mine = CLUES.filter(function (c) { return c.region === r.id; });
      var one = pick(mine, rnd);
      chosen.push(one);
      mine.forEach(function (c) { if (c !== one) rest.push(c); });
    });
    while (chosen.length < 12 && rest.length) chosen.push(rest.splice(Math.floor(rnd() * rest.length), 1)[0]);
    for (var i = chosen.length - 1; i > 0; i--) {   // shuffle
      var j = Math.floor(rnd() * (i + 1)), t = chosen[i]; chosen[i] = chosen[j]; chosen[j] = t;
    }
    return chosen;
  }

  // ---- level 6: compare two regions or two colours ----
  // type: 'wavelength' | 'frequency' | 'energy'. The answer comes from the numbers (wl):
  // the LONGER wavelength wins "wavelength"; the SHORTER wavelength has the HIGHER frequency
  // and MORE energy, so it wins the other two. Two items with the same wl are never paired.
  function makeCompareQuestion(rnd, prevKey) {
    var q = null, tries = 0;
    do { q = drawCompare(rnd); tries++; } while ((!q || q.key === prevKey) && tries < 50);
    return q;
  }
  function drawCompare(rnd) {
    var pool = rnd() < 0.6 ? 'regions' : 'colours', list = listFor(pool);
    var type = pick(['wavelength', 'frequency', 'energy'], rnd);
    var i = Math.floor(rnd() * list.length), j = Math.floor(rnd() * (list.length - 1));
    if (j >= i) j++;
    var a = list[i], b = list[j];
    if (a.wl === b.wl) return null;
    var longer = a.wl > b.wl ? a : b, shorter = a.wl > b.wl ? b : a;
    var win = type === 'wavelength' ? longer : shorter;
    return { type: type, pool: pool, a: a, b: b, answer: win.id,
             key: type + ':' + pool + ':' + [a.id, b.id].sort().join('-') };
  }
  function compareQuestionText(q) {
    return q.type === 'wavelength' ? T.qWavelength : q.type === 'frequency' ? T.qFrequency : T.qEnergy;
  }
  // One-line reason, shown after a wrong answer.
  function reasonFor(q) {
    var win = itemById(q.answer), lose = itemById(q.answer === q.a.id ? q.b.id : q.a.id);
    var tpl = q.type === 'wavelength' ? T.reasonWavelength : q.type === 'frequency' ? T.reasonFrequency : T.reasonEnergy;
    return fill(tpl, { win: win.name, lose: lose.name, order: q.pool === 'colours' ? T.orderColours : T.orderRegions });
  }

  // ---- saved progress ----
  // Shape: { v: 1, card: "★ 11 of 18 · 4 of 6 levels", levels: { "1": { best, stars }, ... } }
  function cardText(levels) {
    var stars = 0, done = 0;
    Object.keys(levels).forEach(function (k) {
      var n = levels[k].stars; stars += n; if (n > 0) done++;
    });
    return '★ ' + stars + ' of ' + MAX_STARS + ' · ' + done + ' of ' + LEVELS.length + ' levels';
  }
  function createStore(getStorage) {
    var cache = { levels: {} };
    function storage() { try { return getStorage(); } catch (e) { return null; } }
    try {
      var st = storage(), raw = st && st.getItem(STORE_KEY), parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.levels && typeof parsed.levels === 'object') {
        Object.keys(parsed.levels).forEach(function (k) {
          var v = parsed.levels[k] || {};
          if (!LEVELS[Number(k) - 1]) return;
          cache.levels[k] = { best: Math.max(0, Number(v.best) || 0), stars: Math.min(3, Math.max(0, Number(v.stars) || 0)) };
        });
      }
    } catch (e) { /* storage blocked or broken: start fresh */ }
    function save() {
      try {
        var st2 = storage();
        if (st2) st2.setItem(STORE_KEY, JSON.stringify({ v: 1, card: cardText(cache.levels), levels: cache.levels }));
      } catch (e) { /* ignore */ }
    }
    return {
      get: function (id) { return cache.levels[id] || { best: 0, stars: 0 }; },
      // Save a finished run. Returns true if the score is a new best.
      record: function (id, score, stars) {
        var old = cache.levels[id] || { best: 0, stars: 0 };
        var isBest = score > old.best;
        cache.levels[id] = { best: Math.max(old.best, score), stars: Math.max(old.stars, stars) };
        save();
        return isBest;
      },
      clear: function () {
        cache = { levels: {} };
        try { var st3 = storage(); if (st3) st3.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
      },
      card: function () { return cardText(cache.levels); }
    };
  }

  root.SL = {
    fill: fill, targetOrder: targetOrder, wrongPositions: wrongPositions, moveItem: moveItem, moveAmong: moveAmong,
    shuffleOrder: shuffleOrder, starsForOrder: starsForOrder, starsForCount: starsForCount,
    pointsForOrder: pointsForOrder, multiplier: multiplier, makeMatchSet: makeMatchSet,
    makeCompareQuestion: makeCompareQuestion, reasonFor: reasonFor, createStore: createStore, cardText: cardText
  };

  if (typeof document === 'undefined') return;

  /* ================= PART 2: THE PAGE ================= */

  var $ = function (id) { return document.getElementById(id); };
  function h(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function init() {
    var store = createStore(function () { return window.localStorage; });
    var s = null;               // the run in progress
    var ord = null;             // the ordering puzzle in progress (levels 1 to 4)
    var timerId = null, resetTimer = null;
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var screens = { start: $('sl-start'), play: $('sl-play'), end: $('sl-end') };
    var el = {
      levels: $('sl-levels'), startBtn: $('sl-start-btn'), reset: $('sl-reset'), resetNote: $('sl-reset-note'),
      hudLevel: $('sl-hud-level'), hudQLabel: $('sl-hud-q-label'), hudQ: $('sl-hud-q'), hudScoreLabel: $('sl-hud-score-label'),
      hudScore: $('sl-hud-score'), hudStreakBox: $('sl-hud-streak-item'),
      hudStreak: $('sl-hud-streak'), hudTimeItem: $('sl-hud-time-item'), hudTime: $('sl-hud-time'), leave: $('sl-leave'),
      orderPanel: $('sl-order-panel'), orderPrompt: $('sl-order-prompt'), orderNote: $('sl-order-note'),
      endA: $('sl-end-a'), endB: $('sl-end-b'), row: $('sl-row'), check: $('sl-check'), finish: $('sl-finish'),
      feedback: $('sl-feedback'), banner: $('sl-banner-host'), announce: $('sl-announce'),
      quiz: $('sl-quiz'), fx: $('sl-fx'), qPrompt: $('sl-q-prompt'), qBody: $('sl-q-body'), options: $('sl-options'),
      qFeedback: $('sl-q-feedback'), qNext: $('sl-q-next'),
      endTitle: $('sl-end-title'), endScore: $('sl-end-score'), endScoreLabel: $('sl-end-score-label'),
      endStars: $('sl-end-stars'), endFirst: $('sl-end-first'), endBest: $('sl-end-best'), recap: $('sl-recap'),
      review: $('sl-review'), again: $('sl-again'), choose: $('sl-choose'), nextLevel: $('sl-next-level'),
      endSolved: $('sl-end-solved')
    };

    // Fill all fixed text from data.js
    Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (n) {
      var v = T[n.getAttribute('data-copy')];
      if (typeof v === 'string') n.textContent = v;
    });

    function show(name) {
      Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== name; });
      var heading = screens[name].querySelector('[data-focus]');
      if (heading) heading.focus();
      window.scrollTo(0, 0);
    }
    function starString(n) { return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n); }
    function say(msg) {            // announce to screen readers (aria-live region)
      el.announce.textContent = '';
      el.announce.appendChild(h('p', null, msg));
    }

    /* ---- start screen ---- */
    function renderLevels() {
      el.levels.textContent = '';
      var firstOpen = 1;
      for (var i = LEVELS.length; i >= 1; i--) if (store.get(i).stars === 0) firstOpen = i;
      LEVELS.forEach(function (def) {
        var rec = store.get(def.id);
        var best = rec.best ? fill(def.kind === 'sprint' ? T.bestCorrect : T.bestPoints, { n: rec.best }) : T.noBest;
        var li = h('li');
        var b = h('button', 'sl-level panel');
        b.type = 'button';
        b.setAttribute('data-level', def.id);
        b.setAttribute('aria-label', fill(T.ariaLevelCard, { id: def.id, name: def.name, blurb: def.blurb, best: best,
          stars: fill(T.starsLabel, { n: rec.stars }) }));
        b.appendChild(h('span', 'sl-level-num', String(def.id)));
        b.appendChild(h('span', 'sl-level-name', def.name));
        b.appendChild(h('span', 'sl-level-blurb', def.blurb));
        b.appendChild(h('span', 'sl-level-count', def.countLabel));
        var meta = h('span', 'sl-level-meta');
        var stars = h('span', 'sl-stars', starString(rec.stars)); stars.setAttribute('aria-hidden', 'true');
        meta.appendChild(stars); meta.appendChild(h('span', 'sl-level-best', best));
        b.appendChild(meta);
        li.appendChild(b); el.levels.appendChild(li);
      });
      el.startBtn.textContent = fill(T.startLevel, { n: firstOpen });
      el.startBtn.setAttribute('data-level', firstOpen);
    }
    el.levels.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-level]');
      if (b) startLevel(Number(b.getAttribute('data-level')));
    });
    el.startBtn.addEventListener('click', function () { startLevel(Number(el.startBtn.getAttribute('data-level')) || 1); });
    el.reset.addEventListener('click', function () {
      if (!resetTimer) {          // first tap: ask again
        el.reset.textContent = T.startOverSure;
        el.resetNote.textContent = '';
        resetTimer = setTimeout(function () { resetTimer = null; el.reset.textContent = T.startOver; }, 4000);
        return;
      }
      clearTimeout(resetTimer); resetTimer = null;
      store.clear(); renderLevels();
      el.reset.textContent = T.startOver;
      el.resetNote.textContent = T.startOverDone;
    });

    /* ---- timer (level 6 only; stops when idle or when the tab is hidden) ---- */
    function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
    function startTimer() { stopTimer(); timerId = setInterval(tick, 250); }
    function fmt(sec) { sec = Math.max(0, sec); return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); }
    function tick() {
      if (!s || s.def.kind !== 'sprint') return stopTimer();
      var left = s.def.seconds - Math.floor((Date.now() - s.t0) / 1000);
      el.hudTime.textContent = fmt(left);
      el.hudTime.classList.toggle('sl-low', left <= 10);
      if (left <= 0) finish(true);
    }
    document.addEventListener('visibilitychange', function () {
      if (!s || s.ended || s.def.kind !== 'sprint') return;
      if (document.hidden) { stopTimer(); s.pausedAt = Date.now(); }
      else if (s.pausedAt) { s.t0 += Date.now() - s.pausedAt; s.pausedAt = 0; startTimer(); tick(); }
    });

    /* ---- HUD ---- */
    function pop(node) {
      if (calm || !node.animate) return;
      node.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)', color: '#fbbf24' }, { transform: 'scale(1)' }], { duration: 350 });
    }
    function renderHud() {
      var def = s.def;
      el.hudLevel.textContent = def.id + ' · ' + def.name;
      el.hudStreakBox.hidden = def.kind === 'order';
      el.hudTimeItem.hidden = def.kind !== 'sprint';
      el.hudScoreLabel.textContent = def.kind === 'sprint' ? T.hudScoreSprint : T.hudScore;
      el.hudScore.textContent = String(s.score);
      if (def.kind === 'order') { el.hudQLabel.textContent = T.hudChecks; el.hudQ.textContent = String(ord ? ord.checks : 0); }
      else {
        el.hudQLabel.textContent = T.hudQuestion;
        el.hudQ.textContent = def.kind === 'match' ? fill(T.questionOf, { n: Math.min(s.idx + 1, def.count), t: def.count }) : String(s.asked || 1);
      }
      var m = def.kind === 'match' ? multiplier(s.streak) : 1;
      el.hudStreak.textContent = s.streak + (m > 1 ? ' ×' + m : '');
      el.hudStreakBox.classList.toggle('sl-hot', s.streak >= 3);
      el.hudStreakBox.classList.toggle('sl-hotter', s.streak >= 6);
      el.quiz.classList.toggle('sl-card--hot', s.streak >= 3);
      el.quiz.classList.toggle('sl-card--hotter', s.streak >= 6);
    }
    function addScore(pts) { s.score += pts; el.hudScore.textContent = String(s.score); pop(el.hudScore); }

    /* ---- streak effects (levels 5 and 6) ----
       Little spectrum-coloured dots burst out for every right answer from 2 in a row on.
       A banner pops up at 3, 6, 10 and then every 5. Everything removes itself when its
       animation ends, and nothing moves if the student chose "reduce motion". */
    function streakBanner(n) {
      if (n === 3) return fill(T.streak3, { n: n });
      if (n === 6) return fill(T.streak6, { n: n });
      if (n === 10) return fill(T.streak10, { n: n });
      if (n > 10 && n % 5 === 0) return fill(T.streakMore, { n: n });
      return '';
    }
    function burst(n) {
      if (calm || !el.fx.animate) return;
      var card = el.quiz.getBoundingClientRect(), box = el.qBody.getBoundingClientRect();
      var ox = box.left - card.left + box.width / 2, oy = box.top - card.top + box.height / 2;
      var count = Math.min(10 + n * 3, 40), reach = Math.min(card.width / 2, 120 + n * 18);
      for (var i = 0; i < count; i++) {
        var dot = h('span', 'sl-particle');
        dot.style.left = ox + 'px'; dot.style.top = oy + 'px';
        dot.style.background = COLOURS[i % COLOURS.length].swatch;
        el.fx.appendChild(dot);
        var angle = Math.random() * Math.PI * 2, dist = reach * (0.35 + Math.random() * 0.65);
        var dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist * 0.7;
        dot.animate([
          { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 1 },
          { transform: 'translate(calc(-50% + ' + dx * 0.7 + 'px), calc(-50% + ' + dy * 0.7 + 'px)) scale(1.1)', opacity: 1, offset: 0.6 },
          { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(0.6)', opacity: 0 }
        ], { duration: 750 + Math.random() * 450, easing: 'cubic-bezier(.15,.7,.3,1)' }).onfinish = (function (d) {
          return function () { d.remove(); };
        })(dot);
      }
    }
    function showBanner(text, kind) {
      var old = el.fx.querySelector('.sl-pop-banner'); if (old) old.remove();
      var b = h('div', 'sl-pop-banner sl-pop-banner--' + kind, text);
      var card = el.quiz.getBoundingClientRect(), box = el.qBody.getBoundingClientRect();
      b.style.top = (box.top - card.top + box.height + 18) + 'px';
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
        say(fill(T.streakSr, { n: n }));      // screen readers hear the milestone too
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

    /* ---- starting, leaving and ending a level ---- */
    function startLevel(id) {
      var def = LEVELS[id - 1];
      stopTimer(); ord = null;
      s = { def: def, score: 0, streak: 0, firstTry: 0, missed: [], missedIds: {}, ended: false, idx: 0, asked: 0 };
      el.orderPanel.hidden = def.kind !== 'order';
      el.quiz.hidden = def.kind === 'order';
      el.fx.textContent = '';
      el.hudTime.classList.remove('sl-low');
      show('play');
      (def.kind === 'order' ? el.orderPrompt : el.qPrompt).focus();   // screen readers start at the task
      if (def.kind === 'order') startOrder();
      else if (def.kind === 'match') { s.clues = makeMatchSet(Math.random); renderHud(); showClue(); }
      else { s.t0 = Date.now(); s.correct = 0; s.prevKey = ''; renderHud(); startTimer(); tick(); showCompare(); }
    }
    function leave() { stopTimer(); s = null; ord = null; renderLevels(); show('start'); }
    el.leave.addEventListener('click', leave);
    el.choose.addEventListener('click', leave);
    el.again.addEventListener('click', function () { startLevel(s.def.id); });
    el.nextLevel.addEventListener('click', function () { startLevel(Math.min(LEVELS.length, s.def.id + 1)); });

    function finish(timeUp) {
      if (!s || s.ended) return;
      s.ended = true; stopTimer();
      var def = s.def, stars, isBest = false;
      el.endSolved.textContent = '';
      if (def.kind === 'order') {
        stars = starsForOrder(ord.checks);     // already saved when the puzzle was solved
        isBest = !!s.newBest;
        el.endFirst.textContent = fill(T.endChecks, { n: ord.checks });
        el.endSolved.textContent = def.solved;
      } else if (def.kind === 'match') {
        stars = starsForCount(def, s.firstTry);
        isBest = store.record(def.id, s.score, stars) && s.score > 0;
        el.endFirst.textContent = fill(T.endFirstTry, { n: s.firstTry, t: def.count });
      } else {
        stars = starsForCount(def, s.correct);
        isBest = store.record(def.id, s.correct, stars) && s.correct > 0;
        el.endFirst.textContent = T.endCorrectSprint;
      }
      el.endTitle.textContent = timeUp ? T.endTimeUp : T.endLevelDone;
      el.endScoreLabel.textContent = def.kind === 'sprint' ? T.endScoreLabelSprint : T.endScoreLabel;
      el.endScore.textContent = String(def.kind === 'sprint' ? s.correct : s.score);
      el.endStars.textContent = starString(stars);
      el.endStars.setAttribute('aria-label', fill(T.starsLabel, { n: stars }));
      el.endBest.hidden = !isBest;
      el.nextLevel.hidden = def.id >= LEVELS.length;
      renderRecap();
      renderReview();
      renderLevels();
      show('end');
    }
    function renderRecap() {
      el.recap.textContent = '';
      var names = REGIONS.map(function (r) { return r.name; }).join(' → ');
      [fill(T.recapOrder, { list: names }), T.recapChain, T.recapVisible, T.recapUses].forEach(function (t) {
        el.recap.appendChild(h('li', null, t));
      });
    }
    function renderReview() {
      el.review.textContent = '';
      if (!s.missed.length) { el.review.appendChild(h('li', 'sl-review-none', T.reviewNone)); return; }
      s.missed.forEach(function (m) { el.review.appendChild(h('li', 'sl-review-item', m)); });
    }

    /* ================= ORDERING LEVELS (1 to 4) ================= */

    function startOrder() {
      var def = s.def, target = targetOrder(def);
      // Anchor cards (level 1): only until the student has earned a star on this level.
      var anchorIdx = def.anchors && store.get(def.id).stars === 0 ? [0, target.length - 1] : [];
      ord = { target: target, order: shuffleOrder(Math.random, target, anchorIdx), locked: {}, wrong: {},
              held: null, checks: 0, solved: false };
      anchorIdx.forEach(function (k) { ord.locked[target[k]] = 'anchor'; });
      el.orderPrompt.textContent = def.prompt;
      el.orderNote.textContent = def.anchorNote && (!def.anchors || anchorIdx.length) ? def.anchorNote : '';
      el.endA.textContent = def.startLabel;
      el.endB.textContent = def.endLabel;
      el.row.setAttribute('aria-label', fill(T.rowLabel, { start: def.startLabel }));
      el.feedback.textContent = ''; el.feedback.className = 'sl-feedback';
      el.banner.textContent = '';
      el.check.hidden = false; el.finish.hidden = true;
      renderHud();
      renderOrder();
    }

    function lockedIdx() {
      var out = [];
      ord.order.forEach(function (id, p) { if (ord.locked[id]) out.push(p); });
      return out;
    }
    function itemOf(id) { return byId(listFor(s.def.items), id); }

    // One render path for the row of cards.
    function renderOrder(focusId) {
      var n = ord.order.length;
      el.row.textContent = '';
      ord.order.forEach(function (id, p) {
        var item = itemOf(id), lock = ord.locked[id], held = ord.held === id, wrong = !!ord.wrong[id];
        var li = h('li', 'sl-slot');
        var b = h('button', 'sl-card');
        b.type = 'button';
        b.setAttribute('data-id', id);
        if (lock === 'ok') b.classList.add('sl-locked');
        if (lock === 'anchor') b.classList.add('sl-anchor');
        if (wrong) b.classList.add('sl-wrong');
        if (held) b.classList.add('sl-held');
        b.setAttribute('aria-pressed', held ? 'true' : 'false');
        var extra = lock === 'ok' ? T.labelLocked : lock === 'anchor' ? T.labelAnchor : wrong ? T.labelWrong : held ? T.labelHeld : '';
        var eg = item.uses ? T.egPrefix + item.uses[0] : '';
        b.setAttribute('aria-label', [item.name, fill(T.labelPos, { p: p + 1, t: n }), extra, eg].filter(Boolean).join(', '));
        b.appendChild(h('span', 'sl-pos', String(p + 1)));
        if (item.swatch) { var sw = h('span', 'sl-swatch'); sw.style.background = item.swatch; sw.setAttribute('aria-hidden', 'true'); b.appendChild(sw); }
        var body = h('span', 'sl-card-body');
        body.appendChild(h('span', 'sl-card-name', item.name));
        if (eg) body.appendChild(h('span', 'sl-card-sub', eg));
        b.appendChild(body);
        var status = lock === 'ok' ? T.statusLocked : lock === 'anchor' ? T.statusAnchor : wrong ? T.statusWrong : held ? T.statusHeld : '';
        b.appendChild(h('span', 'sl-card-status', status));
        li.appendChild(b);
        el.row.appendChild(li);
      });
      if (focusId) {
        var f = el.row.querySelector('[data-id="' + focusId + '"]');
        if (f) f.focus();
      }
    }

    // Move the card at position `from` to position `to`, then say what happened.
    function doMove(from, to, focusId) {
      var id = ord.order[from], n = ord.order.length;
      ord.order = moveAmong(ord.order, lockedIdx(), from, to);
      ord.wrong = {};
      var msg = fill(T.announceMoved, { name: itemOf(id).name, p: to + 1, t: n });
      var before = ord.order[to - 1], after = ord.order[to + 1];
      if (before && after) msg += fill(T.announceBetween, { a: itemOf(before).name, b: itemOf(after).name });
      else if (before || after) msg += fill(T.announceNextTo, { a: itemOf(before || after).name });
      say(msg);
      renderOrder(focusId);
    }

    // Tap (or Space/Enter) on a card. kb = true when it came from the keyboard.
    function activate(id, kb) {
      if (!ord || ord.solved) return;
      var name = itemOf(id).name, n = ord.order.length;
      if (ord.held === null) {
        if (ord.locked[id]) { say(fill(T.announceLocked, { name: name })); return; }
        ord.held = id;
        say(fill(kb ? T.announcePickKb : T.announcePick, { name: name, p: ord.order.indexOf(id) + 1, t: n }));
        renderOrder(kb ? id : null);
      } else if (ord.held === id) {
        ord.held = null;
        say(fill(T.announceDrop, { name: name, p: ord.order.indexOf(id) + 1, t: n }));
        renderOrder(kb ? id : null);
      } else if (ord.locked[id]) {
        say(fill(T.announceLocked, { name: name }));
      } else {
        var heldId = ord.held;
        ord.held = null;
        doMove(ord.order.indexOf(heldId), ord.order.indexOf(id), kb ? heldId : null);
      }
    }

    /* Dragging with Pointer Events (mouse, trackpad and touch). The cards have
       touch-action: none in the CSS, so the page does not scroll while a card is dragged.
       A small movement (under 6 px) counts as a tap. */
    var drag = null;
    el.row.addEventListener('pointerdown', function (ev) {
      if (!ord || ord.solved || drag) return;
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      var b = ev.target.closest('.sl-card'); if (!b) return;
      var id = b.getAttribute('data-id');
      drag = { id: id, btn: b, pid: ev.pointerId, x0: ev.clientX, y0: ev.clientY, on: false,
               from: ord.order.indexOf(id), to: null, rects: null, locked: !!ord.locked[id] };
      try { b.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
    });
    function setDropTarget(k) {
      var slots = el.row.children;
      for (var i = 0; i < slots.length; i++) slots[i].classList.toggle('sl-drop', i === k && k !== drag.from);
      drag.to = k;
    }
    el.row.addEventListener('pointermove', function (ev) {
      if (!drag || ev.pointerId !== drag.pid) return;
      var dx = ev.clientX - drag.x0, dy = ev.clientY - drag.y0;
      if (!drag.on) {
        if (drag.locked || Math.hypot(dx, dy) < 6) return;
        drag.on = true;
        drag.rects = Array.prototype.map.call(el.row.children, function (li) { return li.getBoundingClientRect(); });
        drag.btn.parentNode.classList.add('sl-dragging');
        drag.btn.classList.add('sl-lifted');
        ord.held = null;
      }
      drag.btn.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      var best = drag.from, bd = Infinity;
      drag.rects.forEach(function (r, k) {
        if (k !== drag.from && ord.locked[ord.order[k]]) return;     // locked places are not targets
        var d = Math.hypot(ev.clientX - (r.left + r.width / 2), ev.clientY - (r.top + r.height / 2));
        if (d < bd) { bd = d; best = k; }
      });
      setDropTarget(best);
    });
    function endDrag(ev, cancelled) {
      if (!drag || ev.pointerId !== drag.pid) return;
      var d = drag; drag = null;
      try { d.btn.releasePointerCapture(d.pid); } catch (e) { /* ignore */ }
      if (d.on) {
        if (!cancelled && d.to !== null && d.to !== d.from) doMove(d.from, d.to, null);
        else renderOrder();
      } else if (!cancelled) {
        activate(d.id, false);
      }
    }
    el.row.addEventListener('pointerup', function (ev) { endDrag(ev, false); });
    el.row.addEventListener('pointercancel', function (ev) { endDrag(ev, true); });

    // Keyboard. Space/Enter arrive as a click with detail 0 (a real tap or mouse click has
    // detail 1 or more and was already handled by the pointer code above).
    el.row.addEventListener('click', function (ev) {
      var b = ev.target.closest('.sl-card');
      if (b && ev.detail === 0) activate(b.getAttribute('data-id'), true);
    });
    el.row.addEventListener('keydown', function (ev) {
      var b = ev.target.closest('.sl-card'); if (!b || !ord || ord.solved) return;
      var id = b.getAttribute('data-id'), p = ord.order.indexOf(id), n = ord.order.length;
      var dir = (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') ? -1 : (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') ? 1 : 0;
      if (ev.key === 'Escape' && ord.held) {
        ev.preventDefault(); ord.held = null;
        say(fill(T.announceDrop, { name: itemOf(id).name, p: p + 1, t: n })); renderOrder(id); return;
      }
      if (!dir) return;
      ev.preventDefault();
      if (ord.held !== id) {                       // not holding: arrows just move the focus
        var nb = el.row.querySelectorAll('.sl-card')[p + dir];
        if (nb) nb.focus();
        return;
      }
      var to = p + dir;                             // holding: skip over locked cards
      while (to >= 0 && to < n && ord.locked[ord.order[to]]) to += dir;
      if (to < 0 || to >= n) {
        say(fill(dir < 0 ? T.announceEdgeStart : T.announceEdgeEnd, { name: itemOf(id).name, end: dir < 0 ? s.def.startLabel : s.def.endLabel }));
        return;
      }
      doMove(p, to, id);
    });

    /* ---- Check ---- */
    function hintFor(id, pos) {
      var def = s.def, item = itemOf(id), tpos = ord.target.indexOf(id);
      var text = fill(T.hintMove, { name: item.name, end: tpos < pos ? def.startLabel : def.endLabel });
      if (def.items === 'colours') return text + T.hintColours;
      var tpl = def.id === 2 ? T.hintRegions2 : def.id === 3 ? T.hintRegions3 : T.hintRegions1;
      return text + fill(tpl, { range: item.range });
    }
    el.check.addEventListener('click', function () {
      if (!ord || ord.solved) return;
      ord.held = null;
      ord.checks++;
      var wrongPos = wrongPositions(ord.order, ord.target), n = ord.order.length;
      ord.wrong = {};
      var hints = [];
      wrongPos.forEach(function (p) {
        var id = ord.order[p];
        ord.wrong[id] = true;
        hints.push(h('li', null, hintFor(id, p)));
        if (!s.missedIds[id]) {      // remember for the review on the end screen
          s.missedIds[id] = true;
          var item = itemOf(id), tp = ord.target.indexOf(id) + 1;
          s.missed.push(s.def.items === 'colours'
            ? fill(T.reviewColourItem, { name: item.name, p: tp, end: s.def.startLabel })
            : fill(T.reviewOrderItem, { name: item.name, range: item.range, p: tp, end: s.def.startLabel }));
        }
      });
      ord.order.forEach(function (id, p) {            // correct cards lock in
        if (ord.target[p] === id && !ord.locked[id]) ord.locked[id] = 'ok';
      });
      el.feedback.textContent = '';
      if (!wrongPos.length) { solveOrder(); return; }
      el.feedback.className = 'sl-feedback sl-fb-bad';
      el.feedback.appendChild(h('p', 'sl-fb-head', fill(T.checkSome, { k: n - wrongPos.length, m: wrongPos.length })));
      var ul = h('ul', 'sl-hints'); hints.forEach(function (li) { ul.appendChild(li); });
      el.feedback.appendChild(ul);
      renderHud();
      renderOrder();
    });

    function solveOrder() {
      ord.solved = true;
      var stars = starsForOrder(ord.checks), pts = pointsForOrder(stars);
      s.score = pts;
      s.newBest = store.record(s.def.id, pts, stars) && pts > 0;
      el.feedback.className = 'sl-feedback sl-fb-good';
      el.feedback.appendChild(h('p', 'sl-fb-head', ord.checks === 1 ? T.checkAllFirst : T.checkAllLater));
      el.feedback.appendChild(h('p', null, fill(T.solvedPoints, { n: stars, pts: pts })));
      el.feedback.appendChild(h('p', null, s.def.solved));
      renderHud();
      renderOrder();
      el.banner.textContent = '';
      el.banner.appendChild(buildBanner());
      el.check.hidden = true; el.finish.hidden = false;
      el.finish.focus();
    }
    el.finish.addEventListener('click', function () { finish(false); });

    /* ---- the spectrum banner (shown after a puzzle is solved) ---- */
    function buildBanner() {
      var wrap = h('div', 'sl-banner');
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', fill(T.bannerSummary, { list: REGIONS.map(function (r) { return r.name; }).join(', ') }));
      wrap.appendChild(h('h2', 'sl-banner-title', T.bannerTitle));
      var band = h('ol', 'sl-band');
      REGIONS.forEach(function (r) {
        var li = h('li', 'sl-seg sl-seg--' + r.id);
        li.appendChild(h('span', 'sl-seg-name', r.name));
        li.appendChild(h('span', 'sl-seg-range', r.range));
        if (r.id === 'vis') {
          var rb = h('span', 'sl-rainbow'); rb.setAttribute('aria-hidden', 'true');
          COLOURS.forEach(function (c) { var bar = h('span', 'sl-rainbow-bar'); bar.style.background = c.swatch; rb.appendChild(bar); });
          li.appendChild(rb);
          li.appendChild(h('span', 'sl-seg-rainbow-note', T.bannerRainbow));
        }
        li.appendChild(h('span', 'sl-seg-use', r.uses[0]));
        li.appendChild(h('span', 'sl-seg-size', fill(T.bannerSize, { size: r.size })));
        band.appendChild(li);
      });
      wrap.appendChild(band);
      var arrows = h('div', 'sl-arrows');
      [[T.bannerWavelength, T.bannerLong, T.bannerShort], [T.bannerFrequency, T.bannerLow, T.bannerHigh],
       [T.bannerEnergy, T.bannerLow, T.bannerHigh]].forEach(function (a) {
        var row = h('div', 'sl-arrow');
        row.appendChild(h('span', 'sl-arrow-name', a[0]));
        row.appendChild(h('span', 'sl-arrow-end', a[1]));
        row.appendChild(h('span', 'sl-arrow-line'));
        row.appendChild(h('span', 'sl-arrow-end', a[2]));
        arrows.appendChild(row);
      });
      wrap.appendChild(arrows);
      wrap.appendChild(h('p', 'sl-arrow-down', T.bannerDown));
      wrap.appendChild(h('p', 'sl-small', T.bannerNm));
      return wrap;
    }

    /* ================= QUIZ LEVELS (5 and 6) share the option buttons ================= */

    function optionButton(item, swatch) {
      var b = h('button', 'btn btn-ghost sl-option');
      b.type = 'button';
      b.setAttribute('data-id', item.id);
      if (swatch) { var sw = h('span', 'sl-swatch sl-swatch--inline'); sw.style.background = item.swatch; sw.setAttribute('aria-hidden', 'true'); b.appendChild(sw); }
      b.appendChild(h('span', 'sl-option-name', item.name));
      b.appendChild(h('span', 'sl-mark', ''));
      return b;
    }
    function markOption(id, kind) {
      var b = el.options.querySelector('[data-id="' + id + '"]'); if (!b) return;
      b.classList.add(kind === 'right' ? 'sl-right' : 'sl-wrongopt');
      b.setAttribute('aria-disabled', 'true');
      b.querySelector('.sl-mark').textContent = kind === 'right' ? '✓ Right' : '✗ No';
    }
    function lockOptions() {
      Array.prototype.forEach.call(el.options.children, function (b) { b.setAttribute('aria-disabled', 'true'); });
    }
    function setQFeedback(kind, parts) {
      el.qFeedback.textContent = '';
      el.qFeedback.className = 'sl-feedback ' + (kind ? 'sl-fb-' + kind : '');
      parts.forEach(function (t, i) { el.qFeedback.appendChild(h('p', i === 0 ? 'sl-fb-head' : null, t)); });
    }
    el.options.addEventListener('click', function (ev) {
      var b = ev.target.closest('.sl-option');
      if (!b || !s || b.getAttribute('aria-disabled') === 'true') return;
      var id = b.getAttribute('data-id');
      if (s.def.kind === 'match') answerClue(id); else answerCompare(id);
    });
    el.qNext.addEventListener('click', function () {
      if (!s || s.def.kind === 'order') return;
      if (s.def.kind === 'match') {
        if (s.idx >= s.def.count - 1) return finish(false);
        s.idx++; showClue();
        el.options.querySelector('.sl-option').focus();
      } else { showCompare(); el.options.querySelector('.sl-option').focus(); }
    });

    /* ---- level 5: what is it used for? ---- */
    function showClue() {
      var c = s.clues[s.idx];
      s.attempts = 0; s.done = false;
      el.qPrompt.textContent = T.matchPrompt;
      el.qBody.textContent = c.text; el.qBody.className = 'sl-q-body sl-clue';
      el.options.textContent = '';
      el.options.setAttribute('aria-label', T.matchGroup);
      REGIONS.forEach(function (r) { el.options.appendChild(optionButton(r, false)); });
      setQFeedback('', []);
      el.qNext.hidden = true;
      renderHud();
    }
    function answerClue(id) {
      var c = s.clues[s.idx];
      if (s.done || s.ended) return;
      var right = byId(REGIONS, c.region);
      if (id === c.region) {
        var first = s.attempts === 0, pts;
        s.done = true;
        markOption(id, 'right'); lockOptions();
        if (first) {
          pts = Math.round(100 * multiplier(s.streak));
          s.streak++; s.firstTry++;
          celebrate(s.streak);
        } else { pts = RETRY_POINTS; }
        addScore(pts);
        setQFeedback('good', [(first ? T.right1 : T.right2) + ' +' + pts, c.why]);
        finishClue();
      } else {
        s.attempts++;
        markOption(id, 'wrong');
        if (s.attempts === 1) {
          s.missed.push(fill(T.reviewClue, { text: c.text, name: right.name, why: c.why }));
          streakLost(s.streak); s.streak = 0;
          setQFeedback('bad', [T.wrong1, c.hint]);
        } else {
          s.done = true;
          markOption(c.region, 'right'); lockOptions();
          setQFeedback('bad', [fill(T.answerWas, { name: right.name }), c.why]);
          finishClue();
        }
        renderHud();
      }
    }
    function finishClue() {
      renderHud();
      el.qNext.textContent = s.idx >= s.def.count - 1 ? T.seeResults : T.next;
      el.qNext.hidden = false;
      el.qNext.focus();
    }

    /* ---- level 6: quick compare (60-second sprint) ---- */
    function showCompare() {
      var q = makeCompareQuestion(Math.random, s.prevKey);
      s.q = q; s.prevKey = q.key; s.asked++; s.done = false;
      el.qPrompt.textContent = T.comparePrompt;
      el.qBody.textContent = compareQuestionText(q); el.qBody.className = 'sl-q-body sl-question';
      el.options.textContent = '';
      el.options.setAttribute('aria-label', compareQuestionText(q));
      var sw = q.pool === 'colours';
      el.options.appendChild(optionButton(q.a, sw));
      el.options.appendChild(optionButton(q.b, sw));
      setQFeedback('', []);
      el.qNext.hidden = true;
      renderHud();
    }
    function answerCompare(id) {
      var q = s.q;
      if (s.done || s.ended) return;
      if (id === q.answer) {
        s.correct++; s.score = s.correct; s.streak++;
        celebrate(s.streak);
        showCompare();
        el.options.querySelector('.sl-option').focus();
        if (s.streak < 3) say(T.correctShort);
      } else {
        s.done = true;
        s.missed.push(compareQuestionText(q) + ' (' + q.a.name + ' or ' + q.b.name + ') ' + reasonFor(q));
        streakLost(s.streak); s.streak = 0;
        markOption(id, 'wrong'); markOption(q.answer, 'right');
        setQFeedback('bad', [T.wrongShort, reasonFor(q)]);
        el.qNext.textContent = T.next; el.qNext.hidden = false; el.qNext.focus();
        renderHud();
      }
    }

    renderLevels();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : this);
