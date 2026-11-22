import * as THREE from 'three';

// Renders the 3D scene at low resolution and finishes it as pixel art:
// depth-based outlines and edge highlights, a dithered limited palette, pixel sky, iris wipes.
// The camera is snapped to the texel grid so the still world never shimmers; the leftover
// sub-texel offset is applied by sliding the (slightly oversized) canvas with CSS.

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uRes;
uniform float uRange;
uniform vec3 uSkyTop;
uniform vec3 uSkyBot;
uniform float uNight;
uniform float uTime;
uniform float uFade;
uniform vec3 uFadeColor;
uniform vec3 uIris;
uniform vec2 uScroll;
uniform float uIndoor;
uniform float uLevels;
uniform float uWarm;
uniform float uRain;
varying vec2 vUv;

float D(vec2 o) { return texture2D(tDepth, vUv + o / uRes).x * uRange; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float bayer(vec2 p) {
  vec2 a = floor(mod(p, 4.0));
  float i = a.x + a.y * 4.0;
  float v = 0.0;
  if (i < 0.5) v = 0.0; else if (i < 1.5) v = 8.0; else if (i < 2.5) v = 2.0; else if (i < 3.5) v = 10.0;
  else if (i < 4.5) v = 12.0; else if (i < 5.5) v = 4.0; else if (i < 6.5) v = 14.0; else if (i < 7.5) v = 6.0;
  else if (i < 8.5) v = 3.0; else if (i < 9.5) v = 11.0; else if (i < 10.5) v = 1.0; else if (i < 11.5) v = 9.0;
  else if (i < 12.5) v = 15.0; else if (i < 13.5) v = 7.0; else if (i < 14.5) v = 13.0; else v = 5.0;
  return (v + 0.5) / 16.0;
}
vec3 toSRGB(vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
vec3 texel(vec2 o) {
  vec3 c = toSRGB(texture2D(tColor, vUv + o / uRes).rgb);
  // soft shoulder so bright light rolls off instead of clipping to flat yellow
  vec3 over = max(c - 0.78, 0.0);
  return min(c, 0.78) + (1.0 - exp(-over * 2.2)) * 0.2;
}
vec3 bright(vec2 o) { vec3 c = texel(o); float l = max(c.r, max(c.g, c.b)); return c * smoothstep(0.8, 0.97, l); }

void main() {
  vec2 px = floor(vUv * uRes);
  float raw = texture2D(tDepth, vUv).x;
  vec3 col;
  float levels = uLevels;
  if (raw >= 0.9999) {
    // sky: a dithered gradient with drifting clouds by day and stars by night
    float g = vUv.y;
    col = toSRGB(mix(uSkyBot, uSkyTop, smoothstep(0.0, 1.0, g)));
    vec2 sp = px + floor(uScroll * 0.25);
    vec2 cp = (px + uScroll * 0.5) / vec2(46.0, 20.0) + vec2(uTime * 0.012, 0.0);
    float cloud = vnoise(cp) * 0.6 + vnoise(cp * 2.3 + 4.0) * 0.4;
    float puff = smoothstep(0.56, 0.6, cloud) * 0.55 + smoothstep(0.64, 0.68, cloud) * 0.45;
    col = mix(col, mix(col, vec3(1.0, 0.98, 0.95), 0.75 - 0.5 * uNight), puff * (1.0 - uIndoor) * (0.9 - 0.6 * uNight));
    float star = step(0.9965, hash(sp));
    float tw = 0.6 + 0.4 * sin(uTime * 2.0 + hash(sp + 3.0) * 40.0);
    col += vec3(1.0, 0.96, 0.82) * star * tw * uNight * (1.0 - uIndoor) * (1.0 - puff);
    levels = 18.0;
  } else {
    col = texel(vec2(0.0));
    float d = raw * uRange;
    float dl = D(vec2(-1.0, 0.0)), dr = D(vec2(1.0, 0.0)), du = D(vec2(0.0, 1.0)), dd = D(vec2(0.0, -1.0));
    float outer = clamp(dl - d, 0.0, 1.0) + clamp(dr - d, 0.0, 1.0) + clamp(du - d, 0.0, 1.0) + clamp(dd - d, 0.0, 1.0);
    float edge = smoothstep(0.45, 0.62, outer);
    float nearer = max(max(d - dl, d - dr), max(d - du, d - dd));
    float lap = dl + dr + du + dd - 4.0 * d;
    float flatish = 1.0 - step(0.2, nearer);
    float hi = smoothstep(0.035, 0.07, lap) * (1.0 - edge) * flatish;
    float lo = smoothstep(0.035, 0.07, -lap) * (1.0 - edge) * flatish;
    // soft contact shading: darken where nearby things stand in front
    float occ = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7854;
      vec2 o = vec2(cos(a), sin(a)) * (i - (i / 2) * 2 == 0 ? 3.0 : 5.0);
      occ += clamp(d - D(o) - 0.12, 0.0, 0.9);
    }
    col *= 1.0 - min(0.34, occ * 0.075);
    col = mix(col, col * vec3(0.42, 0.34, 0.5), edge * 0.82);
    col *= 1.0 + 0.24 * hi;
    col *= 1.0 - 0.16 * lo;
  }
  // glow around anything bright: windows, lamps, fire, sunlit white
  vec3 bloom = vec3(0.0);
  bloom += bright(vec2(2.0, 0.0)) + bright(vec2(-2.0, 0.0)) + bright(vec2(0.0, 2.0)) + bright(vec2(0.0, -2.0));
  bloom += (bright(vec2(3.0, 3.0)) + bright(vec2(-3.0, 3.0)) + bright(vec2(3.0, -3.0)) + bright(vec2(-3.0, -3.0))) * 0.8;
  bloom += (bright(vec2(6.0, 0.0)) + bright(vec2(-6.0, 0.0)) + bright(vec2(0.0, 5.0)) + bright(vec2(0.0, -5.0))) * 0.5;
  col += bloom * (0.05 + 0.08 * uNight) * (1.0 - 0.5 * uIndoor);
  // rain: slanted streaks over a slightly greyer, cooler world
  if (uRain > 0.0 && uIndoor < 0.5) {
    float l0 = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, mix(vec3(l0), col, 0.72) * vec3(0.86, 0.92, 1.0), uRain * 0.8);
    float cx = floor(px.x + px.y * 0.3);
    float lane = hash(vec2(cx, 7.0));
    float cell = floor((px.y + uTime * (150.0 + lane * 90.0) + lane * 300.0) / 22.0);
    float drop = step(1.0 - 0.05 * uRain, hash(vec2(cx, cell)));
    float along = fract((px.y + uTime * (150.0 + lane * 90.0) + lane * 300.0) / 22.0);
    col += vec3(0.55, 0.62, 0.7) * drop * step(along, 0.42) * 0.42;
  }
  // grade: cool shadows, warm highlights, a little more colour and contrast
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col * vec3(0.93, 0.96, 1.08), col * vec3(1.06, 1.01, 0.93), smoothstep(0.2, 0.75, l));
  col = mix(col, col * vec3(1.08, 0.98, 0.86), uWarm);
  col = mix(vec3(l), col, 1.16);
  col = (col - 0.5) * 1.06 + 0.5;
  // limited palette with ordered dithering
  col = floor(col * levels + bayer(px)) / levels;
  // vignette
  vec2 q = vUv - 0.5;
  col *= 1.0 - dot(q, q) * 0.42;
  // iris wipe
  if (uIris.z >= 0.0) {
    float r = length(px - uIris.xy);
    col *= step(r, uIris.z);
  }
  col = mix(col, uFadeColor, uFade);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export class Pixel {
  constructor(canvas) {
    this.canvas = canvas;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' }));
    r.setPixelRatio(1);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.NoToneMapping;
    r.setClearColor(0x000000, 1);

    this.rt = new THREE.WebGLRenderTarget(4, 4, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.HalfFloatType,
      depthBuffer: true,
    });
    this.rt.depthTexture = new THREE.DepthTexture(4, 4);
    this.rt.depthTexture.minFilter = this.rt.depthTexture.magFilter = THREE.NearestFilter;

    this.uniforms = {
      tColor: { value: this.rt.texture },
      tDepth: { value: this.rt.depthTexture },
      uRes: { value: new THREE.Vector2(4, 4) },
      uRange: { value: 300 },
      uSkyTop: { value: new THREE.Color('#9fd4ee') },
      uSkyBot: { value: new THREE.Color('#fdeccb') },
      uNight: { value: 0 },
      uTime: { value: 0 },
      uFade: { value: 0 },
      uFadeColor: { value: new THREE.Color('#10163a') },
      uIris: { value: new THREE.Vector3(0, 0, -1) },
      uScroll: { value: new THREE.Vector2() },
      uIndoor: { value: 0 },
      uLevels: { value: 40 },
      uWarm: { value: 0 },
      uRain: { value: 0 },
    };
    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms, depthTest: false, depthWrite: false })
    );
    quad.frustumCulled = false;
    this.post = new THREE.Scene();
    this.post.add(quad);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
    this.dir = new THREE.Vector3(1, 0.8165, 1).normalize(); // 30 degrees: ground lines land on a clean 2:1 pixel slope // from target towards camera
    this.right = new THREE.Vector3(1, 0, -1).normalize();
    this.up = new THREE.Vector3().crossVectors(this.right, this.dir.clone().negate()).normalize();
    this.target = new THREE.Vector3();
    this.ppu = 32; // texels per world unit
    this.px = 3; // CSS pixels per texel
    this.low = new THREE.Vector2(4, 4);
    this.view = new THREE.Vector2(4, 4); // visible texels (without the margin)
    this.v = new THREE.Vector3();
    this.forcePx = 0;
    this.resize();
  }

  resize(w = innerWidth, h = innerHeight) {
    w = Math.max(1, w);
    h = Math.max(1, h);
    this.px = this.forcePx || Math.max(2, Math.round(h / 360));
    this.view.set(Math.ceil(w / this.px), Math.ceil(h / this.px));
    this.low.set(this.view.x + 2, this.view.y + 2);
    this.renderer.setSize(this.low.x, this.low.y, false);
    this.rt.setSize(this.low.x, this.low.y);
    this.uniforms.uRes.value.copy(this.low);
    const s = this.canvas.style;
    s.width = this.low.x * this.px + 'px';
    s.height = this.low.y * this.px + 'px';
    this.cssW = w;
    this.cssH = h;
  }

  // world units visible vertically / horizontally at the current zoom
  get viewHeight() { return this.view.y / this.ppu; }
  get viewWidth() { return this.view.x / this.ppu; }

  // Place the camera looking at `target`, snapped to whole texels.
  aim(target, ppu) {
    this.ppu = ppu;
    this.target.copy(target);
    const u = 1 / ppu;
    const a = target.dot(this.right), b = target.dot(this.up);
    const sa = Math.round(a / u) * u, sb = Math.round(b / u) * u;
    const snapped = this.v.copy(target).addScaledVector(this.right, sa - a).addScaledVector(this.up, sb - b);
    const cam = this.camera;
    cam.left = (-this.low.x * u) / 2;
    cam.right = (this.low.x * u) / 2;
    cam.top = (this.low.y * u) / 2;
    cam.bottom = (-this.low.y * u) / 2;
    cam.near = 0.1;
    cam.far = 300;
    cam.position.copy(snapped).addScaledVector(this.dir, 120);
    cam.lookAt(snapped);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    this.uniforms.uRange.value = cam.far - cam.near;
    // slide the canvas by the part of the movement smaller than a texel
    const fx = (a - sa) / u, fy = (b - sb) / u;
    const ox = (this.cssW - this.low.x * this.px) / 2 - fx * this.px;
    const oy = (this.cssH - this.low.y * this.px) / 2 + fy * this.px;
    this.canvas.style.transform = `translate(${ox.toFixed(2)}px, ${oy.toFixed(2)}px)`;
    this.offset = { x: ox, y: oy };
    this.uniforms.uScroll.value.set(sa / u, sb / u);
  }

  // world position -> CSS pixels on screen
  toScreen(pos, out = { x: 0, y: 0 }) {
    this.v.copy(pos).project(this.camera);
    out.x = ((this.v.x + 1) / 2) * this.low.x * this.px + this.offset.x;
    out.y = ((1 - this.v.y) / 2) * this.low.y * this.px + this.offset.y;
    return out;
  }

  // iris wipe centred on a world position; amount 1 = fully open, 0 = closed, null = off
  iris(pos, amount) {
    const u = this.uniforms.uIris.value;
    if (amount === null || amount >= 1) { u.z = -1; return; }
    this.v.copy(pos).project(this.camera);
    u.x = ((this.v.x + 1) / 2) * this.low.x;
    u.y = ((this.v.y + 1) / 2) * this.low.y;
    u.z = Math.max(0, amount) * Math.hypot(this.low.x, this.low.y);
  }

  render(scene, time) {
    this.uniforms.uTime.value = time;
    const r = this.renderer;
    r.setRenderTarget(this.rt);
    r.render(scene, this.camera);
    r.setRenderTarget(null);
    r.render(this.post, this.postCam);
  }
}
