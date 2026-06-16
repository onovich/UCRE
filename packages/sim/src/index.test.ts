import { describe, expect, it } from "vitest";

import {
  createSequentialSeeds,
  formatSimulationResultJson,
  simulateSlayLikeRuns,
} from "./index.js";

describe("slay-like simulation CLI model", () => {
  it("creates deterministic sequential seeds", () => {
    expect(createSequentialSeeds("fixed", 3)).toEqual(["fixed-1", "fixed-2", "fixed-3"]);
  });

  it("runs stable scripted Slay-like simulations for fixed seeds", () => {
    const first = simulateSlayLikeRuns({
      runs: 3,
      seedPrefix: "fixed",
    });
    const second = simulateSlayLikeRuns({
      runs: 3,
      seedPrefix: "fixed",
    });

    expect(second).toEqual(first);
    expect(first.completedCount).toBe(3);
    expect(first.failedCount).toBe(0);
    expect(first.runs.map((run) => run.finalPhase)).toEqual(["complete", "complete", "complete"]);
    for (const run of first.runs) {
      expect(run.replayHash).toMatch(/^ucre1-/);
    }
  });

  it("formats simulation output as stable JSON", () => {
    const result = simulateSlayLikeRuns({
      runs: 1,
      seedPrefix: "json",
    });
    const formatted = formatSimulationResultJson(result);

    expect(formatted.endsWith("\n")).toBe(true);
    expect(JSON.parse(formatted)).toEqual(result);
  });
});
