# ADR 0014 - Slay Like Objective Transitions

Status: Accepted

Context: Phase 2 requires the Slay-like vertical slice to expose objectives, not only phases. Core already provides serializable objective state and objective transition events.

Decision: Slay-like encounters initialize two objectives: defeat enemies and survive the encounter. Reward completion marks both objectives succeeded through `checkObjectives`; lethal enemy intent marks the survival objective failed and moves the encounter to the defeat phase. End-turn effect generation predicts lethal intent so the pipeline does not start a new player turn after defeat.

Consequences: Terminal win/loss facts are represented in deterministic `GameState` and replay hashes. The ruleset owns the predicates while core continues to own the generic objective transition helper.

Validation: `packages/rulesets/src/slay-like.test.ts`, `packages/rulesets/src/slay-like-replay.test.ts`, full project validation, and forbidden dependency/nondeterminism searches validate the behavior.
