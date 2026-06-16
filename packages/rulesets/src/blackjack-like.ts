import {
  MOVE_OBJECT_EFFECT_TYPE,
  createCoreEffectRegistry,
  createGameObject,
  createInitialGameState,
  createZone,
  executeCommand,
  moveObject,
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
  PresentationIntent,
  PlayerId,
  RuleError,
  RuleEvent,
  RuleResult,
  ZoneId,
} from "@ucre/core";

export const BLACKJACK_LIKE_RULESET_ID = "blackjack-like";
export const BLACKJACK_LIKE_RULES_VERSION = "blackjack-like-0";
export const BLACKJACK_LIKE_CONTENT_MANIFEST_HASH = "blackjack-like-inline-content-0";

export const BLACKJACK_LIKE_PHASES = {
  setup: "setup",
  betting: "betting",
  playerTurn: "playerTurn",
  dealerTurn: "dealerTurn",
  settlement: "settlement",
  complete: "complete",
  bust: "bust",
} as const;

export const BLACKJACK_LIKE_ZONES = {
  shoe: "dealer.shoe",
  playerHand: "player.hand",
  dealerHand: "dealer.hand",
  discard: "dealer.discard",
  wager: "player.wager",
} as const;

export const BLACKJACK_LIKE_RESOURCES = {
  chips: "chips",
  currentBet: "currentBet",
  suspicion: "suspicion",
} as const;

export const BLACKJACK_LIKE_COMMANDS = {
  dealInitial: "blackjack.dealInitial",
  hit: "blackjack.hit",
  stand: "blackjack.stand",
} as const;

export const BLACKJACK_LIKE_EFFECTS = {
  enterPhase: "BlackjackEnterPhase",
  evaluatePlayerHand: "BlackjackEvaluatePlayerHand",
  resolveDealerPolicy: "BlackjackResolveDealerPolicy",
} as const;

export const BLACKJACK_LIKE_EVENTS = {
  phaseChanged: "BlackjackPhaseChanged",
  playerHandEvaluated: "BlackjackPlayerHandEvaluated",
  dealerPolicyResolved: "BlackjackDealerPolicyResolved",
} as const;

export const BLACKJACK_LIKE_FLAGS = {
  roundStarted: "blackjack.roundStarted",
  playerBust: "blackjack.playerBust",
  playerStood: "blackjack.playerStood",
  dealerBust: "blackjack.dealerBust",
  outcome: "blackjack.outcome",
} as const;

export const BLACKJACK_LIKE_SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
export const BLACKJACK_LIKE_RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;

export type BlackjackLikeSuit = (typeof BLACKJACK_LIKE_SUITS)[number];
export type BlackjackLikeRank = (typeof BLACKJACK_LIKE_RANKS)[number];

export interface BlackjackLikeCardDefinition {
  readonly id: string;
  readonly suit: BlackjackLikeSuit;
  readonly rank: BlackjackLikeRank;
  readonly value: number;
  readonly isAce: boolean;
}

export interface CreateBlackjackLikeRoundInput {
  readonly gameId: string;
  readonly seed: string;
  readonly contentManifestHash?: string;
  readonly playerId?: PlayerId;
  readonly dealerId?: PlayerId;
  readonly startingChips?: number;
  readonly currentBet?: number;
  readonly suspicion?: number;
}

export type BlackjackLikeOutcome = "playerWin" | "dealerWin" | "push";

export interface BlackjackLikeHandValue {
  readonly cardObjectIds: readonly string[];
  readonly rawTotal: number;
  readonly bestTotal: number;
  readonly aceCount: number;
  readonly isSoft: boolean;
  readonly isBust: boolean;
}

export interface ExecuteBlackjackLikeCommandInput {
  readonly state: GameState;
  readonly command: Command;
}

export function createBlackjackLikeRound(input: CreateBlackjackLikeRoundInput): GameState {
  const playerId = input.playerId ?? "player-1";
  const dealerId = input.dealerId ?? "dealer";
  let state: GameState = {
    ...createInitialGameState({
      id: input.gameId,
      seed: input.seed,
      rulesVersion: BLACKJACK_LIKE_RULES_VERSION,
      contentManifestHash: input.contentManifestHash ?? BLACKJACK_LIKE_CONTENT_MANIFEST_HASH,
      activePlayerId: playerId,
    }),
    phase: BLACKJACK_LIKE_PHASES.betting,
    resources: {
      [playerId]: {
        playerId,
        values: {
          [BLACKJACK_LIKE_RESOURCES.chips]: input.startingChips ?? 100,
          [BLACKJACK_LIKE_RESOURCES.currentBet]: input.currentBet ?? 0,
          [BLACKJACK_LIKE_RESOURCES.suspicion]: input.suspicion ?? 0,
        },
      },
    },
    flags: {
      [BLACKJACK_LIKE_FLAGS.roundStarted]: true,
    },
  };

  state = putZone(
    state,
    createZone({
      id: BLACKJACK_LIKE_ZONES.shoe,
      kind: "deck",
      ownerId: dealerId,
      metadata: {
        rulesetId: BLACKJACK_LIKE_RULESET_ID,
        ordered: true,
      },
    }),
  );
  state = putZone(
    state,
    createZone({
      id: BLACKJACK_LIKE_ZONES.playerHand,
      kind: "hand",
      ownerId: playerId,
    }),
  );
  state = putZone(
    state,
    createZone({
      id: BLACKJACK_LIKE_ZONES.dealerHand,
      kind: "hand",
      ownerId: dealerId,
    }),
  );
  state = putZone(
    state,
    createZone({
      id: BLACKJACK_LIKE_ZONES.discard,
      kind: "discard",
      ownerId: dealerId,
    }),
  );
  state = putZone(
    state,
    createZone({
      id: BLACKJACK_LIKE_ZONES.wager,
      kind: "custom",
      ownerId: playerId,
    }),
  );

  for (const definition of createStandardBlackjackShoe()) {
    state = putGameObjectInZone(
      state,
      createGameObject({
        id: definition.id,
        definitionId: "standard-playing-card",
        ownerId: dealerId,
        zoneId: BLACKJACK_LIKE_ZONES.shoe,
        visibility: "hidden",
        facing: "down",
        tags: ["blackjack", "playing-card"],
        attributes: cardAttributes(definition),
      }),
    );
  }

  return state;
}

export function createBlackjackLikeCommandRegistry(): CommandRegistry {
  return {
    [BLACKJACK_LIKE_COMMANDS.dealInitial]: {
      validate: (state, command) => validateInitialDealCommand(state, command),
      getEffects: (state) => {
        const shoeObjectIds = state.zones[BLACKJACK_LIKE_ZONES.shoe]?.objectIds ?? [];

        return [
          createDealEffect("deal-player-card-1", shoeObjectIds[0], BLACKJACK_LIKE_ZONES.playerHand),
          createDealEffect("deal-dealer-card-1", shoeObjectIds[1], BLACKJACK_LIKE_ZONES.dealerHand),
          createDealEffect("deal-player-card-2", shoeObjectIds[2], BLACKJACK_LIKE_ZONES.playerHand),
          createDealEffect("deal-dealer-card-2", shoeObjectIds[3], BLACKJACK_LIKE_ZONES.dealerHand),
          {
            id: "enter-player-turn",
            type: BLACKJACK_LIKE_EFFECTS.enterPhase,
            payload: {
              phase: BLACKJACK_LIKE_PHASES.playerTurn,
              reason: "initialDeal",
            },
          },
        ];
      },
    },
    [BLACKJACK_LIKE_COMMANDS.hit]: {
      validate: (state, command) => validateHitCommand(state, command),
      getEffects: (state) => {
        const nextCardId = state.zones[BLACKJACK_LIKE_ZONES.shoe]?.objectIds[0];

        return [
          createDealEffect("deal-hit-card", nextCardId, BLACKJACK_LIKE_ZONES.playerHand),
          {
            id: "evaluate-player-hand",
            type: BLACKJACK_LIKE_EFFECTS.evaluatePlayerHand,
            payload: {},
          },
        ];
      },
    },
    [BLACKJACK_LIKE_COMMANDS.stand]: {
      validate: (state, command) => validateStandCommand(state, command),
      getEffects: (_state, command) => [
        {
          id: "resolve-dealer-policy",
          type: BLACKJACK_LIKE_EFFECTS.resolveDealerPolicy,
          payload: {
            playerId: command.playerId,
          },
        },
      ],
    },
  };
}

export function createBlackjackLikeEffectRegistry(): EffectRegistry {
  return {
    ...createCoreEffectRegistry(),
    [BLACKJACK_LIKE_EFFECTS.enterPhase]: (state, effect, context) =>
      enterBlackjackPhase(state, effect, context.commandId),
    [BLACKJACK_LIKE_EFFECTS.evaluatePlayerHand]: (state, effect, context) =>
      evaluatePlayerHand(state, effect, context.commandId),
    [BLACKJACK_LIKE_EFFECTS.resolveDealerPolicy]: (state, effect, context) =>
      resolveDealerPolicy(state, effect, context.commandId),
  };
}

export function executeBlackjackLikeCommand(input: ExecuteBlackjackLikeCommandInput): RuleResult {
  return executeCommand({
    state: input.state,
    command: input.command,
    commandRegistry: createBlackjackLikeCommandRegistry(),
    effectRegistry: createBlackjackLikeEffectRegistry(),
  });
}

export function getBlackjackLikeHandValue(
  state: GameState,
  zoneId: ZoneId,
): BlackjackLikeHandValue {
  const cardObjectIds = state.zones[zoneId]?.objectIds ?? [];
  const cards = cardObjectIds.flatMap((objectId) => {
    const object = state.objects[objectId];
    return object ? [object] : [];
  });
  const rawTotal = cards.reduce((total, object) => total + readCardValue(object), 0);
  const aceCount = cards.filter((object) => object.attributes.isAce === true).length;
  let bestTotal = rawTotal;
  let aceReductions = 0;

  while (bestTotal > 21 && aceReductions < aceCount) {
    bestTotal -= 10;
    aceReductions += 1;
  }

  return {
    cardObjectIds,
    rawTotal,
    bestTotal,
    aceCount,
    isSoft: aceCount - aceReductions > 0 && bestTotal <= 21,
    isBust: bestTotal > 21,
  };
}

export function createStandardBlackjackShoe(): readonly BlackjackLikeCardDefinition[] {
  return BLACKJACK_LIKE_SUITS.flatMap((suit) =>
    BLACKJACK_LIKE_RANKS.map((rank) => ({
      id: `blackjack-card-${suit}-${rank.toLowerCase()}`,
      suit,
      rank,
      value: blackjackRankValue(rank),
      isAce: rank === "A",
    })),
  );
}

export function blackjackRankValue(rank: BlackjackLikeRank): number {
  if (rank === "A") {
    return 11;
  }
  if (rank === "J" || rank === "Q" || rank === "K") {
    return 10;
  }
  return Number(rank);
}

function cardAttributes(definition: BlackjackLikeCardDefinition): JsonObject {
  return {
    suit: definition.suit,
    rank: definition.rank,
    value: definition.value,
    isAce: definition.isAce,
  };
}

function createDealEffect(id: string, objectId: string | undefined, toZoneId: ZoneId): Effect {
  return {
    id,
    type: MOVE_OBJECT_EFFECT_TYPE,
    payload: {
      objectId: objectId ?? "",
      toZoneId,
    },
  };
}

function validateInitialDealCommand(state: GameState, command: Command): readonly RuleError[] {
  const phaseError = requirePhase(state, command, BLACKJACK_LIKE_PHASES.betting);
  if (phaseError) {
    return [phaseError];
  }

  const shoeObjectIds = state.zones[BLACKJACK_LIKE_ZONES.shoe]?.objectIds ?? [];
  const playerHandObjectIds = state.zones[BLACKJACK_LIKE_ZONES.playerHand]?.objectIds ?? [];
  const dealerHandObjectIds = state.zones[BLACKJACK_LIKE_ZONES.dealerHand]?.objectIds ?? [];

  if (shoeObjectIds.length < 4) {
    return [notEnoughCardsError(command, 4, shoeObjectIds.length)];
  }
  if (playerHandObjectIds.length > 0 || dealerHandObjectIds.length > 0) {
    return [
      {
        code: "BLACKJACK_HANDS_ALREADY_DEALT",
        message: "Initial blackjack deal requires empty player and dealer hands.",
        details: {
          commandId: command.id,
          playerHandCount: playerHandObjectIds.length,
          dealerHandCount: dealerHandObjectIds.length,
        },
      },
    ];
  }

  return [];
}

function validateHitCommand(state: GameState, command: Command): readonly RuleError[] {
  const phaseError = requirePhase(state, command, BLACKJACK_LIKE_PHASES.playerTurn);
  if (phaseError) {
    return [phaseError];
  }

  const shoeCount = state.zones[BLACKJACK_LIKE_ZONES.shoe]?.objectIds.length ?? 0;
  if (shoeCount < 1) {
    return [notEnoughCardsError(command, 1, shoeCount)];
  }

  return [];
}

function validateStandCommand(state: GameState, command: Command): readonly RuleError[] {
  const phaseError = requirePhase(state, command, BLACKJACK_LIKE_PHASES.playerTurn);
  return phaseError ? [phaseError] : [];
}

function requirePhase(
  state: GameState,
  command: Command,
  expectedPhase: string,
): RuleError | undefined {
  if (state.phase === expectedPhase) {
    return undefined;
  }

  return {
    code: "BLACKJACK_INVALID_PHASE",
    message: `Blackjack command ${command.type} requires phase ${expectedPhase}.`,
    details: {
      commandId: command.id,
      expectedPhase,
      phase: state.phase,
    },
  };
}

function notEnoughCardsError(command: Command, required: number, available: number): RuleError {
  return {
    code: "BLACKJACK_SHOE_EMPTY",
    message: `Blackjack command ${command.type} requires ${required} card(s) in the shoe.`,
    details: {
      commandId: command.id,
      required,
      available,
    },
  };
}

function enterBlackjackPhase(
  state: GameState,
  effect: Effect,
  commandId: string | undefined,
): RuleResult {
  const phase = readEffectString(effect, "phase");
  const nextState: GameState = {
    ...state,
    phase,
  };

  return eventSuccess(
    nextState,
    eventIdFor(commandId, effect),
    BLACKJACK_LIKE_EVENTS.phaseChanged,
    {
      previousPhase: state.phase,
      nextPhase: phase,
      reason: readOptionalEffectString(effect, "reason") ?? "command",
    },
    commandId,
    effect.id,
  );
}

function evaluatePlayerHand(
  state: GameState,
  effect: Effect,
  commandId: string | undefined,
): RuleResult {
  const handValue = getBlackjackLikeHandValue(state, BLACKJACK_LIKE_ZONES.playerHand);
  const nextState: GameState = handValue.isBust
    ? {
        ...state,
        phase: BLACKJACK_LIKE_PHASES.bust,
        flags: {
          ...state.flags,
          [BLACKJACK_LIKE_FLAGS.playerBust]: true,
          [BLACKJACK_LIKE_FLAGS.outcome]: "dealerWin",
        },
      }
    : state;

  return eventSuccess(
    nextState,
    eventIdFor(commandId, effect),
    BLACKJACK_LIKE_EVENTS.playerHandEvaluated,
    handValuePayload(handValue),
    commandId,
    effect.id,
  );
}

function resolveDealerPolicy(
  state: GameState,
  effect: Effect,
  commandId: string | undefined,
): RuleResult {
  const playerId =
    readOptionalEffectString(effect, "playerId") ?? state.activePlayerId ?? "player-1";
  let currentState = state;
  const events: RuleEvent[] = [];
  const presentationIntents: PresentationIntent[] = [];
  const drawnObjectIds: string[] = [];
  let dealerHandValue = getBlackjackLikeHandValue(currentState, BLACKJACK_LIKE_ZONES.dealerHand);
  let drawIndex = 0;

  while (dealerHandValue.bestTotal < 17) {
    const nextCardId = currentState.zones[BLACKJACK_LIKE_ZONES.shoe]?.objectIds[0];
    if (!nextCardId) {
      break;
    }

    const moveResult = moveObject(currentState, {
      objectId: nextCardId,
      toZoneId: BLACKJACK_LIKE_ZONES.dealerHand,
      eventId: `${eventIdFor(commandId, effect)}:dealer-draw:${drawIndex}`,
      ...(commandId ? { causedByCommandId: commandId } : {}),
      causedByEffectId: effect.id,
    });

    if (!moveResult.ok) {
      return moveResult;
    }

    currentState = moveResult.state;
    events.push(...moveResult.events);
    presentationIntents.push(...moveResult.presentationIntents);
    drawnObjectIds.push(nextCardId);
    dealerHandValue = getBlackjackLikeHandValue(currentState, BLACKJACK_LIKE_ZONES.dealerHand);
    drawIndex += 1;
  }

  const playerHandValue = getBlackjackLikeHandValue(currentState, BLACKJACK_LIKE_ZONES.playerHand);
  const outcome = determineOutcome(playerHandValue, dealerHandValue);
  const settledState = settleResources(
    {
      ...currentState,
      phase: BLACKJACK_LIKE_PHASES.complete,
      flags: {
        ...currentState.flags,
        [BLACKJACK_LIKE_FLAGS.playerStood]: true,
        [BLACKJACK_LIKE_FLAGS.dealerBust]: dealerHandValue.isBust,
        [BLACKJACK_LIKE_FLAGS.outcome]: outcome,
      },
    },
    playerId,
    outcome,
  );
  const policyEvent: RuleEvent = {
    id: eventIdFor(commandId, effect),
    type: BLACKJACK_LIKE_EVENTS.dealerPolicyResolved,
    payload: {
      playerId,
      drawnObjectIds,
      playerHand: handValuePayload(playerHandValue),
      dealerHand: handValuePayload(dealerHandValue),
      outcome,
    },
    ...(commandId ? { causedByCommandId: commandId } : {}),
    causedByEffectId: effect.id,
  };

  return {
    ok: true,
    state: settledState,
    events: [...events, policyEvent],
    presentationIntents: [
      ...presentationIntents,
      {
        id: `${policyEvent.id}:presentation`,
        type: BLACKJACK_LIKE_EVENTS.dealerPolicyResolved,
        eventId: policyEvent.id,
        payload: policyEvent.payload,
      },
    ],
  };
}

function determineOutcome(
  playerHandValue: BlackjackLikeHandValue,
  dealerHandValue: BlackjackLikeHandValue,
): BlackjackLikeOutcome {
  if (playerHandValue.isBust) {
    return "dealerWin";
  }
  if (dealerHandValue.isBust) {
    return "playerWin";
  }
  if (playerHandValue.bestTotal > dealerHandValue.bestTotal) {
    return "playerWin";
  }
  if (dealerHandValue.bestTotal > playerHandValue.bestTotal) {
    return "dealerWin";
  }
  return "push";
}

function settleResources(
  state: GameState,
  playerId: PlayerId,
  outcome: BlackjackLikeOutcome,
): GameState {
  const currentResourceState = state.resources[playerId] ?? {
    playerId,
    values: {},
  };
  const chips = currentResourceState.values[BLACKJACK_LIKE_RESOURCES.chips] ?? 0;
  const currentBet = currentResourceState.values[BLACKJACK_LIKE_RESOURCES.currentBet] ?? 0;
  const chipDelta =
    outcome === "playerWin" ? currentBet : outcome === "dealerWin" ? -currentBet : 0;

  return {
    ...state,
    resources: {
      ...state.resources,
      [playerId]: {
        ...currentResourceState,
        values: {
          ...currentResourceState.values,
          [BLACKJACK_LIKE_RESOURCES.chips]: chips + chipDelta,
          [BLACKJACK_LIKE_RESOURCES.currentBet]: 0,
        },
      },
    },
  };
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

function handValuePayload(value: BlackjackLikeHandValue): JsonObject {
  return {
    cardObjectIds: [...value.cardObjectIds],
    rawTotal: value.rawTotal,
    bestTotal: value.bestTotal,
    aceCount: value.aceCount,
    isSoft: value.isSoft,
    isBust: value.isBust,
  };
}

function readCardValue(object: GameObject): number {
  const value = object.attributes.value;
  return typeof value === "number" ? value : 0;
}

function readEffectString(effect: Effect, key: string): string {
  const value = effect.payload[key];
  if (typeof value !== "string") {
    throw new Error(`Expected blackjack effect payload key ${key} to be a string.`);
  }
  return value;
}

function readOptionalEffectString(effect: Effect, key: string): string | undefined {
  const value = effect.payload[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected blackjack effect payload key ${key} to be a string when present.`);
  }
  return value;
}
