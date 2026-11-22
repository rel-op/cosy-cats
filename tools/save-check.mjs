// Checks what survives closing the game: where carried things were left, and which cat you were.
import { chromium } from 'playwright-core';
const URL = process.argv[2] || 'http://localhost:5173/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
let bad = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? '  ' + extra : ''}`); if (!ok) bad++; };

async function open() {
  await page.goto(URL);
  await page.waitForFunction(() => window.game);
  await page.waitForTimeout(1200);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => game.players.length > 0);
  await page.waitForTimeout(600);
}
// put the player's cat somewhere, facing a direction, and let it settle
const place = (x, y, z, yaw = 0) => page.evaluate(([x, y, z, yaw]) => { const c = game.players[0].cat; c.pos.set(x, y, z); c.vy = 0; c.yaw = yaw; c.state = 'free'; }, [x, y, z, yaw]);
const act = async () => { await page.keyboard.press('KeyE'); await page.waitForTimeout(350); };
const item = (i) => page.evaluate((i) => { const it = game.world.items[i], p = it.mesh.position; return { name: it.name, region: it.region, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), bed: it.bed ? it.bed.name : null, held: !!it.heldBy }; }, i);
const who = () => page.evaluate(() => ({ cat: game.cats.indexOf(game.players[0].cat), state: game.players[0].cat.state, held: game.players[0].cat.held ? game.players[0].cat.held.name : null }));

await open();
await page.evaluate(() => localStorage.clear());
await open();

// three things lying in the home garden
const [A, B, C] = await page.evaluate(() => game.world.items.map((it, i) => (it.region === 'outside' && Math.abs(it.mesh.position.x) < 11 ? i : -1)).filter((i) => i >= 0).slice(0, 3));

// carry the first to the hay bed and tuck it in
const start = await item(A);
const bed = await page.evaluate(() => { const b = game.world.beds.find((b) => b.name === 'hay'); return { x: b.x, y: b.y, z: b.z }; });
await place(start.x - 0.3, start.y, start.z, Math.PI / 2);
await page.waitForTimeout(300);
await act();
check('picked up', (await who()).held === start.name, JSON.stringify(await who()));
await place(bed.x, bed.y, bed.z);
await page.waitForTimeout(400);
await act();
const tucked = await item(A);
check('tucked into the bed', tucked.bed === 'hay' && !tucked.held, JSON.stringify(tucked));

// carry a second thing and leave it on open ground
const second = await item(B);
await place(second.x - 0.3, second.y, second.z, Math.PI / 2);
await page.waitForTimeout(300);
await act();
await place(-1.5, 0, 2.5, 0);
await page.waitForTimeout(400);
await act();
const left = await item(B);
check('left on the ground', !left.held && !left.bed && Math.hypot(left.x + 1.5, left.z - 2.5) < 1, JSON.stringify(left));

// pick up a third and keep hold of it, then become a kitten and close the game
const third = await item(C);
await place(third.x - 0.3, third.y, third.z, Math.PI / 2);
await page.waitForTimeout(300);
await act();
const carrying = await who();
const at = await page.evaluate(() => game.players[0].cat.pos.toArray());
await page.keyboard.press('Tab');
await page.waitForTimeout(400);
const before = await who();
check('swapped to a kitten', before.cat !== carrying.cat, JSON.stringify(before));

await open();
const t2 = await item(A), l2 = await item(B), h2 = await item(C), after = await who();
check('bed thing is still in the bed', t2.bed === 'hay' && t2.x === tucked.x && t2.z === tucked.z && Math.abs(t2.y - tucked.y) < 0.02, JSON.stringify(t2));
check('ground thing is where it was left', !l2.bed && l2.x === left.x && l2.z === left.z, JSON.stringify(l2));
check('thing in the mouth was set down where she stood', !h2.held && Math.hypot(h2.x - at[0], h2.z - at[2]) < 0.6, JSON.stringify(h2));
check('still the same cat', after.cat === before.cat, JSON.stringify(after));
const bedCount = await page.evaluate(() => game.world.beds.find((b) => b.name === 'hay').items.length);
check('bed knows what it holds', bedCount === 1, String(bedCount));

// settling down in the furnished bed must not grab the thing; walking up nose-first does
await place(bed.x, bed.y, bed.z, Math.atan2(bed.x - t2.x, bed.z - t2.z));
await page.waitForTimeout(400);
await act();
const settle = await who();
check('curling up beside it leaves it alone', settle.held === null, JSON.stringify(settle));
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(700);
const dx = t2.x - bed.x, dz = t2.z - bed.z, len = Math.hypot(dx, dz);
await place(t2.x - (dx / len) * 0.42, bed.y, t2.z - (dz / len) * 0.42, Math.atan2(dx, dz));
await page.waitForTimeout(300);
await act();
const taken = await who();
check('nose-first takes it back out', taken.held === t2.name, JSON.stringify(taken));
const emptied = await page.evaluate(() => game.world.beds.find((b) => b.name === 'hay').items.length);
check('bed is empty again', emptied === 0, String(emptied));

// and a tap or click on a thing in a bed fetches it
await place(bed.x, bed.y, bed.z);
await page.waitForTimeout(400);
await act();
await place(bed.x + 2.5, 0, bed.z + 2.5);
await page.waitForTimeout(600);
const spot = await page.evaluate((i) => { const s = { x: 0, y: 0 }; game.pixel.toScreen(game.world.items[i].mesh.position, s); return s; }, A);
await page.mouse.click(spot.x, spot.y);
await page.waitForFunction(() => game.players[0].cat.held, null, { timeout: 8000 }).catch(() => {});
const tapped = await who();
check('tapping a thing in a bed fetches it', tapped.held === t2.name, JSON.stringify(tapped));

await browser.close();
console.log(bad ? `${bad} failed` : 'all good');
process.exit(bad ? 1 : 0);
