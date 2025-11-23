# Firebase Push Notifications Setup Guide

This guide will help you set up Firebase Cloud Messaging (FCM) for push notifications in the EcoBuy Vendor app.

## Prerequisites

1. A Firebase project (create one at [Firebase Console](https://console.firebase.google.com/))
2. Firebase project with Cloud Messaging enabled

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable Google Analytics (optional but recommended)

## Step 2: Add Android App to Firebase

1. In Firebase Console, click "Add app" and select Android
2. Enter package name: `com.ecobuymotherboard.vendor`
3. Download `google-services.json`
4. Place the file in: `vendor/android/app/google-services.json`

## Step 3: Add iOS App to Firebase (Optional)

1. In Firebase Console, click "Add app" and select iOS
2. Enter bundle ID: `com.ecobuymotherboard.vendor`
3. Download `GoogleService-Info.plist`
4. Place the file in: `vendor/ios/App/App/GoogleService-Info.plist`

## Step 4: Get Firebase Configuration

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click on the web app icon (`</>`) or create a web app
4. Copy the Firebase configuration object

## Step 5: Configure Environment Variables

Create a `.env.local` file in the `vendor` directory with the following:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key
```

## Step 6: Generate VAPID Key (for Web)

1. In Firebase Console, go to Project Settings
2. Click on "Cloud Messaging" tab
3. Scroll down to "Web configuration"
4. Under "Web Push certificates", click "Generate key pair"
5. Copy the key and add it to `NEXT_PUBLIC_FIREBASE_VAPID_KEY` in `.env.local`

## Step 7: Update Service Worker

Update `vendor/public/firebase-messaging-sw.js` with your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

## Step 8: Sync Capacitor

After adding `google-services.json`, sync Capacitor:

```bash
cd vendor
npm run cap:sync
```

## Step 9: Build and Test

### Android

```bash
npm run android:build
npm run android:install
```

### iOS (if configured)

```bash
npm run cap:ios
# Then build from Xcode
```

## Step 10: Test Push Notifications

### From Firebase Console

1. Go to Firebase Console > Cloud Messaging
2. Click "Send your first message"
3. Enter notification title and text
4. Select your app
5. Click "Review" and "Publish"

### From Backend

You can send notifications from your backend using the FCM token. The token will be logged in the console when the app registers for notifications.

## Troubleshooting

### Android Issues

1. **google-services.json not found**: Make sure the file is in `vendor/android/app/`
2. **Build errors**: Run `npm run cap:sync` after adding the file
3. **Notifications not received**: Check that the app has notification permissions

### Web Issues

1. **Service worker not registering**: Make sure the file is in the `public` directory
2. **Token not generated**: Check that VAPID key is set correctly
3. **Notifications not showing**: Check browser notification permissions

### iOS Issues

1. **GoogleService-Info.plist not found**: Make sure the file is in the correct location
2. **Push notifications not working**: You need to configure APNs certificates in Firebase Console

## Backend Integration

To send push notifications from your backend, you'll need to:

1. Store the FCM token when the app registers
2. Use Firebase Admin SDK to send notifications
3. Target specific tokens or topics

Example backend code (Node.js):

```javascript
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const message = {
  notification: {
    title: 'New Order',
    body: 'You have a new order to process',
  },
  data: {
    type: 'order',
    orderId: '12345',
  },
  token: 'fcm-token-here',
};

admin.messaging().send(message)
  .then((response) => {
    console.log('Successfully sent message:', response);
  })
  .catch((error) => {
    console.log('Error sending message:', error);
  });
```

## Security Notes

- Never commit `.env.local` or `google-services.json` to version control
- Add these files to `.gitignore`
- Use environment variables for all sensitive configuration
- Rotate API keys if they are exposed

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications Plugin](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)




