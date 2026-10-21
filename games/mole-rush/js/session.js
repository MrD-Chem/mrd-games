/*
  Mole Rush — one round of play.

  buildSequence(bank, mapId, seed) picks the questions. It uses only the seeded PRNG,
  so the same race code gives the same questions in the same order on every device.

  A Session tracks score, streak, accuracy and time, and emits events a race layer
  (CPU racers, teams, online rooms) can subscribe to without touching the maps:
    session.onItem((item, index) => ...)                 a new question is showing
    session.onAnswer((correct, timeMs, detail) => ...)   every Check (and "Show me")
    session.onFinish((summary) => ...)                   the round is over
  Each on...() returns a function that unsubscribes.
*/

import { mulberry32, deriveSeed, seededShuffle, randInt, codeToSeed, normalizeCode } from './rng.js?v=20261021T1624';

/*
  How each map builds its round. balanceEvery: put one balancing item after every
  N setup problems (0 = none).
*/
export const MAP_RULES = Object.freeze({
  1: { length: 10, balanceEvery: 3 },
  2: { length: 10, balanceEvery: 0 },
  3: { length: 10, balanceEvery: 0 },
  4: { length: 8, balanceEvery: 0 }
});

/* Points: first try 100, second 60, later 30, "Show me" 0; +10 per item of streak (max +50). */
export const POINTS = Object.freeze({ first: 100, second: 60, later: 30, streakStep: 10, streakMax: 50 });

function balancingComplexity(b) {
  return b.coefficients.reduce((s, c) => s + c, 0) + b.reactants.length + b.products.length;
}

/* Difficulty a slot should have, ramping 1 → 3 across the round. */
function targetDifficulty(j, n) {
  return Math.min(3, 1 + Math.floor((3 * j) / Math.max(1, n)));
}

export function buildSequence(bank, mapId, seed) {
  const rules = MAP_RULES[mapId] || MAP_RULES[1];
  const rng = mulberry32(deriveSeed(seed, 'map', mapId, 'v1'));

  // 1. Pattern of setup / balance slots: S S S B S S S B S S
  const pattern = [];
  let since = 0;
  const canBalance = rules.balanceEvery > 0 && bank.balancing.length > 0;
  for (let i = 0; i < rules.length; i++) {
    if (canBalance && since === rules.balanceEvery && i < rules.length - 1) {
      pattern.push('balance');
      since = 0;
    } else {
      pattern.push('setup');
      since++;
    }
  }
  const nSetup = pattern.filter((k) => k === 'setup').length;
  const nBalance = pattern.length - nSetup;

  // 2. Setup problems: shuffled pools per difficulty, picked on a ramp, and never the
  //    same reaction (or, when possible, the same type) twice in a row.
  const pools = { 1: [], 2: [], 3: [] };
  for (const p of seededShuffle(bank.problems, rng)) pools[p.difficulty].push(p);
  const pickProblem = (target, prev) => {
    const order = [target, target - 1, target + 1, target - 2, target + 2].filter((d) => d >= 1 && d <= 3);
    for (const d of order) {
      const pool = pools[d];
      if (!pool.length) continue;
      let idx = prev ? pool.findIndex((p) => p.reaction !== prev.reaction && p.type !== prev.type) : 0;
      if (idx < 0) idx = pool.findIndex((p) => p.reaction !== prev.reaction);
      if (idx < 0) idx = 0;
      return pool.splice(idx, 1)[0];
    }
    return null;
  };

  // 3. Balancing items: sorted easy → hard (ties in seeded order) and split into one
  //    chunk per balancing slot, so the first is from the easier end and the last from
  //    the harder end — and every item in the bank can come up.
  const balSorted = seededShuffle(bank.balancing, rng)
    .map((b, i) => ({ b, i, c: balancingComplexity(b) }))
    .sort((x, y) => x.c - y.c || x.i - y.i)
    .map((x) => x.b);
  const usedBal = new Set();
  const pickBalance = (k) => {
    const size = balSorted.length;
    if (!size) return null;
    const lo = Math.floor((k * size) / nBalance);
    const hi = Math.max(lo + 1, Math.floor(((k + 1) * size) / nBalance));
    const chunk = balSorted.slice(lo, Math.min(hi, size)).filter((b) => !usedBal.has(b));
    const pool = chunk.length ? chunk : balSorted.filter((b) => !usedBal.has(b));
    if (!pool.length) return null;
    const pick = pool[randInt(rng, pool.length)];
    usedBal.add(pick);
    return pick;
  };

  const items = [];
  let prev = null;
  let j = 0;
  let k = 0;
  for (const slot of pattern) {
    if (slot === 'setup') {
      const p = pickProblem(targetDifficulty(j++, nSetup), prev);
      if (!p) continue;
      prev = p;
      items.push({ kind: 'setup', id: p.id, problem: p });
    } else {
      const b = pickBalance(k++);
      if (!b) continue;
      items.push({ kind: 'balance', id: b.id, eq: b });
    }
  }
  // Never end on a balancing item (the race should finish on stoichiometry).
  while (items.length > 1 && items[items.length - 1].kind === 'balance') items.pop();
  items.forEach((item, i) => {
    item.index = i;
    item.seed = deriveSeed(seed, 'item', mapId, i, item.id);
  });
  return items;
}

/* createSession(bank, mapId, code) — code is any spelling of a race code. */
export function createSession(bank, mapId, code) {
  const norm = normalizeCode(code);
  if (!norm) throw new Error('Bad race code');
  const seed = codeToSeed(norm.key);
  const items = buildSequence(bank, mapId, seed);
  return new Session({ mapId, code: norm.display, seed, items });
}

function now() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

export class Session {
  constructor({ mapId, code, seed, items }) {
    this.mapId = mapId;
    this.code = code;
    this.seed = seed;
    this.items = items;
    this.index = -1;
    this.records = items.map((item) => ({ id: item.id, kind: item.kind, checks: 0, done: false, correct: false, firstTry: false, revealed: false, points: 0, timeMs: 0 }));
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.startedAt = 0;
    this.itemStartedAt = 0;
    this.finishedAt = 0;
    this.finished = false;
    this.handlers = { item: new Set(), answer: new Set(), finish: new Set() };
  }

  // ---------- Events ----------

  _on(name, fn) {
    this.handlers[name].add(fn);
    return () => this.handlers[name].delete(fn);
  }

  onItem(fn) {
    return this._on('item', fn);
  }

  onAnswer(fn) {
    return this._on('answer', fn);
  }

  onFinish(fn) {
    return this._on('finish', fn);
  }

  _emit(name, ...args) {
    for (const fn of [...this.handlers[name]]) {
      try {
        fn(...args);
      } catch (err) {
        // A listener's bug must never stop the game.
        setTimeout(() => {
          throw err;
        }, 0);
      }
    }
  }

  // ---------- Flow ----------

  get total() {
    return this.items.length;
  }

  get item() {
    return this.items[this.index] || null;
  }

  get record() {
    return this.records[this.index] || null;
  }

  start() {
    this.startedAt = now();
    this.index = 0;
    this.itemStartedAt = this.startedAt;
    this._emit('item', this.item, this.index);
  }

  /* Every press of Check. Returns the item's record. */
  answer(correct) {
    const rec = this.record;
    if (!rec || rec.done || this.finished) return rec;
    rec.checks++;
    const timeMs = Math.round(now() - this.itemStartedAt);
    if (correct) {
      rec.done = true;
      rec.correct = true;
      rec.firstTry = rec.checks === 1;
      rec.timeMs = timeMs;
      if (rec.firstTry) {
        this.streak++;
        this.bestStreak = Math.max(this.bestStreak, this.streak);
      } else {
        this.streak = 0;
      }
      const base = rec.checks === 1 ? POINTS.first : rec.checks === 2 ? POINTS.second : POINTS.later;
      const bonus = rec.firstTry ? Math.min(POINTS.streakMax, POINTS.streakStep * (this.streak - 1)) : 0;
      rec.points = base + bonus;
      this.score += rec.points;
    } else {
      this.streak = 0;
    }
    this._emit('answer', !!correct, timeMs, { index: this.index, id: rec.id, kind: rec.kind, checks: rec.checks, done: rec.done, points: rec.points, revealed: false });
    return rec;
  }

  /* "Show me": the item is over, with no points. */
  reveal() {
    const rec = this.record;
    if (!rec || rec.done || this.finished) return rec;
    rec.done = true;
    rec.revealed = true;
    rec.timeMs = Math.round(now() - this.itemStartedAt);
    this.streak = 0;
    this._emit('answer', false, rec.timeMs, { index: this.index, id: rec.id, kind: rec.kind, checks: rec.checks, done: true, points: 0, revealed: true });
    return rec;
  }

  /* Move on. Returns the next item, or null when the round just finished. */
  next() {
    if (this.finished) return null;
    const rec = this.record;
    if (!rec || !rec.done) return this.item;
    if (this.index >= this.items.length - 1) {
      this.finish();
      return null;
    }
    this.index++;
    this.itemStartedAt = now();
    this._emit('item', this.item, this.index);
    return this.item;
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.finishedAt = now();
    this._emit('finish', this.summary());
  }

  /* Live numbers for the HUD. */
  stats() {
    const answered = this.records.filter((r) => r.done).length;
    const firstTry = this.records.filter((r) => r.firstTry).length;
    const end = this.finished ? this.finishedAt : now();
    return {
      index: this.index,
      total: this.items.length,
      score: this.score,
      streak: this.streak,
      bestStreak: this.bestStreak,
      answered,
      firstTry,
      accuracy: answered ? Math.round((100 * firstTry) / answered) : 0,
      elapsedMs: this.startedAt ? Math.round(end - this.startedAt) : 0
    };
  }

  summary() {
    const s = this.stats();
    return {
      mapId: this.mapId,
      code: this.code,
      total: s.total,
      answered: s.answered,
      firstTry: s.firstTry,
      revealed: this.records.filter((r) => r.revealed).length,
      accuracy: s.total ? Math.round((100 * s.firstTry) / s.total) : 0,
      score: s.score,
      bestStreak: s.bestStreak,
      timeMs: s.elapsedMs,
      finished: this.finished,
      items: this.records.map((r) => ({ ...r }))
    };
  }
}
