/*
 * Symbol Sprint — Mr. D's Chemistry Games
 * A 60-second round: match element names and symbols.
 * Plain script, no build step. Everything is inside one function so nothing leaks
 * into the page. Event listeners are attached once, in init().
 */
(function () {
  'use strict';

  // ---------- Settings ----------
  var ROUND_MS = 60 * 1000;
  var TICK_MS = 100;
  var FEEDBACK_RIGHT_MS = 600;   // pause after a correct answer
  var FEEDBACK_WRONG_MS = 1400;  // longer pause so the right answer can be read
  var ARM_DELAY_MS = 150;        // ignore taps this soon after a new question (stops a double-tap carrying over)
  var END_GUARD_MS = 700;        // ignore end-screen buttons this soon after time runs out
  var STORE_PREFIX = 'mrd-games:symbol-sprint:';

  var N2S = 'name-to-symbol';
  var S2N = 'symbol-to-name';

  // ---------- Element data (z = atomic number, US spelling) ----------
  var ELEMENTS = [
    { z: 1, symbol: 'H', name: 'Hydrogen' },
    { z: 2, symbol: 'He', name: 'Helium' },
    { z: 3, symbol: 'Li', name: 'Lithium' },
    { z: 4, symbol: 'Be', name: 'Beryllium' },
    { z: 5, symbol: 'B', name: 'Boron' },
    { z: 6, symbol: 'C', name: 'Carbon' },
    { z: 7, symbol: 'N', name: 'Nitrogen' },
    { z: 8, symbol: 'O', name: 'Oxygen' },
    { z: 9, symbol: 'F', name: 'Fluorine' },
    { z: 10, symbol: 'Ne', name: 'Neon' },
    { z: 11, symbol: 'Na', name: 'Sodium' },
    { z: 12, symbol: 'Mg', name: 'Magnesium' },
    { z: 13, symbol: 'Al', name: 'Aluminum' },
    { z: 14, symbol: 'Si', name: 'Silicon' },
    { z: 15, symbol: 'P', name: 'Phosphorus' },
    { z: 16, symbol: 'S', name: 'Sulfur' },
    { z: 17, symbol: 'Cl', name: 'Chlorine' },
    { z: 18, symbol: 'Ar', name: 'Argon' },
    { z: 19, symbol: 'K', name: 'Potassium' },
    { z: 20, symbol: 'Ca', name: 'Calcium' },
    { z: 21, symbol: 'Sc', name: 'Scandium' },
    { z: 22, symbol: 'Ti', name: 'Titanium' },
    { z: 23, symbol: 'V', name: 'Vanadium' },
    { z: 24, symbol: 'Cr', name: 'Chromium' },
    { z: 25, symbol: 'Mn', name: 'Manganese' },
    { z: 26, symbol: 'Fe', name: 'Iron' },
    { z: 27, symbol: 'Co', name: 'Cobalt' },
    { z: 28, symbol: 'Ni', name: 'Nickel' },
    { z: 29, symbol: 'Cu', name: 'Copper' },
    { z: 30, symbol: 'Zn', name: 'Zinc' },
    { z: 31, symbol: 'Ga', name: 'Gallium' },
    { z: 32, symbol: 'Ge', name: 'Germanium' },
    { z: 33, symbol: 'As', name: 'Arsenic' },
    { z: 34, symbol: 'Se', name: 'Selenium' },
    { z: 35, symbol: 'Br', name: 'Bromine' },
    { z: 36, symbol: 'Kr', name: 'Krypton' },
    { z: 47, symbol: 'Ag', name: 'Silver' },
    { z: 50, symbol: 'Sn', name: 'Tin' },
    { z: 53, symbol: 'I', name: 'Iodine' },
    { z: 56, symbol: 'Ba', name: 'Barium' },
    { z: 74, symbol: 'W', name: 'Tungsten' },
    { z: 78, symbol: 'Pt', name: 'Platinum' },
    { z: 79, symbol: 'Au', name: 'Gold' },
    { z: 80, symbol: 'Hg', name: 'Mercury' },
    { z: 82, symbol: 'Pb', name: 'Lead' },
    { z: 92, symbol: 'U', name: 'Uranium' }
  ];

  // Pairs students often mix up — always strong distractors for each other.
  var MIXUP_PAIRS = [['Ag', 'Au'], ['Mg', 'Mn'], ['K', 'P'], ['Sn', 'Ti'], ['Cu', 'Co']];
  var MIXUPS = {};
  MIXUP_PAIRS.forEach(function (pair) {
    (MIXUPS[pair[0]] = MIXUPS[pair[0]] || {})[pair[1]] = true;
    (MIXUPS[pair[1]] = MIXUPS[pair[1]] || {})[pair[0]] = true;
  });

  // ---------- Small helpers ----------
  function randInt(n) {
    return Math.floor(Math.random() * n);
  }

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = randInt(i + 1);
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(STORE_PREFIX + key);
    } catch (e) {
      return null; // storage blocked (private mode, school policy, etc.)
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(STORE_PREFIX + key, String(value));
    } catch (e) {
      /* storage blocked or full — the game still works, it just won't remember */
    }
  }

  // Remember best scores in memory too, so "best" still works between rounds
  // even when the browser blocks storage.
  var memoryBest = {};

  function getBest(mode) {
    var stored = parseInt(storageGet('best:' + mode), 10);
    if (!isFinite(stored) || stored < 0) stored = 0;
    return Math.max(stored, memoryBest[mode] || 0);
  }

  function setBest(mode, score) {
    memoryBest[mode] = score;
    storageSet('best:' + mode, score);
  }

  // ---------- Question building ----------

  // "Mg" could pass as an abbreviation of "Manganese": same first letter, and its
  // second letter appears later in the name.
  function looksLikeAbbreviation(symbol, name) {
    var s = symbol.toLowerCase();
    var n = name.toLowerCase();
    if (s.charAt(0) !== n.charAt(0)) return false;
    return s.length === 1 || n.indexOf(s.charAt(1), 1) !== -1;
  }

  // How tempting is `c` as a wrong answer when the right answer is `a`?
  function similarity(a, c, mode) {
    var score = 0;
    var aSym = a.symbol.charAt(0);
    var cSym = c.symbol.charAt(0);
    var aName = a.name.charAt(0);
    var cName = c.name.charAt(0);

    if (MIXUPS[a.symbol] && MIXUPS[a.symbol][c.symbol]) score += 3;
    if (cSym === aSym) score += 2;                      // Na / Ne / Ni

    if (mode === N2S) {
      if (cSym === aName) score += 2;                   // Sodium → S, Si, Sn?
      if (looksLikeAbbreviation(c.symbol, a.name)) score += 1;
      if (c.symbol.length === a.symbol.length) score += 0.5;
    } else {
      if (cName === aSym) score += 2;                   // K → Krypton?
      if (cName === aName) score += 1.5;                // Potassium / Phosphorus / Platinum
    }
    return score;
  }

  function symbolKey(e) { return e.symbol.charAt(0); }
  function nameKey(e) { return e.name.charAt(0); }
  function lengthKey(e) { return e.symbol.length; }

  // A guard makes sure the answer doesn't stand out, e.g. it shouldn't be the only
  // option starting with "N" or the only one-letter symbol.
  function guardSatisfied(picked, answer, keyFn) {
    var k = keyFn(answer);
    for (var i = 0; i < picked.length; i++) {
      if (keyFn(picked[i]) === k) return true;
    }
    return false;
  }

  function applyGuards(picked, ranked, answer, guards) {
    for (var g = 0; g < guards.length; g++) {
      var keyFn = guards[g];
      if (guardSatisfied(picked, answer, keyFn)) continue;

      var k = keyFn(answer);
      var replacement = null;
      for (var r = 0; r < ranked.length; r++) {
        if (picked.indexOf(ranked[r]) === -1 && keyFn(ranked[r]) === k) {
          replacement = ranked[r];
          break;
        }
      }
      if (!replacement) continue;

      // Replace the weakest pick whose removal keeps earlier guards happy.
      for (var slot = picked.length - 1; slot >= 0; slot--) {
        var trial = picked.slice();
        trial[slot] = replacement;
        var ok = true;
        for (var e = 0; e < g; e++) {
          if (guardSatisfied(picked, answer, guards[e]) && !guardSatisfied(trial, answer, guards[e])) {
            ok = false;
            break;
          }
        }
        if (ok) {
          picked[slot] = replacement;
          break;
        }
      }
    }
  }

  // Three unique wrong answers from the data set, preferring confusable ones.
  function pickDistractors(answer, mode) {
    var scored = [];
    for (var i = 0; i < ELEMENTS.length; i++) {
      var c = ELEMENTS[i];
      if (c.z === answer.z) continue;
      // random jitter (< 1.5) keeps rounds varied; low scorers end up in random order
      scored.push({ el: c, score: similarity(answer, c, mode) + Math.random() * 1.5 });
    }
    scored.sort(function (x, y) { return y.score - x.score; });
    var ranked = scored.map(function (s) { return s.el; });
    var picked = ranked.slice(0, 3);
    var guards = mode === N2S ? [symbolKey, lengthKey] : [nameKey];
    applyGuards(picked, ranked, answer, guards);
    return picked;
  }

  function buildOptions(answer, mode) {
    return shuffle([answer].concat(pickDistractors(answer, mode)));
  }

  // ---------- Game state ----------
  var state = {
    phase: 'start',        // 'start' | 'playing' | 'paused' | 'end'
    mode: N2S,
    score: 0,
    answered: 0,
    streak: 0,
    bestStreak: 0,
    missed: [],            // [{ el, count }] in order of first miss
    current: null,
    options: [],
    locked: true,
    armedAt: 0,
    endAt: 0,
    remaining: ROUND_MS,
    endShownAt: 0,
    deck: [],
    lastZ: null,
    shownSeconds: -1
  };

  // The only two timer handles in the game. Always cleared before being set again.
  var tickHandle = null;
  var feedbackHandle = null;

  function stopTicking() {
    if (tickHandle !== null) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  }

  function startTicking() {
    stopTicking();
    tickHandle = setInterval(tick, TICK_MS);
    tick();
  }

  function clearFeedbackTimer() {
    if (feedbackHandle !== null) {
      clearTimeout(feedbackHandle);
      feedbackHandle = null;
    }
  }

  // ---------- DOM ----------
  var dom = {};

  function $(id) {
    return document.getElementById(id);
  }

  function focusEl(node) {
    if (!node) return;
    try {
      node.focus({ preventScroll: true });
    } catch (e) {
      node.focus();
    }
    var rect = dom.game.getBoundingClientRect();
    var viewH = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < 0 || rect.top > viewH * 0.5) {
      dom.game.scrollIntoView({ block: 'start' });
    } else if (rect.bottom > viewH) {
      // The game starts on screen but runs off the bottom (e.g. a 1366x768 Chromebook):
      // scroll just enough to show all of it, without pushing its top off the screen.
      window.scrollBy(0, Math.min(rect.top, rect.bottom - viewH));
    }
  }

  function showScreen(name) {
    dom.screenStart.hidden = name !== 'start';
    dom.screenPlay.hidden = name !== 'play';
    dom.screenEnd.hidden = name !== 'end';
  }

  function selectedMode() {
    for (var i = 0; i < dom.modeInputs.length; i++) {
      if (dom.modeInputs[i].checked) return dom.modeInputs[i].value === S2N ? S2N : N2S;
    }
    return N2S;
  }

  function updateStartBest() {
    var best = getBest(selectedMode());
    dom.startBest.textContent = best > 0 ? String(best) : '—';
  }

  function updateHud() {
    dom.score.textContent = String(state.score);
    dom.streak.textContent = String(state.streak);
  }

  function renderTime(ms) {
    var clamped = Math.max(0, Math.min(ROUND_MS, ms));
    var seconds = Math.ceil(clamped / 1000);
    if (seconds !== state.shownSeconds) {
      state.shownSeconds = seconds;
      dom.time.textContent = String(seconds);
      dom.screenPlay.classList.toggle('is-low', seconds <= 10);
    }
    dom.timebar.style.transform = 'scaleX(' + (clamped / ROUND_MS).toFixed(4) + ')';
  }

  function tick() {
    var left = state.endAt - performance.now();
    if (left <= 0) {
      endRound();
      return;
    }
    renderTime(left);
  }

  // ---------- Round flow ----------

  // Shuffled deck: every element appears once before any repeats, and the first
  // card of a new deck is never the element that was just shown.
  function drawElement() {
    if (state.deck.length === 0) {
      state.deck = shuffle(ELEMENTS.slice());
      var top = state.deck.length - 1;
      if (state.lastZ !== null && top > 0 && state.deck[top].z === state.lastZ) {
        var swapWith = randInt(top);
        var tmp = state.deck[top];
        state.deck[top] = state.deck[swapWith];
        state.deck[swapWith] = tmp;
      }
    }
    var next = state.deck.pop();
    state.lastZ = next.z;
    return next;
  }

  // announce: read the new question out through the live region. Not wanted when the
  // heading is about to get focus (start of a round, after Resume), since the
  // heading already says the question and it would be heard twice.
  function renderQuestion(announce) {
    var q = state.current;
    var n2s = state.mode === N2S;

    dom.tile.classList.remove('is-right', 'is-wrong');
    dom.tile.setAttribute('data-ask', n2s ? 'symbol' : 'name');
    dom.tileZ.textContent = String(q.z);
    dom.tileSymbol.textContent = n2s ? '?' : q.symbol;
    dom.tileName.textContent = n2s ? q.name : '?';
    // Hidden end of the heading: "Pick the symbol for Krypton" / "Pick the element for the symbol Kr"
    dom.promptTarget.textContent = n2s ? ' ' + q.name : ' the symbol ' + q.symbol;
    var spoken = n2s
      ? 'Which symbol is ' + q.name + '?'
      : 'Which element has the symbol ' + q.symbol + '?';
    dom.promptSr.textContent = announce ? spoken : '';

    dom.options.classList.remove('is-locked');
    for (var i = 0; i < dom.optionBtns.length; i++) {
      var btn = dom.optionBtns[i];
      var opt = state.options[i];
      btn.classList.remove('is-correct', 'is-wrong');
      btn.removeAttribute('aria-disabled');
      dom.optionTexts[i].textContent = n2s ? opt.symbol : opt.name;
    }

    dom.feedback.textContent = '';
    dom.feedback.className = 'feedback';
  }

  function nextQuestion(announce) {
    clearFeedbackTimer();
    state.current = drawElement();
    state.options = buildOptions(state.current, state.mode);
    state.locked = false;
    state.armedAt = performance.now() + ARM_DELAY_MS;
    renderQuestion(announce);
  }

  function startRound() {
    stopTicking();
    clearFeedbackTimer();

    state.mode = selectedMode();
    state.phase = 'playing';
    state.score = 0;
    state.answered = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.missed = [];
    state.deck = [];
    state.lastZ = null;
    state.shownSeconds = -1;
    state.remaining = ROUND_MS;

    var n2s = state.mode === N2S;
    dom.promptText.textContent = n2s ? 'Pick the symbol for' : 'Pick the element for';
    dom.options.classList.toggle('is-names', !n2s);
    dom.question.hidden = false;
    dom.paused.hidden = true;
    dom.pauseBtn.hidden = false;

    updateHud();
    nextQuestion(false); // the focused heading below says the first question
    showScreen('play');

    state.endAt = performance.now() + ROUND_MS;
    renderTime(ROUND_MS);
    startTicking();
    focusEl(dom.promptLabel);
  }

  function recordMiss(el) {
    for (var i = 0; i < state.missed.length; i++) {
      if (state.missed[i].el.z === el.z) {
        state.missed[i].count++;
        return;
      }
    }
    state.missed.push({ el: el, count: 1 });
  }

  function choose(index) {
    if (state.phase !== 'playing' || state.locked) return;
    if (performance.now() < state.armedAt) return;
    var picked = state.options[index];
    if (!picked) return;

    state.locked = true;
    var q = state.current;
    var right = picked.z === q.z;

    state.answered++;
    if (right) {
      state.score++;
      state.streak++;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    } else {
      state.streak = 0;
      recordMiss(q);
    }
    updateHud();
    showFeedback(right, index);

    clearFeedbackTimer();
    feedbackHandle = setTimeout(function () {
      feedbackHandle = null;
      if (state.phase === 'playing') nextQuestion(true);
    }, right ? FEEDBACK_RIGHT_MS : FEEDBACK_WRONG_MS);
  }

  function showFeedback(right, chosenIndex) {
    var q = state.current;
    var n2s = state.mode === N2S;

    dom.options.classList.add('is-locked');
    for (var i = 0; i < dom.optionBtns.length; i++) {
      dom.optionBtns[i].setAttribute('aria-disabled', 'true');
      if (state.options[i].z === q.z) dom.optionBtns[i].classList.add('is-correct');
    }
    if (!right) dom.optionBtns[chosenIndex].classList.add('is-wrong');

    dom.tileSymbol.textContent = q.symbol;
    dom.tileName.textContent = q.name;
    dom.tile.removeAttribute('data-ask');
    dom.tile.classList.add(right ? 'is-right' : 'is-wrong');

    var fact = n2s ? q.name + ' is ' + q.symbol + '.' : q.symbol + ' is ' + q.name + '.';
    var message;
    if (right) {
      message = 'Correct! ' + fact;
      if (state.streak >= 3) message += ' ' + state.streak + ' in a row!';
    } else {
      message = 'Not quite — ' + fact;
    }
    dom.feedback.textContent = message;
    dom.feedback.className = 'feedback ' + (right ? 'is-right' : 'is-wrong');
  }

  function pause() {
    if (state.phase !== 'playing') return;
    var left = state.endAt - performance.now();
    if (left <= 0) {
      endRound();
      return;
    }
    stopTicking();
    state.remaining = left;
    state.phase = 'paused';
    renderTime(left);

    // If feedback was showing, move straight on so nothing is pending while paused.
    // (Resume focuses the heading, which says the new question.)
    if (feedbackHandle !== null) nextQuestion(false);

    dom.question.hidden = true;
    dom.pauseBtn.hidden = true;
    dom.paused.hidden = false;
    if (!document.hidden) focusEl(dom.resumeBtn);
  }

  function resume() {
    if (state.phase !== 'paused') return;
    state.phase = 'playing';
    state.endAt = performance.now() + state.remaining;
    state.armedAt = performance.now() + ARM_DELAY_MS;
    dom.paused.hidden = true;
    dom.pauseBtn.hidden = false;
    dom.question.hidden = false;
    startTicking();
    focusEl(dom.promptLabel);
  }

  function renderMissed() {
    dom.missedList.textContent = '';
    var hasMisses = state.missed.length > 0;
    dom.missedList.hidden = !hasMisses;
    dom.missedHeading.hidden = !hasMisses;
    dom.missedEmpty.hidden = hasMisses;

    if (!hasMisses) {
      dom.missedEmpty.textContent = state.answered > 0
        ? 'No misses — perfect round!'
        : 'No answers this time. Give it another go!';
      return;
    }

    state.missed.forEach(function (m) {
      var li = document.createElement('li');
      var name = document.createElement('span');
      name.className = 'missed-name';
      name.textContent = m.el.name;
      var arrow = document.createElement('span');
      arrow.className = 'missed-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      var sep = document.createElement('span');
      sep.className = 'sr-only';
      sep.textContent = ' is ';
      var sym = document.createElement('span');
      sym.className = 'missed-symbol';
      sym.textContent = m.el.symbol;
      li.appendChild(name);
      li.appendChild(arrow);
      li.appendChild(sep);
      li.appendChild(sym);
      if (m.count > 1) {
        var count = document.createElement('span');
        count.className = 'missed-count';
        count.setAttribute('aria-hidden', 'true');
        count.textContent = '×' + m.count;
        var countSr = document.createElement('span');
        countSr.className = 'sr-only';
        countSr.textContent = ' (missed ' + m.count + ' times)';
        li.appendChild(count);
        li.appendChild(countSr);
      }
      dom.missedList.appendChild(li);
    });
  }

  function endRound() {
    stopTicking();
    clearFeedbackTimer();
    if (state.phase !== 'playing' && state.phase !== 'paused') return;

    state.phase = 'end';
    state.locked = true;
    renderTime(0);

    var previousBest = getBest(state.mode);
    var isNewBest = state.score > previousBest;
    if (isNewBest) setBest(state.mode, state.score);

    dom.finalScore.textContent = String(state.score);
    dom.finalDetail.textContent = state.answered === 1
      ? 'out of 1 answered'
      : 'out of ' + state.answered + ' answered';
    dom.newBest.hidden = !isNewBest;
    dom.endBest.textContent = String(Math.max(previousBest, state.score));
    dom.endAccuracy.textContent = state.answered > 0
      ? Math.round((100 * state.score) / state.answered) + '%'
      : '—';
    dom.endStreak.textContent = String(state.bestStreak);
    renderMissed();
    updateStartBest();

    state.endShownAt = performance.now();
    showScreen('end');
    focusEl(dom.endTitle);
  }

  function endScreenReady() {
    return state.phase === 'end' && performance.now() - state.endShownAt >= END_GUARD_MS;
  }

  // ---------- Events (attached once) ----------

  function onKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (state.phase === 'playing') {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        pause();
        return;
      }
      var n = '1234'.indexOf(event.key);
      if (n !== -1 && event.key.length === 1) {
        event.preventDefault();
        if (!event.repeat) choose(n);
      }
    }
  }

  function init() {
    dom.game = $('game');
    dom.screenStart = $('screen-start');
    dom.screenPlay = $('screen-play');
    dom.screenEnd = $('screen-end');
    dom.startBtn = $('start-btn');
    dom.startBest = $('start-best');
    dom.modeInputs = document.querySelectorAll('input[name="mode"]');
    dom.score = $('score');
    dom.streak = $('streak');
    dom.time = $('time');
    dom.timebar = $('timebar');
    dom.pauseBtn = $('pause-btn');
    dom.question = $('question');
    dom.promptLabel = $('prompt-label');
    dom.promptText = $('prompt-text');
    dom.promptTarget = $('prompt-target');
    dom.promptSr = $('prompt-sr');
    dom.tile = $('tile');
    dom.tileZ = $('tile-z');
    dom.tileSymbol = $('tile-symbol');
    dom.tileName = $('tile-name');
    dom.options = $('options');
    dom.optionBtns = dom.options ? dom.options.querySelectorAll('.option') : [];
    dom.optionTexts = dom.options ? dom.options.querySelectorAll('.option-text') : [];
    dom.feedback = $('feedback');
    dom.paused = $('paused');
    dom.resumeBtn = $('resume-btn');
    dom.endTitle = $('end-title');
    dom.finalScore = $('final-score');
    dom.finalDetail = $('final-detail');
    dom.newBest = $('new-best');
    dom.endBest = $('end-best');
    dom.endAccuracy = $('end-accuracy');
    dom.endStreak = $('end-streak');
    dom.missedHeading = $('missed-heading');
    dom.missedList = $('missed-list');
    dom.missedEmpty = $('missed-empty');
    dom.againBtn = $('again-btn');
    dom.homeLink = $('home-link');

    if (!dom.game || !dom.promptText || !dom.promptTarget ||
        dom.optionBtns.length !== 4 || dom.optionTexts.length !== 4) return;

    // Restore the last mode used on this device.
    var savedMode = storageGet('mode');
    for (var i = 0; i < dom.modeInputs.length; i++) {
      if (savedMode === S2N || savedMode === N2S) {
        dom.modeInputs[i].checked = dom.modeInputs[i].value === savedMode;
      }
      dom.modeInputs[i].addEventListener('change', function () {
        storageSet('mode', selectedMode());
        updateStartBest();
      });
    }

    dom.startBtn.addEventListener('click', startRound);

    for (var b = 0; b < dom.optionBtns.length; b++) {
      (function (index) {
        dom.optionBtns[index].addEventListener('click', function () {
          choose(index);
        });
      })(b);
    }

    dom.pauseBtn.addEventListener('click', pause);
    dom.resumeBtn.addEventListener('click', resume);

    dom.againBtn.addEventListener('click', function () {
      if (endScreenReady()) startRound();
    });
    dom.homeLink.addEventListener('click', function (event) {
      if (!endScreenReady()) event.preventDefault();
    });

    document.addEventListener('keydown', onKeyDown);
    // Leaving the tab or app pauses the clock; coming back shows the Paused panel.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        pause();
      } else if (state.phase === 'paused' &&
                 (!document.activeElement || document.activeElement === document.body)) {
        focusEl(dom.resumeBtn);
      }
    });

    updateStartBest();
    showScreen('start');
    dom.startBtn.disabled = false;
  }

  init();
})();
