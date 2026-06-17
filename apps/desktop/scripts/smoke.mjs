import { spawn, spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const executablePath = resolve(process.argv[2] ?? "dist/UCRE-Demo.exe");
const MIN_EXPECTED_EXE_BYTES = 20 * 1024 * 1024;
const SMOKE_WAIT_MS = 8000;

if (!existsSync(executablePath)) {
  throw new Error(`Desktop executable was not found: ${executablePath}`);
}

const stat = statSync(executablePath);
if (stat.size < MIN_EXPECTED_EXE_BYTES) {
  throw new Error(
    `Desktop executable is unexpectedly small: ${stat.size} bytes at ${executablePath}`,
  );
}

const startedAt = Date.now();
const child = spawn(executablePath, [], {
  detached: false,
  stdio: "ignore",
  windowsHide: true,
});

let launchError;
child.on("error", (error) => {
  launchError = error;
});

await delay(SMOKE_WAIT_MS);

if (launchError) {
  throw launchError;
}

const exitedEarly = child.exitCode !== null || child.signalCode !== null;
stopProcessTree(child.pid);

if (exitedEarly) {
  throw new Error(
    `Desktop executable exited before smoke window elapsed: code=${child.exitCode} signal=${child.signalCode}`,
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      executablePath,
      sizeBytes: stat.size,
      runtimeMs: Date.now() - startedAt,
    },
    null,
    2,
  ),
);

function delay(ms) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}

function stopProcessTree(pid) {
  if (!pid) {
    return;
  }

  spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
    stdio: "ignore",
    windowsHide: true,
  });
}
