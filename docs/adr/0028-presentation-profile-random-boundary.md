# ADR 0028 - Presentation Profile Random Boundary

Status: Accepted

Context: Phase 6 requires trigger, reward, camera, and randomized presentation behavior without allowing presentation choices to affect deterministic rule simulation.

Decision: `@ucre/presentation-core` owns renderer-neutral trigger, reward, and camera beat profiles plus a namespaced presentation random stream helper. The helper takes an explicit seed and stream id, advances by cursor, and produces presentation-only samples without using rule RNG streams or ambient randomness.

Consequences: Renderer adapters can consume explicit profile shapes and optional presentation randomness while `GameState`, command logs, rule RNG, and replay hashes remain unchanged by skip, fast-forward, camera, VFX, or layout choices.

Validation: Presentation-core unit tests, Phase 6 browser smoke, full project validation, and architecture searches validate that the boundary remains pure and free of DOM, renderer, frame timing, ambient random, or rule mutation paths.
