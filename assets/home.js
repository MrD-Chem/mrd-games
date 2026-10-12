/*
 * Mr. D's Chemistry Games — builds the game cards on the home page
 * from the list in assets/games.js. You should not need to edit this file;
 * to add a game, edit assets/games.js instead.
 */
(function () {
  'use strict';

  var grid = document.getElementById('game-grid');
  if (!grid) return;

  var ACCENTS = { teal: true, amber: true, violet: true };

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '';
  }

  // Only allow simple relative folder paths such as "games/symbol-sprint/".
  // Blocks "/root-paths", "https://…", "javascript:…" and "../" so a typo can't
  // break the site when it moves from the GitHub address to the custom domain.
  function isSafeRelativePath(path) {
    return isNonEmptyString(path) &&
      !/^[a-z][a-z0-9+.\-]*:/i.test(path) &&
      path.charAt(0) !== '/' &&
      path.charAt(0) !== '\\' &&
      path.indexOf('..') === -1;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function buildCard(game) {
    var ready = game.status === 'ready' && isSafeRelativePath(game.path);

    var card = el('li', 'card');
    card.setAttribute('data-accent', ACCENTS[game.accent] ? game.accent : 'teal');
    card.setAttribute('data-status', ready ? 'ready' : 'coming-soon');

    var icon = el('div', 'card-icon', isNonEmptyString(game.icon) ? game.icon : '⚗️');
    icon.setAttribute('aria-hidden', 'true');
    card.appendChild(icon);

    card.appendChild(el('h2', 'card-title', game.title));

    if (isNonEmptyString(game.blurb)) {
      card.appendChild(el('p', 'card-blurb', game.blurb));
    }

    var actions = el('div', 'card-actions');
    if (ready) {
      var link = el('a', 'btn btn-play', 'Play');
      link.href = game.path;
      link.appendChild(el('span', 'sr-only', ' ' + game.title));
      actions.appendChild(link);
    } else {
      actions.appendChild(el('span', 'badge', 'Coming soon'));
    }
    card.appendChild(actions);

    return card;
  }

  var games = Array.isArray(window.GAMES) ? window.GAMES : [];
  var valid = games.filter(function (g) {
    return g && typeof g === 'object' && isNonEmptyString(g.title);
  });

  // Ready games first; otherwise keep the order from games.js.
  var ordered = valid.filter(function (g) { return g.status === 'ready'; })
    .concat(valid.filter(function (g) { return g.status !== 'ready'; }));

  var fragment = document.createDocumentFragment();
  ordered.forEach(function (game) {
    fragment.appendChild(buildCard(game));
  });
  grid.appendChild(fragment);

  if (!ordered.length) {
    var notice = el('li', 'panel notice', 'The game list could not be loaded. Please check assets/games.js.');
    grid.appendChild(notice);
  }
})();
