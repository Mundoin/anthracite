<#
.SYNOPSIS
  Anthracite — repo invariants validator.

.DESCRIPTION
  Cheap, read-only checks. Backs the GOALS.md "tools/validate.ps1" gates:
    - required docs present
    - obsidian vault skeleton present
    - no Python sources in repo
    - no Three.js dependency
    - lockfile shape (pnpm only)

  Exits non-zero on any failure so AO / CI can treat it as a hard gate.

.EXAMPLE
  pwsh -File tools/validate.ps1
#>

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$problems = New-Object System.Collections.Generic.List[string]
function Fail($msg) { $problems.Add($msg) | Out-Null }

# 1. Required docs.
$requiredDocs = @(
  "README.md","PRODUCT.md","GOALS.md","AGENTS.md","CLAUDE.md",
  "package.json","tsconfig.json","vite.config.ts","index.html",
  "src/main.tsx","src/App.tsx","src/BabylonCanvas.tsx","src/App.css",
  "src-tauri/Cargo.toml","src-tauri/tauri.conf.json",
  "src-tauri/src/main.rs","src-tauri/src/lib.rs",
  "docs/operations/AGENT_OPERATING_LAYER.md",
  "obsidian/decisions/0001-agent-operating-layer-first.md",
  "tools/agentops-status.ps1","tools/graphify-status.ps1","tools/ops-readiness.ps1"
)
foreach ($d in $requiredDocs) {
  if (-not (Test-Path $d)) { Fail "missing required file: $d" }
}

# 2. Obsidian vault skeleton.
$vault = @(
  "obsidian/ANTHRACITE_INDEX.md",
  "obsidian/stages",
  "obsidian/decisions",
  "obsidian/agents",
  "obsidian/build-log"
)
foreach ($v in $vault) {
  if (-not (Test-Path $v)) { Fail "missing vault path: $v" }
}

# 3. No Python sources anywhere outside ignored dirs.
$pyHits = Get-ChildItem -Recurse -File -Include *.py -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch "\\(node_modules|target|dist|\.git|\.agents)\\" }
if ($pyHits) {
  foreach ($h in $pyHits) { Fail "Python source forbidden: $($h.FullName)" }
}

# 4. package.json must not depend on three / @types/three.
if (Test-Path "package.json") {
  $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  $allDeps = @()
  if ($pkg.dependencies)    { $allDeps += $pkg.dependencies.PSObject.Properties.Name }
  if ($pkg.devDependencies) { $allDeps += $pkg.devDependencies.PSObject.Properties.Name }
  foreach ($d in $allDeps) {
    if ($d -match "^three($|/|-)") { Fail "Three.js dependency forbidden: $d" }
    if ($d -eq "@types/three")      { Fail "Three.js types forbidden: $d" }
  }
}

# 5. Lockfile shape: pnpm-lock.yaml is the only allowed JS lockfile.
if (Test-Path "package-lock.json") { Fail "npm lockfile forbidden (use pnpm)" }
if (Test-Path "yarn.lock")         { Fail "yarn lockfile forbidden (use pnpm)" }

# Report.
if ($problems.Count -gt 0) {
  Write-Host "validate.ps1: FAIL" -ForegroundColor Red
  foreach ($p in $problems) { Write-Host "  - $p" -ForegroundColor Red }
  exit 1
}

Write-Host "validate.ps1: OK" -ForegroundColor Green
Write-Host "  required docs       : ok"
Write-Host "  obsidian vault      : ok"
Write-Host "  no python sources   : ok"
Write-Host "  no three.js deps    : ok"
Write-Host "  pnpm lockfile shape : ok"
exit 0
