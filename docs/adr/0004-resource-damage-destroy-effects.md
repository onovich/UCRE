# ADR 0004 - Resource Damage And Destroy Effects

Status: Accepted

Context: Phase 1 needs core effects for resources, counters, damage, and object destruction before a ruleset can express combat costs and outcomes.

Decision: Resource and counter changes are explicit effects that emit `ResourceChanged` and `CounterChanged` events. Damage reads numeric `hp` and optional `block` attributes by default, applies block first, and emits `DamageDealt`. Destroy removes an object from both `GameState.objects` and its current zone, then emits `ObjectDestroyed`.

Consequences: Rulesets can model costs, temporary counters, combat damage, and object removal without direct state mutation. Attribute names for damage are overridable, leaving rulesets room to use alternate health/block names while keeping deterministic core behavior.

Validation: `packages/core/src/effects.test.ts`, full project validation, and Phase 1 forbidden dependency/nondeterminism searches validate the behavior.
