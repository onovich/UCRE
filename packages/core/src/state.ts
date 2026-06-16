import type { GameObject, GameObjectId, GameState, JsonObject, Zone, ZoneId } from "./contracts.js";

export interface CreateZoneInput {
  readonly id: ZoneId;
  readonly kind: Zone["kind"];
  readonly ownerId?: Zone["ownerId"];
  readonly objectIds?: readonly GameObjectId[];
  readonly metadata?: JsonObject;
}

export interface CreateGameObjectInput {
  readonly id: GameObjectId;
  readonly definitionId: string;
  readonly ownerId: GameObject["ownerId"];
  readonly zoneId: ZoneId;
  readonly visibility?: GameObject["visibility"];
  readonly facing?: GameObject["facing"];
  readonly tags?: readonly string[];
  readonly counters?: Readonly<Record<string, number>>;
  readonly attributes?: JsonObject;
}

export function createZone(input: CreateZoneInput): Zone {
  return {
    id: input.id,
    kind: input.kind,
    ...(input.ownerId ? { ownerId: input.ownerId } : {}),
    objectIds: input.objectIds ?? [],
    metadata: input.metadata ?? {},
  };
}

export function createGameObject(input: CreateGameObjectInput): GameObject {
  return {
    id: input.id,
    definitionId: input.definitionId,
    ownerId: input.ownerId,
    zoneId: input.zoneId,
    visibility: input.visibility ?? "public",
    facing: input.facing ?? "up",
    tags: input.tags ?? [],
    counters: input.counters ?? {},
    attributes: input.attributes ?? {},
  };
}

export function putZone(state: GameState, zone: Zone): GameState {
  return {
    ...state,
    zones: {
      ...state.zones,
      [zone.id]: zone,
    },
  };
}

export function putGameObject(state: GameState, object: GameObject): GameState {
  return {
    ...state,
    objects: {
      ...state.objects,
      [object.id]: object,
    },
  };
}

export function putGameObjectInZone(
  state: GameState,
  object: GameObject,
  zoneId = object.zoneId,
  position?: number,
): GameState {
  const zone = state.zones[zoneId];

  if (!zone) {
    throw new Error(`Cannot put object ${object.id} into missing zone ${zoneId}`);
  }

  const objectInZone = {
    ...object,
    zoneId,
  };

  return {
    ...state,
    objects: {
      ...state.objects,
      [object.id]: objectInZone,
    },
    zones: {
      ...state.zones,
      [zoneId]: {
        ...zone,
        objectIds: insertObjectId(zone.objectIds, object.id, position),
      },
    },
  };
}

export function removeObjectId(
  objectIds: readonly GameObjectId[],
  objectId: GameObjectId,
): readonly GameObjectId[] {
  return objectIds.filter((candidate) => candidate !== objectId);
}

export function insertObjectId(
  objectIds: readonly GameObjectId[],
  objectId: GameObjectId,
  position = objectIds.length,
): readonly GameObjectId[] {
  const withoutObject = removeObjectId(objectIds, objectId);
  const boundedPosition = Math.max(0, Math.min(position, withoutObject.length));

  return [
    ...withoutObject.slice(0, boundedPosition),
    objectId,
    ...withoutObject.slice(boundedPosition),
  ];
}
