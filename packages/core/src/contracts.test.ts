import { describe, expect, it } from "vitest";

import { createInitialGameState } from "./contracts.js";

describe("core contracts", () => {
  it("creates an empty deterministic game state envelope", () => {
    expect(
      createInitialGameState({
        id: "game-1",
        seed: "seed-1",
        rulesVersion: "rules-0",
        contentManifestHash: "content-0",
        activePlayerId: "player-1",
      }),
    ).toEqual({
      id: "game-1",
      seed: "seed-1",
      rulesVersion: "rules-0",
      contentManifestHash: "content-0",
      phase: "setup",
      turn: 0,
      activePlayerId: "player-1",
      objects: {},
      zones: {},
      resources: {},
      flags: {},
    });
  });
});
