/*
  Mole Rush online — the race results screen. It keeps updating while other racers finish.

  createResultsView(ctx) -> { render(st, info) }
    st   = standings (rooms.standings of the room, with this player's own progress merged in)
    info = { code, map, questionCount, raceOver, summary (this player's game summary or null),
             closed (room is gone), unsaved (this player's result has not reached the database yet) }
    ctx.onLobby()   Back to lobby

  Ranking: solo by finish order, then most correct (that is how rooms.standings sorts).
  Teams by combined correct answers; if the teams ended up uneven (a player dropped out), by the
  average per player instead, so a smaller team is not punished.
*/

import { el, clear } from '../dom.js?v=20261022T1625';
import { ordinal } from './standings.js?v=20261022T1625';
import { mapLabel } from './lobby.js?v=20261022T1625';

export function formatMs(ms) {
  const total = Math.max(0, Math.round((ms || 0) / 1000));
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

export function teamRanking(st) {
  const teams = (st.teams || []).filter((t) => t.players > 0).map((t) => Object.assign({}, t));
  const even = teams.length === 2 && teams[0].players === teams[1].players;
  const score = (t) => (even ? t.steps : t.average);
  const order = (a, b) => {
    if (score(a) !== score(b)) return score(b) - score(a);
    const la = a.lastFinishMs === null ? Infinity : a.lastFinishMs;
    const lb = b.lastFinishMs === null ? Infinity : b.lastFinishMs;
    return la === lb ? 0 : la - lb;
  };
  teams.sort((a, b) => order(a, b) || a.team.localeCompare(b.team));
  teams.forEach((t, i) => {
    t.place = i > 0 && order(teams[i - 1], t) === 0 ? teams[i - 1].place : i + 1;
  });
  return { teams, even };
}

export function stillRacing(st) {
  return st.entries.filter((e) => !e.finished && e.connected).length;
}

export function createResultsView(ctx) {
  const $ = (id) => document.getElementById(id);
  const ui = {
    kicker: $('mr-rr-kicker'),
    title: $('mr-rr-title'),
    msg: $('mr-rr-msg'),
    teams: $('mr-rr-teams'),
    list: $('mr-rr-list'),
    stats: $('mr-rr-stats'),
    lobby: $('mr-rr-lobby')
  };
  ui.lobby.addEventListener('click', () => ctx.onLobby());

  function headline(st, info, over) {
    const me = st.entries.find((e) => e.isMe);
    if (st.mode === 'teams') {
      const { teams } = teamRanking(st);
      const top = teams[0];
      const tie = teams.length > 1 && teams[1].place === 1;
      const mine = me && me.team;
      if (over) {
        if (!top) return 'Race over';
        if (tie) return 'It’s a tie!';
        return top.team === mine ? 'Your team won!' : 'Team ' + top.team + ' won!';
      }
      if (tie || !top) return 'You finished!';
      return top.team === mine ? 'You finished! Your team is ahead.' : 'You finished! Team ' + top.team + ' is ahead.';
    }
    if (!me) return over ? 'Race over' : 'Results';
    if (over) {
      if (!me.finished) return 'Race over';
      return me.place === 1 ? 'You won!' : 'You finished ' + ordinal(me.place) + '!';
    }
    return me.finished ? 'You finished! You’re ' + ordinal(me.place) + ' so far.' : 'Results so far';
  }

  function rowResult(e) {
    if (e.finished) return 'Finished' + (e.finishMs !== null ? ' in ' + formatMs(e.finishMs) : '');
    return e.connected ? 'Still racing' : 'Left the race';
  }

  function render(st, info) {
    const over = !!info.raceOver || stillRacing(st) === 0;
    const total = info.questionCount;
    ui.kicker.textContent = 'Room ' + info.code + ' · ' + mapLabel(info.map);
    const head = headline(st, info, over);
    if (ui.title.textContent !== head) ui.title.textContent = head;

    const left = stillRacing(st);
    ui.msg.textContent = info.closed
      ? 'The race room has closed. These are the last results we saw.'
      : over
        ? (st.mode === 'teams' ? 'Teams are ranked by correct answers added together.' : 'Ranked by finish order, then by correct answers.')
        : 'Waiting for ' + left + (left === 1 ? ' racer' : ' racers') + ' to finish. This list updates by itself.';

    /* team boxes */
    clear(ui.teams);
    ui.teams.hidden = st.mode !== 'teams';
    if (st.mode === 'teams') {
      const { teams, even } = teamRanking(st);
      const me = st.entries.find((e) => e.isMe);
      for (const t of teams) {
        const mine = me && me.team === t.team;
        ui.teams.appendChild(el('div', { class: 'mr-rr-team' + (t.place === 1 ? ' is-top' : '') + (mine ? ' is-mine' : ''), 'data-team': t.team },
          el('p', { class: 'mr-rr-team-place', text: ordinal(t.place) }),
          el('p', { class: 'mr-rr-team-name', text: 'Team ' + t.team + (mine ? ' (yours)' : '') }),
          el('p', { class: 'mr-rr-team-score', text: t.steps + ' correct' + (even ? '' : ' · ' + (Math.round(t.average * 10) / 10) + ' per player') })));
      }
      if (!even && teams.length === 2) ui.msg.textContent += ' The teams are uneven, so they are ranked by correct answers per player.';
      if (teams.length === 2 && teams[0].place !== teams[1].place && (even ? teams[0].steps === teams[1].steps : teams[0].average === teams[1].average)) {
        ui.msg.textContent += ' The teams scored the same, so the team that finished sooner ranks higher.';
      }
    }
    if (info.unsaved && !info.closed) ui.msg.textContent += ' Your result is still being saved because the connection is slow. Keep this page open.';

    /* everyone */
    clear(ui.list);
    for (const e of st.entries) {
      ui.list.appendChild(el('li', { class: 'mr-rr-row' + (e.isMe ? ' is-me' : '') + (e.finished ? ' is-done' : ''), 'data-team': e.team || null },
        el('span', { class: 'mr-rr-place', text: ordinal(e.place) }),
        el('span', { class: 'mr-rr-name' },
          el('span', { class: 'mr-spot-nametext', text: e.name }),
          e.isMe ? el('span', { class: 'mr-sp-you', text: 'You' }) : null,
          st.mode === 'teams' && e.team ? el('span', { class: 'mr-tag', text: 'Team ' + e.team }) : null),
        el('span', { class: 'mr-rr-steps', text: e.steps + '/' + total + ' correct' }),
        el('span', { class: 'mr-rr-result', text: rowResult(e) })));
    }

    /* this player's own numbers */
    clear(ui.stats);
    const s = info.summary;
    ui.stats.hidden = !s;
    if (s) {
      const stat = (label, value) => ui.stats.appendChild(el('div', { class: 'mr-stat' }, el('dt', { text: label }), el('dd', { text: value })));
      stat('Score', String(s.score));
      stat('First try', s.firstTry + '/' + s.total);
      stat('Time', formatMs(s.timeMs));
      stat('Best streak', String(s.bestStreak));
    }
    return { over, head };
  }

  return { render, ui };
}
