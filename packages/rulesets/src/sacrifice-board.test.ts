import { hashGameState } from "@ucre/core";
import { describe, expect, it } from "vitest";

import {
  SACRIFICE_BOARD_CONTENT_MANIFEST_HASH,
  SACRIFICE_BOARD_DEFAULT_LANE_COUNT,
  SACRIFICE_BOARD_FLAGS,
  SACRIFICE_BOARD_PHASES,
  SACRIFICE_BOARD_RESOURCES,
  SACRIFICE_BOARD_RULES_VERSION,
  SACRIFICE_BOARD_ZONES,
  createSacrificeBoardGame,
  createSacrificeBoardSlotZoneId,
  createSacrificeBoardTopology,
} from "./sacrifice-board.js";

describe("sacrifice-board topology", () => {
  it("creates deterministic board slots and starting zones", () => {
    const state = createSacrificeBoardGame({
      gameId: "sacrifice-board-1",
      seed: "sacrifice-seed-1",
    });
    const repeat = createSacrificeBoardGame({
      gameId: "sacrifice-board-1",
      seed: "sacrifice-seed-1",
    });

    expect(state.rulesVersion).toBe(SACRIFICE_BOARD_RULES_VERSION);
    expect(state.contentManifestHash).toBe(SACRIFICE_BOARD_CONTENT_MANIFEST_HASH);
    expect(state.phase).toBe(SACRIFICE_BOARD_PHASES.main);
    expect(state.activePlayerId).toBe("player-1");
    expect(state.flags[SACRIFICE_BOARD_FLAGS.boardStarted]).toBe(true);
    expect(state.resources["player-1"]?.values).toEqual({
      [SACRIFICE_BOARD_RESOURCES.blood]: 0,
      [SACRIFICE_BOARD_RESOURCES.bones]: 0,
      [SACRIFICE_BOARD_RESOURCES.scale]: 0,
    });
    expect(state.zones[SACRIFICE_BOARD_ZONES.deck]?.objectIds).toEqual([]);
    expect(state.zones[SACRIFICE_BOARD_ZONES.hand]?.objectIds).toEqual([]);
    expect(state.zones[SACRIFICE_BOARD_ZONES.discard]?.objectIds).toEqual([]);
    expect(state.zones[SACRIFICE_BOARD_ZONES.sacrificePile]?.objectIds).toEqual([]);
    expect(state.zones[createSacrificeBoardSlotZoneId("player", 0)]).toMatchObject({
      id: "board.player.lane.0",
      kind: "board",
      ownerId: "player-1",
      metadata: {
        slotId: "player:0",
        laneIndex: 0,
        side: "player",
        opposingZoneId: "board.opponent.lane.0",
        adjacentZoneIds: ["board.player.lane.1"],
      },
    });
    expect(state.zones[createSacrificeBoardSlotZoneId("opponent", 3)]).toMatchObject({
      id: "board.opponent.lane.3",
      ownerId: "opponent",
      metadata: {
        opposingZoneId: "board.player.lane.3",
        adjacentZoneIds: ["board.opponent.lane.2"],
      },
    });
    expect(Object.values(state.zones).filter((zone) => zone.kind === "board")).toHaveLength(8);
    expect(hashGameState(state)).toBe(hashGameState(repeat));
  });

  it("supports custom lane counts and starting resources", () => {
    const state = createSacrificeBoardGame({
      gameId: "sacrifice-board-custom",
      seed: "sacrifice-seed-custom",
      contentManifestHash: "ucre1-sacrifice-content",
      playerId: "player-custom",
      opponentId: "opponent-custom",
      laneCount: 3,
      startingBlood: 1,
      startingBones: 2,
      startingScale: -1,
    });

    expect(state.contentManifestHash).toBe("ucre1-sacrifice-content");
    expect(state.resources["player-custom"]?.values).toEqual({
      [SACRIFICE_BOARD_RESOURCES.blood]: 1,
      [SACRIFICE_BOARD_RESOURCES.bones]: 2,
      [SACRIFICE_BOARD_RESOURCES.scale]: -1,
    });
    expect(Object.values(state.zones).filter((zone) => zone.kind === "board")).toHaveLength(6);
    expect(state.zones[createSacrificeBoardSlotZoneId("opponent", 2)]?.ownerId).toBe(
      "opponent-custom",
    );
  });

  it("describes opposing and adjacent lane topology", () => {
    const topology = createSacrificeBoardTopology();
    const playerMiddleSlot = topology.slots.find((slot) => slot.id === "player:2");

    expect(topology.laneCount).toBe(SACRIFICE_BOARD_DEFAULT_LANE_COUNT);
    expect(topology.slots).toHaveLength(8);
    expect(playerMiddleSlot).toEqual({
      id: "player:2",
      laneIndex: 2,
      side: "player",
      zoneId: "board.player.lane.2",
      opposingZoneId: "board.opponent.lane.2",
      adjacentZoneIds: ["board.player.lane.1", "board.player.lane.3"],
    });
    expect(() => createSacrificeBoardTopology({ laneCount: 0 })).toThrow(
      "Sacrifice-board lane count must be a positive integer, received 0.",
    );
  });
});
