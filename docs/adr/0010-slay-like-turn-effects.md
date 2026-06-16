# ADR 0010 - Slay Like Turn Effects

Status: Accepted

Context: Phase 2 needs deterministic enemy intent and end-turn flow, but player HP, block reset, phase changes, and turn increments are Slay-like rules rather than universal core mechanics.

Decision: The Slay-like ruleset owns `slay.endTurn` plus the `SlayResolveEnemyIntent` and `SlayStartPlayerTurn` effects. These effects are exposed through `createSlayLikeEffectRegistry` and the `executeSlayLikeCommand` helper, which still routes all command execution through the core pipeline.

Consequences: Core stays ruleset-agnostic while the encounter can advance turns through command dispatch only. Any UI or runner that wants Slay-like turn flow must use the ruleset command helper or pass both the Slay-like command registry and effect registry into the core pipeline.

Validation: `packages/rulesets/src/slay-like.test.ts`, full project validation, and forbidden dependency/nondeterminism searches validate the behavior.
