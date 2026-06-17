import "fake-indexeddb/auto";

import type { Command, GameState } from "@ucre/core";
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
  type EncounterRunNodeResolution,
  type RunSaveSnapshot,
  type RunState,
} from "@ucre/run";
import {
  SLAY_LIKE_COMMANDS,
  SLAY_LIKE_ENEMY_DEFINITIONS,
  SLAY_LIKE_PHASES,
  SLAY_LIKE_RULESET_ID,
  SLAY_LIKE_RULES_VERSION,
  SLAY_LIKE_ZONES,
  createSlayLikeCommandRegistry,
  createSlayLikeEffectRegistry,
  createSlayLikeEncounter,
  type SlayLikeEnemyDefinition,
} from "@ucre/rulesets";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createRunSaveDexieStore, deleteRunSaveDexieDatabase } from "./index.js";

const DATABASE_NAME = "ucre-full-run-boss-e2e-test";
const CONTENT_MANIFEST_HASH = "slay-like-inline-content-0";
const RUN_ID = "full-run-boss-e2e";
const RUN_SEED = "full-run-seed-1";
const PLAYER_ID = "player-1";

describe("full run boss E2E", () => {
  beforeEach(async () => {
    await deleteRunSaveDexieDatabase(DATABASE_NAME);
  });

  afterEach(async () => {
    await deleteRunSaveDexieDatabase(DATABASE_NAME);
  });

  it("saves, reloads, and verifies a short Slay-like run through a boss node", async () => {
    const map = createLinearRunMap({
      id: "demo-act",
      seed: RUN_SEED,
      nodeKinds: ["start", "encounter", "event", "shop", "rest", "boss", "victory"],
      nodePayloads: [
        {},
        createEncounterNodePayload({
          encounterId: "acid-slime-1",
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
          encounterId: "hexaghost-1",
          rulesetId: SLAY_LIKE_RULESET_ID,
          contentManifestHash: CONTENT_MANIFEST_HASH,
          seed: "boss-seed-1",
        }),
        {},
      ],
    });
    let runState = createRunState({
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
    const snapshots: RunSaveSnapshot[] = [];
    const fullCommandLog: Command[] = [];

    runState = completeRunNode({
      state: runState,
      nodeId: "demo-act:node:0",
      payload: {
        completedBy: "full-run-boss-e2e",
      },
    });
    snapshots.push(createRunSnapshot("after-start", "After start", runState, fullCommandLog));

    const encounterResolution = requireEncounterResolution(runState, "demo-act:node:1");
    const encounterCommands = createAcidSlimeCommands();
    const encounterReplay = runSlayReplay({
      resolution: encounterResolution,
      commands: encounterCommands,
      initialState: createSlayLikeEncounter({
        gameId: encounterResolution.encounterId,
        seed: encounterResolution.seed,
        contentManifestHash: encounterResolution.contentManifestHash,
        enemies: [requireSlayLikeEnemyDefinition("acidSlime")],
        starterDeck: [
          {
            id: "heavy-strike-1",
            definitionId: "heavyStrike",
          },
        ],
      }),
    });

    expect(encounterReplay.phase).toBe(SLAY_LIKE_PHASES.complete);
    fullCommandLog.push(...encounterCommands);
    runState = completeRunNode({
      state: runState,
      nodeId: "demo-act:node:1",
      payload: {
        encounterId: encounterResolution.encounterId,
        replayHash: encounterReplay.replayHash,
      },
    });
    runState = claimEncounterReward(runState, "demo-act:node:1", "run-card-iron-wave-1");
    snapshots.push(
      createRunSnapshot(
        "after-encounter",
        "After encounter",
        runState,
        fullCommandLog,
        encounterReplay.finalState,
      ),
    );

    for (const [nodeId, label] of [
      ["demo-act:node:2", "event"],
      ["demo-act:node:3", "shop"],
      ["demo-act:node:4", "rest"],
    ] as const) {
      runState = completeRunNode({
        state: runState,
        nodeId,
        payload: {
          resolvedNodeKind: label,
        },
      });
    }

    const bossResolution = requireEncounterResolution(runState, "demo-act:node:5");
    const bossCommands = createHexaghostCommands();
    const bossReplay = runSlayReplay({
      resolution: bossResolution,
      commands: bossCommands,
      initialState: createSlayLikeEncounter({
        gameId: bossResolution.encounterId,
        seed: bossResolution.seed,
        contentManifestHash: bossResolution.contentManifestHash,
        enemies: [requireSlayLikeEnemyDefinition("hexaghost")],
        starterDeck: createBossStarterDeck(),
      }),
    });

    expect(bossReplay.phase).toBe(SLAY_LIKE_PHASES.complete);
    expect(bossReplay.finalState.zones[SLAY_LIKE_ZONES.enemy]?.objectIds).toEqual([]);
    fullCommandLog.push(...bossCommands);
    runState = completeRunNode({
      state: runState,
      nodeId: "demo-act:node:5",
      payload: {
        bossMoment: "hexaghost-defeated",
        replayHash: bossReplay.replayHash,
      },
    });
    runState = completeRunNode({
      state: runState,
      nodeId: "demo-act:node:6",
      payload: {
        settlement: "victory",
      },
    });
    snapshots.push(
      createRunSnapshot("victory", "Victory", runState, fullCommandLog, bossReplay.finalState),
    );

    expect(map.nodes.map((node) => node.kind)).toEqual([
      "start",
      "encounter",
      "event",
      "shop",
      "rest",
      "boss",
      "victory",
    ]);
    expect(runState.status).toBe("complete");
    expect(runState.completedNodeIds).toEqual([
      "demo-act:node:0",
      "demo-act:node:1",
      "demo-act:node:2",
      "demo-act:node:3",
      "demo-act:node:4",
      "demo-act:node:5",
      "demo-act:node:6",
    ]);
    expect(runState.deck.map((card) => card.definitionId)).toEqual(["strike", "ironWave"]);

    const savePackage = createRunSavePackage({
      id: "full-run-boss-save-1",
      runState,
      commandLog: fullCommandLog,
      snapshots,
      payload: {
        bossReplayHash: bossReplay.replayHash,
      },
    });

    expect(verifyRunSavePackage(savePackage)).toBe(true);
    expect(savePackage.snapshots.map((snapshot) => snapshot.label)).toEqual([
      "After start",
      "After encounter",
      "Victory",
    ]);
    expect(savePackage.snapshots.at(-1)?.gameStateHash).toBe(bossReplay.stateHash);

    const store = createRunSaveDexieStore({
      databaseName: DATABASE_NAME,
    });

    try {
      await store.putSave(savePackage, 1);
      const loadedSave = await store.getSave(savePackage.id);

      expect(loadedSave).toEqual(savePackage);
      expect(loadedSave?.currentRunState.status).toBe("complete");
      expect(loadedSave?.payload.bossReplayHash).toBe(bossReplay.replayHash);
    } finally {
      store.close();
    }
  });
});

function requireEncounterResolution(state: RunState, nodeId: string): EncounterRunNodeResolution {
  const resolved = resolveRunNode({
    state,
    nodeId,
  });

  if (!resolved.ok || resolved.resolution.kind !== "encounter") {
    throw new Error(`Expected encounter resolution for ${nodeId}.`);
  }

  return resolved.resolution;
}

function requireSlayLikeEnemyDefinition(id: string): SlayLikeEnemyDefinition {
  const enemy = SLAY_LIKE_ENEMY_DEFINITIONS[id];

  if (!enemy) {
    throw new Error(`Missing Slay-like enemy definition: ${id}.`);
  }

  return enemy;
}

function runSlayReplay(input: {
  readonly resolution: EncounterRunNodeResolution;
  readonly commands: readonly Command[];
  readonly initialState: GameState;
}) {
  const replay = runReplay({
    gameId: input.resolution.encounterId,
    seed: input.resolution.seed,
    rulesVersion: SLAY_LIKE_RULES_VERSION,
    contentManifestHash: input.resolution.contentManifestHash,
    commands: input.commands,
    initialState: input.initialState,
    commandRegistry: createSlayLikeCommandRegistry(),
    effectRegistry: createSlayLikeEffectRegistry(),
  });

  if (!replay.ok) {
    const errorSummary = replay.errors.map((error) => `${error.code}: ${error.message}`).join("; ");

    throw new Error(`Slay-like replay failed at ${replay.failedCommand.id}: ${errorSummary}`);
  }

  return {
    phase: replay.finalState.phase,
    finalState: replay.finalState,
    replayHash: replay.replayHash,
    stateHash: replay.stateHash,
  };
}

function createAcidSlimeCommands(): readonly Command[] {
  return [
    {
      id: "acid-command-1",
      type: SLAY_LIKE_COMMANDS.drawCards,
      playerId: PLAYER_ID,
      payload: {
        count: 1,
      },
    },
    {
      id: "acid-command-2",
      type: SLAY_LIKE_COMMANDS.playCard,
      playerId: PLAYER_ID,
      payload: {
        cardId: "heavy-strike-1",
        targetObjectId: "enemy-acid-slime",
      },
    },
    {
      id: "acid-command-3",
      type: SLAY_LIKE_COMMANDS.chooseReward,
      playerId: PLAYER_ID,
      payload: {
        rewardObjectId: "reward-card-iron-wave",
      },
    },
  ];
}

function createHexaghostCommands(): readonly Command[] {
  return [
    {
      id: "boss-command-1",
      type: SLAY_LIKE_COMMANDS.drawCards,
      playerId: PLAYER_ID,
      payload: {
        count: 5,
      },
    },
    createBossPlayCommand("boss-command-2", "uppercut-1"),
    createBossPlayCommand("boss-command-3", "slice-1"),
    createBossPlayCommand("boss-command-4", "quick-strike-1"),
    createBossPlayCommand("boss-command-5", "strike-1"),
    {
      id: "boss-command-6",
      type: SLAY_LIKE_COMMANDS.endTurn,
      playerId: PLAYER_ID,
      payload: {},
    },
    createBossPlayCommand("boss-command-7", "uppercut-2"),
    createBossPlayCommand("boss-command-8", "slice-2"),
    createBossPlayCommand("boss-command-9", "quick-strike-2"),
    createBossPlayCommand("boss-command-10", "strike-2"),
    {
      id: "boss-command-11",
      type: SLAY_LIKE_COMMANDS.chooseReward,
      playerId: PLAYER_ID,
      payload: {
        rewardObjectId: "reward-card-iron-wave",
      },
    },
  ];
}

function createBossPlayCommand(id: string, cardId: string): Command {
  return {
    id,
    type: SLAY_LIKE_COMMANDS.playCard,
    playerId: PLAYER_ID,
    payload: {
      cardId,
      targetObjectId: "enemy-hexaghost",
    },
  };
}

function createBossStarterDeck() {
  return [
    { id: "uppercut-1", definitionId: "uppercut" },
    { id: "slice-1", definitionId: "slice" },
    { id: "quick-strike-1", definitionId: "quickStrike" },
    { id: "strike-1", definitionId: "strike" },
    { id: "defend-1", definitionId: "defend" },
    { id: "uppercut-2", definitionId: "uppercut" },
    { id: "slice-2", definitionId: "slice" },
    { id: "quick-strike-2", definitionId: "quickStrike" },
    { id: "strike-2", definitionId: "strike" },
    { id: "defend-2", definitionId: "defend" },
  ];
}

function claimEncounterReward(
  state: RunState,
  sourceNodeId: string,
  rewardCardId: string,
): RunState {
  const withDraft = openRunRewardDraft({
    state,
    draft: {
      id: `${sourceNodeId}:reward`,
      sourceNodeId,
      status: "open",
      choices: [
        {
          id: "choice-iron-wave",
          kind: "card",
          payload: {
            sourceRewardObjectId: "reward-card-iron-wave",
          },
          card: {
            id: rewardCardId,
            definitionId: "ironWave",
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
  const claimed = claimRunRewardChoice({
    state: withDraft,
    draftId: `${sourceNodeId}:reward`,
    choiceId: "choice-iron-wave",
  });

  if (!claimed.ok) {
    throw new Error(`Run reward claim failed: ${claimed.message}`);
  }

  return claimed.state;
}

function createRunSnapshot(
  id: string,
  label: string,
  runState: RunState,
  commandLog: readonly Command[],
  gameState?: GameState,
): RunSaveSnapshot {
  return createRunSaveSnapshot({
    id,
    label,
    runState,
    commandLog,
    ...(gameState ? { gameState } : {}),
  });
}
