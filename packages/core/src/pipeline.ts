import type {
  Command,
  Effect,
  GameState,
  JsonObject,
  PresentationIntent,
  RuleError,
  RuleEvent,
  RuleResult,
} from "./contracts.js";
import {
  ADD_COUNTER_EFFECT_TYPE,
  DEAL_DAMAGE_EFFECT_TYPE,
  DESTROY_EFFECT_TYPE,
  DISCARD_EFFECT_TYPE,
  DRAW_CARDS_EFFECT_TYPE,
  GAIN_RESOURCE_EFFECT_TYPE,
  MOVE_OBJECT_EFFECT_TYPE,
  REMOVE_COUNTER_EFFECT_TYPE,
  SPEND_RESOURCE_EFFECT_TYPE,
  addCounter,
  dealDamage,
  destroyObject,
  discard,
  drawCards,
  gainResource,
  moveObject,
  removeCounter,
  spendResource,
} from "./effects.js";

export interface CommandHandler {
  readonly validate?: (state: GameState, command: Command) => readonly RuleError[];
  readonly getEffects: (state: GameState, command: Command) => readonly Effect[];
}

export type CommandRegistry = Readonly<Record<string, CommandHandler>>;

export interface EffectContext {
  readonly commandId?: Command["id"];
}

export type EffectResolver = (
  state: GameState,
  effect: Effect,
  context: EffectContext,
) => RuleResult;

export type EffectRegistry = Readonly<Record<string, EffectResolver>>;

export interface ExecuteCommandInput {
  readonly state: GameState;
  readonly command: Command;
  readonly commandRegistry: CommandRegistry;
  readonly effectRegistry?: EffectRegistry;
}

export interface RunEffectsInput {
  readonly state: GameState;
  readonly effects: readonly Effect[];
  readonly commandId?: Command["id"];
  readonly effectRegistry?: EffectRegistry;
}

export function executeCommand(input: ExecuteCommandInput): RuleResult {
  const handler = input.commandRegistry[input.command.type];

  if (!handler) {
    return failure(input.state, {
      code: "COMMAND_NOT_FOUND",
      message: `No command handler registered for ${input.command.type}.`,
      details: {
        commandId: input.command.id,
        commandType: input.command.type,
      },
    });
  }

  const validationErrors = handler.validate?.(input.state, input.command) ?? [];
  if (validationErrors.length > 0) {
    return {
      ok: false,
      state: input.state,
      errors: validationErrors,
      events: [],
      presentationIntents: [],
    };
  }

  return runEffects({
    state: input.state,
    effects: handler.getEffects(input.state, input.command),
    commandId: input.command.id,
    ...(input.effectRegistry ? { effectRegistry: input.effectRegistry } : {}),
  });
}

export function runEffects(input: RunEffectsInput): RuleResult {
  const effectRegistry = input.effectRegistry ?? createCoreEffectRegistry();
  let currentState = input.state;
  const events: RuleEvent[] = [];
  const presentationIntents: PresentationIntent[] = [];

  for (const effect of input.effects) {
    const resolver = effectRegistry[effect.type];
    if (!resolver) {
      return {
        ok: false,
        state: currentState,
        errors: [
          {
            code: "EFFECT_NOT_FOUND",
            message: `No effect resolver registered for ${effect.type}.`,
            details: {
              effectId: effect.id,
              effectType: effect.type,
            },
          },
        ],
        events,
        presentationIntents,
      };
    }

    const result = resolver(currentState, effect, {
      ...(input.commandId ? { commandId: input.commandId } : {}),
    });

    events.push(...result.events);
    presentationIntents.push(...result.presentationIntents);

    if (!result.ok) {
      return {
        ok: false,
        state: result.state,
        errors: result.errors,
        events,
        presentationIntents,
      };
    }

    currentState = result.state;
  }

  return {
    ok: true,
    state: currentState,
    events,
    presentationIntents,
  };
}

export function createCoreEffectRegistry(): EffectRegistry {
  return {
    [MOVE_OBJECT_EFFECT_TYPE]: (state, effect, context) =>
      withPayload(state, effect, ["objectId", "toZoneId"], (payload) => {
        const position = readOptionalNumber(payload, "position");

        return moveObject(state, {
          objectId: readString(payload, "objectId"),
          toZoneId: readString(payload, "toZoneId"),
          eventId: eventIdFor(context, effect),
          ...(position !== undefined ? { position } : {}),
          ...causeFor(context, effect),
        });
      }),
    [DRAW_CARDS_EFFECT_TYPE]: (state, effect, context) =>
      withPayload(state, effect, ["fromZoneId", "toZoneId", "count"], (payload) =>
        drawCards(state, {
          fromZoneId: readString(payload, "fromZoneId"),
          toZoneId: readString(payload, "toZoneId"),
          count: readNumber(payload, "count"),
          eventId: eventIdFor(context, effect),
          ...causeFor(context, effect),
        }),
      ),
    [DISCARD_EFFECT_TYPE]: (state, effect, context) =>
      withPayload(state, effect, ["objectId", "toZoneId"], (payload) =>
        discard(state, {
          objectId: readString(payload, "objectId"),
          toZoneId: readString(payload, "toZoneId"),
          eventId: eventIdFor(context, effect),
          ...causeFor(context, effect),
        }),
      ),
    [GAIN_RESOURCE_EFFECT_TYPE]: (state, effect, context) =>
      withPayload(state, effect, ["playerId", "resourceId", "amount"], (payload) =>
        gainResource(state, {
          playerId: readString(payload, "playerId"),
          resourceId: readString(payload, "resourceId"),
          amount: readNumber(payload, "amount"),
          eventId: eventIdFor(context, effect),
          ...causeFor(context, effect),
        }),
      ),
    [SPEND_RESOURCE_EFFECT_TYPE]: (state, effect, context) =>
      withPayload(state, effect, ["playerId", "resourceId", "amount"], (payload) =>
        spendResource(state, {
          playerId: readString(payload, "playerId"),
          resourceId: readString(payload, "resourceId"),
          amount: readNumber(payload, "amount"),
          eventId: eventIdFor(context, effect),
          ...causeFor(context, effect),
        }),
      ),
    [ADD_COUNTER_EFFECT_TYPE]: (state, effect, context) =>
      withPayload(state, effect, ["objectId", "counterId", "amount"], (payload) =>
        addCounter(state, {
          objectId: readString(payload, "objectId"),
          counterId: readString(payload, "counterId"),
          amount: readNumber(payload, "amount"),
          eventId: eventIdFor(context, effect),
          ...causeFor(context, effect),
        }),
      ),
    [REMOVE_COUNTER_EFFECT_TYPE]: (state, effect, context) =>
      withPayload(state, effect, ["objectId", "counterId", "amount"], (payload) =>
        removeCounter(state, {
          objectId: readString(payload, "objectId"),
          counterId: readString(payload, "counterId"),
          amount: readNumber(payload, "amount"),
          eventId: eventIdFor(context, effect),
          ...causeFor(context, effect),
        }),
      ),
    [DEAL_DAMAGE_EFFECT_TYPE]: (state, effect, context) =>
      withPayload(state, effect, ["targetObjectId", "amount"], (payload) => {
        const hitPointsAttribute = readOptionalString(payload, "hitPointsAttribute");
        const blockAttribute = readOptionalString(payload, "blockAttribute");

        return dealDamage(state, {
          targetObjectId: readString(payload, "targetObjectId"),
          amount: readNumber(payload, "amount"),
          eventId: eventIdFor(context, effect),
          ...(hitPointsAttribute ? { hitPointsAttribute } : {}),
          ...(blockAttribute ? { blockAttribute } : {}),
          ...causeFor(context, effect),
        });
      }),
    [DESTROY_EFFECT_TYPE]: (state, effect, context) =>
      withPayload(state, effect, ["objectId"], (payload) =>
        destroyObject(state, {
          objectId: readString(payload, "objectId"),
          eventId: eventIdFor(context, effect),
          ...causeFor(context, effect),
        }),
      ),
  };
}

function withPayload(
  state: GameState,
  effect: Effect,
  requiredKeys: readonly string[],
  run: (payload: JsonObject) => RuleResult,
): RuleResult {
  const missingKeys = requiredKeys.filter((key) => effect.payload[key] === undefined);
  if (missingKeys.length > 0) {
    return failurePayload(
      state,
      effect,
      `Missing required effect payload keys: ${missingKeys.join(", ")}.`,
    );
  }

  try {
    return run(effect.payload);
  } catch (error) {
    return failurePayload(
      state,
      effect,
      error instanceof Error ? error.message : "Invalid effect payload.",
    );
  }
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

function failurePayload(state: GameState, effect: Effect, message: string): RuleResult {
  return failure(state, {
    code: "INVALID_EFFECT_PAYLOAD",
    message,
    details: {
      effectId: effect.id,
      effectType: effect.type,
    },
  });
}

function eventIdFor(context: EffectContext, effect: Effect): string {
  return context.commandId ? `${context.commandId}:${effect.id}` : effect.id;
}

function causeFor(context: EffectContext, effect: Effect) {
  return {
    ...(context.commandId ? { causedByCommandId: context.commandId } : {}),
    causedByEffectId: effect.id,
  };
}

function readString(payload: JsonObject, key: string): string {
  const value = payload[key];

  if (typeof value !== "string") {
    throw new Error(`Expected effect payload key ${key} to be a string.`);
  }

  return value;
}

function readOptionalString(payload: JsonObject, key: string): string | undefined {
  const value = payload[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`Expected effect payload key ${key} to be a string when present.`);
  }

  return value;
}

function readNumber(payload: JsonObject, key: string): number {
  const value = payload[key];

  if (typeof value !== "number") {
    throw new Error(`Expected effect payload key ${key} to be a number.`);
  }

  return value;
}

function readOptionalNumber(payload: JsonObject, key: string): number | undefined {
  const value = payload[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number") {
    throw new Error(`Expected effect payload key ${key} to be a number when present.`);
  }

  return value;
}
