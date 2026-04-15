@echo off
cd /d "%~dp0.."
node --no-warnings scripts/update.js
pause