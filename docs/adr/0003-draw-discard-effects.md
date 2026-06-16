# ADR 0003 - Draw And Discard Effects

Status: Accepted

Context: Phase 1 needs card-zone behavior that composes from the first movement primitive instead of duplicating state mutation paths.

Decision: `DrawCards` and `Discard` are core effect helpers layered on `MoveObject`. Draws move the first available object IDs from source to target zone order, emit per-card `ObjectMoved` facts, then emit a `CardsDrawn` aggregate event. Discards emit the underlying movement fact and then a `CardDiscarded` aggregate event.

Consequences: Replay and presentation can inspect either low-level movement or higher-level card action facts. Draws are deterministic and partial when fewer cards are available; reshuffle policy remains ruleset-level behavior for a later round.

Validation: `packages/core/src/effects.test.ts`, full project validation, and Phase 1 forbidden dependency/nondeterminism searches validate the behavior.
