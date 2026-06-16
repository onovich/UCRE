# ADR 0032 - Run Save Package Contract

Status: Accepted

Context: Phase 7 requires run saves to preserve seeds, ruleset and content identity, command logs, snapshots, and hashes before adding browser persistence.

Decision: `@ucre/run` owns a pure serializable save package contract. Save snapshots capture run state, command count, optional encounter `GameState`, and stable hashes. Save packages compute and verify a hash over the save payload excluding the hash field itself.

Consequences: Save/load validation can be tested without IndexedDB or UI dependencies. A later Dexie adapter can persist the same package shape without changing deterministic run contracts.

Validation: Run save unit tests, package build, full project validation, and architecture searches validate the boundary.
