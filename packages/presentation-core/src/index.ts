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

export type PresentationBeatProfile =
  | MovePresentationBeatProfile
  | DrawPresentationBeatProfile
  | DiscardPresentationBeatProfile
  | DamagePresentationBeatProfile
  | DestroyPresentationBeatProfile
  | ResourcePresentationBeatProfile
  | CounterPresentationBeatProfile
  | GenericPresentationBeatProfile;

export interface BasePresentationBeatProfile {
  readonly kind: PresentationBeatKind;
  readonly sourceIntentType: string;
}

export interface MovePresentationBeatProfile extends BasePresentationBeatProfile {
  readonly kind: "move";
  readonly objectId?: string;
  readonly fromZoneId?: string;
  readonly toZoneId?: string;
  readonly fromIndex?: number;
  readonly toIndex?: number;
}

export interface DrawPresentationBeatProfile extends BasePresentationBeatProfile {
  readonly kind: "draw";
  readonly fromZoneId?: string;
  readonly toZoneId?: string;
  readonly requestedCount?: number;
  readonly drawnCount?: number;
  readonly drawnObjectIds?: readonly string[];
}

export interface DiscardPresentationBeatProfile extends BasePresentationBeatProfile {
  readonly kind: "discard";
  readonly objectId?: string;
  readonly fromZoneId?: string;
  readonly toZoneId?: string;
}

export interface DamagePresentationBeatProfile extends BasePresentationBeatProfile {
  readonly kind: "damage";
  readonly objectId?: string;
  readonly amount?: number;
  readonly blockedAmount?: number;
  readonly hitPointLoss?: number;
  readonly previousHitPoints?: number;
  readonly nextHitPoints?: number;
}

export interface DestroyPresentationBeatProfile extends BasePresentationBeatProfile {
  readonly kind: "destroy";
  readonly objectId?: string;
  readonly fromZoneId?: string;
}

export interface ResourcePresentationBeatProfile extends BasePresentationBeatProfile {
  readonly kind: "resource";
  readonly playerId?: string;
  readonly resourceId?: string;
  readonly previousValue?: number;
  readonly nextValue?: number;
  readonly delta?: number;
}

export interface CounterPresentationBeatProfile extends BasePresentationBeatProfile {
  readonly kind: "counter";
  readonly objectId?: string;
  readonly counterId?: string;
  readonly previousValue?: number;
  readonly nextValue?: number;
  readonly delta?: number;
}

export interface GenericPresentationBeatProfile extends BasePresentationBeatProfile {
  readonly kind: "objective" | "generic";
  readonly payload: JsonObject;
}

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
  readonly profile: PresentationBeatProfile;
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
      profile: createPresentationBeatProfile(intent),
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

export function createPresentationBeatProfile(intent: PresentationIntent): PresentationBeatProfile {
  const kind = classifyPresentationIntent(intent.type);

  if (kind === "move") {
    return createMoveProfile(intent);
  }

  if (kind === "draw") {
    return createDrawProfile(intent);
  }

  if (kind === "discard") {
    return createDiscardProfile(intent);
  }

  if (kind === "damage") {
    return createDamageProfile(intent);
  }

  if (kind === "destroy") {
    return createDestroyProfile(intent);
  }

  if (kind === "resource") {
    return createResourceProfile(intent);
  }

  if (kind === "counter") {
    return createCounterProfile(intent);
  }

  return {
    kind,
    sourceIntentType: intent.type,
    payload: intent.payload,
  };
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

function createMoveProfile(intent: PresentationIntent): MovePresentationBeatProfile {
  const objectId = readString(intent.payload, "objectId");
  const fromZoneId = readString(intent.payload, "fromZoneId");
  const toZoneId = readString(intent.payload, "toZoneId");
  const fromIndex = readNumber(intent.payload, "fromIndex");
  const toIndex = readNumber(intent.payload, "toIndex");
  return {
    kind: "move",
    sourceIntentType: intent.type,
    ...(objectId !== undefined ? { objectId } : {}),
    ...(fromZoneId !== undefined ? { fromZoneId } : {}),
    ...(toZoneId !== undefined ? { toZoneId } : {}),
    ...(fromIndex !== undefined ? { fromIndex } : {}),
    ...(toIndex !== undefined ? { toIndex } : {}),
  };
}

function createDrawProfile(intent: PresentationIntent): DrawPresentationBeatProfile {
  const fromZoneId = readString(intent.payload, "fromZoneId");
  const toZoneId = readString(intent.payload, "toZoneId");
  const requestedCount = readNumber(intent.payload, "requestedCount");
  const drawnCount = readNumber(intent.payload, "drawnCount");
  const drawnObjectIds = readStringArray(intent.payload, "drawnObjectIds");
  return {
    kind: "draw",
    sourceIntentType: intent.type,
    ...(fromZoneId !== undefined ? { fromZoneId } : {}),
    ...(toZoneId !== undefined ? { toZoneId } : {}),
    ...(requestedCount !== undefined ? { requestedCount } : {}),
    ...(drawnCount !== undefined ? { drawnCount } : {}),
    ...(drawnObjectIds !== undefined ? { drawnObjectIds } : {}),
  };
}

function createDiscardProfile(intent: PresentationIntent): DiscardPresentationBeatProfile {
  const objectId = readString(intent.payload, "objectId");
  const fromZoneId = readString(intent.payload, "fromZoneId");
  const toZoneId = readString(intent.payload, "toZoneId");
  return {
    kind: "discard",
    sourceIntentType: intent.type,
    ...(objectId !== undefined ? { objectId } : {}),
    ...(fromZoneId !== undefined ? { fromZoneId } : {}),
    ...(toZoneId !== undefined ? { toZoneId } : {}),
  };
}

function createDamageProfile(intent: PresentationIntent): DamagePresentationBeatProfile {
  const objectId = readString(intent.payload, "objectId");
  const amount = readNumber(intent.payload, "amount");
  const blockedAmount = readNumber(intent.payload, "blockedAmount");
  const hitPointLoss = readNumber(intent.payload, "hitPointLoss");
  const previousHitPoints = readNumber(intent.payload, "previousHitPoints");
  const nextHitPoints = readNumber(intent.payload, "nextHitPoints");
  return {
    kind: "damage",
    sourceIntentType: intent.type,
    ...(objectId !== undefined ? { objectId } : {}),
    ...(amount !== undefined ? { amount } : {}),
    ...(blockedAmount !== undefined ? { blockedAmount } : {}),
    ...(hitPointLoss !== undefined ? { hitPointLoss } : {}),
    ...(previousHitPoints !== undefined ? { previousHitPoints } : {}),
    ...(nextHitPoints !== undefined ? { nextHitPoints } : {}),
  };
}

function createDestroyProfile(intent: PresentationIntent): DestroyPresentationBeatProfile {
  const objectId = readString(intent.payload, "objectId");
  const fromZoneId = readString(intent.payload, "fromZoneId");
  return {
    kind: "destroy",
    sourceIntentType: intent.type,
    ...(objectId !== undefined ? { objectId } : {}),
    ...(fromZoneId !== undefined ? { fromZoneId } : {}),
  };
}

function createResourceProfile(intent: PresentationIntent): ResourcePresentationBeatProfile {
  const playerId = readString(intent.payload, "playerId");
  const resourceId = readString(intent.payload, "resourceId");
  const previousValue = readNumber(intent.payload, "previousValue");
  const nextValue = readNumber(intent.payload, "nextValue");
  const delta = readNumber(intent.payload, "delta");
  return {
    kind: "resource",
    sourceIntentType: intent.type,
    ...(playerId !== undefined ? { playerId } : {}),
    ...(resourceId !== undefined ? { resourceId } : {}),
    ...(previousValue !== undefined ? { previousValue } : {}),
    ...(nextValue !== undefined ? { nextValue } : {}),
    ...(delta !== undefined ? { delta } : {}),
  };
}

function createCounterProfile(intent: PresentationIntent): CounterPresentationBeatProfile {
  const objectId = readString(intent.payload, "objectId");
  const counterId = readString(intent.payload, "counterId");
  const previousValue = readNumber(intent.payload, "previousValue");
  const nextValue = readNumber(intent.payload, "nextValue");
  const delta = readNumber(intent.payload, "delta");
  return {
    kind: "counter",
    sourceIntentType: intent.type,
    ...(objectId !== undefined ? { objectId } : {}),
    ...(counterId !== undefined ? { counterId } : {}),
    ...(previousValue !== undefined ? { previousValue } : {}),
    ...(nextValue !== undefined ? { nextValue } : {}),
    ...(delta !== undefined ? { delta } : {}),
  };
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

function readString(payload: JsonObject, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" ? value : undefined;
}

function readNumber(payload: JsonObject, key: string): number | undefined {
  const value = payload[key];
  return typeof value === "number" ? value : undefined;
}

function readStringArray(payload: JsonObject, key: string): readonly string[] | undefined {
  const value = payload[key];
  return Array.isArray(value) && value.every((entry) => typeof entry === "string")
    ? value
    : undefined;
}

function normalizePositiveNumber(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}
