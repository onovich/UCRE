# ADR 0008 - Slay Like Ruleset Scaffold

Status: Accepted

Context: Phase 2 needs the first concrete ruleset vertical slice to prove that rulesets can use core state, zones, resources, and command handlers without duplicating engine behavior.

Decision: The Slay-like ruleset starts as a TypeScript ruleset module in `@ucre/rulesets`. It owns its phase names, zone IDs, resource IDs, starter deck object creation, and command registry. The first command delegates drawing to the core `DrawCards` effect through the command/effect pipeline.

Consequences: Ruleset-specific semantics stay outside `@ucre/core`, while command resolution still uses the shared deterministic engine path. Later rounds can add card definitions, enemies, legality, intent resolution, rewards, and replay fixtures on top of this scaffold.

Validation: `packages/rulesets/src/slay-like.test.ts`, full project validation, and Phase 2 ruleset unit tests validate the behavior.
