# Quick Build Commands Reference

## 🚀 Build Release APK

### Step 1: Clean Previous Builds
```bash
cd android
./gradlew clean
cd ..
```

### Step 2: Build Release APK
```bash
npx expo run:android --variant release
```

**OR using Gradle directly:**
```bash
cd android
./gradlew assembleRelease
cd ..
```

### Step 3: Find Your APK
```
📁 android/app/build/outputs/apk/release/app-release.apk
```

### Step 4: Install on Device
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## 🧪 Testing Commands

### Monitor Logs
```bash
# All logs
adb logcat

# Filtered logs
adb logcat | grep -E "(ReactNative|Bluetooth|VisionCamera)"

# Crash logs only
adb logcat | grep -E "(FATAL|AndroidRuntime)"

# Save to file
adb logcat > logs.txt
```

### Clear Logs Before Testing
```bash
adb logcat -c
```

### Check Connected Devices
```bash
adb devices
```

---

## 🏪 Build for Play Store (AAB)

```bash
cd android
./gradlew bundleRelease
cd ..
```

**Find Bundle:**
```
📁 android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🔧 Troubleshooting

### If Build Fails:

1. **Clean everything:**
```bash
cd android
./gradlew clean
rm -rf .gradle
rm -rf app/build
cd ..
rm -rf node_modules
npm install
```

2. **Rebuild:**
```bash
npx expo prebuild --clean
cd android
./gradlew assembleRelease
```

### If APK Crashes:

1. **Check logs immediately after crash:**
```bash
adb logcat -d > crash.log
```

2. **Test with debug build first:**
```bash
npx expo run:android
```

3. **Compare behavior between debug and release**

---

## 📊 Build Analysis

### Check APK Size
```bash
cd android
./gradlew assembleRelease --scan
```

### Analyze Dependencies
```bash
cd android
./gradlew app:dependencies
```

---

## 🎯 Quick Test Workflow

```bash
# 1. Clean
cd android && ./gradlew clean && cd ..

# 2. Build
npx expo run:android --variant release

# 3. Monitor
adb logcat -c && adb logcat | grep -E "(FATAL|ReactNative)"

# 4. Test QR scanning → Bluetooth → Trip config
```

---

## ⚡ Development vs Release

### Debug Build (for testing)
```bash
npx expo run:android
# or
npm run android
```

### Release Build (for production)
```bash
npx expo run:android --variant release
```

**Key Differences:**
- Debug: No obfuscation, debuggable, larger size
- Release: Obfuscated, optimized, smaller size, production-ready

---

## 📱 Device Commands

### Install APK
```bash
adb install path/to/app.apk
```

### Uninstall App
```bash
adb uninstall com.termi007xt.myexpoapp
```

### Clear App Data
```bash
adb shell pm clear com.termi007xt.myexpoapp
```

### Restart ADB
```bash
adb kill-server
adb start-server
```

---

## 🔍 Debugging Release Build

### Enable USB Debugging
1. Settings → About Phone → Tap "Build Number" 7 times
2. Settings → Developer Options → Enable USB Debugging

### View Release Logs
```bash
adb logcat -s ReactNative:V ReactNativeJS:V
```

### Check Permissions
```bash
adb shell dumpsys package com.termi007xt.myexpoapp | grep permission
```

---

## 💾 Backup Important Files

Before building, backup:
- `android/app/build/outputs/mapping/release/mapping.txt` (ProGuard mapping)
- `android/app/build/outputs/apk/release/app-release.apk` (APK)
- Build logs

---

## 🎉 Success Checklist

- [ ] Clean build completed
- [ ] APK installed successfully
- [ ] App launches without crash
- [ ] QR scanner opens and scans
- [ ] Bluetooth connects to device
- [ ] Trip start works
- [ ] Trip stop works
- [ ] Data saves correctly
- [ ] No errors in logcat

---

**Need Help?** Check `RELEASE_BUILD_FIX.md` for detailed troubleshooting.
