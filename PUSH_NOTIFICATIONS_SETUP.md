# Push Notifications Implementation Guide

This guide provides step-by-step instructions for setting up and using push notifications in the EcoBuy platform.

## Overview

Push notifications have been implemented for the vendor mobile app with an admin panel interface to send notifications. The system supports:
- **Vendor App**: Receives push notifications on Android, iOS, and Web platforms
- **Admin Panel**: Send push notifications to all vendors or specific vendors

## Architecture

1. **Vendor App** (`/vendor`): Mobile app built with Next.js and Capacitor
2. **Backend** (`/backend`): Node.js/Express API with Firebase Admin SDK
3. **Admin Panel** (`/ecommerce/app/admin`): Next.js admin interface

---

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable Google Analytics (optional but recommended)

### 1.2 Add Android App to Firebase

1. In Firebase Console, click "Add app" and select **Android**
2. Enter package name: `com.ecobuymotherboard.vendor`
3. Download `google-services.json`
4. Place the file in: `vendor/android/app/google-services.json`

### 1.3 Add iOS App to Firebase (Optional)

1. In Firebase Console, click "Add app" and select **iOS**
2. Enter bundle ID: `com.ecobuymotherboard.vendor`
3. Download `GoogleService-Info.plist`
4. Place the file in: `vendor/ios/App/App/GoogleService-Info.plist`

### 1.4 Get Firebase Web Configuration

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click on the web app icon (`</>`) or create a web app if you haven't
4. Copy the Firebase configuration object

### 1.5 Generate VAPID Key (for Web)

1. In Firebase Console, go to Project Settings
2. Click on "Cloud Messaging" tab
3. Scroll down to "Web configuration"
4. Under "Web Push certificates", click "Generate key pair"
5. Copy the key (you'll need this for vendor app)

### 1.6 Get Firebase Admin SDK Credentials

1. In Firebase Console, go to Project Settings
2. Click on "Service accounts" tab
3. Click "Generate new private key"
4. Download the JSON file
5. You'll need these values from the JSON:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters)

---

## Step 2: Backend Configuration

### 2.1 Environment Variables

Create or update `.env` file in `/backend` directory:

```env
# Firebase Admin SDK Credentials
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----\n"

# Other existing environment variables
PORT=5000
MONGODB_URI=your-mongodb-uri
JWT_SECRET=your-jwt-secret
# ... other variables
```

**Important**: 
- Keep the `\n` characters in `FIREBASE_PRIVATE_KEY`
- Wrap the private key in double quotes
- The private key should be on a single line with `\n` for newlines

### 2.2 Install Dependencies

The `firebase-admin` package has already been installed. If you need to reinstall:

```bash
cd backend
npm install firebase-admin
```

### 2.3 Verify Backend Setup

The following files have been created:

- ✅ `backend/config/firebase-admin.js` - Firebase Admin initialization
- ✅ `backend/routes/pushNotifications.js` - Push notification routes
- ✅ Updated `backend/server.js` - Added push notification routes

### 2.4 Test Backend

Start the backend server:

```bash
cd backend
npm run dev
```

You should see:
```
✅ Firebase Admin SDK initialized for push notifications
✅ Firebase Messaging service initialized
```

If you see warnings, check your environment variables.

---

## Step 3: Vendor App Configuration

### 3.1 Environment Variables

Create or update `.env.local` file in `/vendor` directory:

```env
# Firebase Web Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key

# Backend API URL
NEXT_PUBLIC_API_URL=http://192.168.1.43:5000
```

### 3.2 Update Service Worker

Update `vendor/public/firebase-messaging-sw.js` with your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
};
```

### 3.3 Update Firebase Config in Code

Update `vendor/lib/firebase.ts` - it already uses environment variables, so just ensure your `.env.local` has the correct values.

### 3.4 Sync Capacitor (After adding google-services.json)

```bash
cd vendor
npm run cap:sync
```

### 3.5 Build and Test Vendor App

#### For Android:

```bash
cd vendor
npm run build
npm run cap:sync
npm run cap:android
# Open Android Studio and build/run
```

#### For Web:

```bash
cd vendor
npm run dev
# Test in browser
```

### 3.6 Verify Token Registration

When a vendor user logs in:
1. The app will request push notification permissions
2. On permission granted, it will get an FCM token
3. The token will be automatically sent to the backend
4. Check backend logs for: `✅ FCM token registered for vendor user: ...`

---

## Step 4: Admin Panel Usage

### 4.1 Access Push Notifications Page

1. Login to admin panel at `/admin-login`
2. Navigate to **Push Notifications** in the sidebar
3. You'll see the push notification interface

### 4.2 Send Push Notification

#### Option 1: Send to All Vendors

1. Enter notification **Title** (required, max 100 characters)
2. Enter notification **Message** (required, max 500 characters)
3. Check "Send to all vendors with push tokens"
4. Click **Send Notification**

#### Option 2: Send to Specific Vendors

1. Uncheck "Send to all vendors with push tokens"
2. Select specific vendors from the list
3. Click **Select All** to select all vendors with tokens
4. Enter title and message
5. Click **Send Notification**

### 4.3 View Results

After sending, you'll see:
- Number of notifications sent
- Number of failures (if any)
- Number of vendors targeted
- Total devices reached

### 4.4 Vendor List Status

The vendor selection panel shows:
- ✅ Vendors with push tokens (can receive notifications)
- ⚠️ Vendors without push tokens (will not receive notifications)
- Token count per vendor (multiple devices)

---

## Step 5: Testing

### 5.1 Test Token Registration

1. Login to vendor app with a vendor account
2. Grant push notification permissions
3. Check backend logs for token registration
4. Verify in admin panel that vendor shows as having tokens

### 5.2 Test Push Notification

1. From admin panel, send a test notification
2. Check if vendor app receives the notification
3. Verify notification appears in vendor app notifications list

### 5.3 Test on Different Platforms

- **Android**: Build APK and test on device
- **iOS**: Build and test on device (requires Apple Developer account)
- **Web**: Test in browser with HTTPS (required for service workers)

---

## API Endpoints

### Backend Endpoints

#### Register FCM Token (Vendor)
```
POST /api/push-notifications/vendor/register-token
Headers: Authorization: Bearer <vendor-token>
Body: {
  fcmToken: string,
  platform: "android" | "ios" | "web" | "unknown",
  deviceModel: string,
  appVersion: string
}
```

#### Send Push Notification (Admin)
```
POST /api/push-notifications/admin/send
Headers: Authorization: Bearer <admin-token>
Body: {
  title: string,
  body: string,
  sendToAll?: boolean,
  vendorIds?: string[],
  data?: Record<string, any>
}
```

#### Get Vendors with Token Status (Admin)
```
GET /api/push-notifications/admin/vendors
Headers: Authorization: Bearer <admin-token>
```

---

## Troubleshooting

### Backend Issues

**Firebase Admin not initialized**
- Check environment variables in `.env`
- Ensure `FIREBASE_PRIVATE_KEY` has `\n` characters preserved
- Check Firebase service account has correct permissions

**Push notification sending fails**
- Verify Firebase Admin SDK is initialized
- Check backend logs for specific error messages
- Ensure vendor users have registered FCM tokens

### Vendor App Issues

**FCM token not generated**
- Check browser/app notification permissions
- Verify Firebase configuration in `.env.local`
- Check service worker is registered (for web)
- For Android: Ensure `google-services.json` is in correct location
- For iOS: Ensure `GoogleService-Info.plist` is in correct location

**Token not sent to backend**
- Check vendor is logged in
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check network requests in browser/device logs
- Ensure backend is running and accessible

**Notifications not received**
- Check device notification settings
- Verify app has notification permissions
- For web: Ensure HTTPS is used (service workers require HTTPS)
- Check Firebase Console for delivery status

### Admin Panel Issues

**Can't see vendors**
- Verify admin is logged in
- Check backend API is accessible
- Ensure vendors have logged in and registered tokens

**Sending fails**
- Check admin token is valid
- Verify Firebase Admin SDK is configured on backend
- Check backend logs for error details

---

## Files Changed/Added

### Backend
- ✅ `backend/config/firebase-admin.js` (NEW)
- ✅ `backend/routes/pushNotifications.js` (NEW)
- ✅ `backend/server.js` (UPDATED - added route)
- ✅ `backend/package.json` (UPDATED - added firebase-admin)

### Vendor App
- ✅ `vendor/hooks/use-push-notifications.ts` (UPDATED - sends token to backend)

### Admin Panel
- ✅ `ecommerce/components/admin/admin-push-notifications.tsx` (NEW)
- ✅ `ecommerce/app/admin/push-notifications/page.tsx` (NEW)
- ✅ `ecommerce/components/admin/admin-sidebar.tsx` (UPDATED - added menu item)

---

## Security Notes

1. **Never commit** `.env` or `.env.local` files to version control
2. **Never commit** `google-services.json` or `GoogleService-Info.plist` (unless using a test project)
3. **Rotate** Firebase credentials if exposed
4. **Use HTTPS** in production for all services
5. **Validate** admin tokens on backend endpoints

---

## Next Steps

1. ✅ Configure Firebase project and credentials
2. ✅ Update environment variables in backend and vendor app
3. ✅ Test token registration with vendor login
4. ✅ Test sending notifications from admin panel
5. ✅ Deploy to production (update environment variables accordingly)

---

## Support

For issues or questions:
1. Check Firebase Console for delivery status
2. Review backend logs for errors
3. Check vendor app console logs
4. Verify all environment variables are set correctly

---

**Implementation Complete!** 🎉

All code changes have been made. Follow the steps above to configure Firebase and start using push notifications.



