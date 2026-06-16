# ADR 0042: Simulation Metrics Contract

Status: Accepted

Context: Phase 9 requires balance output for win rate, card pick rate, card play rate, turn count, resource curves, and death node distribution. The simulation CLI already emits stable replay summaries, but downstream balance dashboards should not need to reverse-engineer aggregate metrics from raw run rows.

Decision: Extend `@ucre/sim` Slay-like JSON output with a public `metrics` block. The block aggregates deterministic run summaries into win/completion/failure rates, average turn/command/event counts, card play and pick rates, resource curves, and death node buckets. The per-run rows now also expose turn count, played card definitions, picked reward definition, final player resources, and optional death node IDs.

Consequences: Dashboard and CI balance checks can consume a stable tool contract without importing browser, storage, presentation, or editor code. Future policy work can enrich simulation behavior while keeping metric aggregation in the Node-oriented simulation package.

Validation: Unit tests lock deterministic metric aggregation for fixed seeds, including card play/pick rates and energy resource curves. CLI smoke validates the built root script output, and full project validation covers lint, typecheck, tests, builds, architecture checks, and docs checks.
