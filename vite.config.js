import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Writes dist/sw.js after a build: the script that keeps a copy of the game on the device.
// It lists every built file and names its store after their contents, so any change to the
// game changes sw.js, and a changed sw.js is what tells a device there is a new version.
function offlineCopy() {
  let dir = 'dist';
  const walk = (d, at = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), at + e.name + '/') : [at + e.name]));
  return {
    name: 'offline-copy',
    apply: 'build',
    configResolved(c) { dir = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      const files = walk(dir).filter((f) => f !== 'sw.js' && !f.endsWith('.DS_Store')).sort();
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(fs.readFileSync(path.join(dir, f)));
      hash.update(process.env.SW_SALT || ''); // lets the update test pretend there is a new version
      const sw = fs.readFileSync('tools/sw-template.js', 'utf8').replace('__CACHE__', 'cosy-cats-' + hash.digest('hex').slice(0, 10)).replace('__FILES__', JSON.stringify(files));
      fs.writeFileSync(path.join(dir, 'sw.js'), sw);
    },
  };
}

// Relative paths, so the built game works from any folder (GitHub Pages serves it under /cosy-cats/).
export default defineConfig({ base: './', plugins: [offlineCopy()] });
