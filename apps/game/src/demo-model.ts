import type { GameState, PresentationIntent } from "@ucre/core";
import { createBeatSchedule } from "@ucre/presentation-core";
import {
  SLAY_LIKE_ENEMY_DEFINITIONS,
  SLAY_LIKE_FLAGS,
  SLAY_LIKE_PHASES,
  SLAY_LIKE_ZONES,
  createSlayLikeEncounter,
  type SlayLikeEnemyDefinition,
} from "@ucre/rulesets";

export type DemoScenarioId = "starter" | "boss" | "run";
export type PlaybackMode = "normal" | "fast";
export type BossMomentStatus = "inactive" | "active" | "defeated";

export interface DemoScenario {
  readonly id: DemoScenarioId;
  readonly label: string;
  readonly eyebrow: string;
  readonly gameId: string;
  readonly seed: string;
  readonly summary: string;
}

export interface BossMoment {
  readonly status: BossMomentStatus;
  readonly label: string;
  readonly summary: string;
  readonly hitPoints?: number;
}

export const DEMO_SCENARIOS: Readonly<Record<DemoScenarioId, DemoScenario>> = {
  starter: {
    id: "starter",
    label: "Starter",
    eyebrow: "Rule Shell",
    gameId: "slay-shell-1",
    seed: "game-shell-seed-1",
    summary: "Jaw Worm encounter",
  },
  boss: {
    id: "boss",
    label: "Boss",
    eyebrow: "Phase 10 Demo",
    gameId: "slay-boss-demo-1",
    seed: "boss-demo-seed-1",
    summary: "Hexaghost showcase",
  },
  run: {
    id: "run",
    label: "Run",
    eyebrow: "Playable Run",
    gameId: "slay-run-demo-encounter-1",
    seed: "run-demo-seed-1",
    summary: "Short act route",
  },
};

export const DEMO_SCENARIO_LIST: readonly DemoScenario[] = [
  DEMO_SCENARIOS.starter,
  DEMO_SCENARIOS.boss,
  DEMO_SCENARIOS.run,
];

const BOSS_OBJECT_ID = "enemy-hexaghost";
const FAST_BEAT_DURATION_MS = 64;
const NORMAL_BEAT_DURATION_MS = 240;

export function createDemoShellState(scenarioId: DemoScenarioId): GameState {
  const scenario = DEMO_SCENARIOS[scenarioId];

  if (scenarioId === "boss") {
    return createSlayLikeEncounter({
      gameId: scenario.gameId,
      seed: scenario.seed,
      contentManifestHash: "slay-like-phase10-boss-demo",
      enemies: [requireSlayLikeEnemyDefinition("hexaghost")],
      starterDeck: [
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
      ],
    });
  }

  if (scenarioId === "run") {
    return createSlayLikeEncounter({
      gameId: scenario.gameId,
      seed: scenario.seed,
      contentManifestHash: "slay-like-phase10-run-demo",
      enemies: [requireSlayLikeEnemyDefinition("acidSlime")],
      starterDeck: [
        {
          id: "heavy-strike-1",
          definitionId: "heavyStrike",
        },
      ],
    });
  }

  return createSlayLikeEncounter({
    gameId: scenario.gameId,
    seed: scenario.seed,
  });
}

export function createDemoBeatSchedule(
  intents: readonly PresentationIntent[],
  playbackMode: PlaybackMode,
) {
  return createBeatSchedule(intents, {
    defaultDurationMs: playbackMode === "fast" ? FAST_BEAT_DURATION_MS : NORMAL_BEAT_DURATION_MS,
    gapMs: playbackMode === "fast" ? 0 : 20,
    trackBy: "kind",
  });
}

export function getBossMoment(state: GameState): BossMoment {
  const isBossState = state.id === DEMO_SCENARIOS.boss.gameId || state.id.includes("hexaghost");

  if (!isBossState) {
    return {
      status: "inactive",
      label: "No boss",
      summary: "Starter encounter",
    };
  }

  const boss = state.objects[BOSS_OBJECT_ID];
  const bossInEnemyZone =
    state.zones[SLAY_LIKE_ZONES.enemy]?.objectIds.includes(BOSS_OBJECT_ID) ?? false;
  const hitPoints = boss ? readNumberAttribute(boss, "hp") : 0;

  if (boss && bossInEnemyZone && hitPoints > 0) {
    return {
      status: "active",
      label: "Hexaghost",
      summary: "Boss encounter active",
      hitPoints,
    };
  }

  if (
    state.phase === SLAY_LIKE_PHASES.reward ||
    state.phase === SLAY_LIKE_PHASES.complete ||
    state.flags[SLAY_LIKE_FLAGS.encounterComplete] === true
  ) {
    return {
      status: "defeated",
      label: "Hexaghost defeated",
      summary: "Boss reward opened",
      hitPoints: 0,
    };
  }

  return {
    status: "active",
    label: "Hexaghost",
    summary: "Boss encounter resolving",
    hitPoints,
  };
}

function requireSlayLikeEnemyDefinition(id: string): SlayLikeEnemyDefinition {
  const enemy = SLAY_LIKE_ENEMY_DEFINITIONS[id];

  if (!enemy) {
    throw new Error(`Missing Slay-like enemy definition: ${id}.`);
  }

  return enemy;
}

function readNumberAttribute(
  object: { readonly attributes: Readonly<Record<string, unknown>> },
  attribute: string,
) {
  const value = object.attributes[attribute];

  return typeof value === "number" ? value : 0;
}
