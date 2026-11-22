import * as THREE from 'three';
import { Builder, tint, toon } from './build.js';
import { C } from './props.js';

// Interiors: small cutaway rooms seen from the same angle as the gardens.
// Each sits far from the street. Local coordinates: the left wall is x = 0, the back wall is z = 0.

export function buildRooms(W, scene) {
  W.roomDoor = {};
  W.sunbeams = [];
  W.skyMat = new THREE.MeshBasicMaterial({ color: '#a9cfe0' });
  const beamMat = new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  W.beamMat = beamMat;
  let idx = 0;

  function room(id, { w, d, h, floor, wall, wall2 = wall, cap = '#2c2430', light }) {
    const group = new THREE.Group();
    scene.add(group);
    const ox = idx++ * 60, oz = 300;
    const b = new Builder(W, group, ox, oz);
    W.regions[id] = {
      id, group, indoor: true, size: { w, d, h }, origin: [ox, oz], light,
      bounds: { x0: ox + 0.28, x1: ox + w - 0.3, z0: oz + 0.28, z1: oz + d - 0.3 },
    };
    b.box(0, w, -0.5, 0, 0, d, floor);
    b.box(0, w, -0.5, -0.12, 0, d + 0.02, tint(floor, -0.14));
    b.block(-0.35, 0, -0.5, h, -0.35, d, wall, { climb: false });
    b.block(0, w, -0.5, h, -0.35, 0, wall2, { climb: false });
    b.box(-0.36, 0.0, h, h + 0.04, -0.36, d, cap);
    b.box(0, w, h, h + 0.04, -0.36, 0.0, cap);
    b.id = id;
    b.group = group;
    return b;
  }
  const doorL = (b, z0, z1, hgt, color = '#2a1f1a') => {
    b.box(0, 0.03, 0, hgt, z0, z1, color);
    b.box(0, 0.05, hgt, hgt + 0.1, z0 - 0.1, z1 + 0.1, C.woodD);
    b.box(0.05, 0.9, 0, 0.012, z0 + 0.05, z1 - 0.05, '#b8a37a');
    W.roomDoor[b.id] = b.p(0.42, 0, (z0 + z1) / 2);
  };
  const win = (b, side, a0, a1, y0, y1, frame = C.white) => {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(side === 'L' ? 0.04 : a1 - a0 - 0.2, y1 - y0 - 0.2, side === 'L' ? a1 - a0 - 0.2 : 0.04), W.skyMat);
    if (side === 'L') { b.box(0, 0.05, y0, y1, a0, a1, frame); b.dyn(pane, 0.05, (y0 + y1) / 2, (a0 + a1) / 2); b.box(0.04, 0.08, y0, y1, (a0 + a1) / 2 - 0.03, (a0 + a1) / 2 + 0.03, frame); b.box(0, 0.16, y0 - 0.08, y0, a0 - 0.08, a1 + 0.08, frame); } else { b.box(a0, a1, y0, y1, 0, 0.05, frame); b.dyn(pane, (a0 + a1) / 2, (y0 + y1) / 2, 0.05); b.box((a0 + a1) / 2 - 0.03, (a0 + a1) / 2 + 0.03, y0, y1, 0.04, 0.08, frame); b.box(a0 - 0.08, a1 + 0.08, y0 - 0.08, y0, 0, 0.16, frame); }
  };
  const sunbeam = (b, x, z, w, d, skew = 0.6) => {
    const g = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
    g.applyMatrix4(new THREE.Matrix4().makeShear(0, 0, 0, 0, skew, 0));
    const m = new THREE.Mesh(g, beamMat);
    m.renderOrder = 1;
    b.dyn(m, x, 0.02, z);
  };
  const lamp = (b, x, y, z, color = '#ffb060', power = 10, dist = 8) => {
    const l = new THREE.PointLight(color, power * 0.5, dist, 1.4);
    b.dyn(l, x, y, z);
    return l;
  };
  const planksFloor = (b, w, d, a, c2, step = 0.6) => { for (let z = 0, i = 0; z < d; z += step, i++) b.box(0, w, 0, 0.012, z + 0.02, Math.min(z + step, d), i % 2 ? a : c2); };
  const planksWall = (b, side, len, h, a, c2, step = 0.5) => {
    for (let p = 0, i = 0; p < len; p += step, i++) {
      if (side === 'L') b.box(0, 0.02, 0, h, p + 0.02, Math.min(p + step, len), i % 2 ? a : c2); else b.box(p + 0.02, Math.min(p + step, len), 0, h, 0, 0.02, i % 2 ? a : c2);
    }
  };

  // ---------- home: the kitchen-sitting room behind the cat flap ----------
  {
    const b = room('home', { w: 9, d: 7, h: 3.2, floor: '#b98c5e', wall: '#e9dcc3', wall2: '#b9c9a8', light: { hemi: ['#ffe9c8', '#8a6a52', 0.95, 0.5], sun: ['#fff1da', 1.5, 0.3], bg: ['#2b2233', '#1b1622'] } });
    planksFloor(b, 9, 7, '#b98c5e', '#c2966a');
    b.box(0, 9, 0, 0.25, 0, 0.04, C.white); b.box(0, 0.04, 0, 0.25, 0, 7, C.white);
    doorL(b, 2.3, 3.5, 2.5, '#5d8f8c');
    b.box(0.03, 0.06, 0.08, 0.6, 2.6, 3.2, '#2a1f1a');
    win(b, 'R', 5.4, 7.4, 1.2, 2.7);
    sunbeam(b, 6.0, 2.2, 1.8, 2.4, 0.5);
    // fireplace
    b.block(1.2, 3.8, 0, 1.7, 0, 0.55, C.brick); b.box(1.1, 3.9, 1.7, 1.82, 0, 0.7, C.woodD); b.solid(1.1, 3.9, 1.7, 1.82, 0, 0.7);
    b.box(1.8, 3.2, 0, 1.1, 0.5, 0.57, '#241a1a'); b.box(1.5, 3.5, 0, 0.06, 0.55, 1.1, C.stoneD);
    b.box(2.0, 3.0, 0.06, 0.2, 0.6, 0.8, C.barkD);
    const fire = new THREE.Group();
    for (const [x, hgt, col] of [[-0.25, 0.5, '#ff8a3a'], [0.05, 0.7, '#ffb347'], [0.3, 0.45, '#ff8a3a'], [0, 0.4, '#ffe08a']]) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, hgt, 5), new THREE.MeshBasicMaterial({ color: col })); f.position.set(x, hgt / 2, 0); fire.add(f); }
    b.dyn(fire, 2.5, 0.2, 0.72);
    const fl = lamp(b, 2.5, 0.7, 1.3, '#ff9a4a', 16, 9);
    W.updaters.push((dt, t) => { const k = 0.85 + Math.sin(t * 11) * 0.08 + Math.sin(t * 23.7) * 0.07; fl.intensity = 8 * k; fire.children.forEach((f, i) => { f.scale.y = 0.85 + Math.sin(t * (9 + i * 3) + i) * 0.2; }); });
    b.box(1.6, 1.9, 1.82, 2.2, 0.15, 0.4, C.navy); b.cyl(3.3, 1.82, 2.1, 0.3, 0.05, 0.05, C.white, { seg: 6 }); b.ball(3.3, 2.14, 0.3, 0.05, '#ffd98a', { layer: 'lit', seg: 6 });
    b.box(2.0, 3.0, 2.15, 2.9, 0, 0.04, C.woodD); b.box(2.1, 2.9, 2.25, 2.8, 0.03, 0.05, '#8fb0a0');
    // rug, sofa, basket
    b.disc(4.6, 0.02, 3.9, 1, '#c9695a', { sx: 2.3, sz: 1.5, seg: 18 }); b.disc(4.6, 0.025, 3.9, 1, '#e8d2a8', { sx: 1.8, sz: 1.1, seg: 18 }); b.disc(4.6, 0.03, 3.9, 1, '#c9695a', { sx: 1.2, sz: 0.65, seg: 18 });
    b.block(0, 1.3, 0, 0.5, 4.2, 6.7, '#6f8fa3'); b.block(0, 0.4, 0.5, 1.15, 4.2, 6.7, '#5f7f93'); b.block(0, 1.3, 0.5, 0.8, 4.2, 4.5, '#5f7f93'); b.block(0, 1.3, 0.5, 0.8, 6.4, 6.7, '#5f7f93');
    b.box(0.45, 1.25, 0.5, 0.58, 4.55, 5.4, '#7f9fb3'); b.box(0.45, 1.25, 0.5, 0.58, 5.45, 6.35, '#7f9fb3'); b.ball(0.6, 0.72, 4.9, 0.26, C.yellow, { sy: 0.8, seg: 7 });
    W.addBed('sofa', 'home', b.p(0.85, 0.58, 5.45), 0.85);
    b.cyl(4.6, 0, 0.24, 1.6, 0.68, 0.6, '#b98a55', { seg: 12 }); b.cyl(4.6, 0.06, 0.26, 1.6, 0.56, 0.56, C.red, { seg: 12 });
    b.solid(3.95, 5.25, 0, 0.1, 0.95, 2.25, { climb: false });
    W.addBed('basket', 'home', b.p(4.6, 0.1, 1.6), 0.62);
    // bookshelf, table lamp, plant, bowls
    b.block(7.9, 8.9, 0, 2.3, 0, 0.5, C.woodD);
    for (let s = 0; s < 4; s++) { b.box(7.95, 8.85, 0.12 + s * 0.55, 0.16 + s * 0.55, 0.05, 0.52, C.wood); for (let k = 0; k < 6; k++) b.box(8.0 + k * 0.14, 8.12 + k * 0.14, 0.16 + s * 0.55, 0.5 + s * 0.55 + (k % 3) * 0.03, 0.2, 0.5, [C.red, C.navy, C.teal, C.yellow, C.purple, C.cream][(k + s) % 6]); }
    b.block(0.2, 0.9, 0, 0.6, 3.65, 4.1, C.wood); b.cyl(0.55, 0.6, 0.9, 3.87, 0.05, 0.08, C.dark, { seg: 6 }); b.cone(0.55, 0.9, 1.25, 3.87, 0.26, '#ffe2a6', { seg: 8, layer: 'lit' });
    lamp(b, 0.8, 1.2, 4.0, '#ffc77a', 6, 6);
    b.cyl(8.4, 0, 0.5, 6.3, 0.3, 0.24, C.terracotta, { seg: 8 }); b.ball(8.4, 1.0, 6.3, 0.55, C.leaf, { sy: 1.2, layer: 'sway', sway: 0.15, seg: 8 }); b.solid(8.1, 8.7, 0, 0.5, 6.0, 6.6, { climb: false });
    b.box(7.1, 8.5, 0, 0.015, 4.7, 5.6, '#7fa39a');
    W.addBowl('food', 'home', b.p(7.5, 0.015, 5.15));
    W.addBowl('water', 'home', b.p(8.1, 0.015, 5.15));
    // cat tree by the window, curtains, shelves and pictures
    b.block(5.2, 5.9, 0, 0.08, 0.5, 1.2, '#b9a2ee', { climb: false });
    b.block(5.42, 5.68, 0, 1.3, 0.72, 0.98, '#d9c9a3'); b.block(5.1, 6.0, 1.3, 1.42, 0.4, 1.3, '#b9a2ee');
    b.block(6.35, 6.6, 0, 2.0, 0.3, 0.55, '#d9c9a3'); b.block(6.0, 6.95, 2.0, 2.12, 0.1, 0.95, '#b9a2ee'); b.box(5.9, 6.4, 1.42, 1.5, 0.5, 0.9, '#b9a2ee');
    W.addBed('cattree', 'home', b.p(6.48, 2.12, 0.52), 0.5);
    for (const x of [5.25, 7.55]) b.box(x - 0.16, x + 0.16, 1.0, 2.85, 0.05, 0.1, '#d98a8a');
    b.box(5.1, 7.7, 2.8, 2.9, 0.03, 0.14, C.woodD);
    b.box(0, 9, 0.25, 0.95, 0, 0.03, '#a9b998'); b.box(0, 9, 0.95, 1.02, 0, 0.05, C.white);
    b.box(0, 0.03, 0.25, 0.95, 0, 7, '#dccfb2'); b.box(0, 0.05, 0.95, 1.02, 0, 7, C.white);
    for (const [z, y, c] of [[0.9, 1.9, '#8fb0a0'], [1.55, 2.1, '#d98a8a'], [5.0, 2.0, '#e8c170'], [5.9, 1.8, '#7fa3c7']]) { b.box(0, 0.04, y, y + 0.55, z, z + 0.48, C.woodD); b.box(0.03, 0.05, y + 0.07, y + 0.48, z + 0.07, z + 0.41, c); }
    b.box(0, 0.3, 1.5, 1.56, 5.0, 6.4, C.woodL); for (let k = 0; k < 4; k++) b.cyl(0.15, 1.56, 1.76 + (k % 2) * 0.08, 5.15 + k * 0.38, 0.07, 0.06, [C.terracotta, C.blue, C.white, C.teal][k], { seg: 6 });
    b.ball(0.15, 1.9, 5.15, 0.14, C.leaf, { seg: 6, layer: 'sway', sway: 0.2 });
    b.cyl(7.3, 2.6, 3.2, 3.2, 0.012, 0.012, C.dark, { seg: 4 }); b.cyl(7.3, 2.3, 2.6, 3.2, 0.2, 0.14, C.terracotta, { seg: 7 }); for (let k = 0; k < 5; k++) b.ball(7.3 + Math.cos(k * 1.3) * 0.2, 2.2 - (k % 3) * 0.14, 3.2 + Math.sin(k * 1.3) * 0.2, 0.13, k % 2 ? C.leaf : C.leafL, { seg: 5, layer: 'sway', sway: 0.4 });
    b.cyl(2.4, 0, 0.28, 3.2, 0.3, 0.26, '#b98a55', { seg: 9 }); for (const [dx, dz, c] of [[0, 0, C.purple], [0.14, 0.1, C.pink], [-0.12, 0.08, C.teal]]) b.ball(2.4 + dx, 0.34, 3.2 + dz, 0.13, c, { seg: 6 });
    b.solid(2.1, 2.7, 0, 0.3, 2.9, 3.5, { climb: false });
    W.addItem('mouse', 'home', b.p(5.6, 0, 4.6));
    W.addBall('home', b.p(3.3, 0, 5.4), C.purple, 0.13);
    b.finish();
  }

  // ---------- inside the cardboard box ----------
  {
    const b = room('box', { w: 3.2, d: 2.6, h: 1.5, floor: C.cardD, wall: C.card, cap: '#8a6c44', light: { hemi: ['#ffe2b0', '#7a5a3a', 0.95, 0.42], sun: ['#fff0d0', 1.3, 0.3], bg: ['#3a2a1e', '#22180f'] } });
    for (let x = 0.2; x < 3.2; x += 0.24) b.box(x, x + 0.03, 0, 1.5, 0, 0.02, tint(C.card, -0.05));
    for (let z = 0.2; z < 2.6; z += 0.24) b.box(0, 0.02, 0, 1.5, z, z + 0.03, tint(C.card, -0.05));
    b.box(1.2, 2.0, 0, 0.62, 0, 0.03, '#ffe9b8', { layer: 'lit' });
    W.roomDoor.box = b.p(1.6, 0, 0.42);
    b.box(0.5, 2.9, 0, 0.05, 0.9, 2.4, '#b9a2ee', { r: 0.02 }); b.box(0.6, 2.8, 0.05, 0.07, 1.0, 1.25, C.white); b.box(0.6, 2.8, 0.05, 0.07, 2.05, 2.3, C.white);
    for (const [x, y] of [[0.5, 1.0], [2.6, 0.8], [1.9, 1.2]]) b.box(x, x + 0.08, y, y + 0.08, 0, 0.03, '#fff3c8', { layer: 'lit' });
    b.box(0, 0.03, 0.9, 1.0, 1.4, 1.5, '#fff3c8', { layer: 'lit' });
    W.addBed('boxbed', 'box', b.p(1.7, 0.06, 1.65), 1.0);
    W.addItem('wool', 'box', b.p(2.6, 0.06, 1.2));
    b.finish();
  }

  // ---------- the potting shed ----------
  {
    const b = room('shed', { w: 6, d: 5, h: 2.8, floor: '#7a5a44', wall: C.wood, light: { hemi: ['#ffdcb0', '#5a4636', 0.8, 0.36], sun: ['#ffe9c8', 1.3, 0.25], bg: ['#2a2018', '#17110c'] } });
    planksFloor(b, 6, 5, '#7a5a44', '#84634b', 0.5);
    planksWall(b, 'L', 5, 2.8, C.wood, C.plank); planksWall(b, 'R', 6, 2.8, C.plank, C.wood);
    doorL(b, 3.0, 4.2, 2.2);
    win(b, 'R', 0.7, 1.9, 1.3, 2.2, C.woodD);
    sunbeam(b, 1.3, 1.6, 1.1, 1.8, 0.4);
    b.block(2.5, 5.7, 0, 1.0, 0, 0.9, C.woodD); b.box(2.4, 5.8, 1.0, 1.08, 0, 1.0, C.woodL); b.solid(2.4, 5.8, 1.0, 1.08, 0, 1.0);
    for (const [x, c] of [[2.9, C.terracotta], [3.4, C.terracotta], [4.6, '#6d9a8a']]) b.cyl(x, 1.08, 1.4, 0.4, 0.17, 0.13, c, { seg: 7 });
    b.ball(3.4, 1.55, 0.4, 0.18, C.leaf, { seg: 6 }); b.box(5.0, 5.5, 1.08, 1.2, 0.2, 0.6, C.red);
    b.box(2.6, 5.6, 1.9, 1.96, 0, 0.4, C.woodL); for (let k = 0; k < 5; k++) b.cyl(2.9 + k * 0.6, 1.96, 2.2, 0.2, 0.12, 0.1, k % 2 ? C.terracotta : C.brickD, { seg: 6 });
    b.beam([0.3, 0, 0.5], [0.15, 2.0, 0.2], 0.035, C.woodD); b.box(0.1, 0.5, 1.9, 2.0, 0.1, 0.3, C.metal);
    b.beam([0.6, 0, 1.2], [0.2, 2.1, 1.0], 0.035, C.woodL);
    for (const [x, z, r] of [[4.6, 3.5, 0.6], [5.2, 3.9, 0.55], [4.9, 3.6, 0.5]]) b.ball(x, r * 0.5 + (r < 0.52 ? 0.5 : 0), z, r, r < 0.52 ? '#cdbb93' : '#d9c9a3', { sy: 0.62, seg: 8 });
    b.solid(4.0, 5.7, 0, 0.4, 2.9, 4.5, { climb: false });
    W.addBed('sacks', 'shed', b.p(4.8, 0.4, 3.65), 0.95);
    b.cyl(1.4, 0, 0.42, 3.9, 0.26, 0.22, '#6d9a8a', { seg: 8 }); b.beam([1.6, 0.3, 3.9], [2.05, 0.5, 3.9], 0.04, '#6d9a8a');
    b.block(0.4, 1.3, 0, 0.5, 1.8, 2.5, C.card);
    b.box(2.95, 3.05, 2.2, 2.8, 2.4, 2.5, C.dark); b.box(2.82, 3.18, 1.9, 2.25, 2.3, 2.6, '#ffd98a', { layer: 'lit' });
    lamp(b, 3.0, 1.8, 2.45, '#ffb860', 12, 8);
    W.addItem('pinecone', 'shed', b.p(2.2, 0, 2.2));
    W.addItem('cloth', 'shed', b.p(3.6, 0, 4.2));
    b.finish();
  }

  // ---------- the greenhouse ----------
  {
    const b = room('greenhouse', { w: 7.5, d: 4.5, h: 0.7, floor: '#b9b3a4', wall: C.brickD, cap: C.white, light: { hemi: ['#f4ffe6', '#8a9a72', 1.25, 0.5], sun: ['#fff8e0', 1.9, 0.35], bg: ['#2a3a34', '#18231f'] } });
    for (let x = 0; x < 7.5; x += 0.75) for (let z = 0; z < 4.5; z += 0.75) if ((Math.round(x / 0.75) + Math.round(z / 0.75)) % 2) b.box(x + 0.02, x + 0.73, 0, 0.012, z + 0.02, z + 0.73, '#c9c3b4');
    // glass walls above the brick
    const glassL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.0, 4.5), W.skyMat); b.dyn(glassL, -0.02, 1.74, 2.25);
    const glassR = new THREE.Mesh(new THREE.BoxGeometry(7.5, 2.0, 0.04), W.skyMat); b.dyn(glassR, 3.75, 1.74, -0.02);
    for (let x = 0; x <= 7.5; x += 1.25) b.box(x - 0.04, x + 0.04, 0.7, 2.75, -0.05, 0.03, C.white);
    for (let z = 0; z <= 4.5; z += 1.125) b.box(-0.05, 0.03, 0.7, 2.75, z - 0.04, z + 0.04, C.white);
    b.box(0, 7.5, 2.7, 2.78, -0.06, 0.03, C.white); b.box(-0.06, 0.03, 2.7, 2.78, 0, 4.5, C.white); b.box(0, 7.5, 1.7, 1.75, -0.05, 0.03, C.white); b.box(-0.05, 0.03, 1.7, 1.75, 0, 4.5, C.white);
    b.solid(-0.35, 0, 0.7, 2.8, -0.35, 4.5, { climb: false }); b.solid(0, 7.5, 0.7, 2.8, -0.35, 0, { climb: false });
    doorL(b, 0.5, 1.5, 0.68, '#3d4f48');
    b.box(0, 0.03, 0.7, 2.2, 0.5, 1.5, '#3d4f48');
    sunbeam(b, 4.2, 2.6, 4.4, 2.2, 0.3);
    b.block(1.9, 7.2, 0, 0.8, 0.05, 0.95, C.woodD); b.box(1.8, 7.3, 0.8, 0.86, 0, 1.0, C.woodL); b.solid(1.8, 7.3, 0.8, 0.86, 0, 1.0);
    for (let k = 0; k < 4; k++) { const x = 2.3 + k * 0.85; b.cyl(x, 0.86, 1.1, 0.5, 0.17, 0.13, C.terracotta, { seg: 7 }); b.box(x - 0.015, x + 0.015, 1.1, 2.0, 0.48, 0.52, C.leafD); for (let j = 0; j < 3; j++) { b.ball(x + (j - 1) * 0.16, 1.35 + j * 0.25, 0.5, 0.2, C.leaf, { layer: 'sway', sway: 0.2, seg: 6 }); b.ball(x + (j - 1) * 0.2, 1.3 + j * 0.24, 0.66, 0.07, j % 2 ? C.red : C.orange, { seg: 5 }); } }
    b.box(5.8, 6.8, 0.86, 0.94, 0.15, 0.8, '#7fa3c7'); b.box(5.85, 6.75, 0.94, 0.97, 0.2, 0.75, C.white);
    W.addBed('shelf', 'greenhouse', b.p(6.3, 0.94, 0.48), 0.6);
    b.block(0, 0.9, 0, 0.7, 2.4, 4.3, C.woodD); b.box(0, 1.0, 0.7, 0.76, 2.3, 4.4, C.woodL); b.solid(0, 1.0, 0.7, 0.76, 2.3, 4.4);
    for (let k = 0; k < 3; k++) { b.box(0.15, 0.85, 0.76, 0.84, 2.5 + k * 0.6, 2.95 + k * 0.6, C.dark); for (let j = 0; j < 3; j++) b.ball(0.3 + j * 0.2, 0.9, 2.72 + k * 0.6, 0.08, C.leafL, { seg: 5 }); }
    b.cyl(6.6, 0, 0.1, 3.6, 0.5, 0.5, '#5f8a5a', { seg: 12 }); b.cyl(6.6, 0.1, 0.2, 3.6, 0.4, 0.4, '#6f9a6a', { seg: 12 }); b.solid(6.1, 7.1, 0, 0.2, 3.1, 4.1, { climb: false });
    for (const [x, z] of [[3.2, 3.4], [4.0, 3.9], [2.6, 3.9]]) { b.cyl(x, 0, 0.3, z, 0.2, 0.16, C.terracotta, { seg: 7 }); b.ball(x, 0.5, z, 0.25, C.leafL, { layer: 'sway', sway: 0.2, seg: 6 }); b.solid(x - 0.18, x + 0.18, 0, 0.3, z - 0.18, z + 0.18, { climb: false }); }
    W.addItem('flower', 'greenhouse', b.p(4.8, 0, 2.2));
    W.addBowl('water', 'greenhouse', b.p(1.4, 0, 3.9));
    b.finish();
  }

  // ---------- the treehouse ----------
  {
    const b = room('treehouse', { w: 5, d: 4.6, h: 2.6, floor: C.plank, wall: C.woodL, light: { hemi: ['#ffe6c0', '#7a5a44', 0.95, 0.42], sun: ['#fff0d8', 1.4, 0.25], bg: ['#27352a', '#151d17'] } });
    planksFloor(b, 5, 4.6, C.plank, C.woodL, 0.46);
    planksWall(b, 'L', 4.6, 2.6, C.woodL, '#dab183'); planksWall(b, 'R', 5, 2.6, '#dab183', C.woodL);
    doorL(b, 2.9, 3.9, 1.5);
    win(b, 'R', 0.9, 2.1, 1.0, 2.0, C.woodD);
    sunbeam(b, 1.5, 1.5, 1.1, 1.6, 0.35);
    b.disc(2.6, 0.02, 2.6, 1, '#7fa3c7', { sx: 1.6, sz: 1.2, seg: 16 }); b.disc(2.6, 0.025, 2.6, 1, '#e8d2a8', { sx: 1.1, sz: 0.75, seg: 16 });
    for (const [x, z, r, c] of [[3.9, 1.0, 0.5, C.red], [4.3, 1.6, 0.45, C.yellow], [3.5, 1.5, 0.45, C.teal], [4.0, 0.6, 0.4, C.purple], [3.4, 0.8, 0.4, C.pink]]) b.ball(x, r * 0.35, z, r, c, { sy: 0.45, seg: 8 });
    b.solid(3.0, 4.7, 0, 0.22, 0.3, 2.0, { climb: false });
    W.addBed('cushions', 'treehouse', b.p(3.85, 0.22, 1.15), 0.9);
    // fairy lights and bunting
    const cols = ['#ffd98a', '#ff9a8a', '#9ad9ff', '#b9ff9a', '#ffb3e6'];
    for (let i = 0; i < 12; i++) b.ball(0.3 + i * 0.4, 2.25 - Math.sin((i / 11) * Math.PI) * 0.22, 0.06, 0.055, cols[i % 5], { layer: 'lit', seg: 5 });
    for (let i = 0; i < 10; i++) b.ball(0.06, 2.25 - Math.sin((i / 9) * Math.PI) * 0.22, 0.4 + i * 0.44, 0.055, cols[(i + 2) % 5], { layer: 'lit', seg: 5 });
    lamp(b, 2.5, 2.0, 0.8, '#ffc98a', 7, 7); lamp(b, 0.7, 2.0, 2.4, '#ffb9a0', 5, 6);
    // drawings, toy box, telescope
    for (const [x, y, c] of [[2.6, 1.3, C.white], [3.3, 1.5, '#fff3c8'], [4.1, 1.25, C.white]]) { b.box(x, x + 0.5, y, y + 0.62, 0, 0.03, c); b.box(x + 0.1, x + 0.4, y + 0.12, y + 0.4, 0.03, 0.04, [C.red, C.blue, C.leafL][Math.round(x) % 3]); }
    b.block(0.2, 1.3, 0, 0.5, 0.2, 0.9, C.blue); b.box(0.2, 1.3, 0.5, 0.56, 0.2, 0.9, C.navy); b.solid(0.2, 1.3, 0.5, 0.56, 0.2, 0.9);
    b.ball(0.75, 0.78, 0.55, 0.2, '#b98a5a', { seg: 7 }); b.ball(0.75, 1.05, 0.55, 0.15, '#b98a5a', { seg: 7 }); b.ball(0.64, 1.18, 0.55, 0.05, '#b98a5a', { seg: 5 }); b.ball(0.86, 1.18, 0.55, 0.05, '#b98a5a', { seg: 5 });
    b.beam([1.2, 0, 4.0], [1.5, 1.0, 3.8], 0.03, C.dark); b.beam([1.8, 0, 4.0], [1.5, 1.0, 3.8], 0.03, C.dark); b.beam([1.5, 0, 3.5], [1.5, 1.0, 3.8], 0.03, C.dark); b.beam([1.2, 0.95, 4.0], [1.9, 1.3, 3.5], 0.07, C.brickD);
    W.addItem('mitten', 'treehouse', b.p(2.2, 0, 3.2));
    W.addBall('treehouse', b.p(2.8, 0, 3.4), C.yellow, 0.14);
    b.finish();
  }

  // ---------- the tea house ----------
  {
    const b = room('teahouse', { w: 6.5, d: 5, h: 2.7, floor: '#c9c48a', wall: '#efe6d0', light: { hemi: ['#fff0d0', '#8a7a5a', 1.0, 0.4], sun: ['#fff3dc', 1.4, 0.25], bg: ['#232a33', '#141a20'] } });
    for (let x = 0; x < 6.5; x += 1.625) for (let z = 0; z < 5; z += 2.5) { b.box(x + 0.03, x + 1.6, 0, 0.012, z + 0.03, z + 2.47, (Math.round(x / 1.625) + Math.round(z / 2.5)) % 2 ? '#cfca92' : '#c2bd82'); }
    for (let x = 0; x <= 6.5; x += 1.625) b.box(x - 0.03, x + 0.03, 0, 0.014, 0, 5, '#5a5a3a');
    b.box(0, 6.5, 0, 0.014, 2.47, 2.53, '#5a5a3a');
    // shoji walls
    for (let x = 0; x <= 6.5; x += 0.65) b.box(x - 0.02, x + 0.02, 0.5, 2.7, 0, 0.03, C.barkD);
    for (const y of [0.5, 1.2, 1.9, 2.6]) { b.box(0, 6.5, y, y + 0.05, 0, 0.035, C.barkD); b.box(0, 0.035, y, y + 0.05, 0, 5, C.barkD); }
    for (let z = 0; z <= 5; z += 0.625) b.box(0, 0.03, 0.5, 2.7, z - 0.02, z + 0.02, C.barkD);
    b.box(0, 6.5, 0, 0.5, 0, 0.03, C.woodD); b.box(0, 0.03, 0, 0.5, 0, 5, C.woodD);
    doorL(b, 1.7, 2.9, 2.0);
    b.block(2.6, 4.2, 0, 0.34, 1.8, 2.9, C.barkD); b.box(2.5, 4.3, 0.34, 0.4, 1.7, 3.0, C.bark); b.solid(2.5, 4.3, 0.34, 0.4, 1.7, 3.0);
    b.ball(3.2, 0.55, 2.3, 0.16, '#5a7a8a', { seg: 8 }); b.beam([3.32, 0.56, 2.3], [3.52, 0.64, 2.3], 0.025, '#5a7a8a'); b.cyl(3.8, 0.4, 0.5, 2.1, 0.06, 0.05, C.white, { seg: 6 }); b.cyl(3.9, 0.4, 0.5, 2.6, 0.06, 0.05, C.white, { seg: 6 });
    for (const [x, z, c] of [[4.9, 3.5, '#8a5a8a'], [5.5, 2.6, '#b8452f'], [2.0, 3.6, '#8a5a8a']]) b.box(x - 0.42, x + 0.42, 0, 0.09, z - 0.42, z + 0.42, c, { r: 0.04 });
    W.addBed('zabuton', 'teahouse', b.p(5.2, 0.09, 3.05), 0.95);
    b.box(5.6, 6.1, 0, 0.9, 0.4, 0.9, '#fff0c8', { layer: 'lit' }); for (const [x, z] of [[5.58, 0.38], [6.08, 0.38], [5.58, 0.88], [6.08, 0.88]]) b.box(x, x + 0.04, 0, 0.95, z, z + 0.04, C.barkD);
    b.box(5.56, 6.14, 0.9, 0.95, 0.36, 0.94, C.barkD); b.solid(5.56, 6.14, 0, 0.95, 0.36, 0.94, { climb: false });
    lamp(b, 5.85, 0.7, 1.4, '#ffd08a', 12, 8);
    b.block(0.5, 1.3, 0, 0.5, 0.3, 0.9, C.barkD); b.cyl(0.9, 0.5, 0.62, 0.6, 0.2, 0.16, '#5a7a8a', { seg: 7 }); b.cyl(0.9, 0.62, 0.95, 0.6, 0.04, 0.05, C.bark, { seg: 5 }); b.ball(0.85, 1.05, 0.6, 0.26, C.pine, { sy: 0.6, seg: 7 }); b.ball(1.05, 0.95, 0.65, 0.16, C.leaf, { sy: 0.6, seg: 6 });
    b.box(2.6, 3.4, 0.8, 2.3, 0.03, 0.05, '#f6f1e4'); b.box(2.75, 3.25, 1.1, 2.0, 0.05, 0.06, '#3d4450'); b.box(2.55, 3.45, 2.3, 2.36, 0.03, 0.07, C.barkD);
    W.addBowl('milk', 'teahouse', b.p(1.5, 0, 4.2));
    W.addItem('ribbon', 'teahouse', b.p(3.6, 0, 3.9));
    b.finish();
  }

  // ---------- inside the hollow log ----------
  {
    const b = room('burrow', { w: 4.4, d: 3, h: 1.6, floor: '#5e4334', wall: '#6e4e3a', cap: '#3a2a20', light: { hemi: ['#d9c9a0', '#4a3a2a', 0.62, 0.34], sun: ['#ffe2b0', 0.8, 0.15], bg: ['#1c1712', '#0f0c09'] } });
    for (let x = 0.3; x < 4.4; x += 0.55) b.box(x, x + 0.06, 0, 1.6, 0, 0.03, '#5a3f2f');
    for (let z = 0.3; z < 3; z += 0.55) b.box(0, 0.03, 0, 1.6, z, z + 0.06, '#5a3f2f');
    b.box(0, 0.03, 0, 1.0, 1.0, 2.0, '#cfe3b0', { layer: 'lit' });
    W.roomDoor.burrow = b.p(0.42, 0, 1.5);
    for (const [x, z, r] of [[2.9, 1.3, 0.7], [3.5, 1.7, 0.55], [2.5, 1.9, 0.5], [3.3, 0.9, 0.45]]) b.ball(x, 0, z, r, [C.moss, '#6f9a45', '#527d35'][Math.round(x * 2) % 3], { sy: 0.28, seg: 8 });
    W.addBed('mossbed', 'burrow', b.p(3.0, 0.08, 1.45), 1.0);
    for (const [x, z, hgt] of [[0.7, 0.4, 0.3], [1.1, 0.3, 0.2], [4.0, 0.4, 0.34], [3.7, 2.6, 0.22], [1.6, 2.7, 0.26]]) { b.cyl(x, 0, hgt, z, 0.035, 0.045, '#e9f4e0', { seg: 5, layer: 'lit' }); b.ball(x, hgt, z, 0.12, '#8ff0d0', { sy: 0.6, seg: 6, layer: 'lit' }); }
    lamp(b, 0.9, 0.5, 0.6, '#7fe0c0', 4, 5); lamp(b, 3.9, 0.5, 0.7, '#7fe0c0', 3.5, 5); lamp(b, 2.6, 1.2, 2.2, '#ffd9a0', 4, 6);
    b.beam([1.8, 1.6, 0.1], [2.3, 0.6, 0.2], 0.06, '#4a3426'); b.beam([2.3, 0.6, 0.2], [2.2, 0, 0.5], 0.04, '#4a3426'); b.beam([0.1, 1.5, 2.5], [0.5, 0.5, 2.7], 0.05, '#4a3426');
    W.addItem('acorn', 'burrow', b.p(1.4, 0, 1.2));
    W.addItem('acorn', 'burrow', b.p(1.7, 0, 0.9));
    W.addItem('leaf', 'burrow', b.p(2.0, 0, 2.4));
    b.finish();
  }
}
