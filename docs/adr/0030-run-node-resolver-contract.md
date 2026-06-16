# ADR 0030 - Run Node Resolver Contract

Status: Accepted

Context: Phase 7 needs map nodes to launch encounters, placeholders, shops, rests, and victory transitions without coupling run traversal directly to any one ruleset or UI.

Decision: `@ucre/run` exposes pure node resolver contracts. A resolver reads an available `RunMapNode` and returns a serializable resolution such as an encounter descriptor. It does not execute commands, mutate `GameState`, open browser storage, or complete the run node.

Consequences: Encounter execution, rewards, persistence, and UI navigation can be layered on top of the resolver without blurring the run/map boundary. Boss nodes resolve through the same encounter descriptor shape as regular encounters.

Validation: Run package resolver tests, package build, full project validation, and architecture searches validate the boundary.
