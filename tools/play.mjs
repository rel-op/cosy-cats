// Drives the game in headless Chrome for tests and screenshots.
//   node tools/play.mjs <script.js> [width] [height]
// The script file is evaluated in the page with `game` and the `T` helpers available;
// it may call `await shot('name')` to save tools/out/name.png.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const [file, w = '1280', h = '800'] = process.argv.slice(2);
const out = path.resolve('tools/out');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
await page.exposeFunction('shot', async (name) => { await page.screenshot({ path: path.join(out, name + '.png') }); return name; });
await page.goto('http://localhost:5173/?capture=1');
await page.waitForFunction(() => window.game, null, { timeout: 15000 });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => {
  document.getElementById('title').style.display = 'none';
  window.T = {
    toward(cat, x, z) { const dx = x - cat.pos.x, dz = z - cat.pos.z, d = Math.hypot(dx, dz) || 1; const wx = dx / d, wz = dz / d; return { x: (wx - wz) * 0.7071, y: (-wx - wz) * 0.7071 }; },
    run(n) { for (let i = 0; i < n; i++) game.step(1 / 60); game.render(); },
    go(dev, cat, x, z, max = 900, tol = 0.2) { let i = 0; const reg = game.world.region; for (; i < max; i++) { if (Math.hypot(x - cat.pos.x, z - cat.pos.z) < tol || game.world.region !== reg) break; game.input.virtual(dev, T.toward(cat, x, z)); game.step(1 / 60); } game.input.virtual(dev, {}); game.step(1 / 60); game.render(); return i; },
    push(dev, cat, x, z, n) { game.input.virtual(dev, T.toward(cat, x, z)); T.run(n); game.input.virtual(dev, {}); T.run(2); },
    press(dev, btn) { game.input.virtual(dev, { [btn]: true }); game.step(1 / 60); game.input.virtual(dev, {}); game.step(1 / 60); game.render(); },
    st(c) { return `${c.kind[0]}:${c.state}(${c.pos.x.toFixed(1)},${c.pos.y.toFixed(1)},${c.pos.z.toFixed(1)})`; },
    all() { return game.world.region + ' | ' + game.cats.map(T.st).join(' '); },
    cam(x, z, ppu, y = 0.5) { game.debug.cam = x === null ? null : { x, y, z, ppu }; game.step(1 / 60); game.render(); },
    enter(to) { game.arrive(game.world.portals.find((p) => p.to === to), game.mama); T.run(20); },
  };
});
const code = fs.readFileSync(file, 'utf8');
const result = await page.evaluate(`(async () => { const log = []; try { ${code} } catch (e) { log.push('ERROR ' + e.message + ' ' + (e.stack || '').split('\\n').slice(1, 3).join(' ')); } return log.join('\\n'); })()`);
console.log(result);
await browser.close();
