import {
  DEAL_DAMAGE_EFFECT_TYPE,
  DESTROY_EFFECT_TYPE,
  DISCARD_EFFECT_TYPE,
  DRAW_CARDS_EFFECT_TYPE,
  GAIN_RESOURCE_EFFECT_TYPE,
  MOVE_OBJECT_EFFECT_TYPE,
  SPEND_RESOURCE_EFFECT_TYPE,
  checkObjectives,
  createCoreEffectRegistry,
  createGameObject,
  createInitialGameState,
  createZone,
  executeCommand,
  putGameObjectInZone,
  putZone,
} from "@ucre/core";
import type {
  Command,
  CommandRegistry,
  Effect,
  EffectRegistry,
  GameObject,
  GameState,
  JsonObject,
  ObjectiveState,
  PlayerId,
  RuleError,
  RuleEvent,
  RuleResult,
} from "@ucre/core";
import type {
  ContentCard,
  ContentEffect,
  ContentEnemy,
  ContentManifest,
  ContentRelic,
  ContentZone,
} from "@ucre/content-schema";

export const SLAY_LIKE_RULESET_ID = "slay-like";
export const SLAY_LIKE_RULES_VERSION = "slay-like-0";

export const SLAY_LIKE_PHASES = {
  setup: "setup",
  playerTurn: "playerTurn",
  enemyTurn: "enemyTurn",
  reward: "reward",
  complete: "complete",
  defeat: "defeat",
} as const;

export const SLAY_LIKE_ZONES = {
  drawPile: "player.drawPile",
  hand: "player.hand",
  discardPile: "player.discardPile",
  exhaustPile: "player.exhaustPile",
  playArea: "player.playArea",
  relic: "player.relics",
  enemy: "enemy.active",
  reward: "reward.choices",
} as const;

export const SLAY_LIKE_RESOURCES = {
  energy: "energy",
  playerHp: "playerHp",
  block: "block",
} as const;

export const SLAY_LIKE_TURN_ENERGY = 3;
export const SLAY_LIKE_HAND_DRAW_COUNT = 5;

export const SLAY_LIKE_COMMANDS = {
  drawCards: "slay.drawCards",
  playCard: "slay.playCard",
  endTurn: "slay.endTurn",
  chooseReward: "slay.chooseReward",
} as const;

export const SLAY_LIKE_EFFECTS = {
  resolveEnemyIntent: "SlayResolveEnemyIntent",
  startPlayerTurn: "SlayStartPlayerTurn",
  openRewardDraft: "SlayOpenRewardDraft",
  completeEncounter: "SlayCompleteEncounter",
} as const;

export const SLAY_LIKE_EVENTS = {
  enemyIntentResolved: "SlayEnemyIntentResolved",
  playerTurnStarted: "SlayPlayerTurnStarted",
  rewardDraftOpened: "SlayRewardDraftOpened",
  encounterCompleted: "SlayEncounterCompleted",
} as const;

export const SLAY_LIKE_OBJECTIVES = {
  defeatEnemies: "slay.defeatEnemies",
  surviveEncounter: "slay.surviveEncounter",
} as const;

export const SLAY_LIKE_FLAGS = {
  encounterComplete: "slay.encounterComplete",
  playerDefeated: "slay.playerDefeated",
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

export interface SlayLikeRewardCard {
  readonly objectId: string;
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

export interface SlayLikeRelicDefinition {
  readonly id: string;
  readonly objectId: string;
  readonly name: string;
  readonly description: string;
}

export interface CreateSlayLikeEncounterInput {
  readonly gameId: string;
  readonly seed: string;
  readonly contentManifestHash?: string;
  readonly playerId?: PlayerId;
  readonly cardDefinitions?: Readonly<Record<string, SlayLikeCardDefinition>>;
  readonly starterDeck?: readonly SlayLikeStarterCard[];
  readonly enemies?: readonly SlayLikeEnemyDefinition[];
  readonly relics?: readonly SlayLikeRelicDefinition[];
}

export interface SlayLikeRuntimeContent {
  readonly cardDefinitions: Readonly<Record<string, SlayLikeCardDefinition>>;
  readonly rewardDraft: readonly SlayLikeRewardCard[];
}

export interface SlayLikeEncounterContent extends SlayLikeRuntimeContent {
  readonly contentManifestHash: string;
  readonly starterDeck: readonly SlayLikeStarterCard[];
  readonly enemies: readonly SlayLikeEnemyDefinition[];
  readonly relics: readonly SlayLikeRelicDefinition[];
}

export type SlayLikeRuntimeContentInput = Partial<SlayLikeRuntimeContent>;

export interface CreateSlayLikeContentFromManifestInput {
  readonly manifest: ContentManifest;
  readonly manifestHash: string;
  readonly rewardPoolId?: string;
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
  heavyStrike: {
    id: "heavyStrike",
    name: "Heavy Strike",
    cost: 2,
    requiresTarget: true,
    damage: 10,
  },
  quickStrike: {
    id: "quickStrike",
    name: "Quick Strike",
    cost: 0,
    requiresTarget: true,
    damage: 3,
  },
  guard: {
    id: "guard",
    name: "Guard",
    cost: 2,
    requiresTarget: false,
    block: 9,
  },
  pommelStrike: {
    id: "pommelStrike",
    name: "Pommel Strike",
    cost: 1,
    requiresTarget: true,
    damage: 5,
  },
  wildSwing: {
    id: "wildSwing",
    name: "Wild Swing",
    cost: 1,
    requiresTarget: true,
    damage: 7,
  },
  ironWave: {
    id: "ironWave",
    name: "Iron Wave",
    cost: 1,
    requiresTarget: true,
    damage: 4,
    block: 4,
  },
  shieldWall: {
    id: "shieldWall",
    name: "Shield Wall",
    cost: 2,
    requiresTarget: false,
    block: 12,
  },
  slice: {
    id: "slice",
    name: "Slice",
    cost: 0,
    requiresTarget: true,
    damage: 4,
  },
  bodySlam: {
    id: "bodySlam",
    name: "Body Slam",
    cost: 1,
    requiresTarget: true,
    damage: 5,
  },
  brace: {
    id: "brace",
    name: "Brace",
    cost: 0,
    requiresTarget: false,
    block: 3,
  },
  cleave: {
    id: "cleave",
    name: "Cleave",
    cost: 1,
    requiresTarget: true,
    damage: 5,
  },
  twinStrike: {
    id: "twinStrike",
    name: "Twin Strike",
    cost: 1,
    requiresTarget: true,
    damage: 5,
  },
  uppercut: {
    id: "uppercut",
    name: "Uppercut",
    cost: 2,
    requiresTarget: true,
    damage: 13,
  },
  clothesline: {
    id: "clothesline",
    name: "Clothesline",
    cost: 2,
    requiresTarget: true,
    damage: 12,
  },
  thunderClap: {
    id: "thunderClap",
    name: "Thunder Clap",
    cost: 1,
    requiresTarget: true,
    damage: 4,
  },
  secondWind: {
    id: "secondWind",
    name: "Second Wind",
    cost: 1,
    requiresTarget: false,
    block: 8,
  },
  flameBarrier: {
    id: "flameBarrier",
    name: "Flame Barrier",
    cost: 2,
    requiresTarget: false,
    block: 16,
  },
  sentinelGuard: {
    id: "sentinelGuard",
    name: "Sentinel Guard",
    cost: 1,
    requiresTarget: false,
    block: 7,
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
  acidSlime: {
    id: "acidSlime",
    objectId: "enemy-acid-slime",
    name: "Acid Slime",
    hp: 10,
    block: 0,
    intentDamage: 5,
  },
  cultist: {
    id: "cultist",
    objectId: "enemy-cultist",
    name: "Cultist",
    hp: 18,
    block: 0,
    intentDamage: 6,
  },
  sentry: {
    id: "sentry",
    objectId: "enemy-sentry",
    name: "Sentry",
    hp: 20,
    block: 2,
    intentDamage: 7,
  },
  hexaghost: {
    id: "hexaghost",
    objectId: "enemy-hexaghost",
    name: "Hexaghost",
    hp: 50,
    block: 0,
    intentDamage: 10,
  },
};

export const SLAY_LIKE_RELIC_DEFINITIONS: Readonly<Record<string, SlayLikeRelicDefinition>> = {
  burningBlood: {
    id: "burningBlood",
    objectId: "relic-burning-blood",
    name: "Burning Blood",
    description: "Starter relic placeholder for encounter-completion healing rules.",
  },
  vajra: {
    id: "vajra",
    objectId: "relic-vajra",
    name: "Vajra",
    description: "Demo relic placeholder for strength-forward attack builds.",
  },
  anchor: {
    id: "anchor",
    objectId: "relic-anchor",
    name: "Anchor",
    description: "Demo relic placeholder for opening-turn block rules.",
  },
  lantern: {
    id: "lantern",
    objectId: "relic-lantern",
    name: "Lantern",
    description: "Demo relic placeholder for opening energy rules.",
  },
  courier: {
    id: "courier",
    objectId: "relic-courier",
    name: "Courier",
    description: "Demo relic placeholder for shop and reward tuning.",
  },
};

export const SLAY_LIKE_REWARD_DRAFT: readonly SlayLikeRewardCard[] = [
  {
    objectId: "reward-card-heavy-strike",
    definitionId: "heavyStrike",
  },
  {
    objectId: "reward-card-iron-wave",
    definitionId: "ironWave",
  },
  {
    objectId: "reward-card-brace",
    definitionId: "brace",
  },
];

export function createSlayLikeContentFromManifest(
  input: CreateSlayLikeContentFromManifestInput,
): SlayLikeEncounterContent {
  if (input.manifest.rulesetId !== SLAY_LIKE_RULESET_ID) {
    throw new Error(
      `Cannot load manifest ${input.manifest.manifestId} for ruleset ${input.manifest.rulesetId} into ${SLAY_LIKE_RULESET_ID}.`,
    );
  }

  const cardsById = new Map(input.manifest.cards.map((card) => [card.id, card] as const));
  const enemiesById = new Map(input.manifest.enemies.map((enemy) => [enemy.id, enemy] as const));
  const relicsById = new Map(input.manifest.relics.map((relic) => [relic.id, relic] as const));
  const cardDefinitions = Object.fromEntries(
    input.manifest.cards.map((card) => [card.id, createCardDefinitionFromContent(card)] as const),
  );
  const starterDeck = readObjectReferencesFromZoneMetadata(
    requireContentZone(input.manifest, SLAY_LIKE_ZONES.drawPile),
    "starterDeck",
    "cardId",
  ).map((entry) => {
    requireContentEntry(cardsById, entry.definitionId, "card");

    return {
      id: entry.objectId,
      definitionId: entry.definitionId,
    };
  });
  const enemies = readObjectReferencesFromZoneMetadata(
    requireContentZone(input.manifest, SLAY_LIKE_ZONES.enemy),
    "enemies",
    "enemyId",
  ).map((entry) =>
    createEnemyDefinitionFromContent(
      requireContentEntry(enemiesById, entry.definitionId, "enemy"),
      entry.objectId,
    ),
  );
  const relics = readObjectReferencesFromZoneMetadata(
    requireContentZone(input.manifest, SLAY_LIKE_ZONES.relic),
    "relics",
    "relicId",
  ).map((entry) =>
    createRelicDefinitionFromContent(
      requireContentEntry(relicsById, entry.definitionId, "relic"),
      entry.objectId,
    ),
  );
  const rewardPool =
    input.manifest.rewardPools.find((pool) => pool.id === input.rewardPoolId) ??
    input.manifest.rewardPools[0];

  if (!rewardPool) {
    throw new Error(`Manifest ${input.manifest.manifestId} does not define a reward pool.`);
  }

  const rewardDraft = rewardPool.choices.map((choice) => {
    requireContentEntry(cardsById, choice.cardId, "reward card");

    return {
      objectId: `reward-card-${toObjectIdSuffix(choice.cardId)}`,
      definitionId: choice.cardId,
    };
  });

  assertUniqueObjectIds([
    ...starterDeck.map((card) => card.id),
    ...enemies.map((enemy) => enemy.objectId),
    ...relics.map((relic) => relic.objectId),
    ...rewardDraft.map((reward) => reward.objectId),
  ]);

  return {
    contentManifestHash: input.manifestHash,
    cardDefinitions,
    starterDeck,
    enemies,
    relics,
    rewardDraft,
  };
}

export function createSlayLikeEncounter(input: CreateSlayLikeEncounterInput): GameState {
  const playerId = input.playerId ?? "player-1";
  const cardDefinitions = input.cardDefinitions ?? SLAY_LIKE_CARD_DEFINITIONS;
  let state: GameState = {
    ...createInitialGameState({
      id: input.gameId,
      seed: input.seed,
      rulesVersion: SLAY_LIKE_RULES_VERSION,
      contentManifestHash: input.contentManifestHash ?? "slay-like-inline-content-0",
      activePlayerId: playerId,
    }),
    phase: SLAY_LIKE_PHASES.playerTurn,
    objectives: createInitialSlayLikeObjectives(playerId),
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
  state = putZone(
    state,
    createZone({ id: SLAY_LIKE_ZONES.relic, kind: "custom", ownerId: playerId }),
  );
  state = putZone(state, createZone({ id: SLAY_LIKE_ZONES.enemy, kind: "enemy" }));
  state = putZone(state, createZone({ id: SLAY_LIKE_ZONES.reward, kind: "reward" }));

  for (const card of input.starterDeck ?? createDefaultStarterDeck()) {
    state = putGameObjectInZone(state, createStarterCardObject(card, playerId, cardDefinitions));
  }

  for (const relic of input.relics ?? createDefaultRelics()) {
    state = putGameObjectInZone(state, createRelicObject(relic, playerId));
  }

  for (const enemy of input.enemies ?? createDefaultEnemies()) {
    state = putGameObjectInZone(state, createEnemyObject(enemy));
  }

  return state;
}

export function createSlayLikeCommandRegistry(
  input: SlayLikeRuntimeContentInput = {},
): CommandRegistry {
  const cardDefinitions = input.cardDefinitions ?? SLAY_LIKE_CARD_DEFINITIONS;

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
      validate: (state, command) => validatePlayCardCommand(state, command, cardDefinitions),
      getEffects: (_state, command) => {
        const cardId = readCommandString(command, "cardId");
        const cardObject = _state.objects[cardId];
        const definition = cardObject ? cardDefinitions[cardObject.definitionId] : undefined;

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
        const postCardEffects: Effect[] = [];

        if (definition.damage) {
          const targetObjectId = readCommandString(command, "targetObjectId");
          effects.push({
            id: "deal-damage",
            type: DEAL_DAMAGE_EFFECT_TYPE,
            payload: {
              targetObjectId,
              amount: definition.damage,
            },
          });

          if (willDefeatTarget(_state, targetObjectId, definition.damage)) {
            postCardEffects.push({
              id: "destroy-defeated-enemy",
              type: DESTROY_EFFECT_TYPE,
              payload: {
                objectId: targetObjectId,
              },
            });

            if (isLastLivingEnemy(_state, targetObjectId)) {
              postCardEffects.push({
                id: "open-reward-draft",
                type: SLAY_LIKE_EFFECTS.openRewardDraft,
                payload: {
                  playerId: command.playerId,
                },
              });
            }
          }
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
        effects.push(...postCardEffects);

        return effects;
      },
    },
    [SLAY_LIKE_COMMANDS.endTurn]: {
      validate: (state, command) => validateEndTurnCommand(state, command),
      getEffects: (state, command) => {
        const handObjectIds = state.zones[SLAY_LIKE_ZONES.hand]?.objectIds ?? [];
        const discardHandEffects: Effect[] = handObjectIds.map((objectId, index) => ({
          id: `discard-hand-${index}`,
          type: DISCARD_EFFECT_TYPE,
          payload: {
            objectId,
            toZoneId: SLAY_LIKE_ZONES.discardPile,
          },
        }));
        const resolveEnemyIntentEffect: Effect = {
          id: "resolve-enemy-intent",
          type: SLAY_LIKE_EFFECTS.resolveEnemyIntent,
          payload: {
            playerId: command.playerId,
          },
        };

        if (willEnemyIntentDefeatPlayer(state, command.playerId)) {
          return [...discardHandEffects, resolveEnemyIntentEffect];
        }

        return [
          ...discardHandEffects,
          resolveEnemyIntentEffect,
          {
            id: "start-next-player-turn",
            type: SLAY_LIKE_EFFECTS.startPlayerTurn,
            payload: {
              playerId: command.playerId,
              energy: SLAY_LIKE_TURN_ENERGY,
            },
          },
          {
            id: "draw-next-hand",
            type: DRAW_CARDS_EFFECT_TYPE,
            payload: {
              fromZoneId: SLAY_LIKE_ZONES.drawPile,
              toZoneId: SLAY_LIKE_ZONES.hand,
              count: SLAY_LIKE_HAND_DRAW_COUNT,
            },
          },
        ];
      },
    },
    [SLAY_LIKE_COMMANDS.chooseReward]: {
      validate: (state, command) => validateChooseRewardCommand(state, command),
      getEffects: (state, command) => {
        const rewardObjectId = readCommandString(command, "rewardObjectId");
        const rewardObjectIds = state.zones[SLAY_LIKE_ZONES.reward]?.objectIds ?? [];

        return [
          {
            id: "move-reward-to-discard",
            type: MOVE_OBJECT_EFFECT_TYPE,
            payload: {
              objectId: rewardObjectId,
              toZoneId: SLAY_LIKE_ZONES.discardPile,
            },
          },
          ...rewardObjectIds
            .filter((objectId) => objectId !== rewardObjectId)
            .map(
              (objectId, index): Effect => ({
                id: `destroy-unchosen-reward-${index}`,
                type: DESTROY_EFFECT_TYPE,
                payload: {
                  objectId,
                },
              }),
            ),
          {
            id: "complete-encounter",
            type: SLAY_LIKE_EFFECTS.completeEncounter,
            payload: {
              playerId: command.playerId,
              rewardObjectId,
            },
          },
        ];
      },
    },
  };
}

export function createSlayLikeEffectRegistry(
  input: SlayLikeRuntimeContentInput = {},
): EffectRegistry {
  const cardDefinitions = input.cardDefinitions ?? SLAY_LIKE_CARD_DEFINITIONS;
  const rewardDraft = input.rewardDraft ?? SLAY_LIKE_REWARD_DRAFT;

  return {
    ...createCoreEffectRegistry(),
    [SLAY_LIKE_EFFECTS.resolveEnemyIntent]: (state, effect, context) =>
      resolveEnemyIntent(state, effect, context.commandId),
    [SLAY_LIKE_EFFECTS.startPlayerTurn]: (state, effect, context) =>
      startPlayerTurn(state, effect, context.commandId),
    [SLAY_LIKE_EFFECTS.openRewardDraft]: (state, effect, context) =>
      openRewardDraft(state, effect, context.commandId, {
        cardDefinitions,
        rewardDraft,
      }),
    [SLAY_LIKE_EFFECTS.completeEncounter]: (state, effect, context) =>
      completeEncounter(state, effect, context.commandId),
  };
}

export interface ExecuteSlayLikeCommandInput {
  readonly state: GameState;
  readonly command: Command;
  readonly content?: SlayLikeRuntimeContentInput;
}

export function executeSlayLikeCommand(input: ExecuteSlayLikeCommandInput): RuleResult {
  return executeCommand({
    state: input.state,
    command: input.command,
    commandRegistry: createSlayLikeCommandRegistry(input.content),
    effectRegistry: createSlayLikeEffectRegistry(input.content),
  });
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

export function createDefaultRelics(): readonly SlayLikeRelicDefinition[] {
  const burningBlood = SLAY_LIKE_RELIC_DEFINITIONS.burningBlood;
  if (!burningBlood) {
    throw new Error("Missing default Slay-like relic definition: burningBlood");
  }

  return [burningBlood];
}

interface ContentObjectReference {
  readonly objectId: string;
  readonly definitionId: string;
}

function createCardDefinitionFromContent(card: ContentCard): SlayLikeCardDefinition {
  if (card.targetPolicy !== "none" && card.targetPolicy !== "enemy") {
    throw new Error(
      `Slay-like card ${card.id} uses unsupported target policy ${card.targetPolicy}.`,
    );
  }

  const damage = sumEffectAmounts(card.effects, DEAL_DAMAGE_EFFECT_TYPE);
  const block = sumEffectAmounts(
    card.effects,
    GAIN_RESOURCE_EFFECT_TYPE,
    (effect) => effect.payload.resourceId === SLAY_LIKE_RESOURCES.block,
  );

  return {
    id: card.id,
    name: card.name,
    cost: card.cost,
    requiresTarget: card.targetPolicy === "enemy",
    ...(damage > 0 ? { damage } : {}),
    ...(block > 0 ? { block } : {}),
  };
}

function createEnemyDefinitionFromContent(
  enemy: ContentEnemy,
  objectId: string,
): SlayLikeEnemyDefinition {
  return {
    id: enemy.id,
    objectId,
    name: enemy.name,
    hp: enemy.hp,
    block: enemy.block,
    intentDamage: sumEffectAmounts(enemy.intents, DEAL_DAMAGE_EFFECT_TYPE),
  };
}

function createRelicDefinitionFromContent(
  relic: ContentRelic,
  objectId: string,
): SlayLikeRelicDefinition {
  return {
    id: relic.id,
    objectId,
    name: relic.name,
    description: relic.description,
  };
}

function requireContentZone(manifest: ContentManifest, zoneId: string): ContentZone {
  const zone = manifest.zones.find((entry) => entry.id === zoneId);
  if (!zone) {
    throw new Error(`Manifest ${manifest.manifestId} is missing Slay-like zone ${zoneId}.`);
  }

  return zone;
}

function requireContentEntry<T>(entries: ReadonlyMap<string, T>, id: string, label: string): T {
  const entry = entries.get(id);
  if (!entry) {
    throw new Error(`Slay-like manifest references missing ${label} ${id}.`);
  }

  return entry;
}

function readObjectReferencesFromZoneMetadata(
  zone: ContentZone,
  metadataKey: string,
  definitionKey: string,
): readonly ContentObjectReference[] {
  const value = zone.metadata[metadataKey];
  if (!Array.isArray(value)) {
    throw new Error(`Zone ${zone.id} metadata.${metadataKey} must be an array.`);
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Zone ${zone.id} metadata.${metadataKey}.${index} must be an object.`);
    }

    const record = entry as Readonly<Record<string, unknown>>;
    const objectId = record.objectId;
    const definitionId = record[definitionKey];

    if (typeof objectId !== "string" || typeof definitionId !== "string") {
      throw new Error(
        `Zone ${zone.id} metadata.${metadataKey}.${index} must define string objectId and ${definitionKey}.`,
      );
    }

    return {
      objectId,
      definitionId,
    };
  });
}

function sumEffectAmounts(
  effects: readonly ContentEffect[],
  effectType: string,
  predicate: (effect: ContentEffect) => boolean = () => true,
): number {
  return effects
    .filter((effect) => effect.type === effectType && predicate(effect))
    .reduce((sum, effect) => {
      const amount = effect.payload.amount;
      if (typeof amount !== "number") {
        throw new Error(`Effect ${effect.id} of type ${effect.type} must define numeric amount.`);
      }

      return sum + amount;
    }, 0);
}

function assertUniqueObjectIds(objectIds: readonly string[]): void {
  const seen = new Set<string>();

  for (const objectId of objectIds) {
    if (seen.has(objectId)) {
      throw new Error(`Slay-like content produced duplicate object id ${objectId}.`);
    }

    seen.add(objectId);
  }
}

function toObjectIdSuffix(id: string): string {
  return id
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function createInitialSlayLikeObjectives(playerId: PlayerId): readonly ObjectiveState[] {
  return [
    {
      id: SLAY_LIKE_OBJECTIVES.defeatEnemies,
      type: "SlayDefeatEnemies",
      status: "pending",
      payload: {
        enemyZoneId: SLAY_LIKE_ZONES.enemy,
      },
    },
    {
      id: SLAY_LIKE_OBJECTIVES.surviveEncounter,
      type: "SlaySurviveEncounter",
      status: "pending",
      payload: {
        playerId,
      },
    },
  ];
}

function createStarterCardObject(
  card: SlayLikeStarterCard,
  ownerId: PlayerId,
  cardDefinitions: Readonly<Record<string, SlayLikeCardDefinition>>,
): GameObject {
  const definition = cardDefinitions[card.definitionId];
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

function createRelicObject(relic: SlayLikeRelicDefinition, ownerId: PlayerId): GameObject {
  return createGameObject({
    id: relic.objectId,
    definitionId: relic.id,
    ownerId,
    zoneId: SLAY_LIKE_ZONES.relic,
    tags: ["relic"],
    attributes: {
      name: relic.name,
      description: relic.description,
    },
  });
}

function createRewardCardObject(
  card: SlayLikeRewardCard,
  ownerId: PlayerId,
  cardDefinitions: Readonly<Record<string, SlayLikeCardDefinition>>,
): GameObject {
  const definition = cardDefinitions[card.definitionId];
  if (!definition) {
    throw new Error(`Unknown Slay-like reward card definition: ${card.definitionId}`);
  }

  return createGameObject({
    id: card.objectId,
    definitionId: card.definitionId,
    ownerId,
    zoneId: SLAY_LIKE_ZONES.reward,
    tags: ["card", "reward"],
    attributes: {
      cost: definition.cost,
    },
  });
}

function validatePlayCardCommand(
  state: GameState,
  command: Command,
  cardDefinitions: Readonly<Record<string, SlayLikeCardDefinition>>,
) {
  const errors: RuleError[] = [];

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
  const definition = cardObject ? cardDefinitions[cardObject.definitionId] : undefined;

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

function validateChooseRewardCommand(state: GameState, command: Command): readonly RuleError[] {
  const errors: RuleError[] = [];

  if (state.phase !== SLAY_LIKE_PHASES.reward) {
    errors.push({
      code: "SLAY_NOT_REWARD_PHASE",
      message: "Rewards can only be chosen during the reward phase.",
      details: {
        commandId: command.id,
        phase: state.phase,
      },
    });
  }

  const rewardObjectId = readOptionalCommandString(command, "rewardObjectId");
  if (!rewardObjectId) {
    errors.push({
      code: "SLAY_REWARD_REQUIRED",
      message: "Choosing a reward requires a reward object id.",
      details: {
        commandId: command.id,
      },
    });
  }

  const rewardZone = state.zones[SLAY_LIKE_ZONES.reward];
  if (!rewardZone) {
    errors.push({
      code: "SLAY_ZONE_NOT_FOUND",
      message: `Required Slay-like zone ${SLAY_LIKE_ZONES.reward} does not exist.`,
      details: {
        commandId: command.id,
        zoneId: SLAY_LIKE_ZONES.reward,
      },
    });
  } else if (rewardObjectId && !rewardZone.objectIds.includes(rewardObjectId)) {
    errors.push({
      code: "SLAY_REWARD_NOT_FOUND",
      message: `Reward ${rewardObjectId} is not available.`,
      details: {
        commandId: command.id,
        rewardObjectId,
      },
    });
  }

  return errors;
}

function validateEndTurnCommand(state: GameState, command: Command): readonly RuleError[] {
  const errors: RuleError[] = [];

  if (state.phase !== SLAY_LIKE_PHASES.playerTurn) {
    errors.push({
      code: "SLAY_NOT_PLAYER_TURN",
      message: "Turn can only end during the player turn.",
      details: {
        commandId: command.id,
        phase: state.phase,
      },
    });
  }

  for (const zoneId of [
    SLAY_LIKE_ZONES.hand,
    SLAY_LIKE_ZONES.discardPile,
    SLAY_LIKE_ZONES.drawPile,
    SLAY_LIKE_ZONES.enemy,
  ]) {
    if (!state.zones[zoneId]) {
      errors.push({
        code: "SLAY_ZONE_NOT_FOUND",
        message: `Required Slay-like zone ${zoneId} does not exist.`,
        details: {
          commandId: command.id,
          zoneId,
        },
      });
    }
  }

  return errors;
}

function resolveEnemyIntent(
  state: GameState,
  effect: Effect,
  commandId: Command["id"] | undefined,
): RuleResult {
  let playerId: string;
  try {
    playerId = readEffectString(effect, "playerId");
  } catch (error) {
    return invalidEffectPayload(state, effect, error);
  }

  const enemyZone = state.zones[SLAY_LIKE_ZONES.enemy];

  if (!enemyZone) {
    return failure(state, {
      code: "SLAY_ZONE_NOT_FOUND",
      message: `Required Slay-like zone ${SLAY_LIKE_ZONES.enemy} does not exist.`,
      details: {
        effectId: effect.id,
        zoneId: SLAY_LIKE_ZONES.enemy,
      },
    });
  }

  const enemyIntents: JsonObject[] = [];
  let totalDamage = 0;

  for (const enemyObjectId of enemyZone.objectIds) {
    const enemy = state.objects[enemyObjectId];
    if (!enemy) {
      return failure(state, {
        code: "SLAY_ENEMY_NOT_FOUND",
        message: `Enemy object ${enemyObjectId} does not exist.`,
        details: {
          effectId: effect.id,
          enemyObjectId,
        },
      });
    }

    const hp = readNumberAttribute(enemy, "hp") ?? 0;
    if (hp <= 0) {
      continue;
    }

    const intentDamage = readNumberAttribute(enemy, "intentDamage") ?? 0;
    enemyIntents.push({
      enemyObjectId,
      intentDamage,
    });
    totalDamage += intentDamage;
  }

  const currentResourceState = state.resources[playerId] ?? {
    playerId,
    values: {},
  };
  const previousBlock = currentResourceState.values[SLAY_LIKE_RESOURCES.block] ?? 0;
  const previousHitPoints = currentResourceState.values[SLAY_LIKE_RESOURCES.playerHp] ?? 0;
  const blockedAmount = Math.min(previousBlock, totalDamage);
  const hitPointLoss = totalDamage - blockedAmount;
  const nextBlock = previousBlock - blockedAmount;
  const nextHitPoints = Math.max(0, previousHitPoints - hitPointLoss);
  const playerDefeated = nextHitPoints === 0;
  const nextPhase = playerDefeated ? SLAY_LIKE_PHASES.defeat : SLAY_LIKE_PHASES.enemyTurn;
  const nextState: GameState = {
    ...state,
    phase: nextPhase,
    flags: {
      ...state.flags,
      ...(playerDefeated ? { [SLAY_LIKE_FLAGS.playerDefeated]: true } : {}),
    },
    resources: {
      ...state.resources,
      [playerId]: {
        ...currentResourceState,
        values: {
          ...currentResourceState.values,
          [SLAY_LIKE_RESOURCES.block]: nextBlock,
          [SLAY_LIKE_RESOURCES.playerHp]: nextHitPoints,
        },
      },
    },
  };
  const event: RuleEvent = {
    id: eventIdFor(commandId, effect),
    type: SLAY_LIKE_EVENTS.enemyIntentResolved,
    payload: {
      playerId,
      previousPhase: state.phase,
      nextPhase,
      enemyIntents,
      totalDamage,
      blockedAmount,
      hitPointLoss,
      previousBlock,
      nextBlock,
      previousHitPoints,
      nextHitPoints,
    },
    ...eventCause(commandId, effect),
  };

  return playerDefeated
    ? singleEventWithObjectives(nextState, event, playerId)
    : singleEventSuccess(nextState, event);
}

function startPlayerTurn(
  state: GameState,
  effect: Effect,
  commandId: Command["id"] | undefined,
): RuleResult {
  let playerId: string;
  let nextEnergy: number;
  try {
    playerId = readEffectString(effect, "playerId");
    nextEnergy = readEffectNumber(effect, "energy");
  } catch (error) {
    return invalidEffectPayload(state, effect, error);
  }

  const currentResourceState = state.resources[playerId] ?? {
    playerId,
    values: {},
  };
  const previousEnergy = currentResourceState.values[SLAY_LIKE_RESOURCES.energy] ?? 0;
  const previousBlock = currentResourceState.values[SLAY_LIKE_RESOURCES.block] ?? 0;
  const nextTurn = state.turn + 1;
  const nextState: GameState = {
    ...state,
    phase: SLAY_LIKE_PHASES.playerTurn,
    turn: nextTurn,
    activePlayerId: playerId,
    resources: {
      ...state.resources,
      [playerId]: {
        ...currentResourceState,
        values: {
          ...currentResourceState.values,
          [SLAY_LIKE_RESOURCES.energy]: nextEnergy,
          [SLAY_LIKE_RESOURCES.block]: 0,
        },
      },
    },
  };
  const event: RuleEvent = {
    id: eventIdFor(commandId, effect),
    type: SLAY_LIKE_EVENTS.playerTurnStarted,
    payload: {
      playerId,
      previousPhase: state.phase,
      nextPhase: SLAY_LIKE_PHASES.playerTurn,
      previousTurn: state.turn,
      nextTurn,
      previousEnergy,
      nextEnergy,
      previousBlock,
      nextBlock: 0,
    },
    ...eventCause(commandId, effect),
  };

  return singleEventSuccess(nextState, event);
}

function openRewardDraft(
  state: GameState,
  effect: Effect,
  commandId: Command["id"] | undefined,
  content: SlayLikeRuntimeContent,
): RuleResult {
  let playerId: string;
  try {
    playerId = readEffectString(effect, "playerId");
  } catch (error) {
    return invalidEffectPayload(state, effect, error);
  }

  const rewardZone = state.zones[SLAY_LIKE_ZONES.reward];
  if (!rewardZone) {
    return failure(state, {
      code: "SLAY_ZONE_NOT_FOUND",
      message: `Required Slay-like zone ${SLAY_LIKE_ZONES.reward} does not exist.`,
      details: {
        effectId: effect.id,
        zoneId: SLAY_LIKE_ZONES.reward,
      },
    });
  }

  if (rewardZone.objectIds.length > 0) {
    return failure(state, {
      code: "SLAY_REWARD_DRAFT_ALREADY_OPEN",
      message: "Cannot open a Slay-like reward draft while rewards are already available.",
      details: {
        effectId: effect.id,
        rewardObjectIds: [...rewardZone.objectIds],
      },
    });
  }

  for (const rewardCard of content.rewardDraft) {
    if (state.objects[rewardCard.objectId]) {
      return failure(state, {
        code: "SLAY_REWARD_OBJECT_EXISTS",
        message: `Reward object ${rewardCard.objectId} already exists.`,
        details: {
          effectId: effect.id,
          rewardObjectId: rewardCard.objectId,
        },
      });
    }
  }

  let nextState: GameState = {
    ...state,
    phase: SLAY_LIKE_PHASES.reward,
  };

  for (const rewardCard of content.rewardDraft) {
    nextState = putGameObjectInZone(
      nextState,
      createRewardCardObject(rewardCard, playerId, content.cardDefinitions),
    );
  }

  const event: RuleEvent = {
    id: eventIdFor(commandId, effect),
    type: SLAY_LIKE_EVENTS.rewardDraftOpened,
    payload: {
      playerId,
      previousPhase: state.phase,
      nextPhase: SLAY_LIKE_PHASES.reward,
      rewardObjectIds: content.rewardDraft.map((rewardCard) => rewardCard.objectId),
      rewardDefinitionIds: content.rewardDraft.map((rewardCard) => rewardCard.definitionId),
    },
    ...eventCause(commandId, effect),
  };

  return singleEventSuccess(nextState, event);
}

function completeEncounter(
  state: GameState,
  effect: Effect,
  commandId: Command["id"] | undefined,
): RuleResult {
  let playerId: string;
  let rewardObjectId: string;
  try {
    playerId = readEffectString(effect, "playerId");
    rewardObjectId = readEffectString(effect, "rewardObjectId");
  } catch (error) {
    return invalidEffectPayload(state, effect, error);
  }

  const nextState: GameState = {
    ...state,
    phase: SLAY_LIKE_PHASES.complete,
    flags: {
      ...state.flags,
      [SLAY_LIKE_FLAGS.encounterComplete]: true,
    },
  };
  const event: RuleEvent = {
    id: eventIdFor(commandId, effect),
    type: SLAY_LIKE_EVENTS.encounterCompleted,
    payload: {
      playerId,
      rewardObjectId,
      previousPhase: state.phase,
      nextPhase: SLAY_LIKE_PHASES.complete,
    },
    ...eventCause(commandId, effect),
  };

  return singleEventWithObjectives(nextState, event, playerId);
}

function willDefeatTarget(state: GameState, targetObjectId: string, damage: number): boolean {
  const target = state.objects[targetObjectId];
  if (!target || !isEnemyObject(state, targetObjectId)) {
    return false;
  }

  const hitPoints = readNumberAttribute(target, "hp");
  if (hitPoints === undefined) {
    return false;
  }

  const block = readNumberAttribute(target, "block") ?? 0;
  const hitPointLoss = Math.max(0, damage - block);

  return Math.max(0, hitPoints - hitPointLoss) === 0;
}

function willEnemyIntentDefeatPlayer(state: GameState, playerId: PlayerId): boolean {
  const totalDamage = livingEnemyIds(state).reduce((sum, enemyObjectId) => {
    const enemy = state.objects[enemyObjectId];
    return sum + (enemy ? (readNumberAttribute(enemy, "intentDamage") ?? 0) : 0);
  }, 0);
  const block = state.resources[playerId]?.values[SLAY_LIKE_RESOURCES.block] ?? 0;
  const hitPoints = readPlayerHitPoints(state, playerId);
  const hitPointLoss = Math.max(0, totalDamage - block);

  return Math.max(0, hitPoints - hitPointLoss) === 0;
}

function isLastLivingEnemy(state: GameState, targetObjectId: string): boolean {
  if (!isEnemyObject(state, targetObjectId)) {
    return false;
  }

  return livingEnemyIds(state).every((enemyObjectId) => enemyObjectId === targetObjectId);
}

function livingEnemyIds(state: GameState): readonly string[] {
  const enemyZone = state.zones[SLAY_LIKE_ZONES.enemy];
  if (!enemyZone) {
    return [];
  }

  return enemyZone.objectIds.filter((enemyObjectId) => {
    const enemy = state.objects[enemyObjectId];
    return (enemy ? (readNumberAttribute(enemy, "hp") ?? 0) : 0) > 0;
  });
}

function isEnemyObject(state: GameState, objectId: string): boolean {
  return state.zones[SLAY_LIKE_ZONES.enemy]?.objectIds.includes(objectId) ?? false;
}

function failure(state: GameState, error: RuleError): RuleResult {
  return {
    ok: false,
    state,
    errors: [error],
    events: [],
    presentationIntents: [],
  };
}

function invalidEffectPayload(state: GameState, effect: Effect, error: unknown): RuleResult {
  return failure(state, {
    code: "INVALID_EFFECT_PAYLOAD",
    message: error instanceof Error ? error.message : "Invalid Slay-like effect payload.",
    details: {
      effectId: effect.id,
      effectType: effect.type,
    },
  });
}

function singleEventSuccess(state: GameState, event: RuleEvent): RuleResult {
  return {
    ok: true,
    state,
    events: [event],
    presentationIntents: [
      {
        id: `${event.id}:presentation`,
        type: event.type,
        eventId: event.id,
        payload: event.payload,
      },
    ],
  };
}

function singleEventWithObjectives(
  state: GameState,
  event: RuleEvent,
  playerId: PlayerId,
): RuleResult {
  const objectiveResult = checkObjectives(state, {
    eventIdPrefix: `${event.id}:objectives`,
    definitions: [
      {
        id: SLAY_LIKE_OBJECTIVES.defeatEnemies,
        type: "SlayDefeatEnemies",
        payload: {
          enemyZoneId: SLAY_LIKE_ZONES.enemy,
        },
        isSatisfied: (candidate) => candidate.flags[SLAY_LIKE_FLAGS.encounterComplete] === true,
      },
      {
        id: SLAY_LIKE_OBJECTIVES.surviveEncounter,
        type: "SlaySurviveEncounter",
        payload: {
          playerId,
        },
        isSatisfied: (candidate) =>
          candidate.flags[SLAY_LIKE_FLAGS.encounterComplete] === true &&
          readPlayerHitPoints(candidate, playerId) > 0,
        isFailed: (candidate) => candidate.flags[SLAY_LIKE_FLAGS.playerDefeated] === true,
      },
    ],
  });

  if (!objectiveResult.ok) {
    return objectiveResult;
  }

  const eventPresentationIntent = {
    id: `${event.id}:presentation`,
    type: event.type,
    eventId: event.id,
    payload: event.payload,
  };

  return {
    ok: true,
    state: objectiveResult.state,
    events: [event, ...objectiveResult.events],
    presentationIntents: [eventPresentationIntent, ...objectiveResult.presentationIntents],
  };
}

function eventIdFor(commandId: Command["id"] | undefined, effect: Effect): string {
  return commandId ? `${commandId}:${effect.id}` : effect.id;
}

function eventCause(commandId: Command["id"] | undefined, effect: Effect) {
  return {
    ...(commandId ? { causedByCommandId: commandId } : {}),
    causedByEffectId: effect.id,
  };
}

function readNumberAttribute(object: GameObject, attribute: string): number | undefined {
  const value = object.attributes[attribute];

  return typeof value === "number" ? value : undefined;
}

function readPlayerHitPoints(state: GameState, playerId: PlayerId): number {
  return state.resources[playerId]?.values[SLAY_LIKE_RESOURCES.playerHp] ?? 0;
}

function readEffectString(effect: Effect, key: string): string {
  const value = effect.payload[key];

  if (typeof value !== "string") {
    throw new Error(`Expected effect payload key ${key} to be a string.`);
  }

  return value;
}

function readEffectNumber(effect: Effect, key: string): number {
  const value = effect.payload[key];

  if (typeof value !== "number") {
    throw new Error(`Expected effect payload key ${key} to be a number.`);
  }

  return value;
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
