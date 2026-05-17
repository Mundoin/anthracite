<#
.SYNOPSIS
  Anthracite — AgentOps handoff runtime-buffer maintenance.

.DESCRIPTION
  Dry-run by default. Reports .agents/handoff volume and, when -Apply is
  provided, archives old runtime handoffs into .agents/handoff-archive/YYYY-MM.

  This script never deletes files. It never touches named stage handoffs, the
  tracked design handoff bundle, or the root HANDOFF.md local artifact.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools/handoff-maintenance.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools/handoff-maintenance.ps1 -Apply
#>

param(
  [switch]$Apply,
  [int]$KeepStop = 20,
  [int]$KeepAuto = 10,
  [int]$MinAgeHours = 48
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$handoffRoot = Join-Path $repo ".agents\handoff"
$archiveRoot = Join-Path $repo ".agents\handoff-archive"
$cutoff = (Get-Date).AddHours(-1 * $MinAgeHours)

function Write-Section($title) {
  Write-Host ""
  Write-Host "-- $title " -ForegroundColor Cyan -NoNewline
  Write-Host ("-" * [Math]::Max(2, 70 - $title.Length)) -ForegroundColor DarkCyan
}

function Count-Files($files) {
  [pscustomobject]@{
    Total = @($files).Count
    Named = @($files | Where-Object {
      $_.Name -notlike "stop-*.md" -and $_.Name -notlike "auto-*.json"
    }).Count
    Stop = @($files | Where-Object { $_.Name -like "stop-*.md" }).Count
    Auto = @($files | Where-Object { $_.Name -like "auto-*.json" }).Count
  }
}

if (-not (Test-Path $handoffRoot)) {
  Write-Host "No .agents\handoff directory found at $handoffRoot" -ForegroundColor Yellow
  exit 0
}

$all = @(Get-ChildItem -LiteralPath $handoffRoot -Force -File)
$stopFiles = @($all | Where-Object { $_.Name -like "stop-*.md" } | Sort-Object LastWriteTime -Descending)
$autoFiles = @($all | Where-Object { $_.Name -like "auto-*.json" } | Sort-Object LastWriteTime -Descending)
$namedFiles = @($all | Where-Object {
  $_.Name -notlike "stop-*.md" -and $_.Name -notlike "auto-*.json"
})

$oldStop = @($stopFiles | Select-Object -Skip $KeepStop | Where-Object { $_.LastWriteTime -lt $cutoff })
$oldAuto = @($autoFiles | Select-Object -Skip $KeepAuto | Where-Object { $_.LastWriteTime -lt $cutoff })
$eligible = @($oldStop + $oldAuto | Sort-Object LastWriteTime)

Write-Section "Handoff maintenance"
Write-Host ("  repo             {0}" -f $repo)
Write-Host ("  handoff root     {0}" -f $handoffRoot)
Write-Host ("  mode             {0}" -f $(if ($Apply) { "APPLY (archive)" } else { "DRY RUN" }))
Write-Host ("  keep stop        {0}" -f $KeepStop)
Write-Host ("  keep auto        {0}" -f $KeepAuto)
Write-Host ("  min age hours    {0}" -f $MinAgeHours)
Write-Host ("  cutoff           {0}" -f $cutoff)

Write-Section "Current counts"
Count-Files $all | Format-List | Out-String | Write-Host
Write-Host ("  root HANDOFF.md  {0}" -f $(if (Test-Path (Join-Path $repo "HANDOFF.md")) { "present (ignored local artifact)" } else { "absent" }))
Write-Host ("  named handoffs   preserved automatically ({0})" -f $namedFiles.Count)

Write-Section "Eligible for archive"
if ($eligible.Count -eq 0) {
  Write-Host "  none"
} else {
  $eligible |
    Select-Object Name, Length, LastWriteTime |
    Format-Table -AutoSize |
    Out-String |
    Write-Host
}

if (-not $Apply) {
  Write-Host ""
  Write-Host "Dry run only. Re-run with -Apply to archive eligible runtime handoffs." -ForegroundColor Yellow
  exit 0
}

if ($eligible.Count -eq 0) {
  Write-Host ""
  Write-Host "Nothing to archive." -ForegroundColor Green
  exit 0
}

Write-Section "Archiving"
foreach ($file in $eligible) {
  $month = $file.LastWriteTime.ToString("yyyy-MM")
  $destDir = Join-Path $archiveRoot $month
  if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
  }

  $dest = Join-Path $destDir $file.Name
  if (Test-Path $dest) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $dest = Join-Path $destDir ("{0}.{1}{2}" -f $file.BaseName, $stamp, $file.Extension)
  }

  Move-Item -LiteralPath $file.FullName -Destination $dest
  Write-Host ("  archived {0} -> {1}" -f $file.Name, $dest)
}

$after = @(Get-ChildItem -LiteralPath $handoffRoot -Force -File)
Write-Section "Final counts"
Count-Files $after | Format-List | Out-String | Write-Host
Write-Host ""
Write-Host "Archive complete. No files were deleted." -ForegroundColor Green
