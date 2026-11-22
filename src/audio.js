// Sound: short effects and seamless loops through Web Audio, music streamed through audio elements.
// Everything is optional: if a file is missing or audio is locked, calls quietly do nothing.
const VARIANTS = { meow: ['meow1', 'meow2', 'meow3'], mew: ['mew1', 'mew2', 'mew3'], trill: ['trill1', 'trill2'] };
const LOOPS = ['purr', 'amb_day', 'amb_night', 'amb_fire', 'amb_room', 'amb_water', 'amb_rain'];

export class Audio {
  constructor({ silent = false } = {}) {
    this.silent = silent;
    this.buffers = new Map();
    this.loops = new Map();
    this.music = new Map();
    this.musicOn = true;
    this.track = null;
    this.gap = 6;
    this.log = []; // { t, name, vol } for the trailer's soundtrack
    this.time = 0;
    this.names = [];
    this.ready = fetch('/audio/manifest.json').then((r) => r.json()).then((names) => { this.names = names; }).catch(() => {});
  }

  unlock() {
    if (this.silent) return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);
        // ambience goes through a filter so the outdoors sounds muffled from inside a den
        this.ambFilter = this.ctx.createBiquadFilter();
        this.ambFilter.type = 'lowpass';
        this.ambFilter.frequency.value = 18000;
        this.ambFilter.connect(this.master);
        this.ready.then(() => this.load());
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { this.ctx = null; }
  }

  async load() {
    for (const name of this.names) {
      if (name.startsWith('music_') || name === 'sting_sleep') continue;
      fetch(`/audio/${name}.mp3`).then((r) => r.arrayBuffer()).then((b) => this.ctx.decodeAudioData(b)).then((buf) => {
        this.buffers.set(name, buf);
        if (LOOPS.includes(name) && this.loops.has(name)) this.startLoop(name);
      }).catch(() => {});
    }
  }

  get ok() { return this.ctx && this.ctx.state === 'running'; }

  play(name, { vol = 1, rate = 1 } = {}) {
    const list = VARIANTS[name];
    const pick = list ? list[Math.floor(Math.random() * list.length)] : name;
    this.log.push({ t: this.time, name: pick, vol, rate });
    if (!this.ok) return;
    const buf = this.buffers.get(pick);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * (0.96 + Math.random() * 0.08);
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(this.master);
    src.start();
  }

  startLoop(name) {
    const l = this.loops.get(name);
    if (!l || l.src || !this.buffers.has(name) || !this.ok) return;
    l.src = this.ctx.createBufferSource();
    l.src.buffer = this.buffers.get(name);
    l.src.loop = true;
    l.gain = this.ctx.createGain();
    l.gain.gain.value = 0;
    l.src.connect(l.gain).connect(name === 'purr' ? this.master : this.ambFilter);
    l.src.start();
  }

  // set the target volume of a looping sound; it fades there
  loop(name, vol) {
    let l = this.loops.get(name);
    if (!l) { l = { vol: 0, src: null, gain: null }; this.loops.set(name, l); }
    if (Math.abs(l.vol - vol) > 0.001) this.log.push({ t: this.time, name, loop: vol });
    l.vol = vol;
    if (!l.src) this.startLoop(name);
    if (l.gain) l.gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.6);
  }

  // how enclosed the listener is, 0 (open air) to 1 (deep in a den)
  enclose(k) {
    if (this.ambFilter) this.ambFilter.frequency.setTargetAtTime(18000 - k * 17100, this.ctx.currentTime, 0.4);
  }

  // Music is sparse: a track plays through, then there is a stretch of quiet before the next.
  setTrack(name) {
    if (this.track === name) return;
    this.log.push({ t: this.time, music: name });
    const old = this.music.get(this.track);
    if (old) this.fade(old, 0, 2.5);
    this.track = name;
    this.gap = Math.min(this.gap, 4);
  }

  fade(el, to, secs) {
    clearInterval(el._f);
    const from = el.volume, t0 = performance.now();
    el._f = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / (secs * 1000));
      el.volume = from + (to - from) * k;
      if (k >= 1) { clearInterval(el._f); if (to === 0) el.pause(); }
    }, 60);
  }

  update(dt) {
    this.time += dt;
    if (this.silent || !this.ok || !this.track) return;
    const cur = this.music.get(this.track);
    const playing = cur && !cur.paused;
    if (!this.musicOn) { if (playing) this.fade(cur, 0, 1); return; }
    if (playing) return;
    this.gap -= dt;
    if (this.gap > 0 || !this.names.includes(this.track)) return;
    let el = cur;
    if (!el) {
      el = new window.Audio(`/audio/${this.track}.mp3`);
      el.onended = () => { this.gap = 25 + Math.random() * 30; };
      this.music.set(this.track, el);
    }
    el.currentTime = 0;
    el.volume = 0;
    el.play().then(() => this.fade(el, 0.5, 3)).catch(() => { this.gap = 5; });
    this.gap = 9999;
  }
}
