/** Wall-clock countdowns: onTick receives ceil(seconds remaining), then 0 at GO.
 * onGo fires once at the deadline, or the first available task if throttled.
 * cancel removes timers/listeners. Hidden pages catch up without shifting GO.
 */
export function countdownTo(epochMs, { onTick = () => {}, onGo = () => {} } = {}) {
  if (!Number.isFinite(epochMs)) throw new TypeError('Countdown needs a finite epoch.');
  let timer = null;
  let cancelled = false;
  let previous = -1;

  function cancel() {
    cancelled = true;
    clearTimeout(timer);
    timer = null;
    document.removeEventListener('visibilitychange', tick);
  }

  function tick() {
    if (cancelled) return;
    clearTimeout(timer);
    timer = null;
    const remaining = Math.max(0, epochMs - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    if (seconds !== previous) {
      previous = seconds;
      onTick(seconds);
    }
    if (cancelled) return;
    if (remaining === 0) {
      cancel();
      onGo();
      return;
    }
    // Re-read the clock after callbacks; never accumulate interval drift.
    const nextBoundary = epochMs - (seconds - 1) * 1000;
    timer = setTimeout(tick, Math.max(0, nextBoundary - Date.now()));
  }

  document.addEventListener('visibilitychange', tick);
  tick();
  return { cancel };
}

export function countdownFor(seconds, cbs) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new TypeError('Countdown seconds must be finite and non-negative.');
  }
  return countdownTo(Date.now() + seconds * 1000, cbs);
}
