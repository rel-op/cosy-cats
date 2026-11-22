import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Shared materials and a builder that bakes static scenery into a few merged meshes.

export const shared = { uTime: { value: 0 }, uCloud: { value: 1 }, uDay: { value: 1 } };

// stepped light ramp for toon shading
const rampData = new Uint8Array([0, 0, 38, 132, 214, 255].flatMap((v) => [v, v, v, 255]));
export const RAMP = new THREE.DataTexture(rampData, 6, 1, THREE.RGBAFormat);
RAMP.minFilter = RAMP.magFilter = THREE.NearestFilter;
RAMP.needsUpdate = true;

const NOISE = /* glsl */ `
float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}`;

// Every toon material gets the same extras: a hand-painted mottling stuck to the surface,
// drifting cloud shadows outdoors, and (optionally) wind sway or water sparkle.
//   tex: how strong the mottling is (lawns high, cats none)
function enhance(mat, { tex = 0.35, kind = 'plain' } = {}) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shared.uTime;
    shader.uniforms.uCloud = shared.uCloud;
    shader.uniforms.uDay = shared.uDay;
    shader.uniforms.uTex = { value: tex };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float uTime;\nvarying vec3 vWPos;\nvarying vec3 vWNormal;\n${kind === 'sway' ? 'attribute float aSway;' : ''}`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        ${kind === 'sway' ? `
        float swayPhase = position.x * 0.7 + position.z * 0.45;
        float gust = sin(uTime * 0.35 + position.x * 0.08) * 0.5 + 0.8;
        transformed.x += sin(uTime * 1.5 + swayPhase) * 0.06 * aSway * gust;
        transformed.z += cos(uTime * 1.2 + swayPhase * 1.3) * 0.045 * aSway * gust;` : ''}
        vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWNormal = normalize(mat3(modelMatrix) * objectNormal);`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform float uCloud;\nuniform float uDay;\nuniform float uTex;\nvarying vec3 vWPos;\nvarying vec3 vWNormal;\n${NOISE}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          vec3 wn = abs(vWNormal);
          vec2 guv = wn.y > 0.6 ? vWPos.xz : (wn.x > wn.z ? vWPos.zy : vWPos.xy);
          float blot = floor((vnoise(guv * 0.5) * 0.6 + vnoise(guv * 1.6 + 7.3) * 0.4) * 5.0) / 5.0 - 0.4;
          float sp = hash21(floor(guv * 6.5));
          float speck = (sp > 0.9 ? 0.08 : 0.0) - (sp < 0.12 ? 0.07 : 0.0);
          diffuseColor.rgb *= 1.0 + (blot * 0.3 + speck) * uTex;
          if (uTex > 0.9 && wn.y > 0.6) {
            // lawns: bigger patches of lighter and deeper green, and mown stripes in the tidy gardens
            float big = vnoise(guv * 0.21 + 3.1);
            diffuseColor.rgb *= 0.9 + 0.22 * floor(big * 4.0) / 4.0;
            float tidy = step(abs(vWPos.x + 12.0), 23.6) * step(vWPos.z, 11.4) * step(-10.9, vWPos.z);
            diffuseColor.rgb *= 1.0 + 0.055 * tidy * (step(0.5, fract((vWPos.x + vWPos.z) / 2.6)) - 0.5);
          }
          diffuseColor.rgb += vec3(0.035, 0.02, -0.03) * blot * uTex;
          ${kind === 'water' ? `
          float wv = sin(vWPos.x * 3.1 + vWPos.z * 2.3 + uTime * 1.3) * 0.5 + 0.5;
          float wv2 = sin(vWPos.x * 1.3 - vWPos.z * 3.7 + uTime * 0.9) * 0.5 + 0.5;
          diffuseColor.rgb += vec3(0.06, 0.09, 0.1) * step(0.7, wv * wv2 + wv * 0.35);
          diffuseColor.rgb -= vec3(0.04, 0.03, 0.0) * step(0.78, (1.0 - wv) * wv2);
          float spk = step(0.988, hash21(floor(vWPos.xz * 10.0) + floor(uTime * 3.0)));
          diffuseColor.rgb += vec3(0.6) * spk * (0.25 + 0.75 * uDay);` : ''}
          float cl = vnoise(vWPos.xz * 0.05 + uTime * vec2(0.022, 0.012)) * 0.65 + vnoise(vWPos.xz * 0.13 - uTime * 0.015) * 0.35;
          diffuseColor.rgb *= 1.0 - 0.2 * smoothstep(0.5, 0.57, cl) * uCloud;
        }`
      );
  };
  mat.customProgramCacheKey = () => 'cosy-' + kind;
  return mat;
}

export const toon = (color, o = {}, extra) => enhance(new THREE.MeshToonMaterial({ color, gradientMap: RAMP, ...o }), extra);
// cats and other characters: no mottling
export const fur = (color) => toon(color, {}, { tex: 0 });

export const solidMat = toon('#ffffff', { vertexColors: true }, { tex: 0.42 });
export const groundMat = toon('#ffffff', { vertexColors: true }, { tex: 1.0 });
export const swayMat = toon('#ffffff', { vertexColors: true }, { tex: 0.3, kind: 'sway' });
// things that light up at night: colour = vertex colour * glowMat.color
export const glowMat = new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true });
// always-lit version, for lamps and fires indoors
export const litMat = new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true });
export const waterMat = toon('#ffffff', { vertexColors: true, transparent: true, opacity: 0.9 }, { tex: 0, kind: 'water' });

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
const geoCache = new Map();
const cached = (key, make) => {
  if (!geoCache.has(key)) geoCache.set(key, make().toNonIndexed());
  return geoCache.get(key);
};
const tmpColor = new THREE.Color();
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();

export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// lighten/darken a hex colour a little
export function tint(hex, amt) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)));
  return '#' + c.getHexString();
}

export class Builder {
  // ox, oz: where this area sits in the world. Everything is authored in local coordinates.
  constructor(world, group, ox = 0, oz = 0, oy = 0) {
    this.world = world;
    this.group = group;
    this.ox = ox;
    this.oz = oz;
    this.oy = oy;
    this.layers = { solid: [], ground: [], sway: [], grass: [], glow: [], lit: [], water: [] };
  }

  // ---- raw geometry ----
  geo(geometry, color, matrix, { layer = 'solid', sway = 0 } = {}) {
    const g = geometry.clone();
    g.applyMatrix4(matrix);
    g.deleteAttribute('uv');
    const n = g.attributes.position.count;
    tmpColor.set(color);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = tmpColor.r; col[i * 3 + 1] = tmpColor.g; col[i * 3 + 2] = tmpColor.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (layer === 'sway' || layer === 'grass') {
      g.computeBoundingBox();
      const y0 = g.boundingBox.min.y, h = Math.max(0.001, g.boundingBox.max.y - y0);
      const s = new Float32Array(n);
      const p = g.attributes.position;
      for (let i = 0; i < n; i++) s[i] = sway * Math.min(1, (p.getY(i) - y0) / h + 0.25);
      g.setAttribute('aSway', new THREE.BufferAttribute(s, 1));
    }
    this.layers[layer].push(g);
  }

  mat(x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    tmpQ.setFromEuler(tmpE.set(rx, ry, rz));
    return tmpM.compose(new THREE.Vector3(x + this.ox, y + this.oy, z + this.oz), tmpQ, new THREE.Vector3(sx, sy, sz));
  }

  box(x0, x1, y0, y1, z0, z1, color, { r = 0, layer, rot } = {}) {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    const [rx, ry, rz] = rot || [0, 0, 0];
    if (r > 0) {
      const rad = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
      const g = new RoundedBoxGeometry(w, h, d, 2, rad).toNonIndexed();
      this.geo(g, color, this.mat(cx, cy, cz, 1, 1, 1, rx, ry, rz), { layer });
    } else {
      this.geo(UNIT_BOX, color, this.mat(cx, cy, cz, w, h, d, rx, ry, rz), { layer });
    }
  }

  // a box you can't walk through (and, unless told otherwise, can climb)
  solid(x0, x1, y0, y1, z0, z1, { climb = true } = {}) {
    const c = { x0: x0 + this.ox, x1: x1 + this.ox, y0: y0 + this.oy, y1: y1 + this.oy, z0: z0 + this.oz, z1: z1 + this.oz, climb };
    this.world.colliders.push(c);
    return c;
  }

  block(x0, x1, y0, y1, z0, z1, color, o = {}) {
    this.box(x0, x1, y0, y1, z0, z1, color, o);
    return this.solid(x0, x1, y0, y1, z0, z1, o);
  }

  cyl(x, y0, y1, z, rTop, rBot, color, { seg = 10, layer, rot } = {}) {
    const g = cached('cyl' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg));
    // unit cylinder has equal radii; taper by building a specific one when needed
    const geo = rTop === rBot ? g : cached(`cyl${seg}:${(rTop / rBot).toFixed(3)}`, () => new THREE.CylinderGeometry(rTop / rBot, 1, 1, seg));
    const [rx, ry, rz] = rot || [0, 0, 0];
    this.geo(geo, color, this.mat(x, (y0 + y1) / 2, z, rBot, y1 - y0, rBot, rx, ry, rz), { layer });
  }

  cone(x, y0, y1, z, r, color, { seg = 8, layer, sway = 0 } = {}) {
    const g = cached('cone' + seg, () => new THREE.ConeGeometry(1, 1, seg));
    this.geo(g, color, this.mat(x, (y0 + y1) / 2, z, r, y1 - y0, r), { layer, sway });
  }

  ball(x, y, z, r, color, { sx = 1, sy = 1, sz = 1, layer, sway = 0, seg = 10, rot } = {}) {
    const g = cached('ball' + seg, () => new THREE.SphereGeometry(1, seg, Math.max(5, Math.round(seg * 0.7))));
    const [rx, ry, rz] = rot || [0, 0, 0];
    this.geo(g, color, this.mat(x, y, z, r * sx, r * sy, r * sz, rx, ry, rz), { layer, sway });
  }

  // flat disc lying on the ground
  disc(x, y, z, r, color, { seg = 20, layer, sx = 1, sz = 1 } = {}) {
    const g = cached('disc' + seg, () => new THREE.CircleGeometry(1, seg).rotateX(-Math.PI / 2));
    this.geo(g, color, this.mat(x, y, z, r * sx, 1, r * sz), { layer });
  }

  // a cylinder lying on its side, centred at (x, y, z)
  lying(x, y, z, len, r, color, axis = 'x', { seg = 9, layer } = {}) {
    const g = cached('cyl' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg));
    this.geo(g, color, this.mat(x, y, z, r, len, r, axis === 'z' ? Math.PI / 2 : 0, 0, axis === 'x' ? Math.PI / 2 : 0), { layer });
  }

  // a beam between two points
  beam(a, b, r, color, { seg = 6, layer } = {}) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
    const len = from.distanceTo(to);
    const g = cached('cyl' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg));
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(this.ox, this.oy, this.oz));
    this.geo(g, color, new THREE.Matrix4().compose(mid, q, new THREE.Vector3(r, len, r)), { layer });
  }

  // a moving or special object: positioned in local coordinates, added as its own mesh
  dyn(obj, x = 0, y = 0, z = 0) {
    obj.position.set(x + this.ox, y + this.oy, z + this.oz);
    this.group.add(obj);
    return obj;
  }

  // world-space point from local
  p(x, y, z) { return new THREE.Vector3(x + this.ox, y + this.oy, z + this.oz); }

  finish() {
    const mats = { solid: solidMat, ground: groundMat, sway: swayMat, grass: swayMat, glow: glowMat, lit: litMat, water: waterMat };
    for (const [name, list] of Object.entries(this.layers)) {
      if (!list.length) continue;
      const merged = mergeGeometries(list, false);
      for (const g of list) g.dispose();
      const mesh = new THREE.Mesh(merged, mats[name]);
      mesh.castShadow = name === 'solid' || name === 'sway';
      if (name === 'ground') mesh.receiveShadow = true;
      mesh.receiveShadow = name !== 'glow' && name !== 'lit';
      if (name === 'water') { mesh.castShadow = false; mesh.renderOrder = 1; }
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
      this.layers[name] = [];
    }
  }
}
