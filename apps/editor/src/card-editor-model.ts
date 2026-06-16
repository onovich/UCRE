import { compileContentManifest, type ContentCompileResult } from "@ucre/content-compiler/browser";
import type { ContentManifest } from "@ucre/content-schema";

export type CardTargetPolicy = ContentManifest["cards"][number]["targetPolicy"];
export type DraftEffectKind = "DealDamage" | "GainResource" | "ResourceChanged";
export type EditorEntityKind = "cards" | "relics" | "enemies" | "rewardPools";
export type StaticBalanceSeverity = "error" | "warning";

export interface DraftRulesetMetadata {
  readonly manifestId: string;
  readonly rulesetId: string;
  readonly version: string;
}

export interface DraftCardEffect {
  readonly id: string;
  readonly type: DraftEffectKind;
  readonly amountText: string;
}

export interface DraftCard {
  readonly id: string;
  readonly name: string;
  readonly costText: string;
  readonly targetPolicy: CardTargetPolicy;
  readonly tagsText: string;
  readonly effects: readonly DraftCardEffect[];
}

export interface DraftRelic {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tagsText: string;
  readonly effects: readonly DraftCardEffect[];
}

export interface DraftEnemy {
  readonly id: string;
  readonly name: string;
  readonly hpText: string;
  readonly blockText: string;
  readonly tagsText: string;
  readonly intents: readonly DraftCardEffect[];
}

export interface DraftRewardChoice {
  readonly cardId: string;
  readonly weightText: string;
}

export interface DraftRewardPool {
  readonly id: string;
  readonly choices: readonly DraftRewardChoice[];
}

export interface DraftEditorContent {
  readonly ruleset: DraftRulesetMetadata;
  readonly cards: readonly DraftCard[];
  readonly relics: readonly DraftRelic[];
  readonly enemies: readonly DraftEnemy[];
  readonly rewardPools: readonly DraftRewardPool[];
}

export interface StaticBalanceCheck {
  readonly severity: StaticBalanceSeverity;
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface CardEditorCompilePreview {
  readonly manifest: ContentManifest;
  readonly result: ContentCompileResult;
  readonly balanceChecks: readonly StaticBalanceCheck[];
}

export const CARD_TARGET_POLICIES: readonly CardTargetPolicy[] = [
  "none",
  "enemy",
  "ally",
  "object",
  "zone",
];

export const DRAFT_EFFECT_KINDS: readonly DraftEffectKind[] = [
  "DealDamage",
  "GainResource",
  "ResourceChanged",
];

export const EDITOR_ENTITY_KINDS: readonly EditorEntityKind[] = [
  "cards",
  "relics",
  "enemies",
  "rewardPools",
];

export function createInitialDraftContent(): DraftEditorContent {
  return {
    ruleset: createDefaultDraftRulesetMetadata(),
    cards: createInitialDraftCards(),
    relics: createInitialDraftRelics(),
    enemies: createInitialDraftEnemies(),
    rewardPools: createInitialDraftRewardPools(),
  };
}

export function createDefaultDraftRulesetMetadata(): DraftRulesetMetadata {
  return {
    manifestId: "editorDraftManifest",
    rulesetId: "slay-like",
    version: "0.1.0",
  };
}

export function createInitialDraftCards(): readonly DraftCard[] {
  return [
    {
      id: "sparkStrike",
      name: "Spark Strike",
      costText: "1",
      targetPolicy: "enemy",
      tagsText: "attack, starter, common",
      effects: [
        {
          id: "sparkStrikeDamage",
          type: "DealDamage",
          amountText: "6",
        },
      ],
    },
    {
      id: "guardPulse",
      name: "Guard Pulse",
      costText: "1",
      targetPolicy: "none",
      tagsText: "skill, starter, common",
      effects: [
        {
          id: "guardPulseBlock",
          type: "GainResource",
          amountText: "5",
        },
      ],
    },
  ];
}

export function createInitialDraftRelics(): readonly DraftRelic[] {
  return [
    {
      id: "emberAnchor",
      name: "Ember Anchor",
      description: "Gain energy at combat start.",
      tagsText: "starter, energy",
      effects: [
        {
          id: "emberAnchorEnergy",
          type: "ResourceChanged",
          amountText: "1",
        },
      ],
    },
  ];
}

export function createInitialDraftEnemies(): readonly DraftEnemy[] {
  return [
    {
      id: "trainingWarden",
      name: "Training Warden",
      hpText: "42",
      blockText: "0",
      tagsText: "elite, tutorial",
      intents: [
        {
          id: "trainingWardenStrike",
          type: "DealDamage",
          amountText: "7",
        },
      ],
    },
  ];
}

export function createInitialDraftRewardPools(): readonly DraftRewardPool[] {
  return [
    {
      id: "starterRewards",
      choices: [
        {
          cardId: "sparkStrike",
          weightText: "2",
        },
        {
          cardId: "guardPulse",
          weightText: "1",
        },
      ],
    },
  ];
}

export function createDraftCard(sequence: number): DraftCard {
  return {
    id: `draftCard${sequence}`,
    name: `Draft Card ${sequence}`,
    costText: "1",
    targetPolicy: "enemy",
    tagsText: "attack, common",
    effects: [
      {
        id: `draftCard${sequence}Effect`,
        type: "DealDamage",
        amountText: "6",
      },
    ],
  };
}

export function createDraftRelic(sequence: number): DraftRelic {
  return {
    id: `draftRelic${sequence}`,
    name: `Draft Relic ${sequence}`,
    description: "Draft relic effect.",
    tagsText: "relic",
    effects: [
      {
        id: `draftRelic${sequence}Effect`,
        type: "ResourceChanged",
        amountText: "1",
      },
    ],
  };
}

export function createDraftEnemy(sequence: number): DraftEnemy {
  return {
    id: `draftEnemy${sequence}`,
    name: `Draft Enemy ${sequence}`,
    hpText: "36",
    blockText: "0",
    tagsText: "enemy",
    intents: [
      {
        id: `draftEnemy${sequence}Intent`,
        type: "DealDamage",
        amountText: "6",
      },
    ],
  };
}

export function createDraftRewardPool(
  sequence: number,
  defaultCardId = "sparkStrike",
): DraftRewardPool {
  return {
    id: `draftRewards${sequence}`,
    choices: [
      {
        cardId: defaultCardId,
        weightText: "1",
      },
    ],
  };
}

export function duplicateDraftCard(card: DraftCard, sequence: number): DraftCard {
  return {
    ...card,
    id: `${card.id}Copy${sequence}`,
    name: `${card.name} Copy ${sequence}`,
    effects: duplicateEffects(card.effects, `${card.id}Copy${sequence}Effect`),
  };
}

export function duplicateDraftRelic(relic: DraftRelic, sequence: number): DraftRelic {
  return {
    ...relic,
    id: `${relic.id}Copy${sequence}`,
    name: `${relic.name} Copy ${sequence}`,
    effects: duplicateEffects(relic.effects, `${relic.id}Copy${sequence}Effect`),
  };
}

export function duplicateDraftEnemy(enemy: DraftEnemy, sequence: number): DraftEnemy {
  return {
    ...enemy,
    id: `${enemy.id}Copy${sequence}`,
    name: `${enemy.name} Copy ${sequence}`,
    intents: duplicateEffects(enemy.intents, `${enemy.id}Copy${sequence}Intent`),
  };
}

export function duplicateDraftRewardPool(
  rewardPool: DraftRewardPool,
  sequence: number,
): DraftRewardPool {
  return {
    ...rewardPool,
    id: `${rewardPool.id}Copy${sequence}`,
    choices: rewardPool.choices.map((choice) => ({ ...choice })),
  };
}

export function createDraftEffect(sequence: number, type: DraftEffectKind = "DealDamage") {
  return {
    id: `effect${sequence}`,
    type,
    amountText: type === "GainResource" ? "5" : "6",
  };
}

export function compileCardEditorDrafts(cards: readonly DraftCard[]): CardEditorCompilePreview {
  return compileEditorContent({
    ruleset: createDefaultDraftRulesetMetadata(),
    cards,
    relics: [],
    enemies: [],
    rewardPools: [],
  });
}

export function compileEditorContent(content: DraftEditorContent): CardEditorCompilePreview {
  const manifest = buildEditorManifest(content);

  return {
    manifest,
    result: compileContentManifest(manifest),
    balanceChecks: runStaticBalanceChecks(content),
  };
}

export function runStaticBalanceChecks(
  input: DraftEditorContent | readonly DraftCard[],
): readonly StaticBalanceCheck[] {
  const content = normalizeEditorContent(input);
  const checks: StaticBalanceCheck[] = [];
  const cardIds = new Set(content.cards.map((card) => card.id.trim()).filter(Boolean));

  for (const [index, card] of content.cards.entries()) {
    const tags = splitTags(card.tagsText);
    const cost = parseInteger(card.costText);

    if (!hasRarityTag(tags)) {
      checks.push({
        severity: "warning",
        code: "CARD_RARITY_MISSING",
        path: `cards.${index}.tagsText`,
        message: `Card ${card.id || index + 1} does not declare common, uncommon, or rare.`,
      });
    }

    if (Number.isFinite(cost) && cost > 3) {
      checks.push({
        severity: "warning",
        code: "CARD_COST_HIGH",
        path: `cards.${index}.costText`,
        message: `Card ${card.id || index + 1} costs ${cost}; Slay-like starter balance expects 0-3.`,
      });
    }

    if (card.effects.length === 0) {
      checks.push({
        severity: "error",
        code: "CARD_EFFECTS_EMPTY",
        path: `cards.${index}.effects`,
        message: `Card ${card.id || index + 1} has no effects for simulation to evaluate.`,
      });
    }

    if (tags.includes("rare") && !tags.some((tag) => tag.startsWith("unlock:"))) {
      checks.push({
        severity: "warning",
        code: "RARE_CARD_UNLOCK_MISSING",
        path: `cards.${index}.tagsText`,
        message: `Rare card ${card.id || index + 1} should declare an unlock:* tag.`,
      });
    }
  }

  const starterCount = content.cards.filter((card) =>
    splitTags(card.tagsText).includes("starter"),
  ).length;
  if (starterCount === 0) {
    checks.push({
      severity: "warning",
      code: "STARTER_DECK_EMPTY",
      path: "cards",
      message: "No cards are tagged starter, so Slay-like runtime content would start empty.",
    });
  }

  for (const [poolIndex, rewardPool] of content.rewardPools.entries()) {
    if (rewardPool.choices.length === 0) {
      checks.push({
        severity: "error",
        code: "REWARD_POOL_EMPTY",
        path: `rewardPools.${poolIndex}.choices`,
        message: `Reward pool ${rewardPool.id || poolIndex + 1} has no choices.`,
      });
      continue;
    }

    const weights = rewardPool.choices.map((choice) => parseInteger(choice.weightText));
    const totalWeight = weights
      .filter((weight) => Number.isFinite(weight) && weight > 0)
      .reduce((sum, weight) => sum + weight, 0);

    for (const [choiceIndex, choice] of rewardPool.choices.entries()) {
      if (!cardIds.has(choice.cardId.trim())) {
        checks.push({
          severity: "error",
          code: "REWARD_CARD_MISSING",
          path: `rewardPools.${poolIndex}.choices.${choiceIndex}.cardId`,
          message: `Reward pool ${rewardPool.id || poolIndex + 1} references missing card ${choice.cardId}.`,
        });
      }

      const weight = weights[choiceIndex] ?? Number.NaN;
      if (
        rewardPool.choices.length > 1 &&
        Number.isFinite(weight) &&
        totalWeight > 0 &&
        weight / totalWeight > 0.75
      ) {
        checks.push({
          severity: "warning",
          code: "REWARD_WEIGHT_DOMINANT",
          path: `rewardPools.${poolIndex}.choices.${choiceIndex}.weightText`,
          message: `Reward ${choice.cardId || choiceIndex + 1} takes more than 75% of pool ${rewardPool.id || poolIndex + 1}.`,
        });
      }
    }
  }

  return checks;
}

export function buildEditorManifest(
  input: DraftEditorContent | readonly DraftCard[],
): ContentManifest {
  const content = normalizeEditorContent(input);

  return {
    manifestId: content.ruleset.manifestId.trim(),
    rulesetId: content.ruleset.rulesetId.trim(),
    version: content.ruleset.version.trim(),
    resources: createSlayLikeResources(),
    zones: createSlayLikeZones(content),
    cards: content.cards.map((card) => ({
      id: card.id.trim(),
      name: card.name.trim(),
      cost: parseInteger(card.costText),
      targetPolicy: card.targetPolicy,
      tags: splitTags(card.tagsText),
      effects: card.effects.map((effect) => ({
        id: effect.id.trim(),
        type: effect.type,
        payload: createEffectPayload(effect),
      })),
    })),
    relics: content.relics.map((relic) => ({
      id: relic.id.trim(),
      name: relic.name.trim(),
      description: relic.description.trim(),
      tags: splitTags(relic.tagsText),
      effects: relic.effects.map((effect) => ({
        id: effect.id.trim(),
        type: effect.type,
        payload: createEffectPayload(effect),
      })),
    })),
    enemies: content.enemies.map((enemy) => ({
      id: enemy.id.trim(),
      name: enemy.name.trim(),
      hp: parseInteger(enemy.hpText),
      block: parseInteger(enemy.blockText),
      tags: splitTags(enemy.tagsText),
      intents: enemy.intents.map((intent) => ({
        id: intent.id.trim(),
        type: intent.type,
        payload: createEffectPayload(intent),
      })),
    })),
    objectives: [],
    commands: [],
    effects: [],
    presentationProfiles: [
      {
        id: "damageFallback",
        eventType: "DealDamage",
        beatType: "damage",
        fallback: true,
        payload: {},
      },
      {
        id: "blockFallback",
        eventType: "GainResource",
        beatType: "resource",
        fallback: true,
        payload: {},
      },
      {
        id: "resourceFallback",
        eventType: "ResourceChanged",
        beatType: "resource",
        fallback: true,
        payload: {},
      },
    ],
    rewardPools: content.rewardPools.map((rewardPool) => ({
      id: rewardPool.id.trim(),
      choices: rewardPool.choices.map((choice) => ({
        cardId: choice.cardId.trim(),
        weight: parseInteger(choice.weightText),
      })),
    })),
  };
}

function normalizeEditorContent(
  input: DraftEditorContent | readonly DraftCard[],
): DraftEditorContent {
  if (Array.isArray(input)) {
    return {
      ruleset: createDefaultDraftRulesetMetadata(),
      cards: input as readonly DraftCard[],
      relics: [],
      enemies: [],
      rewardPools: [],
    };
  }

  return input as DraftEditorContent;
}

function hasRarityTag(tags: readonly string[]): boolean {
  return tags.includes("common") || tags.includes("uncommon") || tags.includes("rare");
}

function createSlayLikeResources(): ContentManifest["resources"] {
  return [
    {
      id: "energy",
      name: "Energy",
      initialValue: 3,
      minValue: 0,
    },
    {
      id: "playerHp",
      name: "Player HP",
      initialValue: 80,
      minValue: 0,
    },
    {
      id: "block",
      name: "Block",
      initialValue: 0,
      minValue: 0,
    },
  ];
}

function createSlayLikeZones(content: DraftEditorContent): ContentManifest["zones"] {
  return [
    {
      id: "player.drawPile",
      kind: "deck",
      owner: "player",
      metadata: {
        starterDeck: content.cards
          .filter((card) => splitTags(card.tagsText).includes("starter"))
          .map((card, index) => ({
            objectId: `card-${toObjectIdSuffix(card.id)}-${index + 1}`,
            cardId: card.id.trim(),
          })),
      },
    },
    {
      id: "player.hand",
      kind: "hand",
      owner: "player",
      metadata: {},
    },
    {
      id: "player.discardPile",
      kind: "discard",
      owner: "player",
      metadata: {},
    },
    {
      id: "player.exhaustPile",
      kind: "exhaust",
      owner: "player",
      metadata: {},
    },
    {
      id: "player.playArea",
      kind: "play",
      owner: "player",
      metadata: {},
    },
    {
      id: "player.relics",
      kind: "custom",
      owner: "player",
      metadata: {
        relics: content.relics.map((relic) => ({
          objectId: `relic-${toObjectIdSuffix(relic.id)}`,
          relicId: relic.id.trim(),
        })),
      },
    },
    {
      id: "enemy.active",
      kind: "enemy",
      owner: "enemy",
      metadata: {
        enemies: content.enemies.map((enemy) => ({
          objectId: `enemy-${toObjectIdSuffix(enemy.id)}`,
          enemyId: enemy.id.trim(),
        })),
      },
    },
    {
      id: "reward.choices",
      kind: "reward",
      owner: "shared",
      metadata: {},
    },
  ];
}

function duplicateEffects(
  effects: readonly DraftCardEffect[],
  prefix: string,
): readonly DraftCardEffect[] {
  return effects.map((effect, index) => ({
    ...effect,
    id: `${prefix}${index + 1}`,
  }));
}

function createEffectPayload(effect: DraftCardEffect): Record<string, number | string> {
  const amount = parseInteger(effect.amountText);

  if (effect.type === "ResourceChanged") {
    return {
      resourceId: "energy",
      delta: amount,
    };
  }

  if (effect.type === "GainResource") {
    return {
      resourceId: "block",
      amount,
    };
  }

  return {
    amount,
  };
}

function parseInteger(text: string): number {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return Number.NaN;
  }

  return Number(trimmed);
}

function splitTags(text: string): string[] {
  return text
    .split(/[,\s]+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function toObjectIdSuffix(id: string): string {
  const suffix = id
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return suffix || "draft";
}
