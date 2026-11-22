// Input devices: the keyboard, each connected gamepad, and virtual devices for testing.
// Every device exposes the same shape: a stick (x right, y up) and four edge-triggered buttons.

const DEAD = 0.28;
const PREVENT = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const BUTTONS = ['jump', 'act', 'meow', 'swap'];

export class Input {
  constructor() {
    this.keys = new Set();
    this.tapped = new Set(); // keys pressed since the last poll, so a quick tap is never missed
    this.devices = new Map();
    this.virtuals = new Map();
    addEventListener('keydown', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      this.keys.add(e.code);
      this.tapped.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  device(id) {
    let d = this.devices.get(id);
    if (!d) {
      d = { id, x: 0, y: 0, jump: false, act: false, meow: false, swap: false, held: {}, active: false, gone: false };
      this.devices.set(id, d);
    }
    return d;
  }

  // Set a virtual device's raw state (used by tests): { x, y, jump, act, meow, swap }.
  virtual(id, raw) {
    if (raw) this.virtuals.set(id, raw);
    else this.virtuals.delete(id);
  }

  poll() {
    const k = this.keys;
    const tapped = this.tapped;
    const has = (...codes) => codes.some((c) => k.has(c) || tapped.has(c));
    this.apply(this.device('kb'), {
      x: (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft') ? 1 : 0),
      y: (has('KeyW', 'ArrowUp') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0),
      jump: has('Space'),
      act: has('KeyE', 'KeyF', 'Enter'),
      meow: has('KeyQ', 'KeyM'),
      swap: has('Tab', 'KeyR'),
    });
    tapped.clear();

    const seen = new Set();
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      const id = 'gp' + gp.index;
      seen.add(id);
      const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
      let x = gp.axes[0] || 0;
      let y = -(gp.axes[1] || 0);
      if (b(14)) x = -1;
      if (b(15)) x = 1;
      if (b(12)) y = 1;
      if (b(13)) y = -1;
      this.apply(this.device(id), {
        x, y,
        jump: b(0),
        act: b(2) || b(1),
        meow: b(3),
        swap: b(4) || b(5),
      });
    }
    for (const [id, raw] of this.virtuals) {
      seen.add(id);
      this.apply(this.device(id), raw);
    }
    for (const d of this.devices.values()) {
      if (d.id !== 'kb' && !seen.has(d.id)) {
        d.gone = true;
        this.devices.delete(d.id);
      }
    }
  }

  apply(d, raw) {
    let x = raw.x || 0;
    let y = raw.y || 0;
    let m = Math.hypot(x, y);
    if (m < DEAD) {
      x = 0; y = 0; m = 0;
    } else {
      const s = Math.min(1, (m - DEAD) / (1 - DEAD)) / m;
      x *= s; y *= s;
    }
    d.x = x;
    d.y = y;
    let any = m > 0;
    for (const name of BUTTONS) {
      const down = !!raw[name];
      d[name] = down && !d.held[name];
      d.held[name] = down;
      any = any || down;
    }
    d.active = any;
  }
}
