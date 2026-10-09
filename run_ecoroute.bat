@echo off
setlocal
cd /d "%~dp0"
where python >nul 2>nul || (echo Python not found. Install Python 3.11 or newer and retry.& pause & exit /b 1)
where node >nul 2>nul || (echo Node.js not found. Install Node.js 20 LTS and retry.& pause & exit /b 1)
if not exist .venv\Scripts\python.exe python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install -r requirements.txt || (echo Backend dependencies could not be installed.& pause & exit /b 1)
cd frontend
if not exist node_modules call npm install || (echo Frontend dependencies could not be installed.& pause & exit /b 1)
cd ..
python scripts\initialize_database.py
start "EcoRoute API" /D "%~dp0" cmd /k ".venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"
start "EcoRoute Web" /D "%~dp0frontend" cmd /k "npm run dev"
echo Frontend: http://localhost:5173
echo API:      http://127.0.0.1:8000
echo API docs: http://127.0.0.1:8000/docs
start "" http://localhost:5173
echo Close the two EcoRoute terminal windows to stop the services.
endlocal
