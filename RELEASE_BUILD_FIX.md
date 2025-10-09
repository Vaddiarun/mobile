# Release APK Crash Fix - Complete Solution

## Problem Summary
Your release APK was crashing immediately after QR code scanning due to:
1. **ProGuard/R8 obfuscation** removing critical classes
2. **Large JSON data** passed through navigation params causing serialization issues
3. **Missing ProGuard rules** for VisionCamera, BLE, Buffer, and other native modules

## Changes Made

### 1. ProGuard Rules (`android/app/proguard-rules.pro`)
✅ **Added comprehensive rules for:**
- Expo Router & React Native navigation
- VisionCamera & ML Kit barcode scanning
- BLE (react-native-ble-plx) with Android Bluetooth APIs
- Buffer & Node.js polyfills
- MMKV storage
- Geolocation & Geocoding
- Axios & OkHttp networking
- Reanimated (if used with frame processors)

### 2. Build Configuration (`android/app/build.gradle`)
✅ **Updated release build type:**
- Changed to use `proguard-android-optimize.txt` for better optimization
- Enabled minification properly with ProGuard rules
- Set `debuggable false` for production builds

### 3. Gradle Properties (`android/gradle.properties`)
✅ **Enabled production optimizations:**
- `android.enableMinifyInReleaseBuilds=true`
- `android.enableShrinkResourcesInReleaseBuilds=true`
- `android.enableDebuggingInReleaseBuilds=false`

### 4. Data Handling Fix (`app/bluetooth-communication.tsx`)
✅ **Critical fix for navigation params:**
- **Before:** Passing large JSON data through `router.replace()` params
- **After:** Storing data in MMKV storage and passing only a key
- This prevents serialization crashes in release builds

### 5. Storage Module (`mmkv-storage/storage.ts`)
✅ **Added generic data storage functions:**
- `saveData(key, data)` - Store temporary data
- `getData(key)` - Retrieve temporary data
- `clearData(key)` - Clean up after use

### 6. Trip Configuration (`app/trip-configuration.tsx`)
✅ **Updated to retrieve data from storage:**
- Reads data from MMKV using `tripDataKey`
- Auto-cleans up temporary data after retrieval

## Build Instructions

### Clean Build (Recommended)
```bash
cd android
./gradlew clean
cd ..
```

### Build Release APK
```bash
# Option 1: Using Expo
npx expo run:android --variant release

# Option 2: Using Gradle directly
cd android
./gradlew assembleRelease
cd ..
```

### Build Release Bundle (for Play Store)
```bash
cd android
./gradlew bundleRelease
cd ..
```

### Find Your APK
```
android/app/build/outputs/apk/release/app-release.apk
```

### Find Your Bundle
```
android/app/build/outputs/bundle/release/app-release.aab
```

## Testing Checklist

### Before Release:
- [ ] Clean build completed successfully
- [ ] APK installs on physical device
- [ ] QR code scanning works
- [ ] Bluetooth connection establishes
- [ ] Trip start/stop works correctly
- [ ] Data is saved and retrieved properly
- [ ] No crashes in Logcat

### Test Commands:
```bash
# Monitor logs while testing
adb logcat | grep -E "(ReactNative|Bluetooth|VisionCamera|MMKV)"

# Check for crashes
adb logcat | grep -E "(FATAL|AndroidRuntime)"
```

## Additional Recommendations

### 1. Enable Crash Reporting
Add Firebase Crashlytics or Sentry to catch production crashes:

```bash
# For Firebase Crashlytics
npx expo install @react-native-firebase/app @react-native-firebase/crashlytics

# For Sentry
npx expo install @sentry/react-native
```

### 2. Test on Multiple Devices
- Test on Android 8, 9, 10, 11, 12, 13, 14
- Test on different manufacturers (Samsung, Xiaomi, OnePlus, etc.)
- Test with different Bluetooth devices

### 3. Optimize APK Size
If APK is too large, add to `android/app/build.gradle`:

```gradle
android {
    splits {
        abi {
            enable true
            reset()
            include 'armeabi-v7a', 'arm64-v8a'
            universalApk false
        }
    }
}
```

### 4. Enable R8 Full Mode (Optional - Advanced)
For maximum optimization, add to `gradle.properties`:

```properties
android.enableR8.fullMode=true
```

⚠️ **Warning:** Test thoroughly if enabling R8 full mode!

### 5. ProGuard Mapping File
Keep the ProGuard mapping file for crash deobfuscation:

```
android/app/build/outputs/mapping/release/mapping.txt
```

Upload this to your crash reporting service (Firebase/Sentry).

## Troubleshooting

### If Still Crashing:

1. **Check Logcat:**
```bash
adb logcat -c  # Clear logs
adb logcat | tee crash.log  # Save to file
```

2. **Temporarily Disable Obfuscation:**
In `proguard-rules.pro`, uncomment:
```
-dontobfuscate
-dontoptimize
```

3. **Check for Missing Classes:**
Look for `ClassNotFoundException` in logs and add keep rules.

4. **Verify Permissions:**
Ensure all permissions are in `AndroidManifest.xml`:
- CAMERA
- BLUETOOTH_SCAN
- BLUETOOTH_CONNECT
- ACCESS_FINE_LOCATION

### Common Issues:

**Issue:** "Class not found" errors
**Solution:** Add `-keep class <package>.** { *; }` to proguard-rules.pro

**Issue:** Bluetooth not connecting
**Solution:** Check location services are enabled on device

**Issue:** QR scanner black screen
**Solution:** Verify camera permissions and VisionCamera configuration

**Issue:** Navigation crashes
**Solution:** Ensure data is stored in MMKV, not passed in params

## Performance Optimization

### Enable Hermes Optimizations
Already enabled in your `gradle.properties`:
```properties
hermesEnabled=true
```

### Bundle Size Analysis
```bash
cd android
./gradlew assembleRelease --scan
```

### Memory Profiling
Use Android Studio Profiler to check for memory leaks during:
- QR scanning
- Bluetooth communication
- Trip data handling

## Security Recommendations

1. **Use Real Keystore for Production:**
   Update `android/app/build.gradle` release signing config

2. **Secure API Keys:**
   Move Google API key to environment variables

3. **Enable ProGuard Obfuscation:**
   Already configured in the updated files

4. **Add Certificate Pinning:**
   For API communication security

## Support

If issues persist:
1. Share the full Logcat output
2. Provide the ProGuard mapping file
3. Describe the exact crash scenario
4. Test with obfuscation disabled to isolate the issue

## Version Info
- React Native: 0.81.4
- Expo: 54.0.12
- VisionCamera: 4.7.2
- BLE PLX: 3.5.0
- MMKV: 3.3.3

---

**Status:** ✅ All critical fixes applied
**Next Step:** Clean build and test on physical device
