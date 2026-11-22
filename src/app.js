// Installing the game as an app: the offline copy, the install offer, and noticing a new version.
export const app = { prompt: null, fresh: false, installed: false, changed: () => {} };

const web = location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const ua = navigator.userAgent;
// read once at load: an installed app opens without the browser's frame
app.installed = !!(window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) || navigator.standalone === true;
const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const safari = /Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox|FxiOS|CriOS/.test(ua);

// Chrome and Edge hand over an install prompt the page may raise once, from a press or a tap
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); app.prompt = e; app.changed(); });
addEventListener('appinstalled', () => { app.prompt = null; app.installed = true; app.changed(); });

// What the chooser should offer: 'prompt' (one press), or the steps for a browser that has no prompt, or nothing.
app.offer = () => (app.installed || !web ? null : app.prompt ? 'prompt' : ios ? 'ios' : safari ? 'safari' : null);
app.steps = () => ({ ios: 'in Safari: tap Share, then "Add to Home Screen"', safari: 'in Safari: open the File menu, then "Add to Dock"' })[app.offer()] || '';
app.install = () => { const p = app.prompt; app.prompt = null; try { if (p) Promise.resolve(p.prompt()).catch(() => {}); } catch (e) { /* the browser withdrew the offer */ } };
app.restart = () => location.reload();

// The offline copy only exists in the built game, never on the dev server or while filming.
export function startApp({ quiet = false } = {}) {
  if (quiet || !import.meta.env.PROD || !web || !('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  // the offline script takes charge once on a first visit; any take-over after that is a new version
  let held = sw.controller ? 1 : 0;
  sw.addEventListener('controllerchange', () => { if (held++) { app.fresh = true; app.changed(); } });
  const register = () => sw.register('./sw.js').then((reg) => {
    // an installed app is put aside rather than closed, so look for a new version each time it comes back
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
  if (document.readyState === 'complete') register(); else addEventListener('load', register);
}
