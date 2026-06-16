import {
  UCRE_CORE_PACKAGE_ID,
  createInitialGameState,
  executeCommand,
  hashGameState,
  hashRuleEvents,
  stableHash,
} from "@ucre/core";
import type {
  Command,
  CommandRegistry,
  EffectRegistry,
  GameState,
  PresentationIntent,
  RuleError,
  RuleEvent,
  StableHash,
} from "@ucre/core";

export interface ReplayPackageIdentity {
  corePackageId: typeof UCRE_CORE_PACKAGE_ID;
}

export function createReplayPackageIdentity(): ReplayPackageIdentity {
  return {
    corePackageId: UCRE_CORE_PACKAGE_ID,
  };
}

export interface ReplayInput {
  readonly gameId: string;
  readonly seed: string;
  readonly rulesVersion: string;
  readonly contentManifestHash: string;
  readonly commands: readonly Command[];
  readonly commandRegistry: CommandRegistry;
  readonly initialState?: GameState;
  readonly effectRegistry?: EffectRegistry;
}

export interface ReplaySuccess {
  readonly ok: true;
  readonly initialState: GameState;
  readonly finalState: GameState;
  readonly events: readonly RuleEvent[];
  readonly presentationIntents: readonly PresentationIntent[];
  readonly commandHash: StableHash;
  readonly stateHash: StableHash;
  readonly eventHash: StableHash;
  readonly replayHash: StableHash;
}

export interface ReplayFailure {
  readonly ok: false;
  readonly initialState: GameState;
  readonly failedCommand: Command;
  readonly state: GameState;
  readonly errors: readonly RuleError[];
  readonly events: readonly RuleEvent[];
  readonly presentationIntents: readonly PresentationIntent[];
  readonly commandHash: StableHash;
  readonly stateHash: StableHash;
  readonly eventHash: StableHash;
  readonly replayHash: StableHash;
}

export type ReplayResult = ReplaySuccess | ReplayFailure;

export function runReplay(input: ReplayInput): ReplayResult {
  const initialState =
    input.initialState ??
    createInitialGameState({
      id: input.gameId,
      seed: input.seed,
      rulesVersion: input.rulesVersion,
      contentManifestHash: input.contentManifestHash,
    });
  const commandHash = stableHash(input.commands);
  let currentState = initialState;
  const events: RuleEvent[] = [];
  const presentationIntents: PresentationIntent[] = [];

  for (const command of input.commands) {
    const result = executeCommand({
      state: currentState,
      command,
      commandRegistry: input.commandRegistry,
      ...(input.effectRegistry ? { effectRegistry: input.effectRegistry } : {}),
    });

    events.push(...result.events);
    presentationIntents.push(...result.presentationIntents);

    if (!result.ok) {
      const stateHash = hashGameState(result.state);
      const eventHash = hashRuleEvents(events);

      return {
        ok: false,
        initialState,
        failedCommand: command,
        state: result.state,
        errors: result.errors,
        events,
        presentationIntents,
        commandHash,
        stateHash,
        eventHash,
        replayHash: replayHashFor(input, commandHash, stateHash, eventHash),
      };
    }

    currentState = result.state;
  }

  const stateHash = hashGameState(currentState);
  const eventHash = hashRuleEvents(events);

  return {
    ok: true,
    initialState,
    finalState: currentState,
    events,
    presentationIntents,
    commandHash,
    stateHash,
    eventHash,
    replayHash: replayHashFor(input, commandHash, stateHash, eventHash),
  };
}

function replayHashFor(
  input: Pick<ReplayInput, "seed" | "rulesVersion" | "contentManifestHash">,
  commandHash: StableHash,
  stateHash: StableHash,
  eventHash: StableHash,
): StableHash {
  return stableHash({
    seed: input.seed,
    rulesVersion: input.rulesVersion,
    contentManifestHash: input.contentManifestHash,
    commandHash,
    stateHash,
    eventHash,
  });
}
