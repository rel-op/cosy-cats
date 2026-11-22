import * as THREE from 'three';
import { toon } from './build.js';
import { C } from './props.js';
import { Cat, coatById } from './cat.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Ambient life. None of it needs anything from the player; most of it barely notices the cats.
export function buildCritters(W, out, rand) {
  const sph = new THREE.SphereGeometry(1, 8, 6);
  const part = (g, geo, color, x, y, z, sx = 1, sy = sx, sz = sx) => {
    const m = new THREE.Mesh(geo, typeof color === 'string' ? toon(color) : color);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const nearest = (cats, p) => {
    let best = 99;
    for (const c of cats) best = Math.min(best, Math.hypot(c.pos.x - p.x, c.pos.z - p.z) + Math.abs(c.pos.y - p.y) * 0.5);
    return best;
  };

  // ---- small birds that hop about and flit up to a perch when a cat comes close ----
  const birds = [];
  const flock = (x, z, perch, color) => {
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      part(g, sph, color, 0, 0.09, 0, 0.07, 0.07, 0.1);
      part(g, sph, color, 0, 0.16, 0.07, 0.055);
      part(g, sph, C.orange, 0, 0.15, 0.13, 0.02, 0.015, 0.03);
      part(g, sph, C.cream, 0, 0.07, 0.03, 0.055, 0.05, 0.07);
      const wl = part(g, sph, color, -0.07, 0.11, 0, 0.07, 0.015, 0.06);
      const wr = part(g, sph, color, 0.07, 0.11, 0, 0.07, 0.015, 0.06);
      const home = new THREE.Vector3(x + (rand() - 0.5) * 1.6, 0, z + (rand() - 0.5) * 1.6);
      g.position.copy(home);
      out.add(g);
      birds.push({ g, wl, wr, home, perch: new THREE.Vector3(perch[0] + (i - 1) * 0.3, perch[1], perch[2] + (i - 1) * 0.12), state: 'ground', t: rand() * 3, hop: 0, from: new THREE.Vector3(), k: 0 });
    }
  };
  flock(8.2, -1.4, [9, 1.36, -3], '#8a6a4a');
  flock(24.5, 5.6, [30.5, 2.6, 2], '#6f6a66');
  flock(51.5, -2.2, [50, 0.97, -4], '#8a6a4a');
  flock(-45.5, 8.4, [-42, 0.9, 7.5], '#5f6f7a');
  W.updaters.push((dt, t, cats) => {
    if (W.region !== 'outside') return;
    for (const b of birds) {
      b.t -= dt;
      const p = b.g.position;
      if (b.state === 'ground') {
        if (nearest(cats, p) < 2.0) { b.state = 'up'; b.k = 0; b.from.copy(p); W.emit('flutter', p); }
        else if (b.t <= 0) { b.t = 0.5 + rand() * 2; b.hop = 0.25; b.g.rotation.y += (rand() - 0.5) * 2; p.x = b.home.x + (rand() - 0.5) * 1.4; p.z = b.home.z + (rand() - 0.5) * 1.4; }
        b.hop = Math.max(0, b.hop - dt);
        p.y = Math.sin((b.hop / 0.25) * Math.PI) * 0.08;
        b.g.rotation.x = Math.sin(t * 6 + b.home.x) > 0.8 ? 0.6 : 0;
        b.wl.rotation.z = b.wr.rotation.z = 0;
      } else if (b.state === 'up' || b.state === 'down') {
        b.k = Math.min(1, b.k + dt * 1.1);
        const a = b.state === 'up' ? b.from : b.perch, c = b.state === 'up' ? b.perch : b.home;
        const e = b.k * b.k * (3 - 2 * b.k);
        p.lerpVectors(a, c, e);
        p.y += Math.sin(e * Math.PI) * 1.2;
        b.g.rotation.set(0, Math.atan2(c.x - a.x, c.z - a.z), 0);
        const f = Math.sin(t * 34) * 1.1;
        b.wl.rotation.z = f; b.wr.rotation.z = -f;
        if (b.k >= 1) { b.state = b.state === 'up' ? 'perch' : 'ground'; b.t = 5 + rand() * 4; }
      } else {
        b.wl.rotation.z = b.wr.rotation.z = 0;
        b.g.rotation.y += Math.sin(t * 2 + b.home.z) * dt * 0.6;
        if (b.t <= 0 && nearest(cats, b.home) > 4.5) { b.state = 'down'; b.k = 0; }
      }
    }
  });

  // ---- a flock of doves: run at them and they all go up together, and come down somewhere else ----
  // Sometimes that is just across the lawn and sometimes it is gardens away, so following them is a game
  // that starts and stops by itself. After a few goes they sit somewhere high for a while.
  {
    const N = 7, doves = [], white = '#f6f2ea', grey = '#b4b9c4';
    for (let i = 0; i < N; i++) {
      const g = new THREE.Group();
      part(g, sph, white, 0, 0.12, 0, 0.095, 0.09, 0.14);
      part(g, sph, white, 0, 0.21, 0.1, 0.07);
      part(g, sph, C.orange, 0, 0.2, 0.175, 0.022, 0.018, 0.035);
      part(g, sph, grey, 0, 0.11, -0.14, 0.06, 0.02, 0.09);
      part(g, sph, C.dark, 0.04, 0.225, 0.14, 0.012); part(g, sph, C.dark, -0.04, 0.225, 0.14, 0.012);
      const wl = part(g, sph, grey, -0.1, 0.15, -0.01, 0.1, 0.02, 0.085), wr = part(g, sph, grey, 0.1, 0.15, -0.01, 0.1, 0.02, 0.085);
      out.add(g);
      const a = (i / N) * 6.28 + rand(), r = 0.25 + rand() * 0.75;
      doves.push({ g, wl, wr, ox: Math.cos(a) * r, oz: Math.sin(a) * r, t: rand() * 2, hop: 0, k: 1, wait: 0, dur: 1, arc: 1, from: new THREE.Vector3(), to: new THREE.Vector3(), ph: rand() * 6 });
    }
    // somewhere high to sit: the washing line, the swing frame, the scarecrow's arms, the greenhouse ridge
    const perches = [[[-6.4, 1.87, 8.17], [0.4, 1.87, 8.17]], [[-31.6, 2.37, 3.45], [-31.6, 2.37, 5.35]], [[29.75, 1.36, 2.0], [31.25, 1.36, 2.0]], [[12.6, 3.35, -3.8], [17.2, 3.35, -3.8]]];
    let lawns = null; // open grass to land on, found once the gardens are built
    const findLawns = () => {
      lawns = [];
      for (let x = -57; x <= 57; x += 1.9) for (let z = -8.2; z <= 9.8; z += 1.8) {
        if (W.supportAt(x, z, 0.3, 0) > 0 || W.blockedAt(x, 0.02, z, 1.25, 1.2)) continue;
        if (W.ponds.some((p) => ((x - p.x) / (p.rx + 1.2)) ** 2 + ((z - p.z) / (p.rz + 1.2)) ** 2 < 1)) continue;
        lawns.push({ x, z });
      }
    };
    const f = { x: -1.6, z: 4.8, mode: 'ground', flushes: 0, calm: 0, rest: 0, grace: 0, perch: null };
    const send = (d, x, y, z, speed) => {
      d.from.copy(d.g.position); d.to.set(x, y, z);
      const dist = d.from.distanceTo(d.to);
      d.dur = dist / speed + 0.5; d.arc = Math.min(4.2, 1.2 + dist * 0.13); d.k = 0; d.wait = rand() * 0.35;
    };
    const land = (spot) => { f.x = spot.x; f.z = spot.z; f.mode = 'fly'; f.perch = null; for (const d of doves) send(d, spot.x + d.ox, 0, spot.z + d.oz, 7.5); };
    const roost = () => {
      const p = perches.map((q) => ({ q, d: Math.hypot((q[0][0] + q[1][0]) / 2 - f.x, (q[0][2] + q[1][2]) / 2 - f.z) })).sort((a, b) => a.d - b.d)[rand() < 0.7 ? 0 : 1].q;
      f.mode = 'fly'; f.perch = p; f.x = (p[0][0] + p[1][0]) / 2; f.z = (p[0][2] + p[1][2]) / 2;
      doves.forEach((d, i) => { const k = (i + 0.5) / N; send(d, p[0][0] + (p[1][0] - p[0][0]) * k, p[0][1], p[0][2] + (p[1][2] - p[0][2]) * k, 7.5); });
    };
    const pick = (cats, lo, hi) => {
      const ok = lawns.filter((s) => { const d = Math.hypot(s.x - f.x, s.z - f.z); return d >= lo && d <= hi && cats.every((c) => Math.hypot(c.pos.x - s.x, c.pos.z - s.z) > 4.5); });
      return ok.length ? ok[Math.floor(rand() * ok.length)] : null;
    };
    for (const d of doves) d.g.position.set(f.x + d.ox, 0, f.z + d.oz);
    W.doves = { get state() { return { x: f.x, z: f.z, mode: f.mode, flushes: f.flushes, perched: !!f.perch }; }, birds: doves };
    W.updaters.push((dt, t, cats, night) => {
      if (W.region !== 'outside') return;
      if (!lawns) findLawns();
      f.grace -= dt;
      if (f.mode === 'fly' && doves.every((d) => d.k >= 1)) { f.mode = f.perch ? 'perch' : 'ground'; f.grace = 0.8; f.rest = 11 + rand() * 7; }
      if (f.mode === 'ground') {
        f.calm += dt;
        if (f.calm > 40) f.flushes = 0;
        // someone running sets them off from further away than someone creeping
        const startled = f.grace <= 0 && cats.some((c) => c.state !== 'ride' && Math.abs(c.pos.y) < 1.5 && Math.hypot(c.pos.x - f.x, c.pos.z - f.z) < (Math.hypot(c.vx, c.vz) > 2 ? 3.1 : 1.5));
        if (startled || night > 0.75) {
          if (startled) { f.flushes++; f.calm = 0; W.emit('flock', doves[0].g.position); }
          if (f.flushes >= 3 || night > 0.75) roost();
          else land((rand() < 0.6 && pick(cats, 5, 10)) || pick(cats, 13, 34) || pick(cats, 5, 40) || lawns[Math.floor(rand() * lawns.length)]);
        }
      } else if (f.mode === 'perch') {
        f.rest -= dt;
        if (f.rest <= 0 && night < 0.5) { f.flushes = 0; const spot = pick(cats, 3, 12) || pick(cats, 3, 40); if (spot) land(spot); else f.rest = 4; }
      }
      for (const d of doves) {
        const p = d.g.position;
        if (d.k < 1) {
          if ((d.wait -= dt) > 0) continue;
          d.k = Math.min(1, d.k + dt / d.dur);
          const e = d.k * d.k * (3 - 2 * d.k);
          p.lerpVectors(d.from, d.to, e);
          p.y += Math.sin(e * Math.PI) * d.arc + Math.sin(t * 5 + d.ph) * 0.08 * Math.sin(e * Math.PI);
          d.g.rotation.set(0, Math.atan2(d.to.x - d.from.x, d.to.z - d.from.z), 0);
          const flap = Math.sin(t * 26 + d.ph) * 1.15;
          d.wl.rotation.z = flap; d.wr.rotation.z = -flap;
          if (d.k >= 1) d.t = rand() * 1.5;
        } else if (f.mode === 'perch' || (f.mode === 'fly' && f.perch)) {
          d.wl.rotation.z = d.wr.rotation.z = 0;
          d.g.rotation.x = 0;
          d.g.rotation.y += Math.sin(t * 1.7 + d.ph) * dt * 0.5;
        } else {
          // pecking about on the grass
          d.t -= dt;
          if (d.t <= 0) { d.t = 0.6 + rand() * 2.2; d.hop = 0.22; d.g.rotation.y += (rand() - 0.5) * 2.2; d.ox = clamp(d.ox + (rand() - 0.5) * 0.5, -1, 1); d.oz = clamp(d.oz + (rand() - 0.5) * 0.5, -1, 1); }
          d.hop = Math.max(0, d.hop - dt);
          p.x += (f.x + d.ox - p.x) * Math.min(1, dt * 6); p.z += (f.z + d.oz - p.z) * Math.min(1, dt * 6);
          p.y = Math.sin((d.hop / 0.22) * Math.PI) * 0.07;
          d.g.rotation.x = Math.sin(t * 5 + d.ph) > 0.75 ? 0.7 : 0;
          d.wl.rotation.z = d.wr.rotation.z = 0;
        }
      }
    });
  }

  // ---- butterflies over the flower patches ----
  const flies = [];
  const wingGeo = new THREE.CircleGeometry(0.09, 6);
  wingGeo.translate(0.08, 0, 0);
  for (const [x, z, col] of [[9, 1.4, '#ffd24d'], [-8, -7.6, '#ff9ec4'], [-34.3, 8.5, '#ffd24d'], [-56.6, 8.6, '#c9b9ff'], [44, -6.5, '#fff2a8'], [57, 0.2, '#ff9ec4'], [29, -4, '#a6d8ff'], [-13.8, 0.5, '#ffb38a']]) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
    const wl = new THREE.Mesh(wingGeo, mat), wr = new THREE.Mesh(wingGeo, mat);
    wr.scale.x = -1;
    const inner = new THREE.Group();
    inner.add(wl, wr);
    inner.rotation.x = -Math.PI / 2;
    g.add(inner);
    out.add(g);
    flies.push({ g, wl, wr, hx: x, hz: z, ph: rand() * 10, fx: 0, fz: 0, lift: 0, pos: new THREE.Vector3(x, 0.7, z) });
  }
  W.updaters.push((dt, t, cats, night) => {
    if (W.region !== 'outside') return;
    for (const b of flies) {
      let near = false;
      for (const c of cats) {
        const dx = b.pos.x - c.pos.x, dz = b.pos.z - c.pos.z, d = Math.hypot(dx, dz);
        if (d < 1.5 && c.pos.y < 1.2) { near = true; b.fx += (dx / (d + 0.01)) * dt * 8; b.fz += (dz / (d + 0.01)) * dt * 8; }
      }
      b.lift += ((near ? 1.3 : 0) - b.lift) * Math.min(1, dt * 3);
      b.fx *= 1 - Math.min(1, dt * 0.6); b.fz *= 1 - Math.min(1, dt * 0.6);
      const a = t * 0.5 + b.ph, rest = night > 0.6;
      b.pos.set(b.hx + Math.sin(a) * 1.1 + Math.sin(a * 2.3) * 0.4 + b.fx, rest ? 0.36 : 0.75 + Math.sin(a * 3.1) * 0.2 + b.lift, b.hz + Math.cos(a * 0.8) * 1.1 + b.fz);
      b.g.position.lerp(b.pos, Math.min(1, dt * 4));
      b.g.rotation.y = a * 1.7;
      const f = rest ? 0.2 : Math.abs(Math.sin(t * 16 + b.ph)) * 1.2;
      b.wl.rotation.y = -f; b.wr.rotation.y = f;
    }
  });

  // ---- koi in the big pond ----
  const koi = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const col = [C.orange, C.white, '#e8643c', C.orange, '#f2e2c4', '#e8643c'][i];
    part(g, sph, col, 0, 0, 0, 0.09, 0.03, 0.24).castShadow = false;
    const tail = part(g, sph, col, 0, 0, -0.28, 0.07, 0.02, 0.1);
    tail.castShadow = false;
    if (i % 2) part(g, sph, C.white, 0.02, 0.012, 0.05, 0.05, 0.02, 0.08).castShadow = false;
    out.add(g);
    koi.push({ g, tail, ph: i * 1.05, r: 0.45 + (i % 3) * 0.17, sp: 0.25 + (i % 4) * 0.06 });
  }
  W.updaters.push((dt, t) => {
    if (W.region !== 'outside') return;
    for (const k of koi) {
      const a = t * k.sp + k.ph, x = -47.5 + Math.cos(a) * 4.0 * k.r + Math.sin(a * 2.1) * 0.4, z = 2.2 + Math.sin(a) * 2.6 * k.r;
      const nx = -47.5 + Math.cos(a + 0.05) * 4.0 * k.r + Math.sin((a + 0.05) * 2.1) * 0.4, nz = 2.2 + Math.sin(a + 0.05) * 2.6 * k.r;
      k.g.position.set(x, 0.045, z);
      k.g.rotation.y = Math.atan2(nx - x, nz - z);
      k.tail.rotation.y = Math.sin(t * 5 + k.ph) * 0.6;
    }
  });

  // ---- a frog on a lily pad who plops in when a cat gets near ----
  const frog = new THREE.Group();
  part(frog, sph, '#6fae4a', 0, 0.07, 0, 0.1, 0.07, 0.12);
  part(frog, sph, '#6fae4a', 0.05, 0.13, 0.07, 0.035); part(frog, sph, '#6fae4a', -0.05, 0.13, 0.07, 0.035);
  part(frog, sph, C.dark, 0.05, 0.14, 0.095, 0.015); part(frog, sph, C.dark, -0.05, 0.14, 0.095, 0.015);
  const frogHome = new THREE.Vector3(5.2, 0.05, 6.3);
  frog.position.copy(frogHome);
  out.add(frog);
  let frogT = 0, frogJump = 0;
  W.updaters.push((dt, t, cats) => {
    if (W.region !== 'outside') return;
    if (frogT > 0) {
      frogT -= dt;
      if (frogJump > 0) {
        frogJump -= dt;
        const k = 1 - frogJump / 0.45;
        frog.position.set(frogHome.x + k * 0.7, frogHome.y + Math.sin(k * Math.PI) * 0.4, frogHome.z - k * 0.5);
        if (frogJump <= 0) { frog.visible = false; W.emit('plop', frog.position); }
      }
      if (frogT <= 0 && nearest(cats, frogHome) > 3.5) { frog.visible = true; frog.position.copy(frogHome); } else if (frogT <= 0) frogT = 1;
    } else {
      frog.scale.y = 1 + Math.sin(t * 2.2) * 0.06;
      if (nearest(cats, frogHome) < 1.5) { frogT = 9; frogJump = 0.45; }
    }
  });

  // ---- a hedgehog who trundles about the wild garden in the evening ----
  const hog = new THREE.Group();
  part(hog, sph, '#6e5a48', 0, 0.12, 0, 0.16, 0.13, 0.2);
  part(hog, sph, '#c9b08a', 0, 0.08, 0.17, 0.07, 0.06, 0.09);
  part(hog, sph, C.dark, 0, 0.09, 0.26, 0.02);
  for (let i = 0; i < 10; i++) part(hog, new THREE.ConeGeometry(0.03, 0.09, 4), '#4e3e30', Math.cos(i * 1.3) * 0.1, 0.22 + Math.sin(i * 2.1) * 0.02, -0.03 + Math.sin(i * 1.3) * 0.12);
  const hogPath = [[44, 1], [49, -6], [54, -2], [56, 6], [50, 9.5], [45, 7]];
  let hogI = 0;
  hog.position.set(44, 0, 1);
  out.add(hog);
  W.updaters.push((dt, t, cats, night) => {
    if (W.region !== 'outside') return;
    hog.visible = night > 0.15;
    if (!hog.visible) return;
    const p = hog.position, [tx, tz] = hogPath[hogI];
    const d = Math.hypot(tx - p.x, tz - p.z);
    const shy = nearest(cats, p) < 1.1;
    hog.scale.set(1, shy ? 0.85 : 1, shy ? 0.8 : 1);
    if (shy) return;
    if (d < 0.3) hogI = (hogI + 1) % hogPath.length;
    else { p.x += ((tx - p.x) / d) * dt * 0.55; p.z += ((tz - p.z) / d) * dt * 0.55; hog.rotation.y = Math.atan2(tx - p.x, tz - p.z); p.y = Math.abs(Math.sin(t * 9)) * 0.015; }
  });

  // ---- fireflies ----
  const NF = 170;
  const fpos = new Float32Array(NF * 3);
  const fbase = [];
  for (let i = 0; i < NF; i++) fbase.push([-58 + rand() * 116, 0.4 + rand() * 1.5, -9.5 + rand() * 24, rand() * 10]);
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const fmat = new THREE.PointsMaterial({ color: '#fff3a0', size: 4, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
  const fire = new THREE.Points(fgeo, fmat);
  fire.frustumCulled = false;
  fire.renderOrder = 4;
  out.add(fire);
  W.updaters.push((dt, t, cats, night) => {
    fire.visible = night > 0.03 && W.region === 'outside';
    if (!fire.visible) return;
    fmat.opacity = night;
    for (let i = 0; i < NF; i++) {
      const [x, y, z, p] = fbase[i];
      const on = Math.sin(t * 1.3 + p * 7) > -0.2;
      fpos[i * 3] = x + Math.sin(t * 0.4 + p) * 0.9;
      fpos[i * 3 + 1] = on ? y + Math.sin(t * 0.7 + p * 2) * 0.35 : -50;
      fpos[i * 3 + 2] = z + Math.cos(t * 0.33 + p) * 0.9;
    }
    fgeo.attributes.position.needsUpdate = true;
  });

  // ---- specks of pollen and dust drifting in the light ----
  const NM = 110;
  const mpos = new Float32Array(NM * 3);
  const mbase = [];
  for (let i = 0; i < NM; i++) mbase.push([rand() * 30, rand() * 4.5, rand() * 20, rand() * 10]);
  const mgeo = new THREE.BufferGeometry();
  mgeo.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
  const mmat = new THREE.PointsMaterial({ color: '#fff6d2', size: 2, sizeAttenuation: false, transparent: true, opacity: 0.5, depthWrite: false });
  const motes = new THREE.Points(mgeo, mmat);
  motes.frustumCulled = false;
  motes.renderOrder = 4;
  W.scene.add(motes);
  W.updaters.push((dt, t, cats, night) => {
    const r = W.regions[W.region], c = cats[0].pos, wrap = (v, n) => ((v % n) + n) % n;
    if (r.indoor) {
      // indoors: a little dust hanging in the room itself, staying put as the cats move about
      const [ox, oz] = r.origin, { w, d, h } = r.size;
      mmat.opacity = 0.3 * (1 - night);
      for (let i = 0; i < NM; i++) {
        const [x, y, z, p] = mbase[i];
        if (i % 4 || h < 2) { mpos[i * 3 + 1] = -50; continue; }
        mpos[i * 3] = ox + 0.3 + wrap(x * 3.1 + t * 0.05 + Math.sin(t * 0.3 + p) * 0.2, w - 0.6);
        mpos[i * 3 + 1] = 0.3 + wrap(y + t * 0.04, Math.min(h, 2.6) - 0.4);
        mpos[i * 3 + 2] = oz + 0.3 + wrap(z * 2.3 + t * 0.03, d - 0.6);
      }
    } else {
      // outdoors: each speck has its own place in the garden; only the patch of them that is kept moves with her
      mmat.opacity = 0.55 * (1 - night * 0.8);
      for (let i = 0; i < NM; i++) {
        const [x, y, z, p] = mbase[i];
        mpos[i * 3] = c.x + wrap(x + t * 0.25 + Math.sin(t * 0.3 + p) * 0.6 - c.x + 15, 30) - 15;
        mpos[i * 3 + 1] = 0.3 + wrap(y + t * 0.07 + Math.sin(t * 0.5 + p * 3) * 0.2, 4.5);
        mpos[i * 3 + 2] = c.z + wrap(z + t * 0.1 - c.z + 10, 20) - 10;
      }
    }
    mgeo.attributes.position.needsUpdate = true;
  });

  // ---- next door's cat, asleep on the wall as usual ----
  const napper = new Cat('mama', coatById('grey'), 5);
  napper.pos.set(12, 1.3, -6);
  napper.support = 1.3;
  napper.yaw = 0.4;
  napper.state = 'curl';
  napper.stateTime = 5;
  napper.asleep = true;
  out.add(napper.group);
  W.updaters.push((dt, t) => { if (W.region === 'outside') napper.animate(dt, t); });
}
