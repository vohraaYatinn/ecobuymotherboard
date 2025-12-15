#!/bin/bash
# Script to automatically update the API URL with current IP address

# Get current IP address
CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$CURRENT_IP" ]; then
    echo "❌ Could not detect IP address"
    exit 1
fi

# Update .env.local file
echo "NEXT_PUBLIC_API_URL=http://${CURRENT_IP}:5000" > .env.local

echo "✅ Updated API URL to: http://${CURRENT_IP}:5000"
echo ""
echo "⚠️  Please restart your Next.js dev server for changes to take effect"
echo "   Run: npm run dev (or pnpm dev)"










