@echo off
echo ========================================
echo  SETUP ON NEW MACHINE
echo ========================================
echo.

echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Verifying BLE fix is applied...
findstr /C:"if (code == null)" node_modules\react-native-ble-plx\android\src\main\java\com\bleplx\utils\SafePromise.java >nul
if %errorlevel%==0 (
    echo ✓ BLE fix already applied
) else (
    echo ✗ BLE fix NOT found - applying now...
    echo.
    echo MANUAL ACTION REQUIRED:
    echo 1. Open: node_modules\react-native-ble-plx\android\src\main\java\com\bleplx\utils\SafePromise.java
    echo 2. Find line 24: public void reject(String code, String message) {
    echo 3. Replace the method with:
    echo.
    echo    public void reject(String code, String message) {
    echo        if (code == null) {
    echo            promise.reject("BLE_ERROR", message != null ? message : "Unknown BLE error");
    echo        } else {
    echo            promise.reject(code, message);
    echo        }
    echo    }
    echo.
    echo 4. Save and press any key to continue...
    pause
)

echo.
echo Step 3: Building release APK...
call QUICK_BUILD.bat
