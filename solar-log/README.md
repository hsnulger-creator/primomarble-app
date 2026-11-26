# Solar Log

Personal app for logging solar panel production. Separate from the Primo Marble app:
its own folder, name, icon and Android package (`com.personal.solarlog`).

- Log the day's kWh, edit or delete past days
- Totals for the last 7 days, month, year and lifetime, with a savings estimate
- Bar charts for 7 days, 30 days and 12 months
- Maintenance notes (cleaning, faults, service visits)
- Export readings as CSV text, and import by pasting `date,kWh` lines

- Optional automatic sync from the SmartESS cloud (Settings → SmartESS automatic sync)

Data stays on the phone (AsyncStorage); there is no server of our own.

## SmartESS sync

For inverters whose Wi-Fi stick reports to the SmartESS app (set up for a Powland 12 kW with a
WFBLE.DTU stick). After signing in with the SmartESS account, the app reads the inverter's
"energy today" counter each time it is opened (at most every 15 minutes, or on "Sync now") and
saves it as today's reading. It also tries to fill in missing earlier days of this month and
last month; days already logged are never overwritten.

- Only a SHA-1 of the password is stored, which is what the service's signing needs.
- `src/smartess.js` follows the request signing used by the open-source ha-dessmonitor and
  gladys-dessmonitor clients. It is covered by tests against a stand-in server but has not yet
  been run against a real SmartESS account, and the per-day history call is unconfirmed.

## Build the Android APK (Windows)

Copy this folder to a short path first (same 260-character limit as the main app):

```powershell
Copy-Item -Path '.\solar-log' -Destination 'C:\SolarLog' -Recurse -Force
cd C:\SolarLog
& 'C:\Program Files\nodejs\npm.cmd' install --legacy-peer-deps
& 'C:\Program Files\nodejs\npx.cmd' expo prebuild --platform android --clean

# After prebuild, as for the main app:
# 1. Add to android/gradle.properties:
#    org.gradle.java.home=C:\\Program Files\\Microsoft\\jdk-17.0.18.8-hotspot
# 2. Create android/local.properties:
#    sdk.dir=C\:\\Users\\Administrator\\AppData\\Local\\Android\\Sdk

cd android
.\gradlew.bat assembleRelease
# APK: C:\SolarLog\android\app\build\outputs\apk\release\app-release.apk
```

## Tests

`npm test` runs the unit tests for the date, totals and CSV logic.
