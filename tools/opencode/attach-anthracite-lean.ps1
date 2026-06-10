$Port       = 4116
$ServiceDir = "D:\Repos\anthracite\.services\opencode"
$LogFile    = "$ServiceDir\lean.log"

$portLine = netstat -ano | Select-String (":$Port ") | Where-Object { $_ -match 'LISTENING' } | Select-Object -First 1

if ($null -eq $portLine) {
    Write-Host "Lean server not listening on port $Port"
    Write-Host "Starting lean server first..."
    Write-Host ""
    & "D:\Repos\anthracite\tools\opencode\start-anthracite-lean-hidden.ps1"
    $portLine = netstat -ano | Select-String (":$Port ") | Where-Object { $_ -match 'LISTENING' } | Select-Object -First 1
    if ($null -eq $portLine) {
        Write-Host "ERROR: lean server still not listening after start attempt."
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

Write-Host "Attaching to lean server at http://127.0.0.1:$Port ..."
opencode attach http://127.0.0.1:$Port --pure --dir "D:\Repos\anthracite"
