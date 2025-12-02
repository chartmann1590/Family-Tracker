@echo off
REM Script to debug background location service crashes
REM Run this before enabling background tracking in the app

echo ========================================
echo Family Tracker - Background Service Debug
echo ========================================
echo.
echo This script will:
echo 1. Clear the Android log buffer
echo 2. Start monitoring for background service events
echo 3. Save output to debug_log.txt
echo.
echo INSTRUCTIONS:
echo 1. Make sure your Android device is connected via USB
echo 2. Enable USB debugging on your device
echo 3. Press any key to start logging
echo 4. Then go to the app and enable background tracking
echo 5. Press Ctrl+C when the app crashes to stop logging
echo.
pause

REM Check if adb is available
where adb >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: adb not found in PATH
    echo Please install Android SDK Platform Tools
    echo Download from: https://developer.android.com/tools/releases/platform-tools
    pause
    exit /b 1
)

REM Check if device is connected
adb devices | findstr /R "device$" >nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: No Android device detected
    echo Please connect your device and enable USB debugging
    pause
    exit /b 1
)

echo.
echo Device connected! Starting log capture...
echo Output will be saved to: %~dp0debug_log.txt
echo.
echo Clearing log buffer...
adb logcat -c

echo.
echo ========================================
echo MONITORING STARTED
echo ========================================
echo.
echo Now enable background tracking in the app!
echo Press Ctrl+C to stop monitoring
echo.

REM Start logging
adb logcat -v time *:V | findstr /I /C:"BackgroundLocationService" /C:"flutter" /C:"AndroidRuntime" /C:"FATAL" | tee "%~dp0debug_log.txt"

echo.
echo.
echo ========================================
echo Log saved to: %~dp0debug_log.txt
echo ========================================
echo.
pause
