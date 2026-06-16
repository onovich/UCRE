# UCRE Development Plan

Last updated: 2026-06-17

Source documents:

- `docs/URCE_Universal_Roguelike_Card_Engine_Design_Document.pdf`
- `docs/UCRE_Web_ThreeJS_Tech_Selection_Document.pdf`

## Project Understanding

UCRE is a universal roguelike card engine, not a single game template. The engine should support blackjack-like roguelikes, Slay the Spire-like turn combat, Inscryption-like lane and sacrifice rules, and later hybrid card tabletop systems.

The core product promise is a deterministic rule engine plus a high-quality 3D card theater. Rules produce facts. Presentation consumes those facts and turns them into card movement, camera work, VFX, audio, and UI feedback.

The project should optimize for:

- deterministic simulation from seed, content hash, and command log;
- strict separation between rules, presentation, UI, tools, and content;
- data-driven cards, relics, enemies, rewards, objectives, and mechanics;
- replay, debugging, golden tests, and automated balance simulation from the beginning;
- web-first authoring and runtime using TypeScript, React, Vite, Three.js, and Electron.

## Technical Direction

The recommended stack is:

- TypeScript for rules, content schemas, tools, tests, and app code;
- React and Vite for game UI, editor, replay viewer, sandbox, and devtools;
- Three.js WebGL2 for the desktop card theater;
- GSAP plus a custom Presentation Director and Beat Scheduler for animation orchestration;
- Zod and JSON Schema for content validation;
- IndexedDB plus Dexie for browser and Electron local storage;
- Vitest for rules and replay tests;
- Playwright for browser and end-to-end smoke tests;
- Electron for desktop distribution.

The most important architectural boundary is:

- `@ucre/core` must not depend on DOM, React, Three.js, GSAP, `Date.now`, `Math.random`, or frame timing.
- Presentation can only consume rule events and presentation intents. It must not mutate `GameState`.
- UI and tools build commands, show state, and preview predictions. They must not bypass the rule engine.
- Content compiles from YAML, JSON5, or JSON into a validated runtime bundle with a manifest hash.

## Proposed Repository Shape

```text
apps/
  game/             # React + Three.js game client
  editor/           # content authoring tools
  replay-viewer/    # command/event replay inspection
  sandbox/          # rule and presentation experiments
packages/
  core/             # deterministic rule engine
  rulesets/         # slay-like, blackjack-like, sacrifice-board examples
  content-schema/   # Zod schemas and generated types
  content-compiler/ # authoring data -> runtime bundle
  replay/           # command log, event log, state/event hashes
  simulation/       # bots, balance runs, automated smoke simulation
  presentation-core/# intents, beats, scheduling contracts
  theater-three/    # CardActor, ZoneAnchor, camera, VFX bindings
  ui/               # shared React components
  devtools/         # event viewer, trigger queue, RNG/state inspectors
content/
assets/
docs/
```

## Development Principles

1. Build rule determinism before spectacle.
2. Prefer one playable vertical slice over broad unfinished abstractions.
3. Add golden replay tests as soon as commands and RNG exist.
4. Keep mechanics as plugins where possible, but avoid overbuilding a scripting language early.
5. Use three pressure-test rulesets to prove generality: turn combat, blackjack, and lane sacrifice.
6. Treat editor and debug tooling as core product, not late-stage polish.

## Phased Plan

### Phase 0 - Project Scaffold

Goal: create the TypeScript monorepo and mechanical validation pipeline.

Deliverables:

- pnpm workspace or equivalent package workspace;
- root TypeScript, ESLint, Prettier, Vitest, and Vite configuration;
- package placeholders for `core`, `content-schema`, `content-compiler`, `replay`, `presentation-core`, `theater-three`, and `rulesets`;
- app placeholders for `game`, `sandbox`, `editor`, and `replay-viewer`;
- GitHub Actions for install, lint, typecheck, build, and tests;
- update `docs/codex-ops-workflow.md` and `.codex/project-ops-workflow.json` with real commands.

Acceptance:

- clean install from a fresh checkout;
- `typecheck`, `lint`, `test`, and `build` commands run from the root;
- CI passes on `main`.

### Phase 1 - Deterministic Rules Core

Goal: implement the minimum rule engine that can run without UI or 3D.

Deliverables:

- `GameState`, `GameObject`, `Zone`, `ResourceState`, `Command`, `Effect`, `RuleEvent`, and `RuleResult`;
- seeded RNG streams for rule-affecting randomness;
- command pipeline: validate, pay costs, resolve effects, emit events, run state checks, queue triggers, emit presentation intents;
- core effects: `MoveObject`, `DrawCards`, `Discard`, `Destroy`, `DealDamage`, `GainResource`, `SpendResource`, `AddCounter`, `RemoveCounter`;
- stable state hash and event hash;
- replay runner from `seed + commandLog + contentManifestHash`.

Acceptance:

- Vitest coverage for object movement, draw/discard, resource changes, damage, destruction, and objective checks;
- golden replay test produces identical final state hash and event hash.

### Phase 2 - First Ruleset Vertical Slice

Goal: prove the engine with a minimal Slay-like encounter before building visual complexity.

Deliverables:

- `rulesets/slay-like` with phases, objectives, resources, zones, and starter cards;
- energy, HP, block, draw pile, hand, discard pile, exhaust pile, enemy intent;
- 10-15 sample cards, 2 enemies, 1 relic, and simple reward draft;
- CLI or test-driven encounter runner.

Acceptance:

- one encounter can be completed through command dispatch only;
- enemy intent resolves deterministically;
- reward draft modifies the deck;
- replay can reproduce the encounter.

### Phase 3 - Content Schema And Compiler

Goal: move cards and ruleset content out of code into validated authoring data.

Deliverables:

- Zod schemas for cards, relics, enemies, resources, zones, objectives, commands, effects, presentation profiles, and reward pools;
- YAML/JSON5 authoring examples;
- content compiler with cross-reference validation and canonical JSON output;
- manifest hash generation;
- content lint command.

Acceptance:

- invalid effect targets, missing resources, duplicate IDs, and missing presentation fallbacks fail before runtime;
- compiled content can feed Phase 2 ruleset tests.

### Phase 4 - Game Shell And Devtools

Goal: make the rule engine visible and debuggable in a browser.

Deliverables:

- React game shell with command buttons, state panels, hand view, resource display, and enemy intent display;
- event log viewer;
- trigger queue and RNG stream inspectors;
- state snapshot diff view;
- prediction API for legal commands and target previews.

Acceptance:

- browser smoke test starts a game, plays a card, ends a turn, and verifies state changes;
- no UI path mutates `GameState` outside command dispatch.

### Phase 5 - Three.js Card Theater Vertical Slice

Goal: render real card actors and zone anchors with basic movement.

Deliverables:

- `theater-three` scene, camera rig, lights, table root, card actor pool, and zone anchors;
- card texture generation path for small 3D cards;
- anchors for draw pile, hand fan, play area, discard pile, enemy, and reward choices;
- event-to-anchor synchronization.

Acceptance:

- cards fly from draw pile to hand and from hand to discard;
- animation skip snaps actors to rule-correct anchors;
- Playwright screenshot smoke verifies nonblank canvas and stable layout.

### Phase 6 - Presentation Director

Goal: turn rule events into controllable performance beats.

Deliverables:

- `PresentationIntent`, `PresentationBeat`, `BeatScheduler`, and `PresentationDirector`;
- GSAP timeline integration;
- move, damage, destroy, trigger, reward, and camera focus profiles;
- fast-forward and skip behavior;
- presentation RNG separated from rules RNG.

Acceptance:

- skipping or accelerating presentation never changes state hash;
- grouped events can play as one readable sequence;
- event viewer can show which rule events generated which beats.

### Phase 7 - Roguelike Run Loop

Goal: move from single encounter to a small run.

Deliverables:

- `RunState`, map generation, node resolver, encounter nodes, event nodes, shop/rest placeholders, rewards, and run settlement;
- save package with seed, ruleset version, content hash, command log, and snapshots;
- local persistence through Dexie;
- replay viewer for run-level command logs.

Acceptance:

- a minimal run can start, traverse nodes, complete encounters, choose rewards, and end in victory or defeat;
- saves and replays survive reloads.

### Phase 8 - Ruleset Pressure Tests

Goal: prove that UCRE is a universal engine, not one combat prototype.

Deliverables:

- blackjack-like ruleset: shoe, hand total, hit, stand, dealer policy, bust, bet, payout, suspicion, cheat card;
- sacrifice-board ruleset: lane board, slots, sacrifice costs, creatures, lane attack, scale objective;
- shared mechanics moved down into core or plugins only when repeated by at least two rulesets.

Acceptance:

- all three rulesets run on the same core command, event, objective, zone, effect, RNG, and replay model;
- each ruleset has at least one golden replay.

### Phase 9 - Editor, Simulation, And Balance Tools

Goal: let designers and AI produce content without code edits.

Deliverables:

- card editor, relic editor, encounter editor, reward pool editor, and ruleset editor MVP;
- static balance checks for costs, rarity, pools, and unlock conditions;
- simulation CLI for 1,000+ deterministic runs;
- balance dashboard with win rate, card pick rate, card play rate, average turn count, resource curves, and death node distribution.

Acceptance:

- a new card can be created in the editor, compiled, loaded, played, tested, and replayed without modifying engine code;
- simulation output is stable for fixed seeds and content hash.

### Phase 10 - Vertical Demo And Desktop Build

Goal: ship a playable high-presentation demo.

Deliverables:

- one complete ruleset with a full short run;
- at least 20 cards, 5 relics, 5 enemies, 3 node types, and 1 boss;
- polished 3D card movement, damage, destruction, rewards, boss moment, and fast mode;
- Electron build for desktop testing.

Acceptance:

- complete run loop is playable;
- replay verifies final state/event hashes;
- Electron smoke build launches successfully;
- performance remains acceptable in fast mode and normal presentation mode.

## Immediate Next Sprint

Recommended first sprint target: Phase 0 plus the start of Phase 1.

Tasks:

- choose package manager and create the workspace;
- add root TypeScript, lint, format, test, and build setup;
- create package skeletons and public package boundaries;
- implement `@ucre/core` type contracts for state, object, zone, command, effect, event, RNG, and rule result;
- add first Vitest cases for deterministic RNG and `MoveObject`;
- add CI and wire real commands into the Codex ops workflow config.

Sprint exit:

- repository is installable and testable;
- `@ucre/core` has the first deterministic rule operation;
- future work can be developed against real validation commands instead of placeholders.

## Key Risks To Watch

- Rule and presentation coupling: prevent by enforcing event/intents as the only bridge.
- DSL overreach: start with 30-50 standard effects and delay arbitrary scripting.
- Determinism leaks: ban `Math.random`, wall-clock time, and presentation RNG from rule code.
- Tooling delay: build replay and event inspection early enough that rule bugs are easy to locate.
- Scope spread: use the three pressure-test rulesets as validation gates, not as parallel full games.
