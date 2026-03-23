@echo off
setlocal
cd /d "%~dp0"

if not exist public\csp\bundle.json (
  call npm run prepare:web
  if errorlevel 1 exit /b 1
)

if not exist public\wasm\clips.js (
  echo Missing WebAssembly runtime in public\wasm.
  echo Run npm run build:wasm or npm run build:web before using start.bat.
  pause
  exit /b 1
)

start "SudokuServer3004" cmd /c "cd /d ""%~dp0"" && npm start"
timeout /t 2 >nul
start "SudokuSolverWeb" http://localhost:3004/
start "SudokuSolverNative" http://localhost:3004/native.html
