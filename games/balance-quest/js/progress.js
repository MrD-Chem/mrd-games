/*
  Balance Quest — saved progress (this device only).
  Every localStorage access is wrapped in try/catch (private windows and some
  school settings block it), and everything read back is validated.
*/

const KEY = 'mrd-games:balance-quest:v1';
const CUSTOM_KEY = 'mrd-games:balance-quest:custom-v1';
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const MAX_IDS = 400;
const MAX_CUSTOM_CHARS = 4000;

function readRaw(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    return null;
  }
}

function writeRaw(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    return false;
  }
}

function emptyData() {
  return { v: 1, solved: [], stars: {}, unlocked: [1], completed: [], teacher: false, simple: false, live: true };
}

function validWorld(n) {
  return Number.isInteger(n) && n >= 1 && n <= 20;
}

function validate(obj) {
  const out = emptyData();
  if (!obj || typeof obj !== 'object' || obj.v !== 1) return out;
  if (Array.isArray(obj.solved)) out.solved = [...new Set(obj.solved.filter((id) => typeof id === 'string' && ID_RE.test(id)))].slice(0, MAX_IDS);
  if (obj.stars && typeof obj.stars === 'object' && !Array.isArray(obj.stars)) {
    let count = 0;
    for (const id of Object.keys(obj.stars)) {
      const s = obj.stars[id];
      if (ID_RE.test(id) && Number.isInteger(s) && s >= 1 && s <= 3 && count < MAX_IDS) {
        out.stars[id] = s;
        count++;
      }
    }
  }
  if (Array.isArray(obj.unlocked)) out.unlocked = [...new Set([1, ...obj.unlocked.filter(validWorld)])];
  if (Array.isArray(obj.completed)) out.completed = [...new Set(obj.completed.filter(validWorld))];
  out.teacher = obj.teacher === true;
  out.simple = obj.simple === true;
  out.live = obj.live !== false;
  return out;
}

export class Progress {
  constructor() {
    this.data = emptyData();
    const raw = readRaw(KEY);
    if (raw) {
      try {
        this.data = validate(JSON.parse(raw));
      } catch (err) {
        this.data = emptyData();
      }
    }
  }

  save() {
    return writeRaw(KEY, JSON.stringify(this.data));
  }

  isSolved(id) {
    return this.data.solved.includes(id);
  }

  stars(id) {
    return this.data.stars[id] || 0;
  }

  /* Record a solved gate; keeps the best star count. */
  markSolved(id, stars) {
    if (!ID_RE.test(id)) return;
    if (!this.data.solved.includes(id)) this.data.solved.push(id);
    const s = Math.max(1, Math.min(3, stars | 0));
    if (s > (this.data.stars[id] || 0)) this.data.stars[id] = s;
    this.save();
  }

  /* Start a world over: forget which gates are open, keep stars and unlocks. */
  resetRun(ids) {
    this.data.solved = this.data.solved.filter((id) => !ids.includes(id));
    this.save();
  }

  isUnlocked(n) {
    return n === 1 || this.data.teacher || this.data.unlocked.includes(n);
  }

  isCompleted(n) {
    return this.data.completed.includes(n);
  }

  completeWorld(n) {
    if (!this.data.completed.includes(n)) this.data.completed.push(n);
    if (!this.data.unlocked.includes(n + 1)) this.data.unlocked.push(n + 1);
    this.save();
  }

  get teacher() {
    return this.data.teacher;
  }

  set teacher(on) {
    this.data.teacher = !!on;
    this.save();
  }

  get simple() {
    return this.data.simple;
  }

  set simple(on) {
    this.data.simple = !!on;
    this.save();
  }

  get practiceLive() {
    return this.data.live;
  }

  set practiceLive(on) {
    this.data.live = !!on;
    this.save();
  }

  loadCustom() {
    const raw = readRaw(CUSTOM_KEY);
    return typeof raw === 'string' ? raw.slice(0, MAX_CUSTOM_CHARS) : '';
  }

  saveCustom(text) {
    return writeRaw(CUSTOM_KEY, String(text || '').slice(0, MAX_CUSTOM_CHARS));
  }
}
