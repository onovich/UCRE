# ADR 0007 - Replay Runner Hashes

Status: Accepted

Context: Phase 1 needs replay verification from seed, rules version, content hash, command log, final state hash, and event hash.

Decision: `@ucre/replay` runs command logs through core command handlers and the core effect pipeline. It records command, final state, event, and replay hashes using core stable hashing. The replay hash combines seed, rules version, content manifest hash, command hash, state hash, and event hash.

Consequences: Golden replays can lock deterministic behavior before rulesets exist. Failed replays still expose deterministic partial hashes and the failed command for debugging.

Validation: `packages/replay/src/index.test.ts`, `packages/replay/fixtures/golden-basic-replay.json`, full project validation, and Phase 1 forbidden dependency/nondeterminism searches validate the behavior.
