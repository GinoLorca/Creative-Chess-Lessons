// ---------------------------------------------------------------- DIRECTION
// What happens on screen, beat by beat. Beat ids and wording live in
// 2026-09-30-lesson-script.mjs; B(id) gives a beat's times, st/en give the start/end
// of its k-th spoken part, so every visual lands on the word it belongs to.
const st = (id, k = 0) => S(id, k).start;
const en = (id, k = 0) => S(id, k).end;
const T0 = id => B(id).t0;
const T1 = id => B(id).end;
const ALLF = FILES.split('');

// ---- title
titleCard('main', ['Every Square', 'Has a Name'], [['Files · Ranks · Coordinates']]);
tw('title.main', 1, 0.15, 0.7, E.out);
tw('title.main', 0, T0('hello') - 0.7, 0.6);
cue('sparkle', 0.5, 0.8);
tw('board.s', 1, 0, 1.2, E.out, 0.94);

// ================================================================ Hello
{
  const t = T0('hello');
  set('host.o', 1, t);
  tw('host.y', HOST.y, t, 0.7, E.back, 1250);
  cue('pop', t + 0.3);
  wave(st('hello') - 0.1, 3); // waves as it says "Hey there, chess kids!"
  // the narrator's name card
  nameCard(st('mike') - 0.1, T1('today') - 0.2);
  pose(T0('mike'), { lx: 0, ly: 0 }, 0.4);
  // today: files, ranks and square names (each pops up as it is said)
  showCard('topics', st('today', 0) + 0.2, T1('today'));
  tw('card.topics.a', 1, st('today', 1) - 0.05, 0.4, E.back, 0); cue('pop', st('today', 1), 0.8);
  tw('card.topics.b', 1, st('today', 2) - 0.05, 0.4, E.back, 0); cue('pop', st('today', 2), 0.9);
  tw('card.topics.c', 1, st('today', 3) + 0.25, 0.4, E.back, 0); cue('pop', st('today', 3) + 0.3, 1.0);
  point(st('today', 1) - 0.2, T1('today') - 0.2);
  // "What, squares have names?!" -> "Well, yes — in chess they do!"
  pose(st('what', 0), { mouth: 'o', brows: 'raised', tilt: -6, lx: -0.3, ly: -0.4 }, 0.25);
  pose(T1('what') - 0.1, { mouth: 'smile', brows: 'neutral', tilt: 0, lx: -0.35, ly: 0.1 }, 0.3);
  FX.push({ kind: 'shimmer', t0: st('yes', 1) - 0.1, dur: 1.8 });
  cue('sparkle', st('yes', 1), 0.9);
  hostHop(st('yes', 0) + 0.2, 45);
  pose(st('yes', 0), { mouth: 'grin' }, 0.2);
  pose(T1('yes') - 0.2, { mouth: 'smile' }, 0.3);
  point(st('yes', 1), T1('yes') - 0.2);
}

// ================================================================ Ranks (taught first)
{
  hostHop(st('ranksfirst') + 0.2, 35);
  // "You can think of ranks as floors in a building": floors stack up 1 -> 8
  showCard('building', T0('rankthink') + 0.1, T1('numbers'));
  for (let n = 1; n <= 8; n++) {
    tw(`card.building.f${n}`, 1, st('rankthink', 1) + (n - 1) * 0.16, 0.35, E.back, 0);
    cue('blip', st('rankthink', 1) + (n - 1) * 0.16, 0.4 + n * 0.05);
  }
  // the numbers pop in up the side of the board
  const b = st('numbers', 0) + 0.3;
  for (let n = 1; n <= 8; n++) {
    tw(`lr.${n}.o`, 1, b + (n - 1) * 0.13, 0.2, E.out, 0);
    tw(`lr.${n}.s`, 1, b + (n - 1) * 0.13, 0.45, E.back, 0.3);
    cue('blip', b + (n - 1) * 0.13, 0.5 + n * 0.05);
  }
  glow('1', st('numbers', 1) + 0.2, T1('numbers') - 0.1);
  glow('8', en('numbers', 1) - 0.4, T1('numbers') - 0.1);
  point(T0('numbers'), T1('numbers') - 0.2);
  // "a line of squares that goes side to side ... is called a rank"
  rankBand(1, st('rankdef1') + 0.2, { dur: 1.8 });
  cue('swoosh', st('rankdef1') + 0.2);
  pose(st('rankdef1') + 0.3, { armL: 95, armR: 95, tilt: -6 }, 0.5);
  pose(st('rankdef1') + 1.1, { tilt: 6 }, 0.6);
  pose(T1('rankdef1') - 0.2, { armL: 8, armR: 8, tilt: 0 }, 0.5);
  showCard('rank', T0('rankdef2'), T1('rankdef2'));
  tw('card.rank.s', 1.08, st('rankdef2') + 0.6, 0.2, E.out); tw('card.rank.s', 1, st('rankdef2') + 0.8, 0.3);
  // first rank = first floor, eighth rank = top floor
  showCard('building', T0('rank1'), T1('rank8b'));
  set('card.building.hl', 1, T0('rank1'));
  set('card.building.hl', 8, T0('rank8'));
  glow('1', en('rank1', 0) - 0.7, T0('rookrank'));
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  back.forEach((p, i) => piece('w1' + i, p, 'w', ALLF[i] + '1', st('rank1b') + 0.3 + i * 0.12, T0('rookrank') + 0.1));
  rankBand(8, st('rank8') + 0.1, { dur: 1.2 });
  cue('swoosh', st('rank8') + 0.1);
  glow('8', en('rank8', 0) - 0.55, T0('rookrank'));
  back.forEach((p, i) => piece('b8' + i, p, 'b', ALLF[i] + '8', st('rank8b') + 0.3 + i * 0.12, T0('rookrank') + 0.1));
  point(T0('rank1'), T1('rank8b') - 0.2);
  bandOff('rb', 1, T0('rookrank')); bandOff('rb', 8, T0('rookrank'));
  // the rook slides side to side along the 4th rank
  showCard('rank', T0('rookrank'), T0('whichrank') - 0.1);
  piece('rk4', 'r', 'w', 'a4', T0('rookrank') + 0.35, T1('rank4') - 0.3, { drop: false, pop: true });
  const r = st('rookrank') + 0.5;
  movePiece('rk4', 'h4', r + 0.4, 1.6, 0); movePiece('rk4', 'd4', r + 2.2, 1.1, 0);
  face('rk4', r, { brows: 'determined' });
  pose(r, { lx: -0.9 }, 0.3);
  countdown(en('whichrank') + 0.3, 5);
  rankBand(4, T0('rank4') + 0.05, { dur: 1.0 });
  glow('4', T0('rank4') + 0.05, T0('filesnext'));
  face('rk4', T0('rank4'), { mouth: 'grin', brows: 'neutral' });
  pieceHop('rk4', T0('rank4') + 0.9);
  cue('chime', T0('rank4') + 1.1);
  celebrate(T0('rank4') + 0.2);
  bandOff('rb', 4, T0('filesnext'));
}

// ================================================================ Files
{
  hostHop(st('filesnext') + 0.2, 35);
  // the letters pop in along the bottom
  const a = st('letters', 0) + 0.3;
  ALLF.forEach((L, i) => {
    tw(`lf.${L}.o`, 1, a + i * 0.13, 0.2, E.out, 0);
    tw(`lf.${L}.s`, 1, a + i * 0.13, 0.45, E.back, 0.3);
    cue('blip', a + i * 0.13, 0.5 + i * 0.05);
  });
  point(T0('letters'), T1('letters') - 0.2);
  glow('a', st('letters', 1) + 0.25, T1('letters') - 0.1);
  glow('h', en('letters', 1) - 0.45, T1('letters') - 0.1);
  // "a line of squares that goes up and down ... is called a file"
  fileBand('a', st('filedef1') + 0.2, { dur: 1.8 });
  cue('swoosh', st('filedef1') + 0.2);
  pose(st('filedef1') + 0.3, { armL: 160, armR: 160 }, 0.5);
  pose(st('filedef1') + 1.1, { armL: 8, armR: 8 }, 0.6);
  showCard('file', T0('filedef2'), T0('whichfile') - 0.1);
  tw('card.file.s', 1.08, st('filedef2') + 0.6, 0.2, E.out); tw('card.file.s', 1, st('filedef2') + 0.8, 0.3);
  glow('a', en('afile') - 0.55, T0('efile'));
  // every square on the a-file pulses, bottom to top
  for (let r = 1; r <= 8; r++) { flash('a' + r, st('afile2') + 0.5 + (r - 1) * 0.22); cue('blip', st('afile2') + 0.5 + (r - 1) * 0.22, 0.35); }
  point(T0('afile'), T1('afile2') - 0.2);
  bandOff('fb', 'a', T0('efile'));
  // e-file
  fileBand('e', st('efile') + 0.1, { dur: 1.2 });
  cue('swoosh', st('efile') + 0.1);
  glow('e', en('efile') - 0.6, T0('rookside') + 0.4);
  // single-file line: four pieces march up the e-file one behind another
  const line = [['sfP', 'p', 'e4'], ['sfN', 'n', 'e3'], ['sfB', 'b', 'e2'], ['sfR', 'r', 'e1']];
  const t0 = T0('singlefile') + 0.1;
  line.forEach(([id, type, sq], i) => {
    piece(id, type, 'w', sq, t0 + (3 - i) * 0.12, null, { drop: false, pop: true });
    const r0 = +sq[1];
    for (let s = 1; s <= 4; s++) movePiece(id, 'e' + (r0 + s), t0 + 0.9 + (s - 1) * 0.62, 0.55, 16, 'step');
  });
  ['sfP', 'sfN', 'sfB'].forEach((id, i) => popOut(id, T1('singlefile') - 0.35 + i * 0.08));
  pose(t0, { lx: -0.8, ly: -0.3 }, 0.4);
  // the rook (now on e5) slides up and down, staying on the e-file
  const r = st('rookfile') + 0.2;
  movePiece('sfR', 'e8', r, 0.8, 0); movePiece('sfR', 'e1', r + 1.0, 1.5, 0); movePiece('sfR', 'e3', r + 2.7, 0.8, 0);
  face('sfR', r, { brows: 'determined' });
  pose(r, { lx: -0.9, ly: 0 }, 0.3);
  face('sfR', st('rookfile2'), { mouth: 'grin' });
  pieceHop('sfR', st('rookfile2') + 0.2);
  // sideways -> which file?
  movePiece('sfR', 'c3', st('rookside') + 0.1, 1.3, 0);
  face('sfR', st('rookside'), { mouth: 'smile', brows: 'neutral' });
  bandOff('fb', 'e', st('rookside') + 0.1);
  countdown(en('whichfile') + 0.3, 5);
  fileBand('c', T0('cfile') + 0.05, { dur: 1.0 });
  glow('c', T0('cfile') + 0.05, T0('chant1'));
  face('sfR', T0('cfile'), { mouth: 'grin' });
  pieceHop('sfR', T0('cfile') + 0.9);
  cue('chime', T0('cfile') + 1.1);
  celebrate(T0('cfile') + 0.2);
  popOut('sfR', T1('cfile') - 0.4);
  bandOff('fb', 'c', T0('chant1'));
  // chant: stand up! ranks go side to side, files go up and down
  hostHop(st('chant1', 0) + 0.1, 50);
  showCard('rank', T0('chant1'), T0('chant2'));
  rankBand(5, st('chant1', 1), { dur: 0.9 });
  bandOff('rb', 5, T0('chant2'));
  pose(st('chant1', 1), { armL: 95, armR: 95 }, 0.4);
  for (let i = 0; i < 3; i++) {
    const t = st('chant1', 1) + 0.4 + i * 1.2;
    pose(t, { tilt: -9 }, 0.55);
    pose(t + 0.6, { tilt: 9 }, 0.55);
  }
  pose(T1('chant1') - 0.3, { armL: 8, armR: 8, tilt: 0 }, 0.3);
  showCard('file', T0('chant2'), T1('chant2'));
  fileBand('e', st('chant2'), { dur: 0.9 });
  bandOff('fb', 'e', T1('chant2'));
  for (let i = 0; i < 3; i++) {
    const t = st('chant2') + i * 1.2;
    pose(t, { armL: 165, armR: 165 }, 0.45);
    pose(t + 0.6, { armL: 5, armR: 5 }, 0.45);
  }
  pose(T1('chant2') - 0.3, { armL: 8, armR: 8 }, 0.4);
}

// ================================================================ Square names
{
  hostHop(st('bigidea', 1) + 0.1, 40);
  cue('sparkle', st('bigidea', 1) + 0.1, 0.8);
  FX.push({ kind: 'shimmer', t0: st('bigidea', 1), dur: 1.6 });
  // first name / last name (people), then the same for a square
  showCard('names', T0('yourname') + 0.1, T0('squaretoo') + 0.1);
  tw('card.names.first', 1, st('yourname', 0) + 0.5, 0.35, E.back, 0);
  tw('card.names.last', 1, st('yourname', 1) + 0.4, 0.35, E.back, 0);
  showCard('sqname', T0('squaretoo') + 0.25, T0('cross') + 0.3);
  hostHop(st('squaretoo') + 0.3, 40);
  pose(st('squaretoo'), { mouth: 'grin' }); pose(T1('squaretoo'), { mouth: 'smile' });
  // e-file and 4th rank cross at e4
  fileBand('e', st('cross', 0) + 0.1, { dur: 1.1 });
  rankBand(4, st('cross', 0) + 0.9, { dur: 1.1 });
  cue('swoosh', st('cross', 0) + 0.1); cue('swoosh', st('cross', 0) + 0.9);
  ring('e4', st('cross', 1), T0('corner'));
  cue('ding', st('cross', 1) + 0.2, 0.6);
  point(T0('cross'), T1('lastname'));
  // first name: the letter
  glow('e', st('firstname', 1) - 0.1, T0('corner'));
  flyTag('e', C.file, labXY('e'), 'e4', st('firstname', 1), 1.0, 'first').bind(st('together', 1));
  cue('pop', st('firstname', 1));
  // last name: the number
  glow('4', st('lastname', 1) - 0.1, T0('corner'));
  flyTag('4', C.rank, labXY('4'), 'e4', st('lastname', 1), 1.0, 'last').bind(st('together', 1));
  cue('pop', st('lastname', 1), 1.1);
  // together
  const bd = badge('e4', st('together', 1), st('wrong1', 1));
  cue('chime', st('together', 1) + 0.05);
  celebrate(st('together', 1));
  showCard('order', T0('order'), T1('saywithme'));
  pose(st('saywithme', 1), { armL: 150 }, 0.35);
  pose(st('saywithme', 1) + 0.7, { armR: 150 }, 0.35);
  pose(T1('saywithme') - 0.3, { armL: 8, armR: 8 }, 0.4);
  // the wrong way round
  const wrong = badge('e4', st('wrong1', 1), st('wrong2', 2), { txt: '4e' });
  cue('bonk', st('wrong1', 1) + 0.1, 0.9);
  pose(st('wrong1', 1), { mouth: 'o', brows: 'worried', tilt: -7, lx: -0.8, ly: -0.2 }, 0.3);
  crossOut('e4', st('wrong2', 0), st('wrong2', 2));
  cue('bonk', st('wrong2', 0), 0.6);
  pose(st('wrong2', 0), { mouth: 'flat', brows: 'determined', tilt: 0 }, 0.3);
  badge('e4', st('wrong2', 2), T0('corner') + 0.05);
  cue('ding', st('wrong2', 2) + 0.1);
  pose(st('wrong2', 2), { mouth: 'grin', brows: 'neutral' }, 0.3);
  pose(T1('wrong2'), { mouth: 'smile' }, 0.3);
  bandOff('fb', 'e', T0('corner')); bandOff('rb', 4, T0('corner'));
  // worked example: a1 (look down, look across)
  nameSquare('a1', {
    ring: st('corner') + 0.4, tDown: st('cornerdown', 0) + 0.05, tLetter: en('cornerdown', 1) - 0.45,
    tAcross: st('cornerleft', 0) + 0.05, tNumber: en('cornerleft', 1) - 0.45,
    tBadge: en('cornername') - 0.6, off: T0('c6down') + 0.1,
  });
  point(T0('corner'), T1('c6name') - 0.2);
  celebrate(en('cornername') - 0.5);
  // worked example: c6
  nameSquare('c6', {
    ring: st('c6down', 0) + 0.2, tDown: st('c6down', 1) + 0.05, tLetter: st('c6down', 2) - 0.2,
    tAcross: st('c6left', 0) + 0.05, tNumber: st('c6left', 1) - 0.2,
    tBadge: en('c6name') - 0.6, off: T1('coords') - 0.2,
  });
  celebrate(en('c6name') - 0.5);
  showCard('coords', T0('coords') + 0.1, T1('coords'));
}

// ================================================================ Pieces and notation
{
  // every piece stands on a named square: the starting position drops in
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  const t = st('pieces') + 0.2;
  const all = [];
  back.forEach((p, i) => all.push(['s1' + i, p, 'w', ALLF[i] + '1']));
  ALLF.forEach((f, i) => all.push(['s2' + i, 'p', 'w', f + '2']));
  ALLF.forEach((f, i) => all.push(['s7' + i, 'p', 'b', f + '7']));
  back.forEach((p, i) => all.push(['s8' + i, p, 'b', ALLF[i] + '8']));
  all.forEach(([id, p, c, sq], i) => {
    const keep = id === 's14'; // the white king stays for the next beat
    piece(id, p, c, sq, t + i * 0.045, keep ? T0('pawnmove') + 0.1 : T0('king') + 0.2, { sound: i % 8 === 0 });
  });
  point(T0('pieces'), T1('pieces') - 0.2);
  // the white king starts on e1 (find: letter up, number across)
  findSquare('e1', { tFile: st('king') + 0.6, tRank: st('king') + 1.2, tBadge: en('king') - 0.5, off: T0('queen') + 0.1 });
  face('s14', en('king') - 0.5, { mouth: 'grin' });
  pieceHop('s14', en('king') - 0.4);
  face('s14', T0('queen'), { mouth: 'smile' });
  // the black queen starts on d8
  showCard('queen', T0('queen') + 0.1, st('queenhere', 1));
  fileBand('d', st('queenfile') + 0.15, { dur: 1.3 });
  glow('d', st('queenfile') + 0.15, T0('pawnmove'));
  cue('swoosh', st('queenfile') + 0.15);
  rankBand(8, st('queenrank') + 0.15, { to: 4, dur: 1.0 });
  glow('8', st('queenrank') + 0.15, T0('pawnmove'));
  cue('swoosh', st('queenrank') + 0.15);
  ring('d8', en('queenrank') - 0.2, T0('pawnmove'));
  piece('bq', 'q', 'b', 'd8', st('queenhere', 0) + 0.2, T0('pawnmove') + 0.1);
  badge('d8', st('queenhere', 1) - 0.1, T0('pawnmove'));
  cue('chime', st('queenhere', 1));
  face('bq', st('queenhere', 1), { mouth: 'grin' });
  bandOff('fb', 'd', T0('pawnmove')); bandOff('rb', 8, T0('pawnmove'));
  // white's pawn moves e2 -> e4
  piece('wp', 'p', 'w', 'e2', T0('pawnmove') + 0.2, T0('quiz1') + 0.2);
  const b2 = badge('e2', st('pawnmove', 0) + 1.0, st('pawnmove', 1));
  fileBand('e', st('pawnmove', 0) + 0.8, { to: 8, dur: 1.0 });
  glow('e', st('pawnmove', 0) + 0.8, T0('nota1'));
  glow('2', st('pawnmove', 0) + 1.1, st('pawnmove', 1) + 0.5);
  movePiece('wp', 'e4', st('pawnmove', 1) + 0.1, 1.1, 20);
  glow('3', st('pawnmove', 1) + 0.45, st('pawnmove', 1) + 0.95);
  glow('4', st('pawnmove', 1) + 0.95, T0('nota1'));
  cue('blip', st('pawnmove', 1) + 0.45, 0.6); cue('blip', st('pawnmove', 1) + 0.95, 0.8);
  badge('e4', st('pawnmove', 1) + 1.1, T0('nota1') + 0.1);
  cue('chime', st('pawnmove', 1) + 1.15, 0.8);
  face('wp', st('pawnmove', 1) + 1.1, { mouth: 'grin' });
  bandOff('fb', 'e', T0('nota1'));
  // notation: the scoresheet
  showCard('notation', T0('nota1') + 0.1, T1('black8') - 0.2);
  pose(T0('nota1'), { lx: -0.9, ly: 0.1 }, 0.4);
  tw('card.notation.s', 1.06, st('nota2') + 0.8, 0.2, E.out); tw('card.notation.s', 1, st('nota2') + 1.0, 0.3);
  ring('e4', st('nota3', 1), en('nota4', 1) + 0.6);
  flyToSheet('e4', st('nota4', 1) - 0.1, 'white');
  set('card.notation.w1', 1, st('nota4', 1) + 0.85);
  cue('card', st('nota4', 1) + 0.85, 0.9);
  cue('chime', st('nota4', 1) + 0.9, 0.7);
}

// ================================================================ Playing Black
{
  banner('tip', T0('black1') + 0.05, T1('black1') + 0.2);
  cue('sparkle', T0('black1') + 0.2);
  // turn the board around (the letters and numbers ride along but stay upright)
  const r0 = st('black2') + 0.2;
  tw('board.rot', 180, r0, 2.4, E.io);
  tw('board.s', 0.88, r0, 1.2, E.io); tw('board.s', 0.9, r0 + 1.2, 1.2, E.io);
  tw('board.dy', 12, r0, 2.4, E.io);
  cue('whoosh', r0, 1);
  youMarker(r0 + 2.2, T1('black8') - 0.4);
  pose(r0, { lx: -0.9, ly: 0.2, brows: 'raised', mouth: 'o' }, 0.4);
  pose(r0 + 2.4, { brows: 'neutral', mouth: 'smile' }, 0.4);
  // a-file on your right, 8th rank closest to you
  fileBand('a', st('black3') + 0.2, { dur: 1.3 });
  glow('a', st('black3') + 0.2, T0('black5'));
  cue('swoosh', st('black3') + 0.2);
  rankBand(8, st('black4') + 0.2, { dur: 1.3 });
  glow('8', st('black4') + 0.2, T0('black5'));
  cue('swoosh', st('black4') + 0.2);
  bandOff('fb', 'a', T0('black5')); bandOff('rb', 8, T0('black5'));
  hostHop(st('black5') + 0.5, 40);
  // e4 is still e4
  findSquare('e4', { tFile: st('black6') + 0.05, tRank: st('black6') + 0.5, tBadge: en('black6') - 0.5, off: T0('black7') + 0.1, fileTo: 4 });
  // black replies e7 -> e5, and it's written e5
  piece('bp', 'p', 'b', 'e7', T0('black7') + 0.1, T0('quiz1') + 0.2);
  fileBand('e', st('black7', 0) + 0.3, { to: 8, dur: 0.9 });
  glow('e', st('black7', 0) + 0.3, T0('black8') + 0.3);
  glow('7', st('black7', 0) + 1.2, st('black7', 1) + 0.4);
  movePiece('bp', 'e5', st('black7', 1) + 0.1, 1.1, 20);
  glow('6', st('black7', 1) + 0.45, st('black7', 1) + 0.95);
  glow('5', st('black7', 1) + 0.95, T0('black8') + 0.3);
  cue('blip', st('black7', 1) + 0.45, 0.6); cue('blip', st('black7', 1) + 0.95, 0.8);
  badge('e5', st('black7', 1) + 1.1, T0('black8') + 0.3);
  cue('chime', st('black7', 1) + 1.15, 0.8);
  face('bp', st('black7', 1) + 1.1, { mouth: 'grin' });
  bandOff('fb', 'e', T0('black8') + 0.3);
  flyToSheet('e5', st('black8', 1) - 0.1, 'black');
  set('card.notation.b1', 1, st('black8', 1) + 0.85);
  cue('card', st('black8', 1) + 0.85, 0.9);
  cue('chime', st('black8', 1) + 0.9, 0.7);
  // turn back to White's view
  const r1 = en('black8', 1) + 1.0;
  tw('board.rot', 0, r1, 2.0, E.io);
  tw('board.s', 1, r1, 2.0, E.io); tw('board.dy', 0, r1, 2.0, E.io);
  cue('whoosh', r1, 0.8);
}

// ================================================================ Your turn
{
  // name it: f3
  ring('f3', st('quiz1', 0) + 0.3, T0('quiz2'));
  qmark('f3', st('quiz1', 1), T0('quiz1a') + 0.1);
  countdown(en('quiz1', 1) + 0.3, 7);
  nameSquare('f3', {
    tDown: st('quiz1a', 0) + 0.05, tLetter: st('quiz1a', 1) - 0.15,
    tAcross: st('quiz1a', 2) + 0.05, tNumber: st('quiz1a', 3) - 0.15,
    tBadge: en('quiz1b') - 0.55, off: T0('quiz2'),
  });
  celebrate(en('quiz1b') - 0.5, true);
  cue('tada', en('quiz1b') - 0.4, 0.8);
  // name it: d7
  ring('d7', st('quiz2') + 0.2, T0('quiz3'));
  qmark('d7', st('quiz2') + 0.2, T0('quiz2a') + 0.1);
  countdown(en('quiz2') + 0.3, 7);
  nameSquare('d7', {
    tDown: st('quiz2a', 0) + 0.05, tLetter: st('quiz2a', 1) - 0.15,
    tAcross: st('quiz2a', 2) + 0.05, tNumber: st('quiz2a', 3) - 0.15,
    tBadge: en('quiz2b') - 0.55, off: T0('quiz3'),
  });
  celebrate(en('quiz2b') - 0.5, true);
  cue('tada', en('quiz2b') - 0.4, 0.8);
  // find it: b6
  showCard('target', st('quiz3', 0) + 0.2, T1('quiz3c') - 0.2);
  countdown(en('quiz3', 1) + 0.3, 8);
  fileBand('b', st('quiz3a') + 0.1, { dur: 1.3 });
  glow('b', st('quiz3a') + 0.1, T0('review'));
  cue('swoosh', st('quiz3a') + 0.1);
  rankBand(6, st('quiz3b') + 0.1, { to: 2, dur: 1.0 });
  glow('6', st('quiz3b') + 0.1, T0('review'));
  cue('swoosh', st('quiz3b') + 0.1);
  ring('b6', en('quiz3b') - 0.1, T0('review'));
  badge('b6', st('quiz3c', 1) - 0.1, T0('review'));
  celebrate(st('quiz3c', 1), true);
  cue('tada', st('quiz3c', 1), 0.9);
  bandOff('fb', 'b', T0('review')); bandOff('rb', 6, T0('review'));
}

// ================================================================ Review
{
  hostHop(st('review') + 0.1, 40);
  // ranks first (side to side, numbers), then files (up and down, letters)
  showCard('rank', T0('rv1'), T1('rv2'));
  pose(en('rv1') + 0.2, { armL: 95, armR: 95 }, 0.35);
  for (let i = 0; i < 2; i++) { pose(en('rv1') + 0.5 + i * 1.0, { tilt: -9 }, 0.45); pose(en('rv1') + 1.0 + i * 1.0, { tilt: 9 }, 0.45); }
  pose(T1('rv1'), { armL: 8, armR: 8, tilt: 0 }, 0.4);
  rankBand(5, en('rv1') + 0.2, { dur: 0.9 });
  bandOff('rb', 5, T0('rv3'));
  for (let n = 1; n <= 8; n++) glow(String(n), st('rv2', 1) + 0.3 + (n - 1) * 0.1, T1('rv2'));
  showCard('file', T0('rv3'), T1('rv4'));
  for (let i = 0; i < 2; i++) { pose(en('rv3') + 0.2 + i * 1.0, { armL: 165, armR: 165 }, 0.4); pose(en('rv3') + 0.7 + i * 1.0, { armL: 6, armR: 6 }, 0.4); }
  fileBand('e', en('rv3') + 0.2, { dur: 0.9 });
  bandOff('fb', 'e', T0('rv5'));
  ALLF.forEach((L, i) => glow(L, st('rv4', 1) + 0.3 + i * 0.1, T1('rv4')));
  // first name / last name -> e4
  showCard('sqname', T0('rv5') + 0.1, T1('rv6'));
  ring('e4', st('rv5'), T0('rv8'));
  fileBandDown('e', 4, st('rv5', 0) + 0.1, 0.9);
  glow('e', st('rv5', 1) - 0.1, T0('rv8'));
  flyTag('e', C.file, labXY('e'), 'e4', st('rv5', 1), 1.0, 'first').bind(en('rv6', 1) - 0.1);
  rankBandAcross(4, 5, st('rv6', 0) + 0.1, 0.9);
  glow('4', st('rv6', 1) - 0.1, T0('rv8'));
  flyTag('4', C.rank, labXY('4'), 'e4', st('rv6', 1), 1.0, 'last').bind(en('rv6', 1) - 0.1);
  badge('e4', en('rv6', 1) - 0.1, T0('rv8'));
  cue('chime', en('rv6', 1));
  bandOff('fb', 'e', T0('rv8')); bandOff('rb', 4, T0('rv8'));
  showCard('coords', T0('rv7') + 0.1, T1('rv7'));
  // every square named
  tw('allnames.p', 1, st('rv8') + 0.3, 2.4, E.lin, 0);
  cue('sparkle', st('rv8') + 0.3, 0.8); cue('sparkle', st('rv8') + 1.4, 0.8);
  point(T0('rv8'), T1('rv8') - 0.2);
  // goodbye
  FX.push({ kind: 'confetti', t0: st('bye') - 0.1, dur: DURATION_HINT - st('bye') + 0.1 });
  cue('tada', st('bye'), 1);
  for (let i = 0; i < 3; i++) hostHop(st('bye') + i * 0.6, 60);
  pose(st('bye'), { armL: 155, armR: 155, mouth: 'grin' }, 0.35);
  titleCard('end', ['Letter first,', 'then number!'], [['e', C.file], ['4', C.rank]], { pill: '#FFFFFF' });
  tw('title.end', 1, T1('bye') + 0.1, 0.6, E.out);
}
