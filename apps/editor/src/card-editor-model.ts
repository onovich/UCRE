import { compileContentManifest, type ContentCompileResult } from "@ucre/content-compiler/browser";
import type { ContentManifest } from "@ucre/content-schema";

export type CardTargetPolicy = ContentManifest["cards"][number]["targetPolicy"];
export type DraftEffectKind = "DamageDealt" | "BlockGained" | "ResourceChanged";

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

export function duplicateDraftCard(card: DraftCard, sequence: number): DraftCard {
  return {
    ...card,
    id: `${card.id}Copy${sequence}`,
    name: `${card.name} Copy ${sequence}`,
    effects: card.effects.map((effect, index) => ({
      ...effect,
      id: `${card.id}Copy${sequence}Effect${index + 1}`,
    })),
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
  const manifest = buildEditorManifest(cards);

  return {
    manifest,
    result: compileContentManifest(manifest),
  };
}

export function buildEditorManifest(cards: readonly DraftCard[]): ContentManifest {
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
    cards: cards.map((card) => ({
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
    relics: [],
    enemies: [],
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
    rewardPools: [],
  };
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
