# Android Build & Test - Complete Guide

## 🎯 Quick Commands

### Build & Test (All-in-One)
```bash
# 1. Build APK
npm run android:build

# 2. Fix ADB connection
npm run android:fix-adb

# 3. Test (install + launch)
npm run android:test
```

### Alternative: Using Android Studio
```bash
# 1. Open in Android Studio
npm run cap:android

# 2. In Android Studio:
#    - Click "Build" > "Build APK(s)"
#    - Click "Run" > "Run 'app'"
```

## 📦 All Available Commands

| Command | What It Does |
|---------|--------------|
| `npm run build` | Build Next.js static export |
| `npm run android:build` | Build Next.js + Sync + Build Debug APK |
| `npm run android:build:release` | Build Release APK |
| `npm run android:install` | Install APK on connected device |
| `npm run android:run` | Launch app on device |
| `npm run android:test` | Full test workflow (fix ADB + install + launch) |
| `npm run android:fix-adb` | Fix ADB connection issues |
| `npm run android:clean` | Clean Android build |
| `npm run android:logcat` | View filtered app logs |
| `npm run cap:android` | Open project in Android Studio |
| `npm run cap:sync` | Sync web assets to native projects |

## 🔧 Fix "Can't find service: package" Error

This error means ADB can't communicate with your device/emulator. Fix it:

```bash
npm run android:fix-adb
```

Or manually:
```bash
adb kill-server
adb start-server
adb devices
```

Make sure:
- Device has USB debugging enabled
- Device is connected via USB
- Emulator is running (if using emulator)
- ADB authorization is accepted on device

## 🚀 Complete Build Process

### Step-by-Step Build

1. **Check Requirements:**
   ```bash
   ./scripts/check-requirements.sh
   ```

2. **Build Next.js:**
   ```bash
   npm run build
   ```

3. **Sync with Capacitor:**
   ```bash
   npx cap sync android
   ```

4. **Build Android APK:**

   **Option A: Command Line** (requires Java)
   ```bash
   cd android && ./gradlew clean assembleDebug
   ```

   **Option B: Android Studio** (recommended if Java not installed)
   ```bash
   npm run cap:android
   # Then: Build > Build APK(s)
   ```

5. **Verify APK exists:**
   ```bash
   ls -lh android/app/build/outputs/apk/debug/app-debug.apk
   ```

6. **Install on device:**
   ```bash
   npm run android:install
   ```

7. **Launch app:**
   ```bash
   npm run android:run
   ```

## 📱 Testing on Device/Emulator

### Physical Device

1. **Enable USB Debugging:**
   - Settings > About Phone > Tap "Build Number" 7 times
   - Settings > Developer Options > Enable "USB Debugging"

2. **Connect Device:**
   ```bash
   # Connect via USB
   adb devices
   # Should show your device
   ```

3. **Build & Install:**
   ```bash
   npm run android:build
   npm run android:test
   ```

### Emulator

1. **Start Emulator:**
   - Open Android Studio
   - Tools > Device Manager
   - Click Play ▶️ on an emulator

2. **Wait for boot**, then:
   ```bash
   adb devices  # Verify emulator is connected
   npm run android:build
   npm run android:test
   ```

## 🐛 Troubleshooting

### Error: "Unable to locate a Java Runtime"

**Solution:** Use Android Studio instead:
```bash
npm run cap:android
# Then build in Android Studio
```

Or install Java:
```bash
# macOS
brew install openjdk@17
export JAVA_HOME=/usr/local/opt/openjdk@17
```

### Error: "Can't find service: package"

**Solution:**
```bash
npm run android:fix-adb
```

Then check:
```bash
adb devices  # Should show device
```

### No Devices Found

**Physical Device:**
- Check USB cable
- Enable USB debugging
- Accept authorization on device
- Try different USB port

**Emulator:**
- Start emulator in Android Studio
- Wait for full boot
- Run: `adb devices`

### Gradle Build Fails

**Solution:**
1. Open in Android Studio:
   ```bash
   npm run cap:android
   ```

2. In Android Studio:
   - File > Sync Project with Gradle Files
   - Build > Clean Project
   - Build > Rebuild Project

## 📋 Build Scripts

### `scripts/build-android.sh`
```bash
#!/bin/bash
set -e
echo "🔨 Building Next.js app..."
npm run build
echo "🔄 Syncing with Capacitor..."
npx cap sync android
echo "📦 Building Android APK..."
cd android
./gradlew clean assembleDebug
echo "✅ Build complete!"
```

### `scripts/test-android.sh`
```bash
#!/bin/bash
set -e
echo "🔍 Checking ADB connection..."
adb devices
echo "🔄 Restarting ADB server..."
adb kill-server
adb start-server
echo "⏳ Waiting for device..."
adb wait-for-device
echo "📱 Checking connected devices..."
# ... installs and launches app
```

### `scripts/fix-adb.sh`
```bash
#!/bin/bash
echo "🔧 Fixing ADB connection issues..."
adb kill-server 2>/dev/null || true
adb start-server
adb devices
adb wait-for-device
# ... checks and reports status
```

## 📦 APK Locations

**Debug APK:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

**Release APK:**
```
android/app/build/outputs/apk/release/app-release.apk
```

## 🔍 Viewing Logs

```bash
# View filtered logs
npm run android:logcat

# View all logs
adb logcat

# Clear and view
adb logcat -c && adb logcat
```

## ✅ Verification Steps

After build, verify:

1. **APK exists:**
   ```bash
   ls android/app/build/outputs/apk/debug/app-debug.apk
   ```

2. **Device connected:**
   ```bash
   adb devices
   ```

3. **App installed:**
   ```bash
   adb shell pm list packages | grep ecobuymotherboard
   ```

4. **App runs:**
   ```bash
   npm run android:run
   ```

## 📝 App Configuration

- **App ID:** `com.ecobuymotherboard.vendor`
- **App Name:** EcoBuy Vendor
- **Package:** `com.ecobuymotherboard.vendor`
- **Min SDK:** 23 (Android 6.0)
- **Target SDK:** 35 (Android 14)
- **Version:** 1.0.0

## 🎓 Learn More

- **Detailed Build Guide:** See `ANDROID_BUILD.md`
- **Quick Start:** See `QUICK_START.md`
- **Check Requirements:** `./scripts/check-requirements.sh`

## 💡 Pro Tips

1. **Use Android Studio** for easier debugging
2. **Keep ADB updated** for latest device support
3. **Test on multiple devices** before release
4. **Check logs** when app crashes: `npm run android:logcat`
5. **Clean build** if weird errors: `npm run android:clean`

## 🆘 Quick Help

**Problem:** Build fails  
**Solution:** `npm run android:clean && npm run android:build`

**Problem:** Can't find device  
**Solution:** `npm run android:fix-adb`

**Problem:** App crashes  
**Solution:** `npm run android:logcat` to see error logs

**Problem:** Installation fails  
**Solution:** Uninstall old version: `adb uninstall com.ecobuymotherboard.vendor`




