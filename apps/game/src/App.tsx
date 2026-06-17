import { useMemo, useState } from "react";

import type { Command, GameObject, GameState, JsonObject, RuleEvent } from "@ucre/core";
import { type PresentationBeat, type PresentationIntent } from "@ucre/presentation-core";
import {
  SLAY_LIKE_CARD_DEFINITIONS,
  SLAY_LIKE_COMMANDS,
  SLAY_LIKE_PHASES,
  SLAY_LIKE_RESOURCES,
  SLAY_LIKE_ZONES,
  executeSlayLikeCommand,
} from "@ucre/rulesets";

import { TheaterCanvas } from "./TheaterCanvas.js";
import {
  DEMO_SCENARIO_LIST,
  DEMO_SCENARIOS,
  createDemoBeatSchedule,
  createDemoShellState,
  getBossMoment,
  type DemoScenarioId,
  type PlaybackMode,
} from "./demo-model.js";
import {
  advanceDemoRunNode,
  createDemoRunState,
  createGameStateForRunNode,
  createRunNodeViews,
  createStartedDemoRunState,
  getCurrentRunNode,
  isEncounterRunNode,
} from "./run-demo-model.js";
import "./styles.css";

const PLAYER_ID = "player-1";
const EVENT_LOG_LIMIT = 12;

interface AppProps {
  appName?: string;
}

interface TimelineEntry {
  readonly id: string;
  readonly label: string;
  readonly events: readonly RuleEvent[];
  readonly presentationIntents: readonly PresentationIntent[];
  readonly beats: readonly PresentationBeat[];
  readonly diffs: readonly StateDiff[];
  readonly error?: string;
}

interface StateDiff {
  readonly label: string;
  readonly before: string;
  readonly after: string;
}

interface CommandPreview {
  readonly id: string;
  readonly label: string;
  readonly ok: boolean;
  readonly eventTypes: readonly string[];
  readonly beatKinds: readonly string[];
  readonly diffs: readonly StateDiff[];
  readonly targetLabel?: string;
  readonly errors?: readonly string[];
}

interface PreviewCommandOptions {
  readonly playbackMode: PlaybackMode;
  readonly targetLabel?: string;
}

export function App({ appName = "UCRE Game" }: AppProps) {
  const [scenarioId, setScenarioId] = useState<DemoScenarioId>("starter");
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("normal");
  const [state, setState] = useState(() => createDemoShellState("starter"));
  const [runState, setRunState] = useState(createDemoRunState);
  const [timeline, setTimeline] = useState<readonly TimelineEntry[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | undefined>();

  const scenario = DEMO_SCENARIOS[scenarioId];
  const currentRunNode = scenarioId === "run" ? getCurrentRunNode(runState) : undefined;
  const runNodeViews = useMemo(() => createRunNodeViews(runState), [runState]);
  const isCommandSurfaceEnabled = scenarioId !== "run" || isEncounterRunNode(currentRunNode);
  const canAdvanceRunNode =
    scenarioId === "run" &&
    runState.status !== "complete" &&
    !!currentRunNode &&
    (!isEncounterRunNode(currentRunNode) || state.phase === SLAY_LIKE_PHASES.complete);
  const playerResources = state.resources[PLAYER_ID]?.values ?? {};
  const hand = getZoneObjects(state, SLAY_LIKE_ZONES.hand);
  const drawPile = getZoneObjects(state, SLAY_LIKE_ZONES.drawPile);
  const discardPile = getZoneObjects(state, SLAY_LIKE_ZONES.discardPile);
  const exhaustPile = getZoneObjects(state, SLAY_LIKE_ZONES.exhaustPile);
  const rewards = getZoneObjects(state, SLAY_LIKE_ZONES.reward);
  const enemies = getZoneObjects(state, SLAY_LIKE_ZONES.enemy);
  const livingEnemies = enemies.filter((enemy) => readNumberAttribute(enemy, "hp") > 0);
  const selectedEnemy =
    livingEnemies.find((enemy) => enemy.id === selectedTargetId) ?? livingEnemies[0];
  const commandPreviews = useMemo(
    () =>
      isCommandSurfaceEnabled ? createCommandPreviews(state, selectedEnemy, playbackMode) : [],
    [isCommandSurfaceEnabled, playbackMode, selectedEnemy, state],
  );
  const latestDiffs = timeline[0]?.diffs ?? [];
  const latestEntry = timeline[0];
  const latestBeats = latestEntry?.beats ?? [];
  const stateSummary = useMemo(() => stringifyStateSummary(state), [state]);
  const bossMoment = getBossMoment(state);

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
    const diffs = result.ok ? summarizeStateDiff(state, result.state) : [];
    const beatSchedule = createShellBeatSchedule(result.presentationIntents, playbackMode);

    if (result.ok) {
      setState(result.state);
    }

    setTimeline((current) =>
      [
        {
          id: command.id,
          label,
          events: result.events,
          presentationIntents: result.presentationIntents,
          beats: beatSchedule.beats,
          diffs,
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

  function loadScenario(nextScenarioId: DemoScenarioId) {
    const nextRunState =
      nextScenarioId === "run" ? createStartedDemoRunState() : createDemoRunState();
    setScenarioId(nextScenarioId);
    setRunState(nextRunState);
    setState(
      nextScenarioId === "run"
        ? (createGameStateForRunNode(nextRunState) ?? createDemoShellState("run"))
        : createDemoShellState(nextScenarioId),
    );
    setTimeline([]);
    setSelectedTargetId(undefined);
  }

  function resetEncounter() {
    loadScenario(scenarioId);
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

  function advanceRunNode() {
    if (scenarioId !== "run" || !currentRunNode) {
      return;
    }

    const nextRunState = advanceDemoRunNode(runState, {
      completedBy: "game-demo",
      nodeKind: currentRunNode.kind,
      encounterPhase: state.phase,
    });
    const nextGameState = createGameStateForRunNode(nextRunState);

    setRunState(nextRunState);

    if (nextGameState) {
      setState(nextGameState);
      setTimeline([]);
      setSelectedTargetId(undefined);
    }
  }

  return (
    <main className="app-shell" aria-label={appName}>
      <header className="app-header">
        <div>
          <span className="eyebrow">{scenario.eyebrow}</span>
          <h1>{appName}</h1>
          <span className="scenario-summary">{scenario.summary}</span>
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
          disabled={
            !isCommandSurfaceEnabled ||
            state.phase !== SLAY_LIKE_PHASES.playerTurn ||
            drawPile.length === 0
          }
        >
          Draw
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={endTurn}
          disabled={!isCommandSurfaceEnabled || state.phase !== SLAY_LIKE_PHASES.playerTurn}
        >
          End Turn
        </button>
      </section>

      <section className="mode-row" aria-label="Demo controls">
        <div className="segmented-control" aria-label="Scenario">
          {DEMO_SCENARIO_LIST.map((demoScenario) => (
            <button
              type="button"
              key={demoScenario.id}
              aria-pressed={scenarioId === demoScenario.id}
              onClick={() => loadScenario(demoScenario.id)}
            >
              {demoScenario.label}
            </button>
          ))}
        </div>
        <div className="segmented-control" aria-label="Playback mode">
          {(["normal", "fast"] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              aria-pressed={playbackMode === mode}
              onClick={() => setPlaybackMode(mode)}
            >
              {mode === "normal" ? "Normal" : "Fast"}
            </button>
          ))}
        </div>
      </section>

      {bossMoment.status !== "inactive" ? (
        <section
          className={`boss-moment boss-moment--${bossMoment.status}`}
          aria-label="Boss moment"
        >
          <span>{bossMoment.label}</span>
          <strong>{bossMoment.summary}</strong>
          {bossMoment.hitPoints !== undefined ? <span>HP {bossMoment.hitPoints}</span> : null}
        </section>
      ) : null}

      <TheaterCanvas state={state} playbackMode={playbackMode} bossMoment={bossMoment.status} />

      {scenarioId === "run" ? (
        <section className="run-panel" aria-label="Run path">
          <div className="run-node-list">
            {runNodeViews.map((node) => (
              <span className={`run-node-chip run-node-chip--${node.status}`} key={node.id}>
                {node.label}
              </span>
            ))}
          </div>
          <div className="run-actions">
            <span className="status-pill">
              {runState.status === "complete"
                ? "Run complete"
                : `Current ${currentRunNode?.kind ?? "node"}`}
            </span>
            <button
              className="primary-button"
              type="button"
              onClick={advanceRunNode}
              disabled={!canAdvanceRunNode}
            >
              {formatRunActionLabel(currentRunNode?.kind, runState.status)}
            </button>
          </div>
        </section>
      ) : null}

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
                <button
                  className="target-button"
                  type="button"
                  onClick={() => setSelectedTargetId(enemy.id)}
                  disabled={readNumberAttribute(enemy, "hp") <= 0}
                >
                  {selectedEnemy?.id === enemy.id ? "Targeted" : "Target"}
                </button>
              </article>
            ))}
            {enemies.length === 0 ? <div className="empty-strip">No active enemies</div> : null}
          </div>

          <div className="hand-row" aria-label="Hand">
            {hand.length === 0 ? <div className="empty-strip">Hand is empty</div> : null}
            {hand.map((card) => {
              const definition = SLAY_LIKE_CARD_DEFINITIONS[card.definitionId];
              const canPlay =
                isCommandSurfaceEnabled &&
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
                  {definition?.requiresTarget ? (
                    <span className="target-preview">
                      {selectedEnemy
                        ? `Target ${formatDefinitionName(selectedEnemy)}`
                        : "No target"}
                    </span>
                  ) : null}
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

        <aside className="side-panel inspector-panel" aria-label="Run inspector">
          <h2>Run Inspector</h2>
          <dl className="debug-list">
            <div>
              <dt>Scenario</dt>
              <dd>{scenario.label}</dd>
            </div>
            <div>
              <dt>Playback</dt>
              <dd>{playbackMode}</dd>
            </div>
            {scenarioId === "run" ? (
              <div>
                <dt>Run Node</dt>
                <dd>{currentRunNode?.kind ?? runState.status}</dd>
              </div>
            ) : null}
            <div>
              <dt>Rules</dt>
              <dd>{state.rulesVersion}</dd>
            </div>
            <div>
              <dt>Seed</dt>
              <dd>{state.seed}</dd>
            </div>
            <div>
              <dt>Content</dt>
              <dd>{state.contentManifestHash}</dd>
            </div>
            <div>
              <dt>Commands</dt>
              <dd>{timeline.length}</dd>
            </div>
          </dl>

          <section className="inspector-block" aria-label="RNG streams">
            <h3>RNG Streams</h3>
            <ol className="inspector-list">
              <li>
                <strong>encounter</strong>
                <span>{state.seed}</span>
                <span>idle</span>
              </li>
            </ol>
          </section>

          <section className="inspector-block" aria-label="Trigger queue">
            <h3>Trigger Queue</h3>
            {state.triggerQueue.length === 0 ? <p className="quiet-text">Empty</p> : null}
            <ol className="inspector-list">
              {state.triggerQueue.map((trigger) => (
                <li key={trigger.id}>
                  <strong>{trigger.type}</strong>
                  <span>{trigger.id}</span>
                  <span>{formatDiffValue(trigger.payload)}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="inspector-block" aria-label="Objectives">
            <h3>Objectives</h3>
            <ol className="inspector-list">
              {state.objectives.map((objective) => (
                <li key={objective.id}>
                  <strong>{objective.status}</strong>
                  <span>{objective.id}</span>
                  <span>{formatDiffValue(objective.payload)}</span>
                </li>
              ))}
            </ol>
          </section>
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
                <span>{formatEventBeatSummary(entry.beats)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="beat-panel" aria-label="Presentation beats">
          <h2>Presentation Beats</h2>
          {!latestEntry ? <p className="quiet-text">No presentation beats yet.</p> : null}
          {latestEntry && latestBeats.length === 0 ? (
            <p className="quiet-text">Latest command emitted no presentation beats.</p>
          ) : null}
          {latestEntry && latestBeats.length > 0 ? (
            <>
              <p className="quiet-text">
                Latest: {latestEntry.label} ({latestEntry.presentationIntents.length} intents)
              </p>
              <ol className="preview-list beat-list">
                {latestBeats.map((beat) => (
                  <li key={beat.id}>
                    <div className="preview-heading">
                      <strong>{beat.kind}</strong>
                      <span>{formatBeatTiming(beat)}</span>
                    </div>
                    <span>{beat.type}</span>
                    <span>event {beat.eventId}</span>
                    <span>{formatBeatProfile(beat)}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </section>

        <section className="preview-panel" aria-label="Command preview">
          <h2>Command Preview</h2>
          {commandPreviews.length === 0 ? <p className="quiet-text">No legal commands.</p> : null}
          <ol className="preview-list">
            {commandPreviews.map((preview) => (
              <li key={preview.id}>
                <div className="preview-heading">
                  <strong>{preview.label}</strong>
                  <span className={preview.ok ? "preview-ok" : "preview-blocked"}>
                    {preview.ok ? "Legal" : "Blocked"}
                  </span>
                </div>
                {preview.targetLabel ? <span>{preview.targetLabel}</span> : null}
                {preview.errors?.length ? <span>{preview.errors.join(" ")}</span> : null}
                {preview.eventTypes.length > 0 ? (
                  <span>{preview.eventTypes.join(" -> ")}</span>
                ) : null}
                {preview.beatKinds.length > 0 ? (
                  <span>Beats {preview.beatKinds.join(" -> ")}</span>
                ) : null}
                {preview.diffs[0] ? (
                  <span>
                    {preview.diffs[0].label}: {preview.diffs[0].before}
                    {" -> "}
                    {preview.diffs[0].after}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <section className="diff-panel" aria-label="State diff">
          <h2>State Diff</h2>
          {latestDiffs.length === 0 ? <p className="quiet-text">No state changes yet.</p> : null}
          <dl className="diff-list">
            {latestDiffs.map((diff) => (
              <div key={diff.label}>
                <dt>{diff.label}</dt>
                <dd>
                  <span>{diff.before}</span>
                  <span className="diff-arrow">to</span>
                  <span>{diff.after}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="state-panel" aria-label="State summary">
          <h2>State Summary</h2>
          <pre>{stateSummary}</pre>
        </section>
      </section>
    </main>
  );
}

function createCommandPreviews(
  state: GameState,
  selectedEnemy: GameObject | undefined,
  playbackMode: PlaybackMode,
): readonly CommandPreview[] {
  const previews: CommandPreview[] = [];
  const drawPile = getZoneObjects(state, SLAY_LIKE_ZONES.drawPile);
  const hand = getZoneObjects(state, SLAY_LIKE_ZONES.hand);
  const rewards = getZoneObjects(state, SLAY_LIKE_ZONES.reward);

  if (state.phase === SLAY_LIKE_PHASES.playerTurn) {
    if (drawPile.length > 0) {
      previews.push(
        previewCommand(
          state,
          "Draw",
          {
            id: "preview-draw",
            type: SLAY_LIKE_COMMANDS.drawCards,
            playerId: PLAYER_ID,
            payload: {
              count: Math.min(5, drawPile.length),
            },
          },
          { playbackMode },
        ),
      );
    }

    previews.push(
      previewCommand(
        state,
        "End Turn",
        {
          id: "preview-end-turn",
          type: SLAY_LIKE_COMMANDS.endTurn,
          playerId: PLAYER_ID,
          payload: {},
        },
        { playbackMode },
      ),
    );
  }

  for (const card of hand) {
    const definition = SLAY_LIKE_CARD_DEFINITIONS[card.definitionId];
    const targetPayload =
      definition?.requiresTarget && selectedEnemy ? { targetObjectId: selectedEnemy.id } : {};

    previews.push(
      previewCommand(
        state,
        `Play ${definition?.name ?? card.definitionId}`,
        {
          id: `preview-play-${card.id}`,
          type: SLAY_LIKE_COMMANDS.playCard,
          playerId: PLAYER_ID,
          payload: {
            cardId: card.id,
            ...targetPayload,
          },
        },
        {
          playbackMode,
          ...(definition?.requiresTarget && selectedEnemy
            ? { targetLabel: `Target ${formatDefinitionName(selectedEnemy)}` }
            : {}),
        },
      ),
    );
  }

  if (state.phase === SLAY_LIKE_PHASES.reward) {
    for (const reward of rewards) {
      previews.push(
        previewCommand(
          state,
          `Choose ${formatDefinitionName(reward)}`,
          {
            id: `preview-reward-${reward.id}`,
            type: SLAY_LIKE_COMMANDS.chooseReward,
            playerId: PLAYER_ID,
            payload: {
              rewardObjectId: reward.id,
            },
          },
          { playbackMode },
        ),
      );
    }
  }

  return previews;
}

function previewCommand(
  state: GameState,
  label: string,
  command: Command,
  options: PreviewCommandOptions,
): CommandPreview {
  const result = executeSlayLikeCommand({
    state,
    command,
  });
  const beatSchedule = createShellBeatSchedule(result.presentationIntents, options.playbackMode);

  return {
    id: command.id,
    label,
    ok: result.ok,
    eventTypes: result.events.map((event) => event.type),
    beatKinds: beatSchedule.beats.map((beat) => beat.kind),
    diffs: result.ok ? summarizeStateDiff(state, result.state) : [],
    ...(options.targetLabel ? { targetLabel: options.targetLabel } : {}),
    ...(result.ok ? {} : { errors: result.errors.map((error) => error.message) }),
  };
}

function createShellBeatSchedule(
  intents: readonly PresentationIntent[],
  playbackMode: PlaybackMode,
) {
  return createDemoBeatSchedule(intents, playbackMode);
}

function summarizeStateDiff(before: GameState, after: GameState): readonly StateDiff[] {
  const diffs: StateDiff[] = [];

  addDiff(diffs, "Phase", before.phase, after.phase);
  addDiff(diffs, "Turn", before.turn, after.turn);
  addDiff(
    diffs,
    "Resources",
    before.resources[PLAYER_ID]?.values ?? {},
    after.resources[PLAYER_ID]?.values ?? {},
  );

  for (const zoneId of [
    SLAY_LIKE_ZONES.drawPile,
    SLAY_LIKE_ZONES.hand,
    SLAY_LIKE_ZONES.discardPile,
    SLAY_LIKE_ZONES.exhaustPile,
    SLAY_LIKE_ZONES.enemy,
    SLAY_LIKE_ZONES.reward,
  ]) {
    addDiff(
      diffs,
      `Zone ${zoneId}`,
      before.zones[zoneId]?.objectIds ?? [],
      after.zones[zoneId]?.objectIds ?? [],
    );
  }

  addDiff(diffs, "Enemy HP", enemyHitPoints(before), enemyHitPoints(after));
  addDiff(
    diffs,
    "Objectives",
    before.objectives.map((objective) => `${objective.id}:${objective.status}`),
    after.objectives.map((objective) => `${objective.id}:${objective.status}`),
  );
  addDiff(diffs, "Flags", before.flags, after.flags);

  return diffs;
}

function addDiff(diffs: StateDiff[], label: string, before: unknown, after: unknown): void {
  const beforeText = formatDiffValue(before);
  const afterText = formatDiffValue(after);

  if (beforeText === afterText) {
    return;
  }

  diffs.push({
    label,
    before: beforeText,
    after: afterText,
  });
}

function enemyHitPoints(state: GameState): Readonly<Record<string, number>> {
  return Object.fromEntries(
    getZoneObjects(state, SLAY_LIKE_ZONES.enemy).map((enemy) => [
      enemy.id,
      readNumberAttribute(enemy, "hp"),
    ]),
  );
}

function formatDiffValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "[]";
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Readonly<Record<string, unknown>>);
    return entries.length > 0
      ? entries.map(([key, entry]) => `${key}:${String(entry)}`).join(", ")
      : "{}";
  }

  return String(value);
}

function formatEventBeatSummary(beats: readonly PresentationBeat[]): string {
  if (beats.length === 0) {
    return "No presentation beats";
  }

  return `Beats ${beats.map((beat) => `${beat.kind}:${beat.eventId}`).join(" -> ")}`;
}

function formatBeatTiming(beat: PresentationBeat): string {
  return `${beat.startTimeMs}-${beat.startTimeMs + beat.durationMs}ms`;
}

function formatBeatProfile(beat: PresentationBeat): string {
  const { profile } = beat;

  if (profile.kind === "move") {
    return `${profile.objectId ?? "object"}: ${profile.fromZoneId ?? "?"} to ${
      profile.toZoneId ?? "?"
    }`;
  }

  if (profile.kind === "draw") {
    return `${profile.drawnCount ?? 0} drawn from ${profile.fromZoneId ?? "?"} to ${
      profile.toZoneId ?? "?"
    }`;
  }

  if (profile.kind === "discard") {
    return `${profile.objectId ?? "object"}: ${profile.fromZoneId ?? "?"} to ${
      profile.toZoneId ?? "?"
    }`;
  }

  if (profile.kind === "damage") {
    return `${profile.objectId ?? "target"}: ${profile.amount ?? 0} damage, ${
      profile.nextHitPoints ?? "?"
    } hp`;
  }

  if (profile.kind === "destroy") {
    return `${profile.objectId ?? "object"} destroyed from ${profile.fromZoneId ?? "?"}`;
  }

  if (profile.kind === "resource") {
    return `${profile.resourceId ?? "resource"}: ${profile.previousValue ?? "?"} to ${
      profile.nextValue ?? "?"
    }`;
  }

  if (profile.kind === "counter") {
    return `${profile.objectId ?? "object"} ${profile.counterId ?? "counter"}: ${
      profile.previousValue ?? "?"
    } to ${profile.nextValue ?? "?"}`;
  }

  if (profile.kind === "trigger") {
    return `${profile.triggerType ?? "trigger"} ${profile.triggerId ?? ""}`.trim();
  }

  if (profile.kind === "reward") {
    return `${profile.rewardPoolId ?? "reward"} in ${profile.rewardZoneId ?? "reward zone"}`;
  }

  if (profile.kind === "camera") {
    return `${profile.targetKind ?? "target"} ${profile.targetId ?? "?"} ${
      profile.emphasis ?? "focus"
    }`;
  }

  return formatDiffValue(profile.payload);
}

function formatRunActionLabel(kind: string | undefined, status: string): string {
  if (status === "complete") {
    return "Victory";
  }

  if (kind === "encounter" || kind === "boss") {
    return "Complete Node";
  }

  if (kind === "victory") {
    return "Claim Victory";
  }

  return "Advance Node";
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
