/*
  Mole Rush — the list of maps. All maps use the same problems; they differ only in
  what the student fills in. To make a map playable later: write its renderer (same
  interface as map1.js), add it to `renderers`, set status to 'ready', and give it a
  rule in session.js (MAP_RULES).
*/

import * as map1 from './map1.js?v=20261021T1624';
import * as balance from './balance.js?v=20261021T1624';

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
    status: 'coming-soon',
    blurb: 'The units are already in place. You fill in the numbers.',
    renderers: {}
  },
  {
    id: 3,
    name: 'Blanks',
    status: 'coming-soon',
    blurb: 'A few blanks hide anywhere in the setup: units, chemicals or numbers.',
    renderers: {}
  },
  {
    id: 4,
    name: 'Word problem',
    status: 'coming-soon',
    blurb: 'Just the question. Work it out and give the final answer.',
    renderers: {}
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
