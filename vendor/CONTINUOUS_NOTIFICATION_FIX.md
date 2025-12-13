# Continuous Notification Ringing Fix - Works When App is Closed

## Problem
Continuous notification ringing for new orders only worked when the app was open. When the app was closed or killed, the ringing didn't trigger.

## Root Cause
When Android receives a push notification with both `notification` and `data` payloads while the app is in the background or closed, Android automatically displays the notification system tray but **does NOT call** `onMessageReceived()` in the custom Firebase Messaging Service. This means the `OrderAlertService` never starts, so no continuous ringing occurs.

## Solution
Modified the system to send **data-only** messages to Android devices for new order alerts. This ensures that `onMessageReceived()` is **always called**, even when the app is completely closed or killed.

## Changes Made

### 1. Backend (`backend/routes/pushNotifications.js`)
- **Updated `sendPushNotificationToAllVendors()` function**:
  - Separates tokens by platform (Android, iOS, Other)
  - For **Android devices** and **new order alerts**: Sends data-only messages (no `notification` payload)
  - For **iOS devices**: Continues sending notification + data (iOS handles it differently)
  - Includes `title` and `body` in the data payload so they're available even without notification payload

### 2. Android Firebase Messaging Service (`vendor/android/app/src/main/java/com/ecobuymotherboard/vendor/MyFirebaseMessagingService.java`)
- **Enhanced `onMessageReceived()` method**:
  - Improved logging to track when messages are received
  - Better handling of data payload priority (data payload values override notification payload)
  - Always starts `OrderAlertService` for new order notifications, regardless of app state

### 3. Android Alert Service (`vendor/android/app/src/main/java/com/ecobuymotherboard/vendor/OrderAlertService.java`)
- **Added robust channel creation**:
  - Ensures notification channel is created before use (handles case when app was killed)
  - Uses app icon instead of system alert icon for better branding

## How It Works Now

### When App is Open:
1. Push notification arrives with data-only payload
2. `MyFirebaseMessagingService.onMessageReceived()` is called
3. Service detects it's a new order notification
4. Starts `OrderAlertService` as foreground service
5. Continuous ringing begins immediately

### When App is Closed/Killed:
1. Push notification arrives with data-only payload
2. Android **always calls** `onMessageReceived()` for data-only messages (unlike notification+data messages)
3. `MyFirebaseMessagingService.onMessageReceived()` is called
4. Service detects it's a new order notification
5. Starts `OrderAlertService` as foreground service
6. Service creates notification channel and foreground notification
7. Continuous ringing begins even though app is closed

## Key Technical Details

### Data-Only Messages
- **Android**: When a message has only `data` payload (no `notification`), Android always delivers it to the app's `onMessageReceived()` method
- **iOS**: Continues to use notification + data format as iOS handles it differently

### Foreground Service
- `OrderAlertService` is a foreground service that:
  - Can run even when app is closed
  - Creates a persistent notification
  - Plays continuous alarm sound
  - Vibrates continuously
  - Shows full-screen intent on lock screen

### Notification Channel
- High importance channel
- Bypasses Do Not Disturb
- Visible on lock screen
- Custom vibration pattern

## Testing

To test the fix:

1. **Build and install the updated Android app**
2. **Close the app completely** (swipe away from recent apps)
3. **Place a new order** from the ecommerce app
4. **Expected behavior**:
   - Push notification should arrive
   - Continuous ringing should start immediately
   - Notification should appear in system tray
   - Ringing continues until vendor dismisses or accepts order

## Platform-Specific Behavior

- **Android**: Receives data-only messages for new orders → Always triggers continuous ringing
- **iOS**: Receives notification + data messages → Handled by iOS notification system
- **Web**: Uses Firebase messaging → Handled by web push notification system

## Notes

- The fix only applies to new order alerts (`new_order_available`, `order_placed`, `new_order` types)
- Other notifications still use the regular notification + data format
- iOS behavior is unchanged (iOS handles notifications differently and doesn't have this issue)
- The continuous ringing will work reliably even after the device restarts (as long as the app was previously installed)












