param(
    [switch]$Lean,
    [switch]$Omo
)

$ServiceDir = "D:\Repos\anthracite\.services\opencode"

function Stop-AnthraciteServer {
    param([string]$Name, [int]$Port, [string]$PidFile)

    $stopped = $false

    if (Test-Path $PidFile) {
        $savedPid = (Get-Content $PidFile -Raw).Trim()
        if ($savedPid -match '^\d+$') {
            $proc = Get-Process -Id ([int]$savedPid) -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "Stopping $Name server (PID $savedPid)..."
                Stop-Process -Id ([int]$savedPid) -Force -ErrorAction SilentlyContinue
                $stopped = $true
                Write-Host "$Name server (PID $savedPid) stopped."
            } else {
                Write-Host "$Name PID $savedPid not found (already exited)."
            }
        }
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }

    $portCheck = netstat -ano | Select-String (":$Port ") | Where-Object { $_ -match 'LISTENING' } | Select-Object -First 1
    if ($null -ne $portCheck) {
        $parts = $portCheck.ToString().Trim() -split '\s+'
        $pid2 = $parts[-1]
        if ($pid2 -match '^\d+$' -and [int]$pid2 -ne 0) {
            $proc2 = Get-Process -Id ([int]$pid2) -ErrorAction SilentlyContinue
            if ($null -ne $proc2) {
                $procName = $proc2.Name
                if ($procName -match 'opencode|bun|node') {
                    Write-Host "Port $Port still in use by $procName (PID $pid2) - stopping..."
                    Stop-Process -Id ([int]$pid2) -Force -ErrorAction SilentlyContinue
                    $stopped = $true
                    Write-Host "Stopped $procName (PID $pid2) on port $Port."
                } else {
                    Write-Host "WARNING: port $Port in use by $procName (PID $pid2) - not a known opencode process, skipping."
                }
            }
        }
    }

    if (-not $stopped) {
        Write-Host "$Name server was not running."
    }
}

$stopLean = $Lean -or (-not $Lean -and -not $Omo)
$stopOmo  = $Omo  -or (-not $Lean -and -not $Omo)

if ($stopLean) {
    Stop-AnthraciteServer -Name "Lean" -Port 4116 -PidFile "$ServiceDir\lean.pid"
}
if ($stopOmo) {
    Stop-AnthraciteServer -Name "OMO" -Port 4117 -PidFile "$ServiceDir\omo.pid"
}
