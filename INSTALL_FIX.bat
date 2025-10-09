@echo off
echo ========================================
echo  INSTALLING BLE FIX
echo ========================================
echo.

echo Step 1: Installing patch-package...
call npm install

echo.
echo Step 2: Manually patching BLE library...
echo.

set "FILE=node_modules\react-native-ble-plx\android\src\main\java\com\bleplx\utils\SafePromise.java"

if not exist "%FILE%" (
    echo ERROR: SafePromise.java not found!
    echo Run: npm install
    pause
    exit /b 1
)

echo Backing up original file...
copy "%FILE%" "%FILE%.backup"

echo Applying fix...
powershell -Command "(Get-Content '%FILE%') -replace 'public void reject\(String code, String message\) \{[\s\S]*?promise\.reject\(code, message\);', 'public void reject(String code, String message) {^
        if (code == null) {^
            promise.reject(\"BLE_ERROR\", message != null ? message : \"Unknown BLE error\");^
        } else {^
            promise.reject(code, message);^
        }' | Set-Content '%FILE%'"

echo.
echo ✓ BLE library patched successfully!
echo.
echo Step 3: Clean and rebuild...
cd android
call gradlew clean
call gradlew assembleRelease
cd ..

echo.
echo ✓ Build complete!
echo.
echo Installing APK...
adb install -r android\app\build\outputs\apk\release\app-release.apk

echo.
echo ✓ DONE! Test the app now.
pause
