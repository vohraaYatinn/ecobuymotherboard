# Mobile App Setup Guide

This guide explains how to build and run the Elecobuy Customer mobile app.

## Prerequisites

- Node.js (v18 or higher)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Java Development Kit (JDK) for Android

## Installation

1. Install dependencies:
```bash
npm install --legacy-peer-deps
```

2. Build the Next.js app:
```bash
npm run build
```

3. Sync Capacitor:
```bash
npm run cap:sync
```

## Development Workflow

### Android

1. Open Android project:
```bash
npm run cap:android
```

2. Build debug APK:
```bash
npm run android:build
```

3. Install on connected device:
```bash
npm run android:install
```

4. Run on device:
```bash
npm run android:run
```

5. View logs:
```bash
npm run android:logcat
```

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
- Rebuild everything: `npm run build && npm run cap:sync`

### API Connection Issues

- Ensure your backend server is running
- Check that `NEXT_PUBLIC_API_URL` is correctly set
- Verify network permissions in AndroidManifest.xml

### Sync Issues

- Always run `npm run build` before `npm run cap:sync`
- Delete `out` folder and rebuild if sync fails

## Available Scripts

- `npm run build` - Build Next.js app
- `npm run cap:sync` - Sync web assets to native projects
- `npm run cap:build` - Build and sync in one command
- `npm run cap:android` - Open Android Studio
- `npm run cap:ios` - Open Xcode
- `npm run android:build` - Build debug APK
- `npm run android:build:release` - Build release APK
- `npm run android:install` - Install APK on device
- `npm run android:run` - Launch app on device
- `npm run android:clean` - Clean Android build
- `npm run android:logcat` - View Android logs

## Notes

- The app uses static export (`output: 'export'` in next.config.mjs)
- Images are unoptimized for mobile compatibility
- Push notifications are configured via Capacitor plugins
- The app supports both Android and iOS platforms

