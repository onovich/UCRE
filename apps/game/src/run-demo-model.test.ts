import { SLAY_LIKE_ZONES } from "@ucre/rulesets";
import { describe, expect, it } from "vitest";

import {
  advanceDemoRunNode,
  createDemoRunState,
  createGameStateForRunNode,
  createRunNodeViews,
  createStartedDemoRunState,
  getCurrentRunNode,
  isEncounterRunNode,
} from "./run-demo-model.js";

describe("run demo model", () => {
  it("creates the Phase 10 short run route", () => {
    const state = createDemoRunState();

    expect(state.map.nodes.map((node) => node.kind)).toEqual([
      "start",
      "encounter",
      "event",
      "shop",
      "rest",
      "boss",
      "victory",
    ]);
    expect(getCurrentRunNode(state)?.kind).toBe("start");
    expect(createRunNodeViews(state).map((view) => view.status)).toEqual([
      "current",
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
    ]);
  });

  it("starts on a playable encounter after the start node is completed", () => {
    const state = createStartedDemoRunState();
    const gameState = createGameStateForRunNode(state);

    expect(getCurrentRunNode(state)?.kind).toBe("encounter");
    expect(isEncounterRunNode(getCurrentRunNode(state))).toBe(true);
    expect(gameState?.id).toBe("slay-run-demo-encounter-1");
    expect(gameState?.zones[SLAY_LIKE_ZONES.enemy]?.objectIds).toEqual(["enemy-acid-slime"]);
  });

  it("advances through placeholder nodes and loads the boss encounter", () => {
    let state = createStartedDemoRunState();

    state = advanceDemoRunNode(state, { completedBy: "test-encounter" });
    expect(getCurrentRunNode(state)?.kind).toBe("event");
    expect(createGameStateForRunNode(state)).toBeUndefined();

    state = advanceDemoRunNode(state, { completedBy: "test-event" });
    state = advanceDemoRunNode(state, { completedBy: "test-shop" });
    state = advanceDemoRunNode(state, { completedBy: "test-rest" });

    const bossGameState = createGameStateForRunNode(state);
    expect(getCurrentRunNode(state)?.kind).toBe("boss");
    expect(bossGameState?.zones[SLAY_LIKE_ZONES.enemy]?.objectIds).toEqual(["enemy-hexaghost"]);
  });
});
