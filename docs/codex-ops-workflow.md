<!-- codex-project-ops-workflow: initialized -->
<!-- initialized-at: 2026-06-17 00:14:10 +08:00 -->

# Codex Ops Workflow

Initialization status: initialized
Project: UCRE
Repository root: D:/LabProjects/UCRE
Machine config: `.codex\project-ops-workflow.json`
Skill: project-ops-workflow

Treat this document and .codex/project-ops-workflow.json as the source of truth for mechanical project operations.

## Global Wrappers

```
powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\EnvCheck.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\RestoreDeps.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\InstallDeps.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Build.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Test.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Lint.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Format.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Typecheck.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\StructureCheck.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Codegen.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\DocsCheck.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\StartDevServer.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\StopDevServer.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Package.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\ReleaseDryRun.cmd
```

## Validate Sequence

format, lint, typecheck, test, build, structureCheck, docsCheck

## Configured Commands

- Env check: `node --version`, `corepack --version`
- Install dependencies: `corepack pnpm install`
- Restore dependencies: `corepack pnpm install --frozen-lockfile`
- Format check: `corepack pnpm format:check`
- Lint: `corepack pnpm lint`
- Typecheck: `corepack pnpm typecheck`
- Test: `corepack pnpm test`
- Build: `corepack pnpm build`
- Structure check: `corepack pnpm structure:check`
- Docs check: `corepack pnpm docs:check`

## Dev Server

Start command: ``
Health URL: ``
Ready text: ``
Timeout seconds: 30

## Safety Policy

Do not run destructive clean/reset/deploy commands unless the user explicitly asks.
