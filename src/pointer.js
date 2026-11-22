// Touch and mouse. A quick press is a tap; pressing and holding (or dragging) means "come this way".
export class Pointer {
  constructor() {
    this.events = []; // { type: 'tap', x, y, double } | { type: 'nap' } | { type: 'paw' }
    this.hold = null; // { x, y } while steering by holding
    this.down = null;
    this.lastTap = null;
    this.used = false;
    this.hud = document.getElementById('hud');
    const inUi = (e) => e.target instanceof Element && e.target.closest('#hud, #menu');
    addEventListener('pointerdown', (e) => {
      if (inUi(e) || (e.pointerType === 'mouse' && e.button !== 0)) return;
      this.used = true;
      this.down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, moved: false };
    });
    addEventListener('pointermove', (e) => {
      const d = this.down;
      if (!d || e.pointerId !== d.id) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 16) d.moved = true;
      if (d.moved || this.hold) this.hold = { x: e.clientX, y: e.clientY };
    });
    const up = (e) => {
      const d = this.down;
      if (!d || e.pointerId !== d.id) return;
      if (!this.hold) {
        const now = performance.now(), lt = this.lastTap;
        const double = !!lt && now - lt.t < 380 && Math.hypot(lt.x - d.x, lt.y - d.y) < 60;
        this.events.push({ type: 'tap', x: d.x, y: d.y, double });
        this.lastTap = double ? null : { x: d.x, y: d.y, t: now };
      }
      this.down = null;
      this.hold = null;
    };
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
    addEventListener('contextmenu', (e) => { if (this.used) e.preventDefault(); });
    for (const b of this.hud.querySelectorAll('button')) {
      b.addEventListener('click', () => { this.used = true; this.events.push({ type: b.dataset.act }); b.blur(); });
    }
  }

  // call once a frame: a press that has lasted a moment becomes a hold
  update() {
    const d = this.down;
    if (d && !this.hold && performance.now() - d.t > 240) this.hold = { x: d.x, y: d.y };
  }

  show(on) { this.hud.classList.toggle('hide', !on); }
}
