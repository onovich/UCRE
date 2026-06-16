# ADR 0040: Editor Slay-Like Round-Trip Manifest

Status: Accepted

Context: Phase 9 requires editor-created content to compile, load, play, and replay without engine code edits. The earlier editor manifest was browser-compileable, but it omitted Slay-like runtime zone metadata and used presentation event names where the Slay-like content adapter expects runtime effect type names.

Decision: Make the editor draft manifest Slay-like runtime-loadable by emitting the standard Slay-like resources, zones, starter deck metadata, relic metadata, enemy metadata, and reward zone. Card and enemy draft effects now use runtime effect type names such as `DealDamage` and `GainResource`, with compiler fallback profiles matching those names. The editor round-trip test compiles draft content, loads it through `createSlayLikeContentFromManifest`, creates an encounter, plays the new card, claims the reward, and verifies replay determinism.

Consequences: Editor-authored cards can enter the existing ruleset adapter and replay pipeline directly. UI validation still comes from the shared compiler, while ruleset-specific runtime requirements remain encoded as manifest metadata instead of React-only logic.

Validation: Focused editor model tests cover manifest construction and reward references. The content round-trip test covers editor draft content through compile, runtime load, command execution, reward claim, and repeated replay hash stability. Full project validation and architecture searches confirm the change stays out of deterministic package browser dependencies.
