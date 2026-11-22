// Films the trailer: steps the game frame by frame in headless Chrome, saves each frame,
// then builds the soundtrack from the game's own sound log and muxes it with ffmpeg.
//   node tools/trailer.mjs            full 1080p render
//   node tools/trailer.mjs stills     one still per shot only (quick check)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const mode = process.argv[2] || 'full';
const W = 1920, H = 1080;
const out = path.resolve('tools/out');
const frames = path.join(out, 'frames');
fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto('http://localhost:5173/?capture=1&px=4');
await page.waitForFunction(() => window.game, null, { timeout: 15000 });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { document.getElementById('title').style.display = 'none'; });
await page.addScriptTag({ path: path.resolve('tools/director.js') });
const { total, fps } = await page.evaluate(() => { director.begin(); return { total: director.total, fps: director.fps }; });
const n = Math.ceil(total * fps);
console.log(`${n} frames, ${total.toFixed(1)}s`);
const stillAt = new Map();
if (mode === 'stills') {
  const bounds = await page.evaluate(() => director.bounds);
  let k = 1;
  for (const [a, d] of bounds) for (const fr of [0.3, 0.62, 0.94]) stillAt.set(Math.round((a + d * fr) * fps), k++);
  for (const f of fs.readdirSync(out)) if (f.startsWith('still-')) fs.rmSync(path.join(out, f));
}
const t0 = Date.now();
let lastShot = -1;
for (let f = 0; f < n; f++) {
  const shot = await page.evaluate((i) => { director.frame(i); return director.marks.length - 1; }, f);
  if (mode === 'stills') {
    if (stillAt.has(f)) await page.screenshot({ path: path.join(out, `still-${String(stillAt.get(f)).padStart(2, '0')}.png`) });
  } else {
    await page.screenshot({ path: path.join(frames, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95 });
  }
  if (f % 300 === 0) console.log(`frame ${f}/${n} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
const log = await page.evaluate(() => director.log());
fs.writeFileSync(path.join(out, 'soundlog.json'), JSON.stringify(log));
await browser.close();
if (mode === 'stills') process.exit(0);

// ---- soundtrack ----
const A = (name) => path.resolve('public/audio', name + '.mp3');
const inputs = [], filters = [], mix = [];
const add = (file, loop, chain) => {
  const i = inputs.length / (2 + 0);
  inputs.push(...(loop ? ['-stream_loop', '-1'] : []), '-i', file);
  const idx = filters.length;
  filters.push(`[${idx}:a]${chain}[a${idx}]`);
  mix.push(`[a${idx}]`);
};
add(A('music_trailer'), false, `volume=0.85,afade=t=in:st=0:d=1.5,afade=t=out:st=${(log.total - 3).toFixed(2)}:d=3`);
const shots = log.marks.map((m, i) => ({ ...m, end: i + 1 < log.marks.length ? log.marks[i + 1].t : log.total }));
for (const s of shots) {
  for (const [name, vol] of Object.entries(s.loops)) {
    if (vol < 0.03 || !fs.existsSync(A(name))) continue;
    const d = s.end - s.t;
    add(A(name), true, `atrim=0:${d.toFixed(2)},volume=${(vol * 0.9).toFixed(2)},afade=t=in:st=0:d=0.4,afade=t=out:st=${(d - 0.4).toFixed(2)}:d=0.4,adelay=${Math.round(s.t * 1000)}:all=1`);
  }
}
for (const e of log.events) {
  if (!e.name || e.loop !== undefined) continue;
  const t = e.t - log.t0;
  if (t < 0 || t > log.total || !fs.existsSync(A(e.name))) continue;
  add(A(e.name), false, `volume=${((e.vol ?? 1) * 0.9).toFixed(2)},adelay=${Math.round(t * 1000)}:all=1`);
}
console.log(`${mix.length} audio layers`);
const graph = filters.join(';') + `;${mix.join('')}amix=inputs=${mix.length}:normalize=0:dropout_transition=0,alimiter=limit=0.95[out]`;
fs.writeFileSync(path.join(out, 'graph.txt'), graph);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex_script', path.join(out, 'graph.txt'), '-map', '[out]', '-t', String(log.total), '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', path.join(out, 'sound.m4a')], { stdio: 'inherit' });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(frames, 'f%05d.jpg'), '-i', path.join(out, 'sound.m4a'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', path.resolve('trailer.mp4')], { stdio: 'inherit' });
console.log('wrote trailer.mp4');
