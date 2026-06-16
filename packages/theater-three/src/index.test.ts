import { describe, expect, it } from "vitest";

import { THEATER_ANCHOR_IDS, createTheaterAnchorLayout } from "./index.js";

describe("theater-three anchor layout", () => {
  it("defines stable anchors for the Slay-like card theater", () => {
    const anchors = createTheaterAnchorLayout();

    expect(anchors.map((anchor) => anchor.id)).toEqual([
      THEATER_ANCHOR_IDS.drawPile,
      THEATER_ANCHOR_IDS.hand,
      THEATER_ANCHOR_IDS.playArea,
      THEATER_ANCHOR_IDS.discardPile,
      THEATER_ANCHOR_IDS.enemy,
      THEATER_ANCHOR_IDS.reward,
    ]);
    expect(new Set(anchors.map((anchor) => anchor.position.join(","))).size).toBe(anchors.length);
  });
});
