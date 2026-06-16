export type GameId = string;
export type GameObjectId = string;
export type ZoneId = string;
export type PlayerId = string;
export type ResourceId = string;
export type CommandId = string;
export type EffectId = string;
export type RuleEventId = string;
export type PresentationIntentId = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type ZoneKind =
  | "deck"
  | "hand"
  | "discard"
  | "exhaust"
  | "play"
  | "enemy"
  | "board"
  | "reward"
  | "custom";

export type ObjectVisibility = "public" | "owner" | "hidden";
export type ObjectFacing = "up" | "down";

export interface GameObject {
  readonly id: GameObjectId;
  readonly definitionId: string;
  readonly ownerId: PlayerId;
  readonly zoneId: ZoneId;
  readonly visibility: ObjectVisibility;
  readonly facing: ObjectFacing;
  readonly tags: readonly string[];
  readonly counters: Readonly<Record<string, number>>;
  readonly attributes: JsonObject;
}

export interface Zone {
  readonly id: ZoneId;
  readonly kind: ZoneKind;
  readonly ownerId?: PlayerId;
  readonly objectIds: readonly GameObjectId[];
  readonly metadata: JsonObject;
}

export interface ResourceState {
  readonly playerId: PlayerId;
  readonly values: Readonly<Record<ResourceId, number>>;
}

export interface Command {
  readonly id: CommandId;
  readonly type: string;
  readonly playerId: PlayerId;
  readonly payload: JsonObject;
}

export interface Effect {
  readonly id: EffectId;
  readonly type: string;
  readonly sourceId?: GameObjectId;
  readonly payload: JsonObject;
}

export interface RuleEvent {
  readonly id: RuleEventId;
  readonly type: string;
  readonly payload: JsonObject;
  readonly causedByCommandId?: CommandId;
  readonly causedByEffectId?: EffectId;
}

export interface PresentationIntent {
  readonly id: PresentationIntentId;
  readonly type: string;
  readonly eventId: RuleEventId;
  readonly payload: JsonObject;
}

export interface Trigger {
  readonly id: string;
  readonly type: string;
  readonly payload: JsonObject;
  readonly sourceEventId?: RuleEventId;
}

export type ObjectiveStatus = "pending" | "succeeded" | "failed";

export interface ObjectiveState {
  readonly id: string;
  readonly type: string;
  readonly status: ObjectiveStatus;
  readonly payload: JsonObject;
}

export interface RuleError {
  readonly code: string;
  readonly message: string;
  readonly details?: JsonObject;
}

export interface GameState {
  readonly id: GameId;
  readonly seed: string;
  readonly rulesVersion: string;
  readonly contentManifestHash: string;
  readonly phase: string;
  readonly turn: number;
  readonly activePlayerId?: PlayerId;
  readonly objects: Readonly<Record<GameObjectId, GameObject>>;
  readonly zones: Readonly<Record<ZoneId, Zone>>;
  readonly resources: Readonly<Record<PlayerId, ResourceState>>;
  readonly triggerQueue: readonly Trigger[];
  readonly objectives: readonly ObjectiveState[];
  readonly flags: JsonObject;
}

export type RuleResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly RuleEvent[];
      readonly presentationIntents: readonly PresentationIntent[];
    }
  | {
      readonly ok: false;
      readonly state: GameState;
      readonly errors: readonly RuleError[];
      readonly events: readonly RuleEvent[];
      readonly presentationIntents: readonly PresentationIntent[];
    };

export interface CreateGameStateInput {
  readonly id: GameId;
  readonly seed: string;
  readonly rulesVersion: string;
  readonly contentManifestHash: string;
  readonly activePlayerId?: PlayerId;
}

export function createInitialGameState(input: CreateGameStateInput): GameState {
  return {
    id: input.id,
    seed: input.seed,
    rulesVersion: input.rulesVersion,
    contentManifestHash: input.contentManifestHash,
    phase: "setup",
    turn: 0,
    ...(input.activePlayerId ? { activePlayerId: input.activePlayerId } : {}),
    objects: {},
    zones: {},
    resources: {},
    triggerQueue: [],
    objectives: [],
    flags: {},
  };
}
