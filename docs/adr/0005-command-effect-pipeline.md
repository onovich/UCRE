# ADR 0005 - Command Effect Pipeline

Status: Accepted

Context: Phase 1 needs a deterministic path from UI/ruleset commands to resolved core effects without letting callers mutate `GameState` directly.

Decision: Commands are handled through a registry that validates a command and returns an ordered effect list. Effects are resolved through an explicit resolver registry. The default core registry decodes JSON payloads into existing core effect helpers and derives event IDs from command/effect IDs.

Consequences: Rulesets can define legal commands and costs outside core while still resolving through one deterministic effect path. Replay can persist command IDs and effect IDs, then reproduce event ordering and presentation intents.

Validation: `packages/core/src/pipeline.test.ts`, full project validation, and Phase 1 forbidden dependency/nondeterminism searches validate the behavior.
