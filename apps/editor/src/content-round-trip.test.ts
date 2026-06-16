import type { Command } from "@ucre/core";
import { runReplay } from "@ucre/replay";
import {
  SLAY_LIKE_COMMANDS,
  SLAY_LIKE_PHASES,
  SLAY_LIKE_RULES_VERSION,
  SLAY_LIKE_ZONES,
  createSlayLikeCommandRegistry,
  createSlayLikeContentFromManifest,
  createSlayLikeEffectRegistry,
  createSlayLikeEncounter,
} from "@ucre/rulesets";
import { describe, expect, it } from "vitest";

import { compileEditorContent, type DraftEditorContent } from "./card-editor-model.js";

describe("editor content round trip", () => {
  it("compiles a new editor card, loads it into Slay-like runtime, plays it, and replays it", () => {
    const editorContent: DraftEditorContent = {
      ruleset: {
        manifestId: "roundTripManifest",
        rulesetId: "slay-like",
        version: "0.1.0",
      },
      cards: [
        {
          id: "roundTripStrike",
          name: "Round Trip Strike",
          costText: "1",
          targetPolicy: "enemy",
          tagsText: "starter, attack, common",
          effects: [
            {
              id: "roundTripStrikeDamage",
              type: "DealDamage",
              amountText: "12",
            },
          ],
        },
        {
          id: "roundTripReward",
          name: "Round Trip Reward",
          costText: "0",
          targetPolicy: "none",
          tagsText: "reward, skill, common",
          effects: [
            {
              id: "roundTripRewardBlock",
              type: "GainResource",
              amountText: "4",
            },
          ],
        },
      ],
      relics: [
        {
          id: "roundTripRelic",
          name: "Round Trip Relic",
          description: "Round-trip starter relic.",
          tagsText: "starter",
          effects: [
            {
              id: "roundTripRelicEnergy",
              type: "ResourceChanged",
              amountText: "1",
            },
          ],
        },
      ],
      enemies: [
        {
          id: "roundTripDummy",
          name: "Round Trip Dummy",
          hpText: "12",
          blockText: "0",
          tagsText: "tutorial",
          intents: [
            {
              id: "roundTripDummyIntent",
              type: "DealDamage",
              amountText: "1",
            },
          ],
        },
      ],
      rewardPools: [
        {
          id: "roundTripRewards",
          choices: [
            {
              cardId: "roundTripReward",
              weightText: "1",
            },
          ],
        },
      ],
    };

    const preview = compileEditorContent(editorContent);
    expect(preview.result.ok).toBe(true);
    if (!preview.result.ok) {
      throw new Error(`Editor content unexpectedly failed: ${preview.result.errors[0]?.message}`);
    }

    const content = createSlayLikeContentFromManifest({
      manifest: preview.result.manifest,
      manifestHash: preview.result.manifestHash,
      rewardPoolId: "roundTripRewards",
    });
    const starterCard = content.starterDeck[0];
    const enemy = content.enemies[0];
    const reward = content.rewardDraft[0];
    if (!starterCard || !enemy || !reward) {
      throw new Error("Round-trip runtime content was incomplete.");
    }

    expect(content.cardDefinitions.roundTripStrike).toMatchObject({
      damage: 12,
      requiresTarget: true,
    });
    expect(content.cardDefinitions.roundTripReward).toMatchObject({
      block: 4,
      cost: 0,
    });

    const commands: readonly Command[] = [
      {
        id: "command-1",
        type: SLAY_LIKE_COMMANDS.drawCards,
        playerId: "player-1",
        payload: {
          count: 1,
        },
      },
      {
        id: "command-2",
        type: SLAY_LIKE_COMMANDS.playCard,
        playerId: "player-1",
        payload: {
          cardId: starterCard.id,
          targetObjectId: enemy.objectId,
        },
      },
      {
        id: "command-3",
        type: SLAY_LIKE_COMMANDS.chooseReward,
        playerId: "player-1",
        payload: {
          rewardObjectId: reward.objectId,
        },
      },
    ];

    const replayInput = {
      gameId: "editor-round-trip",
      seed: "seed-editor-round-trip",
      rulesVersion: SLAY_LIKE_RULES_VERSION,
      contentManifestHash: content.contentManifestHash,
      commands,
      initialState: createSlayLikeEncounter({
        gameId: "editor-round-trip",
        seed: "seed-editor-round-trip",
        contentManifestHash: content.contentManifestHash,
        cardDefinitions: content.cardDefinitions,
        starterDeck: content.starterDeck,
        enemies: content.enemies,
        relics: content.relics,
      }),
      commandRegistry: createSlayLikeCommandRegistry(content),
      effectRegistry: createSlayLikeEffectRegistry(content),
    };

    const replay = runReplay(replayInput);
    const repeatedReplay = runReplay(replayInput);

    expect(replay.ok).toBe(true);
    expect(repeatedReplay.ok).toBe(true);
    if (!replay.ok || !repeatedReplay.ok) {
      throw new Error("Round-trip replay unexpectedly failed.");
    }

    expect(replay.replayHash).toBe(repeatedReplay.replayHash);
    expect(replay.stateHash).toBe(repeatedReplay.stateHash);
    expect(replay.finalState.phase).toBe(SLAY_LIKE_PHASES.complete);
    expect(replay.finalState.contentManifestHash).toBe(preview.result.manifestHash);
    expect(replay.finalState.zones[SLAY_LIKE_ZONES.discardPile]?.objectIds).toEqual([
      starterCard.id,
      reward.objectId,
    ]);
  });
});
