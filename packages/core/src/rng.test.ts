import { describe, expect, it } from "vitest";

import { createRngStream, createRngStreams, forkRngStream, nextFloat01, nextInt } from "./rng.js";

describe("deterministic RNG streams", () => {
  it("replays the same sequence for the same seed and stream", () => {
    const first = createRngStream("seed-1", "rules");
    const second = createRngStream("seed-1", "rules");

    const firstDraws = drawInts(first, 5, 100);
    const secondDraws = drawInts(second, 5, 100);

    expect(firstDraws.values).toEqual(secondDraws.values);
    expect(firstDraws.rng.drawCount).toBe(5);
  });

  it("separates named streams for rule-affecting randomness", () => {
    const streams = createRngStreams("seed-1", ["draw", "enemyIntent"] as const);

    expect(nextInt(streams.draw, 100).value).not.toBe(nextInt(streams.enemyIntent, 100).value);
  });

  it("forks from seed, stream, and draw count", () => {
    const root = drawInts(createRngStream("seed-1", "rules"), 2, 10).rng;

    expect(forkRngStream(root, "reward")).toEqual(forkRngStream(root, "reward"));
    expect(forkRngStream(root, "reward")).not.toEqual(forkRngStream(root, "shuffle"));
  });

  it("draws bounded ints and floats without mutating the input stream", () => {
    const root = createRngStream("seed-1", "rules");
    const intDraw = nextInt(root, 3);
    const floatDraw = nextFloat01(root);

    expect(root.drawCount).toBe(0);
    expect(intDraw.value).toBeGreaterThanOrEqual(0);
    expect(intDraw.value).toBeLessThan(3);
    expect(floatDraw.value).toBeGreaterThanOrEqual(0);
    expect(floatDraw.value).toBeLessThan(1);
  });
});

function drawInts(rng: ReturnType<typeof createRngStream>, count: number, exclusiveMax: number) {
  const values: number[] = [];
  let current = rng;

  for (let index = 0; index < count; index += 1) {
    const draw = nextInt(current, exclusiveMax);
    values.push(draw.value);
    current = draw.rng;
  }

  return {
    rng: current,
    values,
  };
}
