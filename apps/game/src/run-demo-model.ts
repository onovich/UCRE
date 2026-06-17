import type { GameState, JsonObject } from "@ucre/core";
import {
  completeRunNode,
  createEncounterNodePayload,
  createLinearRunMap,
  createRunState,
  findRunMapNode,
  resolveRunNode,
  type RunMapNode,
  type RunNodeKind,
  type RunState,
} from "@ucre/run";
import { SLAY_LIKE_RULESET_ID, SLAY_LIKE_RULES_VERSION } from "@ucre/rulesets";

import { createDemoShellState } from "./demo-model.js";

export type RunNodeViewStatus = "current" | "available" | "complete" | "locked";

export interface RunNodeView {
  readonly id: string;
  readonly kind: RunNodeKind;
  readonly label: string;
  readonly status: RunNodeViewStatus;
}

const RUN_ID = "phase10-playable-run";
const RUN_SEED = "phase10-run-seed-1";
const CONTENT_MANIFEST_HASH = "slay-like-phase10-run-demo";

export function createDemoRunState(): RunState {
  const map = createLinearRunMap({
    id: "phase10-act",
    seed: RUN_SEED,
    nodeKinds: ["start", "encounter", "event", "shop", "rest", "boss", "victory"],
    nodePayloads: [
      {},
      createEncounterNodePayload({
        encounterId: "acid-slime-run",
        rulesetId: SLAY_LIKE_RULESET_ID,
        contentManifestHash: CONTENT_MANIFEST_HASH,
      }),
      {
        eventId: "shrine-lesson",
      },
      {
        shopId: "merchant-1",
      },
      {
        restId: "campfire-1",
      },
      createEncounterNodePayload({
        encounterId: "hexaghost-run",
        rulesetId: SLAY_LIKE_RULESET_ID,
        contentManifestHash: CONTENT_MANIFEST_HASH,
        seed: "phase10-boss-seed-1",
      }),
      {},
    ],
  });

  return createRunState({
    id: RUN_ID,
    seed: RUN_SEED,
    rulesetId: SLAY_LIKE_RULESET_ID,
    rulesVersion: SLAY_LIKE_RULES_VERSION,
    contentManifestHash: CONTENT_MANIFEST_HASH,
    map,
    deck: [
      {
        id: "run-strike-1",
        definitionId: "strike",
        payload: {},
      },
    ],
  });
}

export function createStartedDemoRunState(): RunState {
  return advanceDemoRunNode(createDemoRunState(), {
    completedBy: "game-run-start",
  });
}

export function advanceDemoRunNode(state: RunState, payload: JsonObject = {}): RunState {
  return completeRunNode({
    state,
    nodeId: state.currentNodeId,
    payload,
  });
}

export function getCurrentRunNode(state: RunState): RunMapNode | undefined {
  return findRunMapNode(state.map, state.currentNodeId);
}

export function createGameStateForRunNode(state: RunState): GameState | undefined {
  const resolved = resolveRunNode({
    state,
    nodeId: state.currentNodeId,
  });

  if (!resolved.ok || resolved.resolution.kind !== "encounter") {
    return undefined;
  }

  return resolved.node.kind === "boss" ? createDemoShellState("boss") : createDemoShellState("run");
}

export function createRunNodeViews(state: RunState): readonly RunNodeView[] {
  return state.map.nodes.map((node) => ({
    id: node.id,
    kind: node.kind,
    label: formatRunNodeKind(node.kind),
    status: getRunNodeViewStatus(state, node),
  }));
}

export function isEncounterRunNode(node: RunMapNode | undefined): boolean {
  return node?.kind === "encounter" || node?.kind === "boss";
}

function getRunNodeViewStatus(state: RunState, node: RunMapNode): RunNodeViewStatus {
  if (state.completedNodeIds.includes(node.id)) {
    return "complete";
  }

  if (node.id === state.currentNodeId) {
    return "current";
  }

  if (state.availableNodeIds.includes(node.id)) {
    return "available";
  }

  return "locked";
}

function formatRunNodeKind(kind: RunNodeKind): string {
  return kind.replace(/[-_.:]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
