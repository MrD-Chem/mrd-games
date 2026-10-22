/*
  Mole Rush online — the nickname screen and the lobby (open races, join with a code, create).

  createLobby(ctx) -> { openNick(), openLobby(notice?), close(), name() }
    ctx.show(screen, focusEl)      switch screens (main.js)
    ctx.onEnterRoom(code)          a room was created or joined: go to the room screen
    ctx.onBack()                   back to the title screen
    ctx.onPractice()               "Practice" from the blocked-network message
    ctx.log(type, data)            test log (harmless)

  Only one live connection is open at a time: the open-races list is watched only while the
  lobby is showing (school networks and the database both limit connections per device).
*/

import { el, clear, announce } from '../dom.js?v=20261021T1624';
import { signIn } from './firebase.js?v=20261021T1624';
import { watchOpenRooms, createRoom, joinRoom, normalizeRoomCode } from './rooms.js?v=20261021T1624';
import { checkNickname, loadNickname, saveNickname } from './nickname.js?v=20261021T1624';
import { friendly } from './messages.js?v=20261021T1624';
import { getMap } from '../maps/index.js?v=20261021T1624';

export const QUESTION_COUNT = 10;

export function modeLabel(mode) {
  return mode === 'teams' ? 'Teams 2 v 2' : 'Solo';
}

export function mapLabel(id) {
  const m = getMap(id);
  return m ? 'Map ' + m.id + ' · ' + m.name : 'Map ' + id;
}

export function createLobby(ctx) {
  const $ = (id) => document.getElementById(id);
  const ui = {
    nickTitle: $('mr-nick-title'),
    nickBack: $('mr-nick-back'),
    nickForm: $('mr-nick-form'),
    nickInput: $('mr-nick-input'),
    nickError: $('mr-nick-error'),
    lobbyTitle: $('mr-lobby-title'),
    lobbyBack: $('mr-lobby-back'),
    lobbyName: $('mr-lobby-name'),
    rename: $('mr-lobby-rename'),
    alert: $('mr-lobby-alert'),
    alertText: $('mr-lobby-alert-text'),
    alertRetry: $('mr-lobby-retry'),
    alertPractice: $('mr-lobby-practice'),
    notice: $('mr-lobby-notice'),
    openState: $('mr-open-state'),
    openList: $('mr-open-list'),
    openEmpty: $('mr-open-empty'),
    openError: $('mr-open-error'),
    joinForm: $('mr-join-form'),
    joinInput: $('mr-join-input'),
    joinGo: $('mr-join-go'),
    joinError: $('mr-join-error'),
    createForm: $('mr-create-form'),
    createGo: $('mr-create-go'),
    createError: $('mr-create-error'),
    playersHint: $('mr-create-players-hint')
  };

  let name = loadNickname();
  let watch = null;
  let busy = false;
  let hadList = false;
  let lastList = [];
  let watchToken = 0;

  /* ---------- Nickname ---------- */

  function openNick() {
    close();
    ui.nickInput.value = name;
    setNickError('');
    ctx.show('nick', ui.nickInput);
    try {
      ui.nickInput.select();
    } catch (err) {
      /* fine */
    }
  }

  function setNickError(text) {
    ui.nickError.textContent = text;
    if (text) ui.nickInput.setAttribute('aria-invalid', 'true');
    else ui.nickInput.removeAttribute('aria-invalid');
  }

  ui.nickForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const c = checkNickname(ui.nickInput.value);
    if (!c.ok) {
      setNickError(c.error);
      ui.nickInput.focus();
      return;
    }
    name = c.name;
    ui.nickInput.value = name;
    saveNickname(name);
    openLobby();
  });
  ui.nickInput.addEventListener('input', () => {
    if (ui.nickError.textContent) setNickError('');
  });
  ui.nickBack.addEventListener('click', () => ctx.onBack());

  /* ---------- Lobby ---------- */

  function setAlert(text, showPractice) {
    ui.alert.hidden = !text;
    ui.alertText.textContent = text || '';
    ui.alertPractice.hidden = !showPractice;
  }

  function setNotice(text) {
    ui.notice.hidden = !text;
    ui.notice.textContent = text || '';
  }

  function setState(text, kind) {
    ui.openState.textContent = text;
    ui.openState.setAttribute('data-state', kind);
  }

  function setBusy(on, which) {
    busy = on;
    ui.joinGo.disabled = on;
    ui.createGo.disabled = on;
    ui.joinGo.textContent = on && which === 'join' ? 'Joining…' : 'Join';
    ui.createGo.textContent = on && which === 'create' ? 'Creating…' : 'Create race';
    for (const b of ui.openList.querySelectorAll('button')) b.disabled = on || b.getAttribute('data-full') === '1';
  }

  function openLobby(notice) {
    if (!name) {
      openNick();
      return;
    }
    ui.lobbyName.textContent = name;
    setNotice(notice || '');
    setAlert('');
    ui.openError.textContent = '';
    ui.joinError.textContent = '';
    ui.createError.textContent = '';
    setBusy(false);
    ctx.show('lobby', ui.lobbyTitle);
    if (notice) announce(notice);
    startWatch();
  }

  async function startWatch() {
    stopWatch();
    hadList = false;
    lastList = [];
    renderList([]);
    ui.openEmpty.hidden = true;
    setState('Connecting…', 'connecting');
    const token = watchToken;
    try {
      await signIn();
    } catch (err) {
      if (token === watchToken) showConnectError(err);
      return;
    }
    if (token !== watchToken || watch) return; /* the student already left the lobby */
    watch = watchOpenRooms(
      (list) => {
        hadList = true;
        lastList = list;
        setAlert('');
        setState('Live', 'live');
        renderList(list);
        ctx.log('lobby-list', list.map((r) => r.code));
      },
      (st) => {
        if (st.state === 'live') {
          setState('Live', 'live');
          setAlert('');
        } else if (st.state === 'retrying') {
          if (!hadList && st.error) showConnectError(st.error, true);
          else setState('Reconnecting…', 'retrying');
        }
      }
    );
  }

  function showConnectError(err, keepTrying) {
    const f = friendly(err);
    setState(keepTrying ? 'Trying again…' : 'Not connected', 'error');
    setAlert(f.text, f.kind === 'blocked' || f.kind === 'offline' || f.kind === 'busy');
    ctx.log('lobby-error', f.kind);
  }

  function stopWatch() {
    watchToken++;
    if (watch) watch.close();
    watch = null;
  }

  function close() {
    stopWatch();
  }

  function renderList(list) {
    clear(ui.openList);
    ui.openEmpty.hidden = !hadList || list.length > 0;
    for (const r of list) {
      const spots = r.players + '/' + r.maxPlayers + ' spots';
      const btn = el('button', {
        type: 'button',
        class: 'btn ' + (r.full ? 'btn-ghost' : 'btn-primary') + ' mr-open-join',
        'data-code': r.code,
        'data-full': r.full && !r.mine ? '1' : '0',
        'aria-label': (r.mine ? 'Open your race' : 'Join ' + r.hostName + '’s race') + ', ' + mapLabel(r.map) + ', ' + modeLabel(r.mode) + ', ' + r.players + ' of ' + r.maxPlayers + ' spots taken',
        text: r.mine ? 'Open' : r.full ? 'Full' : 'Join'
      });
      btn.disabled = busy || (r.full && !r.mine);
      btn.addEventListener('click', () => join(r.code, 'list'));
      ui.openList.appendChild(el('li', { class: 'mr-open-row' + (r.full ? ' is-full' : '') },
        el('div', { class: 'mr-open-main' },
          el('p', { class: 'mr-open-host' }, el('span', { class: 'mr-open-hostname', text: r.hostName }), r.mine ? el('span', { class: 'mr-sp-you', text: 'You' }) : null),
          el('p', { class: 'mr-open-meta', text: mapLabel(r.map) + ' · ' + modeLabel(r.mode) })),
        el('span', { class: 'mr-open-spots', text: spots }),
        btn));
    }
  }

  async function join(code, from) {
    if (busy) return;
    const errBox = from === 'list' ? ui.openError : ui.joinError;
    ui.openError.textContent = '';
    ui.joinError.textContent = '';
    setBusy(true, 'join');
    try {
      await joinRoom(code, name);
      ctx.log('joined', code);
      close();
      setBusy(false);
      ctx.onEnterRoom(code);
    } catch (err) {
      setBusy(false);
      const f = friendly(err);
      errBox.textContent = f.text;
      if (from !== 'list') ui.joinInput.focus();
      ctx.log('join-error', f.kind);
    }
  }

  ui.joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = normalizeRoomCode(ui.joinInput.value);
    if (!code) {
      ui.joinError.textContent = ui.joinInput.value.trim() ? 'Room codes are 4 to 8 letters and numbers, like K7RM.' : 'Type the room code first. The host can see it on their screen.';
      ui.joinInput.setAttribute('aria-invalid', 'true');
      ui.joinInput.focus();
      return;
    }
    ui.joinInput.removeAttribute('aria-invalid');
    ui.joinInput.value = code;
    join(code, 'code');
  });
  ui.joinInput.addEventListener('input', () => {
    if (ui.joinError.textContent) {
      ui.joinError.textContent = '';
      ui.joinInput.removeAttribute('aria-invalid');
    }
  });

  /* Teams races are always 2 v 2, so they need 4 spots. */
  function syncPlayers() {
    const teams = ui.createForm.querySelector('input[name="mr-mode"]:checked').value === 'teams';
    for (const r of ui.createForm.querySelectorAll('input[name="mr-players"]')) {
      r.disabled = teams && r.value !== '4';
      if (teams && r.value === '4') r.checked = true;
    }
    ui.playersHint.textContent = teams ? 'Teams races are 2 vs 2, so they always have 4 spots.' : 'The race can start once 2 players are in.';
  }
  for (const r of ui.createForm.querySelectorAll('input[name="mr-mode"]')) r.addEventListener('change', syncPlayers);
  syncPlayers();

  ui.createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const f = ui.createForm;
    const map = Number(f.querySelector('input[name="mr-map"]:checked').value) || 1;
    const mode = f.querySelector('input[name="mr-mode"]:checked').value === 'teams' ? 'teams' : 'solo';
    const maxPlayers = mode === 'teams' ? 4 : Number(f.querySelector('input[name="mr-players"]:checked').value) || 4;
    ui.createError.textContent = '';
    setBusy(true, 'create');
    try {
      const code = await createRoom({ name, map, mode, maxPlayers, questionCount: QUESTION_COUNT });
      ctx.log('created', code);
      close();
      setBusy(false);
      ctx.onEnterRoom(code);
    } catch (err) {
      setBusy(false);
      ui.createError.textContent = friendly(err).text;
      ctx.log('create-error', friendly(err).kind);
    }
  });

  ui.lobbyBack.addEventListener('click', () => ctx.onBack());
  ui.rename.addEventListener('click', () => openNick());
  ui.alertRetry.addEventListener('click', () => openLobby());
  ui.alertPractice.addEventListener('click', () => ctx.onPractice());

  return {
    openNick,
    openLobby,
    close,
    name: () => name,
    list: () => lastList.slice()
  };
}
