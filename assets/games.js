/*
 * Mr. D Chemistry — GAMES: THE LIST OF SUBJECTS, UNITS AND GAMES
 * ==============================================================
 * The games page is one page with a tab for each subject:
 *
 *     SUBJECT   a tab on the games page (e.g. "Chemistry")
 *       └─ UNIT    a heading under the tabs
 *            └─ GAME   a card under the unit heading
 *
 * Every card on the site is drawn from this one list, so this is the only file
 * you edit to add, rename, move or hide a game. Tabs appear in the order of the list.
 *
 * Paths are always written from the TOP of the site, for example "games/mole-match/",
 * even though the page may be one folder down (chemistry/). The site adds the
 * "../" by itself.
 *
 * ---------------------------------------------------------------------------------
 * HOW TO ADD A GAME (to a unit that already exists)
 *   1. Put the game in its own folder inside "games", with an index.html in it.
 *      Example: games/mole-match/index.html
 *      (Easiest start: copy the games/quiz-dash folder and rename it.)
 *   2. Find the unit below. Inside its  games: [ ... ]  list, copy one game
 *      (from the { to the }, plus the comma after it), paste it after the last
 *      game and change the values:
 *        id     – short unique name, lowercase-with-dashes         e.g. "mole-match"
 *        title  – the name shown on the card                        e.g. "Mole Match"
 *        blurb  – one short sentence about the game
 *        path   – the game's folder, from the top of the site,
 *                 ending with "/"                                    e.g. "games/mole-match/"
 *        cover  – the card's picture: a 16:9 image (the covers are SVGs drawn on a
 *                 320 x 180 canvas), usually "assets/covers/<id>.svg"
 *                 e.g. "assets/covers/mole-match.svg". If the file is missing the card
 *                 shows the emoji below instead, so nothing breaks.
 *        status – "ready"        the whole card is a link to the game
 *                 "coming-soon"  shows a grey "Coming soon" badge (no link)
 *        icon   – one emoji (shown when there is no cover picture)
 *        accent – card colour: "teal", "amber" or "violet"
 *   3. In the game's own index.html, point its "←" link back at its subject page,
 *      e.g.  <a class="header-link" href="../../chemistry/">← Chemistry</a>
 *      (that address opens the games page with the Chemistry tab selected).
 *   4. Optional: to show a student's saved progress on the card, add a reader for
 *      the game's id to PROGRESS_READERS in assets/home.js.
 *
 * HOW TO ADD A UNIT
 *   Inside a subject's  units: [ ... ]  list, copy a whole unit (from its { to the
 *   matching }, plus the comma after it), paste it where it should appear and change:
 *        id     – short unique name, lowercase-with-dashes         e.g. "stoichiometry"
 *        title  – the heading shown under the tabs                  e.g. "Stoichiometry"
 *        blurb  – optional: one short line under the heading
 *        games  – its games (see above). Leave it as  games: []  and the page says
 *                 "Games for this unit are on the way."
 *
 * HOW TO ADD A SUBJECT (a new tab)
 *   1. Copy the "chemistry" folder (it holds just one index.html) and rename it,
 *      e.g. "biology". In that index.html change the <title>, the
 *      <meta name="description"> text, and  data-subject="chemistry"  to
 *      data-subject="biology". (This keeps the short address biology/ working.)
 *   2. Copy a whole subject below (from its { to the matching }, plus the comma),
 *      paste it where its tab should appear and change:
 *        id     – the folder name                                   e.g. "biology"
 *        title  – the name on the tab
 *        blurb  – one short line (not shown on the page; for your own notes)
 *        path   – the folder, ending with "/"                       e.g. "biology/"
 *        icon, accent – as for games (accent colours the selected tab)
 *        units  – its units (see above)
 *
 * RULES THAT KEEP EVERYTHING WORKING
 *   - Never start a path with "/" or "https://". Paths must be relative (like
 *     "games/mole-match/") so the site works at games.mrdchemistry.com and when you
 *     preview it on your own computer.
 *   - Keep the quotes, commas and brackets exactly as in the examples. A missing
 *     comma stops the whole list from loading (the page then shows a short notice).
 *   - Cards appear in the order of this list, except that inside each unit the
 *     "ready" games are shown before the "coming-soon" ones.
 */
window.SUBJECTS = [
  {
    id: "chemistry",
    title: "Chemistry",
    blurb: "Atoms, elements and the chemical reactions that change matter.",
    path: "chemistry/",
    icon: "⚗️",
    accent: "teal",
    units: [
      {
        id: "atomic-structure",
        title: "Atomic Structure",
        blurb: "Protons, neutrons and electrons; atoms, ions and isotopes; and average atomic mass.",
        games: [
          {
            id: "gold-foil",
            title: "Gold Foil Shooter",
            blurb: "Fire alpha particles at gold foil and use the evidence to choose the right model of the atom.",
            path: "games/gold-foil/",
            cover: "assets/covers/gold-foil.svg",
            status: "ready",
            icon: "🎯",
            accent: "amber"
          },
          {
            id: "particle-dash",
            title: "Particle Count Dash",
            blurb: "Read the symbol, count the protons, neutrons and electrons, and keep your streak alive.",
            path: "games/particle-dash/",
            cover: "assets/covers/particle-dash.svg",
            status: "ready",
            icon: "⚛️",
            accent: "amber"
          },
          {
            id: "isotope-mixer",
            title: "Isotope Mixer",
            blurb: "Fill a sample with isotopes and watch the balance point show the average atomic mass.",
            path: "games/isotope-mixer/",
            cover: "assets/covers/isotope-mixer.svg",
            status: "ready",
            icon: "🧪",
            accent: "violet"
          }
        ]
      },
      {
        id: "light-and-spectra",
        title: "Light and Atomic Spectra",
        blurb: "Waves, the electromagnetic spectrum, and how atoms give off and absorb light.",
        games: [
          {
            id: "wave-tuner",
            title: "Wave Tuner",
            blurb: "Change a light wave's wavelength and brightness and see what happens to its frequency and energy.",
            path: "games/wave-tuner/",
            cover: "assets/covers/wave-tuner.svg",
            status: "ready",
            icon: "🌊",
            accent: "teal"
          },
          {
            id: "spectrum-lineup",
            title: "Spectrum Line-Up",
            blurb: "Put radio waves, visible light, X-rays and the rest in order by wavelength, frequency and energy.",
            path: "games/spectrum-lineup/",
            cover: "assets/covers/spectrum-lineup.svg",
            status: "ready",
            icon: "🌈",
            accent: "violet"
          },
          {
            id: "electron-jump",
            title: "Electron Jump Lab",
            blurb: "Move an electron between energy levels and watch the atom give off or take in light.",
            path: "games/electron-jump/",
            cover: "assets/covers/electron-jump.svg",
            status: "ready",
            icon: "💡",
            accent: "amber"
          },
          {
            id: "spectral-detective",
            title: "Spectral Detective",
            blurb: "Read the coloured lines in a spectrum to work out which elements are in a gas, a flame or a star.",
            path: "games/spectral-detective/",
            cover: "assets/covers/spectral-detective.svg",
            status: "ready",
            icon: "🔍",
            accent: "violet"
          },
          {
            id: "vocab-match",
            title: "Unit 4 Vocab Match",
            blurb: "Match the words from the atomic structure and light unit to what they mean.",
            path: "games/vocab-match/",
            cover: "assets/covers/vocab-match.svg",
            status: "ready",
            icon: "🗂️",
            accent: "teal"
          }
        ]
      },
      {
        id: "chemical-reactions",
        title: "Chemical Reactions",
        blurb: "Balancing equations and the law of conservation of mass.",
        games: [
          {
            id: "balance-quest",
            title: "Balance Quest",
            blurb: "A 3D puzzle adventure where you balance chemical equations to open the way forward.",
            path: "games/balance-quest/",
            cover: "assets/covers/balance-quest.svg",
            status: "ready",
            icon: "⚖️",
            accent: "violet"
          },
          {
            id: "mole-rush",
            title: "Mole Rush",
            blurb: "Stoichiometry practice: set up conversions with the right units and chemicals. Races coming soon!",
            path: "games/mole-rush/",
            cover: "assets/covers/mole-rush.svg",
            status: "ready",
            icon: "🏁",
            accent: "teal"
          }
        ]
      }
    ]
  },
  {
    id: "physical-science",
    title: "Physical Science",
    blurb: "Design experiments and explore matter, motion and energy.",
    path: "physical-science/",
    icon: "🧲",
    accent: "amber",
    units: [
      {
        id: "experimental-design",
        title: "Experimental Design",
        blurb: "Independent and dependent variables, and how to plan a fair test.",
        games: [
          {
            id: "quiz-dash",
            title: "Experimental Design Variable Dash",
            blurb: "Run, jump and duck through five worlds while you practice spotting independent and dependent variables.",
            path: "games/quiz-dash/",
            cover: "assets/covers/quiz-dash.svg",
            status: "ready",
            icon: "🏃",
            accent: "amber"
          }
        ]
      },
      {
        id: "graphing-data",
        title: "Graphing Data",
        blurb: "Take data in a lab and make a graph: labels, scale, points, lines and a legend.",
        games: [
          {
            id: "graph-lab",
            title: "Graph Lab",
            blurb: "Measure springs and hot water, then build your own graph step by step. Word help in 6 languages.",
            path: "games/graph-lab/",
            cover: "assets/covers/graph-lab.svg",
            status: "ready",
            icon: "📈",
            accent: "teal"
          }
        ]
      }
    ]
  }
];
