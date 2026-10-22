/*
  Mole Rush — the list of maps. All maps use the same problems; they differ only in
  what the student fills in. To make a map playable later: write its renderer (same
  interface as map1.js), add it to `renderers`, set status to 'ready', and give it a
  rule in session.js (MAP_RULES).
*/

import * as map1 from './map1.js?v=20261022T1625';
import * as map2 from './map2.js?v=20261022T1625';
import * as map3 from './map3.js?v=20261022T1625';
import * as map4 from './map4.js?v=20261022T1625';
import * as balance from './balance.js?v=20261022T1625';

export const MAPS = Object.freeze([
  {
    id: 1,
    name: 'Setup',
    status: 'ready',
    blurb: 'Put the right units and chemicals in every box of the setup. No numbers yet. Balancing questions are mixed in.',
    renderers: { setup: map1, balance }
  },
  {
    id: 2,
    name: 'Numbers',
    status: 'ready',
    blurb: 'The units are already in place. You fill in the numbers.',
    renderers: { setup: map2 }
  },
  {
    id: 3,
    name: 'Blanks',
    status: 'ready',
    blurb: 'A few blanks hide anywhere in the setup: units, chemicals or numbers.',
    renderers: { setup: map3 }
  },
  {
    id: 4,
    name: 'Word problem',
    status: 'ready',
    blurb: 'Just the question. Work it out and give the final answer.',
    renderers: { setup: map4 }
  }
]);

export function getMap(id) {
  return MAPS.find((m) => m.id === Number(id)) || null;
}

export function isPlayable(map) {
  return !!map && map.status === 'ready';
}

/* The renderer module for one item on one map (null if the map can't show it). */
export function rendererFor(map, item) {
  return (map && map.renderers[item.kind]) || null;
}
