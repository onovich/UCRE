import { hashGameState } from "@ucre/core";
import { describe, expect, it } from "vitest";

import {
  BLACKJACK_LIKE_CONTENT_MANIFEST_HASH,
  BLACKJACK_LIKE_FLAGS,
  BLACKJACK_LIKE_PHASES,
  BLACKJACK_LIKE_RESOURCES,
  BLACKJACK_LIKE_RULES_VERSION,
  BLACKJACK_LIKE_ZONES,
  blackjackRankValue,
  createBlackjackLikeRound,
  createStandardBlackjackShoe,
} from "./blackjack-like.js";

describe("blackjack-like setup", () => {
  it("creates deterministic zones, resources, and a standard shoe", () => {
    const state = createBlackjackLikeRound({
      gameId: "blackjack-round-1",
      seed: "blackjack-seed-1",
    });
    const repeat = createBlackjackLikeRound({
      gameId: "blackjack-round-1",
      seed: "blackjack-seed-1",
    });

    expect(state.rulesVersion).toBe(BLACKJACK_LIKE_RULES_VERSION);
    expect(state.contentManifestHash).toBe(BLACKJACK_LIKE_CONTENT_MANIFEST_HASH);
    expect(state.phase).toBe(BLACKJACK_LIKE_PHASES.betting);
    expect(state.activePlayerId).toBe("player-1");
    expect(state.flags[BLACKJACK_LIKE_FLAGS.roundStarted]).toBe(true);
    expect(state.resources["player-1"]?.values).toEqual({
      [BLACKJACK_LIKE_RESOURCES.chips]: 100,
      [BLACKJACK_LIKE_RESOURCES.currentBet]: 0,
      [BLACKJACK_LIKE_RESOURCES.suspicion]: 0,
    });
    expect(state.zones[BLACKJACK_LIKE_ZONES.shoe]?.objectIds).toHaveLength(52);
    expect(state.zones[BLACKJACK_LIKE_ZONES.playerHand]?.objectIds).toEqual([]);
    expect(state.zones[BLACKJACK_LIKE_ZONES.dealerHand]?.objectIds).toEqual([]);
    expect(state.zones[BLACKJACK_LIKE_ZONES.discard]?.objectIds).toEqual([]);
    expect(state.zones[BLACKJACK_LIKE_ZONES.wager]?.objectIds).toEqual([]);
    expect(state.objects["blackjack-card-spades-a"]).toMatchObject({
      id: "blackjack-card-spades-a",
      definitionId: "standard-playing-card",
      ownerId: "dealer",
      zoneId: BLACKJACK_LIKE_ZONES.shoe,
      visibility: "hidden",
      facing: "down",
      attributes: {
        suit: "spades",
        rank: "A",
        value: 11,
        isAce: true,
      },
    });
    expect(hashGameState(state)).toBe(hashGameState(repeat));
  });

  it("allows deterministic table identity and resource overrides", () => {
    const state = createBlackjackLikeRound({
      gameId: "blackjack-round-custom",
      seed: "blackjack-seed-custom",
      contentManifestHash: "ucre1-blackjack-test-content",
      playerId: "player-custom",
      dealerId: "dealer-custom",
      startingChips: 250,
      currentBet: 10,
      suspicion: 2,
    });

    expect(state.activePlayerId).toBe("player-custom");
    expect(state.contentManifestHash).toBe("ucre1-blackjack-test-content");
    expect(state.resources["player-custom"]?.values).toEqual({
      [BLACKJACK_LIKE_RESOURCES.chips]: 250,
      [BLACKJACK_LIKE_RESOURCES.currentBet]: 10,
      [BLACKJACK_LIKE_RESOURCES.suspicion]: 2,
    });
    expect(state.zones[BLACKJACK_LIKE_ZONES.shoe]?.ownerId).toBe("dealer-custom");
    expect(state.objects["blackjack-card-clubs-10"]?.ownerId).toBe("dealer-custom");
  });

  it("models blackjack rank values for the standard shoe", () => {
    const shoe = createStandardBlackjackShoe();

    expect(shoe).toHaveLength(52);
    expect(new Set(shoe.map((card) => card.id))).toHaveLength(52);
    expect(blackjackRankValue("A")).toBe(11);
    expect(blackjackRankValue("K")).toBe(10);
    expect(blackjackRankValue("7")).toBe(7);
  });
});
