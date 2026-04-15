@echo off
cd /d "%~dp0.."
node --no-warnings scripts/import.js
pause