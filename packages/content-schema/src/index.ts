import { z } from "zod";

export const UCRE_CONTENT_SCHEMA_PACKAGE_ID = "@ucre/content-schema";

export type ContentJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly ContentJsonValue[]
  | { readonly [key: string]: ContentJsonValue };

export const contentJsonValueSchema: z.ZodType<ContentJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(contentJsonValueSchema),
    z.record(z.string(), contentJsonValueSchema),
  ]),
);

export const contentJsonObjectSchema = z.record(z.string(), contentJsonValueSchema);

export const contentIdSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z][A-Za-z0-9_.:-]*$/, "IDs must start with a letter and use safe symbols.");

export const zoneKindSchema = z.enum([
  "deck",
  "hand",
  "discard",
  "exhaust",
  "play",
  "enemy",
  "board",
  "reward",
  "custom",
]);

export const targetPolicySchema = z.enum(["none", "enemy", "ally", "object", "zone"]);

export const contentEffectSchema = z
  .object({
    id: contentIdSchema,
    type: contentIdSchema,
    sourceId: contentIdSchema.optional(),
    payload: contentJsonObjectSchema.default({}),
    presentationProfileId: contentIdSchema.optional(),
  })
  .strict();

export const contentCardSchema = z
  .object({
    id: contentIdSchema,
    name: z.string().min(1),
    cost: z.number().int().nonnegative(),
    targetPolicy: targetPolicySchema.default("none"),
    tags: z.array(contentIdSchema).default([]),
    effects: z.array(contentEffectSchema).default([]),
    presentationProfileId: contentIdSchema.optional(),
  })
  .strict();

export const contentRelicSchema = z
  .object({
    id: contentIdSchema,
    name: z.string().min(1),
    description: z.string().default(""),
    tags: z.array(contentIdSchema).default([]),
    effects: z.array(contentEffectSchema).default([]),
    presentationProfileId: contentIdSchema.optional(),
  })
  .strict();

export const contentEnemySchema = z
  .object({
    id: contentIdSchema,
    name: z.string().min(1),
    hp: z.number().int().positive(),
    block: z.number().int().nonnegative().default(0),
    tags: z.array(contentIdSchema).default([]),
    intents: z.array(contentEffectSchema).default([]),
    presentationProfileId: contentIdSchema.optional(),
  })
  .strict();

export const contentResourceSchema = z
  .object({
    id: contentIdSchema,
    name: z.string().min(1),
    initialValue: z.number().int().default(0),
    minValue: z.number().int().optional(),
    maxValue: z.number().int().optional(),
  })
  .strict();

export const contentZoneSchema = z
  .object({
    id: contentIdSchema,
    kind: zoneKindSchema,
    owner: z.enum(["player", "enemy", "shared"]).default("shared"),
    metadata: contentJsonObjectSchema.default({}),
  })
  .strict();

export const contentObjectiveSchema = z
  .object({
    id: contentIdSchema,
    type: contentIdSchema,
    payload: contentJsonObjectSchema.default({}),
  })
  .strict();

export const contentCommandSchema = z
  .object({
    id: contentIdSchema,
    type: contentIdSchema,
    label: z.string().min(1),
    effects: z.array(contentEffectSchema).default([]),
    payload: contentJsonObjectSchema.default({}),
  })
  .strict();

export const presentationProfileSchema = z
  .object({
    id: contentIdSchema,
    eventType: contentIdSchema,
    beatType: contentIdSchema,
    fallback: z.boolean().default(false),
    payload: contentJsonObjectSchema.default({}),
  })
  .strict();

export const rewardChoiceSchema = z
  .object({
    cardId: contentIdSchema,
    weight: z.number().int().positive().default(1),
  })
  .strict();

export const rewardPoolSchema = z
  .object({
    id: contentIdSchema,
    choices: z.array(rewardChoiceSchema).min(1),
  })
  .strict();

export const contentManifestSchema = z
  .object({
    manifestId: contentIdSchema,
    rulesetId: contentIdSchema,
    version: z.string().min(1),
    resources: z.array(contentResourceSchema).default([]),
    zones: z.array(contentZoneSchema).default([]),
    cards: z.array(contentCardSchema).default([]),
    relics: z.array(contentRelicSchema).default([]),
    enemies: z.array(contentEnemySchema).default([]),
    objectives: z.array(contentObjectiveSchema).default([]),
    commands: z.array(contentCommandSchema).default([]),
    effects: z.array(contentEffectSchema).default([]),
    presentationProfiles: z.array(presentationProfileSchema).default([]),
    rewardPools: z.array(rewardPoolSchema).default([]),
  })
  .strict();

export type ContentEffect = z.infer<typeof contentEffectSchema>;
export type ContentCard = z.infer<typeof contentCardSchema>;
export type ContentRelic = z.infer<typeof contentRelicSchema>;
export type ContentEnemy = z.infer<typeof contentEnemySchema>;
export type ContentResource = z.infer<typeof contentResourceSchema>;
export type ContentZone = z.infer<typeof contentZoneSchema>;
export type ContentObjective = z.infer<typeof contentObjectiveSchema>;
export type ContentCommand = z.infer<typeof contentCommandSchema>;
export type PresentationProfile = z.infer<typeof presentationProfileSchema>;
export type RewardChoice = z.infer<typeof rewardChoiceSchema>;
export type RewardPool = z.infer<typeof rewardPoolSchema>;
export type ContentManifest = z.infer<typeof contentManifestSchema>;

export function parseContentManifest(input: unknown): ContentManifest {
  return contentManifestSchema.parse(input);
}

export function safeParseContentManifest(input: unknown) {
  return contentManifestSchema.safeParse(input);
}
