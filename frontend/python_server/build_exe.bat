@echo off
TITLE Butler Server - EXE Builder
color 0A
cls
echo.
echo  ====================================================
echo    BUTLER DESKTOP SERVER  -  .EXE BUILDER
echo    Packages butler_server.py into ButlerServer.exe
echo  ====================================================
echo.

:: Check Python
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Python not found.
    echo          Install from: https://python.org/downloads
    echo          Make sure to check "Add Python to PATH"
    pause
    exit /b 1
)

echo  [1/5]  Python found  ✓
python --version

echo.
echo  [2/5]  Installing required packages...
pip install pyinstaller qrcode pillow --quiet
IF %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] pip install failed. Check internet connection.
    pause & exit /b 1
)
echo          Dependencies installed  ✓

echo.
echo  [3/5]  Cleaning previous build...
if exist "dist\ButlerServer.exe" del /f /q "dist\ButlerServer.exe"
if exist "build" rmdir /s /q "build" 2>nul

echo.
echo  [4/5]  Building EXE  (this takes 1-3 minutes)...
pyinstaller ^
    --onefile ^
    --windowed ^
    --name "ButlerServer" ^
    --icon=NONE ^
    butler_server.py

IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] Build failed — see errors above.
    echo          Try running:  pip install pyinstaller qrcode pillow
    pause
    exit /b 1
)

echo.
echo  [5/5]  Build complete!
echo.
echo  ====================================================
echo    OUTPUT:  dist\ButlerServer.exe
echo  ====================================================
echo.
echo  Double-click  dist\ButlerServer.exe  to launch.
echo  Share that single file — no Python needed to run it.
echo.
pause
