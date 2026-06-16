# ADR 0017 - Content Manifest Hash Lint

Status: Accepted

Context: Phase 3 needs manifest hashes and a content lint command so authoring data can be validated and identified before runtime.

Decision: `@ucre/content-compiler` computes `manifestHash` from the canonicalized manifest using core `stableHash`. The package exposes a built Node CLI, `ucre-content-lint`, and the workspace exposes `pnpm content:lint <manifest.json>` to parse, validate, hash, and print canonical JSON for JSON manifests.

Consequences: Manifest identity is deterministic across authoring key/collection order, and local/CI workflows can lint content files without loading game UI code.

Validation: `packages/content-compiler/src/index.test.ts`, `corepack pnpm content:lint packages/content-compiler/fixtures/slay-like-valid-manifest.json`, full project validation, and architecture searches validate the behavior.
