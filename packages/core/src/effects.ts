import type {
  CommandId,
  EffectId,
  GameObject,
  GameObjectId,
  GameState,
  PresentationIntent,
  PresentationIntentId,
  PlayerId,
  ResourceId,
  RuleError,
  RuleEvent,
  RuleEventId,
  RuleResult,
  ZoneId,
} from "./contracts.js";
import { insertObjectId, removeObjectId } from "./state.js";

export const MOVE_OBJECT_EFFECT_TYPE = "MoveObject";
export const OBJECT_MOVED_EVENT_TYPE = "ObjectMoved";
export const MOVE_OBJECT_INTENT_TYPE = "MoveObject";
export const DRAW_CARDS_EFFECT_TYPE = "DrawCards";
export const CARDS_DRAWN_EVENT_TYPE = "CardsDrawn";
export const DRAW_CARDS_INTENT_TYPE = "DrawCards";
export const DISCARD_EFFECT_TYPE = "Discard";
export const CARD_DISCARDED_EVENT_TYPE = "CardDiscarded";
export const DISCARD_INTENT_TYPE = "Discard";
export const GAIN_RESOURCE_EFFECT_TYPE = "GainResource";
export const SPEND_RESOURCE_EFFECT_TYPE = "SpendResource";
export const RESOURCE_CHANGED_EVENT_TYPE = "ResourceChanged";
export const RESOURCE_CHANGED_INTENT_TYPE = "ResourceChanged";
export const ADD_COUNTER_EFFECT_TYPE = "AddCounter";
export const REMOVE_COUNTER_EFFECT_TYPE = "RemoveCounter";
export const COUNTER_CHANGED_EVENT_TYPE = "CounterChanged";
export const COUNTER_CHANGED_INTENT_TYPE = "CounterChanged";
export const DEAL_DAMAGE_EFFECT_TYPE = "DealDamage";
export const DAMAGE_DEALT_EVENT_TYPE = "DamageDealt";
export const DAMAGE_DEALT_INTENT_TYPE = "DamageDealt";
export const DESTROY_EFFECT_TYPE = "Destroy";
export const OBJECT_DESTROYED_EVENT_TYPE = "ObjectDestroyed";
export const OBJECT_DESTROYED_INTENT_TYPE = "ObjectDestroyed";

export interface MoveObjectInput {
  readonly objectId: GameObjectId;
  readonly toZoneId: ZoneId;
  readonly eventId: RuleEventId;
  readonly intentId?: PresentationIntentId;
  readonly position?: number;
  readonly causedByCommandId?: CommandId;
  readonly causedByEffectId?: EffectId;
}

export interface DrawCardsInput {
  readonly fromZoneId: ZoneId;
  readonly toZoneId: ZoneId;
  readonly count: number;
  readonly eventId: RuleEventId;
  readonly intentId?: PresentationIntentId;
  readonly causedByCommandId?: CommandId;
  readonly causedByEffectId?: EffectId;
}

export interface DiscardInput {
  readonly objectId: GameObjectId;
  readonly toZoneId: ZoneId;
  readonly eventId: RuleEventId;
  readonly intentId?: PresentationIntentId;
  readonly causedByCommandId?: CommandId;
  readonly causedByEffectId?: EffectId;
}

export interface ResourceChangeInput {
  readonly playerId: PlayerId;
  readonly resourceId: ResourceId;
  readonly amount: number;
  readonly eventId: RuleEventId;
  readonly intentId?: PresentationIntentId;
  readonly causedByCommandId?: CommandId;
  readonly causedByEffectId?: EffectId;
}

export interface CounterChangeInput {
  readonly objectId: GameObjectId;
  readonly counterId: string;
  readonly amount: number;
  readonly eventId: RuleEventId;
  readonly intentId?: PresentationIntentId;
  readonly causedByCommandId?: CommandId;
  readonly causedByEffectId?: EffectId;
}

export interface DealDamageInput {
  readonly targetObjectId: GameObjectId;
  readonly amount: number;
  readonly eventId: RuleEventId;
  readonly intentId?: PresentationIntentId;
  readonly hitPointsAttribute?: string;
  readonly blockAttribute?: string;
  readonly causedByCommandId?: CommandId;
  readonly causedByEffectId?: EffectId;
}

export interface DestroyInput {
  readonly objectId: GameObjectId;
  readonly eventId: RuleEventId;
  readonly intentId?: PresentationIntentId;
  readonly causedByCommandId?: CommandId;
  readonly causedByEffectId?: EffectId;
}

export function moveObject(state: GameState, input: MoveObjectInput): RuleResult {
  if (input.position !== undefined && (!Number.isInteger(input.position) || input.position < 0)) {
    return failure(state, {
      code: "INVALID_MOVE_POSITION",
      message: `MoveObject position must be a non-negative integer for object ${input.objectId}.`,
      details: {
        objectId: input.objectId,
        toZoneId: input.toZoneId,
        position: input.position,
      },
    });
  }

  const object = state.objects[input.objectId];
  if (!object) {
    return failure(state, {
      code: "OBJECT_NOT_FOUND",
      message: `MoveObject could not find object ${input.objectId}.`,
      details: {
        objectId: input.objectId,
      },
    });
  }

  const fromZone = state.zones[object.zoneId];
  if (!fromZone) {
    return failure(state, {
      code: "SOURCE_ZONE_NOT_FOUND",
      message: `MoveObject could not find source zone ${object.zoneId}.`,
      details: {
        objectId: input.objectId,
        fromZoneId: object.zoneId,
      },
    });
  }

  const toZone = state.zones[input.toZoneId];
  if (!toZone) {
    return failure(state, {
      code: "TARGET_ZONE_NOT_FOUND",
      message: `MoveObject could not find target zone ${input.toZoneId}.`,
      details: {
        objectId: input.objectId,
        toZoneId: input.toZoneId,
      },
    });
  }

  const fromIndex = fromZone.objectIds.indexOf(input.objectId);
  const sourceIdsWithoutObject = removeObjectId(fromZone.objectIds, input.objectId);
  const targetStartingIds =
    fromZone.id === toZone.id
      ? sourceIdsWithoutObject
      : removeObjectId(toZone.objectIds, input.objectId);
  const targetIds = insertObjectId(targetStartingIds, input.objectId, input.position);

  const nextZones =
    fromZone.id === toZone.id
      ? {
          ...state.zones,
          [toZone.id]: {
            ...toZone,
            objectIds: targetIds,
          },
        }
      : {
          ...state.zones,
          [fromZone.id]: {
            ...fromZone,
            objectIds: sourceIdsWithoutObject,
          },
          [toZone.id]: {
            ...toZone,
            objectIds: targetIds,
          },
        };

  const nextState: GameState = {
    ...state,
    objects: {
      ...state.objects,
      [object.id]: {
        ...object,
        zoneId: toZone.id,
      },
    },
    zones: nextZones,
  };

  const toIndex = targetIds.indexOf(input.objectId);
  const event: RuleEvent = {
    id: input.eventId,
    type: OBJECT_MOVED_EVENT_TYPE,
    payload: {
      objectId: input.objectId,
      fromZoneId: fromZone.id,
      toZoneId: toZone.id,
      fromIndex,
      toIndex,
    },
    ...(input.causedByCommandId ? { causedByCommandId: input.causedByCommandId } : {}),
    ...(input.causedByEffectId ? { causedByEffectId: input.causedByEffectId } : {}),
  };
  const presentationIntent: PresentationIntent = {
    id: input.intentId ?? `${input.eventId}:presentation`,
    type: MOVE_OBJECT_INTENT_TYPE,
    eventId: event.id,
    payload: event.payload,
  };

  return {
    ok: true,
    state: nextState,
    events: [event],
    presentationIntents: [presentationIntent],
  };
}

export function drawCards(state: GameState, input: DrawCardsInput): RuleResult {
  if (!Number.isInteger(input.count) || input.count < 0) {
    return failure(state, {
      code: "INVALID_DRAW_COUNT",
      message: `DrawCards count must be a non-negative integer, received ${input.count}.`,
      details: {
        fromZoneId: input.fromZoneId,
        toZoneId: input.toZoneId,
        count: input.count,
      },
    });
  }

  const fromZone = state.zones[input.fromZoneId];
  if (!fromZone) {
    return failure(state, {
      code: "SOURCE_ZONE_NOT_FOUND",
      message: `DrawCards could not find source zone ${input.fromZoneId}.`,
      details: {
        fromZoneId: input.fromZoneId,
      },
    });
  }

  const toZone = state.zones[input.toZoneId];
  if (!toZone) {
    return failure(state, {
      code: "TARGET_ZONE_NOT_FOUND",
      message: `DrawCards could not find target zone ${input.toZoneId}.`,
      details: {
        toZoneId: input.toZoneId,
      },
    });
  }

  let currentState = state;
  const events: RuleEvent[] = [];
  const presentationIntents: PresentationIntent[] = [];
  const drawnObjectIds = fromZone.objectIds.slice(0, input.count);

  for (const [index, objectId] of drawnObjectIds.entries()) {
    const moveResult = moveObject(currentState, {
      objectId,
      toZoneId: input.toZoneId,
      eventId: `${input.eventId}:move:${index}`,
      ...(input.causedByCommandId ? { causedByCommandId: input.causedByCommandId } : {}),
      ...(input.causedByEffectId ? { causedByEffectId: input.causedByEffectId } : {}),
    });

    if (!moveResult.ok) {
      return moveResult;
    }

    currentState = moveResult.state;
    events.push(...moveResult.events);
    presentationIntents.push(...moveResult.presentationIntents);
  }

  const event: RuleEvent = {
    id: input.eventId,
    type: CARDS_DRAWN_EVENT_TYPE,
    payload: {
      fromZoneId: input.fromZoneId,
      toZoneId: input.toZoneId,
      requestedCount: input.count,
      drawnCount: drawnObjectIds.length,
      drawnObjectIds,
    },
    ...(input.causedByCommandId ? { causedByCommandId: input.causedByCommandId } : {}),
    ...(input.causedByEffectId ? { causedByEffectId: input.causedByEffectId } : {}),
  };
  const presentationIntent: PresentationIntent = {
    id: input.intentId ?? `${input.eventId}:presentation`,
    type: DRAW_CARDS_INTENT_TYPE,
    eventId: event.id,
    payload: event.payload,
  };

  return {
    ok: true,
    state: currentState,
    events: [...events, event],
    presentationIntents: [...presentationIntents, presentationIntent],
  };
}

export function discard(state: GameState, input: DiscardInput): RuleResult {
  const moveResult = moveObject(state, {
    objectId: input.objectId,
    toZoneId: input.toZoneId,
    eventId: `${input.eventId}:move`,
    ...(input.causedByCommandId ? { causedByCommandId: input.causedByCommandId } : {}),
    ...(input.causedByEffectId ? { causedByEffectId: input.causedByEffectId } : {}),
  });

  if (!moveResult.ok) {
    return moveResult;
  }

  const object = state.objects[input.objectId];
  const event: RuleEvent = {
    id: input.eventId,
    type: CARD_DISCARDED_EVENT_TYPE,
    payload: {
      objectId: input.objectId,
      fromZoneId: object?.zoneId ?? null,
      toZoneId: input.toZoneId,
    },
    ...(input.causedByCommandId ? { causedByCommandId: input.causedByCommandId } : {}),
    ...(input.causedByEffectId ? { causedByEffectId: input.causedByEffectId } : {}),
  };
  const presentationIntent: PresentationIntent = {
    id: input.intentId ?? `${input.eventId}:presentation`,
    type: DISCARD_INTENT_TYPE,
    eventId: event.id,
    payload: event.payload,
  };

  return {
    ok: true,
    state: moveResult.state,
    events: [...moveResult.events, event],
    presentationIntents: [...moveResult.presentationIntents, presentationIntent],
  };
}

export function gainResource(state: GameState, input: ResourceChangeInput): RuleResult {
  return changeResource(state, input, input.amount, GAIN_RESOURCE_EFFECT_TYPE);
}

export function spendResource(state: GameState, input: ResourceChangeInput): RuleResult {
  const validation = validatePositiveInteger(input.amount, "SpendResource amount");
  if (validation) {
    return failure(state, {
      code: "INVALID_RESOURCE_AMOUNT",
      message: validation,
      details: {
        playerId: input.playerId,
        resourceId: input.resourceId,
        amount: input.amount,
      },
    });
  }

  const currentResourceState = state.resources[input.playerId];
  const previousValue = currentResourceState?.values[input.resourceId] ?? 0;
  if (previousValue < input.amount) {
    return failure(state, {
      code: "INSUFFICIENT_RESOURCE",
      message: `Cannot spend ${input.amount} ${input.resourceId}; only ${previousValue} available.`,
      details: {
        playerId: input.playerId,
        resourceId: input.resourceId,
        amount: input.amount,
        available: previousValue,
      },
    });
  }

  return changeResource(state, input, -input.amount, SPEND_RESOURCE_EFFECT_TYPE);
}

export function addCounter(state: GameState, input: CounterChangeInput): RuleResult {
  return changeCounter(state, input, input.amount, ADD_COUNTER_EFFECT_TYPE);
}

export function removeCounter(state: GameState, input: CounterChangeInput): RuleResult {
  const validation = validatePositiveInteger(input.amount, "RemoveCounter amount");
  if (validation) {
    return failure(state, {
      code: "INVALID_COUNTER_AMOUNT",
      message: validation,
      details: {
        objectId: input.objectId,
        counterId: input.counterId,
        amount: input.amount,
      },
    });
  }

  const object = state.objects[input.objectId];
  const previousValue = object?.counters[input.counterId] ?? 0;
  if (previousValue < input.amount) {
    return failure(state, {
      code: "INSUFFICIENT_COUNTER",
      message: `Cannot remove ${input.amount} ${input.counterId}; only ${previousValue} available.`,
      details: {
        objectId: input.objectId,
        counterId: input.counterId,
        amount: input.amount,
        available: previousValue,
      },
    });
  }

  return changeCounter(state, input, -input.amount, REMOVE_COUNTER_EFFECT_TYPE);
}

export function dealDamage(state: GameState, input: DealDamageInput): RuleResult {
  const validation = validatePositiveInteger(input.amount, "DealDamage amount");
  if (validation) {
    return failure(state, {
      code: "INVALID_DAMAGE_AMOUNT",
      message: validation,
      details: {
        targetObjectId: input.targetObjectId,
        amount: input.amount,
      },
    });
  }

  const target = state.objects[input.targetObjectId];
  if (!target) {
    return failure(state, {
      code: "OBJECT_NOT_FOUND",
      message: `DealDamage could not find target object ${input.targetObjectId}.`,
      details: {
        objectId: input.targetObjectId,
      },
    });
  }

  const hitPointsAttribute = input.hitPointsAttribute ?? "hp";
  const blockAttribute = input.blockAttribute ?? "block";
  const hitPoints = readNumberAttribute(target, hitPointsAttribute);
  if (hitPoints === undefined) {
    return failure(state, {
      code: "HIT_POINTS_NOT_FOUND",
      message: `DealDamage target ${input.targetObjectId} does not have numeric ${hitPointsAttribute}.`,
      details: {
        objectId: input.targetObjectId,
        hitPointsAttribute,
      },
    });
  }

  const block = readNumberAttribute(target, blockAttribute) ?? 0;
  const blockedAmount = Math.min(block, input.amount);
  const hitPointLoss = input.amount - blockedAmount;
  const nextBlock = block - blockedAmount;
  const nextHitPoints = Math.max(0, hitPoints - hitPointLoss);
  const nextTarget: GameObject = {
    ...target,
    attributes: {
      ...target.attributes,
      [blockAttribute]: nextBlock,
      [hitPointsAttribute]: nextHitPoints,
    },
  };
  const nextState: GameState = {
    ...state,
    objects: {
      ...state.objects,
      [target.id]: nextTarget,
    },
  };
  const event: RuleEvent = {
    id: input.eventId,
    type: DAMAGE_DEALT_EVENT_TYPE,
    payload: {
      objectId: target.id,
      amount: input.amount,
      blockedAmount,
      hitPointLoss,
      previousHitPoints: hitPoints,
      nextHitPoints,
      previousBlock: block,
      nextBlock,
    },
    ...(input.causedByCommandId ? { causedByCommandId: input.causedByCommandId } : {}),
    ...(input.causedByEffectId ? { causedByEffectId: input.causedByEffectId } : {}),
  };

  return singleEventSuccess(
    nextState,
    event,
    DAMAGE_DEALT_INTENT_TYPE,
    input.intentId ?? `${input.eventId}:presentation`,
  );
}

export function destroyObject(state: GameState, input: DestroyInput): RuleResult {
  const object = state.objects[input.objectId];
  if (!object) {
    return failure(state, {
      code: "OBJECT_NOT_FOUND",
      message: `Destroy could not find object ${input.objectId}.`,
      details: {
        objectId: input.objectId,
      },
    });
  }

  const zone = state.zones[object.zoneId];
  if (!zone) {
    return failure(state, {
      code: "SOURCE_ZONE_NOT_FOUND",
      message: `Destroy could not find source zone ${object.zoneId}.`,
      details: {
        objectId: input.objectId,
        fromZoneId: object.zoneId,
      },
    });
  }

  const remainingObjects = Object.fromEntries(
    Object.entries(state.objects).filter(([objectId]) => objectId !== input.objectId),
  ) as Readonly<Record<GameObjectId, GameObject>>;
  const nextState: GameState = {
    ...state,
    objects: remainingObjects,
    zones: {
      ...state.zones,
      [zone.id]: {
        ...zone,
        objectIds: removeObjectId(zone.objectIds, input.objectId),
      },
    },
  };
  const event: RuleEvent = {
    id: input.eventId,
    type: OBJECT_DESTROYED_EVENT_TYPE,
    payload: {
      objectId: input.objectId,
      fromZoneId: zone.id,
    },
    ...(input.causedByCommandId ? { causedByCommandId: input.causedByCommandId } : {}),
    ...(input.causedByEffectId ? { causedByEffectId: input.causedByEffectId } : {}),
  };

  return singleEventSuccess(
    nextState,
    event,
    OBJECT_DESTROYED_INTENT_TYPE,
    input.intentId ?? `${input.eventId}:presentation`,
  );
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

function changeResource(
  state: GameState,
  input: ResourceChangeInput,
  delta: number,
  effectType: typeof GAIN_RESOURCE_EFFECT_TYPE | typeof SPEND_RESOURCE_EFFECT_TYPE,
): RuleResult {
  const validation = validatePositiveInteger(input.amount, `${effectType} amount`);
  if (validation) {
    return failure(state, {
      code: "INVALID_RESOURCE_AMOUNT",
      message: validation,
      details: {
        playerId: input.playerId,
        resourceId: input.resourceId,
        amount: input.amount,
      },
    });
  }

  const currentResourceState = state.resources[input.playerId] ?? {
    playerId: input.playerId,
    values: {},
  };
  const previousValue = currentResourceState.values[input.resourceId] ?? 0;
  const nextValue = previousValue + delta;
  const nextState: GameState = {
    ...state,
    resources: {
      ...state.resources,
      [input.playerId]: {
        ...currentResourceState,
        values: {
          ...currentResourceState.values,
          [input.resourceId]: nextValue,
        },
      },
    },
  };
  const event: RuleEvent = {
    id: input.eventId,
    type: RESOURCE_CHANGED_EVENT_TYPE,
    payload: {
      playerId: input.playerId,
      resourceId: input.resourceId,
      previousValue,
      nextValue,
      delta,
      effectType,
    },
    ...(input.causedByCommandId ? { causedByCommandId: input.causedByCommandId } : {}),
    ...(input.causedByEffectId ? { causedByEffectId: input.causedByEffectId } : {}),
  };

  return singleEventSuccess(
    nextState,
    event,
    RESOURCE_CHANGED_INTENT_TYPE,
    input.intentId ?? `${input.eventId}:presentation`,
  );
}

function changeCounter(
  state: GameState,
  input: CounterChangeInput,
  delta: number,
  effectType: typeof ADD_COUNTER_EFFECT_TYPE | typeof REMOVE_COUNTER_EFFECT_TYPE,
): RuleResult {
  const validation = validatePositiveInteger(input.amount, `${effectType} amount`);
  if (validation) {
    return failure(state, {
      code: "INVALID_COUNTER_AMOUNT",
      message: validation,
      details: {
        objectId: input.objectId,
        counterId: input.counterId,
        amount: input.amount,
      },
    });
  }

  const object = state.objects[input.objectId];
  if (!object) {
    return failure(state, {
      code: "OBJECT_NOT_FOUND",
      message: `${effectType} could not find object ${input.objectId}.`,
      details: {
        objectId: input.objectId,
      },
    });
  }

  const previousValue = object.counters[input.counterId] ?? 0;
  const nextValue = previousValue + delta;
  const nextObject: GameObject = {
    ...object,
    counters: {
      ...object.counters,
      [input.counterId]: nextValue,
    },
  };
  const nextState: GameState = {
    ...state,
    objects: {
      ...state.objects,
      [object.id]: nextObject,
    },
  };
  const event: RuleEvent = {
    id: input.eventId,
    type: COUNTER_CHANGED_EVENT_TYPE,
    payload: {
      objectId: input.objectId,
      counterId: input.counterId,
      previousValue,
      nextValue,
      delta,
      effectType,
    },
    ...(input.causedByCommandId ? { causedByCommandId: input.causedByCommandId } : {}),
    ...(input.causedByEffectId ? { causedByEffectId: input.causedByEffectId } : {}),
  };

  return singleEventSuccess(
    nextState,
    event,
    COUNTER_CHANGED_INTENT_TYPE,
    input.intentId ?? `${input.eventId}:presentation`,
  );
}

function singleEventSuccess(
  state: GameState,
  event: RuleEvent,
  intentType: string,
  intentId: PresentationIntentId,
): RuleResult {
  return {
    ok: true,
    state,
    events: [event],
    presentationIntents: [
      {
        id: intentId,
        type: intentType,
        eventId: event.id,
        payload: event.payload,
      },
    ],
  };
}

function validatePositiveInteger(value: number, label: string): string | undefined {
  if (!Number.isInteger(value) || value <= 0) {
    return `${label} must be a positive integer, received ${value}.`;
  }

  return undefined;
}

function readNumberAttribute(object: GameObject, attribute: string): number | undefined {
  const value = object.attributes[attribute];

  return typeof value === "number" ? value : undefined;
}
