# Mr. D's Chemistry Games

A small website of science games for students. It is plain web pages (HTML, CSS and
JavaScript), so there is nothing to install or "build": GitHub Pages serves the files
exactly as they are in this folder.

- **Address:** https://games.mrdchemistry.com/
- The old address, https://mrd-chem.github.io/mrd-games/, forwards there automatically.
- The main site, https://mrdchemistry.com, stays on GoDaddy and is not touched.

No accounts, no ads, no tracking, and nothing is loaded from other websites, so it
works on filtered school networks. Best scores are kept only in each student's own
browser.

## How the site is organised

The site works like a binder: **subjects**, then **units**, then **games**.

```
Home page            two big buttons: Physical Science and Chemistry
├── Physical Science
│   └── Unit: Experimental Design
│       └── Experimental Design Variable Dash   (ready to play)
└── Chemistry
    └── Unit: Chemical Reactions
        └── Balance Quest                        (coming soon)
```

- The **home page** shows one big button per subject, with how many games it has.
- Each **subject page** (for example `chemistry/`) shows a heading for every unit and
  a card for every game in that unit.
- Every game page has a "←" link back to its subject page.

All of the buttons and cards are drawn from **one list**, `assets/games.js`. To add,
rename, move or hide a game, that is the file you edit.

## What's in the folder

```
mrd-games/
├── index.html            Home page – the big subject buttons
├── physical-science/
│   └── index.html        Physical Science page – its units and games
├── chemistry/
│   └── index.html        Chemistry page – its units and games
├── 404.html              "Page not found" page
├── CNAME                 Holds games.mrdchemistry.com (leave it alone)
├── .nojekyll             Tells GitHub Pages to serve the files as they are (leave it alone)
├── README.md             This file
├── assets/
│   ├── games.js          THE LIST of subjects, units and games – edit this one
│   ├── home.js           Draws the buttons and cards from that list (no need to edit)
│   ├── site.css          Shared colours, fonts and layout for every page
│   └── favicon.svg       Little flask icon shown in the browser tab
└── games/                One folder per game
    ├── quiz-dash/        Experimental Design Variable Dash
    └── balance-quest/    Balance Quest (coming soon)
```

Experimental Design Variable Dash used to be called "Quiz Dash". Its folder is still
`games/quiz-dash/` on purpose: that keeps old links working and keeps students' saved
best scores. Students only ever see the new name.

## How to add a game

1. **Make a folder for it** inside `games/`, for example `games/mole-match/`, with an
   `index.html` inside. The easiest start is to copy the `quiz-dash` folder and
   rename it.
2. **Point its back link at its subject.** Near the top of the game's `index.html`
   is a link like `<a class="header-link" href="../../physical-science/">← Physical Science</a>`.
   Change it to the subject the game belongs to, for example
   `href="../../chemistry/">← Chemistry`.
3. **Add it to the list.** Open `assets/games.js` and find the unit it belongs in.
   Inside that unit's `games: [ ... ]`, copy one game (from `{` to `},`), paste it
   after the last game and change the words. The instructions at the top of that file
   explain each line. Use `"ready"` to show a **Play** button, or `"coming-soon"` to
   show a grey "Coming soon" badge (no link, so it is fine if the folder isn't
   finished yet).
4. **Upload / commit** the changes to GitHub. The site updates within a minute or two
   (refresh the page if you don't see it).

Paths in `games.js` are always written from the top of the site, like
`games/mole-match/` – even though the cards appear on a subject page. The site adds
the rest by itself.

## How to add a unit

In `assets/games.js`, find the subject and its `units: [ ... ]` list. Copy a whole
unit (from its `{` to the matching `},`), paste it where you want it to appear, and
change its `id` (short, lowercase-with-dashes, e.g. `"stoichiometry"`), its `title`
(the heading students see) and, if you like, its one-line `blurb`. Then put its games
in its `games: [ ... ]` list. If you leave the list empty (`games: []`), the unit
still shows, with the note "Games for this unit are on the way."

Units appear on the subject page in the same order as in the list.

## How to add a subject

1. **Copy the `chemistry` folder** (it holds just one `index.html`) and rename it,
   for example `biology`. In the new `index.html` change four things:
   - the `<title>` line: `Chemistry — Mr. D's Chemistry Games` → `Biology — Mr. D's Chemistry Games`
   - the `<meta name="description" ...>` line: `Free chemistry practice games ...` →
     `Free biology practice games ...` (search engines show this text)
   - the big heading: `<h1 ...>Chemistry</h1>` → `<h1 ...>Biology</h1>`
   - `data-subject="chemistry"` → `data-subject="biology"` (this must match the `id`
     in the next step)

   Leave the name "Mr. D's Chemistry Games" in the header as it is: that is the name
   of the whole site, not of the subject.
2. **Add it to the list.** In `assets/games.js`, copy a whole subject (from its `{`
   to the matching `},`), paste it where its button should appear on the home page,
   and change `id` (`"biology"`, the same as the folder name), `title`, `blurb`,
   `path` (`"biology/"`), `icon`, `accent` and its units.
3. Optional: on the home page (`index.html`) there is a short note for computers with
   JavaScript turned off that links to each subject. Add the new subject there too.

## Rules that keep everything working

- **Links and file paths inside the site must be relative**, like
  `games/mole-match/` or `../../assets/site.css`. Never start them with `/` or with
  the full web address. That is what lets the same files work on the real site and
  when you preview it on your own computer.
- **Keep the quotes, commas and brackets** in `games.js` exactly as in the examples.
  A missing comma stops the whole list from loading; the pages then show a short
  notice instead of the cards, so you'll know to look there.

## Custom domain: games.mrdchemistry.com (already set up)

The games have their own address, `games.mrdchemistry.com`, connected with a
**CNAME** DNS record at GoDaddy. Only the `games` part is used, so the main site
mrdchemistry.com keeps working exactly as before. For reference, the setup was:

1. In **GoDaddy → My Products → mrdchemistry.com → DNS**, a record:
   - Type: **CNAME**
   - Name (Host): **games**
   - Value (Points to): **mrd-chem.github.io**
2. On GitHub: **Settings → Pages → Custom domain** set to `games.mrdchemistry.com`,
   with **Enforce HTTPS** ticked. (Saving that is what created the `CNAME` file.)

GitHub Pages itself is turned on under **Settings → Pages → Build and deployment**:
**Deploy from a branch**, the **main** branch, the **/ (root)** folder.

Recommended: in your GitHub account **Settings → Pages**, *verify* `mrdchemistry.com`
(GitHub shows a TXT record to add in GoDaddy). This stops anyone else from ever
claiming your subdomain on GitHub.

## Trying it on your own computer (optional)

Opening `index.html` by double-clicking may not show everything, because browsers
limit pages opened straight from a file. To preview it properly, open Terminal in the
`mrd-games` folder and run:

```
python3 -m http.server 8000
```

Then visit http://localhost:8000/ (press Ctrl+C in Terminal to stop).
