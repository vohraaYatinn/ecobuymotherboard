#!/bin/bash

echo "🔍 Checking build requirements..."

# Check Java
echo ""
echo "1️⃣ Checking Java..."
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}')
    echo "   ✅ Java found: $JAVA_VERSION"
else
    echo "   ❌ Java not found!"
    echo ""
    echo "   Install Java JDK 17+:"
    echo "   macOS: brew install openjdk@17"
    echo "   Linux: sudo apt install openjdk-17-jdk"
    echo "   Windows: Download from https://adoptium.net/"
    exit 1
fi

# Check Android SDK
echo ""
echo "2️⃣ Checking Android SDK..."
if [ -d "$ANDROID_HOME" ] || [ -d "$HOME/Library/Android/sdk" ]; then
    SDK_PATH="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
    echo "   ✅ Android SDK found at: $SDK_PATH"
else
    echo "   ⚠️  Android SDK not found"
    echo "   Set ANDROID_HOME or install Android Studio"
fi

# Check ADB
echo ""
echo "3️⃣ Checking ADB..."
if command -v adb &> /dev/null; then
    ADB_VERSION=$(adb version | head -1)
    echo "   ✅ ADB found: $ADB_VERSION"
else
    echo "   ⚠️  ADB not found"
    echo "   Install Android SDK Platform-Tools or Android Studio"
fi

# Check Gradle
echo ""
echo "4️⃣ Checking Gradle..."
if [ -f "android/gradlew" ]; then
    echo "   ✅ Gradle wrapper found"
else
    echo "   ❌ Gradle wrapper not found"
    echo "   Run: npx cap add android"
    exit 1
fi

echo ""
echo "✅ Requirements check complete!"




