import * as THREE from 'three';

// Floating sound words ("purr", "hop") and the little markers that show which cat each player is.
// Letter groups that make one sound are tinted so they read as a single chunk.
const CHUNKS = ['urr', 'sh', 'ch', 'th', 'ck', 'ng', 'ee', 'oo', 'ow', 'ew', 'ff', 'ss', 'll', 'oi'];

function markup(word) {
  let out = '';
  for (let i = 0; i < word.length; ) {
    const c = CHUNKS.find((d) => word.startsWith(d, i));
    if (c) { out += `<b>${c}</b>`; i += c.length; } else out += word[i++];
  }
  return out;
}

export class Labels {
  constructor() {
    this.el = document.getElementById('labels');
    this.words = [];
    this.dots = [];
    this.enabled = true;
    this.s = { x: 0, y: 0 };
  }

  say(pos, text, { plain = false, life = 1.8 } = {}) {
    if (!this.enabled) return;
    const el = document.createElement('div');
    el.className = 'word';
    el.innerHTML = plain ? text : markup(text);
    this.el.appendChild(el);
    this.words.push({ el, pos: pos.clone(), age: 0, life });
  }

  dot(color) {
    const el = document.createElement('div');
    el.className = 'dot';
    el.style.setProperty('--c', color);
    this.el.appendChild(el);
    const d = { el, pos: new THREE.Vector3(), show: 0 };
    this.dots.push(d);
    return d;
  }

  removeDot(d) {
    d.el.remove();
    this.dots = this.dots.filter((x) => x !== d);
  }

  clear() {
    for (const w of this.words) w.el.remove();
    this.words = [];
  }

  update(dt, pixel) {
    const step = pixel.px;
    for (const w of this.words) {
      w.age += dt;
      w.pos.y += dt * 0.3;
      const k = w.age / w.life;
      w.el.style.opacity = k > 0.75 ? Math.max(0, (1 - k) / 0.25) : 1;
      pixel.toScreen(w.pos, this.s);
      w.el.style.left = Math.round(this.s.x / step) * step + 'px';
      w.el.style.top = Math.round(this.s.y / step) * step + 'px';
      if (k >= 1) w.el.remove();
    }
    this.words = this.words.filter((w) => w.age < w.life);
    for (const d of this.dots) {
      d.show = Math.max(0, d.show - dt);
      d.el.style.opacity = d.show > 0 ? 1 : 0;
      pixel.toScreen(d.pos, this.s);
      d.el.style.left = Math.round(this.s.x / step) * step + 'px';
      d.el.style.top = Math.round(this.s.y / step) * step + 'px';
    }
  }
}
