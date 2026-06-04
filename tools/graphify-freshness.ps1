<#
.SYNOPSIS
  Anthracite — Graphify freshness guard (AST-only).

.DESCRIPTION
  Workspace/operator convenience. On App Runner terminal startup, this script
  decides whether graphify-out/graph.json is stale relative to tracked source
  inputs and, if so, runs `graphify update .` (AST-only). It NEVER runs the
  full semantic / LLM pipeline and does NOT require Gemini/Google API keys.

  States:
    [GREEN]  graph.json current relative to inputs
    [YELLOW] graph.json missing or stale -> running `graphify update .`
    [RED]    graphify missing on PATH, or update failed

  Output written to: $env:TEMP\graphify-freshness-YYYYMMDD-HHMMSS.log

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\graphify-freshness.ps1
#>

$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$ts      = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path $env:TEMP ("graphify-freshness-{0}.log" -f $ts)
"Anthracite graphify freshness @ $(Get-Date -Format o)" | Out-File -FilePath $logPath -Encoding utf8

function Log-Line($line) {
  Add-Content -Path $logPath -Value $line
}

function Write-Status($color, $label, $msg) {
  $tag = "[$label]"
  Write-Host $tag -ForegroundColor $color -NoNewline
  Write-Host (" " + $msg)
  Log-Line ("{0} {1}" -f $tag, $msg)
}

$graphPath  = Join-Path $repo "graphify-out\graph.json"
$reportPath = Join-Path $repo "graphify-out\GRAPH_REPORT.md"

# --- graphify presence ---
$graphify = Get-Command graphify -ErrorAction SilentlyContinue
if (-not $graphify) {
  Write-Status "Red" "RED" "graphify not on PATH. Install graphify or fix PATH."
  Log-Line "Log saved to $logPath"
  exit 1
}

# --- Inputs we consider 'sources' for staleness ---
$sourceRoots = @(
  "src",
  "src-tauri",
  "docs",
  "obsidian"
)
$sourceFiles = @(
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "tsconfig.node.json",
  "vite.config.ts",
  "AGENTS.md",
  "CLAUDE.md",
  "PRODUCT.md",
  "GOALS.md",
  "README.md"
)

function Get-NewestInput {
  $newest = $null
  foreach ($root in $sourceRoots) {
    $rootPath = Join-Path $repo $root
    if (-not (Test-Path $rootPath)) { continue }
    Get-ChildItem -Path $rootPath -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notmatch "\\(node_modules|target|gen|dist|build|graphify-out)\\" } |
      ForEach-Object {
        if (-not $newest -or $_.LastWriteTime -gt $newest.LastWriteTime) { $newest = $_ }
      }
  }
  foreach ($f in $sourceFiles) {
    $p = Join-Path $repo $f
    if (Test-Path $p) {
      $fi = Get-Item $p
      if (-not $newest -or $fi.LastWriteTime -gt $newest.LastWriteTime) { $newest = $fi }
    }
  }
  return $newest
}

# --- Decide state ---
$mustUpdate = $false
$reason     = $null

if (-not (Test-Path $graphPath)) {
  $mustUpdate = $true
  $reason     = "graph.json missing"
} else {
  $graphInfo = Get-Item $graphPath
  $newest    = Get-NewestInput
  if ($newest -and $newest.LastWriteTime -gt $graphInfo.LastWriteTime) {
    $mustUpdate = $true
    $reason     = ("input newer than graph.json: {0} ({1})" -f $newest.FullName, $newest.LastWriteTime)
  }
}

if (-not $mustUpdate) {
  $gi = Get-Item $graphPath
  Write-Status "Green" "GREEN" ("graph current. graph.json LastWriteTime = {0}" -f $gi.LastWriteTime)
  if (Test-Path $reportPath) {
    $ri = Get-Item $reportPath
    Log-Line ("GRAPH_REPORT.md LastWriteTime = {0}" -f $ri.LastWriteTime)
  }
  Log-Line "Log saved to $logPath"
  exit 0
}

Write-Status "Yellow" "YELLOW" ("graph stale: {0}. Running 'graphify update .' (AST-only) ..." -f $reason)
Log-Line "Command: graphify update ."

# --- Run graphify update with timeout (~90s) ---
$job = Start-Job -ScriptBlock {
  param($r)
  Set-Location $r
  & graphify update . 2>&1
} -ArgumentList $repo

$completed = Wait-Job -Job $job -Timeout 90
if (-not $completed) {
  Stop-Job -Job $job -ErrorAction SilentlyContinue
  Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
  Write-Status "Red" "RED" "graphify update timed out after 90s"
  Log-Line "Log saved to $logPath"
  exit 2
}

$output = Receive-Job -Job $job 2>&1
$exit   = $job.ChildJobs[0].JobStateInfo.State
Remove-Job -Job $job -Force -ErrorAction SilentlyContinue

$output | ForEach-Object { Log-Line ("  " + $_) }

if (Test-Path $graphPath) {
  $gi = Get-Item $graphPath
  Write-Status "Green" "GREEN" ("graphify update done. graph.json LastWriteTime = {0}" -f $gi.LastWriteTime)
  Log-Line "Log saved to $logPath"
  exit 0
} else {
  Write-Status "Red" "RED" "graphify update finished but graph.json not produced. See log."
  Log-Line "Log saved to $logPath"
  exit 3
}
