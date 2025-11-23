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
echo "APK location: android/app/build/outputs/apk/debug/app-debug.apk"




