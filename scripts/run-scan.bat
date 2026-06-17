@echo off
REM Designer Leads Engine - daily scan launcher for Hermes scheduled task.
REM Uses the Hermes venv python so dependencies and env resolve consistently.
REM Edit --count / add --quality N / --days N to tune the daily baseline.

set "SCANNER=E:\UNREAL BRAIN\Projects\designer-leads-engine\scripts\scanner.py"
set "PY=%LOCALAPPDATA%\hermes\hermes-agent\venv\Scripts\python.exe"

if not exist "%PY%" set "PY=python"

"%PY%" "%SCANNER%" --count 20 --days 30 >> "E:\UNREAL BRAIN\Projects\designer-leads-engine\data\scan.log" 2>&1
