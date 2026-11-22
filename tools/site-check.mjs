// Loads a published copy of the game and checks it starts, with sound and no failed requests.
//   node tools/site-check.mjs https://rel-op.github.io/cosy-cats/
import { chromium } from 'playwright-core';
const url = process.argv[2] || 'https://rel-op.github.io/cosy-cats/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const bad = [];
page.on('pageerror', (e) => bad.push('PAGE ERROR ' + e.message));
page.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
await page.goto(url);
await page.waitForFunction(() => window.game, null, { timeout: 30000 });
await page.keyboard.press('Space');
await page.keyboard.down('ArrowDown');
await page.waitForTimeout(1500);
await page.keyboard.up('ArrowDown');
await page.waitForTimeout(8000);
console.log(JSON.stringify(await page.evaluate(() => ({ players: game.players.length, mama: game.mama.pos.toArray().map((v) => +v.toFixed(1)), sounds: game.audio.buffers.size + ' of ' + game.audio.names.length + ' listed', music: [...game.audio.music].map(([k, el]) => k + ' playing=' + !el.paused) }))));
console.log(bad.length ? bad.join('\n') : 'no failed requests or errors');
await page.screenshot({ path: 'tools/out/site.png' });
await browser.close();
