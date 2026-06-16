import { describe, expect, it } from "vitest";

import type { CommandRegistry, EffectRegistry } from "./pipeline.js";
import { createInitialGameState } from "./contracts.js";
import {
  GAIN_RESOURCE_EFFECT_TYPE,
  MOVE_OBJECT_EFFECT_TYPE,
  SPEND_RESOURCE_EFFECT_TYPE,
} from "./effects.js";
import { executeCommand, runEffects } from "./pipeline.js";
import { createGameObject, createZone, putGameObjectInZone, putZone } from "./state.js";

describe("command and effect pipeline", () => {
  it("executes command effects in order and accumulates rule facts", () => {
    const commandRegistry: CommandRegistry = {
      PlayCard: {
        getEffects: () => [
          {
            id: "gain",
            type: GAIN_RESOURCE_EFFECT_TYPE,
            payload: {
              playerId: "player-1",
              resourceId: "energy",
              amount: 2,
            },
          },
          {
            id: "spend",
            type: SPEND_RESOURCE_EFFECT_TYPE,
            payload: {
              playerId: "player-1",
              resourceId: "energy",
              amount: 1,
            },
          },
        ],
      },
    };
    const result = executeCommand({
      state: createPipelineState(),
      command: {
        id: "command-1",
        type: "PlayCard",
        playerId: "player-1",
        payload: {},
      },
      commandRegistry,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("executeCommand unexpectedly failed.");
    }

    expect(result.state.resources["player-1"]?.values.energy).toBe(1);
    expect(result.events.map((event) => event.id)).toEqual(["command-1:gain", "command-1:spend"]);
    expect(result.events.map((event) => event.causedByCommandId)).toEqual([
      "command-1",
      "command-1",
    ]);
    expect(result.events.map((event) => event.causedByEffectId)).toEqual(["gain", "spend"]);
  });

  it("stops before effects when command validation fails", () => {
    const commandRegistry: CommandRegistry = {
      PlayCard: {
        validate: () => [
          {
            code: "CARD_NOT_PLAYABLE",
            message: "Card cannot be played.",
          },
        ],
        getEffects: () => [
          {
            id: "gain",
            type: GAIN_RESOURCE_EFFECT_TYPE,
            payload: {
              playerId: "player-1",
              resourceId: "energy",
              amount: 2,
            },
          },
        ],
      },
    };
    const state = createPipelineState();
    const result = executeCommand({
      state,
      command: {
        id: "command-1",
        type: "PlayCard",
        playerId: "player-1",
        payload: {},
      },
      commandRegistry,
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
  });

  it("fails when an effect payload is invalid", () => {
    const state = createPipelineState();
    const result = runEffects({
      state,
      effects: [
        {
          id: "move",
          type: MOVE_OBJECT_EFFECT_TYPE,
          payload: {
            objectId: "card-1",
          },
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("runEffects unexpectedly succeeded.");
    }

    expect(result.state).toBe(state);
    expect(result.errors[0]?.code).toBe("INVALID_EFFECT_PAYLOAD");
    expect(result.events).toEqual([]);
  });

  it("supports custom effect registries", () => {
    const effectRegistry: EffectRegistry = {
      Mark: (state, effect) => ({
        ok: true,
        state: {
          ...state,
          flags: {
            ...state.flags,
            markedBy: effect.id,
          },
        },
        events: [],
        presentationIntents: [],
      }),
    };
    const result = runEffects({
      state: createPipelineState(),
      effects: [
        {
          id: "mark-1",
          type: "Mark",
          payload: {},
        },
      ],
      effectRegistry,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("runEffects unexpectedly failed.");
    }

    expect(result.state.flags.markedBy).toBe("mark-1");
  });
});

function createPipelineState() {
  let state = createInitialGameState({
    id: "game-1",
    seed: "seed-1",
    rulesVersion: "rules-0",
    contentManifestHash: "content-0",
    activePlayerId: "player-1",
  });

  state = putZone(state, createZone({ id: "draw", kind: "deck", ownerId: "player-1" }));
  state = putZone(state, createZone({ id: "hand", kind: "hand", ownerId: "player-1" }));
  state = putGameObjectInZone(
    state,
    createGameObject({
      id: "card-1",
      definitionId: "strike",
      ownerId: "player-1",
      zoneId: "draw",
    }),
  );

  return state;
}
