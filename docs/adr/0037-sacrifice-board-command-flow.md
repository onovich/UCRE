# ADR 0037 - Sacrifice-Board Command Flow

Status: Accepted

Context: Phase 8 needs the sacrifice-board pressure ruleset to exercise costs, board slots, lane combat, and scale-like resources without creating a custom board engine outside UCRE core. The behavior should use the same command/effect/event model as Slay-like and blackjack-like.

Decision: Keep sacrifice-board behavior inside `@ucre/rulesets` as a command registry plus ruleset effect registry layered on top of core effects. Summoning uses core movement and resource effects for sacrifice pile movement, bone gain, stored blood/bone spending, and card placement. Lane combat uses ruleset resolution to iterate player board zones, apply core damage/destroy effects to opposing creatures, and update the player's scale resource for open-lane attacks.

Consequences: Core still does not gain lane, sacrifice, or board-specific primitives. Sacrifice-board can pressure-test board-zone metadata and resource costs while future rounds can add explicit scale objectives and golden replay without changing the setup topology.

Validation: Focused sacrifice-board tests cover blood-cost summoning, sacrifice pile movement, bone gain, insufficient-cost rejection, defender damage/destruction, open-lane scale gain, and deterministic topology. Architecture searches confirm no ambient random, browser, storage, presentation, or cross-package leakage was introduced.
