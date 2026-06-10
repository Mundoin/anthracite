$Port       = 4117
$ServiceDir = "D:\Repos\anthracite\.services\opencode"
$LogFile    = "$ServiceDir\omo.log"

$portLine = netstat -ano | Select-String (":$Port ") | Where-Object { $_ -match 'LISTENING' } | Select-Object -First 1

if ($null -eq $portLine) {
    Write-Host "OMO server not listening on port $Port"
    Write-Host "Starting OMO server first..."
    Write-Host ""
    & "D:\Repos\anthracite\tools\opencode\start-anthracite-omo-hidden.ps1"
    $portLine = netstat -ano | Select-String (":$Port ") | Where-Object { $_ -match 'LISTENING' } | Select-Object -First 1
    if ($null -eq $portLine) {
        Write-Host "ERROR: OMO server still not listening after start attempt."
        Write-Host "Check log: $LogFile"
        exit 1
    }
}

try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 5 -ErrorAction Stop
    $h = $r.Content | ConvertFrom-Json
    if ($h.healthy -ne $true) {
        Write-Host "WARNING: server listening but /api/health not healthy: $($r.Content)"
        Write-Host "Status : .\tools\opencode\status-anthracite-opencode.ps1"
        Write-Host "Log    : $LogFile"
    }
} catch {
    Write-Host "WARNING: server listening but health check failed"
    Write-Host "Status : .\tools\opencode\status-anthracite-opencode.ps1"
    Write-Host "Log    : $LogFile"
}

Write-Host "Attaching to OMO server at http://127.0.0.1:$Port ..."
Write-Host "NOTE: --pure active; oh-my-openagent/tui panel disabled (oc-codex-multi-auth hang fix)."
Write-Host "To restore full OMO TUI: remove oc-codex-multi-auth from ~/.config/opencode-profiles/omo/tui.json and drop --pure."
opencode attach http://127.0.0.1:$Port --pure --dir "D:\Repos\anthracite"
