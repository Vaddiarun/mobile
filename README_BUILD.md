# Build Instructions

## On New Machine / Fresh Clone

Run this ONCE:
```cmd
SETUP_NEW_MACHINE.bat
```

This will:
1. Install all npm dependencies
2. Check if BLE fix is applied
3. Build release APK
4. Install on device

## Daily Development

Just run:
```cmd
QUICK_BUILD.bat
```

This builds and installs the release APK.

## What Gets Committed to Git

✅ **Committed:**
- Source code (app/, components/, etc.)
- Build scripts (*.bat files)
- Configuration (package.json, gradle files, proguard-rules.pro)
- Patches folder (patches/)

❌ **NOT Committed (in .gitignore):**
- node_modules/
- android/build/
- android/app/build/
- .expo/

## Important: BLE Fix

The BLE library has a bug that causes crashes in release builds. The fix is in:
```
node_modules\react-native-ble-plx\android\src\main\java\com\bleplx\utils\SafePromise.java
```

**This file is in node_modules, so it's NOT committed to git.**

When you clone on a new machine:
1. Run `npm install` (installs node_modules)
2. Manually apply the BLE fix to SafePromise.java
3. Build

OR just run `SETUP_NEW_MACHINE.bat` which does all this.

## The BLE Fix (Manual)

Edit: `node_modules\react-native-ble-plx\android\src\main\java\com\bleplx\utils\SafePromise.java`

Change line ~24 from:
```java
public void reject(String code, String message) {
    promise.reject(code, message);
}
```

To:
```java
public void reject(String code, String message) {
    if (code == null) {
        promise.reject("BLE_ERROR", message != null ? message : "Unknown BLE error");
    } else {
        promise.reject(code, message);
    }
}
```

## Build Commands

### Release APK (for testing)
```cmd
QUICK_BUILD.bat
```

### Debug APK (for development)
```cmd
npm run android
```

### Clean build (if issues)
```cmd
cd android
gradlew clean
gradlew assembleRelease
cd ..
```

## Troubleshooting

### "Build failed" - files locked
- Close Android Studio
- Run `QUICK_BUILD.bat` (kills Java processes)

### "BLE crash on release"
- Verify BLE fix is applied in SafePromise.java
- Look for `if (code == null)` in the file

### "npm install fails"
- Delete node_modules folder
- Delete package-lock.json
- Run `npm install` again

### "Gradle sync failed"
- Delete android/.gradle folder
- Delete android/build folder
- Run build again

## Files You Need

On a new machine, you need:
1. All source code from git
2. Run `npm install`
3. Apply BLE fix
4. Run `QUICK_BUILD.bat`

That's it!
