import { describe, expect, it } from "vitest";

import {
  THEATER_ANCHOR_IDS,
  createTheaterActorPlacements,
  createTheaterAnchorLayout,
  createTheaterCardFaceModel,
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

  it("creates centered hand fan placements and stacked pile placements", () => {
    const placements = createTheaterActorPlacements([
      {
        id: "hand-left",
        label: "Strike",
        anchorId: THEATER_ANCHOR_IDS.hand,
        kind: "card",
      },
      {
        id: "hand-center",
        label: "Defend",
        anchorId: THEATER_ANCHOR_IDS.hand,
        kind: "card",
      },
      {
        id: "hand-right",
        label: "Bash",
        anchorId: THEATER_ANCHOR_IDS.hand,
        kind: "card",
      },
      {
        id: "discard-bottom",
        label: "Strike",
        anchorId: THEATER_ANCHOR_IDS.discardPile,
        kind: "card",
      },
      {
        id: "discard-top",
        label: "Defend",
        anchorId: THEATER_ANCHOR_IDS.discardPile,
        kind: "card",
      },
    ]);

    const handPlacements = placements.filter(
      (placement) => placement.anchorId === THEATER_ANCHOR_IDS.hand,
    );
    expect(handPlacements.map((placement) => placement.actor.id)).toEqual([
      "hand-left",
      "hand-center",
      "hand-right",
    ]);
    expect(handPlacements[0]?.position[0]).toBeCloseTo(-0.52);
    expect(handPlacements[1]?.position[0]).toBeCloseTo(0);
    expect(handPlacements[2]?.position[0]).toBeCloseTo(0.52);
    expect(handPlacements[0]?.rotation[2]).toBeCloseTo(0.14);
    expect(handPlacements[1]?.rotation[2]).toBeCloseTo(0);
    expect(handPlacements[2]?.rotation[2]).toBeCloseTo(-0.14);

    const discardPlacements = placements.filter(
      (placement) => placement.anchorId === THEATER_ANCHOR_IDS.discardPile,
    );
    expect(discardPlacements[0]?.position[0]).toBeCloseTo(3.1);
    expect(discardPlacements[1]?.position[0]).toBeCloseTo(3.135);
    expect(discardPlacements[0]?.position[1]).toBeCloseTo(0.055);
    expect(discardPlacements[1]?.position[1]).toBeCloseTo(0.061);
  });

  it("keeps actor identity stable while anchor targets change", () => {
    const [drawPlacement] = createTheaterActorPlacements([
      {
        id: "strike-1",
        label: "Strike",
        anchorId: THEATER_ANCHOR_IDS.drawPile,
        kind: "card",
      },
    ]);
    const [handPlacement] = createTheaterActorPlacements([
      {
        id: "strike-1",
        label: "Strike",
        anchorId: THEATER_ANCHOR_IDS.hand,
        kind: "card",
      },
    ]);

    expect(drawPlacement?.actor.id).toBe("strike-1");
    expect(handPlacement?.actor.id).toBe("strike-1");
    expect(drawPlacement?.anchorId).toBe(THEATER_ANCHOR_IDS.drawPile);
    expect(handPlacement?.anchorId).toBe(THEATER_ANCHOR_IDS.hand);
    expect(drawPlacement?.position).not.toEqual(handPlacement?.position);
  });

  it("creates deterministic card face models for card, enemy, and reward actors", () => {
    expect(
      createTheaterCardFaceModel({
        id: "strike-1",
        label: "Strike",
        anchorId: THEATER_ANCHOR_IDS.hand,
        kind: "card",
      }),
    ).toEqual({
      label: "Strike",
      subtitle: "Hand",
      backgroundColor: "#f1eee6",
      accentColor: "#4a6e5d",
      textColor: "#171611",
    });

    expect(
      createTheaterCardFaceModel({
        id: "jaw-worm",
        label: "Jaw Worm",
        anchorId: THEATER_ANCHOR_IDS.enemy,
        kind: "enemy",
      }),
    ).toEqual({
      label: "Jaw Worm",
      subtitle: "Enemy",
      backgroundColor: "#3a1f19",
      accentColor: "#d67d63",
      textColor: "#fff1e8",
    });

    expect(
      createTheaterCardFaceModel({
        id: "reward-1",
        label: "Iron Wave",
        anchorId: THEATER_ANCHOR_IDS.reward,
        kind: "reward",
      }),
    ).toEqual({
      label: "Iron Wave",
      subtitle: "Reward",
      backgroundColor: "#17312a",
      accentColor: "#5fc19e",
      textColor: "#f7fff9",
    });
  });
});
