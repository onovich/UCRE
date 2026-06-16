import { describe, expect, it } from "vitest";

import { compileContentManifest } from "./index.js";

describe("content compiler", () => {
  it("compiles a valid manifest to canonical JSON", () => {
    const result = compileContentManifest({
      manifestId: "testManifest",
      rulesetId: "slay-like",
      version: "1.0.0",
      resources: [
        {
          id: "energy",
          name: "Energy",
        },
      ],
      zones: [
        {
          id: "hand",
          kind: "hand",
          owner: "player",
        },
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
              type: "DamageDealt",
              payload: {
                amount: 6,
              },
            },
          ],
        },
        {
          id: "defend",
          name: "Defend",
          cost: 1,
        },
      ],
      commands: [
        {
          id: "draw",
          type: "DrawCards",
          label: "Draw",
          effects: [
            {
              id: "drawCards",
              type: "CardsDrawn",
              payload: {
                fromZoneId: "drawPile",
                toZoneId: "hand",
              },
            },
          ],
        },
      ],
      presentationProfiles: [
        {
          id: "cardsDrawnFallback",
          eventType: "CardsDrawn",
          beatType: "drawCards",
          fallback: true,
        },
        {
          id: "damageFallback",
          eventType: "DamageDealt",
          beatType: "damage",
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
            {
              cardId: "defend",
            },
          ],
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("compileContentManifest unexpectedly failed.");
    }

    expect(result.manifestHash).toMatch(/^ucre1-/);
    const canonical = JSON.parse(result.canonicalJson) as {
      readonly cards: readonly { readonly id: string }[];
      readonly rewardPools: readonly { readonly choices: readonly { readonly cardId: string }[] }[];
      readonly zones: readonly { readonly id: string }[];
    };
    expect(canonical.cards.map((card) => card.id)).toEqual(["defend", "strike"]);
    expect(canonical.zones.map((zone) => zone.id)).toEqual(["drawPile", "hand"]);
    expect(canonical.rewardPools[0]?.choices.map((choice) => choice.cardId)).toEqual([
      "defend",
      "strike",
    ]);
  });

  it("produces the same manifest hash for semantically equivalent ordering", () => {
    const first = compileContentManifest({
      manifestId: "orderedManifest",
      rulesetId: "slay-like",
      version: "1.0.0",
      cards: [
        {
          id: "strike",
          name: "Strike",
          cost: 1,
        },
        {
          id: "defend",
          name: "Defend",
          cost: 1,
        },
      ],
    });
    const second = compileContentManifest({
      version: "1.0.0",
      rulesetId: "slay-like",
      manifestId: "orderedManifest",
      cards: [
        {
          cost: 1,
          name: "Defend",
          id: "defend",
        },
        {
          cost: 1,
          name: "Strike",
          id: "strike",
        },
      ],
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      throw new Error("compileContentManifest unexpectedly failed.");
    }

    expect(first.manifestHash).toBe(second.manifestHash);
  });

  it("rejects duplicate ids and missing reward cards", () => {
    const result = compileContentManifest({
      manifestId: "badManifest",
      rulesetId: "slay-like",
      version: "1.0.0",
      cards: [
        {
          id: "strike",
          name: "Strike",
          cost: 1,
        },
        {
          id: "strike",
          name: "Strike Again",
          cost: 1,
        },
      ],
      rewardPools: [
        {
          id: "basicRewards",
          choices: [
            {
              cardId: "missingCard",
            },
          ],
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("compileContentManifest unexpectedly succeeded.");
    }

    expect(result.errors.map((error) => error.code)).toEqual(["DUPLICATE_ID", "CARD_NOT_FOUND"]);
  });

  it("rejects missing resource and zone references in effect payloads", () => {
    const result = compileContentManifest({
      manifestId: "badReferences",
      rulesetId: "slay-like",
      version: "1.0.0",
      effects: [
        {
          id: "gainEnergy",
          type: "ResourceChanged",
          payload: {
            resourceId: "energy",
          },
        },
        {
          id: "moveCard",
          type: "ObjectMoved",
          payload: {
            toZoneId: "discardPile",
          },
        },
      ],
      presentationProfiles: [
        {
          id: "resourceFallback",
          eventType: "ResourceChanged",
          beatType: "resource",
          fallback: true,
        },
        {
          id: "moveFallback",
          eventType: "ObjectMoved",
          beatType: "move",
          fallback: true,
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("compileContentManifest unexpectedly succeeded.");
    }

    expect(result.errors.map((error) => error.code)).toEqual([
      "RESOURCE_NOT_FOUND",
      "ZONE_NOT_FOUND",
    ]);
  });

  it("rejects missing presentation profiles and missing fallbacks", () => {
    const result = compileContentManifest({
      manifestId: "badPresentation",
      rulesetId: "slay-like",
      version: "1.0.0",
      effects: [
        {
          id: "explicitMissing",
          type: "DamageDealt",
          presentationProfileId: "missingProfile",
        },
        {
          id: "fallbackMissing",
          type: "ObjectDestroyed",
        },
      ],
      presentationProfiles: [
        {
          id: "damageFallback",
          eventType: "DamageDealt",
          beatType: "damage",
          fallback: true,
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("compileContentManifest unexpectedly succeeded.");
    }

    expect(result.errors.map((error) => error.code)).toEqual([
      "PRESENTATION_PROFILE_NOT_FOUND",
      "PRESENTATION_FALLBACK_NOT_FOUND",
    ]);
  });
});
