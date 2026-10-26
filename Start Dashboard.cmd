@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js LTS 22.14 or newer, then open this launcher again.
  pause
  exit /b 1
)
echo CPSync dashboard: http://127.0.0.1:4317
echo Keep this window open. Press Ctrl+C to stop the local dashboard.
echo.
node app/server.mjs
pause
