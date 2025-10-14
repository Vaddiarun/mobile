@echo off
echo Killing processes that might lock files...
taskkill /F /IM java.exe 2>nul
taskkill /F /IM gradle.exe 2>nul
timeout /t 2 /nobreak >nul

echo Building release AAB for Play Store...
cd android
call gradlew bundleRelease --no-daemon
cd ..

if exist "android\app\build\outputs\bundle\release\app-release.aab" (
    echo.
    echo SUCCESS! AAB file created at:
    echo android\app\build\outputs\bundle\release\app-release.aab
    echo.
    echo Upload this file to Google Play Console.
) else (
    echo BUILD FAILED!
)
pause
