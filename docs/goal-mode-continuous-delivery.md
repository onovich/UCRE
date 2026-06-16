# Goal Mode Continuous Delivery Workflow

Last updated: 2026-06-17

This workflow is the operating contract for a long-running AI agent working through `docs/development-plan.md` in Goal mode. The agent should complete one small, verifiable round at a time. A round is not complete until architecture checks pass, validation passes, the work is committed, pushed, and recorded in `docs/progress-log.md`.

## Goal Mode Objective Template

Use a concrete objective like this:

```text
Complete UCRE development from the current repository state by following docs/development-plan.md and docs/goal-mode-continuous-delivery.md.

Work one round at a time. For every round:
1. choose a small deliverable from the current phase;
2. confirm architecture boundaries before editing;
3. implement the smallest coherent change;
4. add or update tests and checks;
5. run the required validation gates;
6. if any gate fails, repair and rerun until green;
7. only when green, update docs/progress-log.md, commit, push to origin/main, and continue to the next round.

Do not skip validation. Do not push broken work. Stop only for an external blocker, destructive operation, missing product decision, or repeated unsolved failure after the blocker policy is met.
```

## Round Size Rule

Each round should have one primary deliverable. Prefer small vertical progress over broad partial rewrites.

Good round shapes:

- add workspace scaffold and make `pnpm test` pass;
- implement deterministic RNG and its tests;
- implement `MoveObject` plus event emission and tests;
- add one golden replay fixture;
- add one browser smoke test for one UI flow.

Too large for one round:

- implement the whole rule engine;
- scaffold all apps and implement gameplay;
- build Three.js theater plus presentation director plus replay viewer;
- refactor multiple layers without a new testable behavior.

If a planned round touches more than two major packages, split it unless the change is a mechanical setup step.

## Required Round Manifest

At the start of every round, write a short internal manifest before editing:

```text
Round:
Phase:
Deliverable:
Files/packages expected:
Architecture boundaries:
Validation gates:
Commit message:
```

The manifest does not need to be committed separately. It is a thinking checkpoint to prevent scope drift.

## Per-Round Loop

### 1. Resume And Sync

Start every round by checking:

- `git status --short --branch`
- recent commits if needed: `git log --oneline --decorate -5`
- current phase status in `docs/progress-log.md`
- current phase requirements in `docs/development-plan.md`

Rules:

- Work only from a clean or understood worktree.
- Preserve unrelated user changes.
- If local and remote diverge, stop and ask unless the resolution is obviously a fast-forward pull with no local changes.
- Never use force push.

### 2. Select The Next Deliverable

Pick the first unfinished item that unlocks later validation. For UCRE, default priority is:

1. repository validation pipeline;
2. deterministic core contracts;
3. rule behavior with unit tests;
4. replay and hashes;
5. content compilation;
6. visible browser/debug shell;
7. Three.js presentation;
8. wider ruleset pressure tests;
9. editor and simulation tools;
10. desktop/demo packaging.

If two tasks compete, choose the one that improves testability or observability first.

### 3. Architecture Confirmation Gate

Before editing, confirm the change obeys these boundaries:

- `packages/core` has no DOM, React, Three.js, GSAP, browser storage, frame timing, `Date.now`, or `Math.random`.
- Rules mutate state only through commands and effects.
- All rule-affecting randomness comes from explicit seeded RNG streams.
- Presentation consumes `RuleEvent` and `PresentationIntent`; it never writes `GameState`.
- UI sends commands and renders state; it never edits rule state directly.
- Content authoring data compiles into validated runtime bundles with a manifest hash.
- Replay depends on seed, rules version, content hash, command log, state hash, and event hash.

If the round changes a public boundary, also update or add a short ADR under `docs/adr/`.

ADR minimum format:

```text
# ADR N - Title

Status:
Context:
Decision:
Consequences:
Validation:
```

### 4. Implement

Implementation rules:

- Prefer existing package boundaries from `docs/development-plan.md`.
- Add tests with behavior, not just snapshots of implementation detail.
- Keep compatibility code small and documented.
- Avoid new abstractions unless at least two call sites need them or the architecture requires the boundary.
- Do not add gameplay content that cannot be validated by tests, content lint, replay, or smoke checks.

### 5. Self Review Before Running Full Gates

Review the diff manually:

- Does the change match the round manifest?
- Are unrelated files untouched?
- Are public exports intentional?
- Are test names descriptive?
- Are errors actionable?
- Did any rule-layer code import forbidden presentation/UI/runtime dependencies?
- Did any code introduce nondeterminism?
- Did docs or progress logs need updating?

Useful architecture searches once code exists:

```powershell
rg "Math\\.random|Date\\.now|performance\\.now|requestAnimationFrame" packages/core
rg "from ['\\\"](react|three|gsap|dexie)" packages/core
rg "window\\.|document\\.|localStorage|indexedDB" packages/core
```

### 6. Validation Gates

Run the smallest relevant failing check first while repairing, then run the full gate before commit.

Baseline gates once Phase 0 exists:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Recommended root validation alias:

```powershell
pnpm validate
```

Also keep `.codex/project-ops-workflow.json` and `docs/codex-ops-workflow.md` updated so Codex can use:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
```

Phase-specific gates:

| Phase | Required gates before push |
| --- | --- |
| Phase 0 scaffold | install, lint, typecheck, test, build, CI workflow syntax check |
| Phase 1 rules core | unit tests, deterministic RNG tests, state/event hash tests, architecture forbidden-import search |
| Phase 2 first ruleset | ruleset unit tests, one complete encounter test, golden replay |
| Phase 3 content compiler | schema tests, invalid fixture tests, content lint, manifest hash stability test |
| Phase 4 game shell | unit tests, browser smoke, command dispatch smoke, no direct state mutation audit |
| Phase 5 Three.js theater | build, browser smoke, screenshot smoke, canvas nonblank/pixel check, layout overlap check |
| Phase 6 presentation director | skip/fast-forward hash invariance tests, beat scheduling tests, browser smoke |
| Phase 7 run loop | run-level tests, save/load test, replay after reload, Dexie/browser smoke |
| Phase 8 pressure rulesets | golden replay for all active rulesets, shared core boundary audit |
| Phase 9 editor/simulation | editor smoke, content compile round-trip, deterministic simulation run, dashboard data test |
| Phase 10 desktop demo | full run E2E, replay verification, Electron build smoke, performance smoke |

No round may push if its required gates fail.

### 7. Failure Repair Loop

When a gate fails:

1. Copy or summarize the failing command and failing assertion/error.
2. Classify the failure:
   - implementation bug;
   - test expectation bug;
   - architecture violation;
   - dependency/configuration issue;
   - flaky timing or browser issue;
   - product/design ambiguity.
3. Fix the smallest cause.
4. Rerun the failing command.
5. When the failing command passes, rerun the full required gate.

If the same failure class repeats three repair attempts in the same round:

- reduce the round scope if possible;
- commit nothing broken;
- record the blocker in `docs/progress-log.md` only if the log change itself is useful and accurate;
- ask the user if the blocker requires a product choice, credentials, external service change, or destructive operation.

Do not bypass a failing test by deleting the test, weakening the assertion, or moving the behavior out of scope unless the architecture review says the test was invalid.

### 8. Architecture Decision Rule

Add an ADR when any of these happen:

- a package boundary changes;
- a public data contract changes;
- a dependency is added to a core package;
- deterministic behavior is affected;
- replay/hash format changes;
- content schema changes in a backward-incompatible way;
- browser/Electron storage strategy changes;
- presentation scheduling semantics change.

No ADR is needed for small local implementation details.

### 9. Progress Log Update

Before committing a passing round, update `docs/progress-log.md` with:

- date;
- round ID;
- phase;
- deliverable;
- files changed summary;
- validation commands run;
- result;
- commit hash after commit, if known.

If the commit hash is not known before commit, add it in the next round's opening log maintenance or include it in the final response.

### 10. Commit And Push Gate

Only after all required gates pass:

1. Check status.
2. Stage only files belonging to the round.
3. Commit with a conventional message.
4. Push to `origin/main`.
5. Verify `main...origin/main` is clean.

Preferred wrapper:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "type: concise message" -Paths path1,path2
```

Commit message examples:

- `chore: scaffold TypeScript workspace`
- `feat(core): add deterministic RNG streams`
- `feat(core): implement MoveObject events`
- `test(replay): add first golden replay`
- `feat(theater): render card actors and zone anchors`
- `docs: record architecture decision for replay hashing`

### 11. Continue Or Stop

Continue automatically when:

- worktree is clean;
- push succeeded;
- next deliverable is clear from `docs/development-plan.md`;
- no external decision is needed.

Stop and ask when:

- a destructive operation is required;
- credentials, paid service setup, or remote permissions fail;
- product direction is ambiguous and cannot be inferred from docs;
- a remote conflict cannot be safely resolved;
- the same blocker repeats according to the failure policy;
- continuing would require weakening architecture boundaries.

## Phase Exit Gates

A phase is complete only when all phase deliverables in `docs/development-plan.md` are done and the phase exit gate passes.

| Phase | Exit gate |
| --- | --- |
| Phase 0 | Fresh checkout can install, validate, build, and run CI-equivalent checks locally. |
| Phase 1 | Core can execute deterministic command logs and reproduce state/event hashes. |
| Phase 2 | Slay-like encounter completes by command dispatch and replays deterministically. |
| Phase 3 | Content can be authored, compiled, linted, hashed, and loaded into ruleset tests. |
| Phase 4 | Browser shell can play a minimal encounter through UI commands with debug panels. |
| Phase 5 | Three.js theater visually represents core card movement and passes screenshot smoke. |
| Phase 6 | Presentation beats support skip/fast-forward without changing rule hashes. |
| Phase 7 | A short run can be saved, reloaded, replayed, and completed. |
| Phase 8 | Slay-like, blackjack-like, and sacrifice-board rulesets share the same core model. |
| Phase 9 | A new card can be created through tools, compiled, simulated, played, and replayed. |
| Phase 10 | A polished short demo can be played end to end and packaged for desktop smoke testing. |

## Suggested Round Breakdown

This is a starting map. The agent may split further when validation suggests it.

### Phase 0 - 2 to 4 rounds

1. Workspace package manager, root scripts, TypeScript base config.
2. Lint, format, Vitest, package skeletons.
3. Vite app placeholders and CI.
4. Wire real ops workflow commands.

### Phase 1 - 6 to 10 rounds

1. Core types and package exports.
2. Deterministic RNG streams.
3. Object and zone model.
4. Command and effect pipeline.
5. Event ledger and state/event hash.
6. `MoveObject`, `DrawCards`, `Discard`.
7. resources, damage, destroy.
8. trigger queue and objective checks.
9. replay runner and first golden replay.

### Phase 2 - 4 to 6 rounds

1. Slay-like phase machine, resources, zones.
2. starter cards and enemies.
3. command legality and target selection.
4. enemy intent resolution.
5. reward draft and encounter completion.
6. golden replay for full encounter.

### Phase 3 - 4 to 6 rounds

1. Zod schema package.
2. YAML/JSON5 loader and canonical bundle.
3. cross-reference validation.
4. manifest hash.
5. content lint command.
6. migrate Slay-like sample content.

### Phase 4 - 5 to 7 rounds

1. React game shell.
2. command dispatch UI.
3. event log and state inspector.
4. RNG and trigger queue panels.
5. legal command and target preview.
6. Playwright browser smoke.

### Phase 5 - 6 to 9 rounds

1. Three.js scene and app integration.
2. card actor model.
3. zone anchors.
4. hand fan layout.
5. draw and discard animations.
6. card texture generation.
7. screenshot and canvas pixel smoke.

### Phase 6 - 5 to 8 rounds

1. presentation intent contracts.
2. beat scheduler.
3. GSAP timeline adapter.
4. move/damage/destroy profiles.
5. skip and fast-forward.
6. event-to-beat devtools view.

### Phase 7 - 5 to 8 rounds

1. RunState and map graph.
2. node resolver and encounter nodes.
3. reward and deck modification loop.
4. save package and Dexie persistence.
5. run replay viewer integration.
6. short run E2E.

### Phase 8 - 7 to 12 rounds

1. blackjack zones, resources, and phases.
2. blackjack commands and dealer policy.
3. blackjack replay.
4. sacrifice-board topology and slots.
5. sacrifice costs and lane combat.
6. scale objective and replay.
7. extract shared mechanics only after duplication is visible.

### Phase 9 - 7 to 12 rounds

1. card editor MVP.
2. relic and enemy editor MVP.
3. reward pool editor.
4. content compile round-trip.
5. simulation CLI.
6. balance metrics output.
7. dashboard MVP.

### Phase 10 - 8 to 14 rounds

1. short run content target.
2. boss encounter.
3. presentation polish passes.
4. fast mode and performance pass.
5. full run E2E.
6. Electron packaging.
7. desktop smoke.
8. final release checklist.

## Continuous Quality Bar

Every pushed commit should satisfy:

- no known failing required gate;
- no rule determinism leak;
- no presentation-to-rule mutation path;
- no UI direct state mutation;
- no content loaded without validation;
- tests added for new rule behavior;
- replay/hash behavior updated when relevant;
- docs updated when architecture or workflow changes.

The project can tolerate temporary feature gaps. It should not tolerate hidden nondeterminism, untested rule behavior, or blurred architecture boundaries.
