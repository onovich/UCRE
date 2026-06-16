import type {
  CommandId,
  EffectId,
  GameObjectId,
  GameState,
  PresentationIntent,
  PresentationIntentId,
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

function failure(state: GameState, error: RuleError): RuleResult {
  return {
    ok: false,
    state,
    errors: [error],
    events: [],
    presentationIntents: [],
  };
}
