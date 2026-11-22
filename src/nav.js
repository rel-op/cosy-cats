// Route-finding for tap-to-go: a walkable grid per place and per size of cat, searched with A*.
const CELL = 0.4;

export class Nav {
  constructor(world) {
    this.world = world;
    this.grids = new Map();
  }

  grid(regionId, cat) {
    const key = regionId + (cat.isKitten ? ':k' : ':m');
    let g = this.grids.get(key);
    if (g) return g;
    const b = this.world.regions[regionId].bounds;
    const w = Math.ceil((b.x1 - b.x0) / CELL) + 1, h = Math.ceil((b.z1 - b.z0) / CELL) + 1;
    const floor = new Float32Array(w * h), walk = new Uint8Array(w * h).fill(1);
    const cols = this.world.colliders.filter((c) => c.x1 > b.x0 - 1 && c.x0 < b.x1 + 1 && c.z1 > b.z0 - 1 && c.z0 < b.z1 + 1);
    const span = (lo, hi, o, n) => [Math.max(0, Math.ceil((lo - o) / CELL)), Math.min(n - 1, Math.floor((hi - o) / CELL))];
    // low things a cat simply steps onto raise the floor
    for (const c of cols) {
      if (c.y1 > cat.step + 0.01 || c.y0 > 0.3) continue;
      const [i0, i1] = span(c.x0, c.x1, b.x0, w), [j0, j1] = span(c.z0, c.z1, b.z0, h);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) floor[j * w + i] = Math.max(floor[j * w + i], c.y1);
    }
    const pad = cat.radius + 0.06;
    for (const c of cols) {
      const [i0, i1] = span(c.x0 - pad, c.x1 + pad, b.x0, w), [j0, j1] = span(c.z0 - pad, c.z1 + pad, b.z0, h);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const f = floor[j * w + i];
        if (c.y0 < f + cat.height && c.y1 > f + cat.step + 0.01) walk[j * w + i] = 0;
      }
    }
    g = { w, h, x0: b.x0, z0: b.z0, walk };
    this.grids.set(key, g);
    return g;
  }

  cell(g, x, z) {
    const i = Math.max(0, Math.min(g.w - 1, Math.round((x - g.x0) / CELL))), j = Math.max(0, Math.min(g.h - 1, Math.round((z - g.z0) / CELL)));
    return j * g.w + i;
  }
  point(g, n) { return { x: g.x0 + (n % g.w) * CELL, z: g.z0 + Math.floor(n / g.w) * CELL }; }
  free(regionId, cat, x, z) { const g = this.grid(regionId, cat); return !!g.walk[this.cell(g, x, z)]; }

  // nearest walkable cell to a point, searching outwards
  nearest(g, x, z, max = 8) {
    const n0 = this.cell(g, x, z);
    if (g.walk[n0]) return n0;
    const i0 = n0 % g.w, j0 = Math.floor(n0 / g.w);
    let best = -1, bd = 1e9;
    for (let r = 1; r <= max && best < 0; r++) {
      for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) {
        if (i < 0 || j < 0 || i >= g.w || j >= g.h || (Math.abs(i - i0) !== r && Math.abs(j - j0) !== r)) continue;
        if (!g.walk[j * g.w + i]) continue;
        const d = (i - i0) ** 2 + (j - j0) ** 2;
        if (d < bd) { bd = d; best = j * g.w + i; }
      }
    }
    return best;
  }

  los(g, a, b) {
    const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / 0.2);
    for (let k = 1; k < n; k++) if (!g.walk[this.cell(g, a.x + ((b.x - a.x) * k) / n, a.z + ((b.z - a.z) * k) / n)]) return false;
    return true;
  }

  // Returns { pts: [{x, z}...], cost } from one point to another, or null if there is no way.
  path(regionId, cat, from, to) {
    const g = this.grid(regionId, cat);
    const start = this.nearest(g, from.x, from.z), goal = this.nearest(g, to.x, to.z);
    if (start < 0 || goal < 0) return null;
    const N = g.w * g.h;
    const cost = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const gi = goal % g.w, gj = Math.floor(goal / g.w);
    const heur = (n) => { const dx = Math.abs((n % g.w) - gi), dz = Math.abs(Math.floor(n / g.w) - gj); return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz); };
    const heap = [], hf = [];
    const push = (n, f) => { let i = heap.length; heap.push(n); hf.push(f); while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; heap[i] = heap[p]; hf[i] = hf[p]; i = p; } heap[i] = n; hf[i] = f; };
    const pop = () => {
      const top = heap[0], n = heap.pop(), f = hf.pop();
      if (heap.length) { let i = 0; for (;;) { let c = i * 2 + 1; if (c >= heap.length) break; if (c + 1 < heap.length && hf[c + 1] < hf[c]) c++; if (hf[c] >= f) break; heap[i] = heap[c]; hf[i] = hf[c]; i = c; } heap[i] = n; hf[i] = f; }
      return top;
    };
    cost[start] = 0;
    push(start, heur(start));
    let found = false;
    while (heap.length) {
      const n = pop();
      if (closed[n]) continue;
      closed[n] = 1;
      if (n === goal) { found = true; break; }
      const i = n % g.w, j = Math.floor(n / g.w);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= g.w || nj >= g.h) continue;
        const m = nj * g.w + ni;
        if (!g.walk[m] || closed[m]) continue;
        if (di && dj && (!g.walk[j * g.w + ni] || !g.walk[nj * g.w + i])) continue; // no cutting corners
        const c = cost[n] + (di && dj ? 1.4142 : 1);
        if (c < cost[m]) { cost[m] = c; prev[m] = n; push(m, c + heur(m)); }
      }
    }
    if (!found) return null;
    const raw = [];
    for (let n = goal; n >= 0; n = prev[n]) raw.push(this.point(g, n));
    raw.reverse();
    // if the real target is walkable, finish exactly there rather than at the cell centre
    if (g.walk[this.cell(g, to.x, to.z)]) raw.push({ x: to.x, z: to.z });
    // pull the path straight wherever there is a clear line
    const pts = [];
    let a = { x: from.x, z: from.z }, k = 0;
    while (k < raw.length) {
      let far = k;
      for (let t = raw.length - 1; t > k; t--) if (this.los(g, a, raw[t])) { far = t; break; }
      pts.push(raw[far]);
      a = raw[far];
      k = far + 1;
    }
    return { pts, cost: cost[goal] * CELL };
  }
}
