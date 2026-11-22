import * as THREE from 'three';

// Floating sound words ("purr", "hop") and the little markers that show which cat each player is.
// Letter pairs that make one sound are tinted so they read as a single chunk.
const CHUNKS = ['urr', 'sh', 'ch', 'th', 'ck', 'ng', 'ee', 'oo', 'ow', 'ew', 'ff', 'ss', 'll'];

function markup(word) {
  let out = '';
  for (let i = 0; i < word.length; ) {
    const c = CHUNKS.find((d) => word.startsWith(d, i));
    if (c) {
      out += `<b>${c}</b>`;
      i += c.length;
    } else {
      out += word[i++];
    }
  }
  return out;
}

export class Labels {
  constructor() {
    this.el = document.getElementById('labels');
    this.words = [];
    this.dots = [];
    this.v = new THREE.Vector3();
  }

  say(pos, text, { plain = false, life = 1.7 } = {}) {
    const el = document.createElement('div');
    el.className = 'word';
    el.innerHTML = plain ? text : markup(text);
    this.el.appendChild(el);
    this.words.push({ el, pos: pos.clone(), age: 0, life, text });
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

  place(el, pos, camera) {
    this.v.copy(pos).project(camera);
    el.style.left = ((this.v.x + 1) / 2) * innerWidth + 'px';
    el.style.top = ((1 - this.v.y) / 2) * innerHeight + 'px';
  }

  update(dt, camera) {
    for (const w of this.words) {
      w.age += dt;
      w.pos.y += dt * 0.35;
      const k = w.age / w.life;
      const pop = Math.min(1, w.age * 7);
      w.el.style.opacity = k > 0.7 ? Math.max(0, (1 - k) / 0.3) : 1;
      this.place(w.el, w.pos, camera);
      w.el.style.transform = `translate(-50%, -100%) scale(${0.5 + 0.5 * pop})`;
      if (k >= 1) w.el.remove();
    }
    this.words = this.words.filter((w) => w.age < w.life);
    for (const d of this.dots) {
      d.show = Math.max(0, d.show - dt);
      d.el.style.opacity = d.show > 0 ? 1 : 0;
      this.place(d.el, d.pos, camera);
    }
  }
}
