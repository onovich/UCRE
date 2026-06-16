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
    expect(first.runs.map((run) => run.turnCount)).toEqual([1, 1, 1]);
    expect(first.runs.map((run) => run.playedCardDefinitionIds)).toEqual([
      ["strike", "strike"],
      ["strike", "strike"],
      ["strike", "strike"],
    ]);
    expect(first.runs.map((run) => run.pickedCardDefinitionId)).toEqual([
      "ironWave",
      "ironWave",
      "ironWave",
    ]);
    for (const run of first.runs) {
      expect(run.replayHash).toMatch(/^ucre1-/);
    }
  });

  it("aggregates stable balance metrics", () => {
    const result = simulateSlayLikeRuns({
      runs: 3,
      seedPrefix: "metrics",
    });
    const energyCurve = result.metrics.resourceCurves.find(
      (curve) => curve.playerId === "player-1" && curve.resourceId === "energy",
    );

    expect(result.metrics).toMatchObject({
      winRate: 1,
      completionRate: 1,
      failureRate: 0,
      averageTurnCount: 1,
      averageCommandCount: 4,
      deathNodeDistribution: [],
    });
    expect(result.metrics.cardPlayRates).toEqual([
      {
        definitionId: "strike",
        playCount: 6,
        playedRunCount: 3,
        playRate: 1,
        playsPerRun: 2,
      },
    ]);
    expect(result.metrics.cardPickRates).toEqual([
      {
        definitionId: "ironWave",
        pickCount: 3,
        pickRate: 1,
      },
    ]);
    expect(energyCurve?.points.map((point) => point.averageValue)).toEqual([3, 2, 1]);
    expect(energyCurve?.points.every((point) => point.sampleCount === 3)).toBe(true);
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
