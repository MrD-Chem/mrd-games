# Race-layer integration

Import `createRace` from `./track.js`, `createCpu` / `CPU_DIFFICULTIES` from
`./cpu.js`, and `countdownTo` / `countdownFor` from `./countdown.js` using relative
ES-module imports. No dependencies, build, storage or external services.

Give the canvas an explicit CSS width and height (the demo uses `width: 100%` and
`height: 540px`). Use one race instance per canvas; destroy it before replacement.
The renderer inserts a visible `.race-summary` paragraph immediately after the
canvas with `aria-live="polite"`; the host can style that class. Label the canvas
for assistive technology. Names, lane labels and step counts supplement colors.

`createRace({ canvas, racers, totalSteps, mode, reducedMotion, onFinish, live })`:

- `racers`: 2–4 objects with unique string `id`, string `name`, CSS `color`,
  `isPlayer`, and `team` (`'A'`, `'B'` or `null`). Teams requires exactly two on
  each team. Unoccupied lanes remain visible in smaller solo races.
- Optional `sprite` is a relative, same-origin image path resolved against the
  host page. Failed images fall back to the vector mole. Absolute/external URLs
  are ignored. The host CSP must also restrict images to `'self'`.
- `totalSteps`: positive integer; each racer is capped at this value in both modes.
- `reducedMotion`: omit to follow the live system preference; `true` snaps to the
  new position and skips stumbles. `false` explicitly enables easing/stumbles.
- `start()` enables answers and is idempotent. `correct(id)` adds one step;
  `wrong(id)` announces a retry and briefly shakes without changing steps.
  Unknown ids, answers before start, and answers from finished racers are ignored.
- `standings()` returns fresh snapshots, ordered by progress and then input order
  for unfinished ties. Tied racers/teams share a `place`; finished solo racers
  have distinct places in order of their final `correct()` calls.
- Solo entries: `{ id, name, team, isPlayer, place, steps, totalSteps, finished }`.
  The winner is fixed on first crossing. Others keep racing. `onFinish(order)`
  fires once all racers finish, so its final order includes every place.
- Teams entries: `{ team, place, steps, totalSteps, finished, members }` where
  `members` contains `{ id, name, steps, isPlayer, finished }`. Team `totalSteps`
  is twice the individual target. `onFinish(order)` fires once, immediately when
  a team reaches that target, freezing both teams. Team `finished` marks the winner.
- State and finish callbacks update synchronously on answers; visual easing can
  settle afterward. The callback may safely destroy the race. `destroy()` stops
  rendering, removes the live summary and releases listeners/observers; repeated
  calls are safe. To reset, construct a new race.
- Optional `live: true` is for room-driven races. It accepts 1–4 racers, including
  uneven teams after departures. Team targets use the actual member count.
  It never freezes or calls `onFinish`; the room controller owns ending the race.
  `syncStatus(entries, teams)` sets the room's authoritative places and finish
  flags without changing steps. Entries are `{ id, place, finished }`; teams are
  `{ team, place, done }`. This preserves server finish-time ordering, ties and
  finishes after using Show me. In ordinary races this method does nothing.

`createCpu({ racerId, difficulty, seed, onAnswer })` emits
`onAnswer(racerId, isCorrect)`. Difficulty names are case insensitive. Tune accuracy
and uniformly distributed answer times in the exported `CPU_DIFFICULTIES` object.
Number/string seeds reproduce question delays and outcomes. `start()` resumes;
`stop()` pauses and removes its listener. Both are idempotent. Hidden time does
not count toward an answer; no catch-up burst occurs. The host must stop CPUs
when their racer finishes and when the race is disposed.

`countdownTo(epochMs, { onTick, onGo })` uses an absolute `Date.now()` deadline.
`countdownFor(seconds, callbacks)` is its relative wrapper. `onTick` immediately
receives the rounded-up seconds remaining and later 3, 2, 1, 0; `onGo` fires once.
`cancel()` releases its timer and visibility listener. Hidden tabs retain the
absolute deadline and catch up when resumed. Browser scheduling/throttling can
delay callbacks: JavaScript cannot guarantee exact real-time execution. Shared
epoch values also require devices' system clocks to be synchronized by the host.

Open `../../race-demo/` via the repository's static HTTP server for manual testing,
or `../../race-demo/tests.html` for deterministic browser checks with fake clocks.
An optional package-free Node runner is available at
`games/mole-rush/race-demo/run-tests.mjs`; it also exercises the demo controller in
both modes, the standings adapter and the computer controller with real Session
events. Its DOM/canvas doubles do not replace a real-browser visual/CSP check.

## Live game integration

`../online/standings.js` keeps `createStandings(host, opts)` returning
`{ el, update, destroy }` (plus read-only `standings()` for checks). It keys racers
by room slot and uses nicknames as text. On each snapshot it calls `correct(id)`
once per new step, then synchronizes room places/status. A roster, mode, target
or backward-step change destroys/rebuilds the track and replays current steps.
No Firebase calls are made by the adapter. `online.js` owns room lifecycle.

`computer.js` connects the normal map sessions to a track and three CPUs. The
3-second countdown runs before the session starts. CPU seeds combine the session
seed, map, mode, difficulty and racer id. Race again reuses the code; starting from
settings creates a fresh round. Solo waits for every CPU to finish (a shown
answer leaves the player short of the finish); Teams ends on the first team win.
Every exit removes timers, session listeners and the track. The shared session
hook `onDispose` handles external teardown; normal `onFinish` hands control back
to the race controller so unfinished CPUs can keep racing on the waiting screen.

## Running checks

From the repository root:

```sh
node games/mole-rush/race-demo/run-tests.mjs
python3 -m http.server 8000
```

Open `http://localhost:8000/games/mole-rush/race-demo/tests.html` for the API
checks and `http://localhost:8000/games/mole-rush/race-demo/integration.html` for
`PASS n/n` integration checks. The integration page loads the real game in a
same-origin iframe with `?mrtest=1`, substitutes fake clocks, exercises every map,
checks CPU/adapter behavior and restores clocks after each check. It never opens
Firebase. `window.__MR_TEST__.computer()` exposes `start(settings, code)`,
`current()`, `settings()` and `leave()`; `current()` returns snapshots only.

Manually check the title/settings, play, waiting and results screens at 375px and
1366px, keyboard focus and reduced motion. Live Firebase room lifecycle still
needs a real multi-device online smoke check before publishing.
