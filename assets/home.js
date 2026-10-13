/*
 * Mr. D's Chemistry Games — draws the cards from the list in assets/games.js.
 *
 *   Home page (index.html)            one big button/card per subject
 *   Subject pages (e.g. chemistry/)   one section per unit, with a card per game
 *
 * Each page tells this file what to draw with attributes on an empty element:
 *   <ul id="subject-grid" data-root="">                         home page
 *   <div id="units" data-subject="chemistry" data-root="../">   a subject page
 * data-root is how far the page is from the top of the site ("" or "../"); it is
 * put in front of the paths from games.js so the links work from any folder.
 *
 * You should not need to edit this file; to add a game, unit or subject, edit
 * assets/games.js instead.
 */
(function () {
  'use strict';

  var ACCENTS = { teal: true, amber: true, violet: true };
  var LIST_ERROR = 'The game list could not be loaded. Please check assets/games.js.';

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '';
  }

  function asList(value) {
    return Array.isArray(value) ? value : [];
  }

  function hasTitle(item) {
    return item != null && typeof item === 'object' && isNonEmptyString(item.title);
  }

  // Only allow simple relative folder paths such as "games/quiz-dash/".
  // Blocks "/root-paths", "https://…", "javascript:…" and "../" so a typo can't
  // send students off the site or break it when it is previewed somewhere else.
  function isSafeRelativePath(path) {
    return isNonEmptyString(path) &&
      !/^[a-z][a-z0-9+.\-]*:/i.test(path) &&
      path.charAt(0) !== '/' &&
      path.charAt(0) !== '\\' &&
      path.indexOf('..') === -1;
  }

  // "" on the home page, "../" on a subject page. Anything else is ignored.
  function readRoot(node) {
    var root = node.getAttribute('data-root') || '';
    return /^(\.\.\/)*$/.test(root) ? root : '';
  }

  // Unit ids become #anchors (e.g. chemistry/#chemical-reactions), so keep them tidy
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

  function iconEl(icon) {
    var node = el('div', 'card-icon', isNonEmptyString(icon) ? icon : '⚗️');
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function isReady(game) {
    return game.status === 'ready' && isSafeRelativePath(game.path);
  }

  function subjects() {
    return asList(window.SUBJECTS).filter(hasTitle);
  }

  function unitsOf(subject) {
    return asList(subject.units).filter(hasTitle);
  }

  // Ready games first; otherwise keep the order from games.js.
  function gamesOf(unit) {
    var games = asList(unit.games).filter(hasTitle);
    return games.filter(isReady).concat(games.filter(function (g) { return !isReady(g); }));
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  // "1 game", "3 games + 1 coming soon", "1 game coming soon", "No games yet"
  function countLabel(subject) {
    var ready = 0;
    var soon = 0;
    unitsOf(subject).forEach(function (unit) {
      gamesOf(unit).forEach(function (game) {
        if (isReady(game)) ready += 1; else soon += 1;
      });
    });
    if (ready && soon) return plural(ready, 'game') + ' + ' + soon + ' coming soon';
    if (ready) return plural(ready, 'game');
    if (soon) return plural(soon, 'game') + ' coming soon';
    return 'No games yet';
  }

  function buildGameCard(game, root, headingTag) {
    var ready = isReady(game);

    var card = el('li', 'card');
    card.setAttribute('data-accent', accentOf(game));
    card.setAttribute('data-status', ready ? 'ready' : 'coming-soon');

    card.appendChild(iconEl(game.icon));
    card.appendChild(el(headingTag, 'card-title', game.title));

    if (isNonEmptyString(game.blurb)) {
      card.appendChild(el('p', 'card-blurb', game.blurb));
    }

    var actions = el('div', 'card-actions');
    if (ready) {
      var link = el('a', 'btn btn-play', 'Play');
      link.href = root + game.path;
      link.appendChild(el('span', 'sr-only', ' ' + game.title));
      actions.appendChild(link);
    } else {
      actions.appendChild(el('span', 'badge', 'Coming soon'));
    }
    card.appendChild(actions);

    return card;
  }

  function buildSubjectCard(subject, root) {
    var linked = isSafeRelativePath(subject.path);

    var card = el('li', 'card card--subject');
    card.setAttribute('data-accent', accentOf(subject));
    card.setAttribute('data-status', linked ? 'ready' : 'coming-soon');

    card.appendChild(iconEl(subject.icon));
    card.appendChild(el('h2', 'card-title', subject.title));

    if (isNonEmptyString(subject.blurb)) {
      card.appendChild(el('p', 'card-blurb', subject.blurb));
    }
    card.appendChild(el('p', 'card-meta', countLabel(subject)));

    var actions = el('div', 'card-actions');
    if (linked) {
      var link = el('a', 'btn btn-play btn-lg', 'Explore');
      link.href = root + subject.path;
      link.appendChild(el('span', 'sr-only', ' ' + subject.title));
      var arrow = el('span', 'btn-arrow', '→');
      arrow.setAttribute('aria-hidden', 'true');
      link.appendChild(arrow);
      actions.appendChild(link);
    } else {
      actions.appendChild(el('span', 'badge', 'Coming soon'));
    }
    card.appendChild(actions);

    return card;
  }

  function buildUnit(unit, index, root) {
    var section = el('section', 'unit');
    var id = anchorId(unit.id);
    if (id) section.id = id;

    var header = el('div', 'unit-header');
    var heading = el('h2', 'unit-title', unit.title);
    heading.id = (id || 'unit-' + (index + 1)) + '-title';
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
      games.forEach(function (game) {
        grid.appendChild(buildGameCard(game, root, 'h3'));
      });
      section.appendChild(grid);
    } else {
      section.appendChild(el('p', 'panel notice', 'Games for this unit are on the way.'));
    }

    return section;
  }

  function renderHome(grid) {
    var root = readRoot(grid);
    var list = subjects();
    var fragment = document.createDocumentFragment();
    list.forEach(function (subject) {
      fragment.appendChild(buildSubjectCard(subject, root));
    });
    if (!list.length) {
      fragment.appendChild(el('li', 'panel notice', LIST_ERROR));
    }
    grid.appendChild(fragment);
  }

  function renderSubject(container) {
    var root = readRoot(container);
    var wanted = container.getAttribute('data-subject');
    var list = subjects();
    var subject = null;
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === wanted) { subject = list[i]; break; }
    }

    if (!list.length) {
      container.appendChild(el('p', 'panel notice', LIST_ERROR));
      return;
    }
    if (!subject) {
      container.appendChild(el('p', 'panel notice',
        'This subject is not in the game list yet. Please check assets/games.js.'));
      return;
    }

    var units = unitsOf(subject);
    var fragment = document.createDocumentFragment();
    units.forEach(function (unit, index) {
      fragment.appendChild(buildUnit(unit, index, root));
    });
    if (!units.length) {
      fragment.appendChild(el('p', 'panel notice', 'Games for this subject are on the way.'));
    }
    container.appendChild(fragment);
  }

  var subjectGrid = document.getElementById('subject-grid');
  if (subjectGrid) renderHome(subjectGrid);

  var unitList = document.getElementById('units');
  if (unitList) renderSubject(unitList);
})();
