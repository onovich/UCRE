import type { GameState, RuleEvent } from "./contracts.js";

export type StableHash = `ucre1-${string}`;

export function stableStringify(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot stable stringify non-finite number: ${value}`);
    }

    return JSON.stringify(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(",")}}`;
  }

  throw new Error(`Cannot stable stringify value of type ${typeof value}`);
}

export function stableHash(value: unknown): StableHash {
  const serialized = stableStringify(value);
  let hash = 0x811c9dc5;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `ucre1-${hash.toString(16).padStart(8, "0")}`;
}

export function hashGameState(state: GameState): StableHash {
  return stableHash(state);
}

export function hashRuleEvents(events: readonly RuleEvent[]): StableHash {
  return stableHash(events);
}
