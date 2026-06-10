param(
    [switch]$Omo
)

$Root = "D:\Repos\anthracite"

Write-Host ""
Write-Host "=== Anthracite OpenCode Services ==="
Write-Host ""

& "$Root\tools\opencode\start-anthracite-lean-hidden.ps1"

if ($Omo) {
    Write-Host ""
    & "$Root\tools\opencode\start-anthracite-omo-hidden.ps1"
} else {
    Write-Host ""
    Write-Host "OMO not started. Run with -Omo to also start OMO server on port 4117."
}

Write-Host ""
Write-Host "Status: .\tools\opencode\status-anthracite-opencode.ps1"
Write-Host "Stop:   .\tools\opencode\stop-anthracite-opencode.ps1"
