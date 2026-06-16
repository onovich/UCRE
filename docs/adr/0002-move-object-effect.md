# ADR 0002 - MoveObject Effect

Status: Accepted

Context: Phase 1 needs the first rule behavior to prove that state changes, event emission, and presentation intent emission share one deterministic path.

Decision: `MoveObject` is a core effect helper that takes explicit object, target zone, event, and optional intent identifiers. It returns a `RuleResult`, updates `GameState` immutably, emits an `ObjectMoved` rule event, and emits a `MoveObject` presentation intent that mirrors the event payload. Missing objects, missing zones, and invalid positions return failed rule results without changing state.

Consequences: Rulesets can move cards without touching zones directly, while presentation code can observe movement facts without mutating rule state. ID creation remains outside the helper so callers can derive IDs from command/effect sequencing later.

Validation: `packages/core/src/effects.test.ts`, `corepack pnpm structure:check`, and Phase 1 forbidden dependency/nondeterminism searches validate the boundary.
