<#
.SYNOPSIS
  Anthracite — VS Code workspace bootstrap.

.DESCRIPTION
  Operator convenience script. Idempotent.
    1. Ensures D:\Repos\anthracite\.venv exists (Python venv for *operator*
       tooling consistency only — never product runtime).
    2. Prints versions of the CLIs the workspace terminals will use.
    3. Probes DeepSeek CLI under common names and reports which (if any)
       command resolved. Workspace terminal D will use the resolved name.

  No packages installed. No Python app code. No commits.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools/workspace-init.ps1
#>

$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

function Write-Section($title) {
  Write-Host ""
  Write-Host "-- $title " -ForegroundColor Cyan -NoNewline
  Write-Host ("-" * [Math]::Max(2, 70 - $title.Length)) -ForegroundColor DarkCyan
}

function Show-Version($label, $exe, $verArg) {
  $cmd = Get-Command $exe -ErrorAction SilentlyContinue
  if (-not $cmd) {
    Write-Host ("  {0,-10} (not on PATH)" -f $label) -ForegroundColor Yellow
    return
  }
  try {
    $out = & $exe $verArg 2>&1 | Out-String
    $first = @($out -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -First 1)[0]
    if (-not $first) { $first = "(no output)" }
    Write-Host ("  {0,-10} {1}" -f $label, ($first.Trim()))
  } catch {
    Write-Host ("  {0,-10} (error: {1})" -f $label, $_.Exception.Message) -ForegroundColor Yellow
  }
}

Write-Section ".venv bootstrap"
$venv = Join-Path $repo ".venv"
if (Test-Path $venv) {
  Write-Host "  .venv already present at $venv"
} else {
  Write-Host "  creating .venv at $venv ..."
  $created = $false

  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py) {
    & py -3 -m venv $venv
    if ($LASTEXITCODE -eq 0 -and (Test-Path "$venv\Scripts\python.exe")) {
      $created = $true
      Write-Host "  ok (via 'py -3 -m venv')"
    }
  }

  if (-not $created) {
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
      & python -m venv $venv
      if ($LASTEXITCODE -eq 0 -and (Test-Path "$venv\Scripts\python.exe")) {
        $created = $true
        Write-Host "  ok (via 'python -m venv')"
      }
    }
  }

  if (-not $created) {
    Write-Host "  WARN: could not create .venv. No 'py' or 'python' usable." -ForegroundColor Yellow
    Write-Host "        Install Python from https://www.python.org/ or the Microsoft Store, then re-run." -ForegroundColor Yellow
  }
}

Write-Section "Tool versions"
Show-Version "node"     "node"     "-v"
Show-Version "pnpm"     "pnpm"     "-v"
Show-Version "cargo"    "cargo"    "--version"
Show-Version "rustc"    "rustc"    "--version"
Show-Version "graphify" "graphify" "--version"
Show-Version "ao"       "ao"       "version"
Show-Version "claude"   "claude"   "--version"
Show-Version "codex"    "codex"    "--version"
Show-Version "gh"       "gh"       "--version"
Show-Version "git"      "git"      "--version"

Write-Section "DeepSeek CLI probe"
$deepseekNames = @("deepseek", "deepseek-cli", "ds", "deepseek-v4")
$foundDeepseek = $null
foreach ($name in $deepseekNames) {
  $path = & where.exe $name 2>$null | Select-Object -First 1
  if ($path) {
    Write-Host ("  found: {0} -> {1}" -f $name, $path) -ForegroundColor Green
    if (-not $foundDeepseek) { $foundDeepseek = $name }
  } else {
    Write-Host ("  not found: {0}" -f $name) -ForegroundColor DarkGray
  }
}

if ($foundDeepseek) {
  Write-Host "  -> Workspace terminal D will use: $foundDeepseek"
} else {
  Write-Host "  WARN: no DeepSeek CLI found under common names." -ForegroundColor Yellow
  Write-Host "        Terminal D will open ready and idle; run your DeepSeek command manually." -ForegroundColor Yellow
}

Write-Section "Done"
Write-Host "  Open workspace:  code .\anthracite.code-workspace"
Write-Host "  Status snapshot: powershell -ExecutionPolicy Bypass -File tools\workspace-status.ps1"
Write-Host ""
