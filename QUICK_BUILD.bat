@echo off
echo Killing processes that might lock files...
taskkill /F /IM java.exe 2>nul
taskkill /F /IM gradle.exe 2>nul
timeout /t 2 /nobreak >nul

echo Building release APK...
cd android
call gradlew assembleRelease --no-daemon
cd ..

if exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo.
    echo SUCCESS! Installing...
    adb install -r android\app\build\outputs\apk\release\app-release.apk
    echo.
    echo DONE! Test now.
) else (
    echo BUILD FAILED!
)
pause
