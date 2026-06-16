import {
  DEAL_DAMAGE_EFFECT_TYPE,
  DISCARD_EFFECT_TYPE,
  DRAW_CARDS_EFFECT_TYPE,
  GAIN_RESOURCE_EFFECT_TYPE,
  MOVE_OBJECT_EFFECT_TYPE,
  SPEND_RESOURCE_EFFECT_TYPE,
  createGameObject,
  createInitialGameState,
  createZone,
  putGameObjectInZone,
  putZone,
} from "@ucre/core";
import type { Command, CommandRegistry, Effect, GameObject, GameState, PlayerId } from "@ucre/core";

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
  block: "block",
} as const;

export const SLAY_LIKE_COMMANDS = {
  drawCards: "slay.drawCards",
  playCard: "slay.playCard",
} as const;

export interface SlayLikeCardDefinition {
  readonly id: string;
  readonly name: string;
  readonly cost: number;
  readonly requiresTarget: boolean;
  readonly damage?: number;
  readonly block?: number;
}

export interface SlayLikeStarterCard {
  readonly id: string;
  readonly definitionId: string;
}

export interface SlayLikeEnemyDefinition {
  readonly id: string;
  readonly objectId: string;
  readonly name: string;
  readonly hp: number;
  readonly block: number;
  readonly intentDamage: number;
}

export interface CreateSlayLikeEncounterInput {
  readonly gameId: string;
  readonly seed: string;
  readonly contentManifestHash?: string;
  readonly playerId?: PlayerId;
  readonly starterDeck?: readonly SlayLikeStarterCard[];
  readonly enemies?: readonly SlayLikeEnemyDefinition[];
}

export const SLAY_LIKE_CARD_DEFINITIONS: Readonly<Record<string, SlayLikeCardDefinition>> = {
  strike: {
    id: "strike",
    name: "Strike",
    cost: 1,
    requiresTarget: true,
    damage: 6,
  },
  defend: {
    id: "defend",
    name: "Defend",
    cost: 1,
    requiresTarget: false,
    block: 5,
  },
};

export const SLAY_LIKE_ENEMY_DEFINITIONS: Readonly<Record<string, SlayLikeEnemyDefinition>> = {
  jawWorm: {
    id: "jawWorm",
    objectId: "enemy-jaw-worm",
    name: "Jaw Worm",
    hp: 12,
    block: 0,
    intentDamage: 6,
  },
};

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
          [SLAY_LIKE_RESOURCES.block]: 0,
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

  for (const enemy of input.enemies ?? createDefaultEnemies()) {
    state = putGameObjectInZone(state, createEnemyObject(enemy));
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
    [SLAY_LIKE_COMMANDS.playCard]: {
      validate: (state, command) => validatePlayCardCommand(state, command),
      getEffects: (_state, command) => {
        const cardId = readCommandString(command, "cardId");
        const cardObject = _state.objects[cardId];
        const definition = cardObject
          ? SLAY_LIKE_CARD_DEFINITIONS[cardObject.definitionId]
          : undefined;

        if (!cardObject || !definition) {
          return [];
        }

        const effects: Effect[] = [
          {
            id: "spend-energy",
            type: SPEND_RESOURCE_EFFECT_TYPE,
            payload: {
              playerId: command.playerId,
              resourceId: SLAY_LIKE_RESOURCES.energy,
              amount: definition.cost,
            },
          },
          {
            id: "move-card-to-play",
            type: MOVE_OBJECT_EFFECT_TYPE,
            payload: {
              objectId: cardId,
              toZoneId: SLAY_LIKE_ZONES.playArea,
            },
          },
        ];

        if (definition.damage) {
          effects.push({
            id: "deal-damage",
            type: DEAL_DAMAGE_EFFECT_TYPE,
            payload: {
              targetObjectId: readCommandString(command, "targetObjectId"),
              amount: definition.damage,
            },
          });
        }

        if (definition.block) {
          effects.push({
            id: "gain-block",
            type: GAIN_RESOURCE_EFFECT_TYPE,
            payload: {
              playerId: command.playerId,
              resourceId: SLAY_LIKE_RESOURCES.block,
              amount: definition.block,
            },
          });
        }

        effects.push({
          id: "discard-card",
          type: DISCARD_EFFECT_TYPE,
          payload: {
            objectId: cardId,
            toZoneId: SLAY_LIKE_ZONES.discardPile,
          },
        });

        return effects;
      },
    },
  };
}

export function createDefaultStarterDeck(): readonly SlayLikeStarterCard[] {
  return [
    { id: "strike-1", definitionId: "strike" },
    { id: "strike-2", definitionId: "strike" },
    { id: "strike-3", definitionId: "strike" },
    { id: "defend-1", definitionId: "defend" },
    { id: "defend-2", definitionId: "defend" },
  ];
}

export function createDefaultEnemies(): readonly SlayLikeEnemyDefinition[] {
  const jawWorm = SLAY_LIKE_ENEMY_DEFINITIONS.jawWorm;
  if (!jawWorm) {
    throw new Error("Missing default Slay-like enemy definition: jawWorm");
  }

  return [jawWorm];
}

function createStarterCardObject(card: SlayLikeStarterCard, ownerId: PlayerId): GameObject {
  const definition = SLAY_LIKE_CARD_DEFINITIONS[card.definitionId];
  if (!definition) {
    throw new Error(`Unknown Slay-like starter card definition: ${card.definitionId}`);
  }

  return createGameObject({
    id: card.id,
    definitionId: card.definitionId,
    ownerId,
    zoneId: SLAY_LIKE_ZONES.drawPile,
    tags: ["card", "starter"],
    attributes: {
      cost: definition.cost,
    },
  });
}

function createEnemyObject(enemy: SlayLikeEnemyDefinition): GameObject {
  return createGameObject({
    id: enemy.objectId,
    definitionId: enemy.id,
    ownerId: "enemy",
    zoneId: SLAY_LIKE_ZONES.enemy,
    tags: ["enemy"],
    attributes: {
      hp: enemy.hp,
      block: enemy.block,
      intentDamage: enemy.intentDamage,
    },
  });
}

function validatePlayCardCommand(state: GameState, command: Command) {
  const errors = [];

  if (state.phase !== SLAY_LIKE_PHASES.playerTurn) {
    errors.push({
      code: "SLAY_NOT_PLAYER_TURN",
      message: "Cards can only be played during the player turn.",
      details: {
        commandId: command.id,
        phase: state.phase,
      },
    });
  }

  const cardId = readCommandString(command, "cardId");
  const cardObject = state.objects[cardId];
  const definition = cardObject ? SLAY_LIKE_CARD_DEFINITIONS[cardObject.definitionId] : undefined;

  if (!cardObject) {
    errors.push({
      code: "SLAY_CARD_NOT_FOUND",
      message: `Card ${cardId} does not exist.`,
      details: {
        cardId,
      },
    });
  } else if (cardObject.zoneId !== SLAY_LIKE_ZONES.hand) {
    errors.push({
      code: "SLAY_CARD_NOT_IN_HAND",
      message: `Card ${cardId} is not in hand.`,
      details: {
        cardId,
        zoneId: cardObject.zoneId,
      },
    });
  }

  if (!definition) {
    errors.push({
      code: "SLAY_CARD_DEFINITION_NOT_FOUND",
      message: `Card definition for ${cardId} does not exist.`,
      details: {
        cardId,
        definitionId: cardObject?.definitionId ?? null,
      },
    });
  } else {
    const energy = state.resources[command.playerId]?.values[SLAY_LIKE_RESOURCES.energy] ?? 0;
    if (energy < definition.cost) {
      errors.push({
        code: "SLAY_NOT_ENOUGH_ENERGY",
        message: `Card ${cardId} costs ${definition.cost} energy; only ${energy} available.`,
        details: {
          cardId,
          cost: definition.cost,
          energy,
        },
      });
    }

    if (definition.requiresTarget) {
      const targetObjectId = readOptionalCommandString(command, "targetObjectId");
      if (!targetObjectId) {
        errors.push({
          code: "SLAY_TARGET_REQUIRED",
          message: `Card ${cardId} requires a target.`,
          details: {
            cardId,
          },
        });
      } else if (!state.objects[targetObjectId]) {
        errors.push({
          code: "SLAY_TARGET_NOT_FOUND",
          message: `Target ${targetObjectId} does not exist.`,
          details: {
            cardId,
            targetObjectId,
          },
        });
      }
    }
  }

  return errors;
}

function readCommandString(command: Command, key: string): string {
  const value = command.payload[key];

  if (typeof value !== "string") {
    throw new Error(`Expected command payload key ${key} to be a string.`);
  }

  return value;
}

function readOptionalCommandString(command: Command, key: string): string | undefined {
  const value = command.payload[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`Expected command payload key ${key} to be a string when present.`);
  }

  return value;
}

function readCommandNumber(command: Command, key: string): number {
  const value = command.payload[key];

  if (typeof value !== "number") {
    throw new Error(`Expected command payload key ${key} to be a number.`);
  }

  return value;
}
