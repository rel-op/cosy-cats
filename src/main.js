import * as THREE from 'three';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import './style.css';
import { Pixel } from './pixel.js';
import { shared } from './build.js';
import { Input } from './input.js';
import { buildWorld } from './world.js';
import { Cat, coatById, damp, dampAngle } from './cat.js';
import { DayNight } from './daynight.js';
import { Labels } from './labels.js';
import { Audio } from './audio.js';
import { Fx } from './fx.js';
import { Menu } from './menu.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture'); // trailer mode: stepped by hand, silent, no saved game
if (CAPTURE) document.body.classList.add('capture');

// ---------- saved choices ----------
const SAVE_KEY = 'cosy-cats-save-1';
let stored = {};
try { if (!CAPTURE) stored = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch { stored = {}; }
const save = Object.assign({ mama: 'ginger', kittens: ['cream'], words: true, music: true, den: null }, stored);
const persist = () => { if (!CAPTURE) try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* private window */ } };

// ---------- world ----------
const pixel = new Pixel(document.getElementById('game'));
if (params.has('px')) { pixel.forcePx = +params.get('px'); pixel.resize(); }
const scene = new THREE.Scene();
const world = buildWorld(scene);
const day = new DayNight(scene, world, pixel);
const labels = new Labels();
const audio = new Audio({ silent: CAPTURE });
const fx = new Fx(scene, pixel.camera);
const input = new Input();
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const RIGHT = pixel.right, AWAY = V(-1, 0, -1).normalize();

const cats = [];
function spawn(kind, coatId, at) {
  const c = new Cat(kind, coatById(coatId), cats.length);
  c.pos.copy(at);
  c.visY = c.support = at.y;
  c.trail = [];
  c.trailN = 0;
  scene.add(c.group, c.blob);
  cats.push(c);
  return c;
}
const mama = spawn('mama', save.mama, V(1.8, 0.12, -8.6));
save.kittens.forEach((id, i) => spawn('kitten', id, V(0.9 - (i % 2) * 0.6, 0.12, -7.8 + Math.floor(i / 2) * 0.6 + (i % 2) * 0.3)));

const flat = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
const region = () => world.regions[world.region];
let time = 0;
let started = false;
const debug = { cam: null, freeze: false };

// ---------- players ----------
const players = [];
const COLORS = ['#ffd34d', '#6ec6ff'];
const isHuman = (cat) => players.some((p) => p.cat === cat && p.human);
const toastEl = document.getElementById('toast');
let toastTimer = 0;
function toast(text) {
  if (CAPTURE) return;
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
  let i = cats.indexOf(p.cat), found = null;
  for (let k = 1; k < cats.length; k++) {
    const c = cats[(i + k) % cats.length];
    if (!q || q.cat !== c) { found = c; break; }
  }
  if (found) p.cat = found;
  else if (q) { const mine = p.cat; p.cat = q.cat; q.cat = mine; }
  for (const x of players) x.dot.show = 3;
  audio.play('tick', { vol: 0.6 });
}

// ---------- words ----------
const headPos = (cat) => V(cat.pos.x, cat.pos.y + cat.height + 0.45, cat.pos.z);
function say(cat, word, cooldown = 1.5, opts) {
  cat.wordCd ??= {};
  if ((cat.wordCd[word] || 0) > time) return;
  cat.wordCd[word] = time + cooldown;
  labels.say(headPos(cat), word, opts);
}

// ---------- riding ----------
function mount(k) {
  if (k.state === 'ride' || k === mama) return;
  k.setState('ride');
  k.mount = mama;
  mama.riders.push(k);
  seatRiders();
  k.vx = k.vz = k.vy = 0;
  k.asleep = false;
  audio.play('hop', { vol: 0.5, rate: 1.3 });
}
function seatRiders() {
  mama.riders.forEach((k, i) => {
    mama.riderAnchors[i % 4].add(k.group);
    k.group.position.set(0, 0, 0);
    k.group.rotation.set(0, 0, 0);
  });
}
// a free place to stand next to a cat, at about the same height. `n` picks which side to try first.
function besideSpot(cat, who, n = 0, dist = 0.55) {
  const b = world.bounds();
  for (let i = 0; i < 8; i++) {
    const a = cat.yaw + Math.PI / 2 + ((n + i) % 8) * (Math.PI / 4) * (i % 2 ? -1 : 1);
    const x = cat.pos.x + Math.sin(a) * dist, z = cat.pos.z + Math.cos(a) * dist;
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
    const sup = world.supportAt(x, z, cat.pos.y, 0.3);
    if (Math.abs(sup - cat.pos.y) < 0.4 && !world.blockedAt(x, sup, z, who.radius, who.height)) return [x, sup, z];
  }
  return null;
}
function dismount(k, spot = besideSpot(mama, k, cats.indexOf(k))) {
  if (k.state !== 'ride') return;
  const s = spot || [mama.pos.x, mama.pos.y, mama.pos.z];
  scene.add(k.group);
  k.mount = null;
  mama.riders.splice(mama.riders.indexOf(k), 1);
  seatRiders();
  k.setState('free');
  k.teleport(s[0], s[1], s[2]);
  k.yaw = mama.yaw;
}

// ---------- carrying ----------
function nearestItem(cat) {
  let best = null, bd = cat.radius + 0.5;
  for (const it of world.items) {
    if (it.heldBy || it.bed || it.region !== world.region) continue;
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
  audio.play('pickup', { vol: 0.7 });
}
function drop(cat, bed) {
  const it = cat.held;
  cat.held = null;
  it.heldBy = null;
  it.region = world.region;
  region().group.add(it.mesh);
  it.mesh.scale.setScalar(1);
  it.mesh.rotation.set(0, cat.yaw, 0);
  if (bed) {
    const a = bed.items.length * 2.4 + 0.9, r = bed.r * 0.78;
    let x = bed.x + Math.cos(a) * r, z = bed.z + Math.sin(a) * r;
    if (Math.abs(world.supportAt(x, z, bed.y, 0.2) - bed.y) > 0.25) { x = bed.x + Math.cos(a) * 0.2; z = bed.z + Math.sin(a) * 0.2; }
    it.mesh.position.set(x, bed.y + it.rest, z);
    it.bed = bed;
    bed.items.push(it);
    fx.hearts(V(x, bed.y + 0.2, z), 2);
    audio.play('pickup', { vol: 0.6, rate: 0.85 });
  } else {
    const x = cat.pos.x + Math.sin(cat.yaw) * (cat.radius + 0.15), z = cat.pos.z + Math.cos(cat.yaw) * (cat.radius + 0.15);
    it.mesh.position.set(x, world.supportAt(x, z, cat.pos.y, 0.3) + it.rest, z);
    audio.play('drop', { vol: 0.6 });
  }
}

// ---------- curling up, eating ----------
function curlUp(cat) {
  cat.curl(Math.PI / 4 + (cat.isKitten ? 0.45 : -0.35));
  say(cat, 'nap', 3);
}
function nearBowl(cat) {
  return world.bowls.find((b) => b.region === world.region && Math.hypot(b.x - cat.pos.x, b.z - cat.pos.z) < cat.radius + 0.5 && Math.abs(b.y - cat.pos.y) < 0.4);
}
function eat(cat, bowl) {
  cat.setState('eat');
  cat.vx = cat.vz = 0;
  cat.eatT = 2.6;
  cat.yaw = Math.atan2(bowl.x - cat.pos.x, bowl.z - cat.pos.z);
  audio.play(bowl.kind === 'food' ? 'munch' : 'lap', { vol: 0.7 });
  say(cat, bowl.kind === 'food' ? 'munch' : 'lap', 2);
}

// ---------- the "do" button ----------
function doAction(cat) {
  if (cat.state !== 'free' || !cat.grounded) return;
  const bed = world.bedAt(cat.pos);
  if (cat.held) return drop(cat, bed);
  const item = nearestItem(cat);
  if (item) return pickUp(cat, item);
  const bowl = nearBowl(cat);
  if (bowl) return eat(cat, bowl);
  if (!bed && mama.state === 'free' && mama.grounded) {
    if (cat.isKitten && flat(cat, mama) < 1.1 && Math.abs(cat.pos.y - mama.pos.y) < 0.5) return mount(cat);
  }
  curlUp(cat);
}

function meow(cat) {
  if ((cat.meowCd || 0) > time) return;
  cat.meowCd = time + 0.5;
  audio.play(cat.isKitten ? 'mew' : 'meow', { vol: 0.8 });
  cat.meowT = 0.45;
  say(cat, cat.isKitten ? 'mew' : 'meow', 0.4);
  // the others answer and come over
  let k = 0;
  for (const o of cats) {
    if (o === cat || isHuman(o)) continue;
    if (o.state !== 'ride') aiState(o).summon = 2.8;
    const delay = 0.5 + k++ * 0.35;
    aiState(o).answer = delay;
  }
  const close = cats.find((o) => o !== cat && flat(cat, o) < 1.4 && Math.abs(cat.pos.y - o.pos.y) < 0.7);
  if (close) fx.hearts(V((cat.pos.x + close.pos.x) / 2, Math.max(cat.pos.y, close.pos.y) + 0.5, (cat.pos.z + close.pos.z) / 2));
}

// ---------- a player steering a cat ----------
function control(p, dt) {
  const d = p.dev, cat = p.cat;
  const wx = RIGHT.x * d.x + AWAY.x * d.y, wz = RIGHT.z * d.x + AWAY.z * d.y;
  const mag = Math.hypot(d.x, d.y);
  if (d.meow) meow(cat);
  if (cat.state === 'ride') {
    const m = cat.mount;
    if (!isHuman(m)) {
      // nobody is steering mama, so the kitten on her back does
      m.driven = true;
      if (m.state === 'curl' || m.state === 'eat') { if (mag > 0.5 && m.stateTime > 0.4) m.uncurl(); } else m.physics(dt, wx * m.speed, wz * m.speed, d.jump, world);
      if (d.act) dismount(cat);
    } else if (d.act || d.jump) dismount(cat);
    return;
  }
  if (cat.state === 'curl' || cat.state === 'eat') {
    if ((mag > 0.5 || d.jump) && cat.stateTime > 0.4) cat.uncurl();
    return;
  }
  cat.physics(dt, wx * cat.speed, wz * cat.speed, d.jump, world);
  if (d.act) doAction(cat);
}

// ---------- cats nobody is steering ----------
const aiState = (cat) => (cat.ai ??= { moving: false, summon: 0, bedT: 0, mewT: 3, restT: 0, playT: 6 + Math.random() * 10, answer: 0, jump: false });
const napLead = () => { const p = players.find((q) => q.human && q.cat.state === 'curl'); return p ? p.cat : null; };

function leaderOf(cat) {
  if (cat === mama) { const p = players.find((q) => q.human && q.cat !== mama); return p ? (p.cat.state === 'ride' ? null : p.cat) : null; }
  return mama;
}
// where a kitten walks in the line behind mama: 0 is first
const rankOf = (cat) => cats.filter((c) => c.isKitten && !isHuman(c) && c.state !== 'ride').indexOf(cat);

function ai(cat, dt, idx) {
  const a = aiState(cat);
  if (a.answer > 0) {
    a.answer -= dt;
    if (a.answer <= 0) { audio.play(cat.isKitten ? 'mew' : 'trill', { vol: 0.55 }); cat.meowT = 0.4; say(cat, cat.isKitten ? 'mew' : 'purr', 1); }
  }
  if (cat.state === 'eat') return;
  const nap = napLead();
  if (cat.state === 'ride') {
    // hop down once mama has stopped somewhere with room
    const m = cat.mount;
    const still = m.state === 'free' && m.grounded && Math.hypot(m.vx, m.vz) < 0.3;
    a.restT = still ? a.restT + dt : 0;
    if (a.restT > 1.5 + mama.riders.indexOf(cat) * 0.3) {
      a.restT = 0;
      const spot = besideSpot(m, cat, idx);
      if (spot) dismount(cat, spot);
    }
    return;
  }
  if (nap && nap !== cat) {
    if (cat.state === 'curl') return;
    a.bedT += dt;
    if (a.bedT < idx * 0.45) return cat.physics(dt, 0, 0, false, world);
    const spot = besideSpot(nap, cat, idx * 3, cat.isKitten ? 0.5 : 0.68);
    if (!spot && cat.isKitten && nap === mama) { a.bedT = 0; return mount(cat); }
    const [sx, sy, sz] = spot || [nap.pos.x, nap.pos.y, nap.pos.z];
    const sd = Math.hypot(sx - cat.pos.x, sz - cat.pos.z);
    if ((sd < 0.3 && Math.abs(sy - cat.pos.y) < 0.35) || a.bedT > 3 + idx * 0.45) {
      if (sd > 0.7) { fx.poof(cat.pos.clone()); fx.poof(V(sx, sy, sz)); }
      cat.teleport(sx, sy, sz);
      cat.grounded = true;
      cat.support = sy;
      cat.curl(Math.atan2(nap.pos.x - sx, nap.pos.z - sz) + 0.5);
      a.bedT = 0;
      audio.play(cat.isKitten ? 'mew' : 'trill', { vol: 0.4 });
    } else cat.physics(dt, ((sx - cat.pos.x) / (sd + 0.001)) * cat.speed * 0.9, ((sz - cat.pos.z) / (sd + 0.001)) * cat.speed * 0.9, false, world);
    return;
  }
  a.bedT = 0;
  if (cat.state === 'curl') { if (cat.stateTime > 0.7 + idx * 0.25 && !sleep.active) cat.uncurl(); return; }

  const lead = leaderOf(cat);
  if (!lead) return cat.physics(dt, 0, 0, false, world);
  const dx = lead.pos.x - cat.pos.x, dz = lead.pos.z - cat.pos.z, dy = lead.pos.y - cat.pos.y;
  const d = Math.hypot(dx, dz);
  const catchUp = () => {
    const s = besideSpot(lead, cat, idx) || [lead.pos.x, lead.pos.y, lead.pos.z];
    fx.poof(cat.pos.clone());
    cat.teleport(s[0], s[1], s[2]);
    fx.poof(V(s[0], s[1], s[2]));
    a.ptr = lead.trailN;
    a.skips = 0;
  };
  if (a.jump) { a.jump = false; cat.physics(dt, Math.sin(cat.yaw) * cat.speed, Math.cos(cat.yaw) * cat.speed, true, world); return; }
  const leadOk = lead.state === 'free' && lead.grounded;
  // called over: run straight there, and if that fails, bound across
  if (a.summon > 0) {
    a.summon -= dt;
    if (d < 1.3 && Math.abs(dy) < 0.6) a.summon = 0;
    else if (a.summon <= 0 && leadOk && d > 2.5) return catchUp();
    else if (d > 1.0) { a.ptr = lead.trailN; return cat.physics(dt, (dx / d) * cat.speed * 1.2, (dz / d) * cat.speed * 1.2, false, world); }
  }
  if (d > 13 && leadOk) return catchUp();
  // otherwise follow in the leader's footsteps, which is how kittens end up trailing in a line
  if (a.lead !== lead) { a.lead = lead; a.ptr = lead.trailN; }
  const tr = lead.trail, first = lead.trailN - tr.length, keep = 3 + (cat.isKitten ? Math.max(0, rankOf(cat)) * 2 : 0);
  if (a.ptr < first) a.ptr = first;
  let crumb = null;
  while (a.ptr < lead.trailN - keep) {
    const c = tr[a.ptr - first];
    if (Math.hypot(c.x - cat.pos.x, c.z - cat.pos.z) < 0.4 && Math.abs(c.y - cat.pos.y) < 1.0) { a.ptr++; a.stuck = 0; } else { crumb = c; break; }
  }
  const tooHigh = cat.isKitten && d < 3 && (dy > cat.climbMax || (crumb && crumb.y - cat.pos.y > cat.climbMax));
  // far behind for a while, or mama is up somewhere a kitten can't reach: scamper to catch up, or hop on
  const behindBy = lead.trailN - a.ptr - keep;
  a.lagT = behindBy > 6 || (tooHigh && leadOk) ? (a.lagT || 0) + dt : 0;
  if (a.lagT > (tooHigh ? 1.2 : 5) && leadOk) {
    a.lagT = 0;
    if (tooHigh && lead === mama) { fx.poof(cat.pos.clone(), 4); return mount(cat); }
    return catchUp();
  }
  if (behindBy > 30 && leadOk) return catchUp();
  if (crumb && !tooHigh && cat.state === 'free') {
    const cx = crumb.x - cat.pos.x, cz = crumb.z - cat.pos.z, cd = Math.hypot(cx, cz) + 0.001;
    const behind = lead.trailN - a.ptr;
    const f = behind > 9 ? 1.3 : behind > 5 ? 1.12 : 0.98;
    const px = cat.pos.x, pz = cat.pos.z;
    cat.allowClimb = crumb.y - cat.pos.y > 0.15; // only climb when the trail really goes up
    cat.physics(dt, (cx / cd) * cat.speed * f, (cz / cd) * cat.speed * f, false, world);
    cat.allowClimb = true;
    // not getting anywhere: skip a step, and after a few tries just bound over
    const moved = Math.hypot(cat.pos.x - px, cat.pos.z - pz);
    a.stuck = cat.state === 'free' && moved < cat.speed * dt * 0.35 ? (a.stuck || 0) + dt : 0;
    if (a.stuck > 0.8) { a.stuck = 0; a.ptr++; }
    a.playT = Math.max(a.playT, 2);
  } else if (cat.state === 'climb') {
    cat.physics(dt, -cat.climbN.x * cat.speed, -cat.climbN.z * cat.speed, false, world);
  } else {
    cat.physics(dt, 0, 0, false, world);
    if (d > 0.4 && cat.state === 'free' && cat.pounce <= 0) cat.yaw = dampAngle(cat.yaw, Math.atan2(dx, dz), 4, dt);
    // kittens amuse themselves: a wiggle, then a pounce at nothing much
    if (cat.isKitten && cat.grounded && !tooHigh && d < 3) {
      a.playT -= dt;
      if (a.playT <= 0) { a.playT = 7 + Math.random() * 12; cat.pounce = 0.7; cat.yaw += (Math.random() - 0.5) * 2.4; a.pounceAt = time + 0.6; }
      if (a.pounceAt && time > a.pounceAt) { a.pounceAt = 0; a.jump = true; }
    }
  }
  // a kitten who can't follow looks up and mews
  if (tooHigh || cat.scrabble > 0) {
    a.mewT -= dt;
    if (a.mewT <= 0) { a.mewT = 6; audio.play('mew', { vol: 0.6 }); cat.meowT = 0.45; say(cat, 'mew', 1); }
  }
}

// ---------- doorways ----------
let trans = null;
let portalCd = 0;
function findPortal(cat) {
  for (const p of world.portals) {
    if (p.region === world.region && Math.abs(p.y - cat.pos.y) < 0.5 && Math.hypot(p.x - cat.pos.x, p.z - cat.pos.z) < p.r) return p;
  }
  return null;
}
function arrive(p, lead) {
  world.setRegion(p.to);
  labels.clear();
  fx.clear();
  const order = [lead, ...cats.filter((c) => c !== lead)];
  let n = 0;
  for (const c of order) {
    if (c.state === 'ride') continue;
    if (c.state !== 'free') c.setState('free');
    c.asleep = false;
    let spot = [p.tx, p.ty, p.tz];
    if (c !== lead) {
      n++;
      const b = world.bounds();
      for (let i = 0; i < 6; i++) {
        const a = p.yaw + (n % 2 ? 1 : -1) * (0.5 + 0.45 * Math.floor((n + 1) / 2)) + i * 0.5, dist = 0.7 + 0.2 * n;
        const x = Math.max(b.x0, Math.min(b.x1, p.tx + Math.sin(a) * dist)), z = Math.max(b.z0, Math.min(b.z1, p.tz + Math.cos(a) * dist));
        const sup = world.supportAt(x, z, p.ty, 0.3);
        if (Math.abs(sup - p.ty) < 0.4 && !world.blockedAt(x, sup, z, c.radius, c.height) && !findPortal({ pos: V(x, sup, z) })) { spot = [x, sup, z]; break; }
      }
    }
    c.teleport(spot[0], spot[1], spot[2]);
    c.yaw = p.yaw;
    c.grounded = true;
    c.support = spot[1];
    if (c.held) c.held.region = p.to;
    if (c.ai) { c.ai.summon = 0; c.ai.lead = null; }
    c.trail.length = 0;
  }
  camSnap = true;
  portalCd = 0.7;
}
function updateTransition(dt) {
  if (!trans) return;
  trans.t += dt;
  const k = Math.min(1, trans.t / 0.42);
  if (trans.phase === 'close') {
    pixel.iris(headPos(trans.lead), 1 - k * k);
    if (k >= 1) { arrive(trans.portal, trans.lead); trans.phase = 'hold'; trans.t = 0; }
  } else if (trans.phase === 'hold') {
    pixel.iris(headPos(trans.lead), 0);
    if (trans.t > 0.12) { trans.phase = 'open'; trans.t = 0; }
  } else {
    pixel.iris(headPos(trans.lead), k * k);
    if (k >= 1) { pixel.iris(null, null); trans = null; }
  }
}

// ---------- sleeping ----------
const sleep = { active: false, t: 0, wait: 0, from: 0, rested: false, woke: false, said: 0 };
const smooth = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
function together() {
  const lead = napLead();
  if (!lead) return false;
  for (const c of cats) {
    if (c.state === 'curl') { if (flat(c, lead) > 2.6 || Math.abs(c.pos.y - lead.pos.y) > 1) return false; } else if (!(c.state === 'ride' && c.mount.state === 'curl')) return false;
  }
  return true;
}
function updateSleep(dt) {
  if (!sleep.active) {
    if (!together()) { sleep.rested = false; sleep.wait = 0; } else if (!sleep.rested) {
      sleep.wait += dt;
      if (sleep.wait > 1.8) {
        Object.assign(sleep, { active: true, t: 0, from: day.t, woke: false, said: 0 });
        for (const c of cats) c.asleep = true;
        fx.hearts(V(mama.pos.x, mama.pos.y + 0.5, mama.pos.z), 4);
        save.den = { region: world.region, x: mama.pos.x, y: mama.pos.y, z: mama.pos.z };
        persist();
      }
    }
    return;
  }
  const t = (sleep.t += dt);
  if (t < 9) day.set(sleep.from + (1 - sleep.from) * smooth(t / 4));
  const cues = [[0.8, 0, 'purr'], [3.2, 1, 'purr'], [5.6, 0, 'zzz'], [7.2, 2, 'zzz']];
  if (sleep.said < cues.length && t > cues[sleep.said][0]) {
    const [, i, word] = cues[sleep.said++];
    const cat = cats[i % cats.length];
    const at = headPos(cat);
    if (i) at.y += 0.35;
    labels.say(at, word, { plain: word === 'zzz', life: 2.4 });
  }
  pixel.uniforms.uFade.value = t < 7.5 ? 0 : t < 9 ? (t - 7.5) / 1.5 : Math.max(0, 1 - (t - 9) / 1.5);
  if (t >= 9 && !sleep.woke) {
    sleep.woke = true;
    day.set(0.03);
    audio.play('chime', { vol: 0.6 });
  }
  if (t >= 10.5) {
    sleep.active = false;
    sleep.rested = true;
    sleep.wait = 0;
    pixel.uniforms.uFade.value = 0;
    for (const c of cats) c.asleep = false;
    audio.play('yawn', { vol: 0.6 });
  }
}

// ---------- camera ----------
const cam = { target: V(3, 0.5, -8), ppu: 32 };
let camSnap = true;
function roomView(r) {
  const [ox, oz] = r.origin, { w, d, h } = r.size;
  let r0 = 1e9, r1 = -1e9, u0 = 1e9, u1 = -1e9;
  for (const x of [0, w]) for (const y of [0, h]) for (const z of [0, d]) {
    const p = V(ox + x, y, oz + z), a = p.dot(pixel.right), b = p.dot(pixel.up);
    r0 = Math.min(r0, a); r1 = Math.max(r1, a); u0 = Math.min(u0, b); u1 = Math.max(u1, b);
  }
  const ppu = Math.min((pixel.view.x - 28) / (r1 - r0), (pixel.view.y - 30) / (u1 - u0), 110);
  const c = V(ox + w / 2, h / 2, oz + d / 2);
  const mid = c.clone().addScaledVector(pixel.right, (r0 + r1) / 2 - c.dot(pixel.right)).addScaledVector(pixel.up, (u0 + u1) / 2 - c.dot(pixel.up));
  return { mid, ppu };
}
function updateCamera(dt) {
  const r = region();
  const base = pixel.view.y / 8.2;
  let want = V(0, 0, 0), ppu = base;
  if (debug.cam) {
    want.set(debug.cam.x, debug.cam.y ?? 0.5, debug.cam.z);
    ppu = debug.cam.ppu || base;
    camSnap = true;
  } else if (r.indoor) {
    const v = roomView(r);
    want.copy(v.mid);
    ppu = v.ppu;
  } else {
    const hs = players.filter((p) => p.human).map((p) => p.cat);
    const focus = hs.length ? hs : [mama];
    for (const c of focus) want.add(c.pos);
    want.multiplyScalar(1 / focus.length);
    want.y += 0.5;
    if (focus.length === 2) {
      const dx = focus[1].pos.x - focus[0].pos.x, dz = focus[1].pos.z - focus[0].pos.z, dy = focus[1].pos.y - focus[0].pos.y;
      const needR = Math.abs(dx * RIGHT.x + dz * RIGHT.z) + 6, needU = Math.abs(dx * AWAY.x + dz * AWAY.z) * 0.5 + Math.abs(dy) * 0.87 + 5;
      ppu = Math.max(18, Math.min(base, pixel.view.x / needR, pixel.view.y / needU));
    }
    if (menu.open) { want.copy(mama.pos); want.y += 0.4; want.addScaledVector(RIGHT, -1.6); ppu = base * 1.5; }
    else if (sleep.active) ppu *= 0.86;
    want.x = Math.max(r.cam.x0, Math.min(r.cam.x1, want.x));
    want.z = Math.max(r.cam.z0, Math.min(r.cam.z1, want.z));
  }
  const k = camSnap ? 1 : 1 - Math.exp(-3.5 * dt);
  cam.target.lerp(want, k);
  cam.ppu += (ppu - cam.ppu) * (camSnap ? 1 : 1 - Math.exp(-2.5 * dt));
  camSnap = false;
  pixel.aim(cam.target, cam.ppu);
}
addEventListener('resize', () => { pixel.resize(); camSnap = true; });

// ---------- menu: choosing cats ----------
const menu = new Menu({
  cats: () => cats,
  settings: save,
  setCoat: (i, id) => { cats[i].setCoat(coatById(id)); if (i === 0) save.mama = id; else save.kittens[i - 1] = id; },
  addKitten: () => {
    if (cats.length >= 5) return;
    const id = ['cream', 'grey', 'tuxedo', 'calico', 'black'][cats.length % 5];
    const s = besideSpot(mama, { radius: 0.19, height: 0.42 }, cats.length * 3, 0.7) || [mama.pos.x, mama.pos.y, mama.pos.z];
    const k = spawn('kitten', id, V(s[0], s[1], s[2]));
    save.kittens.push(id);
    fx.poof(k.pos.clone());
    fx.hearts(headPos(k), 3);
    audio.play('mew', { vol: 0.7 });
  },
  removeKitten: () => {
    if (cats.length <= 2) return;
    const k = cats[cats.length - 1];
    for (const p of players) if (p.cat === k) p.cat = cats.find((c) => c !== k && !players.some((q) => q !== p && q.cat === c));
    if (k.state === 'ride') dismount(k);
    if (k.held) drop(k, null);
    fx.poof(k.pos.clone());
    scene.remove(k.group, k.blob);
    cats.pop();
    save.kittens.pop();
  },
  tick: () => audio.play('tick', { vol: 0.5 }),
  changed: () => { labels.enabled = save.words; audio.musicOn = save.music; persist(); },
});
labels.enabled = save.words;
audio.musicOn = save.music;

// ---------- start ----------
const titleEl = document.getElementById('title');
function start() {
  if (started) return;
  started = true;
  titleEl.classList.add('hide');
}
addEventListener('keydown', (e) => {
  audio.unlock();
  if (e.code === 'KeyT' && started && !sleep.active) day.set(day.t + 0.1); // skip ahead towards night
  if (e.code === 'KeyP' && started) { weather.on = !weather.on; weather.timer = weather.on ? 90 : 400; } // start or stop a shower
});
addEventListener('pointerdown', () => audio.unlock());

// wake up where the family last slept
if (save.den && world.regions[save.den.region]) {
  world.setRegion(save.den.region);
  mama.teleport(save.den.x, save.den.y, save.den.z);
  mama.grounded = true;
  mama.support = save.den.y;
  mama.curl(0.4);
  mama.stateTime = 5;
  cats.slice(1).forEach((k, i) => {
    const s = besideSpot(mama, k, i * 3, 0.5);
    if (s) { k.teleport(s[0], s[1], s[2]); k.grounded = true; k.support = s[1]; k.curl(1.2 + i); k.stateTime = 5; } else mount(k);
  });
  sleep.rested = true;
}

world.emit = (what, pos) => {
  if (what === 'plop') { audio.play('plop', { vol: 0.6 }); fx.ripple(pos); }
  else if (what === 'flutter') audio.play('flutter', { vol: 0.35 });
  else if (what === 'ball') audio.play('bell', { vol: 0.4 });
};

// ---------- weather: now and then a gentle shower, which makes indoors feel better ----------
const weather = { rain: 0, on: false, timer: 240 + Math.random() * 180 };
function updateWeather(dt) {
  if (!CAPTURE && started && !sleep.active) {
    weather.timer -= dt;
    if (weather.timer <= 0) { weather.on = !weather.on; weather.timer = weather.on ? 70 + Math.random() * 50 : 330 + Math.random() * 300; }
  }
  weather.rain += ((weather.on ? 1 : 0) - weather.rain) * Math.min(1, dt * 0.25);
  pixel.uniforms.uRain.value = weather.rain < 0.01 ? 0 : weather.rain;
}

// ---------- sound that follows the place and the hour ----------
function updateAudio(dt) {
  const r = region(), n = day.night, inside = r.indoor ? 1 : 0;
  audio.enclose(inside * 0.92);
  audio.loop('amb_day', 0.5 * (1 - n) * (inside ? 0.7 : 1) * (1 - weather.rain * 0.7));
  audio.loop('amb_rain', weather.rain * (inside ? 0.75 : 0.5));
  audio.loop('amb_night', 0.55 * n * (inside ? 0.7 : 1));
  let water = 0;
  if (!inside) for (const p of world.ponds) water = Math.max(water, 1 - Math.hypot(p.x - mama.pos.x, p.z - mama.pos.z) / (p.rx * 2 + 4));
  audio.loop('amb_water', Math.max(0, water) * 0.3);
  audio.loop('amb_fire', world.region === 'home' ? 0.45 : 0);
  audio.loop('amb_room', inside && world.region !== 'home' ? 0.25 : 0);
  audio.loop('purr', sleep.active ? 0.55 : napLead() ? 0.3 : 0);
  let track = 'music_explore';
  if (sleep.active || (!inside && n > 0.5)) track = 'music_night';
  else if (inside) track = 'music_home';
  else if (Math.abs(mama.pos.x) < 12 && mama.pos.z < 11.5) track = 'music_garden';
  audio.setTrack(track);
  audio.update(dt);
}

// ---------- main loop ----------
function step(dt) {
  time += dt;
  shared.uTime.value = time;
  input.poll();
  for (const p of [...players]) if (p.dev.gone) leave(p);
  for (const d of input.devices.values()) {
    if (!d.active) continue;
    audio.unlock();
    if (!started) { start(); join(d); d.menu = d.act = d.jump = d.meow = d.swap = false; } else join(d);
  }
  portalCd = Math.max(0, portalCd - dt);

  if (started && !debug.freeze) {
    for (const p of players) {
      if (p.dev.menu && !trans && !sleep.active) menu.toggle();
      if (menu.open) menu.input(p.dev);
    }
    const busy = sleep.active || trans || menu.open;
    const prev = players.map((p) => [p.cat, p.cat.pos.x, p.cat.pos.z]);
    for (const p of players) {
      p.idle = p.dev.active ? 0 : p.idle + dt;
      // with two players, a cat left alone for a while tags along by itself
      p.human = !(players.length === 2 && p.idle > 40 && (!p.human || p.cat.state === 'free'));
      if (!busy && p.dev.swap) swap(p);
    }
    if (!busy) {
      for (const p of players) if (p.human) control(p, dt);
      // one shared screen: two players can't wander further apart than the camera can show
      const hs = players.filter((p) => p.human);
      if (hs.length === 2 && !region().indoor) {
        const [a, b] = hs.map((p) => p.cat);
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const r = Math.abs(dx * RIGHT.x + dz * RIGHT.z), u = Math.abs(dx * AWAY.x + dz * AWAY.z);
        if (r > pixel.view.x / 18 - 6.5 || u > (pixel.view.y / 18 - 5.5) * 2) {
          for (const [c, x, z] of prev) {
            const o = c === a ? b : a;
            if (c.state !== 'ride' && Math.hypot(c.pos.x - o.pos.x, c.pos.z - o.pos.z) > Math.hypot(x - o.pos.x, z - o.pos.z)) { c.pos.x = x; c.pos.z = z; }
          }
        }
      }
      cats.forEach((c, i) => {
        c.useLatch = isHuman(c) || c.driven;
        if (!isHuman(c) && !c.driven && players.length) ai(c, dt, i);
        c.driven = false;
      });
      // walking into a doorway takes the whole family through
      if (!portalCd) {
        for (const p of players) {
          if (!p.human) continue;
          const c = p.cat.state === 'ride' ? p.cat.mount : p.cat;
          if (c.state !== 'free' || !c.grounded) continue;
          const portal = findPortal(c);
          if (portal) { trans = { phase: 'close', t: 0, portal, lead: c }; audio.play(portal.sound, { vol: 0.7 }); break; }
        }
      }
    }
    updateSleep(dt);
    if (!sleep.active) day.advance(dt);
  }
  updateTransition(dt);

  for (const k of mama.riders) k.mount.riderAnchors[mama.riders.indexOf(k) % 4].getWorldPosition(k.pos);

  // every cat leaves a trail of footsteps for whoever is following it
  for (const c of cats) {
    const last = c.trail[c.trail.length - 1];
    if (c.state === 'free' && c.grounded && (!last || Math.hypot(last.x - c.pos.x, last.z - c.pos.z) > 0.4 || Math.abs(last.y - c.pos.y) > 0.3)) {
      c.trail.push({ x: c.pos.x, y: c.pos.y, z: c.pos.z });
      c.trailN++;
      if (c.trail.length > 60) c.trail.shift();
    }
  }

  for (const c of cats) {
    if (c.state === 'eat') {
      c.eatT -= dt;
      if (c.eatT <= 0) { c.setState('free'); fx.hearts(headPos(c), 2); }
    }
    for (const e of c.events) {
      if (e === 'jump') { audio.play('hop', { vol: 0.35, rate: c.isKitten ? 1.3 : 1 }); if (isHuman(c)) say(c, 'hop', 4); }
      else if (e === 'thump') { fx.poof(c.pos.clone(), 5); audio.play(region().indoor ? 'thump' : 'hop', { vol: 0.5 }); }
      else if (e === 'boing') { audio.play('boing', { vol: 0.5, rate: c.isKitten ? 1.25 : 1 }); say(c, 'boing', 3); }
      else if ((e === 'climb' || e === 'top') && c === mama && mama.climbBox) {
        // mama is going up something the kittens can't manage: they hop on
        for (const k of cats) {
          if (k.isKitten && !isHuman(k) && k.state === 'free' && flat(mama, k) < 4.5 && mama.climbBox.y1 - k.pos.y > k.climbMax) { fx.poof(k.pos.clone(), 4); mount(k); }
        }
      }
    }
    c.events.length = 0;
    const wet = c.state === 'free' && world.inPond(c.pos.x, c.pos.y, c.pos.z);
    if (wet && !c.wet) { audio.play('splash', { vol: 0.5 }); say(c, 'splash', 4); }
    if (wet && Math.hypot(c.vx, c.vz) > 0.5 && (c.rippleT = (c.rippleT || 0) - dt) <= 0) { c.rippleT = 0.35; fx.ripple(c.pos); }
    c.wet = wet;
    c.animate(dt, time);
  }

  for (const p of players) {
    if (players.length === 2) p.dot.show = Math.max(p.dot.show, 0.3);
    p.dot.pos.copy(headPos(p.cat));
    p.dot.pos.y -= 0.12;
  }

  world.update(dt, time, cats, day.night);
  fx.update(dt);
  updateCamera(dt);
  updateWeather(dt);
  day.apply(region(), cam.target, weather.rain);
  labels.update(dt, pixel);
  updateAudio(dt);
}

const render = () => pixel.render(scene, time);
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  step(dt);
  render();
  requestAnimationFrame(frame);
}
pixel.resize();
if (CAPTURE) { step(1 / 60); render(); } else requestAnimationFrame(frame);

// handy for poking at things from the console, for tests and for filming the trailer
window.game = { weather, snap: () => { camSnap = true; }, join, debug, cats, mama, players, input, world, day, sleep, step, render, pixel, scene, audio, labels, fx, menu, save, cam, mount, dismount, start, arrive, V, get time() { return time; }, get trans() { return trans; } };
