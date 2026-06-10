$ServiceDir   = "D:\Repos\anthracite\.services\opencode"
$PidFile      = "$ServiceDir\omo.pid"
$LogFile      = "$ServiceDir\omo.log"
$Port         = 4117
$OmoCfgFile   = "C:\Users\Bujar\.config\opencode-profiles\omo\opencode.jsonc"
$OmoCfgDir    = "C:\Users\Bujar\.config\opencode-profiles\omo"

$portInUse = netstat -ano | Select-String (":$Port ") | Where-Object { $_ -match 'LISTENING' } | Select-Object -First 1
if ($null -ne $portInUse) {
    Write-Host "OMO server already running on port $Port"
    if (Test-Path $PidFile) { Write-Host "PID: $((Get-Content $PidFile -Raw).Trim())" }
    Write-Host "Attach: opencode attach http://127.0.0.1:$Port --pure --dir D:\Repos\anthracite"
    exit 0
}

New-Item -ItemType Directory -Force $ServiceDir | Out-Null

$cmd = "`$env:OPENCODE_CONFIG='$OmoCfgFile'; `$env:OPENCODE_CONFIG_DIR='$OmoCfgDir'; Set-Location 'D:\Repos\anthracite'; opencode serve --hostname 127.0.0.1 --port $Port *>> '$LogFile'"
$proc = Start-Process -FilePath "pwsh" `
    -ArgumentList "-NoProfile", "-NonInteractive", "-Command", $cmd `
    -WindowStyle Hidden `
    -WorkingDirectory "D:\Repos\anthracite" `
    -PassThru

$proc.Id | Set-Content $PidFile -Encoding utf8

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    $check = netstat -ano | Select-String (":$Port ") | Where-Object { $_ -match 'LISTENING' } | Select-Object -First 1
    if ($null -ne $check) { $ready = $true; break }
    if ($proc.HasExited) {
        Write-Host "ERROR: OMO server process exited before port $Port was bound"
        Write-Host "Log: $LogFile"
        if (Test-Path $LogFile) { Get-Content $LogFile -Tail 10 }
        exit 1
    }
}

if (-not $ready) {
    Write-Host "WARNING: port $Port not listening after 15s. Server may still be starting."
    Write-Host "Log: $LogFile"
    exit 1
}

try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 5 -ErrorAction Stop
    $health = $r.Content | ConvertFrom-Json
    if ($health.healthy -eq $true) {
        Write-Host "OMO server started (PID $($proc.Id)) on http://127.0.0.1:$Port"
        Write-Host "Health: OK"
    } else {
        Write-Host "WARNING: /api/health returned unexpected value: $($r.Content)"
    }
} catch {
    Write-Host "WARNING: /api/health probe failed: $($_.Exception.Message)"
    Write-Host "Port IS listening - server may still be initializing."
}

$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"[$ts] Started OMO server PID=$($proc.Id) port=$Port" | Add-Content "$ServiceDir\omo-start.log"

Write-Host "Config: $OmoCfgFile"
Write-Host "Log   : $LogFile"
Write-Host "Attach: opencode attach http://127.0.0.1:$Port --pure --dir D:\Repos\anthracite"
