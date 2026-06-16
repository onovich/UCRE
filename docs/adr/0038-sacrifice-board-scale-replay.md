# ADR 0038 - Sacrifice-Board Scale Objective And Replay

Status: Accepted

Context: Phase 8 acceptance requires each active ruleset to run on the shared objective and replay model. Sacrifice-board needs a terminal scale objective so lane combat can end deterministically and be locked by a golden replay.

Decision: Add a ruleset-owned `sacrifice.tipScale` objective to sacrifice-board game setup. Lane combat updates the player scale resource, evaluates the objective after combat, and transitions to `complete` or `defeat` when the configured target is reached. A golden replay fixture locks the scale-combat command hash, final state hash, event hash, and replay hash.

Consequences: Objective evaluation remains inside the sacrifice-board ruleset, with no new core objective predicates or board-specific primitives. Replay stays driven by seed, rules version, content hash, initial state, command log, and event/state hashes.

Validation: Focused sacrifice-board tests cover pending and completed scale objectives. The golden replay verifies deterministic scale completion, final flags, objective status, and stable replay hashes. Full validation and architecture searches confirm no random, browser, storage, presentation, or cross-package leakage was introduced.
