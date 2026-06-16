import { readFileSync } from "node:fs";

import {
  GAIN_RESOURCE_EFFECT_TYPE,
  SPEND_RESOURCE_EFFECT_TYPE,
  type Command,
  type CommandRegistry,
} from "@ucre/core";
import { describe, expect, it } from "vitest";

import { runReplay } from "./index.js";

interface GoldenReplayFixture {
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

const golden = JSON.parse(
  readFileSync(new URL("../fixtures/golden-basic-replay.json", import.meta.url), "utf8"),
) as GoldenReplayFixture;

describe("replay runner", () => {
  it("replays a command log to stable state and event hashes", () => {
    const result = runReplay({
      ...golden.input,
      commandRegistry: createGoldenCommandRegistry(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("runReplay unexpectedly failed.");
    }

    expect(result.commandHash).toBe(golden.expected.commandHash);
    expect(result.stateHash).toBe(golden.expected.stateHash);
    expect(result.eventHash).toBe(golden.expected.eventHash);
    expect(result.replayHash).toBe(golden.expected.replayHash);
    expect(result.finalState.resources["player-1"]?.values.energy).toBe(2);
  });
});

function createGoldenCommandRegistry(): CommandRegistry {
  return {
    GainEnergy: {
      getEffects: (_state, command) => [
        {
          id: "gain-energy",
          type: GAIN_RESOURCE_EFFECT_TYPE,
          payload: {
            playerId: command.playerId,
            resourceId: "energy",
            amount: readNumber(command, "amount"),
          },
        },
      ],
    },
    SpendEnergy: {
      getEffects: (_state, command) => [
        {
          id: "spend-energy",
          type: SPEND_RESOURCE_EFFECT_TYPE,
          payload: {
            playerId: command.playerId,
            resourceId: "energy",
            amount: readNumber(command, "amount"),
          },
        },
      ],
    },
  };
}

function readNumber(command: Command, key: string): number {
  const value = command.payload[key];

  if (typeof value !== "number") {
    throw new Error(`Expected command payload key ${key} to be a number.`);
  }

  return value;
}
