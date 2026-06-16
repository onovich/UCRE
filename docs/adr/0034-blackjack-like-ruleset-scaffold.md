# ADR 0034 - Blackjack-Like Ruleset Scaffold

Status: Accepted

Context: Phase 8 pressure-tests UCRE beyond Slay-like combat. The first blackjack-like round needs to prove the shared core can represent a dealer shoe, player and dealer hands, wager state, and table resources before command behavior is added.

Decision: Add `@ucre/rulesets` blackjack-like setup as a pure ruleset module that creates a deterministic `GameState` from core zones, objects, resources, and flags. The standard 52-card shoe is ordered and explicit; shuffling and deal commands will be added later through command/effect pipelines.

Consequences: Blackjack setup stays replay-friendly and free of ambient random sources. The ruleset package now publicly exports blackjack-like constants and setup helpers alongside Slay-like exports, while no core, replay, UI, presentation, or persistence boundary changes are required.

Validation: Focused blackjack-like ruleset tests assert phases, zones, resources, card metadata, custom table identities, and deterministic state hashes. Phase 8 architecture searches confirm no DOM, storage, presentation, or nondeterministic dependencies enter deterministic packages.
