// Build pipeline for "Every Square Has a Name".
//
//   node 2026-09-30-build.mjs voice    robot narration (espeak-ng + MBROLA) -> timeline
//   node 2026-09-30-build.mjs html     assemble the self-contained classroom player
//   node 2026-09-30-build.mjs audio    sound effects + music + narration -> soundtracks
//   node 2026-09-30-build.mjs script   teacher script with timecodes (markdown)
//   node 2026-09-30-build.mjs render   frame-by-frame render -> MP4s (with and without voice)
//   node 2026-09-30-build.mjs all      everything, in order
//   node 2026-09-30-build.mjs stills 12.5 40 ...   PNG stills at given seconds (for checking)
//
// Needs: node 18+, ffmpeg, espeak-ng + mbrola-us1, Playwright (global install is fine:
// NODE_PATH=$(npm root -g)). Intermediate files go to $TMPDIR/square-names-build.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { BEATS, VOICE, TIMING } from './2026-09-30-lesson-script.mjs';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LESSON = path.resolve(HERE, '..');
const BUILD = path.join(os.tmpdir(), 'square-names-build');
const P = {
  template: path.join(HERE, '2026-09-30-lesson-template.html'),
  engine: path.join(HERE, '2026-09-30-animation.js'),
  direction: path.join(HERE, '2026-09-30-direction.js'),
  pieces: process.env.PIECES || path.join(HERE, '2026-09-30-piece-art.js'),
  font: path.join(HERE, 'fonts', '2026-09-30-fredoka.woff2'),
  timeline: path.join(BUILD, 'timeline.json'),
  html: path.join(LESSON, '2026-09-30-square-names-lesson.html'),
  audVoice: '2026-09-30-square-names-soundtrack.m4a',
  audNoVoice: '2026-09-30-square-names-soundtrack-no-voice.m4a',
  mp4: path.join(LESSON, '2026-09-30-square-names-video.mp4'),
  mp4NoVoice: path.join(LESSON, '2026-09-30-square-names-video-no-voice.mp4'),
  script: path.join(LESSON, '2026-09-30-square-names-script.md'),
  srt: path.join(LESSON, '2026-09-30-square-names-captions.srt'),
};
const SR = 48000;
const FPS = 30;
fs.mkdirSync(path.join(BUILD, 'voice'), { recursive: true });

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 30, ...opts });
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));

// ---------------------------------------------------------------- audio helpers
function decode(file) { // any audio file -> Float32Array mono @ SR
  const buf = run('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-']);
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4).slice();
}
function trim(x, thr = 0.008, pad = 0.03) {
  let a = 0, b = x.length - 1;
  while (a < x.length && Math.abs(x[a]) < thr) a++;
  while (b > a && Math.abs(x[b]) < thr) b--;
  const p = Math.round(pad * SR);
  return x.slice(Math.max(0, a - p), Math.min(x.length, b + p));
}
function writeRaw(x, file) { fs.writeFileSync(file, Buffer.from(x.buffer, x.byteOffset, x.byteLength)); }
function encode(x, out, args) {
  const raw = out + '.f32';
  writeRaw(x, raw);
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', raw, ...args, out]);
  fs.unlinkSync(raw);
}

// ---------------------------------------------------------------- 1. voice + timeline
const clipKey = (b, i) => `${b.id}__${i}`;
function voice() {
  const clips = {};
  for (const b of BEATS) { // the letter a must be spelled [['eI]] or the voice says "uh"
    if (/\{L:a\}|\{a[1-8]\}/.test(b.cap) && !b.say.some(p => typeof p === 'string' && p.includes("[['eI]]")))
      throw new Error(`beat ${b.id}: caption names the letter a but the spoken text does not force [['eI]]`);
  }
  for (const b of BEATS) {
    b.say.forEach((part, i) => {
      if (typeof part !== 'string') return;
      const wav = path.join(BUILD, 'voice', clipKey(b, i) + '.wav');
      run('espeak-ng', ['-v', VOICE.voice, '-s', String(b.rate || VOICE.rate), '-p', String(VOICE.pitch), '-g', String(VOICE.wordGap), '-w', wav, part]);
      const x = trim(decode(wav));
      writeRaw(x, wav.replace(/\.wav$/, '.f32'));
      clips[clipKey(b, i)] = x.length / SR;
    });
  }
  // lay the beats end to end
  let t = TIMING.lead;
  const beats = [];
  for (const b of BEATS) {
    const t0 = t;
    let cur = t0 + (b.pre ?? TIMING.pre);
    const segs = [];
    b.say.forEach((part, i) => {
      if (typeof part === 'number') { cur += part; return; }
      const d = clips[clipKey(b, i)];
      segs.push({ start: +cur.toFixed(3), end: +(cur + d).toFixed(3), text: part, clip: clipKey(b, i) });
      cur += d + (b.gap ?? TIMING.gap);
    });
    if (segs.length) cur -= b.gap ?? TIMING.gap;
    const end = Math.max(cur + (b.hold ?? TIMING.hold), t0 + (b.min ?? 0));
    beats.push({ id: b.id, scene: b.scene, caption: b.cap, t0: +t0.toFixed(3), end: +end.toFixed(3), segs });
    t = end;
  }
  const tl = { fps: FPS, duration: +(t + TIMING.tail).toFixed(3), beats };
  fs.writeFileSync(P.timeline, JSON.stringify(tl, null, 1));
  console.log(`voice: ${Object.keys(clips).length} clips, video length ${fmt(tl.duration)}`);
  return tl;
}

// ---------------------------------------------------------------- 2. html
function html() {
  const tl = readJSON(P.timeline);
  const engine = fs.readFileSync(P.engine, 'utf8').replace('/*__DIRECTION__*/', () => fs.readFileSync(P.direction, 'utf8'));
  const out = fs.readFileSync(P.template, 'utf8')
    .replace('/*__FONT__*/', () => fs.readFileSync(P.font).toString('base64'))
    .replace('/*__TIMELINE__*/', () => JSON.stringify(tl))
    .replace('/*__PIECES__*/', () => fs.readFileSync(P.pieces, 'utf8'))
    .replace('/*__ANIMATION__*/', () => engine)
    .replace('/*__AUDIO_VOICE__*/', P.audVoice)
    .replace('/*__AUDIO_NOVOICE__*/', P.audNoVoice);
  fs.writeFileSync(P.html, out);
  console.log(`html: ${path.relative(LESSON, P.html)} (${(out.length / 1024).toFixed(0)} KB)`);
}

// ---------------------------------------------------------------- browser helper
async function browser() {
  const { chromium } = require('playwright');
  const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p => fs.existsSync(p));
  return chromium.launch(exe ? { executablePath: exe } : {});
}
async function openLesson(b) {
  const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + P.html + '?render=1');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => typeof window.__render === 'function' || false, null, { timeout: 5000 }).catch(() => {});
  if (errors.length) throw new Error('page errors:\n' + errors.join('\n'));
  return page;
}

// ---------------------------------------------------------------- 3. audio (sfx + music + mix)
function synthSfx() {
  const S = {};
  const buf = sec => new Float32Array(Math.round(sec * SR));
  const noise = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
  const bell = (f, dur, partials, decay) => {
    const x = buf(dur);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR, a = Math.min(1, t / 0.004);
      let v = 0;
      for (const [m, g, d] of partials) v += g * Math.sin(2 * Math.PI * f * m * t) * Math.exp(-t / (decay * d));
      x[i] = v * a;
    }
    return x;
  };
  const marimba = (f, dur = 0.9) => bell(f, dur, [[1, 1, 1], [4, 0.28, 0.25], [10, 0.06, 0.1]], 0.32);
  const cat = (...parts) => { // [buffer, offsetSec]
    const len = Math.max(...parts.map(([b, o]) => b.length + Math.round(o * SR)));
    const x = new Float32Array(len);
    for (const [b, o] of parts) { const k = Math.round(o * SR); for (let i = 0; i < b.length; i++) x[k + i] += b[i]; }
    return x;
  };
  S.chime = cat([bell(1046.5, 1.6, [[1, 1, 1], [2.01, 0.3, 0.5], [3.02, 0.12, 0.3]], 0.5), 0], [bell(1568, 1.6, [[1, 0.9, 1], [2.01, 0.25, 0.5]], 0.5), 0.11]);
  S.ding = bell(1318.5, 1.8, [[1, 1, 1], [2.76, 0.25, 0.4], [5.4, 0.08, 0.2]], 0.55);
  S.tick = (() => { const x = buf(0.08); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = (Math.sin(2 * Math.PI * 1800 * t) * 0.6 + Math.sin(2 * Math.PI * 950 * t) * 0.5 + noise(i) * 0.3 * Math.exp(-t / 0.003)) * Math.exp(-t / 0.018); } return x; })();
  S.pop = (() => { const x = buf(0.14); let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / SR, f = 520 + 900 * (t / 0.14); ph += (2 * Math.PI * f) / SR; x[i] = Math.sin(ph) * Math.exp(-t / 0.045) * Math.min(1, t / 0.002); } return x; })();
  S.card = (() => { const x = buf(0.2); let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / SR, f = 300 + 260 * (t / 0.2); ph += (2 * Math.PI * f) / SR; x[i] = Math.sin(ph) * Math.exp(-t / 0.07) * Math.min(1, t / 0.004) * 0.8; } return x; })();
  S.swoosh = (() => { const x = buf(0.5); let lp = 0; for (let i = 0; i < x.length; i++) { const t = i / SR, k = 0.02 + 0.25 * Math.sin(Math.PI * t / 0.5); lp += k * (noise(i) - lp); x[i] = lp * Math.sin(Math.PI * t / 0.5) * 1.6; } return x; })();
  S.slide = (() => { const x = buf(0.45); let lp = 0; for (let i = 0; i < x.length; i++) { const t = i / SR; lp += 0.06 * (noise(i) - lp); x[i] = lp * Math.sin(Math.PI * t / 0.45) * 2.2; } return x; })();
  S.drop = (() => { const x = buf(0.25); let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / SR, f = 170 - 90 * Math.min(1, t / 0.12); ph += (2 * Math.PI * f) / SR; x[i] = Math.sin(ph) * Math.exp(-t / 0.06) + noise(i) * 0.25 * Math.exp(-t / 0.006); } return x; })();
  S.buzz = (() => { const x = buf(0.75); for (let i = 0; i < x.length; i++) { const t = i / SR, f = t < 0.3 ? 392 : 311; let v = 0; for (const h of [1, 2, 3, 4]) v += Math.sin(2 * Math.PI * f * h * t) / (h * h); const seg = t < 0.3 ? t : t - 0.32; x[i] = seg < 0 ? 0 : v * 0.6 * Math.min(1, seg / 0.01) * Math.exp(-seg / 0.25); } return x; })();
  const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5;
  S.tada = cat([marimba(C5), 0], [marimba(E5), 0.1], [marimba(G5), 0.2], [marimba(C6, 1.4), 0.3], [marimba(G5 / 2, 1.4), 0.3]);
  S.blip = (() => { const x = buf(0.1); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = Math.sin(2 * Math.PI * 1175 * t) * Math.exp(-t / 0.03) * Math.min(1, t / 0.002); } return x; })();
  S.step = (() => { const x = buf(0.12); let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / SR, f = 240 - 100 * (t / 0.12); ph += (2 * Math.PI * f) / SR; x[i] = Math.sin(ph) * Math.exp(-t / 0.035) + noise(i) * 0.15 * Math.exp(-t / 0.004); } return x; })();
  S.bonk = (() => { const x = buf(0.4); let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / SR, f = 200 - 55 * Math.min(1, t / 0.25); ph += (2 * Math.PI * f) / SR; x[i] = (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * Math.exp(-t / 0.12) * Math.min(1, t / 0.004); } return x; })();
  S.whoosh = (() => { const d = 1.6, x = buf(d); let lp = 0, lp2 = 0; for (let i = 0; i < x.length; i++) { const t = i / SR, e = Math.sin(Math.PI * t / d), k = 0.01 + 0.12 * e; lp += k * (noise(i) - lp); lp2 += k * (lp - lp2); x[i] = lp2 * e * 3; } return x; })();
  S.sparkle = cat(...[0, 1, 2, 3, 4, 5].map(i => [bell(1800 + i * 260, 0.4, [[1, 1, 1]], 0.08), i * 0.06]));
  for (const k in S) { let m = 0; for (const v of S[k]) m = Math.max(m, Math.abs(v)); for (let i = 0; i < S[k].length; i++) S[k][i] /= m || 1; }
  return S;
}
// gentle marimba + bass loop (I – vi – IV – V in C), 96 bpm
function synthMusic(dur) {
  const x = new Float32Array(Math.round(dur * SR));
  const beat = 60 / 96, bar = beat * 4;
  const chords = [[261.63, 329.63, 392.0], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 246.94, 293.66]];
  const pattern = [0, 1, 2, 1, 0, 2, 1, 2]; // eighth notes
  const addNote = (t0, f, g, decay, harm) => {
    const i0 = Math.round(t0 * SR), n = Math.min(x.length - i0, Math.round(decay * 5 * SR));
    for (let i = 0; i < n; i++) {
      const t = i / SR, a = Math.min(1, t / 0.005) * Math.exp(-t / decay);
      let v = Math.sin(2 * Math.PI * f * t);
      if (harm) v += 0.25 * Math.sin(2 * Math.PI * f * 4 * t) * Math.exp(-t / (decay * 0.3));
      x[i0 + i] += g * a * v;
    }
  };
  for (let b = 0; b * bar < dur; b++) {
    const ch = chords[b % 4], t0 = b * bar;
    addNote(t0, ch[0] / 2, 0.55, 0.9, false);
    addNote(t0 + beat * 2, ch[0] / 2, 0.4, 0.7, false);
    pattern.forEach((k, i) => addNote(t0 + i * beat / 2, ch[k] * 2, i % 2 ? 0.16 : 0.24, 0.28, true));
    if (b % 2 === 1) addNote(t0 + beat * 3.5, ch[2] * 4, 0.08, 0.25, true);
  }
  let m = 0; for (const v of x) m = Math.max(m, Math.abs(v));
  for (let i = 0; i < x.length; i++) x[i] /= m;
  return x;
}
async function audio() {
  const tl = readJSON(P.timeline);
  const b = await browser();
  const page = await openLesson(b);
  const info = await page.evaluate(() => window.__info());
  await b.close();
  fs.writeFileSync(path.join(BUILD, 'cues.json'), JSON.stringify(info.cues, null, 1));
  const N = Math.round(tl.duration * SR);
  const voiceT = new Float32Array(N), sfxT = new Float32Array(N);
  // narration
  for (const beat of tl.beats) for (const s of beat.segs) {
    const f = path.join(BUILD, 'voice', s.clip + '.f32');
    const raw = fs.readFileSync(f), clip = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
    const i0 = Math.round(s.start * SR);
    for (let i = 0; i < clip.length && i0 + i < N; i++) voiceT[i0 + i] += clip[i];
  }
  let vm = 0; for (const v of voiceT) vm = Math.max(vm, Math.abs(v));
  for (let i = 0; i < N; i++) voiceT[i] *= 0.8 / (vm || 1);
  // sound effects
  const S = synthSfx();
  const SFX_GAIN = { chime: 0.28, ding: 0.24, tick: 0.3, pop: 0.2, card: 0.18, swoosh: 0.12, slide: 0.15, drop: 0.22, buzz: 0.2, tada: 0.28, sparkle: 0.14, blip: 0.12, step: 0.22, bonk: 0.3, whoosh: 0.2 };
  for (const c of info.cues) {
    const s = S[c.name];
    if (!s) throw new Error('unknown sfx cue ' + c.name);
    const g = (SFX_GAIN[c.name] ?? 0.2) * c.gain, i0 = Math.round(c.t * SR);
    for (let i = 0; i < s.length && i0 + i < N; i++) sfxT[i0 + i] += s[i] * g;
  }
  // music, ducked under speech, quieter during thinking time
  const music = synthMusic(tl.duration);
  const duck = new Float32Array(N).fill(1);
  const speech = tl.beats.flatMap(b => b.segs.map(s => [s.start, s.end]));
  for (const [a, e] of speech) {
    const i0 = Math.max(0, Math.round((a - 0.25) * SR)), i1 = Math.min(N, Math.round((e + 0.35) * SR));
    for (let i = i0; i < i1; i++) duck[i] = 0.42;
  }
  // smooth the ducking envelope (one-pole, ~120ms each way)
  const k = 1 - Math.exp(-1 / (0.12 * SR));
  for (let i = 1; i < N; i++) duck[i] = duck[i - 1] + k * (duck[i] - duck[i - 1]);
  for (let i = N - 2; i >= 0; i--) duck[i] = duck[i + 1] + k * (duck[i] - duck[i + 1]) > duck[i] ? duck[i] : duck[i + 1] + k * (duck[i] - duck[i + 1]);
  const MUSIC = 0.14, fadeIn = 1.5 * SR, fadeOut = 3 * SR;
  const bed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const f = Math.min(1, i / fadeIn, (N - i) / fadeOut);
    bed[i] = music[i] * MUSIC * duck[i] * f + sfxT[i];
  }
  const soft = v => Math.tanh(v * 1.1) / Math.tanh(1.1);
  const full = new Float32Array(N), novoice = new Float32Array(N);
  for (let i = 0; i < N; i++) { full[i] = soft(bed[i] + voiceT[i]); novoice[i] = soft(bed[i]); }
  const aac = ['-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart'];
  encode(full, path.join(BUILD, 'full.wav'), ['-c:a', 'pcm_s16le']);
  encode(novoice, path.join(BUILD, 'novoice.wav'), ['-c:a', 'pcm_s16le']);
  encode(full, path.join(LESSON, P.audVoice), aac);
  encode(novoice, path.join(LESSON, P.audNoVoice), aac);
  console.log(`audio: ${info.cues.length} sound effects, ${speech.length} narration clips, ${fmt(tl.duration)}`);
}

// ---------------------------------------------------------------- 4. teacher script
function script() {
  const tl = readJSON(P.timeline);
  const byId = Object.fromEntries(BEATS.map(b => [b.id, b]));
  const plain = s => s.replace(/\{([a-h])([1-8])\}/g, '$1$2').replace(/\{[LN]:([^}]+)\}/g, '$1').replace(/\*([^*]+)\*/g, '$1');
  const lines = [];
  lines.push('# Every Square Has a Name — narration script', '');
  lines.push('Files, ranks and square names (coordinates) for K-1 players. The full narration with timecodes, for recording your own voice or reading it live.', '');
  lines.push(`**Running time:** ${fmt(tl.duration)}  `);
  lines.push('**Color code on screen:** letters / files are **blue**, numbers / ranks are **orange**.  ');
  lines.push("**Saying square names:** letter first, then number — a1 = \"ay one\", e4 = \"ee four\", f3 = \"eff three\".  ");
  lines.push('**Timecodes** show when each line starts (minutes:seconds.tenths). ⏸ = built-in thinking time while students answer out loud.', '');
  lines.push('## Files in this folder', '');
  lines.push('| File | What it is |', '|---|---|');
  lines.push('| `2026-09-30-square-names-video.mp4` | The video with the robot voice, music and sound effects |');
  lines.push('| `2026-09-30-square-names-video-no-voice.mp4` | Same video with music and sound effects only — record your own voice over it using the timecodes below |');
  lines.push('| `2026-09-30-square-names-captions.srt` | Every caption with its timing; import it into your video editor to see where each line goes |');
  lines.push('| `2026-09-30-square-names-lesson.html` | Classroom player (keep the two `.m4a` files next to it). `Space` pause · `←` `→` previous / next part · `V` robot voice on/off · `C` captions · `F` full screen |');
  lines.push('| `source/` | Everything used to build the video (see the top of `source/2026-09-30-build.mjs` to rebuild) |', '');
  let scene = null;
  for (const b of tl.beats) {
    const src = byId[b.id];
    if (b.scene !== scene) { scene = b.scene; lines.push(`## ${scene}`, ''); }
    const say = b.segs.map(s => s.start);
    const t = say.length ? say[0] : b.t0;
    const thinking = src.say.some(p => typeof p === 'number' && p >= 3);
    lines.push(`**${fmt(t, true)}** — ${plain(src.cap)}${thinking ? '  ⏸ *thinking time*' : ''}  `);
    if (src.note) lines.push(`<sub>On screen: ${src.note}</sub>`);
    lines.push('');
  }
  lines.push('---', '', '*Voice: espeak-ng with the MBROLA us1 voice (placeholder robot narration). Font: Fredoka (SIL Open Font License). Music and sound effects are synthesized by the build script.*', '');
  fs.writeFileSync(P.script, lines.join('\n'));
  // captions as subtitles (for video editors): one cue per beat, from first word to next beat
  const ts = x => { const ms = Math.round(x * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
  const srt = tl.beats.map((b, i) => `${i + 1}\n${ts(b.t0)} --> ${ts(b.end)}\n${plain(byId[b.id].cap)}\n`).join('\n');
  fs.writeFileSync(P.srt, srt);
  console.log(`script: ${path.relative(LESSON, P.script)}, ${path.relative(LESSON, P.srt)}`);
}

// ---------------------------------------------------------------- 5. render
async function renderRange(b, a, z, out) {
  const page = await openLesson(b);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  for (let f = a; f < z; f++) {
    await page.evaluate(t => window.__render(t), f / FPS);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - a) % 300 === 0) console.log(`  frames ${f}/${z}`);
  }
  ff.stdin.end();
  await done;
  await page.close();
}
async function render() {
  const tl = readJSON(P.timeline);
  const total = Math.ceil(tl.duration * FPS);
  const W = Number(process.env.WORKERS || 3);
  const b = await browser();
  const parts = [];
  const per = Math.ceil(total / W);
  for (let w = 0; w < W; w++) parts.push([w * per, Math.min(total, (w + 1) * per), path.join(BUILD, `part${w}.mp4`)]);
  console.log(`render: ${total} frames in ${W} parts`);
  await Promise.all(parts.map(([a, z, out]) => renderRange(b, a, z, out)));
  await b.close();
  const list = path.join(BUILD, 'parts.txt');
  fs.writeFileSync(list, parts.map(p => `file '${p[2]}'`).join('\n'));
  const video = path.join(BUILD, 'video.mp4');
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
  for (const [wav, out] of [['full.wav', P.mp4], ['novoice.wav', P.mp4NoVoice]]) {
    run('ffmpeg', ['-v', 'error', '-y', '-i', video, '-i', path.join(BUILD, wav), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
    console.log(`  wrote ${path.relative(LESSON, out)} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
  }
}
async function stills(times) {
  const b = await browser();
  const page = await openLesson(b);
  const dir = path.join(BUILD, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  for (const t of times) {
    await page.evaluate(x => window.__render(x), +t);
    const f = path.join(dir, `t${String(t).padStart(6, '0')}.png`);
    await page.screenshot({ path: f });
    console.log(f);
  }
  await b.close();
}

function fmt(s, tenths = false) {
  const m = Math.floor(s / 60), r = s - m * 60;
  return tenths ? `${m}:${r.toFixed(1).padStart(4, '0')}` : `${m}:${String(Math.floor(r)).padStart(2, '0')}`;
}

const [cmd, ...rest] = process.argv.slice(2);
const steps = { voice, html, audio, script, render };
if (cmd === 'all') { voice(); html(); await audio(); script(); await render(); }
else if (cmd === 'stills') await stills(rest);
else if (steps[cmd]) await steps[cmd]();
else { console.log('usage: node 2026-09-30-build.mjs voice|html|audio|script|render|all|stills <sec...>'); process.exit(1); }
