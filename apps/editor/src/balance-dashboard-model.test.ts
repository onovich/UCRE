import { describe, expect, it } from "vitest";

import {
  createSampleSimulationResultJson,
  parseBalanceDashboardInput,
} from "./balance-dashboard-model.js";

describe("balance dashboard model", () => {
  it("parses simulation metrics into a dashboard view model", () => {
    const result = parseBalanceDashboardInput(createSampleSimulationResultJson());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Sample simulation result did not parse.");
    }

    expect(result.dashboard).toMatchObject({
      rulesetId: "slay-like",
      runCount: 3,
      completedCount: 3,
      failedCount: 0,
      winRate: 1,
      averageTurnCount: 1,
    });
    expect(result.dashboard.cardPlayRates).toEqual([
      {
        definitionId: "strike",
        playCount: 6,
        playedRunCount: 3,
        playRate: 1,
        playsPerRun: 2,
      },
    ]);
    expect(result.dashboard.cardPickRates[0]?.definitionId).toBe("ironWave");
    expect(
      result.dashboard.resourceCurves
        .find((curve) => curve.resourceId === "energy")
        ?.points.map((point) => point.averageValue),
    ).toEqual([3, 2, 1]);
  });

  it("reports invalid dashboard JSON", () => {
    const result = parseBalanceDashboardInput("{");

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Invalid JSON unexpectedly parsed.");
    }

    expect(result.errors[0]).toContain("JSON");
  });

  it("reports missing metrics", () => {
    const result = parseBalanceDashboardInput(JSON.stringify({ rulesetId: "slay-like" }));

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Missing metrics unexpectedly parsed.");
    }

    expect(result.errors).toContain("metrics must be an object.");
  });
});
