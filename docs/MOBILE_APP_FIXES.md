# Mobile App Crash Fixes - December 1, 2025

## Issues Fixed

### 1. Background Location Service Crash
**Location:** `mobile_app/lib/services/background_location_service.dart`

**Root Cause:** The background service was crashing silently during initialization, likely due to:
- Logger initialization failing in the background isolate
- Timer.periodic running too frequently (1 second) causing race conditions
- Missing error handling in the onStart callback

**Fixes Applied:**
1. **Added extensive print() debugging** (lines 108-122)
   - Prints to Android logcat before attempting logger initialization
   - Helps identify exactly where the crash occurs
   - All critical operations now have print statements

2. **Made LoggerService optional** (line 110)
   - Changed `logger` to `logger?` throughout the service
   - Service can run even if logger fails to initialize
   - Falls back to print() statements

3. **Increased Timer.periodic interval** (line 142)
   - Changed from 1 second to 5 seconds
   - Reduces CPU load and race conditions
   - Added `isProcessing` flag to prevent concurrent executions

4. **Added timeout to location requests** (line 164)
   - 30-second timeout prevents indefinite hangs
   - Better error handling if GPS is unavailable

5. **Detailed initialization logging** (lines 113-127)
   - Logs each service initialization step
   - Helps identify which service fails to initialize

### 2. Email Logs Functionality
**Location:** `mobile_app/lib/screens/settings_screen.dart`

**Root Cause:** Android doesn't have a default mailto handler

**Fix Applied:**
- Replaced mailto intent with `share_plus` library's `Share.shareXFiles()`
- Uses Android's universal share dialog
- User can choose email, messaging, or any app to share logs

### 3. Log Viewer
**Status:** Already working - no fixes needed

## How to Debug the Crash

Since the app is still crashing, use Android logcat to see the print statements:

### Method 1: Using Android Studio
1. Open Android Studio
2. Connect your device
3. Go to View → Tool Windows → Logcat
4. Filter by "BackgroundLocationService" or "flutter"
5. Enable background tracking in the app
6. Watch for print statements to see where it crashes

### Method 2: Using adb command line
```bash
# Clear log buffer
adb logcat -c

# Start logging and filter for our app
adb logcat | grep -i "BackgroundLocationService\|flutter\|AndroidRuntime"

# Enable background tracking in the app
# Watch the output for the last print statement before crash
```

### Expected Output (if working):
```
BackgroundLocationService: onStart method called
BackgroundLocationService: DartPluginRegistrant initialized
BackgroundLocationService: Logger created
BackgroundLocationService: onStart called successfully
BackgroundLocationService: Initializing AuthService...
BackgroundLocationService: AuthService initialized
BackgroundLocationService: Initializing ApiService...
BackgroundLocationService: ApiService initialized
BackgroundLocationService: Getting SharedPreferences...
BackgroundLocationService: SharedPreferences obtained
```

The **last line printed** before the crash will tell you exactly what's failing.

## Common Issues and Solutions

### If crash happens at "DartPluginRegistrant":
- The Flutter engine isn't properly initialized
- Try adding `android:name="io.flutter.app.FlutterApplication"` to AndroidManifest.xml `<application>` tag

### If crash happens at "Initializing AuthService":
- AuthService might be trying to access secure storage in background isolate
- May need to pass credentials differently

### If crash happens at "Getting SharedPreferences":
- SharedPreferences might not be accessible from background isolate
- May need to use different storage mechanism

### If crash happens at Timer.periodic:
- Location permissions might not be granted for background
- Check that "Allow all the time" is selected in app permissions

## Building the APK

Due to a Kotlin compiler cache issue on Windows (different drive letters), the APK build fails.

**Workarounds:**

### Option 1: Build on Linux/Mac
```bash
cd mobile_app
flutter clean
flutter pub get
flutter build apk --release
```

### Option 2: Use WSL2 on Windows
```bash
# In WSL2 terminal
cd /mnt/h/Family-Tracker/mobile_app
flutter clean
flutter pub get
flutter build apk --release
```

### Option 3: Move to C: drive temporarily
```bash
# Copy project to C: drive
xcopy H:\Family-Tracker C:\Family-Tracker /E /I /H

# Build
cd C:\Family-Tracker\mobile_app
flutter build apk --release

# Copy APK back
copy build\app\outputs\flutter-apk\app-release.apk H:\Family-Tracker\mobile_app\build\app\outputs\flutter-apk\
```

### Option 4: Debug on device directly
```bash
cd mobile_app
flutter run --release
# Test on physical device without building APK
```

## Files Modified

1. `mobile_app/lib/services/background_location_service.dart`
   - Added print() debugging throughout
   - Made logger optional (LoggerService?)
   - Changed Timer interval to 5 seconds
   - Added isProcessing flag
   - Added location request timeout
   - Enhanced error handling

2. `mobile_app/lib/screens/settings_screen.dart`
   - Added `import 'package:share_plus/share_plus.dart';`
   - Replaced _emailLogs() to use Share.shareXFiles()

## Next Steps

1. **Debug the crash:**
   - Run `flutter run --release` on device
   - Watch adb logcat output
   - Identify exact line where crash occurs
   - Share the logcat output

2. **Once debugged:**
   - Apply additional fixes based on crash location
   - Build APK on Linux/Mac or using workaround
   - Test background tracking functionality

3. **Deploy:**
   - Copy APK to `frontend/public/downloads/family-tracker.apk`
   - Rebuild Docker images
   - Deploy updated stack

## Contact

If you need help debugging the crash, provide:
1. Full adb logcat output from when you enable background tracking
2. The exact Android version and device model
3. Whether location permissions show "Allow all the time"

The fixes are sound, but we need to identify the specific initialization failure to fully resolve the crash.
