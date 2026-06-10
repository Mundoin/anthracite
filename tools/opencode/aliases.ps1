$_AnthraciteRoot = "D:\Repos\anthracite"

function oc-anthracite      { & "$_AnthraciteRoot\tools\opencode\attach-anthracite-lean.ps1" @args }
function omo-anthracite     { & "$_AnthraciteRoot\tools\opencode\attach-anthracite-omo.ps1"  @args }
function start-anthracite   { & "$_AnthraciteRoot\tools\opencode\start-anthracite-services.ps1" @args }
function start-anthracite-omo { & "$_AnthraciteRoot\tools\opencode\start-anthracite-services.ps1" -Omo @args }
function status-anthracite  { & "$_AnthraciteRoot\tools\opencode\status-anthracite-opencode.ps1" @args }
function stop-anthracite    { & "$_AnthraciteRoot\tools\opencode\stop-anthracite-opencode.ps1"   @args }

Write-Host "Anthracite OpenCode aliases loaded: oc-anthracite, omo-anthracite, start-anthracite, start-anthracite-omo, status-anthracite, stop-anthracite"
