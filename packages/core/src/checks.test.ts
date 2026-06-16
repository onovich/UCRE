import { describe, expect, it } from "vitest";

import { checkObjectives, popNextTrigger, queueTrigger } from "./checks.js";
import { createInitialGameState } from "./contracts.js";

describe("trigger queue", () => {
  it("queues and pops triggers immutably", () => {
    const state = createState();
    const queued = queueTrigger(state, {
      trigger: {
        id: "trigger-1",
        type: "OnCardPlayed",
        payload: {
          cardId: "card-1",
        },
        sourceEventId: "event-1",
      },
      eventId: "trigger-event-1",
    });

    expect(queued.ok).toBe(true);
    if (!queued.ok) {
      throw new Error("queueTrigger unexpectedly failed.");
    }

    expect(state.triggerQueue).toEqual([]);
    expect(queued.state.triggerQueue).toHaveLength(1);
    expect(queued.events[0]?.payload).toMatchObject({
      triggerId: "trigger-1",
      triggerType: "OnCardPlayed",
      queueLength: 1,
      sourceEventId: "event-1",
    });

    const popped = popNextTrigger(queued.state);
    expect(popped.trigger?.id).toBe("trigger-1");
    expect(popped.state.triggerQueue).toEqual([]);
  });
});

describe("objective checks", () => {
  it("marks objectives as succeeded or failed and emits facts", () => {
    const state = {
      ...createState(),
      flags: {
        victory: true,
        defeated: true,
      },
    };
    const result = checkObjectives(state, {
      eventIdPrefix: "check-1",
      definitions: [
        {
          id: "win",
          type: "FlagTrue",
          payload: {
            flag: "victory",
          },
          isSatisfied: (candidate) => candidate.flags.victory === true,
        },
        {
          id: "survive",
          type: "FlagFalse",
          payload: {
            flag: "defeated",
          },
          isSatisfied: (candidate) => candidate.flags.defeated !== true,
          isFailed: (candidate) => candidate.flags.defeated === true,
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("checkObjectives unexpectedly failed.");
    }

    expect(result.state.objectives).toEqual([
      {
        id: "win",
        type: "FlagTrue",
        status: "succeeded",
        payload: {
          flag: "victory",
        },
      },
      {
        id: "survive",
        type: "FlagFalse",
        status: "failed",
        payload: {
          flag: "defeated",
        },
      },
    ]);
    expect(result.events.map((event) => event.type)).toEqual([
      "ObjectiveSucceeded",
      "ObjectiveFailed",
    ]);
    expect(result.presentationIntents).toHaveLength(2);
  });

  it("does not re-emit terminal objective transitions", () => {
    const state = {
      ...createState(),
      flags: {
        victory: true,
      },
    };
    const first = checkObjectives(state, {
      eventIdPrefix: "check-1",
      definitions: [
        {
          id: "win",
          type: "FlagTrue",
          isSatisfied: (candidate) => candidate.flags.victory === true,
        },
      ],
    });

    expect(first.ok).toBe(true);
    if (!first.ok) {
      throw new Error("checkObjectives unexpectedly failed.");
    }

    const second = checkObjectives(first.state, {
      eventIdPrefix: "check-2",
      definitions: [
        {
          id: "win",
          type: "FlagTrue",
          isSatisfied: (candidate) => candidate.flags.victory === true,
        },
      ],
    });

    expect(second.events).toEqual([]);
    expect(second.presentationIntents).toEqual([]);
  });
});

function createState() {
  return createInitialGameState({
    id: "game-1",
    seed: "seed-1",
    rulesVersion: "rules-0",
    contentManifestHash: "content-0",
    activePlayerId: "player-1",
  });
}
