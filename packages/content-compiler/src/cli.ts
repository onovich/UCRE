#!/usr/bin/env node

import { readFileSync } from "node:fs";

import { compileContentManifest } from "./index.js";

const [, , manifestPath] = process.argv;

if (!manifestPath) {
  console.error("Usage: ucre-content-lint <manifest.json>");
  process.exitCode = 1;
} else {
  try {
    const input = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    const result = compileContentManifest(input);

    if (!result.ok) {
      for (const error of result.errors) {
        console.error(`${error.code} ${error.path}: ${error.message}`);
      }
      process.exitCode = 1;
    } else {
      console.log(`manifestHash=${result.manifestHash}`);
      console.log(result.canonicalJson);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Failed to lint content manifest.");
    process.exitCode = 1;
  }
}
