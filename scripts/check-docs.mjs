import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const requiredDocs = [
  "docs/development-plan.md",
  "docs/goal-mode-continuous-delivery.md",
  "docs/progress-log.md",
  "docs/codex-ops-workflow.md",
  "docs/codex-git-workflow.md",
];

const missing = requiredDocs.filter((path) => !existsSync(join(root, path)));
if (missing.length > 0) {
  for (const path of missing) {
    console.error(`Missing required project document: ${path}`);
  }
  process.exit(1);
}

const opsConfigPath = join(root, ".codex/project-ops-workflow.json");
const opsConfig = JSON.parse(readFileSync(opsConfigPath, "utf8").replace(/^\uFEFF/, ""));
const requiredOperations = [
  "format",
  "lint",
  "typecheck",
  "test",
  "build",
  "structureCheck",
  "docsCheck",
];

for (const operation of requiredOperations) {
  const commands = opsConfig.operations?.[operation]?.commands;
  if (!Array.isArray(commands) || commands.length === 0) {
    console.error(`Ops workflow operation is not wired: ${operation}`);
    process.exit(1);
  }
}

const progressLog = readFileSync(join(root, "docs/progress-log.md"), "utf8");
if (!progressLog.includes("Current phase:") || !progressLog.includes("Next recommended round:")) {
  console.error("Progress log does not record current status and next round guidance.");
  process.exit(1);
}

console.log("Documentation workflow check passed.");
