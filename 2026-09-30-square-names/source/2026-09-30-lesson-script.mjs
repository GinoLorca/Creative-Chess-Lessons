// The lesson script: one entry per caption ("beat").
//
//   cap   on-screen caption. {e4} = square name (blue letter, orange number),
//         {L:a} = a file letter (blue), {N:4} = a rank number (orange), *word* = new word.
//   say   what the robot voice says, in order. Strings are spoken; numbers are silence
//         (seconds). [['eI]] forces the LETTER "a" (otherwise the voice says "uh").
//   note  what happens on screen (goes into the teacher script).
//   min   minimum beat length in seconds (for animations that outlast the speech).
//   hold  pause after the last spoken part (default TIMING.hold).
// Visuals for each beat live in 2026-09-30-direction.js, keyed by id.

export const VOICE = { voice: 'mb-us1', rate: 124, pitch: 56, wordGap: 1 };
export const TIMING = { lead: 4.2, pre: 0.3, gap: 0.3, hold: 0.9, tail: 4.5 };
const A = "[['eI]]"; // the letter a

export const BEATS = [
  // ------------------------------------------------------------------ Hello
  { id: 'hello', scene: 'Hello', cap: 'Hey there, chess kids!', say: ['Hey there, chess kids!'], pre: 0.9, min: 3.4, note: 'Opening line. The pawn hops in and waves hello to the class.' },
  { id: 'mike', scene: 'Hello', cap: 'Fun Master Mike here.', say: ['Fun Master Mike here.'], min: 2.6, note: 'Name card: Fun Master Mike.' },
  { id: 'today', scene: 'Hello', cap: "And today we're going to be covering {L:files}, {N:ranks} and *square names*.", say: ["And today we're going to be covering", 'files,', 'ranks,', 'and square names.'], gap: 0.12, min: 5.0, note: 'FILES, RANKS and SQUARE NAMES pop up as each is said.' },
  { id: 'what', scene: 'Hello', cap: 'What, squares have names?!', say: ['What,', 'squares have names?!'], min: 2.8, note: 'The pawn looks surprised.' },
  { id: 'yes', scene: 'Hello', cap: 'Well, yes — in chess they do!', say: ['Well, yes!', 'In chess, they do!'], min: 3.6, note: 'A sparkle ripples across every square.' },

  // ------------------------------------------------------------------ Ranks (first!)
  { id: 'ranksfirst', scene: 'Ranks', cap: 'First, we need to learn about ranks.', say: ['First, we need to learn about ranks.'] },
  { id: 'rankthink', scene: 'Ranks', cap: 'You can think of ranks as floors in a building.', say: ['You can think of ranks,', 'as floors in a building.'], min: 4.6, note: 'Building card: eight floors stack up, numbered 1 at the bottom to 8 at the top.' },
  { id: 'numbers', scene: 'Ranks', cap: 'Ranks have numbers, from {N:1} to {N:8}, going up the side.', say: ['Ranks have numbers,', 'from 1 to 8,', 'going up the side.'], min: 4.8, note: 'Numbers 1–8 pop in up the left edge of the board.' },
  { id: 'rankdef1', scene: 'Ranks', cap: 'A line of squares that goes side to side…', say: ['A line of squares that goes side to side,'], min: 2.8, note: 'An orange band grows across the first rank.' },
  { id: 'rankdef2', scene: 'Ranks', cap: '…is called a {N:rank}.', say: ['is called a rank.'], min: 2.4, note: 'RANK card (side to side).' },
  { id: 'rank1', scene: 'Ranks', cap: 'This is the first rank, like the first floor.', say: ['This is the first rank,', 'like the first floor.'], note: 'The number 1 lights up; floor 1 of the building lights up.' },
  { id: 'rank1b', scene: 'Ranks', cap: "White's back-rank pieces start here.", say: ["White's back-rank pieces start here."], min: 3.4, note: 'Rook, knight, bishop, queen, king, bishop, knight, rook drop onto a1–h1.' },
  { id: 'rank8', scene: 'Ranks', cap: 'This is the eighth rank, the top floor.', say: ['This is the eighth rank,', 'the top floor.'], min: 2.4, note: 'Orange band grows across the eighth rank from the number 8; floor 8 lights up.' },
  { id: 'rank8b', scene: 'Ranks', cap: "Black's back-rank pieces start here.", say: ["Black's back-rank pieces start here."], min: 3.8, note: "Black's back-rank pieces drop onto a8–h8." },
  { id: 'rookrank', scene: 'Ranks', cap: 'Watch the rook slide side to side.', say: ['Watch the rook slide side to side.'], min: 4.8, note: 'The rook appears on a4 and slides a4 → h4 → d4.' },
  { id: 'whichrank', scene: 'Ranks', cap: 'Which rank is it on?', say: ['Which rank is it on?', 5.6], note: '5-second chess clock.' },
  { id: 'rank4', scene: 'Ranks', cap: 'The fourth rank!', say: ['The fourth rank!'], min: 2.8, note: 'Orange band grows across the fourth rank from the number 4.' },

  // ------------------------------------------------------------------ Files
  { id: 'filesnext', scene: 'Files', cap: "Next, let's learn about files.", say: ["Next, let's learn about files."] },
  { id: 'letters', scene: 'Files', cap: 'Files have letters, from {L:a} to {L:h}, along the bottom.', say: ['Files have letters,', `from ${A} to h,`, 'along the bottom.'], min: 4.8, note: 'Letters a–h pop in along the bottom edge.' },
  { id: 'filedef1', scene: 'Files', cap: 'A line of squares that goes up and down…', say: ['A line of squares that goes up and down,'], min: 2.8, note: 'A blue band grows up the a-file.' },
  { id: 'filedef2', scene: 'Files', cap: '…is called a {L:file}.', say: ['is called a file.'], min: 2.4, note: 'FILE card (up and down).' },
  { id: 'afile', scene: 'Files', cap: 'This is the {L:a}-file.', say: [`This is the ${A} file.`], note: 'The letter a lights up.' },
  { id: 'afile2', scene: 'Files', cap: 'Every square in this line is on the {L:a}-file.', say: [`Every square in this line is on the ${A} file.`], min: 3.6, note: 'The squares a1 to a8 pulse from bottom to top.' },
  { id: 'efile', scene: 'Files', cap: 'This is the {L:e}-file.', say: ['This is the e file.'], min: 2.6, note: 'Blue band grows up the e-file from the letter e.' },
  { id: 'singlefile', scene: 'Files', cap: 'A file goes up and down, like a single-file line!', say: ['A file goes up and down,', 'like a single-file line!'], min: 5.2, note: 'A pawn, knight, bishop and rook march up the e-file one behind another.' },
  { id: 'rookfile', scene: 'Files', cap: 'Watch the rook slide up and down.', say: ['Watch the rook slide up and down.'], min: 4.6, note: 'The rook slides e5 → e8 → e1 → e3 inside the blue band.' },
  { id: 'rookfile2', scene: 'Files', cap: 'It stays on the {L:e}-file!', say: ['It stays on the e file!'] },
  { id: 'rookside', scene: 'Files', cap: 'Now the rook slides sideways…', say: ['Now the rook slides sideways.'], min: 2.6, note: 'The rook slides e3 → c3.' },
  { id: 'whichfile', scene: 'Files', cap: 'Which file is it on now?', say: ['Which file is it on now?', 5.6], note: '5-second chess clock.' },
  { id: 'cfile', scene: 'Files', cap: 'The {L:c}-file!', say: ['The c file!'], min: 2.8, note: 'Blue band grows up the c-file behind the rook.' },
  { id: 'chant1', scene: 'Files', cap: 'Stand up! Ranks go side to side!', say: ['Stand up!', 'Ranks go side to side!', 2.4], note: 'The pawn stretches side to side — students copy.' },
  { id: 'chant2', scene: 'Files', cap: 'Files go up and down!', say: ['Files go up and down!', 2.4], note: 'The pawn reaches up and down — students copy.' },

  // ------------------------------------------------------------------ Square names
  { id: 'bigidea', scene: 'Square names', cap: 'Now for the big idea: square names!', say: ['Now for the big idea:', 'square names!'] },
  { id: 'yourname', scene: 'Square names', cap: 'You have a first name and a last name.', say: ['You have a first name,', 'and a last name.'], note: 'Name tag: first name in blue, last name in orange.' },
  { id: 'squaretoo', scene: 'Square names', cap: 'Every square does too!', say: ['Every square does too!'], min: 2.6, note: "Card: a square's first name is its letter, last name is its number." },
  { id: 'cross', scene: 'Square names', cap: 'Where a file and a rank cross, you find one square.', say: ['Where a file and a rank cross,', 'you find one square.'], min: 4.2, note: 'The e-file (blue) and the fourth rank (orange) light up; the square where they cross glows.' },
  { id: 'firstname', scene: 'Square names', cap: 'Its first name is the letter: {L:e}.', say: ['Its first name is the letter:', 0.3, 'e.'], min: 3.4, note: 'A blue e tag rides up the file to the square.' },
  { id: 'lastname', scene: 'Square names', cap: 'Its last name is the number: {N:4}.', say: ['Its last name is the number:', 0.3, '4.'], min: 3.4, note: 'An orange 4 tag rides across the rank to the square.' },
  { id: 'together', scene: 'Square names', cap: 'Put them together: {e4}!', say: ['Put them together.', 0.3, 'e 4!'], min: 3.4, note: 'The tags snap together into the name e4.' },
  { id: 'order', scene: 'Square names', cap: 'Letter first, then number.', say: ['Letter first,', 'then number.'], note: 'Card: blue e → orange 4 = e4.' },
  { id: 'saywithme', scene: 'Square names', cap: 'Say it with me: letter first, then number!', say: ['Say it with me!', 0.3, 'Letter first, then number!', 1.2] },
  { id: 'wrong1', scene: 'Square names', cap: 'What if we say the number first: {4e}?', say: ['What if we say the number first?', 0.3, 'four e?'], min: 3.6, note: 'The name flips to "4e". The pawn looks puzzled.' },
  { id: 'wrong2', scene: 'Square names', cap: 'No! Letter first, then number: {e4}!', say: ['No!', 'Letter first, then number:', 0.2, 'e 4!'], min: 3.2, note: '"4e" gets crossed out and turns back into e4.' },
  { id: 'corner', scene: 'Square names', cap: "Let's try a corner square.", say: ["Let's try a corner square."], min: 2.4, note: 'a1 glows.' },
  { id: 'cornerdown', scene: 'Square names', cap: 'Look down. The first name is {L:a}.', say: ['Look down.', 0.6, `The first name is ${A}.`], min: 3.4, note: 'A blue band runs from a1 down to the letter a.' },
  { id: 'cornerleft', scene: 'Square names', cap: 'Look across. The last name is {N:1}.', say: ['Look across.', 0.6, 'The last name is 1.'], min: 3.4, note: 'An orange band runs from a1 across to the number 1.' },
  { id: 'cornername', scene: 'Square names', cap: 'This square is {a1}!', say: [`This square is ${A} 1!`], min: 2.6 },
  { id: 'c6down', scene: 'Square names', cap: 'One more! Look down: {L:c}.', say: ['One more!', 'Look down:', 0.5, 'c.'], min: 3.2, note: 'c6 glows; blue band runs down to c.' },
  { id: 'c6left', scene: 'Square names', cap: 'Look across: {N:6}.', say: ['Look across:', 0.5, '6.'], min: 2.8, note: 'Orange band runs across to 6.' },
  { id: 'c6name', scene: 'Square names', cap: 'This square is {c6}!', say: ['This square is c 6!'], min: 2.6 },
  { id: 'coords', scene: 'Square names', cap: 'Chess players call square names *coordinates*.', say: ['Chess players call square names', 'coordinates.'], min: 3.4, note: 'COORDINATES card.' },

  // ------------------------------------------------------------------ Pieces and notation
  { id: 'pieces', scene: 'Pieces and notation', cap: 'Every piece stands on a square with a name.', say: ['Every piece stands on a square with a name.'] },
  { id: 'king', scene: 'Pieces and notation', cap: 'The white king starts on {e1}.', say: ['The white king starts on e 1.'], min: 3.6, note: 'King drops onto e1; blue band from e, orange band from 1.' },
  { id: 'queen', scene: 'Pieces and notation', cap: 'The black queen starts on {d8}.', say: ['The black queen starts on d 8.'], min: 2.6 },
  { id: 'queenfile', scene: 'Pieces and notation', cap: 'Find the {L:d}-file.', say: ['Find the d file.'], min: 2.6, note: 'Blue band grows up from the letter d.' },
  { id: 'queenrank', scene: 'Pieces and notation', cap: 'Go up to the eighth rank.', say: ['Go up to the eighth rank.'], min: 2.8, note: 'Orange band grows across from the number 8.' },
  { id: 'queenhere', scene: 'Pieces and notation', cap: 'There it is: {d8}!', say: ['There it is:', 0.2, 'd 8!'], min: 2.8, note: 'The queen drops onto d8.' },
  { id: 'pawnmove', scene: 'Pieces and notation', cap: "White's pawn moves from {e2} to {e4}.", say: ["White's pawn moves from e 2,", 'to e 4.'], min: 4.6, note: 'Pawn slides e2 → e4; the numbers 2, 3, 4 light up as it passes.' },
  { id: 'nota1', scene: 'Pieces and notation', cap: 'In a tournament, you write down your moves.', say: ['In a tournament, you write down your moves.'], note: 'Scoresheet appears.' },
  { id: 'nota2', scene: 'Pieces and notation', cap: 'That is called *notation*.', say: ['That is called notation.'] },
  { id: 'nota3', scene: 'Pieces and notation', cap: 'When a pawn moves, write the square it moves to.', say: ['When a pawn moves,', 'write the square it moves to.'] },
  { id: 'nota4', scene: 'Pieces and notation', cap: 'This move is written {e4}.', say: ['This move is written,', 0.2, 'e 4.'], min: 3.4, note: 'e4 flies from the board into move 1, White column.' },

  // ------------------------------------------------------------------ Playing Black
  { id: 'black1', scene: 'Tournament tip: playing Black', cap: 'Tournament tip! When you play Black…', say: ['Tournament tip!', 'When you play Black,'], min: 3.0 },
  { id: 'black2', scene: 'Tournament tip: playing Black', cap: '…you sit on the other side of the board.', say: ['you sit on the other side of the board.'], min: 4.4, note: 'The board turns around; the letters and numbers stay upright.' },
  { id: 'black3', scene: 'Tournament tip: playing Black', cap: 'Now the {L:a}-file is on your right.', say: [`Now the ${A} file is on your right.`], min: 3.0 },
  { id: 'black4', scene: 'Tournament tip: playing Black', cap: 'The eighth rank is closest to you.', say: ['The eighth rank is closest to you.'], min: 3.0 },
  { id: 'black5', scene: 'Tournament tip: playing Black', cap: 'But square names never change!', say: ['But square names never change!'] },
  { id: 'black6', scene: 'Tournament tip: playing Black', cap: '{e4} is still {e4}!', say: ['e 4 is still e 4!'], min: 3.4, note: 'Bands from the e (now on top) and the 4 (now on the right) meet at e4.' },
  { id: 'black7', scene: 'Tournament tip: playing Black', cap: "Black's pawn moves from {e7} to {e5}.", say: ["Black's pawn moves from e 7,", 'to e 5.'], min: 4.4 },
  { id: 'black8', scene: 'Tournament tip: playing Black', cap: 'You write {e5}.', say: ['You write,', 0.2, 'e 5.'], min: 5.6, hold: 3.0, note: 'e5 goes into move 1, Black column. Then the board turns back.' },

  // ------------------------------------------------------------------ Your turn
  { id: 'quiz1', scene: 'Your turn', cap: "Your turn! Say this square's name out loud.", say: ['Your turn!', "Say this square's name out loud.", 7.6], note: '7-second chess clock. (Answer: f3)' },
  { id: 'quiz1a', scene: 'Your turn', cap: 'Look down: {L:f}. Look across: {N:3}.', say: ['Look down:', 0.4, 'f.', 0.3, 'Look across:', 0.4, '3.'], min: 4.4 },
  { id: 'quiz1b', scene: 'Your turn', cap: "It's {f3}!", say: ["It's f 3!"], min: 2.6 },
  { id: 'quiz2', scene: 'Your turn', cap: "What is this square's name?", say: ["What is this square's name?", 7.6], note: '7-second chess clock. (Answer: d7)' },
  { id: 'quiz2a', scene: 'Your turn', cap: 'Look down: {L:d}. Look across: {N:7}.', say: ['Look down:', 0.4, 'd.', 0.3, 'Look across:', 0.4, '7.'], min: 4.4 },
  { id: 'quiz2b', scene: 'Your turn', cap: "It's {d7}!", say: ["It's d 7!"], min: 2.6 },
  { id: 'quiz3', scene: 'Your turn', cap: 'Now find {b6}. Point to it!', say: ['Now find b 6.', 'Point to it!', 8.6], note: '8-second chess clock.' },
  { id: 'quiz3a', scene: 'Your turn', cap: 'Find the {L:b}-file.', say: ['Find the b file.'], min: 2.6 },
  { id: 'quiz3b', scene: 'Your turn', cap: 'Go up to the sixth rank.', say: ['Go up to the sixth rank.'], min: 2.8 },
  { id: 'quiz3c', scene: 'Your turn', cap: 'There it is: {b6}!', say: ['There it is:', 0.2, 'b 6!'], min: 3.0 },

  // ------------------------------------------------------------------ Review
  { id: 'review', scene: 'Review', cap: "Let's review!", say: ["Let's review!"] },
  { id: 'rv1', scene: 'Review', cap: 'Ranks go…', say: ['Ranks go', 2.2], note: 'Students answer: side to side!' },
  { id: 'rv2', scene: 'Review', cap: '…side to side! Ranks have numbers.', say: ['side to side!', 'Ranks have numbers.'] },
  { id: 'rv3', scene: 'Review', cap: 'Files go…', say: ['Files go', 2.2], note: 'Students answer: up and down!' },
  { id: 'rv4', scene: 'Review', cap: '…up and down! Files have letters.', say: ['up and down!', 'Files have letters.'] },
  { id: 'rv5', scene: 'Review', cap: 'First name: the letter.', say: ['First name:', 'the letter.'], min: 2.8 },
  { id: 'rv6', scene: 'Review', cap: 'Last name: the number.', say: ['Last name:', 'the number.'], min: 3.2 },
  { id: 'rv7', scene: 'Review', cap: 'Square names are called *coordinates*.', say: ['Square names are called coordinates.'] },
  { id: 'rv8', scene: 'Review', cap: 'Now you can name every square on the board!', say: ['Now you can name every square on the board!'], min: 4.4, note: 'All 64 square names ripple onto the board.' },
  { id: 'bye', scene: 'Review', cap: 'Great work, chess kids!', say: ['Great work, chess kids!'], min: 3.6 },
];
