import { readFileSync } from "node:fs";

import type { Command } from "@ucre/core";
import { runReplay } from "@ucre/replay";
import { describe, expect, it } from "vitest";

import {
  SACRIFICE_BOARD_FLAGS,
  SACRIFICE_BOARD_OBJECTIVES,
  SACRIFICE_BOARD_PHASES,
  SACRIFICE_BOARD_RESOURCES,
  SACRIFICE_BOARD_RULES_VERSION,
  createSacrificeBoardCommandRegistry,
  createSacrificeBoardEffectRegistry,
  createSacrificeBoardGame,
} from "./sacrifice-board.js";
import type { SacrificeBoardCardInstance } from "./sacrifice-board.js";

interface SacrificeBoardReplayFixture {
  readonly input: {
    readonly gameId: string;
    readonly seed: string;
    readonly rulesVersion: string;
    readonly contentManifestHash: string;
    readonly initial: {
      readonly scaleTarget: number;
      readonly startingBoard: readonly SacrificeBoardCardInstance[];
    };
    readonly commands: readonly Command[];
  };
  readonly expected: {
    readonly commandHash: string;
    readonly stateHash: string;
    readonly eventHash: string;
    readonly replayHash: string;
  };
}

const scaleReplay = JSON.parse(
  readFileSync(new URL("../fixtures/sacrifice-board-scale-replay.json", import.meta.url), "utf8"),
) as SacrificeBoardReplayFixture;

describe("sacrifice-board scale replay", () => {
  it("replays lane combat to a completed scale objective with stable hashes", () => {
    expect(scaleReplay.input.rulesVersion).toBe(SACRIFICE_BOARD_RULES_VERSION);

    const result = runReplay({
      gameId: scaleReplay.input.gameId,
      seed: scaleReplay.input.seed,
      rulesVersion: scaleReplay.input.rulesVersion,
      contentManifestHash: scaleReplay.input.contentManifestHash,
      commands: scaleReplay.input.commands,
      initialState: createSacrificeBoardGame({
        gameId: scaleReplay.input.gameId,
        seed: scaleReplay.input.seed,
        contentManifestHash: scaleReplay.input.contentManifestHash,
        scaleTarget: scaleReplay.input.initial.scaleTarget,
        startingBoard: scaleReplay.input.initial.startingBoard,
      }),
      commandRegistry: createSacrificeBoardCommandRegistry(),
      effectRegistry: createSacrificeBoardEffectRegistry(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Sacrifice-board replay unexpectedly failed.");
    }

    expect(result.commandHash).toBe(scaleReplay.expected.commandHash);
    expect(result.stateHash).toBe(scaleReplay.expected.stateHash);
    expect(result.eventHash).toBe(scaleReplay.expected.eventHash);
    expect(result.replayHash).toBe(scaleReplay.expected.replayHash);
    expect(result.finalState.phase).toBe(SACRIFICE_BOARD_PHASES.complete);
    expect(result.finalState.flags[SACRIFICE_BOARD_FLAGS.scaleVictory]).toBe(true);
    expect(result.finalState.resources["player-1"]?.values[SACRIFICE_BOARD_RESOURCES.scale]).toBe(
      4,
    );
    expect(
      result.finalState.objectives.find(
        (objective) => objective.id === SACRIFICE_BOARD_OBJECTIVES.tipScale,
      )?.status,
    ).toBe("succeeded");
  });
});
