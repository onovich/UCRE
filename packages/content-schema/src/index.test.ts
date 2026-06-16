import { describe, expect, it } from "vitest";

import { parseContentManifest, safeParseContentManifest } from "./index.js";

describe("content manifest schema", () => {
  it("parses cards, enemies, relics, resources, zones, objectives, commands, presentation profiles, and rewards", () => {
    const manifest = parseContentManifest({
      manifestId: "slayLikeManifest",
      rulesetId: "slay-like",
      version: "1.0.0",
      resources: [
        {
          id: "energy",
          name: "Energy",
          initialValue: 3,
          minValue: 0,
        },
      ],
      zones: [
        {
          id: "drawPile",
          kind: "deck",
          owner: "player",
        },
      ],
      cards: [
        {
          id: "strike",
          name: "Strike",
          cost: 1,
          targetPolicy: "enemy",
          effects: [
            {
              id: "strikeDamage",
              type: "DealDamage",
              payload: {
                amount: 6,
                target: "selectedTarget",
              },
              presentationProfileId: "damageProfile",
            },
          ],
        },
      ],
      relics: [
        {
          id: "burningBlood",
          name: "Burning Blood",
        },
      ],
      enemies: [
        {
          id: "jawWorm",
          name: "Jaw Worm",
          hp: 12,
          intents: [
            {
              id: "jawWormBite",
              type: "DealDamage",
              payload: {
                amount: 6,
              },
            },
          ],
        },
      ],
      objectives: [
        {
          id: "defeatEnemies",
          type: "DefeatAllEnemies",
        },
      ],
      commands: [
        {
          id: "playCard",
          type: "PlayCard",
          label: "Play Card",
          payload: {
            requiresCardId: true,
          },
        },
      ],
      effects: [
        {
          id: "globalDraw",
          type: "DrawCards",
          payload: {
            count: 5,
          },
        },
      ],
      presentationProfiles: [
        {
          id: "damageProfile",
          eventType: "DamageDealt",
          beatType: "cardHit",
          fallback: true,
        },
      ],
      rewardPools: [
        {
          id: "basicRewards",
          choices: [
            {
              cardId: "strike",
            },
          ],
        },
      ],
    });

    expect(manifest.cards[0]?.effects[0]?.payload.amount).toBe(6);
    expect(manifest.relics[0]?.description).toBe("");
    expect(manifest.enemies[0]?.block).toBe(0);
    expect(manifest.rewardPools[0]?.choices[0]?.weight).toBe(1);
  });

  it("rejects negative costs, empty reward pools, and unsafe ids", () => {
    expect(
      safeParseContentManifest({
        manifestId: "badManifest",
        rulesetId: "slay-like",
        version: "1.0.0",
        cards: [
          {
            id: "strike",
            name: "Strike",
            cost: -1,
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      safeParseContentManifest({
        manifestId: "badManifest",
        rulesetId: "slay-like",
        version: "1.0.0",
        rewardPools: [
          {
            id: "emptyRewards",
            choices: [],
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      safeParseContentManifest({
        manifestId: "bad manifest",
        rulesetId: "slay-like",
        version: "1.0.0",
      }).success,
    ).toBe(false);
  });

  it("rejects unknown keys before content reaches the compiler", () => {
    const result = safeParseContentManifest({
      manifestId: "strictManifest",
      rulesetId: "slay-like",
      version: "1.0.0",
      cards: [
        {
          id: "strike",
          name: "Strike",
          cost: 1,
          mystery: true,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
