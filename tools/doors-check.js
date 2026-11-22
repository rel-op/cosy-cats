// Walks through every doorway in both directions: node tools/play.mjs tools/doors-check.js
// A low step by a door (the patio, a doorstep, the treehouse platform) is reported as "blocked" and is fine.
const D = 'a', W = game.world, m = game.mama;
game.input.virtual(D, { jump: true }); T.run(2); game.input.virtual(D, {}); T.run(10);
let ok = 0; const bad = [];
for (const p of W.portals) {
  const q = W.portals.find((o) => o.region === p.to && o.to === p.region && Math.hypot(o.tx - p.x, o.tz - p.z) < 1.2);
  if (!q) { bad.push(`no way back for ${p.region}->${p.to}`); continue; }
  // stand where you would arrive coming the other way, then walk into the doorway
  W.setRegion(p.region);
  game.cats.forEach((c, i) => { if (c.state === 'ride') game.dismount(c); c.teleport(q.tx + i * 0.01, q.ty, q.tz + i * 0.3); c.setState('free'); });
  T.run(50);
  if (W.region !== p.region) { bad.push(`${p.region}->${p.to}: arriving at the far side walks straight back through (${W.region})`); continue; }
  const stuck0 = W.blockedAt(m.pos.x, m.pos.y + 0.05, m.pos.z, m.radius * 0.8, m.height);
  T.go(D, m, p.x, p.z, 240, 0.05); T.run(100);
  const stuck = W.blockedAt(m.pos.x, m.pos.y + 0.05, m.pos.z, m.radius * 0.8, m.height);
  const k = game.cats[1], near = Math.hypot(k.pos.x - m.pos.x, k.pos.z - m.pos.z) < 3 || k.state === 'ride';
  if (W.region === p.to && !stuck && !stuck0 && near) ok++; else bad.push(`${p.region}->${p.to}: now in ${W.region}${stuck0 ? ' (start blocked)' : ''}${stuck ? ' (arrival blocked)' : ''}${near ? '' : ' (kitten left behind)'} ${T.st(m)}`);
}
log.push(`${ok} of ${W.portals.length} doorways fine`);
log.push(bad.join('\n'));
