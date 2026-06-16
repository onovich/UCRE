# ADR 0011 - Slay Like Reward Completion

Status: Accepted

Context: Phase 2 needs a command-only encounter that can defeat enemies, open rewards, modify the deck, and complete the encounter without UI-side state mutation.

Decision: The Slay-like ruleset opens a deterministic reward draft when the final living enemy is defeated by a card command. Reward choices are represented as game objects in the reward zone. `slay.chooseReward` moves the chosen card into the player's discard pile, destroys unchosen reward objects, and completes the encounter through a ruleset-specific effect.

Consequences: Reward drafting remains replayable because object IDs and choice order are fixed by the ruleset. The core engine continues to provide generic movement/destruction effects, while Slay-like owns the meaning of encounter completion and deck modification.

Validation: `packages/rulesets/src/slay-like.test.ts`, full project validation, and forbidden dependency/nondeterminism searches validate the behavior.
