import { gsap } from "gsap";

import type { BeatSchedule, PresentationBeat, PresentationBeatKind } from "@ucre/presentation-core";

export const UCRE_PRESENTATION_GSAP_PACKAGE_ID = "@ucre/presentation-gsap";

export type GsapTimeline = ReturnType<typeof gsap.timeline>;

export interface GsapBeatHandlerContext {
  readonly schedule: BeatSchedule;
  readonly startSeconds: number;
  readonly durationSeconds: number;
}

export type GsapBeatHandler = (
  timeline: GsapTimeline,
  beat: PresentationBeat,
  context: GsapBeatHandlerContext,
) => void;

export type GsapBeatHandlers = Partial<Record<PresentationBeatKind, GsapBeatHandler>>;

export interface CreateGsapTimelineInput {
  readonly schedule: BeatSchedule;
  readonly paused?: boolean;
  readonly timeScale?: number;
  readonly handlers?: GsapBeatHandlers;
  readonly onBeatStart?: (beat: PresentationBeat) => void;
  readonly onBeatComplete?: (beat: PresentationBeat) => void;
}

export function createGsapTimeline(input: CreateGsapTimelineInput): GsapTimeline {
  const timeline = gsap.timeline({
    paused: input.paused ?? true,
  });

  for (const beat of input.schedule.beats) {
    const startSeconds = millisecondsToSeconds(beat.startTimeMs);
    const durationSeconds = millisecondsToSeconds(beat.durationMs);
    const context: GsapBeatHandlerContext = {
      schedule: input.schedule,
      startSeconds,
      durationSeconds,
    };
    timeline.addLabel(beat.id, startSeconds);
    timeline.call(() => input.onBeatStart?.(beat), undefined, startSeconds);

    const handler = input.handlers?.[beat.kind] ?? addDefaultBeatTween;
    handler(timeline, beat, context);

    timeline.call(() => input.onBeatComplete?.(beat), undefined, startSeconds + durationSeconds);
  }

  timeline.timeScale(normalizePositiveNumber(input.timeScale, 1));
  return timeline;
}

export function skipGsapTimeline(timeline: GsapTimeline): GsapTimeline {
  timeline.progress(1);
  timeline.pause();
  return timeline;
}

export function setGsapTimelinePlaybackRate(
  timeline: GsapTimeline,
  playbackRate: number,
): GsapTimeline {
  timeline.timeScale(normalizePositiveNumber(playbackRate, 1));
  return timeline;
}

function addDefaultBeatTween(
  timeline: GsapTimeline,
  beat: PresentationBeat,
  context: GsapBeatHandlerContext,
): void {
  timeline.to(
    {
      beatId: beat.id,
      progress: 0,
    },
    {
      progress: 1,
      duration: context.durationSeconds,
      ease: "none",
    },
    context.startSeconds,
  );
}

function millisecondsToSeconds(milliseconds: number): number {
  return Math.max(0, milliseconds / 1000);
}

function normalizePositiveNumber(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}
