<#
.SYNOPSIS
  Anthracite — Graphify health probe.

.DESCRIPTION
  Read-only check that Graphify is installed and that a usable repo graph
  exists for this rig. Exits 0 when green, 1 when red.

  Checks:
    1. `graphify` command on PATH.
    2. `graphify --version` succeeds.
    3. `graphify-out/GRAPH_REPORT.md` exists.
    4. `graphify-out/graph.json` exists.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools/graphify-status.ps1
#>

$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$state = [ordered]@{
  cli_present    = $false
  cli_version    = $null
  report_present = $false
  graph_present  = $false
}

# 1. CLI on PATH.
$cmd = Get-Command graphify -ErrorAction SilentlyContinue
if ($cmd) {
  $state.cli_present = $true
  try {
    $ver = (& graphify --version 2>&1 | Out-String).Trim()
    $state.cli_version = $ver
  } catch {
    $state.cli_version = "(unable to read --version)"
  }
}

# 2. Generated artifacts.
$state.report_present = Test-Path "graphify-out/GRAPH_REPORT.md"
$state.graph_present  = Test-Path "graphify-out/graph.json"

# Report.
Write-Host "graphify-status:" -ForegroundColor Cyan
foreach ($k in $state.Keys) {
  $v = $state[$k]
  if ($v -is [bool]) {
    $mark = if ($v) { "ok" } else { "MISSING" }
    $color = if ($v) { "Green" } else { "Yellow" }
    Write-Host ("  {0,-15} {1}" -f $k, $mark) -ForegroundColor $color
  } else {
    $vs = if ($null -ne $v -and "$v".Length -gt 0) { "$v" } else { "(none)" }
    Write-Host ("  {0,-15} {1}" -f $k, $vs)
  }
}

$green = $state.cli_present -and $state.report_present -and $state.graph_present
if ($green) {
  Write-Host "graphify-status: GREEN" -ForegroundColor Green
  exit 0
} else {
  Write-Host "graphify-status: RED" -ForegroundColor Red
  if (-not $state.cli_present)    { Write-Host "  fix: uv tool install graphifyy" }
  if (-not $state.report_present) { Write-Host "  fix: run 'graphify .' from repo root" }
  if (-not $state.graph_present)  { Write-Host "  fix: run 'graphify .' from repo root" }
  exit 1
}
