# ADR 0006 - Trigger Queue And Objective Checks

Status: Accepted

Context: Phase 1 needs deterministic trigger scheduling and objective state checks without coupling those checks to UI, presentation, or a specific ruleset.

Decision: `GameState` owns an explicit `triggerQueue` and `objectives` list. Core exposes pure helpers to queue triggers, pop triggers, and evaluate objective definitions. Objective definitions provide runtime predicates, while persisted objective state remains serializable.

Consequences: Rulesets can decide when to queue triggers and which objective predicates to evaluate, while replay can hash the resulting queue and objective states. Terminal objective transitions emit rule events and presentation intents exactly once.

Validation: `packages/core/src/checks.test.ts`, full project validation, and Phase 1 forbidden dependency/nondeterminism searches validate the behavior.
