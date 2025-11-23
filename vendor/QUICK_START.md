# Quick Start - Build & Test Android App

## ✅ Pre-Built APK

The APK should be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

If it doesn't exist or you need to rebuild, follow the steps below.

## 🚀 Build Steps (All-in-One)

### 1. Build Everything
```bash
npm run android:build
```

If Java is not installed, build using Android Studio instead (see Step 3).

### 2. Fix ADB Connection
```bash
npm run android:fix-adb
```

### 3. Test Installation
```bash
npm run android:test
```

## 🔧 Alternative: Build in Android Studio

If command line build fails (missing Java):

1. **Open in Android Studio:**
   ```bash
   npm run cap:android
   ```

2. **In Android Studio:**
   - Wait for Gradle sync to complete
   - Click "Build" > "Build Bundle(s) / APK(s)" > "Build APK(s)"
   - Wait for build to complete
   - APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

3. **Install and Run:**
   - Click "Run" > "Run 'app'"
   - Select device/emulator
   - App will install and launch automatically

## 📋 Manual Commands

### Build Only
```bash
npm run build                    # Build Next.js
npx cap sync android            # Sync to Android
cd android && ./gradlew assembleDebug  # Build APK
```

### Install Only
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Launch Only
```bash
adb shell am start -n com.ecobuymotherboard.vendor/.MainActivity
```

### View Logs
```bash
npm run android:logcat
```

## 🐛 Common Issues

**"Can't find service: package"**
→ Run: `npm run android:fix-adb`

**"Unable to locate Java Runtime"**
→ Use Android Studio to build (see above) OR install Java JDK 17+

**"No devices found"**
→ Connect device (enable USB debugging) OR start emulator in Android Studio

**Build fails**
→ Clean and rebuild: `npm run android:clean && npm run android:build`

## 📱 Test on Device/Emulator

1. **Physical Device:**
   - Enable USB Debugging
   - Connect via USB
   - Accept authorization
   - Run: `npm run android:test`

2. **Emulator:**
   - Open Android Studio
   - Tools > Device Manager > Start emulator
   - Run: `npm run android:test`

## ✅ Success Checklist

- [ ] Next.js build successful
- [ ] Capacitor sync successful
- [ ] APK built (or building in Android Studio)
- [ ] Device/emulator connected (`adb devices` shows device)
- [ ] APK installed successfully
- [ ] App launches without errors

## 📞 Need Help?

See detailed guide: `ANDROID_BUILD.md`  
Check requirements: `./scripts/check-requirements.sh`




