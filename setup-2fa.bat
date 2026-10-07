@echo off
title Bot 2FA Setup
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js neni nainstalovany! Stahni ho z https://nodejs.org/
  pause
  exit /b 1
)
node setup-2fa.js
echo.
pause
