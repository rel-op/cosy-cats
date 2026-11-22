import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// The back garden. Camera looks from +x,+z, so the house (z = -11) and fence (x = -11) are the far edges.

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, ...o });

export function buildWorld(scene) {
  const rand = rng(11);
  const root = new THREE.Group();
  scene.add(root);
  const colliders = [];
  const glow = [];

  const put = (m, { cast = true, receive = true } = {}) => {
    m.castShadow = cast;
    m.receiveShadow = receive;
    root.add(m);
    return m;
  };
  const rbox = (x0, x1, y0, y1, z0, z1, material, { r = 0.06, cast = true, receive = true } = {}) => {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const rad = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rad), material);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return put(m, { cast, receive });
  };
  const solid = (x0, x1, y0, y1, z0, z1, { climb = true } = {}) => {
    const c = { x0, x1, y0, y1, z0, z1, climb };
    colliders.push(c);
    return c;
  };
  const ball = (x, y, z, r, material, sy = 1, opts) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), material);
    m.position.set(x, y, z);
    m.scale.y = sy;
    return put(m, opts);
  };
  const disc = (x, y, z, r, material, seg = 28) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, seg), material);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    return put(m, { cast: false });
  };

  const GX0 = -12.2, GX1 = 11.6, GZ0 = -12.4, GZ1 = 11.6;
  const pond = { x: 5.6, z: 5.8, r: 2.1 };
  const patio = { x0: -1, x1: 7, z0: -11, z1: -6.5 };
  const inPond = (x, z) => Math.hypot(x - pond.x, z - pond.z) < pond.r - 0.15;
  const onPatio = (x, z) => x > patio.x0 && x < patio.x1 && z > patio.z0 && z < patio.z1;

  // ---------- ground ----------
  rbox(GX0, GX1, -0.6, 0, GZ0, GZ1, M('#8fcb6e'), { r: 0.3, cast: false });
  rbox(GX0 + 0.12, GX1 - 0.12, -2.8, -0.5, GZ0 + 0.12, GZ1 - 0.12, M('#a8744f'), { r: 0.45, cast: false });
  for (let i = 0; i < 16; i++) {
    const x = -10 + rand() * 20, z = -9.5 + rand() * 20;
    if (inPond(x, z) || onPatio(x, z)) continue;
    disc(x, 0.008 + i * 0.0004, z, 0.8 + rand() * 1.4, M(rand() > 0.5 ? '#84c264' : '#9bd47a'));
  }

  // ---------- patio ----------
  solid(patio.x0, patio.x1, 0, 0.12, patio.z0, patio.z1, { climb: false });
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      const shade = ['#ddd5c8', '#d3cabb', '#e3dccf'][(i + j * 2 + (rand() > 0.6 ? 1 : 0)) % 3];
      rbox(patio.x0 + i * 2 + 0.04, patio.x0 + i * 2 + 1.96, 0, 0.12, patio.z0 + j * 1.5 + 0.04, patio.z0 + j * 1.5 + 1.46, M(shade), { r: 0.05, cast: false });
    }
  }

  // ---------- house (just the back wall) ----------
  const wall = M('#f4e4c9');
  const trim = M('#fffaf0');
  solid(GX0, GX1, 0, 5.4, GZ0, -11, { climb: false });
  rbox(GX0, GX1, 0, 5.4, GZ0, -11, wall, { r: 0.1 });
  rbox(GX0, GX1, 0, 0.4, -11.05, -10.94, M('#e2cdaa'), { r: 0.04, cast: false });
  rbox(GX0 - 0.1, GX1 + 0.1, 5.4, 5.95, GZ0 - 0.1, -10.55, M('#d77a61'), { r: 0.18 });

  const glass = M('#bfe3ef', { roughness: 0.3, emissive: '#ffc86b', emissiveIntensity: 0 });
  glow.push({ mat: glass, max: 1.5 });
  const windowAt = (x0, x1, y0, y1) => {
    rbox(x0, x1, y0, y1, -11.06, -10.92, trim, { r: 0.05 });
    rbox(x0 + 0.14, x1 - 0.14, y0 + 0.14, y1 - 0.14, -11.0, -10.9, glass, { r: 0.03, cast: false });
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    rbox(mx - 0.04, mx + 0.04, y0 + 0.14, y1 - 0.14, -10.95, -10.88, trim, { r: 0.02, cast: false });
    rbox(x0 + 0.14, x1 - 0.14, my - 0.04, my + 0.04, -10.95, -10.88, trim, { r: 0.02, cast: false });
  };
  windowAt(-5.2, -2.8, 1.1, 3.1);
  windowAt(5.5, 7.5, 1.5, 3.1);

  // door with a cat flap
  rbox(1.85, 3.55, 0.12, 2.95, -11.06, -10.93, trim, { r: 0.05 });
  rbox(2.0, 3.4, 0.12, 2.8, -11.05, -10.9, M('#5fa3a3'), { r: 0.04 });
  rbox(2.38, 3.02, 0.2, 0.74, -11.0, -10.87, M('#3f7f82'), { r: 0.1, cast: false });
  ball(3.2, 1.45, -10.86, 0.06, M('#f2c14e', { roughness: 0.4 }));

  // lamp by the door
  const lampMat = M('#fff3d6', { emissive: '#ffc86b', emissiveIntensity: 0 });
  glow.push({ mat: lampMat, max: 2.5 });
  rbox(1.22, 1.38, 2.95, 3.1, -11.0, -10.7, M('#6b5a4c'), { r: 0.03 });
  ball(1.3, 2.86, -10.72, 0.15, lampMat, 1, { cast: false });
  const lampLight = new THREE.PointLight('#ffc070', 0, 10, 1.4);
  lampLight.position.set(1.3, 2.7, -10.2);
  root.add(lampLight);

  // window ledge with a cushion, and a crate to help a kitten up
  solid(-5.3, -2.7, 0, 1.1, -11, -10.35);
  rbox(-5.3, -2.7, 0, 1.1, -11, -10.35, M('#e6d3b3'), { r: 0.07 });
  rbox(-5.05, -2.95, 1.1, 1.17, -10.95, -10.42, M('#dd7b83'), { r: 0.03, cast: false });
  solid(-4.6, -3.4, 0, 0.55, -10.35, -9.7);
  rbox(-4.6, -3.4, 0, 0.55, -10.35, -9.7, M('#cf9a63'), { r: 0.05 });
  rbox(-4.62, -3.38, 0.2, 0.3, -10.37, -9.68, M('#b98250'), { r: 0.02, cast: false });

  // flowerpots by the door
  for (const [x, z, c] of [[0.2, -10.4, '#f08a8a'], [0.75, -10.55, '#f6c453']]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.4, 14), M('#d98a5f'));
    pot.position.set(x, 0.32, z);
    put(pot);
    ball(x, 0.62, z, 0.26, M('#5fae5a'));
    ball(x + 0.1, 0.82, z + 0.08, 0.09, M(c));
    ball(x - 0.12, 0.76, z + 0.12, 0.08, M(c));
    solid(x - 0.2, x + 0.2, 0.12, 0.52, z - 0.2, z + 0.2, { climb: false });
  }

  // ---------- fence along the far-left edge ----------
  solid(-11.3, -11, 0, 1.4, -11, GZ1);
  for (let z = -11; z < GZ1 - 0.3; z += 0.52) {
    rbox(-11.29, -11.01, 0, 1.4, z + 0.02, Math.min(z + 0.5, GZ1), M(rand() > 0.5 ? '#cf965f' : '#c78b54'), { r: 0.05 });
  }
  rbox(-11.02, -10.95, 0.95, 1.07, -11, GZ1, M('#b47a47'), { r: 0.02, cast: false });

  // ---------- lean-to shed with hay ----------
  const slate = M('#7f96aa');
  const wood = M('#b98250');
  solid(-11.3, -8.5, 1.7, 1.85, 3.2, 6.8);
  rbox(-11.35, -8.42, 1.7, 1.88, 3.12, 6.88, slate, { r: 0.06 });
  solid(-8.7, -8.5, 0, 1.85, 6.6, 6.8);
  rbox(-8.7, -8.5, 0, 1.75, 6.6, 6.8, wood, { r: 0.04 });
  solid(-11, -8.5, 0, 1.85, 3.2, 3.35);
  rbox(-11, -8.5, 0, 1.75, 3.2, 3.35, wood, { r: 0.04 });
  const hay = M('#ecd27c');
  ball(-9.85, 0, 5.0, 1.05, hay, 0.2, { cast: false });
  ball(-9.4, 0, 4.3, 0.6, M('#e4c768'), 0.28, { cast: false });
  ball(-10.3, 0, 5.9, 0.55, M('#f1da8c'), 0.3, { cast: false });

  // ---------- tree ----------
  solid(-5, -4, 0, 2.6, 1, 2);
  const bark = M('#8f6245');
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.7, 2.6, 12), bark);
  trunk.position.set(-4.5, 1.3, 1.5);
  put(trunk);
  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.56, 0.14, 14), M('#7fb36a'));
  fork.position.set(-4.5, 2.54, 1.5);
  put(fork);
  const leafs = ['#63b35d', '#76c36c', '#55a455'];
  const blobs = [[-5.9, 4.6, 0.5, 1.6], [-4.3, 5.3, 0.2, 1.5], [-6.3, 4.3, 2.3, 1.3], [-3.2, 4.5, 0.6, 1.2], [-5.2, 5.7, 1.6, 1.3]];
  blobs.forEach(([x, y, z, r], i) => {
    ball(x, y, z, r, M(leafs[i % 3]), 0.88);
    const from = new THREE.Vector3(-4.5, 2.4, 1.5);
    const to = new THREE.Vector3(x, y - r * 0.5, z);
    const len = from.distanceTo(to);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, len, 8), bark);
    br.position.copy(from).lerp(to, 0.5);
    br.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    put(br);
  });

  // ---------- stump, bushes, rocks ----------
  solid(-8.1, -7.3, 0, 0.45, 8.3, 9.1);
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.45, 14), bark);
  stump.position.set(-7.7, 0.225, 8.7);
  put(stump);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 14), M('#e2c49a'));
  ring.position.set(-7.7, 0.455, 8.7);
  put(ring, { cast: false });
  for (const [x, z] of [[-9.6, 9.8], [9.9, -4.6]]) {
    solid(x - 0.65, x + 0.65, 0, 0.9, z - 0.65, z + 0.65, { climb: false });
    ball(x, 0.5, z, 0.85, M('#5aa85a'), 0.85);
    ball(x + 0.45, 0.4, z + 0.3, 0.55, M('#6bb866'), 0.9);
    ball(x - 0.4, 0.45, z + 0.35, 0.5, M('#4f9c52'), 0.9);
  }
  for (const [x, z, r] of [[10.6, 10.4, 0.4], [10.1, 10.9, 0.26], [-2.5, 10.8, 0.3], [10.8, 1.2, 0.33]]) {
    ball(x, r * 0.3, z, r, M('#c9c3b8'), 0.7);
  }

  // ---------- pond ----------
  disc(pond.x, 0.015, pond.z, pond.r, M('#8ccfe6', { roughness: 0.25 }), 44);
  disc(pond.x - 0.2, 0.02, pond.z + 0.1, pond.r * 0.68, M('#74bfe0', { roughness: 0.2 }), 36);
  for (let i = 0; i < 17; i++) {
    const a = (i / 17) * Math.PI * 2 + rand() * 0.2;
    const r = 0.2 + rand() * 0.16;
    ball(pond.x + Math.cos(a) * (pond.r + 0.08), r * 0.25, pond.z + Math.sin(a) * (pond.r + 0.08), r, M(rand() > 0.5 ? '#cfc8bb' : '#bdb5a7'), 0.65);
  }
  for (const [dx, dz, r] of [[-0.9, -0.5, 0.34], [0.6, 0.7, 0.28], [0.9, -0.8, 0.22], [-0.3, 1.0, 0.25]]) {
    disc(pond.x + dx, 0.03, pond.z + dz, r, M('#62b56a'), 14);
  }
  ball(pond.x - 0.9, 0.08, pond.z - 0.5, 0.09, M('#f7a8c4'), 0.8, { cast: false });

  // stepping stones from the patio to the pond
  for (const [x, z] of [[3.1, -5.6], [3.4, -4.1], [3.2, -2.5], [3.7, -0.9], [4.0, 0.7], [4.4, 2.3]]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.45 + rand() * 0.1, 0.5, 0.05, 12), M('#d8d0c2'));
    st.position.set(x, 0.02, z);
    put(st, { cast: false });
  }

  // ---------- grass tufts ----------
  const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.2, 4), M('#ffffff'), 520);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  for (let i = 0; i < 520; i++) {
    let x, z;
    do {
      x = -10.8 + rand() * 21.8;
      z = -10.8 + rand() * 21.8;
    } while (inPond(x, z) || onPatio(x, z) || (x < -8.5 && z > 3.2 && z < 6.8));
    dummy.position.set(x, 0.09, z);
    dummy.rotation.set((rand() - 0.5) * 0.4, rand() * 3, (rand() - 0.5) * 0.4);
    dummy.scale.setScalar(0.7 + rand() * 0.8);
    dummy.updateMatrix();
    tufts.setMatrixAt(i, dummy.matrix);
    tufts.setColorAt(i, col.set(['#7dbb5f', '#9ad67a', '#86c768'][i % 3]));
  }
  tufts.receiveShadow = true;
  root.add(tufts);

  // ---------- flower patches ----------
  const patches = [[0.2, 7.6, 1.6], [8.7, -1.8, 1.4], [-7.8, -6.8, 1.5]];
  const petals = ['#f7a8c4', '#fff2a8', '#ffffff', '#c7a6f2', '#f79a7a'];
  const nFlowers = patches.length * 22;
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5), M('#5f9e55'), nFlowers);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), M('#ffffff'), nFlowers);
  let fi = 0;
  for (const [px, pz, pr] of patches) {
    for (let i = 0; i < 22; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * pr;
      const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r, h = 0.22 + rand() * 0.2;
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(x, h / 2, z);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      stems.setMatrixAt(fi, dummy.matrix);
      dummy.position.set(x, h, z);
      dummy.scale.set(1, 0.7, 1);
      dummy.updateMatrix();
      heads.setMatrixAt(fi, dummy.matrix);
      heads.setColorAt(fi, col.set(petals[Math.floor(rand() * petals.length)]));
      fi++;
    }
  }
  heads.castShadow = true;
  root.add(stems, heads);

  // ---------- cardboard box ----------
  const card = M('#cda56e');
  const bx = 5.0, bz = -8.3, hx = 0.7, hz = 0.55, t = 0.07, by0 = 0.12, by1 = 0.42;
  const boxWall = (x0, x1, z0, z1) => {
    solid(x0, x1, by0, by1, z0, z1);
    rbox(x0, x1, by0, by1, z0, z1, card, { r: 0.02 });
  };
  boxWall(bx - hx - t, bx - hx, bz - hz - t, bz + hz + t);
  boxWall(bx + hx, bx + hx + t, bz - hz - t, bz + hz + t);
  boxWall(bx - hx, bx + hx, bz - hz - t, bz - hz);
  boxWall(bx - hx, bx + hx, bz + hz, bz + hz + t);
  rbox(bx - hx, bx + hx, by0, by0 + 0.02, bz - hz, bz + hz, M('#b98f5b'), { r: 0.005, cast: false });
  const flapA = rbox(bx - hx, bx + hx, by1 - 0.02, by1 + 0.01, bz - hz - 0.34, bz - hz, card, { r: 0.01 });
  flapA.position.y += 0.1;
  flapA.rotation.x = 0.7;
  const flapB = rbox(bx - hx - 0.34, bx - hx, by1 - 0.02, by1 + 0.01, bz - hz, bz + hz, card, { r: 0.01 });
  flapB.position.y += 0.1;
  flapB.rotation.z = -0.7;

  // ---------- beds ----------
  const beds = [
    { name: 'box', x: bx, y: by0, z: bz, r: 0.62, slots: [[bx - 0.32, bz - 0.15], [bx + 0.22, bz - 0.18]],
      spots: [[bx - 0.55, bz - 0.4], [bx + 0.55, bz - 0.4], [bx - 0.55, bz + 0.4], [bx + 0.55, bz + 0.4], [bx, bz - 0.42]] },
    { name: 'hay', x: -9.8, y: 0, z: 5.0, r: 0.95, slots: [[-10.05, 4.95], [-9.5, 5.2]],
      spots: [[-10.5, 4.5], [-9.2, 4.6], [-10.4, 5.6], [-9.3, 5.7], [-9.85, 4.3]] },
    { name: 'tree', x: -4.5, y: 2.6, z: 1.5, r: 0.6, slots: [[-4.62, 1.45], [-4.3, 1.7]],
      spots: [[-4.85, 1.2], [-4.15, 1.2], [-4.85, 1.85], [-4.5, 1.12], [-4.12, 1.5]] },
    { name: 'ledge', x: -4.0, y: 1.1, z: -10.67, r: 0.8, slots: [[-4.3, -10.67], [-3.65, -10.67]],
      spots: [[-5.1, -10.7], [-2.9, -10.7], [-4.0, -10.88], [-4.7, -10.9], [-3.3, -10.9]] },
  ];
  for (const b of beds) b.items = [];
  const bedAt = (p) => beds.find((b) => Math.hypot(p.x - b.x, p.z - b.z) < b.r && Math.abs(p.y - b.y) < 0.45) || null;

  // ---------- things to carry ----------
  const items = [];
  const makeItem = (name, x, y, z, rest, build) => {
    const g = new THREE.Group();
    build(g);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.position.set(x, y + rest, z);
    root.add(g);
    items.push({ name, mesh: g, rest, heldBy: null, bed: null });
  };
  const part = (g, geo, material, x, y, z, sx = 1, sy = sx, sz = sx) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    g.add(m);
    return m;
  };
  const sph = new THREE.SphereGeometry(1, 14, 10);
  makeItem('sock', 0.6, 0.12, -7.6, 0.06, (g) => {
    part(g, sph, M('#e8605f'), 0, 0, 0, 0.07, 0.06, 0.17);
    part(g, sph, M('#e8605f'), 0, 0.02, 0.15, 0.07, 0.07, 0.07);
    part(g, sph, M('#fff4e6'), 0, 0, -0.13, 0.075, 0.065, 0.06);
  });
  makeItem('wool', -7.2, 0, -2.5, 0.13, (g) => {
    part(g, sph, M('#b9a2ee'), 0, 0, 0, 0.13);
    for (const [rx, ry] of [[0.4, 0], [1.3, 0.8], [-0.6, 1.7]]) {
      const tor = part(g, new THREE.TorusGeometry(0.128, 0.012, 5, 18), M('#d5c6fb'), 0, 0, 0);
      tor.rotation.set(rx, ry, 0);
    }
  });
  makeItem('feather', 3.4, 0, 4.4, 0.03, (g) => {
    part(g, sph, M('#f6fbff'), 0, 0, 0, 0.06, 0.012, 0.2);
    part(g, sph, M('#9ecbe8'), 0, 0.004, 0.1, 0.045, 0.012, 0.09);
    part(g, sph, M('#d9c7a5'), 0, 0.008, -0.03, 0.008, 0.006, 0.24);
  });
  makeItem('leaf', -3.4, 0, 3.2, 0.03, (g) => {
    part(g, sph, M('#ee9a3d'), 0, 0, 0, 0.1, 0.014, 0.15);
    part(g, sph, M('#c9742a'), 0, 0.006, -0.02, 0.008, 0.008, 0.19);
  });
  makeItem('cloth', -9.2, 0, 6.3, 0.03, (g) => {
    part(g, new RoundedBoxGeometry(0.42, 0.04, 0.34, 2, 0.018), M('#7fb7d9'), 0, 0, 0);
    part(g, new RoundedBoxGeometry(0.43, 0.042, 0.06, 2, 0.018), M('#f6fbff'), 0, 0, 0.08);
    part(g, new RoundedBoxGeometry(0.43, 0.042, 0.06, 2, 0.018), M('#f6fbff'), 0, 0, -0.08);
  });

  // ---------- butterflies ----------
  const butterflies = [];
  const wingGeo = new THREE.CircleGeometry(0.09, 8);
  wingGeo.translate(0.08, 0, 0);
  patches.forEach(([px, pz], pi) => {
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: ['#ffd24d', '#ff9ec4', '#a6d8ff'][(pi + i) % 3], side: THREE.DoubleSide });
      const wl = new THREE.Mesh(wingGeo, mat);
      const wr = new THREE.Mesh(wingGeo, mat);
      wr.scale.x = -1;
      g.add(wl, wr);
      g.rotation.x = -Math.PI / 2;
      const holder = new THREE.Group();
      holder.add(g);
      root.add(holder);
      butterflies.push({ holder, wl, wr, hx: px, hz: pz, ph: rand() * 10, fx: 0, fz: 0, lift: 0, pos: new THREE.Vector3(px, 0.7, pz) });
    }
  });

  // ---------- fireflies ----------
  const NF = 34;
  const fpos = new Float32Array(NF * 3);
  const fbase = [];
  for (let i = 0; i < NF; i++) fbase.push([-10 + rand() * 20, 0.4 + rand() * 1.6, -9 + rand() * 19, rand() * 10]);
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const dotCv = document.createElement('canvas');
  dotCv.width = dotCv.height = 32;
  const dg = dotCv.getContext('2d');
  const grad = dg.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  dg.fillStyle = grad;
  dg.fillRect(0, 0, 32, 32);
  const fmat = new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dotCv), color: '#fff3a0', size: 14, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const fireflies = new THREE.Points(fgeo, fmat);
  fireflies.frustumCulled = false;
  root.add(fireflies);

  function update(dt, t, cats, night) {
    for (const b of butterflies) {
      let near = false;
      for (const c of cats) {
        const dx = b.pos.x - c.pos.x, dz = b.pos.z - c.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 1.5 && c.pos.y < 1.2) {
          near = true;
          b.fx += (dx / (d + 0.01)) * dt * 9;
          b.fz += (dz / (d + 0.01)) * dt * 9;
        }
      }
      b.lift += ((near ? 1.4 : 0) - b.lift) * Math.min(1, dt * 3);
      b.fx *= 1 - Math.min(1, dt * 0.6);
      b.fz *= 1 - Math.min(1, dt * 0.6);
      const a = t * 0.5 + b.ph;
      const rest = night > 0.6;
      b.pos.set(
        b.hx + Math.sin(a) * 1.1 + Math.sin(a * 2.3) * 0.4 + b.fx,
        rest ? 0.34 : 0.75 + Math.sin(a * 3.1) * 0.2 + b.lift,
        b.hz + Math.cos(a * 0.8) * 1.1 + b.fz
      );
      b.holder.position.lerp(b.pos, Math.min(1, dt * 4));
      b.holder.rotation.y = a * 1.7;
      const flap = rest ? 0.2 : Math.abs(Math.sin(t * 16 + b.ph)) * 1.2;
      b.wl.rotation.y = -flap;
      b.wr.rotation.y = flap;
    }
    fmat.opacity = night * 0.95;
    fireflies.visible = night > 0.02;
    if (fireflies.visible) {
      for (let i = 0; i < NF; i++) {
        const [x, y, z, p] = fbase[i];
        fpos[i * 3] = x + Math.sin(t * 0.4 + p) * 0.9;
        fpos[i * 3 + 1] = y + Math.sin(t * 0.7 + p * 2) * 0.35;
        fpos[i * 3 + 2] = z + Math.cos(t * 0.33 + p) * 0.9;
      }
      fgeo.attributes.position.needsUpdate = true;
    }
  }

  // floor height at a point, for something whose feet are near y
  function supportAt(x, z, y, reach = 0.4) {
    let sup = 0;
    for (const c of colliders) {
      if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && c.y1 <= y + reach && c.y1 > sup) sup = c.y1;
    }
    return sup;
  }
  // is a standing cat of radius r and height h at (x, y, z) inside something?
  function blockedAt(x, y, z, r, h) {
    for (const c of colliders) {
      if (y + h <= c.y0 || y >= c.y1 - 0.01) continue;
      const cx = Math.max(c.x0, Math.min(c.x1, x)), cz = Math.max(c.z0, Math.min(c.z1, z));
      if (Math.hypot(x - cx, z - cz) < r) return true;
    }
    return false;
  }

  return {
    root, colliders, beds, bedAt, items, pond, inPond, glow, lampLight, update, supportAt, blockedAt,
    bounds: { x0: -11.15, x1: 10.9, z0: -10.75, z1: 10.9 },
  };
}
