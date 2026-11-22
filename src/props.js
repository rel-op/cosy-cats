import * as THREE from 'three';
import { toon, tint } from './build.js';

// Reusable scenery pieces. Each takes a Builder `b` and local coordinates.

export const C = {
  grass: '#86b34d', grassD: '#74a544', grassL: '#9cc45a', moss: '#5f8f3a',
  leaf: '#4f9140', leafD: '#3b7a3a', leafL: '#74ad4a', pine: '#2f6b4a',
  earth: '#8a5a44', soil: '#6e4a3a', bark: '#7a4e3a', barkD: '#5e3b2e',
  wood: '#b88558', woodD: '#96693f', woodL: '#d2a373', plank: '#c4935f',
  stone: '#c9c3b4', stoneD: '#a39d90', stoneL: '#ded9cc', slate: '#6e8591', slateD: '#57707a',
  brick: '#b5654a', brickD: '#9a523c', terracotta: '#c9764f',
  cream: '#f2e6cc', white: '#f6f1e4', red: '#cf573c', orange: '#de9e41', yellow: '#e8c170',
  pink: '#df84a5', purple: '#9b6bb3', blue: '#5b8fb9', teal: '#4f9a96', navy: '#3c5e8b',
  water: '#6fb3d2', waterD: '#4f8fba', waterL: '#a4dddb', sand: '#e6cf9c', hay: '#e3c86f',
  card: '#c9a26b', cardD: '#b08a56', metal: '#8f9aa3', dark: '#3d4450',
};

export function house(b, { wall = C.cream, roof = C.terracotta, trim = C.white, door = null, windows = [], x0 = -12, x1 = 12, h = 5.4, base = '#dccfb2' } = {}) {
  b.block(x0, x1, 0, h, -12.4, -11, wall, { climb: false });
  b.box(x0, x1, 0, 0.4, -11.06, -10.94, base);
  b.box(x0 - 0.05, x1 + 0.05, h, h + 0.5, -12.5, -10.6, roof);
  b.box(x0 - 0.05, x1 + 0.05, h + 0.5, h + 0.75, -12.5, -11.1, tint(roof, -0.06));
  for (const [wx0, wx1, wy0, wy1] of windows) {
    b.box(wx0, wx1, wy0, wy1, -11.07, -10.92, trim);
    b.box(wx0 + 0.14, wx1 - 0.14, wy0 + 0.14, wy1 - 0.14, -11.0, -10.9, '#ffffff', { layer: 'glow' });
    const mx = (wx0 + wx1) / 2, my = (wy0 + wy1) / 2;
    b.box(mx - 0.04, mx + 0.04, wy0 + 0.14, wy1 - 0.14, -10.95, -10.88, trim);
    b.box(wx0 + 0.14, wx1 - 0.14, my - 0.04, my + 0.04, -10.95, -10.88, trim);
    b.box(wx0 - 0.08, wx1 + 0.08, wy0 - 0.1, wy0, -11.05, -10.82, trim);
  }
  if (door) {
    const { x, color = C.teal, flap = false, y = 0 } = door;
    b.box(x - 0.85, x + 0.85, y, y + 2.95, -11.07, -10.93, trim);
    b.box(x - 0.7, x + 0.7, y, y + 2.8, -11.05, -10.9, color);
    b.box(x - 0.5, x + 0.5, y + 1.5, y + 2.5, -11.0, -10.88, tint(color, -0.08));
    if (flap) b.box(x - 0.3, x + 0.3, y + 0.08, y + 0.6, -11.0, -10.86, tint(color, -0.18));
    b.ball(x + 0.5, y + 1.4, -10.86, 0.06, C.yellow);
  }
}

// A boundary running along z at a fixed x. `gaps` are [z0, z1] openings.
export function boundary(b, x, z0, z1, kind, { h = 1.4, gaps = [] } = {}) {
  const segs = [];
  let z = z0;
  for (const [g0, g1] of [...gaps].sort((a, c) => a[0] - c[0])) {
    if (g0 > z) segs.push([z, g0]);
    z = g1;
  }
  if (z < z1) segs.push([z, z1]);
  const t = 0.15;
  for (const [a, c] of segs) {
    if (kind === 'plank') {
      b.solid(x - t, x + t, 0, h, a, c);
      for (let p = a; p < c - 0.05; p += 0.5) b.box(x - t + 0.02, x + t - 0.02, 0, h - (Math.round(p * 2) % 3 === 0 ? 0.06 : 0), p + 0.02, Math.min(p + 0.48, c), Math.round(p * 2) % 2 ? C.plank : C.wood);
      b.box(x + t - 0.02, x + t + 0.05, h * 0.68, h * 0.68 + 0.12, a, c, C.woodD);
    } else if (kind === 'brick') {
      b.block(x - 0.2, x + 0.2, 0, h, a, c, C.brick);
      for (let p = a; p < c; p += 1.1) b.box(x - 0.21, x + 0.21, 0.3 + (Math.round(p) % 2) * 0.3, 0.42 + (Math.round(p) % 2) * 0.3, p + 0.1, Math.min(p + 0.7, c), C.brickD);
      b.box(x - 0.26, x + 0.26, h, h + 0.1, a, c, C.stoneD);
      b.solid(x - 0.26, x + 0.26, h, h + 0.1, a, c);
    } else if (kind === 'hedge') {
      b.solid(x - 0.45, x + 0.45, 0, h, a, c, { climb: false });
      for (let p = a + 0.5; p < c + 0.3; p += 0.95) b.ball(x, h * 0.5, Math.min(p, c - 0.3), 0.72, [C.leaf, C.leafD, C.leafL][Math.round(p * 3) % 3], { sy: h / 1.25, sx: 0.75, layer: 'sway', sway: 0.25 });
    } else if (kind === 'bamboo') {
      b.solid(x - t, x + t, 0, h, a, c);
      for (let p = a + 0.08; p < c; p += 0.2) b.cyl(x, 0, h + (Math.round(p * 5) % 3) * 0.05, p, 0.07, 0.07, Math.round(p * 5) % 2 ? '#c9b46a' : '#b8a35c', { seg: 6 });
      b.box(x - 0.1, x + 0.1, h * 0.75, h * 0.75 + 0.07, a, c, C.barkD);
      b.box(x - 0.1, x + 0.1, h * 0.25, h * 0.25 + 0.07, a, c, C.barkD);
    } else if (kind === 'stone') {
      b.block(x - 0.22, x + 0.22, 0, h, a, c, C.stone);
      for (let p = a + 0.2; p < c; p += 0.8) b.box(x - 0.24, x + 0.24, 0.15 + (Math.round(p * 2) % 3) * 0.2, 0.3 + (Math.round(p * 2) % 3) * 0.2, p, Math.min(p + 0.45, c), C.stoneD);
    }
  }
}

// A low front wall running along x at a fixed z, with gate openings.
export function frontWall(b, z, x0, x1, kind, { h = 0.5, gaps = [] } = {}) {
  let x = x0;
  const segs = [];
  for (const [g0, g1] of [...gaps].sort((a, c) => a[0] - c[0])) {
    if (g0 > x) segs.push([x, g0]);
    x = g1;
  }
  if (x < x1) segs.push([x, x1]);
  for (const [a, c] of segs) {
    if (kind === 'picket') {
      b.solid(a, c, 0, h + 0.3, z - 0.08, z + 0.08);
      for (let p = a + 0.1; p < c; p += 0.3) b.box(p, p + 0.16, 0, h + 0.3 - (Math.round(p * 10) % 2) * 0.04, z - 0.04, z + 0.04, C.white);
      b.box(a, c, h * 0.5, h * 0.5 + 0.08, z - 0.07, z - 0.03, C.stoneL);
    } else if (kind === 'stone') {
      b.block(a, c, 0, h, z - 0.2, z + 0.2, C.stone);
      for (let p = a + 0.3; p < c - 0.2; p += 0.9) b.box(p, p + 0.5, h - 0.02, h + 0.06, z - 0.22, z + 0.22, C.stoneL);
    } else if (kind === 'brick') {
      b.block(a, c, 0, h, z - 0.18, z + 0.18, C.brick);
      b.box(a, c, h, h + 0.07, z - 0.22, z + 0.22, C.stoneD);
    } else if (kind === 'hedge') {
      b.solid(a, c, 0, h + 0.2, z - 0.35, z + 0.35, { climb: false });
      for (let p = a + 0.4; p < c + 0.2; p += 0.8) b.ball(Math.min(p, c - 0.3), 0.3, z, 0.55, Math.round(p * 2) % 2 ? C.leaf : C.leafD, { sy: 0.9, sz: 0.75, layer: 'sway', sway: 0.2 });
    } else if (kind === 'log') {
      b.solid(a, c, 0, 0.36, z - 0.18, z + 0.18);
      b.lying((a + c) / 2, 0.19, z, c - a, 0.2, C.bark, 'x'); b.lying(a + 0.01, 0.19, z, 0.03, 0.15, C.woodL, 'x'); b.lying(c - 0.01, 0.19, z, 0.03, 0.15, C.woodL, 'x');
    }
  }
}

export function tree(b, x, z, { h = 2.6, r = 0.5, kind = 'round', leaves = [C.leaf, C.leafL, C.leafD], scale = 1, bark = C.bark, climb = true } = {}) {
  b.solid(x - r, x + r, 0, h, z - r, z + r, { climb });
  b.cyl(x, 0, h, z, r * 1.05, r * 1.3, bark, { seg: 9 });
  const top = h;
  if (kind === 'round' || kind === 'apple' || kind === 'maple') {
    const blobs = [[-1.4, 2.0, -1.0, 1.6], [0.2, 2.7, -1.3, 1.5], [-1.8, 1.7, 0.8, 1.3], [1.3, 1.9, -0.9, 1.2], [-0.7, 3.1, 0.1, 1.3]];
    blobs.forEach(([dx, dy, dz, br], i) => {
      const s = scale;
      b.ball(x + dx * s, top + dy * s, z + dz * s, br * s, leaves[i % leaves.length], { sy: 0.88, layer: 'sway', sway: 0.5, seg: 9 });
      b.beam([x, top - 0.2, z], [x + dx * s, top + dy * s - br * s * 0.5, z + dz * s], 0.12, bark);
      if (kind === 'apple') for (let a = 0; a < 3; a++) b.ball(x + dx * s + Math.cos(a * 2.1 + i) * br * s * 0.75, top + dy * s - br * s * 0.3, z + dz * s + Math.sin(a * 2.1 + i) * br * s * 0.75 + 0.3, 0.1, C.red);
    });
  } else if (kind === 'pine') {
    for (let i = 0; i < 4; i++) b.cone(x, top - 0.6 + i * 0.95 * scale, top + 1.3 * scale + i * 0.95 * scale, z, (1.7 - i * 0.36) * scale, i % 2 ? C.pine : tint(C.pine, 0.05), { layer: 'sway', sway: 0.2, seg: 8 });
  } else if (kind === 'willow') {
    b.ball(x - 0.3, top + 1.4, z - 0.3, 2.0 * scale, leaves[0], { sy: 0.7, layer: 'sway', sway: 0.5 });
    for (let a = 0; a < 9; a++) {
      const ang = (a / 9) * Math.PI * 2;
      b.ball(x - 0.3 + Math.cos(ang) * 1.7 * scale, top + 0.5, z - 0.3 + Math.sin(ang) * 1.7 * scale, 0.5, leaves[a % leaves.length], { sy: 2.4, layer: 'sway', sway: 1.2, seg: 7 });
    }
  } else if (kind === 'birch') {
    for (const [dx, dy, dz, br] of [[-0.5, 1.2, -0.4, 1.0], [0.4, 2.0, -0.6, 0.9], [-0.2, 2.8, 0.1, 0.8]]) b.ball(x + dx, top + dy, z + dz, br * scale, leaves[Math.abs(Math.round(dx * 3)) % leaves.length], { sy: 1.1, layer: 'sway', sway: 0.6, seg: 8 });
    for (let i = 0; i < 4; i++) b.box(x - r * 1.15, x + r * 1.15, 0.4 + i * 0.6, 0.48 + i * 0.6, z - r * 1.15, z + r * 1.15, C.dark);
  }
  return top;
}

export function bush(b, x, z, r = 0.8, colors = [C.leaf, C.leafL, C.leafD], { solid = true, berries = null } = {}) {
  if (solid) b.solid(x - r * 0.75, x + r * 0.75, 0, r * 1.1, z - r * 0.75, z + r * 0.75, { climb: false });
  b.ball(x, r * 0.6, z, r, colors[0], { sy: 0.85, layer: 'sway', sway: 0.3 });
  b.ball(x + r * 0.55, r * 0.45, z + r * 0.35, r * 0.65, colors[1], { sy: 0.9, layer: 'sway', sway: 0.3 });
  b.ball(x - r * 0.5, r * 0.5, z + r * 0.4, r * 0.6, colors[2], { sy: 0.9, layer: 'sway', sway: 0.3 });
  if (berries) for (let i = 0; i < 6; i++) b.ball(x + Math.cos(i * 1.9) * r * 0.8, r * 0.5 + Math.sin(i * 2.7) * r * 0.3, z + Math.abs(Math.sin(i * 1.9)) * r * 0.85, 0.07, berries);
}

export function flowers(b, rand, x, z, r, n, colors = [C.pink, C.yellow, C.white, C.purple, C.orange]) {
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r;
    const fx = x + Math.cos(a) * d, fz = z + Math.sin(a) * d, h = 0.22 + rand() * 0.22;
    b.box(fx - 0.015, fx + 0.015, 0, h, fz - 0.015, fz + 0.015, C.leafD, { layer: 'sway' });
    b.ball(fx, h, fz, 0.085, colors[Math.floor(rand() * colors.length)], { sy: 0.7, layer: 'sway', sway: 0.6, seg: 6 });
  }
}

export function tufts(b, rand, n, x0, x1, z0, z1, ok = () => true) {
  for (let i = 0; i < n; i++) {
    const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0);
    if (!ok(x, z)) continue;
    const h = 0.1 + rand() * 0.09;
    const col = [C.grassD, C.grassL, '#7fae49'][i % 3];
    b.cone(x, 0, h, z, 0.07, col, { seg: 4, layer: 'sway', sway: 0.4 });
    b.cone(x + 0.09, 0, h * 0.8, z + 0.05, 0.06, col, { seg: 4, layer: 'sway', sway: 0.4 });
  }
}

export function patches(b, rand, n, x0, x1, z0, z1, ok = () => true, colors = [C.grassD, C.grassL]) {
  for (let i = 0; i < n; i++) {
    const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0), r = 0.7 + rand() * 1.3;
    if (!ok(x, z)) continue;
    b.disc(x, 0.006 + i * 0.0006, z, r, colors[i % colors.length], { seg: 12, sx: 1, sz: 0.8 + rand() * 0.4 });
  }
}

export function pot(b, x, z, { y = 0, r = 0.24, plant = C.leaf, bloom = null, solid = true } = {}) {
  b.cyl(x, y, y + r * 1.6, z, r, r * 0.75, C.terracotta, { seg: 8 });
  b.ball(x, y + r * 2.4, z, r * 1.1, plant, { layer: 'sway', sway: 0.2, seg: 8 });
  if (bloom) { b.ball(x + r * 0.4, y + r * 3.2, z + r * 0.3, r * 0.38, bloom, { seg: 6 }); b.ball(x - r * 0.5, y + r * 3.0, z + r * 0.5, r * 0.34, bloom, { seg: 6 }); }
  if (solid) b.solid(x - r * 0.8, x + r * 0.8, y, y + r * 1.6, z - r * 0.8, z + r * 0.8, { climb: false });
}

export function steppingStones(b, pts) {
  pts.forEach(([x, z], i) => b.cyl(x, 0, 0.04, z, 0.42 + (i % 3) * 0.05, 0.48 + (i % 3) * 0.05, i % 2 ? C.stone : C.stoneL, { seg: 9 }));
}

export function lampPost(b, x, z, h = 2.6) {
  b.block(x - 0.09, x + 0.09, 0, h, z - 0.09, z + 0.09, C.dark, { climb: false });
  b.box(x - 0.22, x + 0.22, h, h + 0.08, z - 0.22, z + 0.22, C.dark);
  b.box(x - 0.15, x + 0.15, h - 0.42, h, z - 0.15, z + 0.15, '#ffffff', { layer: 'glow' });
}

export function rock(b, x, z, r, color = C.stone) {
  b.ball(x, r * 0.3, z, r, color, { sy: 0.65, seg: 7 });
}

// things a cat can carry
export function makeItem(name) {
  const g = new THREE.Group();
  const sph = new THREE.SphereGeometry(1, 10, 7);
  const part = (geo, color, x, y, z, sx = 1, sy = sx, sz = sx, rot) => {
    const m = new THREE.Mesh(geo, toon(color));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    if (rot) m.rotation.set(...rot);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const box = new THREE.BoxGeometry(1, 1, 1);
  let rest = 0.05;
  if (name === 'sock') {
    part(sph, C.red, 0, 0, 0, 0.07, 0.06, 0.17); part(sph, C.red, 0, 0.02, 0.15, 0.07); part(sph, C.white, 0, 0, -0.13, 0.075, 0.065, 0.06); rest = 0.06;
  } else if (name === 'wool') {
    part(sph, C.purple, 0, 0, 0, 0.13);
    for (const [rx, ry] of [[0.4, 0], [1.3, 0.8], [-0.6, 1.7]]) part(new THREE.TorusGeometry(0.128, 0.014, 4, 12), '#c9a8dd', 0, 0, 0, 1, 1, 1, [rx, ry, 0]);
    rest = 0.13;
  } else if (name === 'feather') {
    part(sph, C.white, 0, 0, 0, 0.06, 0.014, 0.2); part(sph, C.blue, 0, 0.004, 0.1, 0.045, 0.014, 0.09); rest = 0.03;
  } else if (name === 'leaf') {
    part(sph, C.orange, 0, 0, 0, 0.1, 0.016, 0.15); part(sph, C.brickD, 0, 0.006, -0.02, 0.012, 0.01, 0.19); rest = 0.03;
  } else if (name === 'cloth') {
    part(box, C.blue, 0, 0, 0, 0.42, 0.04, 0.34); part(box, C.white, 0, 0.003, 0.08, 0.43, 0.04, 0.06); part(box, C.white, 0, 0.003, -0.08, 0.43, 0.04, 0.06); rest = 0.03;
  } else if (name === 'mouse') {
    part(sph, '#9aa3ad', 0, 0, 0, 0.07, 0.06, 0.11); part(sph, C.pink, 0.045, 0.05, 0.06, 0.03); part(sph, C.pink, -0.045, 0.05, 0.06, 0.03); part(sph, C.pink, 0, 0, -0.16, 0.012, 0.012, 0.08); rest = 0.06;
  } else if (name === 'pinecone') {
    part(sph, C.barkD, 0, 0, 0, 0.08, 0.08, 0.12); part(sph, C.bark, 0, 0.02, 0.03, 0.07, 0.07, 0.08); rest = 0.08;
  } else if (name === 'flower') {
    part(sph, C.yellow, 0, 0.02, 0.1, 0.05); for (let i = 0; i < 5; i++) part(sph, C.white, Math.cos(i * 1.26) * 0.07, 0.02, 0.1 + Math.sin(i * 1.26) * 0.07, 0.045, 0.02, 0.045); part(box, C.leafD, 0, 0, -0.06, 0.02, 0.02, 0.24); rest = 0.03;
  } else if (name === 'ribbon') {
    part(sph, C.pink, 0.07, 0, 0, 0.08, 0.02, 0.05); part(sph, C.pink, -0.07, 0, 0, 0.08, 0.02, 0.05); part(sph, '#c96a8c', 0, 0.005, 0, 0.03); part(box, C.pink, 0.03, 0, -0.1, 0.03, 0.01, 0.16); rest = 0.03;
  } else if (name === 'fishtoy') {
    part(sph, C.teal, 0, 0, 0, 0.06, 0.05, 0.13); part(sph, C.teal, 0, 0, -0.16, 0.07, 0.04, 0.03); part(sph, C.white, 0.03, 0.02, 0.09, 0.015); rest = 0.05;
  } else if (name === 'acorn') {
    part(sph, C.wood, 0, 0, 0, 0.06, 0.07, 0.06); part(sph, C.barkD, 0, 0.04, 0, 0.065, 0.035, 0.065); rest = 0.06;
  } else if (name === 'mitten') {
    part(sph, C.yellow, 0, 0, 0, 0.09, 0.05, 0.13); part(sph, C.yellow, 0.09, 0, 0.02, 0.04, 0.04, 0.06); part(sph, C.white, 0, 0, -0.12, 0.09, 0.055, 0.04); rest = 0.05;
  }
  return { name, mesh: g, rest, heldBy: null, bed: null };
}
