export interface RngState {
  readonly seed: string;
  readonly streamId: string;
  readonly state: number;
  readonly drawCount: number;
}

export interface RngDraw<TValue> {
  readonly rng: RngState;
  readonly value: TValue;
}

export function createRngStream(seed: string, streamId = "rules"): RngState {
  return {
    seed,
    streamId,
    state: seedToUint32(`${seed}:${streamId}`),
    drawCount: 0,
  };
}

export function createRngStreams<const TStreamId extends string>(
  seed: string,
  streamIds: readonly TStreamId[],
): Record<TStreamId, RngState> {
  return Object.fromEntries(
    streamIds.map((streamId) => [streamId, createRngStream(seed, streamId)]),
  ) as Record<TStreamId, RngState>;
}

export function forkRngStream(parent: RngState, streamId: string): RngState {
  return createRngStream(parent.seed, `${parent.streamId}/${parent.drawCount}/${streamId}`);
}

export function nextUint32(rng: RngState): RngDraw<number> {
  const nextState = (rng.state + 0x6d2b79f5) >>> 0;
  let value = nextState;

  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

  return {
    rng: {
      ...rng,
      state: nextState,
      drawCount: rng.drawCount + 1,
    },
    value: (value ^ (value >>> 14)) >>> 0,
  };
}

export function nextFloat01(rng: RngState): RngDraw<number> {
  const draw = nextUint32(rng);

  return {
    rng: draw.rng,
    value: draw.value / 0x1_0000_0000,
  };
}

export function nextInt(rng: RngState, exclusiveMax: number): RngDraw<number> {
  if (!Number.isInteger(exclusiveMax) || exclusiveMax <= 0) {
    throw new Error(`exclusiveMax must be a positive integer, received ${exclusiveMax}`);
  }

  const draw = nextUint32(rng);

  return {
    rng: draw.rng,
    value: draw.value % exclusiveMax,
  };
}

function seedToUint32(seed: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash;
}
