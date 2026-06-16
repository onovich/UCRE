import {
  claimRunRewardChoice,
  completeRunNode,
  createEncounterNodePayload,
  createLinearRunMap,
  createRunSavePackage,
  createRunSaveSnapshot,
  createRunState,
  hashRunState,
  openRunRewardDraft,
  resolveRunNode,
  verifyRunSavePackage,
  type RunNodeResolution,
  type RunSavePackage,
  type RunState,
} from "@ucre/run";

import "../../game/src/styles.css";

interface ReplayViewerModel {
  readonly savePackage: RunSavePackage;
  readonly verified: boolean;
  readonly runStateHash: string;
  readonly activeResolution?: RunNodeResolution;
  readonly commandLog: RunSavePackage["commandLog"];
  readonly finalRunState: RunState;
}

export function App() {
  const model = createReplayViewerModel();

  return (
    <main className="app-shell" aria-label="UCRE Replay Viewer">
      <header className="app-header">
        <div>
          <span className="eyebrow">Run Replay</span>
          <h1>UCRE Replay Viewer</h1>
        </div>
        <div className="status-cluster" aria-label="Replay status">
          <span className="status-pill">{model.verified ? "Verified" : "Invalid"}</span>
          <span className="status-pill">{model.savePackage.snapshots.length} snapshots</span>
        </div>
      </header>
      <section className="workspace-grid" aria-label="Workspace">
        <article className="panel" aria-label="Run save">
          <h2>Run Save</h2>
          <dl className="debug-list">
            <div>
              <dt>Save</dt>
              <dd>{model.savePackage.id}</dd>
            </div>
            <div>
              <dt>Run</dt>
              <dd>{model.savePackage.runId}</dd>
            </div>
            <div>
              <dt>Save Hash</dt>
              <dd>{model.savePackage.saveHash}</dd>
            </div>
            <div>
              <dt>Run Hash</dt>
              <dd>{model.runStateHash}</dd>
            </div>
          </dl>
        </article>

        <article className="panel" aria-label="Map nodes">
          <h2>Map Nodes</h2>
          <ol className="preview-list">
            {model.finalRunState.map.nodes.map((node) => (
              <li key={node.id}>
                <div className="preview-heading">
                  <strong>{node.kind}</strong>
                  <span>{node.depth}</span>
                </div>
                <span>{node.id}</span>
                <span>next {node.nextNodeIds.join(", ") || "[]"}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="panel" aria-label="Command log">
          <h2>Command Log</h2>
          <ol className="preview-list">
            {model.commandLog.map((command) => (
              <li key={command.id}>
                <div className="preview-heading">
                  <strong>{command.type}</strong>
                  <span>{command.playerId}</span>
                </div>
                <span>{command.id}</span>
                <span>{formatValue(command.payload)}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="panel" aria-label="Snapshots">
          <h2>Snapshots</h2>
          <ol className="preview-list">
            {model.savePackage.snapshots.map((snapshot) => (
              <li key={snapshot.id}>
                <div className="preview-heading">
                  <strong>{snapshot.label}</strong>
                  <span>{snapshot.commandCount} commands</span>
                </div>
                <span>{snapshot.runStateHash}</span>
                <span>{formatValue(snapshot.payload)}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="panel" aria-label="Reward and deck">
          <h2>Reward And Deck</h2>
          <dl className="debug-list">
            <div>
              <dt>Deck</dt>
              <dd>{model.finalRunState.deck.map((card) => card.definitionId).join(", ")}</dd>
            </div>
            <div>
              <dt>Reward</dt>
              <dd>
                {model.finalRunState.rewardDrafts
                  .map((draft) => `${draft.id}:${draft.status}:${draft.selectedChoiceId ?? "none"}`)
                  .join(", ")}
              </dd>
            </div>
            <div>
              <dt>Resolution</dt>
              <dd>{formatResolution(model.activeResolution)}</dd>
            </div>
          </dl>
        </article>
      </section>
    </main>
  );
}

function createReplayViewerModel(): ReplayViewerModel {
  const map = createLinearRunMap({
    id: "sample-act",
    seed: "sample-run-seed",
    nodeKinds: ["start", "encounter", "victory"],
    nodePayloads: [
      {},
      createEncounterNodePayload({
        encounterId: "jaw-worm-1",
        rulesetId: "slay-like",
        contentManifestHash: "ucre1-sample",
      }),
      {},
    ],
  });
  const initialRunState = createRunState({
    id: "sample-run-1",
    seed: "sample-run-seed",
    rulesetId: "slay-like",
    rulesVersion: "0.0.0",
    contentManifestHash: "ucre1-sample",
    map,
    deck: [
      {
        id: "strike-1",
        definitionId: "strike",
        payload: {},
      },
    ],
  });
  const afterStart = completeRunNode({
    state: initialRunState,
    nodeId: "sample-act:node:0",
  });
  const resolvedEncounter = resolveRunNode({
    state: afterStart,
    nodeId: "sample-act:node:1",
  });
  const withReward = openRunRewardDraft({
    state: afterStart,
    draft: {
      id: "reward-1",
      sourceNodeId: "sample-act:node:1",
      status: "open",
      choices: [
        {
          id: "choice-defend",
          kind: "card",
          payload: {},
          card: {
            id: "defend-1",
            definitionId: "defend",
            payload: {},
          },
        },
      ],
    },
  });
  const rewardResult = claimRunRewardChoice({
    state: withReward,
    draftId: "reward-1",
    choiceId: "choice-defend",
  });
  const finalRunState = rewardResult.ok ? rewardResult.state : withReward;
  const commandLog: RunSavePackage["commandLog"] = [
    {
      id: "cmd-1",
      type: "slay.drawCards",
      playerId: "player-1",
      payload: {
        count: 5,
      },
    },
    {
      id: "cmd-2",
      type: "slay.playCard",
      playerId: "player-1",
      payload: {
        cardId: "strike-1",
        targetObjectId: "jaw-worm-1",
      },
    },
  ];
  const snapshots = [
    createRunSaveSnapshot({
      id: "snapshot-after-start",
      label: "After start",
      runState: afterStart,
      commandLog,
      payload: {
        nodeId: "sample-act:node:0",
      },
    }),
    createRunSaveSnapshot({
      id: "snapshot-after-reward",
      label: "After reward",
      runState: finalRunState,
      commandLog,
      payload: {
        nodeId: "sample-act:node:1",
      },
    }),
  ];
  const savePackage = createRunSavePackage({
    id: "sample-save-1",
    runState: finalRunState,
    commandLog,
    snapshots,
    payload: {
      source: "replay-viewer",
    },
  });

  return {
    savePackage,
    verified: verifyRunSavePackage(savePackage),
    runStateHash: hashRunState(finalRunState),
    ...(resolvedEncounter.ok ? { activeResolution: resolvedEncounter.resolution } : {}),
    commandLog,
    finalRunState,
  };
}

function formatResolution(resolution: RunNodeResolution | undefined): string {
  if (!resolution) {
    return "none";
  }

  if (resolution.kind === "encounter") {
    return `${resolution.encounterId} (${resolution.seed})`;
  }

  return `${resolution.kind}:${resolution.nodeId}`;
}

function formatValue(value: unknown): string {
  if (value && typeof value === "object") {
    return Object.entries(value as Readonly<Record<string, unknown>>)
      .map(([key, entry]) => `${key}:${String(entry)}`)
      .join(", ");
  }

  return String(value);
}
