import { describe, expect, it } from "vitest";

import {
  buildEditorManifest,
  compileCardEditorDrafts,
  compileEditorContent,
  createInitialDraftContent,
  createInitialDraftCards,
  runStaticBalanceChecks,
  type DraftCard,
} from "./card-editor-model.js";

describe("card editor model", () => {
  it("builds a compileable card manifest from the default draft cards", () => {
    const preview = compileCardEditorDrafts(createInitialDraftCards());

    expect(preview.result.ok).toBe(true);
    if (!preview.result.ok) {
      throw new Error("Default editor draft failed compilation.");
    }

    expect(preview.result.manifestHash).toMatch(/^ucre1-/);
    expect(preview.balanceChecks).toEqual([]);
    const canonical = JSON.parse(preview.result.canonicalJson) as {
      readonly cards: readonly { readonly id: string }[];
    };

    expect(canonical.cards.map((card) => card.id)).toEqual(["guardPulse", "sparkStrike"]);
  });

  it("surfaces duplicate card IDs through the shared content compiler", () => {
    const [first, second] = createInitialDraftCards();
    if (!first || !second) {
      throw new Error("Default editor cards are missing.");
    }

    const duplicate: DraftCard = {
      ...second,
      id: first.id,
    };
    const preview = compileCardEditorDrafts([first, duplicate]);

    expect(preview.result.ok).toBe(false);
    if (preview.result.ok) {
      throw new Error("Duplicate card IDs unexpectedly compiled.");
    }

    expect(preview.result.errors.map((error) => error.code)).toEqual(["DUPLICATE_ID"]);
  });

  it("keeps effect payloads compiler-visible for edited card effects", () => {
    const [first] = createInitialDraftCards();
    if (!first) {
      throw new Error("Default editor card is missing.");
    }

    const manifest = buildEditorManifest([
      {
        ...first,
        effects: [
          {
            id: "gainEnergy",
            type: "ResourceChanged",
            amountText: "2",
          },
        ],
      },
    ]);

    expect(manifest.cards[0]?.effects[0]?.payload).toEqual({
      delta: 2,
      resourceId: "energy",
    });
  });

  it("builds a compileable manifest with draft relics and enemies", () => {
    const preview = compileEditorContent(createInitialDraftContent());

    expect(preview.result.ok).toBe(true);
    if (!preview.result.ok) {
      throw new Error("Default editor content failed compilation.");
    }

    expect(preview.result.manifest.cards).toHaveLength(2);
    expect(preview.result.manifest.relics.map((relic) => relic.id)).toEqual(["emberAnchor"]);
    expect(preview.result.manifest.enemies.map((enemy) => enemy.id)).toEqual(["trainingWarden"]);
    expect(preview.result.manifest.rewardPools.map((rewardPool) => rewardPool.id)).toEqual([
      "starterRewards",
    ]);
    expect(preview.result.manifestHash).toMatch(/^ucre1-/);
    expect(preview.balanceChecks).toEqual([]);
  });

  it("keeps ruleset metadata editable in the manifest", () => {
    const content = createInitialDraftContent();
    const manifest = buildEditorManifest({
      ...content,
      ruleset: {
        manifestId: "customManifest",
        rulesetId: "slay-like",
        version: "0.2.0",
      },
    });

    expect(manifest).toMatchObject({
      manifestId: "customManifest",
      rulesetId: "slay-like",
      version: "0.2.0",
    });
  });

  it("reports static balance issues for costs, rarity, pools, and unlock tags", () => {
    const content = createInitialDraftContent();
    const [firstCard, secondCard] = content.cards;
    const [rewardPool] = content.rewardPools;
    if (!firstCard || !secondCard || !rewardPool) {
      throw new Error("Default editor content is incomplete.");
    }

    const checks = runStaticBalanceChecks({
      ...content,
      cards: [
        {
          ...firstCard,
          costText: "4",
          tagsText: "attack",
        },
        {
          ...secondCard,
          tagsText: "rare",
        },
      ],
      rewardPools: [
        {
          ...rewardPool,
          choices: [
            {
              cardId: firstCard.id,
              weightText: "10",
            },
            {
              cardId: "missingCard",
              weightText: "1",
            },
          ],
        },
      ],
    });

    expect(checks.map((check) => check.code)).toEqual([
      "CARD_RARITY_MISSING",
      "CARD_COST_HIGH",
      "RARE_CARD_UNLOCK_MISSING",
      "STARTER_DECK_EMPTY",
      "REWARD_WEIGHT_DOMINANT",
      "REWARD_CARD_MISSING",
    ]);
  });

  it("surfaces duplicate relic and enemy IDs through the shared content compiler", () => {
    const content = createInitialDraftContent();
    const [relic] = content.relics;
    const [enemy] = content.enemies;
    if (!relic || !enemy) {
      throw new Error("Default editor relic or enemy is missing.");
    }

    const preview = compileEditorContent({
      ...content,
      relics: [relic, relic],
      enemies: [enemy, enemy],
    });

    expect(preview.result.ok).toBe(false);
    if (preview.result.ok) {
      throw new Error("Duplicate relic and enemy IDs unexpectedly compiled.");
    }

    expect(preview.result.errors.map((error) => error.path)).toEqual([
      "relics.1.id",
      "enemies.1.id",
    ]);
  });

  it("keeps enemy intent payloads compiler-visible", () => {
    const content = createInitialDraftContent();
    const manifest = buildEditorManifest({
      ...content,
      enemies: content.enemies.map((enemy) => ({
        ...enemy,
        intents: [
          {
            id: "enemyBlock",
            type: "GainResource",
            amountText: "9",
          },
        ],
      })),
    });

    expect(manifest.enemies[0]?.intents[0]?.payload).toEqual({
      amount: 9,
      resourceId: "block",
    });
  });

  it("keeps reward pool choices compiler-visible", () => {
    const content = createInitialDraftContent();
    const manifest = buildEditorManifest(content);

    expect(manifest.rewardPools[0]?.choices).toEqual([
      {
        cardId: "sparkStrike",
        weight: 2,
      },
      {
        cardId: "guardPulse",
        weight: 1,
      },
    ]);
  });

  it("surfaces missing reward cards through the shared compiler", () => {
    const content = createInitialDraftContent();
    const [rewardPool] = content.rewardPools;
    if (!rewardPool) {
      throw new Error("Default editor reward pool is missing.");
    }

    const preview = compileEditorContent({
      ...content,
      rewardPools: [
        {
          ...rewardPool,
          choices: [
            {
              cardId: "missingCard",
              weightText: "1",
            },
          ],
        },
      ],
    });

    expect(preview.result.ok).toBe(false);
    if (preview.result.ok) {
      throw new Error("Invalid reward pool unexpectedly compiled.");
    }

    expect(preview.result.errors.map((error) => error.code)).toEqual(["CARD_NOT_FOUND"]);
  });

  it("surfaces invalid reward weights through the shared schema", () => {
    const content = createInitialDraftContent();
    const [rewardPool] = content.rewardPools;
    if (!rewardPool) {
      throw new Error("Default editor reward pool is missing.");
    }

    const preview = compileEditorContent({
      ...content,
      rewardPools: [
        {
          ...rewardPool,
          choices: [
            {
              cardId: "sparkStrike",
              weightText: "0",
            },
          ],
        },
      ],
    });

    expect(preview.result.ok).toBe(false);
    if (preview.result.ok) {
      throw new Error("Invalid reward weight unexpectedly compiled.");
    }

    expect(preview.result.errors.map((error) => error.code)).toEqual(["SCHEMA_INVALID"]);
  });
});
