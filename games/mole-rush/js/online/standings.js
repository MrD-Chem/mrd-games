/*
  Mole Rush online — the compact live standings panel shown next to the questions.

  const panel = createStandings(host, { questionCount: 10 });
  panel.update(standings)   // standings = rooms.standings(room): { mode, entries, teams }
  panel.destroy()

  Self-contained on purpose: it only reads the standings object and owns its own DOM (classes
  start with "mr-sp-"), so a 2D race track can replace it later with the same update() call.
  Rows are keyed by slot and moved (not rebuilt), so the bars can glide when motion is allowed.
  Names are user content: they only ever go in through textContent.
*/

import { el, clear } from '../dom.js?v=20261021T1624';

const ORD = ['th', 'st', 'nd', 'rd'];
export function ordinal(n) {
  const v = n % 100;
  return n + (ORD[(v - 20) % 10] || ORD[v] || ORD[0]);
}

function teamTotals(standings) {
  /* combined steps per team (the team bar fills toward every member answering every question) */
  return (standings.teams || []).filter((t) => t.players > 0);
}

export function createStandings(host, opts) {
  let total = Math.max(1, Math.round((opts && opts.questionCount) || 10));
  const finishedSeen = new Set();
  let firstUpdate = true;

  const title = el('h3', { class: 'mr-sp-title', text: 'Standings' });
  const teamsBox = el('div', { class: 'mr-sp-teams', hidden: true });
  const list = el('ol', { class: 'mr-sp-list' });
  const live = el('p', { class: 'sr-only', 'aria-live': 'polite' });
  const root = el('section', { class: 'mr-sp', 'aria-label': 'Live standings' }, title, teamsBox, list, live);
  host.appendChild(root);
  const rows = new Map(); /* slot -> { li, name, you, team, count, sr, fill, state } */

  function row(slot) {
    let r = rows.get(slot);
    if (r) return r;
    const place = el('span', { class: 'mr-sp-place', 'aria-hidden': 'true' });
    const name = el('span', { class: 'mr-sp-name-text' });
    const you = el('span', { class: 'mr-sp-you', text: 'You', hidden: true });
    const team = el('span', { class: 'mr-sp-team', 'aria-hidden': 'true', hidden: true });
    const count = el('span', { class: 'mr-sp-count', 'aria-hidden': 'true' });
    const sr = el('span', { class: 'sr-only' });
    const fill = el('span', { class: 'mr-sp-fill' });
    const li = el('li', { class: 'mr-sp-row' },
      place,
      el('span', { class: 'mr-sp-name' }, name, you),
      team,
      count,
      sr,
      el('span', { class: 'mr-sp-bar', 'aria-hidden': 'true' }, fill));
    r = { li, place, name, you, team, count, sr, fill };
    rows.set(slot, r);
    return r;
  }

  function setFill(fill, fraction) {
    const f = Math.max(0, Math.min(1, fraction));
    fill.style.transform = 'scaleX(' + f.toFixed(3) + ')';
  }

  function update(standings, more) {
    if (!standings) return;
    if (more && Number.isFinite(more.questionCount)) total = Math.max(1, Math.round(more.questionCount));
    const entries = standings.entries || [];
    const teamsMode = standings.mode === 'teams';
    root.classList.toggle('is-teams', teamsMode);

    /* team totals */
    teamsBox.hidden = !teamsMode;
    if (teamsMode) {
      clear(teamsBox);
      for (const t of teamTotals(standings)) {
        const fill = el('span', { class: 'mr-sp-fill' });
        const mine = entries.some((e) => e.isMe && e.team === t.team);
        teamsBox.appendChild(el('div', { class: 'mr-sp-teamtotal' + (mine ? ' is-mine' : ''), 'data-team': t.team },
          el('span', { class: 'mr-sp-teamname', text: 'Team ' + t.team + (mine ? ' (yours)' : '') }),
          el('span', { class: 'mr-sp-teamsteps', text: t.steps + ' correct' }),
          el('span', { class: 'mr-sp-bar', 'aria-hidden': 'true' }, fill)));
        setFill(fill, t.steps / (total * Math.max(1, t.players)));
      }
    }

    /* racers, in standings order */
    const keep = new Set();
    entries.forEach((e) => {
      const r = row(e.slot);
      keep.add(e.slot);
      r.li.className = 'mr-sp-row' + (e.isMe ? ' is-me' : '') + (e.finished ? ' is-done' : '') + (!e.connected && !e.finished ? ' is-away' : '');
      if (e.team) r.li.setAttribute('data-team', e.team);
      else r.li.removeAttribute('data-team');
      r.place.textContent = String(e.place);
      r.name.textContent = e.name;
      r.you.hidden = !e.isMe;
      r.team.hidden = !teamsMode || !e.team;
      r.team.textContent = e.team || ''; /* a short team letter; the screen-reader text says 'team A' */
      r.count.textContent = e.finished ? '✓ ' + e.steps + '/' + total : e.steps + '/' + total;
      r.sr.textContent = ', ' + ordinal(e.place) + (e.isMe ? ', you' : '') + (teamsMode && e.team ? ', team ' + e.team : '') + ', ' + e.steps + ' of ' + total + ' correct' + (e.finished ? ', finished' : !e.connected ? ', away' : '');
      setFill(r.fill, e.steps / total);
      list.appendChild(r.li); /* moves it into place */
      if (e.finished && !finishedSeen.has(e.slot)) {
        finishedSeen.add(e.slot);
        if (!firstUpdate && !e.isMe) live.textContent = e.name + ' finished.';
      }
    });
    for (const [slot, r] of rows) {
      if (!keep.has(slot)) {
        r.li.remove();
        rows.delete(slot);
      }
    }
    firstUpdate = false;
  }

  return {
    el: root,
    update,
    destroy() {
      rows.clear();
      root.remove();
    }
  };
}
