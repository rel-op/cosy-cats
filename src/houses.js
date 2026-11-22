import * as THREE from 'three';
import { tint, toon, TEX } from './build.js';
import { C } from './props.js';

// Inside the five houses. Each has a hallway behind its garden door, and three or four rooms off the hallway.
// Rooms are cutaways like the dens: the left wall is x = 0, the back wall is z = 0, and you look in from the open corner.
// Everything here is added after the gardens, so beds and things keep their places in older saved games.
export function buildHouses(W, kit) {
  const { room, win, sunbeam, lamp, planksFloor, planksWall } = kit;
  const LIGHT = {
    warm: { hemi: ['#ffe9c8', '#8a6a52', 0.95, 0.5], sun: ['#fff1da', 1.5, 0.3], bg: ['#2b2233', '#1b1622'] },
    bright: { hemi: ['#f4f6ee', '#8a8a7a', 1.1, 0.5], sun: ['#fff8e6', 1.6, 0.3], bg: ['#27303a', '#171d24'] },
    paper: { hemi: ['#fff0d0', '#8a7a5a', 1.0, 0.42], sun: ['#fff3dc', 1.4, 0.25], bg: ['#232a33', '#141a20'] },
    farm: { hemi: ['#ffe6c0', '#7a5a44', 0.95, 0.45], sun: ['#fff0d8', 1.45, 0.28], bg: ['#2a2420', '#171310'] },
    old: { hemi: ['#e9e2d0', '#6a5e52', 0.85, 0.42], sun: ['#ffeccc', 1.35, 0.25], bg: ['#22242c', '#12131a'] },
    glass: { hemi: ['#f4ffe6', '#8a9a72', 1.25, 0.5], sun: ['#fff8e0', 1.9, 0.35], bg: ['#2a3a34', '#18231f'] },
  };
  const DARK = '#2a1f1a';

  // ---------------- the kit ----------------
  // a doorway in the left ('L') or back ('B') wall; gives back the spot just inside it
  const doorway = (b, side, a0, a1, { h = 2.3, frame = C.woodD, mat = '#b8a37a', leaf = null } = {}) => {
    if (side === 'L') {
      b.box(0, 0.03, 0, h, a0, a1, DARK);
      b.box(0, 0.07, h, h + 0.12, a0 - 0.12, a1 + 0.12, frame); b.box(0, 0.07, 0, h, a0 - 0.12, a0, frame); b.box(0, 0.07, 0, h, a1, a1 + 0.12, frame);
      b.box(0.08, 0.85, 0, 0.014, a0 + 0.08, a1 - 0.08, mat, { r: 0.01 });
      if (leaf) { b.box(0.04, 0.78, 0, h - 0.04, a1 - 0.07, a1 - 0.01, leaf); b.ball(0.7, 1.05, a1 - 0.1, 0.045, C.yellow, { seg: 5 }); }
      return b.p(0.42, 0, (a0 + a1) / 2);
    }
    b.box(a0, a1, 0, h, 0, 0.03, DARK);
    b.box(a0 - 0.12, a1 + 0.12, h, h + 0.12, 0, 0.07, frame); b.box(a0 - 0.12, a0, 0, h, 0, 0.07, frame); b.box(a1, a1 + 0.12, 0, h, 0, 0.07, frame);
    b.box(a0 + 0.08, a1 - 0.08, 0, 0.014, 0.08, 0.85, mat, { r: 0.01 });
    if (leaf) { b.box(a1 - 0.07, a1 - 0.01, 0, h - 0.04, 0.04, 0.78, leaf); b.ball(a1 - 0.1, 1.05, 0.7, 0.045, C.yellow, { seg: 5 }); }
    return b.p((a0 + a1) / 2, 0, 0.42);
  };
  // the way back to the hallway from a room
  const wayOut = (b, z0, z1, o) => { W.roomDoor[b.id] = doorway(b, 'L', z0, z1, o); };
  // the garden door of a hallway: it stands at the open edge, held ajar, with the cat flap in it
  const gardenDoor = (b, x, d, color) => {
    for (const sx of [-0.78, 0.68]) b.box(x + sx, x + sx + 0.1, 0, 2.35, d - 0.1, d, C.white);
    b.box(x - 0.78, x + 0.78, 2.35, 2.47, d - 0.1, d, C.white);
    b.box(x - 0.74, x - 0.68, 0, 2.3, d - 1.3, d - 0.1, color); b.box(x - 0.67, x - 0.66, 0.08, 0.6, d - 1.0, d - 0.45, tint(color, -0.25));
    b.ball(x - 0.64, 1.1, d - 1.18, 0.05, C.yellow, { seg: 5 });
    b.box(x - 0.6, x + 0.6, 0, 0.02, d - 1.0, d - 0.08, '#a8744f', { r: 0.01 }); b.box(x - 0.48, x + 0.48, 0.02, 0.026, d - 0.9, d - 0.18, '#c08c62');
    return b.p(x, 0, d - 0.42);
  };
  const glass = (b, side, a0, a1, y0, y1) => {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(side === 'L' ? 0.03 : a1 - a0, y1 - y0, side === 'L' ? a1 - a0 : 0.03), W.skyMat);
    if (side === 'L') b.dyn(pane, 0.06, (y0 + y1) / 2, (a0 + a1) / 2); else b.dyn(pane, (a0 + a1) / 2, (y0 + y1) / 2, 0.06);
  };
  // the front door, which stays shut: there is only the street out there
  const frontDoor = (b, x, color) => {
    b.box(x - 0.75, x + 0.75, 0, 2.6, 0, 0.05, C.white); b.box(x - 0.6, x + 0.6, 0, 2.05, 0.03, 0.09, color);
    b.box(x - 0.45, x + 0.45, 0.25, 0.95, 0.08, 0.11, tint(color, -0.07)); b.box(x - 0.45, x + 0.45, 1.1, 1.9, 0.08, 0.11, tint(color, -0.07));
    b.box(x - 0.2, x + 0.2, 0.98, 1.06, 0.09, 0.12, C.yellow); b.ball(x + 0.45, 1.05, 0.13, 0.05, C.yellow, { seg: 5 });
    glass(b, 'B', x - 0.55, x + 0.55, 2.12, 2.5);
    b.box(x - 0.03, x + 0.03, 2.1, 2.52, 0.05, 0.09, C.white);
    b.box(x - 0.55, x + 0.55, 0, 0.02, 0.1, 0.8, '#7a6a52', { r: 0.01 });
  };
  const skirt = (b, w, d, c = C.white) => { b.box(0, w, 0, 0.2, 0, 0.04, c); b.box(0, 0.04, 0, 0.2, 0, d, c); };
  const dado = (b, w, d, c, rail = C.white, h = 0.95) => { b.box(0, w, 0.2, h, 0, 0.03, c); b.box(0, w, h, h + 0.07, 0, 0.05, rail); b.box(0, 0.03, 0.2, h, 0, d, c); b.box(0, 0.05, h, h + 0.07, 0, d, rail); };
  const rug = (b, x0, x1, z0, z1, c1, c2) => { b.box(x0, x1, 0, 0.014, z0, z1, c1, { r: 0.01 }); b.box(x0 + 0.16, x1 - 0.16, 0.014, 0.02, z0 + 0.16, z1 - 0.16, c2); b.box(x0 + 0.36, x1 - 0.36, 0.02, 0.025, z0 + 0.36, z1 - 0.36, c1); };
  const roundRug = (b, x, z, rx, rz, c1, c2) => { b.disc(x, 0.02, z, 1, c1, { sx: rx, sz: rz, seg: 18 }); b.disc(x, 0.025, z, 1, c2, { sx: rx * 0.76, sz: rz * 0.74, seg: 18 }); b.disc(x, 0.03, z, 1, c1, { sx: rx * 0.5, sz: rz * 0.46, seg: 18 }); };
  const tiles = (b, w, d, step, c) => { for (let x = 0; x < w; x += step) for (let z = 0; z < d; z += step) if ((Math.round(x / step) + Math.round(z / step)) % 2) b.box(x + 0.02, Math.min(w, x + step) - 0.02, 0, 0.012, z + 0.02, Math.min(d, z + step) - 0.02, c); };
  const pic = (b, side, a, y, w, h, c, frame = C.woodD) => {
    if (side === 'L') { b.box(0, 0.04, y, y + h, a, a + w, frame); b.box(0.03, 0.055, y + 0.07, y + h - 0.07, a + 0.07, a + w - 0.07, c); } else { b.box(a, a + w, y, y + h, 0, 0.04, frame); b.box(a + 0.07, a + w - 0.07, y + 0.07, y + h - 0.07, 0.03, 0.055, c); }
  };
  const plant = (b, x, z, s = 1, leaf = C.leaf, pot = C.terracotta) => {
    b.cyl(x, 0, 0.42 * s, z, 0.26 * s, 0.2 * s, pot, { seg: 8 });
    b.ball(x, 0.85 * s, z, 0.46 * s, leaf, { sy: 1.2, layer: 'sway', sway: 0.15, seg: 8 }); b.ball(x + 0.2 * s, 1.15 * s, z + 0.1 * s, 0.28 * s, tint(leaf, 0.07), { layer: 'sway', sway: 0.15, seg: 6 }); b.ball(x - 0.2 * s, 0.75 * s, z + 0.16 * s, 0.26 * s, tint(leaf, -0.06), { layer: 'sway', sway: 0.15, seg: 6 });
    b.solid(x - 0.26 * s, x + 0.26 * s, 0, 0.42 * s, z - 0.26 * s, z + 0.26 * s, { climb: false });
  };
  const tableLamp = (b, x, y, z, col = '#ffc77a', power = 6) => { b.cyl(x, y, y + 0.3, z, 0.05, 0.08, C.dark, { seg: 6 }); b.cone(x, y + 0.3, y + 0.62, z, 0.24, '#ffe2a6', { seg: 8, layer: 'lit' }); lamp(b, x + 0.25, y + 0.6, z + 0.25, col, power, 6); };
  const floorLamp = (b, x, z, col = '#ffc77a') => { b.cyl(x, 0, 0.05, z, 0.2, 0.22, C.dark, { seg: 8 }); b.cyl(x, 0.05, 1.6, z, 0.025, 0.025, C.dark, { seg: 5 }); b.cone(x, 1.55, 1.95, z, 0.3, '#ffe2a6', { seg: 8, layer: 'lit' }); lamp(b, x + 0.3, 1.6, z + 0.3, col, 7, 7); };
  const hangLamp = (b, x, z, h, col = '#ffc77a', shade = '#ffe2a6', power = 8) => { b.cyl(x, h - 0.5, h, z, 0.012, 0.012, C.dark, { seg: 4 }); b.cone(x, h - 0.85, h - 0.5, z, 0.34, shade, { seg: 9, layer: 'lit' }); lamp(b, x + 0.1, h - 1.0, z + 0.3, col, power, 8); };
  const BOOKS = [C.red, C.navy, C.teal, C.yellow, C.purple, C.cream, '#7a9a6a', '#b0705a'];
  // shelves against the back wall (thin in z) or the left wall (thin in x), filled with books or whatever `fill` draws
  const shelves = (b, x0, x1, z0, z1, h, n, wood = C.woodD, fill = null) => {
    const along = x1 - x0 > z1 - z0, dark = tint(wood, -0.12);
    // an open case: a back, two sides and a top, so what is on the shelves sits inside it
    if (along) { b.box(x0, x1, 0, h, z0, z0 + 0.05, dark); b.box(x0, x0 + 0.06, 0, h, z0, z1, wood); b.box(x1 - 0.06, x1, 0, h, z0, z1, wood); } else { b.box(x0, x0 + 0.05, 0, h, z0, z1, dark); b.box(x0, x1, 0, h, z0, z0 + 0.06, wood); b.box(x0, x1, 0, h, z1 - 0.06, z1, wood); }
    b.box(x0, x1, h - 0.06, h, z0, z1, wood); b.box(x0, x1, 0, 0.1, z0, z1, wood);
    b.solid(x0, x1, 0, h, z0, z1);
    for (let s = 0; s < n; s++) {
      const y = 0.1 + (s * (h - 0.16)) / n, gap = (h - 0.16) / n - 0.06;
      if (s) { if (along) b.box(x0 + 0.05, x1 - 0.05, y - 0.04, y, z0 + 0.04, z1, tint(wood, 0.08)); else b.box(x0 + 0.04, x1, y - 0.04, y, z0 + 0.05, z1 - 0.05, tint(wood, 0.08)); }
      const len = (along ? x1 - x0 : z1 - z0) - 0.2;
      for (let k = 0; k * 0.14 < len - 0.1; k++) {
        const p = (along ? x0 : z0) + 0.1 + k * 0.14, top = y + gap * (0.7 + ((k * 7 + s * 3) % 4) * 0.07), col = BOOKS[(k + s * 3) % BOOKS.length];
        if (fill) { fill(along ? p + 0.06 : x1 - 0.16, y, along ? z1 - 0.16 : p + 0.06, k, s, gap); continue; }
        if ((k + s) % 7 === 6) continue;
        if (along) b.box(p, p + 0.115, y, top, z1 - 0.3, z1 - 0.04, col); else b.box(x1 - 0.3, x1 - 0.04, y, top, p, p + 0.115, col);
      }
    }
  };
  // a bed with its head against the left wall ('L') or the back wall ('B')
  const bed = (b, name, x0, x1, z0, z1, { head = 'L', frame = C.woodD, cover = C.blue, sheet = C.white, r } = {}) => {
    b.block(x0, x1, 0, 0.32, z0, z1, frame); b.block(x0 + 0.05, x1 - 0.05, 0.32, 0.52, z0 + 0.05, z1 - 0.05, sheet, { climb: false });
    if (head === 'L') {
      b.block(x0, x0 + 0.12, 0, 1.15, z0, z1, frame);
      b.box(x0 + 0.75, x1 - 0.02, 0.5, 0.57, z0 + 0.02, z1 - 0.02, cover, { r: 0.03 }); b.box(x0 + 0.75, x0 + 1.0, 0.56, 0.59, z0 + 0.02, z1 - 0.02, sheet);
      for (let z = z0 + 0.2; z < z1 - 0.5; z += 0.8) b.box(x0 + 0.18, x0 + 0.68, 0.52, 0.64, z, z + 0.62, sheet, { r: 0.05 });
    } else {
      b.block(x0, x1, 0, 1.15, z0, z0 + 0.12, frame);
      b.box(x0 + 0.02, x1 - 0.02, 0.5, 0.57, z0 + 0.75, z1 - 0.02, cover, { r: 0.03 }); b.box(x0 + 0.02, x1 - 0.02, 0.56, 0.59, z0 + 0.75, z0 + 1.0, sheet);
      for (let x = x0 + 0.2; x < x1 - 0.5; x += 0.8) b.box(x, x + 0.62, 0.52, 0.64, z0 + 0.18, z0 + 0.68, sheet, { r: 0.05 });
    }
    b.solid(x0 + 0.05, x1 - 0.05, 0.5, 0.57, z0 + 0.05, z1 - 0.05, { climb: false });
    const cx = head === 'L' ? (x0 + x1) / 2 + 0.3 : (x0 + x1) / 2, cz = head === 'L' ? (z0 + z1) / 2 : (z0 + z1) / 2 + 0.3;
    W.addBed(name, b.id, b.p(cx, 0.57, cz), r || Math.min(x1 - x0, z1 - z0) * 0.45);
  };
  const table = (b, x0, x1, z0, z1, h, top = C.woodL, leg = C.woodD) => {
    b.box(x0, x1, h - 0.07, h, z0, z1, top, { r: 0.02 });
    for (const x of [x0 + 0.08, x1 - 0.08]) for (const z of [z0 + 0.08, z1 - 0.08]) b.box(x - 0.04, x + 0.04, 0, h - 0.07, z - 0.04, z + 0.04, leg);
    b.solid(x0, x1, h - 0.07, h, z0, z1, { climb: false });
  };
  // a chair to hop up on; `back` is which side its back is on
  const chair = (b, x, z, back, c = C.wood, seat = null) => {
    b.block(x - 0.22, x + 0.22, 0, 0.42, z - 0.22, z + 0.22, c);
    if (seat) b.box(x - 0.2, x + 0.2, 0.42, 0.47, z - 0.2, z + 0.2, seat, { r: 0.02 });
    const [bx, bz] = { '-x': [-0.2, 0], '+x': [0.2, 0], '-z': [0, -0.2], '+z': [0, 0.2] }[back];
    b.box(x + bx - (bx ? 0.03 : 0.22), x + bx + (bx ? 0.03 : 0.22), 0.42, 0.98, z + bz - (bz ? 0.03 : 0.22), z + bz + (bz ? 0.03 : 0.22), c);
  };
  const armchair = (b, name, x, z, c, { r = 0.5 } = {}) => {
    b.block(x - 0.5, x + 0.5, 0, 0.45, z - 0.5, z + 0.5, c); b.block(x - 0.5, x - 0.28, 0.45, 1.1, z - 0.5, z + 0.5, tint(c, -0.06));
    b.block(x - 0.28, x + 0.5, 0.45, 0.72, z - 0.5, z - 0.3, tint(c, -0.06)); b.block(x - 0.28, x + 0.5, 0.45, 0.72, z + 0.3, z + 0.5, tint(c, -0.06));
    b.box(x - 0.26, x + 0.46, 0.45, 0.53, z - 0.28, z + 0.28, tint(c, 0.08), { r: 0.03 });
    if (name) W.addBed(name, b.id, b.p(x + 0.1, 0.53, z), r);
  };
  // kitchen units along the back wall
  const units = (b, x0, x1, { top = C.woodL, front = '#8fa9a0', h = 0.9, depth = 0.65 } = {}) => {
    b.block(x0, x1, 0, h, 0, depth, front); b.box(x0 - 0.03, x1 + 0.03, h, h + 0.06, 0, depth + 0.05, top); b.solid(x0 - 0.03, x1 + 0.03, h, h + 0.06, 0, depth + 0.05);
    for (let x = x0 + 0.06; x < x1 - 0.3; x += 0.62) { b.box(x, Math.min(x1 - 0.06, x + 0.56), 0.12, h - 0.1, depth, depth + 0.025, tint(front, 0.07)); b.ball(Math.min(x1 - 0.14, x + 0.46), h - 0.28, depth + 0.04, 0.035, C.cream, { seg: 5 }); }
    b.box(x0, x1, 0, 0.1, depth - 0.04, depth, tint(front, -0.2));
  };
  const cupboards = (b, x0, x1, { front = '#8fa9a0', y0 = 1.6, y1 = 2.35 } = {}) => {
    b.box(x0, x1, y0, y1, 0, 0.36, front);
    for (let x = x0 + 0.05; x < x1 - 0.3; x += 0.6) { b.box(x, Math.min(x1 - 0.05, x + 0.55), y0 + 0.06, y1 - 0.06, 0.36, 0.385, tint(front, 0.07)); b.ball(Math.min(x1 - 0.12, x + 0.46), y0 + 0.16, 0.4, 0.03, C.cream, { seg: 5 }); }
  };
  const stairs = (b, x0, x1, zBottom, n, { wood = C.wood, carpet = C.red, rise = 0.2, run = 0.34, name } = {}) => {
    for (let i = 0; i < n; i++) {
      const z1 = zBottom - i * run, z0 = z1 - run, y = (i + 1) * rise;
      b.block(x0, x1, 0, y, z0, z1, i % 2 ? wood : tint(wood, 0.05), { tex: TEX.wood });
      b.box(x0 + 0.25, x1 - 0.2, y, y + 0.012, z0, z1, carpet); b.box(x0 + 0.25, x1 - 0.2, y - rise, y, z1 - 0.012, z1 + 0.004, tint(carpet, -0.1));
      if (i % 2 === 0) b.box(x0 - 0.02, x0 + 0.04, y, y + 0.85, z0 + 0.14, z0 + 0.2, C.white);
    }
    const top = n * rise, zt = zBottom - n * run;
    b.block(x0, x1, 0, top, 0, zt, wood, { tex: TEX.wood });
    b.beam([x0 + 0.01, 0.2 + 0.85, zBottom], [x0 + 0.01, top + 0.9, zt], 0.04, C.woodD, { seg: 6 });
    b.box(x0 - 0.04, x0 + 0.06, 0, 1.15, zBottom - 0.04, zBottom + 0.08, C.woodD); b.ball(x0 + 0.01, 1.22, zBottom + 0.02, 0.09, C.woodD, { seg: 7 });
    b.box(x0 + 0.1, x1 - 0.1, top, top + 0.1, 0.12, zt - 0.1, carpet, { r: 0.04 }); b.ball(x0 + 0.5, top + 0.2, 0.5, 0.24, C.cream, { sy: 0.6, seg: 7 });
    b.box(x0 + 0.1, x1 - 0.1, top, top + 1.0, 0, 0.03, DARK); // the way upstairs, which is for people
    if (name) W.addBed(name, b.id, b.p((x0 + x1) / 2, top + 0.1, zt / 2 + 0.05), 0.55);
  };
  const hooks = (b, z0, colours) => { b.box(0, 0.05, 1.5, 1.6, z0, z0 + colours.length * 0.3 + 0.1, C.woodD); colours.forEach((c, i) => { b.ball(0.07, 1.5, z0 + 0.2 + i * 0.3, 0.035, C.dark, { seg: 5 }); if (c) b.box(0.05, 0.16, 0.7 + (i % 2) * 0.12, 1.5, z0 + 0.07 + i * 0.3, z0 + 0.33 + i * 0.3, c, { r: 0.04 }); }); };
  const shoes = (b, x, z, list) => list.forEach(([c, big], i) => { for (const dz of [0, 0.17]) b.box(x, x + (big ? 0.32 : 0.22), 0, big ? 0.14 : 0.09, z + i * 0.42 + dz, z + i * 0.42 + dz + 0.13, c, { r: 0.03 }); });

  // one hallway: doors to its rooms down the left wall (and one in the back wall if there is a fourth),
  // the shut front door at the far end, and the garden door at the open edge
  function hallway(id, { d = 8.6, w = 5, floor, floor2, wall, wall2, light, front, garden, runner, doors, trim = C.white, upstairs = true, carpet }) {
    const b = room(id, { w, d, h: 3.2, floor, wall, wall2: wall2 || wall, light });
    planksFloor(b, w, d, floor, floor2 || tint(floor, 0.05));
    skirt(b, w, d, trim);
    const spots = {};
    const left = doors.filter((q) => q.side !== 'B'), gap = (d - 0.9) / left.length;
    left.forEach((q, i) => { const z = 0.75 + gap * (i + 0.5); spots[q.to] = [doorway(b, 'L', z - 0.6, z + 0.6, { frame: trim, mat: q.mat || '#b8a37a', leaf: q.leaf }), [1, 0]]; });
    const back = doors.find((q) => q.side === 'B');
    if (back) spots[back.to] = [doorway(b, 'B', 0.5, 1.7, { frame: trim, mat: back.mat || '#b8a37a', leaf: back.leaf }), [0, 1]];
    frontDoor(b, back ? 2.75 : 1.9, front);
    if (upstairs) stairs(b, 3.75, 4.98, 4.6, 10, { carpet: carpet || runner[0], name: id + '-landing' });
    rug(b, 1.3, 2.9, 1.2, d - 1.3, runner[0], runner[1]);
    const exit = gardenDoor(b, 2.1, d, garden);
    b.d = d;
    b.between = (i) => 0.75 + gap * (i + 1); // the bit of wall between door i and the next
    return { b, spots, exit };
  }
  // join a hallway to the garden and to each of its rooms
  const connect = (hall, hallId, gardenSpot, sound = 'flap') => {
    W.link('outside', gardenSpot, [0, 1], hallId, hall.exit, [0, -1], sound);
    for (const [to, [spot, out]] of Object.entries(hall.spots)) W.link(hallId, spot, out, to, W.roomDoor[to], [1, 0], 'creak');
  };

  // =====================================================================================
  // HOME: the cottage. Sitting room (already there), kitchen, bedroom, bathroom.
  // =====================================================================================
  {
    const b = room('homekitchen', { w: 6.5, d: 5, h: 3.2, floor: '#d9cdb4', wall: '#f2e6cc', wall2: '#cfe0d2', light: LIGHT.warm });
    tiles(b, 6.5, 5, 0.65, '#c9b99a'); skirt(b, 6.5, 5);
    wayOut(b, 3.2, 4.4, { frame: C.white });
    units(b, 0.5, 3.4, { front: '#7fa39a' }); units(b, 4.3, 5.6, { front: '#7fa39a' });
    b.block(3.4, 4.3, 0, 0.9, 0, 0.65, C.white); b.box(3.45, 4.25, 0.15, 0.7, 0.65, 0.68, '#3d4450'); b.box(3.4, 4.3, 0.9, 0.94, 0, 0.68, '#3d4450'); b.solid(3.4, 4.3, 0.9, 0.94, 0, 0.68);
    for (const [x, z] of [[3.62, 0.2], [4.08, 0.2], [3.62, 0.48], [4.08, 0.48]]) b.cyl(x, 0.94, 0.955, z, 0.11, 0.11, C.dark, { seg: 8 });
    b.cyl(4.08, 0.955, 1.15, 0.2, 0.13, 0.13, C.red, { seg: 8 }); b.beam([4.2, 1.08, 0.2], [4.4, 1.12, 0.25], 0.02, C.dark, { seg: 4 });
    b.box(1.5, 2.4, 0.9, 0.97, 0.12, 0.55, C.metal); b.box(1.56, 2.34, 0.93, 0.975, 0.17, 0.5, '#6f7a83'); b.beam([1.95, 0.96, 0.08], [1.95, 1.25, 0.08], 0.02, C.metal, { seg: 5 }); b.beam([1.95, 1.25, 0.08], [1.95, 1.2, 0.3], 0.02, C.metal, { seg: 5 });
    cupboards(b, 0.5, 2.9, { front: '#7fa39a' }); b.box(3.3, 4.4, 1.75, 2.1, 0, 0.4, C.white); b.box(3.35, 4.35, 1.7, 1.75, 0.02, 0.42, C.metal);
    win(b, 'R', 4.7, 6.2, 1.25, 2.5); sunbeam(b, 5.1, 2.0, 1.4, 2.0, 0.45);
    for (const x of [4.6, 6.3]) b.box(x - 0.14, x + 0.14, 1.1, 2.6, 0.05, 0.1, '#e8c170');
    b.cyl(5.0, 0.96, 1.2, 0.3, 0.1, 0.08, C.blue, { seg: 7 }); b.ball(5.0, 1.32, 0.3, 0.13, C.leaf, { seg: 6 }); b.cyl(5.5, 0.96, 1.02, 0.35, 0.2, 0.16, C.cream, { seg: 9 }); for (const [dx, c] of [[-0.07, C.red], [0.07, C.orange], [0, C.yellow]]) b.ball(5.5 + dx, 1.07, 0.35 + dx * 0.5, 0.075, c, { seg: 6 });
    b.block(5.7, 6.45, 0, 1.95, 0.9, 1.75, C.cream, { climb: false }); b.box(5.66, 5.7, 0.1, 1.2, 0.95, 1.7, tint(C.cream, 0.05)); b.box(5.66, 5.7, 1.26, 1.9, 0.95, 1.7, tint(C.cream, 0.05)); b.box(5.62, 5.66, 0.8, 1.1, 1.0, 1.05, C.metal); b.box(5.62, 5.66, 1.35, 1.6, 1.0, 1.05, C.metal);
    for (const [y, z, c] of [[1.4, 1.25, C.red], [1.55, 1.5, C.yellow], [0.7, 1.4, C.blue]]) b.box(5.64, 5.66, y, y + 0.12, z, z + 0.12, c);
    table(b, 2.0, 3.6, 2.6, 3.6, 0.76, C.woodL, C.wood); chair(b, 2.4, 2.3, '-z', C.wood, C.red); chair(b, 3.2, 3.95, '+z', C.wood, C.red); chair(b, 1.7, 3.1, '-x', C.wood, C.red);
    b.box(2.3, 3.3, 0.76, 0.775, 2.75, 3.45, '#e8d2a8'); b.cyl(2.8, 0.775, 0.95, 3.1, 0.09, 0.07, C.blue, { seg: 7 }); for (let k = 0; k < 4; k++) b.ball(2.8 + Math.cos(k * 1.6) * 0.07, 1.02 + (k % 2) * 0.06, 3.1 + Math.sin(k * 1.6) * 0.07, 0.05, [C.yellow, C.pink, C.white, C.purple][k], { seg: 5 });
    b.cyl(2.35, 0.775, 0.79, 2.95, 0.13, 0.13, C.white, { seg: 9 }); b.cyl(3.25, 0.775, 0.86, 3.25, 0.05, 0.045, C.white, { seg: 7 });
    hangLamp(b, 2.8, 3.1, 3.2, '#ffc77a', '#f2c9a0');
    rug(b, 0.9, 2.0, 0.9, 2.3, '#c9695a', '#e8d2a8');
    b.box(0, 0.04, 1.3, 2.3, 0.6, 2.6, C.woodD); for (let k = 0; k < 5; k++) { b.beam([0.05, 2.2, 0.8 + k * 0.4], [0.05, 1.95 - (k % 2) * 0.1, 0.8 + k * 0.4], 0.008, C.dark, { seg: 3 }); b.cyl(0.07, 1.6 - (k % 2) * 0.1, 1.95 - (k % 2) * 0.1, 0.8 + k * 0.4, 0.11, 0.09, k % 2 ? C.metal : '#b9703a', { seg: 7, rot: [0, 0, 1.57] }); }
    b.box(0.3, 1.3, 0, 0.012, 4.55, 4.95, '#7fa39a');
    W.addBowl('milk', 'homekitchen', b.p(0.8, 0.012, 4.75));
    b.block(4.6, 5.4, 0, 0.5, 4.0, 4.7, C.hay); b.box(4.55, 5.45, 0.42, 0.52, 3.95, 4.75, tint(C.hay, -0.08)); for (const [dx, dz, c] of [[0, 0, '#a9c765'], [0.2, 0.15, C.orange], [-0.18, 0.1, C.orange], [0.05, -0.18, '#a9c765']]) b.ball(5.0 + dx, 0.6, 4.35 + dz, 0.14, c, { seg: 6 });
    W.addItem('feather', 'homekitchen', b.p(3.9, 0, 4.3));
    b.finish();
  }
  {
    const b = room('homebed', { w: 6.2, d: 5, h: 3.2, floor: '#b98c5e', wall: '#dfe4ec', wall2: '#e9d6cf', light: LIGHT.warm });
    planksFloor(b, 6.2, 5, '#b98c5e', '#c2966a'); skirt(b, 6.2, 5);
    wayOut(b, 0.5, 1.7, { frame: C.white });
    bed(b, 'bigbed', 0, 2.5, 2.4, 4.6, { cover: '#c9695a', frame: C.woodD });
    for (let k = 0; k < 6; k++) b.box(0.8 + (k % 3) * 0.55, 1.3 + (k % 3) * 0.55, 0.572, 0.578, 2.45 + Math.floor(k / 3) * 1.05, 3.45 + Math.floor(k / 3) * 1.05, k % 2 ? '#e8d2a8' : '#8fb0a0');
    b.ball(2.2, 0.72, 3.1, 0.2, '#e8d2a8', { sy: 0.6, seg: 7 });
    b.block(0.1, 0.7, 0, 0.6, 1.85, 2.3, C.wood); tableLamp(b, 0.4, 0.6, 2.08);
    b.block(0.1, 0.7, 0, 0.6, 4.65, 4.98, C.wood); b.box(0.2, 0.6, 0.6, 0.66, 4.7, 4.95, C.navy); b.box(0.25, 0.55, 0.66, 0.7, 4.72, 4.93, C.red);
    b.block(2.6, 4.3, 0, 2.3, 0, 0.6, C.woodD); b.box(2.65, 3.43, 0.1, 2.2, 0.6, 0.63, C.wood); b.box(3.47, 4.25, 0.1, 2.2, 0.6, 0.63, C.wood); for (const x of [3.36, 3.54]) b.ball(x, 1.15, 0.66, 0.04, C.yellow, { seg: 5 });
    b.box(2.55, 4.35, 2.3, 2.38, 0, 0.66, C.woodD); b.block(2.9, 3.6, 2.38, 2.7, 0.1, 0.5, C.card, { climb: false });
    win(b, 'R', 4.7, 6.0, 1.2, 2.6); sunbeam(b, 5.0, 1.9, 1.3, 2.0, 0.45); for (const x of [4.58, 6.1]) b.box(x - 0.14, x + 0.14, 1.0, 2.75, 0.05, 0.1, '#df84a5');
    b.block(4.75, 5.95, 0, 0.42, 0.05, 0.6, '#e9d6cf'); b.box(4.8, 5.9, 0.42, 0.5, 0.08, 0.58, '#df84a5', { r: 0.03 });
    W.addBed('windowseat', 'homebed', b.p(5.35, 0.5, 0.33), 0.5);
    roundRug(b, 3.9, 3.2, 1.5, 1.1, '#8fb0a0', '#e8d2a8');
    b.block(4.9, 6.1, 0, 0.6, 4.1, 4.9, C.wood); b.box(4.86, 6.14, 0.6, 0.66, 4.06, 4.94, C.woodL); b.solid(4.86, 6.14, 0.6, 0.66, 4.06, 4.94); b.cyl(5.2, 0.66, 0.84, 4.4, 0.06, 0.05, C.pink, { seg: 6 }); b.box(5.5, 5.9, 0.66, 0.72, 4.25, 4.55, C.cream); for (const y of [0.15, 0.38]) b.box(4.88, 4.9, y, y + 0.16, 4.2, 4.8, C.woodL);
    for (const [z, y, c] of [[2.5, 1.7, '#8fb0a0'], [3.2, 1.85, '#e8c170'], [3.9, 1.7, '#d98a8a']]) pic(b, 'L', z, y, 0.5, 0.6, c);
    for (const dz of [0, 0.22]) b.box(2.7, 3.0, 0, 0.1, 2.0 + dz, 2.16 + dz, '#df84a5', { r: 0.04 });
    W.addItem('sock', 'homebed', b.p(3.6, 0, 4.2));
    b.finish();
  }
  {
    const b = room('homebath', { w: 5, d: 4.2, h: 3.2, floor: '#cfe0e6', wall: '#e6f0ee', wall2: '#d4e6e4', light: LIGHT.bright });
    tiles(b, 5, 4.2, 0.5, '#f4f8f6');
    for (let x = 0; x < 5; x += 0.5) for (let y = 0; y < 1.5; y += 0.5) if ((Math.round(x * 2) + Math.round(y * 2)) % 2) b.box(x + 0.02, x + 0.48, y + 0.02, y + 0.48, 0, 0.025, '#a9cfd6');
    for (let z = 0; z < 4.2; z += 0.5) for (let y = 0; y < 1.5; y += 0.5) if ((Math.round(z * 2) + Math.round(y * 2)) % 2) b.box(0, 0.025, y + 0.02, y + 0.48, z + 0.02, Math.min(4.2, z + 0.48), '#a9cfd6');
    b.box(0, 5, 1.5, 1.58, 0, 0.05, C.white); b.box(0, 0.05, 1.5, 1.58, 0, 4.2, C.white);
    wayOut(b, 2.7, 3.9, { frame: C.white, mat: '#7fa3c7' });
    // a roll-top bath to jump into
    for (const [x0, x1, z0, z1] of [[1.2, 3.4, 0.25, 0.4], [1.2, 3.4, 1.2, 1.35], [1.2, 1.35, 0.25, 1.35], [3.25, 3.4, 0.25, 1.35]]) b.block(x0, x1, 0.14, 0.72, z0, z1, C.white);
    b.block(1.3, 3.3, 0.14, 0.26, 0.35, 1.25, '#f4f8f6', { climb: false }); for (const [x0, x1, z0, z1] of [[1.14, 3.46, 0.19, 0.42], [1.14, 3.46, 1.18, 1.41], [1.14, 1.37, 0.19, 1.41], [3.23, 3.46, 0.19, 1.41]]) b.box(x0, x1, 0.7, 0.76, z0, z1, C.white, { r: 0.02 });
    for (const [x, z] of [[1.35, 0.4], [3.25, 0.4], [1.35, 1.2], [3.25, 1.2]]) b.ball(x, 0.07, z, 0.09, C.yellow, { seg: 6 });
    b.beam([1.28, 0.76, 0.6], [1.28, 1.0, 0.6], 0.025, C.yellow, { seg: 5 }); b.beam([1.28, 1.0, 0.6], [1.5, 0.95, 0.6], 0.025, C.yellow, { seg: 5 }); b.beam([1.28, 0.76, 1.0], [1.28, 0.9, 1.0], 0.03, C.yellow, { seg: 5 });
    W.addBed('bath', 'homebath', b.p(2.3, 0.26, 0.8), 0.6);
    rug(b, 1.5, 3.1, 1.6, 2.5, '#7fa3c7', C.white);
    b.block(3.9, 4.6, 0, 0.42, 0.15, 0.85, C.white, { climb: false }); b.block(3.9, 4.6, 0.42, 1.0, 0, 0.3, C.white, { climb: false }); b.box(3.92, 4.58, 0.42, 0.47, 0.3, 0.87, '#e9f1ef', { r: 0.03 }); b.ball(4.5, 0.9, 0.33, 0.045, C.metal, { seg: 5 });
    b.cyl(0.55, 0, 0.75, 1.55, 0.1, 0.16, C.white, { seg: 8 }); b.cyl(0.55, 0.75, 0.92, 1.55, 0.36, 0.22, C.white, { seg: 10 }); b.cyl(0.55, 0.88, 0.925, 1.55, 0.28, 0.28, '#e9f1ef', { seg: 10 }); b.beam([0.25, 0.92, 1.55], [0.25, 1.1, 1.55], 0.02, C.metal, { seg: 5 }); b.solid(0.2, 0.9, 0, 0.92, 1.2, 1.9, { climb: false });
    b.box(0, 0.04, 1.65, 2.5, 1.15, 1.95, C.white); b.box(0.03, 0.055, 1.72, 2.43, 1.22, 1.88, '#cfe8f0');
    b.box(2.2, 3.4, 1.9, 1.96, 0, 0.1, C.metal); for (const [x, c] of [[2.3, C.yellow], [2.75, '#7fa3c7'], [3.15, C.white]]) b.box(x, x + 0.34, 1.25, 1.93, 0.06, 0.12, c, { r: 0.02 });
    win(b, 'R', 0.3, 1.1, 1.7, 2.6); sunbeam(b, 0.9, 2.2, 0.8, 1.4, 0.45);
    b.block(4.2, 4.8, 0, 0.5, 3.0, 3.6, '#c9a26b'); for (const [dx, c] of [[0, C.white], [0.12, '#7fa3c7'], [-0.1, C.yellow]]) b.ball(4.5 + dx, 0.56, 3.3 + dx, 0.2, c, { sy: 0.5, seg: 7 });
    b.cyl(0.5, 0, 0.3, 3.9, 0.16, 0.13, '#7fa3c7', { seg: 8 }); b.cyl(0.5, 0.3, 0.7, 3.9, 0.015, 0.015, C.woodD, { seg: 4 }); b.ball(0.5, 0.26, 3.9, 0.1, C.white, { seg: 6 });
    plant(b, 4.55, 1.6, 0.7, C.leafL, C.white);
    lamp(b, 2.5, 2.6, 2.4, '#fff3dc', 7, 8);
    W.addItem('duck', 'homebath', b.p(2.6, 0.26, 1.0));
    b.finish();
  }
  {
    const h = hallway('homehall', {
      floor: '#b98c5e', floor2: '#c2966a', wall: '#e9dcc3', wall2: '#dfd2b6', light: LIGHT.warm, front: C.teal, garden: C.teal, runner: ['#c9695a', '#e8d2a8'],
      doors: [{ to: 'homekitchen', mat: '#7fa39a' }, { to: 'home', mat: '#c9695a' }, { to: 'homebed', mat: '#df84a5' }, { to: 'homebath', side: 'B', mat: '#7fa3c7' }],
    });
    const b = h.b;
    dado(b, 5, b.d, '#dccfb2');
    hooks(b, b.between(0) - 0.5, [C.red, C.navy, C.yellow]);
    shoes(b, 0.15, b.between(1) - 0.45, [[C.red, true], ['#5b8fb9', false]]);
    pic(b, 'L', b.between(1) - 0.35, 1.75, 0.7, 0.55, '#8fb0a0');
    b.block(3.05, 3.55, 0, 0.5, 7.3, 7.8, '#6d9a8a', { climb: false }); for (const [x, c] of [[3.18, C.red], [3.3, C.navy], [3.42, C.yellow]]) b.beam([x, 0.3, 7.55], [x + 0.05, 1.15, 7.45], 0.02, c, { seg: 5 });
    hangLamp(b, 2.1, 3.6, 3.2);
    plant(b, 3.2, 5.6, 0.8);
    connect(h, 'homehall', W.houseDoor.home);
    b.finish();
  }

  // =====================================================================================
  // NEXT DOOR, LEFT: the family house. Playroom, bunk-bed room, laundry.
  // =====================================================================================
  {
    const b = room('playroom', { w: 6.6, d: 5.2, h: 3.2, floor: '#d9b98a', wall: '#f6e7a8', wall2: '#cfe6f2', light: LIGHT.bright });
    planksFloor(b, 6.6, 5.2, '#d9b98a', '#e2c496'); skirt(b, 6.6, 5.2);
    wayOut(b, 3.6, 4.8, { frame: C.white, mat: C.red });
    // play mat of coloured squares
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) b.box(2.0 + i * 0.8, 2.78 + i * 0.8, 0, 0.03, 1.9 + j * 0.8, 2.68 + j * 0.8, [C.red, C.yellow, C.blue, '#8fba58'][(i + j * 3) % 4], { r: 0.02 });
    // a tent to curl up in
    b.cone(1.15, 0, 1.9, 1.3, 1.05, '#f2c9a0', { seg: 6 }); b.cone(1.15, 0, 1.0, 2.05, 0.42, DARK, { seg: 4 });
    for (let k = 0; k < 6; k++) b.cone(0.5 + k * 0.26, 1.2 - Math.abs(k - 2.5) * 0.12, 1.36 - Math.abs(k - 2.5) * 0.12, 2.15 + k * 0.01, 0.07, [C.red, C.yellow, C.blue][k % 3], { seg: 3 });
    b.box(0.6, 1.7, 0, 0.06, 0.9, 1.9, '#df84a5', { r: 0.03 });
    W.addBed('tent', 'playroom', b.p(1.15, 0.06, 1.4), 0.7);
    // toy box, blocks, a train on its track, a rocking horse
    b.block(2.6, 3.9, 0, 0.55, 0.1, 0.8, C.blue); b.box(2.55, 3.95, 0.55, 0.62, 0.05, 0.85, C.navy); b.solid(2.55, 3.95, 0.55, 0.62, 0.05, 0.85);
    b.ball(3.0, 0.82, 0.4, 0.2, '#b98a5a', { seg: 7 }); b.ball(3.0, 1.08, 0.4, 0.15, '#b98a5a', { seg: 7 }); for (const dx of [-0.11, 0.11]) b.ball(3.0 + dx, 1.2, 0.4, 0.05, '#b98a5a', { seg: 5 });
    b.cyl(3.55, 0.62, 0.9, 0.45, 0.02, 0.02, C.woodD, { seg: 4 }); b.cone(3.55, 0.9, 1.15, 0.45, 0.12, C.red, { seg: 6 });
    for (const [x, z, y, c] of [[4.6, 1.1, 0, C.red], [4.86, 1.1, 0, C.yellow], [4.73, 1.1, 0.24, C.blue], [5.3, 1.5, 0, '#8fba58'], [4.4, 1.6, 0, C.purple]]) b.block(x, x + 0.24, y, y + 0.24, z, z + 0.24, c, { climb: false });
    b.geo(new THREE.TorusGeometry(0.75, 0.035, 5, 28).rotateX(Math.PI / 2).toNonIndexed(), C.woodD, b.mat(3.6, 0.05, 3.2, 1.2, 1, 0.9));
    for (const [dx, c] of [[0, C.red], [0.32, C.blue], [0.62, C.yellow]]) { b.box(3.2 + dx, 3.46 + dx, 0.07, 0.24, 2.44, 2.62, c, { r: 0.02 }); for (const wx of [0.05, 0.2]) b.cyl(3.2 + dx + wx, 0.03, 0.13, 2.64, 0.05, 0.05, C.dark, { seg: 6, rot: [1.57, 0, 0] }); }
    b.cyl(3.26, 0.24, 0.36, 2.53, 0.04, 0.05, C.dark, { seg: 6 });
    for (const z of [3.44, 3.7]) { b.box(4.95, 6.05, 0, 0.06, z, z + 0.06, C.red, { r: 0.02 }); for (const x of [5.2, 5.75]) b.box(x, x + 0.07, 0.06, 0.5, z, z + 0.06, '#b98a5a'); } b.box(5.1, 5.9, 0.5, 0.8, 3.5, 3.7, '#b98a5a', { r: 0.06 }); b.box(5.75, 5.95, 0.75, 1.15, 3.52, 3.68, '#b98a5a', { r: 0.05 }); b.box(5.9, 6.1, 1.0, 1.15, 3.54, 3.66, '#b98a5a', { r: 0.04 }); b.box(5.1, 5.2, 0.6, 0.95, 3.57, 3.63, C.hay);
    b.solid(5.0, 6.1, 0, 0.8, 3.4, 3.8, { climb: false });
    // chalk board, drawings, bunting, star lights
    b.box(0, 0.05, 0.9, 1.9, 2.4, 3.3, C.woodL); b.box(0.04, 0.06, 0.98, 1.82, 2.48, 3.22, '#3d5a4c'); b.box(0.06, 0.065, 1.3, 1.5, 2.7, 3.0, C.white); b.box(0.06, 0.065, 1.2, 1.25, 2.6, 3.1, C.yellow);
    for (const [x, y, c] of [[0.5, 1.5, C.white], [1.2, 1.7, '#fff3c8'], [4.3, 1.5, C.white], [5.0, 1.75, '#fff3c8']]) { b.box(x, x + 0.5, y, y + 0.62, 0, 0.03, c); b.box(x + 0.1, x + 0.4, y + 0.12, y + 0.42, 0.03, 0.04, [C.red, C.blue, C.leafL, C.purple][Math.round(x * 2) % 4]); }
    for (let k = 0; k < 11; k++) b.cone(0.4 + k * 0.56, 2.72 - Math.sin((k / 10) * Math.PI) * 0.18, 2.9 - Math.sin((k / 10) * Math.PI) * 0.18, 0.05, 0.12, [C.red, C.yellow, C.blue, C.white][k % 4], { seg: 3 });
    for (let i = 0; i < 9; i++) b.ball(0.06, 2.6 - Math.sin((i / 8) * Math.PI) * 0.2, 0.5 + i * 0.5, 0.055, ['#ffd98a', '#ff9a8a', '#9ad9ff', '#b9ff9a'][i % 4], { layer: 'lit', seg: 5 });
    win(b, 'R', 1.9, 3.3, 1.3, 2.5); sunbeam(b, 2.4, 2.4, 1.3, 1.8, 0.4);
    lamp(b, 3.4, 2.5, 2.8, '#fff0d0', 8, 9);
    W.addItem('teddy', 'playroom', b.p(4.6, 0, 4.3));
    W.addBall('playroom', b.p(2.3, 0.03, 3.9), C.yellow, 0.15); W.addBall('playroom', b.p(5.6, 0, 2.2), C.red, 0.12);
    b.finish();
  }
  {
    const b = room('bunkroom', { w: 6, d: 4.8, h: 3.2, floor: '#c9a67a', wall: '#cfdcf0', wall2: '#bcd0ea', light: LIGHT.warm });
    planksFloor(b, 6, 4.8, '#c9a67a', '#d2b086'); skirt(b, 6, 4.8);
    wayOut(b, 0.4, 1.6, { frame: C.white, mat: C.navy });
    // bunk beds along the left wall, with a ladder up
    for (const [x, z] of [[0.05, 2.2], [1.25, 2.2], [0.05, 4.5], [1.25, 4.5]]) b.block(x, x + 0.14, 0, 2.2, z, z + 0.14, C.woodL);
    for (const y of [0.3, 1.45]) { b.block(0.05, 1.39, y, y + 0.16, 2.2, 4.64, C.woodL, { climb: false }); b.box(0.12, 1.32, y + 0.16, y + 0.3, 2.3, 4.55, C.white, { r: 0.03 }); b.box(0.12, 1.32, y + 0.28, y + 0.34, 2.9, 4.55, y < 1 ? C.red : C.navy, { r: 0.02 }); b.box(0.2, 1.2, y + 0.3, y + 0.4, 2.36, 2.8, C.white, { r: 0.05 }); b.solid(0.12, 1.32, y + 0.16, y + 0.3, 2.3, 4.55, { climb: false }); }
    b.box(1.25, 1.39, 1.75, 1.85, 2.34, 4.5, C.woodL);
    b.block(1.39, 1.5, 0, 1.75, 3.9, 4.4, C.woodL); for (let k = 0; k < 5; k++) b.box(1.39, 1.56, 0.25 + k * 0.33, 0.31 + k * 0.33, 3.9, 4.4, C.wood);
    W.addBed('bunk', 'bunkroom', b.p(0.72, 0.6, 3.5), 0.6); W.addBed('topbunk', 'bunkroom', b.p(0.72, 1.75, 3.5), 0.6);
    b.ball(0.7, 1.95, 4.2, 0.18, '#9ad9ff', { sy: 0.7, seg: 7 });
    // desk under the window, with a globe; a rocket; a rug like a road
    table(b, 2.4, 4.0, 0.1, 0.9, 0.74, C.woodL, C.blue); chair(b, 3.2, 1.25, '+z', C.blue);
    b.cyl(2.8, 0.74, 0.8, 0.5, 0.1, 0.12, C.woodD, { seg: 7 }); b.ball(2.8, 1.0, 0.5, 0.2, '#5b8fb9', { seg: 9 }); b.ball(2.86, 1.05, 0.62, 0.09, '#8fba58', { sx: 1.2, sz: 0.5, seg: 6 });
    b.box(3.4, 3.85, 0.74, 0.77, 0.3, 0.7, C.white); for (const [dx, c] of [[0, C.red], [0.07, C.blue], [0.14, C.yellow]]) b.box(3.5 + dx, 3.53 + dx, 0.77, 0.79, 0.35, 0.6, c);
    win(b, 'R', 2.5, 3.9, 1.2, 2.5); sunbeam(b, 3.0, 2.2, 1.3, 1.6, 0.4); for (const x of [2.38, 4.02]) b.box(x - 0.14, x + 0.14, 1.0, 2.65, 0.05, 0.1, C.navy);
    b.cyl(5.3, 0, 0.9, 0.6, 0.2, 0.2, C.white, { seg: 9 }); b.cone(5.3, 0.9, 1.3, 0.6, 0.2, C.red, { seg: 9 }); for (const a of [0, 2.1, 4.2]) b.box(5.3 + Math.cos(a) * 0.2 - 0.03, 5.3 + Math.cos(a) * 0.2 + 0.03, 0, 0.35, 0.6 + Math.sin(a) * 0.2 - 0.12, 0.6 + Math.sin(a) * 0.2 + 0.12, C.red); b.ball(5.3, 0.6, 0.79, 0.07, '#9ad9ff', { seg: 6 });
    b.solid(5.05, 5.55, 0, 0.9, 0.35, 0.85, { climb: false });
    rug(b, 2.2, 5.2, 1.9, 3.9, '#5d6a72', '#6d7a82'); for (let x = 2.5; x < 5; x += 0.6) b.box(x, x + 0.3, 0.026, 0.03, 2.86, 2.94, C.white);
    for (const [x, z, c] of [[2.8, 2.5, C.red], [4.4, 3.3, C.yellow]]) { b.box(x, x + 0.34, 0.06, 0.16, z, z + 0.18, c, { r: 0.03 }); b.box(x + 0.08, x + 0.26, 0.16, 0.24, z + 0.02, z + 0.16, tint(c, 0.1), { r: 0.02 }); }
    shelves(b, 4.6, 5.9, 4.3, 4.78, 1.3, 3, C.woodL);
    for (const [x, y] of [[0.6, 2.5], [1.5, 2.7], [4.4, 2.6], [5.4, 2.8], [5.0, 2.3]]) b.ball(x, y, 0.05, 0.07, '#fff3a0', { seg: 4, layer: 'lit' });
    b.ball(0.07, 2.6, 1.9, 0.22, '#fff3c8', { sx: 0.25, seg: 8, layer: 'lit' });
    lamp(b, 0.6, 2.4, 2.0, '#ffe9b0', 5, 6); lamp(b, 3.4, 2.4, 2.6, '#fff0d0', 6, 8);
    pic(b, 'L', 1.75, 1.6, 0.4, 0.5, C.yellow, C.white);
    W.addItem('mouse', 'bunkroom', b.p(4.9, 0, 3.4));
    b.finish();
  }
  {
    const b = room('laundry', { w: 5.4, d: 4.4, h: 3.2, floor: '#cfd6dc', wall: '#eef1e6', wall2: '#dfe9d8', light: LIGHT.bright });
    tiles(b, 5.4, 4.4, 0.55, '#e6ecf0'); skirt(b, 5.4, 4.4);
    wayOut(b, 2.8, 4.0, { frame: C.white, mat: '#8fba58' });
    // washing machine and dryer, warm on top
    for (const [x, c] of [[0.6, C.white], [1.55, '#e9eef2']]) { b.block(x, x + 0.9, 0, 0.95, 0, 0.7, c); b.cyl(x + 0.45, 0.2, 0.25, 0.72, 0.28, 0.28, C.metal, { seg: 12, rot: [1.57, 0, 0] }); b.cyl(x + 0.45, 0.21, 0.24, 0.735, 0.22, 0.22, x < 1 ? '#7fb3d2' : '#3d4450', { seg: 12, rot: [1.57, 0, 0] }); b.box(x + 0.08, x + 0.5, 0.78, 0.9, 0.7, 0.72, tint(c, -0.08)); b.ball(x + 0.72, 0.84, 0.73, 0.045, C.dark, { seg: 5 }); }
    b.box(0.55, 2.5, 0.95, 1.0, 0, 0.74, C.woodL); b.solid(0.55, 2.5, 0.95, 1.0, 0, 0.74);
    b.box(1.65, 2.35, 1.0, 1.1, 0.12, 0.6, '#7fa3c7', { r: 0.04 }); for (const [dx, c] of [[0, C.white], [0.2, C.yellow]]) b.box(1.72 + dx, 1.98 + dx, 1.1, 1.17, 0.18, 0.54, c, { r: 0.02 });
    W.addBed('dryer', 'laundry', b.p(2.0, 1.1, 0.36), 0.42);
    // sink, shelf of bottles, airer with washing, ironing board
    units(b, 3.0, 4.6, { front: C.white, top: '#b9c3c9' }); b.box(3.4, 4.3, 0.9, 0.97, 0.12, 0.55, C.metal); b.box(3.46, 4.24, 0.93, 0.975, 0.17, 0.5, '#6f7a83'); b.beam([3.85, 0.96, 0.08], [3.85, 1.25, 0.08], 0.02, C.metal, { seg: 5 }); b.beam([3.85, 1.25, 0.08], [3.85, 1.2, 0.3], 0.02, C.metal, { seg: 5 });
    b.box(0.6, 2.6, 1.75, 1.8, 0, 0.3, C.woodL); for (let k = 0; k < 5; k++) b.cyl(0.8 + k * 0.4, 1.8, 2.05 + (k % 2) * 0.1, 0.16, 0.08, 0.09, [C.blue, C.pink, C.white, '#8fba58', C.yellow][k], { seg: 7 });
    win(b, 'R', 3.2, 4.4, 1.4, 2.5); sunbeam(b, 3.6, 2.0, 1.1, 1.6, 0.4);
    for (const x of [2.7, 4.1]) { b.beam([x, 0, 2.3], [x + 0.25, 1.15, 2.9], 0.02, C.metal, { seg: 4 }); b.beam([x + 0.25, 0, 3.5], [x, 1.15, 2.9], 0.02, C.metal, { seg: 4 }); }
    for (const z of [2.55, 2.9, 3.25]) b.beam([2.7, 1.12, z], [4.35, 1.12, z], 0.012, C.metal, { seg: 4 });
    for (const [x, z, w, c, hgt] of [[2.85, 2.55, 0.4, C.red, 0.5], [3.4, 2.55, 0.3, C.white, 0.4], [3.85, 2.9, 0.45, '#7fa3c7', 0.6], [2.95, 3.25, 0.5, C.yellow, 0.45], [3.6, 3.25, 0.2, C.red, 0.3], [3.9, 3.25, 0.2, C.red, 0.3]]) b.box(x, x + w, 1.12 - hgt, 1.13, z - 0.015, z + 0.015, c, { layer: 'sway' });
    // the laundry basket: the best bed in the house
    b.cyl(1.9, 0, 0.5, 2.0, 0.62, 0.52, '#c9a26b', { seg: 12 }); b.cyl(1.9, 0.12, 0.52, 2.0, 0.54, 0.5, '#e9e2d0', { seg: 12 }); b.solid(1.35, 2.45, 0, 0.3, 1.45, 2.55, { climb: false });
    for (const [dx, dz, c] of [[0.2, 0.1, C.white], [-0.2, 0.15, '#7fa3c7'], [0, -0.2, C.pink], [0.25, -0.15, C.yellow]]) b.ball(1.9 + dx, 0.5, 2.0 + dz, 0.24, c, { sy: 0.45, seg: 7 });
    W.addBed('basket-of-washing', 'laundry', b.p(1.9, 0.3, 2.0), 0.6);
    b.box(4.5, 5.3, 0.82, 0.86, 2.2, 3.6, '#b9c3c9', { r: 0.03 }); b.beam([4.9, 0, 2.5], [4.9, 0.82, 3.3], 0.02, C.metal, { seg: 4 }); b.beam([4.9, 0, 3.3], [4.9, 0.82, 2.5], 0.02, C.metal, { seg: 4 }); b.box(4.75, 5.05, 0.86, 1.0, 2.5, 2.9, C.white, { r: 0.04 }); b.box(4.85, 4.95, 1.0, 1.08, 2.55, 2.85, C.navy);
    b.solid(4.5, 5.3, 0.82, 0.86, 2.2, 3.6, { climb: false });
    b.block(0.2, 0.9, 0, 0.5, 1.2, 1.9, C.card); b.ball(0.55, 0.6, 1.55, 0.26, '#eef1e6', { sy: 0.6, seg: 7 });
    lamp(b, 2.6, 2.6, 2.4, '#fff3dc', 7, 8);
    W.addItem('sock', 'laundry', b.p(2.0, 0, 3.7)); W.addItem('mitten', 'laundry', b.p(3.3, 0, 3.9));
    b.finish();
  }
  {
    const h = hallway('playhall', {
      floor: '#d9b98a', floor2: '#e2c496', wall: '#f0ead8', wall2: '#cfdde2', light: LIGHT.bright, front: C.red, garden: C.red, runner: ['#5b8fb9', '#f6e7a8'], carpet: '#5b8fb9',
      doors: [{ to: 'playroom', mat: C.red }, { to: 'bunkroom', mat: C.navy }, { to: 'laundry', mat: '#8fba58' }],
    });
    const b = h.b;
    hooks(b, b.between(0) - 0.5, [C.yellow, C.red, '#5b8fb9']);
    shoes(b, 0.15, b.between(0) - 0.45, [[C.yellow, true], [C.red, false]]);
    for (const [dz, y, c] of [[-0.5, 1.6, C.white], [0.05, 1.8, '#fff3c8']]) { b.box(0, 0.03, y, y + 0.6, b.between(1) + dz, b.between(1) + dz + 0.48, c); b.box(0.03, 0.04, y + 0.12, y + 0.42, b.between(1) + dz + 0.1, b.between(1) + dz + 0.38, c === C.white ? C.red : C.blue); }
    b.block(3.0, 3.5, 0, 0.9, 0.12, 0.3, C.metal, { climb: false }); b.cyl(3.25, 0, 0.2, 0.55, 0.2, 0.2, C.dark, { seg: 9, rot: [0, 0, 1.57] }); b.box(3.2, 3.3, 0.85, 0.95, 0.05, 0.6, C.red);
    b.ball(3.3, 0.16, 6.6, 0.16, C.blue, { seg: 8 });
    hangLamp(b, 2.1, 3.6, 3.2, '#fff0d0', '#f6e7a8');
    connect(h, 'playhall', W.houseDoor.play);
    b.finish();
  }

  // =====================================================================================
  // FAR LEFT: the timber house by the koi pond. Tatami room, bath house, study.
  // =====================================================================================
  const tatami = (b, w, d) => {
    for (let x = 0; x < w; x += 1.6) for (let z = 0; z < d; z += 2.4) b.box(x + 0.03, Math.min(w, x + 1.6) - 0.03, 0, 0.012, z + 0.03, Math.min(d, z + 2.4) - 0.03, (Math.round(x / 1.6) + Math.round(z / 2.4)) % 2 ? '#cfca92' : '#c2bd82');
    for (let x = 0; x <= w; x += 1.6) b.box(x - 0.03, x + 0.03, 0, 0.014, 0, d, '#5a5a3a');
    for (let z = 2.4; z < d; z += 2.4) b.box(0, w, 0, 0.014, z - 0.03, z + 0.03, '#5a5a3a');
  };
  const shoji = (b, w, d, h) => {
    for (let x = 0; x <= w; x += 0.65) b.box(x - 0.02, x + 0.02, 0.5, h, 0, 0.03, C.barkD);
    for (let y = 0.5; y < h; y += 0.7) { b.box(0, w, y, y + 0.05, 0, 0.035, C.barkD); b.box(0, 0.035, y, y + 0.05, 0, d, C.barkD); }
    for (let z = 0; z <= d; z += 0.625) b.box(0, 0.03, 0.5, h, z - 0.02, z + 0.02, C.barkD);
    b.box(0, w, 0, 0.5, 0, 0.03, C.woodD); b.box(0, 0.03, 0, 0.5, 0, d, C.woodD);
  };
  const paperLamp = (b, x, z, hgt = 0.5) => { b.cyl(x, 0, hgt, z, 0.16, 0.2, '#fff0c8', { seg: 8, layer: 'lit' }); b.cyl(x, hgt, hgt + 0.04, z, 0.2, 0.2, C.barkD, { seg: 8 }); b.cyl(x, 0, 0.04, z, 0.2, 0.2, C.barkD, { seg: 8 }); };
  {
    const b = room('tatami', { w: 6.4, d: 4.8, h: 2.8, floor: '#c9c48a', wall: '#efe6d0', light: LIGHT.paper });
    tatami(b, 6.4, 4.8); shoji(b, 6.4, 4.8, 2.8);
    wayOut(b, 3.3, 4.5, { h: 2.0, frame: C.barkD });
    // the low table with a quilt over it, warm underneath
    b.block(2.5, 4.3, 0, 0.3, 1.7, 3.3, '#b8452f', { climb: false }); b.box(2.3, 4.5, 0, 0.12, 1.5, 3.5, '#c8553d', { r: 0.05 }); b.box(2.35, 4.45, 0.12, 0.2, 1.55, 3.45, '#d9744f', { r: 0.05 });
    b.box(2.6, 4.2, 0.3, 0.38, 1.8, 3.2, C.bark, { r: 0.02 }); b.solid(2.6, 4.2, 0.3, 0.38, 1.8, 3.2, { climb: false });
    b.ball(3.1, 0.5, 2.3, 0.14, '#5a7a8a', { seg: 8 }); b.beam([3.22, 0.5, 2.3], [3.4, 0.57, 2.3], 0.022, '#5a7a8a', { seg: 5 }); for (const [x, z] of [[3.7, 2.2], [3.8, 2.8]]) b.cyl(x, 0.38, 0.47, z, 0.06, 0.05, C.white, { seg: 6 });
    b.cyl(3.3, 0.38, 0.42, 2.85, 0.18, 0.15, '#5a7a8a', { seg: 9 }); for (const [dx, dz] of [[0, 0], [0.09, 0.05], [-0.07, 0.07]]) b.ball(3.3 + dx, 0.47, 2.85 + dz, 0.06, C.orange, { seg: 6 });
    W.addBed('kotatsu', 'tatami', b.p(3.4, 0.2, 3.42), 0.55);
    for (const [x, z, c] of [[1.9, 2.5, '#8a5a8a'], [4.9, 2.5, '#5a7a8a'], [3.4, 1.1, '#8a5a8a']]) b.box(x - 0.36, x + 0.36, 0, 0.09, z - 0.36, z + 0.36, c, { r: 0.04 });
    // the alcove: a scroll, a branch in a vase
    b.block(4.6, 6.3, 0, 0.14, 0.05, 0.9, C.barkD, { climb: false }); b.box(5.1, 5.9, 0.8, 2.4, 0.03, 0.05, '#f6f1e4'); b.box(5.3, 5.7, 1.2, 2.0, 0.05, 0.06, '#3d4450'); b.box(5.05, 5.95, 2.4, 2.46, 0.03, 0.07, C.barkD); b.box(5.05, 5.95, 0.74, 0.8, 0.03, 0.07, C.barkD);
    b.cyl(4.95, 0.14, 0.46, 0.45, 0.07, 0.1, '#5a7a8a', { seg: 7 }); b.beam([4.95, 0.46, 0.45], [4.75, 1.1, 0.4], 0.015, C.barkD, { seg: 4 }); for (const [dx, y] of [[-0.12, 0.85], [-0.2, 1.1], [-0.05, 0.7], [-0.24, 0.95]]) b.ball(4.95 + dx, y, 0.42, 0.06, C.pink, { seg: 5 });
    b.box(4.56, 4.64, 0, 2.8, 0, 0.9, C.barkD);
    paperLamp(b, 0.6, 0.6, 0.7); lamp(b, 0.9, 0.9, 0.9, '#ffd08a', 9, 8); paperLamp(b, 5.9, 4.3, 0.5); lamp(b, 5.6, 0.8, 4.0, '#ffd08a', 6, 6);
    b.box(0.5, 2.3, 0, 0.1, 0.9, 1.3, '#e9e6dc', { r: 0.04 }); b.box(0.5, 2.3, 0.1, 0.2, 0.9, 1.3, '#cfd6e6', { r: 0.04 }); b.box(0.55, 0.9, 0.2, 0.3, 0.95, 1.25, '#e9e6dc', { r: 0.05 });
    W.addBed('futon', 'tatami', b.p(1.5, 0.2, 1.1), 0.6);
    b.box(0.02, 0.05, 1.0, 1.9, 1.6, 2.9, '#f6f1e4'); b.ball(0.06, 1.45, 2.25, 0.3, '#3d4450', { sx: 0.15, sy: 0.9, seg: 8 }); b.ball(0.06, 1.55, 1.9, 0.1, '#e8643c', { sx: 0.2, seg: 6 });
    W.addItem('ribbon', 'tatami', b.p(1.5, 0, 3.9));
    b.finish();
  }
  {
    const b = room('bathhouse', { w: 5.4, d: 4.6, h: 2.8, floor: '#8f8a80', wall: '#c9a67a', wall2: '#d2b086', light: LIGHT.paper });
    for (let x = 0; x < 5.4; x += 0.9) for (let z = 0; z < 4.6; z += 0.9) b.box(x + 0.03, Math.min(5.4, x + 0.9) - 0.03, 0, 0.012, z + 0.03, Math.min(4.6, z + 0.9) - 0.03, (Math.round(x / 0.9) * 3 + Math.round(z / 0.9) * 5) % 3 ? '#9a958a' : '#a39d90');
    planksWall(b, 'L', 4.6, 2.8, '#c9a67a', '#d2b086', 0.4); planksWall(b, 'R', 5.4, 2.8, '#d2b086', '#c9a67a', 0.4);
    wayOut(b, 3.0, 4.2, { h: 2.0, frame: C.barkD });
    // the wooden soaking tub: warm water to sit beside, a lid half on
    for (const [x0, x1, z0, z1] of [[2.2, 4.6, 0.3, 0.45], [2.2, 4.6, 1.75, 1.9], [2.2, 2.35, 0.3, 1.9], [4.45, 4.6, 0.3, 1.9]]) b.block(x0, x1, 0, 0.85, z0, z1, C.woodL, { tex: TEX.wood });
    for (const y of [0.2, 0.62]) { b.box(2.18, 4.62, y, y + 0.06, 1.88, 1.92, '#8a6a3a'); b.box(4.58, 4.62, y, y + 0.06, 0.28, 1.92, '#8a6a3a'); }
    b.box(2.35, 4.45, 0.7, 0.72, 0.45, 1.75, C.water, { layer: 'water' }); b.solid(2.35, 4.45, 0, 0.6, 0.45, 1.75, { climb: false });
    b.box(2.15, 3.2, 0.85, 0.9, 0.25, 1.95, C.wood, { tex: TEX.wood }); b.solid(2.15, 3.2, 0.85, 0.9, 0.25, 1.95);
    b.box(2.4, 2.9, 0.9, 0.98, 0.7, 1.5, C.white, { r: 0.03 }); b.box(2.45, 2.85, 0.98, 1.04, 0.8, 1.4, '#7fa3c7', { r: 0.03 });
    W.addBed('tub-lid', 'bathhouse', b.p(2.67, 0.9, 1.1), 0.5);
    b.block(4.3, 4.9, 0, 0.3, 2.3, 2.7, C.woodL); b.block(3.6, 4.2, 0, 0.3, 2.3, 2.7, C.woodL, { climb: false });
    // washing stool, bucket and ladle, a slatted mat, pebbles and bamboo
    b.block(1.0, 1.5, 0, 0.28, 1.2, 1.7, C.woodL); b.cyl(0.6, 0, 0.3, 2.3, 0.2, 0.17, C.wood, { seg: 9 }); b.cyl(0.6, 0.3, 0.33, 2.3, 0.21, 0.21, '#8a6a3a', { seg: 9 }); b.beam([0.6, 0.3, 2.3], [0.95, 0.42, 2.5], 0.018, C.woodL, { seg: 4 }); b.cyl(0.98, 0.38, 0.46, 2.52, 0.07, 0.06, C.woodL, { seg: 6 });
    for (let k = 0; k < 6; k++) b.box(1.0 + k * 0.2, 1.15 + k * 0.2, 0, 0.05, 2.5, 3.9, k % 2 ? C.woodL : C.wood);
    b.box(0, 5.4, 0, 0.1, 0, 0.3, '#5e5a52'); for (let k = 0; k < 16; k++) b.ball(0.2 + k * 0.33, 0.1, 0.12 + (k % 3) * 0.05, 0.07 + (k % 3) * 0.015, k % 2 ? '#d8d2c2' : '#a39d90', { sy: 0.6, seg: 6 });
    for (let k = 0; k < 5; k++) { b.cyl(0.3 + k * 0.28, 0.1, 2.0 + (k % 3) * 0.25, 0.14, 0.035, 0.04, '#8fae4e', { seg: 5 }); b.ball(0.36 + k * 0.28, 1.9 + (k % 3) * 0.25, 0.2, 0.22, k % 2 ? C.leafL : C.leaf, { sy: 0.5, layer: 'sway', sway: 0.5, seg: 6 }); }
    win(b, 'R', 3.0, 4.4, 1.5, 2.4, C.barkD); sunbeam(b, 3.4, 2.9, 1.2, 1.3, 0.4);
    b.box(0.03, 0.08, 1.4, 1.46, 0.6, 2.0, C.barkD); for (const [z, c] of [[0.7, C.white], [1.15, '#7fa3c7'], [1.6, C.white]]) b.box(0.05, 0.11, 0.8, 1.43, z, z + 0.32, c, { r: 0.02 });
    paperLamp(b, 5.0, 4.1, 0.6); lamp(b, 4.7, 0.9, 3.8, '#ffd08a', 8, 7); lamp(b, 3.4, 1.4, 1.1, '#cfe9ff', 4, 5);
    // steam drifting up off the water
    const steam = [];
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); b.dyn(m, 3.6, 0.8, 1.1); steam.push(m); }
    W.updaters.push((dt, t) => { if (W.region !== 'bathhouse') return; steam.forEach((m, i) => { const k = (t * 0.22 + i / 6) % 1; m.position.y = 0.75 + k * 1.3; m.position.x = b.ox + 3.7 + Math.sin(i * 2.4) * 0.5 + Math.sin(t * 0.7 + i) * 0.12; m.position.z = b.oz + 1.1 + Math.cos(i * 1.7) * 0.4; m.scale.setScalar(0.7 + k * 1.4); m.material.opacity = 0.32 * Math.sin(k * Math.PI); }); });
    W.addItem('duck', 'bathhouse', b.p(1.9, 0, 3.2));
    b.finish();
  }
  {
    const b = room('study', { w: 5.8, d: 4.6, h: 2.8, floor: '#b08a5e', wall: '#e6dcc6', wall2: '#dfd4bc', light: LIGHT.paper });
    planksFloor(b, 5.8, 4.6, '#b08a5e', '#b99468', 0.46); b.box(0, 5.8, 0, 0.5, 0, 0.03, C.woodD); b.box(0, 0.03, 0, 0.5, 0, 4.6, C.woodD);
    wayOut(b, 0.4, 1.6, { h: 2.0, frame: C.barkD });
    // a low writing desk with paper, brush and ink; a cushion to kneel on
    b.box(2.3, 4.1, 0.34, 0.42, 1.5, 2.4, C.barkD, { r: 0.02 }); for (const x of [2.4, 4.0]) b.box(x - 0.05, x + 0.05, 0, 0.34, 1.55, 2.35, C.barkD); b.solid(2.3, 4.1, 0.34, 0.42, 1.5, 2.4, { climb: false });
    b.box(2.7, 3.5, 0.42, 0.43, 1.65, 2.25, '#f6f1e4'); b.box(2.95, 3.25, 0.43, 0.435, 1.8, 2.1, '#3d4450', { rot: [0, 0.5, 0] }); b.beam([3.6, 0.44, 2.2], [3.95, 0.47, 1.95], 0.015, C.barkD, { seg: 4 }); b.box(3.7, 3.95, 0.42, 0.47, 1.6, 1.8, '#2a2a30');
    b.box(2.8, 3.6, 0, 0.09, 2.6, 3.3, '#5a7a8a', { r: 0.04 });
    W.addBed('cushion', 'study', b.p(3.2, 0.09, 2.95), 0.5);
    // scroll shelves, a bonsai, a long-necked instrument on its stand, a lantern
    shelves(b, 1.9, 4.4, 0, 0.45, 2.2, 4, C.barkD, (x, y, z, k, s, gap) => { if ((k + s) % 3 === 0) return; b.lying(x, y + 0.06 + (k % 2) * 0.11, z - 0.02, 0.3, 0.05, ['#f6f1e4', '#e8d2a8', '#c8553d', '#5a7a8a'][(k + s) % 4], 'z', { seg: 6 }); });
    b.block(4.7, 5.5, 0, 0.6, 0.15, 0.75, C.barkD); b.cyl(5.1, 0.6, 0.72, 0.45, 0.22, 0.17, '#5a7a8a', { seg: 8 }); b.cyl(5.1, 0.72, 1.05, 0.45, 0.04, 0.05, C.bark, { seg: 5 }); b.ball(5.02, 1.18, 0.45, 0.28, C.pine, { sy: 0.55, seg: 7 }); b.ball(5.28, 1.05, 0.5, 0.17, C.leaf, { sy: 0.55, seg: 6 });
    b.block(0.15, 0.6, 0, 0.3, 2.6, 4.2, C.barkD, { climb: false }); b.box(0.2, 0.55, 0.3, 0.42, 2.7, 4.1, '#b98a55', { r: 0.03, tex: TEX.wood }); for (let k = 0; k < 6; k++) b.box(0.3, 0.45, 0.42, 0.46, 2.85 + k * 0.2, 2.88 + k * 0.2, C.white);
    b.box(0.25, 0.5, 0.42, 0.44, 2.72, 4.08, '#e8d2a8');
    b.box(0.02, 0.05, 0.9, 2.2, 1.9, 2.5, '#f6f1e4'); for (let k = 0; k < 4; k++) b.box(0.05, 0.06, 1.9 - k * 0.28, 2.05 - k * 0.28, 2.1, 2.3, '#3d4450');
    win(b, 'R', 0.5, 1.6, 1.2, 2.3, C.barkD); sunbeam(b, 1.0, 2.0, 1.0, 1.6, 0.4);
    paperLamp(b, 4.6, 2.0, 0.55); lamp(b, 4.3, 0.9, 2.2, '#ffd08a', 9, 7);
    b.cyl(5.0, 0, 0.5, 3.8, 0.3, 0.26, '#5a7a8a', { seg: 9 }); for (let k = 0; k < 5; k++) b.beam([5.0 + (k - 2) * 0.07, 0.5, 3.8], [5.0 + (k - 2) * 0.16, 1.5 + (k % 2) * 0.2, 3.8 + (k % 3 - 1) * 0.1], 0.02, '#8fae4e', { seg: 4 }); b.solid(4.72, 5.28, 0, 0.5, 3.52, 4.08, { climb: false });
    for (let k = 0; k < 3; k++) b.box(1.2 + k * 0.03, 1.75 - k * 0.03, k * 0.07, k * 0.07 + 0.07, 3.6 + k * 0.02, 4.0 - k * 0.02, [C.navy, '#c8553d', '#e8d2a8'][k]);
    W.addItem('feather', 'study', b.p(2.0, 0, 3.3));
    b.finish();
  }
  {
    const h = hallway('koihall', {
      w: 4.4, floor: '#b08a5e', floor2: '#b99468', wall: '#efe6d0', light: LIGHT.paper, front: C.barkD, garden: '#5a7a8a', runner: ['#5a7a8a', '#cfca92'], trim: C.barkD, upstairs: false,
      doors: [{ to: 'tatami', mat: '#cfca92' }, { to: 'bathhouse', mat: '#7fa3c7' }, { to: 'study', mat: '#8a5a8a' }],
    });
    const b = h.b;
    shoji(b, 4.4, b.d, 3.2);
    // a step up from the stone entry, a shoe shelf, an umbrella pot, a branch in a tall vase
    b.box(0, 4.4, 0, 0.02, 0, 1.0, '#8f8a80');
    b.block(3.3, 4.2, 0, 0.5, 1.4, 3.0, C.barkD); for (const y of [0.05, 0.28]) for (let k = 0; k < 3; k++) b.box(3.25, 3.4, y, y + 0.1, 1.5 + k * 0.5, 1.75 + k * 0.5, [C.red, '#3d4450', '#c9a26b'][k], { r: 0.03 });
    b.cyl(3.7, 0.5, 0.95, 1.8, 0.1, 0.14, '#5a7a8a', { seg: 8 }); b.beam([3.7, 0.95, 1.8], [3.55, 1.7, 1.75], 0.015, C.barkD, { seg: 4 }); for (const [dx, y] of [[-0.1, 1.4], [-0.18, 1.65], [-0.02, 1.2]]) b.ball(3.7 + dx, y, 1.76, 0.07, C.pink, { seg: 5 });
    paperLamp(b, 3.8, 2.7, 0.9); lamp(b, 3.5, 1.3, 3.0, '#ffd08a', 9, 8);
    b.cyl(3.9, 0, 0.6, 5.2, 0.22, 0.18, '#3d4450', { seg: 9 }); for (const [dx, c] of [[-0.06, C.red], [0.07, C.navy]]) b.beam([3.9 + dx, 0.2, 5.2], [3.9 + dx * 2, 1.2, 5.25], 0.025, c, { seg: 5 }); b.solid(3.65, 4.15, 0, 0.6, 4.95, 5.45, { climb: false });
    b.box(3.4, 4.3, 0, 0.09, 6.4, 7.1, '#8a5a8a', { r: 0.04 });
    W.addBed('hall-cushion', 'koihall', b.p(3.85, 0.09, 6.75), 0.45);
    connect(h, 'koihall', W.houseDoor.koi);
    b.finish();
  }

  // =====================================================================================
  // NEXT DOOR, RIGHT: the brick farmhouse. Kitchen with a range, pantry, sun room.
  // =====================================================================================
  {
    const b = room('farmkitchen', { w: 7, d: 5.2, h: 3.2, floor: '#b9a890', wall: '#f2e6cc', wall2: '#e9d9b8', light: LIGHT.farm });
    for (let x = 0; x < 7; x += 1.0) for (let z = 0; z < 5.2; z += 0.75) b.box(x + 0.03 + (Math.round(z / 0.75) % 2) * 0.0, Math.min(7, x + 1.0) - 0.03, 0, 0.012, z + 0.03, Math.min(5.2, z + 0.75) - 0.03, (Math.round(x) * 2 + Math.round(z / 0.75) * 3) % 3 ? '#c2b29a' : '#ad9c84');
    skirt(b, 7, 5.2, C.cream);
    wayOut(b, 3.6, 4.8, { frame: C.cream, mat: C.red });
    // the range in its brick alcove, always warm, with a rag rug in front
    b.block(0.6, 3.0, 0, 2.6, 0, 0.3, C.brick, { climb: false }); b.block(0.6, 0.95, 0, 2.6, 0.3, 0.8, C.brick, { climb: false }); b.block(2.65, 3.0, 0, 2.6, 0.3, 0.8, C.brick, { climb: false }); b.box(0.6, 3.0, 2.0, 2.6, 0.3, 0.8, C.brick); b.box(0.5, 3.1, 1.9, 2.02, 0.2, 0.9, C.woodD);
    b.block(1.0, 2.6, 0, 0.92, 0.3, 0.95, '#e9dcc0'); b.box(0.98, 2.62, 0.92, 0.98, 0.28, 0.97, '#3d4450'); b.solid(0.98, 2.62, 0.92, 0.98, 0.28, 0.97);
    for (const x of [1.4, 2.2]) { b.cyl(x, 0.98, 1.04, 0.62, 0.26, 0.26, C.metal, { seg: 12 }); b.ball(x + 0.2, 1.07, 0.62, 0.04, C.dark, { seg: 5 }); }
    for (const [x0, x1] of [[1.08, 1.75], [1.85, 2.52]]) { b.box(x0, x1, 0.15, 0.8, 0.95, 0.98, '#dccfb2'); b.box(x0 + 0.1, x1 - 0.1, 0.68, 0.72, 0.98, 1.01, C.metal); }
    b.box(1.25, 1.6, 0.25, 0.5, 0.975, 0.985, '#ff9a4a', { layer: 'lit' });
    lamp(b, 1.5, 0.5, 1.6, '#ff9a4a', 9, 6);
    b.cyl(2.2, 1.04, 1.3, 0.62, 0.17, 0.17, '#b9703a', { seg: 9 }); b.beam([2.36, 1.24, 0.62], [2.62, 1.3, 0.7], 0.02, C.dark, { seg: 4 });
    for (let k = 0; k < 5; k++) { b.beam([0.9 + k * 0.42, 1.9, 0.5], [0.9 + k * 0.42, 1.62 - (k % 2) * 0.1, 0.5], 0.008, C.dark, { seg: 3 }); b.cyl(0.9 + k * 0.42, 1.36 - (k % 2) * 0.1, 1.62 - (k % 2) * 0.1, 0.5, 0.12 - (k % 3) * 0.02, 0.1 - (k % 3) * 0.02, k % 2 ? '#b9703a' : C.metal, { seg: 7 }); }
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) b.box(0.95 + i * 0.36, 1.27 + i * 0.36, 0, 0.03, 1.15 + j * 0.3, 1.42 + j * 0.3, [C.red, '#e8d2a8', C.navy, C.yellow, '#8fb0a0'][(i * 2 + j) % 5], { r: 0.01 });
    W.addBed('by-the-range', 'farmkitchen', b.p(1.8, 0.03, 1.55), 0.75);
    // the dresser with plates, the big table with benches, a basket of logs
    b.block(3.6, 5.6, 0, 0.95, 0, 0.6, C.wood); b.box(3.55, 5.65, 0.95, 1.0, 0, 0.65, C.woodL); b.solid(3.55, 5.65, 0.95, 1.0, 0, 0.65); b.box(3.6, 5.6, 1.0, 2.5, 0, 0.3, C.wood); b.box(3.55, 5.65, 2.5, 2.58, 0, 0.36, C.woodD);
    for (const y of [1.45, 1.95]) b.box(3.65, 5.55, y, y + 0.04, 0.02, 0.32, C.woodL);
    for (let k = 0; k < 5; k++) { b.cyl(3.85 + k * 0.38, 1.6, 1.64, 0.26, 0.15, 0.15, k % 2 ? C.white : '#7fa3c7', { seg: 10, rot: [1.35, 0, 0] }); b.cyl(3.85 + k * 0.38, 2.02, 2.2, 0.22, 0.07, 0.06, [C.white, '#7fa3c7', C.yellow][k % 3], { seg: 7 }); }
    for (let x = 3.7; x < 5.4; x += 0.64) { b.box(x, x + 0.58, 0.12, 0.85, 0.6, 0.625, C.woodL); b.ball(x + 0.48, 0.5, 0.64, 0.035, C.dark, { seg: 5 }); }
    b.cyl(4.2, 1.0, 1.06, 0.35, 0.22, 0.18, C.cream, { seg: 9 }); for (const [dx, c] of [[-0.08, C.red], [0.08, C.red], [0, '#a9c765']]) b.ball(4.2 + dx, 1.12, 0.35 + dx * 0.4, 0.08, c, { seg: 6 }); b.cyl(5.2, 1.0, 1.3, 0.3, 0.1, 0.12, '#7fa3c7', { seg: 8 });
    table(b, 3.0, 5.4, 2.4, 3.6, 0.78, C.woodL, C.wood);
    b.block(3.1, 5.3, 0, 0.42, 1.85, 2.2, C.wood); b.block(3.1, 5.3, 0, 0.42, 3.8, 4.15, C.wood);
    b.cyl(4.0, 0.78, 0.83, 3.0, 0.24, 0.24, '#c9a26b', { seg: 12 }); b.ball(4.0, 0.84, 3.0, 0.2, '#b9703a', { sy: 0.45, seg: 9 }); b.cyl(4.9, 0.78, 0.98, 2.8, 0.1, 0.08, C.white, { seg: 8 }); b.beam([5.0, 0.9, 2.8], [5.12, 0.93, 2.8], 0.02, C.white, { seg: 4 }); b.box(3.3, 3.7, 0.78, 0.8, 2.65, 2.95, '#e8d2a8');
    hangLamp(b, 4.2, 3.0, 3.2, '#ffc77a', '#b9703a');
    b.cyl(6.3, 0, 0.45, 1.6, 0.4, 0.34, '#b98a55', { seg: 10 }); for (const [dx, dz, r] of [[0, 0, 0], [0.16, 0.1, 0.5], [-0.14, 0.12, -0.4]]) b.lying(6.3 + dx, 0.5, 1.6 + dz, 0.6, 0.1, C.bark, 'z', { seg: 7 }); b.solid(5.92, 6.68, 0, 0.45, 1.22, 1.98, { climb: false });
    win(b, 'R', 5.9, 6.8, 1.3, 2.4); for (const x of [5.82, 6.9]) b.box(x - 0.1, x + 0.1, 1.1, 2.55, 0.05, 0.1, C.red);
    b.box(0, 0.04, 1.4, 2.0, 1.2, 2.6, C.woodD); for (let k = 0; k < 4; k++) b.box(0.04, 0.07, 1.48, 1.92, 1.3 + k * 0.32, 1.54 + k * 0.32, [C.white, '#7fa3c7', C.white, C.yellow][k]);
    b.box(0.3, 1.4, 0, 0.012, 4.6, 5.0, '#8fb0a0');
    W.addBowl('milk', 'farmkitchen', b.p(0.7, 0.012, 4.8)); W.addBowl('food', 'farmkitchen', b.p(1.2, 0.012, 4.8));
    W.addItem('cloth', 'farmkitchen', b.p(5.9, 0, 4.4));
    b.finish();
  }
  {
    const b = room('pantry', { w: 4.6, d: 4, h: 2.9, floor: '#a89a84', wall: '#e9e2d0', light: LIGHT.farm });
    for (let x = 0; x < 4.6; x += 0.77) for (let z = 0; z < 4; z += 0.8) b.box(x + 0.02, Math.min(4.6, x + 0.77) - 0.02, 0, 0.012, z + 0.02, Math.min(4, z + 0.8) - 0.02, (Math.round(x / 0.77) + Math.round(z / 0.8)) % 2 ? '#b3a58e' : '#9d8f7a');
    wayOut(b, 2.4, 3.6, { h: 2.1, frame: C.woodD });
    // shelves of jars on two walls
    const jar = (x, y, z, k, s) => { const c = ['#c8553d', '#e8c170', '#8fba58', '#b98a5a', '#df84a5', '#e9e2d0'][(k * 2 + s) % 6]; if ((k + s * 2) % 5 === 4) return; b.cyl(x, y, y + 0.2 + (k % 3) * 0.04, z, 0.065, 0.065, c, { seg: 7 }); b.cyl(x, y + 0.2 + (k % 3) * 0.04, y + 0.24 + (k % 3) * 0.04, z, 0.07, 0.07, k % 2 ? C.red : C.white, { seg: 7 }); };
    shelves(b, 0.5, 4.5, 0, 0.42, 2.4, 4, C.woodL, jar); shelves(b, 0, 0.42, 0.5, 2.1, 2.4, 4, C.woodL, jar);
    // sacks to sleep on, apples, a cheese, hanging onions, a milk churn
    for (const [x, z, r, c] of [[3.6, 1.2, 0.55, '#d9c9a3'], [4.1, 1.7, 0.5, '#cdbb93'], [3.3, 1.8, 0.5, '#d9c9a3']]) b.ball(x, r * 0.5, z, r, c, { sy: 0.62, seg: 8 });
    b.ball(3.75, 0.72, 1.5, 0.45, '#cdbb93', { sy: 0.5, seg: 8 }); b.solid(2.9, 4.4, 0, 0.42, 0.75, 2.2, { climb: false });
    W.addBed('flour-sacks', 'pantry', b.p(3.7, 0.42, 1.5), 0.85);
    b.block(1.0, 1.9, 0, 0.45, 0.6, 1.3, C.woodL); b.box(0.98, 1.92, 0.36, 0.47, 0.58, 1.32, C.wood); for (let k = 0; k < 7; k++) b.ball(1.15 + (k % 3) * 0.28, 0.53 + (k > 5 ? 0.12 : 0), 0.75 + Math.floor(k / 3) * 0.24, 0.12, k % 2 ? C.red : '#a9c765', { seg: 6 });
    b.block(2.9, 3.6, 0, 0.7, 2.9, 3.6, C.woodD); b.cyl(3.25, 0.7, 0.9, 3.25, 0.26, 0.26, C.yellow, { seg: 12 }); b.box(3.25, 3.53, 0.7, 0.91, 3.23, 3.5, C.woodD);
    for (let k = 0; k < 6; k++) { b.beam([0.7 + k * 0.55, 2.85, 0.75], [0.7 + k * 0.55, 2.5 - (k % 2) * 0.15, 0.75], 0.008, C.hay, { seg: 3 }); for (let j = 0; j < 3; j++) b.ball(0.7 + k * 0.55 + (j % 2) * 0.05, 2.42 - (k % 2) * 0.15 - j * 0.13, 0.75, 0.075, k % 3 === 0 ? '#e9e2d0' : k % 3 === 1 ? '#c9764f' : '#9b6bb3', { seg: 5 }); }
    b.beam([0.4, 2.85, 0.75], [4.4, 2.85, 0.75], 0.03, C.woodD, { seg: 5 });
    b.cyl(4.0, 0, 0.75, 3.3, 0.22, 0.26, C.metal, { seg: 10 }); b.cyl(4.0, 0.75, 0.95, 3.3, 0.14, 0.2, C.metal, { seg: 10 }); b.cyl(4.0, 0.95, 0.99, 3.3, 0.17, 0.17, '#6f7a83', { seg: 10 }); b.solid(3.74, 4.26, 0, 0.95, 3.04, 3.56, { climb: false });
    b.box(0.03, 0.08, 1.9, 2.5, 2.3, 2.36, C.dark); b.box(0.04, 0.3, 1.6, 1.95, 2.2, 2.46, '#ffd98a', { layer: 'lit' });
    lamp(b, 0.5, 1.8, 2.35, '#ffb860', 10, 7);
    b.cyl(2.7, 0, 0.3, 1.0, 0.2, 0.2, C.woodD, { seg: 9 }); b.cyl(2.7, 0.3, 0.33, 1.0, 0.21, 0.21, C.wood, { seg: 9 });
    W.addBowl('food', 'pantry', b.p(2.3, 0.012, 3.75));
    W.addItem('acorn', 'pantry', b.p(2.3, 0, 2.0));
    b.finish();
  }
  {
    const b = room('sunroom', { w: 6.4, d: 4.8, h: 0.7, floor: '#c9764f', wall: C.brickD, cap: C.white, light: LIGHT.glass });
    tiles(b, 6.4, 4.8, 0.6, '#d68a62');
    const glassL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.2, 4.8), W.skyMat); b.dyn(glassL, -0.02, 1.84, 2.4);
    const glassR = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.2, 0.04), W.skyMat); b.dyn(glassR, 3.2, 1.84, -0.02);
    for (let x = 0; x <= 6.4; x += 1.28) b.box(x - 0.04, x + 0.04, 0.7, 2.95, -0.05, 0.03, C.white);
    for (let z = 0; z <= 4.8; z += 1.2) if (z < 3.2 || z > 4.6) b.box(-0.05, 0.03, 0.7, 2.95, z - 0.04, z + 0.04, C.white);
    W.regions.sunroom.size.h = 3;
    b.box(0, 6.4, 2.9, 2.98, -0.06, 0.03, C.white); b.box(-0.06, 0.03, 2.9, 2.98, 0, 4.8, C.white); b.box(0, 6.4, 1.8, 1.85, -0.05, 0.03, C.white); b.box(-0.05, 0.03, 1.8, 1.85, 0, 4.8, C.white);
    b.solid(-0.35, 0, 0.7, 3.0, -0.35, 4.8, { climb: false }); b.solid(0, 6.4, 0.7, 3.0, -0.35, 0, { climb: false });
    W.roomDoor.sunroom = doorway(b, 'L', 3.3, 4.5, { h: 2.1, frame: C.white }); b.box(0, 0.03, 0.7, 2.1, 3.3, 4.5, DARK);
    sunbeam(b, 3.4, 2.6, 4.0, 2.4, 0.3);
    // a wicker chair in the sun, a swing seat of cushions, a lemon tree, pots everywhere
    b.block(3.9, 5.1, 0, 0.42, 0.5, 1.5, '#c9a26b'); b.block(3.9, 5.1, 0.42, 1.2, 0.5, 0.7, '#b98a55'); b.block(3.9, 4.08, 0.42, 0.75, 0.7, 1.5, '#b98a55'); b.block(4.92, 5.1, 0.42, 0.75, 0.7, 1.5, '#b98a55');
    b.box(4.1, 4.9, 0.42, 0.52, 0.72, 1.46, '#f2e6cc', { r: 0.04 }); b.ball(4.3, 0.68, 0.85, 0.2, '#e8c170', { sy: 0.7, seg: 7 });
    W.addBed('wicker-chair', 'sunroom', b.p(4.5, 0.52, 1.1), 0.5);
    b.cyl(1.3, 0, 0.6, 1.2, 0.42, 0.34, C.terracotta, { seg: 10 }); b.cyl(1.3, 0.6, 1.5, 1.2, 0.05, 0.07, C.bark, { seg: 6 }); b.ball(1.3, 1.95, 1.2, 0.7, C.leaf, { sy: 0.85, layer: 'sway', sway: 0.15, seg: 9 }); b.ball(1.65, 2.15, 1.35, 0.4, C.leafL, { layer: 'sway', sway: 0.15, seg: 7 });
    for (const [dx, y, dz] of [[0.4, 1.7, 0.3], [-0.3, 1.85, 0.4], [0.1, 1.55, 0.55], [0.55, 2.1, 0.2], [-0.5, 1.6, 0.1]]) b.ball(1.3 + dx, y, 1.2 + dz, 0.09, '#f2d24a', { sy: 1.2, seg: 6 });
    b.solid(0.9, 1.7, 0, 0.6, 0.8, 1.6, { climb: false });
    for (const [x, z, s, l] of [[2.6, 0.5, 0.9, C.leafL], [5.8, 0.6, 1.1, '#5d9a48'], [5.9, 2.4, 0.8, C.leaf], [0.5, 2.5, 0.7, '#7fb558'], [2.5, 4.3, 0.75, C.leafL]]) plant(b, x, z, s, l);
    for (const [x, z] of [[2.2, 0.25], [3.4, 0.25], [5.4, 0.25]]) { b.beam([x, 2.9, z], [x, 2.4, z], 0.008, C.dark, { seg: 3 }); b.cyl(x, 2.2, 2.4, z, 0.2, 0.13, C.terracotta, { seg: 7 }); for (let k = 0; k < 6; k++) b.ball(x + Math.cos(k * 1.1) * 0.2, 2.25 - (k % 3) * 0.18, z + Math.abs(Math.sin(k * 1.1)) * 0.22, 0.13, k % 2 ? C.leaf : C.leafL, { seg: 5, layer: 'sway', sway: 0.5 }); b.ball(x + 0.12, 2.45, z + 0.15, 0.07, [C.pink, C.purple, C.red][Math.round(x) % 3], { seg: 5 }); }
    table(b, 2.6, 3.5, 2.3, 3.1, 0.6, C.white, C.white); b.cyl(3.05, 0.6, 0.78, 2.7, 0.09, 0.07, '#7fa3c7', { seg: 7 }); b.ball(3.05, 0.9, 2.7, 0.14, C.pink, { seg: 6 }); b.box(2.7, 3.0, 0.6, 0.63, 2.4, 2.65, C.navy);
    roundRug(b, 3.9, 3.0, 1.6, 1.1, '#8fb0a0', '#f2e6cc');
    b.cyl(5.4, 0, 0.38, 3.9, 0.22, 0.19, '#6d9a8a', { seg: 8 }); b.beam([5.58, 0.3, 3.9], [5.95, 0.48, 3.9], 0.04, '#6d9a8a');
    for (const [x, z, c] of [[1.6, 3.6, '#e8c170'], [1.2, 4.1, '#df84a5']]) b.box(x - 0.36, x + 0.36, 0, 0.1, z - 0.36, z + 0.36, c, { r: 0.05 });
    W.addBed('sun-cushions', 'sunroom', b.p(1.4, 0.1, 3.85), 0.6);
    W.addItem('flower', 'sunroom', b.p(3.6, 0, 4.0));
    b.finish();
  }
  {
    const h = hallway('farmhall', {
      floor: '#b08a5e', floor2: '#a88052', wall: '#f2e6cc', wall2: '#e9d9b8', light: LIGHT.farm, front: '#5f8a5a', garden: '#5f8a5a', runner: ['#9a523c', '#e8d2a8'], trim: C.cream, carpet: '#9a523c',
      doors: [{ to: 'farmkitchen', mat: C.red }, { to: 'pantry', mat: '#c9a26b' }, { to: 'sunroom', mat: '#8fba58' }],
    });
    const b = h.b;
    dado(b, 5, b.d, '#cfd9b8', C.cream);
    hooks(b, b.between(0) - 0.5, ['#5f8a5a', '#c9a26b', '#3d4450']);
    for (const [dz, c] of [[0, '#5f8a5a'], [0.45, '#3d4450']]) for (const dd of [0, 0.19]) { b.box(0.15, 0.4, 0, 0.45, b.between(0) - 0.45 + dz + dd, b.between(0) - 0.3 + dz + dd, c, { r: 0.04 }); b.box(0.15, 0.55, 0, 0.14, b.between(0) - 0.45 + dz + dd, b.between(0) - 0.3 + dz + dd, c, { r: 0.04 }); }
    // a grandfather clock, a settle to sleep on, a basket of eggs on a table
    b.block(0.08, 0.6, 0, 2.3, b.between(1) - 0.3, b.between(1) + 0.3, C.woodD); b.cyl(0.62, 1.7, 1.74, b.between(1), 0.2, 0.2, C.cream, { seg: 12, rot: [0, 0, 1.57] }); b.box(0.6, 0.63, 0.4, 1.3, b.between(1) - 0.16, b.between(1) + 0.16, '#3d2c22'); b.cyl(0.64, 0.5, 0.54, b.between(1), 0.1, 0.1, C.yellow, { seg: 9, rot: [0, 0, 1.57] }); b.box(0.63, 0.65, 0.54, 1.2, b.between(1) - 0.012, b.between(1) + 0.012, C.yellow);
    b.block(2.9, 3.6, 0, 0.75, 0.12, 0.6, C.wood); b.cyl(3.25, 0.75, 0.9, 0.36, 0.2, 0.15, '#c9a26b', { seg: 9 }); for (const [dx, dz] of [[0, 0], [0.09, 0.06], [-0.08, 0.05], [0.02, -0.08]]) b.ball(3.25 + dx, 0.92, 0.36 + dz, 0.07, '#f2e6cc', { sy: 1.2, seg: 6 });
    hangLamp(b, 2.1, 3.6, 3.2, '#ffc77a', '#e9d9b8');
    plant(b, 3.2, 5.7, 0.75);
    connect(h, 'farmhall', W.houseDoor.farm);
    b.finish();
  }

  // =====================================================================================
  // FAR RIGHT: the old stone house. Library, music room, painter's studio, the four-poster.
  // =====================================================================================
  const webs = (b, pts) => { for (const [x, y, z, sx, sz] of pts) { b.beam([x, y, z], [x + sx * 0.5, y - 0.5, z], 0.006, '#e9e6dc', { seg: 3 }); b.beam([x, y, z], [x, y - 0.5, z + sz * 0.5], 0.006, '#e9e6dc', { seg: 3 }); b.beam([x + sx * 0.35, y - 0.35, z], [x, y - 0.35, z + sz * 0.35], 0.005, '#e9e6dc', { seg: 3 }); } };
  {
    const b = room('library', { w: 6.6, d: 5, h: 3.4, floor: '#7a5a44', wall: '#6f8f7a', wall2: '#628270', light: LIGHT.old });
    planksFloor(b, 6.6, 5, '#7a5a44', '#84634b', 0.5); skirt(b, 6.6, 5, C.woodD);
    wayOut(b, 3.5, 4.7, { frame: C.woodD, mat: '#8a5a5a' });
    // books to the ceiling on two walls, and a ladder up to a shelf where a cat fits
    shelves(b, 0.4, 4.2, 0, 0.5, 3.0, 5, C.woodD); shelves(b, 0, 0.5, 0.55, 3.1, 3.0, 5, C.woodD);
    b.box(0.35, 4.25, 3.0, 3.1, 0, 0.56, C.barkD); b.box(0, 0.56, 3.0, 3.1, 0.5, 3.15, C.barkD);
    b.block(4.2, 5.4, 0, 2.1, 0, 0.5, C.woodD); b.box(4.25, 5.35, 0.1, 0.14, 0.04, 0.52, C.wood); b.box(4.25, 5.35, 1.0, 1.04, 0.04, 0.52, C.wood); for (let k = 0; k < 7; k++) { b.box(4.3 + k * 0.14, 4.42 + k * 0.14, 0.14, 0.6 + (k % 3) * 0.06, 0.26, 0.51, BOOKS[k % 8]); b.box(4.3 + k * 0.14, 4.42 + k * 0.14, 1.04, 1.5 + (k % 2) * 0.08, 0.26, 0.51, BOOKS[(k + 3) % 8]); }
    b.box(4.3, 5.3, 2.1, 2.2, 0.05, 0.45, '#8a5a5a', { r: 0.04 });
    W.addBed('top-shelf', 'library', b.p(4.8, 2.2, 0.26), 0.45);
    b.block(5.4, 5.75, 0, 2.1, 0.5, 0.75, C.wood); for (let k = 0; k < 6; k++) b.box(5.4, 5.78, 0.28 + k * 0.33, 0.34 + k * 0.33, 0.5, 0.75, C.woodL);
    // a wing chair and a reading lamp, a pile of books to climb, a globe
    armchair(b, 'wing-chair', 2.0, 2.2, '#8a5a5a'); b.ball(2.0, 0.75, 1.95, 0.2, '#e8c170', { sy: 0.7, seg: 7 });
    floorLamp(b, 1.2, 1.3);
    roundRug(b, 3.3, 2.9, 2.0, 1.4, '#8a5a5a', '#cdbb93');
    for (let k = 0; k < 4; k++) b.block(3.9 - k * 0.03, 4.6 - k * 0.05, k * 0.11, k * 0.11 + 0.11, 1.3 + k * 0.03, 1.85 - k * 0.02, BOOKS[(k * 3) % 8], { climb: false });
    for (let k = 0; k < 2; k++) b.box(5.0, 5.55, k * 0.1, k * 0.1 + 0.1, 3.9 + k * 0.05, 4.3, BOOKS[k + 4]);
    b.box(3.1, 3.5, 0.045, 0.09, 3.2, 3.75, C.cream, { rot: [0, 0.4, 0] }); b.box(3.12, 3.3, 0.09, 0.095, 3.3, 3.65, '#f6f1e4', { rot: [0, 0.4, 0] });
    table(b, 5.2, 6.2, 2.0, 2.9, 0.7, C.woodD, C.barkD); b.cyl(5.7, 0.7, 0.78, 2.45, 0.14, 0.17, C.woodD, { seg: 8 }); b.ball(5.7, 1.05, 2.45, 0.27, '#6f9aa8', { seg: 10 }); b.ball(5.78, 1.12, 2.62, 0.13, '#b9a26b', { sx: 1.3, sz: 0.4, seg: 6 }); b.ball(5.55, 0.98, 2.64, 0.1, '#8fa86a', { sz: 0.4, seg: 6 });
    win(b, 'R', 5.6, 6.4, 1.4, 2.8, C.woodD); sunbeam(b, 5.9, 2.2, 0.8, 1.9, 0.45);
    webs(b, [[6.5, 3.35, 0.1, -1, 1], [0.6, 3.35, 4.9, 1, -1]]);
    lamp(b, 3.4, 2.4, 3.0, '#ffd9a0', 5, 8);
    W.addItem('wool', 'library', b.p(2.9, 0, 3.9));
    b.finish();
  }
  {
    const b = room('musicroom', { w: 6.2, d: 4.8, h: 3.4, floor: '#8a6a4e', wall: '#b9a7c4', wall2: '#ad9bb8', light: LIGHT.old });
    planksFloor(b, 6.2, 4.8, '#8a6a4e', '#946f52', 0.48); skirt(b, 6.2, 4.8, C.cream);
    wayOut(b, 0.4, 1.6, { frame: C.cream, mat: '#9b6bb3' });
    // the piano: hop on the stool, then walk along the keys
    const kx0 = 2.2, KEYS = 12, kw = 0.16, ky = 0.78;
    b.block(2.0, 4.3, 0, 1.45, 0, 0.6, '#2a2228'); b.box(1.95, 4.35, 1.45, 1.52, 0, 0.66, '#3a3038'); b.solid(1.95, 4.35, 1.45, 1.52, 0, 0.66);
    b.block(2.0, 4.3, 0, 0.7, 0.6, 1.0, '#2a2228', { climb: false }); b.box(kx0, kx0 + KEYS * kw, 0.7, ky, 0.62, 1.02, '#f6f1e4'); b.solid(2.0, 4.3, 0.7, ky, 0.6, 1.02, { climb: false });
    for (let k = 1; k < KEYS; k++) b.box(kx0 + k * kw - 0.004, kx0 + k * kw + 0.004, ky - 0.002, ky + 0.002, 0.62, 1.02, '#b9b3a4');
    for (let k = 0; k < KEYS - 1; k++) if (![2, 6, 9].includes(k % 12)) b.box(kx0 + (k + 1) * kw - 0.045, kx0 + (k + 1) * kw + 0.045, ky, ky + 0.035, 0.62, 0.86, '#2a2228');
    b.box(2.6, 3.7, 1.0, 1.4, 0.6, 0.63, '#3a3038', { rot: [-0.2, 0, 0] }); b.box(2.85, 3.45, 1.02, 1.36, 0.63, 0.65, '#f6f1e4', { rot: [-0.2, 0, 0] });
    b.block(2.7, 3.6, 0, 0.45, 1.3, 1.75, '#2a2228'); b.box(2.72, 3.58, 0.45, 0.52, 1.32, 1.73, '#8a5a8a', { r: 0.03 });
    W.piano = { region: 'musicroom', x0: b.ox + kx0, w: kw, n: KEYS, y: ky, z0: b.oz + 0.6, z1: b.oz + 1.02 };
    b.cyl(2.5, 1.52, 1.9, 0.3, 0.012, 0.012, C.yellow, { seg: 4 }); for (const dx of [-0.12, 0, 0.12]) { b.cyl(2.5 + dx, 1.9, 2.05, 0.3, 0.02, 0.02, C.cream, { seg: 5 }); b.ball(2.5 + dx, 2.09, 0.3, 0.025, '#ffd98a', { seg: 4, layer: 'lit' }); }
    b.box(2.38, 2.62, 1.88, 1.91, 0.29, 0.31, C.yellow); lamp(b, 2.5, 2.0, 0.7, '#ffc98a', 7, 6);
    b.box(3.5, 4.1, 1.52, 1.56, 0.1, 0.5, '#e8d2a8'); b.cyl(3.8, 1.56, 1.9, 0.3, 0.05, 0.11, C.woodD, { seg: 4 });
    // a cello, a music stand, a wind-up gramophone, a harp of sorts
    b.ball(5.3, 0.65, 0.5, 0.36, '#9a5a3a', { sx: 0.9, sy: 1.25, sz: 0.4, seg: 10, rot: [-0.12, 0, 0] }); b.ball(5.3, 1.18, 0.42, 0.25, '#9a5a3a', { sx: 0.9, sy: 1.0, sz: 0.4, seg: 9, rot: [-0.12, 0, 0] }); b.beam([5.3, 1.3, 0.42], [5.3, 2.05, 0.3], 0.03, '#3a2a20', { seg: 5 }); b.ball(5.3, 2.1, 0.3, 0.06, '#3a2a20', { seg: 5 }); b.beam([5.3, 0.1, 0.56], [5.3, 0.3, 0.55], 0.012, C.metal, { seg: 4 }); b.solid(5.0, 5.6, 0, 1.3, 0.25, 0.7, { climb: false });
    b.beam([4.6, 0, 2.2], [4.6, 1.15, 2.2], 0.02, C.dark, { seg: 5 }); for (const a of [0, 2.1, 4.2]) b.beam([4.6, 0.25, 2.2], [4.6 + Math.cos(a) * 0.25, 0, 2.2 + Math.sin(a) * 0.25], 0.015, C.dark, { seg: 4 }); b.box(4.3, 4.9, 1.1, 1.5, 2.17, 2.2, C.dark, { rot: [-0.3, 0, 0] }); b.box(4.36, 4.84, 1.14, 1.46, 2.2, 2.215, '#f6f1e4', { rot: [-0.3, 0, 0] });
    b.block(0.2, 1.0, 0, 0.8, 2.3, 3.1, C.woodD); b.box(0.3, 0.9, 0.8, 0.95, 2.4, 3.0, C.wood); b.cyl(0.6, 0.95, 0.97, 2.7, 0.24, 0.24, '#2a2228', { seg: 12 }); b.cyl(0.6, 0.97, 0.98, 2.7, 0.08, 0.08, C.red, { seg: 8 }); b.cone(0.75, 1.0, 1.7, 2.45, 0.34, C.yellow, { seg: 9 }); b.beam([0.75, 1.0, 2.45], [0.7, 1.0, 2.6], 0.02, C.yellow, { seg: 4 });
    for (let k = 0; k < 4; k++) b.box(0.25, 0.95, 0.12 + k * 0.03, 0.15 + k * 0.03, 2.4, 3.0, k % 2 ? '#2a2228' : C.red);
    roundRug(b, 3.3, 3.2, 1.7, 1.1, '#9b6bb3', '#e8d2a8');
    armchair(b, 'velvet-chair', 5.3, 3.7, '#9b6bb3', { r: 0.5 });
    win(b, 'R', 0.5, 1.6, 1.3, 2.8, C.cream); sunbeam(b, 1.0, 2.0, 1.0, 1.8, 0.45); for (const x of [0.4, 1.7]) b.box(x - 0.14, x + 0.14, 1.0, 2.95, 0.05, 0.1, '#7a5a8a');
    for (const [z, y] of [[1.9, 1.9], [3.5, 1.8]]) pic(b, 'L', z, y, 0.6, 0.75, '#3a3038', C.yellow);
    webs(b, [[6.1, 3.35, 0.1, -1, 1]]);
    lamp(b, 3.3, 2.5, 3.0, '#ffd9a0', 5, 8);
    W.addItem('ribbon', 'musicroom', b.p(4.2, 0, 3.6));
    b.finish();
  }
  {
    const b = room('studio', { w: 6.2, d: 4.8, h: 3.4, floor: '#b9a890', wall: '#e9e6dc', wall2: '#dfdbd0', light: LIGHT.bright });
    planksFloor(b, 6.2, 4.8, '#b9a890', '#c2b29a', 0.6);
    wayOut(b, 3.2, 4.4, { frame: C.woodL, mat: '#e9e6dc' });
    // a big north window, an easel with a half-finished cat, canvases against the wall
    win(b, 'R', 1.2, 4.2, 1.0, 3.0, C.white); b.box(2.67, 2.73, 1.0, 3.0, 0.04, 0.08, C.white); sunbeam(b, 2.6, 2.3, 2.8, 2.2, 0.35);
    for (const [x0, x1, z] of [[4.3, 4.36, 2.0], [5.1, 5.16, 2.0]]) b.beam([(x0 + x1) / 2, 0, z], [(x0 + x1) / 2 - 0.02, 1.95, z - 0.4], 0.03, C.woodL, { seg: 5 }); b.beam([4.73, 0, 1.2], [4.73, 1.95, 1.6], 0.03, C.woodL, { seg: 5 }); b.box(4.2, 5.25, 0.7, 0.76, 1.8, 1.95, C.woodL);
    b.box(4.25, 5.2, 0.76, 1.8, 1.74, 1.78, '#f6f1e4', { rot: [-0.2, 0, 0] }); b.ball(4.72, 1.2, 1.82, 0.26, C.orange, { sz: 0.08, seg: 9, rot: [-0.2, 0, 0] }); b.ball(4.72, 1.5, 1.76, 0.17, C.orange, { sz: 0.08, seg: 8, rot: [-0.2, 0, 0] }); for (const dx of [-0.11, 0.11]) b.cone(4.72 + dx, 1.6, 1.74, 1.75, 0.07, C.orange, { seg: 4 });
    b.solid(4.2, 5.25, 0, 0.76, 1.55, 2.05, { climb: false });
    for (const [z, hgt, c] of [[0.6, 1.2, '#7fa3c7'], [0.75, 0.9, '#e8c170'], [0.9, 1.0, '#df84a5']]) b.box(0.05, 0.1, 0, hgt, z, z + hgt * 0.8, c, { rot: [0, 0, -0.12] });
    // a dust sheet with three puddles of paint to walk through
    b.box(1.4, 4.0, 0, 0.012, 2.4, 4.4, '#f6f1e4', { r: 0.01 });
    const puddles = [[2.0, 3.0, '#e8643c'], [3.0, 3.8, '#4f8fd9'], [3.5, 2.8, '#f2d24a']];
    for (const [x, z, c] of puddles) { b.disc(x, 0.016, z, 0.3, c, { seg: 12, sx: 1.15 }); b.disc(x + 0.3, 0.016, z + 0.2, 0.09, c, { seg: 7 }); b.cyl(x - 0.42, 0.012, 0.22, z - 0.2, 0.11, 0.1, C.metal, { seg: 8 }); b.cyl(x - 0.42, 0.2, 0.225, z - 0.2, 0.095, 0.095, c, { seg: 8 }); }
    W.paint = { region: 'studio', puddles: puddles.map(([x, z, c]) => ({ x: b.ox + x, z: b.oz + z, c })), group: b.group };
    // a table of pots and brushes, a stool, a plaster head, a sofa covered in a sheet
    table(b, 0.3, 1.2, 1.8, 3.0, 0.8, C.woodL, C.wood); for (let k = 0; k < 5; k++) b.cyl(0.55 + (k % 2) * 0.35, 0.8, 0.95, 1.95 + k * 0.2, 0.06, 0.06, ['#e8643c', '#4f8fd9', '#f2d24a', '#8fba58', C.white][k], { seg: 7 });
    b.cyl(0.75, 0.8, 0.98, 2.85, 0.09, 0.08, C.metal, { seg: 7 }); for (const [dx, c] of [[-0.04, C.red], [0.03, C.blue], [0, C.yellow]]) b.beam([0.75 + dx, 0.95, 2.85], [0.75 + dx * 3, 1.3, 2.85 + dx], 0.012, c, { seg: 4 });
    b.cyl(1.7, 0, 0.5, 1.5, 0.2, 0.22, C.woodL, { seg: 9 }); b.cyl(1.7, 0.5, 0.55, 1.5, 0.24, 0.24, C.wood, { seg: 9 }); b.solid(1.48, 1.92, 0, 0.55, 1.28, 1.72);
    b.block(5.3, 5.9, 0, 1.0, 0.1, 0.6, C.woodD); b.ball(5.6, 1.3, 0.35, 0.24, '#f6f1e4', { sy: 1.25, seg: 9 }); b.cyl(5.6, 1.0, 1.1, 0.35, 0.12, 0.18, '#f6f1e4', { seg: 8 });
    b.block(4.4, 6.0, 0, 0.5, 3.4, 4.5, '#e9e6dc'); b.block(5.7, 6.0, 0.5, 1.05, 3.4, 4.5, '#dfdbd0', { climb: false }); b.ball(4.9, 0.55, 3.95, 0.5, '#f6f1e4', { sy: 0.2, sx: 1.3, seg: 8 });
    W.addBed('dust-sheet-sofa', 'studio', b.p(5.0, 0.5, 3.95), 0.7);
    for (const [x, y, c] of [[4.6, 2.0, '#8fb0a0'], [5.3, 1.9, '#e8c170'], [0.3, 2.2, '#d98a8a']]) pic(b, 'R', x, y, 0.55, 0.7, c, C.woodL);
    lamp(b, 3.0, 2.6, 3.0, '#fff8e6', 6, 9);
    W.addItem('feather', 'studio', b.p(2.5, 0, 1.6));
    b.finish();
  }
  {
    const b = room('oldbed', { w: 6.2, d: 5, h: 3.4, floor: '#7a5a44', wall: '#a9b8c4', wall2: '#9dacb8', light: LIGHT.old });
    planksFloor(b, 6.2, 5, '#7a5a44', '#84634b', 0.5); skirt(b, 6.2, 5, C.woodD);
    W.roomDoor.oldbed = doorway(b, 'L', 0.5, 1.7, { frame: C.woodD, mat: '#6f8fa3' });
    // the four-poster, with its curtains tied back
    bed(b, 'four-poster', 0, 2.7, 2.3, 4.6, { cover: '#6f8fa3', frame: C.barkD, sheet: '#f2ead8' });
    for (const [x, z] of [[0.05, 2.3], [2.56, 2.3], [0.05, 4.46], [2.56, 4.46]]) b.box(x, x + 0.14, 0, 2.7, z, z + 0.14, C.barkD);
    b.box(0, 2.75, 2.62, 2.74, 2.26, 2.42, C.barkD); b.box(0, 0.16, 2.62, 2.74, 2.26, 4.64, C.barkD); b.box(2.54, 2.72, 2.62, 2.74, 2.26, 4.64, C.barkD);
    for (const z of [2.36, 4.5]) b.box(0.1, 0.5, 0.7, 2.62, z, z + 0.06, '#8a5a5a', { layer: 'sway' }); b.box(0.2, 2.6, 2.3, 2.62, 2.32, 2.36, '#8a5a5a', { layer: 'sway' });
    b.ball(1.9, 0.72, 3.0, 0.22, '#e8d2a8', { sy: 0.6, seg: 7 });
    // a trunk at the foot, a rocking chair, a wash stand, a candle
    b.block(2.9, 3.6, 0, 0.5, 2.7, 4.2, '#6a4a3a'); b.box(2.86, 3.64, 0.5, 0.6, 2.66, 4.24, '#5a3f2f', { r: 0.04 }); b.solid(2.86, 3.64, 0.5, 0.6, 2.66, 4.24); for (const z of [3.0, 3.9]) b.box(2.85, 3.65, 0, 0.61, z, z + 0.08, C.metal); b.box(3.6, 3.66, 0.3, 0.42, 3.38, 3.52, C.yellow);
    W.addBed('trunk', 'oldbed', b.p(3.25, 0.6, 3.45), 0.45);
    b.block(4.6, 5.4, 0.2, 0.45, 1.5, 2.3, C.wood); b.box(4.6, 5.4, 0.45, 1.3, 1.5, 1.6, C.wood); for (const z of [1.5, 2.22]) { b.geo(new THREE.TorusGeometry(0.6, 0.03, 4, 12, 1.4).rotateZ(-Math.PI / 2 - 0.7).toNonIndexed(), C.woodD, b.mat(5.0, 0.62, z + 0.04, 1, 1, 1)); }
    b.box(4.65, 5.35, 0.45, 0.52, 1.6, 2.26, '#8a5a5a', { r: 0.03 });
    W.addBed('rocking-chair', 'oldbed', b.p(5.0, 0.52, 1.95), 0.42);
    b.block(3.0, 4.0, 0, 0.85, 0, 0.55, C.woodD); b.box(2.95, 4.05, 0.85, 0.9, 0, 0.6, '#e9e6dc'); b.cyl(3.5, 0.9, 1.02, 0.3, 0.28, 0.2, C.white, { seg: 10 }); b.cyl(3.5, 0.98, 1.025, 0.3, 0.24, 0.24, '#7fa3c7', { seg: 10 }); b.cyl(3.9, 0.9, 1.2, 0.25, 0.09, 0.1, C.white, { seg: 8 }); b.box(3.0, 4.0, 1.2, 2.0, 0, 0.04, C.woodD); b.box(3.08, 3.92, 1.28, 1.92, 0.03, 0.055, '#cfe3ea'); b.solid(2.95, 4.05, 0.85, 0.9, 0, 0.6);
    b.block(0.1, 0.7, 0, 0.6, 1.8, 2.25, C.barkD); b.cyl(0.4, 0.6, 0.63, 2.02, 0.12, 0.12, C.metal, { seg: 8 }); b.cyl(0.4, 0.63, 0.85, 2.02, 0.035, 0.035, C.cream, { seg: 6 }); b.cone(0.4, 0.85, 0.97, 2.02, 0.035, '#ffd98a', { seg: 5, layer: 'lit' });
    const candle = lamp(b, 0.6, 1.0, 2.2, '#ffb060', 7, 6);
    W.updaters.push((dt, t) => { if (W.region === 'oldbed') candle.intensity = 3.5 * (0.88 + Math.sin(t * 9) * 0.07 + Math.sin(t * 21) * 0.05); });
    win(b, 'R', 4.6, 5.9, 1.3, 2.8, C.woodD); sunbeam(b, 5.0, 2.6, 1.2, 2.0, 0.45); for (const x of [4.5, 6.0]) b.box(x - 0.14, x + 0.14, 1.0, 2.95, 0.05, 0.1, '#6f8fa3');
    rug(b, 3.2, 5.6, 2.9, 4.4, '#6f8fa3', '#cdbb93');
    for (const [z, y] of [[2.6, 1.8], [3.6, 1.8]]) b.ball(0.05, y + 0.4, z + 0.3, 0.26, '#3a3038', { sx: 0.12, sy: 1.25, seg: 9 });
    for (const [z, y] of [[2.6, 1.8], [3.6, 1.8]]) b.ball(0.07, y + 0.4, z + 0.3, 0.2, ['#cdbb93', '#b9a7c4'][Math.round(z) % 2], { sx: 0.1, sy: 1.25, seg: 9 });
    webs(b, [[6.1, 3.35, 0.1, -1, 1], [0.1, 3.35, 0.1, 1, 1]]);
    lamp(b, 3.6, 2.5, 3.2, '#ffd9a0', 4, 8);
    W.addItem('pinecone', 'oldbed', b.p(4.4, 0, 4.4));
    b.finish();
  }
  {
    const h = hallway('oldhall', {
      floor: '#7a5a44', floor2: '#84634b', wall: '#b9c0ae', wall2: '#adb4a2', light: LIGHT.old, front: '#7a6a5a', garden: '#7a6a5a', runner: ['#6a4a5a', '#cdbb93'], trim: C.woodD, carpet: '#6a4a5a',
      doors: [{ to: 'library', mat: '#8a5a5a' }, { to: 'musicroom', mat: '#9b6bb3' }, { to: 'studio', mat: '#e9e6dc' }, { to: 'oldbed', side: 'B', mat: '#6f8fa3' }],
    });
    const b = h.b;
    dado(b, 5, b.d, '#8a7a6a', C.woodD);
    // portraits of cats, a coat stand, a suit of... a very tall plant, an umbrella stand
    for (const [i, c] of [[0, C.orange], [1, '#3a3038'], [2, '#cdbb93']]) { if (i > 1) break; pic(b, 'L', b.between(i) - 0.32, 1.6, 0.64, 0.8, '#5a6a5a', C.yellow); b.ball(0.06, 1.9, b.between(i), 0.17, c, { sx: 0.12, sy: 1.1, seg: 8 }); for (const dz of [-0.09, 0.09]) b.ball(0.06, 2.1, b.between(i) + dz, 0.05, c, { sx: 0.12, seg: 4 }); }
    b.cyl(3.3, 0, 0.06, 5.8, 0.26, 0.28, C.barkD, { seg: 9 }); b.cyl(3.3, 0.06, 1.8, 5.8, 0.03, 0.03, C.barkD, { seg: 6 }); for (const a of [0, 1.6, 3.1, 4.7]) b.beam([3.3, 1.7, 5.8], [3.3 + Math.cos(a) * 0.22, 1.85, 5.8 + Math.sin(a) * 0.22], 0.015, C.barkD, { seg: 4 }); b.box(3.36, 3.52, 0.9, 1.75, 5.68, 5.94, '#5a6a5a', { r: 0.05 }); b.solid(3.1, 3.5, 0, 0.5, 5.6, 6.0, { climb: false });
    b.block(3.0, 3.6, 0, 0.75, 7.2, 7.65, C.barkD); b.cyl(3.3, 0.75, 0.78, 7.42, 0.14, 0.14, C.metal, { seg: 8 }); for (const dx of [-0.06, 0.06]) { b.cyl(3.3 + dx, 0.78, 1.0, 7.42, 0.02, 0.02, C.cream, { seg: 5 }); b.cone(3.3 + dx, 1.0, 1.1, 7.42, 0.03, '#ffd98a', { seg: 5, layer: 'lit' }); }
    lamp(b, 3.0, 1.3, 7.0, '#ffb060', 7, 6);
    webs(b, [[4.9, 3.15, 0.1, -1, 1], [0.1, 3.15, b.d - 0.1, 1, -1]]);
    hangLamp(b, 2.1, 3.8, 3.2, '#ffd9a0', '#cdbb93', 6);
    connect(h, 'oldhall', W.houseDoor.old);
    b.finish();
  }

  // ---- the piano: each key a cat steps onto sounds its note ----
  {
    const p = W.piano;
    W.updaters.push((dt, t, cats) => {
      if (W.region !== p.region) return;
      for (const c of cats) {
        const on = c.state === 'free' && c.grounded && Math.abs(c.pos.y - p.y) < 0.08 && c.pos.z > p.z0 - 0.1 && c.pos.z < p.z1 + 0.15;
        const key = on ? Math.max(0, Math.min(p.n - 1, Math.floor((c.pos.x - p.x0) / p.w))) : -1;
        if (key >= 0 && key !== c.pianoKey) W.emit('piano', c.pos, key, c);
        c.pianoKey = key;
      }
    });
  }
  // ---- the studio: walk through a puddle and leave paw prints of that colour for a while ----
  {
    const p = W.paint, N = 72, prints = [], geo = new THREE.CircleGeometry(0.045, 6).rotateX(-Math.PI / 2);
    for (let i = 0; i < N; i++) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff' })); m.visible = false; p.group.add(m); prints.push(m); }
    let next = 0;
    W.updaters.push((dt, t, cats) => {
      if (W.region !== p.region) return;
      for (const c of cats) {
        if (c.state !== 'free' || !c.grounded) continue;
        const pud = c.pos.y < 0.1 && p.puddles.find((q) => Math.hypot(q.x - c.pos.x, q.z - c.pos.z) < 0.32);
        if (pud) { if (!c.paint || c.paint.c !== pud.c) W.emit('paint', c.pos, c); c.paint = { c: pud.c, left: 16, x: c.pos.x, z: c.pos.z, side: 1 }; continue; }
        const q = c.paint;
        if (!q || q.left <= 0 || Math.hypot(c.pos.x - q.x, c.pos.z - q.z) < 0.28 * c.scale + 0.08) continue;
        q.x = c.pos.x; q.z = c.pos.z; q.left--; q.side = -q.side;
        const m = prints[next++ % N];
        m.material.color.set(q.c);
        m.position.set(c.pos.x + Math.cos(c.yaw) * 0.09 * q.side * c.scale, c.pos.y + 0.022, c.pos.z - Math.sin(c.yaw) * 0.09 * q.side * c.scale);
        m.scale.setScalar(c.scale * (0.6 + q.left / 40));
        m.visible = true;
      }
    });
  }
}
