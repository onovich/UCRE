# ADR 0027 - GSAP Timeline Adapter Package

Status: Accepted

Context: Phase 6 requires GSAP timeline integration, but the core presentation scheduler should remain renderer- and clock-free so it can be tested deterministically.

Decision: GSAP integration lives in a separate `@ucre/presentation-gsap` package. The adapter consumes `BeatSchedule` values from `@ucre/presentation-core`, creates paused GSAP timelines with deterministic labels and default tweens, and exposes skip/playback-rate helpers. Renderer-specific animation handlers can override behavior by beat kind.

Consequences: `@ucre/presentation-core` remains a pure data package, while GSAP is isolated to the adapter boundary. Future theater or UI layers can opt into GSAP without pulling the dependency into deterministic rules, replay, content, or scheduler code.

Validation: Presentation-gsap unit tests, focused package builds, full project validation, and architecture searches validate the boundary.
