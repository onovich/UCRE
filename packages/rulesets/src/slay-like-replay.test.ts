import { readFileSync } from "node:fs";

import type { Command } from "@ucre/core";
import { runReplay } from "@ucre/replay";
import { describe, expect, it } from "vitest";

import {
  SLAY_LIKE_PHASES,
  SLAY_LIKE_RULES_VERSION,
  SLAY_LIKE_ZONES,
  createSlayLikeCommandRegistry,
  createSlayLikeEffectRegistry,
  createSlayLikeEncounter,
} from "./slay-like.js";

interface SlayLikeReplayFixture {
  readonly input: {
    readonly gameId: string;
    readonly seed: string;
    readonly rulesVersion: string;
    readonly contentManifestHash: string;
    readonly commands: readonly Command[];
  };
  readonly expected: {
    readonly commandHash: string;
    readonly stateHash: string;
    readonly eventHash: string;
    readonly replayHash: string;
  };
}

const completedEncounterReplay = JSON.parse(
  readFileSync(new URL("../fixtures/slay-like-completed-replay.json", import.meta.url), "utf8"),
) as SlayLikeReplayFixture;

describe("slay-like completed encounter replay", () => {
  it("replays a completed encounter to stable hashes", () => {
    expect(completedEncounterReplay.input.rulesVersion).toBe(SLAY_LIKE_RULES_VERSION);

    const result = runReplay({
      ...completedEncounterReplay.input,
      initialState: createSlayLikeEncounter({
        gameId: completedEncounterReplay.input.gameId,
        seed: completedEncounterReplay.input.seed,
        contentManifestHash: completedEncounterReplay.input.contentManifestHash,
      }),
      commandRegistry: createSlayLikeCommandRegistry(),
      effectRegistry: createSlayLikeEffectRegistry(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Slay-like replay unexpectedly failed.");
    }

    expect(result.commandHash).toBe(completedEncounterReplay.expected.commandHash);
    expect(result.stateHash).toBe(completedEncounterReplay.expected.stateHash);
    expect(result.eventHash).toBe(completedEncounterReplay.expected.eventHash);
    expect(result.replayHash).toBe(completedEncounterReplay.expected.replayHash);
    expect(result.finalState.phase).toBe(SLAY_LIKE_PHASES.complete);
    expect(result.finalState.zones[SLAY_LIKE_ZONES.discardPile]?.objectIds).toEqual([
      "strike-1",
      "strike-2",
      "reward-card-iron-wave",
    ]);
  });
});
