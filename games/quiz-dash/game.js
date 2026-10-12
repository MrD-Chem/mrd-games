/*
 * Quiz Dash — Mr. D's Chemistry Games
 * A three-lane pseudo-3D runner with a checkpoint question every 150 m.
 *
 * Rebuilt from the original single-file game so it stays light on Chromebooks and iPads:
 *  - the animation loop only runs while you are actually running; the start slides,
 *    questions and game-over card are one still frame, and leaving the tab pauses;
 *  - fixed 60 Hz steps with swept collisions, so a slow device never skips an obstacle;
 *  - obstacles, coins, trees and particles live in fixed-size pools that are reused, so
 *    the frame loop makes no new arrays, objects or strings;
 *  - every shape is drawn once into a sprite sheet and then copied with drawImage;
 *  - the score bar is only touched when a number actually changes.
 * Plain script, no build step. Everything is inside one function, and every event
 * listener is attached once, in init().
 */
(function () {
  'use strict';

  // ---------- Rules (same values as the original game) ----------
  var THEME_EVERY = 450;     // scenery changes every 450 m
  var QUIZ_EVERY = 150;      // a checkpoint question every 150 m
  var LEVEL_EVERY = 450;     // the game speeds up every 450 m
  var KNOCKBACK = 50;        // metres (and points) lost on a wrong answer
  var BONUS = 150;           // points for a right answer
  var BANNER_FRAMES = 130;   // how long a banner message stays up
  var HOLD = 1e9;            // duck timer value meaning "Down key is held"

  // ---------- Scene geometry (logical 800 x 500 canvas, as in the original) ----------
  var W = 800, H = 500, HZ = 140, GY = 430, F = 300, ZMAX = 1500, LW = 150;
  var SH = (H - HZ) / (GY - HZ);
  var Q = 4;   // the moving scene is drawn in whole quarter-pixels (integers are cheap for the canvas)
  var LANE_LINES = [-225, -75, 75, 225];
  var PALM_ANGLES = [-1.2, -0.5, 0.5, 1.2];
  var CLOUD_PUFFS = [-26, 0, 26];
  var PERMS = [[-1, 0, 1], [-1, 1, 0], [0, -1, 1], [0, 1, -1], [1, -1, 0], [1, 0, -1]];

  // ---------- Timing ----------
  var STEP_MS = 1000 / 60;   // one update = one 60 Hz frame (dt = 1, like the original at 60 fps)
  var MAX_STEPS = 4;         // per animation frame; below ~15 fps the game slows down instead
  var SNAP_MS = 2;           // a frame within 2 ms of a whole step counts as that step (no stutter)
  var QUIZ_ARM_MS = 600;     // ignore answers this soon after a question appears (stops jump-mashing)
  var NEXT_ARM_MS = 600;     // ...and "Keep running" this soon after answering
  var OVER_ARM_MS = 700;     // ...and "Run again" this soon after a crash
  var HUD_MS = 100;          // score bar refresh while running

  // ---------- Power-ups and obstacles ----------
  var COIN = 0, SHIELD = 1, SLOW = 2, X2 = 3, MOON = 4;          // item kinds = sprite ids 0..4
  var POW_COLOR = ['#f5c518', '#2f80ed', '#8e44ad', '#e0a800', '#2e9e6b'];
  var POW_LETTER = ['', 'S', '~', 'x2', '^'];
  var POW_SECONDS = [0, 0, 6, 8, 8];                              // 0 = lasts until used
  var BLOCK = 0, BAR = 1, WALL = 2;                               // obstacle kinds = sprite ids 5..7
  var SECS = ['0s', '1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s'];

  // ---------- Themes (colours exactly as in the original) ----------
  var THEMES = [
    { name: 'Green Meadow', sky: ['#7fc4ec', '#f6e3b8'], ground: '#6fae7d', road: '#4a4f5c', leaf: '#2f7a45', trunk: '#5a3a22', tree: 'pine' },
    { name: 'Snowy Pass', sky: ['#b7c3d4', '#eef2f7'], ground: '#eef3f8', road: '#6c7488', leaf: '#2c5e4a', trunk: '#4a3220', tree: 'pine', cap: 1, snow: 1 },
    { name: 'Sunny Beach', sky: ['#5fc0ef', '#fff1c9'], ground: '#e8d49a', road: '#a8956c', leaf: '#2f9e4f', trunk: '#8a6a3a', tree: 'palm', sea: 1 },
    { name: 'Starry Night', sky: ['#0b1030', '#3a3f7a'], ground: '#1f3a2c', road: '#2a2e3a', leaf: '#1d4a38', trunk: '#2b1d12', tree: 'pine', stars: 1 },
    { name: 'Sky Glide', tip: 'You can fly! Nothing can hit you. Grab the coins.', sky: ['#3d9be8', '#e4f4ff'], ground: '#cfe6fb', road: '#8fb8e6', leaf: '#fff', trunk: '#fff', tree: 'cloud', fly: 1 }
  ];
  // tree sprite ids in the tree sheet: 0 pine, 1 cloud, 2 palm (left side), 3 palm (right side)
  for (var ti = 0; ti < THEMES.length; ti++) {
    THEMES[ti].treeId = THEMES[ti].tree === 'cloud' ? 1 : THEMES[ti].tree === 'palm' ? 2 : 0;
  }

  // ---------- Small helpers ----------
  function now() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function randInt(n) { return Math.floor(Math.random() * n); }
  function shuffle(list, n) {
    for (var i = (n === undefined ? list.length : n) - 1; i > 0; i--) {
      var j = randInt(i + 1), tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  var STORE_PREFIX = 'mrd-games:quiz-dash:';
  function storageGet(key) {
    try { return window.localStorage.getItem(STORE_PREFIX + key); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { window.localStorage.setItem(STORE_PREFIX + key, String(value)); return true; } catch (e) { return false; }
  }
  function storageRemove(key) {
    try { window.localStorage.removeItem(STORE_PREFIX + key); } catch (e) { /* storage blocked */ }
  }

  // ---------- Questions ----------
  var MAX_TEXT = 200000;   // characters in a custom list
  var MAX_Q_LEN = 400;     // characters in one question
  var MAX_A_LEN = 160;     // characters in one answer
  var MAX_WRONG = 4;       // wrong answers used per question
  var MAX_OPTS = 1 + MAX_WRONG;

  // One question per line: question | correct | wrong | wrong | wrong
  // Columns are read by position (an empty correct-answer column is NOT filled by the next one).
  function parseQuestions(text) {
    var list = [], skipped = [], trimmed = false;
    var lines = String(text).split('\n');
    for (var n = 0; n < lines.length; n++) {
      var line = lines[n].trim();
      if (!line) continue;
      var parts = line.split('|');
      var q = parts[0].trim();
      var right = parts.length > 1 ? parts[1].trim() : '';
      var answers = [right];
      var ok = q.length > 0 && q.length <= MAX_Q_LEN && right.length > 0 && right.length <= MAX_A_LEN;
      for (var p = 2; ok && p < parts.length; p++) {
        var a = parts[p].trim();
        if (!a) continue;
        if (a.length > MAX_A_LEN) { ok = false; break; }
        var dup = false, low = a.toLowerCase();
        for (var d = 0; d < answers.length; d++) {
          if (answers[d].toLowerCase() === low) { dup = true; break; }
        }
        if (dup) continue;
        if (answers.length >= MAX_OPTS) { trimmed = true; continue; }
        answers.push(a);
      }
      if (ok && answers.length >= 2) list.push({ q: q, a: answers });
      else skipped.push(n + 1);
    }
    return { list: list, skipped: skipped, trimmed: trimmed };
  }

  var DEFAULT_TEXT = typeof window.QUIZ_DASH_DEFAULT_QUESTIONS === 'string' ? window.QUIZ_DASH_DEFAULT_QUESTIONS : '';
  var DEFAULT_POOL = parseQuestions(DEFAULT_TEXT).list;
  if (!DEFAULT_POOL.length) {
    // questions.js didn't load: keep one question so a checkpoint can never be empty
    DEFAULT_POOL = [{ q: 'Sam gives bean plants a little, some, or a lot of water. Then he measures how tall they grow. Which is the independent variable (the thing we change)?',
      a: ['How much water the plants get', 'How tall the plants grow', 'The kind of bean plant', 'How many days Sam waits'] }];
  }

  var questions = DEFAULT_POOL;   // the pool in use (never empty)
  var deck = [];                  // questions not asked yet in this pass (kept between runs)
  var lastAsked = null;

  function setPool(list) {
    questions = list && list.length ? list : DEFAULT_POOL;
    deck.length = 0;
    lastAsked = null;
  }

  // Every question once before any repeats; a new pass never starts with the one just asked.
  function drawQuestion() {
    if (!deck.length) {
      for (var i = 0; i < questions.length; i++) deck.push(questions[i]);
      shuffle(deck);
      var top = deck.length - 1;
      if (top > 0 && deck[top] === lastAsked) {
        var j = randInt(top), tmp = deck[top];
        deck[top] = deck[j];
        deck[j] = tmp;
      }
    }
    lastAsked = deck.pop() || DEFAULT_POOL[0];
    return lastAsked;
  }

  // ---------- Game state ----------
  var st = {
    mode: 'idle',   // 'idle' | 'run' | 'quiz' | 'answered' | 'over' | 'paused'
    lane: 0, lx: 0, jy: 0, vy: 0, duckT: 0,
    m: 0, score: 0, coins: 0, rowT: 500,
    inv: 0, t: 0, next: QUIZ_EVERY, banner: 0, shown: 0,
    band: 0,        // furthest 450 m band reached this run (scenery never flips back after a knockback)
    th: 0,          // current theme index
    horse: false,   // joined after the first full theme cycle, and stays
    flash: 0
  };
  var power = new Float64Array(5);   // power-up timers by kind (shield: 1 = on)
  var best = 0;

  // Banner lines: a fixed array of 3 (oldest drops off, duplicates are ignored)
  var MSG_MAX = 3;
  var msg = ['', '', ''], msgN = 0, msgVer = 0;

  // ---------- Pools (preallocated, reused; nothing is created while running) ----------
  var OBS_CAP = 24;      // the original never had more than 12 at once
  var ITEM_CAP = 128;    // the original peaked at 81 (Sky Glide coin rows)
  var TREE_SLOTS = 11;
  var SNOW_N = 80, STAR_N = 60, STAR_GROUPS = 8;
  var DRAW_CAP = TREE_SLOTS + OBS_CAP + ITEM_CAP;

  function makeEntry(tree) {
    // every pooled thing has the same shape, so the draw-list sort stays fast
    return { active: false, tree: tree, listed: false, sprite: 0, kind: 0, l: 0, z: 0, zPrev: 0, h: 0, side: 0 };
  }
  function makePool(cap, tree) {
    var a = new Array(cap);
    for (var i = 0; i < cap; i++) a[i] = makeEntry(tree);
    return a;
  }
  var obs = makePool(OBS_CAP, false);
  var items = makePool(ITEM_CAP, false);
  var treeSlots = makePool(TREE_SLOTS, true);
  var drawList = new Array(DRAW_CAP);
  for (var di = 0; di < DRAW_CAP; di++) drawList[di] = null;
  var drawN = 0;
  var droppedSpawns = 0;

  // particles: typed arrays, re-randomised in place for each run
  var snowX = new Float64Array(SNOW_N), snowY = new Float64Array(SNOW_N), snowV = new Float64Array(SNOW_N);
  var snowR4 = new Int32Array(SNOW_N);
  var starX4 = new Int32Array(STAR_N), starY4 = new Int32Array(STAR_N), starR4 = new Int32Array(STAR_N);
  var STAR_PHASE = new Float64Array(STAR_GROUPS);
  for (var sg = 0; sg < STAR_GROUPS; sg++) STAR_PHASE[sg] = (sg * 2 * Math.PI) / STAR_GROUPS;

  function seedParticles() {
    for (var i = 0; i < SNOW_N; i++) {
      snowX[i] = Math.random() * W;
      snowY[i] = Math.random() * H;
      snowV[i] = 1 + Math.random() * 2;
      snowR4[i] = Math.max(1, Math.round((1 + Math.random() * 2.5) * Q));
    }
    for (var j = 0; j < STAR_N; j++) {
      starX4[j] = (Math.random() * W * Q) | 0;
      starY4[j] = (Math.random() * (HZ - 10) * Q) | 0;
      starR4[j] = Math.max(1, Math.round((Math.random() * 1.6 + 0.4) * Q));
    }
  }

  function spawn(pool, kind, sprite, lane, z, h) {
    for (var i = 0; i < pool.length; i++) {
      var o = pool[i];
      if (!o.active) {
        o.active = true;
        o.kind = kind;
        o.sprite = sprite;
        o.l = lane;
        o.z = z;
        o.zPrev = z;
        o.h = h;
        return;
      }
    }
    droppedSpawns++;   // pool full: skip it (never happens with these caps)
  }

  function clearPools() {
    for (var i = 0; i < OBS_CAP; i++) obs[i].active = false;
    for (var j = 0; j < ITEM_CAP; j++) items[j].active = false;
  }

  function countActive(pool) {
    var n = 0;
    for (var i = 0; i < pool.length; i++) if (pool[i].active) n++;
    return n;
  }

  // ---------- Run setup ----------
  function resetRun() {
    st.lane = 0; st.lx = 0; st.jy = 0; st.vy = 0; st.duckT = 0;
    st.m = 0; st.score = 0; st.coins = 0; st.rowT = 500;
    st.inv = 0; st.t = 0; st.next = QUIZ_EVERY; st.banner = 0; st.shown = 0;
    st.band = 0; st.th = 0; st.horse = false; st.flash = 0;
    for (var k = 0; k < power.length; k++) power[k] = 0;
    msgN = 0;
    msgVer++;
    clearPools();
    seedParticles();
  }

  function lvl() { return Math.floor(st.m / LEVEL_EVERY); }
  function speed() { return Math.min(16, 6 + lvl()) * (power[SLOW] > 0 ? 0.55 : 1); }
  function addScore(n) { st.score += n * (power[X2] > 0 ? 2 : 1); }

  function note(text) {
    if (st.banner <= 0) msgN = 0;
    st.banner = BANNER_FRAMES;
    for (var i = 0; i < msgN; i++) if (msg[i] === text) return;
    if (msgN === MSG_MAX) {
      for (var j = 1; j < MSG_MAX; j++) msg[j - 1] = msg[j];
      msgN--;
    }
    msg[msgN++] = text;
    msgVer++;
  }

  // ---------- Player actions ----------
  function go(d) { if (st.mode === 'run') st.lane = Math.max(-1, Math.min(1, st.lane + d)); }
  function jump() { if (st.mode === 'run' && st.jy === 0 && st.vy === 0) st.vy = power[MOON] > 0 ? 15 : 11; }
  function duck(n) { if (st.mode === 'run') st.duckT = n; }

  var swipeId = -1, swipeX = 0, swipeY = 0;
  // A key or finger that is "held" when the page loses focus never gets its key-up.
  function releaseHeld() {
    if (st.duckT >= 1e8) st.duckT = 0;
    swipeId = -1;
  }

  // ---------- Spawning (every row leaves at least one lane completely free) ----------
  function spawnRow() {
    var p, i, j;
    if (THEMES[st.th].fly) {
      p = PERMS[randInt(6)];
      for (j = 0; j < 2; j++) {
        for (i = 0; i < 6; i++) spawn(items, COIN, COIN, p[j], ZMAX + i * 70, 130);
      }
      if (Math.random() < 0.25) {
        var pk = 1 + randInt(4);
        spawn(items, pk, pk, randInt(3) - 1, ZMAX + 200, 130);
      }
      return;
    }
    var n = Math.random() < 0.45 ? 2 : 1;   // at most two of the three lanes are blocked
    p = PERMS[randInt(6)];
    for (j = 0; j < n; j++) {
      var r = Math.random(), kind = r < 0.4 ? BLOCK : r < 0.7 ? BAR : WALL;
      spawn(obs, kind, 5 + kind, p[j], ZMAX, 0);
    }
    if (Math.random() < 0.75) {
      var lane = p[n + randInt(3 - n)], z0 = ZMAX + st.rowT / 2;
      if (Math.random() < 0.18) {
        var k = 1 + randInt(4);
        spawn(items, k, k, lane, z0, 0);
      } else {
        for (i = 0; i < 4; i++) spawn(items, COIN, COIN, lane, z0 + i * 70, 0);
      }
    }
  }

  function enterBand(band) {
    st.band = band;
    var th = band % THEMES.length;
    st.th = th;
    st.flash = 1;
    note('Entering: ' + THEMES[th].name);
    if (THEMES[th].tip) note(THEMES[th].tip);
    if (!st.horse && band >= THEMES.length) {
      st.horse = true;
      note('A horse joins your run!');
    }
  }

  function moveSnow(dt) {
    for (var i = 0; i < SNOW_N; i++) {
      snowY[i] += snowV[i] * dt;
      snowX[i] += Math.sin(snowY[i] / 40) * 0.6 * dt;
      if (snowY[i] > H) {
        snowY[i] = -4;
        snowX[i] = Math.random() * W;
      }
    }
  }

  // ---------- One fixed update (dt = 1 is one 60 Hz frame) ----------
  function update(dt) {
    var i, o;
    st.t += dt;
    var mv = speed() * dt, dm = mv / 40;
    st.m += dm;
    if (st.m < 0) st.m = 0;
    addScore(dm);
    var level = lvl();
    if (level > st.shown) {
      st.shown = level;
      note('Speed up! Level ' + (level + 1));
    }
    var band = Math.floor(st.m / THEME_EVERY);
    if (band > st.band) enterBand(band);
    if (st.banner > 0) st.banner -= dt;
    if (st.flash > 0) st.flash = Math.max(0, st.flash - 0.03 * dt);

    var T = THEMES[st.th];
    if (T.snow) moveSnow(dt);
    st.lx += (st.lane - st.lx) * Math.min(1, 0.22 * dt);
    if (st.duckT > 0 && st.duckT < 1e8) st.duckT -= dt;
    var fly = !!T.fly;
    if (fly) {
      st.jy += (150 - st.jy) * Math.min(1, 0.06 * dt);
      st.vy = 0;
    } else if (st.jy > 0 || st.vy > 0) {
      st.vy -= (power[MOON] > 0 ? 0.45 : 0.7) * dt + (st.duckT > 0 ? 0.8 * dt : 0);
      st.jy += st.vy * dt;
      if (st.jy <= 0) { st.jy = 0; st.vy = 0; }
    }
    for (var k = SLOW; k <= MOON; k++) {
      if (power[k] > 0) power[k] = Math.max(0, power[k] - dt / 60 / POW_SECONDS[k]);
    }
    if (st.inv > 0) st.inv -= dt / 60;

    st.rowT -= mv;
    if (st.rowT <= 0) {
      st.rowT = Math.max(300, (380 + Math.random() * 220) * (1 - lvl() * 0.05));
      spawnRow();
    }

    for (i = 0; i < OBS_CAP; i++) {
      o = obs[i];
      if (o.active) { o.zPrev = o.z; o.z -= mv; }
    }
    for (i = 0; i < ITEM_CAP; i++) {
      o = items[i];
      if (o.active) { o.zPrev = o.z; o.z -= mv; }
    }

    // pick-ups: inside the window now, or jumped right over it during this step
    for (i = 0; i < ITEM_CAP; i++) {
      o = items[i];
      if (!o.active) continue;
      if (!((o.z < 35 && o.z > -35) || (o.zPrev >= 35 && o.z <= -35))) continue;
      if (Math.abs(o.l - st.lx) >= 0.6) continue;
      o.active = false;
      if (o.kind === COIN) { st.coins++; addScore(10); } else power[o.kind] = 1;
    }

    // collisions (same windows as the original, but swept so nothing can tunnel)
    var ducking = st.duckT > 0 && st.jy === 0;
    if (st.inv <= 0 && !fly) {
      for (i = 0; i < OBS_CAP; i++) {
        o = obs[i];
        if (!o.active) continue;
        if (!((o.z <= 30 && o.z >= -30) || (o.zPrev > 30 && o.z < -30))) continue;
        if (Math.abs(o.l - st.lx) > 0.55) continue;
        var bad = o.kind === BLOCK ? st.jy < 45 : o.kind === WALL ? st.jy < 130 : !ducking;
        if (!bad) continue;
        if (test.on) { test.hits++; o.active = false; }
        else if (power[SHIELD]) { power[SHIELD] = 0; st.inv = 1; o.active = false; }
        else { gameOver(); return; }
        break;
      }
    }

    for (i = 0; i < OBS_CAP; i++) if (obs[i].active && obs[i].z <= -80) obs[i].active = false;
    for (i = 0; i < ITEM_CAP; i++) if (items[i].active && items[i].z <= -80) items[i].active = false;

    if (st.m >= st.next) openQuiz();
  }

  // =====================================================================
  // Drawing
  // =====================================================================
  var cv, ctx;
  var k = 1, kq = k / Q, bw = W, bh = H, kCap = 2;

  function makeLayer(opaque) {
    var c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    return { canvas: c, ctx: c.getContext('2d', opaque ? { alpha: false } : undefined), key: -1, ver: -1, top: 0, left: 0, shown: -1 };
  }
  var bgLayer = makeLayer(true);   // sky, ground, sea band, road and lane lines for the current theme
  var bannerLayer = makeLayer(false);
  var countLayer = makeLayer(false);

  // ---------- Sprite sheets ----------
  // Each sprite is drawn once at 4 sizes (each half the last), so copying it never shrinks
  // an image by more than 2x (keeps far-away things crisp and flicker-free).
  var LEVELS = 4, GUT = 2, SHEET_MAX_W = 1024;

  function makeSheet(boxes) {
    var n = boxes.length / 4, c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    return {
      canvas: c, ctx: c.getContext('2d'), n: n, boxes: boxes, key: -1,
      scale: new Float64Array(LEVELS),
      sx: new Int32Array(n * LEVELS), sy: new Int32Array(n * LEVELS),
      sw: new Int32Array(n * LEVELS), sh: new Int32Array(n * LEVELS),
      ux: new Float64Array(n * LEVELS), uy: new Float64Array(n * LEVELS),
      uw: new Float64Array(n * LEVELS), uh: new Float64Array(n * LEVELS)
    };
  }

  // Unit-size boxes (x0, y0, x1, y1) around each shape's anchor (centre x, ground y).
  var STATIC_BOXES = [
    -17, -47, 17, -13,   // 0 coin
    -23, -68, 23, -22,   // 1 shield orb
    -23, -68, 23, -22,   // 2 slow-mo orb
    -23, -68, 23, -22,   // 3 double-points orb
    -23, -68, 23, -22,   // 4 moon-jump orb
    -58, -48, 58, 3,     // 5 brown block
    -61, -76, 61, 1,     // 6 red gate
    -61, -138, 61, 3     // 7 purple wall
  ];
  var TREE_BOXES = [
    -36, -123, 36, 2,    // 0 pine
    -52, -128, 52, -64,  // 1 cloud
    -57, -127, 57, 5,    // 2 palm, left side
    -57, -127, 57, 5     // 3 palm, right side
  ];
  var staticSheet = makeSheet(STATIC_BOXES);
  var treeSheet = makeSheet(TREE_BOXES);

  function layoutSheet(sheet, base) {
    var x = 0, y = 0, rowH = 0, maxW = 1;
    for (var L = 0; L < LEVELS; L++) {
      var S = base / (1 << L);
      sheet.scale[L] = S;
      for (var i = 0; i < sheet.n; i++) {
        var b = i * 4, bx0 = sheet.boxes[b], by0 = sheet.boxes[b + 1];
        var pw = Math.max(1, Math.ceil((sheet.boxes[b + 2] - bx0) * S));
        var ph = Math.max(1, Math.ceil((sheet.boxes[b + 3] - by0) * S));
        if (x + pw + GUT * 2 > SHEET_MAX_W && x > 0) { x = 0; y += rowH; rowH = 0; }
        var j = i * LEVELS + L;
        sheet.sx[j] = x + GUT;
        sheet.sy[j] = y + GUT;
        sheet.sw[j] = pw;
        sheet.sh[j] = ph;
        sheet.ux[j] = bx0;
        sheet.uy[j] = by0;
        sheet.uw[j] = pw / S;
        sheet.uh[j] = ph / S;
        x += pw + GUT * 2;
        if (ph + GUT * 2 > rowH) rowH = ph + GUT * 2;
        if (x > maxW) maxW = x;
      }
    }
    sheet.canvas.width = maxW;          // resizing also clears it
    sheet.canvas.height = Math.max(1, y + rowH);
    sheet.key = -1;
  }

  function paintSheet(sheet, painter, from, to) {
    var c = sheet.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, sheet.canvas.width, sheet.canvas.height);
    for (var L = 0; L < LEVELS; L++) {
      var S = sheet.scale[L];
      for (var i = from; i <= to; i++) {
        var j = i * LEVELS + L;
        c.save();
        c.setTransform(S, 0, 0, S, sheet.sx[j] - sheet.ux[j] * S, sheet.sy[j] - sheet.uy[j] * S);
        c.beginPath();
        c.rect(sheet.ux[j], sheet.uy[j], sheet.uw[j], sheet.uh[j]);
        c.clip();
        painter(c, i);
        c.restore();
      }
    }
  }

  // The original vector shapes, at size 1 with the anchor at (0, 0).
  function paintStaticSprite(c, i) {
    if (i === COIN) {
      c.fillStyle = '#f5c518';
      c.beginPath(); c.arc(0, -30, 14, 0, 7); c.fill();
      c.strokeStyle = '#a67c00'; c.lineWidth = 3; c.stroke();
    } else if (i <= MOON) {
      c.fillStyle = POW_COLOR[i];
      c.beginPath(); c.arc(0, -45, 20, 0, 7); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
      c.fillStyle = '#fff'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center';
      c.fillText(POW_LETTER[i], 0, -39);
    } else if (i === 5 + BLOCK) {
      c.fillStyle = '#8a5530'; c.fillRect(-55, -45, 110, 45);
      c.strokeStyle = '#3a2410'; c.lineWidth = 3; c.strokeRect(-55, -45, 110, 45);
      c.fillStyle = '#a8703f'; c.fillRect(-55, -45, 110, 10);
    } else if (i === 5 + WALL) {
      c.fillStyle = '#5b4b8a'; c.fillRect(-58, -135, 116, 135);
      c.strokeStyle = '#241c40'; c.lineWidth = 3; c.strokeRect(-58, -135, 116, 135);
      c.fillStyle = '#7a69b0'; c.fillRect(-58, -135, 116, 14);
    } else {   // red gate (duck under it)
      c.fillStyle = '#444'; c.fillRect(-58, -75, 9, 75); c.fillRect(49, -75, 9, 75);
      c.fillStyle = '#d63a2f'; c.fillRect(-60, -75, 120, 28);
      c.fillStyle = '#fff';
      for (var s = 0; s < 4; s++) c.fillRect(-50 + s * 30, -75, 12, 28);
    }
  }

  var treeTheme = THEMES[0], treeSlow = false;
  function paintTreeSprite(c, i) {
    var T = treeTheme;
    if (i === 0) {
      c.fillStyle = T.trunk; c.fillRect(-6, -40, 12, 40);
      c.fillStyle = treeSlow ? '#7a70a8' : T.leaf;
      c.beginPath(); c.moveTo(0, -120); c.lineTo(34, -30); c.lineTo(-34, -30); c.fill();
      if (T.cap) {
        c.fillStyle = '#fff';
        c.beginPath(); c.moveTo(0, -120); c.lineTo(14, -84); c.lineTo(-14, -84); c.fill();
      }
    } else if (i === 1) {
      c.fillStyle = 'rgba(255,255,255,.92)';
      for (var p = 0; p < CLOUD_PUFFS.length; p++) {
        var d = CLOUD_PUFFS[p];
        c.beginPath(); c.arc(d, -90 - (d ? 0 : 12), 24, 0, 7); c.fill();
      }
    } else {
      var side = i === 2 ? -1 : 1;
      c.lineWidth = 9; c.strokeStyle = T.trunk;
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-side * 14, -60, 0, -110); c.stroke();
      c.fillStyle = T.leaf;
      for (var a = 0; a < PALM_ANGLES.length; a++) {
        var ang = PALM_ANGLES[a];
        c.beginPath(); c.ellipse(Math.sin(ang) * 30, -110 + Math.abs(ang) * 8, 32, 8, ang * 0.6, 0, 7); c.fill();
      }
    }
  }

  function paintTrees(T, slow) {
    treeTheme = T;
    treeSlow = slow;
    var id = T.treeId;
    paintSheet(treeSheet, paintTreeSprite, id, id === 2 ? 3 : id);
  }

  function roadPath(c, T) {
    c.fillStyle = T.road;
    c.beginPath(); c.moveTo(400, HZ); c.lineTo(400 + 225 * SH, H); c.lineTo(400 - 225 * SH, H); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.55)';
    c.lineWidth = 3;
    for (var i = 0; i < LANE_LINES.length; i++) {
      c.beginPath(); c.moveTo(400, HZ); c.lineTo(400 + LANE_LINES[i] * SH, H); c.stroke();
    }
  }

  // Rebuilt only when the theme, slow-mo or moon-jump state changes (at most 20 variants).
  function paintBackground(T, slow, moon) {
    var c = bgLayer.ctx;
    c.setTransform(k, 0, 0, k, 0, 0);
    var g = c.createLinearGradient(0, 0, 0, HZ + 30);
    g.addColorStop(0, slow ? '#a898d6' : moon ? '#2b3a67' : T.sky[0]);
    g.addColorStop(1, slow ? '#e6dcf5' : moon ? '#6a7fb5' : T.sky[1]);
    c.fillStyle = g;
    c.fillRect(0, 0, W, HZ + 1);
    c.fillStyle = slow ? '#8f86ba' : T.ground;
    c.fillRect(0, HZ, W, H - HZ);
    if (T.sea) {
      c.fillStyle = '#2a9fd6';
      c.fillRect(0, HZ, W, 34);   // the road goes over the waves, so it is drawn live on the beach
    } else {
      roadPath(c, T);
    }
  }

  // Banner text: drawn into its own layer only when the lines change.
  var BANNER_Y0 = 55, BANNER_Y1 = 215, COUNT_X0 = 200, COUNT_X1 = 600, COUNT_Y0 = 16, COUNT_Y1 = 56;
  function renderBanner() {
    var c = bannerLayer.ctx, cw = bannerLayer.canvas.width, ch = bannerLayer.canvas.height;
    bannerLayer.ver = msgVer;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cw, ch);
    c.setTransform(k, 0, 0, k, 0, -bannerLayer.top);
    c.font = 'bold 34px sans-serif';
    c.textAlign = 'center';
    c.lineJoin = 'round';
    c.lineWidth = 6;
    c.strokeStyle = 'rgba(0,0,0,.75)';
    c.fillStyle = '#fff';
    for (var i = 0; i < msgN; i++) {
      var y = 95 + i * 42;
      c.strokeText(msg[i], W / 2, y, W - 40);
      c.fillText(msg[i], W / 2, y, W - 40);
    }
  }

  function renderCount(left) {
    var c = countLayer.ctx;
    countLayer.shown = left;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, countLayer.canvas.width, countLayer.canvas.height);
    c.setTransform(k, 0, 0, k, -countLayer.left, -countLayer.top);
    c.font = 'bold 20px sans-serif';
    c.textAlign = 'center';
    c.lineJoin = 'round';
    c.lineWidth = 4;
    c.strokeStyle = 'rgba(0,0,0,.75)';
    c.fillStyle = '#fff';
    var text = 'Question in ' + left + 'm';
    c.strokeText(text, W / 2, 40);
    c.fillText(text, W / 2, 40);
  }

  // Copy a sprite (anchor cx, by; perspective scale s) using whole quarter-pixel numbers.
  function blit(sheet, id, cx, by, s) {
    var need = s * k, L = 0;
    while (L < LEVELS - 1 && sheet.scale[L + 1] >= need) L++;
    var j = id * LEVELS + L;
    var x0 = ((cx + sheet.ux[j] * s) * Q) | 0;
    var y0 = ((by + sheet.uy[j] * s) * Q) | 0;
    var x1 = ((cx + (sheet.ux[j] + sheet.uw[j]) * s) * Q) | 0;
    var y1 = ((by + (sheet.uy[j] + sheet.uh[j]) * s) * Q) | 0;
    if (x1 <= x0 || y1 <= y0) return;
    ctx.drawImage(sheet.canvas, sheet.sx[j], sheet.sy[j], sheet.sw[j], sheet.sh[j], x0, y0, x1 - x0, y1 - y0);
  }

  // Keep one draw list between frames: drop what left, add what arrived, then an
  // insertion sort (far to near) that is almost free because the order barely changes.
  function appendNew(pool, w) {
    for (var i = 0; i < pool.length; i++) {
      var o = pool[i];
      if (o.active && !o.listed && (o.tree || o.z < ZMAX)) {
        o.listed = true;
        drawList[w++] = o;
      }
    }
    return w;
  }

  function buildDrawList(i0, rem) {
    var i, e;
    for (i = 0; i < TREE_SLOTS; i++) {
      var t = treeSlots[i], z = i * 150 - rem;
      t.z = z;
      t.side = (i0 + i) % 2 ? 1 : -1;
      t.active = z >= 0;
    }
    var w = 0;
    for (i = 0; i < drawN; i++) {
      e = drawList[i];
      if (e.active && (e.tree || e.z < ZMAX)) drawList[w++] = e;
      else e.listed = false;
    }
    w = appendNew(treeSlots, w);
    w = appendNew(obs, w);
    w = appendNew(items, w);
    for (i = w; i < drawN; i++) drawList[i] = null;
    drawN = w;
    for (i = 1; i < drawN; i++) {
      e = drawList[i];
      var ez = e.z, j = i - 1;
      while (j >= 0 && drawList[j].z < ez) {
        drawList[j + 1] = drawList[j];
        j--;
      }
      drawList[j + 1] = e;
    }
  }

  function drawStars() {
    ctx.fillStyle = '#fff';
    for (var g = 0; g < STAR_GROUPS; g++) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(st.t / 20 + STAR_PHASE[g]);
      ctx.beginPath();
      for (var i = g; i < STAR_N; i += STAR_GROUPS) {
        ctx.moveTo(starX4[i] + starR4[i], starY4[i]);
        ctx.arc(starX4[i], starY4[i], starR4[i], 0, 7);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f4f1d8';
    ctx.beginPath();
    ctx.arc(620 * Q, 70 * Q, 24 * Q, 0, 7);
    ctx.fill();
  }

  function drawWaves() {
    var o = (st.t * 0.6) % 70;
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 2 * Q;
    ctx.beginPath();
    for (var x = -40; x < W; x += 70) {
      ctx.moveTo(((x + o) * Q) | 0, (HZ + 14) * Q);
      ctx.quadraticCurveTo(((x + o + 15) * Q) | 0, (HZ + 8) * Q, ((x + o + 30) * Q) | 0, (HZ + 14) * Q);
    }
    ctx.stroke();
  }

  function drawStripes(i0, rem) {
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.beginPath();
    for (var i = 0; i < ZMAX / 150 + 1; i++) {
      if ((i0 + i) % 2) continue;
      var z1 = Math.max(0, i * 150 - rem), z2 = i * 150 + 150 - rem;
      if (z2 <= 0) continue;
      var s1 = F / (F + z1), s2 = F / (F + z2);
      var y1 = ((HZ + (GY - HZ) * s1) * Q) | 0, y2 = ((HZ + (GY - HZ) * s2) * Q) | 0;
      var a1 = (225 * s1 * Q) | 0, a2 = (225 * s2 * Q) | 0;
      ctx.moveTo(400 * Q - a1, y1);
      ctx.lineTo(400 * Q + a1, y1);
      ctx.lineTo(400 * Q + a2, y2);
      ctx.lineTo(400 * Q - a2, y2);
      ctx.closePath();
    }
    ctx.fill();
  }

  function drawSnow() {
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath();
    for (var i = 0; i < SNOW_N; i++) {
      var x = (snowX[i] * Q) | 0, y = (snowY[i] * Q) | 0, r = snowR4[i];
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, 7);
    }
    ctx.fill();
  }

  function drawScene(T) {
    for (var d = 0; d < drawN; d++) {
      var o = drawList[d], s = F / (F + o.z);
      if (o.tree) {
        var id = T.treeId === 2 ? (o.side < 0 ? 2 : 3) : T.treeId;
        blit(treeSheet, id, 400 + o.side * 340 * s, HZ + (GY - HZ) * s, s);
      } else {
        var cx = 400 + o.l * LW * s, by = HZ + (GY - HZ) * s - o.h * s;
        if (o.z > ZMAX * 0.7) {
          ctx.globalAlpha = Math.max(0, (ZMAX - o.z) / (ZMAX * 0.3));
          blit(staticSheet, o.sprite, cx, by, s);
          ctx.globalAlpha = 1;
        } else {
          blit(staticSheet, o.sprite, cx, by, s);
        }
      }
    }
  }

  // The runner (and wings or horse) is drawn as shapes, moved into place with one transform.
  function drawPlayer(T) {
    var cx = 400 + st.lx * LW, dk = st.duckT > 0 && st.jy === 0, h = dk ? 32 : 62;
    var fly = !!T.fly, mnt = st.horse && !fly;
    var rx = 26 - st.jy / 12;
    ctx.setTransform(k, 0, 0, k, cx * k, (GY + 4) * k);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx > 2 ? rx : 2, 7, 0, 0, 7);
    ctx.fill();
    if (!(st.inv > 0 && Math.floor(st.t / 4) % 2 === 0)) {
      ctx.setTransform(k, 0, 0, k, cx * k, (GY - st.jy) * k);
      var oy = 0;
      if (fly) {
        var f = Math.round(Math.sin(st.t * 0.35) * 14);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#8aa4b8';
        ctx.lineWidth = 2;
        for (var d = -1; d <= 1; d += 2) {
          ctx.beginPath();
          ctx.moveTo(d * 14, -h + 14);
          ctx.quadraticCurveTo(d * 62, -h - 12 + f, d * 58, -h + 24 + f);
          ctx.quadraticCurveTo(d * 36, -h + 32, d * 14, -h + 36);
          ctx.fill();
          ctx.stroke();
        }
      }
      if (mnt) {
        var lg = Math.round(Math.sin(st.t * 0.5) * 7);
        ctx.fillStyle = '#7b4a26';
        ctx.beginPath(); ctx.ellipse(0, -26, 34, 22, 0, 0, 7); ctx.fill();
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#5a3418';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(-18, -14); ctx.lineTo(-18 + lg, -1);
        ctx.moveTo(18, -14); ctx.lineTo(18 - lg, -1);
        ctx.stroke();
        ctx.strokeStyle = '#2b1a0d';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, -36);
        ctx.quadraticCurveTo((lg * 3) >> 1, -20, lg * 2, -6);
        ctx.stroke();
        ctx.lineCap = 'butt';
        oy = -30;
      }
      ctx.fillStyle = '#e4572e'; ctx.fillRect(-19, oy - h, 38, h - 8);
      ctx.fillStyle = '#1d2433'; ctx.fillRect(-19, oy - 10, 16, 10); ctx.fillRect(3, oy - 10, 16, 10);
      ctx.fillStyle = '#f2c9a0';
      ctx.beginPath(); ctx.arc(0, oy - h - 6 + (dk ? 6 : 0), 12, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-19, oy - h + 14, 38, 5);
      if (power[SHIELD]) {
        ctx.strokeStyle = 'rgba(47,128,237,.85)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, oy - h / 2, Math.max(h / 2, 32) + 8, 0, 7); ctx.stroke();
      }
    }
    ctx.setTransform(kq, 0, 0, kq, 0, 0);
  }

  var drawCount = 0;
  function draw() {
    drawCount++;
    var T = THEMES[st.th], slow = power[SLOW] > 0, moon = power[MOON] > 0;
    var bgKey = st.th * 4 + (slow ? 2 : 0) + (moon ? 1 : 0);
    if (bgKey !== bgLayer.key) { bgLayer.key = bgKey; paintBackground(T, slow, moon); }
    var treeKey = st.th * 2 + (slow ? 1 : 0);
    if (treeKey !== treeSheet.key) { treeSheet.key = treeKey; paintTrees(T, slow); }

    var zoff = st.m * 40, i0 = Math.floor(zoff / 150), rem = zoff % 150;

    // 1. cached background, copied 1:1
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(bgLayer.canvas, 0, 0);

    // 2. moving scenery, in quarter-pixel units
    ctx.setTransform(kq, 0, 0, kq, 0, 0);
    if (T.stars) drawStars();
    if (T.sea) {
      drawWaves();
      ctx.setTransform(k, 0, 0, k, 0, 0);
      roadPath(ctx, T);
      ctx.setTransform(kq, 0, 0, kq, 0, 0);
    }
    drawStripes(i0, rem);
    buildDrawList(i0, rem);
    drawScene(T);
    drawPlayer(T);
    if (T.snow) drawSnow();

    // 3. text and flash, copied 1:1 from their own layers
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (st.banner > 0 && msgN > 0) {
      if (bannerLayer.ver !== msgVer) renderBanner();
      ctx.drawImage(bannerLayer.canvas, 0, bannerLayer.top);
    }
    var left = Math.ceil(st.next - st.m);
    if ((st.mode === 'run' || st.mode === 'paused') && left <= 25 && left > 0) {
      if (countLayer.shown !== left) renderCount(left);
      ctx.drawImage(countLayer.canvas, countLayer.left, countLayer.top);
    }
    if (st.flash > 0) {
      ctx.globalAlpha = st.flash * 0.8;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, bw, bh);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- Canvas size: 800 x 500 logical units, backing store up to 2x (1600 x 1000) ----------
  function fitCanvas(force) {
    var cssW = cv.clientWidth || W;
    var dpr = window.devicePixelRatio || 1;
    var want = Math.min(kCap, Math.max(0.5, (cssW * dpr) / W));
    var newBw = Math.max(400, Math.round((W * want) / 8) * 8);
    if (newBw === bw && !force) return false;
    bw = newBw;
    bh = (newBw * 5) / 8;
    k = bw / W;
    kq = k / Q;
    cv.width = bw;
    cv.height = bh;
    bgLayer.canvas.width = bw;
    bgLayer.canvas.height = bh;
    bgLayer.key = -1;
    bannerLayer.top = Math.floor(BANNER_Y0 * k);
    bannerLayer.canvas.width = bw;
    bannerLayer.canvas.height = Math.ceil((BANNER_Y1 - BANNER_Y0) * k) + 1;
    bannerLayer.ver = -1;
    countLayer.left = Math.floor(COUNT_X0 * k);
    countLayer.top = Math.floor(COUNT_Y0 * k);
    countLayer.canvas.width = Math.ceil((COUNT_X1 - COUNT_X0) * k) + 1;
    countLayer.canvas.height = Math.ceil((COUNT_Y1 - COUNT_Y0) * k) + 1;
    countLayer.shown = -1;
    layoutSheet(staticSheet, 1.4 * k);
    paintSheet(staticSheet, paintStaticSprite, 0, staticSheet.n - 1);
    layoutSheet(treeSheet, 1.4 * k);
    return true;
  }

  // =====================================================================
  // Score bar (DOM is written only when a value changes)
  // =====================================================================
  var dom = {};
  var shownScore = -1, shownDist = -1, shownLevel = -1, shownCoins = -1, shownBest = -1;
  var chipShown = new Int32Array([-2, -2, -2, -2, -2]);
  var hudAt = -1e9;

  function hud(force, t) {
    if (!force && t - hudAt < HUD_MS) return;
    hudAt = t;
    var s = Math.floor(st.score), d = Math.floor(st.m), l = lvl() + 1, c = st.coins;
    var b = best > s ? best : s;
    if (s !== shownScore) { shownScore = s; dom.score.textContent = s; }
    if (d !== shownDist) { shownDist = d; dom.dist.textContent = d; }
    if (l !== shownLevel) { shownLevel = l; dom.level.textContent = l; }
    if (c !== shownCoins) { shownCoins = c; dom.coins.textContent = c; }
    if (b !== shownBest) { shownBest = b; dom.best.textContent = b; }
    for (var kd = SHIELD; kd <= MOON; kd++) {
      var v = power[kd];
      var secs = v > 0 ? (kd === SHIELD ? 0 : Math.min(9, Math.ceil(v * POW_SECONDS[kd]))) : -1;
      if (secs === chipShown[kd]) continue;
      chipShown[kd] = secs;
      dom.chips[kd].hidden = secs < 0;
      if (secs >= 0 && dom.chipTimes[kd]) dom.chipTimes[kd].textContent = SECS[secs];
    }
  }

  // =====================================================================
  // Loop and modes. Exactly one requestAnimationFrame chain can exist; it runs only
  // while mode is 'run' (or while a theme-change flash fades behind a card).
  // =====================================================================
  var rafId = 0, rafPending = 0, lastT = 0, acc = 0, frameErrors = 0;

  function loopWanted() {
    return st.mode === 'run' || (st.flash > 0 && (st.mode === 'quiz' || st.mode === 'answered' || st.mode === 'over'));
  }
  function startLoop() {
    if (rafId) return;
    lastT = 0;
    acc = 0;
    rafId = requestAnimationFrame(frame);
    rafPending++;
  }
  function stopLoop() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
    rafPending--;
  }
  function frame(t) {
    rafId = 0;
    rafPending--;
    try {
      tick(t);
    } catch (err) {
      // one bad frame must never freeze the game: log it and keep going
      if (frameErrors++ < 3 && window.console) console.error(err);
    }
    if (!rafId && loopWanted()) {
      rafId = requestAnimationFrame(frame);
      rafPending++;
    }
  }
  function tick(t) {
    var fresh = !lastT;
    var elapsed = fresh ? 0 : t - lastT;
    lastT = t;
    if (!(elapsed > 0)) elapsed = 0;   // a frame stamped before the click that started it (or NaN)
    if (elapsed > 250) elapsed = 250;
    acc += elapsed;
    var n = Math.floor(acc / STEP_MS), rest = acc - n * STEP_MS;
    if (STEP_MS - rest < SNAP_MS) { n++; rest = 0; }
    acc = rest;
    if (n > MAX_STEPS) { n = MAX_STEPS; acc = 0; }
    if (n === 0 && !fresh) return;   // nothing moved (e.g. every other frame on a 120 Hz screen)
    if (st.mode === 'run') {
      for (var i = 0; i < n && st.mode === 'run'; i++) update(1);
    } else if (st.flash > 0) {
      st.flash = Math.max(0, st.flash - 0.03 * n);
    }
    draw();
    hud(st.mode !== 'run', t);
  }

  function showOverlay(el) {
    dom.startOv.hidden = el !== dom.startOv;
    dom.quizOv.hidden = el !== dom.quizOv;
    dom.overOv.hidden = el !== dom.overOv;
    dom.pausedOv.hidden = el !== dom.pausedOv;
  }
  function hideOverlays() {
    var a = document.activeElement;
    if (a && a !== document.body && dom.stage.contains(a) && a.blur) a.blur();
    showOverlay(null);
  }
  function focusEl(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) { /* ignore */ } }
  }
  // On small screens make sure the whole card can be seen.
  function revealCard(overlay) {
    var card = overlay.firstElementChild;
    if (!card || !card.getBoundingClientRect) return;
    var r = card.getBoundingClientRect(), vh = window.innerHeight || 0;
    if (r.top >= 0 && r.bottom <= vh) return;
    try { card.scrollIntoView({ block: r.height > vh ? 'start' : 'nearest' }); } catch (e) { card.scrollIntoView(r.height > vh); }
  }

  function beginRun() {
    autoLoadEdits();
    stopLoop();
    resetRun();
    st.mode = 'run';
    hideOverlays();
    hud(true, now());
    startLoop();
  }
  function startRun() {
    if (st.mode !== 'idle' && st.mode !== 'over') return;
    if (st.mode === 'over' && now() < overReadyAt) return;
    beginRun();
  }

  // ---------- Checkpoint questions ----------
  var quizN = 0, quizReadyAt = 0, nextReadyAt = 0, overReadyAt = 0, pausedAt = 0;
  var optOk = [false, false, false, false, false];
  var optOrder = [0, 1, 2, 3, 4];
  var stats = { quizzes: 0, right: 0, wrong: 0 };

  function openQuiz() {
    st.mode = 'quiz';
    st.duckT = 0;
    swipeId = -1;
    stats.quizzes++;
    var q = drawQuestion(), n = Math.min(MAX_OPTS, q.a.length);
    for (var i = 0; i < MAX_OPTS; i++) optOrder[i] = i;
    shuffle(optOrder, n);
    dom.question.textContent = q.q;
    for (i = 0; i < MAX_OPTS; i++) {
      var b = dom.optBtns[i];
      if (i < n) {
        b.className = 'qd-opt';
        b.disabled = false;
        b.hidden = false;
        dom.optTexts[i].textContent = q.a[optOrder[i]];
        optOk[i] = optOrder[i] === 0;
      } else {
        b.hidden = true;
        optOk[i] = false;
      }
    }
    quizN = n;
    dom.result.textContent = '';
    dom.result.className = 'qd-result';
    dom.cont.hidden = true;
    showOverlay(dom.quizOv);
    quizReadyAt = now() + QUIZ_ARM_MS;
    // focus the heading, not an answer, so a jump key can't pick an answer by accident
    focusEl(dom.quizTitle);
    revealCard(dom.quizOv);
  }

  function chooseAnswer(i, force) {
    if (st.mode !== 'quiz' || i < 0 || i >= quizN) return;
    if (!force && now() < quizReadyAt) return;
    st.mode = 'answered';
    for (var j = 0; j < quizN; j++) {
      dom.optBtns[j].disabled = true;
      if (optOk[j]) dom.optBtns[j].classList.add('right');
    }
    if (optOk[i]) {
      stats.right++;
      var gain = BONUS * (power[X2] > 0 ? 2 : 1);
      addScore(BONUS);
      dom.result.textContent = 'Correct! +' + gain + ' points' + (gain !== BONUS ? ' (double points!)' : '') + '. The path is clear.';
      dom.result.className = 'qd-result is-right';
    } else {
      stats.wrong++;
      dom.optBtns[i].classList.add('wrong');
      var lose = Math.min(KNOCKBACK, st.m);
      st.m -= lose;
      st.score = Math.max(0, st.score - lose);
      power[SHIELD] = 0;
      dom.result.textContent = 'Not quite. You were knocked back ' + Math.round(lose) + 'm.';
      dom.result.className = 'qd-result is-wrong';
    }
    st.next = st.m + QUIZ_EVERY;
    dom.cont.hidden = false;
    nextReadyAt = now() + NEXT_ARM_MS;
    focusEl(dom.cont);
    revealCard(dom.quizOv);
    hud(true, now());
    if (!rafId) draw();
  }

  function keepRunning(force) {
    if (st.mode !== 'answered') return;
    if (!force && now() < nextReadyAt) return;
    hideOverlays();
    clearPools();
    st.rowT = 500;
    st.inv = 1.2;
    st.jy = 0;
    st.vy = 0;
    st.mode = 'run';
    startLoop();
  }

  function gameOver() {
    st.mode = 'over';
    st.duckT = 0;
    swipeId = -1;
    var s = Math.floor(st.score), nb = s > best;
    if (nb) {
      best = s;
      storageSet('best', best);
    }
    dom.final.textContent = 'You ran ' + Math.floor(st.m) + 'm, reached level ' + (lvl() + 1) + ', collected ' +
      st.coins + ' coins and scored ' + s + (nb ? ' (new best!)' : '') + '.';
    showOverlay(dom.overOv);
    overReadyAt = now() + OVER_ARM_MS;
    focusEl(dom.again);
    revealCard(dom.overOv);
  }

  // ---------- Pause (leaving the tab/window, or Esc / P) ----------
  function pause() {
    releaseHeld();
    if (st.mode !== 'run') return;
    st.mode = 'paused';
    stopLoop();
    draw();
    hud(true, now());
    showOverlay(dom.pausedOv);
    pausedAt = now();
    focusEl(dom.resume);
  }
  function resume() {
    if (st.mode !== 'paused' || now() - pausedAt < 250) return;
    hideOverlays();
    st.mode = 'run';
    startLoop();
  }

  // =====================================================================
  // Start screen: slides and custom questions
  // =====================================================================
  var slideIndex = 0;
  function showSlide(i) {
    slideIndex = i;
    var last = dom.slides.length - 1;
    for (var j = 0; j < dom.slides.length; j++) dom.slides[j].hidden = j !== i;
    for (j = 0; j < dom.dots.length; j++) dom.dots[j].classList.toggle('on', j === i);
    dom.back.classList.toggle('is-invisible', i === 0);
    dom.next.textContent = i === last ? 'Start running' : 'Next';
    dom.skip.hidden = i === last;
  }

  var loadedText = '';
  function describeLoad(p, saved) {
    var n = p.list.length;
    var s = n + (n === 1 ? ' question loaded.' : ' questions loaded.');
    if (p.skipped.length) {
      var shownLines = p.skipped.slice(0, 8).join(', ') + (p.skipped.length > 8 ? ', …' : '');
      s += ' Skipped ' + p.skipped.length + (p.skipped.length === 1 ? ' line' : ' lines') + ' (' + shownLines +
        '): each line needs a question, a correct answer and at least one different wrong answer, and must not be too long.';
    }
    if (p.trimmed) s += ' Only the first ' + MAX_WRONG + ' wrong answers on a line are used.';
    if (!saved) s += ' They could not be saved on this device, so they will be gone after a reload.';
    return s;
  }

  function loadFromTextarea() {
    var text = dom.qtext.value;
    if (text.length > MAX_TEXT) {
      dom.qmsg.textContent = 'That list is too long (over ' + MAX_TEXT.toLocaleString() + ' characters). Please use a shorter list.';
      return false;
    }
    var p = parseQuestions(text);
    if (!p.list.length) {
      dom.qmsg.textContent = 'No valid lines found. Each line needs a question, a correct answer and at least one wrong answer.';
      return false;
    }
    setPool(p.list);
    loadedText = text;
    var saved = true;
    if (text === DEFAULT_TEXT) storageRemove('questions');
    else saved = storageSet('questions', text);
    dom.qmsg.textContent = describeLoad(p, saved);
    return true;
  }

  // Pressing Start with edited-but-not-loaded questions uses them (if they are valid).
  function autoLoadEdits() {
    if (dom.qtext && dom.qtext.value !== loadedText) loadFromTextarea();
  }

  function restoreDefaults() {
    dom.qtext.value = DEFAULT_TEXT;
    loadedText = DEFAULT_TEXT;
    setPool(DEFAULT_POOL);
    storageRemove('questions');
    dom.qmsg.textContent = 'Default questions restored. ' + DEFAULT_POOL.length + ' questions loaded.';
  }

  function initQuestions() {
    var saved = storageGet('questions');
    if (saved && saved.length <= MAX_TEXT) {
      var p = parseQuestions(saved);
      if (p.list.length) {
        setPool(p.list);
        dom.qtext.value = saved;
        loadedText = saved;
        dom.qmsg.textContent = describeLoad(p, true);
        return;
      }
    }
    setPool(DEFAULT_POOL);
    dom.qtext.value = DEFAULT_TEXT;
    loadedText = DEFAULT_TEXT;
    dom.qmsg.textContent = DEFAULT_POOL.length + ' questions loaded.';
  }

  function readBest() {
    var v = Number(storageGet('best'));
    return isFinite(v) && v >= 0 && v < 1e12 ? Math.floor(v) : 0;
  }

  // =====================================================================
  // Input (all listeners attached once, in init)
  // =====================================================================
  var GAME_CODES = { Space: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1 };

  function digitOf(e) {
    var c = e.code || '';
    if (c.length === 6 && c.indexOf('Digit') === 0) return c.charCodeAt(5) - 48;
    if (c.length === 7 && c.indexOf('Numpad') === 0) return c.charCodeAt(6) - 48;
    return e.key && e.key.length === 1 ? e.key.charCodeAt(0) - 48 : -1;
  }

  function onKeyDown(e) {
    var tgt = e.target, tag = tgt && tgt.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || (tgt && tgt.isContentEditable)) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var code = e.code, mode = st.mode, isEnter = code === 'Enter' || code === 'NumpadEnter';
    var isSpace = code === 'Space';

    if (mode === 'run') {
      if (GAME_CODES[code]) e.preventDefault();
      if (code === 'ArrowLeft' || code === 'KeyA') go(-1);
      else if (code === 'ArrowRight' || code === 'KeyD') go(1);
      else if (code === 'ArrowUp' || code === 'KeyW' || isSpace) jump();
      else if (code === 'ArrowDown' || code === 'KeyS') duck(HOLD);
      else if (code === 'Escape' || code === 'KeyP') { e.preventDefault(); pause(); }
      return;
    }
    if (mode === 'paused') {
      if (GAME_CODES[code] || isEnter || code === 'Escape' || code === 'KeyP') {
        e.preventDefault();
        if (!e.repeat) resume();
      }
      return;
    }
    if (mode === 'quiz') {
      var n = digitOf(e);
      if (n >= 1 && n <= quizN) {
        e.preventDefault();
        if (!e.repeat) chooseAnswer(n - 1, false);
        return;
      }
      if (GAME_CODES[code] || isEnter) {
        var onOption = tgt && tgt.classList && tgt.classList.contains('qd-opt') && !tgt.disabled;
        if (e.repeat || !onOption || now() < quizReadyAt) e.preventDefault();
      }
      return;
    }
    if (mode === 'answered' || mode === 'over') {
      var btn = mode === 'answered' ? dom.cont : dom.again;
      var readyAt = mode === 'answered' ? nextReadyAt : overReadyAt;
      if (!(GAME_CODES[code] || isEnter)) return;
      if (tgt === btn && (isSpace || isEnter) && !e.repeat && now() >= readyAt) return;   // native click
      e.preventDefault();
      if ((isSpace || isEnter) && !e.repeat && now() >= readyAt) {
        if (mode === 'answered') keepRunning(false); else startRun();
      }
    }
  }

  function onKeyUp(e) {
    if (e.code === 'ArrowDown' || e.code === 'KeyS') st.duckT = 0;
  }

  // Swipes on the canvas: tap = jump, up = jump, down = duck, left/right = change lane.
  function onCanvasDown(e) {
    if (st.mode !== 'run' || swipeId !== -1) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    swipeId = e.pointerId;
    swipeX = e.clientX;
    swipeY = e.clientY;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
    if (e.cancelable) e.preventDefault();
  }
  function onCanvasUp(e) {
    if (e.pointerId !== swipeId) return;
    swipeId = -1;
    var dx = e.clientX - swipeX, dy = e.clientY - swipeY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) jump();
    else if (Math.abs(dx) > Math.abs(dy)) go(dx > 0 ? 1 : -1);
    else if (dy < 0) jump();
    else duck(45);
  }
  function onCanvasCancel(e) {
    if (e.pointerId === swipeId) swipeId = -1;
  }

  function padButton(el, action) {
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.cancelable) e.preventDefault();
      action();
    });
    // keyboard activation (Enter on a focused pad button) arrives as a click with detail 0
    el.addEventListener('click', function (e) {
      if (e.detail === 0) action();
    });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function onFocusLost() {
    releaseHeld();
    if (st.mode === 'run') pause();
  }

  var resizeTimer = 0;
  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resizeTimer = 0;
      if (fitCanvas(false) && !rafId) draw();
    }, 150);
  }

  // =====================================================================
  // Test hook for automated soak tests (does nothing unless called)
  //   __QD_TEST__.start()        new run with god mode; checkpoint questions get auto-answered
  //   __QD_TEST__.step(n, dt)    n fixed updates (dt 1 = one 60 Hz frame, up to 10 for fast-forward), then one draw
  //   __QD_TEST__.stats()        mode, distance, score, pool use and capacity, number of rAF chains
  // =====================================================================
  var test = { on: false, hits: 0, steps: 0, nextRight: true, peakObs: 0, peakItems: 0, peakDraw: 0 };

  function testAnswer() {
    for (var i = 0; i < quizN; i++) {
      if (optOk[i] === test.nextRight) {
        test.nextRight = !test.nextRight;
        chooseAnswer(i, true);
        return;
      }
    }
    chooseAnswer(0, true);
  }

  function testStats() {
    var T = THEMES[st.th];
    return {
      mode: st.mode,
      m: Math.round(st.m * 10) / 10,
      score: Math.floor(st.score),
      coins: st.coins,
      level: lvl() + 1,
      theme: T.name,
      band: st.band,
      flying: !!T.fly,
      horse: st.horse,
      quizzes: stats.quizzes,
      right: stats.right,
      wrong: stats.wrong,
      hits: test.hits,
      steps: test.steps,
      draws: drawCount,
      bannerLines: msgN,
      active: {
        obstacles: countActive(obs),
        items: countActive(items),
        trees: countActive(treeSlots),
        snow: T.snow ? SNOW_N : 0,
        stars: T.stars ? STAR_N : 0,
        drawList: drawN
      },
      peak: { obstacles: test.peakObs, items: test.peakItems, drawList: test.peakDraw },
      capacity: { obstacles: OBS_CAP, items: ITEM_CAP, trees: TREE_SLOTS, snow: SNOW_N, stars: STAR_N, drawList: DRAW_CAP, bannerLines: MSG_MAX },
      spawnsDropped: droppedSpawns,
      rafChains: rafPending,
      loopRunning: rafId !== 0,
      canvas: { width: bw, height: bh, scale: k },
      questions: questions.length,
      deckLeft: deck.length
    };
  }

  window.__QD_TEST__ = {
    start: function () {
      test.on = true;
      test.hits = 0;
      test.steps = 0;
      test.nextRight = true;
      stats.quizzes = 0;
      stats.right = 0;
      stats.wrong = 0;
      beginRun();
      return testStats();
    },
    step: function (n, dt) {
      if (!test.on) this.start();
      n = Math.max(0, Math.min(1000000, Math.floor(Number(n) || 0)));
      dt = Math.max(0.1, Math.min(10, Number(dt) || 1));
      for (var i = 0; i < n; i++) {
        if (st.mode === 'paused') { pausedAt = -1e9; resume(); }
        if (st.mode === 'quiz') testAnswer();
        if (st.mode === 'answered') keepRunning(true);
        if (st.mode !== 'run') beginRun();
        update(dt);
        test.steps++;
        var a = countActive(obs), b = countActive(items);
        if (a > test.peakObs) test.peakObs = a;
        if (b > test.peakItems) test.peakItems = b;
      }
      draw();
      if (drawN > test.peakDraw) test.peakDraw = drawN;
      hud(true, now());
      return testStats();
    },
    stats: testStats
  };

  // =====================================================================
  // Init
  // =====================================================================
  function $(id) { return document.getElementById(id); }

  function init() {
    cv = $('qd-canvas');
    dom.stage = $('qd-stage');
    dom.score = $('qd-score');
    dom.dist = $('qd-dist');
    dom.level = $('qd-level');
    dom.coins = $('qd-coins');
    dom.best = $('qd-best');
    dom.chips = [null, $('qd-chip-1'), $('qd-chip-2'), $('qd-chip-3'), $('qd-chip-4')];
    dom.chipTimes = [null, null, null, null, null];
    dom.startOv = $('qd-start');
    dom.quizOv = $('qd-quiz');
    dom.overOv = $('qd-over');
    dom.pausedOv = $('qd-paused');
    dom.slides = dom.startOv ? dom.startOv.querySelectorAll('.qd-slide') : [];
    dom.dots = $('qd-dots') ? $('qd-dots').querySelectorAll('i') : [];
    dom.back = $('qd-back');
    dom.skip = $('qd-skip');
    dom.next = $('qd-next');
    dom.qtext = $('qd-qtext');
    dom.qload = $('qd-qload');
    dom.qdefault = $('qd-qdefault');
    dom.qmsg = $('qd-qmsg');
    dom.quizTitle = $('qd-quiz-title');
    dom.question = $('qd-question');
    dom.opts = $('qd-opts');
    dom.result = $('qd-result');
    dom.cont = $('qd-continue');
    dom.final = $('qd-final');
    dom.again = $('qd-again');
    dom.resume = $('qd-resume');

    if (!cv || !cv.getContext || !dom.stage || !dom.opts || !dom.startOv || !dom.quizOv || !dom.overOv ||
        !dom.pausedOv || dom.slides.length !== 5 || !dom.chips[4] || !dom.qtext) return;
    ctx = cv.getContext('2d', { alpha: false });
    if (!ctx) return;

    for (var c = 1; c <= 4; c++) dom.chipTimes[c] = dom.chips[c].querySelector('.qd-chip-t');

    // answer buttons: created once, reused for every question
    dom.optBtns = [];
    dom.optTexts = [];
    for (var i = 0; i < MAX_OPTS; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'qd-opt';
      b.hidden = true;
      var key = document.createElement('span');
      key.className = 'qd-opt-key';
      key.setAttribute('aria-hidden', 'true');
      key.textContent = String(i + 1);
      var txt = document.createElement('span');
      txt.className = 'qd-opt-text';
      b.appendChild(key);
      b.appendChild(txt);
      dom.opts.appendChild(b);
      dom.optBtns.push(b);
      dom.optTexts.push(txt);
      (function (index) {
        b.addEventListener('click', function () { chooseAnswer(index, false); });
      })(i);
    }

    // numbers in the slide text come from the rules above
    var fills = [['.qd-n-level', LEVEL_EVERY], ['.qd-n-theme', THEME_EVERY], ['.qd-n-quiz', QUIZ_EVERY], ['.qd-n-bonus', BONUS], ['.qd-n-knock', KNOCKBACK]];
    for (var f = 0; f < fills.length; f++) {
      var els = document.querySelectorAll(fills[f][0]);
      for (var e = 0; e < els.length; e++) els[e].textContent = String(fills[f][1]);
    }

    // sharper canvas on high-DPI screens, but never on low-end devices
    var hc = navigator.hardwareConcurrency || 8, mem = navigator.deviceMemory || 8;
    kCap = hc <= 4 || mem <= 4 ? 1 : 2;

    best = readBest();
    initQuestions();
    showSlide(0);

    // buttons
    dom.back.addEventListener('click', function () { showSlide(Math.max(0, slideIndex - 1)); });
    dom.next.addEventListener('click', function () {
      if (slideIndex === dom.slides.length - 1) startRun();
      else showSlide(slideIndex + 1);
    });
    dom.skip.addEventListener('click', startRun);
    dom.qload.addEventListener('click', loadFromTextarea);
    dom.qdefault.addEventListener('click', restoreDefaults);
    dom.cont.addEventListener('click', function () { keepRunning(false); });
    dom.again.addEventListener('click', startRun);
    dom.pausedOv.addEventListener('click', resume);

    padButton($('qd-left'), function () { go(-1); });
    padButton($('qd-jump'), jump);
    padButton($('qd-duck'), function () { duck(45); });
    padButton($('qd-right'), function () { go(1); });

    cv.addEventListener('pointerdown', onCanvasDown);
    cv.addEventListener('pointerup', onCanvasUp);
    cv.addEventListener('pointercancel', onCanvasCancel);
    cv.addEventListener('lostpointercapture', onCanvasCancel);
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onFocusLost);
    window.addEventListener('pagehide', onFocusLost);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) onFocusLost();
    });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    // first still frame (the meadow behind the start slides)
    resetRun();
    st.mode = 'idle';
    fitCanvas(true);
    draw();
    hud(true, now());
  }

  init();
})();
