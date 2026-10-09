@echo off
where python >nul 2>nul && python --version || echo Python missing
where node >nul 2>nul && node --version || echo Node.js missing
where npm >nul 2>nul && npm --version || echo npm missing
pause
