@echo off
rem Stronghold Protocol - double-click to start (Windows). Docs: docs\DEPLOY.md
rem Checks Node.js, installs dependencies on the first run, runs tools\setup.mjs (art download / resume),
rem starts the server, prints the LAN addresses and opens the browser. Extra arguments are passed to
rem scripts\launch.mjs, e.g.:  start-windows.bat --port 3001 --no-local
chcp 65001 >nul
setlocal EnableExtensions
title Stronghold Protocol: Alliance
cd /d "%~dp0.."

where node >nul 2>nul
if errorlevel 1 goto :nonode
node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)"
if errorlevel 1 goto :oldnode

if not exist "node_modules\ws\package.json" (
  echo [First run] Installing dependencies with npm ci ...
  call npm ci --no-audit --no-fund || call npm install --no-audit --no-fund
  if errorlevel 1 goto :fail
)

node scripts\launch.mjs %*
if errorlevel 1 goto :fail
exit /b 0

:nonode
echo.
echo Node.js not found (version 22 or later required; 22 / 24 LTS).
echo.
echo   Option 1: run this in PowerShell or Command Prompt
echo       winget install OpenJS.NodeJS.LTS
echo   Option 2: download an installer from https://nodejs.org/en/download
echo.
echo After installation, close this window and double-click start-windows.bat again.
echo.
pause
exit /b 1

:oldnode
echo.
for /f "delims=" %%v in ('node -v') do echo Node.js version %%v is too old; version 22 or later is required (22 / 24 LTS).
echo   Upgrade with: winget upgrade OpenJS.NodeJS.LTS   or   https://nodejs.org/en/download
echo.
pause
exit /b 1

:fail
echo.
echo Start failed. See the messages above. Run node tools\doctor.mjs for diagnostics.
echo.
pause
exit /b 1
