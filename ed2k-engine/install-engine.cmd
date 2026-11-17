@echo off
REM Install the ED2K-capable aria2-next engine into a staged Windows Motrix app.
REM Usage: install-engine.cmd <Motrix resources dir> [x64|arm64]
REM Example: install-engine.cmd "C:\Motrix\resources" x64
setlocal
set "APP=%~1"
set "ARCH=%~2"
if "%ARCH%"=="" set "ARCH=x64"
if "%APP%"=="" (
  echo Usage: install-engine.cmd ^<Motrix resources dir^> [x64^|arm64]
  exit /b 2
)

set "ENGINE_DIR=%APP%\extra\win32\%ARCH%"
if not exist "%ENGINE_DIR%" (
  echo Missing engine dir: %ENGINE_DIR%
  exit /b 2
)

echo Replacing aria2c.exe with aria2-next in %ENGINE_DIR%
copy /Y "%~dp0windows\aria2-next-3.1.0-windows-x86_64.exe" "%ENGINE_DIR%\aria2c.exe" >nul
if errorlevel 1 (
  echo Failed to copy engine
  exit /b 1
)

if not exist "%APP%\extra\ed2k" mkdir "%APP%\extra\ed2k"
copy /Y "%~dp0server.met" "%APP%\extra\ed2k\server.met" >nul
copy /Y "%~dp0nodes.dat" "%APP%\extra\ed2k\nodes.dat" >nul

echo Installed aria2-next ED2K engine into %ENGINE_DIR%
echo NOTE: bootstrap flags are injected by the app (Aria2ConfigBuilder); no wrapper needed.
endlocal
