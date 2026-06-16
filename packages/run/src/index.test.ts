import { describe, expect, it } from "vitest";

import {
  claimRunRewardChoice,
  completeRunNode,
  createEncounterNodePayload,
  createLinearRunMap,
  createRunPackageIdentity,
  createRunState,
  findRunMapNode,
  hashRunState,
  openRunRewardDraft,
  resolveRunNode,
} from "./index.js";

describe("run state and map graph", () => {
  it("creates a deterministic linear run map", () => {
    const map = createLinearRunMap({
      id: "act-1",
      seed: "run-seed-1",
      nodeKinds: ["start", "encounter", "rest", "boss", "victory"],
    });

    expect(createRunPackageIdentity().packageId).toBe("@ucre/run");
    expect(map.startNodeId).toBe("act-1:node:0");
    expect(
      map.nodes.map((node) => ({
        id: node.id,
        kind: node.kind,
        depth: node.depth,
        nextNodeIds: node.nextNodeIds,
      })),
    ).toEqual([
      {
        id: "act-1:node:0",
        kind: "start",
        depth: 0,
        nextNodeIds: ["act-1:node:1"],
      },
      {
        id: "act-1:node:1",
        kind: "encounter",
        depth: 1,
        nextNodeIds: ["act-1:node:2"],
      },
      {
        id: "act-1:node:2",
        kind: "rest",
        depth: 2,
        nextNodeIds: ["act-1:node:3"],
      },
      {
        id: "act-1:node:3",
        kind: "boss",
        depth: 3,
        nextNodeIds: ["act-1:node:4"],
      },
      {
        id: "act-1:node:4",
        kind: "victory",
        depth: 4,
        nextNodeIds: [],
      },
    ]);
  });

  it("starts a run at the map start node", () => {
    const map = createLinearRunMap({
      id: "act-1",
      seed: "run-seed-1",
      nodeKinds: ["start", "encounter", "victory"],
    });
    const state = createRunState({
      id: "run-1",
      seed: "run-seed-1",
      rulesetId: "slay-like",
      rulesVersion: "0.0.0",
      contentManifestHash: "ucre1-content",
      map,
    });

    expect(state.status).toBe("active");
    expect(state.currentNodeId).toBe(map.startNodeId);
    expect(state.availableNodeIds).toEqual([map.startNodeId]);
    expect(state.completedNodeIds).toEqual([]);
    expect(findRunMapNode(map, "act-1:node:1")?.kind).toBe("encounter");
  });

  it("completes available nodes immutably and opens the next node", () => {
    const map = createLinearRunMap({
      id: "act-1",
      seed: "run-seed-1",
      nodeKinds: ["start", "encounter", "victory"],
    });
    const state = createRunState({
      id: "run-1",
      seed: "run-seed-1",
      rulesetId: "slay-like",
      rulesVersion: "0.0.0",
      contentManifestHash: "ucre1-content",
      map,
    });
    const afterStart = completeRunNode({
      state,
      nodeId: "act-1:node:0",
      payload: {
        lastNodeKind: "start",
      },
    });

    expect(afterStart).not.toBe(state);
    expect(state.completedNodeIds).toEqual([]);
    expect(afterStart.completedNodeIds).toEqual(["act-1:node:0"]);
    expect(afterStart.availableNodeIds).toEqual(["act-1:node:1"]);
    expect(afterStart.currentNodeId).toBe("act-1:node:1");
    expect(afterStart.payload).toEqual({
      lastNodeKind: "start",
    });

    const rejected = completeRunNode({
      state: afterStart,
      nodeId: "act-1:node:2",
    });
    expect(rejected).toBe(afterStart);

    const afterEncounter = completeRunNode({
      state: afterStart,
      nodeId: "act-1:node:1",
    });
    const afterVictory = completeRunNode({
      state: afterEncounter,
      nodeId: "act-1:node:2",
    });

    expect(afterVictory.status).toBe("complete");
    expect(afterVictory.completedNodeIds).toEqual(["act-1:node:0", "act-1:node:1", "act-1:node:2"]);
    expect(afterVictory.availableNodeIds).toEqual([]);
    expect(hashRunState(afterVictory)).toMatch(/^ucre1-[0-9a-f]{8}$/);
  });

  it("resolves available encounter nodes from map payloads", () => {
    const map = createLinearRunMap({
      id: "act-1",
      seed: "run-seed-1",
      nodeKinds: ["start", "encounter", "boss", "victory"],
      nodePayloads: [
        {},
        createEncounterNodePayload({
          encounterId: "jaw-worm-1",
          rulesetId: "slay-like",
          contentManifestHash: "ucre1-slay-content",
        }),
        createEncounterNodePayload({
          encounterId: "boss-1",
          seed: "boss-seed-1",
        }),
        {},
      ],
    });
    const state = createRunState({
      id: "run-1",
      seed: "run-seed-1",
      rulesetId: "slay-like",
      rulesVersion: "0.0.0",
      contentManifestHash: "ucre1-default-content",
      map,
    });
    const afterStart = completeRunNode({
      state,
      nodeId: "act-1:node:0",
    });

    const encounter = resolveRunNode({
      state: afterStart,
      nodeId: "act-1:node:1",
    });
    expect(encounter).toEqual({
      ok: true,
      node: map.nodes[1],
      resolution: {
        kind: "encounter",
        nodeId: "act-1:node:1",
        nodeKind: "encounter",
        encounterId: "jaw-worm-1",
        rulesetId: "slay-like",
        contentManifestHash: "ucre1-slay-content",
        seed: "run-seed-1:act-1:node:1",
        payload: {
          encounterId: "jaw-worm-1",
          rulesetId: "slay-like",
          contentManifestHash: "ucre1-slay-content",
        },
      },
    });

    const afterEncounter = completeRunNode({
      state: afterStart,
      nodeId: "act-1:node:1",
    });
    const boss = resolveRunNode({
      state: afterEncounter,
      nodeId: "act-1:node:2",
    });

    expect(boss.ok).toBe(true);
    if (boss.ok) {
      expect(boss.resolution).toMatchObject({
        kind: "encounter",
        nodeId: "act-1:node:2",
        nodeKind: "boss",
        encounterId: "boss-1",
        rulesetId: "slay-like",
        contentManifestHash: "ucre1-default-content",
        seed: "boss-seed-1",
      });
    }
  });

  it("rejects missing and unavailable run nodes", () => {
    const map = createLinearRunMap({
      id: "act-1",
      seed: "run-seed-1",
      nodeKinds: ["start", "encounter"],
    });
    const state = createRunState({
      id: "run-1",
      seed: "run-seed-1",
      rulesetId: "slay-like",
      rulesVersion: "0.0.0",
      contentManifestHash: "ucre1-content",
      map,
    });

    expect(resolveRunNode({ state, nodeId: "missing" })).toEqual({
      ok: false,
      code: "RUN_NODE_NOT_FOUND",
      message: "Run node does not exist: missing",
    });
    expect(resolveRunNode({ state, nodeId: "act-1:node:1" })).toEqual({
      ok: false,
      code: "RUN_NODE_NOT_AVAILABLE",
      message: "Run node is not available: act-1:node:1",
    });
  });

  it("opens reward drafts and claims card rewards into the run deck", () => {
    const state = createRunState({
      id: "run-1",
      seed: "run-seed-1",
      rulesetId: "slay-like",
      rulesVersion: "0.0.0",
      contentManifestHash: "ucre1-content",
      map: createLinearRunMap({
        id: "act-1",
        seed: "run-seed-1",
        nodeKinds: ["start", "encounter"],
      }),
      deck: [
        {
          id: "strike-1",
          definitionId: "strike",
          payload: {},
        },
      ],
    });
    const withDraft = openRunRewardDraft({
      state,
      draft: {
        id: "draft-1",
        sourceNodeId: "act-1:node:1",
        status: "open",
        choices: [
          {
            id: "choice-iron-wave",
            kind: "card",
            payload: {},
            card: {
              id: "iron-wave-1",
              definitionId: "iron-wave",
              payload: {
                upgraded: false,
              },
            },
          },
          {
            id: "choice-skip",
            kind: "skip",
            payload: {},
          },
        ],
      },
    });

    expect(state.rewardDrafts).toEqual([]);
    expect(withDraft.rewardDrafts).toHaveLength(1);

    const claimed = claimRunRewardChoice({
      state: withDraft,
      draftId: "draft-1",
      choiceId: "choice-iron-wave",
    });

    expect(claimed.ok).toBe(true);
    if (claimed.ok) {
      expect(claimed.state.deck).toEqual([
        {
          id: "strike-1",
          definitionId: "strike",
          payload: {},
        },
        {
          id: "iron-wave-1",
          definitionId: "iron-wave",
          payload: {
            upgraded: false,
          },
        },
      ]);
      expect(claimed.state.rewardDrafts[0]).toMatchObject({
        id: "draft-1",
        status: "claimed",
        selectedChoiceId: "choice-iron-wave",
      });
    }
  });

  it("can skip reward drafts without modifying the deck", () => {
    const state = openRunRewardDraft({
      state: createRunState({
        id: "run-1",
        seed: "run-seed-1",
        rulesetId: "slay-like",
        rulesVersion: "0.0.0",
        contentManifestHash: "ucre1-content",
        map: createLinearRunMap({
          id: "act-1",
          seed: "run-seed-1",
          nodeKinds: ["start"],
        }),
      }),
      draft: {
        id: "draft-1",
        sourceNodeId: "act-1:node:0",
        status: "open",
        choices: [
          {
            id: "choice-skip",
            kind: "skip",
            payload: {},
          },
        ],
      },
    });

    const skipped = claimRunRewardChoice({
      state,
      draftId: "draft-1",
      choiceId: "choice-skip",
    });

    expect(skipped.ok).toBe(true);
    if (skipped.ok) {
      expect(skipped.state.deck).toEqual([]);
      expect(skipped.state.rewardDrafts[0]).toMatchObject({
        status: "skipped",
        selectedChoiceId: "choice-skip",
      });
    }
  });

  it("rejects invalid reward claims without changing state", () => {
    const state = openRunRewardDraft({
      state: createRunState({
        id: "run-1",
        seed: "run-seed-1",
        rulesetId: "slay-like",
        rulesVersion: "0.0.0",
        contentManifestHash: "ucre1-content",
        map: createLinearRunMap({
          id: "act-1",
          seed: "run-seed-1",
          nodeKinds: ["start"],
        }),
        deck: [
          {
            id: "strike-1",
            definitionId: "strike",
            payload: {},
          },
        ],
      }),
      draft: {
        id: "draft-1",
        sourceNodeId: "act-1:node:0",
        status: "open",
        choices: [
          {
            id: "duplicate-strike",
            kind: "card",
            payload: {},
            card: {
              id: "strike-1",
              definitionId: "strike",
              payload: {},
            },
          },
        ],
      },
    });

    expect(
      claimRunRewardChoice({
        state,
        draftId: "missing",
        choiceId: "duplicate-strike",
      }),
    ).toEqual({
      ok: false,
      state,
      code: "RUN_REWARD_DRAFT_NOT_FOUND",
      message: "Run reward draft does not exist: missing",
    });
    expect(
      claimRunRewardChoice({
        state,
        draftId: "draft-1",
        choiceId: "missing",
      }),
    ).toEqual({
      ok: false,
      state,
      code: "RUN_REWARD_CHOICE_NOT_FOUND",
      message: "Run reward choice does not exist: missing",
    });
    expect(
      claimRunRewardChoice({
        state,
        draftId: "draft-1",
        choiceId: "duplicate-strike",
      }),
    ).toEqual({
      ok: false,
      state,
      code: "RUN_DECK_CARD_ALREADY_EXISTS",
      message: "Run deck already contains card: strike-1",
    });
  });
});
