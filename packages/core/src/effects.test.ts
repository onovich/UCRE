import { describe, expect, it } from "vitest";

import { createInitialGameState } from "./contracts.js";
import { discard, drawCards, moveObject } from "./effects.js";
import { createGameObject, createZone, putGameObjectInZone, putZone } from "./state.js";

describe("MoveObject", () => {
  it("moves an object between zones and emits rule and presentation facts", () => {
    const state = createMoveState();
    const result = moveObject(state, {
      objectId: "card-1",
      toZoneId: "hand",
      eventId: "event-1",
      causedByCommandId: "command-1",
      causedByEffectId: "effect-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("MoveObject unexpectedly failed.");
    }

    expect(result.state.objects["card-1"]?.zoneId).toBe("hand");
    expect(result.state.zones.draw?.objectIds).toEqual([]);
    expect(result.state.zones.hand?.objectIds).toEqual(["card-1"]);
    expect(result.events).toEqual([
      {
        id: "event-1",
        type: "ObjectMoved",
        payload: {
          objectId: "card-1",
          fromZoneId: "draw",
          toZoneId: "hand",
          fromIndex: 0,
          toIndex: 0,
        },
        causedByCommandId: "command-1",
        causedByEffectId: "effect-1",
      },
    ]);
    expect(result.presentationIntents).toEqual([
      {
        id: "event-1:presentation",
        type: "MoveObject",
        eventId: "event-1",
        payload: result.events[0]?.payload,
      },
    ]);
  });

  it("reorders within the same zone without duplicating the object", () => {
    const base = createMoveState(["card-1", "card-2", "card-3"]);
    const result = moveObject(base, {
      objectId: "card-3",
      toZoneId: "draw",
      position: 0,
      eventId: "event-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("MoveObject unexpectedly failed.");
    }

    expect(result.state.zones.draw?.objectIds).toEqual(["card-3", "card-1", "card-2"]);
  });

  it("leaves state unchanged when the object is missing", () => {
    const state = createMoveState();
    const result = moveObject(state, {
      objectId: "missing",
      toZoneId: "hand",
      eventId: "event-1",
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
    expect(result.presentationIntents).toEqual([]);
  });

  it("rejects invalid positions", () => {
    const state = createMoveState();
    const result = moveObject(state, {
      objectId: "card-1",
      toZoneId: "hand",
      position: -1,
      eventId: "event-1",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("MoveObject unexpectedly succeeded.");
    }

    expect(result.errors[0]?.code).toBe("INVALID_MOVE_POSITION");
  });
});

describe("DrawCards", () => {
  it("moves cards from the source zone to the target zone in order", () => {
    const state = createMoveState(["card-1", "card-2", "card-3"]);
    const result = drawCards(state, {
      fromZoneId: "draw",
      toZoneId: "hand",
      count: 2,
      eventId: "draw-1",
      causedByCommandId: "command-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("DrawCards unexpectedly failed.");
    }

    expect(result.state.zones.draw?.objectIds).toEqual(["card-3"]);
    expect(result.state.zones.hand?.objectIds).toEqual(["card-1", "card-2"]);
    expect(result.events.map((event) => event.type)).toEqual([
      "ObjectMoved",
      "ObjectMoved",
      "CardsDrawn",
    ]);
    expect(result.events.at(-1)).toEqual({
      id: "draw-1",
      type: "CardsDrawn",
      payload: {
        fromZoneId: "draw",
        toZoneId: "hand",
        requestedCount: 2,
        drawnCount: 2,
        drawnObjectIds: ["card-1", "card-2"],
      },
      causedByCommandId: "command-1",
    });
    expect(result.presentationIntents.map((intent) => intent.type)).toEqual([
      "MoveObject",
      "MoveObject",
      "DrawCards",
    ]);
  });

  it("draws only available cards", () => {
    const state = createMoveState(["card-1"]);
    const result = drawCards(state, {
      fromZoneId: "draw",
      toZoneId: "hand",
      count: 3,
      eventId: "draw-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("DrawCards unexpectedly failed.");
    }

    expect(result.state.zones.draw?.objectIds).toEqual([]);
    expect(result.state.zones.hand?.objectIds).toEqual(["card-1"]);
    expect(result.events.at(-1)?.payload).toMatchObject({
      requestedCount: 3,
      drawnCount: 1,
      drawnObjectIds: ["card-1"],
    });
  });

  it("leaves state unchanged when a draw zone is missing", () => {
    const state = createMoveState();
    const result = drawCards(state, {
      fromZoneId: "missing",
      toZoneId: "hand",
      count: 1,
      eventId: "draw-1",
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
  });
});

describe("Discard", () => {
  it("moves a card to the discard zone and records discard facts", () => {
    const state = createMoveState(["card-1"]);
    const inHand = moveObject(state, {
      objectId: "card-1",
      toZoneId: "hand",
      eventId: "move-1",
    });

    expect(inHand.ok).toBe(true);
    if (!inHand.ok) {
      throw new Error("MoveObject unexpectedly failed.");
    }

    const withDiscard = putZone(
      inHand.state,
      createZone({ id: "discard", kind: "discard", ownerId: "player-1" }),
    );
    const result = discard(withDiscard, {
      objectId: "card-1",
      toZoneId: "discard",
      eventId: "discard-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Discard unexpectedly failed.");
    }

    expect(result.state.zones.hand?.objectIds).toEqual([]);
    expect(result.state.zones.discard?.objectIds).toEqual(["card-1"]);
    expect(result.events.map((event) => event.type)).toEqual(["ObjectMoved", "CardDiscarded"]);
    expect(result.presentationIntents.map((intent) => intent.type)).toEqual([
      "MoveObject",
      "Discard",
    ]);
  });
});

function createMoveState(drawIds: readonly string[] = ["card-1"]) {
  let state = createInitialGameState({
    id: "game-1",
    seed: "seed-1",
    rulesVersion: "rules-0",
    contentManifestHash: "content-0",
    activePlayerId: "player-1",
  });

  state = putZone(state, createZone({ id: "draw", kind: "deck", ownerId: "player-1" }));
  state = putZone(state, createZone({ id: "hand", kind: "hand", ownerId: "player-1" }));

  for (const objectId of drawIds) {
    state = putGameObjectInZone(
      state,
      createGameObject({
        id: objectId,
        definitionId: "strike",
        ownerId: "player-1",
        zoneId: "draw",
      }),
    );
  }

  return state;
}
