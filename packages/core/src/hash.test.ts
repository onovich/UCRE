import { describe, expect, it } from "vitest";

import { createInitialGameState } from "./contracts.js";
import { hashGameState, hashRuleEvents, stableHash, stableStringify } from "./hash.js";

describe("stable hashing", () => {
  it("serializes object keys in a stable order", () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
  });

  it("hashes equivalent states to the same value", () => {
    const left = createInitialGameState({
      id: "game-1",
      seed: "seed-1",
      rulesVersion: "rules-0",
      contentManifestHash: "content-0",
    });
    const right = {
      resources: {},
      phase: "setup",
      zones: {},
      objects: {},
      flags: {},
      id: "game-1",
      seed: "seed-1",
      turn: 0,
      contentManifestHash: "content-0",
      rulesVersion: "rules-0",
    };

    expect(hashGameState(left)).toBe(stableHash(right));
  });

  it("hashes rule event order as part of the event ledger", () => {
    const first = [
      {
        id: "event-1",
        type: "ObjectMoved",
        payload: {
          objectId: "card-1",
          toZoneId: "hand",
        },
      },
      {
        id: "event-2",
        type: "ResourceChanged",
        payload: {
          playerId: "player-1",
          resourceId: "energy",
          value: 2,
        },
      },
    ];
    const second = [...first].reverse();

    expect(hashRuleEvents(first)).not.toBe(hashRuleEvents(second));
  });
});
