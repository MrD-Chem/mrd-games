/*
 * Balance Quest — THE EQUATION BANK (Mr. D's Chemistry Games)
 * ===========================================================
 * Every entry below is one chemical equation. Students fill in the missing
 * COEFFICIENTS (the big numbers written in front of each formula).
 *
 * WHAT EACH PART OF AN ENTRY MEANS
 *   id           – short unique name: "w" + world number + "-" + two digits   e.g. "w2-07"
 *   world        – which world it belongs to: 1, 2, 3 or 4
 *   type         – "synthesis", "decomposition", "single replacement",
 *                  "double replacement" or "combustion"
 *                  (acid + base neutralizations are listed as "double replacement";
 *                  metal + oxygen is listed as "synthesis", though some books also call
 *                  it combustion; cellular respiration is listed as "combustion" because
 *                  it has the same equation as burning glucose)
 *   name         – short friendly name shown to students (optional)
 *   reactants    – the formulas on the LEFT of the arrow, in order
 *   products     – the formulas on the RIGHT of the arrow, in order
 *   coefficients – the balanced answer: reactants first, then products, in the same
 *                  order as the formulas, using the LOWEST whole numbers. Write the 1s too.
 *   given        – one number for each formula, in the same order as coefficients:
 *                    1 = this coefficient is shown to the student
 *                    0 = this coefficient is a blank the student fills in
 *   boss         – true only on the last (hardest) equation of a world
 *
 *   The comment line above each entry ( // 2 H2 + O2 → 2 H2O ) is only there so the
 *   balanced equation is easy to read here. The game ignores it.
 *
 * HOW TO WRITE FORMULAS
 *   Plain keyboard letters and numbers — the game turns the numbers into subscripts.
 *   Every element symbol starts with a capital letter: "NaCl", "CO2" (not "Nacl", "Co2").
 *   Put parentheses around a polyatomic group that appears more than once:
 *   "Ca(OH)2", "Al2(SO4)3", "Pb(NO3)2". No states such as (aq) or (g), and no charges.
 *   Remember the diatomic elements: H2, N2, O2, F2, Cl2, Br2, I2.
 *
 * RULES THE GAME RELIES ON (please keep them when you add an equation)
 *   - The equation must balance in only ONE way (apart from doubling, tripling, ...
 *     every number), and "coefficients" must be the lowest whole numbers.
 *   - No compound with more than THREE different elements for now. Ca(OH)2, Al2(SO4)3,
 *     NH4Cl and Na3PO4 are fine; NaHCO3 and (NH4)2SO4 have four, so they are left out.
 *   - Worlds 1 and 2 show at least one coefficient; the shown number(s) fix the
 *     answer. Worlds 3 and 4 show none; the answer is the lowest whole numbers.
 *
 * THE FOUR WORLDS (10 equations each, easiest first, boss last)
 *   World 1 – Warm-up: synthesis and decomposition with diatomic elements.
 *             2 blanks per equation, numbers up to 4.
 *   World 2 – Single and double replacement with two-element compounds.
 *             3 blanks per equation, numbers up to 4.
 *   World 3 – Combustion of fuels (small hydrocarbons, ethanol, glucose), plus
 *             metals + oxygen. Every coefficient blank, numbers up to 7; only the
 *             boss (ethane's 7 O2) uses a 7.
 *   World 4 – Polyatomic groups: precipitates, neutralizations, two metal swaps and
 *             one decomposition. Every coefficient blank, numbers up to 6.
 *             In limestone + acid and in potassium chlorate the group breaks apart,
 *             so those are balanced one atom at a time.
 *
 * Keep the quotes, commas and square brackets exactly as in the examples — a missing
 * comma stops the whole list from loading.
 */
window.BQ_EQUATIONS = [

  // ---------- World 1: Warm-up (2 blanks, numbers up to 4) ----------

  // H2 + Cl2 → 2 HCl
  { id: "w1-01", world: 1, type: "synthesis", name: "Making hydrogen chloride",
    reactants: ["H2", "Cl2"], products: ["HCl"],
    coefficients: [1, 1, 2], given: [1, 0, 0] },

  // 2 H2 + O2 → 2 H2O
  { id: "w1-02", world: 1, type: "synthesis", name: "Forming water",
    reactants: ["H2", "O2"], products: ["H2O"],
    coefficients: [2, 1, 2], given: [0, 1, 0] },

  // 2 Na + Cl2 → 2 NaCl
  { id: "w1-03", world: 1, type: "synthesis", name: "Table salt from its elements",
    reactants: ["Na", "Cl2"], products: ["NaCl"],
    coefficients: [2, 1, 2], given: [1, 0, 0] },

  // 2 Mg + O2 → 2 MgO
  { id: "w1-04", world: 1, type: "synthesis", name: "Magnesium ribbon meets oxygen",
    reactants: ["Mg", "O2"], products: ["MgO"],
    coefficients: [2, 1, 2], given: [0, 0, 1] },

  // 2 H2O → 2 H2 + O2
  { id: "w1-05", world: 1, type: "decomposition", name: "Splitting water",
    reactants: ["H2O"], products: ["H2", "O2"],
    coefficients: [2, 2, 1], given: [0, 0, 1] },

  // N2 + 3 H2 → 2 NH3
  { id: "w1-06", world: 1, type: "synthesis", name: "Making ammonia",
    reactants: ["N2", "H2"], products: ["NH3"],
    coefficients: [1, 3, 2], given: [1, 0, 0] },

  // 2 H2O2 → 2 H2O + O2
  { id: "w1-07", world: 1, type: "decomposition", name: "Hydrogen peroxide breaks down",
    reactants: ["H2O2"], products: ["H2O", "O2"],
    coefficients: [2, 2, 1], given: [1, 0, 0] },

  // 2 Al + 3 Cl2 → 2 AlCl3
  { id: "w1-08", world: 1, type: "synthesis", name: "Aluminum meets chlorine",
    reactants: ["Al", "Cl2"], products: ["AlCl3"],
    coefficients: [2, 3, 2], given: [1, 0, 0] },

  // 2 NaN3 → 2 Na + 3 N2
  { id: "w1-09", world: 1, type: "decomposition", name: "Air bag inflates (sodium azide)",
    reactants: ["NaN3"], products: ["Na", "N2"],
    coefficients: [2, 2, 3], given: [0, 0, 1] },

  // 4 Na + O2 → 2 Na2O
  { id: "w1-10", world: 1, type: "synthesis", name: "Sodium meets oxygen",
    reactants: ["Na", "O2"], products: ["Na2O"],
    coefficients: [4, 1, 2], given: [0, 1, 0], boss: true },

  // ---------- World 2: Single and double replacement (3 blanks, numbers up to 4) ----------

  // Zn + 2 HCl → ZnCl2 + H2
  { id: "w2-01", world: 2, type: "single replacement", name: "Zinc in hydrochloric acid",
    reactants: ["Zn", "HCl"], products: ["ZnCl2", "H2"],
    coefficients: [1, 2, 1, 1], given: [1, 0, 0, 0] },

  // Cl2 + 2 NaBr → 2 NaCl + Br2
  { id: "w2-02", world: 2, type: "single replacement", name: "Chlorine pushes out bromine",
    reactants: ["Cl2", "NaBr"], products: ["NaCl", "Br2"],
    coefficients: [1, 2, 2, 1], given: [1, 0, 0, 0] },

  // MgO + 2 HCl → MgCl2 + H2O
  { id: "w2-03", world: 2, type: "double replacement", name: "Acid meets magnesium oxide",
    reactants: ["MgO", "HCl"], products: ["MgCl2", "H2O"],
    coefficients: [1, 2, 1, 1], given: [0, 0, 0, 1] },

  // FeS + 2 HCl → FeCl2 + H2S
  { id: "w2-04", world: 2, type: "double replacement", name: "Rotten-egg gas",
    reactants: ["FeS", "HCl"], products: ["FeCl2", "H2S"],
    coefficients: [1, 2, 1, 1], given: [0, 0, 1, 0] },

  // 2 Al + Fe2O3 → Al2O3 + 2 Fe
  { id: "w2-05", world: 2, type: "single replacement", name: "Thermite",
    reactants: ["Al", "Fe2O3"], products: ["Al2O3", "Fe"],
    coefficients: [2, 1, 1, 2], given: [0, 1, 0, 0] },

  // CaCl2 + 2 NaF → CaF2 + 2 NaCl
  { id: "w2-06", world: 2, type: "double replacement", name: "Calcium fluoride precipitate",
    reactants: ["CaCl2", "NaF"], products: ["CaF2", "NaCl"],
    coefficients: [1, 2, 1, 2], given: [0, 0, 0, 1] },

  // Na2O + 2 HCl → 2 NaCl + H2O
  { id: "w2-07", world: 2, type: "double replacement", name: "Sodium oxide in acid",
    reactants: ["Na2O", "HCl"], products: ["NaCl", "H2O"],
    coefficients: [1, 2, 2, 1], given: [1, 0, 0, 0] },

  // Fe2O3 + 3 H2 → 2 Fe + 3 H2O
  { id: "w2-08", world: 2, type: "single replacement", name: "Hydrogen frees iron",
    reactants: ["Fe2O3", "H2"], products: ["Fe", "H2O"],
    coefficients: [1, 3, 2, 3], given: [1, 0, 0, 0] },

  // 2 Al + 3 CuCl2 → 2 AlCl3 + 3 Cu
  { id: "w2-09", world: 2, type: "single replacement", name: "Aluminum in copper(II) chloride",
    reactants: ["Al", "CuCl2"], products: ["AlCl3", "Cu"],
    coefficients: [2, 3, 2, 3], given: [1, 0, 0, 0] },

  // 2 Fe2O3 + 3 C → 4 Fe + 3 CO2
  { id: "w2-10", world: 2, type: "single replacement", name: "Smelting iron with carbon",
    reactants: ["Fe2O3", "C"], products: ["Fe", "CO2"],
    coefficients: [2, 3, 4, 3], given: [1, 0, 0, 0], boss: true },

  // ---------- World 3: Combustion and metal oxides (all blanks, numbers up to 7) ----------

  // CH4 + 2 O2 → CO2 + 2 H2O
  { id: "w3-01", world: 3, type: "combustion", name: "Burning natural gas (methane)",
    reactants: ["CH4", "O2"], products: ["CO2", "H2O"],
    coefficients: [1, 2, 1, 2], given: [0, 0, 0, 0] },

  // 4 Li + O2 → 2 Li2O
  { id: "w3-02", world: 3, type: "synthesis", name: "Lithium meets oxygen",
    reactants: ["Li", "O2"], products: ["Li2O"],
    coefficients: [4, 1, 2], given: [0, 0, 0] },

  // C2H4 + 3 O2 → 2 CO2 + 2 H2O
  { id: "w3-03", world: 3, type: "combustion", name: "Burning ethylene",
    reactants: ["C2H4", "O2"], products: ["CO2", "H2O"],
    coefficients: [1, 3, 2, 2], given: [0, 0, 0, 0] },

  // 4 Fe + 3 O2 → 2 Fe2O3
  { id: "w3-04", world: 3, type: "synthesis", name: "Iron rusts",
    reactants: ["Fe", "O2"], products: ["Fe2O3"],
    coefficients: [4, 3, 2], given: [0, 0, 0] },

  // C3H8 + 5 O2 → 3 CO2 + 4 H2O
  { id: "w3-05", world: 3, type: "combustion", name: "Propane grill",
    reactants: ["C3H8", "O2"], products: ["CO2", "H2O"],
    coefficients: [1, 5, 3, 4], given: [0, 0, 0, 0] },

  // 4 Al + 3 O2 → 2 Al2O3
  { id: "w3-06", world: 3, type: "synthesis", name: "Aluminum's oxide coat",
    reactants: ["Al", "O2"], products: ["Al2O3"],
    coefficients: [4, 3, 2], given: [0, 0, 0] },

  // C2H5OH + 3 O2 → 2 CO2 + 3 H2O
  { id: "w3-07", world: 3, type: "combustion", name: "Burning ethanol (alcohol fuel)",
    reactants: ["C2H5OH", "O2"], products: ["CO2", "H2O"],
    coefficients: [1, 3, 2, 3], given: [0, 0, 0, 0] },

  // C6H12O6 + 6 O2 → 6 CO2 + 6 H2O
  { id: "w3-08", world: 3, type: "combustion", name: "Cellular respiration (glucose)",
    reactants: ["C6H12O6", "O2"], products: ["CO2", "H2O"],
    coefficients: [1, 6, 6, 6], given: [0, 0, 0, 0] },

  // 2 C2H2 + 5 O2 → 4 CO2 + 2 H2O
  { id: "w3-09", world: 3, type: "combustion", name: "Welding torch (acetylene)",
    reactants: ["C2H2", "O2"], products: ["CO2", "H2O"],
    coefficients: [2, 5, 4, 2], given: [0, 0, 0, 0] },

  // 2 C2H6 + 7 O2 → 4 CO2 + 6 H2O
  { id: "w3-10", world: 3, type: "combustion", name: "Burning ethane",
    reactants: ["C2H6", "O2"], products: ["CO2", "H2O"],
    coefficients: [2, 7, 4, 6], given: [0, 0, 0, 0], boss: true },

  // ---------- World 4: Polyatomic groups (all blanks, numbers up to 6) ----------

  // BaCl2 + Na2SO4 → BaSO4 + 2 NaCl
  { id: "w4-01", world: 4, type: "double replacement", name: "Barium sulfate precipitate",
    reactants: ["BaCl2", "Na2SO4"], products: ["BaSO4", "NaCl"],
    coefficients: [1, 1, 1, 2], given: [0, 0, 0, 0] },

  // 2 HNO3 + Ca(OH)2 → Ca(NO3)2 + 2 H2O
  { id: "w4-02", world: 4, type: "double replacement", name: "Neutralizing nitric acid",
    reactants: ["HNO3", "Ca(OH)2"], products: ["Ca(NO3)2", "H2O"],
    coefficients: [2, 1, 1, 2], given: [0, 0, 0, 0] },

  // Pb(NO3)2 + 2 KI → PbI2 + 2 KNO3
  { id: "w4-03", world: 4, type: "double replacement", name: "Golden rain (lead iodide)",
    reactants: ["Pb(NO3)2", "KI"], products: ["PbI2", "KNO3"],
    coefficients: [1, 2, 1, 2], given: [0, 0, 0, 0] },

  // CaCO3 + 2 HCl → CaCl2 + H2O + CO2
  { id: "w4-04", world: 4, type: "double replacement", name: "Limestone fizzes in acid",
    reactants: ["CaCO3", "HCl"], products: ["CaCl2", "H2O", "CO2"],
    coefficients: [1, 2, 1, 1, 1], given: [0, 0, 0, 0, 0] },

  // Cu + 2 AgNO3 → Cu(NO3)2 + 2 Ag
  { id: "w4-05", world: 4, type: "single replacement", name: "Silver crystals on copper",
    reactants: ["Cu", "AgNO3"], products: ["Cu(NO3)2", "Ag"],
    coefficients: [1, 2, 1, 2], given: [0, 0, 0, 0] },

  // 2 KClO3 → 2 KCl + 3 O2
  { id: "w4-06", world: 4, type: "decomposition", name: "Making oxygen from potassium chlorate",
    reactants: ["KClO3"], products: ["KCl", "O2"],
    coefficients: [2, 2, 3], given: [0, 0, 0] },

  // FeCl3 + 3 NaOH → Fe(OH)3 + 3 NaCl
  { id: "w4-07", world: 4, type: "double replacement", name: "Rust-colored precipitate",
    reactants: ["FeCl3", "NaOH"], products: ["Fe(OH)3", "NaCl"],
    coefficients: [1, 3, 1, 3], given: [0, 0, 0, 0] },

  // 2 Al + 3 CuSO4 → Al2(SO4)3 + 3 Cu
  { id: "w4-08", world: 4, type: "single replacement", name: "Aluminum in copper(II) sulfate",
    reactants: ["Al", "CuSO4"], products: ["Al2(SO4)3", "Cu"],
    coefficients: [2, 3, 1, 3], given: [0, 0, 0, 0] },

  // 2 Na3PO4 + 3 CaCl2 → Ca3(PO4)2 + 6 NaCl
  { id: "w4-09", world: 4, type: "double replacement", name: "Calcium phosphate precipitate",
    reactants: ["Na3PO4", "CaCl2"], products: ["Ca3(PO4)2", "NaCl"],
    coefficients: [2, 3, 1, 6], given: [0, 0, 0, 0] },

  // 2 Al(OH)3 + 3 H2SO4 → Al2(SO4)3 + 6 H2O
  { id: "w4-10", world: 4, type: "double replacement", name: "Aluminum hydroxide neutralizes acid",
    reactants: ["Al(OH)3", "H2SO4"], products: ["Al2(SO4)3", "H2O"],
    coefficients: [2, 3, 1, 6], given: [0, 0, 0, 0], boss: true }
];
