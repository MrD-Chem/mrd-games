/*
  Balance Quest — walking controls.
  Keyboard: WASD / arrow keys to walk, E or Enter to use a gate.
  Touch: an on-screen joystick and a "Solve" button.
*/

const MOVE_KEYS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right'
};

function isTyping(target) {
  if (!target || !target.tagName) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export class Input {
  /*
    new Input({ joystick, knob, interactBtn, isActive, onMove(x, y), onInteract() })
    isActive() says whether walking is allowed right now (world shown, no panel open).
  */
  constructor({ joystick, knob, interactBtn, isActive, onMove, onInteract }) {
    this.isActive = isActive;
    this.onMove = onMove;
    this.onInteract = onInteract;
    this.keys = { up: false, down: false, left: false, right: false };
    this.stick = { x: 0, y: 0 };
    this.joystick = joystick;
    this.knob = knob;
    this.pointerId = null;
    this.x = 0;
    this.y = 0;

    window.addEventListener('keydown', (e) => this._key(e, true));
    window.addEventListener('keyup', (e) => this._key(e, false));
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.reset();
    });

    if (joystick) {
      joystick.addEventListener('pointerdown', (e) => this._stickDown(e));
      joystick.addEventListener('pointermove', (e) => this._stickMove(e));
      joystick.addEventListener('pointerup', (e) => this._stickUp(e));
      joystick.addEventListener('pointercancel', (e) => this._stickUp(e));
      joystick.addEventListener('lostpointercapture', (e) => this._stickUp(e));
    }
    if (interactBtn) {
      interactBtn.addEventListener('click', () => {
        if (this.isActive()) this.onInteract();
      });
    }
  }

  reset() {
    this.keys.up = this.keys.down = this.keys.left = this.keys.right = false;
    this.stick.x = this.stick.y = 0;
    this.pointerId = null;
    if (this.knob) this.knob.style.transform = '';
    this._emit();
  }

  _key(e, down) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const dir = MOVE_KEYS[e.code] || MOVE_KEYS[e.key];
    const active = this.isActive();
    if (!active || isTyping(e.target)) {
      if (!down && dir) {
        this.keys[dir] = false;
        this._emit();
      }
      return;
    }
    if (dir) {
      e.preventDefault();
      if (this.keys[dir] !== down) {
        this.keys[dir] = down;
        this._emit();
      }
      return;
    }
    if (down && !e.repeat && (e.code === 'KeyE' || e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
      this.onInteract();
      return;
    }
    // Enter only when focus is on the game view itself (not on a button or link).
    if (down && !e.repeat && e.key === 'Enter' && (e.target === document.body || (e.target.closest && e.target.closest('#bq-view')))) {
      e.preventDefault();
      this.onInteract();
    }
  }

  _stickDown(e) {
    if (!this.isActive()) return;
    e.preventDefault();
    this.pointerId = e.pointerId;
    try {
      this.joystick.setPointerCapture(e.pointerId);
    } catch (err) {
      /* ignore */
    }
    this._stickMove(e);
  }

  _stickMove(e) {
    if (this.pointerId !== e.pointerId) return;
    const r = this.joystick.getBoundingClientRect();
    const radius = r.width / 2;
    let dx = (e.clientX - (r.left + radius)) / radius;
    let dy = (e.clientY - (r.top + r.height / 2)) / radius;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    const dead = 0.15;
    const mag = Math.min(1, Math.hypot(dx, dy));
    const scale = mag < dead ? 0 : (mag - dead) / (1 - dead) / (mag || 1);
    this.stick.x = dx * scale;
    this.stick.y = -dy * scale;
    if (this.knob) this.knob.style.transform = `translate(${(dx * radius * 0.55).toFixed(1)}px, ${(dy * radius * 0.55).toFixed(1)}px)`;
    this._emit();
  }

  _stickUp(e) {
    if (this.pointerId !== e.pointerId) return;
    this.pointerId = null;
    this.stick.x = 0;
    this.stick.y = 0;
    if (this.knob) this.knob.style.transform = '';
    this._emit();
  }

  _emit() {
    const kx = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    const ky = (this.keys.up ? 1 : 0) - (this.keys.down ? 1 : 0);
    let x = kx + this.stick.x;
    let y = ky + this.stick.y;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    if (x === this.x && y === this.y) return;
    this.x = x;
    this.y = y;
    this.onMove(x, y);
  }
}
