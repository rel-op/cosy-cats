// Checks the installable app: the offline copy, the install offer, and switching to a new version.
//   npm run build, serve dist on port 4173 (npm run preview), then: node tools/app-check.mjs
// It rebuilds the game twice with a pretend change to stand in for new versions, and once more at the end to put it back.
import { chromium } from 'playwright-core';
import { execSync } from 'node:child_process';
const URL = 'http://localhost:4173/';
const build = (salt) => execSync('npm run build', { env: { ...process.env, SW_SALT: salt }, stdio: 'ignore' });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
let bad = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? '  ' + extra : ''}`); if (!ok) bad++; };
const stores = () => page.evaluate(async () => { const names = (await caches.keys()).filter((k) => k.startsWith('cosy-cats-')); return { names, files: names.length ? (await (await caches.open(names[0])).keys()).length : 0 }; });
const rows = () => page.evaluate(() => [...document.querySelectorAll('#menu .row')].map((r) => r.firstChild.textContent));
const begin = async () => { await page.keyboard.press('Space'); await page.waitForFunction(() => game.players.length > 0); await page.waitForTimeout(500); };

build('');
await page.goto(URL);
await page.waitForFunction(() => window.game && navigator.serviceWorker.controller, null, { timeout: 60000 });
const first = await stores();
check('a copy of the game is kept on the device', first.names.length === 1 && first.files > 40, JSON.stringify(first));
check('a first visit is not mistaken for a new version', (await page.evaluate(() => game.app.fresh)) === false);
const manifest = await page.evaluate(async () => { const m = await (await fetch(document.querySelector('link[rel=manifest]').href)).json(); const sizes = await Promise.all(m.icons.map(async (i) => { const img = new Image(); img.src = new URL(i.src, document.querySelector('link[rel=manifest]').href); await img.decode(); return img.naturalWidth + ' ' + i.sizes; })); return { name: m.name, display: m.display, sizes }; });
check('manifest and icons', manifest.name === 'Cosy Cats' && manifest.sizes.every((s) => s.split(' ')[1].startsWith(s.split(' ')[0])), JSON.stringify(manifest));

// with the network gone it still opens, plays and has its sounds
await context.setOffline(true);
await page.reload();
await page.waitForFunction(() => window.game, null, { timeout: 20000 });
await begin();
await page.keyboard.press('KeyQ');
// the music comes in a few seconds after the start
await page.waitForFunction(() => [...game.audio.music].some(([, el]) => !el.paused && el.currentTime > 0), null, { timeout: 15000 }).catch(() => {});
const off = await page.evaluate(() => ({ players: game.players.length, sounds: game.audio.buffers.size, music: [...game.audio.music].some(([, el]) => !el.paused && el.currentTime > 0) }));
check('plays with no network', off.players === 1 && off.sounds > 20 && off.music, JSON.stringify(off));
await context.setOffline(false);

// the offer to install: a browser that hands over a prompt gets a row in the chooser
check('no install row without an offer', !(await (async () => { await page.keyboard.press('Enter'); await page.waitForTimeout(300); const r = await rows(); await page.keyboard.press('Enter'); await page.waitForTimeout(300); return r; })()).includes('install as an app'));
await page.evaluate(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.prompted = true; return Promise.resolve(); }; dispatchEvent(e); });
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check('install row appears', (await rows()).includes('install as an app'), JSON.stringify(await rows()));
await page.locator('#menu .row', { hasText: 'install as an app' }).click();
await page.waitForTimeout(200);
check('choosing it raises the browser prompt', await page.evaluate(() => window.prompted === true));
check('the row goes once the prompt is used', !(await rows()).includes('install as an app'));
await page.keyboard.press('Enter');
await page.waitForTimeout(300);

// a new version while she is playing: nothing interrupts, the chooser offers a restart
build('two');
await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
await page.waitForFunction(() => game.app.fresh, null, { timeout: 60000 }).catch(() => {});
check('new version noticed while playing', await page.evaluate(() => game.app.fresh && game.players.length === 1));
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check('chooser offers the restart', (await rows()).includes('new version ready'), JSON.stringify(await rows()));
await page.evaluate(() => { window.old = true; });
await page.locator('#menu .row', { hasText: 'new version ready' }).click();
await page.waitForFunction(() => !window.old && window.game, null, { timeout: 20000 });
const second = await stores();
check('restart lands on the new version, old copy cleared', second.names.length === 1 && second.names[0] !== first.names[0] && second.files === first.files && (await page.evaluate(() => game.app.fresh)) === false, JSON.stringify(second));

// a new version found while the title is still showing: it switches by itself
build('three');
await page.reload();
await page.waitForFunction(() => window.game);
await page.evaluate(() => { window.old = true; });
await page.waitForFunction(() => !window.old && window.game, null, { timeout: 60000 }).catch(() => {});
const third = await stores();
check('switches by itself from the title screen', third.names.length === 1 && third.names[0] !== second.names[0] && (await page.evaluate(() => !window.old && game.players.length === 0)), JSON.stringify(third));
await begin();
check('and then plays', (await page.evaluate(() => game.players.length)) === 1);

build('');
await browser.close();
console.log(bad ? `${bad} failed` : 'all good');
process.exit(bad ? 1 : 0);
