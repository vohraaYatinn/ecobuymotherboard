# Android Build & Test Guide

## 🚀 Quick Start

### Step 1: Check Requirements

```bash
./scripts/check-requirements.sh
```

This will check if Java, Android SDK, and ADB are installed.

### Step 2: Fix ADB Connection (if needed)

If you get "Can't find service: package" error:

```bash
npm run android:fix-adb
```

Or manually:
```bash
adb kill-server
adb start-server
adb devices
```

### Step 3: Build and Test

**Option A: Using npm scripts (Recommended)**
```bash
# Build the APK
npm run android:build

# Fix ADB and test
npm run android:fix-adb
npm run android:test
```

**Option B: Using scripts directly**
```bash
# Build
./scripts/build-android.sh

# Test
./scripts/test-android.sh
```

**Option C: Manual build in Android Studio**
```bash
# Open in Android Studio
npm run cap:android

# Then in Android Studio:
# 1. Click "Sync Project with Gradle Files"
# 2. Build > Build Bundle(s) / APK(s) > Build APK(s)
# 3. Run > Run 'app'
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build Next.js static export |
| `npm run android:build` | Build Next.js + Sync + Build APK |
| `npm run android:build:release` | Build release APK |
| `npm run android:install` | Install APK on device |
| `npm run android:run` | Launch app on device |
| `npm run android:test` | Full test (install + launch) |
| `npm run android:fix-adb` | Fix ADB connection issues |
| `npm run android:clean` | Clean Android build |
| `npm run android:logcat` | View app logs |
| `npm run cap:android` | Open in Android Studio |
| `npm run cap:sync` | Sync web assets to native |

## 🔧 Installation Requirements

### 1. Java Development Kit (JDK 17+)

**macOS (using Homebrew):**
```bash
brew install openjdk@17
```

Set JAVA_HOME:
```bash
# Add to ~/.zshrc or ~/.bash_profile
export JAVA_HOME=/usr/local/opt/openjdk@17
export PATH="$JAVA_HOME/bin:$PATH"
```

**Linux:**
```bash
sudo apt update
sudo apt install openjdk-17-jdk
```

**Windows:**
Download from: https://adoptium.net/

### 2. Android Studio

Download and install from: https://developer.android.com/studio

**During installation:**
- Install Android SDK
- Install Android SDK Platform (API 33 or higher)
- Install Android SDK Build-Tools
- Install Android SDK Platform-Tools

### 3. Environment Variables

Add to `~/.zshrc` or `~/.bash_profile`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# OR
export ANDROID_HOME=$HOME/Android/Sdk  # Linux

export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Reload shell:
```bash
source ~/.zshrc  # or source ~/.bash_profile
```

## 🐛 Troubleshooting

### Error: "Unable to locate a Java Runtime"

**Solution:**
1. Install JDK 17+ (see above)
2. Set JAVA_HOME environment variable
3. Verify: `java -version`

### Error: "Can't find service: package"

This means ADB can't communicate with the device/emulator.

**Solution:**
```bash
# 1. Fix ADB connection
npm run android:fix-adb

# 2. Check if device is connected
adb devices

# 3. If no devices:
#    - Connect device via USB (enable USB debugging)
#    - OR start an emulator in Android Studio

# 4. Restart ADB
adb kill-server
adb start-server
```

### Error: "Gradle sync failed"

**Solution:**
1. Open in Android Studio:
   ```bash
   npm run cap:android
   ```

2. In Android Studio:
   - File > Sync Project with Gradle Files
   - Build > Clean Project
   - Build > Rebuild Project

3. If still failing, check:
   - Internet connection (Gradle downloads dependencies)
   - Proxy settings if behind firewall
   - Gradle wrapper version in `android/gradle/wrapper/gradle-wrapper.properties`

### No Devices Found

**Physical Device:**
1. Enable Developer Options:
   - Settings > About Phone
   - Tap "Build Number" 7 times

2. Enable USB Debugging:
   - Settings > Developer Options > USB Debugging

3. Connect via USB and accept authorization prompt

**Emulator:**
1. Open Android Studio
2. Tools > Device Manager
3. Click Play ▶️ on an emulator
4. Wait for emulator to boot
5. Run: `adb devices` to verify

## 📱 Testing

### Test on Physical Device

1. **Enable USB Debugging** on device
2. **Connect device** via USB
3. **Accept USB authorization** on device
4. **Build and install:**
   ```bash
   npm run android:build
   npm run android:test
   ```

### Test on Emulator

1. **Start emulator** (Android Studio > Device Manager)
2. **Wait for emulator to boot**
3. **Build and install:**
   ```bash
   npm run android:build
   npm run android:test
   ```

### View Logs

```bash
# View filtered logs
npm run android:logcat

# View all logs
adb logcat

# Clear logs
adb logcat -c
```

## 🏗️ Build Process

The build process consists of:

1. **Next.js Build**: Creates static export in `out/` directory
   ```bash
   npm run build
   ```

2. **Capacitor Sync**: Copies web assets to native projects
   ```bash
   npx cap sync android
   ```

3. **Gradle Build**: Compiles Android APK
   ```bash
   cd android && ./gradlew assembleDebug
   ```

4. **Install**: Installs APK on device/emulator
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

5. **Launch**: Starts the app
   ```bash
   adb shell am start -n com.ecobuymotherboard.vendor/.MainActivity
   ```

## 📦 Build Output

### Debug APK
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK (after signing)
```
android/app/build/outputs/apk/release/app-release.apk
```

## 🔐 Production Build

1. **Generate signing key:**
   ```bash
   keytool -genkey -v -keystore my-release-key.jks \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias my-key-alias
   ```

2. **Create `android/key.properties`:**
   ```properties
   storePassword=your_password
   keyPassword=your_password
   keyAlias=my-key-alias
   storeFile=../my-release-key.jks
   ```

3. **Update `android/app/build.gradle`** (add signing config)

4. **Build release:**
   ```bash
   npm run android:build:release
   ```

## 🎯 Quick Reference

**APK Location:**
- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

**App ID:** `com.ecobuymotherboard.vendor`  
**App Name:** EcoBuy Vendor  
**Min SDK:** 23 (Android 6.0)  
**Target SDK:** 35 (Android 14)

## 💡 Tips

1. **Use Android Studio** for easier debugging and testing
2. **Check logs** frequently: `npm run android:logcat`
3. **Clean build** if issues persist: `npm run android:clean`
4. **Keep ADB updated** for latest device support
5. **Test on multiple devices/Android versions** before release




