export interface BalanceDashboardViewModel {
  readonly rulesetId: string;
  readonly rulesVersion: string;
  readonly contentManifestHash: string;
  readonly seedPrefix: string;
  readonly runCount: number;
  readonly completedCount: number;
  readonly failedCount: number;
  readonly winRate: number;
  readonly completionRate: number;
  readonly failureRate: number;
  readonly averageTurnCount: number;
  readonly averageCommandCount: number;
  readonly averageEventCount: number;
  readonly cardPlayRates: readonly BalanceCardPlayRate[];
  readonly cardPickRates: readonly BalanceCardPickRate[];
  readonly resourceCurves: readonly BalanceResourceCurve[];
  readonly deathNodeDistribution: readonly BalanceDeathNodeBucket[];
}

export interface BalanceCardPlayRate {
  readonly definitionId: string;
  readonly playCount: number;
  readonly playedRunCount: number;
  readonly playRate: number;
  readonly playsPerRun: number;
}

export interface BalanceCardPickRate {
  readonly definitionId: string;
  readonly pickCount: number;
  readonly pickRate: number;
}

export interface BalanceResourceCurve {
  readonly playerId: string;
  readonly resourceId: string;
  readonly points: readonly BalanceResourceCurvePoint[];
}

export interface BalanceResourceCurvePoint {
  readonly step: number;
  readonly averageValue: number;
  readonly sampleCount: number;
}

export interface BalanceDeathNodeBucket {
  readonly nodeId: string;
  readonly count: number;
  readonly rate: number;
}

export type BalanceDashboardParseResult =
  | {
      readonly ok: true;
      readonly dashboard: BalanceDashboardViewModel;
    }
  | {
      readonly ok: false;
      readonly errors: readonly string[];
    };

export function createSampleSimulationResultJson(): string {
  return `${JSON.stringify(SAMPLE_SIMULATION_RESULT, null, 2)}\n`;
}

export function parseBalanceDashboardInput(text: string): BalanceDashboardParseResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      errors: ["Simulation JSON is empty."],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return {
      ok: false,
      errors: [
        error instanceof Error
          ? `Simulation JSON could not be parsed: ${error.message}`
          : "Simulation JSON could not be parsed.",
      ],
    };
  }

  const errors: string[] = [];
  const root = readRecord(parsed, "root", errors);
  const metrics = readRecord(root?.metrics, "metrics", errors);

  if (!root || !metrics) {
    return {
      ok: false,
      errors,
    };
  }

  const dashboard: BalanceDashboardViewModel = {
    rulesetId: readString(root, "rulesetId", errors),
    rulesVersion: readString(root, "rulesVersion", errors),
    contentManifestHash: readString(root, "contentManifestHash", errors),
    seedPrefix: readString(root, "seedPrefix", errors),
    runCount: readNumber(root, "runCount", errors),
    completedCount: readNumber(root, "completedCount", errors),
    failedCount: readNumber(root, "failedCount", errors),
    winRate: readNumber(metrics, "winRate", errors),
    completionRate: readNumber(metrics, "completionRate", errors),
    failureRate: readNumber(metrics, "failureRate", errors),
    averageTurnCount: readNumber(metrics, "averageTurnCount", errors),
    averageCommandCount: readNumber(metrics, "averageCommandCount", errors),
    averageEventCount: readNumber(metrics, "averageEventCount", errors),
    cardPlayRates: readCardPlayRates(metrics, errors),
    cardPickRates: readCardPickRates(metrics, errors),
    resourceCurves: readResourceCurves(metrics, errors),
    deathNodeDistribution: readDeathNodeDistribution(metrics, errors),
  };

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    dashboard,
  };
}

function readCardPlayRates(
  metrics: Readonly<Record<string, unknown>>,
  errors: string[],
): readonly BalanceCardPlayRate[] {
  return readArray(metrics, "cardPlayRates", errors).map((entry, index) => {
    const path = `metrics.cardPlayRates.${index}`;
    const record = readRecord(entry, path, errors);

    return {
      definitionId: readString(record, "definitionId", errors, path),
      playCount: readNumber(record, "playCount", errors, path),
      playedRunCount: readNumber(record, "playedRunCount", errors, path),
      playRate: readNumber(record, "playRate", errors, path),
      playsPerRun: readNumber(record, "playsPerRun", errors, path),
    };
  });
}

function readCardPickRates(
  metrics: Readonly<Record<string, unknown>>,
  errors: string[],
): readonly BalanceCardPickRate[] {
  return readArray(metrics, "cardPickRates", errors).map((entry, index) => {
    const path = `metrics.cardPickRates.${index}`;
    const record = readRecord(entry, path, errors);

    return {
      definitionId: readString(record, "definitionId", errors, path),
      pickCount: readNumber(record, "pickCount", errors, path),
      pickRate: readNumber(record, "pickRate", errors, path),
    };
  });
}

function readResourceCurves(
  metrics: Readonly<Record<string, unknown>>,
  errors: string[],
): readonly BalanceResourceCurve[] {
  return readArray(metrics, "resourceCurves", errors).map((entry, index) => {
    const path = `metrics.resourceCurves.${index}`;
    const record = readRecord(entry, path, errors);

    return {
      playerId: readString(record, "playerId", errors, path),
      resourceId: readString(record, "resourceId", errors, path),
      points: readArray(record, "points", errors, path).map((pointEntry, pointIndex) => {
        const pointPath = `${path}.points.${pointIndex}`;
        const point = readRecord(pointEntry, pointPath, errors);

        return {
          step: readNumber(point, "step", errors, pointPath),
          averageValue: readNumber(point, "averageValue", errors, pointPath),
          sampleCount: readNumber(point, "sampleCount", errors, pointPath),
        };
      }),
    };
  });
}

function readDeathNodeDistribution(
  metrics: Readonly<Record<string, unknown>>,
  errors: string[],
): readonly BalanceDeathNodeBucket[] {
  return readArray(metrics, "deathNodeDistribution", errors).map((entry, index) => {
    const path = `metrics.deathNodeDistribution.${index}`;
    const record = readRecord(entry, path, errors);

    return {
      nodeId: readString(record, "nodeId", errors, path),
      count: readNumber(record, "count", errors, path),
      rate: readNumber(record, "rate", errors, path),
    };
  });
}

function readArray(
  record: Readonly<Record<string, unknown>> | undefined,
  key: string,
  errors: string[],
  parentPath = "metrics",
): readonly unknown[] {
  if (!record) {
    errors.push(`${parentPath}.${key} is unavailable.`);
    return [];
  }

  const value = record[key];
  if (!Array.isArray(value)) {
    errors.push(`${parentPath}.${key} must be an array.`);
    return [];
  }

  return value;
}

function readRecord(
  value: unknown,
  path: string,
  errors: string[],
): Readonly<Record<string, unknown>> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${path} must be an object.`);
    return undefined;
  }

  return value as Readonly<Record<string, unknown>>;
}

function readString(
  record: Readonly<Record<string, unknown>> | undefined,
  key: string,
  errors: string[],
  parentPath = "root",
): string {
  const value = record?.[key];
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${parentPath}.${key} must be a non-empty string.`);
    return "";
  }

  return value;
}

function readNumber(
  record: Readonly<Record<string, unknown>> | undefined,
  key: string,
  errors: string[],
  parentPath = "root",
): number {
  const value = record?.[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${parentPath}.${key} must be a finite number.`);
    return 0;
  }

  return value;
}

const SAMPLE_SIMULATION_RESULT = {
  packageId: "@ucre/sim",
  rulesetId: "slay-like",
  rulesVersion: "slay-like-0",
  contentManifestHash: "slay-like-inline-content-0",
  seedPrefix: "dashboard",
  runCount: 3,
  completedCount: 3,
  failedCount: 0,
  metrics: {
    winRate: 1,
    completionRate: 1,
    failureRate: 0,
    averageTurnCount: 1,
    averageCommandCount: 4,
    averageEventCount: 22,
    cardPlayRates: [
      {
        definitionId: "strike",
        playCount: 6,
        playedRunCount: 3,
        playRate: 1,
        playsPerRun: 2,
      },
    ],
    cardPickRates: [
      {
        definitionId: "ironWave",
        pickCount: 3,
        pickRate: 1,
      },
    ],
    resourceCurves: [
      {
        playerId: "player-1",
        resourceId: "block",
        points: [
          {
            step: 0,
            averageValue: 0,
            sampleCount: 3,
          },
        ],
      },
      {
        playerId: "player-1",
        resourceId: "energy",
        points: [
          {
            step: 0,
            averageValue: 3,
            sampleCount: 3,
          },
          {
            step: 5,
            averageValue: 2,
            sampleCount: 3,
          },
          {
            step: 10,
            averageValue: 1,
            sampleCount: 3,
          },
        ],
      },
      {
        playerId: "player-1",
        resourceId: "playerHp",
        points: [
          {
            step: 0,
            averageValue: 80,
            sampleCount: 3,
          },
        ],
      },
    ],
    deathNodeDistribution: [],
  },
  runs: [],
} as const;
