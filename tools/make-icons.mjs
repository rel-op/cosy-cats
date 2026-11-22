// App icons for the installed game, photographed from the game itself: mama and a kitten on the lawn.
//   node tools/make-icons.mjs        (the dev server must be running)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('public/icons');
fs.mkdirSync(OUT, { recursive: true });
const [X, Z] = (process.argv[2] || '1.4,3.0').split(',').map(Number);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto('http://localhost:5173/?capture=1');
await page.waitForFunction(() => window.game, null, { timeout: 15000 });

// zoom: how many low-resolution pixels to a metre. A maskable icon may lose its outer tenth on every side.
async function shoot(zoom) {
  await page.evaluate(([x, z, zoom]) => {
    for (const id of ['title', 'labels', 'hud', 'toast']) document.getElementById(id).style.display = 'none';
    const m = game.mama, k = game.cats[1], face = Math.PI / 4;
    game.day.set(0.3);
    const pose = () => {
      m.teleport(x - 0.32, 0, z + 0.05); m.yaw = face + 0.5;
      k.teleport(x + 0.5, 0, z + 0.02); k.yaw = face - 0.75;
      game.cats.slice(2).forEach((c) => c.teleport(x - 9, 0, z - 9));
    };
    pose();
    for (let i = 0; i < 30; i++) game.step(1 / 60);
    pose();
    game.debug.cam = { x, y: 0.3, z, ppu: zoom };
    game.step(1 / 600);
    pose();
    game.render();
  }, [X, Z, zoom]);
  return page.screenshot({ type: 'png' });
}
const full = await shoot(150), safe = await shoot(112);
fs.writeFileSync(path.join(OUT, 'icon-512.png'), full);
fs.writeFileSync(path.join(OUT, 'icon-maskable-512.png'), safe);

// smaller sizes are the big picture scaled down smoothly
const small = await browser.newPage({ deviceScaleFactor: 1 });
for (const [name, n] of [['icon-192.png', 192], ['apple-touch-icon.png', 180], ['favicon.png', 64]]) {
  await small.setViewportSize({ width: n, height: n });
  await small.setContent(`<body style="margin:0"><img src="data:image/png;base64,${full.toString('base64')}" style="display:block;width:${n}px;height:${n}px"></body>`);
  fs.writeFileSync(path.join(OUT, name), await small.screenshot({ type: 'png' }));
}
await browser.close();
console.log('wrote', fs.readdirSync(OUT).join(', '));
