import {
  UCRE_CONTENT_SCHEMA_PACKAGE_ID,
  safeParseContentManifest,
  type ContentEffect,
  type ContentManifest,
} from "@ucre/content-schema";
import { stableHash, type StableHash } from "@ucre/core";
import JSON5 from "json5";
import { parse as parseYaml } from "yaml";

export interface ContentCompilerIdentity {
  schemaPackageId: typeof UCRE_CONTENT_SCHEMA_PACKAGE_ID;
}

export interface ContentCompileError {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export type ContentCompileResult =
  | {
      readonly ok: true;
      readonly manifest: ContentManifest;
      readonly canonicalJson: string;
      readonly manifestHash: StableHash;
    }
  | {
      readonly ok: false;
      readonly errors: readonly ContentCompileError[];
    };

export type ContentManifestFormat = "json" | "json5" | "yaml";

interface EffectReference {
  readonly effect: ContentEffect;
  readonly path: string;
}

export function createContentCompilerIdentity(): ContentCompilerIdentity {
  return {
    schemaPackageId: UCRE_CONTENT_SCHEMA_PACKAGE_ID,
  };
}

export function compileContentManifest(input: unknown): ContentCompileResult {
  const parsed = safeParseContentManifest(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({
        code: "SCHEMA_INVALID",
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const errors = validateContentManifest(parsed.data);
  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    manifest: parsed.data,
    canonicalJson: stringifyCanonicalContentManifest(parsed.data),
    manifestHash: hashContentManifest(parsed.data),
  };
}

export function parseContentManifestText(text: string, format: ContentManifestFormat): unknown {
  switch (format) {
    case "json":
      return JSON.parse(text) as unknown;
    case "json5":
      return JSON5.parse(text) as unknown;
    case "yaml":
      return parseYaml(text) as unknown;
  }
}

export function validateContentManifest(manifest: ContentManifest): readonly ContentCompileError[] {
  const errors: ContentCompileError[] = [];
  const resourceIds = new Set(manifest.resources.map((resource) => resource.id));
  const zoneIds = new Set(manifest.zones.map((zone) => zone.id));
  const cardIds = new Set(manifest.cards.map((card) => card.id));
  const presentationProfileIds = new Set(
    manifest.presentationProfiles.map((profile) => profile.id),
  );
  const fallbackEventTypes = new Set(
    manifest.presentationProfiles
      .filter((profile) => profile.fallback)
      .map((profile) => profile.eventType),
  );

  errors.push(
    ...validateUniqueIds("resources", manifest.resources),
    ...validateUniqueIds("zones", manifest.zones),
    ...validateUniqueIds("cards", manifest.cards),
    ...validateUniqueIds("relics", manifest.relics),
    ...validateUniqueIds("enemies", manifest.enemies),
    ...validateUniqueIds("objectives", manifest.objectives),
    ...validateUniqueIds("commands", manifest.commands),
    ...validateUniqueIds("effects", manifest.effects),
    ...validateUniqueIds("presentationProfiles", manifest.presentationProfiles),
    ...validateUniqueIds("rewardPools", manifest.rewardPools),
  );

  for (const rewardPool of manifest.rewardPools) {
    for (const [index, choice] of rewardPool.choices.entries()) {
      if (!cardIds.has(choice.cardId)) {
        errors.push({
          code: "CARD_NOT_FOUND",
          path: `rewardPools.${rewardPool.id}.choices.${index}.cardId`,
          message: `Reward pool ${rewardPool.id} references missing card ${choice.cardId}.`,
        });
      }
    }
  }

  for (const { effect, path } of collectEffects(manifest)) {
    if (effect.presentationProfileId && !presentationProfileIds.has(effect.presentationProfileId)) {
      errors.push({
        code: "PRESENTATION_PROFILE_NOT_FOUND",
        path: `${path}.presentationProfileId`,
        message: `Effect ${effect.id} references missing presentation profile ${effect.presentationProfileId}.`,
      });
    }

    if (!effect.presentationProfileId && !fallbackEventTypes.has(effect.type)) {
      errors.push({
        code: "PRESENTATION_FALLBACK_NOT_FOUND",
        path,
        message: `Effect ${effect.id} of type ${effect.type} has no explicit presentation profile and no fallback profile.`,
      });
    }

    validatePayloadReference({
      errors,
      ids: resourceIds,
      code: "RESOURCE_NOT_FOUND",
      path,
      payload: effect.payload,
      keys: ["resourceId"],
      label: "resource",
    });
    validatePayloadReference({
      errors,
      ids: zoneIds,
      code: "ZONE_NOT_FOUND",
      path,
      payload: effect.payload,
      keys: ["fromZoneId", "toZoneId", "zoneId"],
      label: "zone",
    });
    validatePayloadReference({
      errors,
      ids: cardIds,
      code: "CARD_NOT_FOUND",
      path,
      payload: effect.payload,
      keys: ["cardId"],
      label: "card",
    });
  }

  return errors;
}

export function stringifyCanonicalContentManifest(manifest: ContentManifest): string {
  return `${JSON.stringify(canonicalizeContentManifest(manifest), null, 2)}\n`;
}

export function hashContentManifest(manifest: ContentManifest): StableHash {
  return stableHash(canonicalizeContentManifest(manifest));
}

export function canonicalizeContentManifest(manifest: ContentManifest): ContentManifest {
  return sortJson({
    ...manifest,
    resources: sortById(manifest.resources),
    zones: sortById(manifest.zones),
    cards: sortById(manifest.cards),
    relics: sortById(manifest.relics),
    enemies: sortById(manifest.enemies),
    objectives: sortById(manifest.objectives),
    commands: sortById(manifest.commands),
    effects: sortById(manifest.effects),
    presentationProfiles: sortById(manifest.presentationProfiles),
    rewardPools: sortById(
      manifest.rewardPools.map((rewardPool) => ({
        ...rewardPool,
        choices: [...rewardPool.choices].sort((left, right) =>
          left.cardId.localeCompare(right.cardId),
        ),
      })),
    ),
  }) as ContentManifest;
}

function validateUniqueIds(
  collectionName: string,
  entries: readonly { readonly id: string }[],
): readonly ContentCompileError[] {
  const seen = new Set<string>();
  const errors: ContentCompileError[] = [];

  for (const [index, entry] of entries.entries()) {
    if (seen.has(entry.id)) {
      errors.push({
        code: "DUPLICATE_ID",
        path: `${collectionName}.${index}.id`,
        message: `${collectionName} contains duplicate id ${entry.id}.`,
      });
    }

    seen.add(entry.id);
  }

  return errors;
}

function collectEffects(manifest: ContentManifest): readonly EffectReference[] {
  return [
    ...manifest.effects.map((effect) => ({
      effect,
      path: `effects.${effect.id}`,
    })),
    ...manifest.cards.flatMap((card) =>
      card.effects.map((effect) => ({
        effect,
        path: `cards.${card.id}.effects.${effect.id}`,
      })),
    ),
    ...manifest.relics.flatMap((relic) =>
      relic.effects.map((effect) => ({
        effect,
        path: `relics.${relic.id}.effects.${effect.id}`,
      })),
    ),
    ...manifest.enemies.flatMap((enemy) =>
      enemy.intents.map((effect) => ({
        effect,
        path: `enemies.${enemy.id}.intents.${effect.id}`,
      })),
    ),
    ...manifest.commands.flatMap((command) =>
      command.effects.map((effect) => ({
        effect,
        path: `commands.${command.id}.effects.${effect.id}`,
      })),
    ),
  ];
}

function validatePayloadReference(input: {
  readonly errors: ContentCompileError[];
  readonly ids: ReadonlySet<string>;
  readonly code: string;
  readonly path: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly keys: readonly string[];
  readonly label: string;
}): void {
  for (const key of input.keys) {
    const value = input.payload[key];
    if (typeof value === "string" && !input.ids.has(value)) {
      input.errors.push({
        code: input.code,
        path: `${input.path}.payload.${key}`,
        message: `Effect payload references missing ${input.label} ${value}.`,
      });
    }
  }
}

function sortById<T extends { readonly id: string }>(entries: readonly T[]): readonly T[] {
  return [...entries].sort((left, right) => left.id.localeCompare(right.id));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortJson(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortJson(entry)]),
    );
  }

  return value;
}
