@echo off
echo ========================================
echo  BUILDING RELEASE APK
echo ========================================
echo.

echo Step 1: Cleaning previous builds...
cd android
call gradlew clean
cd ..
echo.

echo Step 2: Building release APK...
cd android
call gradlew assembleRelease
cd ..
echo.

echo Step 3: Checking if APK was created...
if exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo ✓ SUCCESS! APK created at:
    echo   android\app\build\outputs\apk\release\app-release.apk
    echo.
    echo Step 4: Installing on device...
    adb install -r android\app\build\outputs\apk\release\app-release.apk
    echo.
    echo Step 5: Starting log monitor...
    echo Press Ctrl+C after testing
    echo.
    adb logcat -c
    adb logcat | findstr /i "ReactNative fatal error crash"
) else (
    echo ✗ FAILED! APK not found. Check build errors above.
)

pause
