/* Every Square Has a Name — animation engine + direction.
 *
 * Everything on screen is a pure function of time t (seconds), so the same file drives
 * both the classroom player (t = audio clock) and the frame-by-frame MP4 render
 * (window.__render(t)). Visual changes are declared up front as tweens on named
 * properties; nothing is random or clock-dependent at draw time.
 */
(() => {
'use strict';
const NS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('svg');
const capEl = document.getElementById('cap');
const TL = window.TIMELINE;
const RENDER = /[?&]render=1/.test(location.search);
if (RENDER) document.documentElement.classList.add('render');

// ------------------------------------------------------------------ utilities
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, p) => a + (b - a) * p;
const E = {
  lin: p => p,
  io: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  out: p => 1 - Math.pow(1 - p, 3),
  in: p => p * p * p,
  back: p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
};
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, p) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(p)))).join(',')})`;
}
// Orange is reserved for ranks/numbers and blue for files/letters; every other accent is
// sunshine yellow, so the color code never gets muddled.
const C = {
  file: '#1E78F0', fileDark: '#1257B0', rank: '#F57A12', rankDark: '#B8560A',
  light: '#F3EBD2', dark: '#6FA055', ink: '#1D2B14', gold: '#FFD23F', sun: '#FFD23F', sunDark: '#D9A60F',
  white: '#FFFFFF', frame: '#2E5A2A', frameHi: '#467D3C',
};

// ------------------------------------------------------------------ tweens
// Each property key holds a list of segments {t0, dur, to, from?, ease}. The value at
// time t comes from the latest segment that has started; a segment without `from`
// starts from wherever the property was at that moment.
const TR = new Map();
function tw(key, to, t0, dur = 0.5, ease = E.io, from) {
  let a = TR.get(key);
  if (!a) TR.set(key, (a = []));
  a.push({ t0, dur: Math.max(0, dur), to, from, ease });
  a.sorted = false;
}
const set = (key, to, t0) => tw(key, to, t0, 0, E.lin);
function segAt(s, from, t) {
  if (typeof s.to !== 'number' || typeof from !== 'number') return t >= s.t0 ? s.to : from;
  if (s.dur <= 0 || t >= s.t0 + s.dur) return s.to;
  return from + (s.to - from) * s.ease(clamp((t - s.t0) / s.dur));
}
function V(key, t, def) {
  const a = TR.get(key);
  if (!a) return def;
  if (!a.sorted) { a.sort((x, y) => x.t0 - y.t0); a.sorted = true; }
  let prev = null, prevFrom = def;
  for (const s of a) {
    if (s.t0 > t) break;
    const cur = prev ? segAt(prev, prevFrom, s.t0) : def;
    prevFrom = s.from !== undefined ? s.from : cur;
    prev = s;
  }
  return prev ? segAt(prev, prevFrom, t) : def;
}
// fade helper: property goes 0→1 at t0 and back to 0 at t1
function show(key, t0, t1, fin = 0.35, fout = 0.35) {
  tw(key, 1, t0, fin, E.out);
  if (t1 != null) tw(key, 0, t1, fout, E.io);
}

// ------------------------------------------------------------------ cues (sfx)
const CUES = [];
function cue(name, t, gain = 1) { CUES.push({ name, t: Math.round(t * 1000) / 1000, gain }); }

// ------------------------------------------------------------------ timeline
const BEATS = TL.beats;
const BT = Object.fromEntries(BEATS.map(b => [b.id, b]));
function B(id) {
  const b = BT[id];
  if (!b) throw new Error('Direction refers to missing beat: ' + id);
  return b;
}
// speech segment k of a beat (speech only, silences are not segments)
const S = (id, k = 0) => {
  const b = B(id);
  if (!b.segs[k]) throw new Error(`Beat ${id} has no speech segment ${k}`);
  return b.segs[k];
};
const SPEECH = BEATS.flatMap(b => b.segs.map(s => [s.start, s.end]));
function speaking(t) {
  for (const [a, b] of SPEECH) if (t >= a && t < b) return true;
  return false;
}

// ------------------------------------------------------------------ frame hooks
const UPD = [];
const onFrame = fn => UPD.push(fn);
const FX = []; // procedural effects {kind, t0, dur, ...}

// ================================================================== SCENE GRAPH
const SQ = 92, BW = SQ * 8;
const BCX = 960, BCY = 56 + BW / 2; // board centre on stage
const FILES = 'abcdefgh';
const fi = f => FILES.indexOf(f);
// board-local centre of a square (0,0 = top-left of a8 when viewed from White)
const sqXY = sq => [fi(sq[0]) * SQ + SQ / 2, (8 - +sq[1]) * SQ + SQ / 2];
const isDark = sq => (fi(sq[0]) + +sq[1]) % 2 === 1;

// ---------------------------------------------------------------- defs (shared, static)
const defs = el('defs', {}, svg);
defs.innerHTML = `
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2FB6F0"/><stop offset=".55" stop-color="#8ADDFB"/><stop offset="1" stop-color="#D4F4FF"/>
  </linearGradient>
  <radialGradient id="sun" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#FFFBE0" stop-opacity="1"/><stop offset=".35" stop-color="#FFF4B8" stop-opacity=".85"/>
    <stop offset="1" stop-color="#FFF4B8" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="dim" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0B2A08" stop-opacity=".55"/><stop offset="1" stop-color="#0B2A08" stop-opacity=".75"/>
  </linearGradient>`;

// ---------------------------------------------------------------- background
const bg = el('g', { id: 'bg' }, svg);
el('rect', { x: 0, y: 0, width: 1920, height: 1080, fill: 'url(#sky)' }, bg);
el('circle', { cx: 1530, cy: 130, r: 260, fill: 'url(#sun)' }, bg);
// distant mountains + castle (soft blue, like a far-away land)
el('path', { d: 'M0 560 L180 380 L330 500 L520 300 L720 520 L900 420 L1080 540 L1250 330 L1460 520 L1640 360 L1800 470 L1920 400 L1920 700 L0 700Z', fill: '#B9D9F2' }, bg);
el('path', { d: 'M0 610 L240 470 L420 580 L640 440 L860 600 L1100 470 L1320 610 L1560 450 L1760 590 L1920 520 L1920 720 L0 720Z', fill: '#A6CDEB' }, bg);
const castle = el('g', { transform: 'translate(1010 250)', fill: '#CFE6F7', stroke: '#B3D3EE', 'stroke-width': 3 }, bg);
castle.innerHTML = `<rect x="0" y="80" width="190" height="240"/><rect x="-40" y="20" width="70" height="300"/><rect x="160" y="40" width="70" height="280"/>
  <path d="M-40 20 v-26 h14 v14 h14 v-14 h14 v14 h14 v-14 h14 v26z"/><path d="M160 40 v-26 h14 v14 h14 v-14 h14 v14 h14 v-14 h14 v26z"/>
  <path d="M0 80 v-22 h19 v12 h19 v-12 h19 v12 h19 v-12 h19 v12 h19 v-12 h19 v12 h19 v-12 h19 v22z"/>
  <path d="M75 320 v-60 a20 20 0 0 1 40 0 v60z" fill="#B3D3EE"/>`;
// clouds (drift slowly)
const clouds = [];
function cloud(x, y, s, speed) {
  const g = el('g', {}, bg);
  g.innerHTML = `<g fill="#fff" opacity=".95"><ellipse cx="0" cy="0" rx="90" ry="46"/><ellipse cx="-70" cy="16" rx="62" ry="34"/>
    <ellipse cx="72" cy="14" rx="66" ry="36"/><ellipse cx="18" cy="-30" rx="58" ry="44"/></g>`;
  clouds.push({ g, x, y, s, speed });
}
cloud(260, 120, 1.0, 5); cloud(860, 90, 0.8, 3.5); cloud(1300, 190, 0.7, 4.2); cloud(1720, 80, 1.1, 2.8); cloud(560, 250, 0.55, 6);
onFrame(t => {
  for (const c of clouds) {
    const x = ((c.x + t * c.speed + 300) % 2400) - 300;
    c.g.setAttribute('transform', `translate(${x.toFixed(1)} ${c.y}) scale(${c.s})`);
  }
});
// hills
el('path', { d: 'M0 700 C260 560 520 600 760 660 C980 720 1200 600 1460 620 C1680 640 1820 600 1920 580 L1920 1080 L0 1080Z', fill: '#8FD05A' }, bg);
el('path', { d: 'M0 780 C300 690 600 740 960 760 C1320 780 1600 700 1920 720 L1920 1080 L0 1080Z', fill: '#74BC43' }, bg);
// checkered meadow in perspective (a nod to the board)
const meadow = el('g', { opacity: 0.5 }, bg);
for (let i = 0; i < 14; i++) {
  const y0 = 830 + i * i * 1.9, y1 = 830 + (i + 1) * (i + 1) * 1.9;
  if (y0 > 1080) break;
  for (let j = -12; j < 12; j++) {
    if ((i + j) % 2 === 0) continue;
    const k0 = 0.6 + i * 0.18, k1 = 0.6 + (i + 1) * 0.18;
    const p = [[960 + j * 110 * k0, y0], [960 + (j + 1) * 110 * k0, y0], [960 + (j + 1) * 110 * k1, y1], [960 + j * 110 * k1, y1]];
    el('path', { d: 'M' + p.map(q => q.map(v => v.toFixed(1)).join(' ')).join(' L') + 'Z', fill: '#9BD865' }, meadow);
  }
}
// trees at the sides
function tree(x, y, s, flip) {
  const g = el('g', { transform: `translate(${x} ${y}) scale(${flip ? -s : s} ${s})` }, bg);
  g.innerHTML = `
    <path d="M-38 0 C-30 -120 -34 -210 -18 -300 L22 -300 C34 -210 30 -120 40 0Z" fill="#9A5A2E" stroke="#6E3D1C" stroke-width="8"/>
    <path d="M-6 -80 q6 -30 0 -60" stroke="#6E3D1C" stroke-width="8" fill="none" stroke-linecap="round"/>
    <g stroke="#2F7A22" stroke-width="8">
      <circle cx="-110" cy="-330" r="110" fill="#3E9A2C"/><circle cx="90" cy="-350" r="120" fill="#3E9A2C"/>
      <circle cx="0" cy="-440" r="130" fill="#47A832"/><circle cx="-40" cy="-300" r="100" fill="#4FB136"/><circle cx="70" cy="-280" r="95" fill="#4FB136"/>
    </g>
    <g fill="#6CC84A" opacity=".8"><circle cx="-30" cy="-470" r="40"/><circle cx="60" cy="-390" r="30"/><circle cx="-120" cy="-360" r="30"/></g>`;
}
tree(70, 830, 1.05, false); tree(1880, 850, 1.1, true);
// bushes
function bush(x, y, s) {
  const g = el('g', { transform: `translate(${x} ${y}) scale(${s})` }, bg);
  g.innerHTML = `<g fill="#3E9A2C" stroke="#2F7A22" stroke-width="6"><circle cx="-60" cy="0" r="50"/><circle cx="60" cy="0" r="50"/><circle cx="0" cy="-26" r="62"/></g>
    <g fill="#5DBE3B"><circle cx="-20" cy="-50" r="20"/><circle cx="40" cy="-30" r="16"/></g>`;
}
bush(330, 900, 1); bush(1600, 905, 0.9); bush(470, 960, 0.7);

// ---------------------------------------------------------------- board
const boardRoot = el('g', { id: 'board' }, svg);
const frameG = el('g', {}, boardRoot);
el('rect', { x: -104, y: -30, width: BW + 134, height: BW + 134, rx: 38, fill: '#1F4A1A', transform: 'translate(0 10)' }, frameG);
el('rect', { x: -104, y: -30, width: BW + 134, height: BW + 134, rx: 38, fill: C.frame, stroke: C.frameHi, 'stroke-width': 6 }, frameG);
const squaresG = el('g', {}, boardRoot);
const shimmer = {};
for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) {
  const sq = FILES[f] + r, [x, y] = sqXY(sq);
  el('rect', { x: x - SQ / 2, y: y - SQ / 2, width: SQ, height: SQ, fill: isDark(sq) ? C.dark : C.light }, squaresG);
  shimmer[sq] = el('rect', { x: x - SQ / 2, y: y - SQ / 2, width: SQ, height: SQ, fill: '#FFFFFF', opacity: 0 }, squaresG);
}
el('rect', { x: -3, y: -3, width: BW + 6, height: BW + 6, rx: 6, fill: 'none', stroke: '#1F4A1A', 'stroke-width': 6 }, squaresG);
const bandsG = el('g', {}, boardRoot);
const ringsG = el('g', {}, boardRoot);
const namesG = el('g', {}, boardRoot);
const labelsG = el('g', {}, boardRoot);
const piecesG = el('g', {}, boardRoot);
const topG = el('g', {}, boardRoot);

// board transform: board.s (scale), board.rot (deg), board.dx/dy (offset), board.o
onFrame(t => {
  const s = V('board.s', t, 1), rot = V('board.rot', t, 0), dx = V('board.dx', t, 0), dy = V('board.dy', t, 0);
  boardRoot.setAttribute('transform', `translate(${BCX + dx} ${BCY + dy}) rotate(${rot}) scale(${s}) translate(${-BW / 2} ${-BW / 2})`);
  boardRoot.setAttribute('opacity', V('board.o', t, 1));
  // square shimmer waves + single-square flashes
  const waves = FX.filter(f => f.kind === 'shimmer' && t >= f.t0 && t < f.t0 + f.dur + 1);
  const flashes = FX.filter(f => f.kind === 'flash' && t >= f.t0 && t < f.t0 + f.dur);
  for (const sq in shimmer) {
    let o = 0;
    for (const w of waves) {
      const d = (fi(sq[0]) + +sq[1] - 1) / 14;
      const p = (t - w.t0) / w.dur - d * 0.7;
      if (p > 0 && p < 0.3) o = Math.max(o, Math.sin((p / 0.3) * Math.PI) * 0.7);
    }
    for (const f of flashes) if (f.sq === sq) o = Math.max(o, Math.sin(((t - f.t0) / f.dur) * Math.PI) * 0.8);
    shimmer[sq].setAttribute('opacity', o.toFixed(3));
  }
});
const flash = (sq, t, dur = 0.55) => FX.push({ kind: 'flash', sq, t0: t, dur });
// board-local point -> stage point at time t
function boardToScreen(x, y, t) {
  const s = V('board.s', t, 1), r = (V('board.rot', t, 0) * Math.PI) / 180;
  const X = (x - BW / 2) * s, Y = (y - BW / 2) * s;
  return [BCX + V('board.dx', t, 0) + X * Math.cos(r) - Y * Math.sin(r), BCY + V('board.dy', t, 0) + X * Math.sin(r) + Y * Math.cos(r)];
}
const rotNow = t => V('board.rot', t, 0);
// transform for things that live on the board but must stay upright
const upright = (x, y, t, s = 1) => `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${-rotNow(t)}) scale(${s.toFixed(4)})`;

// ---------------------------------------------------------------- bands (file = blue column, rank = orange row)
// Position along a band is in "square units": for a file band u=r means "up to the top of rank r";
// for a rank band u=n means "right edge of the n-th file". The label chip sits around u = -0.5.
const LBL = -0.5; // label centre in band units
const BAND_LO = -0.98;
// Bands are drawn as a tinted copy of the board (light/dark blue or orange squares, via a
// checker pattern clipped to the board) plus an outline that also wraps the edge label, so
// they read as pure blue / pure orange instead of mixing with the green squares.
defs.insertAdjacentHTML('beforeend', `
  <clipPath id="bclip"><rect x="0" y="0" width="${BW}" height="${BW}"/></clipPath>
  <pattern id="pfile" patternUnits="userSpaceOnUse" x="0" y="0" width="${2 * SQ}" height="${2 * SQ}">
    <rect width="${2 * SQ}" height="${2 * SQ}" fill="#CFE2FF"/><rect x="${SQ}" width="${SQ}" height="${SQ}" fill="#86B3F7"/><rect y="${SQ}" width="${SQ}" height="${SQ}" fill="#86B3F7"/></pattern>
  <pattern id="prank" patternUnits="userSpaceOnUse" x="0" y="0" width="${2 * SQ}" height="${2 * SQ}">
    <rect width="${2 * SQ}" height="${2 * SQ}" fill="#FFE1C4"/><rect x="${SQ}" width="${SQ}" height="${SQ}" fill="#F8B070"/><rect y="${SQ}" width="${SQ}" height="${SQ}" fill="#F8B070"/></pattern>`);
function bandEls(kind) {
  const g = el('g', { opacity: 0 }, bandsG);
  const fillR = el('rect', { fill: kind === 'file' ? 'url(#pfile)' : 'url(#prank)', 'clip-path': 'url(#bclip)' }, g);
  const col = kind === 'file' ? C.file : C.rank;
  const edge = el('rect', { rx: 20, fill: col, 'fill-opacity': 0.14, stroke: col, 'stroke-width': 7 }, g);
  return { g, fillR, edge };
}
for (let f = 0; f < 8; f++) {
  const L = FILES[f], k = bandEls('file');
  onFrame(t => {
    const o = V(`fb.${L}.o`, t, 0);
    k.g.setAttribute('opacity', o);
    if (o <= 0) return;
    const lo = V(`fb.${L}.lo`, t, BAND_LO), hi = V(`fb.${L}.hi`, t, BAND_LO);
    const y = BW - hi * SQ, h = Math.max(0, (hi - lo) * SQ);
    for (const [r, inset] of [[k.fillR, 0], [k.edge, 4]]) {
      r.setAttribute('x', f * SQ + inset); r.setAttribute('width', SQ - 2 * inset);
      r.setAttribute('y', (y + inset).toFixed(1)); r.setAttribute('height', Math.max(0, h - 2 * inset).toFixed(1));
    }
  });
}
for (let n = 1; n <= 8; n++) {
  const k = bandEls('rank');
  onFrame(t => {
    const o = V(`rb.${n}.o`, t, 0);
    k.g.setAttribute('opacity', o);
    if (o <= 0) return;
    const lo = V(`rb.${n}.lo`, t, BAND_LO), hi = V(`rb.${n}.hi`, t, BAND_LO);
    const x = lo * SQ, w = Math.max(0, (hi - lo) * SQ);
    for (const [r, inset] of [[k.fillR, 0], [k.edge, 4]]) {
      r.setAttribute('y', (8 - n) * SQ + inset); r.setAttribute('height', SQ - 2 * inset);
      r.setAttribute('x', (x + inset).toFixed(1)); r.setAttribute('width', Math.max(0, w - 2 * inset).toFixed(1));
    }
  });
}
// grow a file band from its letter up to rank `to` (default whole file)
function fileBand(L, t0, { to = 8, dur = 1.2, from = BAND_LO } = {}) {
  set(`fb.${L}.lo`, from, t0); set(`fb.${L}.hi`, from, t0);
  tw(`fb.${L}.o`, 1, t0, 0.2, E.out);
  tw(`fb.${L}.hi`, to, t0, dur, E.io);
}
// grow a file band DOWN from a square to the letter ("look down")
function fileBandDown(L, rank, t0, dur = 1.0) {
  set(`fb.${L}.lo`, rank, t0); set(`fb.${L}.hi`, rank, t0);
  tw(`fb.${L}.o`, 1, t0, 0.2, E.out);
  tw(`fb.${L}.hi`, rank, t0, 0.01);
  tw(`fb.${L}.lo`, rank - 1, t0, 0.25, E.out);
  tw(`fb.${L}.lo`, BAND_LO, t0 + 0.25, dur - 0.25, E.io);
}
function rankBand(n, t0, { to = 8, dur = 1.2, from = BAND_LO } = {}) {
  set(`rb.${n}.lo`, from, t0); set(`rb.${n}.hi`, from, t0);
  tw(`rb.${n}.o`, 1, t0, 0.2, E.out);
  tw(`rb.${n}.hi`, to, t0, dur, E.io);
}
function rankBandAcross(n, file, t0, dur = 1.0) { // from square leftwards to the number
  set(`rb.${n}.lo`, file, t0); set(`rb.${n}.hi`, file, t0);
  tw(`rb.${n}.o`, 1, t0, 0.2, E.out);
  tw(`rb.${n}.lo`, file - 1, t0, 0.25, E.out);
  tw(`rb.${n}.lo`, BAND_LO, t0 + 0.25, dur - 0.25, E.io);
}
const bandOff = (kind, id, t, d = 0.4) => tw(`${kind}.${id}.o`, 0, t, d, E.io);

// ---------------------------------------------------------------- label chips
function chip(parent, txt, color) {
  const g = el('g', {}, parent);
  const c = el('circle', { r: 33, fill: '#fff', stroke: color, 'stroke-width': 6 }, g);
  const tx = el('text', { y: 16, 'text-anchor': 'middle', 'font-size': 50, 'font-weight': 700, 'font-family': 'Fredoka', fill: color }, g);
  tx.textContent = txt;
  return { g, c, tx };
}
const LABELS = {};
for (let f = 0; f < 8; f++) {
  const L = FILES[f], k = chip(labelsG, L, C.file), x = f * SQ + SQ / 2, y = BW - LBL * SQ;
  LABELS['f' + L] = { ...k, x, y, key: `lf.${L}`, color: C.file };
}
for (let n = 1; n <= 8; n++) {
  const k = chip(labelsG, String(n), C.rank), x = LBL * SQ, y = (8 - n) * SQ + SQ / 2;
  LABELS['r' + n] = { ...k, x, y, key: `lr.${n}`, color: C.rank };
}
onFrame(t => {
  for (const id in LABELS) {
    const L = LABELS[id];
    const o = V(L.key + '.o', t, 0), g = V(L.key + '.g', t, 0), s = V(L.key + '.s', t, 1);
    L.g.setAttribute('opacity', o);
    if (o <= 0) continue;
    L.g.setAttribute('transform', upright(L.x, L.y, t, s));
    L.c.setAttribute('fill', mix('#FFFFFF', L.color, g));
    L.tx.setAttribute('fill', mix(L.color, '#FFFFFF', g));
  }
});
const lblKey = id => (/^[a-h]$/.test(id) ? `lf.${id}` : `lr.${id}`);
const labXY = id => { const L = LABELS[/^[a-h]$/.test(id) ? 'f' + id : 'r' + id]; return [L.x, L.y]; };
// light a label up (glow + bump) from t0 until t1
function glow(id, t0, t1, bump = 1.28) {
  const k = lblKey(id);
  tw(k + '.g', 1, t0, 0.25, E.out);
  tw(k + '.s', bump, t0, 0.22, E.out);
  tw(k + '.s', 1.12, t0 + 0.22, 0.3, E.io);
  if (t1 != null) { tw(k + '.g', 0, t1, 0.35); tw(k + '.s', 1, t1, 0.35); }
}

// ---------------------------------------------------------------- rings, question marks, badges
let UID = 0;
// gold outline around a square, pulsing
function ring(sq, t0, t1, color = C.gold) {
  const id = 'ring' + UID++, [x, y] = sqXY(sq);
  const g = el('g', {}, ringsG);
  const r = el('rect', { x: -SQ / 2 + 2, y: -SQ / 2 + 2, width: SQ - 4, height: SQ - 4, rx: 10, fill: color, 'fill-opacity': 0.35, stroke: color, 'stroke-width': 9 }, g);
  show(id, t0, t1, 0.3, 0.3);
  onFrame(t => {
    const o = V(id, t, 0);
    g.setAttribute('opacity', o);
    if (o <= 0) return;
    const s = 1 + 0.05 * Math.sin((t - t0) * 6);
    g.setAttribute('transform', `translate(${x} ${y}) scale(${s.toFixed(4)})`);
  });
  return id;
}
function qmark(sq, t0, t1) {
  const id = 'q' + UID++, [x, y] = sqXY(sq);
  const g = el('g', {}, topG);
  el('circle', { r: 36, fill: '#fff', stroke: C.ink, 'stroke-width': 6 }, g);
  const tx = el('text', { y: 18, 'text-anchor': 'middle', 'font-size': 54, 'font-weight': 700, 'font-family': 'Fredoka', fill: C.ink }, g);
  tx.textContent = '?';
  tw(id + '.s', 1, t0, 0.5, E.back, 0);
  show(id, t0, t1, 0.2, 0.25);
  onFrame(t => {
    const o = V(id, t, 0);
    g.setAttribute('opacity', o);
    if (o <= 0) return;
    const wob = Math.sin((t - t0) * 3) * 6;
    g.setAttribute('transform', upright(x, y, t, V(id + '.s', t, 0)) + ` rotate(${wob.toFixed(2)})`);
  });
}
// Where a square's name badge sits (in the upright frame, relative to the square centre):
// above the square, or below it when the square is on the top row of the screen.
function badgeDY(sq, t) {
  const flipped = Math.abs(V('board.rot', t, 0)) > 90;
  const topRow = flipped ? sq[1] === '1' : sq[1] === '8';
  return topRow ? SQ / 2 + 52 : -(SQ / 2 + 52);
}
// a flying tag: copy of a label chip that travels to the name spot above a square
function flyTag(txtS, color, fromXY, sq, t0, dur = 0.9, sub = null) {
  const id = 'tag' + UID++, [x1, y1] = sqXY(sq);
  const g = el('g', {}, topG);
  el('circle', { r: 35, fill: color, stroke: '#fff', 'stroke-width': 5 }, g);
  const tx = el('text', { y: 17, 'text-anchor': 'middle', 'font-size': 52, 'font-weight': 700, 'font-family': 'Fredoka', fill: '#fff' }, g);
  tx.textContent = txtS;
  if (sub) {
    el('rect', { x: -36, y: 36, width: 72, height: 30, rx: 15, fill: '#fff', stroke: color, 'stroke-width': 3 }, g);
    txt(g, sub, 0, 58, 22, color, 700);
  }
  const dy1 = badgeDY(sq, t0 + dur);
  const dx1 = /^[a-h]$/.test(txtS) ? -30 : 30; // letter lands on the left, number on the right
  set(id + '.o', 1, t0);
  tw(id + '.p', 1, t0, dur, E.io, 0);
  return {
    bind(tEnd) {
      set(id + '.o', 0, tEnd);
      onFrame(t => {
        const o = V(id + '.o', t, 0);
        g.setAttribute('opacity', o);
        if (o <= 0) return;
        const p = V(id + '.p', t, 0), arc = Math.sin(p * Math.PI) * 30;
        const x = lerp(fromXY[0], x1, p), y = lerp(fromXY[1], y1, p);
        g.setAttribute('transform', `${upright(x, y, t)} translate(${(dx1 * p).toFixed(1)} ${(dy1 * p - arc).toFixed(1)}) scale(${(1 + 0.15 * Math.sin(p * Math.PI)).toFixed(3)})`);
      });
    },
  };
}
// the square's full name in a pill above the square (letter blue, number orange), with a
// little pointer to the square
function badge(sq, t0, t1, { txt: s = sq } = {}) {
  const id = 'bdg' + UID++, [x, y] = sqXY(sq);
  const dy = badgeDY(sq, t0), down = dy < 0;
  const g = el('g', {}, topG);
  const w = 150, h = 90;
  const tail = down ? `M-18 ${h / 2 - 4} L0 ${h / 2 + 20} L18 ${h / 2 - 4}Z` : `M-18 ${-h / 2 + 4} L0 ${-h / 2 - 20} L18 ${-h / 2 + 4}Z`;
  el('rect', { x: -w / 2, y: -h / 2 + 6, width: w, height: h, rx: h / 2, fill: '#1D2B14', opacity: 0.3 }, g);
  el('path', { d: tail, fill: '#fff', stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
  el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill: '#fff', stroke: C.ink, 'stroke-width': 5 }, g);
  el('rect', { x: -22, y: down ? h / 2 - 9 : -h / 2 - 1, width: 44, height: 10, fill: '#fff' }, g); // join tail to pill
  const tx = el('text', { y: 24, 'text-anchor': 'middle', 'font-size': 68, 'font-weight': 700, 'font-family': 'Fredoka' }, g);
  for (const ch of s) { const sp = el('tspan', { fill: /[a-h]/.test(ch) ? C.file : C.rank }, tx); sp.textContent = ch; }
  tw(id + '.s', 1, t0, 0.45, E.back, 0.3);
  show(id, t0, t1, 0.12, 0.3);
  onFrame(t => {
    const o = V(id, t, 0);
    g.setAttribute('opacity', o);
    if (o <= 0) return;
    g.setAttribute('transform', `${upright(x, y, t)} translate(0 ${dy}) scale(${V(id + '.s', t, 1).toFixed(4)})`);
  });
  return { id, dy };
}
// red "X" over the name spot of a square
function crossOut(sq, t0, t1) {
  const id = 'x' + UID++, [x, y] = sqXY(sq), dy = badgeDY(sq, t0);
  const g = el('g', {}, topG);
  el('path', { d: 'M-62 -38 L62 38 M62 -38 L-62 38', stroke: '#E53935', 'stroke-width': 14, 'stroke-linecap': 'round' }, g);
  tw(id + '.s', 1, t0, 0.3, E.back, 0.2);
  show(id, t0, t1, 0.1, 0.2);
  onFrame(t => {
    const o = V(id, t, 0);
    g.setAttribute('opacity', o);
    if (o > 0) g.setAttribute('transform', `${upright(x, y, t)} translate(0 ${dy}) scale(${V(id + '.s', t, 1).toFixed(3)})`);
  });
}

// ---------------------------------------------------------------- the core moves
// NAME a square: look down to the letter, look across to the number, both tags fly to the
// square and become its name. (Bands grow OUT from the square to the edge labels.)
function nameSquare(sq, T) {
  const L = sq[0], n = +sq[1], f = fi(L) + 1;
  if (T.ring != null) ring(sq, T.ring, T.off);
  fileBandDown(L, n, T.tDown, T.downDur || 1.0); cue('swoosh', T.tDown, 0.5);
  glow(L, T.tLetter, T.off); cue('pop', T.tLetter);
  flyTag(L, C.file, labXY(L), sq, T.tLetter + 0.2, 0.9, 'first').bind(T.tBadge);
  rankBandAcross(n, f, T.tAcross, T.acrossDur || 1.0); cue('swoosh', T.tAcross, 0.5);
  glow(String(n), T.tNumber, T.off); cue('pop', T.tNumber, 1.1);
  flyTag(String(n), C.rank, labXY(String(n)), sq, T.tNumber + 0.2, 0.9, 'last').bind(T.tBadge);
  badge(sq, T.tBadge, T.off);
  cue('chime', T.tBadge + 0.05);
  bandOff('fb', L, T.off); bandOff('rb', n, T.off);
}
// FIND a square from its name: the letter's band grows up to the rank, the number's band
// grows across to the file, and they meet at the square. (Bands grow IN from the labels.)
function findSquare(sq, T) {
  const L = sq[0], n = +sq[1], f = fi(L) + 1;
  fileBand(L, T.tFile, { to: n, dur: 0.4 + 0.12 * n }); glow(L, T.tFile, T.off); cue('swoosh', T.tFile, 0.5);
  rankBand(n, T.tRank, { to: f, dur: 0.4 + 0.12 * f }); glow(String(n), T.tRank, T.off); cue('swoosh', T.tRank, 0.5);
  ring(sq, T.tRank + 0.3 + 0.12 * f, T.off);
  badge(sq, T.tBadge, T.off);
  cue('chime', T.tBadge + 0.05);
  bandOff('fb', L, T.off); bandOff('rb', n, T.off);
}

// ---------------------------------------------------------------- pieces
const PA = window.PieceArt;
const PIECE_SCALE = 0.84;
const pieces = {};
function piece(id, type, color, sq, t0, t1, { drop = true, pop = false, sound = true } = {}) {
  const [x, y] = sqXY(sq);
  const node = PA.create(type, color, {});
  const g = el('g', {}, piecesG);
  g.appendChild(node);
  const p = { id, node, g };
  pieces[id] = p;
  set(`pc.${id}.x`, x, 0); set(`pc.${id}.y`, y, 0);
  if (t0 != null) {
    if (pop) { tw(`pc.${id}.s`, 1, t0, 0.45, E.back, 0); if (sound) cue('pop', t0, 0.7); }
    else if (drop) { tw(`pc.${id}.hop`, 0, t0, 0.55, E.out, -120); if (sound) cue('drop', t0 + 0.4, 0.45); }
    show(`pc.${id}.o`, t0, t1, pop || drop ? 0.15 : 0.35, 0.35);
  }
  const seed = UID++;
  onFrame(t => {
    const o = V(`pc.${id}.o`, t, 0);
    g.setAttribute('opacity', o);
    if (o <= 0) return;
    const hop = V(`pc.${id}.hop`, t, 0), s = V(`pc.${id}.s`, t, 1), tilt = V(`pc.${id}.tilt`, t, 0);
    const px = V(`pc.${id}.x`, t, x), py = V(`pc.${id}.y`, t, y);
    g.setAttribute('transform', `${upright(px, py, t)} translate(0 ${(SQ * 0.44 + hop).toFixed(1)}) rotate(${tilt.toFixed(2)}) scale(${(PIECE_SCALE * s).toFixed(4)}) translate(-50 -96)`);
    const bt = (t + hash(seed) * 4) % 3.9;
    node.setFace({
      blink: bt < 0.14 ? Math.sin((bt / 0.14) * Math.PI) : 0,
      look: [V(`pc.${id}.lx`, t, 0), V(`pc.${id}.ly`, t, 0)],
      mouth: V(`pc.${id}.mouth`, t, 'smile'),
      brows: V(`pc.${id}.brows`, t, 'neutral'),
      talk: 0,
    });
  });
  return p;
}
// slide a piece to another square (board-local), optionally with a little hop
function movePiece(id, sq, t0, dur = 0.9, hop = 18, sfx = 'slide') {
  const [x, y] = sqXY(sq);
  tw(`pc.${id}.x`, x, t0, dur, E.io);
  tw(`pc.${id}.y`, y, t0, dur, E.io);
  if (hop) { tw(`pc.${id}.hop`, -hop, t0, dur / 2, E.out); tw(`pc.${id}.hop`, 0, t0 + dur / 2, dur / 2, E.in); }
  cue(sfx, t0, sfx === 'step' ? 0.5 : 0.6);
}
function popOut(id, t) {
  tw(`pc.${id}.s`, 1.15, t, 0.12, E.out); tw(`pc.${id}.s`, 0, t + 0.12, 0.25, E.in);
  set(`pc.${id}.o`, 0, t + 0.37);
  cue('pop', t, 0.5);
}
function pieceHop(id, t, h = 26) { tw(`pc.${id}.hop`, -h, t, 0.2, E.out); tw(`pc.${id}.hop`, 0, t + 0.2, 0.25, E.in); }
const face = (id, t, props) => { for (const k in props) set(`pc.${id}.${k}`, props[k], t); };

// ---------------------------------------------------------------- host (big white pawn, right side)
const hostG = el('g', {}, svg);
const host = PA.create('p', 'w', { arms: true });
hostG.appendChild(host);
const HOST = { x: 1650, y: 866, s: 5.6 };
onFrame(t => {
  const o = V('host.o', t, 0);
  hostG.setAttribute('opacity', o);
  if (o <= 0) return;
  const bob = Math.sin(t * 2.1) * 5, hop = V('host.hop', t, 0);
  const x = V('host.x', t, HOST.x), y = V('host.y', t, HOST.y) + hop, s = V('host.s', t, HOST.s), tilt = V('host.tilt', t, 0);
  hostG.setAttribute('transform', `translate(${x.toFixed(1)} ${(y + bob * 0.3).toFixed(1)}) rotate(${tilt.toFixed(2)}) scale(${s.toFixed(4)}) scale(1 ${(1 + Math.sin(t * 2.1) * 0.008).toFixed(4)}) translate(-50 -96)`);
  const bt = t % 4.3, talking = speaking(t);
  host.setFace({
    blink: bt < 0.16 ? Math.sin((bt / 0.16) * Math.PI) : 0,
    look: [V('host.lx', t, -0.35), V('host.ly', t, 0.1)],
    mouth: V('host.mouth', t, 'smile'),
    brows: V('host.brows', t, 'neutral'),
    talk: talking ? clamp(0.25 + 0.55 * Math.abs(Math.sin(t * 13)) * (0.6 + 0.4 * Math.sin(t * 4.7))) : 0,
    armL: V('host.armL', t, 12), armR: V('host.armR', t, 12), chin: V('host.chin', t, 0),
  });
});
function pose(t, p, dur = 0.45) {
  for (const k in p) {
    if (typeof p[k] === 'number') tw('host.' + k, p[k], t, dur, E.io);
    else set('host.' + k, p[k], t);
  }
}
// wave: right arm goes up and swings
function wave(t0, n = 3) {
  pose(t0, { armR: 140 }, 0.35);
  for (let i = 0; i < n; i++) { tw('host.armR', 115, t0 + 0.35 + i * 0.5, 0.25); tw('host.armR', 150, t0 + 0.6 + i * 0.5, 0.25); }
  pose(t0 + 0.35 + n * 0.5, { armR: 12 }, 0.5);
}
function point(t0, t1, dir = 'left') { // point toward the board
  pose(t0, { armL: dir === 'left' ? 95 : 12, lx: -0.8, ly: 0.1 }, 0.4);
  if (t1 != null) pose(t1, { armL: 12, lx: -0.35 }, 0.5);
}
function hostHop(t0, h = 60) { tw('host.hop', -h, t0, 0.22, E.out); tw('host.hop', 0, t0 + 0.22, 0.28, E.in); }
function celebrate(t0, big = false) {
  pose(t0, { armL: 150, armR: 150, mouth: 'grin', lx: 0, ly: -0.2 }, 0.3);
  hostHop(t0 + 0.05, big ? 60 : 40);
  if (big) hostHop(t0 + 0.6, 45);
  pose(t0 + (big ? 1.4 : 1.0), { armL: 12, armR: 12, mouth: 'smile', lx: -0.35, ly: 0.1 }, 0.45);
}

// ---------------------------------------------------------------- left panel cards
const cardsG = el('g', {}, svg);
const CARD_X = 292;
function card(name, build) {
  const g = el('g', {}, cardsG);
  build(g);
  onFrame(t => {
    const o = V(`card.${name}.o`, t, 0);
    g.setAttribute('opacity', o);
    if (o <= 0) return;
    const dx = (1 - o) * -60, s = V(`card.${name}.s`, t, 1), dy = V(`card.${name}.y`, t, 0);
    g.setAttribute('transform', `translate(${CARD_X + dx} ${dy}) scale(${s})`);
  });
  return g;
}
const showCard = (name, t0, t1) => { show(`card.${name}.o`, t0, t1, 0.45, 0.4); cue('card', t0, 0.5); };
function panel(g, y, h, fill = '#FFFFFF') {
  el('rect', { x: -225, y: y + 8, width: 450, height: h, rx: 34, fill: '#1F4A1A', opacity: 0.35 }, g);
  el('rect', { x: -225, y, width: 450, height: h, rx: 34, fill, stroke: '#2F6A27', 'stroke-width': 6 }, g);
}
function txt(g, s, x, y, size, color = C.ink, weight = 700, anchor = 'middle') {
  const e = el('text', { x, y, 'text-anchor': anchor, 'font-size': size, 'font-weight': weight, 'font-family': 'Fredoka', fill: color }, g);
  e.textContent = s;
  return e;
}
const coord = (g, s, x, y, size) => { // "e4" with blue letter + orange number
  const e = txt(g, '', x, y, size, C.ink);
  for (const ch of s) { const sp = el('tspan', { fill: /[a-h]/.test(ch) ? C.file : C.rank }, e); sp.textContent = ch; }
  return e;
};
const arrowPath = (g, d, color, w = 14) => el('path', { d, stroke: color, 'stroke-width': w, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
// FILE: up and down (a blue column icon above the word)
card('file', g => {
  panel(g, 150, 540);
  const a = el('g', { transform: 'translate(0 360)' }, g);
  el('rect', { x: -48, y: -160, width: 96, height: 320, rx: 24, fill: C.file, 'fill-opacity': 0.3, stroke: C.file, 'stroke-width': 7 }, a);
  arrowPath(a, 'M0 -125 V125 M-38 -88 L0 -127 L38 -88 M-38 88 L0 127 L38 88', C.fileDark);
  txt(g, 'FILE', 0, 612, 92, C.file);
  txt(g, 'up and down', 0, 665, 40, C.ink, 600);
});
// RANK: side to side (an orange row icon above the word)
card('rank', g => {
  panel(g, 150, 540);
  const a = el('g', { transform: 'translate(0 360)' }, g);
  el('rect', { x: -175, y: -48, width: 350, height: 96, rx: 24, fill: C.rank, 'fill-opacity': 0.3, stroke: C.rank, 'stroke-width': 7 }, a);
  arrowPath(a, 'M-145 0 H145 M-108 -38 L-147 0 L-108 38 M108 -38 L147 0 L108 38', C.rankDark);
  txt(g, 'RANK', 0, 612, 92, C.rank);
  txt(g, 'side to side', 0, 665, 40, C.ink, 600);
});
// a person's name tag: first name blue, last name orange
card('names', g => {
  panel(g, 190, 440);
  el('rect', { x: -190, y: 225, width: 380, height: 360, rx: 26, fill: '#fff', stroke: '#C9D3C0', 'stroke-width': 4 }, g);
  el('path', { d: 'M-190 330 V251 a26 26 0 0 1 26 -26 H164 a26 26 0 0 1 26 26 V330Z', fill: '#2E7D1F' }, g);
  txt(g, 'HELLO', 0, 285, 50, '#fff', 700);
  txt(g, 'my name is', 0, 318, 28, '#fff', 500);
  const first = el('g', { transform: 'translate(-82 440)' }, g);
  txt(first, 'Sam', 0, 0, 78, C.file, 700);
  el('rect', { x: -58, y: 26, width: 116, height: 40, rx: 20, fill: C.file }, first);
  txt(first, 'first', 0, 56, 28, '#fff', 700);
  const last = el('g', { transform: 'translate(88 440)' }, g);
  txt(last, 'Lee', 0, 0, 78, C.rank, 700);
  el('rect', { x: -58, y: 26, width: 116, height: 40, rx: 20, fill: C.rank }, last);
  txt(last, 'last', 0, 56, 28, '#fff', 700);
  onFrame(t => {
    const a = V('card.names.first', t, 0), b = V('card.names.last', t, 0);
    first.setAttribute('opacity', clamp(a)); first.setAttribute('transform', `translate(-82 440) scale(${Math.max(0.01, a).toFixed(3)})`);
    last.setAttribute('opacity', clamp(b)); last.setAttribute('transform', `translate(88 440) scale(${Math.max(0.01, b).toFixed(3)})`);
  });
});
// a square's name: first name = letter (blue), last name = number (orange)
card('sqname', g => {
  panel(g, 190, 440);
  txt(g, "A square's name", 0, 262, 44, C.ink, 600);
  el('rect', { x: -70, y: 290, width: 140, height: 140, rx: 10, fill: C.dark, stroke: '#2E5A2A', 'stroke-width': 6 }, g);
  el('rect', { x: -66, y: 294, width: 132, height: 132, rx: 8, fill: 'none', stroke: C.gold, 'stroke-width': 8 }, g);
  const f = el('g', { transform: 'translate(-70 520)' }, g);
  el('circle', { r: 46, fill: C.file }, f); txt(f, 'e', 0, 22, 66, '#fff');
  el('rect', { x: -52, y: 54, width: 104, height: 38, rx: 19, fill: '#fff', stroke: C.file, 'stroke-width': 4 }, f);
  txt(f, 'first', 0, 82, 26, C.file, 700);
  const l = el('g', { transform: 'translate(70 520)' }, g);
  el('circle', { r: 46, fill: C.rank }, l); txt(l, '4', 0, 22, 66, '#fff');
  el('rect', { x: -52, y: 54, width: 104, height: 38, rx: 19, fill: '#fff', stroke: C.rank, 'stroke-width': 4 }, l);
  txt(l, 'last', 0, 82, 26, C.rank, 700);
  arrowPath(g, 'M-40 470 L-12 438 M40 470 L12 438', C.ink, 7);
});
// both side by side (review)
card('both', g => {
  panel(g, 110, 330);
  txt(g, 'FILE', -95, 200, 64, C.file);
  arrowPath(g, 'M-95 250 V400 M-120 276 L-95 248 L-70 276 M-120 374 L-95 402 L-70 374', C.fileDark, 11);
  txt(g, 'RANK', 105, 200, 64, C.rank);
  arrowPath(g, 'M30 325 H180 M56 300 L28 325 L56 350 M154 300 L182 325 L154 350', C.rankDark, 11);
});
// letter first, then number
card('order', g => {
  panel(g, 170, 470);
  txt(g, 'letter first,', 0, 262, 50, C.file);
  txt(g, 'then number', 0, 322, 50, C.rank);
  const row = el('g', { transform: 'translate(0 450)' }, g);
  const c1 = el('g', { transform: 'translate(-120 0)' }, row);
  el('circle', { r: 52, fill: C.file }, c1); txt(c1, 'e', 0, 25, 76, '#fff');
  arrowPath(row, 'M-50 0 H26 M4 -20 L28 0 L4 20', C.ink, 10);
  const c2 = el('g', { transform: 'translate(96 0)' }, row);
  el('circle', { r: 52, fill: C.rank }, c2); txt(c2, '4', 0, 25, 76, '#fff');
  const out = el('g', { transform: 'translate(0 130)' }, row);
  el('rect', { x: -90, y: -46, width: 180, height: 92, rx: 46, fill: '#fff', stroke: C.ink, 'stroke-width': 6 }, out);
  coord(out, 'e4', 0, 25, 70);
});
// COORDINATES
card('coords', g => {
  panel(g, 200, 380);
  txt(g, 'Square names', 0, 290, 50, C.ink, 600);
  txt(g, 'are called', 0, 350, 44, C.ink, 500);
  txt(g, 'coordinates', 0, 460, 66, '#2E7D1F');
  [['e4', -120], ['a1', 0], ['c6', 120]].forEach(([s, x]) => coord(g, s, x, 540, 52));
});
// the black queen, big
card('queen', g => {
  panel(g, 190, 440);
  const q = PA.create('q', 'b', {});
  const h = el('g', { transform: 'translate(0 590) scale(3.6) translate(-50 -96)' }, g);
  h.appendChild(q);
  onFrame(t => { if (V('card.queen.o', t, 0) > 0) q.setFace({ blink: (t % 3.3) < 0.14 ? 1 : 0, look: [0.2, 0], mouth: 'smile', brows: 'neutral' }); });
  txt(g, 'black queen', 0, 262, 44, C.ink, 600);
});
// find this square (quiz target)
card('target', g => {
  el('rect', { x: -170, y: 630, width: 340, height: 150, rx: 36, fill: '#1F4A1A', opacity: 0.35 }, g);
  el('rect', { x: -170, y: 622, width: 340, height: 150, rx: 36, fill: '#fff', stroke: C.ink, 'stroke-width': 6 }, g);
  txt(g, 'Find', -86, 718, 50, C.ink, 600);
  coord(g, 'b6', 60, 730, 96);
});
// scoresheet (notation): Move | White | Black
const SHEET = { white: [-18, 364], black: [118, 364] }; // cell centres (card coords) for move 1
card('notation', g => {
  el('rect', { x: -214, y: 168, width: 428, height: 520, rx: 18, fill: '#1F4A1A', opacity: 0.35 }, g);
  el('rect', { x: -214, y: 160, width: 428, height: 520, rx: 18, fill: '#FFFDF4', stroke: '#8C8A7A', 'stroke-width': 4 }, g);
  txt(g, 'SCORESHEET', 0, 216, 38, '#6B6A5C', 700);
  const colX = [-160, -86, 50, 186];
  el('line', { x1: -190, x2: 190, y1: 238, y2: 238, stroke: '#8C8A7A', 'stroke-width': 3 }, g);
  txt(g, 'Move', -123, 290, 28, '#8A94A6', 600);
  txt(g, 'White', -18, 290, 32, '#6B6A5C', 700);
  txt(g, 'Black', 118, 290, 32, '#6B6A5C', 700);
  el('line', { x1: -190, x2: 190, y1: 312, y2: 312, stroke: '#8C8A7A', 'stroke-width': 3 }, g);
  for (const x of colX.slice(1, 3)) el('line', { x1: x, x2: x, y1: 250, y2: 660, stroke: '#C9C6B2', 'stroke-width': 3 }, g);
  for (let i = 0; i < 5; i++) {
    const y = 312 + (i + 1) * 68;
    el('line', { x1: -190, x2: 190, y1: y, y2: y, stroke: '#D8D5C2', 'stroke-width': 2 }, g);
    txt(g, String(i + 1), -123, y - 20, 30, '#8A94A6', 600);
  }
  const w = coord(g, 'e4', SHEET.white[0], SHEET.white[1], 54);
  const b = coord(g, 'e5', SHEET.black[0], SHEET.black[1], 54);
  onFrame(t => { w.setAttribute('opacity', V('card.notation.w1', t, 0)); b.setAttribute('opacity', V('card.notation.b1', t, 0)); });
});
// a square's name flies from the board into move 1 of the scoresheet
function flyToSheet(sq, t0, col, dur = 0.85) {
  const id = 'fly' + UID++;
  const g = el('g', {}, overG);
  el('rect', { x: -60, y: -38, width: 120, height: 76, rx: 38, fill: '#fff', stroke: C.ink, 'stroke-width': 5 }, g);
  coord(g, sq, 0, 20, 56);
  const [bx, by] = sqXY(sq);
  const from = boardToScreen(bx, by - SQ, t0), to = [CARD_X + SHEET[col][0], SHEET[col][1] - 18];
  set(id, 1, t0); set(id, 0, t0 + dur);
  tw(id + '.p', 1, t0, dur, E.io, 0);
  cue('swoosh', t0, 0.6);
  onFrame(t => {
    const o = V(id, t, 0);
    g.setAttribute('opacity', o);
    if (o <= 0) return;
    const p = V(id + '.p', t, 0);
    const x = lerp(from[0], to[0], p), y = lerp(from[1], to[1], p) - Math.sin(p * Math.PI) * 80;
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${lerp(1.1, 0.85, p).toFixed(3)})`);
  });
}
// chess clock countdown
const clockWins = [];
card('clock', g => {
  el('rect', { x: -200, y: 318, width: 400, height: 250, rx: 30, fill: '#1F4A1A', opacity: 0.35 }, g);
  el('rect', { x: -200, y: 310, width: 400, height: 250, rx: 30, fill: '#3B3F52', stroke: '#23252F', 'stroke-width': 6 }, g);
  el('rect', { x: -150, y: 276, width: 90, height: 40, rx: 12, fill: C.sun, stroke: '#23252F', 'stroke-width': 5 }, g);
  el('rect', { x: 60, y: 290, width: 90, height: 26, rx: 10, fill: '#8E93A8', stroke: '#23252F', 'stroke-width': 5 }, g);
  el('rect', { x: -170, y: 350, width: 160, height: 170, rx: 18, fill: '#F4F6EA' }, g);
  el('rect', { x: 10, y: 350, width: 160, height: 170, rx: 18, fill: '#D4D7C8' }, g);
  const d = txt(g, '5', -90, 480, 130, C.ink, 700);
  txt(g, '5', 90, 480, 130, '#A9AD9E', 700);
  const th = txt(g, 'Think!', 0, 244, 70, '#fff', 700);
  th.setAttribute('stroke', '#2E5A2A'); th.setAttribute('stroke-width', 12); th.setAttribute('paint-order', 'stroke');
  onFrame(t => {
    const w = clockWins.find(c => t >= c.t0 - 0.8 && t < c.t0 + c.n + 0.8);
    if (!w) return;
    d.textContent = String(clamp(Math.ceil(w.n - (t - w.t0)), 0, w.n));
  });
});
// thinking time: clock card, ticks, host thinks. Returns end time.
function countdown(t0, n = 5) {
  clockWins.push({ t0, n });
  showCard('clock', t0 - 0.5, t0 + n + 0.2);
  for (let i = 0; i < n; i++) cue('tick', t0 + i, i === n - 1 ? 1 : 0.8);
  cue('ding', t0 + n, 0.8);
  pose(t0, { chin: 1, lx: -0.6, ly: -0.7, brows: 'raised', mouth: 'flat' }, 0.4);
  pose(t0 + n, { chin: 0, lx: -0.35, ly: 0.1, brows: 'neutral', mouth: 'smile' }, 0.4);
  return t0 + n;
}

// ---------------------------------------------------------------- title cards, banner, "you" marker
const overG = el('g', {}, svg);
function titleCard(name, lines, sub, { pill = C.sun, ink = C.ink } = {}) {
  const g = el('g', {}, overG);
  el('rect', { x: 0, y: 0, width: 1920, height: 1080, fill: 'url(#dim)' }, g);
  lines.forEach((s, i) => {
    const e = txt(g, s, 960, 420 + i * 150, 136, '#FFFFFF', 700);
    e.setAttribute('stroke', '#1D2B14'); e.setAttribute('stroke-width', 22); e.setAttribute('paint-order', 'stroke'); e.setAttribute('stroke-linejoin', 'round');
  });
  if (sub) {
    const y = 420 + lines.length * 150 + 30;
    el('rect', { x: 960 - 400, y: y - 62 + 10, width: 800, height: 96, rx: 48, fill: '#000', opacity: 0.25 }, g);
    el('rect', { x: 960 - 400, y: y - 62, width: 800, height: 96, rx: 48, fill: pill, stroke: C.ink, 'stroke-width': 5 }, g);
    const e = txt(g, '', 960, y + 4, 56, ink, 700);
    sub.forEach(([s, col]) => { const ts = el('tspan', { fill: col || ink }, e); ts.textContent = s; });
  }
  onFrame(t => {
    const o = V(`title.${name}`, t, 0);
    g.setAttribute('opacity', o);
    if (o > 0) g.setAttribute('transform', `translate(960 540) scale(${(0.94 + 0.06 * o).toFixed(4)}) translate(-960 -540)`);
  });
}
function banner(name, t0, t1) {
  const g = el('g', {}, overG);
  el('path', { d: 'M-250 -46 H250 L226 0 L250 46 H-250 L-226 0Z', fill: '#000', opacity: 0.25, transform: 'translate(0 8)' }, g);
  el('path', { d: 'M-250 -46 H250 L226 0 L250 46 H-250 L-226 0Z', fill: C.sun, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
  txt(g, 'TOURNAMENT TIP!', 0, 18, 50, C.ink, 700);
  tw(`ban.${name}.s`, 1, t0, 0.5, E.back, 0.3);
  show(`ban.${name}`, t0, t1, 0.2, 0.35);
  onFrame(t => {
    const o = V(`ban.${name}`, t, 0);
    g.setAttribute('opacity', o);
    if (o > 0) g.setAttribute('transform', `translate(${CARD_X} 100) scale(${V(`ban.${name}.s`, t, 1).toFixed(3)}) rotate(-3)`);
  });
}
// "you" marker at the near edge of the board (used when the board is seen from Black's side)
function youMarker(t0, t1) {
  const g = el('g', {}, overG);
  el('rect', { x: -110, y: -30, width: 220, height: 60, rx: 30, fill: '#2B2F3A', stroke: '#fff', 'stroke-width': 4 }, g);
  txt(g, 'you (Black)', 0, 12, 34, '#fff', 700);
  el('path', { d: 'M0 -48 L-16 -30 H16Z', fill: '#2B2F3A', stroke: '#fff', 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
  show('you', t0, t1, 0.35, 0.35);
  onFrame(t => {
    const o = V('you', t, 0);
    g.setAttribute('opacity', o);
    if (o > 0) g.setAttribute('transform', `translate(960 ${(846 + (1 - o) * 30).toFixed(1)})`);
  });
}
const DURATION_HINT = TL.duration;

// ---------------------------------------------------------------- all 64 names + confetti
const allNames = [];
for (let r = 1; r <= 8; r++) for (let f = 0; f < 8; f++) {
  const sq = FILES[f] + r, [x, y] = sqXY(sq);
  const g = el('g', { opacity: 0 }, namesG);
  el('rect', { x: -34, y: -24, width: 68, height: 48, rx: 24, fill: '#fff', 'fill-opacity': 0.92 }, g);
  const e = el('text', { y: 13, 'text-anchor': 'middle', 'font-size': 38, 'font-weight': 700, 'font-family': 'Fredoka' }, g);
  const a = el('tspan', { fill: C.file }, e); a.textContent = sq[0];
  const b = el('tspan', { fill: C.rank }, e); b.textContent = sq[1];
  allNames.push({ g, x, y, d: (f + r - 1) / 14 });
}
onFrame(t => {
  const p = V('allnames.p', t, 0), o = V('allnames.o', t, 1);
  for (const n of allNames) {
    const q = clamp((p - n.d * 0.8) / 0.2);
    n.g.setAttribute('opacity', (q * o).toFixed(3));
    if (q > 0) n.g.setAttribute('transform', upright(n.x, n.y, t, 0.6 + 0.4 * E.back(q)));
  }
});
const confettiG = el('g', {}, svg);
const CONF = [];
for (let i = 0; i < 90; i++) {
  const col = [C.file, C.rank, C.gold, '#E84C8B', '#57C84D', '#fff'][i % 6];
  const r = el('rect', { x: -9, y: -5, width: 18, height: 10, rx: 3, fill: col, opacity: 0 }, confettiG);
  CONF.push({ r, x: hash(i) * 1920, sp: 170 + hash(i + 99) * 170, dr: hash(i + 7) * 2 - 1, ph: hash(i + 3) * 6.28, delay: hash(i + 13) * 1.2 });
}
onFrame(t => {
  const w = FX.find(f => f.kind === 'confetti' && t >= f.t0 && t < f.t0 + f.dur);
  for (const c of CONF) {
    if (!w) { c.r.setAttribute('opacity', 0); continue; }
    const tt = t - w.t0 - c.delay;
    if (tt < 0) { c.r.setAttribute('opacity', 0); continue; }
    const y = -30 + tt * c.sp, x = c.x + Math.sin(tt * 2 + c.ph) * 40 + c.dr * tt * 30;
    c.r.setAttribute('opacity', clamp((w.t0 + w.dur - t) / 0.6));
    c.r.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((tt * 200 * c.dr) % 360).toFixed(1)})`);
  }
});

// ---------------------------------------------------------------- captions
const capHTML = s => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/\{([a-h])([1-8])\}/g, '<span class="L">$1</span><span class="N">$2</span>')
  .replace(/\{([1-8])([a-h])\}/g, '<span class="N">$1</span><span class="L">$2</span>')
  .replace(/\{L:([^}]+)\}/g, '<span class="L">$1</span>')
  .replace(/\{N:([^}]+)\}/g, '<span class="N">$1</span>')
  .replace(/\*([^*]+)\*/g, '<b>$1</b>');
let capOn = true, capShown = null;
function captions(t) {
  let cur = null;
  for (const b of BEATS) if (t >= b.t0 && t < b.end) { cur = b; break; }
  const txt = cur && cur.caption ? cur.caption : '';
  if (txt !== capShown) { capEl.innerHTML = `<span>${capHTML(txt)}</span>`; capShown = txt; }
  capEl.classList.toggle('hidden', !capOn || !txt);
  if (cur) capEl.style.opacity = clamp((t - cur.t0) / 0.2).toFixed(3);
}

// ================================================================== DIRECTION
/*__DIRECTION__*/

// ================================================================== render + player
function render(t) {
  for (const u of UPD) u(t);
  captions(t);
}
const DURATION = TL.duration;
window.__render = t => { render(t); return true; };
window.__info = () => ({ duration: DURATION, cues: CUES.slice().sort((a, b) => a.t - b.t), fps: TL.fps });

// scale the 1920x1080 stage to the window
const stage = document.getElementById('stage');
function fit() {
  const W = window.innerWidth, H = window.innerHeight, k = Math.min(W / 1920, H / 1080);
  stage.style.transform = `translate(${(W - 1920 * k) / 2}px, ${(H - 1080 * k) / 2}px) scale(${k})`;
}
window.addEventListener('resize', fit); fit();
render(0);
if (RENDER) return;

// ---- classroom player: time follows the soundtrack
const aV = document.getElementById('aud-voice'), aN = document.getElementById('aud-novoice');
let voiceOn = true, playing = false, clock = 0, last = null, audioOK = true;
const aud = () => (voiceOn ? aV : aN);
const other = () => (voiceOn ? aN : aV);
[aV, aN].forEach(a => a.addEventListener('error', () => { audioOK = false; }));
const scenes = []; // scene starts for prev/next
BEATS.forEach((b, i) => { if (i === 0 || b.scene !== BEATS[i - 1].scene) scenes.push({ t: b.t0, name: b.scene }); });
const bar = document.getElementById('bar'), fill = document.getElementById('fill'), timeEl = document.getElementById('time');
scenes.forEach(s => { const i = document.createElement('i'); i.style.left = `${(s.t / DURATION) * 100}%`; i.title = s.name; bar.appendChild(i); });
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function seek(t) {
  clock = clamp(t, 0, DURATION - 0.05);
  if (audioOK) { try { aud().currentTime = clock; } catch (e) { /* not loaded yet */ } }
}
function play() {
  playing = true; last = null;
  document.getElementById('play').innerHTML = '&#9208;';
  if (audioOK) { aud().currentTime = clock; aud().play().catch(() => { audioOK = false; }); }
}
function pause() {
  playing = false;
  document.getElementById('play').innerHTML = '&#9654;';
  aV.pause(); aN.pause();
}
function toggleVoice() {
  const t = clock, was = playing;
  aud().pause();
  voiceOn = !voiceOn;
  document.getElementById('voice').classList.toggle('off', !voiceOn);
  if (audioOK) { aud().currentTime = t; if (was) aud().play().catch(() => {}); }
}
function jump(dir) {
  const now = clock;
  let target;
  if (dir > 0) target = (scenes.find(s => s.t > now + 0.1) || { t: DURATION - 0.1 }).t;
  else { const prev = scenes.filter(s => s.t < now - 1.5); target = prev.length ? prev[prev.length - 1].t : 0; }
  seek(target);
}
function tick(ts) {
  if (playing) {
    if (audioOK && !aud().paused && aud().readyState >= 2) clock = aud().currentTime;
    else if (last != null) clock += (ts - last) / 1000;
    last = ts;
    if (clock >= DURATION) { clock = DURATION; pause(); }
  }
  render(clock);
  fill.style.width = `${(clock / DURATION) * 100}%`;
  timeEl.textContent = `${fmt(clock)} / ${fmt(DURATION)}`;
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
document.getElementById('go').onclick = () => { document.getElementById('start').style.display = 'none'; play(); };
document.getElementById('play').onclick = () => (playing ? pause() : play());
document.getElementById('prev').onclick = () => jump(-1);
document.getElementById('next').onclick = () => jump(1);
document.getElementById('voice').onclick = toggleVoice;
document.getElementById('cc').onclick = () => { capOn = !capOn; document.getElementById('cc').classList.toggle('off', !capOn); };
document.getElementById('fs').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
bar.onclick = e => { const r = bar.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * DURATION); };
let hideT;
const ui = document.getElementById('ui');
window.addEventListener('mousemove', () => { ui.classList.add('show'); clearTimeout(hideT); hideT = setTimeout(() => ui.classList.remove('show'), 2500); });
window.addEventListener('keydown', e => {
  if (document.getElementById('start').style.display !== 'none') { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); document.getElementById('go').click(); } return; }
  if (e.key === ' ') { e.preventDefault(); playing ? pause() : play(); }
  else if (e.key === 'ArrowRight') jump(1);
  else if (e.key === 'ArrowLeft') jump(-1);
  else if (e.key === 'v' || e.key === 'V') toggleVoice();
  else if (e.key === 'c' || e.key === 'C') document.getElementById('cc').click();
  else if (e.key === 'f' || e.key === 'F') document.getElementById('fs').click();
});
})();
