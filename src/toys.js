import * as THREE from 'three';
import { Builder, toon, tint } from './build.js';
import { C } from './props.js';

// Things in the gardens that do something when a cat stands on them, bumps them or bats them.
// None of them is needed for anything: each just answers straight away, as often as she likes.
//
//   W.switches   things the "do" button (or a tap) works: { region, x, y, z, r, ok(cat), press(cat) }
//   W.pois       places worth a kitten showing off: { region, x, y, z, stop }
//   W.landed     called by the game when a cat lands from a jump or a fall
//   W.seesaw     what a playmate needs to know to come and sit on the other end
//   W.spray      where the sprinkler is and how hard it is running (for its sound)
const G = 14;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function buildToys(W, out) {
  const b = new Builder(W, out, 0, 0);
  const landHooks = [];
  W.switches = [];
  W.pois = [];
  W.landed = (cat, v) => { for (const h of landHooks) h(cat, v); };
  const outside = () => W.region === 'outside';
  const mesh = (parent, geo, color, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, typeof color === 'string' ? toon(color) : color);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const tube = (r, h, seg = 7) => new THREE.CylinderGeometry(r, r, h, seg);

  // ---------------- see-saw: land on one end and whoever is on the other goes up ----------------
  {
    const cx = -18.4, cz = 1.2, H = 0.32, L = 1.5, MAX = 0.17, N = 6, SEG = (L * 2) / N;
    b.block(cx - 0.14, cx + 0.14, 0, H - 0.04, cz - 0.3, cz + 0.3, '#5d7fa8', { climb: false });
    b.lying(cx, H - 0.02, cz, 0.72, 0.05, C.dark, 'z', { seg: 8 });
    const plank = new THREE.Group();
    plank.position.set(cx, H, cz);
    out.add(plank);
    mesh(plank, box(L * 2, 0.07, 0.44), C.yellow, 0, 0.035, 0).receiveShadow = true;
    for (const sx of [-1, 1]) {
      mesh(plank, box(0.46, 0.03, 0.46), C.red, sx * 1.24, 0.085, 0);
      for (const z of [-0.13, 0.13]) mesh(plank, box(0.04, 0.26, 0.04), '#5d7fa8', sx * 0.86, 0.2, z);
      mesh(plank, box(0.045, 0.045, 0.34), '#5d7fa8', sx * 0.86, 0.34, 0);
    }
    const segs = [];
    for (let i = 0; i < N; i++) { const xc = -L + SEG * (i + 0.5); segs.push({ xc, c: b.solid(cx + xc - SEG / 2, cx + xc + SEG / 2, 0, H, cz - 0.22, cz + 0.22) }); }
    const s = { th: MAX, w: 0, riders: [] };
    const top = (x) => H + 0.07 + Math.sin(s.th) * segs[clamp(Math.floor((x - cx + L) / SEG), 0, N - 1)].xc;
    const on = (c) => (c.state === 'free' || c.state === 'curl') && c.grounded && Math.abs(c.pos.z - cz) < 0.27 && Math.abs(c.pos.x - cx) < L + 0.05 && Math.abs(c.pos.y - top(c.pos.x)) < 0.14;
    const weigh = (c) => c.weight + c.riders.length * 0.45;
    const set = () => { plank.rotation.z = s.th; for (const g of segs) g.c.y1 = H + 0.07 + Math.sin(s.th) * g.xc; };
    set();
    W.updaters.push((dt, t, cats) => {
      if (!outside()) return;
      let torque = 0;
      s.riders = cats.filter(on);
      for (const c of s.riders) torque -= weigh(c) * (c.pos.x - cx);
      s.w = clamp(s.w + (torque * 9 - s.w * 3.5) * dt, -3.2, 3.2);
      s.th += s.w * dt;
      if (Math.abs(s.th) > MAX) { if (Math.abs(s.w) > 0.8) W.emit('clunk', plank.position); s.th = Math.sign(s.th) * MAX; s.w = 0; }
      set();
      // someone curled up on it doesn't walk, so carry them
      for (const c of s.riders) if (c.state === 'curl') { c.pos.y = top(c.pos.x); c.support = c.pos.y; }
      // the plank can rise faster than a cat it has just flung: keep her on top of it, not inside it
      for (const c of cats) {
        if (c.state !== 'free' || c.grounded || c.vy < 0 || Math.abs(c.pos.z - cz) > 0.22 || Math.abs(c.pos.x - cx) > L) continue;
        const y = top(c.pos.x);
        if (c.pos.y < y && c.pos.y > y - 0.45) c.pos.y = y + 0.001;
      }
    });
    landHooks.push((cat, v) => {
      if (!outside() || v < 3) return;
      const dx = cat.pos.x - cx;
      if (Math.abs(cat.pos.z - cz) > 0.3 || Math.abs(dx) > L + 0.1 || Math.abs(dx) < 0.4 || Math.abs(cat.pos.y - top(cat.pos.x)) > 0.25) return;
      const side = Math.sign(dx);
      s.w = -side * 3.2; // this end comes down hard
      let flung = false;
      for (const o of s.riders) {
        if (o === cat || Math.sign(o.pos.x - cx) === side || Math.abs(o.pos.x - cx) < 0.4) continue;
        // a heavy cat sends a light one high; a light one barely lifts a heavy one, so the bouncing dies away by itself
        const up = Math.min(8.6, v * Math.pow(weigh(cat) / weigh(o), 0.75) * 0.85);
        if (up < 1.8) continue;
        if (o.state === 'curl') o.uncurl();
        o.vy = up;
        o.grounded = false;
        o.squash = -0.8;
        flung = true;
        W.emit('fling', o.pos, o);
      }
      if (!flung) W.emit('clunk', cat.pos);
    });
    W.seesaw = { cx, cz, L, top, side: (c) => (on(c) ? Math.sign(c.pos.x - cx) || 1 : 0) };
    W.pois.push({ region: 'outside', x: cx - 1.9, y: 0, z: cz, stop: 0.5 });
  }

  // ---------------- swings: hop on, and anyone walking into it gives it a push ----------------
  function swing({ px, py, pz, len, dir, build, foot, top, bottom, sitY }) {
    const arm = new THREE.Group(), axis = new THREE.Vector3(-dir.z, 0, dir.x), S = new THREE.Vector3(), restY = py - len;
    arm.position.set(px, py, pz);
    out.add(arm);
    build(arm);
    const col = b.solid(px - foot, px + foot, bottom, top, pz - foot, pz + foot, { climb: false });
    const s = { a: 0, w: 0, rider: null, bumpT: 0, creakT: 0, pump: 0, lastW: 0 };
    const seatAt = () => S.set(px + dir.x * len * Math.sin(s.a), py - len * Math.cos(s.a), pz + dir.z * len * Math.sin(s.a));
    const calm = () => !s.rider && Math.abs(s.a) < 0.1 && Math.abs(s.w) < 0.25;
    const api = {
      sit(cat) {
        if (s.rider || cat.state !== 'free') return;
        s.rider = cat;
        cat.seat = api;
        cat.setState('sit');
        cat.vx = cat.vz = cat.vy = 0;
        cat.grounded = true;
        if (Math.abs(s.w) < 0.9) s.w = 0.9 * (Math.sign(s.w) || 1);
        W.emit('swing', seatAt(), cat);
      },
      // hop is true when she jumps off, which carries the swing's speed with her
      release(cat, hop = false) {
        if (s.rider !== cat) return;
        seatAt();
        s.rider = null;
        cat.seat = null;
        cat.setState('free');
        cat.pos.set(S.x, Math.max(0, S.y + sitY), S.z);
        cat.grounded = false;
        const v = s.w * len;
        cat.vx = dir.x * v * Math.cos(s.a);
        cat.vz = dir.z * v * Math.cos(s.a);
        cat.vy = (hop ? 3.6 : 1.2) + Math.max(0, v * Math.sin(s.a));
      },
      // while someone is on: any push of the stick pumps it higher
      ride(cat, push) { s.pump = push; },
    };
    W.updaters.push((dt, t, cats) => {
      if (!outside()) return;
      s.bumpT -= dt; s.creakT -= dt;
      const amp = Math.sqrt(s.a * s.a + (s.w * s.w * len) / G);
      if (s.rider) {
        const want = s.pump > 0.4 ? 0.95 : 0.32;
        if (amp < want) s.w += (Math.sign(s.w) || 1) * (s.pump > 0.4 ? 1.5 : 0.7) * dt;
      }
      s.w += (-(G / len) * Math.sin(s.a) - s.w * (s.rider ? 0.1 : 0.5)) * dt;
      s.a += s.w * dt;
      if (Math.abs(s.a) > 1.05) { s.a = Math.sign(s.a) * 1.05; s.w = 0; }
      if (s.w * s.lastW < 0 && amp > 0.25 && s.creakT <= 0) { s.creakT = 0.9; W.emit('creak', seatAt()); }
      s.lastW = s.w;
      seatAt();
      arm.quaternion.setFromAxisAngle(axis, s.a);
      // a cat walking into it pushes it away
      for (const c of cats) {
        if (c === s.rider || c.state !== 'free' || s.bumpT > 0) continue;
        if (c.pos.y > S.y + (top - restY) || c.pos.y + c.height < S.y + (bottom - restY)) continue;
        const dx = c.pos.x - clamp(c.pos.x, S.x - foot, S.x + foot), dz = c.pos.z - clamp(c.pos.z, S.z - foot, S.z + foot);
        if (Math.hypot(dx, dz) > c.radius + 0.07) continue;
        const away = Math.sign((S.x - c.pos.x) * dir.x + (S.z - c.pos.z) * dir.z) || Math.sign(c.vx * dir.x + c.vz * dir.z) || 1;
        const shove = clamp((Math.hypot(c.vx, c.vz) * 1.15) / len, 0.55, 2.3);
        if (s.w * away < shove) { s.w = away * shove; s.bumpT = 0.35; if (s.creakT <= 0) { s.creakT = 0.9; W.emit('creak', S); } }
      }
      // at rest it is something solid to walk into, or to land on
      const still = calm();
      col.y0 = still ? bottom : -9;
      col.y1 = still ? top : -9;
      const r = s.rider;
      if (r) {
        if (r.state !== 'sit') { s.rider = null; r.seat = null; return; }
        r.pos.set(S.x, S.y + sitY, S.z);
        r.support = 0;
        r.yaw = Math.atan2(dir.x, dir.z);
        r.group.position.copy(r.pos);
        r.group.rotation.y = r.yaw;
        r.pivot.rotation.x -= s.a * 0.8;
      }
    });
    landHooks.push((cat) => {
      if (outside() && calm() && cat.state === 'free' && Math.abs(cat.pos.x - px) < foot + 0.05 && Math.abs(cat.pos.z - pz) < foot + 0.05 && Math.abs(cat.pos.y - top) < 0.15) api.sit(cat);
    });
    W.switches.push({ region: 'outside', x: px, y: 0, z: pz, r: 1.25, poi: true, ok: (cat) => !s.rider && cat.pos.y < 0.9, press: (cat) => api.sit(cat) });
    return api;
  }
  // the swing set next door: a plank seat on two ropes
  swing({
    px: -31.6, py: 2.3, pz: 4.4, len: 1.7, dir: { x: 1, z: 0 }, foot: 0.3, bottom: 0.5, top: 0.64, sitY: 0.04,
    build(arm) {
      mesh(arm, box(0.34, 0.06, 0.7), C.red, 0, -1.7, 0);
      for (const z of [-0.3, 0.3]) mesh(arm, tube(0.016, 1.7, 4), C.hay, 0, -0.85, z);
    },
  });
  // an old tyre on a rope, hung from a bare old tree in the overgrown garden
  {
    const tx = 41.0, tz = 6.4, px = 42.52, py = 2.72, pz = 7.28, d = { x: -0.5, z: 0.866 };
    b.solid(tx - 0.3, tx + 0.3, 0, 3.1, tz - 0.3, tz + 0.3);
    b.cyl(tx, 0, 3.1, tz, 0.26, 0.4, C.barkD, { seg: 9 });
    b.cyl(tx, 3.1, 3.16, tz, 0.24, 0.24, C.woodL, { seg: 9 });
    b.beam([tx, 2.48, tz], [tx + 2.0, 2.8, tz + 1.15], 0.12, C.barkD, { seg: 7 });
    b.beam([tx, 1.9, tz], [tx - 0.9, 2.5, tz - 0.3], 0.08, C.barkD, { seg: 6 });
    b.beam([tx + 1.1, 2.66, tz + 0.63], [tx + 1.5, 3.2, tz + 0.2], 0.05, C.barkD, { seg: 5 });
    for (const [x, y, z, r] of [[-0.95, 2.6, -0.3, 0.34], [1.55, 3.3, 0.2, 0.3], [0.1, 0.5, 0.36, 0.3], [-0.2, 1.3, 0.34, 0.24]]) b.ball(tx + x, y, tz + z, r, y > 2 ? '#8fb552' : C.moss, { sy: 0.7, layer: 'sway', sway: 0.3, seg: 7 });
    for (const y of [0.9, 1.7]) b.ball(tx + 0.3, y, tz + 0.12, 0.13, '#d9c9a3', { sy: 0.35, sz: 0.6, seg: 6 }); // bracket fungus
    swing({
      px, py, pz, len: 2.1, dir: d, foot: 0.3, bottom: 0.14, top: 1.1, sitY: -0.22,
      build(arm) {
        const tyre = mesh(arm, new THREE.TorusGeometry(0.34, 0.13, 8, 16), '#32353d', 0, -2.1, 0);
        tyre.rotation.y = Math.atan2(d.x, d.z);
        mesh(arm, tube(0.02, 1.64, 5), C.hay, 0, -0.82, 0);
        mesh(arm, new THREE.TorusGeometry(0.15, 0.022, 5, 10), C.hay, 0, -1.66, 0).rotation.y = Math.atan2(d.x, d.z) + Math.PI / 2;
      },
    });
  }

  // ---------------- the garden tap: bat it and the sprinkler comes on ----------------
  {
    const tx = 16.7, tz = -0.78, sx = 17.9, sz = 2.5, brass = '#c9a24a', steel = '#8a8f98';
    b.block(tx - 0.06, tx + 0.06, 0, 0.8, tz - 0.06, tz + 0.06, C.woodD, { climb: false });
    b.beam([tx, 0.04, tz + 0.08], [tx, 0.62, tz + 0.08], 0.022, steel, { seg: 5 });
    b.beam([tx, 0.62, tz + 0.06], [tx, 0.62, tz + 0.24], 0.032, brass, { seg: 6 });
    b.beam([tx, 0.63, tz + 0.22], [tx, 0.5, tz + 0.22], 0.026, brass, { seg: 6 });
    const handle = new THREE.Group();
    handle.position.set(tx, 0.7, tz + 0.14);
    out.add(handle);
    mesh(handle, box(0.2, 0.035, 0.04), C.red);
    mesh(handle, box(0.04, 0.035, 0.2), C.red);
    mesh(handle, tube(0.015, 0.07, 5), brass, 0, -0.04, 0);
    // the hose, lying where it was dropped
    const hose = [[tx + 0.02, tz + 0.3], [tx - 0.5, tz + 0.9], [tx - 0.7, tz + 1.8], [tx + 0.1, tz + 2.5], [tx + 0.8, tz + 2.6], [sx - 0.1, sz]];
    for (let i = 0; i + 1 < hose.length; i++) b.beam([hose[i][0], 0.035, hose[i][1]], [hose[i + 1][0], 0.035, hose[i + 1][1]], 0.035, '#4f9a58', { seg: 5 });
    b.beam([tx, 0.5, tz + 0.22], [tx + 0.02, 0.035, tz + 0.3], 0.03, '#4f9a58', { seg: 5 });
    b.cyl(sx, 0, 0.04, sz, 0.12, 0.15, steel, { seg: 8 });
    b.cyl(sx, 0.04, 0.24, sz, 0.028, 0.028, steel, { seg: 6 });
    const head = new THREE.Group();
    head.position.set(sx, 0.26, sz);
    out.add(head);
    mesh(head, box(0.26, 0.04, 0.04), brass);
    mesh(head, box(0.05, 0.06, 0.05), brass, 0.13, 0.02, 0);
    mesh(head, box(0.05, 0.06, 0.05), brass, -0.13, 0.02, 0);
    // water
    const N = 80, drops = [], dummy = new THREE.Object3D();
    const rain = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 5, 4), new THREE.MeshBasicMaterial({ color: '#e4f6ff' }), N);
    rain.frustumCulled = false;
    out.add(rain);
    for (let i = 0; i < N; i++) drops.push({ life: 0, x: 0, y: -5, z: 0, vx: 0, vy: 0, vz: 0 });
    // a rainbow in the spray, facing the way you look
    const bow = new THREE.Group(), bowMats = [];
    ['#ff6b6b', '#ffb84d', '#fff06b', '#7bd97b', '#6bb6ff', '#b58cff'].forEach((col, i) => {
      const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false });
      bowMats.push(m);
      bow.add(new THREE.Mesh(new THREE.TorusGeometry(1.75 - i * 0.075, 0.04, 4, 24, Math.PI), m));
    });
    bow.position.set(sx - 0.5, 0, sz - 0.5);
    bow.rotation.y = Math.PI / 4;
    bow.renderOrder = 4;
    out.add(bow);
    // flowers that come up where the water falls, and stay
    const blooms = [];
    const petals = [C.pink, C.yellow, C.white, C.purple, C.red, C.orange];
    for (let i = 0; i < 12; i++) {
      const a = i * 2.4 + 0.7, r = 0.75 + ((i * 7) % 5) * 0.24, g = new THREE.Group();
      g.position.set(sx + Math.cos(a) * r, 0, sz + Math.sin(a) * r);
      mesh(g, tube(0.014, 0.24, 4), C.leafD, 0, 0.12, 0);
      mesh(g, new THREE.SphereGeometry(0.05, 6, 4), C.leaf, 0.04, 0.08, 0).scale.set(1.3, 0.4, 0.8);
      mesh(g, new THREE.SphereGeometry(0.075, 7, 5), petals[i % 6], 0, 0.27, 0).scale.y = 0.7;
      mesh(g, new THREE.SphereGeometry(0.035, 6, 4), i % 6 === 1 ? C.orange : C.yellow, 0, 0.3, 0);
      g.scale.setScalar(0.001);
      g.visible = false;
      out.add(g);
      blooms.push(g);
    }
    const s = { on: false, left: 0, k: 0, grown: 0, emit: 0, spin: 0, turn: 0 };
    W.spray = { x: sx, z: sz, get k() { return s.k; }, get on() { return s.on; } };
    const toggle = (cat) => {
      s.on = !s.on;
      s.left = s.on ? 45 : 0;
      W.emit(s.on ? 'tapOn' : 'tapOff', handle.position, cat);
    };
    W.switches.push({ region: 'outside', x: tx, y: 0, z: tz + 0.35, r: 0.95, poi: true, ok: (cat) => cat.pos.y < 0.5, press: toggle });
    W.updaters.push((dt, t, cats, night) => {
      if (!outside()) return;
      if (s.on && (s.left -= dt) <= 0) { s.on = false; W.emit('tapOff', handle.position); }
      s.k += ((s.on ? 1 : 0) - s.k) * Math.min(1, dt * 2.5);
      s.turn += ((s.on ? 1.6 : 0) - s.turn) * Math.min(1, dt * 8);
      handle.rotation.y = s.turn;
      s.spin += dt * 2.6 * s.k;
      head.rotation.y = s.spin;
      if (s.on) s.grown = Math.min(1, s.grown + dt / 9);
      blooms.forEach((g, i) => {
        const k = clamp(s.grown * 14 - i, 0, 1);
        g.visible = k > 0;
        // pop up a little too far, then settle
        if (k > 0) g.scale.setScalar(k < 1 ? k * k * (3 - 2 * k) * 1.15 : 1 + 0.03 * Math.sin(t * 2 + i));
      });
      const shine = s.k * s.k * (1 - night) * 0.55;
      bow.visible = shine > 0.01;
      bowMats.forEach((m, i) => { m.opacity = shine * (i === 0 || i === 5 ? 0.7 : 1); });
      // drops fly out of both ends of the turning head
      s.emit += dt * 60 * s.k;
      let live = false;
      for (const d of drops) {
        if (d.life <= 0 && s.emit >= 1 && s.k > 0.15) {
          s.emit -= 1;
          const a = s.spin + (Math.random() < 0.5 ? Math.PI : 0) + (Math.random() - 0.5) * 0.5, sp = (2.2 + Math.random() * 1.3) * s.k;
          Object.assign(d, { life: 1, x: sx, y: 0.3, z: sz, vx: Math.cos(a) * sp, vz: -Math.sin(a) * sp, vy: 3.4 + Math.random() * 1.4 });
        }
        if (d.life > 0) {
          d.vy -= G * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
          if (d.y < 0.02) { d.life = 0; d.y = -5; }
          live = true;
        }
      }
      if (s.emit > 3) s.emit = 3;
      if (live || rain.visible) {
        drops.forEach((d, i) => { dummy.position.set(d.x, d.y, d.z); dummy.updateMatrix(); rain.setMatrixAt(i, dummy.matrix); });
        rain.instanceMatrix.needsUpdate = true;
        rain.visible = live;
      }
      if (s.k > 0.5) for (const c of cats) {
        if (c.state !== 'free' || c.pos.y > 0.6 || Math.hypot(c.pos.x - sx, c.pos.z - sz) > 2.0) continue;
        c.wetT = (c.wetT || 0) - dt;
        if (c.wetT <= 0) { c.wetT = 1.3; W.emit('sprinkled', c.pos, c); }
      }
    });
    rain.visible = false;
  }

  // ---------------- a loose stepping stone: stand on it and the water tipper wakes, and the lantern with it ----------------
  {
    const px = -43.6, pz = -3.4, tx = -45.3, tz = -4.7, bamboo = '#b9b45e', bambooD = '#8f9a48';
    const plate = mesh(out, new THREE.CylinderGeometry(0.44, 0.48, 0.08, 9), '#d8d2c2', px, 0.04, pz);
    plate.receiveShadow = true;
    for (let i = 0; i < 8; i++) { const a = i * 0.785 + 0.3; b.ball(px + Math.cos(a) * 0.58, 0.02, pz + Math.sin(a) * 0.58, 0.07 + (i % 3) * 0.015, i % 2 ? C.stoneD : C.stone, { sy: 0.6, seg: 6 }); }
    W.pois.push({ region: 'outside', x: px, y: 0, z: pz, stop: 0.1 });
    // the tipper: a bamboo tube on a pivot that fills, tips, empties and knocks back on its stone
    b.solid(tx - 0.5, tx + 0.8, 0, 0.5, tz - 0.36, tz + 0.2, { climb: false });
    for (const z of [-0.1, 0.1]) b.cyl(tx, 0, 0.56, tz + z, 0.03, 0.035, bambooD, { seg: 6 });
    b.ball(tx - 0.36, 0.1, tz, 0.2, C.stoneD, { sy: 0.9, seg: 7 });
    b.cyl(tx + 0.55, 0, 0.14, tz, 0.3, 0.24, C.stoneD, { seg: 9 });
    b.disc(tx + 0.55, 0.145, tz, 0.24, C.water, { layer: 'water', seg: 9 });
    b.cyl(tx + 0.62, 0, 1.0, tz - 0.28, 0.05, 0.055, bamboo, { seg: 7 });
    for (const y of [0.33, 0.66]) b.cyl(tx + 0.62, y, y + 0.03, tz - 0.28, 0.058, 0.058, bambooD, { seg: 7 });
    b.beam([tx + 0.62, 0.9, tz - 0.28], [tx + 0.5, 0.84, tz - 0.02], 0.026, bambooD, { seg: 6 });
    const pipe = new THREE.Group();
    pipe.position.set(tx, 0.5, tz);
    out.add(pipe);
    const reed = mesh(pipe, tube(0.055, 0.95, 8), bamboo, 0.13, 0, 0);
    reed.rotation.z = Math.PI / 2;
    for (const x of [-0.2, 0.25]) mesh(pipe, tube(0.06, 0.03, 8), bambooD, x, 0, 0).rotation.z = Math.PI / 2;
    const wet = new THREE.MeshBasicMaterial({ color: '#e4f6ff' });
    const stream = mesh(out, tube(0.016, 0.16, 5), wet, tx + 0.5, 0.76, tz - 0.02);
    const pour = mesh(out, tube(0.022, 0.2, 5), wet, tx + 0.56, 0.24, tz);
    stream.castShadow = pour.castShadow = false;
    // the stone lantern beside it glows while the water runs
    const glow = new THREE.Mesh(box(0.5, 0.42, 0.5), new THREE.MeshBasicMaterial({ color: '#ffd98a', transparent: true, opacity: 0 }));
    glow.position.set(-42.4, 1.1, -3.6);
    out.add(glow);
    const lamp = new THREE.PointLight('#ffcf8a', 0, 6, 1.5);
    lamp.position.set(-42.4, 1.5, -3.0);
    out.add(lamp);
    const REST = 0.42, DOWN = -0.5;
    const s = { down: false, linger: 0, phase: 'idle', t: 0, a: REST, lit: 0, y: 0.04 };
    pipe.rotation.z = REST;
    stream.visible = pour.visible = false;
    W.updaters.push((dt, t, cats) => {
      if (!outside()) return;
      const who = cats.find((c) => (c.state === 'free' || c.state === 'curl') && c.pos.y < 0.25 && Math.hypot(c.pos.x - px, c.pos.z - pz) < 0.47);
      if (who && !s.down) W.emit('plate', plate.position, who);
      s.down = !!who;
      s.linger = who ? 9 : Math.max(0, s.linger - dt);
      const active = s.linger > 0;
      s.y += ((s.down ? 0.012 : 0.04) - s.y) * Math.min(1, dt * 14);
      plate.position.y = s.y;
      plate.rotation.z = who ? clamp((who.pos.x - px) * -0.12, -0.05, 0.05) : 0;
      plate.rotation.x = who ? clamp((who.pos.z - pz) * 0.12, -0.05, 0.05) : 0;
      s.t += dt;
      if (s.phase === 'idle' && active) { s.phase = 'fill'; s.t = 0; }
      else if (s.phase === 'fill' && s.t > 2.1) { s.phase = 'tip'; s.t = 0; }
      else if (s.phase === 'tip' && s.t > 0.3) { s.phase = 'pour'; s.t = 0; W.emit('pour', pour.position); }
      else if (s.phase === 'pour' && s.t > 0.5) { s.phase = 'back'; s.t = 0; }
      else if (s.phase === 'back' && s.t > 0.22) { s.phase = active ? 'fill' : 'idle'; s.t = 0; W.emit('clack', pipe.position); }
      const e = (k) => { const u = clamp(k, 0, 1); return u * u * (3 - 2 * u); };
      s.a = s.phase === 'tip' ? REST + (DOWN - REST) * e(s.t / 0.3) : s.phase === 'pour' ? DOWN : s.phase === 'back' ? DOWN + (REST - DOWN) * e(s.t / 0.22) : REST - (s.phase === 'fill' ? 0.05 * e(s.t / 2.1) : 0);
      pipe.rotation.z = s.a;
      stream.visible = s.phase === 'fill';
      pour.visible = s.phase === 'pour';
      s.lit += ((active ? 1 : 0) - s.lit) * Math.min(1, dt * (active ? 3 : 0.6));
      glow.material.opacity = s.lit * 0.95;
      glow.visible = s.lit > 0.01;
      lamp.intensity = s.lit * 4.5;
    });
  }

  // ---------------- wind chimes on the tea house veranda: brush past, or bat them ----------------
  {
    const x = -53.9, z0 = -0.25, deck = 0.3, poleY = deck + 1.46, GAP = 0.3;
    for (const z of [z0 - 0.3, z0 + GAP * 4 + 0.3]) b.box(x - 0.04, x + 0.04, deck, poleY + 0.06, z - 0.04, z + 0.04, C.barkD); // thin enough to brush past
    b.beam([x, poleY, z0 - 0.38], [x, poleY, z0 + GAP * 4 + 0.38], 0.03, C.barkD, { seg: 6 });
    const bells = [];
    for (let i = 0; i < 5; i++) {
      const z = z0 + i * GAP, len = 0.8 - i * 0.085, bottom = deck + 0.32, cord = poleY - bottom - len;
      const g = new THREE.Group();
      g.position.set(x, poleY, z);
      out.add(g);
      mesh(g, tube(0.006, cord, 4), C.hay, 0, -cord / 2, 0);
      mesh(g, tube(0.036, len, 7), tint('#c9b56a', (i % 2) * 0.06 - 0.03), 0, -cord - len / 2, 0);
      mesh(g, tube(0.039, 0.02, 7), '#9a8a4a', 0, -cord - 0.05, 0);
      bells.push({ g, z, bottom, top: bottom + len, a: 0, w: 0, cd: 0 });
    }
    const s = { run: [], runT: 0 };
    const ring = (bl, i, push, cat) => { bl.w += push; bl.cd = 0.45; W.emit('chime', bl.g.position, i, cat); };
    W.switches.push({ region: 'outside', x: x + 0.3, y: deck, z: z0 + GAP * 2, r: 1.0, poi: true, ok: (cat) => Math.abs(cat.pos.y - deck) < 0.3 && !s.run.length, press: () => { s.run = [0, 1, 2, 3, 4]; s.runT = 0; } });
    W.updaters.push((dt, t, cats) => {
      if (!outside()) return;
      if (s.run.length && (s.runT -= dt) <= 0) { const i = s.run.shift(); ring(bells[i], i, 2.4); s.runT = 0.11; }
      bells.forEach((bl, i) => {
        bl.cd -= dt;
        if (bl.cd <= 0) for (const c of cats) {
          if (c.state !== 'free' || c.pos.y + c.height < bl.bottom - 0.03 || c.pos.y > bl.top) continue;
          if (Math.hypot(c.pos.x - x, c.pos.z - bl.z) > c.radius * 0.6 + 0.1) continue;
          if (Math.hypot(c.vx, c.vz) < 0.3) continue;
          ring(bl, i, (Math.sign(c.vx) || 1) * 2.6, c);
          break;
        }
        bl.w += (-34 * bl.a - 2.2 * bl.w) * dt;
        bl.a += bl.w * dt;
        bl.g.rotation.z = bl.a;
      });
    });
  }

  // ---------------- pots along the front wall: walk into one, or bat it from below, and off it goes ----------------
  {
    b.solid(4.6, 11.8, 0.5, 0.57, 11.28, 11.72); // the coping stones, so things can stand on top
    const colours = [C.pink, C.yellow, C.white];
    [5.3, 5.9, 6.5].forEach((x, i) => {
      const it = W.addItem('pot', 'outside', new THREE.Vector3(x, 0.57, 11.5));
      it.mesh.children[3].material = toon(colours[i]);
    });
    const DIRS = [...Array(8)].map((_, i) => [Math.cos(i * 0.785), Math.sin(i * 0.785)]);
    W.knock = (it, cat) => {
      const p = it.mesh.position, base = p.y - it.rest;
      let dx = p.x - cat.pos.x, dz = p.z - cat.pos.z;
      const d = Math.hypot(dx, dz) || 1, sp = Math.hypot(cat.vx, cat.vz);
      dx = dx / d + (sp > 0.5 ? cat.vx / sp : 0); dz = dz / d + (sp > 0.5 ? cat.vz / sp : 0);
      const m = Math.hypot(dx, dz) || 1;
      dx /= m; dz /= m;
      // if there is an edge to go over, that is the way it goes
      let best = null, score = -0.35;
      for (const [ax, az] of DIRS) {
        if (W.supportAt(p.x + ax * 0.45, p.z + az * 0.45, base + 0.05, 0) > base - 0.25) continue;
        const k = ax * dx + az * dz + (az > 0.5 ? 0.25 : 0); // all else equal, towards the lane, where it can be seen
        if (k > score) { score = k; best = [ax, az]; }
      }
      const [vx, vz] = best || [dx, dz];
      it.fly = { vx: vx * (best ? 1.5 : 1.3), vz: vz * (best ? 1.5 : 1.3), vy: best ? 2.3 : 1.5, spin: (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 4), ax: -vz, az: vx, bounced: false };
      if (it.bed) { it.bed.items.splice(it.bed.items.indexOf(it), 1); it.bed = null; }
      W.emit('knock', p, cat);
    };
    const axis = new THREE.Vector3();
    W.updaters.push((dt, t, cats) => {
      for (const it of W.items) {
        if (it.name !== 'pot' || it.heldBy || it.region !== W.region) continue;
        const p = it.mesh.position, f = it.fly;
        if (!f) {
          it.still = (it.still || 0) + dt;
          if (it.still < 0.5) continue;
          for (const c of cats) {
            if (c.state !== 'free' || Math.hypot(c.vx, c.vz) < 0.7 || Math.abs(c.pos.y - (p.y - it.rest)) > 0.3) continue;
            if (Math.hypot(c.pos.x - p.x, c.pos.z - p.z) < c.radius + 0.13) { W.knock(it, c); break; }
          }
          continue;
        }
        it.still = 0;
        f.vy -= G * dt;
        let nx = p.x + f.vx * dt, nz = p.z + f.vz * dt;
        const bd = W.regions[it.region].bounds;
        if (W.blockedAt(nx, p.y - it.rest + 0.02, nz, 0.09, 0.14) || nx < bd.x0 || nx > bd.x1 || nz < bd.z0 || nz > bd.z1) { f.vx *= -0.3; f.vz *= -0.3; nx = p.x; nz = p.z; }
        p.x = nx; p.z = nz; p.y += f.vy * dt;
        it.mesh.rotateOnWorldAxis(axis.set(f.ax, 0, f.az), f.spin * dt);
        const floor = W.supportAt(p.x, p.z, p.y - it.rest, 0.05);
        if (f.vy < 0 && p.y - it.rest <= floor) {
          p.y = floor + it.rest;
          if (!f.bounced && f.vy < -2.5) { f.bounced = true; f.vy *= -0.32; f.vx *= 0.5; f.vz *= 0.5; f.spin *= 0.5; W.emit('tock', p); }
          else { it.fly = null; it.mesh.rotation.set(0, it.mesh.rotation.y, 0); W.emit(W.inPond(p.x, floor, p.z) ? 'plop' : 'tock', p); }
        }
      }
    });
  }

  b.finish();
}
