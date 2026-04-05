@echo off
title Primo Marble App - Local APK Build
color 1F
cls

:: ---- ADD COMMON NODE.JS PATHS ----
SET PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;%APPDATA%\npm

echo ============================================
echo   PRIMO MARBLE DAY CHECK APP - LOCAL BUILD
echo ============================================
echo.

echo     Node.js OK:
node --version

:: ---- CHECK JAVA ----
echo.
echo [2/5] Checking Java JDK...
java -version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [!] Java JDK 17 is NOT installed.
    echo     Download from: https://www.microsoft.com/openjdk
    echo     Pick: Microsoft Build of OpenJDK 17 - Windows x64 .msi
    echo     After installing, restart this script.
    pause
    start https://learn.microsoft.com/en-us/java/openjdk/download#openjdk-17
    exit /b
)
echo     Java OK:
java -version 2>&1 | findstr version

:: ---- CHECK ANDROID_HOME ----
echo.
echo [3/5] Checking Android SDK...
IF "%ANDROID_HOME%"=="" (
    echo [!] ANDROID_HOME is not set.
    echo.
    echo     You need Android Studio installed.
    echo     Download: https://developer.android.com/studio
    echo.
    echo     After installing Android Studio:
    echo     1. Open Android Studio
    echo     2. Go to: More Actions ^> SDK Manager
    echo     3. Note the "Android SDK Location" path
    echo     4. Run SET_ANDROID_PATH.bat to set the path
    echo.
    pause
    start https://developer.android.com/studio
    exit /b
)
echo     ANDROID_HOME = %ANDROID_HOME%

:: ---- INSTALL NPM PACKAGES ----
echo.
echo [4/5] Installing app packages...
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed. Check your internet connection.
    pause
    exit /b
)
echo     Packages installed OK.

:: ---- BUILD APK ----
echo.
echo [5/5] Building APK...
echo     Generating Android project files...
call npx expo prebuild --platform android --clean
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] prebuild failed.
    pause
    exit /b
)

echo.
echo     Compiling APK (this takes 3-5 minutes)...
cd android
call gradlew.bat assembleRelease
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gradle build failed. Check messages above.
    cd ..
    pause
    exit /b
)
cd ..

echo.
echo ============================================
echo   BUILD COMPLETE!
echo ============================================
echo.
echo Your APK is ready at:
echo   PrimoMarbleApp\android\app\build\outputs\apk\release\app-release.apk
echo.
echo Transfer this file to your Android phone and install it.
echo.
pause
