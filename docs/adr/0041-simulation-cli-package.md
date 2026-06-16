# ADR 0041: Simulation CLI Package

Status: Accepted

Context: Phase 9 needs deterministic simulation tooling for balance workflows. Simulation depends on rulesets, replay, and command policies, so it should not live inside the pure run-state package or deterministic core.

Decision: Add `@ucre/sim` as a Node-oriented tool package. It runs scripted Slay-like simulations by creating deterministic seed sequences, executing fixed command logs through `@ucre/replay`, and emitting stable JSON. The workspace exposes `pnpm sim:slay` after the package is built.

Consequences: Balance tooling can evolve independently from rules, replay, and run persistence. Future rounds can add richer policy inputs and aggregate balance metrics without adding browser, storage, or presentation dependencies to deterministic runtime packages.

Validation: Unit tests cover deterministic seed creation, repeated fixed-seed simulation equality, completed run counts, replay hash shape, and stable JSON formatting. CLI smoke runs the built command with fixed inputs, and full validation covers build, typecheck, tests, and architecture guards.
