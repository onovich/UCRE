# ADR 0019 - Slay Like Compiled Content

Status: Accepted

Context: Phase 3 acceptance requires compiled content to feed the Phase 2 Slay-like ruleset tests. The ruleset previously read card definitions and reward draft choices from module-level sample constants only.

Decision: `@ucre/rulesets` exposes a Slay-like manifest adapter that converts an already compiled `ContentManifest` plus manifest hash into encounter content: card definitions, starter deck objects, enemy objects, relic objects, and reward draft objects. The command and effect registries can receive this runtime content while defaulting to the existing inline sample content for compatibility. File loading and YAML/JSON parsing remain owned by `@ucre/content-compiler`.

Consequences: Slay-like tests can prove that validated authoring data changes real command legality and effect output without letting runtime rulesets parse files or bypass command/effect dispatch. The rulesets package depends on the content schema contract and uses the compiler only in tests.

Validation: `packages/rulesets/src/slay-like.test.ts`, `corepack pnpm content:lint packages/rulesets/fixtures/slay-like-sample-manifest.yaml`, full project validation, and architecture searches validate the boundary.
