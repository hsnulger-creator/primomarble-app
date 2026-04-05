# Primo Marble Day Check App

## Project Overview
React Native (Expo SDK 55) Android app for Primo Marble & Granite.
Two daily inspection forms: Forklift Daily Check and Driver's Vehicle Inspection.
Reports are emailed to a configurable manager email.

## Environment
- Node.js: C:\Program Files\nodejs\node.exe (v24)
- JDK 17: C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot (required for Gradle — Java 26 is installed but incompatible)
- Android SDK: C:\Users\Administrator\AppData\Local\Android\Sdk
- Build path: C:\PrimoMarble (short path required — Windows 260-char limit hit the original Desktop path)
- Windows Long Paths: enabled in registry (HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem LongPathsEnabled=1)

## Build Instructions
All builds must be run from C:\PrimoMarble (NOT the Desktop path) to avoid Windows path length issues.

### Full rebuild from scratch
```powershell
# 1. Make code changes in the Desktop project source
# 2. Sync changes to C:\PrimoMarble
Copy-Item -Path 'C:\Users\Administrator\Desktop\New folder\PrimoMarble\PrimoMarbleApp\src' -Destination 'C:\PrimoMarble\src' -Recurse -Force
Copy-Item -Path 'C:\Users\Administrator\Desktop\New folder\PrimoMarble\PrimoMarbleApp\App.js' -Destination 'C:\PrimoMarble\App.js' -Force

# 3. Build APK
cd C:\PrimoMarble\android
.\gradlew.bat assembleRelease

# 4. APK output
C:\PrimoMarble\android\app\build\outputs\apk\release\app-release.apk
```

### After package.json changes (new dependencies)
```powershell
cd C:\PrimoMarble
& 'C:\Program Files\nodejs\npm.cmd' install --legacy-peer-deps
& 'C:\Program Files\nodejs\npx.cmd' expo prebuild --platform android --clean

# Re-apply required config after prebuild wipes android folder:
# 1. Add to android/gradle.properties:
#    org.gradle.java.home=C:\\Program Files\\Microsoft\\jdk-17.0.18.8-hotspot
# 2. Create android/local.properties:
#    sdk.dir=C\:\\Users\\Administrator\\AppData\\Local\\Android\\Sdk

cd android
.\gradlew.bat assembleRelease
```

## Key Fixes Applied (do not revert)
- `android/gradle.properties`: `org.gradle.java.home` set to JDK 17 path (Gradle 9 incompatible with Java 26)
- `android/local.properties`: `sdk.dir` hardcoded (ANDROID_HOME not inherited in PowerShell subprocesses)
- `@react-native-async-storage/async-storage`: pinned to 2.1.2 (v3 has unpublished native lib)
- Build from `C:\PrimoMarble` to avoid 260-char Windows path limit

## iOS Build (Codemagic)
iOS cannot be built on Windows. Use Codemagic (codemagic.io) — free tier available.

### Steps
1. Sign up at codemagic.io and connect your GitHub/GitLab repo
2. Push this project to GitHub
3. In Codemagic → Add application → select React Native
4. It will detect `codemagic.yaml` automatically
5. Add Apple credentials in Codemagic settings:
   - Apple Developer account (developer.apple.com — $99/year required)
   - Codemagic can auto-generate certificates & provisioning profiles
6. Run the `ios-release` workflow → downloads `.ipa` when done

### iOS-specific fixes applied
- `App.js`: wrapped with `SafeAreaProvider` from `react-native-safe-area-context`
- `HomeScreen.js`: header `paddingTop` uses `Platform.OS` (iOS=8, Android=40) so notch isn't double-padded
- `app.json`: added `infoPlist` with `NSPhotoLibraryUsageDescription`
- `codemagic.yaml`: iOS + Android build workflows

## App Structure
- `App.js` — navigation root (Stack Navigator)
- `src/screens/LoginScreen.js` — login (PrimoMarble / Prm4075)
- `src/screens/HomeScreen.js` — main menu with 2 form buttons
- `src/screens/ForkliftCheckScreen.js` — Forklift Daily Check form
- `src/screens/DriverInspectionScreen.js` — Driver Vehicle Inspection form
- `src/screens/SettingsScreen.js` — manager email config (saved in AsyncStorage)

## Email
Uses expo-mail-composer (opens native email app with pre-filled report). Manager email is set by user in Settings screen and saved to AsyncStorage.
