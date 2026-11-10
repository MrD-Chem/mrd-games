/* Particle Count Dash - data.js
   Everything a teacher might want to edit lives here:
   1. ELEMENTS  - the elements used in questions (real isotope mass numbers, common ion charges)
   2. ALL       - all 118 symbols and names (for the periodic table helper)
   3. LEVELS    - the six levels
   4. TEXT      - every sentence the student reads (English)
   game.js does the work. */
(function (root) {
  'use strict';

  // All 118 elements, in order of atomic number: "Symbol Name"
  var ALL_RAW = (
    'H Hydrogen,He Helium,Li Lithium,Be Beryllium,B Boron,C Carbon,N Nitrogen,O Oxygen,F Fluorine,Ne Neon,' +
    'Na Sodium,Mg Magnesium,Al Aluminum,Si Silicon,P Phosphorus,S Sulfur,Cl Chlorine,Ar Argon,K Potassium,Ca Calcium,' +
    'Sc Scandium,Ti Titanium,V Vanadium,Cr Chromium,Mn Manganese,Fe Iron,Co Cobalt,Ni Nickel,Cu Copper,Zn Zinc,' +
    'Ga Gallium,Ge Germanium,As Arsenic,Se Selenium,Br Bromine,Kr Krypton,Rb Rubidium,Sr Strontium,Y Yttrium,Zr Zirconium,' +
    'Nb Niobium,Mo Molybdenum,Tc Technetium,Ru Ruthenium,Rh Rhodium,Pd Palladium,Ag Silver,Cd Cadmium,In Indium,Sn Tin,' +
    'Sb Antimony,Te Tellurium,I Iodine,Xe Xenon,Cs Cesium,Ba Barium,La Lanthanum,Ce Cerium,Pr Praseodymium,Nd Neodymium,' +
    'Pm Promethium,Sm Samarium,Eu Europium,Gd Gadolinium,Tb Terbium,Dy Dysprosium,Ho Holmium,Er Erbium,Tm Thulium,Yb Ytterbium,' +
    'Lu Lutetium,Hf Hafnium,Ta Tantalum,W Tungsten,Re Rhenium,Os Osmium,Ir Iridium,Pt Platinum,Au Gold,Hg Mercury,' +
    'Tl Thallium,Pb Lead,Bi Bismuth,Po Polonium,At Astatine,Rn Radon,Fr Francium,Ra Radium,Ac Actinium,Th Thorium,' +
    'Pa Protactinium,U Uranium,Np Neptunium,Pu Plutonium,Am Americium,Cm Curium,Bk Berkelium,Cf Californium,Es Einsteinium,Fm Fermium,' +
    'Md Mendelevium,No Nobelium,Lr Lawrencium,Rf Rutherfordium,Db Dubnium,Sg Seaborgium,Bh Bohrium,Hs Hassium,Mt Meitnerium,Ds Darmstadtium,' +
    'Rg Roentgenium,Cn Copernicium,Nh Nihonium,Fl Flerovium,Mc Moscovium,Lv Livermorium,Ts Tennessine,Og Oganesson'
  ).split(',');

  var ALL = ALL_RAW.map(function (s, i) {
    var parts = s.split(' ');
    return { Z: i + 1, sym: parts[0], name: parts[1] };
  });

  // Curated elements used in questions: [Z, [isotope mass numbers], [common ion charges]]
  var CURATED = [
    [1, [1, 2, 3], [1]], [2, [3, 4], []], [3, [6, 7], [1]], [4, [9], [2]], [5, [10, 11], []],
    [6, [12, 13, 14], []], [7, [14, 15], [-3]], [8, [16, 17, 18], [-2]], [9, [19], [-1]],
    [10, [20, 21, 22], []], [11, [23], [1]], [12, [24, 25, 26], [2]], [13, [27], [3]],
    [14, [28, 29, 30], []], [15, [31], [-3]], [16, [32, 33, 34, 36], [-2]], [17, [35, 37], [-1]],
    [18, [36, 38, 40], []], [19, [39, 40, 41], [1]], [20, [40, 42, 44, 48], [2]], [22, [48], [2, 4]],
    [24, [52], [3]], [25, [55], [2]], [26, [54, 56, 57, 58], [2, 3]], [27, [59, 60], [2, 3]],
    [28, [58, 60], [2]], [29, [63, 65], [1, 2]], [30, [64, 66, 68], [2]], [34, [78, 80], [-2]],
    [35, [79, 81], [-1]], [36, [84, 86], []], [38, [86, 88, 90], [2]], [47, [107, 109], [1]],
    [50, [118, 120], [2, 4]], [53, [127, 131], [-1]], [56, [137, 138], [2]], [79, [197], [1, 3]],
    [80, [200, 202], [2]], [82, [206, 207, 208], [2, 4]], [92, [235, 238], []]
  ];

  var ELEMENTS = CURATED.map(function (c) {
    var base = ALL[c[0] - 1];
    return { Z: base.Z, sym: base.sym, name: base.name, isotopes: c[1], ions: c[2] };
  });

  var TEXT = {
    brand: "Mr. D's Chemistry Games",
    back: '← Chemistry',
    footer: 'No accounts. No tracking. Scores stay on this device.',
    title: 'Particle Count Dash',
    intro: 'Read the symbol. Count protons, neutrons and electrons. Build a streak for bonus points.',
    chooseLevel: 'Choose a level',
    howToStars: 'Stars: 6 correct on the first try = 1 star, 8 = 2 stars, 10 = 3 stars. Sprint: 6, 10, 14 correct.',
    bestLabel: 'Best: {n}',
    noBest: 'Not played yet',
    starsLabel: '{n} of 3 stars',
    questionsLabel: '{n} questions',
    sprintLabel: '90 seconds',

    // HUD and play screen
    hudLevel: 'Level', hudQLabel: 'Question', hudQuestion: 'Question {n} of {t}', hudQuestionOpen: 'Question {n}',
    hudScore: 'Score', hudStreak: 'Streak', hudTime: 'Time', hudTimeLeft: 'Time left',
    leave: 'Choose level',
    helper: 'Periodic table',
    helperTitle: 'Periodic table',
    helperHint: 'Hover or focus an element to see its name. Use the arrow keys to move.',
    helperPick: 'Pick an element.',
    helperCell: 'Atomic number {Z}, {sym}, {name}',
    helperInfo: '{name} ({sym}): atomic number {Z}',
    close: 'Close',
    check: 'Check',
    next: 'Next',
    seeResults: 'See results',
    protons: 'Protons', neutrons: 'Neutrons', electrons: 'Electrons',
    symbol: 'Symbol', massNumber: 'Mass number (A)', charge: 'Charge',
    chargePlaceholder: 'e.g. 2+ or 0',
    symbolPlaceholder: 'e.g. Fe',
    fieldOk: '✓ Correct', fieldBad: '✗ Check this',
    particle: 'Particle {n}',
    particleCounts: 'p = {p}, n = {n}, e = {e}',
    tableCaption: 'Particles counted',
    tableParticle: 'Particle', tableP: 'p', tableN: 'n', tableE: 'e',

    // Prompts
    promptAtom: 'Count the particles in this atom.',
    promptIon: 'Count the particles in this ion.',
    promptBuild: 'Write the symbol for this particle.',
    promptCompare: 'Compare the two particles. Choose one answer.',
    buildCounts: '{p} protons · {n} neutrons · {e} electrons',
    buildHelp: 'Charge: write 0 for no charge, or a number with a sign, like 2+ or 3−.',
    nuclideLabelFull: '{sym}, mass number {A}, atomic number {Z}, {chg}',
    nuclideLabelMass: '{sym}, mass number {A}, {chg}',
    chargeSpoken: 'charge {c}',
    noCharge: 'no charge',
    plus: 'plus', minus: 'minus',

    // Compare options (ids are used by game.js)
    options: {
      isotopes: 'Isotopes of the same element',
      atomion: 'An atom and an ion of the same element',
      different: 'Different elements',
      same: 'The exact same particle'
    },

    // Formula strips (always visible)
    formulaCount: 'protons = Z · neutrons = A − Z · electrons = protons − charge',
    formulaBuild: 'Z = protons (it names the element) · A = protons + neutrons · charge = protons − electrons',
    formulaCompare: 'Protons name the element · neutrons make isotopes · electrons make ions',

    // Feedback
    feedbackCorrect: 'Correct! +{pts} points',
    feedbackCorrectBonus: 'Correct! +{pts} points (streak ×{mult})',
    // Streak banners. {n} = how many in a row. The game shows them at 3, 6, 10, then every 5.
    streak3: '🔥 {n} in a row! Points ×1.5',
    streak6: '⚡ {n} in a row! Points ×2',
    streak10: '💥 {n} in a row! Unstoppable!',
    streakMore: '🚀 {n} in a row!',
    streakLost: 'Streak lost — start a new one!',
    feedbackRetryCorrect: 'Correct on the second try. +{pts} points',
    feedbackWrong: 'Not quite. Try once more for 50 points.',
    feedbackWrongSprint: 'Not correct. See the answer below.',
    feedbackReveal: 'Not correct. Here is the answer.',
    feedbackInvalid: 'Please fill in every box with a number.',
    feedbackInvalidBuild: 'Please fill in the symbol and the mass number.',
    answerLabel: 'Answer',
    answerCounts: '{p} protons, {n} neutrons, {e} electrons',

    // Targeted hints
    hintProtonsFull: 'Protons = the atomic number (Z): the bottom number, or look it up on the periodic table.',
    hintProtonsNoZ: 'Protons = the atomic number (Z). Find the element on the periodic table to get Z.',
    hintNeutronsIsA: "That's the mass number. It counts protons AND neutrons. Neutrons = A − Z.",
    hintNeutrons: 'Neutrons = A − Z. Subtract the atomic number from the mass number.',
    hintElectronsNeutral: 'A neutral atom has the same number of electrons as protons.',
    hintElectronsLost: 'Careful: a positive (+) charge means the atom LOST electrons, so it has fewer electrons than protons.',
    hintElectronsGained: 'Careful: a negative (−) charge means the atom GAINED electrons, so it has more electrons than protons.',
    hintElectronsIon: 'This is an ion, so electrons are not equal to protons. Electrons = protons − charge.',
    hintElectronsGeneral: 'Electrons = protons − charge. Check the sign of the charge.',
    hintBuildSymbol: 'The number of protons names the element. Find that atomic number on the periodic table.',
    hintBuildSymbolFormat: 'Write the element symbol with letters, like Fe or Cl.',
    hintBuildMassIsN: "That's the neutron count. Mass number A = protons + neutrons.",
    hintBuildMass: 'Mass number A = protons + neutrons.',
    hintBuildChargeFormat: 'Write the charge like 2+ or 2−. Write 0 (or leave it empty) for no charge.',
    hintBuildChargeSign: 'Check the sign. More protons than electrons = positive. More electrons than protons = negative.',
    hintBuildChargeNeutral: 'Protons and electrons are equal, so the particle is neutral. Charge = 0.',
    hintBuildCharge: 'Charge = protons − electrons. Count the difference.',
    hintCmpDifferentWrong: 'These two have the same number of protons, so they are the same element. Compare neutrons and electrons next.',
    hintCmpSameWrong: 'Count p, n and e for both particles. At least one number is different.',
    hintCmpIsoProtons: 'Isotopes must have the same number of protons. Check Z for each particle.',
    hintCmpIsoNeutrons: 'Isotopes have different numbers of neutrons. Check the mass numbers.',
    hintCmpIsoCharge: 'Isotopes are both neutral atoms. Check the charge on each.',
    hintCmpAtomIonProtons: 'An atom and its ion have the same number of protons. Check Z for each particle.',
    hintCmpAtomIonNeutrons: 'An atom and its ion have the same number of neutrons. Check the mass numbers.',
    hintCmpAtomIonElectrons: 'Compare the electrons. An atom and its ion have different numbers of electrons.',

    // Worked lines. {c} is the charge, in brackets when negative.
    workedCount: 'p = Z = {Z} · n = A − Z = {A} − {Z} = {n} · e = p − charge = {p} − {c} = {e}',
    workedCountName: ' ({name})',
    workedBuild: 'Z = p = {p}, so the element is {sym} ({name}) · A = p + n = {p} + {n} = {A} · charge = p − e = {p} − {e} = {chg}',
    compareWhy: {
      isotopes: 'Same protons (same element) but different neutrons. Both are neutral. They are isotopes.',
      atomion: 'Same protons and same neutrons, but different electrons. One is an atom and one is an ion.',
      different: 'Different numbers of protons, so they are different elements.',
      same: 'Same protons, neutrons and electrons. It is the same particle, written two ways.'
    },
    compareTrapMass: 'The mass numbers match, but the protons do not. Protons decide the element.',
    compareTrapElectrons: 'The electrons match, but the protons do not. Protons decide the element.',

    // End screen
    endLevelDone: 'Level complete',
    endTimeUp: "Time's up!",
    endScore: 'Score',
    endFirstTry: 'Correct on the first try: {n} of {t}',
    endFirstTrySprint: 'Correct answers: {n}',
    newBest: 'New best!',
    reviewTitle: 'Review: what to practice',
    reviewNone: 'No mistakes. Great work!',
    playAgain: 'Play again',
    chooseLevelBtn: 'Choose level',
    streakFlame: 'Streak {n}',
    ariaLevelCard: '{name}. {blurb} {best}. {stars}.'
  };

  // Level definitions. count: null means "as many as you can" (Sprint).
  var LEVELS = [
    { id: 1, name: 'Neutral atoms', blurb: 'Full symbol of an atom. Count p, n and e.',
      kind: 'count', count: 10, helper: false, stars: [6, 8, 10] },
    { id: 2, name: 'Ions', blurb: 'Every symbol has a charge. Find the electrons.',
      kind: 'count', count: 10, helper: false, stars: [6, 8, 10] },
    { id: 3, name: 'No atomic number', blurb: 'Only the mass number is given, like Mg-26. Use the periodic table.',
      kind: 'count', count: 10, helper: true, stars: [6, 8, 10] },
    { id: 4, name: 'Build the symbol', blurb: 'Start with the particle counts. Write the symbol.',
      kind: 'build', count: 10, helper: true, stars: [6, 8, 10] },
    { id: 5, name: 'Same or different?', blurb: 'Compare two particles. Isotopes, ions or different elements?',
      kind: 'compare', count: 10, helper: false, stars: [6, 8, 10] },
    { id: 6, name: 'Sprint', blurb: '90 seconds. Mixed questions from levels 1 to 3. No retries.',
      kind: 'sprint', count: null, seconds: 90, helper: true, stars: [6, 10, 14] }
  ];

  var DATA = { ALL: ALL, ELEMENTS: ELEMENTS, LEVELS: LEVELS, TEXT: TEXT };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.PD_DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
