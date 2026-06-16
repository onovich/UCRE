import {
  GAIN_RESOURCE_EFFECT_TYPE,
  MOVE_OBJECT_EFFECT_TYPE,
  SPEND_RESOURCE_EFFECT_TYPE,
  createCoreEffectRegistry,
  createGameObject,
  createInitialGameState,
  createZone,
  dealDamage,
  destroyObject,
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
  PresentationIntent,
  RuleError,
  RuleEvent,
  RuleResult,
  ZoneId,
} from "@ucre/core";

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

export const SACRIFICE_BOARD_COMMANDS = {
  summon: "sacrifice.summon",
  resolveCombat: "sacrifice.resolveCombat",
} as const;

export const SACRIFICE_BOARD_EFFECTS = {
  completeSummon: "SacrificeBoardCompleteSummon",
  resolveLaneCombat: "SacrificeBoardResolveLaneCombat",
} as const;

export const SACRIFICE_BOARD_EVENTS = {
  creatureSummoned: "SacrificeBoardCreatureSummoned",
  laneCombatResolved: "SacrificeBoardLaneCombatResolved",
} as const;

export const SACRIFICE_BOARD_OBJECTIVES = {
  tipScale: "sacrifice.tipScale",
} as const;

export const SACRIFICE_BOARD_FLAGS = {
  boardStarted: "sacrifice.boardStarted",
  scaleVictory: "sacrifice.scaleVictory",
  scaleDefeat: "sacrifice.scaleDefeat",
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

export interface SacrificeBoardCardDefinition {
  readonly id: string;
  readonly name: string;
  readonly attack: number;
  readonly health: number;
  readonly bloodCost: number;
  readonly boneCost: number;
}

export interface SacrificeBoardCardInstance {
  readonly id: string;
  readonly definitionId: string;
  readonly side?: SacrificeBoardSide;
  readonly laneIndex?: number;
}

export interface SacrificeBoardRuntimeContent {
  readonly cardDefinitions: Readonly<Record<string, SacrificeBoardCardDefinition>>;
}

export type SacrificeBoardRuntimeContentInput = Partial<SacrificeBoardRuntimeContent>;

export interface CreateSacrificeBoardGameInput extends SacrificeBoardRuntimeContentInput {
  readonly gameId: string;
  readonly seed: string;
  readonly contentManifestHash?: string;
  readonly playerId?: PlayerId;
  readonly opponentId?: PlayerId;
  readonly laneCount?: number;
  readonly startingBlood?: number;
  readonly startingBones?: number;
  readonly startingScale?: number;
  readonly scaleTarget?: number;
  readonly startingHand?: readonly SacrificeBoardCardInstance[];
  readonly startingBoard?: readonly SacrificeBoardCardInstance[];
}

export interface ExecuteSacrificeBoardCommandInput {
  readonly state: GameState;
  readonly command: Command;
  readonly content?: SacrificeBoardRuntimeContentInput;
}

export const SACRIFICE_BOARD_CARD_DEFINITIONS: Readonly<
  Record<string, SacrificeBoardCardDefinition>
> = {
  squirrel: {
    id: "squirrel",
    name: "Squirrel",
    attack: 0,
    health: 1,
    bloodCost: 0,
    boneCost: 0,
  },
  stoat: {
    id: "stoat",
    name: "Stoat",
    attack: 1,
    health: 2,
    bloodCost: 1,
    boneCost: 0,
  },
  wolf: {
    id: "wolf",
    name: "Wolf",
    attack: 3,
    health: 2,
    bloodCost: 2,
    boneCost: 0,
  },
  boneHound: {
    id: "bone-hound",
    name: "Bone Hound",
    attack: 2,
    health: 2,
    bloodCost: 0,
    boneCost: 2,
  },
};

export function createSacrificeBoardGame(input: CreateSacrificeBoardGameInput): GameState {
  const playerId = input.playerId ?? "player-1";
  const opponentId = input.opponentId ?? "opponent";
  const cardDefinitions = input.cardDefinitions ?? SACRIFICE_BOARD_CARD_DEFINITIONS;
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
    objectives: [createScaleObjective(input.scaleTarget ?? 5)],
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

  for (const card of input.startingHand ?? []) {
    state = putGameObjectInZone(
      state,
      createSacrificeBoardCardObject({
        card,
        ownerId: playerId,
        zoneId: SACRIFICE_BOARD_ZONES.hand,
        cardDefinitions,
      }),
    );
  }

  for (const card of input.startingBoard ?? []) {
    const side = card.side ?? "player";
    const laneIndex = card.laneIndex ?? 0;
    state = putGameObjectInZone(
      state,
      createSacrificeBoardCardObject({
        card,
        ownerId: side === "player" ? playerId : opponentId,
        zoneId: createSacrificeBoardSlotZoneId(side, laneIndex),
        cardDefinitions,
      }),
    );
  }

  return state;
}

export function createSacrificeBoardCommandRegistry(
  input: SacrificeBoardRuntimeContentInput = {},
): CommandRegistry {
  const cardDefinitions = input.cardDefinitions ?? SACRIFICE_BOARD_CARD_DEFINITIONS;

  return {
    [SACRIFICE_BOARD_COMMANDS.summon]: {
      validate: (state, command) => validateSummonCommand(state, command, cardDefinitions),
      getEffects: (state, command) => createSummonEffects(state, command, cardDefinitions),
    },
    [SACRIFICE_BOARD_COMMANDS.resolveCombat]: {
      validate: (state, command) => validateResolveCombatCommand(state, command),
      getEffects: () => [
        {
          id: "resolve-lane-combat",
          type: SACRIFICE_BOARD_EFFECTS.resolveLaneCombat,
          payload: {},
        },
      ],
    },
  };
}

export function createSacrificeBoardEffectRegistry(): EffectRegistry {
  return {
    ...createCoreEffectRegistry(),
    [SACRIFICE_BOARD_EFFECTS.completeSummon]: (state, effect, context) =>
      completeSummon(state, effect, context.commandId),
    [SACRIFICE_BOARD_EFFECTS.resolveLaneCombat]: (state, effect, context) =>
      resolveLaneCombat(state, effect, context.commandId),
  };
}

export function executeSacrificeBoardCommand(input: ExecuteSacrificeBoardCommandInput): RuleResult {
  return executeCommand({
    state: input.state,
    command: input.command,
    commandRegistry: createSacrificeBoardCommandRegistry(input.content),
    effectRegistry: createSacrificeBoardEffectRegistry(),
  });
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

export function createSacrificeBoardCardObject(input: {
  readonly card: SacrificeBoardCardInstance;
  readonly ownerId: PlayerId;
  readonly zoneId: ZoneId;
  readonly cardDefinitions?: Readonly<Record<string, SacrificeBoardCardDefinition>>;
}): GameObject {
  const definitions = input.cardDefinitions ?? SACRIFICE_BOARD_CARD_DEFINITIONS;
  const definition = definitions[input.card.definitionId];
  if (!definition) {
    throw new Error(`Missing sacrifice-board card definition: ${input.card.definitionId}`);
  }

  return createGameObject({
    id: input.card.id,
    definitionId: input.card.definitionId,
    ownerId: input.ownerId,
    zoneId: input.zoneId,
    tags: ["sacrifice-board", "creature"],
    attributes: {
      name: definition.name,
      attack: definition.attack,
      hp: definition.health,
      bloodCost: definition.bloodCost,
      boneCost: definition.boneCost,
    },
  });
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

function validateSummonCommand(
  state: GameState,
  command: Command,
  cardDefinitions: Readonly<Record<string, SacrificeBoardCardDefinition>>,
): readonly RuleError[] {
  const phaseError = requireMainPhase(state, command);
  if (phaseError) {
    return [phaseError];
  }

  const cardId = readCommandString(command, "cardId");
  const slotZoneId = readCommandString(command, "slotZoneId");
  const sacrificeObjectIds = readCommandStringArray(command, "sacrificeObjectIds");
  const card = state.objects[cardId];
  const definition = card ? cardDefinitions[card.definitionId] : undefined;
  const targetZone = state.zones[slotZoneId];

  if (!card || card.zoneId !== SACRIFICE_BOARD_ZONES.hand) {
    return [
      {
        code: "SACRIFICE_CARD_NOT_IN_HAND",
        message: `Sacrifice-board summon requires card in hand: ${cardId}.`,
        details: {
          commandId: command.id,
          cardId,
        },
      },
    ];
  }
  if (!definition) {
    return [
      {
        code: "SACRIFICE_CARD_DEFINITION_NOT_FOUND",
        message: `Sacrifice-board card definition does not exist: ${card.definitionId}.`,
        details: {
          commandId: command.id,
          cardId,
          definitionId: card.definitionId,
        },
      },
    ];
  }
  if (!targetZone || targetZone.kind !== "board" || targetZone.metadata.side !== "player") {
    return [
      {
        code: "SACRIFICE_INVALID_TARGET_SLOT",
        message: `Sacrifice-board summon requires an empty player board slot: ${slotZoneId}.`,
        details: {
          commandId: command.id,
          slotZoneId,
        },
      },
    ];
  }
  if (targetZone.objectIds.length > 0) {
    return [
      {
        code: "SACRIFICE_TARGET_SLOT_OCCUPIED",
        message: `Sacrifice-board target slot is occupied: ${slotZoneId}.`,
        details: {
          commandId: command.id,
          slotZoneId,
          occupyingObjectId: targetZone.objectIds[0] ?? null,
        },
      },
    ];
  }

  const duplicateSacrifices = sacrificeObjectIds.filter(
    (objectId, index) => sacrificeObjectIds.indexOf(objectId) !== index,
  );
  if (duplicateSacrifices.length > 0 || sacrificeObjectIds.includes(cardId)) {
    return [
      {
        code: "SACRIFICE_INVALID_SACRIFICE_SET",
        message:
          "Sacrifice-board summon requires unique sacrifice objects separate from the summoned card.",
        details: {
          commandId: command.id,
          cardId,
          sacrificeObjectIds: [...sacrificeObjectIds],
        },
      },
    ];
  }

  const invalidSacrificeId = sacrificeObjectIds.find(
    (objectId) => !isPlayerBoardCreature(state, objectId),
  );
  if (invalidSacrificeId) {
    return [
      {
        code: "SACRIFICE_OBJECT_NOT_ON_BOARD",
        message: `Sacrifice-board sacrifice object is not a player board creature: ${invalidSacrificeId}.`,
        details: {
          commandId: command.id,
          objectId: invalidSacrificeId,
        },
      },
    ];
  }

  const availableBlood =
    sacrificeObjectIds.length +
    (state.resources[command.playerId]?.values[SACRIFICE_BOARD_RESOURCES.blood] ?? 0);
  const availableBones =
    sacrificeObjectIds.length +
    (state.resources[command.playerId]?.values[SACRIFICE_BOARD_RESOURCES.bones] ?? 0);

  if (availableBlood < definition.bloodCost) {
    return [
      {
        code: "SACRIFICE_INSUFFICIENT_BLOOD",
        message: `Sacrifice-board summon needs ${definition.bloodCost} blood, only ${availableBlood} available.`,
        details: {
          commandId: command.id,
          cardId,
          required: definition.bloodCost,
          available: availableBlood,
        },
      },
    ];
  }
  if (availableBones < definition.boneCost) {
    return [
      {
        code: "SACRIFICE_INSUFFICIENT_BONES",
        message: `Sacrifice-board summon needs ${definition.boneCost} bones, only ${availableBones} available.`,
        details: {
          commandId: command.id,
          cardId,
          required: definition.boneCost,
          available: availableBones,
        },
      },
    ];
  }

  return [];
}

function validateResolveCombatCommand(state: GameState, command: Command): readonly RuleError[] {
  const phaseError = requireMainPhase(state, command);
  return phaseError ? [phaseError] : [];
}

function createSummonEffects(
  state: GameState,
  command: Command,
  cardDefinitions: Readonly<Record<string, SacrificeBoardCardDefinition>>,
): readonly Effect[] {
  const cardId = readCommandString(command, "cardId");
  const slotZoneId = readCommandString(command, "slotZoneId");
  const sacrificeObjectIds = readCommandStringArray(command, "sacrificeObjectIds");
  const definition = cardDefinitions[state.objects[cardId]?.definitionId ?? ""];
  if (!definition) {
    return [];
  }

  const bloodToSpend = Math.max(0, definition.bloodCost - sacrificeObjectIds.length);
  const effects: Effect[] = [
    ...sacrificeObjectIds.map(
      (objectId, index): Effect => ({
        id: `move-sacrifice-${index}`,
        type: MOVE_OBJECT_EFFECT_TYPE,
        payload: {
          objectId,
          toZoneId: SACRIFICE_BOARD_ZONES.sacrificePile,
        },
      }),
    ),
    ...sacrificeObjectIds.map(
      (_objectId, index): Effect => ({
        id: `gain-bone-${index}`,
        type: GAIN_RESOURCE_EFFECT_TYPE,
        payload: {
          playerId: command.playerId,
          resourceId: SACRIFICE_BOARD_RESOURCES.bones,
          amount: 1,
        },
      }),
    ),
  ];

  if (bloodToSpend > 0) {
    effects.push({
      id: "spend-blood",
      type: SPEND_RESOURCE_EFFECT_TYPE,
      payload: {
        playerId: command.playerId,
        resourceId: SACRIFICE_BOARD_RESOURCES.blood,
        amount: bloodToSpend,
      },
    });
  }
  if (definition.boneCost > 0) {
    effects.push({
      id: "spend-bones",
      type: SPEND_RESOURCE_EFFECT_TYPE,
      payload: {
        playerId: command.playerId,
        resourceId: SACRIFICE_BOARD_RESOURCES.bones,
        amount: definition.boneCost,
      },
    });
  }

  effects.push(
    {
      id: "move-summoned-card",
      type: MOVE_OBJECT_EFFECT_TYPE,
      payload: {
        objectId: cardId,
        toZoneId: slotZoneId,
      },
    },
    {
      id: "complete-summon",
      type: SACRIFICE_BOARD_EFFECTS.completeSummon,
      payload: {
        cardId,
        slotZoneId,
        sacrificeObjectIds: [...sacrificeObjectIds],
        bloodCost: definition.bloodCost,
        boneCost: definition.boneCost,
      },
    },
  );

  return effects;
}

function requireMainPhase(state: GameState, command: Command): RuleError | undefined {
  if (state.phase === SACRIFICE_BOARD_PHASES.main) {
    return undefined;
  }

  return {
    code: "SACRIFICE_INVALID_PHASE",
    message: `Sacrifice-board command ${command.type} requires phase ${SACRIFICE_BOARD_PHASES.main}.`,
    details: {
      commandId: command.id,
      expectedPhase: SACRIFICE_BOARD_PHASES.main,
      phase: state.phase,
    },
  };
}

function completeSummon(
  state: GameState,
  effect: Effect,
  commandId: string | undefined,
): RuleResult {
  return eventSuccess(
    state,
    eventIdFor(commandId, effect),
    SACRIFICE_BOARD_EVENTS.creatureSummoned,
    {
      cardId: readEffectString(effect, "cardId"),
      slotZoneId: readEffectString(effect, "slotZoneId"),
      sacrificeObjectIds: [...readEffectStringArray(effect, "sacrificeObjectIds")],
      bloodCost: readEffectNumber(effect, "bloodCost"),
      boneCost: readEffectNumber(effect, "boneCost"),
    },
    commandId,
    effect.id,
  );
}

function resolveLaneCombat(
  state: GameState,
  effect: Effect,
  commandId: string | undefined,
): RuleResult {
  const playerId = state.activePlayerId ?? "player-1";
  let currentState = state;
  const events: RuleEvent[] = [];
  const presentationIntents: PresentationIntent[] = [];
  const laneResults: JsonObject[] = [];
  let scaleDelta = 0;

  for (const slot of getBoardSlots(currentState, "player")) {
    const attackerObjectId = slot.objectIds[0];
    if (!attackerObjectId) {
      continue;
    }

    const attacker = currentState.objects[attackerObjectId];
    if (!attacker) {
      continue;
    }

    const attack = readCreatureNumber(attacker, "attack");
    const opposingZoneId = readZoneMetadataString(slot.metadata, "opposingZoneId");
    const defenderObjectId = opposingZoneId
      ? currentState.zones[opposingZoneId]?.objectIds[0]
      : undefined;
    const laneIndex = readZoneMetadataNumber(slot.metadata, "laneIndex") ?? 0;

    if (defenderObjectId) {
      const damageResult = dealDamage(currentState, {
        targetObjectId: defenderObjectId,
        amount: attack,
        hitPointsAttribute: "hp",
        blockAttribute: "block",
        eventId: `${eventIdFor(commandId, effect)}:lane:${laneIndex}:damage`,
        ...(commandId ? { causedByCommandId: commandId } : {}),
        causedByEffectId: effect.id,
      });
      if (!damageResult.ok) {
        return damageResult;
      }

      currentState = damageResult.state;
      events.push(...damageResult.events);
      presentationIntents.push(...damageResult.presentationIntents);

      const damagedDefender = currentState.objects[defenderObjectId];
      const defenderDestroyed = damagedDefender
        ? readCreatureNumber(damagedDefender, "hp") <= 0
        : false;
      if (defenderDestroyed) {
        const destroyResult = destroyObject(currentState, {
          objectId: defenderObjectId,
          eventId: `${eventIdFor(commandId, effect)}:lane:${laneIndex}:destroy`,
          ...(commandId ? { causedByCommandId: commandId } : {}),
          causedByEffectId: effect.id,
        });
        if (!destroyResult.ok) {
          return destroyResult;
        }

        currentState = destroyResult.state;
        events.push(...destroyResult.events);
        presentationIntents.push(...destroyResult.presentationIntents);
      }

      laneResults.push({
        laneIndex,
        attackerObjectId,
        defenderObjectId,
        damage: attack,
        ...(defenderDestroyed ? { destroyedObjectId: defenderObjectId } : {}),
      });
    } else {
      scaleDelta += attack;
      laneResults.push({
        laneIndex,
        attackerObjectId,
        defenderObjectId: null,
        damage: attack,
        scaleDelta: attack,
      });
    }
  }

  const nextStateBeforeObjective =
    scaleDelta === 0 ? currentState : changeResource(currentState, playerId, scaleDelta);
  const nextState = evaluateScaleObjective(nextStateBeforeObjective, playerId);
  const event: RuleEvent = {
    id: eventIdFor(commandId, effect),
    type: SACRIFICE_BOARD_EVENTS.laneCombatResolved,
    payload: {
      playerId,
      scaleDelta,
      phase: nextState.phase,
      objectiveStatus:
        nextState.objectives.find(
          (objective) => objective.id === SACRIFICE_BOARD_OBJECTIVES.tipScale,
        )?.status ?? "pending",
      laneResults,
    },
    ...(commandId ? { causedByCommandId: commandId } : {}),
    causedByEffectId: effect.id,
  };

  return {
    ok: true,
    state: nextState,
    events: [...events, event],
    presentationIntents: [
      ...presentationIntents,
      {
        id: `${event.id}:presentation`,
        type: SACRIFICE_BOARD_EVENTS.laneCombatResolved,
        eventId: event.id,
        payload: event.payload,
      },
    ],
  };
}

function getBoardSlots(state: GameState, side: SacrificeBoardSide) {
  return Object.values(state.zones)
    .filter((zone) => zone.kind === "board" && zone.metadata.side === side)
    .sort(
      (left, right) =>
        (readZoneMetadataNumber(left.metadata, "laneIndex") ?? 0) -
        (readZoneMetadataNumber(right.metadata, "laneIndex") ?? 0),
    );
}

function changeResource(state: GameState, playerId: PlayerId, scaleDelta: number): GameState {
  const currentResourceState = state.resources[playerId] ?? {
    playerId,
    values: {},
  };
  const previousScale = currentResourceState.values[SACRIFICE_BOARD_RESOURCES.scale] ?? 0;

  return {
    ...state,
    resources: {
      ...state.resources,
      [playerId]: {
        ...currentResourceState,
        values: {
          ...currentResourceState.values,
          [SACRIFICE_BOARD_RESOURCES.scale]: previousScale + scaleDelta,
        },
      },
    },
  };
}

function createScaleObjective(scaleTarget: number): ObjectiveState {
  return {
    id: SACRIFICE_BOARD_OBJECTIVES.tipScale,
    type: "scale",
    status: "pending",
    payload: {
      resourceId: SACRIFICE_BOARD_RESOURCES.scale,
      target: scaleTarget,
    },
  };
}

function evaluateScaleObjective(state: GameState, playerId: PlayerId): GameState {
  const scaleObjective = state.objectives.find(
    (objective) => objective.id === SACRIFICE_BOARD_OBJECTIVES.tipScale,
  );
  if (!scaleObjective || scaleObjective.status !== "pending") {
    return state;
  }

  const target = readObjectiveTarget(scaleObjective);
  const scale = state.resources[playerId]?.values[SACRIFICE_BOARD_RESOURCES.scale] ?? 0;
  const nextStatus = scale >= target ? "succeeded" : scale <= -target ? "failed" : "pending";
  if (nextStatus === "pending") {
    return state;
  }

  return {
    ...state,
    phase:
      nextStatus === "succeeded" ? SACRIFICE_BOARD_PHASES.complete : SACRIFICE_BOARD_PHASES.defeat,
    flags: {
      ...state.flags,
      ...(nextStatus === "succeeded"
        ? { [SACRIFICE_BOARD_FLAGS.scaleVictory]: true }
        : { [SACRIFICE_BOARD_FLAGS.scaleDefeat]: true }),
    },
    objectives: state.objectives.map((objective) =>
      objective.id === SACRIFICE_BOARD_OBJECTIVES.tipScale
        ? {
            ...objective,
            status: nextStatus,
          }
        : objective,
    ),
  };
}

function readObjectiveTarget(objective: ObjectiveState): number {
  const target = objective.payload.target;
  return typeof target === "number" ? target : 5;
}

function isPlayerBoardCreature(state: GameState, objectId: string): boolean {
  const object = state.objects[objectId];
  const zone = object ? state.zones[object.zoneId] : undefined;

  return Boolean(object && zone?.kind === "board" && zone.metadata.side === "player");
}

function eventSuccess(
  state: GameState,
  eventId: string,
  eventType: string,
  payload: JsonObject,
  commandId: string | undefined,
  effectId: string,
): RuleResult {
  const event: RuleEvent = {
    id: eventId,
    type: eventType,
    payload,
    ...(commandId ? { causedByCommandId: commandId } : {}),
    causedByEffectId: effectId,
  };

  return {
    ok: true,
    state,
    events: [event],
    presentationIntents: [
      {
        id: `${eventId}:presentation`,
        type: eventType,
        eventId,
        payload,
      },
    ],
  };
}

function eventIdFor(commandId: string | undefined, effect: Effect): string {
  return commandId ? `${commandId}:${effect.id}` : effect.id;
}

function readCommandString(command: Command, key: string): string {
  const value = command.payload[key];
  if (typeof value !== "string") {
    throw new Error(`Expected sacrifice-board command payload key ${key} to be a string.`);
  }
  return value;
}

function readCommandStringArray(command: Command, key: string): string[] {
  const value = command.payload[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Expected sacrifice-board command payload key ${key} to be a string array.`);
  }
  return value.map((item) => String(item));
}

function readEffectString(effect: Effect, key: string): string {
  const value = effect.payload[key];
  if (typeof value !== "string") {
    throw new Error(`Expected sacrifice-board effect payload key ${key} to be a string.`);
  }
  return value;
}

function readEffectNumber(effect: Effect, key: string): number {
  const value = effect.payload[key];
  if (typeof value !== "number") {
    throw new Error(`Expected sacrifice-board effect payload key ${key} to be a number.`);
  }
  return value;
}

function readEffectStringArray(effect: Effect, key: string): string[] {
  const value = effect.payload[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Expected sacrifice-board effect payload key ${key} to be a string array.`);
  }
  return value.map((item) => String(item));
}

function readCreatureNumber(object: GameObject, key: string): number {
  const value = object.attributes[key];
  return typeof value === "number" ? value : 0;
}

function readZoneMetadataString(metadata: JsonObject, key: string): string | undefined {
  const value = metadata[key];
  return typeof value === "string" ? value : undefined;
}

function readZoneMetadataNumber(metadata: JsonObject, key: string): number | undefined {
  const value = metadata[key];
  return typeof value === "number" ? value : undefined;
}
