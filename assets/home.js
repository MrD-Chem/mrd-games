/*
 * Mr. D Chemistry — draws the games page from the list in assets/games.js.
 *
 *   one page, one tab per subject (Chemistry | Physical Science)
 *   under the tabs: one section per unit, with a card for every game
 *
 * The page (index.html, chemistry/index.html, physical-science/index.html) holds one
 * empty element and tells this file what to draw with attributes on it:
 *   <div id="games-app" data-root="">                           the home page
 *   <div id="games-app" data-subject="chemistry" data-root="../">  a subject address
 * data-root is how far the page is from the top of the site ("" or "../"); it is put
 * in front of the paths from games.js so the links work from any folder.
 * data-subject (optional) is the tab that starts selected. Without it, the tab the
 * student used last is selected (remembered in this browser only).
 *
 * To add a game, unit or subject, edit assets/games.js instead. The only part of this
 * file you might edit is PROGRESS_READERS below.
 */
(function () {
  'use strict';

  var ACCENTS = { teal: true, amber: true, violet: true };
  var LIST_ERROR = 'The game list could not be loaded. Please check assets/games.js.';
  var LAST_TAB_KEY = 'mrd-games:last-tab';

  /* ===================================================================================
     SAVED PROGRESS ON THE CARDS
     ===================================================================================
     Each game saves its own progress in this browser (localStorage). Because the games
     live on the same website, this page can READ those saves and show a short line on
     the game's card, like "5 of 13 challenges done". This page never writes to them.

     One reader per game id. A reader returns a short text, or '' when there is nothing
     to show (never played, storage blocked, or the save does not look as expected).
     Every reader is wrapped in try/catch by showProgress(), so a surprise in a save can
     only hide the line, never break the page.

     If a game changes how it saves, update its reader here (the key and shape are noted
     in each comment, with the game file where the save is written).                    */
  function num(value) {
    var n = Number(value);
    return isFinite(n) && n > 0 ? n : 0;
  }
  function fmt(n) {
    return Math.round(n).toLocaleString('en-US');
  }
  function readJson(key) {
    return JSON.parse(window.localStorage.getItem(key));
  }

  var PROGRESS_READERS = {
    // Experimental Design Variable Dash: key "mrd-games:quiz-dash:best" holds the best
    // score as a plain number (games/quiz-dash/game.js, storageSet('best')).
    'quiz-dash': function () {
      var best = num(window.localStorage.getItem('mrd-games:quiz-dash:best'));
      return best ? 'Best ' + fmt(best) : '';
    },

    // Graph Lab: key "mrd-graph-lab" holds { v: 1, labs: { spring: { bestStars }, cooling: { bestStars } } }
    // with up to 8 stars per lab (games/graph-lab/game.js, saveProgress). Shows total stars.
    'graph-lab': function () {
      var data = readJson('mrd-graph-lab');
      if (!data || data.v !== 1 || !data.labs || typeof data.labs !== 'object') return '';
      var stars = 0;
      ['spring', 'cooling'].forEach(function (id) {
        var lab = data.labs[id];
        if (lab && typeof lab === 'object') stars += Math.min(8, Math.floor(num(lab.bestStars)));
      });
      return stars ? '★ ' + stars + ' of 16 stars' : '';
    },

    // Balance Quest: key "mrd-games:balance-quest:v1" holds { v: 1, stars: { <gateId>: 1..3 }, ... }
    // (games/balance-quest/js/progress.js). "stars" keeps the best result of every gate
    // ever solved, even after a world is restarted. Shows gates cleared and total stars.
    'balance-quest': function () {
      var data = readJson('mrd-games:balance-quest:v1');
      if (!data || data.v !== 1 || !data.stars || typeof data.stars !== 'object') return '';
      var gates = 0;
      var stars = 0;
      Object.keys(data.stars).forEach(function (id) {
        var s = Number(data.stars[id]);
        if (s >= 1 && s <= 3) { gates += 1; stars += Math.floor(s); }
      });
      return gates ? plural(gates, 'gate') + ' cleared · ★ ' + stars : '';
    },

    // Mole Rush: key "mrd-games:mole-rush:v1" holds { v: 1, best: { <mapId>: { score, accuracy } } }
    // (games/mole-rush/js/storage.js). Shows the highest best score over all maps.
    'mole-rush': function () {
      var data = readJson('mrd-games:mole-rush:v1');
      if (!data || data.v !== 1 || !data.best || typeof data.best !== 'object') return '';
      var top = 0;
      Object.keys(data.best).forEach(function (id) {
        var b = data.best[id];
        if (b && typeof b === 'object' && num(b.score) < 1e6) top = Math.max(top, num(b.score));
      });
      return top ? 'Best ' + fmt(top) : '';
    },

    // Particle Count Dash: key "mrd-particle-dash" holds { levels: { "1": { best, stars }, ... } }
    // for its 6 levels, up to 3 stars each (games/particle-dash/game.js, createStore).
    // Shows levels played and total stars.
    'particle-dash': function () {
      var data = readJson('mrd-particle-dash');
      if (!data || !data.levels || typeof data.levels !== 'object') return '';
      var played = 0;
      var stars = 0;
      for (var level = 1; level <= 6; level += 1) {
        var entry = data.levels[String(level)];
        if (entry && typeof entry === 'object' && (num(entry.best) || num(entry.stars))) {
          played += 1;
          stars += Math.min(3, Math.floor(num(entry.stars)));
        }
      }
      return played ? played + ' of 6 levels · ★ ' + stars + ' of 18' : '';
    },

    // Isotope Mixer: key "mrd-isotope-mixer" holds { completed: [<challengeId>, ...], tab }
    // and the game has 13 challenges (games/isotope-mixer/game.js, save; ids in data.js).
    'isotope-mixer': function () {
      var data = readJson('mrd-isotope-mixer');
      if (!data || !Array.isArray(data.completed)) return '';
      var seen = {};
      data.completed.forEach(function (id) {
        if (typeof id === 'string') seen[id] = true;
      });
      var done = Math.min(13, Object.keys(seen).length);
      return done ? done + ' of 13 challenges done' : '';
    }
  };

  function showProgress(game) {
    var reader = PROGRESS_READERS[game.id];
    if (typeof reader !== 'function') return '';
    try {
      var text = reader();
      return typeof text === 'string' ? text : '';
    } catch (e) {
      return '';
    }
  }
  /* ================================ end of progress ================================ */

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '';
  }

  function asList(value) {
    return Array.isArray(value) ? value : [];
  }

  function hasTitle(item) {
    return item != null && typeof item === 'object' && isNonEmptyString(item.title);
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  // Only allow simple relative paths such as "games/quiz-dash/".
  // Blocks "/root-paths", "https://…", "javascript:…" and "../" so a typo can't
  // send students off the site or break it when it is previewed somewhere else.
  function isSafeRelativePath(path) {
    return isNonEmptyString(path) &&
      !/^[a-z][a-z0-9+.\-]*:/i.test(path) &&
      path.charAt(0) !== '/' &&
      path.charAt(0) !== '\\' &&
      path.indexOf('..') === -1;
  }

  // "" at the top of the site, "../" one folder down. Anything else is ignored.
  function readRoot(node) {
    var root = node.getAttribute('data-root') || '';
    return /^(\.\.\/)*$/.test(root) ? root : '';
  }

  // Unit ids become #anchors (e.g. #chemical-reactions), so keep them tidy
  // and never reuse an id that is already on the page.
  var usedIds = {};
  function anchorId(value) {
    if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(value) ||
        usedIds[value] || document.getElementById(value)) {
      return '';
    }
    usedIds[value] = true;
    return value;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function accentOf(item) {
    return ACCENTS[item.accent] ? item.accent : 'teal';
  }

  function isReady(game) {
    return game.status === 'ready' && isSafeRelativePath(game.path);
  }

  function subjects() {
    return asList(window.SUBJECTS).filter(hasTitle).filter(function (s) {
      return /^[a-z0-9][a-z0-9-]*$/.test(s.id);
    });
  }

  function unitsOf(subject) {
    return asList(subject.units).filter(hasTitle);
  }

  // Ready games first; otherwise keep the order from games.js.
  function gamesOf(unit) {
    var games = asList(unit.games).filter(hasTitle);
    return games.filter(isReady).concat(games.filter(function (g) { return !isReady(g); }));
  }

  // ---------- Cards ----------

  // Picture area: the cover image, with the game's emoji tile behind it as the
  // fallback. If the image cannot load, it is hidden and the tile shows instead.
  function buildMedia(game, root) {
    var media = el('div', 'card-media');

    var tile = el('div', 'card-icon', isNonEmptyString(game.icon) ? game.icon : '⚗️');
    tile.setAttribute('aria-hidden', 'true');
    media.appendChild(tile);

    if (isSafeRelativePath(game.cover)) {
      var img = el('img', 'card-cover');
      img.alt = '';
      img.width = 320;
      img.height = 180;
      img.loading = 'lazy';
      img.addEventListener('error', function () {
        img.hidden = true;
        media.classList.add('is-fallback');
      });
      img.src = root + game.cover;
      media.appendChild(img);
    } else {
      media.classList.add('is-fallback');
    }
    return media;
  }

  // The whole card is ONE link: the title is the real <a>, and CSS stretches it over
  // the card. "Play →" is just a label inside the card, not a second link.
  function buildGameCard(game, root) {
    var ready = isReady(game);

    var card = el('li', 'game-card');
    card.setAttribute('data-accent', accentOf(game));
    card.setAttribute('data-status', ready ? 'ready' : 'coming-soon');

    card.appendChild(buildMedia(game, root));

    var body = el('div', 'card-body');
    var heading = el('h3', 'card-title');
    if (ready) {
      var link = el('a', 'card-link', game.title);
      link.href = root + game.path;
      heading.appendChild(link);
    } else {
      heading.textContent = game.title;
    }
    body.appendChild(heading);

    if (isNonEmptyString(game.blurb)) {
      body.appendChild(el('p', 'card-blurb', game.blurb));
    }

    var progress = ready ? showProgress(game) : '';
    if (progress) body.appendChild(el('p', 'card-progress', progress));

    var foot = el('div', 'card-foot');
    if (ready) {
      var pill = el('span', 'play-pill', 'Play →');
      pill.setAttribute('aria-hidden', 'true');
      foot.appendChild(pill);
    } else {
      foot.appendChild(el('span', 'badge', 'Coming soon'));
    }
    body.appendChild(foot);

    card.appendChild(body);
    return card;
  }

  function buildUnit(unit, index, root, subjectId) {
    var section = el('section', 'unit');
    var id = anchorId(unit.id);
    if (id) section.id = id;

    var header = el('div', 'unit-header');
    var heading = el('h2', 'unit-title', unit.title);
    heading.id = subjectId + '-unit-' + (index + 1) + '-title';
    section.setAttribute('aria-labelledby', heading.id);
    header.appendChild(heading);
    if (isNonEmptyString(unit.blurb)) {
      header.appendChild(el('p', 'unit-blurb', unit.blurb));
    }
    section.appendChild(header);

    var games = gamesOf(unit);
    if (games.length) {
      var grid = el('ul', 'game-grid');
      grid.setAttribute('aria-labelledby', heading.id);
      // CSS uses the count to stop one or two cards stretching across the whole row
      grid.setAttribute('data-count', String(Math.min(games.length, 3)));
      games.forEach(function (game) {
        grid.appendChild(buildGameCard(game, root));
      });
      section.appendChild(grid);
    } else {
      section.appendChild(el('p', 'panel notice', 'Games for this unit are on the way.'));
    }

    return section;
  }

  function buildPanel(subject, root) {
    var panel = el('div', 'units');
    panel.id = 'panel-' + subject.id;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'tab-' + subject.id);

    var units = unitsOf(subject);
    units.forEach(function (unit, index) {
      panel.appendChild(buildUnit(unit, index, root, subject.id));
    });
    if (!units.length) {
      panel.appendChild(el('p', 'panel notice', 'Games for this subject are on the way.'));
    }
    return panel;
  }

  // ---------- Tabs ----------

  function readLastTab() {
    try { return window.localStorage.getItem(LAST_TAB_KEY); } catch (e) { return null; }
  }

  function saveLastTab(id) {
    try { window.localStorage.setItem(LAST_TAB_KEY, id); } catch (e) { /* storage blocked: fine */ }
  }

  function buildTab(subject) {
    var tab = el('button', 'tab');
    tab.type = 'button';
    tab.id = 'tab-' + subject.id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', 'panel-' + subject.id);
    tab.setAttribute('data-accent', accentOf(subject));
    if (isNonEmptyString(subject.icon)) {
      var icon = el('span', 'tab-icon', subject.icon);
      icon.setAttribute('aria-hidden', 'true');
      tab.appendChild(icon);
    }
    tab.appendChild(el('span', 'tab-label', subject.title));
    return tab;
  }

  function renderApp(app) {
    var root = readRoot(app);
    var list = subjects();

    if (!list.length) {
      app.appendChild(el('p', 'panel notice', LIST_ERROR));
      return;
    }

    // Which tab starts selected: the page's own subject, else the last one used, else the first.
    var ids = list.map(function (s) { return s.id; });
    var wanted = app.getAttribute('data-subject');
    var current = ids.indexOf(wanted) !== -1 ? wanted :
      (ids.indexOf(readLastTab()) !== -1 ? readLastTab() : ids[0]);

    var tablist = el('div', 'tabs');
    tablist.setAttribute('role', 'tablist');
    tablist.setAttribute('aria-label', 'Subject');
    var tabs = {};
    var panels = {};
    var fragment = document.createDocumentFragment();

    list.forEach(function (subject) {
      tabs[subject.id] = buildTab(subject);
      tablist.appendChild(tabs[subject.id]);
      panels[subject.id] = buildPanel(subject, root);
      fragment.appendChild(panels[subject.id]);
    });

    function select(id, focus) {
      current = id;
      ids.forEach(function (other) {
        var on = other === id;
        tabs[other].setAttribute('aria-selected', on ? 'true' : 'false');
        tabs[other].tabIndex = on ? 0 : -1; // only the selected tab is in the Tab order; arrows move between tabs
        panels[other].hidden = !on;
      });
      if (focus) tabs[id].focus();
    }

    tablist.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('.tab') : null;
      if (!button) return;
      var id = button.id.replace(/^tab-/, '');
      select(id, false);
      saveLastTab(id);
    });

    // Arrow keys, Home and End move between the tabs (and select them, as the tab pattern asks).
    tablist.addEventListener('keydown', function (event) {
      var at = ids.indexOf(current);
      var next = -1;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (at + 1) % ids.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (at - 1 + ids.length) % ids.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = ids.length - 1;
      if (next === -1) return;
      event.preventDefault();
      select(ids[next], true);
      saveLastTab(ids[next]);
    });

    app.appendChild(tablist);
    app.appendChild(fragment);
    select(current, false);
  }

  var app = document.getElementById('games-app');
  if (app) renderApp(app);
})();
