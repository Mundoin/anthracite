<#
.SYNOPSIS
  Anthracite — AgentOps / AO health probe.

.DESCRIPTION
  Read-only check that AO is installed and usable inside this rig. Exits 0
  when green, 1 when red.

  Checks:
    1. `ao` command on PATH.
    2. `ao version` succeeds.
    3. `ao doctor` exits 0.
    4. `.agents/` directory exists.
    5. `.agents/README.md` exists.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools/agentops-status.ps1
#>

$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$state = [ordered]@{
  cli_present     = $false
  cli_version     = $null
  doctor_ok       = $false
  agents_dir      = $false
  agents_readme   = $false
}

$cmd = Get-Command ao -ErrorAction SilentlyContinue
if ($cmd) {
  $state.cli_present = $true
  try {
    $ver = (& ao version 2>&1 | Out-String).Trim()
    $state.cli_version = $ver
  } catch {
    $state.cli_version = "(unable to read version)"
  }

  try {
    & ao doctor 2>&1 | Out-Null
    $state.doctor_ok = ($LASTEXITCODE -eq 0)
  } catch {
    $state.doctor_ok = $false
  }
}

$state.agents_dir    = Test-Path ".agents"
$state.agents_readme = Test-Path ".agents/README.md"

Write-Host "agentops-status:" -ForegroundColor Cyan
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

$green = $state.cli_present -and $state.doctor_ok -and $state.agents_dir -and $state.agents_readme
if ($green) {
  Write-Host "agentops-status: GREEN" -ForegroundColor Green
  exit 0
} else {
  Write-Host "agentops-status: RED" -ForegroundColor Red
  if (-not $state.cli_present)   { Write-Host "  fix: irm https://raw.githubusercontent.com/boshu2/agentops/main/scripts/install-ao.ps1 | iex" }
  if (-not $state.doctor_ok)     { Write-Host "  fix: run 'ao doctor' and resolve reported issues" }
  if (-not $state.agents_dir)    { Write-Host "  fix: ensure .agents/ exists (ao quick-start)" }
  if (-not $state.agents_readme) { Write-Host "  fix: ensure .agents/README.md exists" }
  exit 1
}
