import { readFileSync } from "node:fs";

import type { Command } from "@ucre/core";
import { runReplay } from "@ucre/replay";
import { describe, expect, it } from "vitest";

import {
  BLACKJACK_LIKE_FLAGS,
  BLACKJACK_LIKE_PHASES,
  BLACKJACK_LIKE_RESOURCES,
  BLACKJACK_LIKE_RULES_VERSION,
  BLACKJACK_LIKE_ZONES,
  createBlackjackLikeCommandRegistry,
  createBlackjackLikeEffectRegistry,
  createBlackjackLikeRound,
  getBlackjackLikeHandValue,
} from "./blackjack-like.js";

interface BlackjackLikeReplayFixture {
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

const standReplay = JSON.parse(
  readFileSync(new URL("../fixtures/blackjack-like-stand-replay.json", import.meta.url), "utf8"),
) as BlackjackLikeReplayFixture;

describe("blackjack-like stand replay", () => {
  it("replays a deterministic dealer-policy round to stable hashes", () => {
    expect(standReplay.input.rulesVersion).toBe(BLACKJACK_LIKE_RULES_VERSION);

    const result = runReplay({
      ...standReplay.input,
      initialState: createBlackjackLikeRound({
        gameId: standReplay.input.gameId,
        seed: standReplay.input.seed,
        contentManifestHash: standReplay.input.contentManifestHash,
      }),
      commandRegistry: createBlackjackLikeCommandRegistry(),
      effectRegistry: createBlackjackLikeEffectRegistry(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Blackjack-like replay unexpectedly failed.");
    }

    expect(result.commandHash).toBe(standReplay.expected.commandHash);
    expect(result.stateHash).toBe(standReplay.expected.stateHash);
    expect(result.eventHash).toBe(standReplay.expected.eventHash);
    expect(result.replayHash).toBe(standReplay.expected.replayHash);
    expect(result.finalState.phase).toBe(BLACKJACK_LIKE_PHASES.complete);
    expect(result.finalState.flags[BLACKJACK_LIKE_FLAGS.outcome]).toBe("dealerWin");
    expect(result.finalState.zones[BLACKJACK_LIKE_ZONES.playerHand]?.objectIds).toEqual([
      "blackjack-card-clubs-a",
      "blackjack-card-clubs-3",
    ]);
    expect(result.finalState.zones[BLACKJACK_LIKE_ZONES.dealerHand]?.objectIds).toEqual([
      "blackjack-card-clubs-2",
      "blackjack-card-clubs-4",
      "blackjack-card-clubs-5",
      "blackjack-card-clubs-6",
    ]);
    expect(
      getBlackjackLikeHandValue(result.finalState, BLACKJACK_LIKE_ZONES.dealerHand),
    ).toMatchObject({
      bestTotal: 17,
      isBust: false,
    });
    expect(result.finalState.resources["player-1"]?.values[BLACKJACK_LIKE_RESOURCES.chips]).toBe(
      100,
    );
  });
});
