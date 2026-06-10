$ServiceDir = "D:\Repos\anthracite\.services\opencode"

function Get-ServerStatus {
    param(
        [string]$Label,
        [int]$Port,
        [string]$PidFile,
        [string]$LogFile
    )

    Write-Host ""
    Write-Host "--- $Label (port $Port) ---"

    $portLine = netstat -ano | Select-String (":$Port ") | Where-Object { $_ -match 'LISTENING' } | Select-Object -First 1
    if ($null -ne $portLine) {
        Write-Host "  port $Port  : LISTENING"
    } else {
        Write-Host "  port $Port  : not listening"
    }

    if (Test-Path $PidFile) {
        $raw = (Get-Content $PidFile -Raw).Trim()
        if ($raw -match '^\d+$') {
            $pid2 = [int]$raw
            $proc = Get-Process -Id $pid2 -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  pid         : $pid2 (running)"
            } else {
                Write-Host "  pid         : $pid2 (stale - process gone)"
            }
        } else {
            Write-Host "  pid         : bad value in pid file"
        }
    } else {
        Write-Host "  pid         : no pid file"
    }

    if (Test-Path $LogFile) {
        Write-Host "  log         : $LogFile"
        $tail = Get-Content $LogFile -Tail 3 -ErrorAction SilentlyContinue
        if ($tail) {
            Write-Host "  last lines  :"
            foreach ($line in $tail) {
                Write-Host "    $line"
            }
        }
    } else {
        Write-Host "  log         : (no log file yet)"
    }

    if ($null -ne $portLine) {
        Write-Host "  attach cmd  : opencode attach http://127.0.0.1:$Port --pure --dir D:\Repos\anthracite"
    }
}

Get-ServerStatus `
    -Label "Lean" `
    -Port 4116 `
    -PidFile "$ServiceDir\lean.pid" `
    -LogFile "$ServiceDir\lean.log"

Get-ServerStatus `
    -Label "OMO" `
    -Port 4117 `
    -PidFile "$ServiceDir\omo.pid" `
    -LogFile "$ServiceDir\omo.log"

Write-Host ""
Write-Host "Start  : .\tools\opencode\start-anthracite-services.ps1"
Write-Host "Start+ : .\tools\opencode\start-anthracite-services.ps1 -Omo"
Write-Host "Stop   : .\tools\opencode\stop-anthracite-opencode.ps1"
Write-Host ""
