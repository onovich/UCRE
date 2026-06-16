# ADR 0015 - Content Authoring Schemas

Status: Accepted

Context: Phase 3 moves ruleset content from code into validated authoring data. The first step is a shared schema surface that can reject malformed authoring input before compiler cross-reference checks run.

Decision: `@ucre/content-schema` uses Zod to define strict schemas for cards, relics, enemies, resources, zones, objectives, commands, effects, presentation profiles, reward pools, and complete manifests. Schema parsing applies safe defaults for optional arrays and payloads, while unknown keys and invalid scalar values fail immediately.

Consequences: The compiler can build on a typed, normalized manifest instead of validating raw unknown data from scratch. Cross-reference and canonical-output checks remain compiler responsibilities in later Phase 3 rounds.

Validation: `packages/content-schema/src/index.test.ts`, full project validation, and architecture searches validate the behavior.
