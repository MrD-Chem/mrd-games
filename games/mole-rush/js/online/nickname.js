/*
  Mole Rush online — nicknames.

  checkNickname(text) -> { ok: true, name } | { ok: false, error }
      1 to 16 letters, numbers or spaces (accented letters like é are fine), with no long runs of
      digits (a student ID or phone number is not a nickname). Extra spaces are squeezed out. A tiny built-in blocklist turns away obviously rude names; the error never
      repeats the word.
  displayName(text) -> the text to show for a name that came from the database: the name itself when
      it follows the same rules, otherwise 'Racer'. Names are typed on other students' devices, and a
      modified page could write anything, so every name read from the database goes through this.
  loadNickname() -> the nickname saved on this device, or ''
  saveNickname(name) -> true if it was saved (false in a private window / blocked storage)

  The blocklist is stored ROT13-encoded so the page source is not a list of rude words.
  It is deliberately tiny: the teacher can always see nicknames in the room, and a long list
  mostly blocks real names by accident.
*/

const KEY = 'mrd-games:mole-rush:nickname:v1';
export const NICK_MAX = 16;

const rot13 = (s) => s.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));

/* Blocked anywhere inside the name. */
const ANYWHERE = 'shpx fuvg phag ovgpu avtt juber fyhg cbea cravf intvan qvyqb chffl snttbg ergneq uvgyre obbo nffubyr wvmm zbgureshpx'.split(' ').map(rot13);
/* Blocked only as a whole word (they hide inside ordinary words and names: class, Nazira, therapist). */
const WHOLE = 'nff nefr qvpx pbpx snt encr encvfg frk gvg gvgf phz nany ubr ubrf xxx xlf anmv ubeal gjng jgs fgsh'.split(' ').map(rot13);

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', 9: 'g' };

function plain(text) {
  let s = String(text).toLowerCase();
  try {
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (err) {
    /* very old browser: compare as typed */
  }
  return s;
}

const leet = (s, one) => s.replace(/[0-9]/g, (d) => (d === '1' ? one : LEET[d] || d));
const squeeze = (s) => s.replace(/(.)\1+/g, '$1');

function isRude(name) {
  const base = plain(name);
  const words = base.split(' ').filter(Boolean);
  const joined = words.join('');
  /* spellings to compare: as typed, digits read as letters (1 as i or l), repeats squeezed */
  const forms = new Set();
  for (const s of [joined, leet(joined, 'i'), leet(joined, 'l')]) {
    forms.add(s);
    forms.add(squeeze(s));
  }
  for (const w of ANYWHERE) {
    for (const f of forms) if (f.includes(w)) return true;
  }
  const tokens = new Set([joined]);
  for (const w of words) {
    const bare = w.replace(/^[0-9]+|[0-9]+$/g, '');
    [w, bare, leet(w, 'i'), leet(w, 'l'), leet(bare, 'i')].forEach((t) => {
      if (t) {
        tokens.add(t);
        tokens.add(squeeze(t));
      }
    });
  }
  for (const w of WHOLE) if (tokens.has(w)) return true;
  return false;
}

export function checkNickname(text) {
  const name = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  if (!name) return { ok: false, error: 'Type a nickname first.' };
  if (name.length > NICK_MAX) return { ok: false, error: 'Nicknames can be up to 16 characters.' };
  if (!/^[A-Za-z0-9\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff ]+$/.test(name)) return { ok: false, error: 'Use only letters, numbers and spaces.' };
  if ((name.match(/[0-9]/g) || []).length >= 5) return { ok: false, error: 'Please don’t use a number that could be your ID or phone number.' };
  if (isRude(name)) return { ok: false, error: 'Please choose a different nickname.' };
  return { ok: true, name };
}

/* A name read from the database (see above). Controls, zero-width and direction-override characters
   are dropped first; anything that is still not a valid nickname shows as 'Racer'. */
export function displayName(text) {
  const s = typeof text === 'string'
    ? text.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16)
    : '';
  const c = checkNickname(s);
  return c.ok ? c.name : 'Racer';
}

export function loadNickname() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const o = raw ? JSON.parse(raw) : null;
    if (o && o.v === 1 && typeof o.name === 'string') {
      const c = checkNickname(o.name);
      if (c.ok) return c.name;
    }
  } catch (err) {
    /* blocked storage: ask again */
  }
  return '';
}

export function saveNickname(name) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, name }));
    return true;
  } catch (err) {
    return false;
  }
}
