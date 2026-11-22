import { COATS } from './cat.js';

// The "choose cats" panel. Changing anything here happens live in the world behind it.
export class Menu {
  constructor(api) {
    this.api = api; // { cats(), setCoat(i, id), addKitten(), removeKitten(), settings, changed() }
    this.el = document.getElementById('menu');
    this.open = false;
    this.row = 0;
  }

  rows() {
    const a = this.api, cats = a.cats();
    const rows = cats.map((c, i) => ({ label: i === 0 ? 'mama' : `kitten ${i}`, value: c.coat.name, swatch: c.coat, turn: (d) => { const k = (COATS.indexOf(c.coat) + d + COATS.length) % COATS.length; a.setCoat(i, COATS[k].id); } }));
    if (cats.length < 5) rows.push({ label: 'add a kitten', plain: true, press: () => a.addKitten() });
    if (cats.length > 2) rows.push({ label: 'one fewer kitten', plain: true, press: () => a.removeKitten() });
    rows.push({ label: 'sound words', value: a.settings.words ? 'on' : 'off', turn: () => { a.settings.words = !a.settings.words; } });
    rows.push({ label: 'music', value: a.settings.music ? 'on' : 'off', turn: () => { a.settings.music = !a.settings.music; } });
    rows.push({ label: 'back to the garden', plain: true, press: () => this.toggle(false) });
    return rows;
  }

  toggle(on = !this.open) {
    this.open = on;
    this.el.classList.toggle('hide', !on);
    if (on) { this.row = 0; this.draw(); }
    this.api.changed();
  }

  draw() {
    const rows = this.rows();
    this.row = Math.max(0, Math.min(rows.length - 1, this.row));
    const sw = (c) => `<span class="sw" style="background:linear-gradient(90deg, ${c.fur} 0 55%, ${c.stripe || c.tail2 || c.fur} 55% 78%, ${c.chest} 78%)"></span>`;
    this.el.innerHTML = `<div class="panel"><h2>the cats</h2>${rows.map((r, i) => `<div class="row${i === this.row ? ' on' : ''}${r.plain ? ' plain' : ''}"><span>${r.label}</span><span class="v">${r.swatch ? sw(r.swatch) : ''}${r.value || ''}</span></div>`).join('')}<div class="hint">up and down to move, left and right to change</div></div>`;
  }

  // feed it a device each frame while open
  input(d) {
    if (!this.open) return;
    const rows = this.rows();
    let dirty = false;
    if (d.up) { this.row = (this.row - 1 + rows.length) % rows.length; dirty = true; }
    if (d.down) { this.row = (this.row + 1) % rows.length; dirty = true; }
    const r = rows[this.row];
    if (r && r.turn && (d.left || d.right)) { r.turn(d.left ? -1 : 1); dirty = true; }
    if (r && (d.act || d.jump)) { if (r.press) r.press(); else if (r.turn) r.turn(1); dirty = true; }
    if (dirty) { this.api.tick(); this.api.changed(); if (this.open) this.draw(); }
  }
}
