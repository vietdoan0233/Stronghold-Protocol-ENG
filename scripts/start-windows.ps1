<#
  Stronghold Protocol: Alliance · Windows startup script (PowerShell). Docs: docs\DEPLOY.md
  Run: right-click and choose "Run with PowerShell", or
       powershell -ExecutionPolicy Bypass -File scripts\start-windows.ps1 [-Port 3001] [other launch.mjs options]
  Checks Node.js (install with winget if missing) → runs npm ci on first use → tools\setup.mjs → starts the server and opens a browser.
#>
# PositionalBinding off: a bare launch.mjs option (.\start-windows.ps1 --no-local) must land in $Rest, not in [int]$Port.
[CmdletBinding(PositionalBinding = $false)]
param(
  [int]$Port = 0,
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$Rest = @()
)
$ErrorActionPreference = 'Continue'   # native tools report through $LASTEXITCODE
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$Host.UI.RawUI.WindowTitle = 'Stronghold Protocol: Alliance'

function Pause-Exit([int]$code) {
  Write-Host ''
  Read-Host 'Press Enter to close this window' | Out-Null
  exit $code
}

function Test-Node {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if (-not $cmd) { return $null }
  $v = (& node -v) -replace '^v', ''
  return [pscustomobject]@{ Path = $cmd.Source; Version = $v; Major = [int]($v.Split('.')[0]) }
}

$node = Test-Node
if (-not $node) {
  Write-Host 'Node.js not found (version 22 or later required; 22 / 24 LTS).' -ForegroundColor Yellow
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if ($winget) {
    Write-Host 'Install it with the Windows package manager:  winget install OpenJS.NodeJS.LTS'
    $ans = Read-Host 'Install it now? [Y/n]'
    if ($ans -eq '' -or $ans -match '^(y|yes)$') {
      & winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
      $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
      $node = Test-Node
    }
  } else {
    Write-Host 'Download an installer from https://nodejs.org/en/download'
  }
  if (-not $node) {
    Write-Host 'After installation, reopen this script in a new window so the updated PATH is available.'
    Pause-Exit 1
  }
}
if ($node.Major -lt 22) {
  Write-Host "Node.js $($node.Version) is too old. Version 22 or later is required: winget upgrade OpenJS.NodeJS.LTS  or  https://nodejs.org/en/download" -ForegroundColor Red
  Pause-Exit 1
}

if (-not (Test-Path (Join-Path $Root 'node_modules\ws\package.json'))) {
  Write-Host '[First run] Installing dependencies with npm ci ...' -ForegroundColor Cyan
  & npm.cmd ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) {
    & npm.cmd install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { Write-Host 'npm could not install dependencies (check your network connection).' -ForegroundColor Red; Pause-Exit 1 }
  }
}

$launchArgs = @('scripts\launch.mjs')
if ($Port -gt 0) { $launchArgs += @('--port', "$Port") }
if ($Rest) { $launchArgs += $Rest }
& node @launchArgs
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nStart failed. See the messages above. Run node tools\doctor.mjs for diagnostics." -ForegroundColor Red
  Pause-Exit $LASTEXITCODE
}
