import * as THREE from 'three';
import { Input } from './input.js';
import { buildWorld } from './world.js';
import { Cat, damp, dampAngle } from './cat.js';
import { DayNight } from './daynight.js';
import { Labels } from './labels.js';
import { Sound } from './sound.js';
import { Fx } from './fx.js';

// ---------- renderer, scene, camera ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
const CAM_DIR = new THREE.Vector3(1, 1.05, 1).normalize();
const RIGHT = new THREE.Vector3(1, 0, -1).normalize(); // screen right, on the ground
const AWAY = new THREE.Vector3(-1, 0, -1).normalize(); // screen up, on the ground
const CAM_UP = new THREE.Vector3().crossVectors(RIGHT, CAM_DIR.clone().negate()).normalize();
const camTarget = new THREE.Vector3(3, 0.5, -8);
const debug = { view: 0, target: null }; // camera overrides for looking closely
let viewSize = 9;

const world = buildWorld(scene);
const day = new DayNight(scene, world);
const labels = new Labels();
const sound = new Sound();
const fx = new Fx(scene, camera);
const input = new Input();

const mama = new Cat('mama', { fur: '#e9974c', dark: '#c6702c', white: '#fff4e4' });
const kitten = new Cat('kitten', { fur: '#f2b36d', dark: '#d98a3f', white: '#fffaf0' });
const cats = [mama, kitten];
mama.pos.set(2.7, 0.12, -9.3);
kitten.pos.set(3.3, 0.12, -8.2);
for (const c of cats) {
  c.visY = c.pos.y;
  c.support = c.pos.y;
  scene.add(c.group, c.blob);
}

const other = (cat) => (cat === mama ? kitten : mama);
const flat = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

let time = 0;
let started = false;

// ---------- players ----------
const players = [];
const COLORS = ['#ffd34d', '#6ec6ff'];
const isHuman = (cat) => players.some((p) => p.cat === cat && p.human);

const toastEl = document.getElementById('toast');
let toastTimer = 0;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

function join(dev) {
  if (players.length >= 2 || players.some((p) => p.dev === dev)) return;
  const cat = cats.find((c) => !players.some((p) => p.cat === c));
  const slot = [0, 1].find((i) => !players.some((p) => p.slot === i));
  const p = { dev, cat, slot, idle: 0, human: true, dot: labels.dot(COLORS[slot]) };
  p.dot.show = 4;
  players.push(p);
  if (players.length === 2) toast('two players');
}

function leave(p) {
  labels.removeDot(p.dot);
  players.splice(players.indexOf(p), 1);
}

function swap(p) {
  const q = players.find((x) => x !== p);
  const mine = p.cat;
  p.cat = other(mine);
  if (q) q.cat = mine;
  for (const x of players) x.dot.show = 3;
  sound.swap();
}

// ---------- words ----------
function headPos(cat) {
  return V(cat.pos.x, cat.pos.y + cat.height + 0.45, cat.pos.z);
}
function say(cat, word, cooldown = 1.2, opts) {
  cat.wordCd ??= {};
  if ((cat.wordCd[word] || 0) > time) return;
  cat.wordCd[word] = time + cooldown;
  labels.say(headPos(cat), word, opts);
}

// ---------- riding ----------
function mount() {
  if (kitten.state === 'ride') return;
  kitten.setState('ride');
  kitten.mount = mama;
  mama.rider = kitten;
  mama.riderAnchor.add(kitten.group);
  kitten.group.position.set(0, 0, 0);
  kitten.group.rotation.set(0, 0, 0);
  kitten.vx = kitten.vz = kitten.vy = 0;
  kitten.asleep = false;
  sound.hop(true);
  say(kitten, 'hop', 0.5);
}

// a free place to stand next to a cat, at about the same height
function besideSpot(cat, who) {
  const fx_ = Math.sin(cat.yaw), fz = Math.cos(cat.yaw);
  const b = world.bounds;
  for (const [dx, dz] of [[fz, -fx_], [-fz, fx_], [-fx_, -fz], [fx_, fz]]) {
    const x = cat.pos.x + dx * 0.55, z = cat.pos.z + dz * 0.55;
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
    const sup = world.supportAt(x, z, cat.pos.y, 0.3);
    if (Math.abs(sup - cat.pos.y) < 0.4 && !world.blockedAt(x, sup, z, who.radius, who.height)) return [x, sup, z];
  }
  return null;
}

function dismount(spot = besideSpot(mama, kitten)) {
  if (kitten.state !== 'ride') return;
  const s = spot || [mama.pos.x, mama.pos.y, mama.pos.z];
  scene.add(kitten.group);
  kitten.mount = null;
  mama.rider = null;
  kitten.setState('free');
  kitten.teleport(s[0], s[1], s[2]);
  kitten.yaw = mama.yaw;
}

// ---------- carrying ----------
function nearestItem(cat) {
  let best = null, bd = cat.radius + 0.5;
  for (const it of world.items) {
    if (it.heldBy || it.bed) continue;
    const p = it.mesh.position;
    const d = Math.hypot(p.x - cat.pos.x, p.z - cat.pos.z);
    if (d < bd && Math.abs(p.y - cat.pos.y) < 0.6) { best = it; bd = d; }
  }
  return best;
}

function pickUp(cat, it) {
  it.heldBy = cat;
  cat.held = it;
  cat.mouth.add(it.mesh);
  it.mesh.position.set(0, 0, 0);
  it.mesh.rotation.set(0, Math.PI / 2, 0);
  it.mesh.scale.setScalar(1 / cat.scale);
  sound.pick();
}

function drop(cat, bed) {
  const it = cat.held;
  cat.held = null;
  it.heldBy = null;
  world.root.add(it.mesh);
  it.mesh.scale.setScalar(1);
  it.mesh.rotation.set(0, cat.yaw, 0);
  if (bed) {
    const [x, z] = bed.spots[bed.items.length % bed.spots.length];
    it.mesh.position.set(x, bed.y + it.rest, z);
    it.bed = bed;
    bed.items.push(it);
    fx.hearts(V(x, bed.y + 0.2, z), 2);
    sound.pick();
  } else {
    const x = cat.pos.x + Math.sin(cat.yaw) * (cat.radius + 0.15);
    const z = cat.pos.z + Math.cos(cat.yaw) * (cat.radius + 0.15);
    it.mesh.position.set(x, world.supportAt(x, z, cat.pos.y, 0.3) + it.rest, z);
    sound.drop();
  }
}

// ---------- curling up ----------
function curlUp(cat, bed) {
  if (bed) {
    const o = other(cat);
    const taken = (s) => o.state === 'curl' && Math.hypot(o.pos.x - s[0], o.pos.z - s[1]) < 0.25;
    const slots = bed.slots.filter((s) => !taken(s));
    slots.sort((a, b) => Math.hypot(a[0] - cat.pos.x, a[1] - cat.pos.z) - Math.hypot(b[0] - cat.pos.x, b[1] - cat.pos.z));
    if (slots[0]) {
      cat.pos.x = slots[0][0];
      cat.pos.z = slots[0][1];
      cat.pos.y = bed.y;
    }
  }
  cat.curl(Math.PI / 4 + (cat.isKitten ? 0.45 : -0.35));
  say(cat, 'nap', 2);
}

function snuggleSpot(lead, cat) {
  const bed = world.bedAt(lead.pos);
  if (bed) {
    const s = [...bed.slots].sort((a, b) => Math.hypot(b[0] - lead.pos.x, b[1] - lead.pos.z) - Math.hypot(a[0] - lead.pos.x, a[1] - lead.pos.z))[0];
    return [s[0], bed.y, s[1]];
  }
  return besideSpot(lead, cat) || [lead.pos.x, lead.pos.y, lead.pos.z];
}

// ---------- the "do" button ----------
function doAction(cat) {
  if (cat.state !== 'free' || !cat.grounded) return;
  const bed = world.bedAt(cat.pos);
  if (cat.held) return drop(cat, bed);
  const item = nearestItem(cat);
  if (item) return pickUp(cat, item);
  if (bed) return curlUp(cat, bed);
  const o = other(cat);
  const close = flat(cat, o) < 1.1 && Math.abs(cat.pos.y - o.pos.y) < 0.5;
  if (close && kitten.state === 'free' && mama.state === 'free' && kitten.grounded && mama.grounded) return mount();
  curlUp(cat, null);
}

function meow(cat) {
  if ((cat.meowCd || 0) > time) return;
  cat.meowCd = time + 0.5;
  sound.meow(cat.isKitten);
  cat.meowT = 0.45;
  say(cat, cat.isKitten ? 'mew' : 'meow', 0.4);
  const o = other(cat);
  if (!isHuman(o) && o.state !== 'ride') aiState(o).summon = 2.6;
  if (flat(cat, o) < 1.4 && Math.abs(cat.pos.y - o.pos.y) < 0.7) {
    fx.hearts(V((cat.pos.x + o.pos.x) / 2, Math.max(cat.pos.y, o.pos.y) + 0.5, (cat.pos.z + o.pos.z) / 2));
    setTimeout(() => say(o, 'purr', 2), 350);
  }
}

// ---------- a player steering a cat ----------
function control(p, dt) {
  const d = p.dev, cat = p.cat;
  const wx = RIGHT.x * d.x + AWAY.x * d.y;
  const wz = RIGHT.z * d.x + AWAY.z * d.y;
  const mag = Math.hypot(d.x, d.y);
  if (d.meow) meow(cat);

  if (cat.state === 'ride') {
    const m = cat.mount;
    if (!isHuman(m)) {
      // nobody is steering mama, so the kitten on her back does
      m.driven = true;
      if (m.state === 'curl') {
        if (mag > 0.5 && m.stateTime > 0.4) m.uncurl();
      } else {
        m.physics(dt, wx * m.speed, wz * m.speed, d.jump, world);
      }
      if (d.act) dismount();
    } else if (d.act || d.jump) {
      dismount();
    }
    return;
  }
  if (cat.state === 'curl') {
    if ((mag > 0.5 || d.jump) && cat.stateTime > 0.4) cat.uncurl();
    return;
  }
  cat.physics(dt, wx * cat.speed, wz * cat.speed, d.jump, world);
  if (d.act) doAction(cat);
}

// ---------- the cat nobody is steering ----------
function aiState(cat) {
  return (cat.ai ??= { moving: false, summon: 0, bedT: 0, mewT: 3, restT: 0 });
}

function ai(cat, dt) {
  const lead = other(cat);
  const a = aiState(cat);

  if (cat.state === 'ride') {
    // hop down once mama has stopped somewhere with room
    const m = cat.mount;
    const still = m.state === 'free' && m.grounded && Math.hypot(m.vx, m.vz) < 0.3;
    a.restT = still ? a.restT + dt : 0;
    if (a.restT > 1.5) {
      a.restT = 0;
      const spot = besideSpot(m, cat);
      if (spot) dismount(spot);
    }
    return;
  }

  const dx = lead.pos.x - cat.pos.x, dz = lead.pos.z - cat.pos.z, dy = lead.pos.y - cat.pos.y;
  const d = Math.hypot(dx, dz);

  if (lead.state === 'curl') {
    if (cat.state === 'curl') return;
    const [sx, sy, sz] = snuggleSpot(lead, cat);
    const sd = Math.hypot(sx - cat.pos.x, sz - cat.pos.z);
    a.bedT += dt;
    if ((sd < 0.3 && Math.abs(sy - cat.pos.y) < 0.35) || a.bedT > 3) {
      if (sd > 0.7) {
        fx.poof(cat.pos.clone());
        fx.poof(V(sx, sy, sz));
      }
      cat.teleport(sx, sy, sz);
      cat.grounded = true;
      cat.support = sy;
      cat.curl(lead.yaw + (cat.isKitten ? 0.8 : -0.8));
      a.bedT = 0;
      say(cat, 'purr', 3);
    } else {
      cat.physics(dt, ((sx - cat.pos.x) / (sd + 0.001)) * cat.speed * 0.9, ((sz - cat.pos.z) / (sd + 0.001)) * cat.speed * 0.9, false, world);
    }
    return;
  }
  a.bedT = 0;
  if (cat.state === 'curl') {
    if (cat.stateTime > 0.7) cat.uncurl();
    return;
  }

  // called over: run, and if that fails, bound across
  if (a.summon > 0) {
    a.summon -= dt;
    if (d < 1.2 && Math.abs(dy) < 0.6) a.summon = 0;
    else if (a.summon <= 0 && lead.state === 'free' && lead.grounded) {
      const s = besideSpot(lead, cat) || [lead.pos.x, lead.pos.y, lead.pos.z];
      fx.poof(cat.pos.clone());
      cat.teleport(s[0], s[1], s[2]);
      fx.poof(V(s[0], s[1], s[2]));
      say(cat, 'hop', 0.5);
      sound.hop(cat.isKitten);
      return;
    }
  }
  const called = a.summon > 0;
  if (d > (called ? 1.0 : 2.4)) a.moving = true;
  else if (d < (called ? 0.9 : 1.4)) a.moving = false;

  const tooHigh = cat.isKitten && dy > cat.climbMax && d < 2.5;
  if (a.moving && !tooHigh) {
    const f = d > 5 || called ? 1.15 : 0.95;
    cat.physics(dt, (dx / d) * cat.speed * f, (dz / d) * cat.speed * f, false, world);
  } else {
    cat.physics(dt, 0, 0, false, world);
    if (d > 0.4 && cat.state === 'free') cat.yaw = dampAngle(cat.yaw, Math.atan2(dx, dz), 4, dt);
  }
  // a kitten who can't follow looks up and mews
  if (tooHigh || cat.scrabble > 0) {
    a.mewT -= dt;
    if (a.mewT <= 0) {
      a.mewT = 6;
      sound.meow(true);
      cat.meowT = 0.45;
      say(cat, 'mew', 1);
    }
  }
}

// ---------- sleeping ----------
const sleep = { active: false, t: 0, wait: 0, from: 0, rested: false, woke: false, said: 0 };
const nightEl = document.getElementById('night');
const smooth = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

function together() {
  if (mama.state !== 'curl') return false;
  if (kitten.state === 'ride') return true;
  return kitten.state === 'curl' && flat(mama, kitten) < 1.8 && Math.abs(mama.pos.y - kitten.pos.y) < 0.7;
}

function updateSleep(dt) {
  if (!sleep.active) {
    if (!together()) {
      sleep.rested = false;
      sleep.wait = 0;
    } else if (!sleep.rested) {
      sleep.wait += dt;
      if (sleep.wait > 1.6) {
        Object.assign(sleep, { active: true, t: 0, from: day.t, woke: false, said: 0 });
        for (const c of cats) c.asleep = true;
        sound.purr(true);
        fx.hearts(V(mama.pos.x, mama.pos.y + 0.5, mama.pos.z), 4);
      }
    }
    return;
  }
  const t = (sleep.t += dt);
  if (t < 8) day.set(sleep.from + (1 - sleep.from) * smooth(t / 3.5));
  const cues = [[0.8, mama, 'purr'], [3.0, kitten, 'purr'], [5.2, mama, 'zzz']];
  if (sleep.said < cues.length && t > cues[sleep.said][0]) {
    const [, cat, word] = cues[sleep.said++];
    const at = headPos(cat);
    if (cat === kitten) at.y += 0.45;
    labels.say(at, word, { plain: word === 'zzz', life: 2.2 });
  }
  nightEl.style.opacity = t < 6.5 ? 0 : t < 8 ? (t - 6.5) / 1.5 : Math.max(0, 1 - (t - 8) / 1.5);
  if (t >= 8 && !sleep.woke) {
    sleep.woke = true;
    day.set(0.03);
    sound.purr(false);
    sound.morning();
  }
  if (t >= 9.5) {
    sleep.active = false;
    sleep.rested = true;
    sleep.wait = 0;
    nightEl.style.opacity = 0;
    for (const c of cats) c.asleep = false;
  }
}

// ---------- camera ----------
function updateCamera(dt, snap = false) {
  const a = mama.pos, b = kitten.pos;
  const mid = V((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.4, (a.z + b.z) / 2);
  const diff = V(b.x - a.x, b.y - a.y, b.z - a.z);
  const aspect = Math.max(1, innerWidth) / Math.max(1, innerHeight);
  const want = Math.min(26, Math.max(7.5, Math.abs(diff.dot(CAM_UP)) + 4.5, (Math.abs(diff.dot(RIGHT)) + 5.5) / aspect));
  if (!Number.isFinite(viewSize)) viewSize = want;
  if (debug.view) viewSize = debug.view;
  if (debug.target) mid.copy(debug.target);
  const k = snap ? 1 : 1 - Math.exp(-3 * dt);
  viewSize += (want - viewSize) * k;
  camTarget.lerp(mid, k);
  camera.left = (-viewSize * aspect) / 2;
  camera.right = (viewSize * aspect) / 2;
  camera.top = viewSize / 2;
  camera.bottom = -viewSize / 2;
  camera.position.copy(camTarget).addScaledVector(CAM_DIR, 80);
  camera.lookAt(camTarget);
  camera.updateProjectionMatrix();
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  updateCamera(0, true);
}
addEventListener('resize', resize);

// ---------- start, keys ----------
const titleEl = document.getElementById('title');
function start() {
  if (started) return;
  started = true;
  titleEl.classList.add('hide');
}
addEventListener('keydown', (e) => {
  sound.unlock();
  if (e.code === 'KeyH') titleEl.classList.toggle('hide');
  if (e.code === 'KeyT' && started && !sleep.active) day.set(day.t + 0.1); // skip ahead towards night
});
addEventListener('pointerdown', () => sound.unlock());

// ---------- main loop ----------
let last = performance.now();
function step(dt) {
  time += dt;
  input.poll();
  for (const p of [...players]) if (p.dev.gone) leave(p);
  for (const d of input.devices.values()) {
    if (!d.active) continue;
    sound.unlock();
    start();
    join(d);
  }

  if (started) {
    const swaps = [];
    for (const p of players) {
      p.idle = p.dev.active ? 0 : p.idle + dt;
      // with two players, a cat left alone for a while tags along by itself
      p.human = !(players.length === 2 && p.idle > 40 && (!p.human || p.cat.state === 'free'));
      if (p.dev.swap) swaps.push(p);
    }
    if (!sleep.active) {
      for (const p of players) if (p.human) control(p, dt);
      for (const c of cats) {
        if (!isHuman(c) && !c.driven && players.length) ai(c, dt);
        c.driven = false;
      }
      if (swaps.length) swap(swaps[0]);
    }
    updateSleep(dt);
    if (!sleep.active) day.advance(dt);
  }

  if (kitten.state === 'ride') mama.riderAnchor.getWorldPosition(kitten.pos);

  for (const c of cats) {
    for (const e of c.events) {
      if (e === 'jump') {
        sound.hop(c.isKitten);
        say(c, 'hop', 2.5);
      } else if (e === 'thump') {
        fx.poof(c.pos.clone(), 5);
      } else if ((e === 'climb' || e === 'top') && c === mama && !isHuman(kitten) && kitten.state === 'free') {
        // mama is going up something the kitten can't manage: hop on
        if (flat(mama, kitten) < 4 && mama.climbBox.y1 - kitten.pos.y > kitten.climbMax) {
          fx.poof(kitten.pos.clone(), 5);
          mount();
        }
      }
    }
    c.events.length = 0;

    const wet = c.state === 'free' && c.pos.y < 0.1 && world.inPond(c.pos.x, c.pos.z);
    if (wet && !c.wet) {
      sound.splash();
      say(c, 'splash', 3);
    }
    if (wet && Math.hypot(c.vx, c.vz) > 0.5 && (c.rippleT = (c.rippleT || 0) - dt) <= 0) {
      c.rippleT = 0.35;
      fx.ripple(c.pos);
    }
    c.wet = wet;
    c.animate(dt, time);
  }

  for (const p of players) {
    if (players.length === 2) p.dot.show = Math.max(p.dot.show, 0.3);
    p.dot.pos.copy(headPos(p.cat));
    p.dot.pos.y -= 0.15;
  }

  world.update(dt, time, cats, day.night);
  fx.update(dt);
  updateCamera(dt);
  labels.update(dt, camera);
}

function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  step(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

resize();
requestAnimationFrame(frame);

// handy for poking at things from the console and for tests
window.game = { debug, cats, mama, kitten, players, input, world, day, sleep, step, camera, renderer, scene };
