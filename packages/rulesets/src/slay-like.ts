import {
  DRAW_CARDS_EFFECT_TYPE,
  createGameObject,
  createInitialGameState,
  createZone,
  putGameObjectInZone,
  putZone,
} from "@ucre/core";
import type { Command, CommandRegistry, GameObject, GameState, PlayerId } from "@ucre/core";

export const SLAY_LIKE_RULESET_ID = "slay-like";
export const SLAY_LIKE_RULES_VERSION = "slay-like-0";

export const SLAY_LIKE_PHASES = {
  setup: "setup",
  playerTurn: "playerTurn",
  enemyTurn: "enemyTurn",
  reward: "reward",
  complete: "complete",
} as const;

export const SLAY_LIKE_ZONES = {
  drawPile: "player.drawPile",
  hand: "player.hand",
  discardPile: "player.discardPile",
  exhaustPile: "player.exhaustPile",
  playArea: "player.playArea",
  enemy: "enemy.active",
  reward: "reward.choices",
} as const;

export const SLAY_LIKE_RESOURCES = {
  energy: "energy",
  playerHp: "playerHp",
} as const;

export const SLAY_LIKE_COMMANDS = {
  drawCards: "slay.drawCards",
} as const;

export interface SlayLikeStarterCard {
  readonly id: string;
  readonly definitionId: string;
  readonly cost: number;
}

export interface CreateSlayLikeEncounterInput {
  readonly gameId: string;
  readonly seed: string;
  readonly contentManifestHash?: string;
  readonly playerId?: PlayerId;
  readonly starterDeck?: readonly SlayLikeStarterCard[];
}

export function createSlayLikeEncounter(input: CreateSlayLikeEncounterInput): GameState {
  const playerId = input.playerId ?? "player-1";
  let state: GameState = {
    ...createInitialGameState({
      id: input.gameId,
      seed: input.seed,
      rulesVersion: SLAY_LIKE_RULES_VERSION,
      contentManifestHash: input.contentManifestHash ?? "slay-like-inline-content-0",
      activePlayerId: playerId,
    }),
    phase: SLAY_LIKE_PHASES.playerTurn,
    resources: {
      [playerId]: {
        playerId,
        values: {
          [SLAY_LIKE_RESOURCES.energy]: 3,
          [SLAY_LIKE_RESOURCES.playerHp]: 80,
        },
      },
    },
  };

  state = putZone(
    state,
    createZone({ id: SLAY_LIKE_ZONES.drawPile, kind: "deck", ownerId: playerId }),
  );
  state = putZone(state, createZone({ id: SLAY_LIKE_ZONES.hand, kind: "hand", ownerId: playerId }));
  state = putZone(
    state,
    createZone({ id: SLAY_LIKE_ZONES.discardPile, kind: "discard", ownerId: playerId }),
  );
  state = putZone(
    state,
    createZone({ id: SLAY_LIKE_ZONES.exhaustPile, kind: "exhaust", ownerId: playerId }),
  );
  state = putZone(
    state,
    createZone({ id: SLAY_LIKE_ZONES.playArea, kind: "play", ownerId: playerId }),
  );
  state = putZone(state, createZone({ id: SLAY_LIKE_ZONES.enemy, kind: "enemy" }));
  state = putZone(state, createZone({ id: SLAY_LIKE_ZONES.reward, kind: "reward" }));

  for (const card of input.starterDeck ?? createDefaultStarterDeck()) {
    state = putGameObjectInZone(state, createStarterCardObject(card, playerId));
  }

  return state;
}

export function createSlayLikeCommandRegistry(): CommandRegistry {
  return {
    [SLAY_LIKE_COMMANDS.drawCards]: {
      validate: (state, command) => {
        if (state.phase !== SLAY_LIKE_PHASES.playerTurn) {
          return [
            {
              code: "SLAY_NOT_PLAYER_TURN",
              message: "Cards can only be drawn during the player turn.",
              details: {
                commandId: command.id,
                phase: state.phase,
              },
            },
          ];
        }

        return [];
      },
      getEffects: (_state, command) => [
        {
          id: "draw-cards",
          type: DRAW_CARDS_EFFECT_TYPE,
          payload: {
            fromZoneId: SLAY_LIKE_ZONES.drawPile,
            toZoneId: SLAY_LIKE_ZONES.hand,
            count: readCommandNumber(command, "count"),
          },
        },
      ],
    },
  };
}

export function createDefaultStarterDeck(): readonly SlayLikeStarterCard[] {
  return [
    { id: "strike-1", definitionId: "strike", cost: 1 },
    { id: "strike-2", definitionId: "strike", cost: 1 },
    { id: "strike-3", definitionId: "strike", cost: 1 },
    { id: "defend-1", definitionId: "defend", cost: 1 },
    { id: "defend-2", definitionId: "defend", cost: 1 },
  ];
}

function createStarterCardObject(card: SlayLikeStarterCard, ownerId: PlayerId): GameObject {
  return createGameObject({
    id: card.id,
    definitionId: card.definitionId,
    ownerId,
    zoneId: SLAY_LIKE_ZONES.drawPile,
    tags: ["card", "starter"],
    attributes: {
      cost: card.cost,
    },
  });
}

function readCommandNumber(command: Command, key: string): number {
  const value = command.payload[key];

  if (typeof value !== "number") {
    throw new Error(`Expected command payload key ${key} to be a number.`);
  }

  return value;
}
