import { readFileSync } from "node:fs";
import { extname } from "node:path";

import {
  compileContentManifest,
  parseContentManifestText,
  type ContentCompileResult,
  type ContentManifestFormat,
} from "./compiler.js";

export * from "./compiler.js";

export function loadContentManifestFile(filePath: string): ContentCompileResult {
  try {
    return compileContentManifest(
      parseContentManifestText(readFileSync(filePath, "utf8"), inferManifestFormat(filePath)),
    );
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: "CONTENT_PARSE_FAILED",
          path: filePath,
          message: error instanceof Error ? error.message : "Failed to parse content manifest.",
        },
      ],
    };
  }
}

export function inferManifestFormat(filePath: string): ContentManifestFormat {
  const extension = extname(filePath).toLowerCase();

  if (extension === ".json") {
    return "json";
  }

  if (extension === ".json5") {
    return "json5";
  }

  if (extension === ".yaml" || extension === ".yml") {
    return "yaml";
  }

  throw new Error(`Unsupported content manifest extension: ${extension || "(none)"}.`);
}
