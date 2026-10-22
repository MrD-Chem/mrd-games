/*
  Mole Rush online — the flow: nickname → lobby → room → countdown → race → results.

  initOnline(app) -> { open(), test }
    app.show(screen, focusEl)              main.js screen switch
    app.openTitle()                        back to the title screen
    app.openPractice()                     Practice (map select)
    app.startRace(mapId, code, hooks)      start the normal map session for a race (main.js startMap)
                                           -> { ok, reason }
    app.stopRace()                         tear the game board down
    app.sidebar                            element next to the questions for the standings panel

  The race is the ordinary Map 1 session seeded with the room code, so every racer gets the
  same questions in the same order. Each correct answer is one step (rooms.reportStep).
  The countdown runs on server time: everyone sees GO at the room's startAt.
*/

import { announce } from '../dom.js?v=20261022T1604';
import { serverNow, clockInfo } from './firebase.js?v=20261022T1604';
import { watchRoom, leaveRoom, startRace, endRace, reportStep, reportFinish, standings, currentRoom, hostGone } from './rooms.js?v=20261022T1604';
import { createLobby } from './lobby.js?v=20261022T1604';
import { createRoomView } from './room.js?v=20261022T1604';
import { createResultsView } from './results.js?v=20261022T1604';
import { createStandings } from './standings.js?v=20261022T1604';
import { friendly, MSG } from './messages.js?v=20261022T1604';

const GO_HOLD_MS = 700; /* "GO!" stays up this long, then the first question appears (same for everyone) */
const KEEPER_MAX_MS = 25 * 60 * 1000;
const SYNC_RETRY_MS = 4000; /* how often a failed save of answers / the finish is tried again */
const LAG_NOTE_MS = 6000; /* answers not in the database this long -> tell the student (connection trouble) */

export function initOnline(app) {
  const $ = (id) => document.getElementById(id);
  const leaveBox = $('mr-leave-confirm');
  const leaveYes = $('mr-leave-yes');
  const leaveNo = $('mr-leave-no');
  const syncNote = $('mr-race-sync');

  const st = {
    phase: 'idle', /* idle nick lobby room countdown race results */
    code: null,
    room: null,
    conn: 'connecting',
    watch: null,
    timer: 0,
    startAt: null,
    session: null,
    sessionUnsub: null,
    ids: [],
    localSteps: 0,
    finished: false,
    finishMs: null,
    summary: null,
    endedEarly: false,
    closed: false,
    panel: null,
    keeper: null,
    hostTimer: 0,
    syncTimer: 0,
    lagTimer: 0,
    lagSince: 0,
    finishSaved: false,
    resultsShown: false,
    unsaved: false,
    announcedOver: false,
    lastCount: '',
    log: []
  };

  function log(type, data) {
    st.log.push({ at: Date.now(), server: Math.round(serverNow()), type, data: data === undefined ? null : data });
    if (st.log.length > 500) st.log.shift();
  }

  const lobby = createLobby({
    show: (screen, focusEl) => {
      st.phase = screen;
      app.show(screen, focusEl);
    },
    onEnterRoom: (code) => enterRoom(code),
    onBack: () => {
      st.phase = 'idle';
      app.openTitle();
    },
    onPractice: () => {
      st.phase = 'idle';
      app.openPractice();
    },
    log
  });
  const roomView = createRoomView({ onStart: hostStart, onLeave: () => leaveToLobby('') });
  const resultsView = createResultsView({ onLobby: () => backToLobbyFromResults() });

  /* ---------- Room lifecycle ---------- */

  function resetRace() {
    window.clearInterval(st.timer);
    st.timer = 0;
    st.startAt = null;
    if (st.sessionUnsub) st.sessionUnsub();
    st.sessionUnsub = null;
    st.session = null;
    st.localSteps = 0;
    st.finished = false;
    st.finishMs = null;
    st.summary = null;
    st.endedEarly = false;
    st.closed = false;
    st.resultsShown = false;
    st.announcedOver = false;
    st.lastCount = '';
    st.finishSaved = false;
    st.unsaved = false;
    st.lagSince = 0;
    window.clearInterval(st.hostTimer);
    window.clearTimeout(st.syncTimer);
    window.clearInterval(st.lagTimer);
    st.hostTimer = st.syncTimer = st.lagTimer = 0;
    if (st.panel) st.panel.destroy();
    st.panel = null;
    leaveBox.hidden = true;
    syncNote.hidden = true;
  }

  function closeWatch() {
    if (st.watch) st.watch.close();
    st.watch = null;
  }

  function enterRoom(code) {
    stopKeeper();
    closeWatch();
    resetRace();
    st.code = code;
    st.room = null;
    st.conn = 'connecting';
    st.phase = 'room';
    roomView.reset();
    roomView.ui.code.textContent = code;
    app.show('room', roomView.ui.title);
    log('enter-room', code);
    st.watch = watchRoom(code, onRoom, (s) => {
      st.conn = s.state;
      if (st.phase === 'room' && st.room) roomView.renderRoom(st.room, { conn: st.conn });
    });
    st.hostTimer = window.setInterval(checkHost, 5000);
  }

  /* A host who is gone for good (lid closed, network lost) never sends 'leave': after a couple of
     minutes of silence, the players in an open room go back to the lobby instead of waiting forever.
     (A host who closes the tab is noticed at once: rooms.js deletes the room as the page goes away.) */
  function checkHost() {
    const room = st.room;
    if (st.phase !== 'room' || !room || room.isHost || room.status !== 'open' || st.conn !== 'live') return;
    if (hostGone(room)) {
      log('host-gone', room.hostName);
      dropOut(MSG.hostLeft);
    }
  }

  function onRoom(room) {
    if (!room) {
      roomGone();
      return;
    }
    st.room = room;
    log('room', { status: room.status, n: room.players.length, me: room.me, startAt: room.startAt });
    const before = st.phase === 'room' || st.phase === 'countdown';

    if (!room.me && room.status !== 'open' && before) {
      /* the host started while this device looked disconnected */
      dropOut(MSG.droppedAtStart);
      return;
    }
    if (before) {
      if (room.status === 'open') {
        if (st.phase === 'countdown') showRoomScreen();
        roomView.renderRoom(room, { conn: st.conn });
      } else if (room.status === 'countdown' || room.status === 'racing') {
        /* keep the countdown up until GO has shown, even if the 'racing' flip lands first,
           so the first question appears at the same moment on every screen */
        const startAt = room.startAt !== null ? room.startAt : serverNow();
        if (serverNow() < startAt + GO_HOLD_MS) {
          if (st.phase !== 'countdown') beginCountdown(room);
          else roomView.renderCountdown(room);
        } else {
          st.startAt = startAt;
          goRace(room);
        }
      } else if (room.status === 'finished') {
        st.endedEarly = true;
        showResults();
      }
      return;
    }
    if (st.phase === 'race') {
      if (room.status === 'finished' && !st.finished) {
        /* the host's device ended the race (everyone else was done or gone) */
        st.endedEarly = true;
        endGame();
        showResults();
        return;
      }
      updatePanel();
    } else if (st.phase === 'results') {
      showResults();
    }
  }

  function roomGone() {
    log('room-gone', st.phase);
    if (st.phase === 'room' || st.phase === 'countdown') {
      closeWatch();
      resetRace();
      leaveRoom().catch(() => {});
      lobby.openLobby(MSG.hostLeft);
    } else if (st.phase === 'race') {
      st.closed = true;
      endGame();
      showResults();
    } else if (st.phase === 'results') {
      st.closed = true;
      showResults();
    }
  }

  function dropOut(text) {
    log('dropped', text);
    closeWatch();
    resetRace();
    leaveRoom().catch(() => {});
    lobby.openLobby(text);
  }

  function showRoomScreen() {
    window.clearInterval(st.timer);
    st.timer = 0;
    st.phase = 'room';
    app.show('room', roomView.ui.title);
  }

  function leaveToLobby(notice) {
    log('leave', st.phase);
    closeWatch();
    resetRace();
    leaveRoom().catch(() => {});
    lobby.openLobby(notice);
  }

  async function hostStart() {
    roomView.setStarting(true);
    try {
      const startAt = await startRace();
      log('host-start', { startAt, clock: clockInfo() });
      if (st.phase === 'room' && st.room) beginCountdown(Object.assign({}, st.room, { status: 'countdown', startAt }));
    } catch (err) {
      roomView.setStarting(false);
      const f = friendly(err);
      roomView.ui.status.textContent = f.kind === 'started' ? 'The race has already started.' : f.text;
      log('start-error', f.kind);
    }
  }

  /* ---------- Countdown (server time) ---------- */

  function beginCountdown(room) {
    st.phase = 'countdown';
    st.startAt = room.startAt !== null ? room.startAt : serverNow() + 3000;
    roomView.renderCountdown(room);
    roomView.resetCount();
    st.lastCount = '';
    app.show('countdown', roomView.ui.cdTitle);
    window.clearInterval(st.timer);
    const tick = () => {
      if (st.phase !== 'countdown') return;
      const rem = st.startAt - serverNow();
      const v = roomView.setCount(rem);
      if (v !== st.lastCount) {
        st.lastCount = v;
        log('count', { v, rem: Math.round(rem) });
        if (v === 'GO') announce('Go!');
        else if (v !== 'ready') announce(v);
      }
      if (rem <= -GO_HOLD_MS) goRace(st.room || room);
    };
    st.timer = window.setInterval(tick, 50);
    tick();
  }

  /* ---------- Race ---------- */

  function goRace(room) {
    window.clearInterval(st.timer);
    st.timer = 0;
    if (st.phase === 'race') return;
    st.phase = 'race';
    if (st.startAt === null) st.startAt = room.startAt !== null ? room.startAt : serverNow();
    if (st.panel) st.panel.destroy();
    st.panel = createStandings(app.sidebar, { questionCount: room.questionCount });
    const r = app.startRace(room.map, room.code, {
      quitLabel: 'Leave race',
      finishLabel: 'Finish race →',
      onQuit: askLeave,
      onSession: (session) => {
        st.session = session;
        st.ids = session.items.map((i) => i.id);
        st.sessionUnsub = session.onAnswer((correct, ms, detail) => {
          if (correct && detail && detail.done) onCorrect();
        });
      },
      onFinish: onGameFinish
    });
    if (!r || !r.ok) {
      log('race-error', r && r.reason);
      leaveToLobby('This race could not start on this device. ' + ((r && r.reason) || ''));
      return;
    }
    log('race-start', { ids: st.ids, at: Math.round(serverNow() - st.startAt) });
    st.unsaved = false;
    startLagWatch();
    updatePanel();
  }

  function onCorrect() {
    if (!st.session) return;
    st.localSteps = st.session.records.filter((r) => r.correct).length;
    updatePanel();
    syncNow();
  }

  /* Keep the database in step with this device: every correct answer is one step, and the finish
     is written once the last step is in. A failed save is simply tried again (every few seconds,
     when the network comes back, when the tab is shown again) until it works, the room is gone,
     or the rules refuse it for good. */
  function syncActive() {
    const cr = currentRoom();
    return (st.phase === 'race' || st.phase === 'results') && !!cr && cr.code === st.code;
  }

  function syncSoon(ms) {
    window.clearTimeout(st.syncTimer);
    st.syncTimer = window.setTimeout(syncNow, ms);
  }

  function syncNow() {
    window.clearTimeout(st.syncTimer);
    st.syncTimer = 0;
    if (!syncActive()) return;
    const code = st.code;
    reportStep(st.localSteps)
      .then((n) => {
        log('step', { want: st.localSteps, confirmed: n });
        if (st.finished && !st.finishSaved) {
          return reportFinish(st.finishMs).then(() => {
            if (st.code === code) {
              st.finishSaved = true;
              log('finish-saved', st.finishMs);
              checkLag();
            }
          });
        }
        return null;
      })
      .catch((err) => {
        const c = err && err.code;
        log('sync-error', c);
        if (c === 'denied' || c === 'notfound' || st.code !== code) return; /* final: not in the race any more, or the room is gone */
        syncSoon(SYNC_RETRY_MS);
      });
  }

  /* Tell the student when their answers have not reached the database for a while. */
  function checkLag() {
    const room = st.room;
    const own = room && room.players.find((p) => p.isMe);
    const behind = syncActive() && !!own && room.status !== 'finished' && (st.localSteps > own.steps || (st.finished && !st.finishSaved && !own.finished));
    if (behind) {
      if (!st.lagSince) st.lagSince = Date.now();
    } else {
      st.lagSince = 0;
    }
    const show = st.lagSince > 0 && Date.now() - st.lagSince >= LAG_NOTE_MS;
    const text = 'Connection trouble: keep going. Your answers count once the connection is back.';
    if (st.phase === 'race') {
      if (syncNote.hidden === show) syncNote.hidden = !show;
      if (show && syncNote.textContent !== text) syncNote.textContent = text;
    }
    if (st.phase === 'results' && st.unsaved !== show) {
      st.unsaved = show;
      showResults();
    }
  }

  function startLagWatch() {
    window.clearInterval(st.lagTimer);
    st.lagTimer = window.setInterval(checkLag, 2000);
  }

  window.addEventListener('online', () => syncNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow();
  });

  function mergedStandings() {
    const room = st.room;
    if (!room) return { mode: 'solo', entries: [], teams: [] };
    const now = serverNow();
    const players = room.players.map((p) => {
      if (!p.isMe) return p;
      const q = Object.assign({}, p);
      q.steps = Math.max(p.steps, Math.min(room.questionCount, st.localSteps));
      if (st.finished && !p.finished) {
        q.finished = true;
        q.finishMs = st.finishMs;
      }
      q.lastSeen = Math.max(p.lastSeen, now);
      return q;
    });
    return standings(Object.assign({}, room, { players }), now);
  }

  function updatePanel() {
    if (st.panel && st.room) st.panel.update(mergedStandings(), { questionCount: st.room.questionCount });
  }

  function askLeave() {
    leaveBox.hidden = false;
    leaveNo.focus();
  }
  leaveNo.addEventListener('click', () => {
    leaveBox.hidden = true;
    if (app.focusBoard) app.focusBoard();
  });
  leaveYes.addEventListener('click', () => {
    leaveBox.hidden = true;
    endGame();
    leaveToLobby('');
  });

  function endGame() {
    if (st.sessionUnsub) st.sessionUnsub();
    st.sessionUnsub = null;
    app.stopRace();
    st.session = null;
    if (st.panel) st.panel.destroy();
    st.panel = null;
    leaveBox.hidden = true;
    syncNote.hidden = true;
  }

  function onGameFinish(summary) {
    st.summary = summary;
    st.finished = true;
    st.localSteps = summary.items.filter((r) => r.correct).length;
    st.finishMs = Math.max(0, Math.min(3600000, Math.round(serverNow() - (st.startAt || serverNow()))));
    log('finish', { steps: st.localSteps, finishMs: st.finishMs });
    if (st.sessionUnsub) st.sessionUnsub();
    st.sessionUnsub = null;
    st.session = null;
    if (st.panel) st.panel.destroy();
    st.panel = null;
    syncNote.hidden = true;
    st.finishSaved = false;
    showResults();
    syncNow();
  }

  /* ---------- Results ---------- */

  function showResults() {
    const room = st.room;
    if (!room) return;
    const first = !st.resultsShown;
    st.phase = 'results';
    st.resultsShown = true;
    const out = resultsView.render(mergedStandings(), {
      code: room.code,
      map: room.map,
      questionCount: room.questionCount,
      raceOver: room.status === 'finished' || st.endedEarly || st.closed,
      summary: st.summary,
      closed: st.closed,
      unsaved: !!st.unsaved
    });
    if (first) {
      app.show('race-results', resultsView.ui.title);
      announce(out.head);
      log('results', out.head);
    } else if (out.over && !st.announcedOver) {
      st.announcedOver = true;
      announce(out.head);
    }
  }

  function backToLobbyFromResults() {
    const cr = currentRoom();
    const room = st.room;
    if (cr && cr.isHost && room && room.status === 'racing' && !st.closed) {
      /* the host's device closes the race once everyone is done, so keep it running quietly */
      closeWatch();
      resetRace();
      startKeeper(room.code);
      lobby.openLobby('');
      return;
    }
    leaveToLobby('');
  }

  function startKeeper(code) {
    stopKeeper();
    const keeper = { code, watch: null, timer: 0 };
    const done = () => {
      stopKeeper();
      const cr = currentRoom();
      if (cr && cr.code === code) leaveRoom().catch(() => {});
    };
    keeper.watch = watchRoom(code, (room) => {
      if (!room || room.status === 'finished') done();
    });
    keeper.timer = window.setTimeout(() => {
      const cr = currentRoom();
      if (cr && cr.code === code) endRace().catch(() => {}).then(done);
      else done();
    }, KEEPER_MAX_MS);
    st.keeper = keeper;
    log('keeper', code);
  }

  function stopKeeper() {
    const k = st.keeper;
    if (!k) return;
    st.keeper = null;
    window.clearTimeout(k.timer);
    if (k.watch) k.watch.close();
  }

  /* ---------- Entry ---------- */

  function open() {
    closeWatch();
    resetRace();
    lobby.openNick();
  }

  const test = Object.freeze({
    phase: () => st.phase,
    code: () => st.code,
    name: () => lobby.name(),
    list: () => lobby.list(),
    room: () => (st.room ? JSON.parse(JSON.stringify(st.room)) : null),
    standings: () => JSON.parse(JSON.stringify(mergedStandings())),
    questionIds: () => st.ids.slice(),
    localSteps: () => st.localSteps,
    log: () => JSON.parse(JSON.stringify(st.log)),
    clock: () => clockInfo(),
    serverNow: () => serverNow(),
    currentRoom: () => currentRoom(),
    keeper: () => (st.keeper ? st.keeper.code : null)
  });

  return { open, test };
}
