/* Unit 4 Vocab Match - data.js
   Everything a teacher might want to edit lives here:
   1. TEXT   - every sentence and button label the student reads (English).
   2. GROUPS - the 22 glossary words (Atoms and Light), each with a definition and ONE hint.
   3. MODES  - the three level cards on the start screen.
   TEACHER: the definitions below are from the Unit 4 Glossary (packet page 4).
   If the packet's own wording is different, replace the definition with the packet's wording.
   game.js does the work. */
(function (root) {
  'use strict';

  var TEXT = {
    brand: 'Mr. D Chemistry',
    footer: 'No accounts. No tracking. Progress stays on this device.',
    title: 'Unit 4 Vocab Match',
    intro: 'Learn the Unit 4 words about atoms and light. Match each word to its meaning, then take a quick quiz.',
    chooseMode: 'Choose a mode',
    totalLine: 'Stars so far: {card}',
    howToStars: 'Stars. Match: 0 or 1 mistakes = 3 stars, 2 to 4 mistakes = 2 stars, 5 or more = 1 star. Quick Quiz: 6, 9 or 12 right on the first try = 1, 2 or 3 stars.',
    bestLabel: 'Best: {n}',
    noBest: 'Not played yet',
    starsLabel: '{n} of 3 stars',
    pairsLabel: '{n} pairs',
    questionsLabel: '{n} questions',
    startOver: 'Start over',
    startOverConfirm: 'Clear all saved stars and best scores on this device?',
    startOverDone: 'Saved progress cleared.',

    // Play screen
    leave: 'Choose a mode',
    hudMode: 'Mode',
    hudProgress: 'Progress',
    hudMistakes: 'Mistakes',
    hudFirstTry: 'Right first try',
    hudPoints: 'Points',
    hudStreak: 'Streak',
    roundLabel: 'Round {n} of {t}',
    questionLabel: 'Question {n} of {t}',
    colWords: 'Words',
    colDefs: 'Definitions',
    matchPrompt: 'Pick a word, then pick its definition.',
    matchPickDef: 'Now pick the definition for that word.',
    matchPickTermFirst: 'First pick a word on the left.',
    matchRight: 'Correct! “{term}” matches its definition. +{pts} points.',
    matchWrong: 'Not a match. Try again.',
    matchHint: 'Hint for “{term}”: {hint}',
    roundDone: 'Round done! Every word has its match.',
    nextRound: 'Next round',
    quizPromptDef: 'Which word matches this definition?',
    quizPromptTerm: 'Which definition matches this word?',
    quizRight: 'Correct! +{pts} points.',
    quizRightRetry: 'Correct on the second try. +{pts} points.',
    quizWrong: 'Not quite. Hint: {hint}',
    quizTryAgain: 'Try one more time.',
    quizReveal: 'The answer is “{term}”. It means: {def}',
    next: 'Next',
    seeResults: 'See results',

    // End screen
    endTitle: 'All done!',
    endPoints: 'Points',
    endMistakesLine: '{n} mistakes',
    endFirstLine: '{n} of {t} right on the first try',
    newBest: 'New best!',
    recapTitle: 'Key ideas',
    reviewTitle: 'Words to review',
    reviewNone: 'No words to review. Great work!',
    playAgain: 'Play again',
    chooseModeBtn: 'Choose a mode',

    // Short recap of the key ideas, one list per mode
    recap: {
      atoms: [
        'Protons (+) and neutrons (no charge) are in the nucleus. Electrons (−) move around it.',
        'Atomic number = number of protons. Mass number = protons + neutrons.',
        'Ions have a charge. Cations (+) lost electrons. Anions (−) gained electrons.'
      ],
      light: [
        'Wavelength, frequency and amplitude describe a wave.',
        'An electron absorbs energy and jumps up to an excited state. It gives off light (emission) when it falls down.',
        'Each element gives off its own line spectrum.'
      ],
      quiz: [
        'Atomic number counts protons. Mass number adds neutrons.',
        'Emission = light goes out. Absorption = light goes in.',
        'Isotopes have the same protons but different numbers of neutrons.'
      ]
    }
  };

  // Each group has 'words'. Every word has: term (the glossary word), def (its definition), hint (one short tip).
  var GROUPS = [
    {
      id: 'atoms', name: 'Atoms',
      words: [
        { term: 'atom', def: 'The smallest piece of an element that is still that element.',
          hint: 'Atoms are the building blocks of every element.' },
        { term: 'nucleus', def: 'The tiny, dense centre of an atom. It holds the protons and neutrons.',
          hint: 'The nucleus is the centre, in the middle of the atom.' },
        { term: 'proton', def: 'A particle in the nucleus with a positive (+) charge.',
          hint: 'PROton = POSitive.' },
        { term: 'neutron', def: 'A particle in the nucleus with no charge.',
          hint: 'NEUtron = NEUtral, no charge.' },
        { term: 'electron', def: 'A very light particle with a negative (−) charge that moves around the nucleus.',
          hint: 'Electrons are light and negative. They move outside the nucleus.' },
        { term: 'atomic number', def: 'The number of protons in an atom. It tells you which element it is.',
          hint: 'The atomic number counts protons only. It is the element’s ID number.' },
        { term: 'mass number', def: 'The number of protons plus neutrons in an atom.',
          hint: 'Mass number = protons + neutrons. Electrons add almost no mass.' },
        { term: 'isotope', def: 'Atoms of the same element with different numbers of neutrons.',
          hint: 'Same element, different neutrons.' },
        { term: 'ion', def: 'An atom that has a charge because it gained or lost electrons.',
          hint: 'An ion has a charge, so it is not neutral. Its electron count changed.' },
        { term: 'cation', def: 'An ion with a positive charge. It lost electrons.',
          hint: "Think: a ca+ion is 'paws-itive' (+)." },
        { term: 'anion', def: 'An ion with a negative charge. It gained electrons.',
          hint: 'A Negative ION.' },
        { term: 'average atomic mass', def: 'The weighted average mass of all the isotopes of an element.',
          hint: 'It is an average. Common isotopes count more than rare ones.' }
      ]
    },
    {
      id: 'light', name: 'Light',
      words: [
        { term: 'wavelength', def: 'The distance from one crest of a wave to the next crest.',
          hint: 'Wavelength is measured across one whole wave. Its symbol is λ (lambda).' },
        { term: 'frequency', def: 'How many waves pass a point each second.',
          hint: 'Frequency tells how many waves pass each second. Unit: hertz (Hz).' },
        { term: 'amplitude', def: 'The height of a wave from its rest line to a crest.',
          hint: 'Amplitude is how tall the wave is, from the middle line up to a crest.' },
        { term: 'electromagnetic spectrum', def: 'All the kinds of light, from radio waves to gamma rays.',
          hint: 'All light types, in order. Radio waves are long; gamma rays are short.' },
        { term: 'photon', def: 'A tiny packet of light energy.',
          hint: 'One photon is one small packet of light energy.' },
        { term: 'ground state', def: 'The lowest energy level an electron can be in.',
          hint: 'Ground = the floor. The electron is on the lowest step.' },
        { term: 'excited state', def: 'A higher energy level an electron moves to after it absorbs energy.',
          hint: 'Excited = energy added. The electron is up a step.' },
        { term: 'emission', def: 'When an electron falls to a lower energy level and gives off light.',
          hint: 'Emission = light goes OUT. The electron gives energy away.' },
        { term: 'absorption', def: 'When an electron takes in light and jumps to a higher energy level.',
          hint: 'Absorption = light goes IN. The electron takes energy and jumps up.' },
        { term: 'line spectrum', def: 'The pattern of coloured lines of light that an element gives off.',
          hint: 'Each element has its own set of lines, like a fingerprint.' }
      ]
    }
  ];

  // The three level cards. type 'match' = two columns; 'quiz' = questions.
  // per = pairs in each match round (the 12-word group gives 2 rounds of 6; the 10-word group gives 6 + 4).
  var MODES = [
    { id: 'atoms', type: 'match', group: 'atoms', per: 6, name: 'Match — Atoms',
      blurb: 'Match 12 words about atoms: protons, ions, isotopes and more.' },
    { id: 'light', type: 'match', group: 'light', per: 6, name: 'Match — Light',
      blurb: 'Match 10 words about waves, light and energy levels.' },
    { id: 'quiz', type: 'quiz', count: 12, name: 'Quick Quiz — All words',
      blurb: 'Answer 12 random questions from all 22 words. Build a streak for bonus points.' }
  ];

  root.VM_DATA = { TEXT: TEXT, GROUPS: GROUPS, MODES: MODES };
})(typeof window !== 'undefined' ? window : globalThis);
