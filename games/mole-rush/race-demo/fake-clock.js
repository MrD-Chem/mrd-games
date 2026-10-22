/** Deterministic timers in this page or a same-origin game iframe. */
export function fakeClock(realm = globalThis) {
  const { document, performance, Date, Event } = realm;
  let now = 100000;
  let serial = 0;
  let hidden = false;
  const tasks = new Map();
  const frames = new Map();
  const originals = {
    setTimeout: realm.setTimeout, clearTimeout: realm.clearTimeout,
    requestAnimationFrame: realm.requestAnimationFrame, cancelAnimationFrame: realm.cancelAnimationFrame,
    dateNow: Date.now, perf: Object.getOwnPropertyDescriptor(performance, 'now'),
    hidden: Object.getOwnPropertyDescriptor(document, 'hidden')
  };
  realm.setTimeout = (fn, delay = 0) => { const id = ++serial; tasks.set(id, { fn, due: now + Math.max(0, delay) }); return id; };
  realm.clearTimeout = id => tasks.delete(id);
  realm.requestAnimationFrame = fn => { const id = ++serial; frames.set(id, fn); return id; };
  realm.cancelAnimationFrame = id => frames.delete(id);
  Date.now = () => now;
  Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  function advance(ms) {
    const target = now + ms;
    let guard = 0;
    while (true) {
      let first = null;
      for (const pair of tasks) if (pair[1].due <= target && (!first || pair[1].due < first[1].due)) first = pair;
      if (!first) break;
      if (++guard >= 100000) throw new Error('Timer failed to settle');
      now = first[1].due;
      tasks.delete(first[0]);
      first[1].fn();
    }
    now = target;
  }
  return {
    tasks, frames, advance,
    jump(ms) { now += ms; },
    flush() { const pending = [...tasks.values()]; tasks.clear(); for (const task of pending) task.fn(); },
    frame(ms = 16) { now += ms; const pending = [...frames.values()]; frames.clear(); for (const fn of pending) fn(now); },
    visibility(value) { hidden = value; document.dispatchEvent(new Event('visibilitychange')); },
    restore() {
      realm.setTimeout = originals.setTimeout;
      realm.clearTimeout = originals.clearTimeout;
      realm.requestAnimationFrame = originals.requestAnimationFrame;
      realm.cancelAnimationFrame = originals.cancelAnimationFrame;
      Date.now = originals.dateNow;
      if (originals.perf) Object.defineProperty(performance, 'now', originals.perf);
      else delete performance.now;
      if (originals.hidden) Object.defineProperty(document, 'hidden', originals.hidden);
      else delete document.hidden;
    }
  };
}
