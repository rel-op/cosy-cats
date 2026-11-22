// Runs inside the page (capture mode) and plays the trailer shot by shot.
(() => {
  const G = window.game, { mama, cats, world, day } = G;
  const dev = (id, raw) => G.input.virtual(id, raw);
  const O = (id) => world.regions[id].origin;
  const cap = document.createElement('div');
  cap.id = 'caption';
  document.body.appendChild(cap);
  const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
  const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };

  function place(cat, x, y, z, yaw) {
    if (cat.state === 'ride') G.dismount(cat);
    cat.setState('free');
    cat.asleep = false;
    cat.teleport(x, y, z);
    cat.grounded = true;
    cat.support = cat.visY = y;
    if (yaw !== undefined) cat.yaw = yaw;
    cat.trail.length = 0;
    if (cat.held) { const it = cat.held; cat.held = null; it.heldBy = null; }
    cat.ai = undefined;
  }
  function family(region, x, y, z, yaw = 0.8) {
    world.setRegion(region);
    place(mama, x, y, z, yaw);
    cats.slice(1).forEach((k, i) => place(k, x - Math.sin(yaw) * (0.8 + i * 0.55) + Math.cos(yaw) * (i % 2 ? 0.3 : -0.3), y, z - Math.cos(yaw) * (0.8 + i * 0.55), yaw));
    G.labels.clear();
    G.fx.clear();
    G.sleep.rested = false;
    G.debug.cam = null;
    G.snap();
    dev('v1', {});
  }
  function kittens(coats) {
    const api = G.menu.api;
    while (cats.length - 1 > coats.length) api.removeKitten();
    while (cats.length - 1 < coats.length) api.addKitten();
    coats.forEach((id, i) => api.setCoat(i + 1, id));
    G.fx.clear();
  }
  const toward = (cat, x, z, speed = 1) => { const dx = x - cat.pos.x, dz = z - cat.pos.z, d = Math.hypot(dx, dz) || 1; const wx = dx / d, wz = dz / d; return { x: (wx - wz) * 0.7071 * speed, y: (-wx - wz) * 0.7071 * speed }; };
  // walk a cat along points; returns true once finished
  function walk(id, cat, r) {
    if (r.i >= r.pts.length) { dev(id, {}); return true; }
    const [x, z, hold] = r.pts[r.i];
    if (Math.hypot(x - cat.pos.x, z - cat.pos.z) < (hold ? 0.12 : 0.3)) { r.i++; return walk(id, cat, r); }
    dev(id, toward(cat, x, z, r.speed || 1));
    return false;
  }
  const route = (pts, speed) => ({ pts, i: 0, speed });
  let once = {};
  const at = (key, t, when, fn) => { if (t >= when && !once[key]) { once[key] = true; fn(); } };
  const tap = (id, btn) => { dev(id, { [btn]: true }); };

  const shots = [
    { // 1. title over the waking street
      dur: 4.6, caption: 'cosy cats', big: true,
      setup() { kittens(['cream', 'grey']); G.api_setMama('ginger'); day.set(0.03); family('outside', 1.8, 0.12, -8.6); },
      tick(t) { G.debug.cam = { x: lerp(-30, -8, ease(t / 4.6)), y: 0.5, z: 1.5, ppu: 15 }; },
    },
    { // 2. out through the cat flap
      dur: 7.2, caption: 'be a cat',
      setup() { day.set(0.06); const [ox, oz] = O('home'); family('home', ox + 4.4, 0, oz + 3.4, -1.2); this.a = route([[ox + 1.4, oz + 2.9], [ox - 1, oz + 2.9]]); this.b = route([[3.2, -6.4], [3.5, -3.6], [3.4, -0.4], [3.6, 2.4]], 0.85); },
      tick(t) { if (world.region === 'home') { if (t > 0.9) walk('v1', mama, this.a); } else if (!G.trans) walk('v1', mama, this.b); },
    },
    { // 3. through the gap in the fence
      dur: 6.0, caption: "explore the neighbours' gardens",
      setup() { day.set(0.14); family('outside', -6.4, 0, 5.0, -1.4); this.r = route([[-10.6, 5.95], [-14.2, 5.95], [-17.2, 3.4], [-19.6, 1.4]], 0.9); },
      tick() { walk('v1', mama, this.r); },
    },
    { // 4. up the oak and into the treehouse
      dur: 8.4,
      setup() { day.set(0.2); family('outside', -24 + 6.2, 0, 0.6, -1.9); this.a = route([[-24 + 3.25, -1.0]]); this.c = route([[-24 + 1.7, -3.05], [-24 - 1.5, -3.05]], 0.8); const [ox, oz] = O('treehouse'); this.d = route([[ox + 2.4, oz + 2.5]], 0.8); },
      tick() {
        if (world.region === 'treehouse') { if (!G.trans) walk('v1', mama, this.d); return; }
        if (mama.pos.y > 3.1 && mama.state === 'free') { if (!this.rest) this.rest = 1; if (this.rest++ < 30) dev('v1', {}); else walk('v1', mama, this.c); } else if (walk('v1', mama, this.a) || mama.state === 'climb') dev('v1', toward(mama, -26, -1.0));
      },
    },
    { // 5. over the bridge in the pond garden
      dur: 6.0,
      setup() { day.set(0.3); family('outside', -48 - 5.6, 0, 2.2, 1.57); this.r = route([[-48 + 5.4, 2.2], [-48 + 6.6, 0.2]], 0.8); },
      tick() { walk('v1', mama, this.r); },
    },
    { // 6. a snack somebody left out
      dur: 5.0, caption: 'find a snack',
      setup() { day.set(0.36); family('outside', 24 - 1.0, 0, -7.6, -2.2); this.r = route([[24 - 3.75, -9.85, true]], 0.8); },
      tick(t) { if (mama.state === 'eat') return dev('v1', {}); if (walk('v1', mama, this.r)) at('eat', t, 0, () => tap('v1', 'act')); },
    },
    { // 7. dusk in the wild garden, and into the hollow log
      dur: 7.6,
      setup() { day.set(0.8); family('outside', 48 + 4.6, 0, -1.6, -1.2); this.a = route([[48 + 1.4, -0.6], [48 + 1.2, 3.6], [48 + 0.9, 5.0], [48 - 2, 5.0]], 0.85); const [ox, oz] = O('burrow'); this.b = route([[ox + 2.3, oz + 1.6]], 0.7); },
      tick() { if (world.region === 'burrow') { if (!G.trans) walk('v1', mama, this.b); } else walk('v1', mama, this.a); },
    },
    { // 8. choosing cats
      dur: 6.6, caption: 'choose your cats',
      setup() { day.set(0.1); family('outside', 2.4, 0.12, -8.2, 0.8); cats.slice(1).forEach((k, i) => place(k, 1.3 + i * 0.75, 0.12, -7.3 - i * 0.15, 0.8)); },
      tick(t) {
        const api = G.menu.api;
        at('open', t, 0.3, () => G.menu.toggle(true));
        ['grey', 'tuxedo', 'calico', 'siamese', 'black'].forEach((id, i) => at('m' + i, t, 0.9 + i * 0.5, () => { api.setCoat(0, id); G.menu.row = 0; G.menu.draw(); }));
        at('k1', t, 3.5, () => { api.setCoat(1, 'tortie'); G.menu.row = 1; G.menu.draw(); });
        at('k2', t, 4.0, () => { api.setCoat(2, 'white'); G.menu.row = 2; G.menu.draw(); });
        at('add', t, 4.6, () => { api.addKitten(); api.setCoat(3, 'ginger'); G.menu.row = 4; G.menu.draw(); });
        at('add2', t, 5.2, () => { api.addKitten(); api.setCoat(4, 'blue'); G.menu.draw(); });
        at('close', t, 6.1, () => G.menu.toggle(false));
      },
    },
    { // 9. two players on the trampoline
      dur: 6.4, caption: 'play together',
      setup() { day.set(0.25); kittens(['tortie', 'white']); family('outside', -13.2, 0, 5.2, -1.57); place(cats[1], -13.4, 0, 6.3, -1.57); place(cats[2], -12.0, 0, 6.8, -1.57); },
      tick(t) {
        at('join', t, 0.05, () => tap('v2', 'meow'));
        if (t < 0.2) return;
        const k = cats[1];
        for (const [id, c, tz] of [['v1', mama, 5.2], ['v2', k, 5.9]]) {
          if (c.pos.y < 0.5 && c.grounded) dev(id, toward(c, -16.6, tz));
          else if (c.grounded && c.pos.y > 0.5) dev(id, { ...toward(c, -16.6 + (id === 'v1' ? 0.3 : -0.5), tz, 0.5), jump: true });
          else dev(id, toward(c, -16.6 + (id === 'v1' ? 0.3 : -0.5), tz, 0.35));
        }
      },
      end() { dev('v2', null); },
    },
    { // 10. evening: home to the cardboard box
      dur: 8.4, caption: 'find somewhere cosy',
      setup() { kittens(['cream', 'grey', 'tuxedo']); G.api_setMama('ginger'); day.set(0.97); family('outside', 3.8, 0, 9.6, 3.1); this.a = route([[3.5, 6.2], [3.3, 2.6], [3.6, -0.8], [3.3, -5.2], [5.0, -6.7], [5.0, -9.5]], 0.8); const [ox, oz] = O('box'); this.b = route([[ox + 1.75, oz + 1.7, true]], 0.6); },
      tick() { if (world.region === 'box') { if (!G.trans) walk('v1', mama, this.b); } else walk('v1', mama, this.a); },
    },
    { // 11. the nap
      dur: 13.8,
      setup() { day.set(0.97); const [ox, oz] = O('box'); family('box', ox + 1.75, 0.0, oz + 1.7, 0.6); cats.slice(1).forEach((k, i) => place(k, ox + 0.8 + i * 0.7, 0, oz + 0.9 + (i % 2) * 1.3, 0.8)); },
      tick(t) { at('curl', t, 0.5, () => tap('v1', 'act')); if (t > 0.6) dev('v1', {}); },
    },
    { // 12. morning
      dur: 4.6, caption: 'cosy cats', big: true,
      setup() { day.set(0.03); family('outside', 2.6, 0.12, -9.0, 0.6); this.r = route([[3.2, -6.4], [3.5, -3.8], [3.4, -1.0]], 0.7); },
      tick(t) { G.debug.cam = { x: lerp(1.5, 0.5, ease(t / 4.6)), y: 0.5, z: lerp(-5, -3.5, ease(t / 4.6)), ppu: lerp(30, 20, ease(t / 4.6)) }; walk('v1', mama, this.r); },
    },
  ];
  G.api_setMama = (id) => G.menu.api.setCoat(0, id);

  let cur = -1, start = 0;
  const marks = [];
  const starts = [];
  let acc = 0;
  for (const s of shots) { starts.push(acc); acc += s.dur; }
  window.director = {
    fps: 30,
    total: acc,
    bounds: shots.map((s, i) => [starts[i], s.dur]),
    marks,
    begin() { G.start(); tap('v1', 'meow'); G.step(1 / 60); dev('v1', {}); G.step(1 / 60); G.audio.log.length = 0; this.t0 = G.audio.time; return this.t0; },
    // advance to frame n and draw it
    frame(n) {
      const t = n / this.fps;
      let i = shots.length - 1;
      while (i > 0 && starts[i] > t) i--;
      if (i !== cur) {
        if (cur >= 0 && shots[cur].end) shots[cur].end();
        cur = i; start = starts[i]; once = {};
        if (G.menu.open) G.menu.toggle(false);
        shots[i].setup.call(shots[i]);
        marks.push({ shot: i, t: G.audio.time - this.t0, loops: {} });
        cap.textContent = shots[i].caption || '';
        cap.className = shots[i].big ? 'big' : '';
      }
      const s = shots[i];
      for (let k = 0; k < 2; k++) { s.tick.call(s, t - start + k / 60); G.step(1 / 60); }
      // remember how loud each background loop got during this shot
      const m = marks[marks.length - 1];
      for (const [name, l] of G.audio.loops) m.loops[name] = Math.max(m.loops[name] || 0, l.vol);
      // short dips to black between shots
      const local = t - start, left = s.dur - local, u = G.pixel.uniforms.uFade;
      const dip = Math.max(0, 1 - local / 0.2, 1 - left / 0.2);
      if (dip > 0 && !(i === 0 && local < 0.2)) { u.value = Math.max(u.value, dip); G.pixel.uniforms.uFadeColor.value.set('#15131c'); } else if (!G.sleep.active) u.value = 0;
      if (G.sleep.active) G.pixel.uniforms.uFadeColor.value.set('#10163a');
      cap.style.opacity = Math.max(0, Math.min(1, local / 0.3, left / 0.3)) * (s.caption && !s.big && local > s.dur - 0.5 ? 1 : 1);
      G.render();
      return t >= this.total;
    },
    log() { return { t0: this.t0, total: this.total, marks, events: G.audio.log }; },
  };
})();
