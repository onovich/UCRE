import type { Command, GameState, PresentationIntent } from "@ucre/core";
import {
  SLAY_LIKE_COMMANDS,
  SLAY_LIKE_PHASES,
  SLAY_LIKE_ZONES,
  executeSlayLikeCommand,
} from "@ucre/rulesets";
import { describe, expect, it } from "vitest";

import {
  DEMO_SCENARIO_LIST,
  createDemoBeatSchedule,
  createDemoShellState,
  getBossMoment,
} from "./demo-model.js";

const PLAYER_ID = "player-1";

describe("game demo model", () => {
  it("exposes starter, boss, and run scenarios to the UI", () => {
    expect(DEMO_SCENARIO_LIST.map((scenario) => scenario.id)).toEqual(["starter", "boss", "run"]);
  });

  it("creates a Phase 10 boss scenario with Hexaghost and a scripted starter deck", () => {
    const state = createDemoShellState("boss");

    expect(state.id).toBe("slay-boss-demo-1");
    expect(state.contentManifestHash).toBe("slay-like-phase10-boss-demo");
    expect(state.zones[SLAY_LIKE_ZONES.enemy]?.objectIds).toEqual(["enemy-hexaghost"]);
    expect(state.zones[SLAY_LIKE_ZONES.drawPile]?.objectIds.slice(0, 5)).toEqual([
      "uppercut-1",
      "slice-1",
      "quick-strike-1",
      "strike-1",
      "defend-1",
    ]);
    expect(getBossMoment(state)).toMatchObject({
      status: "active",
      label: "Hexaghost",
      hitPoints: 50,
    });
  });

  it("keeps fast mode presentation scheduling shorter without changing intents", () => {
    const intents: PresentationIntent[] = [
      {
        id: "intent-1",
        eventId: "event-1",
        type: "ucre.test.intent",
        payload: {},
      },
      {
        id: "intent-2",
        eventId: "event-2",
        type: "ucre.test.intent",
        payload: {},
      },
    ];
    const normal = createDemoBeatSchedule(intents, "normal");
    const fast = createDemoBeatSchedule(intents, "fast");

    expect(normal.beats).toHaveLength(2);
    expect(fast.beats.map((beat) => beat.intentId)).toEqual(["intent-1", "intent-2"]);
    expect(fast.totalDurationMs).toBeLessThan(normal.totalDurationMs);
  });

  it("detects the boss defeated moment after scripted command dispatch", () => {
    let state = createDemoShellState("boss");

    for (const command of createBossDefeatCommands()) {
      state = dispatchOrThrow(state, command);
    }

    expect(state.phase).toBe(SLAY_LIKE_PHASES.reward);
    expect(state.zones[SLAY_LIKE_ZONES.enemy]?.objectIds).toEqual([]);
    expect(getBossMoment(state)).toMatchObject({
      status: "defeated",
      label: "Hexaghost defeated",
      hitPoints: 0,
    });
  });
});

function createBossDefeatCommands(): readonly Command[] {
  return [
    {
      id: "boss-command-1",
      type: SLAY_LIKE_COMMANDS.drawCards,
      playerId: PLAYER_ID,
      payload: {
        count: 5,
      },
    },
    createPlayCommand("boss-command-2", "uppercut-1"),
    createPlayCommand("boss-command-3", "slice-1"),
    createPlayCommand("boss-command-4", "quick-strike-1"),
    createPlayCommand("boss-command-5", "strike-1"),
    {
      id: "boss-command-6",
      type: SLAY_LIKE_COMMANDS.endTurn,
      playerId: PLAYER_ID,
      payload: {},
    },
    createPlayCommand("boss-command-7", "uppercut-2"),
    createPlayCommand("boss-command-8", "slice-2"),
    createPlayCommand("boss-command-9", "quick-strike-2"),
    createPlayCommand("boss-command-10", "strike-2"),
  ];
}

function createPlayCommand(id: string, cardId: string): Command {
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

function dispatchOrThrow(state: GameState, command: Command): GameState {
  const result = executeSlayLikeCommand({
    state,
    command,
  });

  if (!result.ok) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  return result.state;
}
