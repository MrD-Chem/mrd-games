/*
 * Mr. D's Chemistry Games — THE LIST OF SUBJECTS, UNITS AND GAMES
 * ===============================================================
 * The site is organised like a binder:
 *
 *     SUBJECT   a big button on the home page, and its own page (e.g. chemistry/)
 *       └─ UNIT    a heading on that subject's page
 *            └─ GAME   a card under the unit heading
 *
 * Every card on the site is drawn from this one list, so this is the only file
 * you edit to add, rename, move or hide a game.
 *
 * Paths are always written from the TOP of the site, for example "games/mole-match/",
 * even though the cards appear on a subject page one folder down. The site adds the
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
 *        status – "ready"        shows a Play button
 *                 "coming-soon"  shows a grey "Coming soon" badge (no link)
 *        icon   – one emoji
 *        accent – card colour: "teal", "amber" or "violet"
 *   3. In the game's own index.html, point its "←" link back at its subject page,
 *      e.g.  <a class="header-link" href="../../chemistry/">← Chemistry</a>
 *
 * HOW TO ADD A UNIT
 *   Inside a subject's  units: [ ... ]  list, copy a whole unit (from its { to the
 *   matching }, plus the comma after it), paste it where it should appear and change:
 *        id     – short unique name, lowercase-with-dashes         e.g. "stoichiometry"
 *        title  – the heading shown on the subject page             e.g. "Stoichiometry"
 *        blurb  – optional: one short line under the heading
 *        games  – its games (see above). Leave it as  games: []  and the page says
 *                 "Games for this unit are on the way."
 *
 * HOW TO ADD A SUBJECT
 *   1. Copy the "chemistry" folder (it holds just one index.html) and rename it,
 *      e.g. "biology". In that index.html change four things: the <title>, the
 *      <meta name="description"> text, the <h1> heading, and
 *      data-subject="chemistry"  to  data-subject="biology".
 *      (Leave "Mr. D's Chemistry Games" as it is: that is the name of the whole site.)
 *   2. Copy a whole subject below (from its { to the matching }, plus the comma),
 *      paste it where its button should appear and change:
 *        id     – the folder name                                   e.g. "biology"
 *        title  – the name on the home-page button                  e.g. "Biology"
 *        blurb  – one short line under the name
 *        path   – the folder, ending with "/"                       e.g. "biology/"
 *        icon, accent – as for games
 *        units  – its units (see above)
 *
 * RULES THAT KEEP EVERYTHING WORKING
 *   - Never start a path with "/" or "https://". Paths must be relative (like
 *     "games/mole-match/") so the site works at games.mrdchemistry.com and when you
 *     preview it on your own computer.
 *   - Keep the quotes, commas and brackets exactly as in the examples. A missing
 *     comma stops the whole list from loading (the pages then show a short notice).
 *   - Cards appear in the order of this list, except that inside each unit the
 *     "ready" games are shown before the "coming-soon" ones.
 */
window.SUBJECTS = [
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
            status: "ready",
            icon: "🏃",
            accent: "amber"
          }
        ]
      }
    ]
  },
  {
    id: "chemistry",
    title: "Chemistry",
    blurb: "Atoms, elements and the chemical reactions that change matter.",
    path: "chemistry/",
    icon: "⚗️",
    accent: "teal",
    units: [
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
            status: "ready",
            icon: "⚖️",
            accent: "violet"
          },
          {
            id: "mole-rush",
            title: "Mole Rush",
            blurb: "Stoichiometry practice: set up conversions with the right units and chemicals. Races coming soon!",
            path: "games/mole-rush/",
            status: "ready",
            icon: "🏁",
            accent: "teal"
          }
        ]
      }
    ]
  }
];
