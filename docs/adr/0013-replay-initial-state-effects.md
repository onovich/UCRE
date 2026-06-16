# ADR 0013 - Replay Initial State Effects

Status: Accepted

Context: Phase 2 needs to replay a completed Slay-like encounter. Ruleset encounters start from ruleset-owned initial state and may require ruleset-specific effect resolvers, while the replay package must remain generic.

Decision: `runReplay` accepts optional `initialState` and optional `effectRegistry` fields. If omitted, replay keeps its original core-only behavior by creating a generic initial state and using core effects. Ruleset packages can pass their own initial state and custom effect registry without making replay depend on a specific ruleset.

Consequences: Replay stays reusable across rulesets, and completed Slay-like command logs can be reproduced with the same command/effect dispatch path used at runtime.

Validation: `packages/replay/src/index.test.ts`, `packages/rulesets/src/slay-like-replay.test.ts`, full project validation, and forbidden dependency/nondeterminism searches validate the behavior.
