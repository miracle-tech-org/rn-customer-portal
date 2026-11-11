# rn-customer-portal

Cross-platform React Native app that wraps the existing customer portal in a WebView for **Android** and **iOS**.

- **React Native:** 0.88.1 (latest)
- **Package / Bundle ID:** `com.velonav.customerportal`
- **Portal URL:** `https://sbtspro.velonav.in/mobile/app.php`

## Requirements

- Node.js **22.13+**, **24.3+**, or **26+** (Node 25 may show engine warnings)
- npm 9+
- **Android:** Android Studio, JDK 17+, Android SDK, plus an emulator **or** a USB device
- **iOS (macOS only):** Xcode 16+, CocoaPods

> `npm run android` **cannot work** on a PC without the Android SDK. Use the machine where Android Studio is already installed.

## Quick start

```bash
cd rn-customer-portal
npm install
```

### Android (PC with Android Studio)

1. Confirm the SDK is installed (usually `%LOCALAPPDATA%\Android\Sdk`).
2. Create an emulator in Android Studio → **Device Manager**, **or** plug in a phone with USB debugging.
3. (Recommended once) set User env vars:
   - `ANDROID_HOME` = your SDK path
   - PATH includes `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator`
4. Open a **new** terminal:

```bash
npm run doctor:android   # auto-finds SDK + writes android/local.properties
npm start                # terminal 1
npm run android          # terminal 2 — also auto-writes local.properties
```

`npm run android` now runs `scripts/run-android.js`, which:

- finds the Android SDK
- writes `android/local.properties`
- adds `adb` / emulator to PATH for that run
- then calls `react-native run-android`

### iOS (macOS)

```bash
cd ios
bundle install   # if using Bundler
bundle exec pod install
cd ..
npm start
# in another terminal
npm run ios
```

## Project structure

```
rn-customer-portal/
├── App.tsx
├── scripts/
│   ├── ensure-android-env.js   # SDK detect + local.properties
│   └── run-android.js          # used by npm run android
├── src/
│   ├── config/portal.ts
│   └── components/PortalWebView.tsx
├── android/
└── ios/
```

## Change the portal URL

Edit `src/config/portal.ts`:

```ts
export const PORTAL_URL = 'https://your-portal-url.example/mobile/app.php';
```

## Test portal login (parent)

- URL: https://sbtspro.velonav.in/mobile/app.php
- User: `user7340776318`
- Pass: `123`

## Push notifications (implemented)

Push is wired with `@react-native-firebase/messaging`.

### One-time Firebase files (required to receive real pushes)

1. Create a Firebase project (see root `../push-notification.md`).
2. Android: download `google-services.json` → place at:

```text
android/app/google-services.json
```

3. iOS: download `GoogleService-Info.plist` → place at:

```text
ios/RnCustomerPortal/GoogleService-Info.plist
```

   Then add it to the Xcode target if needed, enable **Push Notifications** + **Background Modes → Remote notifications**, upload APNs `.p8` key to Firebase.

4. Rebuild:

```bash
npm run android
# macOS:
cd ios && pod install && cd .. && npm run ios
```

Without those files the app still opens the portal; push init is skipped/logged.

### What the app does

- Requests notification permission (Android 13+ / iOS)
- Reads FCM device token and logs it
- Injects token into the WebView and calls portal `sbtsSetFcmToken(token)` so registration uses the **login session cookie**
- Registers against `POST https://sbtspro.velonav.in/api/fcm_register.php`
- Android channel: **`sbts_alerts`** (high importance)
- Foreground: alert dialog; background/killed: system tray
- Tap notification → opens portal start URL `https://sbtspro.velonav.in/mobile/app.php`

Example files: `android/app/google-services.json.example`, `ios/RnCustomerPortal/GoogleService-Info.plist.example`

## Coming next (planned)

- App icon
- Play Store / App Store release builds

## Out of scope

- Barcode scanning / camera
- Ad network integration

## Scripts

| Script | Description |
|---|---|
| `npm start` | Start Metro bundler |
| `npm run android` | Auto-setup Android env, then build & run |
| `npm run doctor:android` | Only check SDK / write `local.properties` |
| `npm run android:raw` | Run RN CLI without the helper |
| `npm run ios` | Build & run on iOS |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |

## Fixing the errors from your log

| Log message | Meaning | Fix |
|---|---|---|
| `adb is not recognized` | Platform-Tools not on PATH | Install Platform-Tools; use PC with Android Studio; `npm run android` adds PATH automatically when SDK exists |
| `No emulators found` | No AVD created | Android Studio → Device Manager → Create device |
| `SDK location not found` | No `ANDROID_HOME` / `local.properties` | Run on the PC with SDK; `npm run doctor:android` writes `local.properties` |

## Notes

- React Native project name must be a valid identifier (`RnCustomerPortal`); the folder is `rn-customer-portal`.
- `android/local.properties` is machine-specific and gitignored.
- iOS builds require a Mac.
