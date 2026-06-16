import { executeCommand } from "@ucre/core";
import { describe, expect, it } from "vitest";

import {
  SLAY_LIKE_COMMANDS,
  SLAY_LIKE_PHASES,
  SLAY_LIKE_RESOURCES,
  SLAY_LIKE_ZONES,
  createSlayLikeCommandRegistry,
  createSlayLikeEncounter,
} from "./slay-like.js";

describe("slay-like encounter scaffold", () => {
  it("creates the starting phase, resources, zones, and starter deck", () => {
    const state = createSlayLikeEncounter({
      gameId: "slay-1",
      seed: "seed-1",
    });

    expect(state.phase).toBe(SLAY_LIKE_PHASES.playerTurn);
    expect(state.resources["player-1"]?.values[SLAY_LIKE_RESOURCES.energy]).toBe(3);
    expect(state.zones[SLAY_LIKE_ZONES.drawPile]?.objectIds).toEqual([
      "strike-1",
      "strike-2",
      "strike-3",
      "defend-1",
      "defend-2",
    ]);
    expect(state.zones[SLAY_LIKE_ZONES.hand]?.objectIds).toEqual([]);
    expect(state.zones[SLAY_LIKE_ZONES.enemy]?.kind).toBe("enemy");
  });

  it("draws cards through the ruleset command registry and core pipeline", () => {
    const state = createSlayLikeEncounter({
      gameId: "slay-1",
      seed: "seed-1",
    });
    const result = executeCommand({
      state,
      command: {
        id: "command-1",
        type: SLAY_LIKE_COMMANDS.drawCards,
        playerId: "player-1",
        payload: {
          count: 3,
        },
      },
      commandRegistry: createSlayLikeCommandRegistry(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Draw command unexpectedly failed.");
    }

    expect(result.state.zones[SLAY_LIKE_ZONES.hand]?.objectIds).toEqual([
      "strike-1",
      "strike-2",
      "strike-3",
    ]);
    expect(result.state.zones[SLAY_LIKE_ZONES.drawPile]?.objectIds).toEqual([
      "defend-1",
      "defend-2",
    ]);
    expect(result.events.at(-1)?.type).toBe("CardsDrawn");
  });
});
