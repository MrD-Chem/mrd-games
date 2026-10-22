/*
  Mole Rush online — race rooms on top of firebase.js.

  Data (must match the published Realtime Database rules exactly):
    rooms/{CODE}   CODE = 4–8 of A–Z 0–9
      hostUid, hostName (1–16), map (1–4), mode 'solo'|'teams', seed (1–16 chars),
      maxPlayers (2–4), questionCount (5–20), status 'open'|'countdown'|'racing'|'finished',
      createdAt (server time, fixed), startAt (ms, optional),
      slots/s0..s3: { uid, name (1–16), team 'A'|'B' (teams only), steps (+1 at a time, only
                      while 'racing'), finished, finishMs, joinedAt (fixed), lastSeen }
    The host owns the room and slot s0. Everyone else owns only the slot they claimed.

  Functions (all async ones reject with an OnlineError from firebase.js: err.code is one of
  'offline' 'timeout' 'blocked' 'denied' 'full' 'started' 'notfound' 'server', and
  err.message is a plain sentence that is safe to show a student):

    createRoom({ name, map, mode, maxPlayers, questionCount }) -> Promise<code>
        Signs in, picks a random readable code (4 letters/digits, 5 after a few collisions, no
        vowels so no words), writes the room with the host in slot s0 (team A in teams mode) and
        a fresh question seed like 'ATOM-52'. Retries on a code collision. Starts the heartbeat.
    joinRoom(code, name) -> Promise<slot>    ('s1'..'s3'; 's0' if you are the host)
        Claims the first free slot. A slot someone else holds is refused by the rules, so a refusal
        just moves on to the next slot (that is how two players racing for the last spot are
        settled: one wins, the other gets 'full'). In teams mode the new player goes on the smaller
        team. If this player is already in the room (reload, lost reply) it resumes that slot,
        even mid-race. Errors: 'notfound', 'full', 'started'.
    leaveRoom() -> Promise<void>
        Stops the heartbeat. Before the race: the host deletes the room; a player deletes their
        slot. Once racing, slots stay so the standings still make sense.
    watchOpenRooms(onList, onState?) -> { close() }
        Live lobby list. onList([{ code, hostName, map, mode, maxPlayers, questionCount,
        players, full, createdAt, mine }]) newest first (mine: this player is the host). Hides rooms older than 2 hours and rooms whose
        host has gone quiet (no heartbeat for 45 s), and quietly deletes rooms older than 3 hours.
    watchRoom(code, onRoom, onState?) -> { close() }
        Live room. onRoom(room | null) with a cleaned-up room (see normalizeRoom below), or null
        once the room is gone. Re-sent when someone's connected/disconnected state changes.
        onState({ state: 'connecting'|'live'|'retrying', error }) reports the connection.
    startRace() -> Promise<startAt>   (host only)
        Removes players who have disconnected, evens out the teams, sets status 'countdown' and
        startAt = serverNow() + 8000, then flips status to 'racing' at startAt (also after a
        host reload). When every connected player has finished, the host marks it 'finished'.
    endRace() -> Promise<void>        (host only) status 'finished' now.
    reportStep(steps) -> Promise<confirmed steps>
        Raises this player's step count to `steps`, one +1 write at a time as the rules require.
        Writes that arrive a moment before the host's 'racing' flip are retried automatically.
    reportFinish(ms) -> Promise<void>  finished: true, finishMs: ms (after pending steps land).
    standings(room, now?) -> { mode, entries, teams }
        entries: players sorted (finished first by finishMs, then most steps, then who joined
        first) with place, connected, isMe. teams (teams mode): [{ team, players, steps, average,
        finished, done, lastFinishMs, place }] ranked by average steps per player, then by who
        finished sooner.
    isConnected(player, now?) -> lastSeen is no older than 45 s (server time).
    currentRoom() -> { code, slot, isHost } | null
    normalizeRoomCode(text) -> 'K7RM' | null        cleanName(text) -> 'Ana' | null

  Heartbeat: lastSeen is refreshed every 15 s (and when the tab becomes visible again). Each
  heartbeat also re-measures the server clock offset used by serverNow().

  Leaving without pressing Leave: when the tab closes or reloads ('pagehide'), a keepalive request
  removes the host's room (open or countdown) or a player's spot, so the others hear 'host left' at
  once. If that never gets sent (lid closed, network lost), hostGone(room) turns true once an open
  room's host has been silent for HOST_GONE_MS (2 minutes); the room screen then sends the players
  back to the lobby, and joinRoom() refuses such a room ('notfound').

  Names: every name read from the database goes through nickname.js displayName(): a name that
  does not follow the nickname rules (a modified page can write anything) shows as 'Racer'.
*/

import { signIn, currentUid, get, put, patch, del, sendOnExit, watchValue, serverNow, clockInfo, syncClock, TIMESTAMP, OnlineError, isOnlineError } from './firebase.js?v=20261022T1625';
import { randomCode } from '../rng.js?v=20261022T1625';
import { displayName } from './nickname.js?v=20261022T1625';

export const HEARTBEAT_MS = 15000;
export const DISCONNECT_MS = 45000;
export const HOST_GONE_MS = 120000; /* an open room whose host has been silent this long is treated as closed */
export const COUNTDOWN_MS = 8000;
export const OPEN_ROOM_MAX_AGE_MS = 2 * 60 * 60 * 1000;
export const ROOM_EXPIRE_MS = 3 * 60 * 60 * 1000;
export const LIMITS = Object.freeze({ map: [1, 4], maxPlayers: [2, 4], questionCount: [5, 20], name: [1, 16] });

const SLOT_KEYS = ['s0', 's1', 's2', 's3'];
const STATUSES = ['open', 'countdown', 'racing', 'finished'];
const CODE_CHARS = 'CDFGHJKMNPQRTVWXY234679'; /* no vowels (no words), no 0/O 1/I/L 5/S 8/B */

/* ---------------- Small helpers ---------------- */

const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));

function clampInt(v, lo, hi, fallback) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

function randomInts(n) {
  const out = new Uint32Array(n);
  try {
    window.crypto.getRandomValues(out);
  } catch (err) {
    for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 4294967296);
  }
  return out;
}

function randomRoomCode(len) {
  return Array.from(randomInts(len), (r) => CODE_CHARS[r % CODE_CHARS.length]).join('');
}

/* What students type: case, spaces and dashes don't matter. */
export function normalizeRoomCode(text) {
  if (typeof text !== 'string') return null;
  const c = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{4,8}$/.test(c) ? c : null;
}

/* A nickname the rules accept: 1–16 characters, no control or direction-override characters. */
export function cleanName(text) {
  if (typeof text !== 'string') return null;
  let s = text.normalize ? text.normalize('NFC') : text;
  s = s.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '').replace(/\s+/g, ' ').trim();
  if (s.length > 16) {
    s = s.slice(0, 16);
    if (/[\ud800-\udbff]$/.test(s)) s = s.slice(0, 15); /* don't cut an emoji in half */
    s = s.trim();
  }
  return s.length >= 1 ? s : null;
}

function roomPath(code) {
  return 'rooms/' + code;
}

function slotPath(code, slot) {
  return 'rooms/' + code + '/slots/' + slot;
}

function slotKeysFor(maxPlayers) {
  return SLOT_KEYS.slice(0, clampInt(maxPlayers, 2, 4, 4));
}

function newSlot(uid, name, team) {
  const s = { uid, name, steps: 0, finished: false, joinedAt: TIMESTAMP, lastSeen: TIMESTAMP };
  if (team) s.team = team;
  return s;
}

export function isConnected(player, now) {
  const t = Number.isFinite(now) ? now : serverNow();
  return !!player && Number.isFinite(player.lastSeen) && t - player.lastSeen <= DISCONNECT_MS;
}

/* True when an open room's host has gone quiet for good (closed the lid, lost the network, left the
   page without a chance to clean up). Not used for rooms already racing. */
export function hostGone(room, now) {
  if (!room || room.status !== 'open' || clockInfo().error > 30000) return false;
  const t = Number.isFinite(now) ? now : serverNow();
  const host = room.players.find((p) => p.slot === 's0' && p.isHost);
  return !host || t - host.lastSeen > HOST_GONE_MS;
}

/*
  normalizeRoom(code, raw, uid) -> a checked copy of a room, or null.
  { code, hostUid, hostName, map, mode, seed, maxPlayers, questionCount, status, createdAt,
    startAt (or null), isHost, me (my slot or null), hostConnected,
    players: [{ slot, uid, name, team, steps, finished, finishMs, joinedAt, lastSeen,
                connected, isHost, isMe }] in slot order }
  Everything from the database is someone's input, so every field is type-checked here.
*/
export function normalizeRoom(code, raw, uid, now) {
  if (!raw || typeof raw !== 'object') return null;
  const t = Number.isFinite(now) ? now : serverNow();
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  const questionCount = clampInt(raw.questionCount, 5, 20, 10);
  const maxPlayers = clampInt(raw.maxPlayers, 2, 4, 4);
  const hostUid = str(raw.hostUid, 128);
  const slots = raw.slots && typeof raw.slots === 'object' ? raw.slots : {};
  const players = [];
  for (const key of SLOT_KEYS) {
    const s = slots[key];
    if (!s || typeof s !== 'object' || typeof s.uid !== 'string') continue;
    const p = {
      slot: key,
      uid: s.uid,
      name: displayName(s.name),
      team: s.team === 'A' || s.team === 'B' ? s.team : null,
      steps: clampInt(s.steps, 0, questionCount, 0),
      finished: s.finished === true,
      finishMs: Number.isFinite(s.finishMs) ? s.finishMs : null,
      joinedAt: Number.isFinite(s.joinedAt) ? s.joinedAt : 0,
      lastSeen: Number.isFinite(s.lastSeen) ? s.lastSeen : 0,
      isHost: s.uid === hostUid,
      isMe: !!uid && s.uid === uid
    };
    p.connected = isConnected(p, t);
    players.push(p);
  }
  const me = players.find((p) => p.isMe);
  const host = players.find((p) => p.slot === 's0' && p.isHost);
  return {
    code,
    hostUid,
    hostName: displayName(raw.hostName),
    map: clampInt(raw.map, 1, 4, 1),
    mode: raw.mode === 'teams' ? 'teams' : 'solo',
    seed: str(raw.seed, 16),
    maxPlayers,
    questionCount,
    status: STATUSES.includes(raw.status) ? raw.status : 'open',
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : 0,
    startAt: Number.isFinite(raw.startAt) ? raw.startAt : null,
    isHost: !!uid && hostUid === uid,
    me: me ? me.slot : null,
    hostConnected: !!host && host.connected,
    players
  };
}

/* ---------------- Standings ---------------- */

function playerOrder(a, b) {
  if (a.finished !== b.finished) return a.finished ? -1 : 1;
  if (a.finished && b.finished) {
    const fa = a.finishMs === null ? Infinity : a.finishMs;
    const fb = b.finishMs === null ? Infinity : b.finishMs;
    if (fa !== fb) return fa - fb;
  }
  if (a.steps !== b.steps) return b.steps - a.steps;
  return 0;
}

export function standings(room, now) {
  if (!room) return { mode: 'solo', entries: [], teams: [] };
  const t = Number.isFinite(now) ? now : serverNow();
  const entries = room.players
    .map((p) => ({ slot: p.slot, uid: p.uid, name: p.name, team: p.team, steps: p.steps, finished: p.finished, finishMs: p.finishMs, joinedAt: p.joinedAt, connected: isConnected(p, t), isHost: p.isHost, isMe: p.isMe }))
    .sort((a, b) => playerOrder(a, b) || a.joinedAt - b.joinedAt || a.slot.localeCompare(b.slot));
  /* equal results share a place (1, 2, 2, 4) */
  entries.forEach((e, i) => {
    e.place = i > 0 && playerOrder(entries[i - 1], e) === 0 ? entries[i - 1].place : i + 1;
  });
  if (room.mode !== 'teams') return { mode: 'solo', entries, teams: [] };

  const teams = ['A', 'B'].map((team) => {
    const members = entries.filter((e) => e.team === team);
    const steps = members.reduce((n, e) => n + e.steps, 0);
    const finishers = members.filter((e) => e.finished);
    return {
      team,
      players: members.length,
      steps,
      average: members.length ? steps / members.length : 0,
      finished: finishers.length,
      done: members.length > 0 && finishers.length === members.length,
      lastFinishMs: finishers.length === members.length && members.length ? Math.max(...finishers.map((e) => (e.finishMs === null ? Infinity : e.finishMs))) : null
    };
  });
  const teamOrder = (a, b) => {
    if (!a.players !== !b.players) return a.players ? -1 : 1;
    if (a.average !== b.average) return b.average - a.average;
    const la = a.lastFinishMs === null ? Infinity : a.lastFinishMs;
    const lb = b.lastFinishMs === null ? Infinity : b.lastFinishMs;
    return la === lb ? 0 : la - lb;
  };
  teams.sort((a, b) => teamOrder(a, b) || a.team.localeCompare(b.team));
  teams.forEach((tm, i) => {
    tm.place = i > 0 && teamOrder(teams[i - 1], tm) === 0 ? teams[i - 1].place : i + 1;
  });
  return { mode: 'teams', entries, teams };
}

/* Teams for the players who are staying: keep everyone's team unless the sides are uneven. */
function balanceTeams(players) {
  const out = new Map(players.map((p) => [p.slot, p.team]));
  const count = (t) => [...out.values()].filter((x) => x === t).length;
  for (const p of players) {
    if (!out.get(p.slot)) out.set(p.slot, count('A') <= count('B') ? 'A' : 'B');
  }
  /* move the most recent joiners from the bigger side until the sides differ by at most one */
  const byNewest = players.slice().sort((a, b) => b.joinedAt - a.joinedAt);
  while (Math.abs(count('A') - count('B')) > 1) {
    const big = count('A') > count('B') ? 'A' : 'B';
    const mover = byNewest.find((p) => out.get(p.slot) === big && p.slot !== 's0');
    if (!mover) break;
    out.set(mover.slot, big === 'A' ? 'B' : 'A');
  }
  return out;
}

/* ---------------- The room this player is in ---------------- */

let session = null;

export function currentRoom() {
  return session ? { code: session.code, slot: session.slot, isHost: session.isHost } : null;
}

function requireSession() {
  if (!session) throw new OnlineError('notfound', 'You are not in a race room.');
  return session;
}

function startSession(code, slot, isHost, name, raw) {
  stopSession();
  const s = {
    code,
    slot,
    isHost,
    name,
    room: raw ? normalizeRoom(code, raw, currentUid()) : null,
    stepConfirmed: 0,
    stepTarget: 0,
    stepRunner: null,
    flipTimer: 0,
    flipping: false,
    finishing: false,
    lastRejoin: 0,
    beatTimer: 0,
    watch: null,
    onVisible: null,
    onHide: null
  };
  const me = s.room && s.room.players.find((p) => p.slot === slot);
  if (me) s.stepConfirmed = s.stepTarget = me.steps;
  session = s;
  s.watch = watchValue(roomPath(code), null, (value) => onSessionValue(s, value));
  s.beatTimer = window.setInterval(() => heartbeat(s), HEARTBEAT_MS);
  s.onVisible = () => {
    if (document.visibilityState === 'visible') heartbeat(s);
  };
  document.addEventListener('visibilitychange', s.onVisible);
  s.onHide = (e) => leaveOnExit(s, e);
  window.addEventListener('pagehide', s.onHide);
  heartbeat(s); /* also measures the clock on a warmed-up connection */
}

/* The tab is closing or reloading: free the spot so nobody waits for someone who is gone. The host
   removes the whole room, a player removes their own spot (only before the race: once it is running
   the spots stay so the results make sense). A page that is only being frozen for the back/forward
   cache (e.persisted) comes back later, so it keeps its place. */
function leaveOnExit(s, e) {
  if (session !== s || (e && e.persisted)) return;
  const status = s.room ? s.room.status : 'open';
  if (status !== 'open' && status !== 'countdown') return;
  sendOnExit('DELETE', s.isHost ? roomPath(s.code) : slotPath(s.code, s.slot));
}

function stopSession() {
  const s = session;
  if (!s) return;
  session = null;
  window.clearInterval(s.beatTimer);
  window.clearTimeout(s.flipTimer);
  document.removeEventListener('visibilitychange', s.onVisible);
  window.removeEventListener('pagehide', s.onHide);
  if (s.watch) s.watch.close();
}

async function heartbeat(s) {
  if (session !== s) return;
  /* never stack heartbeats: the database host allows only a few connections per device, and a
     stalled network would otherwise pile up requests behind each other */
  if (!s.beating) {
    s.beating = true;
    try {
      await patch(slotPath(s.code, s.slot), { lastSeen: TIMESTAMP });
    } catch (err) {
      /* a refused heartbeat means our slot is gone; onSessionValue decides what to do */
    } finally {
      s.beating = false;
    }
  }
  if (session === s && s.room) hostDuties(s);
}

function onSessionValue(s, value) {
  if (session !== s) return;
  if (!value) {
    /* the room was deleted (host left, or it expired) */
    stopSession();
    return;
  }
  s.room = normalizeRoom(s.code, value, currentUid());
  const me = s.room.players.find((p) => p.slot === s.slot && p.isMe);
  if (me) {
    if (me.steps > s.stepConfirmed) s.stepConfirmed = me.steps;
    if (s.stepTarget < s.stepConfirmed) s.stepTarget = s.stepConfirmed;
  } else if (!s.isHost && s.room.status === 'open' && Date.now() - s.lastRejoin > 10000) {
    /* our spot was cleared (this device slept and looked disconnected): take a spot again */
    s.lastRejoin = Date.now();
    joinRoom(s.code, s.name).catch(() => {});
  }
  hostDuties(s);
}

/* Things only the host's device does. Called on every room change and every heartbeat. */
function hostDuties(s) {
  const room = s.room;
  if (!s.isHost || !room || session !== s) return;
  const now = serverNow();
  if (room.status === 'open') {
    /* free the spots of players who closed the tab without leaving */
    if (clockInfo().error > 5000) return;
    const stale = room.players.filter((p) => p.slot !== 's0' && !isConnected(p, now) && now - p.joinedAt > DISCONNECT_MS);
    if (stale.length) {
      const update = {};
      stale.forEach((p) => {
        update['slots/' + p.slot] = null;
      });
      patch(roomPath(s.code), update).catch(() => {});
    }
  } else if (room.status === 'countdown' && room.startAt !== null) {
    scheduleFlip(s, room.startAt);
  } else if (room.status === 'racing' && !s.finishing) {
    const active = room.players.filter((p) => p.finished || isConnected(p, now));
    if (active.length && active.every((p) => p.finished)) {
      s.finishing = true;
      patch(roomPath(s.code), { status: 'finished' }).catch(() => {
        s.finishing = false;
      });
    }
  }
}

function scheduleFlip(s, startAt) {
  if (s.flipping) return;
  window.clearTimeout(s.flipTimer);
  s.flipTimer = window.setTimeout(async () => {
    if (session !== s || s.flipping || !s.room || s.room.status !== 'countdown') return;
    s.flipping = true;
    for (let i = 0; i < 4 && session === s; i++) {
      try {
        await patch(roomPath(s.code), { status: 'racing' });
        break;
      } catch (err) {
        await sleep(700 * (i + 1));
      }
    }
    s.flipping = false;
  }, Math.max(0, startAt - serverNow()));
}

/* ---------------- Public API ---------------- */

export async function createRoom(opts) {
  const o = opts || {};
  const name = cleanName(o.name);
  if (!name) throw new OnlineError('denied', 'Type a nickname first (1 to 16 characters).');
  const mode = o.mode === 'teams' ? 'teams' : 'solo';
  const settings = {
    map: clampInt(o.map, 1, 4, 1),
    mode,
    maxPlayers: clampInt(o.maxPlayers, 2, 4, 4),
    questionCount: clampInt(o.questionCount, 5, 20, 10)
  };
  const { uid } = await signIn();
  if (session) await leaveRoom().catch(() => {});
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomRoomCode(attempt < 5 ? 4 : 5);
    const seed = randomCode().slice(0, 16);
    const room = Object.assign({ hostUid: uid, hostName: name, seed, status: 'open', createdAt: TIMESTAMP }, settings, {
      slots: { s0: newSlot(uid, name, mode === 'teams' ? 'A' : null) }
    });
    try {
      const saved = await put(roomPath(code), room);
      startSession(code, 's0', true, name, saved);
      return code;
    } catch (err) {
      if (!isOnlineError(err, 'denied')) throw err;
      /* refused: the code is taken — unless our own write landed and only the reply was lost */
      try {
        const existing = await get(roomPath(code));
        if (existing && existing.hostUid === uid && existing.seed === seed) {
          startSession(code, 's0', true, name, existing);
          return code;
        }
      } catch (e) {
        /* fall through to the next code */
      }
    }
  }
  throw new OnlineError('server', 'Could not find a free room code. Please try again.');
}

export async function joinRoom(codeText, nameText) {
  const code = normalizeRoomCode(codeText);
  if (!code) throw new OnlineError('notfound', 'Room codes are 4 to 8 letters and numbers.');
  const name = cleanName(nameText);
  if (!name) throw new OnlineError('denied', 'Type a nickname first (1 to 16 characters).');
  const { uid } = await signIn();
  if (session && session.code !== code) await leaveRoom().catch(() => {});

  for (let round = 0; round < 4; round++) {
    const raw = await get(roomPath(code));
    if (!raw || typeof raw !== 'object') {
      if (session && session.code === code) stopSession();
      throw new OnlineError('notfound');
    }
    const room = normalizeRoom(code, raw, uid);
    const mine = room.players.find((p) => p.isMe);
    if (mine) {
      /* already here (reload, or our earlier write landed): carry on in the same spot */
      const isHost = mine.slot === 's0' && room.isHost;
      if (!session || session.code !== code || session.slot !== mine.slot) startSession(code, mine.slot, isHost, name, raw);
      return mine.slot;
    }
    if (room.status !== 'open') throw new OnlineError('started');
    if (hostGone(room)) throw new OnlineError('notfound'); /* a typed code for a room nobody is hosting any more */
    const taken = new Set(room.players.map((p) => p.slot));
    const free = slotKeysFor(room.maxPlayers).filter((k) => k !== 's0' && !taken.has(k));
    if (!free.length) throw new OnlineError('full');
    const team = room.mode === 'teams' ? (room.players.filter((p) => p.team === 'A').length <= room.players.filter((p) => p.team === 'B').length ? 'A' : 'B') : null;
    for (const k of free) {
      try {
        const saved = await put(slotPath(code, k), newSlot(uid, name, team));
        startSession(code, k, false, name, Object.assign({}, raw, { slots: Object.assign({}, raw.slots, { [k]: saved }) }));
        return k;
      } catch (err) {
        if (!isOnlineError(err, 'denied')) throw err;
        /* someone else got this spot first (or the race just started): try the next one */
      }
    }
    /* every spot we tried was refused: look again to find out why */
  }
  throw new OnlineError('full');
}

export async function leaveRoom() {
  const s = session;
  if (!s) return;
  const status = s.room ? s.room.status : 'open';
  stopSession();
  try {
    if (s.isHost && (status === 'open' || status === 'countdown')) await del(roomPath(s.code));
    else if (!s.isHost && (status === 'open' || status === 'countdown')) await del(slotPath(s.code, s.slot));
  } catch (err) {
    if (!isOnlineError(err, 'denied') && !isOnlineError(err, 'notfound')) throw err;
  }
}

export async function startRace() {
  const s = requireSession();
  if (!s.isHost) throw new OnlineError('denied', 'Only the host can start the race.');
  const raw = await get(roomPath(s.code));
  const room = normalizeRoom(s.code, raw, currentUid());
  if (!room) throw new OnlineError('notfound');
  if (room.status !== 'open') throw new OnlineError('started');
  if (clockInfo().error > 1000) await syncClock(slotPath(s.code, 's0') + '/lastSeen', 2);
  const now = serverNow();
  const update = { status: 'countdown', startAt: Math.round(now + COUNTDOWN_MS) };
  const staying = [];
  for (const p of room.players) {
    if (p.slot !== 's0' && !isConnected(p, now)) update['slots/' + p.slot] = null;
    else staying.push(p);
  }
  if (staying.length < 2) throw new OnlineError('denied', 'Wait for at least one more player to join the race.');
  if (room.mode === 'teams') {
    balanceTeams(staying).forEach((team, slot) => {
      const p = staying.find((x) => x.slot === slot);
      if (p && p.team !== team) update['slots/' + slot + '/team'] = team;
    });
  }
  await patch(roomPath(s.code), update);
  if (session === s) {
    s.room = Object.assign({}, s.room || room, { status: 'countdown', startAt: update.startAt });
    scheduleFlip(s, update.startAt);
  }
  return update.startAt;
}

export async function endRace() {
  const s = requireSession();
  if (!s.isHost) throw new OnlineError('denied', 'Only the host can end the race.');
  await patch(roomPath(s.code), { status: 'finished' });
}

async function runSteps(s) {
  let refusals = 0;
  let failures = 0;
  while (session === s && s.stepConfirmed < s.stepTarget) {
    const next = s.stepConfirmed + 1;
    try {
      await patch(slotPath(s.code, s.slot), { steps: next, lastSeen: TIMESTAMP });
      s.stepConfirmed = Math.max(s.stepConfirmed, next);
      refusals = 0;
      failures = 0;
    } catch (err) {
      if (!isOnlineError(err)) throw err;
      if (err.code !== 'denied') {
        /* network trouble: keep the step and try again, waiting a bit longer each time */
        failures++;
        if (failures > 12) throw err;
        await sleep(Math.min(8000, 600 * failures));
        continue;
      }
      /* refused: the host's 'racing' flip may not have landed yet, or our count is behind */
      refusals++;
      const room = normalizeRoom(s.code, await get(roomPath(s.code)).catch(() => null), currentUid());
      if (!room) throw new OnlineError('notfound');
      const me = room.players.find((p) => p.slot === s.slot && p.isMe);
      if (!me) throw new OnlineError('denied', 'You are no longer in this race.');
      if (me.steps > s.stepConfirmed) s.stepConfirmed = me.steps;
      if (room.status === 'finished') {
        /* too late: the race is over, so the count stays where it is */
        s.stepTarget = s.stepConfirmed;
        break;
      }
      s.stepTarget = Math.min(s.stepTarget, room.questionCount);
      if (refusals > 40) throw err;
      if (room.status !== 'racing') await sleep(500);
    }
  }
  return s.stepConfirmed;
}

export function reportStep(steps) {
  let s;
  try {
    s = requireSession();
  } catch (err) {
    return Promise.reject(err);
  }
  const cap = s.room ? s.room.questionCount : 20;
  s.stepTarget = Math.max(s.stepTarget, Math.min(cap, Math.floor(Number(steps) || 0)));
  if (!s.stepRunner) {
    s.stepRunner = runSteps(s).finally(() => {
      s.stepRunner = null;
    });
  }
  return s.stepRunner;
}

export async function reportFinish(ms) {
  const s = requireSession();
  if (s.stepRunner) await s.stepRunner.catch(() => {});
  const finishMs = clampInt(ms, 0, 3600000, 0);
  await patch(slotPath(s.code, s.slot), { finished: true, finishMs, lastSeen: TIMESTAMP });
}

/* ---------------- Watching ---------------- */

export function watchRoom(codeText, onRoom, onState) {
  const code = normalizeRoomCode(codeText);
  if (!code) throw new OnlineError('notfound', 'Room codes are 4 to 8 letters and numbers.');
  let raw;
  let seen = false;
  let lastKey = '';
  let closed = false;
  const emit = (force) => {
    if (closed || !seen) return;
    const room = normalizeRoom(code, raw, currentUid());
    const key = room ? room.players.map((p) => p.slot + (p.connected ? '+' : '-')).join(',') : 'gone';
    if (!force && key === lastKey) return;
    lastKey = key;
    onRoom(room);
  };
  const w = watchValue(roomPath(code), null, (value) => {
    raw = value;
    seen = true;
    emit(true);
  }, onState && ((ev) => onState({ state: ev.state, error: ev.error })));
  /* connected/disconnected changes with time even when nothing is written */
  const tick = window.setInterval(() => emit(false), 5000);
  return {
    close() {
      closed = true;
      window.clearInterval(tick);
      w.close();
    }
  };
}

const sweptCodes = new Set();
let lastSweep = 0;

/* Delete rooms older than 3 hours (the rules allow anyone to). Best effort, never throws. */
async function sweepExpiredRooms() {
  if (Date.now() - lastSweep < 5 * 60 * 1000 || clockInfo().error > 60000) return;
  lastSweep = Date.now();
  try {
    const cutoff = Math.floor(serverNow() - ROOM_EXPIRE_MS - 120000);
    const old = await get('rooms', { orderBy: 'createdAt', endAt: cutoff, limitToFirst: 25 });
    if (!old || typeof old !== 'object') return;
    for (const code of Object.keys(old)) {
      if (normalizeRoomCode(code) === code && !sweptCodes.has(code)) {
        sweptCodes.add(code);
        await del(roomPath(code)).catch(() => {});
      }
    }
  } catch (err) {
    /* someone else will clean up */
  }
}

function lobbyList(rooms, uid) {
  const now = serverNow();
  const list = [];
  if (!rooms || typeof rooms !== 'object') return list;
  for (const code of Object.keys(rooms)) {
    if (normalizeRoomCode(code) !== code) continue;
    const room = normalizeRoom(code, rooms[code], uid, now);
    if (!room || room.status !== 'open') continue;
    const age = now - room.createdAt;
    if (age > ROOM_EXPIRE_MS + 120000 && !sweptCodes.has(code)) {
      sweptCodes.add(code);
      del(roomPath(code)).catch(() => {});
    }
    if (age > OPEN_ROOM_MAX_AGE_MS || !room.hostConnected) continue;
    list.push({
      code,
      hostName: room.hostName,
      map: room.map,
      mode: room.mode,
      maxPlayers: room.maxPlayers,
      questionCount: room.questionCount,
      players: room.players.length,
      full: room.players.length >= room.maxPlayers,
      createdAt: room.createdAt,
      mine: room.isHost
    });
  }
  return list.sort((a, b) => b.createdAt - a.createdAt || a.code.localeCompare(b.code));
}

export function watchOpenRooms(onList, onState) {
  let rooms = null;
  let seen = false;
  let lastKey = '';
  let closed = false;
  const emit = () => {
    if (closed || !seen) return;
    const list = lobbyList(rooms, currentUid());
    const key = JSON.stringify(list);
    if (key === lastKey) return;
    lastKey = key;
    onList(list);
  };
  const w = watchValue('rooms', { orderBy: 'status', equalTo: 'open' }, (value) => {
    rooms = value;
    if (!seen) {
      seen = true;
      sweepExpiredRooms();
    }
    emit();
  }, onState && ((ev) => onState({ state: ev.state, error: ev.error })));
  const tick = window.setInterval(emit, 5000);
  const sweep = window.setInterval(sweepExpiredRooms, 10 * 60 * 1000);
  return {
    close() {
      closed = true;
      window.clearInterval(tick);
      window.clearInterval(sweep);
      w.close();
    }
  };
}
