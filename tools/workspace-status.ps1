<#
.SYNOPSIS
  Anthracite — workspace status snapshot.

.DESCRIPTION
  Read-only. Prints repo state, branch, dirty count, and the versions of
  every CLI the operator workspace expects on PATH. Also runs
  tools/ops-readiness.ps1 when present.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools/workspace-status.ps1
#>

$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

function Write-Section($title) {
  Write-Host ""
  Write-Host "-- $title " -ForegroundColor Cyan -NoNewline
  Write-Host ("-" * [Math]::Max(2, 70 - $title.Length)) -ForegroundColor DarkCyan
}

function Show($label, $exe, $verArg) {
  $cmd = Get-Command $exe -ErrorAction SilentlyContinue
  if (-not $cmd) {
    Write-Host ("  {0,-12} (not on PATH)" -f $label) -ForegroundColor Yellow
    return
  }
  try {
    $out = & $exe $verArg 2>&1 | Out-String
    $first = @($out -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -First 1)[0]
    if (-not $first) { $first = "(no output)" }
    Write-Host ("  {0,-12} {1}" -f $label, ($first.Trim()))
  } catch {
    Write-Host ("  {0,-12} (error: {1})" -f $label, $_.Exception.Message) -ForegroundColor Yellow
  }
}

Write-Section "Repo"
Write-Host ("  path         {0}" -f $repo)
try {
  $branch = git rev-parse --abbrev-ref HEAD 2>$null
  $head   = git rev-parse --short HEAD 2>$null
  Write-Host ("  branch       {0}" -f $branch)
  Write-Host ("  HEAD         {0}" -f $head)
} catch {
  Write-Host "  branch       (no commits yet or git unavailable)"
}

Write-Section "Git status (short)"
$status = git status --short 2>$null
if ($status) {
  $status | Select-Object -First 40 | ForEach-Object { Write-Host ("  " + $_) }
  $count = ($status | Measure-Object | Select-Object -ExpandProperty Count)
  if ($count -gt 40) { Write-Host ("  ... and {0} more" -f ($count - 40)) }
} else {
  Write-Host "  (clean)"
}

Write-Section "Workspace state"
$venvOk      = Test-Path ".venv\Scripts\python.exe"
$workspaceOk = Test-Path "anthracite.code-workspace"
$graphOk     = Test-Path "graphify-out\graph.json"
$venvMark      = if ($venvOk)      { "ok" } else { "MISSING" }
$workspaceMark = if ($workspaceOk) { "ok" } else { "MISSING" }
Write-Host ("  .venv                       {0}" -f $venvMark)         -ForegroundColor $(if ($venvOk)      { "Green" } else { "Yellow" })
Write-Host ("  anthracite.code-workspace   {0}" -f $workspaceMark)    -ForegroundColor $(if ($workspaceOk) { "Green" } else { "Yellow" })
if ($graphOk) {
  $gi = Get-Item "graphify-out\graph.json"
  Write-Host ("  graphify-out\graph.json     ok ({0})" -f $gi.LastWriteTime) -ForegroundColor Green
} else {
  Write-Host  "  graphify-out\graph.json     MISSING (run tools\graphify-freshness.ps1)" -ForegroundColor Yellow
}

Write-Section "CLI versions"
Show "node"      "node"     "-v"
Show "pnpm"      "pnpm"     "-v"
Show "cargo"     "cargo"    "--version"
Show "rustc"     "rustc"    "--version"
Show "graphify"  "graphify" "--version"
Show "ao"        "ao"       "version"
Show "claude"    "claude"   "--version"
Show "codex"     "codex"    "--version"
Show "gh"        "gh"       "--version"
Show "git"       "git"      "--version"

Write-Section "Operating layer readiness"
$opsScript = Join-Path $PSScriptRoot "ops-readiness.ps1"
if (Test-Path $opsScript) {
  & powershell -ExecutionPolicy Bypass -File $opsScript | Out-Host
} else {
  Write-Host "  tools/ops-readiness.ps1 not present" -ForegroundColor Yellow
}

Write-Host ""
