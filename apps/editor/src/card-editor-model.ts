import { compileContentManifest, type ContentCompileResult } from "@ucre/content-compiler/browser";
import type { ContentManifest } from "@ucre/content-schema";

export type CardTargetPolicy = ContentManifest["cards"][number]["targetPolicy"];
export type DraftEffectKind = "DamageDealt" | "BlockGained" | "ResourceChanged";
export type EditorEntityKind = "cards" | "relics" | "enemies" | "rewardPools";

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
  readonly cards: readonly DraftCard[];
  readonly relics: readonly DraftRelic[];
  readonly enemies: readonly DraftEnemy[];
  readonly rewardPools: readonly DraftRewardPool[];
}

export interface CardEditorCompilePreview {
  readonly manifest: ContentManifest;
  readonly result: ContentCompileResult;
}

export const CARD_TARGET_POLICIES: readonly CardTargetPolicy[] = [
  "none",
  "enemy",
  "ally",
  "object",
  "zone",
];

export const DRAFT_EFFECT_KINDS: readonly DraftEffectKind[] = [
  "DamageDealt",
  "BlockGained",
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
    cards: createInitialDraftCards(),
    relics: createInitialDraftRelics(),
    enemies: createInitialDraftEnemies(),
    rewardPools: createInitialDraftRewardPools(),
  };
}

export function createInitialDraftCards(): readonly DraftCard[] {
  return [
    {
      id: "sparkStrike",
      name: "Spark Strike",
      costText: "1",
      targetPolicy: "enemy",
      tagsText: "attack, starter",
      effects: [
        {
          id: "sparkStrikeDamage",
          type: "DamageDealt",
          amountText: "6",
        },
      ],
    },
    {
      id: "guardPulse",
      name: "Guard Pulse",
      costText: "1",
      targetPolicy: "none",
      tagsText: "skill, starter",
      effects: [
        {
          id: "guardPulseBlock",
          type: "BlockGained",
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
          type: "DamageDealt",
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
    tagsText: "attack",
    effects: [
      {
        id: `draftCard${sequence}Effect`,
        type: "DamageDealt",
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
        type: "DamageDealt",
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

export function createDraftEffect(sequence: number, type: DraftEffectKind = "DamageDealt") {
  return {
    id: `effect${sequence}`,
    type,
    amountText: type === "BlockGained" ? "5" : "6",
  };
}

export function compileCardEditorDrafts(cards: readonly DraftCard[]): CardEditorCompilePreview {
  return compileEditorContent({
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
  };
}

export function buildEditorManifest(
  input: DraftEditorContent | readonly DraftCard[],
): ContentManifest {
  const content = normalizeEditorContent(input);

  return {
    manifestId: "editorDraftManifest",
    rulesetId: "slay-like",
    version: "0.1.0",
    resources: [
      {
        id: "energy",
        name: "Energy",
        initialValue: 3,
        minValue: 0,
      },
    ],
    zones: [],
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
        eventType: "DamageDealt",
        beatType: "damage",
        fallback: true,
        payload: {},
      },
      {
        id: "blockFallback",
        eventType: "BlockGained",
        beatType: "counter",
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
      cards: input as readonly DraftCard[],
      relics: [],
      enemies: [],
      rewardPools: [],
    };
  }

  return input as DraftEditorContent;
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
