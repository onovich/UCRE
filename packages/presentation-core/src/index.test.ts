import {
  DAMAGE_DEALT_INTENT_TYPE,
  MOVE_OBJECT_INTENT_TYPE,
  OBJECT_DESTROYED_INTENT_TYPE,
  RESOURCE_CHANGED_INTENT_TYPE,
} from "@ucre/core";
import { describe, expect, it } from "vitest";

import {
  classifyPresentationIntent,
  createBeatSchedule,
  createPresentationDirectorSnapshot,
  createPresentationRandomStream,
  nextPresentationRandom,
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
        kind: "reward",
        trackId: "kind:reward",
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
    expect(classifyPresentationIntent("TriggerQueued")).toBe("trigger");
    expect(classifyPresentationIntent("SlayRewardDraftOpened")).toBe("reward");
    expect(classifyPresentationIntent("CameraFocusObject")).toBe("camera");
    expect(classifyPresentationIntent("UnknownThing")).toBe("generic");
  });

  it("normalizes move, damage, and destroy profiles for renderer adapters", () => {
    const schedule = createBeatSchedule([
      {
        id: "intent-move-1",
        type: MOVE_OBJECT_INTENT_TYPE,
        eventId: "event-move-1",
        payload: {
          objectId: "strike-1",
          fromZoneId: "player.drawPile",
          toZoneId: "player.hand",
          fromIndex: 0,
          toIndex: 4,
        },
      },
      {
        id: "intent-damage-1",
        type: DAMAGE_DEALT_INTENT_TYPE,
        eventId: "event-damage-1",
        payload: {
          objectId: "jaw-worm",
          amount: 6,
          blockedAmount: 2,
          hitPointLoss: 4,
          previousHitPoints: 40,
          nextHitPoints: 36,
        },
      },
      {
        id: "intent-destroy-1",
        type: OBJECT_DESTROYED_INTENT_TYPE,
        eventId: "event-destroy-1",
        payload: {
          objectId: "jaw-worm",
          fromZoneId: "enemy.active",
        },
      },
    ]);

    expect(schedule.beats.map((beat) => beat.profile)).toEqual([
      {
        kind: "move",
        sourceIntentType: MOVE_OBJECT_INTENT_TYPE,
        objectId: "strike-1",
        fromZoneId: "player.drawPile",
        toZoneId: "player.hand",
        fromIndex: 0,
        toIndex: 4,
      },
      {
        kind: "damage",
        sourceIntentType: DAMAGE_DEALT_INTENT_TYPE,
        objectId: "jaw-worm",
        amount: 6,
        blockedAmount: 2,
        hitPointLoss: 4,
        previousHitPoints: 40,
        nextHitPoints: 36,
      },
      {
        kind: "destroy",
        sourceIntentType: OBJECT_DESTROYED_INTENT_TYPE,
        objectId: "jaw-worm",
        fromZoneId: "enemy.active",
      },
    ]);
  });

  it("normalizes trigger, reward, and camera profiles for adapters", () => {
    const schedule = createBeatSchedule([
      {
        id: "intent-trigger-1",
        type: "TriggerQueued",
        eventId: "event-trigger-1",
        payload: {
          triggerId: "trigger-1",
          triggerType: "onEnemyDefeated",
          sourceEventId: "event-destroy-1",
        },
      },
      {
        id: "intent-reward-1",
        type: "SlayRewardDraftOpened",
        eventId: "event-reward-1",
        payload: {
          rewardZoneId: "player.reward",
          rewardPoolId: "starter-rewards",
          offeredObjectIds: ["reward-1", "reward-2"],
        },
      },
      {
        id: "intent-camera-1",
        type: "CameraFocusObject",
        eventId: "event-camera-1",
        payload: {
          targetObjectId: "jaw-worm",
          targetKind: "enemy",
          emphasis: "damage",
        },
      },
    ]);

    expect(schedule.beats.map((beat) => beat.profile)).toEqual([
      {
        kind: "trigger",
        sourceIntentType: "TriggerQueued",
        triggerId: "trigger-1",
        triggerType: "onEnemyDefeated",
        sourceEventId: "event-destroy-1",
      },
      {
        kind: "reward",
        sourceIntentType: "SlayRewardDraftOpened",
        rewardZoneId: "player.reward",
        rewardPoolId: "starter-rewards",
        offeredObjectIds: ["reward-1", "reward-2"],
      },
      {
        kind: "camera",
        sourceIntentType: "CameraFocusObject",
        targetId: "jaw-worm",
        targetKind: "enemy",
        emphasis: "damage",
      },
    ]);
  });

  it("uses explicit presentation random streams separate from rule streams", () => {
    const vfxStream = createPresentationRandomStream({
      seed: "run-seed-1",
      streamId: "presentation:vfx",
    });
    const first = nextPresentationRandom(vfxStream);
    const second = nextPresentationRandom(first.stream);
    const repeatedFirst = nextPresentationRandom(
      createPresentationRandomStream({
        seed: "run-seed-1",
        streamId: "presentation:vfx",
      }),
    );
    const cardFanFirst = nextPresentationRandom(
      createPresentationRandomStream({
        seed: "run-seed-1",
        streamId: "presentation:card-fan",
      }),
    );

    expect(first.value).toBeGreaterThanOrEqual(0);
    expect(first.value).toBeLessThan(1);
    expect(first.stream.cursor).toBe(1);
    expect(second.stream.cursor).toBe(2);
    expect(repeatedFirst.value).toBe(first.value);
    expect(cardFanFirst.value).not.toBe(first.value);
  });
});
