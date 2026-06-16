import { stableHash } from "@ucre/core";
import type { JsonObject, StableHash } from "@ucre/core";

export const UCRE_RUN_PACKAGE_ID = "@ucre/run";

export type RunId = string;
export type RunMapId = string;
export type RunNodeId = string;
export type RulesetId = string;

export type RunStatus = "active" | "complete" | "failed";
export type RunNodeKind = "start" | "encounter" | "event" | "shop" | "rest" | "boss" | "victory";

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

export interface RunPackageIdentity {
  readonly packageId: typeof UCRE_RUN_PACKAGE_ID;
}

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
      payload: {},
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

export function findRunMapNode(map: RunMap, nodeId: RunNodeId): RunMapNode | undefined {
  return map.nodes.find((node) => node.id === nodeId);
}

export function hashRunState(state: RunState): StableHash {
  return stableHash(state);
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
