import * as THREE from 'three';
import { toon } from './build.js';

const G = 14;
const TAU = Math.PI * 2;

export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export function dampAngle(a, b, k, dt) {
  const d = (((b - a + Math.PI) % TAU) + TAU) % TAU - Math.PI;
  return a + d * (1 - Math.exp(-k * dt));
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Coats. Every slot is a colour; `patches` adds blotches (calico, tortie, cow), `points` darkens the extremities.
const W = '#f6f1e4';
export const COATS = [
  { id: 'ginger', name: 'ginger tabby', fur: '#e0903f', stripe: '#b9652a', chest: W, muzzle: W, paws: W, tail2: '#b9652a' },
  { id: 'grey', name: 'grey tabby', fur: '#9a9c9e', stripe: '#5f6468', chest: '#e9e6dc', muzzle: '#e9e6dc', paws: '#e9e6dc', tail2: '#5f6468' },
  { id: 'brown', name: 'brown tabby', fur: '#9b7450', stripe: '#5a3f2b', chest: '#e7d5b3', muzzle: '#e7d5b3', paws: '#9b7450', tail2: '#5a3f2b' },
  { id: 'black', name: 'black', fur: '#3b3a44', stripe: null, chest: '#3b3a44', muzzle: '#4a4954', paws: '#3b3a44', tail2: '#3b3a44' },
  { id: 'white', name: 'white', fur: '#f3efe6', stripe: null, chest: '#ffffff', muzzle: '#ffffff', paws: '#ffffff', tail2: '#f3efe6' },
  { id: 'tuxedo', name: 'tuxedo', fur: '#3b3a44', stripe: null, chest: W, muzzle: W, paws: W, tail2: '#3b3a44', tip: W },
  { id: 'calico', name: 'calico', fur: '#f3efe6', stripe: null, chest: '#ffffff', muzzle: '#ffffff', paws: '#ffffff', tail2: '#d98a3d', patches: ['#d98a3d', '#3b3a44', '#d98a3d', '#3b3a44'], ears: '#d98a3d' },
  { id: 'tortie', name: 'tortoiseshell', fur: '#3f3a3c', stripe: null, chest: '#3f3a3c', muzzle: '#c9853f', paws: '#3f3a3c', tail2: '#b87333', patches: ['#b87333', '#d9a05b', '#b87333', '#d9a05b'] },
  { id: 'siamese', name: 'siamese', fur: '#ecdfc6', stripe: null, chest: '#f4ecda', muzzle: '#5d4a42', paws: '#5d4a42', tail2: '#5d4a42', points: '#5d4a42' },
  { id: 'blue', name: 'smoky blue', fur: '#7d8a99', stripe: null, chest: '#7d8a99', muzzle: '#93a0ae', paws: '#7d8a99', tail2: '#7d8a99' },
  { id: 'cream', name: 'cream', fur: '#f0d9ae', stripe: '#dcbb86', chest: W, muzzle: W, paws: W, tail2: '#dcbb86' },
  { id: 'cow', name: 'black and white', fur: '#f3efe6', stripe: null, chest: '#ffffff', muzzle: '#ffffff', paws: '#ffffff', tail2: '#3b3a44', patches: ['#3b3a44', '#3b3a44', '#3b3a44', '#3b3a44'], ears: '#3b3a44' },
];
export const coatById = (id) => COATS.find((c) => c.id === id) || COATS[0];

const ghostMat = new THREE.MeshBasicMaterial({ color: '#6b5a7e', depthFunc: THREE.GreaterDepth, depthWrite: false });

// A procedural cat. Local space: feet at y = 0, facing +z.
// States: 'free' (walking, jumping), 'climb', 'curl' (lying down), 'ride' (kitten on mama's back), 'eat'.
export class Cat {
  constructor(kind, coat, seed = 0) {
    const k = kind === 'kitten';
    this.kind = kind;
    this.isKitten = k;
    this.scale = k ? 0.62 : 1;
    this.radius = k ? 0.19 : 0.28;
    this.height = k ? 0.42 : 0.62;
    this.speed = k ? 3.3 : 3.9;
    this.jumpV = k ? 4.3 : 5.6;
    this.step = k ? 0.22 : 0.36;
    this.climbMax = k ? 0.8 : 99;
    this.climbSpeed = k ? 1.6 : 2.5;

    this.pos = new THREE.Vector3();
    this.yaw = Math.PI / 4;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.grounded = true;
    this.support = 0;
    this.state = 'free';
    this.stateTime = 0;
    this.events = [];

    this.climbBox = null;
    this.climbN = { x: 0, z: 0 };
    this.climbIntent = 0;
    this.climbing = false;
    this.scrabble = 0;
    this.latch = null;

    this.held = null;
    this.riders = [];
    this.mount = null;
    this.asleep = false;
    this.meowT = 0;
    this.pounce = 0;

    this.aRun = 0;
    this.aCurl = 0;
    this.aClimb = 0;
    this.aAir = 0;
    this.aEat = 0;
    this.phase = 0;
    this.visY = 0;
    this.seed = seed + (k ? 1.7 : 0.3);
    this.blink = 2 + Math.random() * 3;

    this.build();
    this.setCoat(coat);
  }

  build() {
    const k = this.isKitten;
    const L = k ? 0.29 : 0.38; // half body length
    const legLen = k ? 0.15 : 0.2;
    const bodyY = legLen + 0.16;
    const hs = k ? 1.28 : 1;
    this.legLen = legLen;
    this.bodyY = bodyY;

    const m = (this.mats = {
      fur: toon('#fff'), stripe: toon('#fff'), chest: toon('#fff'), muzzle: toon('#fff'), paws: toon('#fff'),
      ears: toon('#fff'), tailA: toon('#fff'), tailB: toon('#fff'), tip: toon('#fff'), legs: toon('#fff'),
      patch: [toon('#fff'), toon('#fff'), toon('#fff'), toon('#fff')],
      pink: toon('#e58f9d'),
      eye: toon('#2a2731'),
      shine: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    });

    const sphere = new THREE.SphereGeometry(1, 16, 11);
    const add = (parent, geo, material, x, y, z, sx = 1, sy = sx, sz = sx) => {
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const g = (this.group = new THREE.Group());
    g.scale.setScalar(this.scale);
    const pivot = (this.pivot = new THREE.Group());
    pivot.position.set(0, bodyY, 0);
    g.add(pivot);
    const body = (this.body = new THREE.Group());
    body.position.set(0, -bodyY, 0);
    pivot.add(body);

    this.torso = add(body, sphere, m.fur, 0, bodyY, 0, 0.2, 0.2, L);
    add(body, sphere, m.chest, 0, bodyY - 0.05, L - 0.13, 0.13, 0.13, 0.11);
    this.stripes = [];
    for (const f of [-0.5, 0, 0.5]) {
      const z = f * L;
      const R = 0.2 * Math.sqrt(1 - (z / L) ** 2) + 0.006;
      const s = new THREE.Mesh(new THREE.TorusGeometry(R, 0.02, 5, 14, Math.PI), m.stripe);
      s.position.set(0, bodyY, z);
      body.add(s);
      this.stripes.push(s);
    }
    // blotches for calico, tortie and cow coats
    this.patches = [
      add(body, sphere, m.patch[0], 0.09, bodyY + 0.08, 0.12, 0.13, 0.12, 0.17),
      add(body, sphere, m.patch[1], -0.1, bodyY + 0.07, -0.1, 0.12, 0.13, 0.18),
      add(body, sphere, m.patch[2], 0.08, bodyY + 0.05, -0.22, 0.13, 0.13, 0.13),
    ];

    const head = (this.head = new THREE.Group());
    head.position.set(0, bodyY + 0.1, L - 0.06);
    body.add(head);
    this.headBase = head.position.clone();
    const hc = new THREE.Vector3(0, 0.07 * hs, 0.11 * hs);
    add(head, sphere, m.fur, hc.x, hc.y, hc.z, 0.2 * hs, 0.185 * hs, 0.185 * hs);
    this.patches.push(add(head, sphere, m.patch[3], hc.x - 0.07 * hs, hc.y + 0.07 * hs, hc.z + 0.02 * hs, 0.13 * hs, 0.12 * hs, 0.14 * hs));
    const earGeo = new THREE.ConeGeometry(0.08 * hs, 0.16 * hs, 8);
    const innerGeo = new THREE.ConeGeometry(0.045 * hs, 0.1 * hs, 6);
    for (const s of [-1, 1]) {
      const ear = add(head, earGeo, m.ears, hc.x + s * 0.11 * hs, hc.y + 0.17 * hs, hc.z - 0.01 * hs);
      ear.rotation.z = -s * 0.3;
      const inner = add(head, innerGeo, m.pink, hc.x + s * 0.108 * hs, hc.y + 0.16 * hs, hc.z + 0.024 * hs);
      inner.rotation.z = -s * 0.3;
    }
    this.eyes = [];
    const er = (k ? 0.042 : 0.036) * hs;
    for (const s of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(hc.x + s * 0.08 * hs, hc.y + 0.02 * hs, hc.z + 0.16 * hs);
      head.add(eye);
      add(eye, sphere, m.eye, 0, 0, 0, er);
      add(eye, sphere, m.shine, er * 0.35, er * 0.4, er * 0.75, er * 0.36);
      this.eyes.push(eye);
    }
    add(head, sphere, m.muzzle, hc.x, hc.y - 0.055 * hs, hc.z + 0.135 * hs, 0.1 * hs, 0.065 * hs, 0.07 * hs);
    add(head, sphere, m.pink, hc.x, hc.y - 0.022 * hs, hc.z + 0.195 * hs, 0.024 * hs, 0.018 * hs, 0.018 * hs);
    this.mouth = new THREE.Group();
    this.mouth.position.set(hc.x, hc.y - 0.1 * hs, hc.z + 0.2 * hs);
    head.add(this.mouth);

    this.legs = [];
    const legGeo = new THREE.CapsuleGeometry(0.055, Math.max(0.02, legLen - 0.06), 3, 8);
    const hipY = legLen + 0.04;
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const leg = new THREE.Group();
      leg.position.set(sx * 0.11, hipY, sz * (L - 0.13));
      body.add(leg);
      add(leg, legGeo, m.legs, 0, -hipY / 2, 0);
      add(leg, sphere, m.paws, 0, -hipY + 0.045, 0.015, 0.064, 0.048, 0.078);
      this.legs.push(leg);
    }

    this.tail = [];
    const n = k ? 5 : 7;
    let parent = new THREE.Group();
    parent.position.set(0, bodyY + 0.06, -L + 0.05);
    body.add(parent);
    this.tailBase = parent;
    for (let i = 0; i < n; i++) {
      const joint = new THREE.Group();
      joint.position.set(0, 0, i === 0 ? 0 : -0.075);
      parent.add(joint);
      const r = 0.054 - (i / n) * 0.016;
      add(joint, sphere, i === n - 1 ? m.tip : i % 2 ? m.tailB : m.tailA, 0, 0, -0.04, r, r, r * 1.25);
      this.tail.push(joint);
      parent = joint;
    }

    // where kittens sit when riding: a little pile along her back
    this.riderAnchors = [[0, 0.14, -0.04, 0], [0.02, 0.15, 0.2, 0.3], [-0.03, 0.17, -0.26, -0.4], [0.05, 0.3, 0.06, 0.9]].map(([x, y, z, ry]) => {
      const a = new THREE.Group();
      a.position.set(x, bodyY + y, z);
      a.rotation.y = ry;
      body.add(a);
      return a;
    });

    // x-ray silhouette so a cat behind a fence or wall can still be seen
    const meshes = [];
    g.traverse((o) => { if (o.isMesh) meshes.push(o); });
    for (const o of meshes) {
      o.renderOrder = 3;
      if (o.material === m.shine) continue;
      const ghost = new THREE.Mesh(o.geometry, ghostMat);
      ghost.renderOrder = 2;
      o.add(ghost);
    }

    this.blob = new THREE.Mesh(
      new THREE.CircleGeometry(1, 12),
      new THREE.MeshBasicMaterial({ color: '#2a2440', transparent: true, opacity: 0.3, depthWrite: false })
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.renderOrder = 1;
  }

  setCoat(coat) {
    this.coat = coat;
    const m = this.mats;
    const pts = coat.points;
    m.fur.color.set(coat.fur);
    m.stripe.color.set(coat.stripe || coat.fur);
    for (const s of this.stripes) s.visible = !!coat.stripe;
    m.chest.color.set(coat.chest);
    m.muzzle.color.set(coat.muzzle);
    m.paws.color.set(coat.paws);
    m.legs.color.set(pts || coat.fur);
    m.ears.color.set(pts || coat.ears || coat.fur);
    m.tailA.color.set(pts || coat.fur);
    m.tailB.color.set(pts || coat.tail2);
    m.tip.color.set(coat.tip || pts || coat.tail2);
    this.patches.forEach((p, i) => {
      p.visible = !!coat.patches;
      if (coat.patches) m.patch[i].color.set(coat.patches[i]);
    });
  }

  setState(s) {
    this.state = s;
    this.stateTime = 0;
  }

  curl(yaw) {
    if (yaw !== undefined) this.yaw = yaw;
    this.vx = this.vz = this.vy = 0;
    this.setState('curl');
  }

  uncurl() {
    this.asleep = false;
    this.setState('free');
  }

  teleport(x, y, z) {
    this.pos.set(x, y, z);
    this.visY = y;
    this.vx = this.vz = this.vy = 0;
    this.grounded = false;
    if (this.state === 'climb') this.setState('free');
  }

  // Move with a desired ground velocity (wx, wz). Handles walls, steps, jumping, falling and climbing.
  physics(dt, wx, wz, jump, world) {
    if (this.state === 'climb') return this.climbStep(dt, wx, wz, jump, world);
    if (this.state !== 'free') return;

    // after topping out of a climb, wait for the stick to ease off so the cat doesn't walk straight off the far side
    if (this.latch) {
      const m = Math.hypot(wx, wz);
      this.latch.t -= dt;
      if (this.latch.t <= 0 || m < this.speed * 0.3 || (wx * this.latch.x + wz * this.latch.z) / m < 0.6) this.latch = null;
      else wx = wz = 0;
    }

    const r = this.radius;
    const h = this.height;
    const inPond = world.inPond(this.pos.x, this.pos.y, this.pos.z);
    const slow = inPond ? 0.7 : 1;
    this.vx = damp(this.vx, wx * slow, 14, dt);
    this.vz = damp(this.vz, wz * slow, 14, dt);
    const wm = Math.hypot(wx, wz);
    if (wm > 0.3) this.yaw = dampAngle(this.yaw, Math.atan2(wx, wz), 14, dt);

    let px = this.pos.x + this.vx * dt;
    let pz = this.pos.z + this.vz * dt;
    let y = this.pos.y;

    if (this.grounded && jump) {
      this.vy = this.jumpV;
      this.grounded = false;
      this.events.push('jump');
    }
    const prevY = y;
    if (!this.grounded) {
      this.vy -= G * dt;
      y += this.vy * dt;
      // bump head on anything overhead
      if (this.vy > 0) {
        for (const c of world.colliders) {
          if (px > c.x0 && px < c.x1 && pz > c.z0 && pz < c.z1 && prevY + h <= c.y0 + 0.02 && y + h > c.y0) {
            y = c.y0 - h;
            this.vy = 0;
          }
        }
      }
    }

    // walls: push the cat's circle out of anything too tall to step onto
    let blocker = null;
    let bnx = 0;
    let bnz = 0;
    const maxPush = 0.14;
    for (const c of world.colliders) {
      if (y + h <= c.y0 + 0.02 || y >= c.y1 - 0.001) continue;
      if (c.y1 - y <= this.step && this.vy <= 0) continue;
      const cx = clamp(px, c.x0, c.x1);
      const cz = clamp(pz, c.z0, c.z1);
      const dx = px - cx;
      const dz = pz - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      let nx, nz, push;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        nx = dx / d; nz = dz / d; push = r - d;
      } else {
        const l = px - c.x0, rr = c.x1 - px, b = pz - c.z0, f = c.z1 - pz;
        const m = Math.min(l, rr, b, f);
        nx = m === l ? -1 : m === rr ? 1 : 0;
        nz = nx ? 0 : m === b ? -1 : 1;
        push = m + r;
      }
      push = Math.min(push, maxPush);
      px += nx * push;
      pz += nz * push;
      if (wm > 0.3 && (wx * nx + wz * nz) / wm < -0.7) {
        blocker = c; bnx = nx; bnz = nz;
      }
    }

    const b = world.bounds();
    px = clamp(px, b.x0, b.x1);
    pz = clamp(pz, b.z0, b.z1);

    // floor under the cat
    let sup = world.floorAt(px, pz);
    let supC = null;
    const reach = this.grounded ? this.step : this.vy <= 0 ? this.step * 0.8 : 0;
    for (const c of world.colliders) {
      if (px > c.x0 && px < c.x1 && pz > c.z0 && pz < c.z1 && c.y1 <= Math.max(y, prevY) + reach + 0.01 && c.y1 > sup) { sup = c.y1; supC = c; }
    }
    this.support = sup;
    if (this.grounded) {
      if (sup >= y - 0.45) y = sup;
      else { this.grounded = false; this.vy = 0; }
    } else if (this.vy <= 0 && y <= sup) {
      y = sup;
      if (supC && supC.bounce && this.vy < -1.5) {
        this.vy = Math.min(8.2, Math.max(5.5, -this.vy * 0.95 + 1.2));
        this.events.push('boing');
      } else {
        this.grounded = true;
        this.events.push(this.vy < -6 ? 'thump' : 'land');
        this.vy = 0;
      }
    }

    this.pos.set(px, y, pz);

    // lean on something climbable for a moment and the cat goes up it
    if (blocker && blocker.climb) {
      const rise = blocker.y1 - y;
      const square = Math.max(Math.abs(bnx), Math.abs(bnz)) > 0.9;
      if (rise > this.climbMax) {
        this.scrabble = 0.25;
        this.climbIntent = 0;
      } else if (square) {
        this.climbIntent += dt;
        if (this.climbIntent > 0.14) this.startClimb(blocker, bnx, bnz);
      }
    } else {
      this.climbIntent = 0;
    }
  }

  startClimb(c, nx, nz) {
    this.climbBox = c;
    if (Math.abs(nx) > Math.abs(nz)) this.climbN = { x: Math.sign(nx), z: 0 };
    else this.climbN = { x: 0, z: Math.sign(nz) };
    this.climbIntent = 0;
    this.vx = this.vz = this.vy = 0;
    this.grounded = false;
    this.setState('climb');
    this.events.push('climb');
  }

  climbStep(dt, wx, wz, jump, world) {
    const c = this.climbBox;
    const n = this.climbN;
    const r = this.radius;
    if (n.x) {
      this.pos.x = (n.x > 0 ? c.x1 : c.x0) + n.x * r;
      this.pos.z = clamp(this.pos.z, c.z0 + 0.03, c.z1 - 0.03);
    } else {
      this.pos.z = (n.z > 0 ? c.z1 : c.z0) + n.z * r;
      this.pos.x = clamp(this.pos.x, c.x0 + 0.03, c.x1 - 0.03);
    }
    this.yaw = dampAngle(this.yaw, Math.atan2(-n.x, -n.z), 18, dt);
    const into = -(wx * n.x + wz * n.z) / this.speed;
    this.climbing = false;
    if (jump || into < -0.35) {
      // let go
      this.setState('free');
      this.grounded = false;
      this.vy = jump ? 2.5 : 0;
      this.vx = n.x * 1.5;
      this.vz = n.z * 1.5;
      return;
    }
    if (into > 0.2) {
      let ny = this.pos.y + this.climbSpeed * dt;
      // stop under anything overhead
      for (const o of world.colliders) {
        if (o === c) continue;
        const cx = clamp(this.pos.x, o.x0, o.x1);
        const cz = clamp(this.pos.z, o.z0, o.z1);
        if (Math.hypot(this.pos.x - cx, this.pos.z - cz) < r * 0.8 && o.y0 >= this.pos.y + this.height - 0.05 && ny + this.height > o.y0) {
          ny = o.y0 - this.height;
        }
      }
      this.climbing = ny > this.pos.y + 1e-4;
      this.pos.y = ny;
    }
    if (this.pos.y >= c.y1 - 0.02) {
      const depth = n.x ? c.x1 - c.x0 : c.z1 - c.z0;
      const inset = Math.min(r + 0.12, depth / 2);
      if (n.x) this.pos.x = (n.x > 0 ? c.x1 : c.x0) - n.x * inset;
      else this.pos.z = (n.z > 0 ? c.z1 : c.z0) - n.z * inset;
      this.pos.y = c.y1;
      this.support = c.y1;
      this.grounded = true;
      this.setState('free');
      this.latch = { x: -n.x, z: -n.z, t: 2.5 };
      this.events.push('top');
    }
  }

  animate(dt, t) {
    this.stateTime += dt;
    const k = this.isKitten;
    const s = this.state;
    const sp = Math.hypot(this.vx, this.vz);
    const onGround = s === 'free' && this.grounded;
    const kneading = s === 'curl' && this.stateTime < 1.1 && !this.asleep;
    this.aRun = damp(this.aRun, onGround ? Math.min(1, sp / this.speed) : 0, 12, dt);
    this.aCurl = damp(this.aCurl, s === 'ride' ? 1 : s === 'curl' ? (kneading ? 0.35 : 1) : 0, 7, dt);
    this.aClimb = damp(this.aClimb, s === 'climb' ? 1 : 0, 12, dt);
    this.aAir = damp(this.aAir, s === 'free' && !this.grounded ? 1 : 0, 14, dt);
    this.aEat = damp(this.aEat, s === 'eat' ? 1 : 0, 9, dt);
    this.scrabble = Math.max(0, this.scrabble - dt);
    this.meowT = Math.max(0, this.meowT - dt);
    this.pounce = Math.max(0, this.pounce - dt);
    const scr = this.scrabble > 0 ? 1 : 0;

    if (s === 'climb') this.phase += dt * (this.climbing ? 11 : 0);
    else this.phase += dt * sp * (k ? 5.4 : 3.7);

    const curl = this.aCurl;
    this.legs.forEach((leg, i) => {
      const front = i < 2;
      const diag = i === 0 || i === 3 ? 0 : Math.PI;
      let a = Math.sin(this.phase + diag) * 0.75 * (this.aRun + this.aClimb * 0.8);
      a += this.aAir * (front ? -0.9 : 0.9);
      if (scr && front) a += Math.sin(t * 24 + i * Math.PI) * 0.6 - 0.9;
      if (kneading && front) a += Math.sin(t * 9 + i * Math.PI) * 0.5 - 0.3;
      leg.rotation.x = a * (1 - curl);
      leg.scale.y = 1 - 0.72 * curl;
    });

    this.body.position.y = -this.bodyY + Math.abs(Math.sin(this.phase)) * 0.022 * this.aRun - this.legLen * 0.8 * curl;
    this.body.rotation.y = this.pounce > 0 ? Math.sin(t * 22) * 0.12 : 0;
    const breathe = 1 + Math.sin(t * 1.7 + this.seed) * 0.04 * curl;
    this.torso.scale.y = 0.2 * breathe;
    this.torso.scale.x = 0.2 * (1 + 0.12 * curl);

    this.pivot.rotation.x = (-Math.PI / 2) * this.aClimb - 0.45 * scr * (1 - this.aClimb) - clamp(this.vy * 0.05, -0.3, 0.3) * this.aAir + 0.16 * this.aEat + (this.pounce > 0 ? 0.18 : 0);
    this.pivot.position.z = -0.12 * this.aClimb;

    const idle = (1 - this.aRun) * (1 - curl) * (1 - this.aClimb) * (1 - this.aEat);
    this.head.rotation.x = 0.3 * curl * (this.asleep ? 1.3 : 0.6) - 0.5 * this.aClimb - (this.meowT > 0 ? 0.45 : 0) + this.aEat * (0.75 + Math.sin(t * 11) * 0.12);
    this.head.rotation.y = Math.sin(t * 0.6 + this.seed * 3) * 0.3 * idle;
    this.head.rotation.z = 0.25 * curl * (this.asleep ? 1 : 0.3);
    this.head.position.y = this.headBase.y - 0.05 * curl - 0.04 * this.aEat;

    this.tailBase.rotation.x = THREE.MathUtils.lerp(0.9 + 0.2 * this.aRun, 0.05, curl);
    this.tail.forEach((j, i) => {
      j.rotation.x = 0.14 * (1 - curl);
      j.rotation.y = Math.sin(t * 2.3 + i * 0.6 + this.seed) * 0.15 * (1 - curl) + 0.48 * curl;
    });

    this.blink -= dt;
    if (this.blink < -0.14) this.blink = 2 + Math.random() * 4;
    const lid = this.asleep ? 0.1 : this.blink < 0 ? 0.1 : s === 'curl' && !kneading ? 0.45 : 1;
    for (const e of this.eyes) e.scale.y = damp(e.scale.y, lid, 30, dt);

    if (s !== 'ride') {
      this.visY = this.grounded && s === 'free' ? damp(this.visY, this.pos.y, 22, dt) : this.pos.y;
      this.group.position.set(this.pos.x, this.visY, this.pos.z);
      this.group.rotation.y = this.yaw;
    }

    const lift = Math.max(0, this.pos.y - this.support);
    const show = s === 'free' && lift > 0.05;
    this.blob.visible = show;
    if (show) {
      this.blob.position.set(this.pos.x, this.support + 0.03, this.pos.z);
      this.blob.scale.setScalar(this.radius * (1.1 - Math.min(0.5, lift * 0.25)));
    }
  }
}
