@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   KNOTS VPN - Emulator Baslatma Sihirbazi
echo ============================================
echo.

echo [1/3] APK derleniyor...
cd /d "%~dp0mobile\android"
call gradlew.bat assembleDebug -q
if errorlevel 1 goto :error

echo [2/3] Emulator kontrol ediliyor...
adb devices | findstr /c:"emulator-" >nul
if %errorlevel% neq 0 (
    echo     Emulator baslatiliyor (test)...
    start "" "C:\telefonum\emulator\emulator.exe" -avd test -no-snapshot-load -no-boot-anim
    adb wait-for-device
) else (
    echo     Emulator zaten calisiyor.
)

echo     Android boot bekleniyor...
:waitboot
timeout /t 2 /nobreak >nul
adb shell getprop sys.boot_completed 2>nul | findstr /x "1" >nul
if errorlevel 1 goto waitboot

echo [3/3] APK kuruluyor ve uygulama aciliyor...
adb install -r "app\build\outputs\apk\debug\app-debug.apk"
adb shell am start -n com.knots.mobile/.MainActivity

echo.
echo ============================================
echo   HAZIR! Uygulama emulatorde acildi.
echo ============================================
pause
exit /b 0

:error
echo.
echo HATA: Derleme basarisiz oldu.
pause
exit /b 1

0e78ebc253beb9ceb2dab6b04904a1e496bf6682a6d08f497b29afe9c6d12a76