#!/usr/bin/env node

import { loadContentManifestFile } from "./index.js";

const [, , manifestPath] = process.argv;

if (!manifestPath) {
  console.error("Usage: ucre-content-lint <manifest.json>");
  process.exitCode = 1;
} else {
  const result = loadContentManifestFile(manifestPath);

  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`${error.code} ${error.path}: ${error.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`manifestHash=${result.manifestHash}`);
    console.log(result.canonicalJson);
  }
}
