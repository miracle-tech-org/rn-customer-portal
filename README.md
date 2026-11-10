# rn-customer-portal

Cross-platform React Native app that wraps the existing customer portal in a WebView for **Android** and **iOS**.

- **React Native:** 0.88.1 (latest)
- **Package / Bundle ID:** `com.velonav.customerportal`
- **Portal URL:** `https://sbtspro.velonav.in/mobile/app.php`

## Requirements

- Node.js **22.13+**, **24.3+**, or **26+** (Node 25 may show engine warnings)
- npm 9+
- **Android:** Android Studio, JDK 17+, Android SDK / emulator or device
- **iOS (macOS only):** Xcode 16+, CocoaPods

## Quick start

```bash
cd rn-customer-portal
npm install
```

### Android

```bash
npm start
# in another terminal
npm run android
```

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
├── App.tsx                          # App entry
├── src/
│   ├── config/portal.ts             # Portal URL + app name
│   └── components/PortalWebView.tsx # WebView shell
├── android/                         # Native Android project
└── ios/                             # Native iOS project
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

## Coming next (planned)

- Push notifications (Firebase / APNs)
- Camera + barcode scanning bridge back to the portal
- App icon + ad network
- Play Store / App Store release builds

## Scripts

| Script | Description |
|---|---|
| `npm start` | Start Metro bundler |
| `npm run android` | Build & run on Android |
| `npm run ios` | Build & run on iOS |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |

## Notes

- React Native project name must be a valid identifier (`RnCustomerPortal`); the folder is `rn-customer-portal`.
- iOS builds require a Mac. Android can be built on this Windows machine.
