<#
  Stronghold Protocol: Alliance · Run the server in the background at startup (Windows Task Scheduler) and add a firewall rule. Docs: docs\DEPLOY.md
  Usage (will request Administrator privileges automatically):
    powershell -ExecutionPolicy Bypass -File scripts\install-service-windows.ps1              # install and start now
    powershell -ExecutionPolicy Bypass -File scripts\install-service-windows.ps1 -Port 8080 -Verify sample
    powershell -ExecutionPolicy Bypass -File scripts\install-service-windows.ps1 -Status     # show status
    powershell -ExecutionPolicy Bypass -File scripts\install-service-windows.ps1 -Restart    # restart after updating the code
    powershell -ExecutionPolicy Bypass -File scripts\install-service-windows.ps1 -Stop
    powershell -ExecutionPolicy Bypass -File scripts\install-service-windows.ps1 -Uninstall  # remove the task and firewall rule
  This writes scripts\service.env.cmd (node.exe path, PORT, HOST, SP_COMBAT, SP_VERIFY), registers the
  "StrongholdProtocol" scheduled task (runs scripts\run-server.cmd as SYSTEM at startup without login; restarts
  five seconds after exit; logs to logs\server.log), and adds the inbound "Stronghold Protocol" firewall rule
  (TCP port on Private / Domain networks; -AllowPublicNetwork also allows Public networks).
#>
param(
  [int]$Port = 3000,
  [string]$BindHost = '0.0.0.0',
  [ValidateSet('client', 'server')][string]$Combat = 'client',
  [ValidateSet('off', 'sample', 'all')][string]$Verify = 'off',
  [string]$TaskName = 'StrongholdProtocol',
  [switch]$AllowPublicNetwork,
  [switch]$NoFirewall,
  [switch]$Status,
  [switch]$Stop,
  [switch]$Restart,
  [switch]$Uninstall
)
# 'Continue': native tools (netsh, node) report through exit codes; Windows PowerShell 5.1 would turn their
# redirected stderr into terminating errors under 'Stop'. Cmdlets that must succeed use -ErrorAction Stop.
$ErrorActionPreference = 'Continue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
$Root = Split-Path -Parent $PSScriptRoot
$RuleName = 'Stronghold Protocol'
$EnvFile = Join-Path $PSScriptRoot 'service.env.cmd'
$Runner = Join-Path $PSScriptRoot 'run-server.cmd'
$Log = Join-Path $Root 'logs\server.log'

function Test-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  return (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Stop-ServerProcesses {
  # the task runs cmd.exe (run-server.cmd, a restart loop) → node.exe: stop the loop first, then its children
  $runners = @(Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*run-server.cmd*' })
  foreach ($r in $runners) {
    $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$($r.ProcessId)" -ErrorAction SilentlyContinue)
    Stop-Process -Id $r.ProcessId -Force -ErrorAction SilentlyContinue
    foreach ($ch in $children) { Stop-Process -Id $ch.ProcessId -Force -ErrorAction SilentlyContinue }
  }
}

function Show-Status {
  $t = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if (-not $t) { Write-Host "Scheduled task '$TaskName' is not installed." -ForegroundColor Yellow }
  else {
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
    Write-Host "Scheduled task '$TaskName': $($t.State); last run $($info.LastRunTime); result $($info.LastTaskResult)"
  }
  $p = $Port
  if (Test-Path $EnvFile) {
    $m = Select-String -Path $EnvFile -Pattern 'set "PORT=(\d+)"' | Select-Object -First 1
    if ($m) { $p = [int]$m.Matches[0].Groups[1].Value }
  }
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:$p/healthz" -TimeoutSec 3
    Write-Host "Server is running: port $p, rooms $($h.rooms), matches $($h.matches), connections $($h.sockets)" -ForegroundColor Green
  } catch { Write-Host "No response on port $p (wait a few seconds after startup; log: $Log)" -ForegroundColor Yellow }
  & netsh advfirewall firewall show rule name="$RuleName" | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host "Firewall rule '$RuleName' is present." } else { Write-Host "Firewall rule '$RuleName' is not present." -ForegroundColor Yellow }
  if (Test-Path $Log) { Write-Host "`nLast 10 lines of the log ($Log):"; Get-Content $Log -Tail 10 }
}

# Status needs no elevation
if ($Status) { Show-Status; exit 0 }

if (-not (Test-Admin)) {
  Write-Host 'Administrator privileges are required. Requesting elevation …' -ForegroundColor Yellow
  $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"")
  foreach ($kv in $PSBoundParameters.GetEnumerator()) {
    if ($kv.Value -is [System.Management.Automation.SwitchParameter]) { if ($kv.Value.IsPresent) { $argList += "-$($kv.Key)" } }
    else { $argList += @("-$($kv.Key)", "`"$($kv.Value)`"") }
  }
  try {
    $p = Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -Verb RunAs -Wait -PassThru -ErrorAction Stop
    exit $p.ExitCode
  } catch {
    Write-Host "Administrator privileges were not granted; cancelled: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
}

try {
  if ($Uninstall) {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
      Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
      Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
    }
    Stop-ServerProcesses
    & netsh advfirewall firewall delete rule name="$RuleName" | Out-Null
    if (Test-Path $EnvFile) { Remove-Item $EnvFile -Force }
    Write-Host 'Removed the scheduled task, firewall rule, and scripts\service.env.cmd.' -ForegroundColor Green
    exit 0
  }
  if ($Stop -or $Restart) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Stop-ServerProcesses
    Write-Host 'Server stopped.'
    if ($Stop) { exit 0 }
    Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
    Start-Sleep -Seconds 3
    Show-Status
    exit 0
  }

  # --- install ------------------------------------------------------------------------------------
  $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
  if (-not $nodeCmd) { throw 'Node.js not found. Install it with winget install OpenJS.NodeJS.LTS, then reopen PowerShell.' }
  $nodeExe = $nodeCmd.Source
  $major = [int](((& $nodeExe -v) -replace '^v', '').Split('.')[0])
  if ($major -lt 22) { throw "Node.js version is too old (22+ required): $(& $nodeExe -v)" }
  if ($nodeExe -like "$env:USERPROFILE*") {
    Write-Host "Note: node.exe is in a user directory ($nodeExe, possibly nvm / a portable install). The SYSTEM account can usually run it; if the service fails, install Node.js with winget or the official installer." -ForegroundColor Yellow
  }

  Set-Location $Root
  Write-Host 'Preparing the environment (node tools\setup.mjs) …' -ForegroundColor Cyan
  & $nodeExe tools\setup.mjs --quiet
  if ($LASTEXITCODE -ne 0) { throw 'Setup failed. Fix the issues above; run node tools\doctor.mjs for diagnostics.' }

  @(
    '@rem Written by scripts\install-service-windows.ps1 - re-run it to change these values.',
    "set `"NODE_EXE=$nodeExe`"",
    "set `"PORT=$Port`"",
    "set `"HOST=$BindHost`"",
    "set `"SP_COMBAT=$Combat`"",
    "set `"SP_VERIFY=$Verify`""
  ) | Set-Content -Path $EnvFile -Encoding Oem -ErrorAction Stop

  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Stop-ServerProcesses
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  }
  $action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/d /c `"`"$Runner`"`"" -WorkingDirectory $Root
  $trigger = New-ScheduledTaskTrigger -AtStartup
  $trigger.Delay = 'PT20S'   # give the network a moment after boot
  $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 10 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
    -Description "Stronghold Protocol web server ($Root)" -ErrorAction Stop | Out-Null
  Write-Host "Registered scheduled task '$TaskName' (starts at boot without login)." -ForegroundColor Green

  if (-not $NoFirewall) {
    & netsh advfirewall firewall delete rule name="$RuleName" | Out-Null
    $profiles = if ($AllowPublicNetwork) { 'private,domain,public' } else { 'private,domain' }
    & netsh advfirewall firewall add rule name="$RuleName" dir=in action=allow protocol=TCP localport=$Port profile=$profiles | Out-Null
    Write-Host "Added inbound firewall rule '$RuleName': TCP $Port ($profiles)." -ForegroundColor Green
  }

  Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
  Start-Sleep -Seconds 4
  Show-Status
  Write-Host "`nAddresses friends can use (LAN):"
  & $nodeExe tools\doctor.mjs --port $Port | Select-String -Pattern 'http://\d' | ForEach-Object { Write-Host "  $($_.Line.Trim())" }
  Write-Host "`nStop: -Stop   Restart: -Restart   Status: -Status   Uninstall: -Uninstall   Log: $Log"
} catch {
  Write-Host "`nError: $($_.Exception.Message)" -ForegroundColor Red
  Read-Host 'Press Enter to close' | Out-Null
  exit 1
}
if ($Host.Name -eq 'ConsoleHost' -and -not $env:SP_NO_PAUSE) { Read-Host "`nDone. Press Enter to close" | Out-Null }
