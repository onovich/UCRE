$ErrorActionPreference = "Stop"

$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"

$desktopRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$repoRoot = Resolve-Path (Join-Path $desktopRoot "..\..")
$stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ucre-electron-staging-" + [System.Guid]::NewGuid().ToString("N"))
$outputRoot = Join-Path $desktopRoot "dist"
$gameDist = Join-Path $repoRoot "apps\game\dist"
$builder = Join-Path $desktopRoot "node_modules\.bin\electron-builder.cmd"

if (-not (Test-Path -LiteralPath $builder)) {
  throw "electron-builder was not found at $builder. Run pnpm install first."
}

if (-not (Test-Path -LiteralPath (Join-Path $gameDist "index.html"))) {
  throw "Game dist was not found at $gameDist. Run corepack pnpm --filter @ucre/game build first."
}

if ((Test-Path -LiteralPath $stagingRoot) -and ($stagingRoot.StartsWith([System.IO.Path]::GetTempPath(), [System.StringComparison]::OrdinalIgnoreCase))) {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path (Join-Path $stagingRoot "src") | Out-Null
Copy-Item -LiteralPath (Join-Path $desktopRoot "src\main.js") -Destination (Join-Path $stagingRoot "src\main.js") -Force
Copy-Item -LiteralPath $gameDist -Destination (Join-Path $stagingRoot "game-dist") -Recurse -Force

$packageJson = [ordered]@{
  name = "ucre-demo-desktop"
  version = "0.0.0"
  description = "Electron wrapper for the UCRE Phase 10 vertical demo."
  author = "UCRE"
  private = $true
  type = "module"
  main = "src/main.js"
  build = [ordered]@{
    appId = "dev.ucre.demo"
    productName = "UCRE Demo"
    artifactName = "UCRE-Demo.exe"
    electronVersion = "42.4.1"
    npmRebuild = $false
    nodeGypRebuild = $false
    directories = [ordered]@{
      output = $outputRoot
    }
    files = @(
      "src/**",
      "game-dist/**",
      "package.json"
    )
    win = [ordered]@{
      target = @(
        [ordered]@{
          target = "portable"
          arch = @("x64")
        }
      )
    }
  }
} | ConvertTo-Json -Depth 10

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $stagingRoot "package.json"), $packageJson, $utf8NoBom)

$env:npm_config_user_agent = "npm/10.0.0 node/v24.0.0 win32 x64"
$env:npm_config_local_prefix = $stagingRoot
$env:npm_execpath = ""
$env:PNPM_HOME = ""

& $builder --projectDir $stagingRoot --win portable --x64
$exitCode = $LASTEXITCODE

if ((Test-Path -LiteralPath $stagingRoot) -and ($stagingRoot.StartsWith([System.IO.Path]::GetTempPath(), [System.StringComparison]::OrdinalIgnoreCase))) {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}

exit $exitCode
exit $LASTEXITCODE
