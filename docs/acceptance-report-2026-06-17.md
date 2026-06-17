# UCRE Acceptance Report - 2026-06-17

Result: accepted with advisory follow-ups.

## Summary

UCRE Phase 0 through Phase 10 has been validated against `docs/acceptance-criteria.md`. The project passes the critical acceptance gates for scope, automation, architecture boundaries, determinism/replay, content pipeline, browser runtime, and desktop runtime.

During acceptance, a mobile screenshot taken through plain Chrome `--screenshot` appeared clipped because the command created a 484px CSS viewport while writing a 390px image. I verified the real 390px CSS viewport through Chrome DevTools Protocol, confirmed `scrollWidth == innerWidth == 390`, and tightened the game mobile CSS so segmented controls remain bounded by their parent container.

## Commands Run

Environment and dependency restore:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\EnvCheck.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\RestoreDeps.cmd
```

Result:

- Node: `v24.13.1`
- Corepack: `0.34.6`
- Frozen pnpm install: passed.

Project validation:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
```

Result:

- format check: passed
- lint: passed
- typecheck: passed
- tests: 30 files passed / 124 tests passed
- build: passed
- structure check: passed
- docs check: passed

Content lint:

```powershell
corepack pnpm content:lint packages/content-compiler/fixtures/slay-like-valid-manifest.json
corepack pnpm content:lint packages/content-compiler/fixtures/slay-like-valid-manifest.json5
corepack pnpm content:lint packages/content-compiler/fixtures/slay-like-valid-manifest.yaml
corepack pnpm content:lint packages/rulesets/fixtures/slay-like-sample-manifest.yaml
```

Result:

- JSON/JSON5/YAML equivalent fixtures compile to `manifestHash=ucre1-03523306`.
- Slay-like sample manifest compiles to `manifestHash=ucre1-65f764df`.

Simulation:

```powershell
corepack pnpm sim:slay -- --runs 5 --seed-prefix acceptance
```

Result:

- 5 runs completed.
- completion rate: 1
- failure rate: 0
- deterministic command/event/replay hashes emitted.

Browser runtime:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\StartDevServer.cmd
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:5173
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\StopDevServer.cmd
```

Result:

- dev server started successfully.
- HTTP status: 200.
- desktop screenshot: nonblank.
- CDP mobile viewport metrics:
  - `innerWidth`: 390
  - `docClientWidth`: 390
  - `docScrollWidth`: 390
  - `bodyScrollWidth`: 390
  - scenario segmented control: left 14, right 376, width 362
  - playback segmented control: left 14, right 376, width 362
- mobile screenshot visually confirms `Starter`, `Boss`, `Run`, `Normal`, and `Fast` are visible without clipping.

Desktop runtime:

```powershell
corepack pnpm --filter @ucre/desktop package:win
corepack pnpm --filter @ucre/desktop smoke
```

Result:

- `apps/desktop/dist/UCRE-Demo.exe` built successfully.
- smoke result: passed.
- executable size: 91,586,047 bytes.
- smoke runtime: 8,164 ms.

Architecture audits:

```powershell
rg "Math\.random|Date\.now|performance\.now|requestAnimationFrame" packages/core packages/replay packages/rulesets packages/run packages/sim
rg "window\.|document\.|localStorage|indexedDB" packages/core packages/replay packages/rulesets packages/run packages/sim
```

Result:

- no ambient rule randomness or wall-clock usage found in pure packages.
- no browser global usage found in pure packages.
- no React/Three/GSAP/Dexie import leakage found in pure packages.

Content quantity check:

```powershell
node -e "import('./packages/rulesets/dist/index.js').then(m=>{const cards=Object.keys(m.SLAY_LIKE_CARD_DEFINITIONS); const enemies=Object.keys(m.SLAY_LIKE_ENEMY_DEFINITIONS); const relics=Object.keys(m.SLAY_LIKE_RELIC_DEFINITIONS); console.log(JSON.stringify({cards:cards.length,enemies:enemies.length,relics:relics.length,bossPresent:enemies.includes('hexaghost')},null,2));})"
```

Result:

```json
{
  "cards": 20,
  "enemies": 5,
  "relics": 5,
  "bossPresent": true
}
```

## Fixes Made During Acceptance

- Updated `apps/game/src/styles.css` to constrain mobile segmented controls and app width for narrow CSS viewports.
- Verified the fix through CDP 390px viewport metrics and screenshot inspection.
- Re-ran game tests, game build, full validation, Electron package build, and desktop smoke after the fix.

## Advisory Follow-Ups

- Vite reports a browser chunk above 500 kB for the game bundle. This is acceptable for the current demo but should be revisited with code splitting before a production release.
- `content:lint` currently validates one manifest path per invocation. The acceptance process invoked all required fixtures individually; multi-file lint support would be a useful convenience improvement.
- Electron uses the default icon. This does not block demo acceptance but should be customized before public distribution.

## Final Decision

Accepted.

All critical acceptance gates passed after the mobile CSS fix. The repository is ready for post-demo hardening, product iteration, or release preparation.
