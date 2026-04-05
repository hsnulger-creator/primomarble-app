@echo off
title Set Android SDK Path
cls

echo ============================================
echo   SET ANDROID SDK PATH
echo ============================================
echo.
echo Open Android Studio, go to:
echo   More Actions > SDK Manager
echo.
echo Look at the top for "Android SDK Location"
echo It usually looks like:
echo   C:\Users\YourName\AppData\Local\Android\Sdk
echo.
set /p SDKPATH="Paste your Android SDK path here: "

echo.
echo Setting ANDROID_HOME = %SDKPATH%
setx ANDROID_HOME "%SDKPATH%"
setx PATH "%PATH%;%SDKPATH%\platform-tools;%SDKPATH%\tools"

echo.
echo [OK] ANDROID_HOME has been set.
echo      Please CLOSE this window and reopen SETUP_AND_BUILD.bat
echo.
pause
