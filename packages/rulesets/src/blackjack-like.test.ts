import { hashGameState } from "@ucre/core";
import { describe, expect, it } from "vitest";

import {
  BLACKJACK_LIKE_CONTENT_MANIFEST_HASH,
  BLACKJACK_LIKE_COMMANDS,
  BLACKJACK_LIKE_EVENTS,
  BLACKJACK_LIKE_FLAGS,
  BLACKJACK_LIKE_PHASES,
  BLACKJACK_LIKE_RESOURCES,
  BLACKJACK_LIKE_RULES_VERSION,
  BLACKJACK_LIKE_ZONES,
  blackjackRankValue,
  createBlackjackLikeRound,
  createStandardBlackjackShoe,
  executeBlackjackLikeCommand,
  getBlackjackLikeHandValue,
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

  it("deals the initial table through command dispatch", () => {
    const result = executeBlackjackLikeCommand({
      state: createBlackjackLikeRound({
        gameId: "blackjack-round-deal",
        seed: "blackjack-seed-deal",
      }),
      command: {
        id: "deal-initial",
        type: BLACKJACK_LIKE_COMMANDS.dealInitial,
        playerId: "player-1",
        payload: {},
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Blackjack initial deal unexpectedly failed.");
    }

    expect(result.state.phase).toBe(BLACKJACK_LIKE_PHASES.playerTurn);
    expect(result.state.zones[BLACKJACK_LIKE_ZONES.shoe]?.objectIds).toHaveLength(48);
    expect(result.state.zones[BLACKJACK_LIKE_ZONES.playerHand]?.objectIds).toEqual([
      "blackjack-card-clubs-a",
      "blackjack-card-clubs-3",
    ]);
    expect(result.state.zones[BLACKJACK_LIKE_ZONES.dealerHand]?.objectIds).toEqual([
      "blackjack-card-clubs-2",
      "blackjack-card-clubs-4",
    ]);
    expect(result.events.map((event) => event.type)).toContain(BLACKJACK_LIKE_EVENTS.phaseChanged);
    expect(getBlackjackLikeHandValue(result.state, BLACKJACK_LIKE_ZONES.playerHand)).toMatchObject({
      rawTotal: 14,
      bestTotal: 14,
      isSoft: true,
      isBust: false,
    });
  });

  it("hits the player hand and evaluates bust state deterministically", () => {
    let state = createBlackjackLikeRound({
      gameId: "blackjack-round-hit",
      seed: "blackjack-seed-hit",
    });
    const deal = executeBlackjackLikeCommand({
      state,
      command: {
        id: "deal-initial",
        type: BLACKJACK_LIKE_COMMANDS.dealInitial,
        playerId: "player-1",
        payload: {},
      },
    });
    if (!deal.ok) {
      throw new Error("Blackjack initial deal unexpectedly failed.");
    }
    state = deal.state;

    for (const commandId of ["hit-1", "hit-2", "hit-3"]) {
      const hit = executeBlackjackLikeCommand({
        state,
        command: {
          id: commandId,
          type: BLACKJACK_LIKE_COMMANDS.hit,
          playerId: "player-1",
          payload: {},
        },
      });
      expect(hit.ok).toBe(true);
      if (!hit.ok) {
        throw new Error(`Blackjack hit ${commandId} unexpectedly failed.`);
      }
      state = hit.state;
    }

    expect(state.phase).toBe(BLACKJACK_LIKE_PHASES.bust);
    expect(state.flags[BLACKJACK_LIKE_FLAGS.playerBust]).toBe(true);
    expect(state.flags[BLACKJACK_LIKE_FLAGS.outcome]).toBe("dealerWin");
    expect(getBlackjackLikeHandValue(state, BLACKJACK_LIKE_ZONES.playerHand)).toMatchObject({
      bestTotal: 22,
      isBust: true,
    });
  });

  it("stands, resolves dealer policy to 17 or more, and settles resources", () => {
    let state = createBlackjackLikeRound({
      gameId: "blackjack-round-stand",
      seed: "blackjack-seed-stand",
      currentBet: 10,
    });
    const deal = executeBlackjackLikeCommand({
      state,
      command: {
        id: "deal-initial",
        type: BLACKJACK_LIKE_COMMANDS.dealInitial,
        playerId: "player-1",
        payload: {},
      },
    });
    if (!deal.ok) {
      throw new Error("Blackjack initial deal unexpectedly failed.");
    }
    state = deal.state;

    const stand = executeBlackjackLikeCommand({
      state,
      command: {
        id: "stand",
        type: BLACKJACK_LIKE_COMMANDS.stand,
        playerId: "player-1",
        payload: {},
      },
    });

    expect(stand.ok).toBe(true);
    if (!stand.ok) {
      throw new Error("Blackjack stand unexpectedly failed.");
    }

    expect(stand.state.phase).toBe(BLACKJACK_LIKE_PHASES.complete);
    expect(stand.state.flags[BLACKJACK_LIKE_FLAGS.playerStood]).toBe(true);
    expect(stand.state.flags[BLACKJACK_LIKE_FLAGS.outcome]).toBe("dealerWin");
    expect(stand.state.zones[BLACKJACK_LIKE_ZONES.dealerHand]?.objectIds).toEqual([
      "blackjack-card-clubs-2",
      "blackjack-card-clubs-4",
      "blackjack-card-clubs-5",
      "blackjack-card-clubs-6",
    ]);
    expect(getBlackjackLikeHandValue(stand.state, BLACKJACK_LIKE_ZONES.dealerHand)).toMatchObject({
      bestTotal: 17,
      isBust: false,
    });
    expect(stand.state.resources["player-1"]?.values).toMatchObject({
      [BLACKJACK_LIKE_RESOURCES.chips]: 90,
      [BLACKJACK_LIKE_RESOURCES.currentBet]: 0,
    });
    expect(stand.events.at(-1)?.type).toBe(BLACKJACK_LIKE_EVENTS.dealerPolicyResolved);
  });

  it("rejects blackjack commands in the wrong phase", () => {
    const result = executeBlackjackLikeCommand({
      state: createBlackjackLikeRound({
        gameId: "blackjack-round-invalid",
        seed: "blackjack-seed-invalid",
      }),
      command: {
        id: "hit-before-deal",
        type: BLACKJACK_LIKE_COMMANDS.hit,
        playerId: "player-1",
        payload: {},
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Blackjack invalid hit unexpectedly succeeded.");
    }
    expect(result.errors).toEqual([
      {
        code: "BLACKJACK_INVALID_PHASE",
        message: "Blackjack command blackjack.hit requires phase playerTurn.",
        details: {
          commandId: "hit-before-deal",
          expectedPhase: BLACKJACK_LIKE_PHASES.playerTurn,
          phase: BLACKJACK_LIKE_PHASES.betting,
        },
      },
    ]);
  });
});
