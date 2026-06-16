# ADR 0036 - Sacrifice-Board Topology

Status: Accepted

Context: Phase 8 needs a third pressure ruleset inspired by lane sacrifice card games. Before adding sacrifice costs or combat, the engine must represent opposing lane slots, player resources, hand/deck/discard zones, and deterministic board topology using the shared core model.

Decision: Add `@ucre/rulesets` sacrifice-board setup as a pure ruleset module. Player and opponent lanes are represented as core `board` zones with metadata for side, lane index, opposing zone, and adjacent same-side lanes. Player deck, hand, discard, sacrifice pile, opponent deck, and opponent queue remain ordinary core zones.

Consequences: The topology is explicit and replay-stable, while no new core board primitive is introduced before duplication appears across rulesets. Later sacrifice and combat commands can target the existing slot zone IDs without changing the setup contract.

Validation: Focused sacrifice-board tests assert default and custom lane layouts, resource initialization, zone ownership, adjacency/opposition metadata, invalid lane counts, and deterministic state hashes. Phase 8 architecture searches confirm no ambient random, browser, storage, or presentation dependencies were introduced.
