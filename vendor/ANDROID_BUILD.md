# Android Build & Test Guide

## Prerequisites

1. **Java Development Kit (JDK)**: Make sure JDK 17 or higher is installed
   ```bash
   java -version
   ```

2. **Android Studio**: Install Android Studio for Android SDK and emulator
   - Download from: https://developer.android.com/studio

3. **Android SDK**: Ensure Android SDK is installed via Android Studio
   - SDK Platforms: Android 13 (API 33) or higher
   - SDK Tools: Android SDK Build-Tools, Android SDK Platform-Tools

4. **Environment Variables**: Set up ANDROID_HOME
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   ```

## Quick Start

### 1. Build the APK

```bash
# Build Next.js app and Android APK
npm run android:build
```

This will:
- Build the Next.js static export
- Sync with Capacitor
- Build the Android debug APK

The APK will be located at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 2. Fix ADB Connection Issues

If you encounter "Can't find service: package" error:

```bash
# Fix ADB connection
npm run android:fix-adb
```

This script will:
- Restart ADB server
- Check device connections
- Wait for device to be ready

### 3. Install and Run on Device/Emulator

**Option A: Using Test Script (Recommended)**
```bash
npm run android:test
```

**Option B: Manual Steps**
```bash
# 1. Check connected devices
adb devices

# 2. Install APK
npm run android:install

# 3. Launch app
npm run android:run
```

### 4. Build Release APK

```bash
npm run android:build:release
```

Release APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run android:build` | Build debug APK |
| `npm run android:build:release` | Build release APK |
| `npm run android:install` | Install APK on connected device |
| `npm run android:run` | Launch app on device |
| `npm run android:test` | Full test workflow (install + run) |
| `npm run android:fix-adb` | Fix ADB connection issues |
| `npm run android:clean` | Clean Android build |
| `npm run android:logcat` | View app logs |

## Troubleshooting

### Error: "Can't find service: package"

This usually means ADB connection issues. Follow these steps:

1. **Check ADB connection:**
   ```bash
   adb devices
   ```
   Should show your device/emulator listed.

2. **Restart ADB:**
   ```bash
   npm run android:fix-adb
   ```

3. **Check device USB debugging:**
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times to enable Developer Options
   - Go to Settings > Developer Options
   - Enable "USB Debugging"

4. **For emulator:**
   - Open Android Studio
   - Tools > Device Manager
   - Start an emulator instance

### Error: "Unable to locate a Java Runtime"

Install JDK 17 or higher:

```bash
# macOS (using Homebrew)
brew install openjdk@17

# Set JAVA_HOME
export JAVA_HOME=/usr/local/opt/openjdk@17
```

### Error: "Gradle sync failed"

1. **Clean build:**
   ```bash
   npm run android:clean
   ```

2. **Sync Capacitor:**
   ```bash
   npx cap sync android
   ```

3. **Open in Android Studio:**
   ```bash
   npm run cap:android
   ```
   Then: File > Sync Project with Gradle Files

### Build APK Manually

If scripts fail, build manually:

```bash
# 1. Build Next.js
npm run build

# 2. Sync Capacitor
npx cap sync android

# 3. Navigate to android directory
cd android

# 4. Build debug APK
./gradlew clean assembleDebug

# 5. Install APK
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Testing on Emulator

1. **Start Emulator:**
   ```bash
   # List available emulators
   emulator -list-avds
   
   # Start emulator
   emulator -avd <emulator_name>
   ```

2. **Wait for emulator to boot**, then:
   ```bash
   npm run android:test
   ```

## Testing on Physical Device

1. **Enable USB Debugging** on your Android device:
   - Settings > About Phone
   - Tap "Build Number" 7 times
   - Settings > Developer Options > USB Debugging

2. **Connect device via USB**

3. **Accept USB debugging authorization** on device

4. **Verify connection:**
   ```bash
   adb devices
   ```

5. **Build and install:**
   ```bash
   npm run android:test
   ```

## Viewing Logs

```bash
# View all logs
adb logcat

# View filtered logs (our app only)
npm run android:logcat

# Clear logs and restart
adb logcat -c && adb logcat | grep -i 'ecobuymotherboard\|capacitor\|error'
```

## Production Build

1. **Generate signing key** (first time only):
   ```bash
   keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
   ```

2. **Create `android/key.properties`:**
   ```properties
   storePassword=<password>
   keyPassword=<password>
   keyAlias=my-key-alias
   storeFile=../my-release-key.jks
   ```

3. **Update `android/app/build.gradle`:**
   ```gradle
   ...
   android {
       ...
       signingConfigs {
           release {
               def keystorePropertiesFile = rootProject.file("key.properties")
               def keystoreProperties = new Properties()
               keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
               storeFile file(keystoreProperties['storeFile'])
               storePassword keystoreProperties['storePassword']
               keyAlias keystoreProperties['keyAlias']
               keyPassword keystoreProperties['keyPassword']
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled true
               proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

4. **Build release APK:**
   ```bash
   npm run android:build:release
   ```

## App Configuration

- **App ID**: `com.ecobuymotherboard.vendor`
- **App Name**: EcoBuy Vendor
- **Min SDK**: 23 (Android 6.0)
- **Target SDK**: 35 (Android 14)
- **Version**: 1.0.0

## Support

If you encounter issues:
1. Check ADB connection: `npm run android:fix-adb`
2. Clean and rebuild: `npm run android:clean && npm run android:build`
3. Check logs: `npm run android:logcat`
4. Open in Android Studio: `npm run cap:android`




