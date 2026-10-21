/** Seeded CPU answers. start/stop are idempotent; stop preserves the current wait.
 * Visibility pauses question time. Call stop when the racer or race finishes.
 * difficulty is easy/medium/hard (case insensitive); seed is a number or string.
 */
export const CPU_DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ accuracy: 0.55, minSeconds: 20, maxSeconds: 30 }),
  medium: Object.freeze({ accuracy: 0.72, minSeconds: 13, maxSeconds: 20 }),
  hard: Object.freeze({ accuracy: 0.88, minSeconds: 8, maxSeconds: 13 })
});

export function createCpu({ racerId, difficulty = 'medium', seed = 1, onAnswer }) {
  const settings = CPU_DIFFICULTIES[String(difficulty).toLowerCase()];
  if (!settings || typeof onAnswer !== 'function') {
    throw new TypeError('CPU needs a valid difficulty and onAnswer callback.');
  }
  // FNV-1a seed hash, then Mulberry32; no dependence on Math.random or the clock.
  let state = 2166136261;
  const key = String(seed);
  for (let i = 0; i < key.length; i++) {
    state = Math.imul(state ^ key.charCodeAt(i), 16777619) >>> 0;
  }
  function random() {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  let running = false;
  let timer = null;
  let remaining = null;
  let deadline = 0;

  function schedule() {
    if (!running || document.hidden || timer !== null) return;
    if (remaining === null) {
      remaining = 1000 * (settings.minSeconds + random() *
        (settings.maxSeconds - settings.minSeconds));
    }
    deadline = performance.now() + remaining;
    timer = setTimeout(answer, remaining);
  }

  function pause() {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
    remaining = Math.max(0, deadline - performance.now());
  }

  function answer() {
    timer = null;
    if (!running) return;
    if (document.hidden) {
      remaining = Math.max(0, deadline - performance.now());
      return;
    }
    remaining = null;
    const isCorrect = random() < settings.accuracy;
    // The callback may stop this CPU, including on the final answer.
    try { onAnswer(racerId, isCorrect); } finally { schedule(); }
  }

  function visibility() {
    if (document.hidden) pause();
    else schedule();
  }

  return {
    start() {
      if (running) return;
      running = true;
      document.addEventListener('visibilitychange', visibility);
      schedule();
    },
    stop() {
      running = false;
      pause();
      document.removeEventListener('visibilitychange', visibility);
    }
  };
}
