import { hashGameState } from "@ucre/core";
import { describe, expect, it } from "vitest";

import {
  SACRIFICE_BOARD_CONTENT_MANIFEST_HASH,
  SACRIFICE_BOARD_COMMANDS,
  SACRIFICE_BOARD_EVENTS,
  SACRIFICE_BOARD_DEFAULT_LANE_COUNT,
  SACRIFICE_BOARD_FLAGS,
  SACRIFICE_BOARD_PHASES,
  SACRIFICE_BOARD_RESOURCES,
  SACRIFICE_BOARD_RULES_VERSION,
  SACRIFICE_BOARD_ZONES,
  createSacrificeBoardGame,
  createSacrificeBoardSlotZoneId,
  createSacrificeBoardTopology,
  executeSacrificeBoardCommand,
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

  it("summons a blood-cost creature by sacrificing board creatures", () => {
    const result = executeSacrificeBoardCommand({
      state: createSacrificeBoardGame({
        gameId: "sacrifice-summon",
        seed: "sacrifice-summon-seed",
        startingHand: [
          {
            id: "wolf-hand-1",
            definitionId: "wolf",
          },
        ],
        startingBoard: [
          {
            id: "squirrel-board-1",
            definitionId: "squirrel",
            side: "player",
            laneIndex: 0,
          },
          {
            id: "squirrel-board-2",
            definitionId: "squirrel",
            side: "player",
            laneIndex: 2,
          },
        ],
      }),
      command: {
        id: "summon-wolf",
        type: SACRIFICE_BOARD_COMMANDS.summon,
        playerId: "player-1",
        payload: {
          cardId: "wolf-hand-1",
          slotZoneId: createSacrificeBoardSlotZoneId("player", 1),
          sacrificeObjectIds: ["squirrel-board-1", "squirrel-board-2"],
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Sacrifice-board summon unexpectedly failed.");
    }

    expect(result.state.zones[createSacrificeBoardSlotZoneId("player", 1)]?.objectIds).toEqual([
      "wolf-hand-1",
    ]);
    expect(result.state.zones[SACRIFICE_BOARD_ZONES.sacrificePile]?.objectIds).toEqual([
      "squirrel-board-1",
      "squirrel-board-2",
    ]);
    expect(result.state.zones[SACRIFICE_BOARD_ZONES.hand]?.objectIds).toEqual([]);
    expect(result.state.resources["player-1"]?.values[SACRIFICE_BOARD_RESOURCES.bones]).toBe(2);
    expect(result.events.at(-1)?.type).toBe(SACRIFICE_BOARD_EVENTS.creatureSummoned);
  });

  it("rejects summons without enough sacrifice or stored blood", () => {
    const result = executeSacrificeBoardCommand({
      state: createSacrificeBoardGame({
        gameId: "sacrifice-invalid-summon",
        seed: "sacrifice-invalid-summon-seed",
        startingHand: [
          {
            id: "wolf-hand-1",
            definitionId: "wolf",
          },
        ],
      }),
      command: {
        id: "summon-wolf",
        type: SACRIFICE_BOARD_COMMANDS.summon,
        playerId: "player-1",
        payload: {
          cardId: "wolf-hand-1",
          slotZoneId: createSacrificeBoardSlotZoneId("player", 1),
          sacrificeObjectIds: [],
        },
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Sacrifice-board invalid summon unexpectedly succeeded.");
    }
    expect(result.errors[0]).toMatchObject({
      code: "SACRIFICE_INSUFFICIENT_BLOOD",
    });
  });

  it("resolves lane combat against defenders and open lanes", () => {
    const result = executeSacrificeBoardCommand({
      state: createSacrificeBoardGame({
        gameId: "sacrifice-combat",
        seed: "sacrifice-combat-seed",
        startingBoard: [
          {
            id: "wolf-board-1",
            definitionId: "wolf",
            side: "player",
            laneIndex: 0,
          },
          {
            id: "stoat-board-1",
            definitionId: "stoat",
            side: "player",
            laneIndex: 1,
          },
          {
            id: "squirrel-opponent-1",
            definitionId: "squirrel",
            side: "opponent",
            laneIndex: 0,
          },
        ],
      }),
      command: {
        id: "resolve-combat",
        type: SACRIFICE_BOARD_COMMANDS.resolveCombat,
        playerId: "player-1",
        payload: {},
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Sacrifice-board combat unexpectedly failed.");
    }

    expect(result.state.objects["squirrel-opponent-1"]).toBeUndefined();
    expect(result.state.zones[createSacrificeBoardSlotZoneId("opponent", 0)]?.objectIds).toEqual(
      [],
    );
    expect(result.state.resources["player-1"]?.values[SACRIFICE_BOARD_RESOURCES.scale]).toBe(1);
    expect(result.events.at(-1)).toMatchObject({
      type: SACRIFICE_BOARD_EVENTS.laneCombatResolved,
      payload: {
        scaleDelta: 1,
      },
    });
  });
});
