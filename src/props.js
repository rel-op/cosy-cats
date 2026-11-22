import * as THREE from 'three';
import { toon, tint, TEX } from './build.js';

// Reusable scenery pieces. Each takes a Builder `b` and local coordinates.

export const C = {
  grass: '#7fae46', grassD: '#6f9f40', grassL: '#98c458', moss: '#5f8f3a',
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
// a clump of foliage: one big ball with smaller light and dark clusters over it
export function leafy(b, x, y, z, r, cols, { sy = 0.9, sway = 0.5, n = 10 } = {}) {
  const [mid, light, dark] = cols;
  const v = Math.abs(Math.round(x * 3 + z * 5)) % 4;
  b.blob(x, y, z, r, mid, { sy, layer: 'sway', sway, tex: TEX.leaf, variant: v, detail: 2, amp: 0.16 });
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, phi = Math.acos(1 - 2 * t), th = i * 2.399963 + x;
    const dx = Math.sin(phi) * Math.cos(th), dy = Math.cos(phi), dz = Math.sin(phi) * Math.sin(th);
    const lit = dy * 0.75 - dx * 0.35 + dz * 0.3; // sun from the upper left
    const c = lit > 0.3 ? light : lit < -0.12 ? dark : mid;
    const cr = r * (0.34 + ((i * 7) % 5) * 0.035);
    b.blob(x + dx * r * 0.78, y + dy * r * 0.78 * sy, z + dz * r * 0.78, cr, c, { sy: 0.9, layer: 'sway', sway, tex: TEX.leaf, variant: (v + i) % 4, detail: 1, amp: 0.22 });
    // a few stray tufts break up the outline
    if (r > 0.9 && i % 3 === 0) b.blob(x + dx * r * 1.12, y + dy * r * 1.08 * sy, z + dz * r * 1.12, cr * 0.5, lit > 0 ? light : mid, { layer: 'sway', sway: sway * 1.3, tex: TEX.leaf, variant: i % 4, detail: 1, amp: 0.25 });
  }
}

export function house(b, { wall = C.cream, roof = C.terracotta, trim = C.white, door = null, windows = [], x0 = -12, x1 = 12, h = 5.4, base = '#dccfb2', style = 'plaster', shutters = null, boxes = [], chimney = null, pipe = null, curtains = '#e7c9a0', smokey = true, dormers = [], trellis = [], baskets = [] } = {}) {
  b.tex = style === 'brick' ? TEX.brick : style === 'stone' ? TEX.stone : style === 'clapboard' ? TEX.wood : TEX.plaster;
  b.block(x0, x1, 0, h, -12.4, -11, wall, { climb: false });
  b.tex = TEX.stone;
  b.box(x0, x1, 0, 0.42, -11.07, -10.93, base);
  b.tex = 0;
  b.box(x0, x1, 0.42, 0.47, -11.08, -10.92, tint(base, 0.06));
  if (style === 'clapboard') {
    for (let y = 0.8; y < h - 0.2; y += 0.38) b.box(x0, x1, y, y + 0.035, -11.04, -10.975, tint(wall, -0.08));
  } else if (style === 'brick') {
    for (let y = 0.55, r = 0; y < h - 0.15; y += 0.3, r++) for (let x = x0 + (r % 2) * 0.55; x < x1 - 0.5; x += 1.1) b.box(x, x + 0.52, y, y + 0.15, -11.025, -10.985, (Math.round(x * 3) + r) % 3 ? tint(wall, -0.05) : tint(wall, 0.05));
  } else if (style === 'timber') {
    for (let x = x0; x <= x1; x += 3) b.box(x - 0.12, x + 0.12, 0.47, h, -11.05, -10.95, trim);
    for (const y of [2.0, 3.55]) b.box(x0, x1, y - 0.1, y + 0.1, -11.05, -10.95, trim);
  } else if (style === 'stone') {
    for (let y = 0.6, r = 0; y < h - 0.3; y += 0.55, r++) for (let x = x0 + (r % 2) * 0.8 + 0.2; x < x1 - 1; x += 1.9) b.box(x, x + 1.1 + (r % 3) * 0.2, y, y + 0.36, -11.03, -10.985, (Math.round(x) + r) % 2 ? tint(wall, -0.06) : tint(wall, 0.04));
  } else {
    for (let i = 0; i < 9; i++) { const x = x0 + 1.5 + ((i * 7.3) % (x1 - x0 - 3)), y = 0.8 + ((i * 2.9) % (h - 1.6)); b.box(x, x + 0.9 + (i % 3) * 0.5, y, y + 0.22 + (i % 2) * 0.2, -11.02, -10.99, tint(wall, i % 2 ? -0.04 : 0.035)); }
  }
  // roof: rows of tiles stepping up and back
  b.tex = TEX.tile;
  for (let i = 0; i < 6; i++) {
    const y = h + i * 0.36, zf = -10.5 - i * 0.55;
    b.box(x0 - 0.15, x1 + 0.15, y, y + 0.4, zf - 2.1, zf, i % 2 ? roof : tint(roof, -0.045));
    for (let x = x0 - 0.1 + (i % 2) * 0.3; x < x1; x += 0.6) b.box(x, x + 0.5, y + 0.4, y + 0.44, zf - 0.5, zf + 0.03, tint(roof, 0.05));
    b.box(x0 - 0.15, x1 + 0.15, y - 0.03, y + 0.03, zf - 0.02, zf + 0.04, tint(roof, -0.14));
  }
  // ridge, and dormer windows poking out of the roof
  b.box(x0 - 0.15, x1 + 0.15, h + 2.16, h + 2.4, -15.5, -14.9, tint(roof, -0.1));
  for (const dx of dormers) {
    b.tex = 0;
    b.box(dx - 0.75, dx + 0.75, h + 0.55, h + 1.75, -12.4, -11.55, wall);
    b.box(dx - 0.5, dx + 0.5, h + 0.75, h + 1.5, -11.57, -11.5, '#ffffff', { layer: 'glow' });
    b.box(dx - 0.04, dx + 0.04, h + 0.75, h + 1.5, -11.52, -11.47, trim); b.box(dx - 0.5, dx + 0.5, h + 1.1, h + 1.16, -11.52, -11.47, trim);
    b.box(dx - 0.6, dx + 0.6, h + 0.62, h + 0.75, -11.6, -11.45, trim);
    b.tex = TEX.tile;
    b.box(dx - 0.95, dx + 0.05, h + 1.72, h + 1.9, -12.6, -11.4, roof, { rot: [0, 0, 0.5] }); b.box(dx - 0.05, dx + 0.95, h + 1.72, h + 1.9, -12.6, -11.4, tint(roof, -0.05), { rot: [0, 0, -0.5] });
  }
  b.tex = 0;
  b.box(x0 - 0.2, x1 + 0.2, h - 0.13, h, -10.62, -10.42, trim);
  // a trellis with a climbing rose, and hanging baskets
  for (const [t0, t1, col] of trellis) {
    for (let x = t0; x <= t1 + 0.01; x += 0.36) b.box(x - 0.02, x + 0.02, 0.47, 3.6, -10.98, -10.94, C.woodL);
    for (let y = 0.8; y < 3.6; y += 0.42) b.box(t0, t1, y, y + 0.04, -10.97, -10.93, C.woodL);
    for (let i = 0; i < 16; i++) {
      const x = t0 + ((i * 0.37) % (t1 - t0)), y = 0.5 + ((i * 0.83) % 3.1);
      b.blob(x, y, -10.86, 0.24, i % 2 ? C.leaf : C.leafD, { sz: 0.5, layer: 'sway', sway: 0.2, tex: TEX.leaf, variant: i % 4, detail: 1 });
      if (i % 2 === 0) b.ball(x + 0.08, y + 0.1, -10.74, 0.08, i % 4 ? col : tint(col, 0.1), { seg: 5, layer: 'sway', sway: 0.2 });
    }
  }
  for (const bx of baskets) {
    b.box(bx - 0.03, bx + 0.03, 3.3, 3.36, -11.0, -10.45, C.dark); b.box(bx - 0.012, bx + 0.012, 2.75, 3.3, -10.5, -10.47, C.dark);
    b.cyl(bx, 2.45, 2.75, -10.48, 0.26, 0.14, C.woodD, { seg: 8 });
    leafy(b, bx, 2.82, -10.48, 0.3, [C.leaf, C.leafL, C.leafD], { sway: 0.5, n: 5 });
    for (let i = 0; i < 6; i++) b.ball(bx + Math.cos(i) * 0.26, 2.72 + (i % 3) * 0.14, -10.48 + Math.sin(i) * 0.26, 0.07, [C.pink, C.white, C.purple][i % 3], { seg: 5, layer: 'sway', sway: 0.5 });
  }
  if (pipe !== null) { b.box(pipe - 0.07, pipe + 0.07, 0, h - 0.1, -10.98, -10.84, trim); b.box(pipe - 0.1, pipe + 0.1, 1.6, 1.68, -11.0, -10.82, tint(trim, -0.12)); b.box(pipe - 0.1, pipe + 0.1, 3.6, 3.68, -11.0, -10.82, tint(trim, -0.12)); }
  if (chimney !== null) {
    b.box(chimney - 0.55, chimney + 0.55, h + 1.0, h + 3.4, -14.6, -13.5, C.brick);
    b.box(chimney - 0.62, chimney + 0.62, h + 3.4, h + 3.55, -14.67, -13.43, C.brickD);
    b.cyl(chimney - 0.2, h + 3.55, h + 3.95, -14.05, 0.16, 0.2, C.terracotta, { seg: 7 });
    b.cyl(chimney + 0.25, h + 3.55, h + 3.85, -14.05, 0.14, 0.18, C.terracotta, { seg: 7 });
    if (smokey) smoke(b, chimney - 0.2, h + 4.0, -14.05);
  }
  windows.forEach(([wx0, wx1, wy0, wy1], wi) => {
    b.box(wx0 - 0.06, wx1 + 0.06, wy0 - 0.06, wy1 + 0.1, -11.08, -10.91, trim);
    b.box(wx0 + 0.12, wx1 - 0.12, wy0 + 0.12, wy1 - 0.12, -11.0, -10.9, '#ffffff', { layer: 'glow' });
    const mx = (wx0 + wx1) / 2, my = (wy0 + wy1) / 2;
    b.box(mx - 0.04, mx + 0.04, wy0 + 0.12, wy1 - 0.12, -10.95, -10.88, trim);
    b.box(wx0 + 0.12, wx1 - 0.12, my - 0.04, my + 0.04, -10.95, -10.88, trim);
    b.box(wx0 - 0.12, wx1 + 0.12, wy0 - 0.14, wy0 - 0.04, -11.05, -10.8, trim);
    b.box(wx0 - 0.14, wx1 + 0.14, wy1 + 0.08, wy1 + 0.2, -11.05, -10.86, tint(trim, -0.06));
    if (curtains) { b.box(wx0 + 0.12, wx0 + 0.34, wy0 + 0.12, wy1 - 0.12, -10.93, -10.89, curtains); b.box(wx1 - 0.34, wx1 - 0.12, wy0 + 0.12, wy1 - 0.12, -10.93, -10.89, curtains); }
    if (shutters) for (const sx of [wx0 - 0.42, wx1 + 0.08]) { b.box(sx, sx + 0.34, wy0, wy1, -11.04, -10.92, shutters); for (let y = wy0 + 0.15; y < wy1 - 0.1; y += 0.22) b.box(sx + 0.04, sx + 0.3, y, y + 0.05, -10.93, -10.9, tint(shutters, -0.1)); }
    if (boxes.includes(wi)) {
      b.box(wx0 - 0.05, wx1 + 0.05, wy0 - 0.5, wy0 - 0.14, -11.0, -10.66, C.woodD);
      for (let x = wx0 + 0.15, k = 0; x < wx1; x += 0.34, k++) { b.ball(x, wy0 - 0.06, -10.8, 0.17, k % 2 ? C.leaf : C.leafL, { layer: 'sway', sway: 0.3, seg: 6 }); b.ball(x + 0.05, wy0 + 0.07, -10.74, 0.085, [C.red, C.pink, C.yellow, C.white][(k + wi) % 4], { layer: 'sway', sway: 0.3, seg: 5 }); }
    }
  });
  if (door) {
    const { x, color = C.teal, flap = false, y = 0, porch = false } = door;
    b.box(x - 0.9, x + 0.9, y, y + 3.0, -11.08, -10.92, trim);
    b.box(x - 0.72, x + 0.72, y, y + 2.82, -11.05, -10.9, color);
    b.box(x - 0.52, x + 0.52, y + 1.55, y + 2.55, -11.0, -10.885, tint(color, -0.08));
    b.box(x - 0.42, x + 0.42, y + 1.65, y + 2.45, -10.98, -10.88, '#ffffff', { layer: 'glow' });
    b.box(x - 0.03, x + 0.03, y + 1.65, y + 2.45, -10.95, -10.87, tint(color, -0.08));
    b.box(x - 0.52, x + 0.52, y + 0.25, y + 1.3, -11.0, -10.885, tint(color, -0.06));
    if (flap) b.box(x - 0.3, x + 0.3, y + 0.08, y + 0.62, -11.0, -10.86, tint(color, -0.2));
    b.ball(x + 0.52, y + 1.42, -10.86, 0.065, C.yellow, { seg: 6 });
    b.box(x - 0.7, x + 0.7, y, y + 0.025, -10.9, -10.1, '#a8744f');
    b.box(x - 0.6, x + 0.6, y + 0.025, y + 0.03, -10.8, -10.2, '#c08c62');
    if (porch) { b.box(x - 1.2, x + 1.2, y + 3.1, y + 3.25, -11.0, -10.0, porch); b.box(x - 1.25, x + 1.25, y + 3.25, y + 3.34, -11.0, -9.95, tint(porch, -0.08)); }
  }
}

// lazy chimney smoke
export function smoke(b, x, y, z) {
  const puffs = [];
  const geo = new THREE.SphereGeometry(1, 7, 5);
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#f1ece2', transparent: true, opacity: 0, depthWrite: false }));
    b.dyn(m, x, y, z);
    puffs.push(m);
  }
  const p0 = b.p(x, y, z);
  b.world.updaters.push((dt, t) => {
    puffs.forEach((m, i) => {
      const k = (t * 0.16 + i / 6) % 1;
      m.position.set(p0.x + k * 1.6 + Math.sin(t + i) * 0.1, p0.y + k * 2.6, p0.z - k * 0.4);
      m.scale.setScalar(0.18 + k * 0.5);
      m.material.opacity = Math.sin(k * Math.PI) * 0.6;
    });
  });
}

export function tree(b, x, z, { h = 2.6, r = 0.5, kind = 'round', leaves = [C.leaf, C.leafL, C.leafD], scale = 1, bark = C.bark, climb = true } = {}) {
  b.solid(x - r, x + r, 0, h, z - r, z + r, { climb });
  b.cyl(x, 0, h, z, r * 1.05, r * 1.3, bark, { seg: 9 });
  for (let i = 0; i < 4; i++) { const a = i * 1.7 + x; b.ball(x + Math.cos(a) * r * 1.25, 0.05, z + Math.sin(a) * r * 1.25, r * 0.5, bark, { sy: 0.6, seg: 6 }); }
  b.box(x + r * 0.9, x + r * 1.12, h * 0.3, h * 0.5, z - r * 0.3, z + r * 0.2, tint(bark, -0.08));
  const top = h;
  if (kind === 'round' || kind === 'apple' || kind === 'maple') {
    const blobs = [[-1.4, 2.0, -1.0, 1.6], [0.2, 2.7, -1.3, 1.5], [-1.8, 1.7, 0.8, 1.3], [1.3, 1.9, -0.9, 1.2], [-0.7, 3.1, 0.1, 1.3]];
    blobs.forEach(([dx, dy, dz, br], i) => {
      const s = scale;
      leafy(b, x + dx * s, top + dy * s, z + dz * s, br * s, [tint(leaves[0], (i % 3 - 1) * 0.025), leaves[1], leaves[2]], { sway: 0.5, n: 11 });
      b.beam([x, top - 0.2, z], [x + dx * s, top + dy * s - br * s * 0.5, z + dz * s], 0.12, bark);
      if (kind === 'apple') for (let a = 0; a < 4; a++) b.ball(x + dx * s + Math.cos(a * 2.1 + i) * br * s * 0.85, top + dy * s - br * s * 0.2 + (a % 2) * 0.3, z + dz * s + Math.abs(Math.sin(a * 2.1 + i)) * br * s * 0.9, 0.1, C.red, { seg: 6 });
    });
  } else if (kind === 'pine') {
    for (let i = 0; i < 4; i++) {
      const y0 = top - 0.6 + i * 0.95 * scale, rr = (1.7 - i * 0.36) * scale;
      b.cone(x, y0, y0 + 1.9 * scale, z, rr, i % 2 ? C.pine : tint(C.pine, 0.05), { layer: 'sway', sway: 0.2, seg: 8 });
      for (let a = 0; a < 7; a++) b.ball(x + Math.cos(a * 0.9 + i) * rr * 0.8, y0 + 0.15, z + Math.sin(a * 0.9 + i) * rr * 0.8, 0.24 * scale, a % 2 ? tint(C.pine, 0.09) : tint(C.pine, -0.04), { sy: 0.6, layer: 'sway', sway: 0.2, seg: 5 });
    }
  } else if (kind === 'willow') {
    leafy(b, x - 0.3, top + 1.4, z - 0.3, 2.0 * scale, leaves, { sy: 0.7, sway: 0.5, n: 12 });
    for (let a = 0; a < 13; a++) {
      const ang = (a / 13) * Math.PI * 2;
      for (let k = 0; k < 4; k++) b.ball(x - 0.3 + Math.cos(ang) * 1.75 * scale, top + 1.1 - k * 0.42, z - 0.3 + Math.sin(ang) * 1.75 * scale, 0.3 - k * 0.03, leaves[(a + k) % leaves.length], { sy: 1.25, layer: 'sway', sway: 0.9 + k * 0.4, seg: 5 });
    }
  } else if (kind === 'birch') {
    for (const [dx, dy, dz, br] of [[-0.5, 1.2, -0.4, 1.0], [0.4, 2.0, -0.6, 0.9], [-0.2, 2.8, 0.1, 0.8]]) leafy(b, x + dx, top + dy, z + dz, br * scale, leaves, { sy: 1.1, sway: 0.7, n: 8 });
    for (let i = 0; i < 4; i++) b.box(x - r * 1.15, x + r * 1.15, 0.4 + i * 0.6, 0.48 + i * 0.6, z - r * 1.15, z + r * 1.15, C.dark);
  }
  return top;
}

export function bush(b, x, z, r = 0.8, colors = [C.leaf, C.leafL, C.leafD], { solid = true, berries = null } = {}) {
  if (solid) b.solid(x - r * 0.75, x + r * 0.75, 0, r * 1.1, z - r * 0.75, z + r * 0.75, { climb: false });
  leafy(b, x, r * 0.6, z, r, colors, { sy: 0.85, sway: 0.3, n: 8 });
  leafy(b, x + r * 0.55, r * 0.45, z + r * 0.35, r * 0.65, colors, { sway: 0.3, n: 5 });
  leafy(b, x - r * 0.5, r * 0.5, z + r * 0.4, r * 0.6, colors, { sway: 0.3, n: 5 });
  if (berries) for (let i = 0; i < 9; i++) b.ball(x + Math.cos(i * 1.9) * r * 0.9, r * 0.55 + Math.sin(i * 2.7) * r * 0.35, z + Math.abs(Math.sin(i * 1.9)) * r * 0.95, 0.075, berries, { seg: 5 });
}

export function flowers(b, rand, x, z, r, n, colors = [C.pink, C.yellow, C.white, C.purple, C.orange]) {
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r;
    const fx = x + Math.cos(a) * d, fz = z + Math.sin(a) * d, h = 0.2 + rand() * 0.24;
    b.box(fx - 0.015, fx + 0.015, 0, h, fz - 0.015, fz + 0.015, C.leafD, { layer: 'sway' });
    b.ball(fx + 0.05, h * 0.45, fz, 0.06, C.leaf, { sy: 0.5, layer: 'sway', sway: 0.4, seg: 5 });
    b.ball(fx, h, fz, 0.09, colors[Math.floor(rand() * colors.length)], { sy: 0.7, layer: 'sway', sway: 0.6, seg: 6 });
    b.ball(fx, h + 0.03, fz + 0.02, 0.035, C.yellow, { layer: 'sway', sway: 0.6, seg: 4 });
  }
}

// one garden plant. kinds: spike, mound, rose, grass, tulip, fern, daisy, sunflower
export function plant(b, rand, x, z, kind, colors = [C.purple, C.pink, C.blue, C.white, C.yellow, C.red]) {
  const col = () => colors[Math.floor(rand() * colors.length)];
  const greens = [[C.leaf, C.leafL, C.leafD], ['#5d9a48', '#7fb558', '#44803c'], [C.moss, '#7fa348', '#4a7a30']][Math.floor(rand() * 3)];
  if (kind === 'spike') {
    const n = 2 + Math.floor(rand() * 3), c = col();
    b.ball(x, 0.1, z, 0.2, greens[2], { sy: 0.6, layer: 'sway', sway: 0.3, seg: 6 });
    for (let i = 0; i < n; i++) {
      const sx = x + (rand() - 0.5) * 0.3, sz = z + (rand() - 0.5) * 0.3, h = 0.45 + rand() * 0.6;
      b.box(sx - 0.012, sx + 0.012, 0, h, sz - 0.012, sz + 0.012, greens[2], { layer: 'sway' });
      for (let k = 0; k < 4; k++) b.ball(sx, h * (0.5 + k * 0.17), sz, 0.085 - k * 0.012, k === 3 ? tint(c, 0.08) : c, { sy: 1.25, layer: 'sway', sway: 0.9, seg: 5 });
    }
  } else if (kind === 'mound') {
    const r = 0.26 + rand() * 0.22;
    leafy(b, x, r * 0.55, z, r, greens, { sy: 0.8, sway: 0.3, n: 6 });
  } else if (kind === 'rose') {
    const r = 0.34 + rand() * 0.16, c = col();
    leafy(b, x, r * 0.7, z, r, greens, { sway: 0.3, n: 6 });
    for (let i = 0; i < 7; i++) b.ball(x + Math.cos(i * 2.4) * r * 0.85, r * 0.7 + Math.sin(i * 1.7) * r * 0.5, z + Math.sin(i * 2.4) * r * 0.85, 0.07, i % 3 ? c : tint(c, 0.1), { layer: 'sway', sway: 0.3, seg: 5 });
  } else if (kind === 'grass') {
    const c = rand() > 0.5 ? '#b9b56a' : '#8fb04c';
    for (let i = 0; i < 6; i++) b.cone(x + (rand() - 0.5) * 0.28, 0, 0.45 + rand() * 0.5, z + (rand() - 0.5) * 0.28, 0.06, i % 2 ? c : tint(c, -0.07), { seg: 4, layer: 'sway', sway: 1.4 });
  } else if (kind === 'tulip') {
    const c = col();
    for (let i = 0; i < 4; i++) {
      const sx = x + (rand() - 0.5) * 0.4, sz = z + (rand() - 0.5) * 0.4, h = 0.28 + rand() * 0.14;
      b.box(sx - 0.014, sx + 0.014, 0, h, sz - 0.014, sz + 0.014, C.leaf, { layer: 'sway' });
      b.cone(sx + 0.05, 0, h * 0.8, sz, 0.045, C.leafL, { seg: 4, layer: 'sway', sway: 0.5 });
      b.ball(sx, h + 0.04, sz, 0.075, c, { sy: 1.2, layer: 'sway', sway: 0.7, seg: 5 });
    }
  } else if (kind === 'fern') {
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + rand(); b.ball(x + Math.cos(a) * 0.22, 0.16, z + Math.sin(a) * 0.22, 0.26, i % 2 ? greens[0] : greens[1], { sx: 0.3, sy: 0.25, sz: 1, rot: [0.5, -a + Math.PI / 2, 0], layer: 'sway', sway: 0.6, seg: 5 }); }
  } else if (kind === 'daisy') {
    flowers(b, rand, x, z, 0.3, 4, [C.white, C.white, C.yellow]);
  } else if (kind === 'sunflower') {
    const h = 1.5 + rand() * 0.6;
    b.box(x - 0.025, x + 0.025, 0, h, z - 0.025, z + 0.025, C.leafD, { layer: 'sway' });
    for (const k of [0.35, 0.6]) b.ball(x + 0.14, h * k, z, 0.16, C.leaf, { sy: 0.35, layer: 'sway', sway: 0.5, seg: 5 });
    b.ball(x, h, z + 0.05, 0.3, C.yellow, { sz: 0.25, layer: 'sway', sway: 0.9, seg: 9 });
    b.ball(x, h, z + 0.11, 0.15, C.barkD, { sz: 0.3, layer: 'sway', sway: 0.9, seg: 7 });
  }
}

// a planted strip: n plants scattered in a rectangle
export function border(b, rand, x0, x1, z0, z1, n, kinds, colors, ok = () => true, soil = true) {
  for (let i = 0; i < n; i++) {
    const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0);
    if (!ok(x, z)) continue;
    if (soil) b.disc(x, 0.012 + (i % 5) * 0.0005, z, 0.36 + rand() * 0.16, i % 2 ? '#6b4a36' : '#765240', { seg: 7, layer: 'ground' });
    {
      plant(b, rand, x, z, kinds[Math.floor(rand() * kinds.length)], colors);
    }
  }
}

export function tufts(b, rand, n, x0, x1, z0, z1, ok = () => true) {
  const greens = ['#9fcb5c', '#b0d66a', '#8dbd50', '#bcdc74', '#84b54a'];
  for (let i = 0; i < n * 6; i++) {
    const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0);
    if (!ok(x, z)) continue;
    const h = 0.09 + rand() * 0.12, col = greens[i % 5], o = { seg: 3, layer: 'grass', sway: 0.45, up: true };
    b.cone(x, 0, h, z, 0.05, col, o);
    b.cone(x + 0.07, 0, h * 0.75, z + 0.05, 0.045, greens[(i + 2) % 5], o);
    if (i % 3 === 0) b.cone(x - 0.06, 0, h * 0.9, z + 0.06, 0.045, col, o);
    // now and then a thicker clump of longer grass
    if (i % 13 === 0) for (let k = 0; k < 6; k++) b.cone(x + 0.3 + (rand() - 0.5) * 0.3, 0, 0.16 + rand() * 0.14, z + (rand() - 0.5) * 0.3, 0.05, greens[(i + k) % 5], { ...o, sway: 0.8 });
    if (i % 19 === 0) { b.ball(x + 0.15, 0.07, z - 0.1, 0.05, i % 38 ? C.white : C.yellow, { sy: 0.6, layer: 'grass', sway: 0.3, seg: 5 }); b.ball(x + 0.15, 0.09, z - 0.1, 0.022, C.yellow, { layer: 'grass', sway: 0.3, seg: 4 }); }
    if (i % 31 === 0) b.disc(x, 0.012, z, 0.18 + rand() * 0.16, i % 62 ? '#74a240' : '#a4cb62', { seg: 6, layer: 'ground' });
  }
}

export function patches() {}

// small things scattered over a lawn so it never looks empty
export function clutter(b, rand, n, x0, x1, z0, z1, ok = () => true, kinds = ['daisy', 'clover', 'butter', 'pebble', 'clover', 'dandelion', 'mushroom', 'leaf']) {
  for (let i = 0; i < n; i++) {
    const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0);
    if (!ok(x, z)) continue;
    const kind = kinds[Math.floor(rand() * kinds.length)];
    if (kind === 'daisy' || kind === 'butter') {
      const col = kind === 'daisy' ? C.white : C.yellow;
      for (let k = 0; k < 5 + Math.floor(rand() * 5); k++) {
        const fx = x + (rand() - 0.5) * 0.9, fz = z + (rand() - 0.5) * 0.9;
        b.ball(fx, 0.09, fz, 0.055, col, { sy: 0.55, layer: 'grass', sway: 0.3, seg: 5 });
        if (kind === 'daisy') b.ball(fx, 0.11, fz, 0.024, C.yellow, { layer: 'grass', sway: 0.3, seg: 4 });
      }
    } else if (kind === 'clover') {
      b.disc(x, 0.013, z, 0.45 + rand() * 0.3, '#5f9440', { seg: 7, layer: 'ground', sz: 0.8 });
      for (let k = 0; k < 7; k++) b.ball(x + (rand() - 0.5) * 0.7, 0.03, z + (rand() - 0.5) * 0.6, 0.09, k % 2 ? '#6aa348' : '#558a3a', { sy: 0.4, layer: 'grass', sway: 0.2, seg: 5 });
      if (rand() > 0.5) for (let k = 0; k < 3; k++) b.ball(x + (rand() - 0.5) * 0.5, 0.08, z + (rand() - 0.5) * 0.5, 0.04, '#e9d7f2', { layer: 'grass', sway: 0.2, seg: 4 });
    } else if (kind === 'pebble') {
      for (let k = 0; k < 3; k++) rock(b, x + (rand() - 0.5) * 0.4, z + (rand() - 0.5) * 0.4, 0.06 + rand() * 0.07, k % 2 ? C.stone : C.stoneD);
    } else if (kind === 'dandelion') {
      for (let k = 0; k < 3; k++) { const fx = x + (rand() - 0.5) * 0.6, fz = z + (rand() - 0.5) * 0.6, h = 0.16 + rand() * 0.1; b.box(fx - 0.01, fx + 0.01, 0, h, fz - 0.01, fz + 0.01, '#8dbd50', { layer: 'grass' }); b.ball(fx, h, fz, 0.06, k ? C.yellow : '#f4f1e6', { layer: 'grass', sway: 0.6, seg: 5 }); }
    } else if (kind === 'mushroom') {
      for (let k = 0; k < 2; k++) { const fx = x + k * 0.16, fz = z + k * 0.1; b.cyl(fx, 0, 0.09, fz, 0.022, 0.028, C.cream, { seg: 5 }); b.ball(fx, 0.1, fz, 0.07 - k * 0.015, '#c98a5a', { sy: 0.6, seg: 6 }); }
    } else if (kind === 'leaf') {
      for (let k = 0; k < 4; k++) b.disc(x + (rand() - 0.5) * 0.7, 0.014, z + (rand() - 0.5) * 0.7, 0.07, ['#c8553d', C.orange, '#b98a4a', '#d9a05b'][k], { seg: 5, layer: 'ground' });
    }
  }
}

// a string of little lights between two points, sagging in the middle
export function stringLights(b, a, c, n = 9, sag = 0.3, colors = ['#fff1c9', '#ffd9a0', '#fff1c9', '#ffc9b0']) {
  for (let i = 0; i <= n; i++) {
    const k = i / n, d = Math.sin(k * Math.PI) * sag;
    const x = a[0] + (c[0] - a[0]) * k, y = a[1] + (c[1] - a[1]) * k - d, z = a[2] + (c[2] - a[2]) * k;
    if (i < n) { const k2 = (i + 1) / n, d2 = Math.sin(k2 * Math.PI) * sag; b.beam([x, y, z], [a[0] + (c[0] - a[0]) * k2, a[1] + (c[1] - a[1]) * k2 - d2, a[2] + (c[2] - a[2]) * k2], 0.012, C.dark, { seg: 3 }); }
    b.ball(x, y - 0.07, z, 0.06, colors[i % colors.length], { layer: 'glow', seg: 5 });
  }
}

// a low garden light beside a path
export function pathLight(b, x, z) {
  b.cyl(x, 0, 0.32, z, 0.025, 0.03, C.dark, { seg: 5 });
  b.ball(x, 0.37, z, 0.07, '#fff1c9', { layer: 'glow', seg: 6 });
  b.cone(x, 0.4, 0.5, z, 0.1, C.dark, { seg: 6 });
}

export function pot(b, x, z, { y = 0, r = 0.24, plant: leaf = C.leaf, bloom = null, solid = true } = {}) {
  b.cyl(x, y, y + r * 1.6, z, r, r * 0.75, C.terracotta, { seg: 8 });
  b.cyl(x, y + r * 1.45, y + r * 1.65, z, r * 1.1, r * 1.1, tint(C.terracotta, 0.05), { seg: 8 });
  b.cyl(x, y, y + 0.04, z, r * 1.05, r * 1.05, tint(C.terracotta, -0.08), { seg: 8 });
  leafy(b, x, y + r * 2.5, z, r * 1.15, [leaf, tint(leaf, 0.07), tint(leaf, -0.07)], { sway: 0.2, n: 5 });
  if (bloom) for (let i = 0; i < 5; i++) b.ball(x + Math.cos(i * 1.4) * r * 0.9, y + r * (2.9 + (i % 2) * 0.5), z + Math.sin(i * 1.4) * r * 0.9, r * 0.32, bloom, { seg: 5, layer: 'sway', sway: 0.2 });
  if (solid) b.solid(x - r * 0.8, x + r * 0.8, y, y + r * 1.6, z - r * 0.8, z + r * 0.8, { climb: false });
}


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
      b.box(x + t - 0.02, x + t + 0.05, h * 0.22, h * 0.22 + 0.12, a, c, C.woodD);
      for (let p = a; p <= c + 0.01; p += 2.5) { const pz = Math.min(p, c - 0.12); b.box(x - t - 0.03, x + t + 0.07, 0, h + 0.03, pz, pz + 0.16, C.woodD); b.box(x - t - 0.06, x + t + 0.1, h + 0.03, h + 0.09, pz - 0.03, pz + 0.19, C.woodL); }
    } else if (kind === 'brick') {
      b.block(x - 0.2, x + 0.2, 0, h, a, c, C.brick);
      for (let p = a; p < c; p += 1.1) b.box(x - 0.21, x + 0.21, 0.3 + (Math.round(p) % 2) * 0.3, 0.42 + (Math.round(p) % 2) * 0.3, p + 0.1, Math.min(p + 0.7, c), C.brickD);
      b.box(x - 0.26, x + 0.26, h, h + 0.1, a, c, C.stoneD);
      b.solid(x - 0.26, x + 0.26, h, h + 0.1, a, c);
    } else if (kind === 'hedge') {
      b.solid(x - 0.45, x + 0.45, 0, h, a, c, { climb: false });
      for (let p = a + 0.45; p < c + 0.3; p += 0.8) { const pz = Math.min(p, c - 0.3); leafy(b, x, h * 0.42, pz, 0.6, [C.leaf, C.leafL, C.leafD], { sy: h / 1.3, sway: 0.25, n: 7 }); leafy(b, x + 0.08, h * 0.86, pz + 0.3, 0.44, [C.leafL, '#8fc45a', C.leaf], { sway: 0.3, n: 5 }); if (Math.round(p * 5) % 4 === 0) b.ball(x + 0.42, h * 0.6, pz, 0.07, C.white, { seg: 5, layer: 'sway', sway: 0.25 }); }
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
      for (let p = a + 0.1; p < c; p += 0.3) { const ph = h + 0.22 - (Math.round(p * 10) % 2) * 0.04; b.box(p, p + 0.16, 0, ph, z - 0.04, z + 0.04, C.white); b.cone(p + 0.08, ph, ph + 0.12, z, 0.1, C.white, { seg: 4 }); }
      b.box(a, c, h * 0.5 + 0.3, h * 0.5 + 0.38, z - 0.07, z - 0.03, C.stoneL);
      b.box(a, c, h * 0.5, h * 0.5 + 0.08, z - 0.07, z - 0.03, C.stoneL);
    } else if (kind === 'stone') {
      b.block(a, c, 0, h, z - 0.2, z + 0.2, C.stone);
      for (let p = a + 0.3; p < c - 0.2; p += 0.9) b.box(p, p + 0.5, h - 0.02, h + 0.06, z - 0.22, z + 0.22, C.stoneL);
    } else if (kind === 'brick') {
      b.block(a, c, 0, h, z - 0.18, z + 0.18, C.brick);
      b.box(a, c, h, h + 0.07, z - 0.22, z + 0.22, C.stoneD);
    } else if (kind === 'hedge') {
      b.solid(a, c, 0, h + 0.2, z - 0.35, z + 0.35, { climb: false });
      for (let p = a + 0.4; p < c + 0.2; p += 0.7) leafy(b, Math.min(p, c - 0.3), 0.32, z, 0.46, [C.leaf, C.leafL, C.leafD], { sway: 0.2, n: 5 });
    } else if (kind === 'log') {
      b.solid(a, c, 0, 0.36, z - 0.18, z + 0.18);
      b.lying((a + c) / 2, 0.19, z, c - a, 0.2, C.bark, 'x'); b.lying(a + 0.01, 0.19, z, 0.03, 0.15, C.woodL, 'x'); b.lying(c - 0.01, 0.19, z, 0.03, 0.15, C.woodL, 'x');
    }
  }
}

export function steppingStones(b, pts) {
  pts.forEach(([x, z], i) => {
    b.disc(x, 0.011, z, 0.62 + (i % 3) * 0.05, '#6f8f3c', { seg: 9, layer: 'ground' });
    b.blob(x, 0.0, z, 0.5 + (i % 3) * 0.05, i % 2 ? C.stone : C.stoneL, { sy: 0.09, tex: TEX.stone, variant: i % 4, detail: 2, amp: 0.1 });
  });
}

export function lampPost(b, x, z, h = 2.6) {
  b.block(x - 0.09, x + 0.09, 0, h, z - 0.09, z + 0.09, C.dark, { climb: false });
  b.box(x - 0.22, x + 0.22, h, h + 0.08, z - 0.22, z + 0.22, C.dark);
  b.box(x - 0.15, x + 0.15, h - 0.42, h, z - 0.15, z + 0.15, '#ffffff', { layer: 'glow' });
}

export function rock(b, x, z, r, color = C.stone) {
  const v = Math.abs(Math.round(x * 7 + z * 3)) % 4;
  b.blob(x, r * 0.28, z, r, color, { sy: 0.66, tex: TEX.stone, variant: v, detail: 2, amp: 0.2 });
  if (r > 0.3) b.blob(x - r * 0.1, r * 0.5, z - r * 0.1, r * 0.5, C.moss, { sy: 0.25, tex: TEX.leaf, variant: v, detail: 1, amp: 0.2 });
}

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
