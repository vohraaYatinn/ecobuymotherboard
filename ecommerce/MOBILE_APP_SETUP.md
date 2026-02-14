# Mobile App Setup Guide

This guide explains how to build and run the Elecobuy Customer Android app using Capacitor.

## Quick start (Android)

From the `ecommerce` folder:

```bash
# 1. Install dependencies
npm install

# 2. If you don't have an android folder yet, add the Android platform (first time only)
npx cap add android

# 3. Build the web app for mobile (static export) and sync to Android
npm run cap:build

# 4. Open Android Studio
npm run cap:android
```

In Android Studio: use **Run** (green play) to build and run on an emulator or connected device.

To build a debug APK from the terminal:

```bash
npm run android:build
npm run android:install   # install on connected device
npm run android:run       # launch app
```

## Prerequisites

- **Node.js** v18 or higher
- **Android Studio** (for Android) — [download](https://developer.android.com/studio)
- **JDK 17** (usually bundled with Android Studio)
- **Xcode** (for iOS, macOS only)

## First-time setup

### 1. Install dependencies

```bash
cd ecommerce
npm install
```

### 2. Add Android platform (if `android` folder doesn’t exist)

```bash
# Build the app for mobile first (required for Capacitor)
npm run build:mobile

# Add Android
npx cap add android

# Sync web assets into the native project
npx cap sync android
```

### 3. Open in Android Studio

```bash
npm run cap:android
```

In Android Studio: wait for Gradle sync, then run the app (Run → Run 'app' or the green play button).

## Development workflow

### Android

| Step | Command |
|------|--------|
| Build web app for mobile + sync | `npm run cap:build` |
| Open Android Studio | `npm run cap:android` |
| Build debug APK | `npm run android:build` |
| Install on device | `npm run android:install` |
| Launch app | `npm run android:run` |
| View logs | `npm run android:logcat` |

After changing the Next.js app, run `npm run cap:build` (or `npm run build:mobile && npx cap sync android`), then rebuild/run from Android Studio or `npm run android:build`.

### iOS

1. Open iOS project:
```bash
npm run cap:ios
```

2. Build and run from Xcode

## Configuration

### API URL

The app uses the `NEXT_PUBLIC_API_URL` environment variable. For mobile development:

1. Create a `.env.local` file:
```
NEXT_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:5000
```

2. Or use the provided script:
```bash
./update-api-url.sh
```

3. Rebuild after changing the API URL:
```bash
npm run cap:build
```

### App Configuration

Edit `capacitor.config.ts` to customize:
- App ID: `com.ecobuymotherboard.customer`
- App Name: `Elecobuy Customer`
- Splash screen settings
- Push notification settings

## Building for Production

### Android

1. Build release APK:
```bash
npm run android:build:release
```

2. The APK will be located at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### iOS

1. Open Xcode:
```bash
npm run cap:ios
```

2. Configure signing in Xcode
3. Archive and distribute through App Store or TestFlight

## Troubleshooting

### Build Issues

**Known Issue: Dynamic Routes with Static Export**

If you encounter errors about missing `generateStaticParams()` for dynamic routes (`[id]`), this is a known compatibility issue with Next.js 16.0.3 and static export. The function is present in the code, but Next.js may not detect it properly.

**Workarounds:**

1. **Update Next.js** (Recommended):
   ```bash
   npm install next@latest --legacy-peer-deps
   ```

2. **Use Client-Side Routing**: Convert dynamic route pages to client components that handle routing via query parameters or state management.

3. **Temporary Workaround**: Comment out dynamic routes temporarily, build the app, then uncomment them. The routes will work with client-side navigation in the mobile app.

- Clean Android build: `npm run android:clean`
- Rebuild everything: `npm run build:mobile && npx cap sync android` (or `npm run cap:build`)

### API Connection Issues

- Ensure your backend server is running
- Check that `NEXT_PUBLIC_API_URL` is correctly set
- Verify network permissions in AndroidManifest.xml

### Sync issues

- For mobile: run `npm run build:mobile` (or `npm run cap:build`) before opening Android Studio — **do not** use plain `npm run build` for the Android app, or the `out` folder won’t have the static export.
- If sync fails: delete the `out` folder, run `npm run build:mobile`, then `npx cap sync android`.

## Available scripts

| Script | Description |
|--------|-------------|
| `npm run build:mobile` | Build Next.js with static export for Capacitor |
| `npm run cap:build` | build:mobile + sync (use this before opening Android Studio) |
| `npm run cap:sync` | Sync web assets to native projects (run after build:mobile) |
| `npm run cap:android` | Open Android project in Android Studio |
| `npm run cap:ios` | Open iOS project in Xcode |
| `npm run android:build` | Build debug APK |
| `npm run android:build:release` | Build release APK |
| `npm run android:install` | Install debug APK on connected device |
| `npm run android:run` | Launch app on device |
| `npm run android:clean` | Clean Android build |
| `npm run android:logcat` | Stream Android logs (filtered) |

## Pull to refresh

In the native app (Android/iOS), pull down from the top of any customer page to refresh. The app calls `router.refresh()` and dispatches a `pull-to-refresh` custom event. To refetch your own data when the user pulls to refresh, listen for the event:

```js
useEffect(() => {
  const handler = () => { /* refetch your data */ }
  window.addEventListener('pull-to-refresh', handler)
  return () => window.removeEventListener('pull-to-refresh', handler)
}, [])
```

Pull-to-refresh is only active when running inside Capacitor (native app), not in the browser.

## Notes

- The Android app uses **static export**: `BUILD_FOR_MOBILE=true` enables `output: 'export'` in `next.config.mjs`. Use `npm run build:mobile` or `npm run cap:build` for mobile builds.
- Images are unoptimized for compatibility with Capacitor.
- Splash screen and push notifications are configured in `capacitor.config.ts`.
- App ID: `com.ecobuymotherboard.customer` — change in `capacitor.config.ts` and Android package name if needed.

