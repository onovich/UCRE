# ADR 0018 - Content Authoring Loaders

Status: Accepted

Context: Phase 3 needs human-friendly authoring examples while preserving one deterministic manifest model for validation, hashing, and runtime integration.

Decision: `@ucre/content-compiler` owns file loading for `.json`, `.json5`, `.yaml`, and `.yml` manifests. Loader parsing errors are returned as compiler errors, then successful parses flow through the same schema validation, cross-reference validation, canonicalization, and manifest hashing path.

Consequences: Authors can use comments, trailing commas, and YAML structure without adding format-specific behavior to rulesets, replay, UI, or schema consumers. Equivalent JSON, JSON5, and YAML manifests retain the same canonical manifest identity.

Validation: `packages/content-compiler/src/index.test.ts`, JSON5/YAML `pnpm content:lint` smoke runs, full project validation, and architecture searches validate the behavior.
