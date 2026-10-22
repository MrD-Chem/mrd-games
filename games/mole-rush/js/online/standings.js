/* Room snapshots -> canvas progress. The room remains the authority for places,
   ties and finish status; a correct answer is still exactly one visual step. */
import { el } from '../dom.js?v=20261022T1625';
import { createRace } from '../race/track.js?v=20261022T1625';

const COLORS = ['#6ee7cf', '#fcd779', '#c4b5fd', '#fda4af'];
const ORD = ['th', 'st', 'nd', 'rd'];
export function ordinal(n) {
  const v = n % 100;
  return n + (ORD[(v - 20) % 10] || ORD[v] || ORD[0]);
}

export function createStandings(host, opts = {}) {
  let total = Math.max(1, Math.round(opts.questionCount || 10));
  const canvas = el('canvas', { class: 'mr-race-canvas', 'aria-label': 'Live race track' });
  const empty = el('p', { text: 'Waiting for racers…', role: 'status' });
  const away = el('p', { class: 'mr-race-away', hidden: true });
  const root = el('section', { class: 'mr-sp', 'aria-label': 'Live standings' },
    el('h3', { class: 'mr-sp-title', text: 'Race track' }), canvas, empty, away);
  host.appendChild(root);
  let track = null;
  let signature = '';
  let destroyed = false;
  const seen = new Map();

  function update(snapshot, more) {
    if (destroyed || !snapshot) return;
    if (more && Number.isFinite(more.questionCount)) total = Math.max(1, Math.round(more.questionCount));
    const entries = (snapshot.entries || []).slice().sort((a, b) => a.slot.localeCompare(b.slot));
    const absent = entries.filter(e => e.connected === false && !e.finished);
    away.hidden = absent.length === 0;
    away.textContent = absent.length ? 'Away: ' + absent.map(e => e.name).join(', ') + '.' : '';
    const mode = snapshot.mode === 'teams' ? 'teams' : 'solo';
    const key = JSON.stringify([total, mode, entries.map(e => [e.slot, e.uid, e.name, e.team, e.isMe])]);
    const steps = e => Math.max(0, Math.min(total, Math.floor(Number(e.steps) || 0)));
    // A changed roster/round or authoritative rollback needs a fresh track.
    if (key !== signature || entries.some(e => steps(e) < (seen.get(e.slot) || 0))) {
      if (track) track.destroy();
      track = null;
      seen.clear();
      signature = key;
      if (entries.length) {
        track = createRace({ canvas, totalSteps: total, mode, live: true,
          racers: entries.map((e, i) => ({ id: e.slot, name: e.name,
            color: COLORS[i], isPlayer: e.isMe, team: mode === 'teams' ? e.team : null })) });
        track.start();
      }
    }
    canvas.hidden = !track;
    empty.hidden = !!track;
    if (!track) return;
    for (const e of entries) {
      const target = steps(e);
      for (let n = seen.get(e.slot) || 0; n < target; n++) track.correct(e.slot);
      seen.set(e.slot, target);
    }
    track.syncStatus(entries.map(e => ({ id: e.slot, place: e.place, finished: e.finished })), snapshot.teams || []);
  }

  return {
    el: root, update,
    standings: () => track ? track.standings() : [], // read-only integration checks
    destroy() {
      destroyed = true;
      if (track) track.destroy();
      track = null;
      seen.clear();
      root.remove();
    }
  };
}
