# FCM Token Implementation - Complete

## Overview
This document describes the complete FCM (Firebase Cloud Messaging) token implementation for the vendor app, including token registration, storage, and debugging.

## Implementation Summary

### 1. OTP Page (`app/otp/page.tsx`)
- **FCM Token Retrieval**: Automatically gets FCM token on page load
- **Native Platforms**: Uses Capacitor Push Notifications API
- **Web Platforms**: Falls back to localStorage (handled by usePushNotifications hook)
- **Token Storage**: Saves token to `localStorage` as `vendorFcmToken`
- **Token Sending**: Sends token to backend during OTP verification

**Key Features:**
- Requests push notification permissions automatically
- Listens for token registration events
- Stores token in both state and localStorage
- Sends token during OTP verification with platform and device info

### 2. Dashboard (`app/dashboard/page.tsx`)
- **FCM Token Debug Section**: Shows all registered tokens
- **Auto-refresh**: Automatically checks for tokens after login
- **Manual Refresh**: Button to manually refresh token list
- **Token Display**: Shows:
  - LocalStorage token (if exists)
  - Vendor User tokens (from backend)
  - Vendor tokens (from backend, if vendor is linked)
  - Platform, device model, and last seen time for each token

**Key Features:**
- Fetches vendor profile on mount
- Automatically sends unregistered tokens to backend
- Refreshes token list after push notification registration
- Displays full token values for debugging

### 3. Push Notifications Hook (`hooks/use-push-notifications.ts`)
- **Token Registration**: Handles both native and web platforms
- **Token Storage**: Saves tokens to localStorage
- **Backend Sync**: Automatically sends tokens to backend when received
- **Token Management**: Keeps track of registered tokens

**Key Features:**
- Native: Uses Capacitor Push Notifications
- Web: Uses Firebase Messaging (if configured)
- Saves tokens to localStorage for OTP verification
- Sends tokens to `/api/push-notifications/vendor/register-token`

### 4. Backend Implementation

#### OTP Verification (`backend/routes/vendorAuth.js`)
- **Token Storage**: Saves FCM token during OTP verification
- **Vendor User**: Stores token in VendorUser model
- **Vendor Model**: Also stores token in Vendor model (if linked or found by phone)
- **Debug Logging**: Comprehensive logging of token operations

#### Profile Endpoint (`backend/routes/vendorAuth.js`)
- **GET `/api/vendor-auth/profile`**: Returns vendor profile with all FCM tokens
- **Token Display**: Includes both VendorUser and Vendor tokens

#### Update Token Endpoint (`backend/routes/vendorAuth.js`)
- **POST `/api/vendor-auth/update-fcm-token`**: Updates FCM token after login
- **Auto-sync**: Dashboard automatically calls this if token exists but isn't registered

## Flow Diagram

```
1. User opens OTP page
   ↓
2. OTP page requests push notification permissions
   ↓
3. Capacitor/Firebase returns FCM token
   ↓
4. Token saved to localStorage and state
   ↓
5. User verifies OTP
   ↓
6. Token sent to backend during OTP verification
   ↓
7. Backend saves token to VendorUser and Vendor models
   ↓
8. User lands on dashboard
   ↓
9. Dashboard fetches vendor profile (shows tokens in debug section)
   ↓
10. Dashboard checks if token needs to be registered
    ↓
11. If not registered, sends token via update-fcm-token endpoint
    ↓
12. Token now visible in debug section
```

## Debug Features

### Dashboard Debug Section
- **Location**: Top of dashboard, collapsible card
- **Shows**:
  - LocalStorage token (if exists)
  - All VendorUser tokens with metadata
  - All Vendor tokens with metadata (if vendor is linked)
- **Actions**:
  - Refresh button to reload tokens
  - Show/Hide toggle

### Console Logging
- **OTP Page**: Logs token retrieval and sending
- **Dashboard**: Logs token fetching and registration
- **Backend**: Logs token saving operations
- **Push Notifications Hook**: Logs registration events

## Testing Checklist

- [ ] OTP page requests push notification permissions
- [ ] FCM token is received and stored in localStorage
- [ ] Token is sent during OTP verification
- [ ] Backend saves token to VendorUser model
- [ ] Backend saves token to Vendor model (if linked)
- [ ] Dashboard shows tokens in debug section
- [ ] Refresh button updates token list
- [ ] Unregistered tokens are automatically sent after login
- [ ] Console shows appropriate debug messages

## Troubleshooting

### Token Not Showing in Dashboard
1. Check browser/device console for errors
2. Verify push notification permissions are granted
3. Check if token exists in localStorage: `localStorage.getItem('vendorFcmToken')`
4. Click refresh button in debug section
5. Check backend logs for token saving operations

### Token Not Being Sent During OTP
1. Check OTP page console for token retrieval
2. Verify token exists in state or localStorage
3. Check network tab for verify-otp request payload
4. Verify backend is receiving and saving token

### Token Not Saved to Backend
1. Check backend console logs for token operations
2. Verify vendor user exists and is linked to vendor
3. Check database for pushTokens array in VendorUser/Vendor models
4. Verify API endpoint is working: `/api/vendor-auth/profile`

## API Endpoints

### POST `/api/vendor-auth/verify-otp`
- **Body**: `{ fcmToken, platform, deviceModel, appVersion, ... }`
- **Action**: Saves FCM token during login

### GET `/api/vendor-auth/profile`
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: Vendor profile with all FCM tokens

### POST `/api/vendor-auth/update-fcm-token`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ fcmToken, platform, deviceModel, appVersion }`
- **Action**: Updates FCM token after login

### POST `/api/push-notifications/vendor/register-token`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ fcmToken, platform, deviceModel, appVersion }`
- **Action**: Registers FCM token (called by usePushNotifications hook)

## Environment Variables

No additional environment variables required for basic functionality. For web push notifications, configure Firebase in `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key
```

## Notes

- Tokens are stored in both VendorUser and Vendor models for redundancy
- Maximum 10 tokens per user/vendor (oldest removed)
- Tokens are deduplicated (same token not stored twice)
- Platform detection: Android, iOS, or Web
- Device model extracted from user agent
- All operations are logged for debugging



