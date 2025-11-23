#!/bin/bash

echo "🔧 Fixing ADB connection issues..."

echo "1️⃣ Killing ADB server..."
adb kill-server 2>/dev/null || true

echo "2️⃣ Starting ADB server..."
adb start-server

echo "3️⃣ Checking devices..."
adb devices

echo "4️⃣ Restarting ADB in root mode (if device is rooted)..."
adb root 2>/dev/null || echo "⚠️  Root mode not available (this is normal for non-rooted devices)"

echo "5️⃣ Waiting for device..."
adb wait-for-device

echo "6️⃣ Final device check..."
DEVICES=$(adb devices | grep -v "List" | grep "device" | wc -l | tr -d ' ')

if [ "$DEVICES" -gt "0" ]; then
    echo "✅ ADB is working correctly!"
    echo "📱 Connected devices:"
    adb devices | grep -v "List"
else
    echo "❌ No devices found."
    echo ""
    echo "💡 Troubleshooting steps:"
    echo "   1. Make sure USB debugging is enabled on your device"
    echo "   2. Check USB cable connection"
    echo "   3. Accept USB debugging authorization on device"
    echo "   4. For emulator: Make sure it's running in Android Studio"
    echo ""
    echo "   Enable USB debugging:"
    echo "   Settings > About Phone > Tap 'Build Number' 7 times"
    echo "   Settings > Developer Options > Enable 'USB Debugging'"
fi




