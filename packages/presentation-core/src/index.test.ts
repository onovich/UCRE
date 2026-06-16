import {
  DAMAGE_DEALT_INTENT_TYPE,
  MOVE_OBJECT_INTENT_TYPE,
  RESOURCE_CHANGED_INTENT_TYPE,
} from "@ucre/core";
import { describe, expect, it } from "vitest";

import {
  classifyPresentationIntent,
  createBeatSchedule,
  createPresentationDirectorSnapshot,
  setPresentationPlaybackRate,
  skipPresentationDirector,
} from "./index.js";

describe("presentation-core beat scheduler", () => {
  it("creates deterministic beats from presentation intents", () => {
    const schedule = createBeatSchedule(
      [
        {
          id: "intent-move-1",
          type: MOVE_OBJECT_INTENT_TYPE,
          eventId: "event-move-1",
          payload: {
            objectId: "strike-1",
            fromZoneId: "draw",
            toZoneId: "hand",
          },
        },
        {
          id: "intent-damage-1",
          type: DAMAGE_DEALT_INTENT_TYPE,
          eventId: "event-damage-1",
          payload: {
            targetObjectId: "jaw-worm",
            amount: 6,
          },
        },
        {
          id: "intent-custom-1",
          type: "SlayRewardDraftOpened",
          eventId: "event-reward-1",
          payload: {
            rewardZoneId: "reward",
          },
        },
      ],
      {
        defaultDurationMs: 200,
        gapMs: 25,
        trackBy: "kind",
      },
    );

    expect(schedule.totalDurationMs).toBe(650);
    expect(
      schedule.beats.map((beat) => ({
        id: beat.id,
        kind: beat.kind,
        trackId: beat.trackId,
        startTimeMs: beat.startTimeMs,
        durationMs: beat.durationMs,
      })),
    ).toEqual([
      {
        id: "intent-move-1:beat:0",
        kind: "move",
        trackId: "kind:move",
        startTimeMs: 0,
        durationMs: 200,
      },
      {
        id: "intent-damage-1:beat:1",
        kind: "damage",
        trackId: "kind:damage",
        startTimeMs: 225,
        durationMs: 200,
      },
      {
        id: "intent-custom-1:beat:2",
        kind: "generic",
        trackId: "kind:generic",
        startTimeMs: 450,
        durationMs: 200,
      },
    ]);
  });

  it("keeps associated state hash stable when skipping or accelerating", () => {
    const schedule = createBeatSchedule(
      [
        {
          id: "intent-resource-1",
          type: RESOURCE_CHANGED_INTENT_TYPE,
          eventId: "event-resource-1",
          payload: {
            playerId: "player",
            resourceId: "energy",
            nextValue: 2,
          },
        },
      ],
      {
        defaultDurationMs: 300,
      },
    );
    const snapshot = createPresentationDirectorSnapshot(schedule, {
      cursorMs: 150,
      status: "playing",
      associatedStateHash: "state-hash-1",
    });

    const accelerated = setPresentationPlaybackRate(snapshot, 4);
    const skipped = skipPresentationDirector(accelerated);

    expect(accelerated.associatedStateHash).toBe("state-hash-1");
    expect(accelerated.playbackRate).toBe(4);
    expect(accelerated.activeBeatIds).toEqual(["intent-resource-1:beat:0"]);
    expect(skipped.associatedStateHash).toBe("state-hash-1");
    expect(skipped.cursorMs).toBe(schedule.totalDurationMs);
    expect(skipped.status).toBe("complete");
    expect(skipped.activeBeatIds).toEqual([]);
  });

  it("classifies known core presentation intent types", () => {
    expect(classifyPresentationIntent(MOVE_OBJECT_INTENT_TYPE)).toBe("move");
    expect(classifyPresentationIntent(DAMAGE_DEALT_INTENT_TYPE)).toBe("damage");
    expect(classifyPresentationIntent("ObjectiveSucceeded")).toBe("objective");
    expect(classifyPresentationIntent("UnknownThing")).toBe("generic");
  });
});
