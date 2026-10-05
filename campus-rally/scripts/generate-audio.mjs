/**
 * Generates the ORIGINAL placeholder sound effects and music loop used by the prototype.
 * Everything is synthesized from sine/triangle waves here — no samples or third-party audio.
 * Output: assets/audio/*.wav (16-bit mono PCM). Re-run with `npm run generate:assets`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'assets', 'audio');
const RATE = 22050;

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const osc = {
  sine: (p) => Math.sin(2 * Math.PI * p),
  tri: (p) => 1 - 4 * Math.abs(Math.round(p - 0.25) - (p - 0.25)),
};

/** notes: [{ n: midi, t: start seconds, d: duration, v: volume, w: wave, slide: semitones }] */
function render(notes, length) {
  const out = new Float32Array(Math.ceil(length * RATE));
  for (const note of notes) {
    const start = Math.floor(note.t * RATE);
    const count = Math.floor(note.d * RATE);
    const attack = Math.min(0.01 * RATE, count / 4);
    let phase = 0;
    for (let i = 0; i < count && start + i < out.length; i += 1) {
      const progress = i / count;
      const freq = midi(note.n + (note.slide ?? 0) * progress);
      phase += freq / RATE;
      const env = i < attack ? i / attack : Math.pow(1 - progress, note.decay ?? 2);
      out[start + i] += osc[note.w ?? 'tri'](phase % 1) * env * (note.v ?? 0.4);
    }
  }
  return out;
}

const sfx = {
  tap: render([{ n: 84, t: 0, d: 0.05, v: 0.25, w: 'sine' }], 0.06),
  swap: render([{ n: 72, t: 0, d: 0.08, v: 0.3, slide: 5 }], 0.09),
  invalid: render(
    [
      { n: 60, t: 0, d: 0.09, v: 0.3, slide: -3 },
      { n: 57, t: 0.09, d: 0.1, v: 0.3, slide: -3 },
    ],
    0.2,
  ),
  match: render(
    [
      { n: 76, t: 0, d: 0.12, v: 0.3 },
      { n: 83, t: 0.04, d: 0.12, v: 0.22, w: 'sine' },
    ],
    0.18,
  ),
  cascade: render(
    [76, 79, 83, 88].map((n, i) => ({ n, t: i * 0.05, d: 0.12, v: 0.25 })),
    0.32,
  ),
  special: render(
    [
      { n: 64, t: 0, d: 0.3, v: 0.35, slide: 24, decay: 1 },
      { n: 88, t: 0.12, d: 0.2, v: 0.2, w: 'sine' },
    ],
    0.34,
  ),
  booster: render(
    [
      { n: 55, t: 0, d: 0.35, v: 0.4, slide: 19, decay: 1 },
      { n: 79, t: 0.1, d: 0.25, v: 0.25, w: 'sine' },
    ],
    0.4,
  ),
  objective: render(
    [72, 76, 79].map((n, i) => ({ n, t: i * 0.07, d: 0.18, v: 0.28, w: 'sine' })),
    0.4,
  ),
  win: render(
    [
      ...[67, 72, 76, 79].map((n, i) => ({ n, t: i * 0.11, d: 0.22, v: 0.3 })),
      { n: 84, t: 0.46, d: 0.6, v: 0.3, decay: 1.5 },
      { n: 79, t: 0.46, d: 0.6, v: 0.2, w: 'sine', decay: 1.5 },
    ],
    1.1,
  ),
  lose: render(
    [67, 65, 64, 60].map((n, i) => ({ n, t: i * 0.14, d: 0.24, v: 0.25, w: 'sine' })),
    0.8,
  ),
};

// 8-second, 120 BPM loop: soft chord pads + a simple bass line (I–vi–IV–V in C).
const chords = [
  [60, 64, 67],
  [57, 60, 64],
  [53, 57, 60],
  [55, 59, 62],
];
const music = [];
chords.forEach((chord, bar) => {
  for (const n of chord) music.push({ n, t: bar * 2, d: 2, v: 0.07, w: 'sine', decay: 0.6 });
  for (let beat = 0; beat < 4; beat += 1) {
    music.push({ n: chord[0] - 24, t: bar * 2 + beat * 0.5, d: 0.4, v: 0.12, w: 'tri', decay: 2 });
    if (beat % 2 === 1)
      music.push({ n: chord[2] + 12, t: bar * 2 + beat * 0.5, d: 0.15, v: 0.04, w: 'sine' });
  }
});

mkdirSync(outDir, { recursive: true });
for (const [name, samples] of Object.entries(sfx))
  writeFileSync(path.join(outDir, `${name}.wav`), wav(samples));
writeFileSync(path.join(outDir, 'music-loop.wav'), wav(render(music, 8)));
console.log(`Wrote ${Object.keys(sfx).length + 1} audio files to ${path.relative(root, outDir)}`);
