import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();

const requiredPaths = [
  "apps/game",
  "apps/sandbox",
  "apps/editor",
  "apps/replay-viewer",
  "packages/core",
  "packages/content-schema",
  "packages/content-compiler",
  "packages/replay",
  "packages/run",
  "packages/presentation-core",
  "packages/theater-three",
  "packages/rulesets",
  ".github/workflows/ci.yml",
];

const missing = requiredPaths.filter((path) => !existsSync(join(root, path)));

const coreSource = join(root, "packages/core/src");
const forbiddenCorePatterns = [
  {
    name: "nondeterministic random or wall-clock source",
    pattern: /\b(Math\.random|Date\.now|performance\.now|requestAnimationFrame)\b/,
  },
  {
    name: "browser global",
    pattern: /\b(window|document|localStorage|indexedDB)\./,
  },
  {
    name: "presentation or UI dependency import",
    pattern: /from\s+["'](?:react|react-dom|three|gsap|dexie|@vitejs\/plugin-react)["']/,
  },
];

function walkFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir).flatMap((entry) => {
    const absolute = join(dir, entry);
    const stat = statSync(absolute);

    if (stat.isDirectory()) {
      return walkFiles(absolute);
    }

    return absolute.endsWith(".ts") || absolute.endsWith(".tsx") ? [absolute] : [];
  });
}

const violations = [];

for (const file of walkFiles(coreSource)) {
  const contents = readFileSync(file, "utf8");

  for (const check of forbiddenCorePatterns) {
    if (check.pattern.test(contents)) {
      violations.push(`${relative(root, file)} uses ${check.name}`);
    }
  }
}

if (missing.length > 0 || violations.length > 0) {
  for (const path of missing) {
    console.error(`Missing required scaffold path: ${path}`);
  }

  for (const violation of violations) {
    console.error(`Architecture violation: ${violation}`);
  }

  process.exit(1);
}

console.log("Architecture scaffold check passed.");
