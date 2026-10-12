/*
 * Mr. D's Chemistry Games — THE LIST OF GAMES
 * ===========================================
 * The home page builds one card for each entry below.
 *
 * HOW TO ADD A GAME
 *   1. Put the game in its own folder inside "games", with an index.html in it.
 *      Example: games/mole-match/index.html
 *      (Easiest start: copy the games/symbol-sprint folder and rename it.)
 *   2. Copy one of the entries below (from the { to the }, plus the comma after it),
 *      paste it at the end of the list, and change the values:
 *        id     – short unique name, lowercase-with-dashes      e.g. "mole-match"
 *        title  – the name shown on the card                     e.g. "Mole Match"
 *        blurb  – one short sentence about the game
 *        path   – the game's folder, ending with "/"             e.g. "games/mole-match/"
 *                 Do NOT start it with "/" or "https://" — the site has to work both at
 *                 mrd-chem.github.io/mrd-games/ and at games.mrdchemistry.com/
 *        status – "ready"        shows a Play button
 *                 "coming-soon"  shows a grey "Coming soon" badge (no link)
 *        icon   – one emoji
 *        accent – card colour: "teal", "amber" or "violet"
 *   3. Save, upload/commit to GitHub, and refresh the home page after a minute.
 *
 * Order: ready games are shown first, then coming-soon games.
 * Within each group, cards follow the order of this list.
 *
 * Keep the quotes and commas exactly as in the examples — a missing comma stops
 * the whole list from loading (the home page will then show a short notice).
 */
window.GAMES = [
  {
    id: "quiz-dash",
    title: "Quiz Dash",
    blurb: "Run, jump and duck through five worlds, and answer checkpoint questions to keep going.",
    path: "games/quiz-dash/",
    status: "ready",
    icon: "🏃",
    accent: "amber"
  },
  {
    id: "symbol-sprint",
    title: "Symbol Sprint",
    blurb: "60 seconds on the clock: match element names to their symbols as fast as you can.",
    path: "games/symbol-sprint/",
    status: "ready",
    icon: "🧪",
    accent: "teal"
  }
];
