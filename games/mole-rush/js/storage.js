/*
  Mole Rush — best scores, saved on this device only.
  Every localStorage access is inside try/catch (private windows and some school
  settings block it), and everything read back is checked before it is used.
*/

const KEY = 'mrd-games:mole-rush:v1';

function read() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const obj = raw ? JSON.parse(raw) : null;
    return obj && typeof obj === 'object' && obj.v === 1 && obj.best && typeof obj.best === 'object' ? obj : { v: 1, best: {} };
  } catch (err) {
    return { v: 1, best: {} };
  }
}

function write(obj) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(obj));
    return true;
  } catch (err) {
    return false;
  }
}

function validBest(b) {
  return b && Number.isFinite(b.score) && b.score >= 0 && b.score < 1e6 && Number.isFinite(b.accuracy) && b.accuracy >= 0 && b.accuracy <= 100;
}

/* { score, accuracy, timeMs } or null */
export function getBest(mapId) {
  const b = read().best[String(mapId)];
  return validBest(b) ? { score: b.score, accuracy: b.accuracy, timeMs: Number.isFinite(b.timeMs) ? b.timeMs : 0 } : null;
}

/*
  Save the round if it beats the old best (higher score, or same score faster).
  -> { first: no earlier best existed, newBest: this round is the new best,
       saved: false when the browser would not let us keep it (private window, blocked storage) }
*/
export function recordResult(mapId, summary) {
  const data = read();
  const old = data.best[String(mapId)];
  const first = !validBest(old);
  const better = first || summary.score > old.score || (summary.score === old.score && summary.timeMs < (old.timeMs || Infinity));
  let saved = true;
  if (better) {
    data.best[String(mapId)] = { score: summary.score, accuracy: summary.accuracy, timeMs: summary.timeMs };
    saved = write(data);
  }
  return { first, newBest: better && !first && saved, saved };
}
