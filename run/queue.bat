@echo off
cd /d "%~dp0.."
node --no-warnings scripts/queue.js
pause