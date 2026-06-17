import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const gameIndexPath = path.resolve(currentDirectory, "..", "..", "game", "dist", "index.html");

if (!existsSync(gameIndexPath)) {
  throw new Error(`Game dist entry is missing: ${gameIndexPath}`);
}

console.log(`Desktop wrapper verified game dist: ${gameIndexPath}`);
