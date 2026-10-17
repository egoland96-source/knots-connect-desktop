@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Knots Connect - Gelistirici ve Baslatma Araci

:menu
cls
echo ========================================================
echo               KNOTS CONNECT DESKTOP & ENGINE
echo ========================================================
echo.
echo   [1] Masaustu Uygulamasini Baslat (Electron + Vite Dev)
echo   [2] Go DPI Motorunu Derle (go-backend -> backend/k_main.exe)
echo   [3] TypeScript Tip Kontrolu Yap (npm run typecheck)
echo   [4] Mobil Uygulamayi Baslat (Expo React Native)
echo   [5] WinDivert Surucusunu Durdur / Sifirla
echo   [0] Cikis
echo.
echo ========================================================
set /p secim="Seciminiz (0-5): "

if "%secim%"=="1" goto dev_desktop
if "%secim%"=="2" goto build_go
if "%secim%"=="3" goto typecheck
if "%secim%"=="4" goto dev_mobile
if "%secim%"=="5" goto reset_windivert
if "%secim%"=="0" exit /b 0

echo Gecersiz secim, lutfen tekrar deneyin.
timeout /t 2 >nul
goto menu

:dev_desktop
cls
echo [1/1] Knots Desktop Dev modu baslatiliyor...
call npm run dev
pause
goto menu

:build_go
cls
echo [1/2] Go DPI motoru derleniyor...
cd /d "%~dp0go-backend"
go build -o k_main.exe
if errorlevel 1 (
    echo [HATA] Go derleme basarisiz oldu!
    cd /d "%~dp0"
    pause
    goto menu
)
echo [2/2] Derlenen k_main.exe backend/ klasorune kopyalaniyor...
copy /y k_main.exe "..\backend\k_main.exe" >nul
cd /d "%~dp0"
echo.
echo [BASARILI] k_main.exe basariyla derlendi ve guncellendi.
pause
goto menu

:typecheck
cls
echo TypeScript tip kontrolu calistiriliyor...
call npm run typecheck
if errorlevel 1 (
    echo [UYARI] TypeScript kontrollerinde hatalar bulundu.
) else (
    echo [BASARILI] Tum tipler hatasiz dogrulandi!
)
pause
goto menu

:dev_mobile
cls
echo Mobil katman (Expo) baslatiliyor...
if exist "mobile\android" (
    cd /d "%~dp0mobile\android"
    call npx expo start
) else (
    echo [HATA] mobile\android dizini bulunamadi!
)
cd /d "%~dp0"
pause
goto menu

:reset_windivert
cls
echo WinDivert servisi durduruluyor ve temizleniyor...
sc stop WinDivert >nul 2>&1
sc delete WinDivert >nul 2>&1
sc stop WinDivert14 >nul 2>&1
sc delete WinDivert14 >nul 2>&1
echo WinDivert servis kayitlari sifirlandi.
pause
goto menu