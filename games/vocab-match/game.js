/* Unit 4 Vocab Match - game.js
   Part 1 (top): pure functions with no page code. They shuffle, pick wrong answers, build match
   rounds and quiz questions, check answers, score, give stars and save. They also run in a test file.
   Part 2 (bottom): the screens and buttons. It only runs inside a web page. */
(function (root) {
  'use strict';

  var D = root.VM_DATA;
  var T = D.TEXT, MODES = D.MODES;
  var STORE_KEY = 'mrd-vocab-match';
  var MAX_STARS = 3;
  var POINTS_FIRST = 100;    // a clean match, or a quiz answer right on the first try
  var POINTS_RETRY = 50;     // a match made after a mistake, or a quiz answer right on the second try
  var FLASH_MS = 700;        // how long a wrong pair stays red

  /* ================= PART 1: PURE FUNCTIONS ================= */

  // Every word, with the id of its group. Built once from data.js.
  var WORDS = [];
  D.GROUPS.forEach(function (g) {
    g.words.forEach(function (w) { WORDS.push({ term: w.term, def: w.def, hint: w.hint, group: g.id }); });
  });

  function fill(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (m, k) { return vars && k in vars ? vars[k] : m; });
  }
  function groupWords(groupId) {
    return WORDS.filter(function (w) { return w.group === groupId; });
  }
  function clampInt(v, lo, hi) {
    return Math.min(hi, Math.max(lo, Math.floor(Number(v) || 0)));
  }

  // Fisher-Yates shuffle. Returns a NEW array with the same items. rnd() gives a number from 0 up to 1.
  function shuffle(arr, rnd) {
    var a = arr.slice(), i, j, t;
    rnd = rnd || Math.random;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(rnd() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Pick `count` wrong words for a question. Never the correct word, never the same word twice.
  // Words from the same group come first; words from other groups only fill any gap.
  function pickDistractors(correct, allWords, count, rnd) {
    var seen = {}, out = [];
    var sameGroup = allWords.filter(function (w) { return w.group === correct.group; });
    seen[correct.term] = true;
    [sameGroup, allWords].forEach(function (pool) {
      shuffle(pool, rnd).forEach(function (w) {
        if (out.length < count && !seen[w.term]) { seen[w.term] = true; out.push(w); }
      });
    });
    return out;
  }

  // Match rounds: shuffle a group's words, then split them into rounds of `per` pairs.
  function matchRounds(words, per, rnd) {
    var list = shuffle(words, rnd), rounds = [], i;
    for (i = 0; i < list.length; i += per) rounds.push(list.slice(i, i + per));
    return rounds;
  }

  // Quick Quiz: `count` words drawn at random from all words. Half show a definition and ask for
  // the word ('defToTerm'); half show a word and ask for the definition ('termToDef').
  // Each question has 4 choices: the answer plus 3 wrong words.
  function makeQuiz(allWords, count, rnd) {
    var picked = shuffle(allWords, rnd).slice(0, count), flags = [], i;
    for (i = 0; i < count; i++) flags.push(i < Math.floor(count / 2));
    flags = shuffle(flags, rnd);
    return picked.map(function (w, n) {
      var wrong = pickDistractors(w, allWords, 3, rnd);
      return { word: w, mode: flags[n] ? 'termToDef' : 'defToTerm', choices: shuffle([w].concat(wrong), rnd) };
    });
  }

  // The text on a quiz choice: a definition when the answer is a word, a word otherwise.
  function choiceLabel(q, w) { return q.mode === 'termToDef' ? w.def : w.term; }
  function isCorrect(q, w) { return w.term === q.word.term; }

  // Streak multiplier, as in Particle Count Dash: 3 in a row = x1.5, 6 in a row = x2.
  function multiplier(streak) { return streak >= 6 ? 2 : streak >= 3 ? 1.5 : 1; }

  // Quiz points. attempt 1 = right on the first try (x streak multiplier), 2 = right on the retry, 0 = revealed.
  function quizPoints(attempt, streakBefore) {
    if (attempt === 1) return Math.round(POINTS_FIRST * multiplier(streakBefore));
    if (attempt === 2) return POINTS_RETRY;
    return 0;
  }
  // Match points for one pair: full points if the word was matched with no wrong try, half after a mistake.
  function matchPoints(tries) { return tries === 0 ? POINTS_FIRST : POINTS_RETRY; }

  // Stars. Match: fewer mistakes is better. Quiz: more right on the first try is better.
  function matchStars(mistakes) { return mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1; }
  function quizStars(firstTry) { return firstTry >= 12 ? 3 : firstTry >= 9 ? 2 : firstTry >= 6 ? 1 : 0; }

  // ---- saving (localStorage, every access guarded) ----
  // Saved object: { v: 1, modes: { atoms: {stars, best}, light: {...}, quiz: {...} }, card: "★ 5 of 9" }
  function cardText(total) { return '★ ' + total + ' of ' + (MODES.length * MAX_STARS); }
  function totalStars(save) {
    return MODES.reduce(function (sum, m) { return sum + save.modes[m.id].stars; }, 0);
  }
  function emptySave() {
    var modes = {};
    MODES.forEach(function (m) { modes[m.id] = { stars: 0, best: 0 }; });
    return { v: 1, modes: modes, card: cardText(0) };
  }
  // Clean whatever was read back. Bad or missing data becomes an empty save.
  function cleanSave(raw) {
    var out = emptySave(), src = raw && typeof raw === 'object' && raw.modes ? raw.modes : null;
    if (src) {
      MODES.forEach(function (m) {
        var v = src[m.id] || {};
        out.modes[m.id] = { stars: clampInt(v.stars, 0, MAX_STARS), best: Math.max(0, Number(v.best) || 0) };
      });
    }
    out.card = cardText(totalStars(out));
    return out;
  }

  function createStore(getStorage) {
    function storage() { try { return getStorage(); } catch (e) { return null; } }
    function load() {
      try {
        var s = storage(), raw = s && s.getItem(STORE_KEY);
        return cleanSave(raw ? JSON.parse(raw) : null);
      } catch (e) { return cleanSave(null); }   // storage blocked or broken: start fresh
    }
    function save(data) {
      try { var s = storage(); if (s) s.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* keep playing */ }
    }
    var cache = load();
    return {
      get: function (id) { return cache.modes[id]; },
      card: function () { return cache.card; },
      // Save a finished game. Keeps the best score and the best stars. Returns true for a new best.
      record: function (id, score, stars) {
        var old = cache.modes[id], isBest = score > old.best;
        cache.modes[id] = { stars: Math.max(old.stars, stars), best: Math.max(old.best, score) };
        cache.card = cardText(totalStars(cache));
        save(cache);
        return isBest;
      },
      clear: function () {
        try { var s = storage(); if (s) s.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
        cache = cleanSave(null);
      }
    };
  }

  var VM = {
    WORDS: WORDS, shuffle: shuffle, pickDistractors: pickDistractors, matchRounds: matchRounds,
    makeQuiz: makeQuiz, choiceLabel: choiceLabel, isCorrect: isCorrect, multiplier: multiplier,
    quizPoints: quizPoints, matchPoints: matchPoints, matchStars: matchStars, quizStars: quizStars,
    cardText: cardText, cleanSave: cleanSave, createStore: createStore
  };
  root.VM_GAME = VM;
  if (typeof document === 'undefined') return;

  /* ================= PART 2: THE PAGE ================= */

  var $ = function (id) { return document.getElementById(id); };
  function h(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function starString(n) { return '★★★'.slice(0, n) + '☆☆☆'.slice(0, MAX_STARS - n); }

  function init() {
    var store = createStore(function () { return window.localStorage; });
    var st = null;   // the game on screen
    var screens = { start: $('vm-start'), play: $('vm-play'), end: $('vm-end') };
    var el = {
      modes: $('vm-modes'), total: $('vm-total'), reset: $('vm-reset'), resetNote: $('vm-reset-note'),
      hudMode: $('vm-hud-mode'), hudProgress: $('vm-hud-progress'), hudMistLabel: $('vm-hud-mist-label'),
      hudMist: $('vm-hud-mist'), hudPoints: $('vm-hud-points'), hudStreakBox: $('vm-hud-streak-box'),
      hudStreak: $('vm-hud-streak'), leave: $('vm-leave'),
      prompt: $('vm-prompt'), match: $('vm-match'), terms: $('vm-terms'), defs: $('vm-defs'),
      quiz: $('vm-quiz'), word: $('vm-word'), options: $('vm-options'),
      feedback: $('vm-feedback'), next: $('vm-next'),
      endTitle: $('vm-end-title'), endScore: $('vm-end-score'), endStars: $('vm-end-stars'),
      endDetail: $('vm-end-detail'), endBest: $('vm-end-best'), recap: $('vm-recap'), review: $('vm-review'),
      again: $('vm-again'), choose: $('vm-choose')
    };

    // Fill the static text from data.js.
    Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (n) {
      var v = T[n.getAttribute('data-copy')];
      if (v != null) n.textContent = v;
    });

    function show(name) {
      Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== name; });
      window.scrollTo(0, 0);
    }

    function feedback(kind, lines) {
      el.feedback.textContent = '';
      el.feedback.className = 'vm-feedback' + (kind === 'good' ? ' vm-fb-good' : kind === 'bad' ? ' vm-fb-bad' : '');
      lines.forEach(function (text) { el.feedback.appendChild(h('p', null, text)); });
    }

    function flash(buttons) {
      buttons.forEach(function (b) { b.classList.add('vm-flash'); });
      setTimeout(function () { buttons.forEach(function (b) { b.classList.remove('vm-flash'); }); }, FLASH_MS);
    }

    /* ---- start screen ---- */
    function renderModes() {
      el.modes.textContent = '';
      el.total.textContent = fill(T.totalLine, { card: store.card() });
      MODES.forEach(function (m, i) {
        var rec = store.get(m.id);
        var count = m.type === 'match' ? groupWords(m.group).length : m.count;
        var countText = fill(m.type === 'match' ? T.pairsLabel : T.questionsLabel, { n: count });
        var best = rec.best ? fill(T.bestLabel, { n: rec.best }) : T.noBest;
        var li = h('li'), b = h('button', 'vm-mode panel');
        b.type = 'button';
        b.setAttribute('data-mode', m.id);
        b.setAttribute('aria-label', [m.name, m.blurb, countText, fill(T.starsLabel, { n: rec.stars }), best].join('. '));
        b.appendChild(h('span', 'vm-mode-num', String(i + 1)));
        b.appendChild(h('span', 'vm-mode-name', m.name));
        b.appendChild(h('span', 'vm-mode-blurb', m.blurb));
        b.appendChild(h('span', 'vm-mode-count', countText));
        var meta = h('span', 'vm-mode-meta'), starEl = h('span', 'vm-stars', starString(rec.stars));
        starEl.setAttribute('aria-hidden', 'true');
        meta.appendChild(starEl);
        meta.appendChild(h('span', 'vm-mode-best', best));
        b.appendChild(meta);
        li.appendChild(b);
        el.modes.appendChild(li);
      });
    }
    el.modes.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-mode]');
      if (b) startMode(b.getAttribute('data-mode'));
    });
    el.reset.addEventListener('click', function () {
      if (!window.confirm(T.startOverConfirm)) return;
      store.clear();
      renderModes();
      el.resetNote.textContent = T.startOverDone;
    });

    /* ---- starting and the HUD ---- */
    function startMode(id) {
      var m = MODES.filter(function (x) { return x.id === id; })[0];
      st = { mode: m, idx: 0, mistakes: 0, firstTry: 0, points: 0, streak: 0,
             rounds: null, questions: null,
             missed: [], missedSeen: {},
             // match state (one round at a time)
             selected: null, roundOver: false, doneCount: 0, done: {}, tries: {}, btnFor: {},
             // quiz state (one question at a time)
             wrongs: 0, answered: false, btns: [] };
      if (m.type === 'match') st.rounds = matchRounds(groupWords(m.group), m.per);
      else st.questions = makeQuiz(WORDS, m.count);
      el.hudMode.textContent = m.name;
      el.hudMistLabel.textContent = m.type === 'match' ? T.hudMistakes : T.hudFirstTry;
      el.hudStreakBox.hidden = m.type !== 'quiz';
      el.match.hidden = m.type !== 'match';
      el.quiz.hidden = m.type !== 'quiz';
      show('play');
      if (m.type === 'match') renderRound(); else renderQuestion();
    }

    function updateHud() {
      var m = st.mode, total = m.type === 'match' ? st.rounds.length : st.questions.length;
      var mult = multiplier(st.streak);
      el.hudProgress.textContent = fill(m.type === 'match' ? T.roundLabel : T.questionLabel, { n: st.idx + 1, t: total });
      el.hudMist.textContent = String(m.type === 'match' ? st.mistakes : st.firstTry);
      el.hudPoints.textContent = String(st.points);
      el.hudStreak.textContent = st.streak + (mult > 1 ? ' ×' + mult : '');
      el.hudStreakBox.classList.toggle('vm-hot', st.streak >= 3);
    }

    function addMissed(w) {
      if (st.missedSeen[w.term]) return;
      st.missedSeen[w.term] = true;
      st.missed.push(w);
    }

    el.leave.addEventListener('click', function () { renderModes(); show('start'); });

    /* ---- match mode: one round is a set of 6 (or 4) pairs ---- */
    function renderRound() {
      var words = st.rounds[st.idx];
      st.selected = null; st.roundOver = false; st.doneCount = 0; st.done = {}; st.btnFor = {};
      el.terms.textContent = '';
      el.defs.textContent = '';
      el.prompt.textContent = T.matchPrompt;
      el.next.hidden = true;
      feedback(null, []);
      words.forEach(function (w) {
        var b = h('button', 'vm-choice vm-term', w.term);
        b.type = 'button';
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () { pickTerm(w); });
        el.terms.appendChild(b);
        st.btnFor[w.term] = { term: b };
      });
      shuffle(words).forEach(function (w) {
        var b = h('button', 'vm-choice vm-def', w.def);
        b.type = 'button';
        b.addEventListener('click', function () { pickDef(w, b); });
        el.defs.appendChild(b);
        st.btnFor[w.term].def = b;
      });
      updateHud();
      el.prompt.focus();
    }

    function pickTerm(w) {
      if (st.roundOver || st.done[w.term]) return;
      st.selected = w;
      Object.keys(st.btnFor).forEach(function (k) {
        st.btnFor[k].term.setAttribute('aria-pressed', String(k === w.term));
      });
      feedback('info', [T.matchPickDef]);
    }

    function pickDef(w, b) {
      if (st.roundOver || st.done[w.term]) return;
      if (!st.selected) { feedback('info', [T.matchPickTermFirst]); return; }
      var t = st.selected, termBtn = st.btnFor[t.term].term;
      if (w.term === t.term) {
        var pts = matchPoints(st.tries[t.term] || 0);
        st.points += pts;
        st.done[t.term] = true;
        st.doneCount++;
        st.selected = null;
        [termBtn, b].forEach(function (x) { x.classList.add('vm-done'); x.disabled = true; });
        termBtn.setAttribute('aria-pressed', 'false');
        feedback('good', [fill(T.matchRight, { term: t.term, pts: pts })]);
        if (st.doneCount === st.rounds[st.idx].length) roundComplete();
      } else {
        st.mistakes++;
        st.tries[t.term] = (st.tries[t.term] || 0) + 1;
        addMissed(t);
        flash([termBtn, b]);
        termBtn.setAttribute('aria-pressed', 'false');
        st.selected = null;
        feedback('bad', [T.matchWrong, fill(T.matchHint, { term: t.term, hint: t.hint })]);
      }
      updateHud();
    }

    function roundComplete() {
      st.roundOver = true;
      feedback('good', [T.roundDone]);
      el.next.textContent = st.idx === st.rounds.length - 1 ? T.seeResults : T.nextRound;
      el.next.hidden = false;
      el.next.focus();
    }

    /* ---- quiz mode: one question at a time ---- */
    function renderQuestion() {
      var q = st.questions[st.idx];
      st.wrongs = 0; st.answered = false; st.btns = [];
      el.next.hidden = true;
      el.options.textContent = '';
      feedback(null, []);
      el.prompt.textContent = q.mode === 'defToTerm' ? T.quizPromptDef : T.quizPromptTerm;
      el.word.textContent = q.mode === 'defToTerm' ? q.word.def : q.word.term;
      q.choices.forEach(function (w) {
        var b = h('button', 'vm-option', choiceLabel(q, w));
        b.type = 'button';
        b.addEventListener('click', function () { choose(w, b); });
        el.options.appendChild(b);
        st.btns.push({ word: w, btn: b });
      });
      updateHud();
      el.prompt.focus();
    }

    function choose(w, b) {
      if (st.answered || b.getAttribute('aria-disabled') === 'true') return;
      var q = st.questions[st.idx];
      if (isCorrect(q, w)) {
        var attempt = st.wrongs === 0 ? 1 : 2, pts = quizPoints(attempt, st.streak);
        st.points += pts;
        if (attempt === 1) { st.firstTry++; st.streak++; }
        b.classList.add('vm-right');
        feedback('good', [fill(attempt === 1 ? T.quizRight : T.quizRightRetry, { pts: pts })]);
        answered();
      } else if (st.wrongs === 0) {
        // First wrong choice: show the hint and let the student try once more.
        st.wrongs = 1; st.streak = 0;
        addMissed(q.word);
        b.classList.add('vm-wrong');
        b.setAttribute('aria-disabled', 'true');
        feedback('bad', [fill(T.quizWrong, { hint: q.word.hint }), T.quizTryAgain]);
        updateHud();
      } else {
        // Second wrong choice: show the right answer with its meaning.
        st.wrongs = 2; st.streak = 0;
        b.classList.add('vm-wrong');
        st.btns.forEach(function (x) { if (isCorrect(q, x.word)) x.btn.classList.add('vm-right'); });
        feedback('bad', [fill(T.quizReveal, { term: q.word.term, def: q.word.def })]);
        answered();
      }
    }

    function answered() {
      st.answered = true;
      st.btns.forEach(function (x) { x.btn.setAttribute('aria-disabled', 'true'); });
      el.next.textContent = st.idx === st.questions.length - 1 ? T.seeResults : T.next;
      el.next.hidden = false;
      el.next.focus();
      updateHud();
    }

    /* ---- moving on and the end screen ---- */
    el.next.addEventListener('click', function () {
      var last = st.mode.type === 'match' ? st.idx === st.rounds.length - 1 : st.idx === st.questions.length - 1;
      if (last) return finish();
      st.idx++;
      if (st.mode.type === 'match') renderRound(); else renderQuestion();
    });

    function finish() {
      var m = st.mode, stars, detail;
      if (m.type === 'match') {
        stars = matchStars(st.mistakes);
        detail = fill(T.endMistakesLine, { n: st.mistakes });
      } else {
        stars = quizStars(st.firstTry);
        detail = fill(T.endFirstLine, { n: st.firstTry, t: st.questions.length });
      }
      var isBest = store.record(m.id, st.points, stars);
      el.endTitle.textContent = T.endTitle;
      el.endScore.textContent = String(st.points);
      el.endStars.textContent = starString(stars);
      el.endStars.setAttribute('aria-label', fill(T.starsLabel, { n: stars }));
      el.endDetail.textContent = detail;
      el.endBest.hidden = !isBest;
      el.recap.textContent = '';
      T.recap[m.id].forEach(function (line) { el.recap.appendChild(h('li', null, line)); });
      el.review.textContent = '';
      if (!st.missed.length) el.review.appendChild(h('li', 'vm-review-none', T.reviewNone));
      st.missed.forEach(function (w) {
        var li = h('li', 'vm-review-item');
        li.appendChild(h('p', 'vm-review-term', w.term));
        li.appendChild(h('p', 'vm-review-def', w.def));
        el.review.appendChild(li);
      });
      show('end');
      el.endTitle.focus();
    }

    el.again.addEventListener('click', function () { if (st) startMode(st.mode.id); });
    el.choose.addEventListener('click', function () { renderModes(); show('start'); });

    renderModes();
    show('start');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
