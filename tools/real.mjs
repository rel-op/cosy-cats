// Checks the game as it really runs: animation loop, title screen, audio, saving.
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1470, height: 956 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
await page.goto('http://localhost:5173/');
await page.waitForFunction(() => window.game);
await page.waitForTimeout(1500);
await page.screenshot({ path: 'tools/out/real-title.png' });
await page.keyboard.press('Space');
await page.waitForTimeout(500);
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(1500);
await page.keyboard.up('ArrowLeft');
await page.keyboard.press('KeyQ');
await page.waitForTimeout(9000);
const info = await page.evaluate(async () => {
  const a = game.audio;
  const fps = await new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 > 2000) res(n / 2); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  return { ctx: a.ctx && a.ctx.state, buffers: a.buffers.size, names: a.names.length, loops: [...a.loops].map(([k, l]) => `${k}:${l.vol.toFixed(2)}${l.src ? '*' : ''}`), track: a.track, music: [...a.music].map(([k, el]) => `${k} paused=${el.paused} vol=${el.volume.toFixed(2)} t=${el.currentTime.toFixed(1)}`), fps: Math.round(fps), px: game.pixel.px, low: [game.pixel.low.x, game.pixel.low.y], mama: game.mama.pos.toArray().map((v) => +v.toFixed(1)), title: document.getElementById('title').className, players: game.players.length };
});
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: 'tools/out/real-play.png' });
await browser.close();
