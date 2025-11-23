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
DEVICES=$(adb devices | grep -v "List" | grep "device" | wc -l | tr -d ' ')

if [ "$DEVICES" -eq "0" ]; then
    echo "❌ No devices found. Please connect an Android device or start an emulator."
    echo "💡 To start an emulator:"
    echo "   - Open Android Studio"
    echo "   - Tools > Device Manager"
    echo "   - Click Play on an emulator"
    exit 1
fi

echo "✅ Device found!"

echo "📦 Installing APK..."
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

echo "🚀 Launching app..."
adb shell am start -n com.ecobuymotherboard.vendor/.MainActivity

echo "✅ App launched successfully!"




