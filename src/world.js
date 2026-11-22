import * as THREE from 'three';
import { Builder, rng, tint, toon, glowMat } from './build.js';
import * as P from './props.js';
import { buildRooms } from './rooms.js';
import { buildCritters } from './critters.js';

const { C } = P;

// The neighbourhood: five back gardens in a row (x), houses along the far side (z = -11),
// a lane along the near side (z > 11.6). Rooms and dens live far away at z = 300+.
export function buildWorld(scene) {
  const W = {
    scene, colliders: [], beds: [], items: [], portals: [], regions: {}, ponds: [], bowls: [], balls: [],
    updaters: [], nightLights: [], skyMats: [], region: 'outside', emit: () => {},
  };
  W.floorAt = () => 0;
  W.bounds = () => W.regions[W.region].bounds;
  W.inPond = (x, y, z) => y < 0.1 && W.region === 'outside' && W.ponds.some((p) => ((x - p.x) / p.rx) ** 2 + ((z - p.z) / p.rz) ** 2 < 1);
  W.addBed = (name, region, p, r = 0.7) => { W.beds.push({ name, region, x: p.x, y: p.y, z: p.z, r, items: [] }); };
  W.bedAt = (p) => W.beds.find((b) => b.region === W.region && Math.hypot(p.x - b.x, p.z - b.z) < b.r && Math.abs(p.y - b.y) < 0.45) || null;
  W.addItem = (name, region, p) => {
    const it = P.makeItem(name);
    it.region = region;
    it.mesh.position.set(p.x, p.y + it.rest, p.z);
    W.regions[region].group.add(it.mesh);
    W.items.push(it);
    return it;
  };
  // a two-way doorway between regions. `out` is the direction you step out in.
  W.link = (ra, pa, outA, rb, pb, outB, sound = 'whoosh') => {
    W.portals.push({ region: ra, x: pa.x, y: pa.y, z: pa.z, r: 0.42, to: rb, tx: pb.x + outB[0] * 0.95, ty: pb.y, tz: pb.z + outB[1] * 0.95, yaw: Math.atan2(outB[0], outB[1]), sound });
    W.portals.push({ region: rb, x: pb.x, y: pb.y, z: pb.z, r: 0.42, to: ra, tx: pa.x + outA[0] * 0.95, ty: pa.y, tz: pa.z + outA[1] * 0.95, yaw: Math.atan2(outA[0], outA[1]), sound });
  };
  W.addBowl = (kind, region, p) => {
    const g = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.1, 10), toon(kind === 'food' ? C.red : kind === 'milk' ? C.stoneL : C.blue));
    dish.position.y = 0.05;
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 10), toon(kind === 'food' ? '#9a6a42' : kind === 'milk' ? '#ffffff' : C.waterL));
    fill.position.y = 0.1;
    g.add(dish, fill);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.position.copy(p);
    W.regions[region].group.add(g);
    W.bowls.push({ kind, region, x: p.x, y: p.y, z: p.z });
  };
  W.addBall = (region, p, color = C.red, r = 0.16) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 7), toon(color));
    const band = new THREE.Mesh(new THREE.TorusGeometry(r * 1.0, r * 0.14, 4, 12), toon(C.white));
    m.add(band);
    m.castShadow = true;
    m.position.set(p.x, p.y + r, p.z);
    W.regions[region].group.add(m);
    W.balls.push({ mesh: m, region, r, vx: 0, vz: 0, y0: p.y, cd: 0 });
  };
  W.nightLight = (group, p, color = '#ffc070', power = 12, dist = 9) => {
    const l = new THREE.PointLight(color, 0, dist, 1.5);
    l.position.copy(p);
    group.add(l);
    W.nightLights.push({ light: l, power });
    return l;
  };

  // rooms first, so gardens can link their doors to them
  buildRooms(W, scene);

  // ---------------- outside ----------------
  const out = new THREE.Group();
  scene.add(out);
  W.regions.outside = {
    id: 'outside', group: out, indoor: false,
    bounds: { x0: -59.6, x1: 59.6, z0: -10.75, z1: 15.0 },
    cam: { x0: -52, x1: 52, z0: -7, z1: 11.5 },
  };
  const rand = rng(11);
  const at = (ox) => new Builder(W, out, ox, 0);

  // the street-wide base, boundaries and lane
  {
    const b = at(0);
    b.box(-68, 68, -0.7, 0, -23, 15.8, C.grass, { layer: 'ground' });
    b.box(-67.8, 67.8, -3.4, -0.7, -22.8, 15.6, C.earth);
    b.box(-67.82, 67.82, -1.5, -1.3, -22.82, 15.62, C.soil);
    b.box(-67.82, 67.82, -2.4, -2.25, -22.82, 15.62, C.soil);
    for (let i = 0; i < 40; i++) P.rock(b, -66 + i * 3.4 + (i % 3), 15.7, 0.25 + (i % 4) * 0.08, i % 2 ? C.stoneD : C.earth);
    // big trees behind the houses and beyond the ends of the street
    const woods = [[C.leaf, C.leafL, C.leafD], ['#5d9a48', '#7fb558', '#44803c'], [C.leafD, C.leaf, '#2f6b3a'], ['#6fa548', '#93c45c', '#4f8a3c']];
    for (let i = 0; i < 19; i++) {
      const x = -66 + i * 7.3 + (i % 3) * 1.1, z = -17.6 - (i % 2) * 2.3, hh = 4.8 + (i % 4) * 0.9, r = 3.0 + (i % 3) * 0.5, cols = woods[i % 4];
      b.cyl(x, 0, hh, z, 0.5, 0.75, C.barkD, { seg: 7 });
      P.leafy(b, x, hh + 1.7, z, r, cols, { n: 12, sway: 0.4 });
      P.leafy(b, x - 1.9, hh + 0.5, z + 0.6, r * 0.62, cols, { n: 8, sway: 0.4 });
      P.leafy(b, x + 2.0, hh + 0.8, z + 0.3, r * 0.6, cols, { n: 8, sway: 0.4 });
    }
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
      const x = sx * (64.2 + (k % 2) * 1.6), z = -9 + k * 6.6, cols = woods[(k + (sx > 0 ? 1 : 0)) % 4];
      b.cyl(x, 0, 3.6, z, 0.45, 0.65, C.barkD, { seg: 7 });
      P.leafy(b, x, 5.0, z, 2.6, cols, { n: 11, sway: 0.4 });
      P.leafy(b, x - sx * 0.5, 3.6, z + 1.6, 1.6, cols, { n: 7, sway: 0.4 });
    }
    // lane paving
    b.block(-60.8, 60.8, 0, 0.05, 11.7, 15.8, C.stoneD, { climb: false });
    for (let x = -60; x < 60.5; x += 1.5) b.box(x, x + 1.42, 0.05, 0.06, 11.78, 13.7, Math.round(x / 1.5) % 2 ? C.stone : '#b7b1a3');
    for (let x = -59.25; x < 60.5; x += 1.5) b.box(x, x + 1.42, 0.05, 0.06, 13.78, 15.7, Math.round(x / 1.5) % 2 ? '#b7b1a3' : C.stone);
    // ends of the street
    P.boundary(b, -60.2, -11, 15.8, 'hedge', { h: 2.2 });
    P.boundary(b, 60.2, -11, 15.8, 'brick', { h: 1.8 });
    // between gardens: each one different, each with one way through
    P.boundary(b, -36, -11, 11.5, 'bamboo', { h: 1.3, gaps: [[1.0, 2.3]] });
    P.boundary(b, -12, -11, 11.5, 'plank', { h: 1.4, gaps: [[5.4, 6.5]] });
    P.boundary(b, 12, -11, 11.5, 'brick', { h: 1.2, gaps: [[3.0, 4.3]] });
    P.boundary(b, 36, -11, 11.5, 'hedge', { h: 1.5, gaps: [[-3.0, -1.6]] });
    // moon gate posts, a loose board, an iron gate, a hedge arch
    b.block(-36.18, -35.82, 0, 1.9, 0.78, 1.0, C.barkD); b.block(-36.18, -35.82, 0, 1.9, 2.3, 2.52, C.barkD); b.box(-36.22, -35.78, 1.9, 2.05, 0.6, 2.7, C.barkD);
    b.box(-12.1, -11.9, 0, 1.3, 5.2, 5.42, C.woodD, { rot: [0.25, 0, 0] });
    b.box(12.1, 12.16, 0, 1.1, 4.3, 5.4, C.dark, { rot: [0, 0.5, 0] });
    b.ball(36, 1.75, -2.3, 0.75, C.leafD, { sx: 0.7, sy: 0.5, layer: 'sway', sway: 0.2 });
    // front walls with gates onto the lane
    P.frontWall(b, 11.5, -59.7, -36.2, 'stone', { h: 0.55, gaps: [[-50.2, -48.6]] });
    P.frontWall(b, 11.5, -35.8, -12.2, 'picket', { h: 0.4, gaps: [[-22.2, -20.6]] });
    P.frontWall(b, 11.5, -11.8, 11.8, 'brick', { h: 0.5, gaps: [[3.0, 4.6]] });
    P.frontWall(b, 11.5, 12.2, 35.5, 'log', { gaps: [[19.6, 21.2]] });
    P.frontWall(b, 11.5, 36.5, 59.7, 'hedge', { h: 0.5, gaps: [[49.6, 51.2]] });
    // lane furniture
    for (const x of [-42, -18, 6, 30, 54]) {
      P.lampPost(b, x, 15.2);
      W.nightLight(out, new THREE.Vector3(x, 2.3, 14.8), '#ffc070', 9, 10);
    }
    for (const x of [8.6, 9.5]) { b.block(x - 0.38, x + 0.38, 0.05, 1.05, 14.5, 15.3, x < 9 ? '#5d7a66' : '#6b6f7a'); b.box(x - 0.42, x + 0.42, 1.05, 1.13, 14.46, 15.34, C.dark); b.solid(x - 0.42, x + 0.42, 1.05, 1.13, 14.46, 15.34); }
    b.block(-31.2, -28.8, 0.05, 0.5, 14.7, 15.4, C.wood); b.block(-31.2, -28.8, 0.5, 1.0, 15.25, 15.4, C.woodD);
    b.block(39.5, 40.5, 0.05, 0.7, 14.5, 15.4, C.card); b.block(39.7, 40.3, 0.7, 1.2, 14.7, 15.3, C.cardD);
    P.border(b, rand, -59, 59, 15.35, 15.7, 110, ['grass', 'daisy', 'mound', 'grass'], [C.white, C.yellow, C.purple]);
    P.border(b, rand, -59, 59, 11.75, 12.0, 46, ['grass', 'daisy', 'fern'], [C.white, C.yellow]);
    for (let i = 0; i < 70; i++) b.disc(-59 + rand() * 118, 0.065, 11.9 + rand() * 3.6, 0.07 + rand() * 0.05, ['#c8553d', C.orange, '#b98a4a', C.leafL][i % 4], { seg: 5 });
    for (let i = 0; i < 60; i++) { const x = -59 + rand() * 118, z = 11.9 + rand() * 3.6; b.box(x, x + 0.3 + rand() * 0.5, 0.06, 0.066, z, z + 0.05, C.moss); }
    for (const [x, z, r] of [[-6, 13.4, 0.7], [27, 13.7, 0.9], [-44, 12.9, 0.6]]) { b.disc(x, 0.065, z, r, C.waterD, { layer: 'water', sz: 0.7 }); W.ponds.push({ x, z, rx: r, rz: r * 0.7 }); }
    b.finish();
  }

  home(W, at(0), rand, out);
  treehouseGarden(W, at(-24), rand, out);
  pondGarden(W, at(-48), rand, out);
  vegGarden(W, at(24), rand, out);
  wildGarden(W, at(48), rand, out);

  buildCritters(W, out, rand);

  W.setRegion = (id) => {
    W.region = id;
    for (const r of Object.values(W.regions)) r.group.visible = r.id === id;
  };
  W.setRegion('outside');

  const dayGlass = new THREE.Color('#a9cfe0'), nightGlass = new THREE.Color('#ffd98a');
  W.setLit = (lit) => {
    glowMat.color.copy(dayGlass).lerp(nightGlass, lit);
    for (const n of W.nightLights) n.light.intensity = n.power * lit;
  };

  // floor height at a point, for something whose feet are near y
  W.supportAt = (x, z, y, reach = 0.4) => {
    let sup = 0;
    for (const c of W.colliders) if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && c.y1 <= y + reach && c.y1 > sup) sup = c.y1;
    return sup;
  };
  W.blockedAt = (x, y, z, r, h) => {
    for (const c of W.colliders) {
      if (y + h <= c.y0 || y >= c.y1 - 0.01) continue;
      const cx = Math.max(c.x0, Math.min(c.x1, x)), cz = Math.max(c.z0, Math.min(c.z1, z));
      if (Math.hypot(x - cx, z - cz) < r) return true;
    }
    return false;
  };

  W.update = (dt, t, cats, night) => {
    for (const u of W.updaters) u(dt, t, cats, night);
    // balls roll when a cat bumps them
    for (const b of W.balls) {
      if (b.region !== W.region) continue;
      const p = b.mesh.position;
      b.cd -= dt;
      for (const c of cats) {
        const dx = p.x - c.pos.x, dz = p.z - c.pos.z, d = Math.hypot(dx, dz);
        if (d < b.r + c.radius + 0.05 && Math.abs(c.pos.y - b.y0) < 0.5 && c.state === 'free') {
          const sp = Math.max(1.5, Math.hypot(c.vx, c.vz) * 1.4);
          b.vx = (dx / (d + 0.001)) * sp;
          b.vz = (dz / (d + 0.001)) * sp;
          if (b.cd <= 0) { b.cd = 0.5; W.emit('ball', p); }
        }
      }
      const sp = Math.hypot(b.vx, b.vz);
      if (sp > 0.02) {
        let nx = p.x + b.vx * dt, nz = p.z + b.vz * dt;
        if (W.blockedAt(nx, b.y0 + 0.05, p.z, b.r, b.r * 2)) { b.vx *= -0.6; nx = p.x; }
        if (W.blockedAt(p.x, b.y0 + 0.05, nz, b.r, b.r * 2)) { b.vz *= -0.6; nz = p.z; }
        const bd = W.regions[b.region].bounds;
        if (nx < bd.x0 || nx > bd.x1) { b.vx *= -0.6; nx = p.x; }
        if (nz < bd.z0 || nz > bd.z1) { b.vz *= -0.6; nz = p.z; }
        p.x = nx; p.z = nz;
        b.mesh.rotation.x += (b.vz * dt) / b.r;
        b.mesh.rotation.z -= (b.vx * dt) / b.r;
        const f = Math.exp(-1.6 * dt);
        b.vx *= f; b.vz *= f;
      }
    }
  };
  return W;
}

const pondExcl = (ponds) => (x, z) => !ponds.some(([px, pz, rx, rz]) => ((x - px) / (rx + 0.3)) ** 2 + ((z - pz) / (rz + 0.3)) ** 2 < 1);
const rectExcl = (rects) => (x, z) => !rects.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);

function pond(W, b, x, z, rx, rz, { lilies = 4, rim = C.stone } = {}) {
  W.ponds.push({ x: x + b.ox, z, rx, rz });
  b.disc(x, 0.012, z, 1, C.waterD, { sx: rx + 0.12, sz: rz + 0.12, seg: 28 });
  b.disc(x, 0.03, z, 1, C.water, { layer: 'water', sx: rx, sz: rz, seg: 28 });
  const n = Math.round((rx + rz) * 4.2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (i % 3) * 0.07;
    P.rock(b, x + Math.cos(a) * (rx + 0.1), z + Math.sin(a) * (rz + 0.1), 0.2 + (i % 4) * 0.045, i % 2 ? rim : tint(rim, -0.08));
  }
  for (let i = 0; i < lilies; i++) {
    const a = i * 2.4 + 0.5, d = 0.35 + (i % 3) * 0.2;
    b.disc(x + Math.cos(a) * rx * d, 0.045, z + Math.sin(a) * rz * d, 0.24 + (i % 2) * 0.08, C.leafL, { seg: 9 });
    if (i % 2 === 0) b.ball(x + Math.cos(a) * rx * d, 0.09, z + Math.sin(a) * rz * d, 0.08, C.pink, { sy: 0.8, seg: 6 });
  }
}

// ---------------- home ----------------
function home(W, b, rand, out) {
  const ok = (x, z) => rectExcl([[-1, 7, -11, -6.5]])(x, z) && pondExcl([[6.2, 5.6, 1.9, 1.6]])(x, z);
  P.patches(b, rand, 12, -11, 11, -10, 10.5, ok);
  P.tufts(b, rand, 210, -11.5, 11.5, -10.5, 11, ok);
  P.house(b, { door: { x: 2.7, color: C.teal, flap: true, y: 0.12, porch: C.terracotta }, windows: [[-5.2, -2.8, 1.1, 3.1], [5.5, 7.5, 1.5, 3.1], [-9.6, -7.8, 1.5, 3.1]], shutters: '#6fa3a0', boxes: [1, 2], chimney: 8.5, pipe: -1.6, curtains: '#f2c9a0' });
  // patio
  b.solid(-1, 7, 0, 0.12, -11, -6.5, { climb: false });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) b.box(-1 + i * 2 + 0.04, 1 + i * 2 - 0.04, 0, 0.12, -11 + j * 1.5 + 0.04, -9.5 + j * 1.5 - 0.04, [C.stoneL, C.stone, '#d3cdbf'][(i + j * 2) % 3]);
  b.box(1.22, 1.38, 2.95, 3.1, -11.0, -10.7, C.dark);
  b.ball(1.3, 2.84, -10.72, 0.16, '#ffffff', { layer: 'glow', seg: 8 });
  W.nightLight(out, b.p(1.3, 2.6, -10.1), '#ffc070', 7, 10);
  W.link('outside', b.p(2.7, 0.12, -10.62), [0, 1], 'home', W.roomDoor.home, [1, 0], 'flap');
  // window ledge with a cushion, and a crate to help a kitten up
  b.block(-5.3, -2.7, 0, 1.1, -11, -10.35, '#e6d3b3');
  b.box(-5.05, -2.95, 1.1, 1.17, -10.95, -10.42, C.pink);
  W.addBed('ledge', 'outside', b.p(-4, 1.1, -10.67), 0.8);
  b.block(-4.6, -3.4, 0, 0.55, -10.35, -9.7, C.wood);
  b.box(-4.62, -3.38, 0.2, 0.3, -10.37, -9.68, C.woodD);
  P.pot(b, 0.2, -10.4, { y: 0.12, bloom: C.pink });
  P.pot(b, 0.8, -10.55, { y: 0.12, bloom: C.yellow });
  // the cardboard box: closed, with a cat-sized hole
  b.block(4.3, 5.7, 0.12, 0.9, -8.85, -7.75, C.card);
  b.box(4.28, 5.0, 0.9, 0.93, -8.87, -7.73, C.cardD); b.box(5.02, 5.72, 0.9, 0.93, -8.87, -7.73, tint(C.card, 0.04));
  b.box(4.95, 5.07, 0.3, 0.92, -7.76, -7.72, '#e9dcc0');
  b.box(4.7, 5.3, 0.12, 0.62, -7.76, -7.71, '#3d2c22');
  W.link('outside', b.p(5.0, 0.12, -7.42), [0, 1], 'box', W.roomDoor.box, [0, 1], 'cardboard');
  // tree with a fork to sleep in
  P.tree(b, -4.5, 1.5, { h: 2.6 });
  b.cyl(-4.5, 2.5, 2.62, 1.5, 0.66, 0.56, C.moss, { seg: 10 });
  W.addBed('tree', 'outside', b.p(-4.5, 2.6, 1.5), 0.6);
  // log store with hay
  b.block(-11.85, -9.3, 1.7, 1.85, -4.6, -1.0, C.slate);
  b.block(-9.5, -9.3, 0, 1.85, -1.2, -1.0, C.woodD);
  b.block(-11.85, -9.3, 0, 1.85, -4.6, -4.45, C.wood);
  b.ball(-10.6, 0, -2.7, 1.0, C.hay, { sy: 0.22 }); b.ball(-10.1, 0, -3.5, 0.6, tint(C.hay, -0.06), { sy: 0.3 });
  for (let i = 0; i < 5; i++) { const lx = -11.3 + (i % 3) * 0.42 + Math.floor(i / 3) * 0.21, ly = 0.2 + Math.floor(i / 3) * 0.36; b.lying(lx, ly, -4.1, 0.6, 0.2, C.bark, 'z', { seg: 7 }); b.lying(lx, ly, -3.79, 0.02, 0.15, C.woodL, 'z', { seg: 7 }); }
  W.addBed('hay', 'outside', b.p(-10.6, 0, -2.7), 0.95);
  pond(W, b, 6.2, 5.6, 1.9, 1.6);
  // washing line
  for (const x of [-7, 1]) b.block(x - 0.07, x + 0.07, 0, 1.9, 8.1, 8.24, C.woodD, { climb: false });
  b.beam([-7, 1.85, 8.17], [1, 1.85, 8.17], 0.02, C.white);
  [[-5.8, 0.5, 0.7, C.white], [-4.7, 0.34, 0.5, C.red], [-3.9, 0.34, 0.5, C.red], [-2.6, 0.9, 0.95, C.blue], [-0.9, 0.6, 0.6, C.yellow]].forEach(([x, w, h, c]) => b.box(x - w / 2, x + w / 2, 1.85 - h, 1.85, 8.15, 8.19, c, { layer: 'sway' }));
  // bird table
  b.block(8.92, 9.08, 0, 1.3, -3.08, -2.92, C.woodD, { climb: false });
  b.box(8.5, 9.5, 1.3, 1.36, -3.5, -2.5, C.wood); b.cone(9, 1.75, 2.1, -3, 0.62, C.brickD, { seg: 4 });
  for (const [x, z] of [[8.62, -3.38], [9.38, -3.38], [8.62, -2.62], [9.38, -2.62]]) b.box(x - 0.03, x + 0.03, 1.36, 1.78, z - 0.03, z + 0.03, C.woodD);
  P.flowers(b, rand, 9, 1.4, 1.3, 20);
  P.flowers(b, rand, -8, -7.6, 1.3, 18);
  const cottage = [C.purple, C.pink, C.blue, C.white, C.yellow, C.red];
  P.border(b, rand, -11.5, -5.6, -10.75, -9.9, 16, ['spike', 'rose', 'mound', 'tulip', 'daisy', 'spike'], cottage);
  P.border(b, rand, 7.3, 11.4, -10.75, -9.8, 11, ['rose', 'spike', 'mound', 'tulip'], cottage);
  P.border(b, rand, -11.6, -10.7, -0.6, 5.0, 10, ['mound', 'fern', 'spike', 'grass'], cottage);
  P.border(b, rand, -11.6, -10.7, 6.9, 10.9, 8, ['fern', 'mound', 'spike', 'daisy'], cottage);
  P.border(b, rand, 10.5, 11.5, -7.4, 2.6, 13, ['spike', 'rose', 'mound', 'grass'], cottage);
  P.border(b, rand, 10.5, 11.5, 4.8, 10.8, 9, ['fern', 'mound', 'spike'], cottage);
  P.border(b, rand, -11, 2.6, 10.3, 11.1, 16, ['tulip', 'daisy', 'mound', 'spike'], cottage);
  P.border(b, rand, 5, 11, 10.3, 11.1, 9, ['tulip', 'daisy', 'mound'], cottage);
  P.border(b, rand, 3.9, 8.6, 7.4, 8.4, 8, ['grass', 'fern', 'spike'], [C.purple, C.white]);
  P.flowers(b, rand, -1.5, 9.8, 1.0, 12, [C.white, C.yellow]);
  b.solid(-8.9, -8.1, 0, 0.45, 8.2, 9.0);
  b.cyl(-8.5, 0, 0.45, 8.6, 0.42, 0.48, C.bark); b.cyl(-8.5, 0.45, 0.47, 8.6, 0.36, 0.36, C.woodL);
  P.bush(b, -10.4, 9.8, 0.85);
  P.bush(b, 10.3, -8.6, 0.8, [C.leafD, C.leaf, C.leafL], { berries: C.red });
  P.steppingStones(b, [[3.2, -5.6], [3.5, -4.0], [3.3, -2.4], [3.7, -0.8], [3.6, 0.9], [3.5, 2.6], [3.3, 4.4], [3.5, 6.2], [3.7, 8.0], [3.8, 9.8]]);
  P.rock(b, 10.8, 10.2, 0.4); P.rock(b, -2.6, 10.6, 0.3);
  P.clutter(b, rand, 46, -11, 11, -9.5, 10.8, ok);
  P.clutter(b, rand, 10, -6.5, -2.5, -0.5, 3.5, ok, ['leaf', 'leaf', 'mushroom']);
  P.stringLights(b, [-11.85, 1.5, -1.0], [-11.85, 1.5, 5.3], 9, 0.25);
  P.stringLights(b, [-1.0, 2.6, -10.9], [1.2, 2.9, -10.9], 5, 0.18);
  P.stringLights(b, [4.3, 2.9, -10.9], [7.2, 2.4, -10.9], 6, 0.2);
  for (const [x, z] of [[2.5, -5.2], [4.2, -3.2], [2.7, -1.6], [4.3, 0.2], [2.9, 1.9], [4.1, 3.6], [2.8, 7.2]]) P.pathLight(b, x, z);
  // a little table on the patio, a watering can, a gnome by the pond
  b.block(-0.4, 0.5, 0.12, 0.62, -7.6, -6.9, C.white, { climb: true }); b.box(-0.5, 0.6, 0.62, 0.68, -7.7, -6.8, C.white);
  b.cyl(0.05, 0.68, 0.84, -7.25, 0.1, 0.12, C.blue, { seg: 7 }); b.ball(0.05, 0.9, -7.25, 0.09, C.pink, { seg: 5 });
  b.cyl(6.6, 0.12, 0.45, -10.3, 0.2, 0.17, '#6d9a8a', { seg: 8 }); b.beam([6.75, 0.36, -10.3], [7.1, 0.52, -10.3], 0.035, '#6d9a8a'); b.beam([6.45, 0.42, -10.3], [6.3, 0.2, -10.3], 0.03, '#6d9a8a');
  b.cyl(8.5, 0, 0.3, 4.9, 0.12, 0.14, C.blue, { seg: 7 }); b.ball(8.5, 0.38, 4.9, 0.1, '#f2d2b8', { seg: 6 }); b.cone(8.5, 0.44, 0.72, 4.9, 0.11, C.red, { seg: 7 }); b.ball(8.5, 0.3, 5.0, 0.07, C.white, { sy: 1.2, seg: 5 });
  W.addItem('sock', 'outside', b.p(-2.4, 0, 8.9));
  W.addItem('wool', 'outside', b.p(-7.2, 0, -6.2));
  W.addItem('feather', 'outside', b.p(8.1, 0, -1.9));
  W.addItem('leaf', 'outside', b.p(-3.4, 0, 3.2));
  b.finish();
}

// ---------------- the garden with the treehouse ----------------
function treehouseGarden(W, b, rand, out) {
  const ok = (x, z) => rectExcl([[-8.2, -3.8, -7.2, -2.8], [-4, 0.2, 5, 8], [6.2, 8.8, 4.2, 6.8]])(x, z) && pondExcl([[8, -5.5, 1.5, 1.5]])(x, z);
  P.patches(b, rand, 12, -11, 11, -10, 10.5, ok);
  P.tufts(b, rand, 200, -11.5, 11.5, -10.5, 11, ok);
  P.house(b, { wall: '#cfdde2', roof: C.slateD, style: 'clapboard', door: { x: -6.5, color: C.red, porch: C.white }, windows: [[-10.5, -8.6, 1.3, 3.0], [-3.5, -1.2, 1.3, 3.0], [6.5, 9.5, 1.3, 3.0]], shutters: C.navy, boxes: [0, 2], chimney: -1.5, pipe: 4.4, curtains: '#f6e7a8' });
  // the oak and its treehouse: climb the trunk from the near side
  b.solid(1.4, 2.6, 0, 3.2, -1.6, -0.4);
  b.cyl(2, 0, 3.2, -1, 0.62, 0.8, C.bark, { seg: 9 });
  for (let i = 0; i < 7; i++) b.box(2.6, 2.68, 0.35 + i * 0.4, 0.42 + i * 0.4, -1.35, -0.65, C.woodL);
  b.box(2.6, 2.66, 0.2, 3.1, -1.4, -1.34, C.hay); b.box(2.6, 2.66, 0.2, 3.1, -0.66, -0.6, C.hay);
  for (const [dx, dy, dz, r] of [[-3.6, 4.6, -3.4, 2.0], [-1.0, 5.6, -4.8, 1.9], [1.8, 5.0, -4.0, 1.7], [-4.6, 3.8, -0.6, 1.5], [3.4, 4.2, -2.4, 1.4], [0.6, 6.4, -2.6, 1.6]]) {
    P.leafy(b, 2 + dx, 3.2 + dy, -1 + dz, r, [[C.leaf, C.leafL, C.leafD], ['#5d9a48', '#7fb558', '#44803c']][Math.abs(Math.round(dx)) % 2], { n: 12, sway: 0.5 });
  }
  b.block(-2.6, 2.6, 3.0, 3.2, -4.4, -0.4, C.wood);
  for (let x = -2.6; x < 2.6; x += 0.65) b.box(x, x + 0.6, 3.2, 3.21, -4.4, -0.4, Math.round(x * 3) % 2 ? C.plank : C.woodL);
  b.beam([-2.3, 0, -0.7], [-2.3, 3.0, -0.7], 0.12, C.barkD); b.beam([-2.3, 0, -4.1], [-2.3, 3.0, -4.1], 0.12, C.barkD); b.beam([2.3, 0, -4.1], [2.3, 3.0, -4.1], 0.12, C.barkD);
  for (const x of [-2.5, -1.2, 0.1, 1.4]) b.box(x, x + 0.08, 3.2, 3.75, -0.5, -0.42, C.woodD);
  b.box(-2.6, 1.5, 3.72, 3.8, -0.5, -0.42, C.woodD);
  b.block(-2.4, 0.5, 3.2, 4.9, -4.2, -2.0, C.plank);
  for (let x = -2.4; x < 0.4; x += 0.5) b.box(x + 0.02, x + 0.46, 3.2, 4.9, -2.02, -1.98, Math.round(x * 2) % 2 ? C.wood : C.plank);
  b.cone(-0.95, 4.9, 6.0, -3.1, 2.3, C.red, { seg: 4 });
  b.box(0.5, 0.54, 3.2, 4.3, -3.5, -2.6, '#3d2c22');
  b.box(-1.6, -0.6, 3.9, 4.5, -2.0, -1.96, '#ffffff', { layer: 'glow' });
  W.link('outside', b.p(0.92, 3.2, -3.05), [1, 0], 'treehouse', W.roomDoor.treehouse, [1, 0], 'creak');
  // swing
  for (const z of [3.2, 5.6]) { b.beam([-8.2, 0, z], [-7.6, 2.3, z], 0.06, C.metal); b.beam([-7.0, 0, z], [-7.6, 2.3, z], 0.06, C.metal); }
  b.beam([-7.6, 2.3, 3.2], [-7.6, 2.3, 5.6], 0.06, C.metal);
  const swing = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.7), toon(C.red));
  seat.position.y = -1.7; seat.castShadow = true;
  const rope = new THREE.CylinderGeometry(0.015, 0.015, 1.7, 4);
  for (const z of [-0.3, 0.3]) { const r = new THREE.Mesh(rope, toon(C.hay)); r.position.set(0, -0.85, z); swing.add(r); }
  swing.add(seat);
  b.dyn(swing, -7.6, 2.3, 4.4);
  W.updaters.push((dt, t) => { swing.rotation.z = Math.sin(t * 1.3) * 0.22; });
  // sandpit
  b.box(-8.2, -3.8, 0, 0.16, -7.2, -2.8, C.wood); b.box(-8.0, -4.0, 0.05, 0.18, -7.0, -3.0, C.sand);
  b.solid(-8.2, -3.8, 0, 0.16, -7.2, -2.8, { climb: false });
  b.cyl(-5.0, 0.18, 0.5, -4.2, 0.2, 0.15, C.blue, { seg: 8 }); b.ball(-6.6, 0.3, -5.6, 0.34, C.sand, { sy: 0.7 }); b.ball(-6.0, 0.24, -6.2, 0.22, tint(C.sand, -0.05), { sy: 0.8 });
  b.box(-7.3, -7.2, 0.18, 0.24, -4.6, -4.0, C.red, { rot: [0, 0.6, 0] });
  // trampoline
  const tr = b.solid(6.3, 8.7, 0, 0.6, 4.3, 6.7);
  tr.bounce = true;
  b.cyl(7.5, 0.5, 0.6, 5.5, 1.3, 1.3, C.dark, { seg: 14 }); b.cyl(7.5, 0.52, 0.63, 5.5, 1.38, 1.38, C.blue, { seg: 14 }); b.cyl(7.5, 0.56, 0.635, 5.5, 1.1, 1.1, '#2e333c', { seg: 14 });
  for (let i = 0; i < 6; i++) b.cyl(7.5 + Math.cos(i * 1.047) * 1.2, 0, 0.5, 5.5 + Math.sin(i * 1.047) * 1.2, 0.05, 0.05, C.metal, { seg: 5 });
  // paddling pool
  b.cyl(8, 0, 0.22, -5.5, 1.62, 1.62, C.pink, { seg: 16 }); b.cyl(8, 0.05, 0.24, -5.5, 1.45, 1.45, C.waterL, { seg: 16 });
  b.disc(8, 0.25, -5.5, 1.42, C.water, { layer: 'water', seg: 16 });
  W.ponds.push({ x: 8 + b.ox, z: -5.5, rx: 1.4, rz: 1.4 });
  b.ball(8.5, 0.32, -5.9, 0.14, C.yellow);
  // picnic
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) b.box(-3.9 + i, -2.9 + i, 0, 0.03, 5.1 + j, 6.1 + j, (i + j) % 2 ? C.red : C.white);
  b.block(-1.0, -0.2, 0, 0.42, 5.3, 5.9, C.hay); b.box(-1.05, -0.15, 0.42, 0.46, 5.25, 5.95, C.woodL);
  W.addBowl('food', 'outside', b.p(-1.4, 0.03, 7.0));
  W.addBed('picnic', 'outside', b.p(-2.6, 0.03, 6.4), 1.0);
  W.addBall('outside', b.p(3.2, 0, 4.2), C.red);
  P.flowers(b, rand, -10.3, 8.5, 1.1, 14, [C.yellow, C.orange]);
  const bright = [C.red, C.yellow, C.orange, C.pink, C.white];
  P.border(b, rand, -11.5, -7.8, -10.75, -9.9, 9, ['tulip', 'rose', 'daisy', 'mound'], bright);
  P.border(b, rand, -5.0, 11.4, -10.75, -9.9, 26, ['tulip', 'rose', 'daisy', 'mound', 'spike'], bright);
  P.border(b, rand, -11.5, -10.6, -7.5, 0.6, 10, ['mound', 'tulip', 'fern'], bright);
  P.border(b, rand, 10.5, 11.5, -3.5, 4.8, 11, ['rose', 'tulip', 'mound', 'spike'], bright);
  P.border(b, rand, -11, -3.2, 10.3, 11.1, 12, ['tulip', 'daisy', 'mound'], bright);
  P.border(b, rand, -0.2, 9.5, 10.3, 11.1, 14, ['tulip', 'daisy', 'mound'], bright);
  P.flowers(b, rand, 10.2, 0.5, 1.0, 12, [C.pink, C.white]);
  P.bush(b, 10.4, 9.6, 0.8);
  P.tree(b, -10, -8.6, { kind: 'birch', h: 2.4, r: 0.28, bark: '#e9e4d6', leaves: [C.leafL, '#a9c765', C.leaf] });
  P.steppingStones(b, [[-6.4, -9.2], [-5.6, -7.9], [2.6, 9.8]]);
  P.clutter(b, rand, 44, -11, 11, -9.5, 10.8, ok, ['daisy', 'butter', 'clover', 'daisy', 'dandelion', 'clover']);
  // bunting and lights on the treehouse
  P.stringLights(b, [-2.5, 4.0, -0.45], [2.5, 4.0, -0.45], 10, 0.3, ['#ffd98a', '#ff9a8a', '#9ad9ff', '#b9ff9a']);
  P.stringLights(b, [-12.0, 1.5, -6.5], [-12.0, 1.5, 0.5], 9, 0.25);
  for (let i = 0; i < 9; i++) b.cone(-1.9 + i * 0.3, 4.55, 4.75, -1.96, 0.1, [C.red, C.yellow, C.blue, C.white][i % 4], { seg: 3 });
  for (const [x, z] of [[-6.9, -9.0], [-5.1, -7.4], [1.8, 9.0], [3.3, 9.3]]) P.pathLight(b, x, z);
  // a kite caught in the birch, chalk on the path, a scooter
  b.box(-9.9, -9.3, 4.6, 5.3, -8.3, -8.26, C.red, { rot: [0, 0, 0.78], layer: 'sway' }); b.beam([-9.6, 4.6, -8.3], [-9.0, 3.2, -8.0], 0.01, C.white, { seg: 3 });
  b.block(5.0, 5.15, 0, 0.8, 8.0, 8.1, C.metal, { climb: false }); b.box(4.6, 5.5, 0.05, 0.1, 7.98, 8.12, C.teal); b.box(4.85, 5.3, 0.78, 0.84, 7.9, 8.2, C.dark);
  W.addItem('ribbon', 'outside', b.p(-6.6, 0, 6.3));
  W.addItem('mitten', 'outside', b.p(-5.6, 0.18, -3.6));
  b.finish();
}

// ---------------- the garden with the koi pond ----------------
function pondGarden(W, b, rand, out) {
  const ok = (x, z) => rectExcl([[-11.6, -5.3, -4.6, 1.6], [3.6, 8.4, 5.4, 9.6]])(x, z) && pondExcl([[0.5, 2.2, 4.6, 3.1]])(x, z);
  P.patches(b, rand, 10, -11, 11, -10, 10.5, ok, [C.moss, C.grassD]);
  P.tufts(b, rand, 150, -11.5, 11.5, -10.5, 11, ok);
  P.house(b, { wall: '#e9e2d2', roof: '#4f5d68', trim: C.barkD, base: C.stoneD, style: 'timber', windows: [[-9, -6.4, 1.2, 3.2], [-1.3, 1.3, 0.6, 3.2], [6.3, 8.8, 1.2, 3.2]], curtains: '#f6f1e4' });
  pond(W, b, 0.5, 2.2, 4.6, 3.1, { lilies: 7, rim: C.stoneD });
  // arched bridge
  [0.16, 0.34, 0.5, 0.58, 0.5, 0.34, 0.16].forEach((h, i) => {
    const x0 = -4.4 + i * 1.4;
    b.block(x0, x0 + 1.4, 0, h, 1.6, 2.8, C.red, { climb: false });
    b.box(x0, x0 + 1.4, h, h + 0.02, 1.62, 2.78, '#b8452f');
    if (i % 2 === 0) for (const z of [1.62, 2.72]) b.box(x0 + 0.6, x0 + 0.72, h, h + 0.5, z, z + 0.08, '#a53d2a');
  });
  // stone lantern
  b.block(5.3, 5.9, 0, 0.35, -3.9, -3.3, C.stoneD, { climb: false }); b.box(5.48, 5.72, 0.35, 0.9, -3.72, -3.48, C.stone);
  b.box(5.36, 5.84, 0.9, 1.3, -3.84, -3.36, '#ffffff', { layer: 'glow' }); b.cone(5.6, 1.3, 1.7, -3.6, 0.5, C.stoneD, { seg: 4 });
  W.nightLight(out, b.p(5.6, 1.1, -3.2), '#ffcf8a', 9, 7);
  // bamboo
  for (let i = 0; i < 11; i++) {
    const x = -9.4 + (i % 4) * 0.42 + (i % 3) * 0.1, z = -8.6 + Math.floor(i / 4) * 0.5, h = 3 + (i % 5) * 0.35;
    b.cyl(x, 0, h, z, 0.06, 0.07, '#8fae4e', { seg: 5 });
    b.ball(x + 0.15, h - 0.3, z + 0.1, 0.42, i % 2 ? C.leafL : C.leaf, { sy: 0.5, layer: 'sway', sway: 1.0, seg: 6 });
  }
  b.solid(-9.8, -8.0, 0, 2.5, -9.0, -7.4, { climb: false });
  P.tree(b, 7.6, -7.4, { h: 2.2, r: 0.38, leaves: ['#c8553d', '#de7a45', '#a83f3a'], scale: 0.85, bark: C.barkD });
  b.disc(7.4, 0.01, -5.6, 1.4, C.moss, { seg: 12 });
  for (let i = 0; i < 7; i++) b.disc(6.4 + rand() * 2.4, 0.02, -6.6 + rand() * 2.2, 0.09, i % 2 ? '#c8553d' : '#de7a45', { seg: 5 });
  W.addBed('moss', 'outside', b.p(7.4, 0, -5.5), 0.9);
  // tea house on a deck
  b.block(-11.8, -5.4, 0, 0.3, -4.6, 1.6, C.wood, { climb: false });
  b.block(-11.8, -6.5, 0.3, 3.0, -4.3, 1.1, C.cream);
  for (let z = -4.3; z < 1.0; z += 0.9) b.box(-6.5, -6.46, 0.3, 3.0, z, z + 0.07, C.barkD);
  for (const y of [1.2, 2.1, 3.0]) b.box(-6.5, -6.46, y - 0.06, y, -4.3, 1.1, C.barkD);
  b.box(-12.0, -5.9, 3.0, 3.25, -4.9, 1.7, '#4f5d68'); b.box(-11.8, -6.3, 3.25, 3.5, -4.5, 1.3, '#445059');
  b.box(-6.5, -6.44, 0.3, 2.1, -2.1, -1.1, '#3d2c22');
  W.link('outside', b.p(-6.08, 0.3, -1.6), [1, 0], 'teahouse', W.roomDoor.teahouse, [1, 0], 'creak');
  // raked gravel with a standing stone
  b.box(3.6, 8.4, 0, 0.05, 5.4, 9.6, '#ddd8c9');
  for (let i = 1; i < 5; i++) b.cyl(6, 0.05, 0.055 + i * 0.001, 7.5, i * 0.5, i * 0.5, i % 2 ? '#cfc9b8' : '#e6e1d3', { seg: 16 });
  b.block(5.7, 6.3, 0, 0.9, 7.2, 7.8, C.stoneD); b.ball(6, 0.9, 7.5, 0.42, C.stoneD, { sy: 0.7, seg: 7 });
  b.block(-3.9, -1.9, 0, 0.5, -9.4, -8.7, C.stone);
  W.addBed('bench', 'outside', b.p(-2.9, 0.5, -9.05), 0.8);
  P.tree(b, 10.2, -9.4, { kind: 'pine', h: 1.6, r: 0.3, scale: 0.9 });
  P.rock(b, -4.6, 6.6, 0.6, C.stoneD); P.rock(b, -5.4, 7.2, 0.35); P.rock(b, 9.8, 2.4, 0.5, C.stoneD);
  P.flowers(b, rand, -8.6, 8.6, 1.2, 14, [C.purple, C.white, '#b9c7ee']);
  const calm = [C.purple, C.white, '#b9c7ee', C.pink];
  P.border(b, rand, -5.0, 11.4, -10.75, -9.9, 22, ['fern', 'mound', 'spike', 'fern', 'grass'], calm);
  P.border(b, rand, 10.5, 11.5, -8, 0.6, 10, ['fern', 'mound', 'spike'], calm);
  P.border(b, rand, 10.5, 11.5, 2.8, 10.8, 9, ['fern', 'grass', 'mound'], calm);
  P.border(b, rand, -11, -2.6, 10.2, 11.0, 12, ['fern', 'mound', 'spike'], calm);
  P.border(b, rand, 0.2, 10.5, 10.2, 11.0, 13, ['fern', 'mound', 'grass'], calm);
  P.border(b, rand, -5.0, 6.0, -1.6, -0.9, 9, ['spike', 'grass', 'fern'], [C.purple, '#b9c7ee']);
  P.border(b, rand, -4.6, 5.6, 5.4, 6.0, 8, ['grass', 'spike', 'mound'], [C.purple, C.white]);
  for (const [x, z, r] of [[-9.6, 4.6, 0.5], [-10.4, 6.0, 0.4], [2.6, -6.6, 0.45], [3.4, -7.2, 0.3]]) { P.rock(b, x, z, r, C.stoneD); b.ball(x, r * 0.52, z, r * 0.7, C.moss, { sy: 0.3, seg: 6 }); }
  P.steppingStones(b, [[-1.4, 10.0], [-1.2, 8.2], [-1.6, 6.4]]);
  P.clutter(b, rand, 36, -11, 11, -9.5, 10.8, ok, ['clover', 'pebble', 'mushroom', 'clover', 'leaf', 'pebble']);
  for (const [x, z] of [[-1.9, 9.2], [-0.6, 7.3], [-2.2, 5.6], [-5.0, 2.2], [6.2, 1.9]]) P.pathLight(b, x, z);
  P.stringLights(b, [-5.95, 3.1, -4.8], [-5.95, 3.1, 1.6], 8, 0.22, ['#ffe2b0', '#ffcf8a']);
  W.addItem('fishtoy', 'outside', b.p(4.2, 0, -1.6));
  W.addItem('flower', 'outside', b.p(-7.8, 0, 7.4));
  b.finish();
}

// ---------------- the vegetable garden ----------------
function vegGarden(W, b, rand, out) {
  const ok = rectExcl([[-2.4, 2.4, -5.4, 4.4], [-11.8, -6.2, -6.8, -0.8], [-8, -4, -11, -9.4]]);
  P.patches(b, rand, 11, -11, 11, -10, 10.5, ok);
  P.tufts(b, rand, 190, -11.5, 11.5, -10.5, 11, ok);
  P.house(b, { wall: C.brick, roof: C.slateD, base: C.brickD, style: 'brick', door: { x: -6, color: '#5f8a5a', y: 0.2, porch: C.slateD }, windows: [[-1.5, 0.8, 1.4, 3.1], [5, 8, 1.4, 3.1]], shutters: C.white, boxes: [0, 1], chimney: 9.6, pipe: -9.4 });
  b.block(-7.2, -4.8, 0, 0.2, -11, -9.8, C.stone, { climb: false });
  W.addBowl('food', 'outside', b.p(-4.1, 0, -10.2));
  W.addBowl('water', 'outside', b.p(-3.5, 0, -10.4));
  // raised beds
  const bed = (z0, z1) => { b.block(-2.2, 2.2, 0, 0.3, z0, z1, C.wood, { climb: false }); b.box(-2.05, 2.05, 0.3, 0.34, z0 + 0.15, z1 - 0.15, C.soil); };
  bed(-5.2, -3.2); bed(-1.6, 0.4); bed(2.0, 4.2);
  for (let i = 0; i < 8; i++) { const x = -1.6 + (i % 4) * 1.05, z = -4.7 + Math.floor(i / 4) * 0.95; b.ball(x, 0.48, z, 0.3, i % 2 ? '#a9c765' : '#8fba58', { sy: 0.75, seg: 7 }); b.ball(x, 0.56, z, 0.17, '#cfe09a', { seg: 6 }); }
  for (let i = 0; i < 12; i++) { const x = -1.8 + (i % 6) * 0.72, z = -1.1 + Math.floor(i / 6) * 0.95; b.cone(x, 0.3, 0.42, z, 0.07, C.orange, { seg: 5 }); b.ball(x, 0.56, z, 0.16, C.leaf, { sy: 1.3, layer: 'sway', sway: 0.8, seg: 5 }); }
  for (const [x, z, r] of [[-1.2, 2.8, 0.38], [0.4, 3.5, 0.3], [1.4, 2.6, 0.26]]) { b.ball(x, 0.34 + r * 0.75, z, r, C.orange, { sy: 0.78, seg: 9 }); b.box(x - 0.03, x + 0.03, 0.34 + r * 1.4, 0.34 + r * 1.65, z - 0.03, z + 0.03, C.leafD); b.ball(x + r, 0.4, z + 0.2, 0.26, C.leaf, { sy: 0.25, layer: 'sway', sway: 0.3, seg: 6 }); }
  // bean wigwam
  for (let i = 0; i < 6; i++) { const a = i * 1.047; b.beam([5 + Math.cos(a) * 0.9, 0, -4 + Math.sin(a) * 0.9], [5, 2.6, -4], 0.03, C.woodL); for (let k = 1; k < 4; k++) b.ball(5 + Math.cos(a) * 0.9 * (1 - k / 4.5), k * 0.58, -4 + Math.sin(a) * 0.9 * (1 - k / 4.5), 0.24, k % 2 ? C.leaf : C.leafL, { layer: 'sway', sway: 0.4, seg: 6 }); }
  b.solid(4.5, 5.5, 0, 1.6, -4.5, -3.5, { climb: false });
  // greenhouse
  b.block(-11.8, -6.4, 0, 0.5, -6.6, -6.4, C.brickD); b.block(-11.8, -6.4, 0, 0.5, -1.2, -1.0, C.brickD);
  b.block(-6.6, -6.4, 0, 0.5, -6.6, -4.3, C.brickD); b.block(-6.6, -6.4, 0, 0.5, -3.1, -1.0, C.brickD);
  b.solid(-11.8, -6.4, 0.5, 2.4, -6.6, -6.45, { climb: false }); b.solid(-11.8, -6.4, 0.5, 2.4, -1.15, -1.0, { climb: false });
  b.solid(-6.55, -6.4, 0.5, 2.4, -6.6, -4.3, { climb: false }); b.solid(-6.55, -6.4, 0.5, 2.4, -3.1, -1.0, { climb: false });
  b.box(-11.8, -6.4, 0.5, 2.4, -1.12, -1.06, '#cfe9ef', { layer: 'water' }); b.box(-6.5, -6.44, 0.5, 2.4, -6.6, -4.3, '#cfe9ef', { layer: 'water' }); b.box(-6.5, -6.44, 0.5, 2.4, -3.1, -1.0, '#cfe9ef', { layer: 'water' });
  for (let x = -11.8; x <= -6.4; x += 1.35) { b.box(x - 0.04, x + 0.04, 0.5, 2.4, -1.14, -1.02, C.white); b.beam([x, 2.4, -1.08], [x, 3.3, -3.8], 0.04, C.white); b.beam([x, 2.4, -6.5], [x, 3.3, -3.8], 0.04, C.white); }
  for (const z of [-6.55, -4.3, -3.1, -1.08]) b.box(-6.52, -6.42, 0.5, 2.4, z - 0.04, z + 0.04, C.white);
  b.box(-11.8, -6.4, 2.36, 2.44, -1.14, -1.02, C.white); b.box(-6.52, -6.42, 2.36, 2.44, -6.6, -1.0, C.white); b.box(-11.8, -6.4, 3.26, 3.34, -3.84, -3.76, C.white);
  for (const [x, z] of [[-10.5, -5.4], [-9.2, -5.6], [-7.8, -5.3], [-10.2, -2.2], [-8.4, -2.0]]) b.ball(x, 1.1, z, 0.5, C.leaf, { sy: 1.2, seg: 7 });
  W.link('outside', b.p(-6.05, 0, -3.7), [1, 0], 'greenhouse', W.roomDoor.greenhouse, [1, 0], 'creak');
  // scarecrow
  b.block(6.42, 6.58, 0, 1.7, 1.92, 2.08, C.woodD, { climb: false }); b.box(5.7, 7.3, 1.25, 1.35, 1.95, 2.05, C.woodD);
  b.box(6.05, 6.95, 0.75, 1.4, 1.9, 2.1, C.blue, { layer: 'sway' }); b.ball(6.5, 1.95, 2, 0.27, C.hay, { seg: 8 }); b.cone(6.5, 2.1, 2.55, 2, 0.4, C.woodD, { seg: 8 }); b.cyl(6.5, 2.1, 2.14, 2, 0.5, 0.5, C.woodD, { seg: 10 });
  // water butt, compost, wheelbarrow, tools
  b.solid(-11.6, -10.6, 0, 1.2, 1.6, 2.6); b.cyl(-11.1, 0, 1.2, 2.1, 0.5, 0.45, '#4d7a68', { seg: 10 }); b.cyl(-11.1, 1.2, 1.26, 2.1, 0.54, 0.54, C.dark, { seg: 10 });
  b.block(9.8, 11.2, 0, 1.0, -10.4, -9.0, C.woodD); for (const y of [0.25, 0.55, 0.85]) b.box(9.78, 11.22, y, y + 0.06, -10.42, -8.98, C.barkD);
  b.ball(10.5, 1.0, -9.7, 0.6, C.soil, { sy: 0.25 });
  W.addBed('compost', 'outside', b.p(10.5, 1.0, -9.7), 0.7);
  b.block(7.6, 9.4, 0.25, 0.6, 6.4, 7.6, '#5d8a72'); b.cyl(7.3, 0, 0.5, 7, 0.25, 0.25, C.dark, { rot: [Math.PI / 2, 0, 0], seg: 10 }); b.beam([9.4, 0.5, 6.5], [10.3, 0.75, 6.5], 0.04, C.woodD); b.beam([9.4, 0.5, 7.5], [10.3, 0.75, 7.5], 0.04, C.woodD); b.beam([9.2, 0, 6.6], [9.2, 0.3, 6.6], 0.04, C.dark); b.beam([9.2, 0, 7.4], [9.2, 0.3, 7.4], 0.04, C.dark);
  b.ball(8.5, 0.62, 7, 0.55, '#d9c9a3', { sy: 0.35, sx: 1.3, seg: 8 });
  W.addBed('barrow', 'outside', b.p(8.5, 0.6, 7), 0.8);
  for (const [x, c] of [[3.2, C.metal], [3.7, C.woodD]]) b.beam([x, 0, -10.9], [x + 0.1, 1.7, -11.0], 0.035, c);
  b.cyl(2.2, 0, 0.4, -10.3, 0.22, 0.2, '#6d9a8a', { seg: 8 }); b.beam([2.35, 0.25, -10.3], [2.75, 0.45, -10.3], 0.035, '#6d9a8a');
  P.tree(b, -8, 7.2, { kind: 'apple', h: 2.2, r: 0.4, scale: 0.9 });
  for (const [x, z] of [[-7.1, 8.3], [-8.6, 8.6], [-6.8, 6.6]]) b.ball(x, 0.1, z, 0.1, C.red, { seg: 6 });
  for (let i = 0; i < 6; i++) { const z = -9 + i * 1.5; b.box(11.1, 11.16, 0, 1.9 + (i % 2) * 0.2, z, z + 0.06, C.leafD, { layer: 'sway' }); b.cyl(11.1, 1.9 + (i % 2) * 0.2, 2.0 + (i % 2) * 0.2, z, 0.34, 0.34, C.yellow, { seg: 9, rot: [0, 0, 1.2], layer: 'sway' }); b.ball(10.95, 1.95 + (i % 2) * 0.2, z, 0.16, C.barkD, { seg: 6, layer: 'sway' }); }
  P.steppingStones(b, [[-6, -9.0], [-5.2, -7.6], [-4.4, -6.2], [-3.6, 9.9], [-3.4, 8.4], [-3.2, 6.6]]);
  const kitchen = [C.orange, C.yellow, C.red, C.white];
  P.border(b, rand, -2.6, 9.4, -10.75, -9.9, 20, ['rose', 'mound', 'tulip', 'daisy', 'spike'], kitchen);
  P.border(b, rand, 3.0, 4.2, -5.4, 4.4, 10, ['tulip', 'mound', 'daisy'], kitchen);
  P.border(b, rand, -11.5, -10.6, 3.4, 10.8, 9, ['mound', 'fern', 'grass'], kitchen);
  P.border(b, rand, -11, -5, 10.3, 11.0, 9, ['tulip', 'daisy', 'mound'], kitchen);
  P.border(b, rand, -2.6, 10.5, 10.3, 11.0, 15, ['tulip', 'daisy', 'mound', 'sunflower'], kitchen);
  P.border(b, rand, 9.2, 10.4, -8.4, 5.5, 8, ['sunflower', 'mound'], kitchen);
  P.clutter(b, rand, 40, -11, 11, -9.5, 10.8, ok, ['daisy', 'clover', 'dandelion', 'pebble', 'butter', 'leaf']);
  P.stringLights(b, [-6.38, 2.5, -6.5], [-6.38, 2.5, -1.1], 8, 0.2);
  for (const [x, z] of [[-5.5, -8.4], [-4.0, -5.4], [-3.9, 7.6], [-2.8, 9.4]]) P.pathLight(b, x, z);
  // cloches, a trug of vegetables, stacked pots
  for (const [x, z] of [[-1.5, 2.4], [1.2, 3.6]]) b.ball(x + 2.6, 0.2, z, 0.26, '#cfe9ef', { sy: 0.9, seg: 7, layer: 'water' });
  b.block(3.4, 4.2, 0, 0.26, 5.6, 6.1, C.woodL, { climb: false }); for (let k = 0; k < 4; k++) b.ball(3.55 + k * 0.17, 0.3, 5.85, 0.1, [C.orange, C.red, '#a9c765', C.orange][k], { seg: 5 });
  for (let k = 0; k < 3; k++) b.cyl(1.4, k * 0.22, k * 0.22 + 0.26, -9.9, 0.2 - k * 0.03, 0.16 - k * 0.03, C.terracotta, { seg: 7 });
  W.addItem('acorn', 'outside', b.p(-7.4, 0, 5.8));
  W.addItem('cloth', 'outside', b.p(6.2, 0, 3.0));
  b.finish();
}

// ---------------- the overgrown garden ----------------
function wildGarden(W, b, rand, out) {
  const ok = rectExcl([[-11.8, -7.2, -9.8, -5.2], [4.2, 6.8, 3.6, 8.4], [-3.8, -0.2, 4.2, 5.8]]);
  P.patches(b, rand, 16, -11, 11, -10, 10.5, ok, [C.moss, C.grassD, '#93b552']);
  P.tufts(b, rand, 330, -11.5, 11.5, -10.5, 11, ok);
  // long grass to wade through
  for (const [cx, cz, r, n] of [[2, -1, 3.2, 90], [-7, 2, 2.4, 60], [8, 9, 2.2, 50], [-2, 9, 1.8, 36]]) {
    for (let i = 0; i < n; i++) {
      const a = rand() * 6.28, d = Math.sqrt(rand()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (!ok(x, z)) continue;
      b.cone(x, 0, 0.5 + rand() * 0.45, z, 0.09, ['#8fb04c', '#a5c05a', '#7da243', '#b9c56a'][i % 4], { seg: 4, layer: 'sway', sway: 1.4 });
    }
  }
  P.house(b, { wall: '#b9c0ae', roof: '#7d8a6a', base: '#9aa392', style: 'stone', door: { x: 4, color: '#7a6a5a' }, windows: [[-3, -0.5, 1.4, 3.0], [7.5, 9.8, 1.4, 3.0]], curtains: null, chimney: -8.5, smokey: false, pipe: 11.2 });
  for (let i = 0; i < 16; i++) b.ball(-11 + rand() * 7, 0.5 + rand() * 3.4, -10.9, 0.45 + rand() * 0.35, i % 2 ? C.leafD : C.leaf, { sz: 0.3, layer: 'sway', sway: 0.15, seg: 6 });
  b.box(7.4, 9.9, 1.9, 2.1, -10.92, -10.86, C.woodD, { rot: [0, 0, 0.12] }); b.box(7.4, 9.9, 2.5, 2.7, -10.92, -10.86, C.wood, { rot: [0, 0, -0.1] });
  // potting shed
  b.block(-11.7, -7.4, 0, 2.3, -9.7, -9.5, C.woodD, { climb: false }); b.block(-11.7, -11.5, 0, 2.3, -9.7, -5.4, C.woodD, { climb: false });
  b.block(-11.7, -7.4, 0, 2.3, -5.6, -5.4, C.wood, { climb: false }); b.block(-7.6, -7.4, 0, 2.3, -9.7, -8.0, C.wood, { climb: false }); b.block(-7.6, -7.4, 0, 2.3, -6.9, -5.4, C.wood, { climb: false });
  for (let x = -11.7; x < -7.5; x += 0.5) b.box(x, x + 0.04, 0, 2.3, -5.42, -5.38, C.woodD);
  for (let z = -9.7; z < -5.5; z += 0.5) b.box(-7.42, -7.38, 0, 2.3, z, z + 0.04, C.woodD);
  b.solid(-11.7, -7.4, 2.3, 2.5, -9.7, -5.4, { climb: false });
  b.box(-11.9, -7.2, 2.3, 2.5, -7.55, -5.2, C.slate, { rot: [0.35, 0, 0] }); b.box(-11.9, -7.2, 2.3, 2.5, -9.9, -7.55, C.slateD, { rot: [-0.35, 0, 0] });
  b.box(-7.5, -7.46, 0, 1.9, -8.0, -6.9, '#3d2c22'); b.box(-7.42, -6.7, 0, 1.9, -6.93, -6.87, C.woodL, { rot: [0, -0.5, 0] });
  b.box(-10.6, -9.4, 1.0, 1.7, -5.42, -5.36, '#ffffff', { layer: 'glow' });
  W.link('outside', b.p(-7.05, 0, -7.45), [1, 0], 'shed', W.roomDoor.shed, [1, 0], 'creak');
  W.addBowl('milk', 'outside', b.p(-6.2, 0, -5.9));
  // upturned boat
  b.solid(4.5, 6.5, 0, 0.85, 4.0, 8.0);
  b.ball(5.5, 0, 6, 1.0, '#5d8fa8', { sx: 1.15, sy: 0.9, sz: 2.2, seg: 10 }); b.box(5.44, 5.56, 0.8, 0.95, 4.1, 7.9, C.white); b.ball(5.5, 0, 6, 1.0, C.white, { sx: 1.18, sy: 0.3, sz: 2.24, seg: 10 });
  W.addBed('boat', 'outside', b.p(5.5, 0.85, 6), 0.8);
  // hollow log
  b.solid(-3.6, -0.4, 0, 1.2, 4.4, 5.6);
  b.lying(-2, 0.6, 5, 3.2, 0.62, C.bark, 'x', { seg: 10 });
  b.lying(-0.39, 0.6, 5, 0.04, 0.6, C.woodL, 'x', { seg: 10 }); b.lying(-0.36, 0.6, 5, 0.03, 0.44, '#2e211b', 'x', { seg: 10 });
  b.ball(-2.4, 1.18, 5.1, 0.5, C.moss, { sy: 0.3, sx: 1.6, seg: 7 }); for (const x of [-3.0, -1.4]) b.cyl(x, 1.2, 1.4, 4.9, 0.1, 0.05, C.red, { seg: 6 });
  W.link('outside', b.p(-0.05, 0, 5), [1, 0], 'burrow', W.roomDoor.burrow, [1, 0], 'rustle');
  // bird bath
  b.block(1.8, 2.2, 0, 0.8, -4.2, -3.8, C.stoneD, { climb: false }); b.cyl(2, 0.8, 0.95, -4, 0.6, 0.3, C.stone, { seg: 10 }); b.disc(2, 0.96, -4, 0.5, C.water, { layer: 'water', seg: 10 });
  // brambles, mushrooms, tyre, leaf pile, willow
  P.bush(b, 10.6, 3, 0.9, [C.leafD, '#467a3c', C.leaf], { berries: '#6b3f8a' }); P.bush(b, 10.4, 5.2, 0.75, [C.leafD, C.leaf, '#467a3c'], { berries: '#6b3f8a' });
  for (let i = 0; i < 8; i++) { const a = i * 0.785, x = 8 + Math.cos(a) * 1.1, z = -5 + Math.sin(a) * 1.1; b.cyl(x, 0, 0.16, z, 0.04, 0.05, C.white, { seg: 5 }); b.ball(x, 0.18, z, 0.12, i % 2 ? C.red : '#d9744f', { sy: 0.6, seg: 7 }); }
  b.cyl(-9, 0, 0.3, 8.6, 0.75, 0.75, '#32353d', { seg: 12 }); b.cyl(-9, 0.02, 0.31, 8.6, 0.42, 0.42, C.grassD, { seg: 10 });
  b.solid(-9.75, -8.25, 0, 0.3, 7.85, 9.35, { climb: false });
  W.addBed('tyre', 'outside', b.p(-9, 0.3, 8.6), 0.6);
  for (let i = 0; i < 26; i++) { const a = rand() * 6.28, d = Math.sqrt(rand()) * 1.1; b.ball(0.5 + Math.cos(a) * d, 0.05 + (1.1 - d) * 0.22, -8 + Math.sin(a) * d * 0.8, 0.2, [C.orange, '#c8553d', C.yellow, '#b98a4a'][i % 4], { sy: 0.3, seg: 5, rot: [rand(), rand() * 3, 0] }); }
  W.addBed('leaves', 'outside', b.p(0.5, 0, -8), 1.0);
  P.tree(b, 8.6, -8.4, { kind: 'willow', h: 2.4, r: 0.42, leaves: ['#8fb552', '#a5c45c', '#7ba548'] });
  P.rock(b, -5.4, -2.6, 0.55, C.stoneD); P.rock(b, 9.6, 10.2, 0.4);
  P.flowers(b, rand, -4, -6.5, 1.5, 20, [C.yellow, C.white, C.yellow]);
  P.flowers(b, rand, 9, 0.2, 1.2, 14, [C.purple, C.pink]);
  const meadow = [C.purple, C.pink, C.white, C.yellow, C.red, '#b9c7ee'];
  P.border(b, rand, -11.3, 11.3, -10.6, 11, 120, ['spike', 'grass', 'daisy', 'fern', 'mound', 'daisy', 'grass'], meadow, ok);
  P.border(b, rand, -7, 11.4, -10.75, -9.9, 16, ['fern', 'spike', 'grass', 'mound'], meadow);
  P.clutter(b, rand, 60, -11, 11, -9.5, 10.8, ok, ['mushroom', 'dandelion', 'leaf', 'pebble', 'butter', 'daisy', 'clover']);
  // a jam-jar lantern someone left, an old wheel, a forgotten boot
  b.cyl(-6.3, 0, 0.3, -4.6, 0.11, 0.11, '#ffffff', { seg: 7, layer: 'glow' }); b.cyl(-6.3, 0.3, 0.34, -4.6, 0.12, 0.12, C.metal, { seg: 7 });
  b.cyl(3.4, 0.05, 0.13, 9.6, 0.6, 0.6, C.woodD, { seg: 12, rot: [0.3, 0, 0.2] });
  b.block(-4.9, -4.6, 0, 0.42, 0.9, 1.3, '#5a6a4a', { climb: false }); b.box(-4.9, -4.45, 0, 0.16, 1.2, 1.6, '#5a6a4a');
  W.addItem('pinecone', 'outside', b.p(7.0, 0, -6.6));
  W.addItem('leaf', 'outside', b.p(1.6, 0, -7.0));
  W.addItem('feather', 'outside', b.p(2.8, 0, -3.2));
  b.finish();
}
