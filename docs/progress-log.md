# UCRE Progress Log

This log is maintained by the long-running Goal mode workflow in `docs/goal-mode-continuous-delivery.md`.

## Current Status

- Current phase: Phase 5 - Three.js Card Theater Vertical Slice
- Baseline before continuous-delivery workflow: `6c3acab docs: add UCRE development plan`
- Next recommended round: add draw and discard movement animation with skip/snap support.

## Round Template

```text
Date:
Round:
Phase:
Deliverable:
Files changed:
Validation:
Result:
Commit:
Notes:
```

## Completed Rounds

### 2026-06-17 - Repository initialization

- Phase: pre-Phase 0
- Deliverable: initialized git repository, configured `origin`, added project workflow docs, added development plan.
- Validation: git status clean after push.
- Result: passed.
- Commits:
  - `1dfbb32 chore: initialize UCRE project`
  - `6c3acab docs: add UCRE development plan`

### 2026-06-17 - Round P0R1

- Phase: Phase 0 - Project Scaffold
- Deliverable: scaffolded the pnpm TypeScript monorepo, package/app placeholders, root validation pipeline, CI workflow, and real Codex ops/git workflow commands.
- Files changed: root workspace/tooling config, `.github/workflows/ci.yml`, `apps/*`, `packages/*`, `scripts/check-architecture.mjs`, `scripts/check-docs.mjs`, `.codex/project-ops-workflow.json`, `.codex/project-git-workflow.json`, and workflow docs.
- Validation: `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd` (`format`, `lint`, `typecheck`, `test`, `build`, `structureCheck`, `docsCheck`).
- Result: passed after repairing a Windows Corepack `pnpm` script path issue and BOM-tolerant docs JSON parsing.
- Commit: `61a0d59 chore: scaffold TypeScript workspace`
- Notes: Phase 0 exit gate is locally satisfied: dependencies install, root validation passes, packages/apps build, and CI-equivalent workflow exists.

### 2026-06-17 - Round P1R1

- Phase: Phase 1 - Deterministic Rules Core
- Deliverable: added public core contracts, immutable deterministic RNG streams, stable state/event hashing, and ADR 0001 for the boundary decision.
- Files changed: `packages/core/src/contracts.ts`, `packages/core/src/rng.ts`, `packages/core/src/hash.ts`, core tests, `packages/core/src/index.ts`, `docs/adr/0001-core-contracts-and-rng.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/core/src`, `corepack pnpm typecheck`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and Phase 1 forbidden dependency/nondeterminism searches.
- Result: passed.
- Commit: `c357c29 feat(core): add deterministic contracts and rng`
- Notes: Core remains free of DOM, React, Three.js, GSAP, Dexie, browser storage, wall-clock reads, and ambient random reads.

### 2026-06-17 - Round P1R2

- Phase: Phase 1 - Deterministic Rules Core
- Deliverable: added immutable object/zone state helpers and the first `MoveObject` effect that emits rule events plus presentation intents.
- Files changed: `packages/core/src/state.ts`, `packages/core/src/effects.ts`, state/effect tests, `packages/core/src/index.ts`, `docs/adr/0002-move-object-effect.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/core/src`, `corepack pnpm typecheck`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and Phase 1 forbidden dependency/nondeterminism searches.
- Result: passed after formatting `packages/core/src/effects.ts`.
- Commit: `13916dd feat(core): implement move object effect`
- Notes: `MoveObject` leaves state unchanged on missing objects, missing zones, or invalid positions, and it does not generate IDs from ambient state.

### 2026-06-17 - Round P1R3

- Phase: Phase 1 - Deterministic Rules Core
- Deliverable: implemented `DrawCards` and `Discard` effects by composing the deterministic `MoveObject` path, with aggregate rule events and presentation intents.
- Files changed: `packages/core/src/effects.ts`, `packages/core/src/effects.test.ts`, `docs/adr/0003-draw-discard-effects.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/core/src`, `corepack pnpm typecheck`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and Phase 1 forbidden dependency/nondeterminism searches.
- Result: passed after fixing optional command/effect id forwarding under `exactOptionalPropertyTypes`.
- Commit: `47bdbf2 feat(core): add draw and discard effects`
- Notes: `DrawCards` draws available cards in source order and leaves reshuffle policy to rulesets; `Discard` emits both movement and discard facts.

### 2026-06-17 - Round P1R4

- Phase: Phase 1 - Deterministic Rules Core
- Deliverable: implemented `GainResource`, `SpendResource`, `AddCounter`, `RemoveCounter`, `DealDamage`, and `Destroy` core effects with rule events and presentation intents.
- Files changed: `packages/core/src/effects.ts`, `packages/core/src/effects.test.ts`, `docs/adr/0004-resource-damage-destroy-effects.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/core/src`, `corepack pnpm typecheck`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and Phase 1 forbidden dependency/nondeterminism searches.
- Result: passed.
- Commit: `d98a69c feat(core): add resource damage and destroy effects`
- Notes: Resource and counter failures leave state unchanged; damage applies block before hit point loss; destroy removes objects from both object map and zone membership.

### 2026-06-17 - Round P1R5

- Phase: Phase 1 - Deterministic Rules Core
- Deliverable: added a command/effect pipeline with command handlers, explicit effect resolver registry, core effect payload decoding, deterministic event ID derivation, and custom resolver support.
- Files changed: `packages/core/src/pipeline.ts`, `packages/core/src/pipeline.test.ts`, `packages/core/src/index.ts`, `docs/adr/0005-command-effect-pipeline.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/core/src`, `corepack pnpm typecheck`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and Phase 1 forbidden dependency/nondeterminism searches.
- Result: passed after repairing `exactOptionalPropertyTypes`, readonly accumulator, and invalid-payload state preservation issues.
- Commit: `f0a21c3 feat(core): add command effect pipeline`
- Notes: Commands validate before effects, effects resolve in order, and payload decode failures keep the current state unchanged.

### 2026-06-17 - Round P1R6

- Phase: Phase 1 - Deterministic Rules Core
- Deliverable: added serializable trigger queue and objective state to `GameState`, plus pure helpers for queueing triggers, popping triggers, and evaluating objective predicates.
- Files changed: `packages/core/src/contracts.ts`, `packages/core/src/checks.ts`, core checks/contracts/hash tests, `packages/core/src/index.ts`, `docs/adr/0006-trigger-objective-checks.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/core/src`, `corepack pnpm typecheck`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and Phase 1 forbidden dependency/nondeterminism searches.
- Result: passed.
- Commit: `684da9f feat(core): add trigger and objective checks`
- Notes: Terminal objective transitions emit once, and queued triggers are part of hashed `GameState`.

### 2026-06-17 - Round P1R7

- Phase: Phase 1 - Deterministic Rules Core
- Deliverable: implemented the replay runner in `@ucre/replay`, added command/state/event/replay hashes, and locked the first golden replay fixture.
- Files changed: `packages/replay/src/index.ts`, `packages/replay/src/index.test.ts`, `packages/replay/fixtures/golden-basic-replay.json`, `docs/adr/0007-replay-runner-hashes.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/replay/src packages/core/src`, `corepack pnpm typecheck`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and Phase 1 forbidden dependency/nondeterminism searches across `packages/core` and `packages/replay`.
- Result: passed.
- Commit: `2fd6872 feat(replay): add golden replay runner`
- Notes: Phase 1 exit gate is locally satisfied: deterministic command logs reproduce final state hash and event hash through a golden replay.

### 2026-06-17 - Round P2R1

- Phase: Phase 2 - First Ruleset Vertical Slice
- Deliverable: scaffolded the Slay-like ruleset with phase names, zone IDs, resource IDs, encounter initialization, starter deck objects, and a draw command registry backed by the core pipeline.
- Files changed: `packages/rulesets/src/slay-like.ts`, `packages/rulesets/src/slay-like.test.ts`, `packages/rulesets/src/index.ts`, `docs/adr/0008-slay-like-ruleset-scaffold.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/rulesets/src packages/core/src`, `corepack pnpm typecheck`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and forbidden dependency/nondeterminism searches across `packages/core` and `packages/rulesets`.
- Result: passed after fixing a narrow TypeScript state inference issue and formatting `packages/rulesets/src/slay-like.ts`.
- Commit: `f4ca835 feat(rulesets): scaffold slay like encounter`
- Notes: Slay-like ruleset state is initialized without UI/presentation dependencies and draws through core `DrawCards`.

### 2026-06-17 - Round P2R2

- Phase: Phase 2 - First Ruleset Vertical Slice
- Deliverable: added Slay-like starter card definitions, Jaw Worm enemy definition, and `slay.playCard` legality/effects for Strike.
- Files changed: `packages/rulesets/src/slay-like.ts`, `packages/rulesets/src/slay-like.test.ts`, `docs/adr/0009-slay-like-card-enemy-commands.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/rulesets/src packages/core/src`, `corepack pnpm typecheck`, `corepack pnpm format:check`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and forbidden dependency/nondeterminism searches across `packages/core` and `packages/rulesets`.
- Result: passed after fixing ruleset effect array type inference and formatting.
- Commit: `61c7c7d feat(rulesets): add slay like card play`
- Notes: `slay.playCard` validates phase, hand membership, energy, and target requirements before resolving through core effects.

### 2026-06-17 - Round P2R3

- Phase: Phase 2 - First Ruleset Vertical Slice
- Deliverable: added deterministic `slay.endTurn` flow, Slay-like enemy intent resolution, next-turn reset/draw, and the ruleset command/effect helper.
- Files changed: `packages/rulesets/src/slay-like.ts`, `packages/rulesets/src/slay-like.test.ts`, `docs/adr/0010-slay-like-turn-effects.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/rulesets/src packages/core/src`, `corepack pnpm typecheck`, `corepack pnpm format:check`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and forbidden dependency/nondeterminism searches across `packages/core` and `packages/rulesets`.
- Result: passed after tightening custom Slay-like effect payload failures to return `INVALID_EFFECT_PAYLOAD` instead of throwing.
- Commit: `684a2fa feat(rulesets): add slay like turn flow`
- Notes: `slay.endTurn` discards the hand, resolves living enemy intents against player block/HP, advances through enemy turn, resets energy/block, starts the next player turn, and draws the next hand through command dispatch.

### 2026-06-17 - Round P2R4

- Phase: Phase 2 - First Ruleset Vertical Slice
- Deliverable: added final-enemy defeat handling, deterministic reward draft opening, `slay.chooseReward`, deck modification through reward claim, and encounter completion.
- Files changed: `packages/rulesets/src/slay-like.ts`, `packages/rulesets/src/slay-like.test.ts`, `docs/adr/0011-slay-like-reward-completion.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/rulesets/src packages/core/src`, `corepack pnpm typecheck`, `corepack pnpm format:check`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and forbidden dependency/nondeterminism searches across `packages/core` and `packages/rulesets`.
- Result: passed after fixing a strict optional HP read and formatting the ruleset file.
- Commit: `46eda40 feat(rulesets): add slay like rewards`
- Notes: Lethal card damage now destroys the final living enemy, opens fixed reward choices, moves the selected reward card into the discard pile, removes unchosen rewards, and reaches `complete` through command dispatch.

### 2026-06-17 - Round P2R5

- Phase: Phase 2 - First Ruleset Vertical Slice
- Deliverable: expanded inline Slay-like sample content to twelve card definitions, two enemy definitions, one starter relic definition, a relic zone/object in encounter state, and richer reward choices.
- Files changed: `packages/rulesets/src/slay-like.ts`, `packages/rulesets/src/slay-like.test.ts`, `docs/adr/0012-slay-like-sample-content.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/rulesets/src packages/core/src`, `corepack pnpm typecheck`, `corepack pnpm format:check`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and forbidden dependency/nondeterminism searches across `packages/core` and `packages/rulesets`.
- Result: passed.
- Commit: `68b091f feat(rulesets): expand slay like sample content`
- Notes: The expanded catalog remains inline until Phase 3 moves card, enemy, relic, and reward data through schema validation and compilation.

### 2026-06-17 - Round P2R6

- Phase: Phase 2 - First Ruleset Vertical Slice
- Deliverable: extended replay to accept ruleset initial state/effect registries and added a golden Slay-like completed-encounter replay fixture.
- Files changed: `packages/replay/src/index.ts`, `packages/rulesets/src/slay-like-replay.test.ts`, `packages/rulesets/fixtures/slay-like-completed-replay.json`, `packages/rulesets/package.json`, `packages/rulesets/tsconfig.json`, `pnpm-lock.yaml`, `docs/adr/0013-replay-initial-state-effects.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/rulesets/src packages/replay/src packages/core/src`, `corepack pnpm typecheck`, `corepack pnpm format:check`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and forbidden dependency/nondeterminism searches across `packages/core`, `packages/rulesets`, and `packages/replay`.
- Result: passed after rebuilding stale replay output before locking the Slay-like fixture hashes.
- Commit: `4b39818 feat(rulesets): add slay like replay fixture`
- Notes: The fixture replays draw, two Strike commands, and reward choice to reproduce final `complete` state and stable command/state/event/replay hashes.

### 2026-06-17 - Round P2R7

- Phase: Phase 2 - First Ruleset Vertical Slice
- Deliverable: added explicit Slay-like objective state, terminal success/failure objective transitions, defeat phase handling, and refreshed completed-encounter replay hashes.
- Files changed: `packages/rulesets/src/slay-like.ts`, `packages/rulesets/src/slay-like.test.ts`, `packages/rulesets/fixtures/slay-like-completed-replay.json`, `docs/adr/0014-slay-like-objective-transitions.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/rulesets/src packages/replay/src packages/core/src`, `corepack pnpm typecheck`, `corepack pnpm format:check`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and forbidden dependency/nondeterminism searches across `packages/core`, `packages/rulesets`, and `packages/replay`.
- Result: passed after refreshing replay hashes to include objective state and objective transition events.
- Commit: `bbe00fb feat(rulesets): add slay like objectives`
- Notes: Phase 2 exit gate is locally satisfied: a Slay-like encounter can complete through command dispatch, enemy intent resolves deterministically, reward draft modifies the deck, and replay reproduces the encounter.

### 2026-06-17 - Round P3R1

- Phase: Phase 3 - Content Schema And Compiler
- Deliverable: added strict Zod authoring schemas for manifests, cards, relics, enemies, resources, zones, objectives, commands, effects, presentation profiles, and reward pools.
- Files changed: `packages/content-schema/package.json`, `packages/content-schema/src/index.ts`, `packages/content-schema/src/index.test.ts`, `pnpm-lock.yaml`, `docs/adr/0015-content-authoring-schemas.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/content-schema/src`, `corepack pnpm typecheck`, `corepack pnpm format:check`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and forbidden dependency/nondeterminism searches across core, replay, rulesets, content schema, and content compiler packages.
- Result: passed.
- Commit: `9e15c9b feat(content): add authoring schemas`
- Notes: Schema validation normalizes optional arrays/payloads and rejects malformed scalar values or unknown authoring keys before compiler cross-reference checks.

### 2026-06-17 - Round P3R2

- Phase: Phase 3 - Content Schema And Compiler
- Deliverable: added content compiler parsing, cross-reference validation, deterministic canonical manifest JSON, and compiler tests for invalid references/fallbacks.
- Files changed: `packages/content-compiler/src/index.ts`, `packages/content-compiler/src/index.test.ts`, `docs/adr/0016-content-compiler-validation.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/content-compiler/src packages/content-schema/src`, `corepack pnpm typecheck`, `corepack pnpm format:check`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and forbidden dependency/nondeterminism searches across core, replay, rulesets, content schema, and content compiler packages.
- Result: passed.
- Commit: `f36780a feat(content): add compiler validation`
- Notes: Compiler validation now rejects duplicate IDs, missing reward cards, missing resource/zone references, missing explicit presentation profiles, and missing fallback profiles before runtime.

### 2026-06-17 - Round P3R3

- Phase: Phase 3 - Content Schema And Compiler
- Deliverable: added stable manifest hash generation, content compiler CLI entry point, workspace `content:lint` command, and a valid JSON manifest lint fixture.
- Files changed: `package.json`, `packages/content-compiler/package.json`, `packages/content-compiler/tsconfig.json`, `packages/content-compiler/src/index.ts`, `packages/content-compiler/src/index.test.ts`, `packages/content-compiler/src/cli.ts`, `packages/content-compiler/fixtures/slay-like-valid-manifest.json`, `pnpm-lock.yaml`, `docs/adr/0017-content-manifest-hash-lint.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/content-compiler/src packages/content-schema/src`, `corepack pnpm typecheck`, `corepack pnpm format:check`, `corepack pnpm --filter @ucre/content-compiler build`, `corepack pnpm content:lint packages/content-compiler/fixtures/slay-like-valid-manifest.json`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`, and forbidden dependency/nondeterminism searches across core, replay, rulesets, content schema, and content compiler packages.
- Result: passed.
- Commit: `8d827d1 feat(content): add manifest hash lint`
- Notes: Manifest hashes are computed from canonicalized content via core `stableHash`, so equivalent authoring order produces the same manifest identity.

### 2026-06-17 - Round P3R4

- Phase: Phase 3 - Content Schema And Compiler
- Deliverable: added JSON5 and YAML authoring file loader support, equivalent authoring fixtures, and CLI lint coverage for JSON, JSON5, and YAML manifests.
- Files changed: `packages/content-compiler/package.json`, `packages/content-compiler/src/index.ts`, `packages/content-compiler/src/index.test.ts`, `packages/content-compiler/src/cli.ts`, `packages/content-compiler/fixtures/slay-like-valid-manifest.json5`, `packages/content-compiler/fixtures/slay-like-valid-manifest.yaml`, `pnpm-lock.yaml`, `docs/adr/0018-content-authoring-loaders.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/content-compiler/src packages/content-schema/src`, `corepack pnpm typecheck`, `corepack pnpm format:check`, `corepack pnpm --filter @ucre/content-compiler build`, `corepack pnpm content:lint packages/content-compiler/fixtures/slay-like-valid-manifest.json5`, `corepack pnpm content:lint packages/content-compiler/fixtures/slay-like-valid-manifest.yaml`, full project validation, and forbidden dependency/nondeterminism searches across core, replay, rulesets, content schema, and content compiler packages.
- Result: passed.
- Commit: `aec9bd2 feat(content): add authoring file loaders`
- Notes: JSON, JSON5, and YAML variants of the sample manifest produce the same canonical manifest hash, `ucre1-03523306`.

### 2026-06-17 - Round P3R5

- Phase: Phase 3 - Content Schema And Compiler
- Deliverable: added a Slay-like compiled-content adapter, a full YAML sample manifest, and a ruleset command-flow test that loads compiler-validated content into the Phase 2 encounter path.
- Files changed: `packages/rulesets/package.json`, `packages/rulesets/tsconfig.json`, `packages/rulesets/src/slay-like.ts`, `packages/rulesets/src/slay-like.test.ts`, `packages/rulesets/fixtures/slay-like-sample-manifest.yaml`, `pnpm-lock.yaml`, `docs/adr/0019-slay-like-compiled-content.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/rulesets/src packages/content-compiler/src packages/content-schema/src`, `corepack pnpm typecheck`, `corepack pnpm content:lint packages/rulesets/fixtures/slay-like-sample-manifest.yaml`, full project validation, and forbidden dependency/nondeterminism searches across core, replay, rulesets, content schema, and content compiler packages.
- Result: passed.
- Commit: `960c182 feat(rulesets): load compiled slay content`
- Notes: Phase 3 exit gate is locally satisfied: authoring content is schema-validated, compiled, linted, hashed, and loaded into Slay-like ruleset command tests without UI or file parsing inside the ruleset runtime.

### 2026-06-17 - Round P4R1

- Phase: Phase 4 - Game Shell And Devtools
- Deliverable: replaced the placeholder game app with a React Slay-like command-dispatch shell showing resources, hand cards, enemy intent, rewards, event log, debug metadata, and state summary.
- Files changed: `apps/game/package.json`, `apps/game/src/App.tsx`, `apps/game/src/styles.css`, `.codex/project-ops-workflow.json`, `docs/codex-ops-workflow.md`, `pnpm-lock.yaml`, `docs/adr/0020-game-shell-command-boundary.md`, and this progress log.
- Validation: `corepack pnpm typecheck`, `corepack pnpm --filter @ucre/game build`, `corepack pnpm --filter @ucre/sandbox build`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\StartDevServer.cmd`, `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd`, browser smoke for Draw -> Strike -> Strike -> choose Iron Wave, mobile 390px overflow check, browser console check, direct UI state mutation audit, full project validation, and forbidden dependency/nondeterminism searches.
- Result: passed.
- Commit: `9d584a2 feat(game): add command dispatch shell`
- Notes: The app renders default Slay-like state and all gameplay changes flow through `executeSlayLikeCommand`; the dev-server wrapper now runs the game shell at `http://127.0.0.1:5173`.

### 2026-06-17 - Round P4R2

- Phase: Phase 4 - Game Shell And Devtools
- Deliverable: added command legality previews, selected target previews, and a latest-command state diff panel to the React game shell.
- Files changed: `apps/game/src/App.tsx`, `apps/game/src/styles.css`, and this progress log.
- Validation: `corepack pnpm typecheck`, `corepack pnpm --filter @ucre/game build`, dev-server wrapper start/smoke/stop, browser smoke for preview -> Draw -> Strike -> End Turn, mobile 390px overflow check, browser console check, direct UI state mutation audit, full project validation, and forbidden dependency/nondeterminism searches.
- Result: passed.
- Commit: `03291fd feat(game): add command previews and state diff`
- Notes: Preview uses the same Slay-like command helper against the current immutable state and only displays the simulated result; committed UI state still changes only from dispatched command results.

### 2026-06-17 - Round P4R3

- Phase: Phase 4 - Game Shell And Devtools
- Deliverable: expanded the game shell debug area into a Run Inspector with rules version, seed, content hash, command count, RNG stream status, trigger queue entries, and objective details.
- Files changed: `apps/game/src/App.tsx`, `apps/game/src/styles.css`, and this progress log.
- Validation: `corepack pnpm typecheck`, `corepack pnpm --filter @ucre/game build`, dev-server wrapper start/smoke/stop, browser Run Inspector smoke, mobile 390px overflow check, browser console check, direct UI state mutation audit, full project validation, and forbidden dependency/nondeterminism searches.
- Result: passed.
- Commit: `d0d9991 feat(game): add run inspector diagnostics`
- Notes: Phase 4 exit gate is locally satisfied: the browser shell can start, draw, play a card, end a turn, inspect event/state/debug panels, and no UI path mutates `GameState` outside command dispatch.

### 2026-06-17 - Round P5R1

- Phase: Phase 5 - Three.js Card Theater Vertical Slice
- Deliverable: added the `theater-three` scene shell with camera, lights, table root, stable anchors, state-derived card count rendering, and full-width game app canvas integration.
- Files changed: `packages/theater-three/package.json`, `packages/theater-three/tsconfig.json`, `packages/theater-three/src/index.ts`, `packages/theater-three/src/index.test.ts`, `apps/game/package.json`, `apps/game/src/App.tsx`, `apps/game/src/TheaterCanvas.tsx`, `apps/game/src/styles.css`, `pnpm-lock.yaml`, `docs/adr/0021-three-card-theater-scene.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/theater-three/src`, `corepack pnpm typecheck`, `corepack pnpm --filter @ucre/theater-three build`, `corepack pnpm --filter @ucre/game build`, dev-server wrapper start/smoke/stop, browser canvas DOM smoke, Chrome headless screenshot pixel smoke with non-background canvas-center ratio `0.2609`, mobile 390px canvas/layout overflow check, browser console check, full project validation, and forbidden dependency/nondeterminism searches.
- Result: passed.
- Commit: `fd5490c feat(theater): add three scene shell`
- Notes: Three.js remains isolated to `@ucre/theater-three` and the game app; core, rulesets, replay, and content packages stay free of presentation dependencies.

### 2026-06-17 - Round P5R2

- Phase: Phase 5 - Three.js Card Theater Vertical Slice
- Deliverable: replaced count-only theater input with stable card/enemy/reward actors, added anchor grouping, and mapped Slay-like zones to theater anchors from the game app adapter.
- Files changed: `packages/theater-three/src/index.ts`, `packages/theater-three/src/index.test.ts`, `apps/game/src/TheaterCanvas.tsx`, `apps/game/index.html`, `docs/adr/0022-theater-actor-anchor-sync.md`, and this progress log.
- Validation: `corepack pnpm test -- packages/theater-three/src`, `corepack pnpm typecheck`, `corepack pnpm --filter @ucre/theater-three build`, `corepack pnpm --filter @ucre/game build`, dev-server wrapper start/smoke/stop, browser actor overlay smoke for Draw and Strike, headless browser console smoke, mobile 390px canvas/layout overflow check, Chrome headless screenshot pixel smoke with non-background canvas-center ratio `0.2609`, full project validation, and architecture boundary searches.
- Result: passed.
- Commit: pending.
- Notes: Theater actors preserve object IDs and labels for later movement diffing while keeping Three.js and theater contracts out of deterministic packages.
