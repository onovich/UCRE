#!/usr/bin/env node

import { argv, stderr, stdout } from "node:process";

import { formatSimulationResultJson, simulateSlayLikeRuns } from "./index.js";

interface CliOptions {
  readonly runs: number;
  readonly seedPrefix: string;
}

try {
  const options = parseCliOptions(argv.slice(2));
  stdout.write(formatSimulationResultJson(simulateSlayLikeRuns(options)));
} catch (error) {
  stderr.write(`${error instanceof Error ? error.message : "Simulation failed."}\n`);
  stderr.write("Usage: ucre-sim --runs <positive integer> [--seed-prefix <prefix>]\n");
  process.exitCode = 1;
}

function parseCliOptions(args: readonly string[]): CliOptions {
  let runs = 1000;
  let seedPrefix = "sim";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--runs") {
      runs = parsePositiveInteger(readValue(args, index, arg), "runs");
      index += 1;
      continue;
    }

    if (arg === "--seed-prefix") {
      seedPrefix = readValue(args, index, arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg ?? "(missing)"}.`);
  }

  return {
    runs,
    seedPrefix,
  };
}

function readValue(args: readonly string[], index: number, option: string): string {
  const value = args[index + 1];

  if (!value) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}

function parsePositiveInteger(text: string, label: string): number {
  const value = Number(text);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}
