// Generates the game's sound effects, ambience and music with the ElevenLabs API.
// Reads ELEVENLABS_API_KEY from .env.local. Skips anything already generated.
//   node tools/gen-audio.mjs            generate whatever is missing
//   node tools/gen-audio.mjs meow1 ...  (re)generate just the named sounds
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const env = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
const KEY = (env.match(/ELEVENLABS_API_KEY=(.+)/) || [])[1]?.trim();
if (!KEY) throw new Error('No ELEVENLABS_API_KEY in .env.local');

const RAW = path.join(root, 'tools/audio-raw');
const OUT = path.join(root, 'public/audio');
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const clean = 'close microphone, clean studio recording, no background noise, no music';
const SFX = [
  ['meow1', `A gentle adult domestic cat meow, one single soft friendly meow, ${clean}`, 1.2],
  ['meow2', `An adult cat calling her kittens with one short warm meow, ${clean}`, 1.2],
  ['meow3', `A single short inquisitive cat meow rising in pitch, ${clean}`, 1.0],
  ['mew1', `A tiny kitten mew, one single high-pitched squeaky little meow, ${clean}`, 0.8],
  ['mew2', `A very young kitten giving one short tiny squeak of a meow, ${clean}`, 0.8],
  ['mew3', `A small kitten mewing once, sweet and high, ${clean}`, 0.9],
  ['trill1', `A cat trill, one short rolling chirrup greeting sound "mrrp", ${clean}`, 0.7],
  ['trill2', `A mother cat chirruping softly to her kittens, one short trill, ${clean}`, 0.8],
  ['yawn', `A small cat yawning with a tiny squeak at the end, ${clean}`, 1.5],
  ['munch', `A cat eating dry kibble from a ceramic bowl, soft crunching, ${clean}`, 3],
  ['lap', `A cat lapping water from a bowl, gentle rhythmic licking laps, ${clean}`, 3],
  ['splash', 'A small soft splash as a paw steps into a shallow garden pond, gentle, no voices', 1],
  ['plop', 'A single small frog plop into still pond water', 0.8],
  ['rustle', 'A soft rustle of leaves as a small animal brushes through a bush, short', 1.2],
  ['hop', 'Very soft cat paws landing on grass, one tiny muffled thud', 0.5],
  ['thump', 'Soft cat paws landing on a wooden floor, one light thump', 0.5],
  ['cardboard', 'A cat shuffling inside a cardboard box, soft cardboard scrapes and a little thump', 1.5],
  ['flap', 'A plastic cat flap swinging open and clacking shut twice', 1.2],
  ['creak', 'An old wooden shed door creaking open gently, short', 1.5],
  ['pickup', 'A soft fabric pat, a small cloth being picked up, very gentle and short', 0.5],
  ['drop', 'A small soft object dropped onto grass, tiny muffled pat', 0.5],
  ['boing', 'A soft springy trampoline bounce, gentle and rubbery, single', 0.8],
  ['flutter', 'Small bird wings fluttering as it takes off, short', 1.2],
  ['chime', 'A soft warm wind chime, three gentle bright notes ringing out peacefully', 3],
  ['tick', 'A tiny soft wooden click, muted, single', 0.5],
  ['whoosh', 'A very soft airy whoosh, gentle transition swish, short', 0.9],
  ['scratch', 'A cat scratching its claws on a wooden post, three short scrapes', 1.5],
  ['bell', 'A tiny jingle bell on a cat toy ball rolling once, soft', 0.9],
];
const LOOPS = [
  ['purr', `A cat purring softly and steadily, warm and deep, ${clean}`, 8],
  ['amb_day', 'A calm back garden on a summer morning: gentle birdsong, a light breeze through leaves, distant and peaceful, no people, no traffic', 30],
  ['amb_night', 'A quiet summer night in a garden: soft crickets chirping, a gentle breeze, very peaceful, no people, no traffic', 30],
  ['amb_fire', 'A small cosy fireplace crackling gently, warm wood fire, close and soft', 20],
  ['amb_rain', 'Gentle steady rain falling on a wooden roof heard from inside, soft and cosy, no thunder', 30],
  ['amb_room', 'A very quiet cosy room with a softly ticking clock, calm room tone', 20],
  ['amb_water', 'A small garden pond trickling gently, soft water burble, calm', 20],
];
const none = 'No vocals, no drums, no percussion.';
const MUSIC = [
  ['music_garden', `A gentle, sparse, cosy instrumental for a peaceful garden morning. Soft felt piano and fingerpicked nylon guitar with a little glockenspiel. Warm and unhurried, lots of space between phrases, slow tempo around 70 bpm, tender and nostalgic. ${none}`, 100000],
  ['music_explore', `A calm, curious instrumental for wandering through neighbours' gardens. Pizzicato strings, marimba, soft clarinet and fingerpicked guitar. Lightly playful but gentle and grown-up, medium-slow tempo, sparse arrangement with pauses. ${none}`, 100000],
  ['music_night', `A very quiet lullaby instrumental for night time. Music box and soft felt piano over a warm pad. Slow, sleepy, sparse and tender, around 60 bpm. ${none}`, 100000],
  ['music_home', `A warm, intimate instrumental for being indoors by the fire. Soft upright piano and gentle clarinet in a slow waltz, cosy and sparse. ${none}`, 90000],
  ['music_trailer', `A heartfelt cosy acoustic instrumental theme. It begins very simply with solo felt piano, grows gently with fingerpicked guitar, soft strings and glockenspiel into a warm, uplifting middle section, then settles into a tender lullaby ending. Around 80 bpm. ${none}`, 80000],
  ['sting_sleep', `A short soft lullaby phrase on a music box that resolves peacefully, like the last line of a bedtime song. ${none}`, 12000],
];

async function post(url, body) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'xi-api-key': KEY, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const text = (await res.text()).slice(0, 300);
    if (res.status < 500 && res.status !== 429) throw new Error(`${res.status} ${text}`);
    console.log(`  retry after ${res.status}: ${text}`);
    await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
  }
  throw new Error('gave up after retries');
}

const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
const trim = 'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.05,areverse';

const jobs = [];
for (const [name, text, dur] of SFX) jobs.push({ name, kind: 'sfx', run: () => post('https://api.elevenlabs.io/v1/sound-generation', { text, duration_seconds: dur, prompt_influence: 0.45 }) });
for (const [name, text, dur] of LOOPS) jobs.push({ name, kind: 'loop', run: () => post('https://api.elevenlabs.io/v1/sound-generation', { text, duration_seconds: dur, loop: true, prompt_influence: 0.4 }) });
for (const [name, prompt, ms] of MUSIC) {
  jobs.push({
    name, kind: 'music',
    run: async () => {
      try {
        return await post('https://api.elevenlabs.io/v1/music', { prompt, music_length_ms: ms, force_instrumental: true, model_id: 'music_v2' });
      } catch (e) {
        console.log(`  ${name}: music_v2 failed (${e.message}); trying music_v1`);
        return post('https://api.elevenlabs.io/v1/music', { prompt, music_length_ms: ms, force_instrumental: true });
      }
    },
  });
}

const only = process.argv.slice(2);
const todo = jobs.filter((j) => (only.length ? only.includes(j.name) : !fs.existsSync(path.join(OUT, j.name + '.mp3'))));
console.log(`${todo.length} to generate`);

async function work(job) {
  const raw = path.join(RAW, job.name + '.mp3');
  const out = path.join(OUT, job.name + '.mp3');
  try {
    fs.writeFileSync(raw, await job.run());
    if (job.kind === 'sfx') ff(['-i', raw, '-af', `${trim},loudnorm=I=-18:TP=-2:LRA=11`, '-ar', '44100', '-b:a', '128k', out]);
    else if (job.kind === 'loop') ff(['-i', raw, '-af', 'loudnorm=I=-22:TP=-2:LRA=11', '-ar', '44100', '-b:a', '128k', out]);
    else ff(['-i', raw, '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11', '-ar', '44100', '-b:a', '160k', out]);
    console.log(`ok   ${job.name}`);
  } catch (e) {
    console.log(`FAIL ${job.name}: ${e.message}`);
  }
}

const queue = [...todo];
await Promise.all([0, 1, 2].map(async () => { while (queue.length) await work(queue.shift()); }));

const have = fs.readdirSync(OUT).filter((f) => f.endsWith('.mp3')).map((f) => f.replace('.mp3', '')).sort();
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(have));
console.log(`manifest: ${have.length} sounds`);
