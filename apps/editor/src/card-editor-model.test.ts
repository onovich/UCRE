import { describe, expect, it } from "vitest";

import {
  buildEditorManifest,
  compileCardEditorDrafts,
  createInitialDraftCards,
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
});
