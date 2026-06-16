import type {
  GameState,
  JsonObject,
  ObjectiveState,
  ObjectiveStatus,
  PresentationIntent,
  PresentationIntentId,
  RuleEvent,
  RuleEventId,
  RuleResult,
  Trigger,
} from "./contracts.js";

export const TRIGGER_QUEUED_EVENT_TYPE = "TriggerQueued";
export const TRIGGER_QUEUED_INTENT_TYPE = "TriggerQueued";
export const OBJECTIVE_SUCCEEDED_EVENT_TYPE = "ObjectiveSucceeded";
export const OBJECTIVE_FAILED_EVENT_TYPE = "ObjectiveFailed";
export const OBJECTIVE_CHANGED_INTENT_TYPE = "ObjectiveChanged";

export interface QueueTriggerInput {
  readonly trigger: Trigger;
  readonly eventId: RuleEventId;
  readonly intentId?: PresentationIntentId;
}

export interface PopTriggerResult {
  readonly state: GameState;
  readonly trigger?: Trigger;
}

export interface ObjectiveDefinition {
  readonly id: string;
  readonly type: string;
  readonly payload?: JsonObject;
  readonly isSatisfied: (state: GameState) => boolean;
  readonly isFailed?: (state: GameState) => boolean;
}

export interface CheckObjectivesInput {
  readonly definitions: readonly ObjectiveDefinition[];
  readonly eventIdPrefix: string;
}

export function queueTrigger(state: GameState, input: QueueTriggerInput): RuleResult {
  const nextState: GameState = {
    ...state,
    triggerQueue: [...state.triggerQueue, input.trigger],
  };
  const event: RuleEvent = {
    id: input.eventId,
    type: TRIGGER_QUEUED_EVENT_TYPE,
    payload: {
      triggerId: input.trigger.id,
      triggerType: input.trigger.type,
      queueLength: nextState.triggerQueue.length,
      sourceEventId: input.trigger.sourceEventId ?? null,
    },
  };
  const presentationIntent: PresentationIntent = {
    id: input.intentId ?? `${input.eventId}:presentation`,
    type: TRIGGER_QUEUED_INTENT_TYPE,
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

export function popNextTrigger(state: GameState): PopTriggerResult {
  const [trigger, ...remainingTriggers] = state.triggerQueue;

  return {
    state: {
      ...state,
      triggerQueue: remainingTriggers,
    },
    ...(trigger ? { trigger } : {}),
  };
}

export function checkObjectives(state: GameState, input: CheckObjectivesInput): RuleResult {
  const existingById = new Map(state.objectives.map((objective) => [objective.id, objective]));
  const nextObjectiveStates: ObjectiveState[] = [];
  const events: RuleEvent[] = [];
  const presentationIntents: PresentationIntent[] = [];

  for (const definition of input.definitions) {
    const existing = existingById.get(definition.id);
    const previousStatus = existing?.status ?? "pending";
    const nextStatus = nextObjectiveStatus(state, definition, previousStatus);
    const objectiveState: ObjectiveState = {
      id: definition.id,
      type: definition.type,
      status: nextStatus,
      payload: definition.payload ?? existing?.payload ?? {},
    };

    nextObjectiveStates.push(objectiveState);

    if (previousStatus !== nextStatus && nextStatus !== "pending") {
      const eventType =
        nextStatus === "succeeded" ? OBJECTIVE_SUCCEEDED_EVENT_TYPE : OBJECTIVE_FAILED_EVENT_TYPE;
      const event: RuleEvent = {
        id: `${input.eventIdPrefix}:${definition.id}:${nextStatus}`,
        type: eventType,
        payload: {
          objectiveId: definition.id,
          objectiveType: definition.type,
          previousStatus,
          nextStatus,
        },
      };

      events.push(event);
      presentationIntents.push({
        id: `${event.id}:presentation`,
        type: OBJECTIVE_CHANGED_INTENT_TYPE,
        eventId: event.id,
        payload: event.payload,
      });
    }
  }

  return {
    ok: true,
    state: {
      ...state,
      objectives: nextObjectiveStates,
    },
    events,
    presentationIntents,
  };
}

function nextObjectiveStatus(
  state: GameState,
  definition: ObjectiveDefinition,
  previousStatus: ObjectiveStatus,
): ObjectiveStatus {
  if (previousStatus !== "pending") {
    return previousStatus;
  }

  if (definition.isFailed?.(state)) {
    return "failed";
  }

  if (definition.isSatisfied(state)) {
    return "succeeded";
  }

  return "pending";
}
