/* Wave Tuner: teacher-editable wording and challenges (Packet page 16, Notes: Waves).
   Science numbers (c, h, colour bands) live at the top of game.js because the formulas use them. */
"use strict";
window.WAVE_TUNER_DATA = {
  text: {
    brand: "Mr. D Chemistry", title: "Wave Tuner",
    unit: "Atomic structure · Packet page 16 · Notes: Waves",
    tagline: "Tune a light wave. See how wavelength, frequency and energy are linked.",
    startHeading: "What you will learn",
    startIntro: [
      "The parts of a wave: crest, trough, wavelength, amplitude and frequency.",
      "For light, wavelength and frequency are opposites: c = λ × ν. A longer wavelength means a lower frequency.",
      "Higher frequency means more energy in each photon. A bigger amplitude only means brighter light."
    ],
    startBtn: "Start the challenges", tunerBtn: "Try the tuner first", continueBtn: "Continue",
    startOver: "Start over", startOverSure: "Press again to erase your progress",
    savedLine: "{done} of {total} challenges done · {stars} of {max} stars",
    footer: "No accounts. No tracking. Progress stays on this device.",
    tabs: "Game mode", tabExplore: "Free tuner", tabChallenges: "Challenges", recapBtn: "Recap",
    chipsLabel: "Challenges",
    groups: ["Parts of a wave", "Tune it", "Think", "Calculate"],

    pictureTitle: "The wave", controlsTitle: "Tune the light", readoutsTitle: "What you measure",
    wlLabel: "Wavelength (nm)",  ampLabel: "Amplitude",
    ampDim: "dim", ampBright: "bright",
    pauseBtn: "Pause wave", playBtn: "Play wave",
    reducedNote: "Your device asks for less motion, so the wave stays still.",
    showLabels: "Show labels",
    rulerCaption: "Ruler in nm. The amber bar is one wavelength long. Not to scale: real light waves are far too small to see.",
    ghostNote: "The pale dashed wave is the target.",
    rWavelength: "Wavelength (λ)", rFrequency: "Frequency (ν)", rColour: "Colour",
    rEnergy: "Energy of each photon", eLow: "lower", eHigh: "higher",
    rBrightness: "Brightness", bDim: "dim", bBright: "bright",
    formulaLine: "c = λ × ν: {nm} × 10⁻⁹ m × {freq} × 10¹⁴ Hz = 3.00 × 10⁸ m/s",
    formulaNote: "c is the speed of light. It is the same for all light.",
    noteStart: "Move a slider and watch what changes.",
    noteLonger: "Longer wavelength: fewer crests fit, so the frequency is lower and each photon has less energy.",
    noteShorter: "Shorter wavelength: more crests fit, so the frequency is higher and each photon has more energy.",
    noteTaller: "Bigger amplitude: taller wave, brighter light. Energy per photon did not change.",
    noteSmaller: "Smaller amplitude: shorter wave, dimmer light. Energy per photon did not change.",
    wordsTitle: "Words to know",
    words: [
      ["Crest", "the highest point of a wave."],
      ["Trough", "the lowest point of a wave."],
      ["Rest line", "the flat line where the wave would sit with no wave."],
      ["Wavelength (λ, say “lambda”)", "the distance from one crest to the next crest."],
      ["Amplitude", "the height from the rest line up to a crest. For light, a bigger amplitude is brighter light."],
      ["Frequency (ν, say “nu”)", "how many waves pass a point each second. Its unit is the hertz (Hz)."],
      ["Photon", "one tiny packet of light."]
    ],
    summaryTuner: "A {colour} light wave. Wavelength {nm} nm, frequency {freq} times ten to the 14 hertz, amplitude {amp} out of 100. About {crests} crests are on the screen.",
    summaryTap: "A wave with four marked points, A, B, C and D. A is a low point, B is a high point, C is a low point and D is a high point.",
    summaryArrows: "A wave with two arrows. Arrow A runs sideways from one crest to the next crest. Arrow B runs straight up from the rest line to a crest.",
    pointLabel: "Point {id}",

    check: "Check", tryLeft: "One try left.", correct: "Correct!", answerIs: "Here is the answer.",
    nextStep: "Next step →", nextChallenge: "Next challenge →", toRecap: "See recap →",
    stepOf: "Step {n} of {total}", challengeOf: "Challenge {n} of {total}",
    chipStatusNone: "not done", chipStatusStars: "{n} of 3 stars",
    starsEarned: "{n} of 3 stars",
    coefLabel: "Number (coefficient)", expLabel: "Power of ten", times10: "× 10", numberLabel: "Wavelength in metres",

    endTitle: "Nice tuning!", endScore: "★ {stars} of {max} stars · {done} of {total} challenges done",
    recapHeading: "Remember these three ideas",
    recap: [
      "A wave has crests, troughs, a wavelength (crest to crest) and an amplitude (rest line to crest).",
      "For light, c = λ × ν. All light has the same speed, so a longer wavelength means a lower frequency.",
      "Higher frequency (shorter wavelength) means more energy in each photon. Amplitude is brightness, not photon energy."
    ],
    reviewHeading: "Review", reviewNone: "You got every challenge on the first try. Great work!",
    reviewNotDone: "Not done yet.", reviewTryAgain: "Try again", backToChallenges: "Back to challenges",

    // Hints for the tuning challenges. {…} values are filled in by the game.
    matchLong: "Your crests are too far apart. Move the wavelength slider down.",
    matchShort: "Your crests are too close together. Move the wavelength slider up.",
    matchTall: "Your wave is too tall. Make the amplitude smaller.",
    matchLow: "Your wave is too short. Make the amplitude bigger.",
    matchReveal: "The ghost wave has a wavelength of {nm} nm and an amplitude of {amp}.",
    redNotRed: "Your light is {colour}. Red light is 620 to 750 nm, so make the wavelength longer.",
    redTooBright: "Brightness is amplitude. Make the wave smaller, in the lowest third of the slider.",
    redReveal: "Red light is 620 to 750 nm. A small amplitude (in the lowest third) means dim light.",
    highHint: "Frequency goes up when wavelength goes down. Move the wavelength slider to the short end.",
    highReveal: "The highest frequency is at the shortest wavelength, 380 nm (7.89 × 10¹⁴ Hz).",
    sciEmpty: "Type a number in both boxes.",
    sciExponent: "Check the power of ten. Dividing powers of ten: 10⁸ ÷ 10⁻⁷ = 10⁸⁺⁷ = 10¹⁵. Then 3.00 ÷ 5.00 = 0.600. Now write 0.600 × 10¹⁵ with one digit before the decimal point.",
    sciMultiplied: "That multiplies c and λ. Divide instead: ν = c ÷ λ.",
    sciWrong: "Try ν = c ÷ λ = (3.00 × 10⁸) ÷ (5.00 × 10⁻⁷). Divide 3.00 by 5.00, then subtract the exponents.",
    lenEmpty: "Type a number first.",
    lenFlipped: "You divided the wrong way round. Use λ = c ÷ ν: 3.00 × 10⁸ ÷ 1.00 × 10⁸.",
    lenPower: "Check the powers of ten: 10⁸ ÷ 10⁸ = 10⁰ = 1.",
    lenWrong: "Use λ = c ÷ ν = (3.00 × 10⁸ m/s) ÷ (1.00 × 10⁸ Hz). Divide 3.00 by 1.00, then subtract the exponents."
  },

  // The four tap points on the wave (challenges 1 and 2).
  points: [
    { id: "A", kind: "trough", sr: "Point A, a low point of the wave" },
    { id: "B", kind: "crest",  sr: "Point B, a high point of the wave" },
    { id: "C", kind: "trough", sr: "Point C, a low point of the wave" },
    { id: "D", kind: "crest",  sr: "Point D, a high point of the wave" }
  ],

  // type: tap | choice | match | tune | sci | number.   picture: tap | arrows | tuner | none.
  challenges: [
    { id: "tap-crest", group: 0, name: "Tap a crest", steps: [{
      type: "tap", picture: "tap", prompt: "Tap a crest.", instructions: "Tap a point on the wave, or use the buttons.",
      target: "crest",
      hints: { trough: "That point is a trough, the lowest point. A crest is the highest point, at the top of a hill." },
      reason: "A crest is the highest point of a wave. Points B and D are crests." }] },
    { id: "tap-trough", group: 0, name: "Tap a trough", steps: [{
      type: "tap", picture: "tap", prompt: "Tap a trough.", instructions: "Tap a point on the wave, or use the buttons.",
      target: "trough",
      hints: { crest: "That point is a crest, the highest point. A trough is the lowest point, at the bottom of a valley." },
      reason: "A trough is the lowest point of a wave. Points A and C are troughs." }] },
    { id: "arrow-wavelength", group: 0, name: "Which arrow: wavelength?", steps: [{
      type: "choice", picture: "arrows", prompt: "Which arrow shows the wavelength?", instructions: "Choose an arrow.",
      options: [
        { id: "A", label: "Arrow A", hint: "" },
        { id: "B", label: "Arrow B", hint: "Arrow B goes up from the rest line to a crest. That is the amplitude. Wavelength is the distance from one crest to the next crest." }],
      answer: "A", reason: "Wavelength (λ) is the distance from crest to crest. Arrow A shows it." }] },
    { id: "arrow-amplitude", group: 0, name: "Which arrow: amplitude?", steps: [{
      type: "choice", picture: "arrows", prompt: "Which arrow shows the amplitude?", instructions: "Choose an arrow.",
      options: [
        { id: "A", label: "Arrow A", hint: "Arrow A goes sideways from crest to crest. That is the wavelength. Amplitude is the height from the rest line to a crest." },
        { id: "B", label: "Arrow B", hint: "" }],
      answer: "B", reason: "Amplitude is the height from the rest line to a crest. Arrow B shows it." }] },

    { id: "match-ghost", group: 1, name: "Match the ghost", steps: [{
      type: "match", picture: "tuner", prompt: "Match the ghost wave.",
      instructions: "Change the wavelength and amplitude until your wave covers the pale dashed wave. Close enough means within 10 nm and within 8 amplitude points.",
      start: { nm: 660, amp: 30 }, target: { nm: 540, amp: 70 }, tolNm: 10, tolAmp: 8,
      reason: "Your wave matches. Wavelength sets how far apart the crests are. Amplitude sets how tall the wave is." }] },
    { id: "red-dim", group: 1, name: "Red and dim", steps: [{
      type: "tune", rule: "redDim", picture: "tuner", prompt: "Make the light red with a low brightness.",
      instructions: "Red is 620 to 750 nm. Low brightness means an amplitude in the lowest third of the slider.",
      start: { nm: 500, amp: 85 }, reveal: { nm: 680, amp: 20 },
      reason: "Red light has a long wavelength (620 to 750 nm). A small amplitude means dim light." }] },
    { id: "highest-frequency", group: 1, name: "Highest frequency", steps: [
      { type: "tune", rule: "highFreq", picture: "tuner", prompt: "Make the frequency as HIGH as you can.",
        instructions: "Watch the frequency readout while you move the wavelength slider.",
        start: { nm: 600, amp: 60 }, reveal: { nm: 380, amp: 60 },
        reason: "The highest frequency is at the shortest wavelength, 380 nm (7.89 × 10¹⁴ Hz)." },
      { type: "choice", picture: "none", prompt: "What happened to the wavelength?", instructions: "You started at 600 nm. Choose an answer.",
        options: [
          { id: "shorter", label: "It got shorter", hint: "" },
          { id: "longer", label: "It got longer", hint: "Not quite. Wavelength and frequency are opposites for light. When frequency goes up, wavelength goes down." },
          { id: "same", label: "It stayed the same", hint: "Look at the crests: they moved closer together. So the wavelength changed." }],
        answer: "shorter", reason: "It got shorter. Since c = λ × ν and c never changes, a higher frequency means a shorter wavelength." }] },

    { id: "which-frequency", group: 2, name: "Higher frequency?", steps: [{
      type: "choice", picture: "none", prompt: "Wave A is 450 nm (blue). Wave B is 650 nm (red). Which has the higher frequency?",
      instructions: "Choose an answer.",
      options: [
        { id: "A", label: "Wave A (450 nm)", hint: "" },
        { id: "B", label: "Wave B (650 nm)", hint: "Think of opposites. A longer wavelength means a lower frequency. Wave B has the longer wavelength, so it has the lower frequency." },
        { id: "same", label: "They are the same", hint: "c = λ × ν, and c is the same for all light. So if the wavelengths are different, the frequencies are different." }],
      answer: "A", reason: "ν = c ÷ λ. The shorter wavelength (450 nm) has the higher frequency: 6.67 × 10¹⁴ Hz, compared with 4.62 × 10¹⁴ Hz for 650 nm." }] },
    { id: "photon-energy", group: 2, name: "More energy per photon", steps: [{
      type: "choice", picture: "none", prompt: "Which has more energy in each photon, violet light or red light?",
      instructions: "A photon is one tiny packet of light. Choose an answer.",
      options: [
        { id: "violet", label: "Violet light", hint: "" },
        { id: "red", label: "Red light", hint: "Red light has the longer wavelength and the lower frequency. Energy in each photon goes up with frequency." },
        { id: "same", label: "They are the same", hint: "Energy in each photon depends on frequency. Violet and red light have different frequencies." }],
      answer: "violet", reason: "Violet light has the higher frequency, so each violet photon carries more energy than each red photon." }] },
    { id: "brighter-red", group: 2, name: "Brighter red light", steps: [{
      type: "choice", picture: "none", prompt: "You make a red light brighter (bigger amplitude). What happens to the energy of each photon?",
      instructions: "Choose an answer.",
      options: [
        { id: "up", label: "It goes up, because the wave is bigger", hint: "This is a very common mistake. A bigger amplitude means MORE photons, not stronger photons. Energy in each photon depends on frequency, and the frequency did not change." },
        { id: "down", label: "It goes down", hint: "The frequency did not change, so the energy of each photon did not change either." },
        { id: "same", label: "It stays the same. There are just more photons.", hint: "" }],
      answer: "same", reason: "Energy in each photon depends only on frequency. Amplitude changes the brightness: more photons, not stronger photons." }] },

    { id: "green-frequency", group: 3, name: "Frequency of green light", steps: [
      { type: "choice", picture: "none", prompt: "Green light has a wavelength of 5.00 × 10⁻⁷ m. Find its frequency. First, which rearrangement of c = λ × ν gives ν?",
        instructions: "Choose an answer.",
        options: [
          { id: "div", label: "ν = c ÷ λ", hint: "" },
          { id: "mul", label: "ν = c × λ", hint: "c = λ × ν. To get ν alone, divide both sides by λ. So ν = c ÷ λ." },
          { id: "flip", label: "ν = λ ÷ c", hint: "That one is upside down. Divide both sides of c = λ × ν by λ and you get ν = c ÷ λ." }],
        answer: "div", reason: "Divide both sides of c = λ × ν by λ: ν = c ÷ λ." },
      { type: "sci", picture: "none", prompt: "Now calculate ν. Use c = 3.00 × 10⁸ m/s.",
        instructions: "Write the answer as a number times a power of ten.",
        target: 6.00e14, trap: 3.00e8 * 5.00e-7, unit: "Hz",
        reason: "ν = c ÷ λ = (3.00 × 10⁸) ÷ (5.00 × 10⁻⁷) = 6.00 × 10¹⁴ Hz." }] },
    { id: "radio-wavelength", group: 3, name: "Wavelength of a radio wave", steps: [{
      type: "number", picture: "none", prompt: "A radio wave has a frequency of 1.00 × 10⁸ Hz. Find its wavelength.",
      instructions: "Use λ = c ÷ ν with c = 3.00 × 10⁸ m/s. Give the answer in metres.",
      min: 2.9, max: 3.1, target: 3.00, unit: "m",
      reason: "λ = c ÷ ν = (3.00 × 10⁸) ÷ (1.00 × 10⁸) = 3.00 m.",
      after: "Radio waves are metres long. Light waves are only hundreds of millionths of a millimetre long (500 nm = 0.0005 mm)." }] }
  ]
};
