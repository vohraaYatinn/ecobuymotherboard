# Frontend IP Address Configuration

## Issue
The frontend was trying to connect to `api.elecobuy.com` but the server IP changed to `api.elecobuy.com`, causing `ERR_CONNECTION_TIMED_OUT` errors.

## Solution

### Option 1: Use Environment Variable (Recommended)
Create a `.env.local` file in the `ecommerce` directory:

```bash
cd ecommerce
echo "NEXT_PUBLIC_API_URL=https://api.elecobuy.com" > .env.local
```

Then restart your Next.js dev server.

### Option 2: Find Your Current IP
If your IP changes frequently, you can find it with:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1
```

Or on macOS:
```bash
ipconfig getifaddr en0
```

### Option 3: Use localhost (If running on same machine)
If both frontend and backend are on the same machine, you can use:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Quick Fix Script

Create a script to automatically detect and update the IP:

```bash
#!/bin/bash
# save as update-api-url.sh

CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
echo "NEXT_PUBLIC_API_URL=http://${CURRENT_IP}:5000" > ecommerce/.env.local
echo "Updated API URL to: http://${CURRENT_IP}:5000"
```

## Verification

After updating, verify the connection:

```bash
curl https://api.elecobuy.com/api/health
```

Should return: `{"status":"OK","message":"Server is running"}`

## Notes

- `.env.local` is gitignored by default, so it won't be committed
- Restart the Next.js dev server after changing `.env.local`
- The IP address may change when you reconnect to WiFi or change networks
- For production, use a fixed domain name or IP address










