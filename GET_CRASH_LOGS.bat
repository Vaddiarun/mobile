@echo off
echo Clearing old logs...
adb logcat -c

echo.
echo Starting log capture...
echo Press Ctrl+C after the app crashes
echo.

adb logcat -v time *:E ReactNative:V ReactNativeJS:V AndroidRuntime:E
