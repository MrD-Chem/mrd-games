/* Gold Foil Shooter - teacher-editable content (all student-facing English text, levels, science numbers).
   Packet page 5, "Notes: Atomic History". */
"use strict";
window.GOLD_FOIL_DATA = {
  /* ---------- Science numbers (used by game.js) ---------- */
  science: {
    // Rutherford model: scattering angle = 2 * atan(K / b), where b is how far the particle's line of flight is
    // from the nucleus (as a fraction of the atom radius R, 0 to 1) and K = kRatio (in units of R).
    // With b spread evenly from 0 to R this gives about 94% under 5 degrees, about 5.5% "Bent", and 1 in 400 "Bounced back".
    // (Bounces are made more common than in real life so that students get to see one.)
    kRatio: 0.0025,
    straightBelow: 5,   // degrees: less than this = "Straight through"
    backAbove: 90,      // degrees: more than this = "Bounced back"
    plumMaxDeg: 2       // Thomson model: random deflection within +/- this many degrees
  },

  /* ---------- Interface text ---------- */
  text: {
    brand: "Mr. D Chemistry",
    title: "Gold Foil Shooter",
    footer: "No accounts. No tracking. Progress stays on this device.",
    intro: "Run Rutherford's famous experiment yourself. Fire tiny fast particles at a sheet of gold, read the evidence, and decide which model of the atom is right. Then put the main atom models in time order.",
    startBtn: "Start", continueBtn: "Continue", resultsBtn: "See results",
    howToStars: "Stars: 3 for a correct answer on the first try, 2 on the second, 1 if the answer was shown. Experiment levels give 3 when you finish them. Every level is open, so you can play in any order.",
    levelsTitle: "Levels",
    partA: "Part A: the experiment", partB: "Part B: the timeline",
    startOver: "Start over", startOverConfirm: "Erase your progress?", yes: "Yes, erase", no: "Keep it",
    allLevels: "All levels", levelWord: "Level", ofWord: "of",
    starsTotal: "★ {stars} of {max}",
    chipLabel: "Level {n}: {name}{state}", chipDone: ", done, {stars} of 3 stars", chipTodo: ", not done",
    levelStars: "{stars} of 3 stars",

    // Lab
    alphaNote: "Alpha particles are small, fast, POSITIVE (+) particles. Each one is shot at the gold foil. The detector screen flashes where it lands.",
    foilLabel: "Foil model", zoomLabel: "View", fireLabel: "Fire alpha particles",
    foilPlum: "Thomson's plum pudding", foilNuclear: "Rutherford's nuclear atom", foilReal: "The real gold foil (mystery)",
    zoomWhole: "Whole foil", zoomClose: "One atom close-up",
    zoomLockedMystery: "So there is no close-up.",
    fire1: "Fire 1", fire20: "Fire 20", fire100: "Fire 100",
    keysHint: "Keys: 1 = Fire 1, 2 = Fire 20, 3 = Fire 100.",
    fireLocked: "Answer the question first. Then the experiment unlocks.",
    tallyTitle: "Tally", tallyFired: "Fired: {n}", resetTally: "Reset tally",
    tallyFor: "Tally for: {foil}",
    binStraight: "Straight through", binBent: "Bent", binBack: "Bounced back",
    binStraightRange: "less than 5°", binBentRange: "5° to 90°", binBackRange: "more than 90°",
    canvasLabel: "Top view of the experiment. An alpha particle source on the left shoots particles at a thin gold foil in the middle. A round detector screen surrounds the foil.",
    drawSource: "Alpha source", drawFoil: "Gold foil", drawDetector: "Detector screen",
    drawMystery: "gold sheet (atoms hidden)",
    drawNotScale: "Not to scale: the nucleus is drawn far too big. Paths near it are stretched so you can see them.",
    drawNucleus: "tiny dense nucleus (+)",
    drawPudding: "positive charge spread out",
    drawElectron: "electron (−) = teal dot",
    markWrongOpt: "✗ Not this one", markAnswer: "✓ Answer",
    drawEmpty: "mostly empty space",
    labSummary: "{foil}, {view}. Fired {n}: {s} straight through, {b} bent, {k} bounced back.",
    labSummaryEmpty: "{foil}, {view}. Nothing fired yet.",
    viewWhole: "whole foil view", viewClose: "one atom close-up",
    sceneWhole: "The foil is drawn as one layer of atoms to keep the picture simple. A real foil is thousands of layers thick.",
    sceneMystery: "The mystery foil hides its atoms. It is a thin sheet of real gold.",
    emptyTally: "Fire some particles to start the tally.",

    // Level card
    next: "Next →", nextFinal: "See results →", replay: "Try this level again",
    tryAgainNote: "Try again. You have one try left.",
    right: "Correct!", notQuite: "Not quite.", answerIs: "The answer:",
    levelDone: "Level done!",
    firedProgress: "Fired at {foil}: {n} of {min}",
    fireDoneLine: "Done: you fired {n} particles at {foil}.",
    fireNowAnswer: "Good. Now read your tally and answer.",
    rareNote: "Bounced-back particles are very rare. If your Bounced back count is still 0, fire 100 more a few times.",
    firePrompt: "Fire at least {min} alpha particles at {foil}. Watch the tally.",

    // Aim level
    aimLabel: "Aim height", aimHelp: "0 is the middle, straight at the nucleus. Use the slider or the arrow keys.",
    aimFire: "Fire aimed particle",
    aimStraight: "Angle {deg}°. It went straight through. Move the aim closer to 0.",
    aimBent: "Angle {deg}°. It bent. Closer! Move the aim a little closer to 0.",
    aimBack: "Angle {deg}°. Bounced back! Only a near-direct hit on the tiny nucleus can do that.",
    aimNote: "The slider is stretched so the tiny nucleus is easy to aim at. In real life, a bounce back needs an even more exact hit.",

    // Order level
    orderHelp: "Drag a card, or use the ▲ ▼ buttons. With the keyboard, focus a card's handle and press the up or down arrow. Years appear after you check.",
    orderHandle: "Move {name}: drag, or press the up or down arrow key",
    moveUp: "Move {name} up", moveDown: "Move {name} down",
    orderOldest: "Oldest idea", orderNewest: "Newest idea",
    positionLabel: "Position {n} of {total}",
    yearUnknown: "Year: ?", yearKnown: "Year: {year}",
    markOk: "✓ right place", markNo: "✗ wrong place",
    orderCheck: "Check order",

    // Match level
    matchHelp: "Tap a scientist, then tap the evidence or idea that goes with them. Tap a pair to undo it.",
    matchScientists: "Scientists", matchEvidence: "Evidence or idea",
    matchPicked: "Selected: {name}. Now choose the matching evidence.",
    matchPair: "Pair {n}",
    matchLocked: "✓ correct",
    matchWrongMark: "✗ not a match",
    matchCheck: "Check pairs",

    // Compare table (level 6)
    compareTitle: "Side by side",
    compareFoil: "Foil",
    compareNote: "{names}: fewer than {min} shots, so we fired more (up to {n} in all) to make a fair table.",
    compareConclusion: "The real foil matches the nuclear model, not the plum pudding model.",

    // End screen
    endTitle: "Experiment complete!",
    endStars: "★ {stars} of {max} stars",
    endRecapTitle: "What to remember",
    endReviewTitle: "Review: levels to look at again",
    endReviewNone: "No misses. Great work!",
    endAgain: "Back to all levels",
    endRealNote: "In the real experiment, about 1 particle in 8000 bounced straight back. Here it is about 1 in 400 so you can see it happen."
  },

  /* ---------- Foil names (for text) ---------- */
  foils: {
    plum: { name: "Thomson's plum pudding foil" },
    nuclear: { name: "Rutherford's nuclear foil" },
    real: { name: "the real gold foil" }
  },

  /* ---------- Levels ----------
     lab: what the lab does on this level
       foil / zoom: starting choices; lockFoil / lockZoom: student cannot change them;
       fireLockedUntilDone: no firing until the question is answered; aim: the aiming slider is used.
     steps: shown one after another.
       fire:   { type, foil, min }
       choice: { type, prompt, options: [{ text, hint }], answer: index, why }
       aim, order, match: special activities.
     doLevel: true -> 3 stars for finishing (no tries counted). */
  levels: [
    {
      id: 1, name: "Predict", part: "A", blurb: "What should Thomson's atom do to fast positive particles?",
      lab: { foil: "plum", zoom: "close", lockFoil: true, lockZoom: false, fireLockedUntilDone: true },
      steps: [{
        type: "choice",
        prompt: "Thomson thought positive charge was spread out like pudding. If that is true, what should fast positive alpha particles do?",
        options: [
          { text: "Almost all go straight through.", hint: "" },
          { text: "Most bounce straight back.", hint: "If the positive charge is spread thin, no spot is strong enough to push a fast particle back." },
          { text: "They all stop inside the atom.", hint: "Alpha particles are fast and heavy. A thin spread of charge cannot stop them." },
          { text: "They change into electrons.", hint: "Alpha particles do not change into other particles in this experiment." }
        ],
        answer: 0,
        why: "In Thomson's model the positive charge is spread thin through the whole atom. There is no strong push anywhere, so fast alpha particles go almost straight."
      }],
      afterNote: "The experiment is now unlocked. Fire some particles and see."
    },
    {
      id: 2, name: "Test Thomson", part: "A", blurb: "Fire 100 particles at the plum pudding foil.", doLevel: true,
      lab: { foil: "plum", zoom: "whole", lockFoil: true, lockZoom: false },
      steps: [
        { type: "fire", foil: "plum", min: 100 },
        {
          type: "choice",
          prompt: "What did you see at the plum pudding foil?",
          options: [
            { text: "All the particles went straight through.", hint: "" },
            { text: "About half were bent.", hint: "Look at the tally. How many are in Bent?" },
            { text: "Many bounced back.", hint: "Look at the tally. Bounced back should show 0." }
          ],
          answer: 0,
          why: "The tally shows 100% Straight through. That is what Thomson's model predicts, because it has no concentrated positive charge."
        }
      ]
    },
    {
      id: 3, name: "The real foil", part: "A", blurb: "Fire 200 particles at real gold. What happens?", doLevel: true,
      lab: { foil: "real", zoom: "whole", lockFoil: true, lockZoom: true },
      steps: [
        { type: "fire", foil: "real", min: 200 },
        {
          type: "choice",
          prompt: "What did most particles do?",
          options: [
            { text: "They went straight through.", hint: "" },
            { text: "They bounced back.", hint: "Check the tally. Bounced back is a very small percent." },
            { text: "They were stopped by the foil.", hint: "Every particle landed on the detector, so none were stopped." }
          ],
          answer: 0,
          why: "About 94 out of 100 went straight through the gold foil."
        },
        {
          type: "choice",
          prompt: "What did a few do?",
          options: [
            { text: "They went straight through, like the rest.", hint: "A few did something different. Look at the Bent and Bounced back rows." },
            { text: "A few were bent, and a very few bounced back.", hint: "" },
            { text: "They were stopped inside the foil.", hint: "No particle was stopped. Each one landed on the screen." }
          ],
          answer: 1,
          why: "A few particles bent away from a straight path, and a very few bounced back. Thomson's model could not explain that."
        }
      ]
    },
    {
      id: 4, name: "Mostly empty", part: "A", blurb: "What do the straight-through particles tell us?",
      lab: { foil: "real", zoom: "whole", lockFoil: false, lockZoom: false },
      steps: [{
        type: "choice",
        prompt: "Most particles went straight through. What does that tell us about the atom?",
        options: [
          { text: "The atom is mostly empty space.", hint: "" },
          { text: "The atom is a solid ball.", hint: "A solid ball would block the particles. Most went right through." },
          { text: "The atom is full of negative charge.", hint: "Negative charge would pull on the positive alpha particles. Most went straight, so there is nothing big in the way." },
          { text: "Alpha particles are too small to ever hit anything.", hint: "Some did hit something: a few bent or bounced back." }
        ],
        answer: 0,
        why: "If most particles pass straight through, there is nothing in their way. The atom is mostly empty space."
      }]
    },
    {
      id: 5, name: "A tiny centre", part: "A", blurb: "What could make a particle bounce back?",
      lab: { foil: "real", zoom: "whole", lockFoil: false, lockZoom: false },
      steps: [{
        type: "choice",
        prompt: "A few positive particles bounced back. What could do that?",
        options: [
          { text: "A tiny, dense, positive centre (the nucleus) pushed them away.", hint: "" },
          { text: "Electrons knocked them back.", hint: "Electrons are far too light. They cannot turn a fast, heavy alpha particle around." },
          { text: "The foil was too thick.", hint: "The foil was very thin. A thick foil would not explain why only a few bounced." },
          { text: "Alpha particles are negative.", hint: "Alpha particles are positive. Like charges push apart, so a positive centre can push them away." }
        ],
        answer: 0,
        why: "Like charges push each other apart. Only a tiny, dense, positive nucleus is strong enough to push an alpha particle straight back. It is so small that few particles come close to it."
      }]
    },
    {
      id: 6, name: "Which model?", part: "A", blurb: "Match a model to the real data.",
      lab: { foil: "real", zoom: "whole", lockFoil: false, lockZoom: false },
      steps: [{
        type: "choice",
        prompt: "Which model matches the real data?",
        options: [
          { text: "Thomson's plum pudding model.", hint: "The plum pudding foil gave 100% Straight through and 0 Bounced back. The real foil bounced some back." },
          { text: "Rutherford's nuclear model.", hint: "" },
          { text: "Both match the real data equally.", hint: "Compare the Bounced back numbers for each. They are not the same." }
        ],
        answer: 1,
        why: "The nuclear model gives mostly straight paths, a few bends, and a very few bounces. That is exactly what the real gold foil did."
      }],
      compare: true
    },
    {
      id: 7, name: "Hit the nucleus", part: "A", blurb: "Aim a particle so that it bounces back.", doLevel: true,
      lab: { foil: "nuclear", zoom: "close", lockFoil: true, lockZoom: true, aim: true },
      steps: [{ type: "aim", prompt: "Aim a particle so that it bounces back. Set the aim height under the picture, then fire. You can try as many times as you like." }]
    },
    {
      id: 8, name: "Timeline", part: "B", blurb: "Put four atom models in time order.",
      steps: [{
        type: "order",
        prompt: "Put the models in order, from the oldest idea at the top to the newest at the bottom.",
        hint1: "Each new model explains something the older model could not. Dalton's solid ball is the simplest idea, so it came first.",
        why: "Dalton (1803) imagined solid balls. Thomson (1897) found the electron. Rutherford (1911) found the nucleus with the gold foil experiment. Bohr (1913) placed electrons in fixed energy levels."
      }]
    },
    {
      id: 9, name: "Evidence", part: "B", blurb: "Match each scientist to the evidence or idea.",
      steps: [{
        type: "match",
        prompt: "Match each scientist to the evidence or idea behind their model.",
        why: "Each model came from new evidence: fixed ratios (Dalton), cathode rays (Thomson), bounced-back alpha particles (Rutherford), and the colours of hydrogen light (Bohr)."
      }]
    }
  ],

  /* ---------- Atom models for Part B ---------- */
  models: [
    { id: "dalton", scientist: "Dalton", year: 1803, label: "Solid sphere", idea: "Atoms are tiny solid balls that cannot be divided.",
      evidence: "Elements combine in fixed whole-number ratios.", matchHint: "Dalton studied how elements combine to make compounds." },
    { id: "thomson", scientist: "Thomson", year: 1897, label: "Plum pudding", idea: "Found the electron with a cathode ray tube.",
      evidence: "Cathode rays bend toward a positive plate, so they are negative particles (electrons).", matchHint: "Thomson used a cathode ray tube. Look for a negative particle." },
    { id: "rutherford", scientist: "Rutherford", year: 1911, label: "Nuclear atom", idea: "Gold foil experiment.",
      evidence: "A few alpha particles bounced back from gold foil.", matchHint: "Rutherford shot alpha particles at gold foil." },
    { id: "bohr", scientist: "Bohr", year: 1913, label: "Energy levels", idea: "Electrons move in fixed energy levels.",
      evidence: "Hydrogen gives off light of only certain colours.", matchHint: "Bohr explained the light that hydrogen gives off." }
  ],
  // Correct time order (oldest first), the scrambled start order, and the order evidence cards are shown in.
  orderAnswer: ["dalton", "thomson", "rutherford", "bohr"],
  orderStart: ["rutherford", "dalton", "bohr", "thomson"],
  evidenceOrder: ["bohr", "dalton", "rutherford", "thomson"],

  recap: [
    "The atom is mostly empty space.",
    "Every atom has a tiny, dense, positive nucleus at its centre.",
    "Models change when new evidence appears."
  ]
};
