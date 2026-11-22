import * as THREE from 'three';

// Time of day runs 0 (morning) to 1 (night) and then waits there until the cats sleep.
const KEYS = [
  { t: 0.0, sun: '#ffe6bd', sunI: 2.5, sky: '#d6ebff', gnd: '#b5cf92', hemiI: 1.2, top: '#9fd4ee', bot: '#fdeccb', pos: [8, 11, 9] },
  { t: 0.4, sun: '#fff8ea', sunI: 2.9, sky: '#e0f1ff', gnd: '#bcd79b', hemiI: 1.3, top: '#8ccdf2', bot: '#e6f5fb', pos: [4, 16, 9] },
  { t: 0.78, sun: '#ffab66', sunI: 2.5, sky: '#ffc9a6', gnd: '#a38c70', hemiI: 1.0, top: '#8a7cc0', bot: '#ffc48a', pos: [-9, 6, 9] },
  { t: 1.0, sun: '#a9bdff', sunI: 1.7, sky: '#6f82d6', gnd: '#3a4470', hemiI: 1.5, top: '#0f1533', bot: '#34407a', pos: [7, 13, 6] },
];
for (const k of KEYS) {
  for (const f of ['sun', 'sky', 'gnd', 'top', 'bot']) k[f] = new THREE.Color(k[f]);
  k.pos = new THREE.Vector3(...k.pos);
}

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class DayNight {
  constructor(scene, world) {
    this.t = 0.05;
    this.length = 600; // seconds from morning to night
    this.night = 0;
    this.world = world;

    this.sun = new THREE.DirectionalLight('#ffffff', 2.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -19; sc.right = 19; sc.top = 19; sc.bottom = -19; sc.near = 1; sc.far = 80;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 5;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 1);
    scene.add(this.hemi);

    this.stars = document.getElementById('stars');
    this.drawStars();
    addEventListener('resize', () => this.drawStars());
    this.c = new THREE.Color();
    this.apply();
  }

  drawStars() {
    const cv = this.stars;
    cv.width = innerWidth;
    cv.height = innerHeight;
    const g = cv.getContext('2d');
    let s = 5;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 160; i++) {
      g.globalAlpha = 0.35 + r() * 0.65;
      g.fillStyle = '#fffbe6';
      g.beginPath();
      g.arc(r() * cv.width, r() * cv.height, 0.6 + r() * 1.7, 0, 7);
      g.fill();
    }
  }

  advance(dt) {
    this.t = Math.min(1, this.t + dt / this.length);
    this.apply();
  }

  set(t) {
    this.t = Math.max(0, Math.min(1, t));
    this.apply();
  }

  apply() {
    const t = this.t;
    let i = 0;
    while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const f = smooth(a.t, b.t, t);
    this.sun.color.copy(a.sun).lerp(b.sun, f);
    this.sun.intensity = a.sunI + (b.sunI - a.sunI) * f;
    this.sun.position.copy(a.pos).lerp(b.pos, f).multiplyScalar(2.4);
    this.hemi.color.copy(a.sky).lerp(b.sky, f);
    this.hemi.groundColor.copy(a.gnd).lerp(b.gnd, f);
    this.hemi.intensity = a.hemiI + (b.hemiI - a.hemiI) * f;
    const st = document.documentElement.style;
    st.setProperty('--sky-top', '#' + this.c.copy(a.top).lerp(b.top, f).getHexString());
    st.setProperty('--sky-bot', '#' + this.c.copy(a.bot).lerp(b.bot, f).getHexString());

    const n = (this.night = smooth(0.8, 1, t));
    this.stars.style.opacity = n;
    const lit = smooth(0.66, 0.9, t);
    for (const g of this.world.glow) g.mat.emissiveIntensity = g.max * lit;
    this.world.lampLight.intensity = 14 * lit;
  }
}
