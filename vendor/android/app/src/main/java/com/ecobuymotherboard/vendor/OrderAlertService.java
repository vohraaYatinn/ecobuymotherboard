package com.ecobuymotherboard.vendor;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.ecobuymotherboard.vendor.R;

/**
 * Foreground Service that plays continuous alert sound for new orders
 * Similar to gate approval apps - rings until user accepts or dismisses
 */
public class OrderAlertService extends Service {
    private static final String TAG = "OrderAlertService";
    public static final String CHANNEL_ID = "order_alert_channel";
    public static final String ACTION_START = "com.ecobuymotherboard.vendor.START_ALERT";
    public static final String ACTION_STOP = "com.ecobuymotherboard.vendor.STOP_ALERT";
    public static final int NOTIFICATION_ID = 1001;

    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private boolean isPlaying = false;

    // Static reference to check if service is running
    public static boolean isServiceRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "OrderAlertService created");
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            Log.d(TAG, "onStartCommand action: " + action);

            if (ACTION_START.equals(action)) {
                String title = intent.getStringExtra("title");
                String message = intent.getStringExtra("message");
                String orderId = intent.getStringExtra("orderId");
                startAlert(title, message, orderId);
            } else if (ACTION_STOP.equals(action)) {
                stopAlert();
            }
        }
        return START_NOT_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Order Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alerts for new orders requiring attention");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.setBypassDnd(true); // Bypass Do Not Disturb
            
            // Don't set sound on channel - we handle it manually for looping
            channel.setSound(null, null);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private void startAlert(String title, String message, String orderId) {
        Log.d(TAG, "startAlert - Starting alert notification");
        Log.d(TAG, "startAlert - Title: " + title);
        Log.d(TAG, "startAlert - Message: " + message);
        Log.d(TAG, "startAlert - OrderId: " + orderId);
        Log.d(TAG, "startAlert - IsPlaying: " + isPlaying);
        
        if (isPlaying) {
            Log.d(TAG, "startAlert - ⚠️ Alert already playing, returning");
            return;
        }

        // Ensure notification channel exists (in case app was killed)
        createNotificationChannel();
        Log.d(TAG, "startAlert - Notification channel ensured");

        isServiceRunning = true;
        isPlaying = true;
        Log.d(TAG, "startAlert - Service state updated (running=true, playing=true)");

        // Create intent to open app when notification is tapped
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openAppIntent.putExtra("navigateTo", "accept-orders");
        openAppIntent.putExtra("orderId", orderId);
        
        Log.d(TAG, "startAlert - Created Intent for MainActivity:");
        Log.d(TAG, "startAlert -   navigateTo: accept-orders");
        Log.d(TAG, "startAlert -   orderId: " + orderId);
        Log.d(TAG, "startAlert -   Flags: FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_CLEAR_TOP");
        
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                this, 0, openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        Log.d(TAG, "startAlert - Created PendingIntent for notification click");

        // Create intent for "Accept" action
        Intent acceptIntent = new Intent(this, OrderAlertService.class);
        acceptIntent.setAction(ACTION_STOP);
        PendingIntent acceptPendingIntent = PendingIntent.getService(
                this, 1, acceptIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Create intent for "Dismiss" action
        Intent dismissIntent = new Intent(this, OrderAlertService.class);
        dismissIntent.setAction(ACTION_STOP);
        PendingIntent dismissPendingIntent = PendingIntent.getService(
                this, 2, dismissIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Build the notification
        Log.d(TAG, "startAlert - Building notification...");
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title != null ? title : "New Order!")
                .setContentText(message != null ? message : "You have a new order to accept")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true) // Can't be dismissed by swiping
                .setAutoCancel(false)
                .setContentIntent(openAppPendingIntent)
                .addAction(android.R.drawable.ic_menu_view, "View Order", openAppPendingIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Dismiss", dismissPendingIntent)
                .setFullScreenIntent(openAppPendingIntent, true); // Show on lock screen

        Log.d(TAG, "startAlert - Notification built with:");
        Log.d(TAG, "startAlert -   ContentIntent: MainActivity (navigateTo=accept-orders)");
        Log.d(TAG, "startAlert -   View Order action: MainActivity (navigateTo=accept-orders)");
        Log.d(TAG, "startAlert -   FullScreenIntent: enabled");

        // Start as foreground service
        Log.d(TAG, "startAlert - Starting foreground service with notification ID: " + NOTIFICATION_ID);
        startForeground(NOTIFICATION_ID, builder.build());
        Log.d(TAG, "startAlert - ✅ Foreground service started");

        // Start playing sound
        Log.d(TAG, "startAlert - Starting sound...");
        startSound();

        // Start vibration
        Log.d(TAG, "startAlert - Starting vibration...");
        startVibration();

        Log.d(TAG, "startAlert - ✅ Alert fully started - notification should be visible");
    }

    private void startSound() {
        try {
            // Try to use custom sound from raw folder
            Uri soundUri;
            int rawResourceId = getResources().getIdentifier("notification_sound", "raw", getPackageName());
            
            if (rawResourceId != 0) {
                soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + rawResourceId);
            } else {
                // Fallback to default alarm sound
                soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (soundUri == null) {
                    soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                }
            }

            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(this, soundUri);
            
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            mediaPlayer.setAudioAttributes(audioAttributes);
            
            mediaPlayer.setLooping(true); // Loop continuously
            mediaPlayer.setVolume(1.0f, 1.0f);
            mediaPlayer.prepare();
            mediaPlayer.start();
            
            Log.d(TAG, "Sound started");
        } catch (Exception e) {
            Log.e(TAG, "Error starting sound: " + e.getMessage());
        }
    }

    private void startVibration() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vibratorManager = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vibrator = vibratorManager.getDefaultVibrator();
            } else {
                vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            }

            if (vibrator != null && vibrator.hasVibrator()) {
                // Vibration pattern: wait 0ms, vibrate 500ms, wait 200ms, vibrate 500ms, repeat
                long[] pattern = {0, 500, 200, 500, 200, 500, 500};
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0)); // 0 = repeat from index 0
                } else {
                    vibrator.vibrate(pattern, 0);
                }
                Log.d(TAG, "Vibration started");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting vibration: " + e.getMessage());
        }
    }

    private void stopAlert() {
        Log.d(TAG, "Stopping alert");
        isPlaying = false;
        isServiceRunning = false;

        // Stop sound
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
                mediaPlayer = null;
                Log.d(TAG, "Sound stopped");
            } catch (Exception e) {
                Log.e(TAG, "Error stopping sound: " + e.getMessage());
            }
        }

        // Stop vibration
        if (vibrator != null) {
            try {
                vibrator.cancel();
                vibrator = null;
                Log.d(TAG, "Vibration stopped");
            } catch (Exception e) {
                Log.e(TAG, "Error stopping vibration: " + e.getMessage());
            }
        }

        // Stop foreground service
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopAlert();
        Log.d(TAG, "OrderAlertService destroyed");
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // Static method to start alert from anywhere
    public static void startOrderAlert(Context context, String title, String message, String orderId) {
        Intent intent = new Intent(context, OrderAlertService.class);
        intent.setAction(ACTION_START);
        intent.putExtra("title", title);
        intent.putExtra("message", message);
        intent.putExtra("orderId", orderId);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    // Static method to stop alert from anywhere
    public static void stopOrderAlert(Context context) {
        Intent intent = new Intent(context, OrderAlertService.class);
        intent.setAction(ACTION_STOP);
        context.startService(intent);
    }
}




