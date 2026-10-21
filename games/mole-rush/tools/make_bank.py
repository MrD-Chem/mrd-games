#!/usr/bin/env python3
"""
Mole Rush question bank maker
=============================

WHAT IT DOES
  Writes  games/mole-rush/data/bank.js  (a classic script that sets the global
  window.MR_BANK) from the tables below, then CHECKS the result before and after
  saving it. The game never calculates chemistry itself; it only reads this bank.
  Nothing is random, so running the script twice gives the same file.

HOW TO RUN  (Python 3.6+, standard library only; no installs)
  From the mrd-games folder:

      python3 games/mole-rush/tools/make_bank.py          make bank.js, then verify it
      python3 games/mole-rush/tools/make_bank.py --check  only verify the bank.js already on disk
      python3 games/mole-rush/tools/make_bank.py --list   also print every problem and its setup

  If any check fails the script prints every problem it found, exits with an
  error, and does NOT overwrite bank.js. After a successful run, run
  `python3 tools/stamp_version.py` from the mrd-games folder like after any change.

WHAT TO EDIT (the three tables just below the helper code)
  REACTIONS   one line per reaction: id, friendly name, kind, balanced equation.
  PROBLEMS    one line per problem: reaction id, the given amount, what to find,
              difficulty. The script builds the wording, the dimensional-analysis
              steps and the answer. Give amounts with exactly 3 significant figures
              ("4.00 mol H2", "36.0 g H2O", "125 g CaCO3"; never "250 g", whose
              trailing zero is ambiguous).
  BALANCING   one line per balancing item, written balanced ("2 H2 + O2 -> 2 H2O").
  COMPOUND_NAMES  a friendly name for every formula used anywhere.
  Formulas are ASCII ("Ca(OH)2"); the student-facing text gets Unicode subscripts.

THE SCHEMA (window.MR_BANK)
  version, atomicMasses {element: mass}, compounds {formula: {name, molarMass}},
  reactions [{id, name, reactants[{formula, coef}], products[{formula, coef}]}],
  problems  [{id, reaction, type, text, given{value,unit,formula}, find{unit,formula},
              steps[{num{value,unit,formula}, den{...}, kind}],
              answer{value,unit,formula,sigFigs,tolerancePct}, difficulty}],
  balancing [{id, reactants[formula], products[formula], coefficients[...]}]
  Step order is always the standard chain:
      mol-mol  mole-ratio
      g-mol    molar-mass (1 mol X / M g X)  ->  mole-ratio
      mol-g    mole-ratio  ->  molar-mass (M g Y / 1 mol Y)
      g-g      molar-mass  ->  mole-ratio  ->  molar-mass
  answer.value = given x every step ratio, rounded to 3 significant figures,
  using the 2-decimal molar masses stored in the bank itself.

WHAT IS VERIFIED (all read back from the generated text, not from the tables)
  * exact key sets and types for every object; ids unique and well formed
  * every molar mass = sum of the rounded atomic masses, 2 decimals; no compound
    has more than 3 different elements; every formula used is in `compounds`
    and every compound is used
  * every reaction balances in lowest whole numbers (exact fractions)
  * every problem: type matches the units; steps follow the standard chain with
    the right coefficients and molar masses; units cancel from given to find;
    the given has exactly 3 significant figures and appears in the text; the
    answer recomputes exactly (no rounding ties); answers are 0.1 to 999; a
    student who rounds every intermediate value to 3 significant figures still
    lands inside tolerancePct; difficulty-1 problems stay friendly
  * every balancing item balances, is in lowest terms, has max coefficient 6 and
    a unique ratio (exact null space of the atom-count matrix has dimension 1)
  * counts: 12-15 reactions, 48-60 problems (each type 20-30%), 10-18 balancing items
  * every reaction that needs balancing also has a balancing item (so the classic hard
    ones such as 4 Fe + 3 O2 come up while balancing, not only while setting up); a
    reaction that is already 1 : 1 : 1 (CaCO3 -> CaO + CO2) has nothing to balance
"""

import json
import re
import sys
from decimal import Decimal
from fractions import Fraction
from functools import reduce
from math import gcd
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "data" / "bank.js"

SIG = 3                      # significant figures in givens and answers
TOLERANCE_PCT = 1            # answer.tolerancePct for every problem
ANSWER_MIN = Fraction(1, 10)     # answers must be at least this ...
ANSWER_MAX = Fraction(1000)      # ... and below this
MAX_COEF = 6                 # largest balancing coefficient
UNIT_WORD = {"mol": "moles", "g": "grams"}
TYPES = ("mol-mol", "g-mol", "mol-g", "g-g")
CHAINS = {
    "mol-mol": ["mole-ratio"],
    "g-mol": ["molar-mass", "mole-ratio"],
    "mol-g": ["mole-ratio", "molar-mass"],
    "g-g": ["molar-mass", "mole-ratio", "molar-mass"],
}

# --------------------------------------------------------------------------
# Atomic masses (rounded to 2 decimals; molar masses are always supplied)
# --------------------------------------------------------------------------
ATOMIC_MASSES = [
    ("H", "1.01"), ("C", "12.01"), ("N", "14.01"), ("O", "16.00"),
    ("Na", "22.99"), ("Mg", "24.31"), ("Al", "26.98"), ("S", "32.07"),
    ("Cl", "35.45"), ("K", "39.10"), ("Ca", "40.08"), ("Fe", "55.85"),
    ("Cu", "63.55"), ("Zn", "65.38"), ("Ag", "107.87"),
]

# --------------------------------------------------------------------------
# Friendly names for every formula used anywhere
# --------------------------------------------------------------------------
COMPOUND_NAMES = {
    "H2": "hydrogen gas", "O2": "oxygen gas", "H2O": "water",
    "N2": "nitrogen gas", "NH3": "ammonia",
    "Fe": "iron", "Fe2O3": "iron(III) oxide (rust)",
    "Mg": "magnesium", "MgO": "magnesium oxide",
    "H2O2": "hydrogen peroxide",
    "CaCO3": "calcium carbonate", "CaO": "calcium oxide", "CO2": "carbon dioxide",
    "KClO3": "potassium chlorate", "KCl": "potassium chloride",
    "CH4": "methane", "C3H8": "propane", "C2H5OH": "ethanol",
    "Zn": "zinc", "HCl": "hydrochloric acid", "ZnCl2": "zinc chloride",
    "Al": "aluminum", "CuCl2": "copper(II) chloride", "AlCl3": "aluminum chloride",
    "Cu": "copper", "AgNO3": "silver nitrate", "Cu(NO3)2": "copper(II) nitrate",
    "Ag": "silver",
    "Na2CO3": "sodium carbonate", "CaCl2": "calcium chloride", "NaCl": "sodium chloride",
    "H2SO4": "sulfuric acid", "NaOH": "sodium hydroxide", "Na2SO4": "sodium sulfate",
    "Na": "sodium", "Cl2": "chlorine gas", "Al2O3": "aluminum oxide",
    "AgCl": "silver chloride", "Ca(NO3)2": "calcium nitrate",
}

# --------------------------------------------------------------------------
# REACTIONS: (id, friendly name, kind, balanced equation). 15 reactions.
# kind is only used to word the problems; it is not stored in the bank.
# --------------------------------------------------------------------------
REACTIONS = [
    ("r01", "Making water", "synthesis", "2 H2 + O2 -> 2 H2O"),
    ("r02", "Making ammonia", "synthesis", "N2 + 3 H2 -> 2 NH3"),
    ("r03", "Rusting iron", "synthesis", "4 Fe + 3 O2 -> 2 Fe2O3"),
    ("r04", "Burning magnesium", "synthesis", "2 Mg + O2 -> 2 MgO"),
    ("r05", "Breaking down hydrogen peroxide", "decomposition", "2 H2O2 -> 2 H2O + O2"),
    ("r06", "Heating limestone", "decomposition", "CaCO3 -> CaO + CO2"),
    ("r07", "Making oxygen from potassium chlorate", "decomposition", "2 KClO3 -> 2 KCl + 3 O2"),
    ("r08", "Burning methane", "combustion", "CH4 + 2 O2 -> CO2 + 2 H2O"),
    ("r09", "Burning propane", "combustion", "C3H8 + 5 O2 -> 3 CO2 + 4 H2O"),
    ("r10", "Burning ethanol", "combustion", "C2H5OH + 3 O2 -> 2 CO2 + 3 H2O"),
    ("r11", "Zinc in acid", "single replacement", "Zn + 2 HCl -> ZnCl2 + H2"),
    ("r12", "Aluminum and copper chloride", "single replacement", "2 Al + 3 CuCl2 -> 2 AlCl3 + 3 Cu"),
    ("r13", "Growing a silver tree", "single replacement", "Cu + 2 AgNO3 -> Cu(NO3)2 + 2 Ag"),
    ("r14", "Making a chalky solid", "double replacement", "Na2CO3 + CaCl2 -> CaCO3 + 2 NaCl"),
    ("r15", "Neutralizing sulfuric acid", "double replacement", "H2SO4 + 2 NaOH -> Na2SO4 + 2 H2O"),
]

# --------------------------------------------------------------------------
# PROBLEMS: (reaction id, "<amount> <unit> <formula>" given, "<unit> <formula>" to find, difficulty)
# Difficulty 1 = friendly numbers and small coefficients, 3 = harder numbers.
# Ids are assigned in this order: p001, p002, ...
# --------------------------------------------------------------------------
PROBLEMS = [
    # r01  2 H2 + O2 -> 2 H2O
    ("r01", "4.00 mol H2", "mol O2", 1),
    ("r01", "36.0 g H2O", "mol H2", 1),
    ("r01", "2.00 mol O2", "g H2O", 1),
    ("r01", "6.00 g H2", "g O2", 2),
    # r02  N2 + 3 H2 -> 2 NH3
    ("r02", "3.00 mol N2", "mol NH3", 1),
    ("r02", "28.0 g N2", "mol H2", 2),
    ("r02", "4.50 mol H2", "g NH3", 2),
    ("r02", "62.5 g NH3", "g H2", 3),
    # r03  4 Fe + 3 O2 -> 2 Fe2O3
    ("r03", "6.00 mol Fe", "mol O2", 2),
    ("r03", "87.5 g Fe", "mol Fe2O3", 3),
    ("r03", "2.75 mol O2", "g Fe2O3", 3),
    ("r03", "64.0 g Fe", "g Fe2O3", 3),
    # r04  2 Mg + O2 -> 2 MgO
    ("r04", "5.00 mol Mg", "mol O2", 1),
    ("r04", "24.3 g Mg", "mol MgO", 1),
    ("r04", "3.00 mol Mg", "g MgO", 1),
    ("r04", "10.0 g Mg", "g O2", 2),
    # r05  2 H2O2 -> 2 H2O + O2
    ("r05", "4.00 mol H2O2", "mol O2", 1),
    ("r05", "34.0 g H2O2", "mol O2", 2),
    ("r05", "3.00 mol H2O2", "g H2O", 2),
    ("r05", "46.8 g H2O2", "g O2", 3),
    # r06  CaCO3 -> CaO + CO2
    ("r06", "2.50 mol CaCO3", "mol CO2", 1),
    ("r06", "125 g CaCO3", "mol CaO", 2),
    ("r06", "1.50 mol CaCO3", "g CO2", 2),
    ("r06", "88.0 g CO2", "g CaO", 3),
    # r07  2 KClO3 -> 2 KCl + 3 O2
    ("r07", "4.00 mol KClO3", "mol O2", 2),
    ("r07", "178 g KClO3", "mol O2", 3),
    ("r07", "2.50 mol KClO3", "g KCl", 2),
    ("r07", "37.5 g O2", "g KClO3", 3),
    # r08  CH4 + 2 O2 -> CO2 + 2 H2O
    ("r08", "3.00 mol CH4", "mol O2", 1),
    ("r08", "32.1 g CH4", "mol H2O", 2),
    ("r08", "2.00 mol CH4", "g CO2", 1),
    ("r08", "48.0 g CH4", "g H2O", 3),
    # r09  C3H8 + 5 O2 -> 3 CO2 + 4 H2O
    ("r09", "2.00 mol C3H8", "mol O2", 2),
    ("r09", "22.0 g C3H8", "mol CO2", 2),
    ("r09", "1.50 mol C3H8", "g CO2", 2),
    ("r09", "88.0 g CO2", "g O2", 3),
    # r10  C2H5OH + 3 O2 -> 2 CO2 + 3 H2O
    ("r10", "2.50 mol C2H5OH", "mol CO2", 1),
    ("r10", "46.1 g C2H5OH", "mol H2O", 2),
    ("r10", "6.00 mol O2", "g CO2", 2),
    ("r10", "23.0 g C2H5OH", "g CO2", 3),
    # r11  Zn + 2 HCl -> ZnCl2 + H2
    ("r11", "4.00 mol HCl", "mol H2", 1),
    ("r11", "65.4 g Zn", "mol HCl", 2),
    ("r11", "2.00 mol Zn", "g ZnCl2", 1),
    ("r11", "29.2 g HCl", "g ZnCl2", 3),
    # r12  2 Al + 3 CuCl2 -> 2 AlCl3 + 3 Cu
    ("r12", "6.00 mol CuCl2", "mol Al", 2),
    ("r12", "54.0 g Al", "mol Cu", 2),
    ("r12", "3.00 mol AlCl3", "g CuCl2", 2),
    ("r12", "67.2 g CuCl2", "g AlCl3", 3),
    # r13  Cu + 2 AgNO3 -> Cu(NO3)2 + 2 Ag
    ("r13", "1.50 mol Cu", "mol Ag", 1),
    ("r13", "63.5 g Cu", "mol Ag", 2),
    ("r13", "0.500 mol Cu", "g Cu(NO3)2", 2),
    ("r13", "85.0 g AgNO3", "g Cu(NO3)2", 3),
    # r14  Na2CO3 + CaCl2 -> CaCO3 + 2 NaCl
    ("r14", "2.00 mol Na2CO3", "mol NaCl", 1),
    ("r14", "106 g Na2CO3", "mol NaCl", 2),
    ("r14", "0.750 mol CaCO3", "g Na2CO3", 2),
    ("r14", "11.7 g NaCl", "g CaCl2", 3),
    # r15  H2SO4 + 2 NaOH -> Na2SO4 + 2 H2O
    ("r15", "3.00 mol NaOH", "mol H2SO4", 1),
    ("r15", "80.0 g NaOH", "mol Na2SO4", 2),
    ("r15", "0.250 mol H2SO4", "g Na2SO4", 2),
    ("r15", "49.0 g H2SO4", "g Na2SO4", 3),
]

# --------------------------------------------------------------------------
# BALANCING: written balanced; the game shows them without the coefficients.
# --------------------------------------------------------------------------
BALANCING = [
    "2 H2 + O2 -> 2 H2O",
    "N2 + 3 H2 -> 2 NH3",
    "2 Na + Cl2 -> 2 NaCl",
    "4 Al + 3 O2 -> 2 Al2O3",
    "4 Fe + 3 O2 -> 2 Fe2O3",
    "2 Mg + O2 -> 2 MgO",
    "2 H2O2 -> 2 H2O + O2",
    "2 KClO3 -> 2 KCl + 3 O2",
    "CH4 + 2 O2 -> CO2 + 2 H2O",
    "C3H8 + 5 O2 -> 3 CO2 + 4 H2O",
    "C2H5OH + 3 O2 -> 2 CO2 + 3 H2O",
    "Zn + 2 HCl -> ZnCl2 + H2",
    "2 Al + 3 CuCl2 -> 2 AlCl3 + 3 Cu",
    "Cu + 2 AgNO3 -> Cu(NO3)2 + 2 Ag",
    "2 AgNO3 + CaCl2 -> 2 AgCl + Ca(NO3)2",
    "Na2CO3 + CaCl2 -> CaCO3 + 2 NaCl",
    "H2SO4 + 2 NaOH -> Na2SO4 + 2 H2O",
]


# ==========================================================================
# Helpers: formulas, exact arithmetic, significant figures
# ==========================================================================
SUBSCRIPTS = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")


def pretty(formula):
    """ASCII formula -> Unicode subscripts: Ca(OH)2 -> Ca(OH)₂."""
    return formula.translate(SUBSCRIPTS)


def parse_formula(formula):
    """Element counts of a formula, handling parentheses: Ca(OH)2 -> {Ca:1, O:2, H:2}."""
    stack = [{}]
    i, n = 0, len(formula)

    def read_int(pos):
        j = pos
        while j < n and formula[j].isdigit():
            j += 1
        return (int(formula[pos:j]) if j > pos else 1), j

    while i < n:
        c = formula[i]
        if c == "(":
            stack.append({})
            i += 1
        elif c == ")":
            if len(stack) < 2:
                raise ValueError("unbalanced parentheses in " + formula)
            mult, i = read_int(i + 1)
            top = stack.pop()
            for el, k in top.items():
                stack[-1][el] = stack[-1].get(el, 0) + k * mult
        elif c.isupper():
            j = i + 1
            while j < n and formula[j].islower():
                j += 1
            el = formula[i:j]
            mult, i = read_int(j)
            stack[-1][el] = stack[-1].get(el, 0) + mult
        else:
            raise ValueError("bad character %r in formula %s" % (c, formula))
    if len(stack) != 1:
        raise ValueError("unbalanced parentheses in " + formula)
    return stack[0]


TERM = re.compile(r"^(\d*)\s*([A-Z(][A-Za-z0-9()]*)$")


def parse_equation(eq):
    """'2 H2 + O2 -> 2 H2O' -> ([('H2', 2), ('O2', 1)], [('H2O', 2)])."""
    left, right = eq.split("->")

    def side(s):
        out = []
        for term in s.split(" + "):
            m = TERM.match(term.strip())
            if not m:
                raise ValueError("cannot read %r in %r" % (term, eq))
            out.append((m.group(2), int(m.group(1) or 1)))
        return out

    return side(left), side(right)


def sig_round(x, n):
    """Round the positive Fraction x to n significant figures, halves rounding up.
    Returns (digits, exp10, tie): value = digits * 10**exp10, digits has n digits,
    tie is True when x sat exactly on a rounding boundary (ambiguous)."""
    if x <= 0:
        raise ValueError("sig_round needs a positive number")
    e = len(str(x.numerator)) - len(str(x.denominator))
    while Fraction(10) ** e > x:
        e -= 1
    while Fraction(10) ** (e + 1) <= x:
        e += 1
    q = x * Fraction(10) ** (n - 1 - e)
    fl = q.numerator // q.denominator
    rem = q - fl
    half = Fraction(1, 2)
    r = fl + (1 if rem >= half else 0)
    exp10 = e - (n - 1)
    if r == 10 ** n:
        r //= 10
        exp10 += 1
    return r, exp10, rem == half


def digits_to_str(r, exp10):
    """digits*10**exp10 written without exponent, keeping trailing zeros: (200,-2) -> '2.00'."""
    d = str(r)
    if exp10 >= 0:
        return d + "0" * exp10
    k = -exp10
    if k < len(d):
        return d[:-k] + "." + d[-k:]
    return "0." + "0" * (k - len(d)) + d


def sig_round_frac(x, n):
    r, exp10, _tie = sig_round(x, n)
    return Fraction(r) * Fraction(10) ** exp10


def rank(matrix):
    """Exact rank of a matrix of Fractions."""
    m = [row[:] for row in matrix]
    ncols = len(m[0]) if m else 0
    r = 0
    for c in range(ncols):
        piv = next((i for i in range(r, len(m)) if m[i][c] != 0), None)
        if piv is None:
            continue
        m[r], m[piv] = m[piv], m[r]
        for i in range(len(m)):
            if i != r and m[i][c] != 0:
                f = m[i][c] / m[r][c]
                m[i] = [a - f * b for a, b in zip(m[i], m[r])]
        r += 1
    return r


def atom_matrix(species, n_reactants):
    """Rows = elements, columns = species; reactants positive, products negative."""
    counts = [parse_formula(f) for f in species]
    elements = sorted({el for c in counts for el in c})
    return elements, [
        [Fraction(counts[j].get(el, 0) * (1 if j < n_reactants else -1)) for j in range(len(species))]
        for el in elements
    ]


def sig_count(d):
    return len(d.as_tuple().digits)


def is_int_literal(x):
    return isinstance(x, Decimal) and x.as_tuple().exponent == 0


# ==========================================================================
# Building the bank
# ==========================================================================
class Raw(str):
    """A number already formatted exactly as it should appear in the file."""


def j(v):
    """One-line JSON (also valid JavaScript). Raw strings are emitted untouched."""
    if isinstance(v, Raw):
        return str(v)
    if isinstance(v, bool):
        raise TypeError("no booleans in the bank")
    if isinstance(v, int):
        return str(v)
    if isinstance(v, str):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, (list, tuple)):
        return "[" + ", ".join(j(x) for x in v) + "]"
    if isinstance(v, dict):
        return "{ " + ", ".join("%s: %s" % (json.dumps(k), j(x)) for k, x in v.items()) + " }"
    raise TypeError("cannot write %r" % (v,))


def molar_mass_of(formula, masses):
    total = Decimal(0)
    for el, k in parse_formula(formula).items():
        total += masses[el] * k
    return total.quantize(Decimal("0.01"))


def make_text(idx, kind, reactants, gf, gstr, gu, ff, fu):
    """Student-facing wording. Three phrasings per situation, rotated by problem number."""
    v = idx % 3
    amt = "%s %s of %s" % (gstr, gu, pretty(gf))
    Y = pretty(ff)
    uw = UNIT_WORD[fu]
    rf = [f for f, _c in reactants]
    g_react, f_react = gf in rf, ff in rf

    if g_react and not f_react:                      # reactant -> product
        others = [x for x in rf if x != gf]
        O = " and ".join(pretty(x) for x in others)
        if not others:                               # decomposition
            return [
                "%s decompose completely. How many %s of %s form?" % (amt, uw, Y),
                "How many %s of %s are made when %s decompose completely?" % (uw, Y, amt),
                "A lab breaks down %s completely. How many %s of %s are produced?" % (amt, uw, Y),
            ][v]
        if kind == "combustion" and gf != "O2":      # the given reactant is the fuel
            return [
                "%s burn in plenty of %s. How many %s of %s form?" % (amt, O, uw, Y),
                "How many %s of %s are produced when %s burn completely in plenty of %s?" % (uw, Y, amt, O),
                "A student burns %s with plenty of %s. How many %s of %s form?" % (amt, O, uw, Y),
            ][v]
        return [
            "%s react with plenty of %s. How many %s of %s form?" % (amt, O, uw, Y),
            "How many %s of %s are produced when %s react with an excess of %s?" % (uw, Y, amt, O),
            "A student mixes %s with plenty of %s. How many %s of %s form?" % (amt, O, uw, Y),
        ][v]
    if g_react and f_react:                          # reactant -> other reactant
        return [
            "How many %s of %s are needed to react completely with %s?" % (uw, Y, amt),
            "How many %s of %s are used up when %s react completely?" % (uw, Y, amt),
            "A student has %s. How many %s of %s will react with all of it?" % (amt, uw, Y),
        ][v]
    if (not g_react) and f_react:                    # product -> reactant
        others = [x for x in rf if x != ff]
        O = " and ".join(pretty(x) for x in others)
        if not others:                               # decomposition
            return [
                "How many %s of %s must decompose to make %s?" % (uw, Y, amt),
                "A reaction produces %s as %s decomposes. How many %s of %s were used up?" % (amt, Y, uw, Y),
                "To collect %s, how many %s of %s must be broken down?" % (amt, uw, Y),
            ][v]
        return [
            "How many %s of %s are needed to make %s? Assume plenty of %s." % (uw, Y, amt, O),
            "A reaction makes %s. How many %s of %s were used up? There was plenty of %s." % (amt, uw, Y, O),
            "A student wants to make %s. How many %s of %s are needed, with plenty of %s?" % (amt, uw, Y, O),
        ][v]
    return [                                         # product -> other product
        "A reaction forms %s. How many %s of %s form at the same time?" % (amt, uw, Y),
        "How many %s of %s are made along with %s?" % (uw, Y, amt),
        "%s form in a reaction. How many %s of %s are produced at the same time?" % (amt, uw, Y),
    ][v]


def build_bank():
    masses = {el: Decimal(m) for el, m in ATOMIC_MASSES}

    # reactions (and the order in which formulas are first used)
    used = []
    reactions, rx_info = [], {}
    for rid, name, kind, eq in REACTIONS:
        reac, prod = parse_equation(eq)
        reactions.append({
            "id": rid, "name": name,
            "reactants": [{"formula": f, "coef": c} for f, c in reac],
            "products": [{"formula": f, "coef": c} for f, c in prod],
        })
        rx_info[rid] = (kind, reac, prod)
        for f, _c in reac + prod:
            if f not in used:
                used.append(f)

    balancing = []
    for n, eq in enumerate(BALANCING, 1):
        reac, prod = parse_equation(eq)
        balancing.append({
            "id": "b%02d" % n,
            "reactants": [f for f, _c in reac],
            "products": [f for f, _c in prod],
            "coefficients": [c for _f, c in reac + prod],
        })
        for f, _c in reac + prod:
            if f not in used:
                used.append(f)

    compounds = {}
    for f in used:
        if f not in COMPOUND_NAMES:
            raise SystemExit("make_bank: no friendly name for %s in COMPOUND_NAMES" % f)
        compounds[f] = {"name": COMPOUND_NAMES[f], "molarMass": Raw(format(molar_mass_of(f, masses), "f"))}

    problems = []
    for idx, (rid, given_s, find_s, diff) in enumerate(PROBLEMS):
        kind, reac, prod = rx_info[rid]
        gstr, gu, gf = given_s.split()
        fu, ff = find_s.split()
        coef = dict(reac + prod)
        if gf not in coef or ff not in coef or gf == ff:
            raise SystemExit("make_bank: problem %d (%s %s -> %s) uses formulas not in reaction %s" % (idx + 1, given_s, find_s, rid))
        steps = []

        def step(num, den, kind_):
            def side(s):
                value, unit, formula = s
                v = Raw(format(value, "f")) if isinstance(value, Decimal) else value
                return {"value": v, "unit": unit, "formula": formula}
            steps.append({"num": side(num), "den": side(den), "kind": kind_})

        if gu == "g":
            step((1, "mol", gf), (molar_mass_of(gf, masses), "g", gf), "molar-mass")
        step((coef[ff], "mol", ff), (coef[gf], "mol", gf), "mole-ratio")
        if fu == "g":
            step((molar_mass_of(ff, masses), "g", ff), (1, "mol", ff), "molar-mass")

        # exact answer
        x = Fraction(Decimal(gstr))
        for s in steps:
            num = s["num"]["value"]
            den = s["den"]["value"]
            x *= Fraction(Decimal(str(num))) / Fraction(Decimal(str(den)))
        r, exp10, tie = sig_round(x, SIG)
        if tie:
            raise SystemExit("make_bank: problem %d (%s -> %s) lands exactly on a rounding boundary; change the given amount" % (idx + 1, given_s, find_s))

        problems.append({
            "id": "p%03d" % (idx + 1),
            "reaction": rid,
            "type": "%s-%s" % (gu, fu),
            "text": make_text(idx, kind, reac, gf, gstr, gu, ff, fu),
            "given": {"value": Raw(gstr), "unit": gu, "formula": gf},
            "find": {"unit": fu, "formula": ff},
            "steps": steps,
            "answer": {"value": Raw(digits_to_str(r, exp10)), "unit": fu, "formula": ff,
                       "sigFigs": SIG, "tolerancePct": TOLERANCE_PCT},
            "difficulty": diff,
        })

    return {
        "version": 1,
        "atomicMasses": {el: Raw(m) for el, m in ATOMIC_MASSES},
        "compounds": compounds,
        "reactions": reactions,
        "problems": problems,
        "balancing": balancing,
    }


HEADER = """\
/* Mole Rush question bank.
   GENERATED FILE: do not edit by hand. Edit tools/make_bank.py and run it again:
       python3 games/mole-rush/tools/make_bank.py
   Classic script: it sets the global window.MR_BANK (no modules, no network).
   Formulas are ASCII ("Ca(OH)2"); the game draws the subscripts.
   Every number here was re-checked by the script (molar masses, balancing,
   step chains, answers) before this file was written. */
"""


def render(bank):
    L = [HEADER + "window.MR_BANK = {", '  "version": %s,' % j(bank["version"]), '  "atomicMasses": {']
    items = ['%s: %s' % (json.dumps(k), j(v)) for k, v in bank["atomicMasses"].items()]
    for i in range(0, len(items), 5):
        chunk = ", ".join(items[i:i + 5])
        L.append("    " + chunk + ("," if i + 5 < len(items) else ""))
    L.append("  },")

    L.append('  "compounds": {')
    cs = list(bank["compounds"].items())
    for i, (f, c) in enumerate(cs):
        L.append("    %s: %s%s" % (json.dumps(f), j(c), "," if i < len(cs) - 1 else ""))
    L.append("  },")

    L.append('  "reactions": [')
    for i, r in enumerate(bank["reactions"]):
        L.append("    %s%s" % (j(r), "," if i < len(bank["reactions"]) - 1 else ""))
    L.append("  ],")

    L.append('  "problems": [')
    n = len(bank["problems"])
    for i, p in enumerate(bank["problems"]):
        L.append("    {")
        L.append('      "id": %s, "reaction": %s, "type": %s, "difficulty": %s,' % (j(p["id"]), j(p["reaction"]), j(p["type"]), j(p["difficulty"])))
        L.append('      "text": %s,' % j(p["text"]))
        L.append('      "given": %s,' % j(p["given"]))
        L.append('      "find": %s,' % j(p["find"]))
        L.append('      "steps": [')
        for k, s in enumerate(p["steps"]):
            L.append("        %s%s" % (j(s), "," if k < len(p["steps"]) - 1 else ""))
        L.append("      ],")
        L.append('      "answer": %s' % j(p["answer"]))
        L.append("    }" + ("," if i < n - 1 else ""))
    L.append("  ],")

    L.append('  "balancing": [')
    for i, b in enumerate(bank["balancing"]):
        L.append("    %s%s" % (j(b), "," if i < len(bank["balancing"]) - 1 else ""))
    L.append("  ]")
    L.append("};")
    return "\n".join(L) + "\n"


# ==========================================================================
# Verification (reads the generated TEXT back, exactly as a browser would see it)
# ==========================================================================
MARKER = "window.MR_BANK = "


def load_bank(text):
    start = text.index(MARKER) + len(MARKER)
    stripped = text.rstrip()
    if not stripped.endswith("};"):
        raise ValueError("bank.js must end with '};'")
    body = stripped[start:-1]
    return json.loads(body, parse_float=Decimal, parse_int=Decimal)


def verify(text):
    """Returns (errors, report_lines, stats)."""
    errors = []
    report = []

    def err(msg):
        errors.append(msg)

    try:
        bank = load_bank(text)
    except Exception as ex:  # parse failure is fatal
        return ["cannot parse bank.js: %s" % ex], [], {}

    def keys(obj, expected, where):
        if not isinstance(obj, dict):
            err("%s: expected an object" % where)
            return False
        if set(obj) != set(expected):
            err("%s: keys %s differ from schema %s" % (where, sorted(obj), sorted(expected)))
            return False
        return True

    if not keys(bank, ["version", "atomicMasses", "compounds", "reactions", "problems", "balancing"], "bank"):
        return errors, report, {}
    if bank["version"] != 1:
        err("version must be 1")

    # ---- atomic masses
    masses = {}
    for el, m in bank["atomicMasses"].items():
        if not (isinstance(m, Decimal) and m.as_tuple().exponent == -2 and m > 0):
            err("atomicMasses[%s] must be a number with exactly 2 decimals, got %r" % (el, m))
        else:
            masses[el] = m

    # ---- compounds
    compounds = {}
    for f, c in bank["compounds"].items():
        if not keys(c, ["name", "molarMass"], "compounds[%s]" % f):
            continue
        try:
            counts = parse_formula(f)
        except ValueError as ex:
            err("compounds[%s]: %s" % (f, ex))
            continue
        if len(counts) > 3:
            err("compounds[%s] has %d different elements (max 3)" % (f, len(counts)))
        missing = [el for el in counts if el not in masses]
        if missing:
            err("compounds[%s]: no atomic mass for %s" % (f, missing))
            continue
        want = sum((masses[el] * k for el, k in counts.items()), Decimal(0)).quantize(Decimal("0.01"))
        mm = c["molarMass"]
        if not isinstance(mm, Decimal) or mm != want or mm.as_tuple().exponent != -2:
            err("compounds[%s].molarMass is %s but the rounded atomic masses give %s" % (f, mm, want))
        if not isinstance(c["name"], str) or not c["name"].strip():
            err("compounds[%s] needs a friendly name" % f)
        compounds[f] = mm

    used_formulas = set()

    def need(formula, where):
        used_formulas.add(formula)
        if formula not in compounds:
            err("%s: formula %s is not in compounds" % (where, formula))

    # ---- reactions
    rx = {}
    rids = []
    for r in bank["reactions"]:
        if not keys(r, ["id", "name", "reactants", "products"], "reaction"):
            continue
        rid = r["id"]
        where = "reaction %s" % rid
        if not re.fullmatch(r"r\d{2}", rid):
            err("%s: id must look like r01" % where)
        rids.append(rid)
        if not r["name"].strip():
            err("%s: needs a friendly name" % where)
        coefs, species, ok = {}, [], True
        for side in ("reactants", "products"):
            if not r[side]:
                err("%s: no %s" % (where, side))
                ok = False
            for t in r[side]:
                if not keys(t, ["formula", "coef"], where + " " + side):
                    ok = False
                    continue
                need(t["formula"], where)
                if not is_int_literal(t["coef"]) or t["coef"] < 1:
                    err("%s: coefficient of %s must be a whole number >= 1" % (where, t["formula"]))
                    ok = False
                    continue
                if t["formula"] in coefs:
                    err("%s: %s appears twice" % (where, t["formula"]))
                    ok = False
                coefs[t["formula"]] = int(t["coef"])
                species.append(t["formula"])
        if not ok:
            continue
        nreac = len(r["reactants"])
        if reduce(gcd, coefs.values()) != 1:
            err("%s: coefficients are not in lowest terms" % where)
        try:
            elements, mat = atom_matrix(species, nreac)
        except ValueError as ex:
            err("%s: %s" % (where, ex))
            continue
        vec = [Fraction(coefs[f]) for f in species]
        for el, row in zip(elements, mat):
            if sum(a * b for a, b in zip(row, vec)) != 0:
                err("%s is NOT balanced (element %s)" % (where, el))
        if len(species) - rank(mat) != 1:
            err("%s: balancing ratio is not unique" % where)
        rx[rid] = {"coefs": coefs, "reactants": [t["formula"] for t in r["reactants"]],
                   "products": [t["formula"] for t in r["products"]], "name": r["name"]}
    if len(set(rids)) != len(rids):
        err("duplicate reaction ids")
    if not 12 <= len(bank["reactions"]) <= 15:
        err("need 12-15 reactions, have %d" % len(bank["reactions"]))

    # ---- problems
    pids = []
    seen_text, seen_key = set(), set()
    per_rx = {rid: {"types": dict.fromkeys(TYPES, 0), "diff": {1: 0, 2: 0, 3: 0}} for rid in rx}
    type_counts = dict.fromkeys(TYPES, 0)
    diff_counts = {1: 0, 2: 0, 3: 0}
    answers = []
    worst_student = Fraction(0)
    worst_pid = None

    for p in bank["problems"]:
        if not keys(p, ["id", "reaction", "type", "text", "given", "find", "steps", "answer", "difficulty"], "problem"):
            continue
        pid = p["id"]
        where = "problem %s" % pid
        pids.append(pid)
        if not re.fullmatch(r"p\d{3}", pid):
            err("%s: id must look like p001" % where)
        if p["reaction"] not in rx:
            err("%s: unknown reaction %s" % (where, p["reaction"]))
            continue
        R = rx[p["reaction"]]
        ok = (keys(p["given"], ["value", "unit", "formula"], where + " given")
              and keys(p["find"], ["unit", "formula"], where + " find")
              and keys(p["answer"], ["value", "unit", "formula", "sigFigs", "tolerancePct"], where + " answer"))
        if not ok:
            continue
        g, fd, ans = p["given"], p["find"], p["answer"]

        # type, units, formulas
        if p["type"] not in TYPES:
            err("%s: type %r is not one of %s" % (where, p["type"], TYPES))
            continue
        if g["unit"] not in UNIT_WORD or fd["unit"] not in UNIT_WORD:
            err("%s: units must be mol or g" % where)
            continue
        if p["type"] != "%s-%s" % (g["unit"], fd["unit"]):
            err("%s: type %s does not match units %s -> %s" % (where, p["type"], g["unit"], fd["unit"]))
        need(g["formula"], where)
        need(fd["formula"], where)
        for role, f in (("given", g["formula"]), ("find", fd["formula"])):
            if f not in R["coefs"]:
                err("%s: %s formula %s is not in reaction %s" % (where, role, f, p["reaction"]))
        if g["formula"] == fd["formula"]:
            err("%s: given and find are the same substance" % where)
        if p["difficulty"] not in (1, 2, 3) or not is_int_literal(p["difficulty"]):
            err("%s: difficulty must be 1, 2 or 3" % where)
            continue
        diff = int(p["difficulty"])

        # given: exactly 3 significant figures, unambiguous
        gv = g["value"]
        if not isinstance(gv, Decimal) or gv <= 0:
            err("%s: given value must be a positive number" % where)
            continue
        if sig_count(gv) != SIG:
            err("%s: given %s must have exactly %d significant figures" % (where, gv, SIG))
        if gv.as_tuple().exponent >= 0 and gv.as_tuple().digits[-1] == 0:
            err("%s: given %s has an ambiguous trailing zero" % (where, gv))
        gstr = format(gv, "f")

        # text
        ptext = p["text"]
        if not isinstance(ptext, str) or not ptext.strip():
            err("%s: empty text" % where)
            continue
        amt = "%s %s of %s" % (gstr, g["unit"], pretty(g["formula"]))
        if amt not in ptext:
            err("%s: text does not contain the given amount %r" % (where, amt))
        if pretty(fd["formula"]) not in ptext:
            err("%s: text does not mention %s" % (where, pretty(fd["formula"])))
        if "How many %s" % UNIT_WORD[fd["unit"]] not in ptext and "how many %s" % UNIT_WORD[fd["unit"]] not in ptext:
            err("%s: text does not ask 'how many %s'" % (where, UNIT_WORD[fd["unit"]]))
        if re.search(r"[A-Za-z)]\d", ptext):
            err("%s: text has an ASCII subscript digit: %r" % (where, ptext))
        if "?" not in ptext or len(ptext) > 170:
            err("%s: text must be a question of at most 170 characters (is %d)" % (where, len(ptext)))
        if ptext in seen_text:
            err("%s: duplicate text" % where)
        seen_text.add(ptext)
        key = (p["reaction"], gstr, g["unit"], g["formula"], fd["unit"], fd["formula"])
        if key in seen_key:
            err("%s: duplicate problem %s" % (where, key))
        seen_key.add(key)

        # steps
        steps = p["steps"]
        kinds = [s.get("kind") if isinstance(s, dict) else None for s in steps]
        if kinds != CHAINS[p["type"]]:
            err("%s: step kinds %s differ from the standard chain %s" % (where, kinds, CHAINS[p["type"]]))
            continue
        cur = (g["unit"], g["formula"])
        ratio = Fraction(1)
        sdata = []
        step_ok = True
        max_coef = 1
        for k, s in enumerate(steps):
            if not keys(s, ["num", "den", "kind"], where + " step %d" % (k + 1)):
                step_ok = False
                break
            if not (keys(s["num"], ["value", "unit", "formula"], where + " step num")
                    and keys(s["den"], ["value", "unit", "formula"], where + " step den")):
                step_ok = False
                break
            n, d = s["num"], s["den"]
            for part in (n, d):
                need(part["formula"], where)
                if not isinstance(part["value"], Decimal) or part["value"] <= 0:
                    err("%s step %d: values must be positive numbers" % (where, k + 1))
                    step_ok = False
            if not step_ok:
                break
            if (d["unit"], d["formula"]) != cur:
                err("%s step %d: units do not cancel: denominator %s %s but the running unit is %s %s"
                    % (where, k + 1, d["unit"], d["formula"], cur[0], cur[1]))
                step_ok = False
                break
            if s["kind"] == "mole-ratio":
                if n["unit"] != "mol" or d["unit"] != "mol" or n["formula"] == d["formula"]:
                    err("%s step %d: mole ratio must be mol of one substance over mol of another" % (where, k + 1))
                for part in (n, d):
                    want = R["coefs"].get(part["formula"])
                    if not is_int_literal(part["value"]) or want is None or int(part["value"]) != want:
                        err("%s step %d: mole-ratio coefficient for %s is %s but the balanced equation says %s"
                            % (where, k + 1, part["formula"], part["value"], want))
                    else:
                        max_coef = max(max_coef, want)
            else:  # molar-mass
                if n["formula"] != d["formula"] or {n["unit"], d["unit"]} != {"g", "mol"}:
                    err("%s step %d: molar-mass step must pair g and mol of ONE substance" % (where, k + 1))
                else:
                    gside, mside = (n, d) if n["unit"] == "g" else (d, n)
                    if gside["value"] != compounds.get(gside["formula"]):
                        err("%s step %d: molar mass of %s is %s but compounds says %s"
                            % (where, k + 1, gside["formula"], gside["value"], compounds.get(gside["formula"])))
                    if not (is_int_literal(mside["value"]) and mside["value"] == 1):
                        err("%s step %d: the mol side of a molar-mass step must be 1" % (where, k + 1))
            ratio *= Fraction(n["value"]) / Fraction(d["value"])
            sdata.append((Fraction(n["value"]), Fraction(d["value"])))
            cur = (n["unit"], n["formula"])
        if not step_ok:
            continue
        if cur != (fd["unit"], fd["formula"]):
            err("%s: steps end in %s %s but the problem asks for %s %s" % (where, cur[0], cur[1], fd["unit"], fd["formula"]))
            continue

        # answer
        if ans["unit"] != fd["unit"] or ans["formula"] != fd["formula"]:
            err("%s: answer unit/formula differ from find" % where)
        if ans["sigFigs"] != SIG or not is_int_literal(ans["sigFigs"]):
            err("%s: answer.sigFigs must be %d" % (where, SIG))
        if ans["tolerancePct"] != TOLERANCE_PCT:
            err("%s: answer.tolerancePct must be %d" % (where, TOLERANCE_PCT))
        av = ans["value"]
        if not isinstance(av, Decimal) or av <= 0:
            err("%s: answer value must be a positive number" % where)
            continue
        exact = Fraction(gv) * ratio
        r_, e_, tie = sig_round(exact, SIG)
        if tie:
            err("%s: exact answer %s sits on a rounding boundary" % (where, float(exact)))
        if Fraction(r_) * Fraction(10) ** e_ != Fraction(av):
            err("%s: answer %s does not match the recomputed value %s" % (where, av, digits_to_str(r_, e_)))
        if sig_count(av) != SIG:
            err("%s: answer %s must be written with %d significant figures" % (where, av, SIG))
        if not (ANSWER_MIN <= Fraction(av) < ANSWER_MAX):
            err("%s: answer %s is outside 0.1 to 999" % (where, av))
        answers.append(float(av))

        # a student who rounds every intermediate value to 3 s.f. must still be accepted
        cur_v = Fraction(gv)
        for n_, d_ in sdata:
            cur_v = sig_round_frac(cur_v * n_ / d_, SIG)
        dev = abs(cur_v - Fraction(av)) / Fraction(av)
        if dev > Fraction(TOLERANCE_PCT, 100):
            err("%s: rounding each step to %d s.f. gives %s, %.2f%% away from %s (tolerance %d%%)"
                % (where, SIG, float(cur_v), float(dev) * 100, av, TOLERANCE_PCT))
        if dev > worst_student:
            worst_student, worst_pid = dev, pid

        # difficulty 1 stays friendly
        if diff == 1:
            if p["type"] == "g-g":
                err("%s: a difficulty-1 problem should not be g-g" % where)
            if max_coef > 2:
                err("%s: difficulty 1 needs coefficients of 1 or 2 only" % where)
            moles = Fraction(gv) if g["unit"] == "mol" else Fraction(gv) / Fraction(compounds[g["formula"]])
            half_steps = moles * 2
            if abs(half_steps - round(half_steps)) > Fraction(5, 1000) * half_steps:
                err("%s: difficulty-1 starting amount is %s mol, not a friendly multiple of 0.5 mol" % (where, float(moles)))
            if fd["unit"] == "mol" and (Fraction(av) * 2).denominator != 1:
                err("%s: difficulty-1 mole answer %s should be a multiple of 0.5" % (where, av))

        type_counts[p["type"]] += 1
        diff_counts[diff] += 1
        per_rx[p["reaction"]]["types"][p["type"]] += 1
        per_rx[p["reaction"]]["diff"][diff] += 1

    if len(set(pids)) != len(pids):
        err("duplicate problem ids")
    total = len(bank["problems"])
    if not 48 <= total <= 60:
        err("need 48-60 problems, have %d" % total)
    for t, cnt in type_counts.items():
        if total and not (0.20 <= cnt / total <= 0.30):
            err("type %s is %d of %d problems (%.0f%%); aim for about 25%%" % (t, cnt, total, 100.0 * cnt / total))
    for rid, d in per_rx.items():
        if sum(d["types"].values()) < 3:
            err("reaction %s has fewer than 3 problems" % rid)
    for dv, cnt in diff_counts.items():
        if cnt < 10:
            err("difficulty %d has only %d problems" % (dv, cnt))

    # ---- balancing
    bids = []
    seen_eq = set()
    nb = len(bank["balancing"])
    if not 10 <= nb <= 18:
        err("need 10-18 balancing items, have %d" % nb)
    max_bcoef = 0
    for b in bank["balancing"]:
        if not keys(b, ["id", "reactants", "products", "coefficients"], "balancing item"):
            continue
        bid = b["id"]
        where = "balancing %s" % bid
        bids.append(bid)
        if not re.fullmatch(r"b\d{2}", bid):
            err("%s: id must look like b01" % where)
        species = list(b["reactants"]) + list(b["products"])
        if not b["reactants"] or not b["products"]:
            err("%s: needs reactants and products" % where)
            continue
        if len(set(species)) != len(species):
            err("%s: a formula appears twice" % where)
        for f in species:
            need(f, where)
        co = b["coefficients"]
        if len(co) != len(species) or not all(is_int_literal(c) for c in co):
            err("%s: coefficients must be %d whole numbers" % (where, len(species)))
            continue
        co = [int(c) for c in co]
        if min(co) < 1 or max(co) > MAX_COEF:
            err("%s: coefficients must be between 1 and %d" % (where, MAX_COEF))
        if reduce(gcd, co) != 1:
            err("%s: coefficients are not in lowest terms" % where)
        if all(c == 1 for c in co):
            err("%s: all coefficients are 1 (nothing to balance)" % where)
        try:
            elements, mat = atom_matrix(species, len(b["reactants"]))
        except ValueError as ex:
            err("%s: %s" % (where, ex))
            continue
        vec = [Fraction(c) for c in co]
        for el, row in zip(elements, mat):
            if sum(a * x for a, x in zip(row, vec)) != 0:
                err("%s is NOT balanced (element %s)" % (where, el))
        if len(species) - rank(mat) != 1:
            err("%s: balancing ratio is not unique (null space dimension %d)" % (where, len(species) - rank(mat)))
        sig = (tuple(sorted(b["reactants"])), tuple(sorted(b["products"])))
        if sig in seen_eq:
            err("%s: duplicate equation" % where)
        seen_eq.add(sig)
        max_bcoef = max([max_bcoef] + co)
    if len(set(bids)) != len(bids):
        err("duplicate balancing ids")
    # every reaction that needs balancing (not already 1:1:1) also has a balancing item
    for rid, R in rx.items():
        if all(c == 1 for c in R["coefs"].values()):
            continue
        if (tuple(sorted(R["reactants"])), tuple(sorted(R["products"]))) not in seen_eq:
            err("reaction %s (%s) has no balancing item" % (rid, R["name"]))

    # ---- every compound is used, every used formula exists
    unused = [f for f in compounds if f not in used_formulas]
    if unused:
        err("compounds never used: %s" % unused)
    used_el = {el for f in compounds for el in parse_formula(f)}
    unused_el = [el for el in masses if el not in used_el]
    if unused_el:
        err("atomic masses never used: %s" % unused_el)

    stats = {
        "reactions": len(bank["reactions"]), "compounds": len(compounds), "problems": total,
        "types": type_counts, "difficulty": diff_counts, "balancing": nb,
        "worst_student_pct": float(worst_student) * 100, "worst_pid": worst_pid,
        "answer_min": min(answers) if answers else None, "answer_max": max(answers) if answers else None,
        "max_balancing_coef": max_bcoef, "bytes": len(text.encode("utf-8")),
    }

    # ---- summary table
    kind_by_id = {rid: kind for rid, _n, kind, _eq in REACTIONS}
    report.append("%-4s %-40s %-19s %3s %3s %3s %3s | %3s %3s %3s | %3s" % (
        "id", "reaction", "kind", "m-m", "g-m", "m-g", "g-g", "d1", "d2", "d3", "all"))
    report.append("-" * 104)
    for rid in rx:
        d = per_rx[rid]
        t = d["types"]
        report.append("%-4s %-40s %-19s %3d %3d %3d %3d | %3d %3d %3d | %3d" % (
            rid, rx[rid]["name"][:40], kind_by_id.get(rid, ""), t["mol-mol"], t["g-mol"], t["mol-g"], t["g-g"],
            d["diff"][1], d["diff"][2], d["diff"][3], sum(t.values())))
    report.append("-" * 104)
    report.append("%-4s %-40s %-19s %3d %3d %3d %3d | %3d %3d %3d | %3d" % (
        "", "TOTAL", "", type_counts["mol-mol"], type_counts["g-mol"], type_counts["mol-g"], type_counts["g-g"],
        diff_counts[1], diff_counts[2], diff_counts[3], total))
    report.append("")
    report.append("reactions: %d   compounds: %d   problems: %d   balancing items: %d (max coefficient %d)" % (
        stats["reactions"], stats["compounds"], total, nb, max_bcoef))
    if total:
        report.append("type share: " + ", ".join("%s %d%%" % (t, round(100.0 * c / total)) for t, c in type_counts.items()))
        report.append("answers range from %g to %g" % (stats["answer_min"], stats["answer_max"]))
        report.append("worst case for a student rounding every step to 3 s.f.: %.2f%% off (%s), tolerance is %d%%" % (
            stats["worst_student_pct"], worst_pid, TOLERANCE_PCT))
    report.append("bank.js size: %d bytes" % stats["bytes"])
    return errors, report, stats


def list_problems(text):
    bank = load_bank(text)
    for p in bank["problems"]:
        g, fd = p["given"], p["find"]
        chain = " x ".join("(%s %s %s / %s %s %s)" % (
            format(s["num"]["value"], "f"), s["num"]["unit"], pretty(s["num"]["formula"]),
            format(s["den"]["value"], "f"), s["den"]["unit"], pretty(s["den"]["formula"])) for s in p["steps"])
        a = p["answer"]
        print("%s [%s d%s %s]" % (p["id"], p["type"], p["difficulty"], p["reaction"]))
        print("   " + p["text"])
        print("   %s %s %s  x  %s" % (format(g["value"], "f"), g["unit"], pretty(g["formula"]), chain))
        print("   = %s %s %s" % (format(a["value"], "f"), a["unit"], pretty(a["formula"])))
    print("")
    for b in bank["balancing"]:
        sides = []
        n = 0
        for group in (b["reactants"], b["products"]):
            terms = []
            for f in group:
                c = int(b["coefficients"][n]); n += 1
                terms.append((str(c) + " " if c != 1 else "") + pretty(f))
            sides.append(" + ".join(terms))
        print("%s  %s" % (b["id"], " → ".join(sides)))


def main(argv):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    check_only = "--check" in argv
    if check_only:
        text = OUT.read_text(encoding="utf-8")
    else:
        text = render(build_bank())

    errors, report, _stats = verify(text)
    print("\n".join(report))
    if errors:
        print("\nFAILED: %d problem(s) found" % len(errors))
        for e in errors:
            print("  - " + e)
        if not check_only:
            print("bank.js was NOT written.")
        return 1

    if not check_only:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(text, encoding="utf-8")
        again = OUT.read_text(encoding="utf-8")
        errors2, _r, _s = verify(again)
        if errors2 or again != text:
            print("\nFAILED: the file read back from disk does not verify")
            for e in errors2:
                print("  - " + e)
            return 1
        print("\nWrote %s" % OUT)
        print("Re-read from disk and verified again: OK")
    else:
        print("\nChecked %s" % OUT)
    if "--list" in argv:
        print("")
        list_problems(text)
    print("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
