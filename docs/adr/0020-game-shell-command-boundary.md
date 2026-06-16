# ADR 0020 - Game Shell Command Boundary

Status: Accepted

Context: Phase 4 makes the rule engine visible in a browser. The browser UI must not become a second rules engine or mutate `GameState` directly.

Decision: `apps/game` owns React state for the current `GameState` snapshot and dispatch history, but every gameplay transition is produced by constructing a `Command` and calling the Slay-like `executeSlayLikeCommand` helper. The UI may disable obviously illegal buttons for ergonomics, while ruleset validation remains authoritative. The project ops dev server now starts this game shell through the configured wrapper at `127.0.0.1:5173`.

Consequences: Browser controls can inspect and present state without bypassing ruleset command/effect dispatch. Future panels for command prediction, state diffs, and replay can reuse the same command boundary.

Validation: Focused app builds, wrapper HTTP smoke, browser command-dispatch smoke, mobile overflow check, direct mutation audit, full project validation, and architecture searches validate the boundary.
