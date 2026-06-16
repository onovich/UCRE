# ADR 0009 - Slay Like Card Enemy Commands

Status: Accepted

Context: Phase 2 needs starter cards, an enemy, and command legality before an encounter can progress through command dispatch.

Decision: The Slay-like ruleset owns starter card definitions, enemy definitions, and the `slay.playCard` command handler. The handler validates phase, hand membership, energy, and target requirements, then resolves through core effects for spending energy, moving cards, dealing damage, gaining block, and discarding.

Consequences: Card and enemy semantics stay ruleset-specific while all state mutation still flows through core effects. This keeps UI and future content tooling from bypassing the rules engine.

Validation: `packages/rulesets/src/slay-like.test.ts`, full project validation, and forbidden dependency/nondeterminism searches validate the behavior.
