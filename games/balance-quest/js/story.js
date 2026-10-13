/*
  Balance Quest — the backstory.
  - Four short story screens before the world select (first visit only; the
    "Story" button replays them). Keys: Enter / → next, ← back, Esc skip.
  - Professor Mole's speech bubble when a world starts (non-blocking, dismissible,
    auto-hides, read out politely by screen readers) and his line on each
    world-complete screen.
  - The ending after the World 4 boss.
  Everything is built with DOM APIs (el / rich), never innerHTML.
*/

import { el, clear, rich } from './dom.js';
import { WORLDS } from './data.js';

const ART = {
  scale: 'art/great-scale.svg',
  imbalancer: 'art/imbalancer.svg',
  redeemed: 'art/imbalancer-redeemed.svg',
  mole: 'art/professor-mole.svg',
  face: 'art/professor-mole.svg#face'
};

const SCREENS = [
  {
    title: 'Welcome to Molecula',
    mood: 'gold',
    art: [{ src: ART.scale, alt: 'The Great Scale, perfectly level, with the same atoms in both pans.' }],
    text: [
      'The land of Molecula runs on one rule: the ',
      { b: 'Law of Conservation of Mass' },
      '. In a chemical reaction, atoms are never created or destroyed. They just rearrange into new partners, and the Great Scales that guard every path have always kept that rule perfectly level.'
    ]
  },
  {
    title: 'Enter the Imbalancer',
    mood: 'violet',
    art: [{ src: ART.imbalancer, alt: 'The Imbalancer: a tipped-over scale with a sneaky purple face.' }],
    text: [
      'Then a prankster called the ',
      { b: 'Imbalancer' },
      ' snuck in and scrambled the coefficients on every Great Scale. Now atoms are popping out of nowhere and vanishing into nothing (very rude, scientifically speaking). The scales have tipped, and every gate has slammed shut.'
    ]
  },
  {
    title: 'Meet Professor Mole',
    mood: 'teal',
    art: [{ src: ART.mole, alt: 'Professor Mole, a friendly mole in lab goggles and a lab coat, holding a flask.', bust: true }],
    text: [
      { b: 'Professor Mole' },
      ' (goggles on, lab coat buttoned, named after chemistry’s favorite counting unit) needs a lab apprentice. That’s you! Count every atom on both sides of each equation, then set the coefficients until the scale sits level.'
    ]
  },
  {
    title: 'Your quest',
    mood: 'gold',
    art: [
      { src: ART.mole, alt: 'Professor Mole', bust: true },
      { src: ART.scale, alt: '' }
    ],
    text: [
      'Rebalance the scales to reopen the paths through all four worlds. Each world ends with a boss gate, and the Imbalancer is hiding behind the very last one. Ready, apprentice?'
    ],
    worlds: true
  }
];

/* Professor Mole's line when a world starts (0 = your own practice equations). */
const START_LINES = {
  0: ['Your own equations? My favorite kind of experiment! Remember: change the coefficients, never the subscripts.'],
  1: ['Lab Meadow is all ', { b: 'synthesis' }, ' and ', { b: 'decomposition' }, ': things joining together or splitting apart. Either way, every atom has to show up on both sides.'],
  2: ['The Crystal Caves are full of ', { b: 'replacement reactions' }, ': one element swaps places with another. New partners, same atoms. Keep counting!'],
  3: ['Volcano Ridge means ', { b: 'combustion' }, ': hydrocarbon + ', { f: 'O2' }, ' → ', { f: 'CO2' }, ' + ', { f: 'H2O' }, '. Balance C first, then H, and save O for last.'],
  4: ['The Ocean Ruins are packed with ', { b: 'polyatomic groups' }, ' like ', { f: 'SO4' }, '. If a group stays together on both sides, count it as one unit.']
};

/* His line on the world-complete screen. */
const DONE_LINES = {
  0: ['Great experimenting! Every equation balanced, every atom accounted for.'],
  1: ['Joining or splitting, the atoms only rearranged. None were made and none were lost. That’s conservation of mass in action!'],
  2: ['Swap, swap, balanced! The elements traded places, but every single atom stayed accounted for.'],
  3: ['Carbon first, hydrogen next, oxygen last. That’s how you tame a combustion reaction without getting singed!'],
  4: ['You counted groups like ', { f: 'SO4' }, ' as one unit instead of atom by atom. That’s exactly how the pros do it!']
};

const BUBBLE_MS = 8000;

function img(src, alt, className) {
  return el('img', { class: className, src, alt, width: '120', height: '120', decoding: 'async' });
}

function faceImg(className) {
  return el('img', { class: 'bq-face ' + (className || ''), src: ART.face, alt: '', width: '56', height: '56', decoding: 'async' });
}

export class Story {
  /*
    new Story({ progress, main, title, stage, reducedMotion, onOpen, onClose, focusGame })
    onOpen()            hide the other screens (called when the story starts)
    onClose({ first })  show the world select again and move focus there
    focusGame()         put focus back in the game (used when the bubble is dismissed from its button)
  */
  constructor({ progress, main, title, stage, reducedMotion, onOpen, onClose, focusGame }) {
    this.progress = progress;
    this.reducedMotion = !!reducedMotion;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.focusGame = focusGame;
    this.step = 0;
    this.first = false;
    this.bubbleTimer = 0;
    this.bubblePaused = false;
    this.bubbleLeft = BUBBLE_MS;
    this.bubbleStarted = 0;
    this.ending = null;

    this._buildStory(main, title);
    this._buildBubble(stage, main);
    this._buildEnding(stage);
    document.addEventListener('keydown', (e) => this._onKey(e));
  }

  // ---------- Story screens ----------

  _buildStory(main, title) {
    this.kickerStep = el('span', { class: 'bq-story-step' });
    this.skipBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-sm bq-story-skip', text: 'Skip story' });
    this.art = el('div', { class: 'bq-story-art' });
    this.heading = el('h2', { class: 'bq-story-title', id: 'bq-story-title', tabindex: '-1' });
    this.textBox = el('p', { class: 'bq-story-p' });
    this.worldList = el('ol', { class: 'bq-story-worlds', 'aria-label': 'The four worlds' },
      WORLDS.map((w) => el('li', { 'data-theme': w.theme }, el('span', { class: 'bq-story-wnum', 'aria-hidden': 'true', text: String(w.n) }), w.name)));
    this.body = el('div', { class: 'bq-story-body' },
      this.art,
      el('div', { class: 'bq-story-text' }, this.heading, this.textBox, this.worldList));
    this.backBtn = el('button', { type: 'button', class: 'btn btn-ghost bq-story-back', text: '← Back' });
    this.nextBtn = el('button', { type: 'button', class: 'btn btn-primary bq-story-next', text: 'Next →' });
    this.dots = el('ol', { class: 'bq-story-dots', 'aria-hidden': 'true' }, SCREENS.map(() => el('li')));
    this.root = el('section', { class: 'bq-story', id: 'bq-story', 'aria-label': 'The story of Molecula', hidden: true },
      el('div', { class: 'panel bq-story-card' },
        el('div', { class: 'bq-story-top' },
          el('p', { class: 'bq-story-kicker' }, el('span', { class: 'bq-story-brand', text: 'Balance Quest · ' }), this.kickerStep),
          this.skipBtn),
        this.body,
        el('div', { class: 'bq-story-nav' }, this.backBtn, this.dots, this.nextBtn)));
    title.before(this.root);

    this.skipBtn.addEventListener('click', () => this.skip());
    this.backBtn.addEventListener('click', () => this.back());
    this.nextBtn.addEventListener('click', () => this.next());
  }

  isShowing() {
    return !this.root.hidden;
  }

  /* show({ first }) — first = the automatic first-visit showing. */
  show(opts = {}) {
    this.hideBubble();
    this.hideEnding();
    this.first = !!opts.first;
    this.onOpen();
    this.root.hidden = false;
    window.scrollTo(0, 0);
    this._render(0, 0);
    return true;
  }

  next() {
    if (!this.isShowing()) return;
    if (this.step >= SCREENS.length - 1) this.finish();
    else this._render(this.step + 1, 1);
  }

  back() {
    if (!this.isShowing() || this.step === 0) return;
    this._render(this.step - 1, -1);
  }

  /* Skip and finish both remember that the story has been seen. */
  skip() {
    this.finish();
    return true;
  }

  finish() {
    if (!this.isShowing()) return;
    this._close(false);
  }

  /* Close without moving focus (used when a world starts from the test hook). */
  dismiss() {
    if (this.isShowing()) this._close(true);
  }

  _close(silent) {
    this.progress.storySeen = true;
    this.root.hidden = true;
    const first = this.first;
    this.first = false;
    if (!silent) this.onClose({ first });
  }

  _render(step, dir) {
    this.step = step;
    const s = SCREENS[step];
    const last = step === SCREENS.length - 1;
    this.kickerStep.textContent = `Part ${step + 1} of ${SCREENS.length}`;
    this.art.dataset.mood = s.mood;
    this.art.classList.toggle('is-pair', s.art.length > 1);
    clear(this.art);
    s.art.forEach((a, i) => this.art.appendChild(img(a.src, a.alt, 'bq-story-img' + (i ? ' bq-story-img--small' : '') + (a.bust ? ' is-bust' : ''))));
    this.heading.textContent = s.title;
    rich(this.textBox, s.text);
    this.worldList.hidden = !s.worlds;
    this.backBtn.disabled = step === 0;
    this.nextBtn.textContent = last ? 'Start the quest' : 'Next →';
    [...this.dots.children].forEach((d, i) => d.classList.toggle('is-on', i === step));
    if (!this.reducedMotion && dir) {
      this.body.classList.remove('is-fwd', 'is-back');
      void this.body.offsetWidth; // restart the slide-in animation
      this.body.classList.add(dir > 0 ? 'is-fwd' : 'is-back');
    }
    this.heading.focus({ preventScroll: true });
  }

  _onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (this.isShowing()) {
      const t = e.target;
      const onControl = t && t.closest && t.closest('button, a, input, textarea, select, summary');
      if (e.key === 'Escape') {
        e.preventDefault();
        this.skip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.back();
      } else if (e.key === 'Enter' && !onControl && !e.repeat) {
        e.preventDefault();
        this.next();
      }
      return;
    }
    if (e.key === 'Escape' && !this.bubble.hidden && !e.defaultPrevented) this.hideBubble();
  }

  // ---------- Professor Mole's speech bubble ----------

  _buildBubble(stage, main) {
    this.bubbleText = el('p', { class: 'bq-bubble-line' });
    this.bubbleClose = el('button', { type: 'button', class: 'bq-close bq-bubble-close', 'aria-label': 'Dismiss Professor Mole’s tip', text: '✕' });
    this.bubble = el('div', { class: 'bq-mole-bubble', id: 'bq-mole-bubble', role: 'group', 'aria-label': 'Professor Mole', hidden: true },
      el('span', { class: 'bq-face-ring' }, faceImg()),
      el('div', { class: 'bq-bubble-box' },
        el('p', { class: 'bq-bubble-name', text: 'Professor Mole' }),
        this.bubbleText),
      this.bubbleClose);
    const prompt = stage.querySelector('#bq-prompt');
    if (prompt) prompt.after(this.bubble);
    else stage.appendChild(this.bubble);
    // A live region that is always in the page, so the line is announced reliably.
    this.live = el('p', { class: 'sr-only', id: 'bq-mole-live', 'aria-live': 'polite' });
    main.appendChild(this.live);

    this.bubbleClose.addEventListener('click', () => {
      this.hideBubble();
      if (this.focusGame) this.focusGame();
    });
    const pause = () => this._pauseBubble(true);
    const resume = () => this._pauseBubble(false);
    this.bubble.addEventListener('mouseenter', pause);
    this.bubble.addEventListener('mouseleave', () => {
      if (!this.bubble.contains(document.activeElement)) resume();
    });
    this.bubble.addEventListener('focusin', pause);
    this.bubble.addEventListener('focusout', (e) => {
      if (!this.bubble.contains(e.relatedTarget) && !this.bubble.matches(':hover')) resume();
    });
  }

  /* Show Professor Mole's line for world n (does not move focus or stop the game). */
  sayWorldStart(n) {
    const line = START_LINES[n];
    if (!line) return false;
    rich(this.bubbleText, line);
    this.bubble.hidden = false;
    this.bubble.classList.remove('is-in');
    if (!this.reducedMotion) {
      void this.bubble.offsetWidth;
      this.bubble.classList.add('is-in');
    }
    this.live.textContent = '';
    const said = 'Professor Mole says: ' + this.bubbleText.textContent;
    window.setTimeout(() => {
      this.live.textContent = said;
    }, 120);
    this.bubblePaused = false;
    this.bubbleLeft = BUBBLE_MS;
    this._armBubble();
    return true;
  }

  _armBubble() {
    window.clearTimeout(this.bubbleTimer);
    this.bubbleStarted = Date.now();
    this.bubbleTimer = window.setTimeout(() => this.hideBubble(), this.bubbleLeft);
  }

  _pauseBubble(on) {
    if (this.bubble.hidden || on === this.bubblePaused) return;
    this.bubblePaused = on;
    if (on) {
      window.clearTimeout(this.bubbleTimer);
      this.bubbleLeft = Math.max(2500, this.bubbleLeft - (Date.now() - this.bubbleStarted));
    } else {
      this._armBubble();
    }
  }

  isBubbleShowing() {
    return !this.bubble.hidden;
  }

  hideBubble() {
    window.clearTimeout(this.bubbleTimer);
    if (this.bubble.hidden) return;
    const hadFocus = this.bubble.contains(document.activeElement);
    this.bubble.hidden = true;
    this.bubble.classList.remove('is-in');
    this.bubblePaused = false;
    if (hadFocus && this.focusGame) this.focusGame();
  }

  // ---------- World-complete line ----------

  /* Fill the slot on the world-complete card with Professor Mole's line for world n. */
  renderCompleteLine(slot, n) {
    clear(slot);
    const line = DONE_LINES[n];
    slot.hidden = !line;
    if (!line) return;
    const text = el('p', { class: 'bq-mole-say-text' }, el('strong', { text: 'Professor Mole: ' }));
    const words = el('span');
    rich(words, line);
    text.appendChild(words);
    slot.append(el('span', { class: 'bq-face-ring bq-face-ring--sm' }, faceImg()), text);
  }

  // ---------- The ending (after the World 4 boss) ----------

  _buildEnding(stage) {
    const title = el('h2', { id: 'bq-ending-title', tabindex: '-1', text: 'Molecula is balanced again!' });
    this.endingStars = el('p', { class: 'bq-ending-stars' });
    this.endingBack = el('button', { type: 'button', class: 'btn btn-primary', text: 'Back to worlds' });
    this.endingScore = el('button', { type: 'button', class: 'btn btn-ghost', text: 'See my stars' });
    this.endingRoot = el('section', { class: 'bq-overlay bq-ending', id: 'bq-ending', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'bq-ending-title', hidden: true },
      el('div', { class: 'bq-card bq-ending-card' },
        el('div', { class: 'bq-ending-art' },
          img(ART.redeemed, 'The Imbalancer, level at last, wearing a pair of apprentice goggles.', 'bq-ending-img'),
          img(ART.mole, 'Professor Mole, smiling.', 'bq-ending-img bq-ending-img--mole')),
        el('p', { class: 'bq-story-kicker', text: 'The end… for now' }),
        title,
        el('p', {
          text: 'The last scale clicks level, and the Imbalancer’s wobbly beam finally settles too. “Okay, fine,” it grumbles. “Being balanced feels pretty great.”'
        }),
        el('p', {
          text: 'Professor Mole hands it a spare pair of goggles and a new job: polishing the Great Scales. Every path in Molecula is open again, and not one atom went missing on your watch. Nice work, apprentice!'
        }),
        this.endingStars,
        el('div', { class: 'bq-actions' }, this.endingBack, this.endingScore)));
    this.endingTitle = title;
    stage.appendChild(this.endingRoot);

    this.endingBack.addEventListener('click', () => {
      const cb = this.ending && this.ending.onBack;
      this.hideEnding();
      if (cb) cb();
    });
    this.endingScore.addEventListener('click', () => {
      const cb = this.ending && this.ending.onStars;
      this.hideEnding();
      if (cb) cb();
    });
    // Keep Tab inside the ending card.
    this.endingRoot.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const first = this.endingBack;
      const last = this.endingScore;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === this.endingTitle)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* showEnding({ stars, maxStars, onBack, onStars }) */
  showEnding(opts) {
    this.hideBubble();
    this.ending = opts || {};
    const { stars, maxStars } = this.ending;
    this.endingStars.hidden = !maxStars;
    if (maxStars) rich(this.endingStars, ['You earned ', { b: `★ ${stars} of ${maxStars}` }, ' stars across all four worlds.']);
    this.endingRoot.hidden = false;
    this.endingRoot.scrollTop = 0;
    this.endingTitle.focus({ preventScroll: true });
  }

  isEndingShowing() {
    return !this.endingRoot.hidden;
  }

  hideEnding() {
    this.endingRoot.hidden = true;
  }
}
