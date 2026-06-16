import { RESOURCE_CHANGED_EVENT_TYPE } from "@ucre/core";
import type { Command, GameState, RuleEvent, StableHash } from "@ucre/core";
import { runReplay } from "@ucre/replay";
import type { ReplayResult } from "@ucre/replay";
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
  readonly turnCount: number;
  readonly commandCount: number;
  readonly eventCount: number;
  readonly playedCardDefinitionIds: readonly string[];
  readonly finalPlayerResources: Readonly<Record<string, number>>;
  readonly commandHash: StableHash;
  readonly stateHash: StableHash;
  readonly eventHash: StableHash;
  readonly replayHash: StableHash;
  readonly pickedCardDefinitionId?: string;
  readonly deathNodeId?: string;
  readonly failedCommandId?: string;
  readonly errorCodes?: readonly string[];
}

export interface SlayLikeSimulationMetrics {
  readonly winRate: number;
  readonly completionRate: number;
  readonly failureRate: number;
  readonly averageTurnCount: number;
  readonly averageCommandCount: number;
  readonly averageEventCount: number;
  readonly cardPlayRates: readonly SlayLikeCardPlayRate[];
  readonly cardPickRates: readonly SlayLikeCardPickRate[];
  readonly resourceCurves: readonly SlayLikeResourceCurve[];
  readonly deathNodeDistribution: readonly SlayLikeDeathNodeBucket[];
}

export interface SlayLikeCardPlayRate {
  readonly definitionId: string;
  readonly playCount: number;
  readonly playedRunCount: number;
  readonly playRate: number;
  readonly playsPerRun: number;
}

export interface SlayLikeCardPickRate {
  readonly definitionId: string;
  readonly pickCount: number;
  readonly pickRate: number;
}

export interface SlayLikeResourceCurve {
  readonly playerId: string;
  readonly resourceId: string;
  readonly points: readonly SlayLikeResourceCurvePoint[];
}

export interface SlayLikeResourceCurvePoint {
  readonly step: number;
  readonly averageValue: number;
  readonly sampleCount: number;
}

export interface SlayLikeDeathNodeBucket {
  readonly nodeId: string;
  readonly count: number;
  readonly rate: number;
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
  readonly metrics: SlayLikeSimulationMetrics;
  readonly runs: readonly SlayLikeSimulationRun[];
}

interface SlayLikeSimulationArtifact {
  readonly run: SlayLikeSimulationRun;
  readonly commands: readonly Command[];
  readonly initialState: GameState;
  readonly finalState: GameState;
  readonly events: readonly RuleEvent[];
}

interface ResourcePointAccumulator {
  readonly playerId: string;
  readonly resourceId: string;
  readonly step: number;
  sum: number;
  sampleCount: number;
}

const DEFAULT_CONTENT_MANIFEST_HASH = "slay-like-inline-content-0";
const DEFAULT_PLAYER_ID = "player-1";

export function createSimPackageIdentity(): SimPackageIdentity {
  return {
    replayPackageId: "@ucre/replay",
    rulesetsPackageId: "@ucre/rulesets",
  };
}

export function simulateSlayLikeRuns(input: SlayLikeSimulationInput): SlayLikeSimulationResult {
  const runCount = assertPositiveInteger(input.runs, "runs");
  const simulations = createSequentialSeeds(input.seedPrefix, runCount).map((seed, index) =>
    simulateOneSlayLikeRun({
      runIndex: index + 1,
      seed,
    }),
  );
  const runs = simulations.map((simulation) => simulation.run);
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
    metrics: createSlayLikeSimulationMetrics(simulations, runCount),
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
}): SlayLikeSimulationArtifact {
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
  const finalState = replay.ok ? replay.finalState : replay.state;

  return {
    run: summarizeReplay({
      runIndex: input.runIndex,
      seed: input.seed,
      commands,
      replay,
      finalState,
    }),
    commands,
    initialState: replay.initialState,
    finalState,
    events: replay.events,
  };
}

function summarizeReplay(input: {
  readonly runIndex: number;
  readonly seed: string;
  readonly commands: readonly Command[];
  readonly replay: ReplayResult;
  readonly finalState: GameState;
}): SlayLikeSimulationRun {
  const outcome =
    input.replay.ok && input.finalState.phase === SLAY_LIKE_PHASES.complete ? "complete" : "failed";
  const failedCommandId = input.replay.ok ? undefined : input.replay.failedCommand.id;
  const deathNodeId =
    input.finalState.phase === SLAY_LIKE_PHASES.defeat ? "encounter:slay-like" : undefined;
  const pickedCardDefinitionId = readPickedCardDefinitionId(
    input.commands,
    input.replay.initialState,
    input.finalState,
  );
  const playerId = input.finalState.activePlayerId ?? DEFAULT_PLAYER_ID;

  return {
    runIndex: input.runIndex,
    seed: input.seed,
    outcome,
    finalPhase: input.finalState.phase,
    turnCount: countObservedTurns(input.replay.initialState, input.finalState, input.replay.events),
    commandCount: input.commands.length,
    eventCount: input.replay.events.length,
    playedCardDefinitionIds: readPlayedCardDefinitionIds(
      input.commands,
      input.replay.initialState,
      input.finalState,
    ),
    finalPlayerResources: readSortedPlayerResources(input.finalState, playerId),
    commandHash: input.replay.commandHash,
    stateHash: input.replay.stateHash,
    eventHash: input.replay.eventHash,
    replayHash: input.replay.replayHash,
    ...(pickedCardDefinitionId ? { pickedCardDefinitionId } : {}),
    ...(deathNodeId ? { deathNodeId } : {}),
    ...(failedCommandId ? { failedCommandId } : {}),
    ...(!input.replay.ok ? { errorCodes: input.replay.errors.map((error) => error.code) } : {}),
  };
}

function createScriptedSlayLikeCommands(): readonly Command[] {
  return [
    {
      id: "command-1",
      type: SLAY_LIKE_COMMANDS.drawCards,
      playerId: DEFAULT_PLAYER_ID,
      payload: {
        count: 3,
      },
    },
    {
      id: "command-2",
      type: SLAY_LIKE_COMMANDS.playCard,
      playerId: DEFAULT_PLAYER_ID,
      payload: {
        cardId: "strike-1",
        targetObjectId: "enemy-jaw-worm",
      },
    },
    {
      id: "command-3",
      type: SLAY_LIKE_COMMANDS.playCard,
      playerId: DEFAULT_PLAYER_ID,
      payload: {
        cardId: "strike-2",
        targetObjectId: "enemy-jaw-worm",
      },
    },
    {
      id: "command-4",
      type: SLAY_LIKE_COMMANDS.chooseReward,
      playerId: DEFAULT_PLAYER_ID,
      payload: {
        rewardObjectId: "reward-card-iron-wave",
      },
    },
  ];
}

function createSlayLikeSimulationMetrics(
  simulations: readonly SlayLikeSimulationArtifact[],
  runCount: number,
): SlayLikeSimulationMetrics {
  const runs = simulations.map((simulation) => simulation.run);
  const completedCount = runs.filter((run) => run.outcome === "complete").length;
  const failedCount = runs.length - completedCount;

  return {
    winRate: ratio(completedCount, runCount),
    completionRate: ratio(completedCount, runCount),
    failureRate: ratio(failedCount, runCount),
    averageTurnCount: average(
      runs.reduce((sum, run) => sum + run.turnCount, 0),
      runCount,
    ),
    averageCommandCount: average(
      runs.reduce((sum, run) => sum + run.commandCount, 0),
      runCount,
    ),
    averageEventCount: average(
      runs.reduce((sum, run) => sum + run.eventCount, 0),
      runCount,
    ),
    cardPlayRates: createCardPlayRates(runs, runCount),
    cardPickRates: createCardPickRates(runs, runCount),
    resourceCurves: createResourceCurves(simulations),
    deathNodeDistribution: createDeathNodeDistribution(runs, runCount),
  };
}

function createCardPlayRates(
  runs: readonly SlayLikeSimulationRun[],
  runCount: number,
): readonly SlayLikeCardPlayRate[] {
  const totals = new Map<string, { playCount: number; playedRunIds: Set<number> }>();

  for (const run of runs) {
    const playedThisRun = new Set<string>();

    for (const definitionId of run.playedCardDefinitionIds) {
      const total = totals.get(definitionId) ?? {
        playCount: 0,
        playedRunIds: new Set<number>(),
      };
      total.playCount += 1;
      playedThisRun.add(definitionId);
      totals.set(definitionId, total);
    }

    for (const definitionId of playedThisRun) {
      totals.get(definitionId)?.playedRunIds.add(run.runIndex);
    }
  }

  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([definitionId, total]) => ({
      definitionId,
      playCount: total.playCount,
      playedRunCount: total.playedRunIds.size,
      playRate: ratio(total.playedRunIds.size, runCount),
      playsPerRun: average(total.playCount, runCount),
    }));
}

function createCardPickRates(
  runs: readonly SlayLikeSimulationRun[],
  runCount: number,
): readonly SlayLikeCardPickRate[] {
  const totals = new Map<string, number>();

  for (const run of runs) {
    if (!run.pickedCardDefinitionId) {
      continue;
    }

    totals.set(run.pickedCardDefinitionId, (totals.get(run.pickedCardDefinitionId) ?? 0) + 1);
  }

  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([definitionId, pickCount]) => ({
      definitionId,
      pickCount,
      pickRate: ratio(pickCount, runCount),
    }));
}

function createResourceCurves(
  simulations: readonly SlayLikeSimulationArtifact[],
): readonly SlayLikeResourceCurve[] {
  const points = new Map<string, ResourcePointAccumulator>();

  for (const simulation of simulations) {
    for (const resource of readAllResourceValues(simulation.initialState)) {
      addResourcePoint(points, {
        ...resource,
        step: 0,
      });
    }

    for (const [eventIndex, event] of simulation.events.entries()) {
      if (event.type !== RESOURCE_CHANGED_EVENT_TYPE) {
        continue;
      }

      const playerId = readEventPayloadString(event, "playerId");
      const resourceId = readEventPayloadString(event, "resourceId");
      const value = readEventPayloadNumber(event, "nextValue");

      if (!playerId || !resourceId || value === undefined) {
        continue;
      }

      addResourcePoint(points, {
        playerId,
        resourceId,
        value,
        step: eventIndex + 1,
      });
    }
  }

  const curves = new Map<string, SlayLikeResourceCurvePoint[]>();
  const orderedPoints = [...points.values()].sort(compareResourcePoints);

  for (const point of orderedPoints) {
    const key = resourceCurveKey(point.playerId, point.resourceId);
    const curve = curves.get(key) ?? [];
    curve.push({
      step: point.step,
      averageValue: average(point.sum, point.sampleCount),
      sampleCount: point.sampleCount,
    });
    curves.set(key, curve);
  }

  return [...curves.entries()].map(([key, curvePoints]) => {
    const [playerId = "", resourceId = ""] = key.split("\u0000");

    return {
      playerId,
      resourceId,
      points: curvePoints,
    };
  });
}

function createDeathNodeDistribution(
  runs: readonly SlayLikeSimulationRun[],
  runCount: number,
): readonly SlayLikeDeathNodeBucket[] {
  const totals = new Map<string, number>();

  for (const run of runs) {
    if (!run.deathNodeId) {
      continue;
    }

    totals.set(run.deathNodeId, (totals.get(run.deathNodeId) ?? 0) + 1);
  }

  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([nodeId, count]) => ({
      nodeId,
      count,
      rate: ratio(count, runCount),
    }));
}

function countObservedTurns(
  initialState: GameState,
  finalState: GameState,
  events: readonly RuleEvent[],
): number {
  const initialTurnCount = initialState.phase === SLAY_LIKE_PHASES.playerTurn ? 1 : 0;
  const startedTurnCount = events.filter((event) => event.type === "SlayPlayerTurnStarted").length;

  return Math.max(finalState.turn, initialTurnCount + startedTurnCount);
}

function readPlayedCardDefinitionIds(
  commands: readonly Command[],
  initialState: GameState,
  finalState: GameState,
): readonly string[] {
  return commands.flatMap((command) => {
    if (command.type !== SLAY_LIKE_COMMANDS.playCard) {
      return [];
    }

    const cardObjectId = readCommandPayloadString(command, "cardId");
    const definitionId = cardObjectId
      ? findObjectDefinitionId(cardObjectId, [initialState, finalState])
      : undefined;

    return definitionId ? [definitionId] : [];
  });
}

function readPickedCardDefinitionId(
  commands: readonly Command[],
  initialState: GameState,
  finalState: GameState,
): string | undefined {
  const rewardCommand = findLastCommandOfType(commands, SLAY_LIKE_COMMANDS.chooseReward);
  const rewardObjectId = rewardCommand
    ? readCommandPayloadString(rewardCommand, "rewardObjectId")
    : undefined;

  return rewardObjectId
    ? findObjectDefinitionId(rewardObjectId, [finalState, initialState])
    : undefined;
}

function findLastCommandOfType(commands: readonly Command[], type: string): Command | undefined {
  for (let index = commands.length - 1; index >= 0; index -= 1) {
    const command = commands[index];
    if (command?.type === type) {
      return command;
    }
  }

  return undefined;
}

function readSortedPlayerResources(
  state: GameState,
  playerId: string,
): Readonly<Record<string, number>> {
  const values = state.resources[playerId]?.values ?? {};

  return Object.fromEntries(
    Object.entries(values)
      .filter((entry): entry is [string, number] => typeof entry[1] === "number")
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function readAllResourceValues(
  state: GameState,
): readonly { readonly playerId: string; readonly resourceId: string; readonly value: number }[] {
  return Object.values(state.resources)
    .flatMap((resourceState) =>
      Object.entries(resourceState.values).map(([resourceId, value]) => ({
        playerId: resourceState.playerId,
        resourceId,
        value,
      })),
    )
    .filter(
      (resource): resource is { playerId: string; resourceId: string; value: number } =>
        typeof resource.value === "number",
    )
    .sort(
      (left, right) =>
        left.playerId.localeCompare(right.playerId) ||
        left.resourceId.localeCompare(right.resourceId),
    );
}

function findObjectDefinitionId(
  objectId: string,
  states: readonly GameState[],
): string | undefined {
  for (const state of states) {
    const object = state.objects[objectId];
    if (object) {
      return object.definitionId;
    }
  }

  return undefined;
}

function readCommandPayloadString(command: Command, key: string): string | undefined {
  const value = command.payload[key];

  return typeof value === "string" ? value : undefined;
}

function readEventPayloadString(event: RuleEvent, key: string): string | undefined {
  const value = event.payload[key];

  return typeof value === "string" ? value : undefined;
}

function readEventPayloadNumber(event: RuleEvent, key: string): number | undefined {
  const value = event.payload[key];

  return typeof value === "number" ? value : undefined;
}

function addResourcePoint(
  points: Map<string, ResourcePointAccumulator>,
  input: {
    readonly playerId: string;
    readonly resourceId: string;
    readonly value: number;
    readonly step: number;
  },
): void {
  const key = `${resourceCurveKey(input.playerId, input.resourceId)}\u0000${input.step}`;
  const point = points.get(key) ?? {
    playerId: input.playerId,
    resourceId: input.resourceId,
    step: input.step,
    sum: 0,
    sampleCount: 0,
  };

  point.sum += input.value;
  point.sampleCount += 1;
  points.set(key, point);
}

function compareResourcePoints(
  left: ResourcePointAccumulator,
  right: ResourcePointAccumulator,
): number {
  return (
    left.playerId.localeCompare(right.playerId) ||
    left.resourceId.localeCompare(right.resourceId) ||
    left.step - right.step
  );
}

function resourceCurveKey(playerId: string, resourceId: string): string {
  return `${playerId}\u0000${resourceId}`;
}

function ratio(count: number, total: number): number {
  return total === 0 ? 0 : roundMetric(count / total);
}

function average(sum: number, total: number): number {
  return total === 0 ? 0 : roundMetric(sum / total);
}

function roundMetric(value: number): number {
  return Number(value.toFixed(6));
}

function assertPositiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}
