/*
  Mole Rush online — a tiny Firebase client with no SDK (plain fetch + EventSource).

  Exports
    signIn()                    -> Promise<{ uid }>. Anonymous sign-in. The refresh token is kept in
                                   localStorage (inside try/catch) so a reload keeps the same player id.
                                   The ID token refreshes itself 5 minutes before it expires.
    currentUid()                -> the signed-in uid, or null.
    get(path, query?)           -> Promise<value>    query: { orderBy: 'status', equalTo: 'open', ... }
    put(path, body)             -> Promise<written value, with server timestamps filled in>
    patch(path, body)           -> Promise<written value>   (keys may be multi-part paths: 'slots/s1/team')
    del(path)                   -> Promise<null>
    stream(path, query, onEvent)-> { close() }. Live updates over EventSource. onEvent gets
                                   { type: 'put' | 'patch', path, data } for data, and
                                   { type: 'state', state: 'connecting' | 'live' | 'retrying', error }
                                   for the connection. Reconnects by itself with backoff, re-signs-in on
                                   'auth_revoked', and restarts a stream that has gone silent.
    watchValue(path, query, onValue, onState?) -> { close() }. A stream that keeps the whole value
                                   up to date: onValue(value) after every change (value is read-only).
                                   Watchers of the same path + query share one connection.
    applyEvent(root, type, path, data) -> new root (the put/patch merge used by watchValue).
    serverNow()                 -> the server's clock in ms (Date.now() + estimated offset).
    syncClock(path, rounds?)    -> Promise<clockInfo()>. Writes a server timestamp to `path` (a place this
                                   player may write) and reads it back to measure the offset.
    clockInfo()                 -> { offset, error, calibrated, samples }  (error = +/- ms bound)
    TIMESTAMP                   -> { '.sv': 'timestamp' }, the server-timestamp placeholder.
    sendOnExit(method, path)    -> true if a last-moment request (DELETE) was handed to the browser. For
                                   the 'pagehide' event: a keepalive request outlives the closing tab. Best effort.
    OnlineError                 -> every failure is one of these, with .code:
                                   'offline'  no internet on this device
                                   'timeout'  the server did not answer in time (very slow network)
                                   'blocked'  the request never reached the server (web filter, CSP, firewall)
                                   'denied'   the server refused (security rules, bad sign-in)
                                   'full' / 'started' / 'notfound'  (used by rooms.js)
                                   'server'   anything else (5xx, unexpected reply)
                                   and a plain-language .message that is safe to show students.

  Writes are sent as POST + x-http-method-override with a text/plain body. That is a "simple"
  request, so browsers skip the extra CORS preflight round trip (slow school networks feel it).
*/

export const CONFIG = Object.freeze({
  apiKey: 'AIzaSyAVqzov5ebJxh2FKI2Vc3kqXT_KlhTT6z4',
  authDomain: 'mr-d-chemistry.firebaseapp.com',
  databaseURL: 'https://mr-d-chemistry-default-rtdb.firebaseio.com',
  projectId: 'mr-d-chemistry',
  appId: '1:105447915714:web:284c37e66851034d5c7b5b'
});

export const TIMESTAMP = Object.freeze({ '.sv': 'timestamp' });

const AUTH_KEY = 'mrd-games:mole-rush:auth:v1';
const SIGNUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + CONFIG.apiKey;
const REFRESH_URL = 'https://securetoken.googleapis.com/v1/token?key=' + CONFIG.apiKey;
const REQUEST_TIMEOUT_MS = 15000;
const REFRESH_EARLY_MS = 5 * 60 * 1000;
const STREAM_SILENT_MS = 90000; /* Firebase sends keep-alives; a silent stream is a dead one */
const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000, 30000];

/* ---------------- Errors ---------------- */

const MESSAGES = {
  offline: 'This device is not connected to the internet.',
  timeout: 'The race server took too long to answer. The network may be very slow.',
  blocked: 'The network blocked the connection to the race server. A school web filter is the usual cause.',
  denied: 'The race server did not allow that.',
  full: 'That room is full.',
  started: 'That race has already started.',
  notfound: 'That room is gone. The host may have closed it.',
  server: 'The race server had a problem. Try again in a moment.'
};

export class OnlineError extends Error {
  constructor(code, message, detail) {
    super(message || MESSAGES[code] || MESSAGES.server);
    this.name = 'OnlineError';
    this.code = MESSAGES[code] ? code : 'server';
    this.detail = detail ? String(detail) : '';
  }
}

export function isOnlineError(err, code) {
  return err instanceof OnlineError && (!code || err.code === code);
}

/* The last Content-Security-Policy block, so 'blocked' errors can say why. */
let lastViolation = null;
try {
  document.addEventListener('securitypolicyviolation', (e) => {
    lastViolation = { uri: String(e.blockedURI || ''), directive: String(e.effectiveDirective || e.violatedDirective || ''), at: Date.now() };
  });
} catch (err) {
  /* no document (worker) — fine */
}
export function lastCspViolation() {
  return lastViolation;
}

function deviceOffline() {
  try {
    return navigator.onLine === false;
  } catch (err) {
    return false;
  }
}

function networkError(err) {
  if (deviceOffline()) return new OnlineError('offline');
  return new OnlineError('blocked', null, err && err.message);
}

function errorText(body) {
  if (!body) return '';
  if (typeof body === 'string') return body;
  if (typeof body.error === 'string') return body.error;
  if (body.error && typeof body.error.message === 'string') return body.error.message;
  return '';
}

/* ---------------- HTTP ---------------- */

async function rawFetch(url, init, timeoutMs) {
  let ctrl = null;
  let timer = 0;
  try {
    ctrl = new AbortController();
  } catch (err) {
    ctrl = null;
  }
  const opts = Object.assign({ credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin' }, init);
  if (ctrl) {
    opts.signal = ctrl.signal;
    timer = window.setTimeout(() => ctrl.abort(), timeoutMs || REQUEST_TIMEOUT_MS);
  }
  try {
    let res;
    try {
      res = await fetch(url, opts);
    } catch (err) {
      if (ctrl && ctrl.signal.aborted) throw new OnlineError(deviceOffline() ? 'offline' : 'timeout');
      throw networkError(err);
    }
    let text = '';
    try {
      text = await res.text();
    } catch (err) {
      if (ctrl && ctrl.signal.aborted) throw new OnlineError('timeout');
      throw networkError(err);
    }
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (err) {
      body = text;
    }
    return { status: res.status, body };
  } finally {
    window.clearTimeout(timer);
  }
}

/* ---------------- Clock ---------------- */

const clockSamples = []; /* { offset, error, at } — newest last */

export function noteClockSample(offset, error) {
  if (!Number.isFinite(offset) || !Number.isFinite(error) || error < 0) return;
  clockSamples.push({ offset, error, at: Date.now() });
  if (clockSamples.length > 12) clockSamples.shift();
}

function bestSample() {
  let best = null;
  const now = Date.now();
  for (const s of clockSamples) {
    /* older samples count as a little less certain (clocks drift, laptops sleep) */
    const e = s.error + (now - s.at) / 1000;
    if (!best || e < best.e) best = { offset: s.offset, e };
  }
  return best;
}

export function serverNow() {
  const b = bestSample();
  return Date.now() + (b ? b.offset : 0);
}

export function clockInfo() {
  const b = bestSample();
  return { offset: b ? Math.round(b.offset) : 0, error: b ? Math.round(b.e) : Infinity, calibrated: !!b, samples: clockSamples.length };
}

/* A server timestamp written between local times t0 and t1 was set somewhere in that window. */
function sampleFromWrite(serverMs, t0, t1) {
  if (Number.isFinite(serverMs)) noteClockSample(serverMs - (t0 + t1) / 2, (t1 - t0) / 2);
}

/* Find the first {'.sv':'timestamp'} in what we sent and return the value the server stored there. */
function resolvedTimestamp(sent, got) {
  if (!sent || typeof sent !== 'object') return undefined;
  if (sent['.sv'] === 'timestamp') return typeof got === 'number' ? got : undefined;
  if (!got || typeof got !== 'object') return undefined;
  for (const k of Object.keys(sent)) {
    const v = resolvedTimestamp(sent[k], got[k]);
    if (v !== undefined) return v;
  }
  return undefined;
}

/* ID tokens carry 'iat' (issued-at, whole seconds, Google's clock): a rough first calibration. */
function sampleFromToken(idToken, t0, t1) {
  try {
    const part = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(part + '==='.slice((part.length + 3) % 4)));
    if (Number.isFinite(payload.iat)) noteClockSample(payload.iat * 1000 + 500 - (t0 + t1) / 2, 500 + (t1 - t0) / 2);
  } catch (err) {
    /* not fatal: the first database write calibrates the clock anyway */
  }
}

/* ---------------- Sign-in ---------------- */

let auth = null; /* { uid, idToken, refreshToken, expiresAt } */
let signingIn = null;
let refreshTimer = 0;

function loadStoredAuth() {
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    const o = raw ? JSON.parse(raw) : null;
    if (o && o.v === 1 && typeof o.uid === 'string' && typeof o.refreshToken === 'string' && o.refreshToken.length > 10 && o.refreshToken.length < 4096) return o;
  } catch (err) {
    /* blocked storage: sign in fresh */
  }
  return null;
}

function saveStoredAuth(a) {
  try {
    window.localStorage.setItem(AUTH_KEY, JSON.stringify({ v: 1, uid: a.uid, refreshToken: a.refreshToken }));
  } catch (err) {
    /* private window: this tab still works, a reload just makes a new player */
  }
}

function authError(status, body) {
  const t = errorText(body);
  /* Google limits new anonymous players per network address per hour; a whole school can share one address */
  if (status === 429 || /TOO_MANY_ATTEMPTS/.test(t)) return new OnlineError('server', 'Too many new players have signed in from this network in the last hour. Wait a few minutes, then try again.', 'TOO_MANY_ATTEMPTS');
  if (status === 400 || status === 401 || status === 403) {
    if (/ADMIN_ONLY|OPERATION_NOT_ALLOWED/.test(t)) return new OnlineError('denied', 'Online races are switched off right now (anonymous sign-in is disabled).', t);
    if (/API_KEY|referer|referrer|PERMISSION/i.test(t)) return new OnlineError('denied', 'The race server did not accept this website.', t);
    return new OnlineError('denied', 'Signing in to the race server did not work.', t);
  }
  return new OnlineError('server', null, status + ' ' + t);
}

function setAuth(uid, idToken, refreshToken, expiresInSec, t0, t1) {
  const life = Math.max(60, Number(expiresInSec) || 3600) * 1000;
  auth = { uid, idToken, refreshToken, expiresAt: t1 + life };
  saveStoredAuth(auth);
  sampleFromToken(idToken, t0, t1);
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    refreshSession().catch(() => {
      /* the next request tries again */
    });
  }, Math.max(30000, life - REFRESH_EARLY_MS));
  return { uid };
}

async function signUpNew() {
  const t0 = Date.now();
  const { status, body } = await rawFetch(SIGNUP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true })
  });
  const t1 = Date.now();
  if (status !== 200 || !body || typeof body.idToken !== 'string' || typeof body.localId !== 'string') throw authError(status, body);
  return setAuth(body.localId, body.idToken, body.refreshToken, body.expiresIn, t0, t1);
}

async function refreshWith(refreshToken) {
  const t0 = Date.now();
  const { status, body } = await rawFetch(REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(refreshToken)
  });
  const t1 = Date.now();
  if (status !== 200 || !body || typeof body.id_token !== 'string' || typeof body.user_id !== 'string') throw authError(status, body);
  return setAuth(body.user_id, body.id_token, body.refresh_token || refreshToken, body.expires_in, t0, t1);
}

/* Refresh the current player's token, or sign in (reusing the saved player when there is one). */
function refreshSession() {
  if (!signingIn) {
    signingIn = (async () => {
      const saved = auth ? { refreshToken: auth.refreshToken } : loadStoredAuth();
      if (saved) {
        try {
          return await refreshWith(saved.refreshToken);
        } catch (err) {
          if (!isOnlineError(err, 'denied')) throw err;
          /* the saved player no longer exists: make a new one below */
        }
      }
      return signUpNew();
    })().finally(() => {
      signingIn = null;
    });
  }
  return signingIn;
}

export async function signIn() {
  if (auth && auth.expiresAt - Date.now() > 60000) return { uid: auth.uid };
  return refreshSession();
}

export function currentUid() {
  return auth ? auth.uid : null;
}

async function getToken() {
  await signIn();
  return auth.idToken;
}

/* ---------------- Database REST ---------------- */

const JSON_QUERY_KEYS = new Set(['orderBy', 'equalTo', 'startAt', 'endAt', 'limitToFirst', 'limitToLast']);

function cleanPath(path) {
  const parts = String(path || '').split('/').filter(Boolean);
  for (const p of parts) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(p)) throw new OnlineError('denied', 'That address is not allowed.', 'bad path segment');
  }
  return parts.join('/');
}

function dbUrl(path, query, token, override) {
  const params = [];
  if (token) params.push('auth=' + encodeURIComponent(token));
  if (query) {
    for (const k of Object.keys(query)) {
      const v = JSON_QUERY_KEYS.has(k) ? JSON.stringify(query[k]) : String(query[k]);
      params.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    }
  }
  if (override) params.push('x-http-method-override=' + override);
  return CONFIG.databaseURL + '/' + cleanPath(path) + '.json' + (params.length ? '?' + params.join('&') : '');
}

function dbError(status, body) {
  const t = errorText(body);
  if (status === 401 || status === 403) return new OnlineError('denied', null, t);
  if (status === 404) return new OnlineError('notfound', null, t);
  return new OnlineError('server', null, status + ' ' + t);
}

async function dbRequest(method, path, body, query) {
  for (let attempt = 0; ; attempt++) {
    const token = await getToken();
    const read = method === 'GET';
    const url = dbUrl(path, query, token, read ? null : method);
    const init = read
      ? { method: 'GET', cache: 'no-store' }
      : { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: method === 'DELETE' ? '' : JSON.stringify(body) };
    const t0 = Date.now();
    let res;
    try {
      res = await rawFetch(url, init);
    } catch (err) {
      /* one quiet retry for a dropped connection: every write we make is safe to repeat */
      if (attempt === 0 && isOnlineError(err) && (err.code === 'timeout' || err.code === 'blocked')) {
        await new Promise((r) => window.setTimeout(r, 800));
        continue;
      }
      throw err;
    }
    const t1 = Date.now();
    if (res.status >= 200 && res.status < 300) {
      if (!read) sampleFromWrite(resolvedTimestamp(body, res.body), t0, t1);
      return res.body;
    }
    /* an expired or revoked token: refresh once and try again */
    if (res.status === 401 && attempt === 0 && /expired|revoked|parse|credential|token/i.test(errorText(res.body))) {
      auth.expiresAt = 0;
      await refreshSession();
      continue;
    }
    throw dbError(res.status, res.body);
  }
}

export function get(path, query) {
  return dbRequest('GET', path, undefined, query);
}
export function put(path, body) {
  return dbRequest('PUT', path, body);
}
export function patch(path, body) {
  return dbRequest('PATCH', path, body);
}
export function del(path) {
  return dbRequest('DELETE', path);
}

/* A request sent as the page goes away (tab closed, reload): `keepalive` lets it outlive the page.
   Fire and forget, and it never throws. Only DELETE is used (no body, safe to repeat). */
export function sendOnExit(method, path) {
  try {
    if (!auth || auth.expiresAt - Date.now() < 5000) return false;
    fetch(dbUrl(path, null, auth.idToken, method), {
      method: 'POST',
      keepalive: true,
      cache: 'no-store',
      credentials: 'omit',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: ''
    }).catch(() => {});
    return true;
  } catch (err) {
    return false;
  }
}

/* Measure the clock offset by writing a server timestamp to `path` and reading the reply. */
export async function syncClock(path, rounds) {
  const n = Math.max(1, Math.min(5, rounds || 3));
  for (let i = 0; i < n; i++) await put(path, TIMESTAMP);
  return clockInfo();
}

/* ---------------- Live updates ---------------- */

function safeCall(fn, arg) {
  try {
    fn(arg);
  } catch (err) {
    window.setTimeout(() => {
      throw err;
    }, 0);
  }
}

export function stream(path, query, onEvent) {
  let es = null;
  let closed = false;
  let retryTimer = 0;
  let attempt = 0;
  let lastActivity = 0;
  let live = false;
  let pendingConnect = false;

  const emitState = (state, error) => safeCall(onEvent, { type: 'state', state, error: error || null });

  function teardown() {
    live = false;
    if (es) {
      try {
        es.close();
      } catch (err) {
        /* already closed */
      }
      es = null;
    }
  }

  function scheduleRetry(error) {
    teardown();
    if (closed) return;
    window.clearTimeout(retryTimer);
    const base = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
    attempt++;
    emitState('retrying', error || (deviceOffline() ? new OnlineError('offline') : new OnlineError('blocked', 'Lost the live connection to the race server. Trying again…')));
    retryTimer = window.setTimeout(connect, Math.round(base * (0.75 + Math.random() * 0.5)));
  }

  function onData(type, e) {
    lastActivity = Date.now();
    let msg;
    try {
      msg = JSON.parse(e.data);
    } catch (err) {
      return;
    }
    if (!msg || typeof msg.path !== 'string') return;
    if (!live) {
      live = true;
      attempt = 0;
      emitState('live');
    }
    safeCall(onEvent, { type, path: msg.path, data: msg.data === undefined ? null : msg.data });
  }

  async function connect() {
    if (closed || pendingConnect) return;
    window.clearTimeout(retryTimer);
    teardown();
    pendingConnect = true;
    if (!attempt) emitState('connecting');
    let url;
    try {
      const token = await getToken();
      url = dbUrl(path, query, token);
    } catch (err) {
      pendingConnect = false;
      scheduleRetry(isOnlineError(err) ? err : networkError(err));
      return;
    }
    pendingConnect = false;
    if (closed) return;
    try {
      es = new EventSource(url);
    } catch (err) {
      scheduleRetry(networkError(err));
      return;
    }
    lastActivity = Date.now();
    es.addEventListener('put', (e) => onData('put', e));
    es.addEventListener('patch', (e) => onData('patch', e));
    es.addEventListener('keep-alive', () => {
      lastActivity = Date.now();
    });
    es.addEventListener('cancel', () => {
      /* the rules no longer let us read this: usually a stale sign-in. Refresh, then retry. */
      if (auth) auth.expiresAt = 0;
      scheduleRetry(new OnlineError('denied', 'The race server stopped sending updates (permission). Trying again…'));
    });
    es.addEventListener('auth_revoked', () => {
      if (auth) auth.expiresAt = 0;
      teardown();
      refreshSession().then(connect, (err) => scheduleRetry(err));
    });
    es.onerror = () => {
      if (!closed) scheduleRetry();
    };
  }

  const watchdog = window.setInterval(() => {
    if (!closed && es && Date.now() - lastActivity > STREAM_SILENT_MS) scheduleRetry(new OnlineError('timeout', 'Live updates went quiet. Reconnecting…'));
  }, 10000);

  const wake = () => {
    if (!closed && !live) {
      attempt = 0;
      connect();
    }
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') wake();
  };
  /* The device says the network is gone: a stalled live connection would otherwise look fine for up to
     90 s. Say so now and keep retrying quietly until the network is back. */
  const onOffline = () => {
    if (!closed && es) scheduleRetry(new OnlineError('offline'));
  };
  window.addEventListener('online', wake);
  window.addEventListener('offline', onOffline);
  document.addEventListener('visibilitychange', onVisible);

  connect();

  return {
    close() {
      if (closed) return;
      closed = true;
      window.clearTimeout(retryTimer);
      window.clearInterval(watchdog);
      window.removeEventListener('online', wake);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
      teardown();
    },
    get live() {
      return live;
    }
  };
}

/* ---------------- Live values (shared streams) ---------------- */

function setIn(node, parts, value) {
  if (!parts.length) return value === undefined || value === null ? null : value;
  const base = node && typeof node === 'object' ? node : {};
  const head = parts[0];
  const child = setIn(base[head], parts.slice(1), value);
  const out = Object.assign({}, base);
  if (child === null || (typeof child === 'object' && !Object.keys(child).length)) delete out[head];
  else out[head] = child;
  return Object.keys(out).length ? out : null;
}

export function applyEvent(root, type, path, data) {
  const parts = String(path || '/').split('/').filter(Boolean);
  if (type === 'put') return setIn(root, parts, data);
  if (type === 'patch' && data && typeof data === 'object') {
    let r = root;
    for (const k of Object.keys(data)) r = setIn(r, parts.concat(k.split('/').filter(Boolean)), data[k]);
    return r;
  }
  return root;
}

const shared = new Map(); /* key -> { value, ready, state, subs:Set, handle } */

export function watchValue(path, query, onValue, onState) {
  const key = cleanPath(path) + '?' + JSON.stringify(query || {});
  let entry = shared.get(key);
  if (!entry) {
    entry = { value: null, ready: false, state: null, subs: new Set(), handle: null };
    shared.set(key, entry);
    const e = entry;
    e.handle = stream(path, query, (ev) => {
      if (ev.type === 'state') {
        e.state = ev;
        e.subs.forEach((s) => s.onState && safeCall(s.onState, ev));
        return;
      }
      e.value = applyEvent(e.value, ev.type, ev.path, ev.data);
      e.ready = true;
      e.subs.forEach((s) => safeCall(s.onValue, e.value));
    });
  }
  const sub = { onValue, onState };
  entry.subs.add(sub);
  if (entry.state && onState) safeCall(onState, entry.state);
  if (entry.ready) safeCall(onValue, entry.value);
  const e = entry;
  return {
    close() {
      if (!e.subs.delete(sub)) return;
      if (!e.subs.size) {
        e.handle.close();
        if (shared.get(key) === e) shared.delete(key);
      }
    }
  };
}
