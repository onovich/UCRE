# ADR 0035 - Blackjack-Like Command Flow

Status: Accepted

Context: Phase 8 needs blackjack-like behavior to exercise the same command, effect, event, resource, zone, and replay model used by Slay-like combat. The ruleset must support initial dealing, player hits, standing, dealer policy, busts, and settlement without adding blackjack-specific mechanics to core.

Decision: Keep blackjack behavior in `@ucre/rulesets` as a command registry plus custom effect registry layered on top of core movement effects. `blackjack.dealInitial` and `blackjack.hit` use core `MoveObject` effects for deterministic card motion, while blackjack-specific effects evaluate player hands, enter phases, resolve the dealer draw policy, and settle chips from the current bet.

Consequences: Core remains generic and blackjack-independent. Dealer policy is deterministic because the shoe is ordered until a later explicit shuffle command exists. Settlement currently adjusts chips against `currentBet` and resets that bet; future betting commands can decide when chips are escrowed without changing replay semantics.

Validation: Focused blackjack-like tests cover initial deal, hit evaluation, bust state, stand/dealer draw policy, resource settlement, and wrong-phase rejection. Architecture searches confirm no ambient random, browser, storage, presentation, or cross-package leakage was introduced.
