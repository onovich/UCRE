# ADR 0016 - Content Compiler Validation

Status: Accepted

Context: Phase 3 needs authoring data to fail before runtime when references are invalid, duplicate IDs exist, or presentation fallbacks are missing.

Decision: `@ucre/content-compiler` parses manifests through `@ucre/content-schema`, then performs compiler-owned cross-reference checks for duplicate IDs, reward card references, resource and zone payload references, explicit presentation profiles, and fallback presentation profiles. Successful compilation emits deterministic canonical JSON by sorting manifest collections and object keys.

Consequences: Runtime code can consume a normalized manifest instead of raw authoring input. Manifest hashing and file-based linting can build on the canonical JSON in later Phase 3 rounds.

Validation: `packages/content-compiler/src/index.test.ts`, full project validation, and architecture searches validate the behavior.
