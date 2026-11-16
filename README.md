# Mr. D Chemistry — Games

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

One page, two tabs. The games page shows the tabs **Chemistry | Physical Science**,
and under them that subject's **units** (headings) and **games** (cards).

```
Games page           tabs: Chemistry | Physical Science
├── Chemistry tab
│   ├── Unit: Atomic Structure       Particle Count Dash, Isotope Mixer
│   └── Unit: Chemical Reactions     Balance Quest, Mole Rush
└── Physical Science tab
    ├── Unit: Experimental Design    Experimental Design Variable Dash
    └── Unit: Graphing Data          Graph Lab
```

- `index.html` is the games page. It remembers the last tab a student used (in that
  student's browser only).
- `chemistry/` and `physical-science/` are older addresses that teachers have already
  shared. They show the **same page** with that tab pre-selected (the tab is chosen by
  `data-subject` on the page), so those links keep working.
- Each **game card** is one big link: it has a cover picture, the title, a sentence, and
  a **Play →** label. If the student has played, the card also shows their saved progress
  (for example "5 of 13 challenges done"). That line is read from what each game already
  saved in the browser; see `PROGRESS_READERS` in `assets/home.js`. The page never
  changes those saves.
- Every game page has a "←" link back to its subject (`../../chemistry/` or
  `../../physical-science/`), which opens the games page on the right tab.

All of the tabs and cards are drawn from **one list**, `assets/games.js`. To add,
rename, move or hide a game, that is the file you edit.

## What's in the folder

```
mrd-games/
├── index.html            Games page (tabs, units, cards)
├── chemistry/index.html  Same page, Chemistry tab pre-selected
├── physical-science/index.html   Same page, Physical Science tab pre-selected
├── 404.html              "Page not found" page (self-contained: styles are built in)
├── CNAME                 Holds games.mrdchemistry.com (leave it alone)
├── .nojekyll             Tells GitHub Pages to serve the files as they are (leave it alone)
├── README.md             This file
├── tools/
│   └── stamp_version.py  Run it after changing any file (see "After changing any file")
├── assets/
│   ├── games.js          THE LIST of subjects, units and games – edit this one
│   ├── home.js           Draws the tabs and cards, and reads saved progress (no need to edit,
│   │                     except to add a progress reader for a new game)
│   ├── site.css          Shared colours, fonts and layout, and the tabs and cards
│   ├── site-bar.css      The shared top bar, background and footer (see below)
│   ├── covers/           One 16:9 cover picture per game, <game id>.svg
│   └── favicon.svg       Little flask icon shown in the browser tab
└── games/                One folder per game (quiz-dash, graph-lab, particle-dash,
                          isotope-mixer, balance-quest, mole-rush)
```

### The shared bar (`assets/site-bar.css`)

The top bar (Mr. D Chemistry · Games · Pathways · Notes), the dark background and the
footer are shared by all three Mr. D Chemistry sites. `assets/site-bar.css` is a copy of
`shared/site-bar.css` (in the folder above this repo) and **must stay identical to it**:
never edit it here. Change the shared file and copy it over. The games page and 404 page
use it; the game-play pages keep their own compact header (back link + small brand).
The 404 page holds a pasted copy of the same CSS, because it cannot link to files.

Experimental Design Variable Dash used to be called "Quiz Dash". Its folder is still
`games/quiz-dash/` on purpose: that keeps old links working and keeps students' saved
best scores. Students only ever see the new name.

## How to add a game

1. **Make a folder for it** inside `games/`, for example `games/mole-match/`, with an
   `index.html` inside. The easiest start is to copy the `quiz-dash` folder and
   rename it. In the page, the brand text is `Mr. D Chemistry` and the `<title>` is
   `Mole Match — Mr. D Chemistry`.
2. **Point its back link at its subject.** Near the top of the game's `index.html`
   is a link like `<a class="header-link" href="../../physical-science/">← Physical Science</a>`.
   Change it to the subject the game belongs to, for example
   `href="../../chemistry/">← Chemistry`.
3. **Draw a cover.** A 16:9 picture, `assets/covers/mole-match.svg` (the existing ones use
   a 320 x 180 canvas, `viewBox="0 0 320 180"`). Without it the card shows the game's
   emoji instead, so nothing breaks.
4. **Add it to the list.** Open `assets/games.js` and find the unit it belongs in.
   Inside that unit's `games: [ ... ]`, copy one game (from `{` to `},`), paste it
   after the last game and change the words, including `cover: "assets/covers/mole-match.svg"`.
   The instructions at the top of that file explain each line. Use `"ready"` to make the
   card a link to the game, or `"coming-soon"` to show a grey "Coming soon" badge (no
   link, so it is fine if the folder isn't finished yet).
5. **Optional: show progress on the card.** The easy way: have the game save its progress
   under the key `mrd-<game id>` as JSON with a short `card` text, for example
   `{"card": "4 of 10 challenges done"}` (40 characters or fewer). The games page shows
   that text as it is; nothing else to edit. (Older games instead have an entry in
   `PROGRESS_READERS` in `assets/home.js` that reads their saved data.)
6. **Run the version stamp:** `python3 tools/stamp_version.py` (see
   [After changing any file](#after-changing-any-file-run-the-version-stamp)).
7. **Upload / commit** the changes to GitHub. The site updates within a minute or two
   (refresh the page if you don't see it).

Paths in `games.js` are always written from the top of the site, like
`games/mole-match/` – even though the page may be one folder down. The site adds
the rest by itself.

## How to add a unit

In `assets/games.js`, find the subject and its `units: [ ... ]` list. Copy a whole
unit (from its `{` to the matching `},`), paste it where you want it to appear, and
change its `id` (short, lowercase-with-dashes, e.g. `"stoichiometry"`), its `title`
(the heading students see) and, if you like, its one-line `blurb`. Then put its games
in its `games: [ ... ]` list. If you leave the list empty (`games: []`), the unit
still shows, with the note "Games for this unit are on the way."

Units appear under the tab in the same order as in the list.

## How to add a subject (a new tab)

1. **Copy the `chemistry` folder** (it holds just one `index.html`) and rename it,
   for example `biology`. In the new `index.html` change:
   - the `<title>` line: `Chemistry games — Mr. D Chemistry` → `Biology games — Mr. D Chemistry`
   - the `<meta name="description" ...>` line: `Free chemistry practice games ...` →
     `Free biology practice games ...` (search engines show this text)
   - `data-subject="chemistry"` → `data-subject="biology"` (this must match the `id`
     in the next step)
2. **Add it to the list.** In `assets/games.js`, copy a whole subject (from its `{`
   to the matching `},`), paste it where its tab should appear (tabs follow the order of
   the list), and change `id` (`"biology"`, the same as the folder name), `title`,
   `blurb`, `path` (`"biology/"`), `icon`, `accent` (the colour of the selected tab) and
   its units.

## After changing any file: run the version stamp

**After changing any game file, run `python3 tools/stamp_version.py`** – then upload
or commit as usual. (Changing a page, a game, `games.js`, a `.css` or `.js` file: any
change at all.)

How: open Terminal in the `mrd-games` folder, type the line below and press Return.

```
python3 tools/stamp_version.py
```

It prints the files it updated. Upload/commit those along with your own changes.

Why: browsers keep a saved copy of each file for up to 10 minutes. Without the stamp,
a student who visits right after an update can get the new page with old style or
script files, so the page can look broken or a game can fail to start. The tool adds
a version tag to every style and script link, like `style.css?v=20261014T1530`; a new
tag makes browsers fetch the new files.

- It is safe to run as many times as you like: it replaces the old tag, it never adds
  a second one. It changes nothing except those tags.
- The 3D library Three.js (`games/balance-quest/vendor/`) never changes, so it keeps a
  fixed tag, `?v=r170`, and students don't download it again after every update.
- If it prints a line starting with `WARNING`, read it: it means a link points to a
  file that doesn't exist, or something similar worth fixing.
- Forgot to run it? Nothing breaks for long: browsers catch up within 10 minutes. Just
  run it and upload again.

## Rules that keep everything working

- **Links and file paths inside the site must be relative**, like
  `games/mole-match/` or `../../assets/site.css`. Never start them with `/` or with
  the full web address. That is what lets the same files work on the real site and
  when you preview it on your own computer.
- **The `?v=...` at the end of style and script links is normal** – it is the version
  stamp (see above). Leave it there; `tools/stamp_version.py` keeps it up to date. If
  you copy a link and forget it, the tool adds it next time you run it.
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
