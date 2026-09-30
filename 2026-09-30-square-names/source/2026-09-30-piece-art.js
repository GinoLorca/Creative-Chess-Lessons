/* piece-art.js — chunky, friendly Staunton chess pieces with animated faces.
 * Plain browser script. Defines globalThis.PieceArt.
 *
 *   PieceArt.create(type, color, opts) -> SVGGElement
 *     type  'p'|'n'|'b'|'r'|'q'|'k'   color 'w'|'b'   opts { arms?: boolean }
 *   Local box 100x100, baseline y=96, centred on x=50.
 *   el.pieceHeight  height in local units (baseline to top of silhouette)
 *   el.setFace({blink, look:[dx,dy], mouth, talk, brows, armL, armR, chin})
 *     armR is the arm on the viewer's right (+x side); armL mirrors it.
 */
(function (G) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var SW = 3.5;      // outline stroke
  var BACK = 5.5;    // silhouette backing stroke (makes the outer contour a bit heavier)

  var PAL = {
    w: { body: '#FFFBF0', shade: '#E6DCC3', hl: '#FFFFFF', line: '#2B2F3A', pupil: '#1E2230',
         mouth: '#6B2A3A', tongue: '#F58A9B', cheek: '#FF9AAE', cheekOp: 0.55, stache: '#2B2F3A', inner: '#E6DCC3' },
    b: { body: '#4A5070', shade: '#363B55', hl: '#6A7194', line: '#151823', pupil: '#151823',
         mouth: '#2A1420', tongue: '#E97D90', cheek: '#FF8FB0', cheekOp: 0.38, stache: '#D8DBEA', inner: '#363B55' }
  };

  // ---------- small helpers ----------
  function mk(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function n2(v) { return Math.round(v * 100) / 100; }
  function pt(p) { return n2(p[0]) + ' ' + n2(p[1]); }
  function poly(pts) { var s = 'M' + pt(pts[0]); for (var i = 1; i < pts.length; i++) s += 'L' + pt(pts[i]); return s; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }

  // Rounded polygon: pts [[x,y,r],...]; r = corner radius (large r => smooth spline-like curve)
  function roundPoly(pts) {
    var n = pts.length, s = '';
    for (var i = 0; i < n; i++) {
      var p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n], r = p[2] || 0;
      var da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
      var ra = Math.min(r, da / 2), rb = Math.min(r, db / 2);
      var p1 = [p[0] + (a[0] - p[0]) * ra / da, p[1] + (a[1] - p[1]) * ra / da];
      var p2 = [p[0] + (b[0] - p[0]) * rb / db, p[1] + (b[1] - p[1]) * rb / db];
      s += (i === 0 ? 'M' : 'L') + pt(p1) + 'Q' + pt(p) + ' ' + pt(p2);
    }
    return s + 'Z';
  }

  // ---------- lathe parts (Staunton pieces are turned: define the right-hand profile) ----------
  // fn(t) -> [y, halfWidth], t in 0..1 from top to bottom
  function lathe(fn, o) {
    o = o || {};
    var n = o.n || 48, R = [], L = [], I = [], k = o.k == null ? 0.5 : o.k, i, s;
    for (i = 0; i <= n; i++) {
      s = fn(i / n);
      R.push([50 + s[1], s[0]]); L.push([50 - s[1], s[0]]); I.push([50 + s[1] * k, s[0]]);
    }
    var part = { d: poly(R.concat(L.reverse())) + 'Z', shade: poly(R.concat(I.reverse())) + 'Z' };
    if (o.hl) {
      var H = [];
      for (i = 0; i <= 12; i++) { s = fn(lerp(o.hl[0], o.hl[1], i / 12)); H.push([50 - s[1] * (o.hlk || 0.6), s[0]]); }
      part.hl = poly(H); part.hlw = o.hlw || 2.6;
    }
    part.fn = fn;
    return part;
  }
  function base(y0, y1, a, b, r) {
    r = r || 3.2;
    return lathe(function (t) {
      var y = lerp(y0, y1, t), s = Math.sin(Math.min(1, t / 0.7) * Math.PI / 2), w = a + (b - a) * s, d = y - (y1 - r);
      if (d > 0) w -= r - Math.sqrt(Math.max(0, r * r - d * d));
      return [y, w];
    }, { hl: [0.28, 0.6], hlk: 0.78, hlw: 2.2 });
  }
  function ring(y0, y1, w, r) {
    r = Math.min(r, (y1 - y0) / 2);
    return lathe(function (t) {
      var y = lerp(y0, y1, t), d = Math.max(0, y0 + r - y, y - (y1 - r));
      return [y, w - r + Math.sqrt(Math.max(0, r * r - d * d))];
    }, { n: 28 });
  }
  function stem(y0, y1, a, b, p) {
    return lathe(function (t) { return [lerp(y0, y1, t), a + (b - a) * Math.pow(t, p || 2)]; }, { hl: [0.12, 0.55], hlk: 0.6 });
  }
  function belly(y0, y1, a, b, bul) {
    return lathe(function (t) { return [lerp(y0, y1, t), a + (b - a) * t + bul * Math.sin(Math.PI * t)]; }, { hl: [0.1, 0.42], hlk: 0.7 });
  }
  function cup(y0, y1, top, bot, p) {
    return lathe(function (t) { return [lerp(y0, y1, t), bot + (top - bot) * Math.pow(1 - t, p || 2)]; }, { hl: [0.18, 0.6], hlk: 0.62 });
  }
  function ball(cy, r, o) {
    return lathe(function (t) { var a = Math.PI * t; return [cy - r * Math.cos(a), r * Math.sin(a)]; }, o || { hl: [0.2, 0.36], hlk: 0.52, hlw: 2.2 });
  }
  function egg(y0, y1, rx, tap, point) {
    var cy = (y0 + y1) / 2, ry = (y1 - y0) / 2;
    return lathe(function (t) {
      var a = Math.PI * t, s = Math.sin(a);
      // a little point at the top (mitre)
      var sharp = t < 0.5 ? Math.pow(s, 1 + (point || 0) * (1 - t * 2)) : s;
      return [cy - ry * Math.cos(a), rx * sharp * (1 - tap * Math.cos(a))];
    }, { hl: [0.2, 0.42], hlk: 0.62, n: 64 });
  }
  function dome(y0, y1, w) {
    return lathe(function (t) { var a = Math.PI / 2 * t; return [y1 - (y1 - y0) * Math.cos(a), w * Math.sin(a)]; }, { n: 24, hl: [0.35, 0.7], hlk: 0.55, hlw: 2 });
  }
  // profile half-width of a lathe part at a given y (by bisection-free sampling)
  function widthAt(part, y) {
    var best = 0, bd = 1e9;
    for (var i = 0; i <= 200; i++) { var s = part.fn(i / 200), d = Math.abs(s[0] - y); if (d < bd) { bd = d; best = s[1]; } }
    return best;
  }

  // ---------- piece geometry ----------
  function pawn() {
    var head = ball(53.2, 17.3, { hl: [0.15, 0.33], hlk: 0.56, hlw: 2.6 });
    return {
      top: 35.9, armAfter: 1,
      parts: [base(84.5, 96, 20.5, 29), stem(71, 86, 10.5, 19.5, 2.2), ring(67, 73.5, 16.8, 3.3), head],
      face: { cx: 50, eyes: [[42.6, 53.6, 5.8, -1], [57.4, 53.6, 5.8, 1]], mouth: [50, 62.2, 0.92], cheeks: [[38.6, 60.4, 3.2, 2.1], [61.4, 60.4, 3.2, 2.1]] },
      arms: { L: [39.4, 74.5], R: [60.6, 74.5], len: [10.8, 10.8], W: 4.4, hand: 4.7, chinE: [74, 83], chinH: [57.8, 68.2] }
    };
  }

  function king() {
    var cross = roundPoly([[45.3, 3.8, 2.2], [54.7, 3.8, 2.2], [54.7, 7.6, 0.8], [60, 7.6, 2.2], [60, 13.4, 2.2], [54.7, 13.4, 0.8], [54.7, 18, 0], [45.3, 18, 0], [45.3, 13.4, 0.8], [40, 13.4, 2.2], [40, 7.6, 2.2], [45.3, 7.6, 0.8]]);
    var crossShade = poly([[51.4, 3.8], [54.7, 3.8], [54.7, 18], [51.4, 18]]) + 'Z' + poly([[56.8, 7.6], [60, 7.6], [60, 13.4], [56.8, 13.4]]) + 'Z';
    return {
      top: 3.8,
      parts: [
        base(85, 96, 25, 35), ring(79, 86, 26.5, 3.5), belly(43, 81, 16, 21.5, 2.6), ring(37, 44.5, 22.5, 3.5),
        { d: cross, shade: crossShade }, dome(13, 22.5, 12.5), cup(22.5, 38.5, 23.5, 15, 2.2), ring(20, 25, 24.5, 2.5)
      ],
      face: { cx: 50, eyes: [[42.4, 59.4, 5.9, -1], [57.6, 59.4, 5.9, 1]], mouth: [50, 72.4, 0.9], cheeks: [[36.8, 66.6, 3, 2], [63.2, 66.6, 3, 2]],
              stache: [50, 69], browW: 3.1, browBias: [0.4, 0.4, 0, 0.3] },
      arms: { L: [30.5, 60], R: [69.5, 60], len: [12, 12], W: 4.2, hand: 4.5, chinE: [81, 76], chinH: [58.5, 77.5] }
    };
  }

  function queen() {
    // coronet: flared cup whose top edge is a row of points
    var y0 = 27, y1 = 40.5, top = 22.5, bot = 14.5;
    var fn = function (t) { return [lerp(y0, y1, t), bot + (top - bot) * Math.pow(1 - t, 2.2)]; };
    var tips = [[-24.5, 20], [-12, 18], [0, 16], [12, 18], [24.5, 20]];
    var valleys = [[-17.5, 28.5], [-6, 27.5], [6, 27.5], [17.5, 28.5]];
    var R = [], L = [], I = [], i;
    for (i = 0; i <= 30; i++) { var s = fn(i / 30); R.push([50 + s[1], s[0]]); L.push([50 - s[1], s[0]]); I.push([50 + s[1] * 0.5, s[0]]); }
    var topEdge = [];
    for (i = 0; i < tips.length; i++) {
      topEdge.push([50 + tips[i][0], tips[i][1], 1.2]);
      if (i < valleys.length) topEdge.push([50 + valleys[i][0], valleys[i][1], 1.6]);
    }
    // body of coronet as rounded polygon: tips/valleys then down the right side, back up the left
    var pts = topEdge.slice();
    for (i = 0; i <= 30; i += 3) pts.push([R[i][0], R[i][1], 99]);
    for (i = 30; i >= 0; i -= 3) pts.push([L[i][0], L[i][1], 99]);
    pts[topEdge.length][2] = 3; pts[pts.length - 1][2] = 3;
    pts.push([50 - 25, 22.5, 2]);
    var coronet = roundPoly(pts);
    var shadePts = [[50 + 12, 18.7, 1], [50 + 17.5, 28.5, 1.2], [50 + 24.5, 20, 1.2]];
    for (i = 0; i <= 30; i += 3) shadePts.push([R[i][0], R[i][1], 99]);
    for (i = 30; i >= 0; i -= 3) shadePts.push([I[i][0], I[i][1], 99]);
    var cor = { d: coronet, shade: roundPoly(shadePts), hl: poly([[34, 31.5], [36.4, 37.5]]), hlw: 2.4 };
    var parts = [base(85, 96, 24, 34), ring(79, 86, 26, 3.5), belly(44, 81, 15.5, 21, 2.6), ring(38.5, 46, 21.5, 3.5), cor];
    for (i = 0; i < tips.length; i++) {
      var r = i === 2 ? 4.4 : 3.5;
      var b = lathe((function (cx, cy, rr) { return function (t) { var a = Math.PI * t; return [cy - rr * Math.cos(a), rr * Math.sin(a)]; }; })(0, tips[i][1] - r * 0.55, r), { n: 20 });
      // shift ball horizontally (lathe centres on x=50)
      parts.push(shiftPart(b, tips[i][0]));
    }
    return {
      top: 16 - 4.4 * 1.55,
      parts: parts,
      face: { cx: 50, eyes: [[42.5, 60.5, 6, -1], [57.5, 60.5, 6, 1]], mouth: [50, 70.8, 0.92], cheeks: [[37.4, 67.4, 3, 2], [62.6, 67.4, 3, 2]],
              lashes: true, browW: 2.2, browBias: [0, 0, 0, -0.6] },
      arms: { L: [31.5, 61], R: [68.5, 61], len: [12, 12], W: 4, hand: 4.3, chinE: [80, 77], chinH: [58, 77] }
    };
  }
  function shiftPart(p, dx) {
    function sh(d) { return d.replace(/([ML])(-?[\d.]+) (-?[\d.]+)/g, function (m, c, x, y) { return c + n2(+x + dx) + ' ' + y; }); }
    return { d: sh(p.d), shade: sh(p.shade), hl: p.hl ? sh(p.hl) : null, hlw: p.hlw };
  }

  function bishop() {
    var mitre = egg(19.5, 58.5, 18.2, 0.16, 0.9);
    // diagonal slit cut into the upper right of the mitre (kept above the brows)
    var y1 = 22, y2 = 27.6, wa = widthAt(mitre, y1), wb = widthAt(mitre, y2), ax = 53.8, ay = 30.8;
    mitre.extras = [
      { d: roundPoly([[50 + wa + 3, y1 - 1.2, 0], [50 + wb + 3, y2 - 0.6, 0], [ax, ay, 1.2]]), fill: 'line' },
      // lit lower lip of the cut so it still reads on the dark pieces
      { d: 'M' + n2(ax + 1.4) + ' ' + n2(ay + 0.6) + 'L' + n2(50 + wb - 1.2) + ' ' + n2(y2 + 1.1), stroke: 'hl', sw: 1.6 }
    ];
    return {
      top: 11.4,
      parts: [base(84, 96, 23, 32), ring(78, 85, 24.5, 3.5), stem(60, 80, 10.5, 18.5, 2.2), ring(55.8, 62, 16.5, 3.1),
              mitre, ball(16.6, 5.2, { n: 32 })],
      face: { cx: 50, eyes: [[43.1, 45.4, 5.6, -1], [56.9, 45.4, 5.6, 1]], mouth: [50, 53.2, 0.85], cheeks: [[39, 51.2, 2.8, 1.8], [61, 51.2, 2.8, 1.8]],
              lid: 0.17, browW: 2.4, browBias: [0.2, -0.2, 0.5, -0.7] },
      arms: { L: [40, 67], R: [60, 67], len: [12, 12], W: 4, hand: 4.3, chinE: [74, 70], chinH: [56, 57.5] }
    };
  }

  function rook() {
    var T = 27.6, N = 6.4, B = 41.5, wT = 24.2, wB = 21.5;
    var turret = roundPoly([
      [50 - wB, B, 1], [50 - wT, T, 2.4], [38.2, T, 2], [38.2, T + N, 1.4], [44.2, T + N, 1.4], [44.2, T, 2], [55.8, T, 2],
      [55.8, T + N, 1.4], [61.8, T + N, 1.4], [61.8, T, 2], [50 + wT, T, 2.4], [50 + wB, B, 1]
    ]);
    var tshade = roundPoly([[61.8, T, 2], [50 + wT, T, 2.4], [50 + wB, B, 0], [61.2, B, 0]]);
    return {
      top: T,
      parts: [base(85.5, 96, 24, 33.5), ring(79.5, 86, 25.5, 3.5), stem(44, 81.5, 18.4, 22, 1.7), ring(39.5, 46.5, 23, 3),
              { d: turret, shade: tshade, hl: poly([[31, 31], [31.6, 38]]), hlw: 2.4 }],
      face: { cx: 50, eyes: [[42.5, 61, 6, -1], [57.5, 61, 6, 1]], mouth: [50, 71.6, 1], cheeks: [[37.4, 68.2, 3, 2], [62.6, 68.2, 3, 2]],
              browW: 3.4, browBias: [-0.2, 1.6, -0.6, 0.6], defMouth: 'flatsmile' },
      arms: { L: [31.5, 57], R: [68.5, 57], len: [12, 12], W: 4.2, hand: 4.5, chinE: [81, 76], chinH: [59, 78] }
    };
  }

  function knight() {
    var head = roundPoly([
      [29, 83, 1], [25.5, 74, 99], [32, 65.5, 99], [43, 60.5, 3.5], [31, 62.4, 99], [17.2, 60.5, 5], [13.6, 49, 7],
      [21, 35.5, 99], [37, 26, 99], [46.5, 25.5, 2.2], [51.5, 15.5, 1.4], [58.5, 24.5, 3], [69.5, 32, 99],
      [75.5, 55, 99], [73, 83, 1]
    ]);
    var shade = roundPoly([[64.5, 38, 99], [70.5, 44, 99], [74.8, 60, 99], [73, 83, 0], [63, 83, 0], [65.5, 64, 99]]);
    var maneC = [[60.5, 22.8, 5], [67.5, 27.5, 6.2], [73.5, 35.5, 6.8], [77.6, 45.5, 7], [79.4, 57, 7], [79.2, 68.5, 6.8], [77.5, 78.5, 6.2]];
    var parts = [base(84, 96, 23.5, 33)];
    for (var i = 0; i < maneC.length; i++) parts.push(ball(maneC[i][1], maneC[i][2], { n: 24 }));
    for (i = 1; i < parts.length; i++) { parts[i] = shiftPart(parts[i], maneC[i - 1][0] - 50); parts[i].fill = 'shade'; parts[i].shade = null; }
    parts.push({ d: head, shade: shade, hl: poly([[20.5, 42], [25.5, 35.5], [31, 31]]), hlw: 2.6,
                 extras: [
                   { d: roundPoly([[50, 24.8, 1], [52, 20, 1], [55.2, 25.4, 1]]), fill: 'inner' },           // inner ear
                   { d: 'M42.5 60.2Q51 55 50.5 45.5', stroke: 'line', sw: 2.4 }                                // jaw line
                 ] });
    parts.push(ring(78, 85, 25, 3.5));
    return {
      top: 15.5, armAfter: 1,
      parts: parts,
      face: { cx: 30, eyes: [[41, 40, 6.4, 1]], browGap: 1.8, liftScale: 0.5, mouth: [24.5, 56.6, 0.62], cheeks: [[40, 50.5, 3.4, 2.2]], nostril: [19.5, 50],
              browW: 2.8, browBias: [0, 0.2, 0, 0], mouthTilt: -8 },
      arms: { L: [31, 72], R: [70, 70], len: [12, 12], W: 4, hand: 4.3, chinE: [46, 78], chinH: [27, 63.5] }
    };
  }

  var BUILD = { p: pawn, n: knight, b: bishop, r: rook, q: queen, k: king };

  // ---------- face parameters ----------
  // mouth: [width, cornerY, topCtrlY, botCtrlY, roundness]
  var MOUTHS = {
    smile: [11, -1.3, 1.6, 4.6, 0.55],
    flatsmile: [10, -0.5, 0.8, 2.8, 0.5],
    grin: [14.5, -2, -0.4, 9.5, 0.8],
    open: [9, 0, -3.2, 7.2, 0.95],
    o: [5.6, 0, -3.8, 3.8, 1],
    flat: [9.5, 0.4, 0.2, 1.2, 0.5]
  };
  // brows: [lift, innerDy, outerDy, arch]  (+dy = down)
  var BROWS = {
    neutral: [0, 0.3, 0.5, -1.4],
    raised: [2.3, -0.4, 0.6, -2.6],
    worried: [0.9, -2.6, 1.3, -0.5],
    determined: [-0.4, 2.3, -1.2, -0.3]
  };

  function create(type, color, opts) {
    opts = opts || {};
    var spec = (BUILD[type] || BUILD.p)();
    var pal = PAL[color === 'b' ? 'b' : 'w'];
    // line-weight multiplier: 1 is tuned for ~80px board pieces; hosts drawn big (arms) default lighter.
    var LW = num(opts.line, opts.arms ? 0.6 : 1);
    var g = mk('g', { 'class': 'piece piece-' + color + type });
    var fcfg = spec.face, acfg = spec.arms;
    var SWl = SW * LW;

    // silhouette backing (drawn first: only shows outside the union of fills)
    var back = mk('g', { fill: pal.line, stroke: pal.line, 'stroke-width': n2(BACK * LW), 'stroke-linejoin': 'round' }, g);
    spec.parts.forEach(function (p) { mk('path', { d: p.d }, back); });

    var arms = null;
    function makeArm(parent) {
      var o = mk('path', { fill: 'none', stroke: pal.line, 'stroke-width': n2(acfg.W + 2 * SWl), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
      var i = mk('path', { fill: 'none', stroke: pal.body, 'stroke-width': acfg.W, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
      var t = mk('circle', { r: n2(acfg.hand * 0.42), fill: pal.body, stroke: pal.line, 'stroke-width': n2(SWl * 0.85) }, parent);
      var h = mk('circle', { r: acfg.hand, fill: pal.body, stroke: pal.line, 'stroke-width': n2(SWl) }, parent);
      return { o: o, i: i, h: h, t: t };
    }
    var armAfter = spec.armAfter == null ? 2 : spec.armAfter;
    spec.parts.forEach(function (p, idx) {
      if (opts.arms && idx === armAfter) {
        // arms sit in front of the base, behind the body (shoulders hidden)
        var backArms = mk('g', { 'class': 'arms' }, g);
        arms = { L: makeArm(backArms), R: makeArm(backArms) };
      }
      mk('path', { d: p.d, fill: pal[p.fill || 'body'] }, g);
      if (p.shade) mk('path', { d: p.shade, fill: pal.shade }, g);
      if (p.hl) mk('path', { d: p.hl, fill: 'none', stroke: pal.hl, 'stroke-width': n2((p.hlw || 2.4) * Math.sqrt(LW)), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      (p.extras || []).forEach(function (x) {
        mk('path', { d: x.d, fill: x.fill ? pal[x.fill] : 'none', stroke: x.stroke ? pal[x.stroke] : null, 'stroke-width': x.sw ? n2(x.sw * LW) : null,
                     'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      });
      mk('path', { d: p.d, fill: 'none', stroke: pal.line, 'stroke-width': n2(SWl), 'stroke-linejoin': 'round' }, g);
    });

    // ----- face -----
    var fg = mk('g', { 'class': 'face' }, g);
    (fcfg.cheeks || []).forEach(function (c) {
      mk('ellipse', { cx: c[0], cy: c[1], rx: c[2], ry: c[3], fill: pal.cheek, opacity: pal.cheekOp }, fg);
    });
    if (fcfg.nostril) {
      var ns = fcfg.nostril;
      mk('path', { d: 'M' + (ns[0] - 1.6) + ' ' + (ns[1] + 1.4) + 'Q' + (ns[0] - 0.6) + ' ' + (ns[1] - 2.6) + ' ' + (ns[0] + 2.2) + ' ' + (ns[1] - 0.6),
                   fill: 'none', stroke: pal.line, 'stroke-width': n2(2.4 * LW), 'stroke-linecap': 'round' }, fg);
    }
    var RY = 1.1;
    var eyes = fcfg.eyes.map(function (e) {
      var x = e[0], y = e[1], r = e[2], side = e[3];
      var eg = mk('g', { transform: 'translate(' + x + ' ' + y + ')' }, fg);
      var open = mk('g', null, eg);
      mk('ellipse', { cx: 0, cy: 0, rx: r, ry: n2(r * RY), fill: '#FFFFFF', stroke: pal.line, 'stroke-width': n2(1.7 * LW) }, open);
      var pup = mk('circle', { cx: 0, cy: 0, r: n2(r * 0.58), fill: pal.pupil }, open);
      var hi = mk('circle', { cx: 0, cy: 0, r: n2(r * 0.2), fill: '#FFFFFF' }, open);
      var hi2 = mk('circle', { cx: 0, cy: 0, r: n2(r * 0.09), fill: '#FFFFFF' }, open);
      if (fcfg.lid) {
        var R = r * RY, yc = -R + 2 * R * fcfg.lid, xc = Math.sqrt(Math.max(0, R * R - yc * yc)) * (r / R);
        mk('path', { d: 'M' + n2(-xc) + ' ' + n2(yc) + 'A' + r + ' ' + n2(R) + ' 0 0 1 ' + n2(xc) + ' ' + n2(yc) + 'Z',
                     fill: pal.body, stroke: pal.line, 'stroke-width': n2(1.7 * LW), 'stroke-linejoin': 'round' }, open);
      }
      if (fcfg.lashes) {
        var ld = '';
        [[58, 3.4], [82, 3.0]].forEach(function (L) {
          var a = L[0] * Math.PI / 180, sx = side * Math.sin(a) * r, sy = -Math.cos(a) * r * RY;
          var ex = sx + side * Math.sin(a + 0.35) * L[1], ey = sy - Math.cos(a + 0.35) * L[1];
          ld += 'M' + n2(sx) + ' ' + n2(sy) + 'L' + n2(ex) + ' ' + n2(ey);
        });
        mk('path', { d: ld, fill: 'none', stroke: pal.line, 'stroke-width': n2(2 * LW), 'stroke-linecap': 'round' }, open);
      }
      var closedD = 'M' + n2(-r) + ' 0Q0 ' + n2(r * 0.7) + ' ' + n2(r) + ' 0';
      if (fcfg.lashes) closedD += 'M' + n2(side * r * 0.95) + ' 0.2l' + n2(side * 2.6) + ' 1.6M' + n2(side * r * 0.55) + ' 2.4l' + n2(side * 1.8) + ' 2.2';
      var closed = mk('path', { d: closedD, fill: 'none', stroke: pal.line, 'stroke-width': n2(2.4 * LW), 'stroke-linecap': 'round', display: 'none' }, eg);
      var brow = mk('path', { fill: 'none', stroke: pal.line, 'stroke-width': n2((fcfg.browW || 2.6) * LW), 'stroke-linecap': 'round' }, fg);
      return { x: x, y: y, r: r, side: side, open: open, pup: pup, hi: hi, hi2: hi2, closed: closed, brow: brow };
    });
    var m = fcfg.mouth, ms = m[2];
    var mg = mk('g', { transform: 'translate(' + m[0] + ' ' + m[1] + ') rotate(' + (fcfg.mouthTilt || 0) + ') scale(' + ms + ')' }, fg);
    var mouth = mk('path', { fill: pal.mouth, stroke: pal.line, 'stroke-width': n2(2.2 * LW / ms), 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, mg);
    var tongue = mk('ellipse', { cx: 0, cy: 0, rx: 1, ry: 1, fill: pal.tongue }, mg);
    if (fcfg.stache) {
      var sx0 = fcfg.stache[0], sy0 = fcfg.stache[1];
      var half = [[0, -1.8], [-3.2, -3.4], [-8, -2.8], [-10.6, 0.2], [-12.4, 0.4], [-11.6, 2.2], [-8.2, 3.2], [-3.6, 2.4], [0, 1.2]];
      var sp = [];
      half.forEach(function (h) { sp.push([sx0 + h[0], sy0 + h[1], 99]); });
      for (var k = half.length - 2; k >= 1; k--) sp.push([sx0 - half[k][0], sy0 + half[k][1], 99]);
      sp[0][2] = 1.2; sp[8][2] = 1.2; sp[4][2] = 1.5; sp[12][2] = 1.5;
      mk('path', { d: roundPoly(sp), fill: pal.stache, stroke: pal.line, 'stroke-width': n2(2 * LW), 'stroke-linejoin': 'round' }, fg);
    }

    // front copy of the right arm (thinking pose: forearm crosses in front of the body)
    var front = null;
    if (opts.arms) front = makeArm(mk('g', { 'class': 'arm-front' }, g));

    // ----- setFace -----
    // extra elbow bend by shoulder angle: relaxed -> gesturing -> straight out -> raised
    var BEND = [[0, 14], [40, 26], [90, 4], [150, -10], [180, -10]];
    function bendAt(a) {
      if (a <= BEND[0][0]) return BEND[0][1];
      for (var i = 1; i < BEND.length; i++) if (a <= BEND[i][0]) {
        var t = (a - BEND[i - 1][0]) / (BEND[i][0] - BEND[i - 1][0]);
        return lerp(BEND[i - 1][1], BEND[i][1], t);
      }
      return BEND[BEND.length - 1][1];
    }
    function armGeom(S, side, ang, chin) {
      ang = clamp(ang, -20, 180);
      var a = ang + 30 * Math.max(0, 1 - ang / 90);
      var r1 = a * Math.PI / 180, r2 = (a + bendAt(ang)) * Math.PI / 180;
      var E = [S[0] + side * Math.sin(r1) * acfg.len[0], S[1] + Math.cos(r1) * acfg.len[0]];
      var H = [E[0] + side * Math.sin(r2) * acfg.len[1], E[1] + Math.cos(r2) * acfg.len[1]];
      if (chin > 0) {
        var t = chin * chin * (3 - 2 * chin);
        E = [lerp(E[0], acfg.chinE[0], t), lerp(E[1], acfg.chinE[1], t)];
        H = [lerp(H[0], acfg.chinH[0], t), lerp(H[1], acfg.chinH[1], t)];
      }
      var C = [1.8 * E[0] - 0.4 * (S[0] + H[0]), 1.8 * E[1] - 0.4 * (S[1] + H[1])];
      // mitten thumb: on the upper side of the hand, perpendicular to the forearm
      var dx = H[0] - C[0], dy = H[1] - C[1], dl = Math.hypot(dx, dy) || 1;
      dx /= dl; dy /= dl;
      var px = -dy, py = dx;
      if (py > 0 || (Math.abs(py) < 0.2 && px * side > 0)) { px = -px; py = -py; }
      var tr = acfg.hand * 0.95;
      var T = [H[0] + (px * 0.8 + dx * 0.45) * tr, H[1] + (py * 0.8 + dy * 0.45) * tr];
      return { d: 'M' + pt(S) + 'Q' + pt(C) + ' ' + pt(H), H: H, T: T };
    }
    function setArm(A, geo, show) {
      var disp = show ? 'inline' : 'none';
      A.o.setAttribute('display', disp); A.i.setAttribute('display', disp); A.h.setAttribute('display', disp); A.t.setAttribute('display', disp);
      if (!show) return;
      A.o.setAttribute('d', geo.d); A.i.setAttribute('d', geo.d);
      A.h.setAttribute('cx', n2(geo.H[0])); A.h.setAttribute('cy', n2(geo.H[1]));
      A.t.setAttribute('cx', n2(geo.T[0])); A.t.setAttribute('cy', n2(geo.T[1]));
    }

    g.setFace = function (st) {
      st = st || {};
      var blink = clamp(num(st.blink, 0), 0, 1);
      var look = st.look || [0, 0];
      var lx = clamp(num(look[0], 0), -1, 1), ly = clamp(num(look[1], 0), -1, 1);
      var bw = BROWS[st.brows] || BROWS.neutral, bias = fcfg.browBias || [0, 0, 0, 0];
      var sY = 1 - blink;
      for (var i = 0; i < eyes.length; i++) {
        var e = eyes[i], r = e.r;
        if (sY < 0.14) { e.open.setAttribute('display', 'none'); e.closed.setAttribute('display', 'inline'); }
        else {
          e.open.setAttribute('display', 'inline'); e.closed.setAttribute('display', 'none');
          e.open.setAttribute('transform', 'scale(1 ' + n2(sY) + ')');
        }
        var px = lx * r * 0.38, py = ly * r * 0.4;
        e.pup.setAttribute('cx', n2(px)); e.pup.setAttribute('cy', n2(py));
        e.hi.setAttribute('cx', n2(px - r * 0.2)); e.hi.setAttribute('cy', n2(py - r * 0.24));
        e.hi2.setAttribute('cx', n2(px + r * 0.22)); e.hi2.setAttribute('cy', n2(py + r * 0.2));
        var lift = bw[0] * (fcfg.liftScale || 1) + bias[0], idy = bw[1] + bias[1], ody = bw[2] + bias[2], arch = bw[3] + bias[3];
        var yb = e.y - r * RY - (fcfg.browGap || 2.4) - lift;
        var I = [e.x - e.side * r * 0.72, yb + idy], O = [e.x + e.side * r * 1.05, yb + ody];
        var C = [(I[0] + O[0]) / 2, (I[1] + O[1]) / 2 + arch * 2];
        e.brow.setAttribute('d', 'M' + pt(I) + 'Q' + pt(C) + ' ' + pt(O));
      }
      // mouth
      var M = MOUTHS[st.mouth] || MOUTHS[fcfg.defMouth || 'smile'];
      var talk = clamp(num(st.talk, 0), 0, 1);
      var w = M[0] - talk * 1.2, c = M[1], top = M[2] - talk * 1.2, bot = M[3] + talk * 4.3, kx = M[4] + (1 - M[4]) * talk * 0.6;
      if (bot < top + 0.4) bot = top + 0.4;
      var hw = w / 2, kw = kx * hw;
      mouth.setAttribute('d', 'M' + n2(-hw) + ' ' + n2(c) + 'C' + n2(-kw) + ' ' + n2(top) + ' ' + n2(kw) + ' ' + n2(top) + ' ' + n2(hw) + ' ' + n2(c) +
                              'C' + n2(kw) + ' ' + n2(bot) + ' ' + n2(-kw) + ' ' + n2(bot) + ' ' + n2(-hw) + ' ' + n2(c) + 'Z');
      var bottomY = 0.25 * c + 0.75 * bot, topY = 0.25 * c + 0.75 * top, openH = bottomY - topY;
      var tr = clamp((openH - 3.2) * 0.3, 0, 2.6);
      if (tr < 0.35) tongue.setAttribute('display', 'none');
      else {
        tongue.setAttribute('display', 'inline');
        tongue.setAttribute('rx', n2(Math.min(hw * 0.52, tr * 1.7))); tongue.setAttribute('ry', n2(tr));
        tongue.setAttribute('cy', n2(bottomY - tr - 0.9));
      }
      // arms
      if (arms) {
        var chin = clamp(num(st.chin, 0), 0, 1);
        var aL = num(st.armL, 0), aR = num(st.armR, 0);
        setArm(arms.L, armGeom(acfg.L, -1, aL, 0), true);
        var gR = armGeom(acfg.R, 1, aR, chin);
        setArm(arms.R, gR, chin <= 0.02);
        setArm(front, gR, chin > 0.02);
      }
    };
    g.pieceHeight = 96 - spec.top;
    g.pieceType = type; g.pieceColor = color;
    g.setFace({});
    return g;
  }

  G.PieceArt = { create: create, palette: PAL };
})(typeof globalThis !== 'undefined' ? globalThis : window);
