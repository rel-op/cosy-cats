import * as THREE from 'three';
import { shared } from './build.js';

// Time of day runs 0 (morning) to 1 (night) and then waits there until the cats sleep.
const KEYS = [
  { t: 0.0, sun: '#ffdca6', sunI: 2.7, sky: '#b9cdfa', gnd: '#a9c486', hemiI: 0.92, top: '#8fc7e6', bot: '#fbe6c0', pos: [-7.5, 6.2, 7], warm: 0.5 },
  { t: 0.4, sun: '#fff4dc', sunI: 2.75, sky: '#c9dcff', gnd: '#b4d193', hemiI: 1.0, top: '#6fb8d6', bot: '#d9f0f2', pos: [-3, 12, 6.5], warm: 0.1 },
  { t: 0.78, sun: '#ff9a4d', sunI: 2.7, sky: '#c9b0f2', gnd: '#8f6f5c', hemiI: 0.78, top: '#6f5fa0', bot: '#ffb066', pos: [9, 3.6, 5.5], warm: 0.9 },
  { t: 1.0, sun: '#93a9ff', sunI: 1.4, sky: '#5870d6', gnd: '#2a3360', hemiI: 1.2, top: '#0d1730', bot: '#2b3a6e', pos: [-5, 10, 7], warm: 0 },
];
for (const k of KEYS) {
  for (const f of ['sun', 'sky', 'gnd', 'top', 'bot']) k[f] = new THREE.Color(k[f]);
  k.pos = new THREE.Vector3(...k.pos).normalize();
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class DayNight {
  constructor(scene, world, pixel) {
    this.t = 0.05;
    this.length = 600; // seconds from morning to night
    this.night = 0;
    this.world = world;
    this.pixel = pixel;
    this.sun = new THREE.DirectionalLight('#ffffff', 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 140;
    sc.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 1);
    scene.add(this.hemi);
    this.dir = new THREE.Vector3(0.5, 0.7, 0.5);
    this.c = new THREE.Color();
    this.c2 = new THREE.Color();
    this.sky = new THREE.Color();
  }

  advance(dt) { this.t = Math.min(1, this.t + dt / this.length); }
  set(t) { this.t = Math.max(0, Math.min(1, t)); }

  // call every frame with the current region and the point the camera is looking at
  apply(region, focus, rain = 0) {
    const t = this.t;
    let i = 0;
    while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
    const a = KEYS[i], b = KEYS[i + 1], f = smooth(a.t, b.t, t);
    const n = (this.night = smooth(0.8, 1, t));
    const lit = smooth(0.66, 0.9, t);
    const u = this.pixel.uniforms;
    this.sky.copy(a.top).lerp(b.top, f).lerp(this.c.copy(a.bot).lerp(b.bot, f), 0.45);
    this.world.skyMat.color.copy(this.sky);
    this.world.beamMat.opacity = 0.3 * (1 - n) * (1 - smooth(0.6, 0.8, t) * 0.4);
    this.world.setLit(lit);
    // keep shadows steady by moving the light in whole steps
    const fx = Math.round(focus.x * 2) / 2, fz = Math.round(focus.z * 2) / 2;
    this.sun.target.position.set(fx, 0, fz);
    if (!region.indoor) {
      this.sun.color.copy(a.sun).lerp(b.sun, f);
      this.sun.intensity = (a.sunI + (b.sunI - a.sunI) * f) * (1 - 0.45 * rain);
      this.dir.copy(a.pos).lerp(b.pos, f).normalize();
      this.hemi.color.copy(a.sky).lerp(b.sky, f);
      this.hemi.groundColor.copy(a.gnd).lerp(b.gnd, f);
      this.hemi.intensity = a.hemiI + (b.hemiI - a.hemiI) * f;
      u.uSkyTop.value.copy(a.top).lerp(b.top, f);
      u.uSkyBot.value.copy(a.bot).lerp(b.bot, f);
      u.uIndoor.value = 0;
      u.uNight.value = n;
      u.uWarm.value = (a.warm + (b.warm - a.warm) * f) * 0.5 * (1 - rain);
      shared.uCloud.value = (1 - n * 0.7) * (1 - rain);
      shared.uDay.value = 1 - n;
    } else {
      const L = region.light;
      const dusk = smooth(0.6, 0.8, t) * (1 - n);
      this.sun.color.set(L.sun[0]).lerp(this.c.set('#ffb070'), dusk * 0.5);
      this.sun.intensity = L.sun[1] + (L.sun[2] - L.sun[1]) * n;
      this.dir.set(0.35, 0.86, 0.42).normalize();
      this.hemi.color.set(L.hemi[0]).lerp(this.c.set('#8f9ae0'), n * 0.45);
      this.hemi.groundColor.set(L.hemi[1]);
      this.hemi.intensity = L.hemi[2] + (L.hemi[3] - L.hemi[2]) * n;
      u.uSkyTop.value.set(L.bg[0]);
      u.uSkyBot.value.set(L.bg[1]);
      u.uIndoor.value = 1;
      u.uNight.value = 0;
      u.uWarm.value = 0.25;
      shared.uCloud.value = 0;
      shared.uDay.value = 1 - n;
    }
    this.sun.position.copy(this.sun.target.position).addScaledVector(this.dir, 60);
  }
}
