import { describe, expect, it } from "vitest";

import { createInitialGameState } from "./contracts.js";
import {
  createGameObject,
  createZone,
  insertObjectId,
  putGameObjectInZone,
  putZone,
  removeObjectId,
} from "./state.js";

describe("state helpers", () => {
  it("adds zones and objects immutably", () => {
    const base = createInitialGameState({
      id: "game-1",
      seed: "seed-1",
      rulesVersion: "rules-0",
      contentManifestHash: "content-0",
    });
    const withZone = putZone(base, createZone({ id: "draw", kind: "deck" }));
    const withObject = putGameObjectInZone(
      withZone,
      createGameObject({
        id: "card-1",
        definitionId: "strike",
        ownerId: "player-1",
        zoneId: "draw",
      }),
    );

    expect(base.zones.draw).toBeUndefined();
    expect(withZone.objects["card-1"]).toBeUndefined();
    expect(withObject.objects["card-1"]?.zoneId).toBe("draw");
    expect(withObject.zones.draw?.objectIds).toEqual(["card-1"]);
  });

  it("deduplicates object ids when inserting", () => {
    expect(insertObjectId(["a", "b", "a"], "a", 1)).toEqual(["b", "a"]);
    expect(removeObjectId(["a", "b", "a"], "a")).toEqual(["b"]);
  });
});
