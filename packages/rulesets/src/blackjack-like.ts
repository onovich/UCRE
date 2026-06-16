import {
  createGameObject,
  createInitialGameState,
  createZone,
  putGameObjectInZone,
  putZone,
} from "@ucre/core";
import type { GameState, JsonObject, PlayerId } from "@ucre/core";

export const BLACKJACK_LIKE_RULESET_ID = "blackjack-like";
export const BLACKJACK_LIKE_RULES_VERSION = "blackjack-like-0";
export const BLACKJACK_LIKE_CONTENT_MANIFEST_HASH = "blackjack-like-inline-content-0";

export const BLACKJACK_LIKE_PHASES = {
  setup: "setup",
  betting: "betting",
  playerTurn: "playerTurn",
  dealerTurn: "dealerTurn",
  settlement: "settlement",
  complete: "complete",
  bust: "bust",
} as const;

export const BLACKJACK_LIKE_ZONES = {
  shoe: "dealer.shoe",
  playerHand: "player.hand",
  dealerHand: "dealer.hand",
  discard: "dealer.discard",
  wager: "player.wager",
} as const;

export const BLACKJACK_LIKE_RESOURCES = {
  chips: "chips",
  currentBet: "currentBet",
  suspicion: "suspicion",
} as const;

export const BLACKJACK_LIKE_FLAGS = {
  roundStarted: "blackjack.roundStarted",
} as const;

export const BLACKJACK_LIKE_SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
export const BLACKJACK_LIKE_RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;

export type BlackjackLikeSuit = (typeof BLACKJACK_LIKE_SUITS)[number];
export type BlackjackLikeRank = (typeof BLACKJACK_LIKE_RANKS)[number];

export interface BlackjackLikeCardDefinition {
  readonly id: string;
  readonly suit: BlackjackLikeSuit;
  readonly rank: BlackjackLikeRank;
  readonly value: number;
  readonly isAce: boolean;
}

export interface CreateBlackjackLikeRoundInput {
  readonly gameId: string;
  readonly seed: string;
  readonly contentManifestHash?: string;
  readonly playerId?: PlayerId;
  readonly dealerId?: PlayerId;
  readonly startingChips?: number;
  readonly currentBet?: number;
  readonly suspicion?: number;
}

export function createBlackjackLikeRound(input: CreateBlackjackLikeRoundInput): GameState {
  const playerId = input.playerId ?? "player-1";
  const dealerId = input.dealerId ?? "dealer";
  let state: GameState = {
    ...createInitialGameState({
      id: input.gameId,
      seed: input.seed,
      rulesVersion: BLACKJACK_LIKE_RULES_VERSION,
      contentManifestHash: input.contentManifestHash ?? BLACKJACK_LIKE_CONTENT_MANIFEST_HASH,
      activePlayerId: playerId,
    }),
    phase: BLACKJACK_LIKE_PHASES.betting,
    resources: {
      [playerId]: {
        playerId,
        values: {
          [BLACKJACK_LIKE_RESOURCES.chips]: input.startingChips ?? 100,
          [BLACKJACK_LIKE_RESOURCES.currentBet]: input.currentBet ?? 0,
          [BLACKJACK_LIKE_RESOURCES.suspicion]: input.suspicion ?? 0,
        },
      },
    },
    flags: {
      [BLACKJACK_LIKE_FLAGS.roundStarted]: true,
    },
  };

  state = putZone(
    state,
    createZone({
      id: BLACKJACK_LIKE_ZONES.shoe,
      kind: "deck",
      ownerId: dealerId,
      metadata: {
        rulesetId: BLACKJACK_LIKE_RULESET_ID,
        ordered: true,
      },
    }),
  );
  state = putZone(
    state,
    createZone({
      id: BLACKJACK_LIKE_ZONES.playerHand,
      kind: "hand",
      ownerId: playerId,
    }),
  );
  state = putZone(
    state,
    createZone({
      id: BLACKJACK_LIKE_ZONES.dealerHand,
      kind: "hand",
      ownerId: dealerId,
    }),
  );
  state = putZone(
    state,
    createZone({
      id: BLACKJACK_LIKE_ZONES.discard,
      kind: "discard",
      ownerId: dealerId,
    }),
  );
  state = putZone(
    state,
    createZone({
      id: BLACKJACK_LIKE_ZONES.wager,
      kind: "custom",
      ownerId: playerId,
    }),
  );

  for (const definition of createStandardBlackjackShoe()) {
    state = putGameObjectInZone(
      state,
      createGameObject({
        id: definition.id,
        definitionId: "standard-playing-card",
        ownerId: dealerId,
        zoneId: BLACKJACK_LIKE_ZONES.shoe,
        visibility: "hidden",
        facing: "down",
        tags: ["blackjack", "playing-card"],
        attributes: cardAttributes(definition),
      }),
    );
  }

  return state;
}

export function createStandardBlackjackShoe(): readonly BlackjackLikeCardDefinition[] {
  return BLACKJACK_LIKE_SUITS.flatMap((suit) =>
    BLACKJACK_LIKE_RANKS.map((rank) => ({
      id: `blackjack-card-${suit}-${rank.toLowerCase()}`,
      suit,
      rank,
      value: blackjackRankValue(rank),
      isAce: rank === "A",
    })),
  );
}

export function blackjackRankValue(rank: BlackjackLikeRank): number {
  if (rank === "A") {
    return 11;
  }
  if (rank === "J" || rank === "Q" || rank === "K") {
    return 10;
  }
  return Number(rank);
}

function cardAttributes(definition: BlackjackLikeCardDefinition): JsonObject {
  return {
    suit: definition.suit,
    rank: definition.rank,
    value: definition.value,
    isAce: definition.isAce,
  };
}
