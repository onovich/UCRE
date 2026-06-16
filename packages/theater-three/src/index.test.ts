import { describe, expect, it } from "vitest";

import {
  THEATER_ANCHOR_IDS,
  createTheaterAnchorLayout,
  groupTheaterActorsByAnchor,
} from "./index.js";

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

  it("groups actors by stable anchor while preserving zone order", () => {
    const groups = groupTheaterActorsByAnchor([
      {
        id: "draw-1",
        label: "Strike",
        anchorId: THEATER_ANCHOR_IDS.drawPile,
        kind: "card",
      },
      {
        id: "hand-1",
        label: "Defend",
        anchorId: THEATER_ANCHOR_IDS.hand,
        kind: "card",
      },
      {
        id: "draw-2",
        label: "Bash",
        anchorId: THEATER_ANCHOR_IDS.drawPile,
        kind: "card",
      },
      {
        id: "enemy-1",
        label: "Jaw Worm",
        anchorId: THEATER_ANCHOR_IDS.enemy,
        kind: "enemy",
      },
    ]);

    expect(groups.drawPile.map((actor) => actor.id)).toEqual(["draw-1", "draw-2"]);
    expect(groups.hand.map((actor) => actor.id)).toEqual(["hand-1"]);
    expect(groups.playArea).toEqual([]);
    expect(groups.discardPile).toEqual([]);
    expect(groups.enemy.map((actor) => actor.label)).toEqual(["Jaw Worm"]);
    expect(groups.reward).toEqual([]);
  });
});
