/* Mole Rush question bank.
   GENERATED FILE: do not edit by hand. Edit tools/make_bank.py and run it again:
       python3 games/mole-rush/tools/make_bank.py
   Classic script: it sets the global window.MR_BANK (no modules, no network).
   Formulas are ASCII ("Ca(OH)2"); the game draws the subscripts.
   Every number here was re-checked by the script (molar masses, balancing,
   step chains, answers) before this file was written. */
window.MR_BANK = {
  "version": 1,
  "atomicMasses": {
    "H": 1.01, "C": 12.01, "N": 14.01, "O": 16.00, "Na": 22.99,
    "Mg": 24.31, "Al": 26.98, "S": 32.07, "Cl": 35.45, "K": 39.10,
    "Ca": 40.08, "Fe": 55.85, "Cu": 63.55, "Zn": 65.38, "Ag": 107.87
  },
  "compounds": {
    "H2": { "name": "hydrogen gas", "molarMass": 2.02 },
    "O2": { "name": "oxygen gas", "molarMass": 32.00 },
    "H2O": { "name": "water", "molarMass": 18.02 },
    "N2": { "name": "nitrogen gas", "molarMass": 28.02 },
    "NH3": { "name": "ammonia", "molarMass": 17.04 },
    "Fe": { "name": "iron", "molarMass": 55.85 },
    "Fe2O3": { "name": "iron(III) oxide (rust)", "molarMass": 159.70 },
    "Mg": { "name": "magnesium", "molarMass": 24.31 },
    "MgO": { "name": "magnesium oxide", "molarMass": 40.31 },
    "H2O2": { "name": "hydrogen peroxide", "molarMass": 34.02 },
    "CaCO3": { "name": "calcium carbonate", "molarMass": 100.09 },
    "CaO": { "name": "calcium oxide", "molarMass": 56.08 },
    "CO2": { "name": "carbon dioxide", "molarMass": 44.01 },
    "KClO3": { "name": "potassium chlorate", "molarMass": 122.55 },
    "KCl": { "name": "potassium chloride", "molarMass": 74.55 },
    "CH4": { "name": "methane", "molarMass": 16.05 },
    "C3H8": { "name": "propane", "molarMass": 44.11 },
    "C2H5OH": { "name": "ethanol", "molarMass": 46.08 },
    "Zn": { "name": "zinc", "molarMass": 65.38 },
    "HCl": { "name": "hydrochloric acid", "molarMass": 36.46 },
    "ZnCl2": { "name": "zinc chloride", "molarMass": 136.28 },
    "Al": { "name": "aluminum", "molarMass": 26.98 },
    "CuCl2": { "name": "copper(II) chloride", "molarMass": 134.45 },
    "AlCl3": { "name": "aluminum chloride", "molarMass": 133.33 },
    "Cu": { "name": "copper", "molarMass": 63.55 },
    "AgNO3": { "name": "silver nitrate", "molarMass": 169.88 },
    "Cu(NO3)2": { "name": "copper(II) nitrate", "molarMass": 187.57 },
    "Ag": { "name": "silver", "molarMass": 107.87 },
    "Na2CO3": { "name": "sodium carbonate", "molarMass": 105.99 },
    "CaCl2": { "name": "calcium chloride", "molarMass": 110.98 },
    "NaCl": { "name": "sodium chloride", "molarMass": 58.44 },
    "H2SO4": { "name": "sulfuric acid", "molarMass": 98.09 },
    "NaOH": { "name": "sodium hydroxide", "molarMass": 40.00 },
    "Na2SO4": { "name": "sodium sulfate", "molarMass": 142.05 },
    "Na": { "name": "sodium", "molarMass": 22.99 },
    "Cl2": { "name": "chlorine gas", "molarMass": 70.90 },
    "Al2O3": { "name": "aluminum oxide", "molarMass": 101.96 },
    "AgCl": { "name": "silver chloride", "molarMass": 143.32 },
    "Ca(NO3)2": { "name": "calcium nitrate", "molarMass": 164.10 }
  },
  "reactions": [
    { "id": "r01", "name": "Making water", "reactants": [{ "formula": "H2", "coef": 2 }, { "formula": "O2", "coef": 1 }], "products": [{ "formula": "H2O", "coef": 2 }] },
    { "id": "r02", "name": "Making ammonia", "reactants": [{ "formula": "N2", "coef": 1 }, { "formula": "H2", "coef": 3 }], "products": [{ "formula": "NH3", "coef": 2 }] },
    { "id": "r03", "name": "Rusting iron", "reactants": [{ "formula": "Fe", "coef": 4 }, { "formula": "O2", "coef": 3 }], "products": [{ "formula": "Fe2O3", "coef": 2 }] },
    { "id": "r04", "name": "Burning magnesium", "reactants": [{ "formula": "Mg", "coef": 2 }, { "formula": "O2", "coef": 1 }], "products": [{ "formula": "MgO", "coef": 2 }] },
    { "id": "r05", "name": "Breaking down hydrogen peroxide", "reactants": [{ "formula": "H2O2", "coef": 2 }], "products": [{ "formula": "H2O", "coef": 2 }, { "formula": "O2", "coef": 1 }] },
    { "id": "r06", "name": "Heating limestone", "reactants": [{ "formula": "CaCO3", "coef": 1 }], "products": [{ "formula": "CaO", "coef": 1 }, { "formula": "CO2", "coef": 1 }] },
    { "id": "r07", "name": "Making oxygen from potassium chlorate", "reactants": [{ "formula": "KClO3", "coef": 2 }], "products": [{ "formula": "KCl", "coef": 2 }, { "formula": "O2", "coef": 3 }] },
    { "id": "r08", "name": "Burning methane", "reactants": [{ "formula": "CH4", "coef": 1 }, { "formula": "O2", "coef": 2 }], "products": [{ "formula": "CO2", "coef": 1 }, { "formula": "H2O", "coef": 2 }] },
    { "id": "r09", "name": "Burning propane", "reactants": [{ "formula": "C3H8", "coef": 1 }, { "formula": "O2", "coef": 5 }], "products": [{ "formula": "CO2", "coef": 3 }, { "formula": "H2O", "coef": 4 }] },
    { "id": "r10", "name": "Burning ethanol", "reactants": [{ "formula": "C2H5OH", "coef": 1 }, { "formula": "O2", "coef": 3 }], "products": [{ "formula": "CO2", "coef": 2 }, { "formula": "H2O", "coef": 3 }] },
    { "id": "r11", "name": "Zinc in acid", "reactants": [{ "formula": "Zn", "coef": 1 }, { "formula": "HCl", "coef": 2 }], "products": [{ "formula": "ZnCl2", "coef": 1 }, { "formula": "H2", "coef": 1 }] },
    { "id": "r12", "name": "Aluminum and copper chloride", "reactants": [{ "formula": "Al", "coef": 2 }, { "formula": "CuCl2", "coef": 3 }], "products": [{ "formula": "AlCl3", "coef": 2 }, { "formula": "Cu", "coef": 3 }] },
    { "id": "r13", "name": "Growing a silver tree", "reactants": [{ "formula": "Cu", "coef": 1 }, { "formula": "AgNO3", "coef": 2 }], "products": [{ "formula": "Cu(NO3)2", "coef": 1 }, { "formula": "Ag", "coef": 2 }] },
    { "id": "r14", "name": "Making a chalky solid", "reactants": [{ "formula": "Na2CO3", "coef": 1 }, { "formula": "CaCl2", "coef": 1 }], "products": [{ "formula": "CaCO3", "coef": 1 }, { "formula": "NaCl", "coef": 2 }] },
    { "id": "r15", "name": "Neutralizing sulfuric acid", "reactants": [{ "formula": "H2SO4", "coef": 1 }, { "formula": "NaOH", "coef": 2 }], "products": [{ "formula": "Na2SO4", "coef": 1 }, { "formula": "H2O", "coef": 2 }] }
  ],
  "problems": [
    {
      "id": "p001", "reaction": "r01", "type": "mol-mol", "difficulty": 1,
      "text": "How many moles of O₂ are needed to react completely with 4.00 mol of H₂?",
      "given": { "value": 4.00, "unit": "mol", "formula": "H2" },
      "find": { "unit": "mol", "formula": "O2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "O2" }, "den": { "value": 2, "unit": "mol", "formula": "H2" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 2.00, "unit": "mol", "formula": "O2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p002", "reaction": "r01", "type": "g-mol", "difficulty": 1,
      "text": "A reaction makes 36.0 g of H₂O. How many moles of H₂ were used up? There was plenty of O₂.",
      "given": { "value": 36.0, "unit": "g", "formula": "H2O" },
      "find": { "unit": "mol", "formula": "H2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "H2O" }, "den": { "value": 18.02, "unit": "g", "formula": "H2O" }, "kind": "molar-mass" },
        { "num": { "value": 2, "unit": "mol", "formula": "H2" }, "den": { "value": 2, "unit": "mol", "formula": "H2O" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 2.00, "unit": "mol", "formula": "H2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p003", "reaction": "r01", "type": "mol-g", "difficulty": 1,
      "text": "A student mixes 2.00 mol of O₂ with plenty of H₂. How many grams of H₂O form?",
      "given": { "value": 2.00, "unit": "mol", "formula": "O2" },
      "find": { "unit": "g", "formula": "H2O" },
      "steps": [
        { "num": { "value": 2, "unit": "mol", "formula": "H2O" }, "den": { "value": 1, "unit": "mol", "formula": "O2" }, "kind": "mole-ratio" },
        { "num": { "value": 18.02, "unit": "g", "formula": "H2O" }, "den": { "value": 1, "unit": "mol", "formula": "H2O" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 72.1, "unit": "g", "formula": "H2O", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p004", "reaction": "r01", "type": "g-g", "difficulty": 2,
      "text": "How many grams of O₂ are needed to react completely with 6.00 g of H₂?",
      "given": { "value": 6.00, "unit": "g", "formula": "H2" },
      "find": { "unit": "g", "formula": "O2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "H2" }, "den": { "value": 2.02, "unit": "g", "formula": "H2" }, "kind": "molar-mass" },
        { "num": { "value": 1, "unit": "mol", "formula": "O2" }, "den": { "value": 2, "unit": "mol", "formula": "H2" }, "kind": "mole-ratio" },
        { "num": { "value": 32.00, "unit": "g", "formula": "O2" }, "den": { "value": 1, "unit": "mol", "formula": "O2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 47.5, "unit": "g", "formula": "O2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p005", "reaction": "r02", "type": "mol-mol", "difficulty": 1,
      "text": "How many moles of NH₃ are produced when 3.00 mol of N₂ react with an excess of H₂?",
      "given": { "value": 3.00, "unit": "mol", "formula": "N2" },
      "find": { "unit": "mol", "formula": "NH3" },
      "steps": [
        { "num": { "value": 2, "unit": "mol", "formula": "NH3" }, "den": { "value": 1, "unit": "mol", "formula": "N2" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 6.00, "unit": "mol", "formula": "NH3", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p006", "reaction": "r02", "type": "g-mol", "difficulty": 2,
      "text": "A student has 28.0 g of N₂. How many moles of H₂ will react with all of it?",
      "given": { "value": 28.0, "unit": "g", "formula": "N2" },
      "find": { "unit": "mol", "formula": "H2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "N2" }, "den": { "value": 28.02, "unit": "g", "formula": "N2" }, "kind": "molar-mass" },
        { "num": { "value": 3, "unit": "mol", "formula": "H2" }, "den": { "value": 1, "unit": "mol", "formula": "N2" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 3.00, "unit": "mol", "formula": "H2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p007", "reaction": "r02", "type": "mol-g", "difficulty": 2,
      "text": "4.50 mol of H₂ react with plenty of N₂. How many grams of NH₃ form?",
      "given": { "value": 4.50, "unit": "mol", "formula": "H2" },
      "find": { "unit": "g", "formula": "NH3" },
      "steps": [
        { "num": { "value": 2, "unit": "mol", "formula": "NH3" }, "den": { "value": 3, "unit": "mol", "formula": "H2" }, "kind": "mole-ratio" },
        { "num": { "value": 17.04, "unit": "g", "formula": "NH3" }, "den": { "value": 1, "unit": "mol", "formula": "NH3" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 51.1, "unit": "g", "formula": "NH3", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p008", "reaction": "r02", "type": "g-g", "difficulty": 3,
      "text": "A reaction makes 62.5 g of NH₃. How many grams of H₂ were used up? There was plenty of N₂.",
      "given": { "value": 62.5, "unit": "g", "formula": "NH3" },
      "find": { "unit": "g", "formula": "H2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "NH3" }, "den": { "value": 17.04, "unit": "g", "formula": "NH3" }, "kind": "molar-mass" },
        { "num": { "value": 3, "unit": "mol", "formula": "H2" }, "den": { "value": 2, "unit": "mol", "formula": "NH3" }, "kind": "mole-ratio" },
        { "num": { "value": 2.02, "unit": "g", "formula": "H2" }, "den": { "value": 1, "unit": "mol", "formula": "H2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 11.1, "unit": "g", "formula": "H2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p009", "reaction": "r03", "type": "mol-mol", "difficulty": 2,
      "text": "A student has 6.00 mol of Fe. How many moles of O₂ will react with all of it?",
      "given": { "value": 6.00, "unit": "mol", "formula": "Fe" },
      "find": { "unit": "mol", "formula": "O2" },
      "steps": [
        { "num": { "value": 3, "unit": "mol", "formula": "O2" }, "den": { "value": 4, "unit": "mol", "formula": "Fe" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 4.50, "unit": "mol", "formula": "O2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p010", "reaction": "r03", "type": "g-mol", "difficulty": 3,
      "text": "87.5 g of Fe react with plenty of O₂. How many moles of Fe₂O₃ form?",
      "given": { "value": 87.5, "unit": "g", "formula": "Fe" },
      "find": { "unit": "mol", "formula": "Fe2O3" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "Fe" }, "den": { "value": 55.85, "unit": "g", "formula": "Fe" }, "kind": "molar-mass" },
        { "num": { "value": 2, "unit": "mol", "formula": "Fe2O3" }, "den": { "value": 4, "unit": "mol", "formula": "Fe" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 0.783, "unit": "mol", "formula": "Fe2O3", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p011", "reaction": "r03", "type": "mol-g", "difficulty": 3,
      "text": "How many grams of Fe₂O₃ are produced when 2.75 mol of O₂ react with an excess of Fe?",
      "given": { "value": 2.75, "unit": "mol", "formula": "O2" },
      "find": { "unit": "g", "formula": "Fe2O3" },
      "steps": [
        { "num": { "value": 2, "unit": "mol", "formula": "Fe2O3" }, "den": { "value": 3, "unit": "mol", "formula": "O2" }, "kind": "mole-ratio" },
        { "num": { "value": 159.70, "unit": "g", "formula": "Fe2O3" }, "den": { "value": 1, "unit": "mol", "formula": "Fe2O3" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 293, "unit": "g", "formula": "Fe2O3", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p012", "reaction": "r03", "type": "g-g", "difficulty": 3,
      "text": "A student mixes 64.0 g of Fe with plenty of O₂. How many grams of Fe₂O₃ form?",
      "given": { "value": 64.0, "unit": "g", "formula": "Fe" },
      "find": { "unit": "g", "formula": "Fe2O3" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "Fe" }, "den": { "value": 55.85, "unit": "g", "formula": "Fe" }, "kind": "molar-mass" },
        { "num": { "value": 2, "unit": "mol", "formula": "Fe2O3" }, "den": { "value": 4, "unit": "mol", "formula": "Fe" }, "kind": "mole-ratio" },
        { "num": { "value": 159.70, "unit": "g", "formula": "Fe2O3" }, "den": { "value": 1, "unit": "mol", "formula": "Fe2O3" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 91.5, "unit": "g", "formula": "Fe2O3", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p013", "reaction": "r04", "type": "mol-mol", "difficulty": 1,
      "text": "How many moles of O₂ are needed to react completely with 5.00 mol of Mg?",
      "given": { "value": 5.00, "unit": "mol", "formula": "Mg" },
      "find": { "unit": "mol", "formula": "O2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "O2" }, "den": { "value": 2, "unit": "mol", "formula": "Mg" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 2.50, "unit": "mol", "formula": "O2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p014", "reaction": "r04", "type": "g-mol", "difficulty": 1,
      "text": "How many moles of MgO are produced when 24.3 g of Mg react with an excess of O₂?",
      "given": { "value": 24.3, "unit": "g", "formula": "Mg" },
      "find": { "unit": "mol", "formula": "MgO" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "Mg" }, "den": { "value": 24.31, "unit": "g", "formula": "Mg" }, "kind": "molar-mass" },
        { "num": { "value": 2, "unit": "mol", "formula": "MgO" }, "den": { "value": 2, "unit": "mol", "formula": "Mg" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 1.00, "unit": "mol", "formula": "MgO", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p015", "reaction": "r04", "type": "mol-g", "difficulty": 1,
      "text": "A student mixes 3.00 mol of Mg with plenty of O₂. How many grams of MgO form?",
      "given": { "value": 3.00, "unit": "mol", "formula": "Mg" },
      "find": { "unit": "g", "formula": "MgO" },
      "steps": [
        { "num": { "value": 2, "unit": "mol", "formula": "MgO" }, "den": { "value": 2, "unit": "mol", "formula": "Mg" }, "kind": "mole-ratio" },
        { "num": { "value": 40.31, "unit": "g", "formula": "MgO" }, "den": { "value": 1, "unit": "mol", "formula": "MgO" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 121, "unit": "g", "formula": "MgO", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p016", "reaction": "r04", "type": "g-g", "difficulty": 2,
      "text": "How many grams of O₂ are needed to react completely with 10.0 g of Mg?",
      "given": { "value": 10.0, "unit": "g", "formula": "Mg" },
      "find": { "unit": "g", "formula": "O2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "Mg" }, "den": { "value": 24.31, "unit": "g", "formula": "Mg" }, "kind": "molar-mass" },
        { "num": { "value": 1, "unit": "mol", "formula": "O2" }, "den": { "value": 2, "unit": "mol", "formula": "Mg" }, "kind": "mole-ratio" },
        { "num": { "value": 32.00, "unit": "g", "formula": "O2" }, "den": { "value": 1, "unit": "mol", "formula": "O2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 6.58, "unit": "g", "formula": "O2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p017", "reaction": "r05", "type": "mol-mol", "difficulty": 1,
      "text": "How many moles of O₂ are made when 4.00 mol of H₂O₂ decompose completely?",
      "given": { "value": 4.00, "unit": "mol", "formula": "H2O2" },
      "find": { "unit": "mol", "formula": "O2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "O2" }, "den": { "value": 2, "unit": "mol", "formula": "H2O2" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 2.00, "unit": "mol", "formula": "O2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p018", "reaction": "r05", "type": "g-mol", "difficulty": 2,
      "text": "A lab breaks down 34.0 g of H₂O₂ completely. How many moles of O₂ are produced?",
      "given": { "value": 34.0, "unit": "g", "formula": "H2O2" },
      "find": { "unit": "mol", "formula": "O2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "H2O2" }, "den": { "value": 34.02, "unit": "g", "formula": "H2O2" }, "kind": "molar-mass" },
        { "num": { "value": 1, "unit": "mol", "formula": "O2" }, "den": { "value": 2, "unit": "mol", "formula": "H2O2" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 0.500, "unit": "mol", "formula": "O2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p019", "reaction": "r05", "type": "mol-g", "difficulty": 2,
      "text": "3.00 mol of H₂O₂ decompose completely. How many grams of H₂O form?",
      "given": { "value": 3.00, "unit": "mol", "formula": "H2O2" },
      "find": { "unit": "g", "formula": "H2O" },
      "steps": [
        { "num": { "value": 2, "unit": "mol", "formula": "H2O" }, "den": { "value": 2, "unit": "mol", "formula": "H2O2" }, "kind": "mole-ratio" },
        { "num": { "value": 18.02, "unit": "g", "formula": "H2O" }, "den": { "value": 1, "unit": "mol", "formula": "H2O" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 54.1, "unit": "g", "formula": "H2O", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p020", "reaction": "r05", "type": "g-g", "difficulty": 3,
      "text": "How many grams of O₂ are made when 46.8 g of H₂O₂ decompose completely?",
      "given": { "value": 46.8, "unit": "g", "formula": "H2O2" },
      "find": { "unit": "g", "formula": "O2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "H2O2" }, "den": { "value": 34.02, "unit": "g", "formula": "H2O2" }, "kind": "molar-mass" },
        { "num": { "value": 1, "unit": "mol", "formula": "O2" }, "den": { "value": 2, "unit": "mol", "formula": "H2O2" }, "kind": "mole-ratio" },
        { "num": { "value": 32.00, "unit": "g", "formula": "O2" }, "den": { "value": 1, "unit": "mol", "formula": "O2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 22.0, "unit": "g", "formula": "O2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p021", "reaction": "r06", "type": "mol-mol", "difficulty": 1,
      "text": "A lab breaks down 2.50 mol of CaCO₃ completely. How many moles of CO₂ are produced?",
      "given": { "value": 2.50, "unit": "mol", "formula": "CaCO3" },
      "find": { "unit": "mol", "formula": "CO2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "CO2" }, "den": { "value": 1, "unit": "mol", "formula": "CaCO3" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 2.50, "unit": "mol", "formula": "CO2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p022", "reaction": "r06", "type": "g-mol", "difficulty": 2,
      "text": "125 g of CaCO₃ decompose completely. How many moles of CaO form?",
      "given": { "value": 125, "unit": "g", "formula": "CaCO3" },
      "find": { "unit": "mol", "formula": "CaO" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "CaCO3" }, "den": { "value": 100.09, "unit": "g", "formula": "CaCO3" }, "kind": "molar-mass" },
        { "num": { "value": 1, "unit": "mol", "formula": "CaO" }, "den": { "value": 1, "unit": "mol", "formula": "CaCO3" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 1.25, "unit": "mol", "formula": "CaO", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p023", "reaction": "r06", "type": "mol-g", "difficulty": 2,
      "text": "How many grams of CO₂ are made when 1.50 mol of CaCO₃ decompose completely?",
      "given": { "value": 1.50, "unit": "mol", "formula": "CaCO3" },
      "find": { "unit": "g", "formula": "CO2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "CO2" }, "den": { "value": 1, "unit": "mol", "formula": "CaCO3" }, "kind": "mole-ratio" },
        { "num": { "value": 44.01, "unit": "g", "formula": "CO2" }, "den": { "value": 1, "unit": "mol", "formula": "CO2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 66.0, "unit": "g", "formula": "CO2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p024", "reaction": "r06", "type": "g-g", "difficulty": 3,
      "text": "88.0 g of CO₂ form in a reaction. How many grams of CaO are produced at the same time?",
      "given": { "value": 88.0, "unit": "g", "formula": "CO2" },
      "find": { "unit": "g", "formula": "CaO" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "CO2" }, "den": { "value": 44.01, "unit": "g", "formula": "CO2" }, "kind": "molar-mass" },
        { "num": { "value": 1, "unit": "mol", "formula": "CaO" }, "den": { "value": 1, "unit": "mol", "formula": "CO2" }, "kind": "mole-ratio" },
        { "num": { "value": 56.08, "unit": "g", "formula": "CaO" }, "den": { "value": 1, "unit": "mol", "formula": "CaO" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 112, "unit": "g", "formula": "CaO", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p025", "reaction": "r07", "type": "mol-mol", "difficulty": 2,
      "text": "4.00 mol of KClO₃ decompose completely. How many moles of O₂ form?",
      "given": { "value": 4.00, "unit": "mol", "formula": "KClO3" },
      "find": { "unit": "mol", "formula": "O2" },
      "steps": [
        { "num": { "value": 3, "unit": "mol", "formula": "O2" }, "den": { "value": 2, "unit": "mol", "formula": "KClO3" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 6.00, "unit": "mol", "formula": "O2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p026", "reaction": "r07", "type": "g-mol", "difficulty": 3,
      "text": "How many moles of O₂ are made when 178 g of KClO₃ decompose completely?",
      "given": { "value": 178, "unit": "g", "formula": "KClO3" },
      "find": { "unit": "mol", "formula": "O2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "KClO3" }, "den": { "value": 122.55, "unit": "g", "formula": "KClO3" }, "kind": "molar-mass" },
        { "num": { "value": 3, "unit": "mol", "formula": "O2" }, "den": { "value": 2, "unit": "mol", "formula": "KClO3" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 2.18, "unit": "mol", "formula": "O2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p027", "reaction": "r07", "type": "mol-g", "difficulty": 2,
      "text": "A lab breaks down 2.50 mol of KClO₃ completely. How many grams of KCl are produced?",
      "given": { "value": 2.50, "unit": "mol", "formula": "KClO3" },
      "find": { "unit": "g", "formula": "KCl" },
      "steps": [
        { "num": { "value": 2, "unit": "mol", "formula": "KCl" }, "den": { "value": 2, "unit": "mol", "formula": "KClO3" }, "kind": "mole-ratio" },
        { "num": { "value": 74.55, "unit": "g", "formula": "KCl" }, "den": { "value": 1, "unit": "mol", "formula": "KCl" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 186, "unit": "g", "formula": "KCl", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p028", "reaction": "r07", "type": "g-g", "difficulty": 3,
      "text": "How many grams of KClO₃ must decompose to make 37.5 g of O₂?",
      "given": { "value": 37.5, "unit": "g", "formula": "O2" },
      "find": { "unit": "g", "formula": "KClO3" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "O2" }, "den": { "value": 32.00, "unit": "g", "formula": "O2" }, "kind": "molar-mass" },
        { "num": { "value": 2, "unit": "mol", "formula": "KClO3" }, "den": { "value": 3, "unit": "mol", "formula": "O2" }, "kind": "mole-ratio" },
        { "num": { "value": 122.55, "unit": "g", "formula": "KClO3" }, "den": { "value": 1, "unit": "mol", "formula": "KClO3" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 95.7, "unit": "g", "formula": "KClO3", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p029", "reaction": "r08", "type": "mol-mol", "difficulty": 1,
      "text": "How many moles of O₂ are used up when 3.00 mol of CH₄ react completely?",
      "given": { "value": 3.00, "unit": "mol", "formula": "CH4" },
      "find": { "unit": "mol", "formula": "O2" },
      "steps": [
        { "num": { "value": 2, "unit": "mol", "formula": "O2" }, "den": { "value": 1, "unit": "mol", "formula": "CH4" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 6.00, "unit": "mol", "formula": "O2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p030", "reaction": "r08", "type": "g-mol", "difficulty": 2,
      "text": "A student burns 32.1 g of CH₄ with plenty of O₂. How many moles of H₂O form?",
      "given": { "value": 32.1, "unit": "g", "formula": "CH4" },
      "find": { "unit": "mol", "formula": "H2O" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "CH4" }, "den": { "value": 16.05, "unit": "g", "formula": "CH4" }, "kind": "molar-mass" },
        { "num": { "value": 2, "unit": "mol", "formula": "H2O" }, "den": { "value": 1, "unit": "mol", "formula": "CH4" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 4.00, "unit": "mol", "formula": "H2O", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p031", "reaction": "r08", "type": "mol-g", "difficulty": 1,
      "text": "2.00 mol of CH₄ burn in plenty of O₂. How many grams of CO₂ form?",
      "given": { "value": 2.00, "unit": "mol", "formula": "CH4" },
      "find": { "unit": "g", "formula": "CO2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "CO2" }, "den": { "value": 1, "unit": "mol", "formula": "CH4" }, "kind": "mole-ratio" },
        { "num": { "value": 44.01, "unit": "g", "formula": "CO2" }, "den": { "value": 1, "unit": "mol", "formula": "CO2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 88.0, "unit": "g", "formula": "CO2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p032", "reaction": "r08", "type": "g-g", "difficulty": 3,
      "text": "How many grams of H₂O are produced when 48.0 g of CH₄ burn completely in plenty of O₂?",
      "given": { "value": 48.0, "unit": "g", "formula": "CH4" },
      "find": { "unit": "g", "formula": "H2O" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "CH4" }, "den": { "value": 16.05, "unit": "g", "formula": "CH4" }, "kind": "molar-mass" },
        { "num": { "value": 2, "unit": "mol", "formula": "H2O" }, "den": { "value": 1, "unit": "mol", "formula": "CH4" }, "kind": "mole-ratio" },
        { "num": { "value": 18.02, "unit": "g", "formula": "H2O" }, "den": { "value": 1, "unit": "mol", "formula": "H2O" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 108, "unit": "g", "formula": "H2O", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p033", "reaction": "r09", "type": "mol-mol", "difficulty": 2,
      "text": "A student has 2.00 mol of C₃H₈. How many moles of O₂ will react with all of it?",
      "given": { "value": 2.00, "unit": "mol", "formula": "C3H8" },
      "find": { "unit": "mol", "formula": "O2" },
      "steps": [
        { "num": { "value": 5, "unit": "mol", "formula": "O2" }, "den": { "value": 1, "unit": "mol", "formula": "C3H8" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 10.0, "unit": "mol", "formula": "O2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p034", "reaction": "r09", "type": "g-mol", "difficulty": 2,
      "text": "22.0 g of C₃H₈ burn in plenty of O₂. How many moles of CO₂ form?",
      "given": { "value": 22.0, "unit": "g", "formula": "C3H8" },
      "find": { "unit": "mol", "formula": "CO2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "C3H8" }, "den": { "value": 44.11, "unit": "g", "formula": "C3H8" }, "kind": "molar-mass" },
        { "num": { "value": 3, "unit": "mol", "formula": "CO2" }, "den": { "value": 1, "unit": "mol", "formula": "C3H8" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 1.50, "unit": "mol", "formula": "CO2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p035", "reaction": "r09", "type": "mol-g", "difficulty": 2,
      "text": "How many grams of CO₂ are produced when 1.50 mol of C₃H₈ burn completely in plenty of O₂?",
      "given": { "value": 1.50, "unit": "mol", "formula": "C3H8" },
      "find": { "unit": "g", "formula": "CO2" },
      "steps": [
        { "num": { "value": 3, "unit": "mol", "formula": "CO2" }, "den": { "value": 1, "unit": "mol", "formula": "C3H8" }, "kind": "mole-ratio" },
        { "num": { "value": 44.01, "unit": "g", "formula": "CO2" }, "den": { "value": 1, "unit": "mol", "formula": "CO2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 198, "unit": "g", "formula": "CO2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p036", "reaction": "r09", "type": "g-g", "difficulty": 3,
      "text": "A student wants to make 88.0 g of CO₂. How many grams of O₂ are needed, with plenty of C₃H₈?",
      "given": { "value": 88.0, "unit": "g", "formula": "CO2" },
      "find": { "unit": "g", "formula": "O2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "CO2" }, "den": { "value": 44.01, "unit": "g", "formula": "CO2" }, "kind": "molar-mass" },
        { "num": { "value": 5, "unit": "mol", "formula": "O2" }, "den": { "value": 3, "unit": "mol", "formula": "CO2" }, "kind": "mole-ratio" },
        { "num": { "value": 32.00, "unit": "g", "formula": "O2" }, "den": { "value": 1, "unit": "mol", "formula": "O2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 107, "unit": "g", "formula": "O2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p037", "reaction": "r10", "type": "mol-mol", "difficulty": 1,
      "text": "2.50 mol of C₂H₅OH burn in plenty of O₂. How many moles of CO₂ form?",
      "given": { "value": 2.50, "unit": "mol", "formula": "C2H5OH" },
      "find": { "unit": "mol", "formula": "CO2" },
      "steps": [
        { "num": { "value": 2, "unit": "mol", "formula": "CO2" }, "den": { "value": 1, "unit": "mol", "formula": "C2H5OH" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 5.00, "unit": "mol", "formula": "CO2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p038", "reaction": "r10", "type": "g-mol", "difficulty": 2,
      "text": "How many moles of H₂O are produced when 46.1 g of C₂H₅OH burn completely in plenty of O₂?",
      "given": { "value": 46.1, "unit": "g", "formula": "C2H5OH" },
      "find": { "unit": "mol", "formula": "H2O" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "C2H5OH" }, "den": { "value": 46.08, "unit": "g", "formula": "C2H5OH" }, "kind": "molar-mass" },
        { "num": { "value": 3, "unit": "mol", "formula": "H2O" }, "den": { "value": 1, "unit": "mol", "formula": "C2H5OH" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 3.00, "unit": "mol", "formula": "H2O", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p039", "reaction": "r10", "type": "mol-g", "difficulty": 2,
      "text": "A student mixes 6.00 mol of O₂ with plenty of C₂H₅OH. How many grams of CO₂ form?",
      "given": { "value": 6.00, "unit": "mol", "formula": "O2" },
      "find": { "unit": "g", "formula": "CO2" },
      "steps": [
        { "num": { "value": 2, "unit": "mol", "formula": "CO2" }, "den": { "value": 3, "unit": "mol", "formula": "O2" }, "kind": "mole-ratio" },
        { "num": { "value": 44.01, "unit": "g", "formula": "CO2" }, "den": { "value": 1, "unit": "mol", "formula": "CO2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 176, "unit": "g", "formula": "CO2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p040", "reaction": "r10", "type": "g-g", "difficulty": 3,
      "text": "23.0 g of C₂H₅OH burn in plenty of O₂. How many grams of CO₂ form?",
      "given": { "value": 23.0, "unit": "g", "formula": "C2H5OH" },
      "find": { "unit": "g", "formula": "CO2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "C2H5OH" }, "den": { "value": 46.08, "unit": "g", "formula": "C2H5OH" }, "kind": "molar-mass" },
        { "num": { "value": 2, "unit": "mol", "formula": "CO2" }, "den": { "value": 1, "unit": "mol", "formula": "C2H5OH" }, "kind": "mole-ratio" },
        { "num": { "value": 44.01, "unit": "g", "formula": "CO2" }, "den": { "value": 1, "unit": "mol", "formula": "CO2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 43.9, "unit": "g", "formula": "CO2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p041", "reaction": "r11", "type": "mol-mol", "difficulty": 1,
      "text": "How many moles of H₂ are produced when 4.00 mol of HCl react with an excess of Zn?",
      "given": { "value": 4.00, "unit": "mol", "formula": "HCl" },
      "find": { "unit": "mol", "formula": "H2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "H2" }, "den": { "value": 2, "unit": "mol", "formula": "HCl" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 2.00, "unit": "mol", "formula": "H2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p042", "reaction": "r11", "type": "g-mol", "difficulty": 2,
      "text": "A student has 65.4 g of Zn. How many moles of HCl will react with all of it?",
      "given": { "value": 65.4, "unit": "g", "formula": "Zn" },
      "find": { "unit": "mol", "formula": "HCl" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "Zn" }, "den": { "value": 65.38, "unit": "g", "formula": "Zn" }, "kind": "molar-mass" },
        { "num": { "value": 2, "unit": "mol", "formula": "HCl" }, "den": { "value": 1, "unit": "mol", "formula": "Zn" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 2.00, "unit": "mol", "formula": "HCl", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p043", "reaction": "r11", "type": "mol-g", "difficulty": 1,
      "text": "2.00 mol of Zn react with plenty of HCl. How many grams of ZnCl₂ form?",
      "given": { "value": 2.00, "unit": "mol", "formula": "Zn" },
      "find": { "unit": "g", "formula": "ZnCl2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "ZnCl2" }, "den": { "value": 1, "unit": "mol", "formula": "Zn" }, "kind": "mole-ratio" },
        { "num": { "value": 136.28, "unit": "g", "formula": "ZnCl2" }, "den": { "value": 1, "unit": "mol", "formula": "ZnCl2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 273, "unit": "g", "formula": "ZnCl2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p044", "reaction": "r11", "type": "g-g", "difficulty": 3,
      "text": "How many grams of ZnCl₂ are produced when 29.2 g of HCl react with an excess of Zn?",
      "given": { "value": 29.2, "unit": "g", "formula": "HCl" },
      "find": { "unit": "g", "formula": "ZnCl2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "HCl" }, "den": { "value": 36.46, "unit": "g", "formula": "HCl" }, "kind": "molar-mass" },
        { "num": { "value": 1, "unit": "mol", "formula": "ZnCl2" }, "den": { "value": 2, "unit": "mol", "formula": "HCl" }, "kind": "mole-ratio" },
        { "num": { "value": 136.28, "unit": "g", "formula": "ZnCl2" }, "den": { "value": 1, "unit": "mol", "formula": "ZnCl2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 54.6, "unit": "g", "formula": "ZnCl2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p045", "reaction": "r12", "type": "mol-mol", "difficulty": 2,
      "text": "A student has 6.00 mol of CuCl₂. How many moles of Al will react with all of it?",
      "given": { "value": 6.00, "unit": "mol", "formula": "CuCl2" },
      "find": { "unit": "mol", "formula": "Al" },
      "steps": [
        { "num": { "value": 2, "unit": "mol", "formula": "Al" }, "den": { "value": 3, "unit": "mol", "formula": "CuCl2" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 4.00, "unit": "mol", "formula": "Al", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p046", "reaction": "r12", "type": "g-mol", "difficulty": 2,
      "text": "54.0 g of Al react with plenty of CuCl₂. How many moles of Cu form?",
      "given": { "value": 54.0, "unit": "g", "formula": "Al" },
      "find": { "unit": "mol", "formula": "Cu" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "Al" }, "den": { "value": 26.98, "unit": "g", "formula": "Al" }, "kind": "molar-mass" },
        { "num": { "value": 3, "unit": "mol", "formula": "Cu" }, "den": { "value": 2, "unit": "mol", "formula": "Al" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 3.00, "unit": "mol", "formula": "Cu", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p047", "reaction": "r12", "type": "mol-g", "difficulty": 2,
      "text": "A reaction makes 3.00 mol of AlCl₃. How many grams of CuCl₂ were used up? There was plenty of Al.",
      "given": { "value": 3.00, "unit": "mol", "formula": "AlCl3" },
      "find": { "unit": "g", "formula": "CuCl2" },
      "steps": [
        { "num": { "value": 3, "unit": "mol", "formula": "CuCl2" }, "den": { "value": 2, "unit": "mol", "formula": "AlCl3" }, "kind": "mole-ratio" },
        { "num": { "value": 134.45, "unit": "g", "formula": "CuCl2" }, "den": { "value": 1, "unit": "mol", "formula": "CuCl2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 605, "unit": "g", "formula": "CuCl2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p048", "reaction": "r12", "type": "g-g", "difficulty": 3,
      "text": "A student mixes 67.2 g of CuCl₂ with plenty of Al. How many grams of AlCl₃ form?",
      "given": { "value": 67.2, "unit": "g", "formula": "CuCl2" },
      "find": { "unit": "g", "formula": "AlCl3" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "CuCl2" }, "den": { "value": 134.45, "unit": "g", "formula": "CuCl2" }, "kind": "molar-mass" },
        { "num": { "value": 2, "unit": "mol", "formula": "AlCl3" }, "den": { "value": 3, "unit": "mol", "formula": "CuCl2" }, "kind": "mole-ratio" },
        { "num": { "value": 133.33, "unit": "g", "formula": "AlCl3" }, "den": { "value": 1, "unit": "mol", "formula": "AlCl3" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 44.4, "unit": "g", "formula": "AlCl3", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p049", "reaction": "r13", "type": "mol-mol", "difficulty": 1,
      "text": "1.50 mol of Cu react with plenty of AgNO₃. How many moles of Ag form?",
      "given": { "value": 1.50, "unit": "mol", "formula": "Cu" },
      "find": { "unit": "mol", "formula": "Ag" },
      "steps": [
        { "num": { "value": 2, "unit": "mol", "formula": "Ag" }, "den": { "value": 1, "unit": "mol", "formula": "Cu" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 3.00, "unit": "mol", "formula": "Ag", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p050", "reaction": "r13", "type": "g-mol", "difficulty": 2,
      "text": "How many moles of Ag are produced when 63.5 g of Cu react with an excess of AgNO₃?",
      "given": { "value": 63.5, "unit": "g", "formula": "Cu" },
      "find": { "unit": "mol", "formula": "Ag" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "Cu" }, "den": { "value": 63.55, "unit": "g", "formula": "Cu" }, "kind": "molar-mass" },
        { "num": { "value": 2, "unit": "mol", "formula": "Ag" }, "den": { "value": 1, "unit": "mol", "formula": "Cu" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 2.00, "unit": "mol", "formula": "Ag", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p051", "reaction": "r13", "type": "mol-g", "difficulty": 2,
      "text": "A student mixes 0.500 mol of Cu with plenty of AgNO₃. How many grams of Cu(NO₃)₂ form?",
      "given": { "value": 0.500, "unit": "mol", "formula": "Cu" },
      "find": { "unit": "g", "formula": "Cu(NO3)2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "Cu(NO3)2" }, "den": { "value": 1, "unit": "mol", "formula": "Cu" }, "kind": "mole-ratio" },
        { "num": { "value": 187.57, "unit": "g", "formula": "Cu(NO3)2" }, "den": { "value": 1, "unit": "mol", "formula": "Cu(NO3)2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 93.8, "unit": "g", "formula": "Cu(NO3)2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p052", "reaction": "r13", "type": "g-g", "difficulty": 3,
      "text": "85.0 g of AgNO₃ react with plenty of Cu. How many grams of Cu(NO₃)₂ form?",
      "given": { "value": 85.0, "unit": "g", "formula": "AgNO3" },
      "find": { "unit": "g", "formula": "Cu(NO3)2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "AgNO3" }, "den": { "value": 169.88, "unit": "g", "formula": "AgNO3" }, "kind": "molar-mass" },
        { "num": { "value": 1, "unit": "mol", "formula": "Cu(NO3)2" }, "den": { "value": 2, "unit": "mol", "formula": "AgNO3" }, "kind": "mole-ratio" },
        { "num": { "value": 187.57, "unit": "g", "formula": "Cu(NO3)2" }, "den": { "value": 1, "unit": "mol", "formula": "Cu(NO3)2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 46.9, "unit": "g", "formula": "Cu(NO3)2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p053", "reaction": "r14", "type": "mol-mol", "difficulty": 1,
      "text": "How many moles of NaCl are produced when 2.00 mol of Na₂CO₃ react with an excess of CaCl₂?",
      "given": { "value": 2.00, "unit": "mol", "formula": "Na2CO3" },
      "find": { "unit": "mol", "formula": "NaCl" },
      "steps": [
        { "num": { "value": 2, "unit": "mol", "formula": "NaCl" }, "den": { "value": 1, "unit": "mol", "formula": "Na2CO3" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 4.00, "unit": "mol", "formula": "NaCl", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p054", "reaction": "r14", "type": "g-mol", "difficulty": 2,
      "text": "A student mixes 106 g of Na₂CO₃ with plenty of CaCl₂. How many moles of NaCl form?",
      "given": { "value": 106, "unit": "g", "formula": "Na2CO3" },
      "find": { "unit": "mol", "formula": "NaCl" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "Na2CO3" }, "den": { "value": 105.99, "unit": "g", "formula": "Na2CO3" }, "kind": "molar-mass" },
        { "num": { "value": 2, "unit": "mol", "formula": "NaCl" }, "den": { "value": 1, "unit": "mol", "formula": "Na2CO3" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 2.00, "unit": "mol", "formula": "NaCl", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p055", "reaction": "r14", "type": "mol-g", "difficulty": 2,
      "text": "How many grams of Na₂CO₃ are needed to make 0.750 mol of CaCO₃? Assume plenty of CaCl₂.",
      "given": { "value": 0.750, "unit": "mol", "formula": "CaCO3" },
      "find": { "unit": "g", "formula": "Na2CO3" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "Na2CO3" }, "den": { "value": 1, "unit": "mol", "formula": "CaCO3" }, "kind": "mole-ratio" },
        { "num": { "value": 105.99, "unit": "g", "formula": "Na2CO3" }, "den": { "value": 1, "unit": "mol", "formula": "Na2CO3" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 79.5, "unit": "g", "formula": "Na2CO3", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p056", "reaction": "r14", "type": "g-g", "difficulty": 3,
      "text": "A reaction makes 11.7 g of NaCl. How many grams of CaCl₂ were used up? There was plenty of Na₂CO₃.",
      "given": { "value": 11.7, "unit": "g", "formula": "NaCl" },
      "find": { "unit": "g", "formula": "CaCl2" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "NaCl" }, "den": { "value": 58.44, "unit": "g", "formula": "NaCl" }, "kind": "molar-mass" },
        { "num": { "value": 1, "unit": "mol", "formula": "CaCl2" }, "den": { "value": 2, "unit": "mol", "formula": "NaCl" }, "kind": "mole-ratio" },
        { "num": { "value": 110.98, "unit": "g", "formula": "CaCl2" }, "den": { "value": 1, "unit": "mol", "formula": "CaCl2" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 11.1, "unit": "g", "formula": "CaCl2", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p057", "reaction": "r15", "type": "mol-mol", "difficulty": 1,
      "text": "A student has 3.00 mol of NaOH. How many moles of H₂SO₄ will react with all of it?",
      "given": { "value": 3.00, "unit": "mol", "formula": "NaOH" },
      "find": { "unit": "mol", "formula": "H2SO4" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "H2SO4" }, "den": { "value": 2, "unit": "mol", "formula": "NaOH" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 1.50, "unit": "mol", "formula": "H2SO4", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p058", "reaction": "r15", "type": "g-mol", "difficulty": 2,
      "text": "80.0 g of NaOH react with plenty of H₂SO₄. How many moles of Na₂SO₄ form?",
      "given": { "value": 80.0, "unit": "g", "formula": "NaOH" },
      "find": { "unit": "mol", "formula": "Na2SO4" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "NaOH" }, "den": { "value": 40.00, "unit": "g", "formula": "NaOH" }, "kind": "molar-mass" },
        { "num": { "value": 1, "unit": "mol", "formula": "Na2SO4" }, "den": { "value": 2, "unit": "mol", "formula": "NaOH" }, "kind": "mole-ratio" }
      ],
      "answer": { "value": 1.00, "unit": "mol", "formula": "Na2SO4", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p059", "reaction": "r15", "type": "mol-g", "difficulty": 2,
      "text": "How many grams of Na₂SO₄ are produced when 0.250 mol of H₂SO₄ react with an excess of NaOH?",
      "given": { "value": 0.250, "unit": "mol", "formula": "H2SO4" },
      "find": { "unit": "g", "formula": "Na2SO4" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "Na2SO4" }, "den": { "value": 1, "unit": "mol", "formula": "H2SO4" }, "kind": "mole-ratio" },
        { "num": { "value": 142.05, "unit": "g", "formula": "Na2SO4" }, "den": { "value": 1, "unit": "mol", "formula": "Na2SO4" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 35.5, "unit": "g", "formula": "Na2SO4", "sigFigs": 3, "tolerancePct": 1 }
    },
    {
      "id": "p060", "reaction": "r15", "type": "g-g", "difficulty": 3,
      "text": "A student mixes 49.0 g of H₂SO₄ with plenty of NaOH. How many grams of Na₂SO₄ form?",
      "given": { "value": 49.0, "unit": "g", "formula": "H2SO4" },
      "find": { "unit": "g", "formula": "Na2SO4" },
      "steps": [
        { "num": { "value": 1, "unit": "mol", "formula": "H2SO4" }, "den": { "value": 98.09, "unit": "g", "formula": "H2SO4" }, "kind": "molar-mass" },
        { "num": { "value": 1, "unit": "mol", "formula": "Na2SO4" }, "den": { "value": 1, "unit": "mol", "formula": "H2SO4" }, "kind": "mole-ratio" },
        { "num": { "value": 142.05, "unit": "g", "formula": "Na2SO4" }, "den": { "value": 1, "unit": "mol", "formula": "Na2SO4" }, "kind": "molar-mass" }
      ],
      "answer": { "value": 71.0, "unit": "g", "formula": "Na2SO4", "sigFigs": 3, "tolerancePct": 1 }
    }
  ],
  "balancing": [
    { "id": "b01", "reactants": ["H2", "O2"], "products": ["H2O"], "coefficients": [2, 1, 2] },
    { "id": "b02", "reactants": ["N2", "H2"], "products": ["NH3"], "coefficients": [1, 3, 2] },
    { "id": "b03", "reactants": ["Na", "Cl2"], "products": ["NaCl"], "coefficients": [2, 1, 2] },
    { "id": "b04", "reactants": ["Al", "O2"], "products": ["Al2O3"], "coefficients": [4, 3, 2] },
    { "id": "b05", "reactants": ["Fe", "O2"], "products": ["Fe2O3"], "coefficients": [4, 3, 2] },
    { "id": "b06", "reactants": ["Mg", "O2"], "products": ["MgO"], "coefficients": [2, 1, 2] },
    { "id": "b07", "reactants": ["H2O2"], "products": ["H2O", "O2"], "coefficients": [2, 2, 1] },
    { "id": "b08", "reactants": ["KClO3"], "products": ["KCl", "O2"], "coefficients": [2, 2, 3] },
    { "id": "b09", "reactants": ["CH4", "O2"], "products": ["CO2", "H2O"], "coefficients": [1, 2, 1, 2] },
    { "id": "b10", "reactants": ["C3H8", "O2"], "products": ["CO2", "H2O"], "coefficients": [1, 5, 3, 4] },
    { "id": "b11", "reactants": ["C2H5OH", "O2"], "products": ["CO2", "H2O"], "coefficients": [1, 3, 2, 3] },
    { "id": "b12", "reactants": ["Zn", "HCl"], "products": ["ZnCl2", "H2"], "coefficients": [1, 2, 1, 1] },
    { "id": "b13", "reactants": ["Al", "CuCl2"], "products": ["AlCl3", "Cu"], "coefficients": [2, 3, 2, 3] },
    { "id": "b14", "reactants": ["Cu", "AgNO3"], "products": ["Cu(NO3)2", "Ag"], "coefficients": [1, 2, 1, 2] },
    { "id": "b15", "reactants": ["AgNO3", "CaCl2"], "products": ["AgCl", "Ca(NO3)2"], "coefficients": [2, 1, 2, 1] },
    { "id": "b16", "reactants": ["Na2CO3", "CaCl2"], "products": ["CaCO3", "NaCl"], "coefficients": [1, 1, 1, 2] },
    { "id": "b17", "reactants": ["H2SO4", "NaOH"], "products": ["Na2SO4", "H2O"], "coefficients": [1, 2, 1, 2] }
  ]
};
