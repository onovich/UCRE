import {
  COUNTER_CHANGED_INTENT_TYPE,
  DAMAGE_DEALT_INTENT_TYPE,
  DISCARD_INTENT_TYPE,
  DRAW_CARDS_INTENT_TYPE,
  MOVE_OBJECT_INTENT_TYPE,
  OBJECT_DESTROYED_INTENT_TYPE,
  RESOURCE_CHANGED_INTENT_TYPE,
} from "@ucre/core";
import type { JsonObject, PresentationIntent } from "@ucre/core";

export const UCRE_PRESENTATION_CORE_PACKAGE_ID = "@ucre/presentation-core";

export type { PresentationIntent } from "@ucre/core";

export type PresentationBeatKind =
  | "move"
  | "draw"
  | "discard"
  | "damage"
  | "destroy"
  | "resource"
  | "counter"
  | "objective"
  | "generic";

export type PresentationTrackStrategy = "sequence" | "kind" | "intent";
export type PresentationDirectorStatus = "idle" | "playing" | "paused" | "complete";

export interface PresentationBeat {
  readonly id: string;
  readonly intentId: string;
  readonly eventId: string;
  readonly type: string;
  readonly kind: PresentationBeatKind;
  readonly trackId: string;
  readonly order: number;
  readonly startTimeMs: number;
  readonly durationMs: number;
  readonly payload: JsonObject;
}

export interface BeatSchedulerConfig {
  readonly defaultDurationMs?: number;
  readonly gapMs?: number;
  readonly trackBy?: PresentationTrackStrategy;
}

export interface BeatSchedule {
  readonly beats: readonly PresentationBeat[];
  readonly totalDurationMs: number;
}

export interface PresentationDirectorSnapshot {
  readonly schedule: BeatSchedule;
  readonly cursorMs: number;
  readonly playbackRate: number;
  readonly status: PresentationDirectorStatus;
  readonly activeBeatIds: readonly string[];
  readonly associatedStateHash?: string;
}

export interface PresentationDirectorSnapshotInput {
  readonly cursorMs?: number;
  readonly playbackRate?: number;
  readonly status?: PresentationDirectorStatus;
  readonly associatedStateHash?: string;
}

const DEFAULT_BEAT_DURATION_MS = 320;
const DEFAULT_BEAT_GAP_MS = 40;

export function createBeatSchedule(
  intents: readonly PresentationIntent[],
  config: BeatSchedulerConfig = {},
): BeatSchedule {
  const defaultDurationMs = normalizeNonNegativeInteger(
    config.defaultDurationMs,
    DEFAULT_BEAT_DURATION_MS,
  );
  const gapMs = normalizeNonNegativeInteger(config.gapMs, DEFAULT_BEAT_GAP_MS);
  const trackBy = config.trackBy ?? "sequence";
  const beats: PresentationBeat[] = [];
  let cursorMs = 0;

  for (const [index, intent] of intents.entries()) {
    const kind = classifyPresentationIntent(intent.type);
    beats.push({
      id: `${intent.id}:beat:${index}`,
      intentId: intent.id,
      eventId: intent.eventId,
      type: intent.type,
      kind,
      trackId: createTrackId(intent, kind, index, trackBy),
      order: index,
      startTimeMs: cursorMs,
      durationMs: defaultDurationMs,
      payload: intent.payload,
    });
    cursorMs += defaultDurationMs + gapMs;
  }

  const lastBeat = beats.at(-1);
  return {
    beats,
    totalDurationMs: lastBeat ? lastBeat.startTimeMs + lastBeat.durationMs : 0,
  };
}

export function createPresentationDirectorSnapshot(
  schedule: BeatSchedule,
  input: PresentationDirectorSnapshotInput = {},
): PresentationDirectorSnapshot {
  const cursorMs = clampCursor(input.cursorMs ?? 0, schedule.totalDurationMs);
  const playbackRate = normalizePositiveNumber(input.playbackRate, 1);
  const status = input.status ?? inferStatus(cursorMs, schedule.totalDurationMs);
  return {
    schedule,
    cursorMs,
    playbackRate,
    status,
    activeBeatIds: findActiveBeatIds(schedule, cursorMs),
    ...(input.associatedStateHash !== undefined
      ? { associatedStateHash: input.associatedStateHash }
      : {}),
  };
}

export function skipPresentationDirector(
  snapshot: PresentationDirectorSnapshot,
): PresentationDirectorSnapshot {
  return createPresentationDirectorSnapshot(snapshot.schedule, {
    cursorMs: snapshot.schedule.totalDurationMs,
    playbackRate: snapshot.playbackRate,
    status: "complete",
    ...(snapshot.associatedStateHash !== undefined
      ? { associatedStateHash: snapshot.associatedStateHash }
      : {}),
  });
}

export function setPresentationPlaybackRate(
  snapshot: PresentationDirectorSnapshot,
  playbackRate: number,
): PresentationDirectorSnapshot {
  return createPresentationDirectorSnapshot(snapshot.schedule, {
    cursorMs: snapshot.cursorMs,
    playbackRate,
    status: snapshot.status,
    ...(snapshot.associatedStateHash !== undefined
      ? { associatedStateHash: snapshot.associatedStateHash }
      : {}),
  });
}

export function classifyPresentationIntent(type: string): PresentationBeatKind {
  if (type === MOVE_OBJECT_INTENT_TYPE) {
    return "move";
  }

  if (type === DRAW_CARDS_INTENT_TYPE) {
    return "draw";
  }

  if (type === DISCARD_INTENT_TYPE) {
    return "discard";
  }

  if (type === DAMAGE_DEALT_INTENT_TYPE) {
    return "damage";
  }

  if (type === OBJECT_DESTROYED_INTENT_TYPE) {
    return "destroy";
  }

  if (type === RESOURCE_CHANGED_INTENT_TYPE) {
    return "resource";
  }

  if (type === COUNTER_CHANGED_INTENT_TYPE) {
    return "counter";
  }

  if (type.toLowerCase().includes("objective")) {
    return "objective";
  }

  return "generic";
}

function createTrackId(
  intent: PresentationIntent,
  kind: PresentationBeatKind,
  index: number,
  trackBy: PresentationTrackStrategy,
): string {
  if (trackBy === "kind") {
    return `kind:${kind}`;
  }

  if (trackBy === "intent") {
    return `intent:${intent.id}`;
  }

  return `sequence:${index}`;
}

function findActiveBeatIds(schedule: BeatSchedule, cursorMs: number): readonly string[] {
  return schedule.beats
    .filter((beat) => cursorMs >= beat.startTimeMs && cursorMs < beat.startTimeMs + beat.durationMs)
    .map((beat) => beat.id);
}

function inferStatus(cursorMs: number, totalDurationMs: number): PresentationDirectorStatus {
  return totalDurationMs > 0 && cursorMs >= totalDurationMs ? "complete" : "idle";
}

function clampCursor(cursorMs: number, totalDurationMs: number): number {
  if (!Number.isFinite(cursorMs)) {
    return 0;
  }

  return Math.min(Math.max(0, cursorMs), totalDurationMs);
}

function normalizeNonNegativeInteger(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isInteger(value) || value < 0) {
    return fallback;
  }

  return value;
}

function normalizePositiveNumber(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}
