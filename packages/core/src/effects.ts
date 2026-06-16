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

export interface MoveObjectInput {
  readonly objectId: GameObjectId;
  readonly toZoneId: ZoneId;
  readonly eventId: RuleEventId;
  readonly intentId?: PresentationIntentId;
  readonly position?: number;
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

function failure(state: GameState, error: RuleError): RuleResult {
  return {
    ok: false,
    state,
    errors: [error],
    events: [],
    presentationIntents: [],
  };
}
