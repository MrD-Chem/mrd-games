/* Spectrum Line-Up - data.js
   Everything a teacher might want to edit lives here:
   1. REGIONS - the seven regions of the electromagnetic (EM) spectrum, longest wavelength first
   2. COLOURS - the seven visible colours, longest wavelength first
   3. CLUES   - "what is it used for?" clues for level 5
   4. LEVELS  - the six levels
   5. TEXT    - every sentence the student reads (English)
   game.js does the work. */
(function (root) {
  'use strict';

  /* Regions, LONGEST wavelength first (= lowest frequency and energy first).
     nmLow / nmHigh are the ends of the range in nanometres (nm); null = no limit.
     wl is ONE typical wavelength (nm) used only to decide which of two regions is longer.
     SIMPLIFICATION: the real region borders are fuzzy and overlap a little; we use the
     round numbers from the class notes. */
  var REGIONS = [
    { id: 'radio', name: 'Radio waves', range: 'longer than about 1 m', nmLow: 1e9, nmHigh: null, wl: 1e10,
      size: 'a building', uses: ['Radio and TV broadcasts', 'MRI scanners'] },
    { id: 'micro', name: 'Microwaves', range: 'about 1 mm to 1 m', nmLow: 1e6, nmHigh: 1e9, wl: 1e7,
      size: 'a bee', uses: ['Microwave ovens', 'Wi-Fi and cell phones', 'Radar'] },
    { id: 'ir', name: 'Infrared', range: 'about 700 nm to 1 mm', nmLow: 700, nmHigh: 1e6, wl: 1e4,
      size: 'a pinpoint', uses: ['TV remote controls', 'Heat (thermal) cameras', 'The warmth you feel from a fire'] },
    { id: 'vis', name: 'Visible light', range: 'about 400 to 700 nm', nmLow: 400, nmHigh: 700, wl: 550,
      size: 'a bacterium', uses: ['The only light human eyes can see', 'Photosynthesis'] },
    { id: 'uv', name: 'Ultraviolet (UV)', range: 'about 10 to 400 nm', nmLow: 10, nmHigh: 400, wl: 100,
      size: 'a virus or a molecule', uses: ['Sunburn and tanning', 'Black lights', 'Killing germs'] },
    { id: 'xray', name: 'X-rays', range: 'about 0.01 to 10 nm', nmLow: 0.01, nmHigh: 10, wl: 1,
      size: 'an atom', uses: ['Pictures of bones and teeth', 'Airport bag scanners'] },
    { id: 'gamma', name: 'Gamma rays', range: 'shorter than about 0.01 nm', nmLow: null, nmHigh: 0.01, wl: 0.001,
      size: 'an atomic nucleus', uses: ['Treating cancer (radiation therapy)', 'Given off by radioactive atoms'] }
  ];

  /* Visible colours, LONGEST wavelength first. wl (nm) is approximate and is used only to
     decide which colour is longer. Only red and violet show a number to students. */
  var COLOURS = [
    { id: 'red', name: 'Red', wl: 700, swatch: '#e53935', note: 'about 700 nm' },
    { id: 'orange', name: 'Orange', wl: 620, swatch: '#fb8c00', note: '' },
    { id: 'yellow', name: 'Yellow', wl: 580, swatch: '#fdd835', note: '' },
    { id: 'green', name: 'Green', wl: 530, swatch: '#43a047', note: '' },
    { id: 'blue', name: 'Blue', wl: 470, swatch: '#1e88e5', note: '' },
    { id: 'indigo', name: 'Indigo', wl: 445, swatch: '#5c6bc0', note: '' },
    { id: 'violet', name: 'Violet', wl: 400, swatch: '#ab47bc', note: 'about 400 nm' }
  ];

  /* Level 5 clues. region = id of the right answer; hint = shown after a first miss;
     why = shown with the answer after a second miss. At least one clue per region. */
  var CLUES = [
    { region: 'radio', text: 'Used to send radio and TV broadcasts.',
      hint: 'These waves are the longest of all. A single wave can be as long as a building.',
      why: 'Radio waves have the longest wavelength, so they travel far and carry radio and TV broadcasts.' },
    { region: 'radio', text: 'Used in MRI scanners in hospitals.',
      hint: 'An MRI scanner uses the waves with the longest wavelength, longer than about 1 m.',
      why: 'MRI scanners use radio waves, which are safe for the body, to make pictures of soft parts inside you.' },
    { region: 'micro', text: 'Used to heat food in a microwave oven.',
      hint: 'The name of this region is in the name of the oven.',
      why: 'Microwaves make the water in food warm up, so the oven uses microwaves.' },
    { region: 'micro', text: 'Used by Wi-Fi and cell phones.',
      hint: 'These waves are shorter than radio waves but longer than infrared. Their wavelength is about 1 mm to 1 m.',
      why: 'Wi-Fi and cell phones send and receive signals with microwaves.' },
    { region: 'micro', text: 'Used by radar to find planes and ships.',
      hint: 'Radar sends out waves and listens for the echo. The waves are about 1 mm to 1 m long.',
      why: 'Radar uses microwaves, with a wavelength of about 1 mm to 1 m.' },
    { region: 'ir', text: 'Used in a TV remote control.',
      hint: 'You cannot see this light, but it is just below red light.',
      why: 'A remote control sends pulses of infrared light to the TV. Infrared means "below red".' },
    { region: 'ir', text: 'Used in heat (thermal) cameras.',
      hint: 'Warm things give off this light. It is just below red light, so the name starts with "infra".',
      why: 'Warm objects give off infrared light, so thermal cameras use infrared to show heat.' },
    { region: 'ir', text: 'The warmth you feel from a fire.',
      hint: 'You cannot see this light, but your skin can feel it as heat.',
      why: 'Your skin feels infrared light from a fire as warmth.' },
    { region: 'vis', text: 'The only light that human eyes can see.',
      hint: 'This is the small part of the spectrum with colours from red to violet.',
      why: 'Visible light is the only region our eyes can detect.' },
    { region: 'vis', text: 'Plants use it for photosynthesis.',
      hint: 'Plants use the light we can see, the colours of the rainbow.',
      why: 'Plants take in visible light, mostly red and blue, to make food by photosynthesis.' },
    { region: 'uv', text: 'Causes sunburn and tanning.',
      hint: 'You cannot see this light from the Sun, but it has more energy than violet light.',
      why: 'Ultraviolet (UV) light has enough energy to damage skin cells, which causes sunburn and tanning.' },
    { region: 'uv', text: 'Used in black lights.',
      hint: 'This light is just beyond violet. The name means "beyond violet".',
      why: 'A black light gives off ultraviolet (UV) light that makes some materials glow.' },
    { region: 'uv', text: 'Used to kill germs.',
      hint: 'This light has more energy than visible light. It is beyond violet and can damage germs.',
      why: 'Ultraviolet (UV) light has enough energy to damage germs, so it can be used to clean water and surfaces.' },
    { region: 'xray', text: 'Used to take pictures of broken bones.',
      hint: 'These rays pass through skin but not bone.',
      why: 'X-rays pass through skin but are blocked by bone, so bones show up in the picture.' },
    { region: 'xray', text: 'Used to take pictures of teeth at the dentist.',
      hint: 'These rays pass through soft parts but not hard teeth. Their wavelength is about the size of an atom.',
      why: 'X-rays pass through soft parts of the mouth but not teeth, so teeth show up in the picture.' },
    { region: 'xray', text: 'Used to scan bags at the airport.',
      hint: 'These rays pass through cloth and plastic but are blocked by metal.',
      why: 'X-rays pass through a bag but not through dense things like metal, so the scanner can see inside.' },
    { region: 'gamma', text: 'Used to treat cancer (radiation therapy).',
      hint: 'These rays have the shortest wavelength and the most energy of all.',
      why: 'Gamma rays have so much energy that they can kill cancer cells when aimed carefully.' },
    { region: 'gamma', text: 'Given off by radioactive atoms.',
      hint: 'This is the light with the highest energy. It comes from inside an atom, from the nucleus.',
      why: 'Radioactive atoms give off gamma rays from their nucleus. Gamma rays have the shortest wavelength.' }
  ];

  /* Levels. kind: 'order' | 'match' | 'sprint'.
     For ordering levels, items = which list, dir = 'asc' (list order) or 'desc' (reversed),
     startLabel / endLabel = the words on the two ends of the row. */
  var LEVELS = [
    { id: 1, kind: 'order', items: 'regions', dir: 'asc', anchors: true,
      name: 'Wavelength order', blurb: 'Put the seven regions in order, longest wavelength first.',
      countLabel: '1 puzzle', startLabel: 'LONGEST wavelength', endLabel: 'SHORTEST wavelength',
      prompt: 'Put the regions in order from the LONGEST wavelength to the SHORTEST.',
      anchorNote: 'Two cards are locked to help you: radio waves at the long end and gamma rays at the short end.',
      solved: 'Radio waves have the longest wavelength. Gamma rays have the shortest.' },
    { id: 2, kind: 'order', items: 'regions', dir: 'asc', anchors: false,
      name: 'Frequency order', blurb: 'Put the same seven regions in order, lowest frequency first.',
      countLabel: '1 puzzle', startLabel: 'LOWEST frequency', endLabel: 'HIGHEST frequency',
      prompt: 'Put the regions in order from the LOWEST frequency to the HIGHEST.',
      solved: 'Same order! Shorter wavelength means higher frequency.' },
    { id: 3, kind: 'order', items: 'regions', dir: 'desc', anchors: false,
      name: 'Energy order', blurb: 'Start with the HIGHEST energy. The row is backwards this time.',
      countLabel: '1 puzzle', startLabel: 'HIGHEST energy', endLabel: 'LOWEST energy',
      prompt: 'Put the regions in order from the HIGHEST energy to the LOWEST.',
      anchorNote: 'Careful: this row starts with the HIGHEST energy, so it runs the other way.',
      solved: 'Shorter wavelength means higher frequency and more energy. Gamma rays carry the most energy.' },
    { id: 4, kind: 'order', items: 'colours', dir: 'asc', anchors: false,
      name: 'Rainbow', blurb: 'Order the seven colours of visible light, longest wavelength first.',
      countLabel: '1 puzzle', startLabel: 'LONGEST wavelength', endLabel: 'SHORTEST wavelength',
      prompt: 'Put the colours of visible light in order from the LONGEST wavelength to the SHORTEST.',
      solved: 'Red has the longest wavelength and the lowest energy of visible light. Violet has the shortest wavelength and the highest energy.' },
    { id: 5, kind: 'match', name: 'What is it used for?', blurb: 'Read the clue. Pick the region of the spectrum.',
      countLabel: '12 clues', count: 12, thresholds: [8, 10, 12] },
    { id: 6, kind: 'sprint', name: 'Quick compare', blurb: 'Sixty seconds. Compare two regions or two colours.',
      countLabel: '60 seconds', seconds: 60, thresholds: [8, 12, 16] }
  ];

  var TEXT = {
    brand: 'Mr. D Chemistry',
    footer: 'No accounts. No tracking. Progress stays on this device.',
    title: 'Spectrum Line-Up',
    intro: 'The electromagnetic (EM) spectrum is all the kinds of light. Put the seven regions in order, match each one to what it is used for, and race to compare them.',
    wordsIntro: 'Wavelength is the distance from one wave crest to the next. Frequency is how many crests pass a point each second. A shorter wavelength means a higher frequency and more energy.',
    truth: 'All seven regions are the same kind of thing: electromagnetic waves (light). They all travel at the same speed in empty space. Only the wavelength, frequency and energy are different.',
    chooseLevel: 'Choose a level',
    howToStars: 'Stars: in levels 1 to 4 you get 3 stars for a correct order on the first Check, 2 on the second, and 1 after that. Level 5: 8, 10 or 12 correct out of 12. Level 6: 8, 12 or 16 correct.',
    startLevel: 'Start level {n}',
    startOver: 'Start over',
    startOverSure: 'Tap again to clear all stars',
    startOverDone: 'Saved progress cleared.',
    bestPoints: 'Best: {n} points',
    bestCorrect: 'Best: {n} correct',
    noBest: 'Not played yet',
    starsLabel: '{n} of 3 stars',
    ariaLevelCard: 'Level {id}, {name}. {blurb} {best}. {stars}.',

    hudLevel: 'Level', hudChecks: 'Checks', hudQuestion: 'Question', hudScore: 'Score', hudScoreSprint: 'Correct',
    hudStreak: 'Streak', hudTimeLeft: 'Time left', leave: 'Choose level',
    questionOf: '{n} of {t}',

    howToMove: 'Drag a card to move it. Or tap a card to pick it up, then tap another card to move it to that place. With a keyboard: press Space or Enter to pick up a card, use the arrow keys to move it, then press Space or Enter to drop it.',
    check: 'Check', finishLevel: 'See results', next: 'Next', seeResults: 'See results',
    rowLabel: 'Cards to put in order. Position 1 is at the {start} end.',
    egPrefix: 'e.g. ',
    statusLocked: '✓ Locked', statusAnchor: 'Locked', statusWrong: '✗ Not here', statusHeld: 'Picked up',
    labelPos: 'position {p} of {t}',
    labelLocked: 'locked in the right place',
    labelAnchor: 'locked to help you',
    labelWrong: 'not in the right place yet',
    labelHeld: 'picked up',
    announcePick: 'Picked up {name}. Tap another card to move it to that place, or tap it again to put it down.',
    announcePickKb: 'Picked up {name}, position {p} of {t}. Use the arrow keys to move it. Press Space or Enter to drop it.',
    announceDrop: 'Dropped {name} at position {p} of {t}.',
    announceMoved: '{name} moved to position {p} of {t}.',
    announceBetween: ' It is between {a} and {b}.',
    announceNextTo: ' It is next to {a}.',
    announceEdgeStart: '{name} is already at the {end} end.',
    announceEdgeEnd: '{name} is already at the {end} end.',
    announceLocked: '{name} is locked. Pick a card that is not locked.',
    announceCheckStart: 'Checking.',

    checkAllFirst: 'All in the right place on the first Check. Excellent!',
    checkAllLater: 'All in the right place. Well done!',
    checkSome: '{k} locked in the right place. {m} still need to move:',
    hintMove: '{name} belongs closer to the {end} end.',
    hintRegions1: ' Its wavelength is {range}.',
    hintRegions2: ' Its wavelength is {range}. Longer wavelength means lower frequency.',
    hintRegions3: ' Its wavelength is {range}. Shorter wavelength means more energy.',
    hintColours: ' Red has the longest wavelength (about 700 nm). Violet has the shortest (about 400 nm).',
    solvedPoints: '{n} stars. +{pts} points.',

    // Spectrum banner
    bannerTitle: 'The electromagnetic spectrum',
    bannerWavelength: 'Wavelength', bannerFrequency: 'Frequency', bannerEnergy: 'Energy',
    bannerLong: 'longer', bannerShort: 'shorter', bannerLow: 'lower', bannerHigh: 'higher',
    bannerDown: 'Reading down the list: the wavelength gets shorter, and the frequency and energy get higher.',
    bannerSize: 'Wavelength about the size of {size}',
    bannerRainbow: 'Visible light: red (about 700 nm) to violet (about 400 nm)',
    bannerNm: 'nm = nanometre, one billionth of a metre.',
    bannerSummary: 'Spectrum banner. From the longest wavelength to the shortest: {list}. Frequency and energy go from lowest to highest in the same order. Visible light is a small part, with red at about 700 nm and violet at about 400 nm.',

    // Level 5
    matchPrompt: 'What kind of light is this?',
    matchGroup: 'Regions of the spectrum',
    right1: '✓ Correct!',
    right2: '✓ Yes, that is right.',
    wrong1: 'Not quite. Try again.',
    answerWas: 'The answer is {name}.',
    miss: 'The answer is {name}. ',

    // Level 6
    comparePrompt: 'Tap the answer.',
    qWavelength: 'Which has the LONGER wavelength?',
    qFrequency: 'Which has the HIGHER frequency?',
    qEnergy: 'Which has MORE energy?',
    orderRegions: 'the order from radio waves (longest wavelength) to gamma rays (shortest)',
    orderColours: 'the rainbow order from red (longest wavelength) to violet (shortest)',
    reasonWavelength: '{win} has the longer wavelength. In {order}, {win} comes before {lose}.',
    reasonFrequency: '{win} has the higher frequency. It has a shorter wavelength than {lose}, and a shorter wavelength means a higher frequency.',
    reasonEnergy: '{win} has more energy. It has a shorter wavelength than {lose}, and a shorter wavelength means more energy.',
    correctShort: 'Correct!',
    wrongShort: 'Not this time.',
    timeUpNote: 'Time is up!',

    // Streaks
    streak3: '3 in a row!', streak6: '6 in a row! Hot streak!', streak10: '10 in a row! Spectrum star!',
    streakMore: '{n} in a row! Amazing!', streakLost: 'Streak over', streakSr: 'Streak of {n}.',

    // End screen
    endLevelDone: 'Level complete!', endTimeUp: 'Time is up!',
    endScoreLabel: 'Score', endScoreLabelSprint: 'Correct answers',
    endChecks: 'Solved on check number {n}.',
    endFirstTry: '{n} of {t} right on the first try.',
    endCorrectSprint: 'Stars at 8, 12 and 16 correct.',
    newBest: 'New best!',
    playAgain: 'Play again', chooseLevelBtn: 'Choose level', nextLevel: 'Next level',
    recapTitle: 'Key ideas',
    recapOrder: 'From the longest wavelength to the shortest: {list}.',
    recapChain: 'A shorter wavelength means a higher frequency and more energy.',
    recapVisible: 'Visible light is only a tiny slice of the spectrum.',
    recapUses: 'Each region has everyday uses, from X-ray pictures to TV remotes.',
    reviewTitle: 'Review',
    reviewNone: 'No mistakes. Great work!',
    reviewOrderItem: '{name}: wavelength {range}. It sits at position {p} from the {end} end.',
    reviewColourItem: '{name}: it sits at position {p} from the {end} end.',
    reviewClue: '"{text}" Answer: {name}. {why}'
  };

  root.SL_DATA = { REGIONS: REGIONS, COLOURS: COLOURS, CLUES: CLUES, LEVELS: LEVELS, TEXT: TEXT };
})(typeof window !== 'undefined' ? window : this);
