// Small synthesised sounds. Placeholders until there are real recordings.
export class Sound {
  constructor() {
    this.ctx = null;
    this.purrGain = null;
  }

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.out = this.ctx.createGain();
        this.out.gain.value = 0.6;
        this.out.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  get ok() {
    return this.ctx && this.ctx.state === 'running';
  }

  noise(seconds) {
    const n = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04;
      d[i] = last * 6;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  meow(kitten) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime;
    const dur = kitten ? 0.38 : 0.7;
    const [f0, f1, f2] = kitten ? [880, 1180, 820] : [470, 640, 400];
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.linearRampToValueAtTime(f1, t + dur * 0.3);
    osc.frequency.linearRampToValueAtTime(f2, t + dur);
    const form = c.createBiquadFilter();
    form.type = 'bandpass';
    form.Q.value = 3;
    form.frequency.setValueAtTime(kitten ? 1500 : 900, t);
    form.frequency.linearRampToValueAtTime(kitten ? 2600 : 1900, t + dur * 0.35);
    form.frequency.linearRampToValueAtTime(kitten ? 1400 : 800, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.05);
    g.gain.setValueAtTime(0.5, t + dur * 0.6);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(form).connect(g).connect(this.out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  blip(f0, f1, dur = 0.12, vol = 0.18, type = 'sine') {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  hop(kitten) { this.blip(kitten ? 520 : 360, kitten ? 780 : 560, 0.11, 0.12); }
  pick() { this.blip(700, 1000, 0.09, 0.14, 'triangle'); }
  drop() { this.blip(600, 380, 0.1, 0.12, 'triangle'); }
  swap() { this.blip(500, 900, 0.16, 0.12, 'triangle'); }

  splash() {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime;
    const src = this.noise(0.4);
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1500;
    f.Q.value = 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    src.connect(f).connect(g).connect(this.out);
    src.start(t);
  }

  purr(on) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime;
    if (on && !this.purrGain) {
      const src = this.noise(2);
      src.loop = true;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 170;
      const trem = c.createGain();
      trem.gain.value = 0.5;
      const lfo = c.createOscillator();
      lfo.type = 'sawtooth';
      lfo.frequency.value = 24;
      const depth = c.createGain();
      depth.gain.value = 0.5;
      lfo.connect(depth).connect(trem.gain);
      const g = (this.purrGain = c.createGain());
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.9, t + 1);
      src.connect(lp).connect(trem).connect(g).connect(this.out);
      src.start(t);
      lfo.start(t);
      this.purrNodes = [src, lfo];
    } else if (!on && this.purrGain) {
      const g = this.purrGain, nodes = this.purrNodes;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 1.2);
      setTimeout(() => nodes.forEach((n) => n.stop()), 1400);
      this.purrGain = null;
    }
  }

  morning() {
    [660, 880, 1100].forEach((f, i) => setTimeout(() => this.blip(f, f * 1.01, 0.5, 0.1), i * 180));
  }
}
