import { useMemo, useState } from "react";

import type { Command, GameObject, GameState, JsonObject, RuleEvent } from "@ucre/core";
import {
  SLAY_LIKE_CARD_DEFINITIONS,
  SLAY_LIKE_COMMANDS,
  SLAY_LIKE_PHASES,
  SLAY_LIKE_RESOURCES,
  SLAY_LIKE_ZONES,
  createSlayLikeEncounter,
  executeSlayLikeCommand,
} from "@ucre/rulesets";

import "./styles.css";

const PLAYER_ID = "player-1";
const INITIAL_GAME_ID = "slay-shell-1";
const INITIAL_SEED = "game-shell-seed-1";
const EVENT_LOG_LIMIT = 12;

interface AppProps {
  appName?: string;
}

interface TimelineEntry {
  readonly id: string;
  readonly label: string;
  readonly events: readonly RuleEvent[];
  readonly error?: string;
}

function createInitialShellState(): GameState {
  return createSlayLikeEncounter({
    gameId: INITIAL_GAME_ID,
    seed: INITIAL_SEED,
  });
}

export function App({ appName = "UCRE Game" }: AppProps) {
  const [state, setState] = useState(createInitialShellState);
  const [timeline, setTimeline] = useState<readonly TimelineEntry[]>([]);

  const playerResources = state.resources[PLAYER_ID]?.values ?? {};
  const hand = getZoneObjects(state, SLAY_LIKE_ZONES.hand);
  const drawPile = getZoneObjects(state, SLAY_LIKE_ZONES.drawPile);
  const discardPile = getZoneObjects(state, SLAY_LIKE_ZONES.discardPile);
  const exhaustPile = getZoneObjects(state, SLAY_LIKE_ZONES.exhaustPile);
  const rewards = getZoneObjects(state, SLAY_LIKE_ZONES.reward);
  const enemies = getZoneObjects(state, SLAY_LIKE_ZONES.enemy);
  const livingEnemies = enemies.filter((enemy) => readNumberAttribute(enemy, "hp") > 0);
  const selectedEnemy = livingEnemies[0];
  const stateSummary = useMemo(() => stringifyStateSummary(state), [state]);

  function dispatchCommand(label: string, type: string, payload: JsonObject) {
    const command: Command = {
      id: `ui-command-${timeline.length + 1}`,
      type,
      playerId: PLAYER_ID,
      payload,
    };
    const result = executeSlayLikeCommand({
      state,
      command,
    });

    if (result.ok) {
      setState(result.state);
    }

    setTimeline((current) =>
      [
        {
          id: command.id,
          label,
          events: result.events,
          ...(result.ok
            ? {}
            : {
                error: result.errors.map((error) => error.message).join(" "),
              }),
        },
        ...current,
      ].slice(0, EVENT_LOG_LIMIT),
    );
  }

  function resetEncounter() {
    setState(createInitialShellState());
    setTimeline([]);
  }

  function drawCards() {
    dispatchCommand("Draw hand", SLAY_LIKE_COMMANDS.drawCards, {
      count: Math.min(5, drawPile.length),
    });
  }

  function endTurn() {
    dispatchCommand("End turn", SLAY_LIKE_COMMANDS.endTurn, {});
  }

  function playCard(card: GameObject) {
    const definition = SLAY_LIKE_CARD_DEFINITIONS[card.definitionId];
    dispatchCommand(`Play ${definition?.name ?? card.definitionId}`, SLAY_LIKE_COMMANDS.playCard, {
      cardId: card.id,
      ...(definition?.requiresTarget && selectedEnemy ? { targetObjectId: selectedEnemy.id } : {}),
    });
  }

  function chooseReward(reward: GameObject) {
    dispatchCommand(
      `Choose ${SLAY_LIKE_CARD_DEFINITIONS[reward.definitionId]?.name ?? reward.definitionId}`,
      SLAY_LIKE_COMMANDS.chooseReward,
      {
        rewardObjectId: reward.id,
      },
    );
  }

  return (
    <main className="app-shell" aria-label={appName}>
      <header className="app-header">
        <div>
          <span className="eyebrow">Rule Shell</span>
          <h1>{appName}</h1>
        </div>
        <div className="status-cluster" aria-label="Encounter status">
          <span className="status-pill">{state.phase}</span>
          <span className="status-pill">Turn {state.turn}</span>
          <button className="ghost-button" type="button" onClick={resetEncounter}>
            Reset
          </button>
        </div>
      </header>

      <section className="command-bar" aria-label="Commands">
        <button
          className="primary-button"
          type="button"
          onClick={drawCards}
          disabled={state.phase !== SLAY_LIKE_PHASES.playerTurn || drawPile.length === 0}
        >
          Draw
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={endTurn}
          disabled={state.phase !== SLAY_LIKE_PHASES.playerTurn}
        >
          End Turn
        </button>
      </section>

      <section className="dashboard-grid" aria-label="Game dashboard">
        <aside className="side-panel" aria-label="Resources">
          <h2>Resources</h2>
          <div className="resource-list">
            <Metric label="HP" value={playerResources[SLAY_LIKE_RESOURCES.playerHp] ?? 0} />
            <Metric label="Block" value={playerResources[SLAY_LIKE_RESOURCES.block] ?? 0} />
            <Metric label="Energy" value={playerResources[SLAY_LIKE_RESOURCES.energy] ?? 0} />
          </div>
          <div className="zone-counts" aria-label="Zone counts">
            <Metric label="Draw" value={drawPile.length} />
            <Metric label="Hand" value={hand.length} />
            <Metric label="Discard" value={discardPile.length} />
            <Metric label="Exhaust" value={exhaustPile.length} />
          </div>
        </aside>

        <section className="play-surface" aria-label="Encounter">
          <div className="enemy-row" aria-label="Enemies">
            {enemies.map((enemy) => (
              <article className="enemy-strip" key={enemy.id}>
                <div>
                  <h2>{formatDefinitionName(enemy)}</h2>
                  <span>{enemy.id}</span>
                </div>
                <div className="enemy-stats">
                  <Metric label="HP" value={readNumberAttribute(enemy, "hp")} />
                  <Metric label="Block" value={readNumberAttribute(enemy, "block")} />
                  <Metric label="Intent" value={readNumberAttribute(enemy, "intentDamage")} />
                </div>
              </article>
            ))}
            {enemies.length === 0 ? <div className="empty-strip">No active enemies</div> : null}
          </div>

          <div className="hand-row" aria-label="Hand">
            {hand.length === 0 ? <div className="empty-strip">Hand is empty</div> : null}
            {hand.map((card) => {
              const definition = SLAY_LIKE_CARD_DEFINITIONS[card.definitionId];
              const canPlay =
                state.phase === SLAY_LIKE_PHASES.playerTurn &&
                !!definition &&
                (playerResources[SLAY_LIKE_RESOURCES.energy] ?? 0) >= definition.cost &&
                (!definition.requiresTarget || !!selectedEnemy);

              return (
                <button
                  className="card-button"
                  type="button"
                  key={card.id}
                  onClick={() => playCard(card)}
                  disabled={!canPlay}
                >
                  <span className="card-name">{definition?.name ?? card.definitionId}</span>
                  <span className="card-meta">
                    Cost {definition?.cost ?? "?"}
                    {definition?.damage ? ` | ${definition.damage} dmg` : ""}
                    {definition?.block ? ` | ${definition.block} block` : ""}
                  </span>
                </button>
              );
            })}
          </div>

          {state.phase === SLAY_LIKE_PHASES.reward ? (
            <div className="reward-row" aria-label="Rewards">
              {rewards.map((reward) => (
                <button
                  className="reward-button"
                  type="button"
                  key={reward.id}
                  onClick={() => chooseReward(reward)}
                >
                  <span>{SLAY_LIKE_CARD_DEFINITIONS[reward.definitionId]?.name}</span>
                  <span>{reward.id}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <aside className="side-panel" aria-label="Debug">
          <h2>Debug</h2>
          <dl className="debug-list">
            <div>
              <dt>Seed</dt>
              <dd>{state.seed}</dd>
            </div>
            <div>
              <dt>Content</dt>
              <dd>{state.contentManifestHash}</dd>
            </div>
            <div>
              <dt>Triggers</dt>
              <dd>{state.triggerQueue.length}</dd>
            </div>
            <div>
              <dt>Objectives</dt>
              <dd>{state.objectives.map((objective) => objective.status).join(", ")}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="lower-grid" aria-label="Diagnostics">
        <section className="log-panel" aria-label="Event log">
          <h2>Event Log</h2>
          {timeline.length === 0 ? <p className="quiet-text">No commands dispatched yet.</p> : null}
          <ol>
            {timeline.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.label}</strong>
                {entry.error ? <span className="error-text">{entry.error}</span> : null}
                {entry.events.length > 0 ? (
                  <span>{entry.events.map((event) => event.type).join(" -> ")}</span>
                ) : (
                  <span>No events emitted</span>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="state-panel" aria-label="State summary">
          <h2>State Summary</h2>
          <pre>{stateSummary}</pre>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getZoneObjects(state: GameState, zoneId: string): readonly GameObject[] {
  return (state.zones[zoneId]?.objectIds ?? [])
    .map((objectId) => state.objects[objectId])
    .filter((object): object is GameObject => !!object);
}

function readNumberAttribute(object: GameObject, attribute: string): number {
  const value = object.attributes[attribute];

  return typeof value === "number" ? value : 0;
}

function formatDefinitionName(object: GameObject): string {
  const cardDefinition = SLAY_LIKE_CARD_DEFINITIONS[object.definitionId];

  if (cardDefinition) {
    return cardDefinition.name;
  }

  return object.definitionId
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_.:]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function stringifyStateSummary(state: GameState): string {
  return JSON.stringify(
    {
      phase: state.phase,
      turn: state.turn,
      resources: state.resources[PLAYER_ID]?.values ?? {},
      zones: Object.fromEntries(
        Object.entries(state.zones).map(([zoneId, zone]) => [zoneId, zone.objectIds]),
      ),
      objectives: state.objectives,
      flags: state.flags,
    },
    null,
    2,
  );
}
