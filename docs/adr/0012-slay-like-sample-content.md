# ADR 0012 - Slay Like Sample Content

Status: Accepted

Context: Phase 2 needs enough inline content to prove the ruleset before Phase 3 introduces validated external content authoring and compilation.

Decision: The Slay-like ruleset owns a small inline sample catalog: twelve cards, two enemies, one starter relic, and fixed reward choices. Encounter creation instantiates starter relics as game objects in a dedicated relic zone, while reward choices remain card objects in the reward zone until claimed or destroyed.

Consequences: Phase 2 can test a realistic command flow without waiting for the content compiler. This content is intentionally temporary and should become compiler-fed data in Phase 3 rather than hard-coded long term.

Validation: `packages/rulesets/src/slay-like.test.ts`, full project validation, and forbidden dependency/nondeterminism searches validate the behavior.
