# Firebase Push Notifications Troubleshooting Guide

## Issue: "Push notifications are not available" Error

Even though Firebase credentials are in `.env`, the error persists.

## Solution Steps

### 1. Verify Credentials Are Loaded

Run the check script:
```bash
cd backend
npm run check:firebase
```

This will show:
- ✅ Which credentials are found
- ❌ Which credentials are missing
- Private key format validation

### 2. Check Server Logs

When you start the server, you should see:
```
🔍 [Firebase Admin] Checking credentials...
   FIREBASE_PROJECT_ID: ✅ Found
   FIREBASE_CLIENT_EMAIL: ✅ Found
   FIREBASE_PRIVATE_KEY: ✅ Found
✅ [Firebase Admin] Firebase Admin SDK initialized successfully
✅ [Firebase Admin] Firebase Messaging service initialized
```

If you see ❌ Missing, the credentials aren't being loaded.

### 3. Restart the Server

**IMPORTANT**: After adding or modifying `.env` file, you MUST restart the server:

```bash
# Stop the server (Ctrl+C)
# Then restart:
cd backend
npm start
# or
npm run dev
```

### 4. Check .env File Location

The `.env` file must be in the `backend/` directory:
```
backend/
  ├── .env          ← Must be here
  ├── server.js
  ├── config/
  └── ...
```

### 5. Verify .env File Format

Your `.env` file should look like:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
```

**Important Notes:**
- `FIREBASE_PRIVATE_KEY` must include the full key with `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- If the key has `\n` in it, keep them as `\n` (the code will convert them)
- The key should be in quotes if it contains special characters

### 6. Test Firebase Connection

Use the test endpoint (requires admin authentication):
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://192.168.1.36:5000/api/push-notifications/test
```

This will show:
- Which credentials are loaded
- Whether messaging is initialized
- Any initialization errors

### 7. Common Issues

#### Issue: Credentials in .env but not loaded
**Solution**: 
- Make sure `.env` is in `backend/` directory
- Restart the server after adding credentials
- Check for typos in variable names

#### Issue: Private key format error
**Solution**:
- Ensure the key includes `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Keep `\n` characters in the key (don't replace with actual newlines)
- Wrap the entire key in quotes if needed

#### Issue: "Firebase Admin SDK not initialized" but credentials exist
**Solution**:
- Check server logs for initialization errors
- The code now attempts to re-initialize automatically
- If that fails, restart the server

### 8. Debug Endpoint

Added `/api/push-notifications/test` endpoint that shows:
- Which credentials are present
- Whether Firebase is initialized
- Detailed status information

## Automatic Re-initialization

The code now automatically attempts to re-initialize Firebase when:
- Credentials are present but messaging is null
- A push notification is attempted

This means you don't always need to restart the server if credentials were added after startup.

## Still Not Working?

1. **Check server logs** - Look for Firebase initialization messages
2. **Run check script** - `npm run check:firebase`
3. **Test endpoint** - Use `/api/push-notifications/test`
4. **Verify credentials** - Make sure all three are correct
5. **Restart server** - Always restart after changing `.env`

## Expected Behavior

When working correctly, you should see in server logs:
```
🔍 [Firebase Admin] Checking credentials...
   FIREBASE_PROJECT_ID: ✅ Found
   FIREBASE_CLIENT_EMAIL: ✅ Found
   FIREBASE_PRIVATE_KEY: ✅ Found
✅ [Firebase Admin] Firebase Admin SDK initialized successfully
   Project ID: your-project-id
✅ [Firebase Admin] Firebase Messaging service initialized
```

And push notifications should work without errors.



