# ADR 0031 - Run Reward Deck Contract

Status: Accepted

Context: Phase 7 needs encounter rewards to modify a run-level deck before persistence and replay integration. Reward selection should be deterministic and inspectable without coupling the run layer to a specific encounter implementation.

Decision: `@ucre/run` owns serializable run deck cards, reward drafts, reward choices, and pure claim helpers. Claiming a card reward appends a unique run deck card; skipping a reward closes the draft without deck changes; invalid claims return serializable failures and leave state unchanged.

Consequences: Rulesets can produce reward draft data and UI can present choices, while deck mutation remains a pure run transition. Save/load and replay can later include the run deck and reward drafts directly.

Validation: Run reward unit tests, package build, full project validation, and architecture searches validate the boundary.
