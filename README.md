# Mr. D's Chemistry Games

A small website of chemistry games for students. It is plain web pages (HTML, CSS and
JavaScript), so there is nothing to install or "build": GitHub Pages serves the files
exactly as they are in this folder.

- **Now:** https://mrd-chem.github.io/mrd-games/
- **Later:** https://games.mrdchemistry.com/ (see "Custom domain" below)
- The main site, https://mrdchemistry.com, stays on GoDaddy and is not touched.

No accounts, no ads, no tracking, and nothing is loaded from other websites, so it
works on filtered school networks. Best scores are kept only in each student's own
browser.

## What's in the folder

```
mrd-games/
├── index.html          Home page – shows a card for every game
├── 404.html            "Page not found" page
├── .nojekyll           Tells GitHub Pages to serve the files as they are (leave it alone)
├── README.md           This file
├── assets/
│   ├── games.js        THE LIST OF GAMES – edit this to add or change a game card
│   ├── home.js         Draws the cards on the home page (no need to edit)
│   ├── site.css        Shared colours, fonts and layout for every page
│   └── favicon.svg     Little flask icon shown in the browser tab
└── games/
    └── symbol-sprint/  One folder per game
        ├── index.html
        ├── game.js
        └── style.css
```

## How to add a new game

1. **Make a folder for it** inside `games/`, for example `games/mole-match/`, with an
   `index.html` inside. The easiest start is to copy the `symbol-sprint` folder and
   rename it.
2. **Add it to the list.** Open `assets/games.js`, copy one of the entries (from `{`
   to `},`), paste it at the end of the list and change the words. The instructions
   at the top of that file explain each line. Use `"ready"` to show a **Play**
   button, or `"coming-soon"` to show a grey badge.
3. **Upload / commit** the changes to GitHub. The site updates within a minute or two
   (refresh the page if you don't see it).

One rule to keep everything working: **links and file paths inside the site must be
relative**, like `games/mole-match/` or `../../assets/site.css`. Never start them with
`/` or with the full web address. That is what lets the same files work at both
`mrd-chem.github.io/mrd-games/` and `games.mrdchemistry.com/`.

## Turning on GitHub Pages (one time)

In the `mrd-games` repository on GitHub: **Settings → Pages → Build and deployment**,
choose **Deploy from a branch**, pick the **main** branch and the **/ (root)** folder,
then **Save**. After a minute the site appears at https://mrd-chem.github.io/mrd-games/.

## Custom domain: games.mrdchemistry.com (later)

The games will get their own address, `games.mrdchemistry.com`, connected with a
**CNAME** DNS record at GoDaddy. Only the `games` part is new, so the main site
mrdchemistry.com keeps working exactly as before.

1. In **GoDaddy → My Products → mrdchemistry.com → DNS**, add a record:
   - Type: **CNAME**
   - Name (Host): **games**
   - Value (Points to): **mrd-chem.github.io**
   - TTL: default
2. Wait for it to take effect (often minutes, sometimes a few hours).
3. On GitHub: **Settings → Pages → Custom domain**, type `games.mrdchemistry.com`
   and **Save**. When the check passes, tick **Enforce HTTPS**.

Saving the custom domain on GitHub creates a file called `CNAME` in the repository
automatically. Don't add that file yourself before the GoDaddy record is in place.
Once the domain works, the old github.io address forwards to the new one.

Recommended: in your GitHub account **Settings → Pages**, *verify* `mrdchemistry.com`
(GitHub shows a TXT record to add in GoDaddy). This stops anyone else from ever
claiming your subdomain on GitHub.

## Trying it on your own computer (optional)

Opening `index.html` by double-clicking may not show everything, because browsers
limit pages opened straight from a file. To preview it properly, open Terminal in the
folder that *contains* `mrd-games` and run:

```
python3 -m http.server 8000
```

Then visit http://localhost:8000/mrd-games/ (press Ctrl+C in Terminal to stop).
