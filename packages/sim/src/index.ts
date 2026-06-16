import type { Command, StableHash } from "@ucre/core";
import { runReplay } from "@ucre/replay";
import {
  SLAY_LIKE_COMMANDS,
  SLAY_LIKE_PHASES,
  SLAY_LIKE_RULES_VERSION,
  createSlayLikeCommandRegistry,
  createSlayLikeEffectRegistry,
  createSlayLikeEncounter,
} from "@ucre/rulesets";

export const UCRE_SIM_PACKAGE_ID = "@ucre/sim";

export interface SimPackageIdentity {
  readonly replayPackageId: "@ucre/replay";
  readonly rulesetsPackageId: "@ucre/rulesets";
}

export interface SlayLikeSimulationInput {
  readonly runs: number;
  readonly seedPrefix: string;
}

export interface SlayLikeSimulationRun {
  readonly runIndex: number;
  readonly seed: string;
  readonly outcome: "complete" | "failed";
  readonly finalPhase: string;
  readonly commandCount: number;
  readonly eventCount: number;
  readonly commandHash: StableHash;
  readonly stateHash: StableHash;
  readonly eventHash: StableHash;
  readonly replayHash: StableHash;
  readonly failedCommandId?: string;
  readonly errorCodes?: readonly string[];
}

export interface SlayLikeSimulationResult {
  readonly packageId: typeof UCRE_SIM_PACKAGE_ID;
  readonly rulesetId: "slay-like";
  readonly rulesVersion: typeof SLAY_LIKE_RULES_VERSION;
  readonly contentManifestHash: string;
  readonly seedPrefix: string;
  readonly runCount: number;
  readonly completedCount: number;
  readonly failedCount: number;
  readonly runs: readonly SlayLikeSimulationRun[];
}

const DEFAULT_CONTENT_MANIFEST_HASH = "slay-like-inline-content-0";

export function createSimPackageIdentity(): SimPackageIdentity {
  return {
    replayPackageId: "@ucre/replay",
    rulesetsPackageId: "@ucre/rulesets",
  };
}

export function simulateSlayLikeRuns(input: SlayLikeSimulationInput): SlayLikeSimulationResult {
  const runCount = assertPositiveInteger(input.runs, "runs");
  const runs = createSequentialSeeds(input.seedPrefix, runCount).map((seed, index) =>
    simulateOneSlayLikeRun({
      runIndex: index + 1,
      seed,
    }),
  );
  const completedCount = runs.filter((run) => run.outcome === "complete").length;
  const failedCount = runs.length - completedCount;

  return {
    packageId: UCRE_SIM_PACKAGE_ID,
    rulesetId: "slay-like",
    rulesVersion: SLAY_LIKE_RULES_VERSION,
    contentManifestHash: DEFAULT_CONTENT_MANIFEST_HASH,
    seedPrefix: input.seedPrefix,
    runCount,
    completedCount,
    failedCount,
    runs,
  };
}

export function formatSimulationResultJson(result: SlayLikeSimulationResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function createSequentialSeeds(prefix: string, count: number): readonly string[] {
  const runCount = assertPositiveInteger(count, "count");

  return Array.from({ length: runCount }, (_, index) => `${prefix}-${index + 1}`);
}

function simulateOneSlayLikeRun(input: {
  readonly runIndex: number;
  readonly seed: string;
}): SlayLikeSimulationRun {
  const gameId = `slay-sim-${input.runIndex}`;
  const commands = createScriptedSlayLikeCommands();
  const replay = runReplay({
    gameId,
    seed: input.seed,
    rulesVersion: SLAY_LIKE_RULES_VERSION,
    contentManifestHash: DEFAULT_CONTENT_MANIFEST_HASH,
    commands,
    initialState: createSlayLikeEncounter({
      gameId,
      seed: input.seed,
      contentManifestHash: DEFAULT_CONTENT_MANIFEST_HASH,
    }),
    commandRegistry: createSlayLikeCommandRegistry(),
    effectRegistry: createSlayLikeEffectRegistry(),
  });

  if (!replay.ok) {
    return {
      runIndex: input.runIndex,
      seed: input.seed,
      outcome: "failed",
      finalPhase: replay.state.phase,
      commandCount: commands.length,
      eventCount: replay.events.length,
      commandHash: replay.commandHash,
      stateHash: replay.stateHash,
      eventHash: replay.eventHash,
      replayHash: replay.replayHash,
      failedCommandId: replay.failedCommand.id,
      errorCodes: replay.errors.map((error) => error.code),
    };
  }

  return {
    runIndex: input.runIndex,
    seed: input.seed,
    outcome: replay.finalState.phase === SLAY_LIKE_PHASES.complete ? "complete" : "failed",
    finalPhase: replay.finalState.phase,
    commandCount: commands.length,
    eventCount: replay.events.length,
    commandHash: replay.commandHash,
    stateHash: replay.stateHash,
    eventHash: replay.eventHash,
    replayHash: replay.replayHash,
  };
}

function createScriptedSlayLikeCommands(): readonly Command[] {
  return [
    {
      id: "command-1",
      type: SLAY_LIKE_COMMANDS.drawCards,
      playerId: "player-1",
      payload: {
        count: 3,
      },
    },
    {
      id: "command-2",
      type: SLAY_LIKE_COMMANDS.playCard,
      playerId: "player-1",
      payload: {
        cardId: "strike-1",
        targetObjectId: "enemy-jaw-worm",
      },
    },
    {
      id: "command-3",
      type: SLAY_LIKE_COMMANDS.playCard,
      playerId: "player-1",
      payload: {
        cardId: "strike-2",
        targetObjectId: "enemy-jaw-worm",
      },
    },
    {
      id: "command-4",
      type: SLAY_LIKE_COMMANDS.chooseReward,
      playerId: "player-1",
      payload: {
        rewardObjectId: "reward-card-iron-wave",
      },
    },
  ];
}

function assertPositiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}
