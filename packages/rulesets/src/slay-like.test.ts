import { fileURLToPath } from "node:url";

import { loadContentManifestFile } from "@ucre/content-compiler";
import { executeCommand } from "@ucre/core";
import { describe, expect, it } from "vitest";

import {
  SLAY_LIKE_CARD_DEFINITIONS,
  SLAY_LIKE_COMMANDS,
  SLAY_LIKE_ENEMY_DEFINITIONS,
  SLAY_LIKE_EVENTS,
  SLAY_LIKE_OBJECTIVES,
  SLAY_LIKE_PHASES,
  SLAY_LIKE_RELIC_DEFINITIONS,
  SLAY_LIKE_RESOURCES,
  SLAY_LIKE_ZONES,
  createSlayLikeCommandRegistry,
  createSlayLikeContentFromManifest,
  createSlayLikeEncounter,
  executeSlayLikeCommand,
} from "./slay-like.js";

describe("slay-like encounter scaffold", () => {
  it("creates the starting phase, resources, zones, and starter deck", () => {
    const state = createSlayLikeEncounter({
      gameId: "slay-1",
      seed: "seed-1",
    });

    expect(state.phase).toBe(SLAY_LIKE_PHASES.playerTurn);
    expect(state.resources["player-1"]?.values[SLAY_LIKE_RESOURCES.energy]).toBe(3);
    expect(state.zones[SLAY_LIKE_ZONES.drawPile]?.objectIds).toEqual([
      "strike-1",
      "strike-2",
      "strike-3",
      "defend-1",
      "defend-2",
    ]);
    expect(state.zones[SLAY_LIKE_ZONES.hand]?.objectIds).toEqual([]);
    expect(state.zones[SLAY_LIKE_ZONES.relic]?.objectIds).toEqual(["relic-burning-blood"]);
    expect(state.objects["relic-burning-blood"]?.definitionId).toBe("burningBlood");
    expect(state.zones[SLAY_LIKE_ZONES.enemy]?.kind).toBe("enemy");
    expect(state.zones[SLAY_LIKE_ZONES.enemy]?.objectIds).toEqual(["enemy-jaw-worm"]);
    expect(state.objects["enemy-jaw-worm"]?.attributes.hp).toBe(12);
    expect(state.objectives).toEqual([
      {
        id: SLAY_LIKE_OBJECTIVES.defeatEnemies,
        type: "SlayDefeatEnemies",
        status: "pending",
        payload: {
          enemyZoneId: SLAY_LIKE_ZONES.enemy,
        },
      },
      {
        id: SLAY_LIKE_OBJECTIVES.surviveEncounter,
        type: "SlaySurviveEncounter",
        status: "pending",
        payload: {
          playerId: "player-1",
        },
      },
    ]);
  });

  it("defines the Phase 2 sample cards, enemies, and starter relic", () => {
    expect(Object.keys(SLAY_LIKE_CARD_DEFINITIONS)).toHaveLength(12);
    expect(Object.keys(SLAY_LIKE_ENEMY_DEFINITIONS).sort()).toEqual(["acidSlime", "jawWorm"]);
    expect(Object.keys(SLAY_LIKE_RELIC_DEFINITIONS)).toEqual(["burningBlood"]);
  });

  it("loads compiled Slay-like content into the command flow", () => {
    const compiled = loadContentManifestFile(
      fileURLToPath(new URL("../fixtures/slay-like-sample-manifest.yaml", import.meta.url)),
    );

    expect(compiled.ok).toBe(true);
    if (!compiled.ok) {
      throw new Error(`Content manifest unexpectedly failed: ${compiled.errors[0]?.message}`);
    }

    const content = createSlayLikeContentFromManifest({
      manifest: compiled.manifest,
      manifestHash: compiled.manifestHash,
      rewardPoolId: "act1Rewards",
    });
    const state = createSlayLikeEncounter({
      gameId: "slay-content-1",
      seed: "seed-content-1",
      contentManifestHash: content.contentManifestHash,
      cardDefinitions: content.cardDefinitions,
      starterDeck: content.starterDeck,
      enemies: content.enemies,
      relics: content.relics,
    });

    expect(state.contentManifestHash).toBe(compiled.manifestHash);
    expect(state.zones[SLAY_LIKE_ZONES.drawPile]?.objectIds).toEqual([
      "strike-1",
      "strike-2",
      "strike-3",
      "defend-1",
      "defend-2",
    ]);
    expect(state.zones[SLAY_LIKE_ZONES.enemy]?.objectIds).toEqual(["enemy-jaw-worm"]);
    expect(content.cardDefinitions.ironWave).toMatchObject({
      damage: 4,
      block: 4,
    });

    const draw = executeSlayLikeCommand({
      state,
      content,
      command: {
        id: "command-1",
        type: SLAY_LIKE_COMMANDS.drawCards,
        playerId: "player-1",
        payload: {
          count: 3,
        },
      },
    });

    expect(draw.ok).toBe(true);
    if (!draw.ok) {
      throw new Error("Draw command unexpectedly failed.");
    }

    const firstStrike = executeSlayLikeCommand({
      state: draw.state,
      content,
      command: {
        id: "command-2",
        type: SLAY_LIKE_COMMANDS.playCard,
        playerId: "player-1",
        payload: {
          cardId: "strike-1",
          targetObjectId: "enemy-jaw-worm",
        },
      },
    });

    expect(firstStrike.ok).toBe(true);
    if (!firstStrike.ok) {
      throw new Error("First Strike command unexpectedly failed.");
    }

    const secondStrike = executeSlayLikeCommand({
      state: firstStrike.state,
      content,
      command: {
        id: "command-3",
        type: SLAY_LIKE_COMMANDS.playCard,
        playerId: "player-1",
        payload: {
          cardId: "strike-2",
          targetObjectId: "enemy-jaw-worm",
        },
      },
    });

    expect(secondStrike.ok).toBe(true);
    if (!secondStrike.ok) {
      throw new Error("Second Strike command unexpectedly failed.");
    }

    expect(secondStrike.state.phase).toBe(SLAY_LIKE_PHASES.reward);
    expect(secondStrike.state.zones[SLAY_LIKE_ZONES.reward]?.objectIds).toEqual([
      "reward-card-heavy-strike",
      "reward-card-iron-wave",
      "reward-card-brace",
    ]);

    const chooseReward = executeSlayLikeCommand({
      state: secondStrike.state,
      content,
      command: {
        id: "command-4",
        type: SLAY_LIKE_COMMANDS.chooseReward,
        playerId: "player-1",
        payload: {
          rewardObjectId: "reward-card-iron-wave",
        },
      },
    });

    expect(chooseReward.ok).toBe(true);
    if (!chooseReward.ok) {
      throw new Error("Choose reward command unexpectedly failed.");
    }

    expect(chooseReward.state.phase).toBe(SLAY_LIKE_PHASES.complete);
    expect(chooseReward.state.zones[SLAY_LIKE_ZONES.discardPile]?.objectIds).toEqual([
      "strike-1",
      "strike-2",
      "reward-card-iron-wave",
    ]);
  });

  it("draws cards through the ruleset command registry and core pipeline", () => {
    const state = createSlayLikeEncounter({
      gameId: "slay-1",
      seed: "seed-1",
    });
    const result = executeCommand({
      state,
      command: {
        id: "command-1",
        type: SLAY_LIKE_COMMANDS.drawCards,
        playerId: "player-1",
        payload: {
          count: 3,
        },
      },
      commandRegistry: createSlayLikeCommandRegistry(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Draw command unexpectedly failed.");
    }

    expect(result.state.zones[SLAY_LIKE_ZONES.hand]?.objectIds).toEqual([
      "strike-1",
      "strike-2",
      "strike-3",
    ]);
    expect(result.state.zones[SLAY_LIKE_ZONES.drawPile]?.objectIds).toEqual([
      "defend-1",
      "defend-2",
    ]);
    expect(result.events.at(-1)?.type).toBe("CardsDrawn");
  });

  it("plays Strike through command legality and core effects", () => {
    const state = createSlayLikeEncounter({
      gameId: "slay-1",
      seed: "seed-1",
    });
    const registry = createSlayLikeCommandRegistry();
    const draw = executeCommand({
      state,
      command: {
        id: "command-1",
        type: SLAY_LIKE_COMMANDS.drawCards,
        playerId: "player-1",
        payload: {
          count: 1,
        },
      },
      commandRegistry: registry,
    });

    expect(draw.ok).toBe(true);
    if (!draw.ok) {
      throw new Error("Draw command unexpectedly failed.");
    }

    const play = executeCommand({
      state: draw.state,
      command: {
        id: "command-2",
        type: SLAY_LIKE_COMMANDS.playCard,
        playerId: "player-1",
        payload: {
          cardId: "strike-1",
          targetObjectId: "enemy-jaw-worm",
        },
      },
      commandRegistry: registry,
    });

    expect(play.ok).toBe(true);
    if (!play.ok) {
      throw new Error("Play command unexpectedly failed.");
    }

    expect(play.state.resources["player-1"]?.values[SLAY_LIKE_RESOURCES.energy]).toBe(2);
    expect(play.state.objects["enemy-jaw-worm"]?.attributes.hp).toBe(6);
    expect(play.state.zones[SLAY_LIKE_ZONES.discardPile]?.objectIds).toEqual(["strike-1"]);
    expect(play.events.map((event) => event.type)).toEqual([
      "ResourceChanged",
      "ObjectMoved",
      "DamageDealt",
      "ObjectMoved",
      "CardDiscarded",
    ]);
  });

  it("rejects targeted cards without a target", () => {
    const state = createSlayLikeEncounter({
      gameId: "slay-1",
      seed: "seed-1",
    });
    const registry = createSlayLikeCommandRegistry();
    const draw = executeCommand({
      state,
      command: {
        id: "command-1",
        type: SLAY_LIKE_COMMANDS.drawCards,
        playerId: "player-1",
        payload: {
          count: 1,
        },
      },
      commandRegistry: registry,
    });

    expect(draw.ok).toBe(true);
    if (!draw.ok) {
      throw new Error("Draw command unexpectedly failed.");
    }

    const play = executeCommand({
      state: draw.state,
      command: {
        id: "command-2",
        type: SLAY_LIKE_COMMANDS.playCard,
        playerId: "player-1",
        payload: {
          cardId: "strike-1",
        },
      },
      commandRegistry: registry,
    });

    expect(play.ok).toBe(false);
    if (play.ok) {
      throw new Error("Play command unexpectedly succeeded.");
    }

    expect(play.errors[0]?.code).toBe("SLAY_TARGET_REQUIRED");
  });

  it("ends the player turn by resolving enemy intent and starting the next turn", () => {
    const state = createSlayLikeEncounter({
      gameId: "slay-1",
      seed: "seed-1",
    });
    const draw = executeSlayLikeCommand({
      state,
      command: {
        id: "command-1",
        type: SLAY_LIKE_COMMANDS.drawCards,
        playerId: "player-1",
        payload: {
          count: 5,
        },
      },
    });

    expect(draw.ok).toBe(true);
    if (!draw.ok) {
      throw new Error("Draw command unexpectedly failed.");
    }

    const playDefend = executeSlayLikeCommand({
      state: draw.state,
      command: {
        id: "command-2",
        type: SLAY_LIKE_COMMANDS.playCard,
        playerId: "player-1",
        payload: {
          cardId: "defend-1",
        },
      },
    });

    expect(playDefend.ok).toBe(true);
    if (!playDefend.ok) {
      throw new Error("Defend command unexpectedly failed.");
    }

    expect(playDefend.state.resources["player-1"]?.values[SLAY_LIKE_RESOURCES.block]).toBe(5);

    const endTurn = executeSlayLikeCommand({
      state: playDefend.state,
      command: {
        id: "command-3",
        type: SLAY_LIKE_COMMANDS.endTurn,
        playerId: "player-1",
        payload: {},
      },
    });

    expect(endTurn.ok).toBe(true);
    if (!endTurn.ok) {
      throw new Error("End turn command unexpectedly failed.");
    }

    const intentEvent = endTurn.events.find(
      (event) => event.type === SLAY_LIKE_EVENTS.enemyIntentResolved,
    );
    expect(intentEvent?.payload).toMatchObject({
      playerId: "player-1",
      totalDamage: 6,
      blockedAmount: 5,
      hitPointLoss: 1,
      previousHitPoints: 80,
      nextHitPoints: 79,
    });

    const turnStartedEvent = endTurn.events.find(
      (event) => event.type === SLAY_LIKE_EVENTS.playerTurnStarted,
    );
    expect(turnStartedEvent?.payload).toMatchObject({
      playerId: "player-1",
      previousPhase: SLAY_LIKE_PHASES.enemyTurn,
      nextPhase: SLAY_LIKE_PHASES.playerTurn,
      previousTurn: 0,
      nextTurn: 1,
      nextEnergy: 3,
      nextBlock: 0,
    });
    expect(endTurn.state.phase).toBe(SLAY_LIKE_PHASES.playerTurn);
    expect(endTurn.state.turn).toBe(1);
    expect(endTurn.state.resources["player-1"]?.values[SLAY_LIKE_RESOURCES.energy]).toBe(3);
    expect(endTurn.state.resources["player-1"]?.values[SLAY_LIKE_RESOURCES.block]).toBe(0);
    expect(endTurn.state.resources["player-1"]?.values[SLAY_LIKE_RESOURCES.playerHp]).toBe(79);
    expect(endTurn.state.zones[SLAY_LIKE_ZONES.hand]?.objectIds).toEqual([]);
    expect(endTurn.state.zones[SLAY_LIKE_ZONES.discardPile]?.objectIds).toEqual([
      "defend-1",
      "strike-1",
      "strike-2",
      "strike-3",
      "defend-2",
    ]);
  });

  it("rejects ending the turn outside the player turn", () => {
    const state = {
      ...createSlayLikeEncounter({
        gameId: "slay-1",
        seed: "seed-1",
      }),
      phase: SLAY_LIKE_PHASES.enemyTurn,
    };
    const result = executeSlayLikeCommand({
      state,
      command: {
        id: "command-1",
        type: SLAY_LIKE_COMMANDS.endTurn,
        playerId: "player-1",
        payload: {},
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("End turn command unexpectedly succeeded.");
    }

    expect(result.errors[0]?.code).toBe("SLAY_NOT_PLAYER_TURN");
  });

  it("opens a reward draft after defeating the final enemy and claims a card reward", () => {
    const state = createSlayLikeEncounter({
      gameId: "slay-1",
      seed: "seed-1",
    });
    const draw = executeSlayLikeCommand({
      state,
      command: {
        id: "command-1",
        type: SLAY_LIKE_COMMANDS.drawCards,
        playerId: "player-1",
        payload: {
          count: 3,
        },
      },
    });

    expect(draw.ok).toBe(true);
    if (!draw.ok) {
      throw new Error("Draw command unexpectedly failed.");
    }

    const firstStrike = executeSlayLikeCommand({
      state: draw.state,
      command: {
        id: "command-2",
        type: SLAY_LIKE_COMMANDS.playCard,
        playerId: "player-1",
        payload: {
          cardId: "strike-1",
          targetObjectId: "enemy-jaw-worm",
        },
      },
    });

    expect(firstStrike.ok).toBe(true);
    if (!firstStrike.ok) {
      throw new Error("First Strike command unexpectedly failed.");
    }

    expect(firstStrike.state.objects["enemy-jaw-worm"]?.attributes.hp).toBe(6);
    expect(firstStrike.state.phase).toBe(SLAY_LIKE_PHASES.playerTurn);

    const secondStrike = executeSlayLikeCommand({
      state: firstStrike.state,
      command: {
        id: "command-3",
        type: SLAY_LIKE_COMMANDS.playCard,
        playerId: "player-1",
        payload: {
          cardId: "strike-2",
          targetObjectId: "enemy-jaw-worm",
        },
      },
    });

    expect(secondStrike.ok).toBe(true);
    if (!secondStrike.ok) {
      throw new Error("Second Strike command unexpectedly failed.");
    }

    expect(secondStrike.state.objects["enemy-jaw-worm"]).toBeUndefined();
    expect(secondStrike.state.zones[SLAY_LIKE_ZONES.enemy]?.objectIds).toEqual([]);
    expect(secondStrike.state.phase).toBe(SLAY_LIKE_PHASES.reward);
    expect(secondStrike.state.zones[SLAY_LIKE_ZONES.reward]?.objectIds).toEqual([
      "reward-card-heavy-strike",
      "reward-card-iron-wave",
      "reward-card-brace",
    ]);
    expect(secondStrike.events.map((event) => event.type)).toContain(
      SLAY_LIKE_EVENTS.rewardDraftOpened,
    );

    const chooseReward = executeSlayLikeCommand({
      state: secondStrike.state,
      command: {
        id: "command-4",
        type: SLAY_LIKE_COMMANDS.chooseReward,
        playerId: "player-1",
        payload: {
          rewardObjectId: "reward-card-iron-wave",
        },
      },
    });

    expect(chooseReward.ok).toBe(true);
    if (!chooseReward.ok) {
      throw new Error("Choose reward command unexpectedly failed.");
    }

    expect(chooseReward.state.phase).toBe(SLAY_LIKE_PHASES.complete);
    expect(chooseReward.state.zones[SLAY_LIKE_ZONES.reward]?.objectIds).toEqual([]);
    expect(chooseReward.state.zones[SLAY_LIKE_ZONES.discardPile]?.objectIds).toEqual([
      "strike-1",
      "strike-2",
      "reward-card-iron-wave",
    ]);
    expect(chooseReward.state.objects["reward-card-iron-wave"]?.zoneId).toBe(
      SLAY_LIKE_ZONES.discardPile,
    );
    expect(chooseReward.state.objects["reward-card-heavy-strike"]).toBeUndefined();
    expect(chooseReward.state.objects["reward-card-brace"]).toBeUndefined();
    expect(chooseReward.events.map((event) => event.type)).toContain(
      SLAY_LIKE_EVENTS.encounterCompleted,
    );
    expect(chooseReward.state.objectives.map((objective) => objective.status)).toEqual([
      "succeeded",
      "succeeded",
    ]);
    expect(chooseReward.events.map((event) => event.type)).toContain("ObjectiveSucceeded");
  });

  it("rejects choosing rewards before the reward phase", () => {
    const state = createSlayLikeEncounter({
      gameId: "slay-1",
      seed: "seed-1",
    });
    const result = executeSlayLikeCommand({
      state,
      command: {
        id: "command-1",
        type: SLAY_LIKE_COMMANDS.chooseReward,
        playerId: "player-1",
        payload: {
          rewardObjectId: "reward-card-iron-wave",
        },
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Choose reward command unexpectedly succeeded.");
    }

    expect(result.errors[0]?.code).toBe("SLAY_NOT_REWARD_PHASE");
  });

  it("marks the survival objective failed when enemy intent defeats the player", () => {
    const initial = createSlayLikeEncounter({
      gameId: "slay-1",
      seed: "seed-1",
    });
    const state = {
      ...initial,
      resources: {
        ...initial.resources,
        "player-1": {
          playerId: "player-1",
          values: {
            ...initial.resources["player-1"]?.values,
            [SLAY_LIKE_RESOURCES.playerHp]: 3,
          },
        },
      },
    };
    const result = executeSlayLikeCommand({
      state,
      command: {
        id: "command-1",
        type: SLAY_LIKE_COMMANDS.endTurn,
        playerId: "player-1",
        payload: {},
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("End turn command unexpectedly failed.");
    }

    expect(result.state.phase).toBe(SLAY_LIKE_PHASES.defeat);
    expect(result.state.resources["player-1"]?.values[SLAY_LIKE_RESOURCES.playerHp]).toBe(0);
    expect(result.state.objectives).toEqual([
      {
        id: SLAY_LIKE_OBJECTIVES.defeatEnemies,
        type: "SlayDefeatEnemies",
        status: "pending",
        payload: {
          enemyZoneId: SLAY_LIKE_ZONES.enemy,
        },
      },
      {
        id: SLAY_LIKE_OBJECTIVES.surviveEncounter,
        type: "SlaySurviveEncounter",
        status: "failed",
        payload: {
          playerId: "player-1",
        },
      },
    ]);
    expect(result.events.map((event) => event.type)).toContain("ObjectiveFailed");
    expect(result.events.map((event) => event.type)).not.toContain(
      SLAY_LIKE_EVENTS.playerTurnStarted,
    );
  });
});
