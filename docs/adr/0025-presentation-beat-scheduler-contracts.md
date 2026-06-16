# ADR 0025 - Presentation Beat Scheduler Contracts

Status: Accepted

Context: Phase 6 needs a presentation director layer that can consume core `PresentationIntent` values without binding rule execution to renderer timing or GSAP.

Decision: `@ucre/presentation-core` depends on `@ucre/core` for presentation intent contracts and exports pure `PresentationBeat`, `BeatSchedule`, and `PresentationDirectorSnapshot` helpers. The first scheduler maps intents to deterministic beat order, timing, kind, and track IDs. Skip and playback-rate helpers update only presentation cursor metadata and preserve any associated rule state hash.

Consequences: Presentation timing can be tested before renderer adapters exist. Core remains unaware of presentation-core, while theater/GSAP adapters can later consume the stable beat schedule without writing rule state.

Validation: Presentation-core unit tests, typecheck, focused package build, full project validation, and architecture searches validate the boundary.
