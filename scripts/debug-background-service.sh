#!/bin/bash
# Script to debug background location service crashes
# Run this before enabling background tracking in the app

cat << "EOF"
========================================
Family Tracker - Background Service Debug
========================================

This script will:
1. Clear the Android log buffer
2. Start monitoring for background service events
3. Save output to debug_log.txt

INSTRUCTIONS:
1. Make sure your Android device is connected via USB
2. Enable USB debugging on your device
3. Press Enter to start logging
4. Then go to the app and enable background tracking
5. Press Ctrl+C when the app crashes to stop logging

EOF

read -p "Press Enter to continue..."

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "ERROR: adb not found in PATH"
    echo "Please install Android SDK Platform Tools"
    echo "Download from: https://developer.android.com/tools/releases/platform-tools"
    exit 1
fi

# Check if device is connected
if ! adb devices | grep -q "device$"; then
    echo "ERROR: No Android device detected"
    echo "Please connect your device and enable USB debugging"
    exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_FILE="$SCRIPT_DIR/debug_log.txt"

echo
echo "Device connected! Starting log capture..."
echo "Output will be saved to: $LOG_FILE"
echo
echo "Clearing log buffer..."
adb logcat -c

echo
echo "========================================"
echo "MONITORING STARTED"
echo "========================================"
echo
echo "Now enable background tracking in the app!"
echo "Press Ctrl+C to stop monitoring"
echo

# Start logging
adb logcat -v time '*:V' | grep -iE "BackgroundLocationService|flutter|AndroidRuntime|FATAL" | tee "$LOG_FILE"

echo
echo
echo "========================================"
echo "Log saved to: $LOG_FILE"
echo "========================================"
echo
