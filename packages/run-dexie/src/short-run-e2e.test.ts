import "fake-indexeddb/auto";

import type { Command } from "@ucre/core";
import { runReplay } from "@ucre/replay";
import {
  claimRunRewardChoice,
  completeRunNode,
  createEncounterNodePayload,
  createLinearRunMap,
  createRunSavePackage,
  createRunSaveSnapshot,
  createRunState,
  openRunRewardDraft,
  resolveRunNode,
  verifyRunSavePackage,
} from "@ucre/run";
import {
  SLAY_LIKE_COMMANDS,
  SLAY_LIKE_PHASES,
  SLAY_LIKE_RULESET_ID,
  SLAY_LIKE_RULES_VERSION,
  SLAY_LIKE_ZONES,
  createSlayLikeCommandRegistry,
  createSlayLikeEffectRegistry,
  createSlayLikeEncounter,
} from "@ucre/rulesets";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createRunSaveDexieStore, deleteRunSaveDexieDatabase } from "./index.js";

const DATABASE_NAME = "ucre-short-run-e2e-test";
const CONTENT_MANIFEST_HASH = "slay-like-inline-content-0";
const RUN_ID = "short-run-e2e";
const RUN_SEED = "short-run-seed-1";
const PLAYER_ID = "player-1";

describe("short run E2E", () => {
  beforeEach(async () => {
    await deleteRunSaveDexieDatabase(DATABASE_NAME);
  });

  afterEach(async () => {
    await deleteRunSaveDexieDatabase(DATABASE_NAME);
  });

  it("saves, reloads, replays, and completes a minimal Slay-like run", async () => {
    const map = createLinearRunMap({
      id: "short-act",
      seed: RUN_SEED,
      nodeKinds: ["start", "encounter", "victory"],
      nodePayloads: [
        {},
        createEncounterNodePayload({
          encounterId: "jaw-worm-1",
          rulesetId: SLAY_LIKE_RULESET_ID,
          contentManifestHash: CONTENT_MANIFEST_HASH,
        }),
        {},
      ],
    });
    const initialRunState = createRunState({
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
    const afterStart = completeRunNode({
      state: initialRunState,
      nodeId: "short-act:node:0",
      payload: {
        completedBy: "short-run-e2e",
      },
    });
    const resolvedEncounter = resolveRunNode({
      state: afterStart,
      nodeId: "short-act:node:1",
    });

    expect(resolvedEncounter.ok).toBe(true);
    if (!resolvedEncounter.ok || resolvedEncounter.resolution.kind !== "encounter") {
      throw new Error("Expected the short run encounter node to resolve.");
    }

    const encounterInitialState = createSlayLikeEncounter({
      gameId: resolvedEncounter.resolution.encounterId,
      seed: resolvedEncounter.resolution.seed,
      contentManifestHash: resolvedEncounter.resolution.contentManifestHash,
    });
    const commandLog: readonly Command[] = [
      {
        id: "short-run-command-1",
        type: SLAY_LIKE_COMMANDS.drawCards,
        playerId: PLAYER_ID,
        payload: {
          count: 3,
        },
      },
      {
        id: "short-run-command-2",
        type: SLAY_LIKE_COMMANDS.playCard,
        playerId: PLAYER_ID,
        payload: {
          cardId: "strike-1",
          targetObjectId: "enemy-jaw-worm",
        },
      },
      {
        id: "short-run-command-3",
        type: SLAY_LIKE_COMMANDS.playCard,
        playerId: PLAYER_ID,
        payload: {
          cardId: "strike-2",
          targetObjectId: "enemy-jaw-worm",
        },
      },
      {
        id: "short-run-command-4",
        type: SLAY_LIKE_COMMANDS.chooseReward,
        playerId: PLAYER_ID,
        payload: {
          rewardObjectId: "reward-card-iron-wave",
        },
      },
    ];
    const encounterReplay = runReplay({
      gameId: resolvedEncounter.resolution.encounterId,
      seed: resolvedEncounter.resolution.seed,
      rulesVersion: SLAY_LIKE_RULES_VERSION,
      contentManifestHash: CONTENT_MANIFEST_HASH,
      commands: commandLog,
      initialState: encounterInitialState,
      commandRegistry: createSlayLikeCommandRegistry(),
      effectRegistry: createSlayLikeEffectRegistry(),
    });

    expect(encounterReplay.ok).toBe(true);
    if (!encounterReplay.ok) {
      throw new Error("Short run encounter replay unexpectedly failed.");
    }
    expect(encounterReplay.finalState.phase).toBe(SLAY_LIKE_PHASES.complete);
    expect(encounterReplay.finalState.zones[SLAY_LIKE_ZONES.enemy]?.objectIds).toEqual([]);

    const afterEncounter = completeRunNode({
      state: afterStart,
      nodeId: "short-act:node:1",
      payload: {
        encounterId: resolvedEncounter.resolution.encounterId,
        replayHash: encounterReplay.replayHash,
      },
    });
    const withRunReward = openRunRewardDraft({
      state: afterEncounter,
      draft: {
        id: "run-draft-jaw-worm-1",
        sourceNodeId: "short-act:node:1",
        status: "open",
        choices: [
          {
            id: "choice-iron-wave",
            kind: "card",
            payload: {
              sourceRewardObjectId: "reward-card-iron-wave",
            },
            card: {
              id: "run-card-iron-wave-1",
              definitionId: "iron-wave",
              payload: {
                sourceRewardObjectId: "reward-card-iron-wave",
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
    const claimedReward = claimRunRewardChoice({
      state: withRunReward,
      draftId: "run-draft-jaw-worm-1",
      choiceId: "choice-iron-wave",
    });

    expect(claimedReward.ok).toBe(true);
    if (!claimedReward.ok) {
      throw new Error("Short run reward claim unexpectedly failed.");
    }
    const victoryRunState = completeRunNode({
      state: claimedReward.state,
      nodeId: "short-act:node:2",
      payload: {
        settlement: "victory",
      },
    });

    expect(victoryRunState.status).toBe("complete");
    expect(victoryRunState.completedNodeIds).toEqual([
      "short-act:node:0",
      "short-act:node:1",
      "short-act:node:2",
    ]);
    expect(victoryRunState.deck.map((card) => card.definitionId)).toEqual(["strike", "iron-wave"]);

    const afterStartSnapshot = createRunSaveSnapshot({
      id: "short-run-snapshot-start",
      label: "After start",
      runState: afterStart,
      commandLog: [],
    });
    const afterEncounterSnapshot = createRunSaveSnapshot({
      id: "short-run-snapshot-encounter",
      label: "After encounter",
      runState: afterEncounter,
      commandLog,
      gameState: encounterReplay.finalState,
    });
    const victorySnapshot = createRunSaveSnapshot({
      id: "short-run-snapshot-victory",
      label: "Victory",
      runState: victoryRunState,
      commandLog,
      gameState: encounterReplay.finalState,
    });
    const savePackage = createRunSavePackage({
      id: "short-run-save-1",
      runState: victoryRunState,
      commandLog,
      snapshots: [afterStartSnapshot, afterEncounterSnapshot, victorySnapshot],
      payload: {
        activeSnapshotId: victorySnapshot.id,
      },
    });

    expect(verifyRunSavePackage(savePackage)).toBe(true);
    expect(victorySnapshot.gameStateHash).toBe(encounterReplay.stateHash);

    const store = createRunSaveDexieStore({
      databaseName: DATABASE_NAME,
    });

    try {
      await store.putSave(savePackage, 1);
      const loadedSave = await store.getSave("short-run-save-1");

      expect(loadedSave).toEqual(savePackage);
      if (!loadedSave) {
        throw new Error("Short run save was not loaded.");
      }

      const reloadedReplay = runReplay({
        gameId: resolvedEncounter.resolution.encounterId,
        seed: resolvedEncounter.resolution.seed,
        rulesVersion: loadedSave.rulesVersion,
        contentManifestHash: loadedSave.contentManifestHash,
        commands: loadedSave.commandLog,
        initialState: createSlayLikeEncounter({
          gameId: resolvedEncounter.resolution.encounterId,
          seed: resolvedEncounter.resolution.seed,
          contentManifestHash: loadedSave.contentManifestHash,
        }),
        commandRegistry: createSlayLikeCommandRegistry(),
        effectRegistry: createSlayLikeEffectRegistry(),
      });

      expect(reloadedReplay.ok).toBe(true);
      if (!reloadedReplay.ok) {
        throw new Error("Reloaded short run replay unexpectedly failed.");
      }
      expect(reloadedReplay.stateHash).toBe(encounterReplay.stateHash);
      expect(reloadedReplay.eventHash).toBe(encounterReplay.eventHash);
      expect(reloadedReplay.replayHash).toBe(encounterReplay.replayHash);
      expect(loadedSave.currentRunState.status).toBe("complete");
      expect(loadedSave.snapshots.map((snapshot) => snapshot.label)).toEqual([
        "After start",
        "After encounter",
        "Victory",
      ]);
    } finally {
      store.close();
    }
  });
});
