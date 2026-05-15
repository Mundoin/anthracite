<#
.SYNOPSIS
  Anthracite — quick rig status. Read-only.

.DESCRIPTION
  Prints a one-screen summary of the repo: branch, dirty state, key files,
  installed toolchain versions, gate readiness. Safe to run any time.

.EXAMPLE
  pwsh -File tools/status.ps1
#>

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot

function Write-Section($title) {
  Write-Host ""
  Write-Host "── $title " -ForegroundColor Cyan -NoNewline
  Write-Host ("─" * [Math]::Max(2, 70 - $title.Length)) -ForegroundColor DarkCyan
}

function Try-Cmd($label, $script) {
  try {
    $out = & $script 2>&1 | Out-String
    "{0,-18} {1}" -f $label, ($out.Trim())
  } catch {
    "{0,-18} (not available)" -f $label
  }
}

Write-Section "Repo"
Write-Host ("Path        " + $repo)
Push-Location $repo
try {
  $branch = git rev-parse --abbrev-ref HEAD 2>$null
  $dirty  = (git status --porcelain 2>$null)
  Write-Host ("Branch      " + $branch)
  Write-Host ("Dirty       " + ($(if ($dirty) { "yes" } else { "no" })))
} finally {
  Pop-Location
}

Write-Section "Toolchain"
Write-Host (Try-Cmd "node"   { node -v })
Write-Host (Try-Cmd "pnpm"   { pnpm -v })
Write-Host (Try-Cmd "rustc"  { rustc --version })
Write-Host (Try-Cmd "cargo"  { cargo --version })
Write-Host (Try-Cmd "git"    { git --version })
Write-Host (Try-Cmd "ao"     { ao --version })

Write-Section "Key files"
$mustExist = @(
  "package.json","tsconfig.json","vite.config.ts","index.html",
  "src/main.tsx","src/App.tsx","src/BabylonCanvas.tsx",
  "src-tauri/Cargo.toml","src-tauri/tauri.conf.json","src-tauri/src/lib.rs",
  "README.md","PRODUCT.md","GOALS.md","AGENTS.md","CLAUDE.md",
  "obsidian/ANTHRACITE_INDEX.md"
)
foreach ($f in $mustExist) {
  $p = Join-Path $repo $f
  $mark = if (Test-Path $p) { "ok" } else { "MISSING" }
  Write-Host ("{0,-7} {1}" -f $mark, $f)
}

Write-Section "Operating layer"
& (Join-Path $PSScriptRoot "graphify-status.ps1") | Out-Host
Write-Host ""
& (Join-Path $PSScriptRoot "agentops-status.ps1") | Out-Host
Write-Host ""
& (Join-Path $PSScriptRoot "ops-readiness.ps1") | Out-Host

Write-Section "Next"
Write-Host "  pnpm install"
Write-Host "  pnpm typecheck"
Write-Host "  pnpm build"
Write-Host "  cd src-tauri ; cargo check"
Write-Host "  tools/validate.ps1"
Write-Host "  tools/ops-readiness.ps1   # must be READY before V1B"
Write-Host ""
