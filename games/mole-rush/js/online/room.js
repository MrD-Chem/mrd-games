/*
  Mole Rush online — the room screen (code, players, Start / Leave) and the countdown screen.
  Pure view: online.js decides what to show; this file only builds DOM (textContent only).

  createRoomView(ctx) -> { renderRoom(room, opts), setStarting(on), reset(), renderCountdown(room), setCount(remainingMs) }
    ctx.onStart()   host pressed Start race
    ctx.onLeave()   Leave
*/

import { el, clear, reducedMotion } from '../dom.js?v=20261022T1604';
import { mapLabel, modeLabel } from './lobby.js?v=20261022T1604';

export const MIN_PLAYERS = 2;

function playerTags(p) {
  return [
    p.isHost ? el('span', { class: 'mr-tag mr-tag-host', text: 'Host' }) : null,
    p.isMe ? el('span', { class: 'mr-sp-you', text: 'You' }) : null,
    !p.connected ? el('span', { class: 'mr-tag mr-tag-away', text: 'Away' }) : null
  ];
}

function spotRow(label, p) {
  if (!p) {
    return el('li', { class: 'mr-spot is-open' },
      el('span', { class: 'mr-spot-num', text: label }),
      el('span', { class: 'mr-spot-name', text: 'Open spot' }));
  }
  return el('li', { class: 'mr-spot' + (p.isMe ? ' is-me' : '') + (!p.connected ? ' is-away' : '') },
    el('span', { class: 'mr-spot-num', text: label }),
    el('span', { class: 'mr-spot-name' }, el('span', { class: 'mr-spot-nametext', text: p.name }), playerTags(p)));
}

export function connectedCount(room) {
  return room ? room.players.filter((p) => p.connected).length : 0;
}

export function createRoomView(ctx) {
  const $ = (id) => document.getElementById(id);
  const ui = {
    title: $('mr-room-title'),
    leave: $('mr-room-leave'),
    code: $('mr-room-code'),
    info: $('mr-room-info'),
    players: $('mr-room-players'),
    status: $('mr-room-status'),
    start: $('mr-room-start'),
    startHint: $('mr-room-start-hint'),
    cdKicker: $('mr-cd-kicker'),
    cdTitle: $('mr-cd-title'),
    cdNum: $('mr-cd-num'),
    cdNote: $('mr-cd-note'),
    cdRacers: $('mr-cd-racers')
  };
  let starting = false;
  let lastRoom = null;

  ui.start.addEventListener('click', () => {
    if (!starting && !ui.start.disabled) ctx.onStart();
  });
  ui.leave.addEventListener('click', () => ctx.onLeave());

  function renderPlayers(room) {
    clear(ui.players);
    if (room.mode === 'teams') {
      const grid = el('div', { class: 'mr-teams' });
      let n = 1;
      for (const team of ['A', 'B']) {
        const members = room.players.filter((p) => p.team === team);
        const list = el('ol', { class: 'mr-spots' });
        members.forEach((p) => list.appendChild(spotRow(String(n++), p)));
        for (let i = members.length; i < Math.ceil(room.maxPlayers / 2); i++) list.appendChild(spotRow(String(n++), null));
        grid.appendChild(el('section', { class: 'mr-team', 'data-team': team, 'aria-label': 'Team ' + team },
          el('h3', { class: 'mr-team-title', text: 'Team ' + team }), list));
      }
      ui.players.appendChild(grid);
      return;
    }
    const list = el('ol', { class: 'mr-spots' });
    const bySlot = new Map(room.players.map((p) => [p.slot, p]));
    ['s0', 's1', 's2', 's3'].slice(0, room.maxPlayers).forEach((slot, i) => list.appendChild(spotRow(String(i + 1), bySlot.get(slot) || null)));
    /* a player in a spot above maxPlayers can't exist (the rules refuse it), so nothing is lost */
    ui.players.appendChild(list);
  }

  function renderRoom(room, opts) {
    lastRoom = room;
    const o = opts || {};
    ui.code.textContent = room.code;
    ui.code.setAttribute('aria-label', 'Room code ' + room.code.split('').join(' '));
    ui.info.textContent = mapLabel(room.map) + ' · ' + modeLabel(room.mode) + ' · ' + room.questionCount + ' questions';
    renderPlayers(room);
    const ready = connectedCount(room);
    ui.start.hidden = !room.isHost;
    ui.startHint.hidden = !room.isHost;
    if (room.isHost) {
      ui.start.disabled = starting || ready < MIN_PLAYERS;
      const hint = ready < MIN_PLAYERS
        ? 'Waiting for at least one more player. Share the room code!'
        : ready + ' players are in. Start when everyone is ready.';
      /* a live region: only touch it when the words change, or a screen reader repeats it on every heartbeat */
      if (ui.startHint.textContent !== hint) ui.startHint.textContent = hint;
    }
    let status = '';
    if (o.conn === 'retrying') status = 'Reconnecting to the race server…';
    else if (!room.me) status = 'Getting your spot back…';
    else if (!room.isHost) status = room.hostConnected ? 'Waiting for ' + room.hostName + ' to start the race…' : room.hostName + ' (the host) seems to be offline. Waiting for them to come back…';
    if (ui.status.textContent !== status) ui.status.textContent = status;
  }

  /* A new room opens: forget the last one (its Start button state must not carry over). */
  function reset() {
    lastRoom = null;
    starting = false;
    ui.start.textContent = 'Start race';
    ui.start.hidden = true;
    ui.start.disabled = true;
    ui.startHint.hidden = true;
    clear(ui.players);
  }

  function setStarting(on) {
    starting = on;
    ui.start.textContent = on ? 'Starting…' : 'Start race';
    if (lastRoom) ui.start.disabled = on || connectedCount(lastRoom) < MIN_PLAYERS;
  }

  function renderCountdown(room) {
    ui.cdKicker.textContent = 'Room ' + room.code + ' · ' + mapLabel(room.map);
    clear(ui.cdRacers);
    for (const p of room.players) {
      ui.cdRacers.appendChild(el('li', { class: 'mr-cd-racer' + (p.isMe ? ' is-me' : ''), 'data-team': p.team || null },
        el('span', { class: 'mr-spot-nametext', text: p.name }),
        p.team ? el('span', { class: 'mr-tag', text: 'Team ' + p.team }) : null,
        p.isMe ? el('span', { class: 'mr-sp-you', text: 'You' }) : null));
    }
    ui.cdNote.textContent = 'Everyone gets the same ' + room.questionCount + ' questions. Each correct answer moves you up the standings.';
  }

  let shown = '';
  /* remainingMs until startAt (server time). Returns what is showing: 'ready' | '3' | '2' | '1' | 'GO' */
  function setCount(remainingMs) {
    let value;
    if (remainingMs > 3000) value = 'ready';
    else if (remainingMs > 0) value = String(Math.ceil(remainingMs / 1000));
    else value = 'GO';
    const secs = Math.max(1, Math.ceil(remainingMs / 1000));
    if (value === 'ready') {
      const t = 'Starting in ' + secs + '…';
      if (ui.cdTitle.textContent !== t) ui.cdTitle.textContent = t;
    }
    if (value === shown) return value;
    shown = value;
    ui.cdNum.classList.toggle('is-ready', value === 'ready');
    ui.cdNum.classList.toggle('is-go', value === 'GO');
    ui.cdNum.textContent = value === 'ready' ? 'Get ready' : value === 'GO' ? 'GO!' : value;
    if (value !== 'ready') ui.cdTitle.textContent = value === 'GO' ? 'Go!' : 'Get ready!';
    /* restart the pop animation (skipped when the student asks for less motion) */
    ui.cdNum.classList.remove('is-pop');
    if (!reducedMotion()) {
      void ui.cdNum.offsetWidth;
      ui.cdNum.classList.add('is-pop');
    }
    return value;
  }

  function resetCount() {
    shown = '';
  }

  return { renderRoom, setStarting, reset, renderCountdown, setCount, resetCount, ui };
}
