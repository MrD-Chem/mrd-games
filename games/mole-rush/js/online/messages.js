/*
  Mole Rush online — the friendly sentences students see when something goes wrong.

  friendly(err) -> { kind, text }
     kind: 'offline' | 'blocked' | 'full' | 'started' | 'notfound' | 'slow' | 'busy' | 'other'
     text: one or two short sentences, safe to show (never includes raw server text).
  MSG.hostLeft / MSG.droppedAtStart / MSG.roomClosed: messages for room events.
*/

export const MSG = Object.freeze({
  offline: 'You’re not connected to the internet. Check the Wi-Fi, then try again.',
  blocked: 'Online races aren’t available on this network. Try Practice or a race code.',
  full: 'That race is full. Join another race or create your own.',
  started: 'That race has already started. Join another race or create your own.',
  notfound: 'We couldn’t find that race. Check the code with the host, or the host may have closed it.',
  slow: 'The race server is taking too long to answer. The network may be busy, so try again in a moment.',
  busy: 'Too many new players have signed in from this network in the last hour. Wait a few minutes, then try again, or play Practice.',
  other: 'Something went wrong with online races. Try again in a moment.',
  hostLeft: 'The host left, so that race was closed.',
  droppedAtStart: 'The race started without you because this device lost its connection for a bit.',
  roomClosed: 'This race room was closed.',
  removed: 'You are no longer in that race.'
});

export function friendly(err) {
  const code = err && typeof err.code === 'string' ? err.code : '';
  switch (code) {
    case 'offline':
      return { kind: 'offline', text: MSG.offline };
    case 'blocked':
      return { kind: 'blocked', text: MSG.blocked };
    case 'full':
      return { kind: 'full', text: MSG.full };
    case 'started':
      return { kind: 'started', text: MSG.started };
    case 'notfound':
      return { kind: 'notfound', text: MSG.notfound };
    case 'timeout':
      return { kind: 'slow', text: MSG.slow };
    case 'denied':
      /* rooms.js already words its own refusals for students (e.g. "Type a nickname first") */
      if (err.message && /nickname|host|race/i.test(err.message) && err.message.length < 140) return { kind: 'other', text: err.message };
      return { kind: 'other', text: MSG.other };
    case 'server':
      if (err.detail === 'TOO_MANY_ATTEMPTS') return { kind: 'busy', text: MSG.busy };
      return { kind: 'other', text: MSG.other };
    default:
      try {
        if (navigator.onLine === false) return { kind: 'offline', text: MSG.offline };
      } catch (e) {
        /* ignore */
      }
      return { kind: 'other', text: MSG.other };
  }
}
