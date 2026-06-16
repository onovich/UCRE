# ADR 0022 - Theater Actor Anchor Sync

Status: Accepted

Context: Phase 5 needs cards and encounter objects to keep stable presentation identities as they move between draw, hand, play, discard, enemy, and reward anchors. Count-only rendering can show pile sizes but cannot support object-specific animation, skip-to-end behavior, or inspectable actor metadata.

Decision: `@ucre/theater-three` accepts `TheaterActor` records with a stable `id`, display `label`, `kind`, and `anchorId`. The package owns anchor grouping and mesh metadata. The game app remains the adapter that projects deterministic `GameState` zones and objects into theater actors; core, rulesets, replay, and content packages do not import Three.js or theater-specific contracts.

Consequences: Theater rendering now tracks real object identities without changing deterministic rule state. Future animation rounds can diff actor IDs across anchors and animate object transitions. The adapter remains ruleset-specific in the app until a later presenter layer becomes necessary.

Validation: Theater grouping tests, focused theater/game builds, browser overlay checks, mobile layout checks, headless canvas pixel smoke, full project validation, and architecture searches validate the boundary.
