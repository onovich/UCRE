# ADR 0029 - Run State Package Boundary

Status: Accepted

Context: Phase 7 introduces roguelike run state, map traversal, persistence, and replay integration. Keeping this meta-loop inside the single-encounter ruleset code would couple run progression to one game shape too early.

Decision: Add a pure `@ucre/run` package for `RunState`, map node contracts, graph helpers, run hashes, and later save/replay integration. The package may depend on deterministic core data utilities, but it must not depend on React, Three.js, Dexie, browser storage, or presentation packages.

Consequences: Slay-like, blackjack-like, and sacrifice-board rulesets can share run traversal and save contracts without moving encounter rules upward. Browser persistence and UI integration remain separate later-phase adapters.

Validation: Run package unit tests, package build, full project validation, and architecture searches validate the boundary.
