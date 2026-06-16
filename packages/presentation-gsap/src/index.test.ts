import { createBeatSchedule } from "@ucre/presentation-core";
import { describe, expect, it } from "vitest";

import { createGsapTimeline, setGsapTimelinePlaybackRate, skipGsapTimeline } from "./index.js";

const MOVE_OBJECT_INTENT_TYPE = "MoveObject";
const DAMAGE_DEALT_INTENT_TYPE = "DamageDealt";

describe("presentation-gsap timeline adapter", () => {
  it("creates a paused GSAP timeline with deterministic beat labels", () => {
    const schedule = createBeatSchedule(
      [
        {
          id: "intent-move-1",
          type: MOVE_OBJECT_INTENT_TYPE,
          eventId: "event-move-1",
          payload: {
            objectId: "strike-1",
          },
        },
        {
          id: "intent-damage-1",
          type: DAMAGE_DEALT_INTENT_TYPE,
          eventId: "event-damage-1",
          payload: {
            objectId: "jaw-worm",
            amount: 6,
          },
        },
      ],
      {
        defaultDurationMs: 200,
        gapMs: 25,
      },
    );

    const timeline = createGsapTimeline({
      schedule,
      timeScale: 2,
    });

    expect(timeline.paused()).toBe(true);
    expect(timeline.duration()).toBeCloseTo(0.425);
    expect(timeline.timeScale()).toBe(2);
    expect(timeline.labels["intent-move-1:beat:0"]).toBeCloseTo(0);
    expect(timeline.labels["intent-damage-1:beat:1"]).toBeCloseTo(0.225);
  });

  it("lets renderer adapters override handlers by beat kind", () => {
    const schedule = createBeatSchedule([
      {
        id: "intent-damage-1",
        type: DAMAGE_DEALT_INTENT_TYPE,
        eventId: "event-damage-1",
        payload: {
          objectId: "jaw-worm",
          amount: 6,
        },
      },
    ]);
    const handledProfiles: string[] = [];

    const timeline = createGsapTimeline({
      schedule,
      handlers: {
        damage: (candidateTimeline, beat, context) => {
          handledProfiles.push(`${beat.profile.kind}:${context.durationSeconds}`);
          candidateTimeline.to(
            {
              damageAmount: 0,
            },
            {
              damageAmount: beat.profile.kind === "damage" ? beat.profile.amount : 0,
              duration: context.durationSeconds,
              ease: "none",
            },
            context.startSeconds,
          );
        },
      },
    });

    expect(handledProfiles).toEqual(["damage:0.32"]);
    expect(timeline.duration()).toBeCloseTo(0.32);
  });

  it("supports timeline skip and playback-rate updates", () => {
    const schedule = createBeatSchedule([
      {
        id: "intent-move-1",
        type: MOVE_OBJECT_INTENT_TYPE,
        eventId: "event-move-1",
        payload: {
          objectId: "strike-1",
        },
      },
    ]);
    const timeline = createGsapTimeline({ schedule });

    setGsapTimelinePlaybackRate(timeline, 4);
    skipGsapTimeline(timeline);

    expect(timeline.timeScale()).toBe(4);
    expect(timeline.progress()).toBe(1);
    expect(timeline.paused()).toBe(true);
  });
});
