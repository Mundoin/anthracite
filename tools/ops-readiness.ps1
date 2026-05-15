<#
.SYNOPSIS
  Anthracite — Agent Operating Layer readiness gate.

.DESCRIPTION
  Aggregates Graphify, AgentOps, repo state, and required docs into a single
  READY / NOT READY signal. This is the mechanical truth for whether V1
  product coding may proceed.

  Exits 0 when READY, 1 otherwise.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools/ops-readiness.ps1
#>

$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$checks = New-Object System.Collections.Generic.List[object]
function Check($name, $ok, $fixHint = $null) {
  $checks.Add([pscustomobject]@{ name = $name; ok = [bool]$ok; fix = $fixHint }) | Out-Null
}

# 1. Git repo present.
Check "git-repo"              (Test-Path ".git") "git init -b main"

# 2. JS bootstrap exists OR intentionally pending (package.json present is the floor).
Check "pnpm-bootstrap"        (Test-Path "package.json") "scaffold package.json"

# 3. Graphify CLI on PATH.
$graphifyCmd = Get-Command graphify -ErrorAction SilentlyContinue
Check "graphify-cli"          ([bool]$graphifyCmd) "uv tool install graphifyy"

# 4. Graphify report + graph.
Check "graphify-report"       (Test-Path "graphify-out/GRAPH_REPORT.md") "run 'graphify .' from repo root"
Check "graphify-graph"        (Test-Path "graphify-out/graph.json")      "run 'graphify .' from repo root"

# 5. AO CLI.
$aoCmd = Get-Command ao -ErrorAction SilentlyContinue
Check "ao-cli"                ([bool]$aoCmd) "install ao via install-ao.ps1"

# 6. ao doctor exits 0.
$doctorOk = $false
if ($aoCmd) {
  try {
    & ao doctor 2>&1 | Out-Null
    $doctorOk = ($LASTEXITCODE -eq 0)
  } catch { $doctorOk = $false }
}
Check "ao-doctor"             $doctorOk "run 'ao doctor' and resolve issues"

# 7. .agents/ scaffolded.
Check "agents-dir"            (Test-Path ".agents")            "ao quick-start"
Check "agents-readme"         (Test-Path ".agents/README.md")  "scaffold .agents/README.md"

# 8. Role split mentioned in AGENTS.md and CLAUDE.md.
$agentsText  = if (Test-Path "AGENTS.md") { Get-Content "AGENTS.md" -Raw } else { "" }
$claudeText  = if (Test-Path "CLAUDE.md") { Get-Content "CLAUDE.md" -Raw } else { "" }
$rolesPattern = "(?ims)Claude[^\n]*?main\s+coding\s+agent[\s\S]*?Codex[^\n]*?admin"
Check "agents-md-roles"       ($agentsText -match $rolesPattern)  "describe Claude/Codex role split in AGENTS.md"
Check "claude-md-roles"       ($claudeText -match $rolesPattern)  "describe Claude/Codex role split in CLAUDE.md"

# 9. Operating-layer doc + foundational decision.
Check "ops-layer-doc"         (Test-Path "docs/operations/AGENT_OPERATING_LAYER.md") "create docs/operations/AGENT_OPERATING_LAYER.md"
Check "decision-0001"         (Test-Path "obsidian/decisions/0001-agent-operating-layer-first.md") "create the 0001 decision file"

# Report.
Write-Host "ops-readiness:" -ForegroundColor Cyan
$pad = 22
foreach ($c in $checks) {
  $mark = if ($c.ok) { "ok" } else { "MISSING" }
  $color = if ($c.ok) { "Green" } else { "Yellow" }
  Write-Host ("  {0,-$pad} {1}" -f $c.name, $mark) -ForegroundColor $color
}

$ready = -not ($checks | Where-Object { -not $_.ok })

if ($ready) {
  Write-Host ""
  Write-Host "ops-readiness: READY" -ForegroundColor Green
  exit 0
} else {
  Write-Host ""
  Write-Host "ops-readiness: NOT READY" -ForegroundColor Red
  Write-Host "remaining work:" -ForegroundColor Red
  foreach ($c in ($checks | Where-Object { -not $_.ok })) {
    Write-Host ("  - {0,-$pad} fix: {1}" -f $c.name, $c.fix)
  }
  exit 1
}
