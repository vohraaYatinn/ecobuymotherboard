# Android App API Configuration

This guide explains how to configure the backend API URL for Android app development.

## Backend Server Configuration

The backend server is configured to accept requests from your local network IP address: **http://192.168.1.36:5000**

### CORS Configuration

The backend server (`backend/server.js`) is configured to:
- Accept requests from local network IPs (192.168.x.x, 10.x.x.x, 172.x.x.x)
- Bind to `0.0.0.0` to allow network access (not just localhost)
- Allow requests with no origin (for mobile apps)

### Starting the Backend Server

The server will automatically bind to `0.0.0.0:5000`, making it accessible from:
- Local: `http://localhost:5000`
- Network: `http://192.168.1.36:5000`

```bash
cd backend
npm start
# or
npm run dev
```

You should see:
```
🚀 Server is running on http://0.0.0.0:5000
🌐 Network access: http://192.168.1.36:5000
📍 Local access: http://localhost:5000
```

## Frontend/Vendor App Configuration

### Default API URL

The vendor app is configured to use `http://192.168.1.36:5000` as the default API URL. This is set in:
- `vendor/lib/api-config.ts` - Centralized API configuration

### Environment Variable (Optional)

You can override the API URL by creating a `.env.local` file in the `vendor/` directory:

```env
NEXT_PUBLIC_API_URL=http://192.168.1.36:5000
```

**Note:** If your IP address changes, update it in:
1. `vendor/lib/api-config.ts` (default fallback)
2. `.env.local` (if you're using it)

## Finding Your IP Address

### macOS/Linux:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Windows:
```bash
ipconfig
```

Look for your local network IP (usually starts with 192.168.x.x or 10.x.x.x)

## Android App Testing

1. **Ensure backend is running** on `http://192.168.1.36:5000`
2. **Ensure your Android device/emulator is on the same network**
3. **Build and run the Android app:**
   ```bash
   cd vendor
   npm run build
   npx cap sync android
   npx cap open android
   ```

4. **Test API connectivity:**
   - The app should automatically connect to `http://192.168.1.36:5000`
   - Check console logs for any connection errors
   - Verify API calls work in the app

## Troubleshooting

### Cannot connect from Android device

1. **Check firewall:** Ensure your firewall allows connections on port 5000
2. **Check network:** Ensure Android device is on the same WiFi network
3. **Check IP address:** Verify your machine's IP hasn't changed
4. **Test from browser:** Try accessing `http://192.168.1.36:5000/api/health` from your Android device's browser

### CORS errors

The backend is configured to allow all local network IPs. If you still see CORS errors:
1. Check that the backend server is running
2. Verify the IP address in `backend/server.js` matches your network IP
3. Check browser/device console for specific error messages

### API calls failing

1. **Check backend logs** for incoming requests
2. **Verify API URL** in `vendor/lib/api-config.ts`
3. **Test API endpoint** directly: `http://192.168.1.36:5000/api/health`
4. **Check network security config** in Android (already configured to allow HTTP)

## Production Deployment

For production, update:
1. `backend/server.js` - Set specific allowed origins
2. `vendor/lib/api-config.ts` - Use production API URL
3. Use HTTPS instead of HTTP
4. Update Android network security config for HTTPS



