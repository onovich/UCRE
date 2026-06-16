import { createInitialGameState, createZone, putZone } from "@ucre/core";
import type { GameState, PlayerId, ZoneId } from "@ucre/core";

export const SACRIFICE_BOARD_RULESET_ID = "sacrifice-board";
export const SACRIFICE_BOARD_RULES_VERSION = "sacrifice-board-0";
export const SACRIFICE_BOARD_CONTENT_MANIFEST_HASH = "sacrifice-board-inline-content-0";
export const SACRIFICE_BOARD_DEFAULT_LANE_COUNT = 4;

export const SACRIFICE_BOARD_PHASES = {
  setup: "setup",
  main: "main",
  sacrifice: "sacrifice",
  combat: "combat",
  complete: "complete",
  defeat: "defeat",
} as const;

export const SACRIFICE_BOARD_ZONES = {
  deck: "player.deck",
  hand: "player.hand",
  discard: "player.discard",
  sacrificePile: "player.sacrificePile",
  opponentDeck: "opponent.deck",
  opponentQueue: "opponent.queue",
} as const;

export const SACRIFICE_BOARD_RESOURCES = {
  blood: "blood",
  bones: "bones",
  scale: "scale",
} as const;

export const SACRIFICE_BOARD_FLAGS = {
  boardStarted: "sacrifice.boardStarted",
} as const;

export type SacrificeBoardSide = "player" | "opponent";

export interface SacrificeBoardSlot {
  readonly id: string;
  readonly laneIndex: number;
  readonly side: SacrificeBoardSide;
  readonly zoneId: ZoneId;
  readonly opposingZoneId: ZoneId;
  readonly adjacentZoneIds: readonly ZoneId[];
}

export interface SacrificeBoardTopology {
  readonly laneCount: number;
  readonly slots: readonly SacrificeBoardSlot[];
}

export interface CreateSacrificeBoardGameInput {
  readonly gameId: string;
  readonly seed: string;
  readonly contentManifestHash?: string;
  readonly playerId?: PlayerId;
  readonly opponentId?: PlayerId;
  readonly laneCount?: number;
  readonly startingBlood?: number;
  readonly startingBones?: number;
  readonly startingScale?: number;
}

export function createSacrificeBoardGame(input: CreateSacrificeBoardGameInput): GameState {
  const playerId = input.playerId ?? "player-1";
  const opponentId = input.opponentId ?? "opponent";
  const topology = createSacrificeBoardTopology({
    laneCount: input.laneCount ?? SACRIFICE_BOARD_DEFAULT_LANE_COUNT,
  });
  let state: GameState = {
    ...createInitialGameState({
      id: input.gameId,
      seed: input.seed,
      rulesVersion: SACRIFICE_BOARD_RULES_VERSION,
      contentManifestHash: input.contentManifestHash ?? SACRIFICE_BOARD_CONTENT_MANIFEST_HASH,
      activePlayerId: playerId,
    }),
    phase: SACRIFICE_BOARD_PHASES.main,
    resources: {
      [playerId]: {
        playerId,
        values: {
          [SACRIFICE_BOARD_RESOURCES.blood]: input.startingBlood ?? 0,
          [SACRIFICE_BOARD_RESOURCES.bones]: input.startingBones ?? 0,
          [SACRIFICE_BOARD_RESOURCES.scale]: input.startingScale ?? 0,
        },
      },
    },
    flags: {
      [SACRIFICE_BOARD_FLAGS.boardStarted]: true,
    },
  };

  state = putZone(
    state,
    createZone({ id: SACRIFICE_BOARD_ZONES.deck, kind: "deck", ownerId: playerId }),
  );
  state = putZone(
    state,
    createZone({ id: SACRIFICE_BOARD_ZONES.hand, kind: "hand", ownerId: playerId }),
  );
  state = putZone(
    state,
    createZone({ id: SACRIFICE_BOARD_ZONES.discard, kind: "discard", ownerId: playerId }),
  );
  state = putZone(
    state,
    createZone({
      id: SACRIFICE_BOARD_ZONES.sacrificePile,
      kind: "custom",
      ownerId: playerId,
    }),
  );
  state = putZone(
    state,
    createZone({ id: SACRIFICE_BOARD_ZONES.opponentDeck, kind: "deck", ownerId: opponentId }),
  );
  state = putZone(
    state,
    createZone({
      id: SACRIFICE_BOARD_ZONES.opponentQueue,
      kind: "custom",
      ownerId: opponentId,
    }),
  );

  for (const slot of topology.slots) {
    state = putZone(
      state,
      createZone({
        id: slot.zoneId,
        kind: "board",
        ownerId: slot.side === "player" ? playerId : opponentId,
        metadata: {
          slotId: slot.id,
          laneIndex: slot.laneIndex,
          side: slot.side,
          opposingZoneId: slot.opposingZoneId,
          adjacentZoneIds: [...slot.adjacentZoneIds],
        },
      }),
    );
  }

  return state;
}

export function createSacrificeBoardTopology(
  input: {
    readonly laneCount?: number;
  } = {},
): SacrificeBoardTopology {
  const laneCount = input.laneCount ?? SACRIFICE_BOARD_DEFAULT_LANE_COUNT;
  if (!Number.isInteger(laneCount) || laneCount <= 0) {
    throw new Error(
      `Sacrifice-board lane count must be a positive integer, received ${laneCount}.`,
    );
  }

  const slots: SacrificeBoardSlot[] = [];
  for (const laneIndex of Array.from({ length: laneCount }, (_value, index) => index)) {
    slots.push(createSlot("player", laneIndex, laneCount));
    slots.push(createSlot("opponent", laneIndex, laneCount));
  }

  return {
    laneCount,
    slots,
  };
}

export function createSacrificeBoardSlotZoneId(
  side: SacrificeBoardSide,
  laneIndex: number,
): ZoneId {
  return `board.${side}.lane.${laneIndex}`;
}

function createSlot(
  side: SacrificeBoardSide,
  laneIndex: number,
  laneCount: number,
): SacrificeBoardSlot {
  const oppositeSide: SacrificeBoardSide = side === "player" ? "opponent" : "player";

  return {
    id: `${side}:${laneIndex}`,
    laneIndex,
    side,
    zoneId: createSacrificeBoardSlotZoneId(side, laneIndex),
    opposingZoneId: createSacrificeBoardSlotZoneId(oppositeSide, laneIndex),
    adjacentZoneIds: adjacentLaneIndexes(laneIndex, laneCount).map((adjacentLaneIndex) =>
      createSacrificeBoardSlotZoneId(side, adjacentLaneIndex),
    ),
  };
}

function adjacentLaneIndexes(laneIndex: number, laneCount: number): readonly number[] {
  return [laneIndex - 1, laneIndex + 1].filter(
    (candidate) => candidate >= 0 && candidate < laneCount,
  );
}
