package com.ecobuymotherboard.vendor;

import android.content.Intent;
import android.util.Log;

import androidx.annotation.NonNull;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Custom Firebase Messaging Service to handle push notifications
 * Triggers continuous alert sound for new order notifications
 * This service handles notifications even when app is closed/killed
 */
public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "MyFirebaseMsgService";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        Log.d(TAG, "From: " + remoteMessage.getFrom());
        Log.d(TAG, "Message received - app state: " + (isAppInForeground() ? "foreground" : "background/killed"));

        // Get notification data
        Map<String, String> data = remoteMessage.getData();
        RemoteMessage.Notification notification = remoteMessage.getNotification();

        String title = "New Order!";
        String message = "You have a new order to accept";
        String type = data.get("type");
        String orderId = data.get("orderId");

        // Get title and body from notification or data
        // Priority: data payload > notification payload
        if (data.containsKey("title")) {
            title = data.get("title");
        } else if (notification != null && notification.getTitle() != null) {
            title = notification.getTitle();
        }
        
        if (data.containsKey("body")) {
            message = data.get("body");
        } else if (data.containsKey("message")) {
            message = data.get("message");
        } else if (notification != null && notification.getBody() != null) {
            message = notification.getBody();
        }

        Log.d(TAG, "Type: " + type);
        Log.d(TAG, "Title: " + title);
        Log.d(TAG, "Message: " + message);
        Log.d(TAG, "OrderId: " + orderId);

        // Check if this is a new order notification that requires alert
        if (isNewOrderNotification(type, title)) {
            Log.d(TAG, "Starting continuous alert for new order (app may be closed)");
            // Start the alert service which will create foreground notification and play continuous sound
            // This works even when app is closed because it's a foreground service
            OrderAlertService.startOrderAlert(this, title, message, orderId);
        } else {
            Log.d(TAG, "Regular notification, not starting alert");
            // For other notifications, let the default handler show the notification
            // The Capacitor Push Notifications plugin will handle these
        }
    }

    /**
     * Check if app is currently in foreground
     * This is approximate - service always starts regardless
     */
    private boolean isAppInForeground() {
        // Simple check - if we're here, the service is running
        // The OrderAlertService will work regardless of app state
        return true;
    }

    /**
     * Check if this notification is for a new order that requires continuous alert
     */
    private boolean isNewOrderNotification(String type, String title) {
        // Check by type
        if (type != null) {
            String typeLower = type.toLowerCase();
            if (typeLower.equals("new_order_available") || 
                typeLower.equals("order_placed") ||
                typeLower.equals("new_order")) {
                return true;
            }
        }
        
        // Check by title as fallback
        if (title != null) {
            String titleLower = title.toLowerCase();
            if (titleLower.contains("new order") || 
                titleLower.contains("order available")) {
                return true;
            }
        }
        
        return false;
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM token: " + token);
        // The Capacitor Push Notifications plugin handles token registration
        // We don't need to do anything special here
    }

    @Override
    public void onDeletedMessages() {
        super.onDeletedMessages();
        Log.d(TAG, "onDeletedMessages called");
    }
}




