# ADR 0021 - Three Card Theater Scene

Status: Accepted

Context: Phase 5 needs a Three.js card theater without moving presentation concerns into deterministic rules packages.

Decision: `@ucre/theater-three` owns the Three.js dependency, camera, lights, table root, anchor layout, and canvas renderer. The game app converts `GameState` into simple render counts and passes them into the theater component. The primary theater canvas is rendered as a full-width unframed stage rather than inside a dashboard card.

Consequences: Core, rulesets, replay, and content packages remain free of Three.js and browser rendering dependencies. Future rounds can add persistent card actors, event-to-anchor synchronization, and animation skip behavior behind the same presentation boundary.

Validation: Theater anchor tests, focused theater/game builds, browser smoke, headless screenshot pixel smoke, mobile overflow checks, full project validation, and architecture searches validate the boundary.
