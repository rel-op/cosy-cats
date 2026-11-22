// Checks the garden toys, the doves, kittens climbing, and that an older saved game still loads.
import { chromium } from 'playwright-core';
const URL = process.argv[2] || 'http://localhost:5173/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
let bad = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? '  ' + extra : ''}`); if (!ok) bad++; };
const wait = (ms) => page.waitForTimeout(ms);
async function open() {
  await page.goto(URL);
  await page.waitForFunction(() => window.game);
  await wait(1000);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => game.players.length > 0);
  await wait(500);
  // count what the world says happened
  await page.evaluate(() => { window.heard = {}; const emit = game.world.emit; game.world.emit = (what, ...rest) => { heard[what] = (heard[what] || 0) + 1; emit(what, ...rest); }; });
}
const place = (x, y, z, yaw = 0, who = 'player') => page.evaluate(([x, y, z, yaw, who]) => { const c = who === 'player' ? game.players[0].cat : game.cats[who]; if (c.state === 'sit') c.seat.release(c); c.teleport(x, y, z); c.yaw = yaw; c.setState('free'); }, [x, y, z, yaw, who]);
const me = () => page.evaluate(() => { const c = game.players[0].cat; return { i: game.cats.indexOf(c), state: c.state, x: +c.pos.x.toFixed(2), y: +c.pos.y.toFixed(2), z: +c.pos.z.toFixed(2), held: c.held ? c.held.name : null }; });
const heard = (k) => page.evaluate((k) => window.heard[k] || 0, k);
const hold = async (key, ms) => { await page.keyboard.down(key); await wait(ms); await page.keyboard.up(key); };
// keys for a direction on the ground: the camera looks along (-1,-1), so the arrows are diagonal in the world
const KEY = { '+x': ['ArrowRight', 'ArrowDown'], '-x': ['ArrowLeft', 'ArrowUp'], '+z': ['ArrowLeft', 'ArrowDown'], '-z': ['ArrowRight', 'ArrowUp'] };
const walk = async (dir, ms) => { for (const k of KEY[dir]) await page.keyboard.down(k); await wait(ms); for (const k of KEY[dir]) await page.keyboard.up(k); };

// ---- a save from before the toys: things listed by position, beds by number
await open();
const legacy = await page.evaluate(() => {
  const w = game.world, old = w.items.slice(0, w.items.findIndex((it) => it.name === 'pot')); // what there was before the pots, and everything after them, existed
  const hay = w.beds.findIndex((b) => b.name === 'hay'), sock = old.findIndex((it) => it.name === 'sock');
  const items = old.map((it) => ({ n: it.name, r: it.region, x: +it.mesh.position.x.toFixed(2), y: +it.mesh.position.y.toFixed(2), z: +it.mesh.position.z.toFixed(2), b: -1, s: 0, a: 0 }));
  Object.assign(items[sock], { x: w.beds[hay].x + 0.4, y: 0.06, z: w.beds[hay].z + 0.4, b: hay });
  const wool = old.findIndex((it) => it.name === 'wool');
  Object.assign(items[wool], { x: 2.5, z: 2.5 });
  localStorage.setItem('cosy-cats-save-1', JSON.stringify({ mama: 'ginger', kittens: ['cream'], words: true, music: true, items, cat: 1 }));
  return { sock, wool };
});
await page.addInitScript((save) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('cosy-cats-save-1', save); } }, await page.evaluate(() => localStorage.getItem('cosy-cats-save-1')));
await open();
const old = await page.evaluate(() => { const w = game.world, sock = w.items.find((it) => it.name === 'sock'), wool = w.items.find((it) => it.name === 'wool'), pots = w.items.filter((it) => it.name === 'pot'); return { sockBed: sock.bed && sock.bed.name, wool: [wool.mesh.position.x, wool.mesh.position.z], pots: pots.map((p) => +p.mesh.position.y.toFixed(2)), cat: game.cats.indexOf(game.players[0].cat) }; });
check('an older save still loads', old.sockBed === 'hay' && old.wool[0] === 2.5 && old.wool[1] === 2.5 && old.cat === 1 && old.pots.every((y) => y > 0.6), JSON.stringify(old));

// ---- a kitten climbs the tree by herself
await place(-4.5, 0, 2.6, Math.PI);
await wait(300);
await walk('-z', 2600);
const up = await me();
check('a kitten climbs the tree', up.i === 1 && up.y > 2.4, JSON.stringify(up));

// ---- see-saw: mama lands, the kitten on the other end flies
await page.keyboard.press('Tab');
await wait(300);
const ss = await page.evaluate(() => ({ cx: game.world.seesaw.cx, cz: game.world.seesaw.cz }));
await place(ss.cx + 3, 0, ss.cz + 1.5, 0, 1);
await place(ss.cx + 1.2, 0.8, ss.cz);
await page.waitForFunction(() => game.world.seesaw.side(game.cats[1]) !== 0, null, { timeout: 9000 }).catch(() => {});
const sides = await page.evaluate(() => [game.world.seesaw.side(game.cats[0]), game.world.seesaw.side(game.cats[1])]);
check('a kitten comes to sit on the other end', sides[0] === 1 && sides[1] === -1, JSON.stringify(sides));
await wait(600);
await page.keyboard.press('Space');
const high = await page.evaluate(() => new Promise((res) => { let top = 0; const t0 = performance.now(); const f = () => { top = Math.max(top, game.cats[1].pos.y); if (performance.now() - t0 > 2600) res(top); else requestAnimationFrame(f); }; f(); }));
check('landing flings the kitten', high > 1.3 && (await heard('fling')) >= 1, `kitten reached ${high.toFixed(2)}`);

// ---- swing: hop on with the action key, off with jump
await place(-30.75, 0, 4.4);
await wait(400);
await page.keyboard.press('KeyE');
await wait(500);
const sat = await me();
await hold('ArrowRight', 2500);
const swung = await page.evaluate(() => new Promise((res) => { let top = 0; const t0 = performance.now(); const f = () => { top = Math.max(top, game.players[0].cat.pos.y); if (performance.now() - t0 > 1500) res(top); else requestAnimationFrame(f); }; f(); }));
await page.keyboard.press('Space');
await wait(900);
const off = await me();
check('the swing carries her and lets her go', sat.state === 'sit' && swung > 0.85 && off.state === 'free' && off.y < 0.1, JSON.stringify({ sat: sat.state, swung: +swung.toFixed(2), off }));

// ---- the tap, by clicking it
await place(18.6, 0, 1.2);
await wait(2500);
const tap = await page.evaluate(() => { const s = { x: 0, y: 0 }, sw = game.world.switches.find((q) => Math.abs(q.x - 16.7) < 0.1); game.pixel.toScreen(game.V(sw.x, 0.6, sw.z), s); return s; });
await page.mouse.click(tap.x, tap.y);
await page.waitForFunction(() => game.world.spray.on, null, { timeout: 8000 }).catch(() => {});
check('clicking the tap starts the sprinkler', await page.evaluate(() => game.world.spray.on));
await wait(400);
await page.keyboard.press('KeyE');
await wait(300);
check('and the action key stops it', !(await page.evaluate(() => game.world.spray.on)));

// ---- the stepping stone
await place(-43.6, 0, -3.4);
await wait(5200);
check('standing on the stone wakes the water tipper', (await heard('plate')) >= 1 && (await heard('clack')) >= 1, `clacks ${await heard('clack')}`);

// ---- chimes: walk along the veranda through them, then bat them
await place(-53.9, 0.3, -0.9);
await wait(300);
await walk('+z', 1100);
const brushed = await heard('chime');
await place(-53.5, 0.3, 0.3);
await wait(300);
await page.keyboard.press('KeyE');
await wait(900);
check('chimes ring when brushed and when batted', brushed >= 3 && (await heard('chime')) >= brushed + 5, `brushed ${brushed}, total ${await heard('chime')}`);

// ---- pots: bat one from the ground, walk into the rest along the wall
await place(5.9, 0, 10.95, 0);
await wait(300);
await page.keyboard.press('KeyE');
await wait(1200);
const pots1 = await page.evaluate(() => game.world.items.filter((it) => it.name === 'pot').map((p) => +(p.mesh.position.y - p.rest).toFixed(2)));
await place(7.6, 0.57, 11.5);
await wait(300);
await walk('-x', 900);
await wait(1200);
const pots2 = await page.evaluate(() => game.world.items.filter((it) => it.name === 'pot').map((p) => +(p.mesh.position.y - p.rest).toFixed(2)));
check('pots get knocked off the wall', pots1.filter((y) => y < 0.2).length === 1 && pots2.every((y) => y < 0.2), JSON.stringify([pots1, pots2]));

// ---- doves: run at them and they go somewhere else
const d0 = await page.evaluate(() => game.world.doves.state);
await place(d0.x + 4, 0, d0.z);
await wait(300);
await walk('-x', 1100);
await page.waitForFunction(() => game.world.doves.state.mode === 'ground' && window.heard.flock, null, { timeout: 12000 }).catch(() => {});
const d1 = await page.evaluate(() => game.world.doves.state);
check('doves fly off and settle elsewhere', Math.hypot(d1.x - d0.x, d1.z - d0.z) > 4.5 && d1.mode === 'ground', JSON.stringify([d0, d1]));

const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 > 2000) res(n / 2); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
check('still smooth', fps > 50, `${Math.round(fps)} frames a second`);
await browser.close();
console.log(bad ? `${bad} failed` : 'all good');
process.exit(bad ? 1 : 0);
