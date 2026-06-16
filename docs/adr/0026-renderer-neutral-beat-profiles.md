# ADR 0026 - Renderer Neutral Beat Profiles

Status: Accepted

Context: Phase 6 needs renderer adapters to play move, damage, destroy, and related presentation beats without each adapter re-parsing raw rule payloads differently.

Decision: `@ucre/presentation-core` attaches a renderer-neutral `PresentationBeatProfile` to each scheduled beat. Profiles normalize known core intent payloads into typed move, draw, discard, damage, destroy, resource, and counter shapes while preserving generic/objective payloads for future special cases.

Consequences: Future GSAP and theater adapters can consume stable profile fields instead of duplicating payload parsing. Rules remain unchanged, and presentation profiles still carry only data derived from immutable `PresentationIntent` values.

Validation: Presentation-core profile tests, typecheck, focused package build, full project validation, and architecture searches validate the boundary.
