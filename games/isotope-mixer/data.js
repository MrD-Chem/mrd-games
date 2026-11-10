/* Teacher-editable content. Masses are in amu; abundances are percentages.
   Mysterium is fictional. Its sandbox mix uses equal amounts of four isotopes. */
"use strict";
window.ISOTOPE_MIXER_DATA = {
  text: {
    brand: "Mr. D's Chemistry Games", title: "Isotope Mixer",
    unit: "Atomic structure · Pages 13–15",
    tagline: "Average atomic mass is the balance point of the atoms’ masses.",
    footer: "No accounts. No tracking. Scores stay on this device.",
    sandbox: "Sandbox", challenges: "Challenges", tabs: "Game mode",
    chooseChallenge: "Challenge", progress: "{done} of {total} complete",
    challengeOption: "{mark}{number}. {name}", doneMark: "✓ ",
    check: "Check", next: "Next →", retry: "Try this challenge again",
    allDone: "All challenges complete!", startOver: "Start over",
    pictureTitle: "Find the balance", controlsTitle: "Your bag of atoms",
    mathTitle: "Follow the math", element: "Element", fixedSample: "Fixed sample",
    elementOption: "{name} ({symbol})", natural: "Natural mix (100 atoms)",
    empty: "Empty the bag", compare: "Compare with a plain average",
    yourGuess: "Your balance point", dragHelp: "Drag the triangle on the beam, or use the slider. Arrow keys move it by 0.01 amu.",
    guessValue: "{value} amu", bag: "{count} atoms", emptyBag: "Add some atoms to the bag.",
    massValue: "{mass} amu", countLabel: "{isotope} atom count", countShort: "Atoms",
    subtract: "−1", add: "+1", addTen: "+10",
    changeCount: "{action} atom(s) of {isotope}", percent: "{value}% of sample",
    percentOnly: "{value}%", averageLabel: "average = {value} amu",
    guessMarker: "your guess = {value}", plainLabel: "plain average (wrong!)",
    plainValue: "plain average = {value} amu",
    spectrum: "Mass spectrum of your sample", scale: "Mass (amu)",
    circleKey: "● = {count} atoms", partialKey: "Part-filled circle = remaining atoms.",
    stackCount: "{name}: {count}", svgTitle: "Atom stacks, balance beam, and mass spectrum",
    summaryPart: "{name}: {count} atoms, {percent}% of the sample.",
    summaryAverage: "The balance point is {value} amu.",
    summaryHidden: "The balance point is hidden. Use the isotope masses and amounts to find it.",
    summaryGuess: "Your guess is {value} amu.",
    summaryTilt: "The beam tilts toward the {side} side.", left: "lower-mass", right: "higher-mass",
    summaryLevel: "The beam is level.",
    visualIntro: "More atoms pull the balance point closer to their mass.",
    visualPredict: "The posts hold the beam level. Choose a balance point, then check.",
    visualCalc: "This picture uses rounded atom counts. Calculate with the exact percentages in the table.",
    madeUp: "Mysterium is made up. Try your own mix of whole-number masses.",
    naturalNote: "A 100-atom mix rounds nature’s percentages, so its average may differ slightly from the periodic table.",
    periodic: "Periodic table value: {value} amu",
    formula: "average = (mass₁ × fraction₁) + (mass₂ × fraction₂) + …",
    averageWord: "average", mathHidden: "Find the balance point to reveal the math.",
    calcHidden: "Use the percentages in the table. The worked answer appears when you solve it.",
    mathRounding: "Shown to 3 decimals. The final answer uses unrounded values.",
    success: "You got it!", buildSuccess: "Balanced! Your sample has an average of {value} amu.",
    buildWrong: "Your average is {value} amu. Aim for {target} ± {tolerance} amu.",
    buildMax: "Use at most {count} atoms. You have {total}.",
    buildExact: "Use exactly {count} atoms. You have {total}.",
    predictSuccess: "You found the balance point! The average is {value} amu.",
    predictAgain: "The {side} side falls. Move your balance point toward it. One try left.",
    predictReveal: "The balance point is {value} amu. Read the math, then try again to earn a check mark.",
    choiceRight: "Correct! {explanation}", choiceWrong: "Try another answer. {explanation}",
    calcSuccess: "Correct! The weighted average is {value} amu.",
    calcWrong: "Check the marked fields. Multiply each mass by its decimal abundance, then add.",
    decimalHint: "Change the percent to a decimal first: {percent}% → {decimal}",
    totalHint: "Add the unrounded contributions. Give your total in amu.",
    isotope: "Isotope", mass: "Mass (amu)", abundance: "Abundance", contribution: "Mass × decimal",
    contributionLabel: "{name} contribution in amu", totalLabel: "Total average (amu)",
    reverseLabel: "{name} abundance (%)", reverseWrong: "Try again. Move the mix closer to the given average, then find the percent.",
    reverseSuccess: "Yes! About {value}% of the atoms are {name}.",
    reverseHint: "If x is the fraction of the first isotope: x·m₁ + (1 − x)·m₂ = average",
    types: { predict: "Predict the balance", build: "Build a sample", choice: "Think it through", calc: "Calculate the average", reverse: "Find the abundance" },
    instructions: {
      predict: "The sample is fixed. You have two tries to place the balance point.",
      build: "Change the atom counts below, then check your sample.",
      choice: "Choose an answer. You can try again after reading the explanation.",
      calc: "Use the given percentages, not rounded atom counts. Enter each mass × decimal and the total.",
      reverse: "Use the bag and live math to experiment. Then enter the abundance as a percent."
    }
  },
  elements: [
    { id: "Ms", name: "Mysterium", fictional: true, isotopes: [
      { name: "Ms-20", mass: 20, abundance: 25 }, { name: "Ms-22", mass: 22, abundance: 25 },
      { name: "Ms-24", mass: 24, abundance: 25 }, { name: "Ms-25", mass: 25, abundance: 25 }] },
    { id: "C", name: "Carbon", periodic: "12.011", isotopes: [
      { name: "C-12", mass: 12.000, abundance: 98.93 }, { name: "C-13", mass: 13.003, abundance: 1.07 }] },
    { id: "Li", name: "Lithium", periodic: "6.94", isotopes: [
      { name: "Li-6", mass: 6.015, abundance: 7.59 }, { name: "Li-7", mass: 7.016, abundance: 92.41 }] },
    { id: "B", name: "Boron", periodic: "10.81", isotopes: [
      { name: "B-10", mass: 10.013, abundance: 19.9 }, { name: "B-11", mass: 11.009, abundance: 80.1 }] },
    { id: "Ne", name: "Neon", periodic: "20.18", isotopes: [
      { name: "Ne-20", mass: 19.992, abundance: 90.48 }, { name: "Ne-21", mass: 20.994, abundance: 0.27 },
      { name: "Ne-22", mass: 21.991, abundance: 9.25 }] },
    { id: "Mg", name: "Magnesium", periodic: "24.31", isotopes: [
      { name: "Mg-24", mass: 23.985, abundance: 78.99 }, { name: "Mg-25", mass: 24.986, abundance: 10 },
      { name: "Mg-26", mass: 25.983, abundance: 11.01 }] },
    { id: "Si", name: "Silicon", periodic: "28.09", isotopes: [
      { name: "Si-28", mass: 27.977, abundance: 92.23 }, { name: "Si-29", mass: 28.976, abundance: 4.68 },
      { name: "Si-30", mass: 29.974, abundance: 3.09 }] },
    { id: "Cl", name: "Chlorine", periodic: "35.45", isotopes: [
      { name: "Cl-35", mass: 34.969, abundance: 75.78 }, { name: "Cl-37", mass: 36.966, abundance: 24.22 }] },
    { id: "Cu", name: "Copper", periodic: "63.55", isotopes: [
      { name: "Cu-63", mass: 62.930, abundance: 69.15 }, { name: "Cu-65", mass: 64.928, abundance: 30.85 }] },
    { id: "Ga", name: "Gallium", periodic: "69.72", isotopes: [
      { name: "Ga-69", mass: 68.926, abundance: 60.11 }, { name: "Ga-71", mass: 70.925, abundance: 39.89 }] },
    { id: "Br", name: "Bromine", periodic: "79.90", isotopes: [
      { name: "Br-79", mass: 78.918, abundance: 50.69 }, { name: "Br-81", mass: 80.916, abundance: 49.31 }] },
    { id: "Ag", name: "Silver", periodic: "107.87", isotopes: [
      { name: "Ag-107", mass: 106.905, abundance: 51.84 }, { name: "Ag-109", mass: 108.905, abundance: 48.16 }] }
  ],
  challenges: [
    { id: "first-balance", name: "Where is the balance?", type: "predict", element: "Ms", isotopes: [0, 2], counts: [3, 1], tolerance: 0.15, prompt: "Where will the see-saw balance?" },
    { id: "halfway", name: "Meet in the middle", type: "build", element: "Ms", isotopes: [0, 2], target: 22, tolerance: 0.01, prompt: "Make the average exactly 22." },
    { id: "closer-to-24", name: "Pull toward 24", type: "build", element: "Ms", isotopes: [0, 2], target: 23, tolerance: 0.01, prompt: "Make the average exactly 23." },
    { id: "copper", name: "Read copper’s average", type: "choice", element: "Cu", prompt: "Copper is 63.55 on the periodic table. Which isotope is more common?", options: ["Cu-63", "Cu-65", "About the same"], answer: 0, explanation: "The average is closer to Cu-63, so Cu-63 is more common." },
    { id: "chlorine-balance", name: "Balance chlorine", type: "predict", element: "Cl", counts: [3, 1], tolerance: 0.1, prompt: "Where does this chlorine sample balance?" },
    { id: "sam", name: "Help Sam", type: "choice", element: "Cl", prompt: "Sam says chlorine’s average is (34.969 + 36.966) ÷ 2 = 35.97. What did Sam forget?", options: ["The isotope masses must be rounded to whole numbers first.", "Most chlorine atoms are Cl-35, so they count more.", "He should add the two masses without dividing."], answer: 1, explanation: "A plain average gives both isotopes equal weight. Chlorine has more Cl-35 atoms, so Cl-35 needs more weight." },
    { id: "chlorine-build", name: "A small chlorine sample", type: "build", element: "Cl", target: 35.45, tolerance: 0.05, maxAtoms: 20, prompt: "Build a sample with average 35.45 ± 0.05 using at most 20 atoms." },
    { id: "boron", name: "Calculate boron", type: "calc", element: "B", target: 10.81, prompt: "Calculate boron’s average atomic mass." },
    { id: "bromine", name: "Read bromine’s average", type: "choice", element: "Br", prompt: "Bromine is 79.90 and has Br-79 and Br-81. Which is true?", options: ["Almost all atoms are Br-79.", "Almost all atoms are Br-81.", "They are about equally common."], answer: 2, explanation: "79.90 is near the midpoint of the two isotope masses, so their abundances are about equal." },
    { id: "three-masses", name: "Balance three isotopes", type: "predict", element: "Ms", isotopes: [0, 1, 3], counts: [2, 5, 3], tolerance: 0.15, prompt: "Find the balance point for these three isotopes." },
    { id: "magnesium", name: "Calculate magnesium", type: "calc", element: "Mg", target: 24.31, prompt: "Calculate magnesium’s average atomic mass using all three isotopes." },
    { id: "neon", name: "Match nature", type: "build", element: "Ne", target: 20.18, tolerance: 0.015, exactAtoms: 100, prompt: "Match nature: build a 100-atom sample whose average is 20.18 ± 0.015." },
    { id: "gallium", name: "Work backward", type: "reverse", element: "Ga", target: 69.72, answer: 60.1, tolerance: 1, prompt: "Gallium’s average is 69.72 amu. What percent of its atoms are Ga-69?" }
  ]
};
