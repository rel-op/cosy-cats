import * as THREE from 'three';

const G = 14;
const TAU = Math.PI * 2;

export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export function dampAngle(a, b, k, dt) {
  const d = (((b - a + Math.PI) % TAU) + TAU) % TAU - Math.PI;
  return a + d * (1 - Math.exp(-k * dt));
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const fur = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });

// A procedural cat. Local space: feet at y = 0, facing +z.
// States: 'free' (walking, jumping), 'climb', 'curl' (lying down), 'ride' (kitten on mama's back).
export class Cat {
  constructor(kind, colors) {
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
    this.rider = null;
    this.mount = null;
    this.asleep = false;
    this.meowT = 0;

    this.aRun = 0;
    this.aCurl = 0;
    this.aClimb = 0;
    this.aAir = 0;
    this.phase = 0;
    this.visY = 0;
    this.seed = k ? 1.7 : 0.3;
    this.blink = 2 + Math.random() * 3;

    this.build(colors);
  }

  build(c) {
    const k = this.isKitten;
    const L = k ? 0.29 : 0.38; // half body length
    const legLen = k ? 0.15 : 0.2;
    const bodyY = legLen + 0.16;
    const hs = k ? 1.28 : 1;
    this.legLen = legLen;
    this.bodyY = bodyY;

    const mFur = fur(c.fur);
    const mDark = fur(c.dark);
    const mWhite = fur(c.white);
    const mPink = fur('#f29aa5');
    const mEye = new THREE.MeshStandardMaterial({ color: '#2d2a33', roughness: 0.25 });
    const mShine = new THREE.MeshBasicMaterial({ color: '#ffffff' });

    const sphere = new THREE.SphereGeometry(1, 24, 16);
    const add = (parent, geo, material, x, y, z, sx = 1, sy = sx, sz = sx) => {
      const m = new THREE.Mesh(geo, material);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      m.castShadow = true;
      parent.add(m);
      return m;
    };

    const g = (this.group = new THREE.Group());
    g.scale.setScalar(this.scale);
    const pivot = (this.pivot = new THREE.Group());
    pivot.position.set(0, bodyY, 0);
    g.add(pivot);
    const body = (this.body = new THREE.Group());
    body.position.set(0, -bodyY, 0);
    pivot.add(body);

    // torso, chest and tabby stripes
    this.torso = add(body, sphere, mFur, 0, bodyY, 0, 0.2, 0.2, L);
    add(body, sphere, mWhite, 0, bodyY - 0.05, L - 0.13, 0.13, 0.13, 0.11);
    for (const f of [-0.5, 0, 0.5]) {
      const z = f * L;
      const R = 0.2 * Math.sqrt(1 - (z / L) ** 2) + 0.004;
      const s = new THREE.Mesh(new THREE.TorusGeometry(R, 0.017, 6, 18, Math.PI), mDark);
      s.position.set(0, bodyY, z);
      s.castShadow = false;
      body.add(s);
    }

    // head
    const head = (this.head = new THREE.Group());
    head.position.set(0, bodyY + 0.1, L - 0.06);
    body.add(head);
    this.headBase = head.position.clone();
    const hc = new THREE.Vector3(0, 0.07 * hs, 0.11 * hs);
    add(head, sphere, mFur, hc.x, hc.y, hc.z, 0.2 * hs, 0.185 * hs, 0.185 * hs);
    const earGeo = new THREE.ConeGeometry(0.075 * hs, 0.15 * hs, 12);
    const innerGeo = new THREE.ConeGeometry(0.045 * hs, 0.1 * hs, 10);
    for (const s of [-1, 1]) {
      const ear = add(head, earGeo, mFur, hc.x + s * 0.11 * hs, hc.y + 0.17 * hs, hc.z - 0.01 * hs);
      ear.rotation.z = -s * 0.3;
      const inner = add(head, innerGeo, mPink, hc.x + s * 0.108 * hs, hc.y + 0.16 * hs, hc.z + 0.022 * hs);
      inner.rotation.z = -s * 0.3;
      inner.castShadow = false;
    }
    this.eyes = [];
    const er = (k ? 0.04 : 0.034) * hs;
    for (const s of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(hc.x + s * 0.078 * hs, hc.y + 0.02 * hs, hc.z + 0.162 * hs);
      head.add(eye);
      add(eye, sphere, mEye, 0, 0, 0, er).castShadow = false;
      add(eye, sphere, mShine, er * 0.35, er * 0.4, er * 0.75, er * 0.33).castShadow = false;
      this.eyes.push(eye);
    }
    add(head, sphere, mWhite, hc.x, hc.y - 0.055 * hs, hc.z + 0.135 * hs, 0.1 * hs, 0.065 * hs, 0.07 * hs).castShadow = false;
    add(head, sphere, mPink, hc.x, hc.y - 0.022 * hs, hc.z + 0.195 * hs, 0.024 * hs, 0.018 * hs, 0.018 * hs).castShadow = false;
    // forehead stripes
    for (const s of [-1, 0, 1]) {
      const st = add(head, sphere, mDark, hc.x + s * 0.045 * hs, hc.y + 0.155 * hs, hc.z + 0.07 * hs, 0.012 * hs, 0.02 * hs, 0.05 * hs);
      st.rotation.x = -0.75;
      st.castShadow = false;
    }
    this.mouth = new THREE.Group();
    this.mouth.position.set(hc.x, hc.y - 0.1 * hs, hc.z + 0.2 * hs);
    head.add(this.mouth);

    // legs: front left, front right, back left, back right
    this.legs = [];
    const legGeo = new THREE.CapsuleGeometry(0.055, Math.max(0.02, legLen - 0.06), 4, 10);
    const hipY = legLen + 0.04;
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const leg = new THREE.Group();
      leg.position.set(sx * 0.11, hipY, sz * (L - 0.13));
      body.add(leg);
      add(leg, legGeo, mFur, 0, -hipY / 2, 0);
      add(leg, sphere, mWhite, 0, -hipY + 0.045, 0.015, 0.062, 0.047, 0.076);
      this.legs.push(leg);
    }

    // tail: a chain of joints running backwards
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
      const r = 0.052 - (i / n) * 0.016;
      add(joint, sphere, i % 2 ? mDark : mFur, 0, 0, -0.04, r, r, r * 1.25);
      this.tail.push(joint);
      parent = joint;
    }

    // where a kitten sits when riding
    this.riderAnchor = new THREE.Group();
    this.riderAnchor.position.set(0, bodyY + 0.15, -0.03);
    body.add(this.riderAnchor);

    // soft blob shadow so jumps are easy to read
    this.blob = new THREE.Mesh(
      new THREE.CircleGeometry(1, 20),
      new THREE.MeshBasicMaterial({ color: '#2a2440', transparent: true, opacity: 0.25, depthWrite: false })
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.renderOrder = 2;
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
    const inPond = this.pos.y < 0.1 && world.inPond(this.pos.x, this.pos.z);
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

    const b = world.bounds;
    px = clamp(px, b.x0, b.x1);
    pz = clamp(pz, b.z0, b.z1);

    // floor under the cat
    let sup = 0;
    const reach = this.grounded ? this.step : this.vy <= 0 ? this.step * 0.8 : 0;
    for (const c of world.colliders) {
      if (px > c.x0 && px < c.x1 && pz > c.z0 && pz < c.z1 && c.y1 <= Math.max(y, prevY) + reach + 0.01 && c.y1 > sup) sup = c.y1;
    }
    this.support = sup;
    if (this.grounded) {
      if (sup >= y - 0.45) y = sup;
      else { this.grounded = false; this.vy = 0; }
    } else if (this.vy <= 0 && y <= sup) {
      y = sup;
      this.grounded = true;
      this.events.push(this.vy < -6 ? 'thump' : 'land');
      this.vy = 0;
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
    this.aRun = damp(this.aRun, onGround ? Math.min(1, sp / this.speed) : 0, 12, dt);
    this.aCurl = damp(this.aCurl, s === 'curl' || s === 'ride' ? 1 : 0, 7, dt);
    this.aClimb = damp(this.aClimb, s === 'climb' ? 1 : 0, 12, dt);
    this.aAir = damp(this.aAir, s === 'free' && !this.grounded ? 1 : 0, 14, dt);
    this.scrabble = Math.max(0, this.scrabble - dt);
    this.meowT = Math.max(0, this.meowT - dt);
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
      leg.rotation.x = a * (1 - curl);
      leg.scale.y = 1 - 0.72 * curl;
    });

    this.body.position.y = -this.bodyY + Math.abs(Math.sin(this.phase)) * 0.022 * this.aRun - this.legLen * 0.8 * curl;
    const breathe = 1 + Math.sin(t * 1.7 + this.seed) * 0.035 * curl;
    this.torso.scale.y = 0.2 * breathe;
    this.torso.scale.x = 0.2 * (1 + 0.12 * curl);

    this.pivot.rotation.x = (-Math.PI / 2) * this.aClimb - 0.45 * scr * (1 - this.aClimb) - clamp(this.vy * 0.05, -0.3, 0.3) * this.aAir;
    this.pivot.position.z = -0.12 * this.aClimb;

    const idle = (1 - this.aRun) * (1 - curl) * (1 - this.aClimb);
    this.head.rotation.x = 0.3 * curl * (this.asleep ? 1.3 : 0.6) - 0.5 * this.aClimb - (this.meowT > 0 ? 0.45 : 0);
    this.head.rotation.y = Math.sin(t * 0.6 + this.seed * 3) * 0.3 * idle;
    this.head.rotation.z = 0.25 * curl * (this.asleep ? 1 : 0.3);
    this.head.position.y = this.headBase.y - 0.05 * curl;

    this.tailBase.rotation.x = THREE.MathUtils.lerp(0.9 + 0.2 * this.aRun, 0.05, curl);
    this.tail.forEach((j, i) => {
      j.rotation.x = 0.14 * (1 - curl);
      j.rotation.y = Math.sin(t * 2.3 + i * 0.6 + this.seed) * 0.15 * (1 - curl) + 0.48 * curl;
    });

    this.blink -= dt;
    if (this.blink < -0.12) this.blink = 2 + Math.random() * 4;
    const shut = this.asleep || this.blink < 0;
    for (const e of this.eyes) e.scale.y = damp(e.scale.y, shut ? 0.1 : 1, 30, dt);

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
