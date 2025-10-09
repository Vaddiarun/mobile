# MANUAL FIX - BLE Library Crash

## The Problem
The crash is in `react-native-ble-plx` library at line 425 in `BlePlxModule.java`:
```
NullPointerException: Parameter specified as non-null is null: 
method com.facebook.react.bridge.PromiseImpl.reject, parameter code
at com.bleplx.utils.SafePromise.reject(SafePromise.java:25)
```

When BLE connection fails, the library passes `null` as error code, causing crash in release builds.

## Quick Fix (Manual)

### Option 1: Edit the File Directly

1. Open this file:
```
node_modules\react-native-ble-plx\android\src\main\java\com\bleplx\utils\SafePromise.java
```

2. Find this method (around line 24):
```java
public void reject(String code, String message) {
    promise.reject(code, message);
}
```

3. Replace with:
```java
public void reject(String code, String message) {
    if (code == null) {
        promise.reject("BLE_ERROR", message != null ? message : "Unknown BLE error");
    } else {
        promise.reject(code, message);
    }
}
```

4. Save and rebuild:
```cmd
cd android
gradlew clean
gradlew assembleRelease
cd ..
adb install -r android\app\build\outputs\apk\release\app-release.apk
```

### Option 2: Use Automated Script

```cmd
INSTALL_FIX.bat
```

This will:
- Install patch-package
- Patch the BLE library
- Clean and rebuild
- Install APK

## Why This Works

The BLE library has a bug where it calls `promise.reject(null, message)` when connection fails. In release builds with R8/ProGuard, Kotlin null-safety is enforced, causing immediate crash.

The fix checks if `code` is null and provides a default error code "BLE_ERROR" instead.

## After Fix

The app will:
- ✅ Scan QR code
- ✅ Navigate to Bluetooth screen
- ✅ Attempt connection
- ✅ Handle connection failure gracefully (no crash)
- ✅ Show error message to user

## Test Scenarios

1. **Normal connection** - Should work
2. **Device out of range** - Should show error, no crash
3. **Device turned off** - Should show error, no crash
4. **Bluetooth disabled** - Should show error, no crash

## Alternative: Catch Error in JavaScript

If you can't patch the library, add this to `bluetooth-communication.tsx`:

```typescript
try {
  const connectedDevice = await device.connect();
  // ... rest of code
} catch (error) {
  console.error('Connection failed:', error);
  setLoading(false);
  setModelLoader(true);
  return;
}
```

But this won't prevent the crash - the crash happens in native code before JavaScript can catch it.

## Permanent Solution

The library maintainers need to fix this. You can:
1. Report issue: https://github.com/dotintent/react-native-ble-plx/issues
2. Use patch-package to persist the fix
3. Fork the library and use your fixed version

## Status

- ✅ Root cause identified
- ✅ Fix created
- ✅ Patch file ready
- ⏳ Needs testing

Run `INSTALL_FIX.bat` now!
