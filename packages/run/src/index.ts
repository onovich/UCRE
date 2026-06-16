import { stableHash } from "@ucre/core";
import type { JsonObject, StableHash } from "@ucre/core";

export const UCRE_RUN_PACKAGE_ID = "@ucre/run";

export type RunId = string;
export type RunMapId = string;
export type RunNodeId = string;
export type RulesetId = string;

export type RunStatus = "active" | "complete" | "failed";
export type RunNodeKind = "start" | "encounter" | "event" | "shop" | "rest" | "boss" | "victory";
export type RunNodeResolutionKind = "start" | "encounter" | "event" | "shop" | "rest" | "victory";

export interface RunMapNode {
  readonly id: RunNodeId;
  readonly kind: RunNodeKind;
  readonly depth: number;
  readonly nextNodeIds: readonly RunNodeId[];
  readonly payload: JsonObject;
}

export interface RunMap {
  readonly id: RunMapId;
  readonly seed: string;
  readonly startNodeId: RunNodeId;
  readonly nodes: readonly RunMapNode[];
}

export interface RunState {
  readonly id: RunId;
  readonly seed: string;
  readonly rulesetId: RulesetId;
  readonly rulesVersion: string;
  readonly contentManifestHash: string;
  readonly status: RunStatus;
  readonly map: RunMap;
  readonly currentNodeId: RunNodeId;
  readonly completedNodeIds: readonly RunNodeId[];
  readonly availableNodeIds: readonly RunNodeId[];
  readonly payload: JsonObject;
}

export interface CreateLinearRunMapInput {
  readonly id: RunMapId;
  readonly seed: string;
  readonly nodeKinds: readonly RunNodeKind[];
  readonly nodePayloads?: readonly JsonObject[];
}

export interface CreateRunStateInput {
  readonly id: RunId;
  readonly seed: string;
  readonly rulesetId: RulesetId;
  readonly rulesVersion: string;
  readonly contentManifestHash: string;
  readonly map: RunMap;
  readonly payload?: JsonObject;
}

export interface CompleteRunNodeInput {
  readonly state: RunState;
  readonly nodeId: RunNodeId;
  readonly payload?: JsonObject;
}

export interface CreateEncounterNodePayloadInput {
  readonly encounterId: string;
  readonly rulesetId?: RulesetId;
  readonly contentManifestHash?: string;
  readonly seed?: string;
}

export interface EncounterNodePayload extends JsonObject {
  readonly encounterId: string;
  readonly rulesetId?: RulesetId;
  readonly contentManifestHash?: string;
  readonly seed?: string;
}

export interface RunNodeResolverInput {
  readonly state: RunState;
  readonly node: RunMapNode;
}

export type RunNodeResolver = (input: RunNodeResolverInput) => RunNodeResolution;
export type RunNodeResolverRegistry = Readonly<Record<RunNodeKind, RunNodeResolver>>;

export interface BaseRunNodeResolution {
  readonly kind: RunNodeResolutionKind;
  readonly nodeId: RunNodeId;
  readonly nodeKind: RunNodeKind;
  readonly payload: JsonObject;
}

export interface EncounterRunNodeResolution extends BaseRunNodeResolution {
  readonly kind: "encounter";
  readonly encounterId: string;
  readonly rulesetId: RulesetId;
  readonly contentManifestHash: string;
  readonly seed: string;
}

export interface PlaceholderRunNodeResolution extends BaseRunNodeResolution {
  readonly kind: Exclude<RunNodeResolutionKind, "encounter">;
}

export type RunNodeResolution = EncounterRunNodeResolution | PlaceholderRunNodeResolution;

export interface ResolveRunNodeInput {
  readonly state: RunState;
  readonly nodeId: RunNodeId;
  readonly resolvers?: RunNodeResolverRegistry;
}

export interface RunNodeResolveSuccess {
  readonly ok: true;
  readonly node: RunMapNode;
  readonly resolution: RunNodeResolution;
}

export interface RunNodeResolveFailure {
  readonly ok: false;
  readonly code: "RUN_NODE_NOT_FOUND" | "RUN_NODE_NOT_AVAILABLE";
  readonly message: string;
}

export type RunNodeResolveResult = RunNodeResolveSuccess | RunNodeResolveFailure;

export interface RunPackageIdentity {
  readonly packageId: typeof UCRE_RUN_PACKAGE_ID;
}

export const DEFAULT_RUN_NODE_RESOLVERS: RunNodeResolverRegistry = {
  start: createPlaceholderRunNodeResolution,
  encounter: createEncounterRunNodeResolution,
  event: createPlaceholderRunNodeResolution,
  shop: createPlaceholderRunNodeResolution,
  rest: createPlaceholderRunNodeResolution,
  boss: createEncounterRunNodeResolution,
  victory: createPlaceholderRunNodeResolution,
};

export function createRunPackageIdentity(): RunPackageIdentity {
  return {
    packageId: UCRE_RUN_PACKAGE_ID,
  };
}

export function createLinearRunMap(input: CreateLinearRunMapInput): RunMap {
  if (input.nodeKinds.length === 0) {
    throw new Error("Run map requires at least one node kind.");
  }

  const nodeIds = input.nodeKinds.map((_, index) => `${input.id}:node:${index}`);
  const nodes = input.nodeKinds.map((kind, index): RunMapNode => {
    const nextNodeId = nodeIds[index + 1];
    return {
      id: nodeIds[index] ?? `${input.id}:node:${index}`,
      kind,
      depth: index,
      nextNodeIds: nextNodeId ? [nextNodeId] : [],
      payload: input.nodePayloads?.[index] ?? {},
    };
  });

  const startNodeId = nodes[0]?.id;
  if (!startNodeId) {
    throw new Error("Run map requires a start node.");
  }

  return {
    id: input.id,
    seed: input.seed,
    startNodeId,
    nodes,
  };
}

export function createRunState(input: CreateRunStateInput): RunState {
  return {
    id: input.id,
    seed: input.seed,
    rulesetId: input.rulesetId,
    rulesVersion: input.rulesVersion,
    contentManifestHash: input.contentManifestHash,
    status: "active",
    map: input.map,
    currentNodeId: input.map.startNodeId,
    completedNodeIds: [],
    availableNodeIds: [input.map.startNodeId],
    payload: input.payload ?? {},
  };
}

export function completeRunNode(input: CompleteRunNodeInput): RunState {
  const { state, nodeId } = input;
  const node = findRunMapNode(state.map, nodeId);

  if (!node || !state.availableNodeIds.includes(nodeId)) {
    return state;
  }

  const completedNodeIds = uniqueStrings([...state.completedNodeIds, nodeId]);
  const nextNodeIds = node.nextNodeIds.filter(
    (nextNodeId) => !completedNodeIds.includes(nextNodeId),
  );
  const availableNodeIds = uniqueStrings([
    ...state.availableNodeIds.filter((availableNodeId) => availableNodeId !== nodeId),
    ...nextNodeIds,
  ]);
  const currentNodeId = availableNodeIds[0] ?? nodeId;

  return {
    ...state,
    status: availableNodeIds.length === 0 ? "complete" : "active",
    currentNodeId,
    completedNodeIds,
    availableNodeIds,
    ...(input.payload ? { payload: { ...state.payload, ...input.payload } } : {}),
  };
}

export function createEncounterNodePayload(
  input: CreateEncounterNodePayloadInput,
): EncounterNodePayload {
  return {
    encounterId: input.encounterId,
    ...(input.rulesetId !== undefined ? { rulesetId: input.rulesetId } : {}),
    ...(input.contentManifestHash !== undefined
      ? { contentManifestHash: input.contentManifestHash }
      : {}),
    ...(input.seed !== undefined ? { seed: input.seed } : {}),
  };
}

export function resolveRunNode(input: ResolveRunNodeInput): RunNodeResolveResult {
  const node = findRunMapNode(input.state.map, input.nodeId);

  if (!node) {
    return {
      ok: false,
      code: "RUN_NODE_NOT_FOUND",
      message: `Run node does not exist: ${input.nodeId}`,
    };
  }

  if (!input.state.availableNodeIds.includes(input.nodeId)) {
    return {
      ok: false,
      code: "RUN_NODE_NOT_AVAILABLE",
      message: `Run node is not available: ${input.nodeId}`,
    };
  }

  const resolvers = input.resolvers ?? DEFAULT_RUN_NODE_RESOLVERS;
  const resolver = resolvers[node.kind];
  return {
    ok: true,
    node,
    resolution: resolver({
      state: input.state,
      node,
    }),
  };
}

export function findRunMapNode(map: RunMap, nodeId: RunNodeId): RunMapNode | undefined {
  return map.nodes.find((node) => node.id === nodeId);
}

export function hashRunState(state: RunState): StableHash {
  return stableHash(state);
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function createEncounterRunNodeResolution(input: RunNodeResolverInput): EncounterRunNodeResolution {
  const { node, state } = input;
  return {
    kind: "encounter",
    nodeId: node.id,
    nodeKind: node.kind,
    encounterId: readString(node.payload, "encounterId") ?? node.id,
    rulesetId: readString(node.payload, "rulesetId") ?? state.rulesetId,
    contentManifestHash:
      readString(node.payload, "contentManifestHash") ?? state.contentManifestHash,
    seed: readString(node.payload, "seed") ?? `${state.seed}:${node.id}`,
    payload: node.payload,
  };
}

function createPlaceholderRunNodeResolution(
  input: RunNodeResolverInput,
): PlaceholderRunNodeResolution {
  const { node } = input;
  return {
    kind: toPlaceholderResolutionKind(node.kind),
    nodeId: node.id,
    nodeKind: node.kind,
    payload: node.payload,
  };
}

function toPlaceholderResolutionKind(nodeKind: RunNodeKind): PlaceholderRunNodeResolution["kind"] {
  if (
    nodeKind === "start" ||
    nodeKind === "event" ||
    nodeKind === "shop" ||
    nodeKind === "rest" ||
    nodeKind === "victory"
  ) {
    return nodeKind;
  }

  return "event";
}

function readString(payload: JsonObject, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" ? value : undefined;
}
