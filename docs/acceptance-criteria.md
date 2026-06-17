# UCRE Acceptance Criteria

Last updated: 2026-06-17

This document defines the acceptance standard for the completed UCRE Phase 0 through Phase 10 scope described in `docs/development-plan.md`.

## Acceptance Levels

The project is accepted only if all critical gates pass. Advisory findings may remain when they are documented and do not block the current demo scope.

- Critical: failure blocks acceptance.
- Advisory: does not block acceptance, but should be tracked for hardening.

## 1. Scope Completion

Critical criteria:

- Phase 0 through Phase 10 in `docs/development-plan.md` are represented in committed code, tests, and docs.
- The repository contains the planned package/app boundaries: core, replay, content schema/compiler, rulesets, run, run persistence, simulation, presentation, theater, game, editor, replay viewer, sandbox, and desktop wrapper.
- The Phase 10 demo content includes at least 20 cards, 5 relics, 5 enemies, 3 node types, and 1 boss.
- A playable short run exists from first encounter through boss and victory.

Evidence:

- `docs/progress-log.md`
- `packages/rulesets/src/slay-like.ts`
- `apps/game/src/run-demo-model.ts`
- `packages/run-dexie/src/full-run-boss-e2e.test.ts`

## 2. Automated Quality Gates

Critical criteria:

- Frozen dependency restore succeeds.
- Formatting, lint, typecheck, tests, build, architecture check, and docs check all pass through the configured ops workflow.
- All tests pass without skipped required test suites.
- Build succeeds for packages and browser apps.

Required commands:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\EnvCheck.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\RestoreDeps.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
```

## 3. Architecture Boundaries

Critical criteria:

- `packages/core` has no DOM, React, Three.js, GSAP, Dexie, browser storage, ambient clock, or ambient random dependencies.
- Pure rules/runtime packages do not use browser globals or presentation/UI dependencies.
- Rule-affecting randomness remains explicit and seeded.
- Presentation consumes rule events/intents and does not mutate `GameState`.
- UI dispatches commands and displays state rather than directly editing rule internals.

Required checks:

```powershell
corepack pnpm structure:check
rg "Math\.random|Date\.now|performance\.now|requestAnimationFrame" packages/core packages/replay packages/rulesets packages/run packages/sim
rg "window\.|document\.|localStorage|indexedDB" packages/core packages/replay packages/rulesets packages/run packages/sim
```

## 4. Determinism And Replay

Critical criteria:

- Core command/effect behavior is covered by unit tests.
- Slay-like, blackjack-like, and sacrifice-board rulesets each have golden replay coverage.
- Run-level E2E validates replay/save hash behavior.
- Simulation output is deterministic for fixed inputs.

Evidence:

- `packages/replay/fixtures/golden-basic-replay.json`
- `packages/rulesets/fixtures/*-replay.json`
- `packages/run-dexie/src/full-run-boss-e2e.test.ts`
- `packages/sim/src/index.test.ts`

## 5. Content Pipeline And Tools

Critical criteria:

- JSON, JSON5, and YAML manifests compile through the content compiler.
- Invalid references and missing presentation fallbacks are covered by tests.
- Editor-authored content round-trips into Slay-like runtime tests.
- Balance dashboard and static content checks are covered by tests.

Required commands:

```powershell
corepack pnpm content:lint packages/content-compiler/fixtures/slay-like-valid-manifest.json
corepack pnpm content:lint packages/content-compiler/fixtures/slay-like-valid-manifest.json5
corepack pnpm content:lint packages/content-compiler/fixtures/slay-like-valid-manifest.yaml
corepack pnpm content:lint packages/rulesets/fixtures/slay-like-sample-manifest.yaml
```

## 6. Browser Runtime

Critical criteria:

- Game dev server starts through the configured ops workflow.
- Game root URL returns HTTP 200.
- Desktop and 390px mobile CSS viewport screenshots are nonblank.
- Mobile CSS viewport has no horizontal overflow.
- The primary game UI shows scenario controls, playback controls, Three.js theater, resource panel, and inspector without obvious text clipping.

Required checks:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\StartDevServer.cmd
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:5173
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\StopDevServer.cmd
```

Use Chrome DevTools Protocol or an equivalent browser automation tool for viewport screenshots and `scrollWidth` checks.

## 7. Desktop Runtime

Critical criteria:

- Windows Electron portable build succeeds.
- The generated executable exists, is nontrivial in size, starts, and remains alive for the smoke window.

Required commands:

```powershell
corepack pnpm --filter @ucre/desktop package:win
corepack pnpm --filter @ucre/desktop smoke
```

## 8. Documentation And Delivery

Critical criteria:

- Development plan, continuous-delivery workflow, progress log, ops workflow, git workflow, and ADRs are present.
- Final acceptance report records the commands run, pass/fail status, fixes made during acceptance, and residual advisory findings.
- Worktree is clean after the acceptance commit is pushed.

Advisory criteria:

- Large browser chunks should be tracked for future performance hardening.
- Multi-file content lint convenience may be improved, but one-file invocation is acceptable if documented and tested.
