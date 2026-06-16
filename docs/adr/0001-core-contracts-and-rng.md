# ADR 0001 - Core Contracts And RNG

Status: Accepted

Context: Phase 1 needs a deterministic rule core that can run without UI, DOM, Three.js, GSAP, browser storage, wall-clock time, or ambient randomness.

Decision: `@ucre/core` exposes serializable contracts for game state, objects, zones, resources, commands, effects, rule events, rule results, and presentation intents. Rule-affecting randomness flows through explicit immutable RNG stream state created from a seed and stream name. Stable state and event hashes use canonical key ordering and an internal deterministic FNV-1a-style hash.

Consequences: Rulesets and replay code can depend on public core contracts without pulling in presentation or UI dependencies. Future effect pipelines must thread RNG state explicitly instead of calling ambient random sources. Hashes are stable for tests and replay fixtures, but they are not cryptographic integrity proofs.

Validation: `corepack pnpm test`, `corepack pnpm structure:check`, and the Phase 1 forbidden dependency/nondeterminism searches cover the boundary.
