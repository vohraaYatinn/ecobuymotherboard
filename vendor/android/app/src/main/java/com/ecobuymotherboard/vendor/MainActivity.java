package com.ecobuymotherboard.vendor;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register our custom plugin
        registerPlugin(OrderAlertPlugin.class);
        
        super.onCreate(savedInstanceState);
        
        // Handle intent if app was opened from notification
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null) {
            String navigateTo = intent.getStringExtra("navigateTo");
            String orderId = intent.getStringExtra("orderId");
            
            Log.d(TAG, "handleIntent - navigateTo: " + navigateTo + ", orderId: " + orderId);
            
            if (navigateTo != null) {
                // Stop the alert when app is opened
                OrderAlertService.stopOrderAlert(this);

                // Build a safe in-app path (no trailing slash needed)
                String url = "/" + navigateTo;
                if (orderId != null && !orderId.isEmpty()) {
                    url += "?orderId=" + Uri.encode(orderId);
                }

                navigateWebViewWhenReady(url, 0);
            }
        }
    }

    /**
     * When the app is cold-started from a notification, the WebView/JS context may not be ready
     * yet. We retry a few times so navigation actually takes effect instead of falling back to
     * the default splash redirect (which sends users to /dashboard).
     */
    private void navigateWebViewWhenReady(String path, int attempt) {
        final int maxAttempts = 20; // ~5 seconds total with 250ms delay
        final int delayMs = 250;

        if (attempt > maxAttempts) {
            Log.w(TAG, "navigateWebViewWhenReady: giving up after " + attempt + " attempts, path=" + path);
            return;
        }

        if (getBridge() == null || getBridge().getWebView() == null) {
            mainHandler.postDelayed(() -> navigateWebViewWhenReady(path, attempt + 1), delayMs);
            return;
        }

        final String jsPath = path.replace("'", "\\'");
        // Set a flag in localStorage to indicate native navigation is happening
        // This helps the splash screen know not to redirect
        final String setFlagJs = "localStorage.setItem('nativeNavigationPending', 'true'); localStorage.setItem('nativeNavigationPath', '" + jsPath.replace("'", "\\'") + "');";
        final String navigateJs = "window.location.href='" + jsPath + "'";

        mainHandler.post(() -> {
            try {
                Log.d(TAG, "navigateWebViewWhenReady attempt " + attempt + " -> " + path);
                // First set the flag, then navigate
                // Use evaluateJavascript when available; it's more reliable than loadUrl("javascript:...") on some devices
                getBridge().getWebView().evaluateJavascript(setFlagJs, (result) -> {
                    // After setting flag, navigate
                    getBridge().getWebView().evaluateJavascript(navigateJs, null);
                });
            } catch (Exception e) {
                Log.w(TAG, "navigateWebViewWhenReady evaluateJavascript failed (attempt " + attempt + "): " + e.getMessage());
                // Retry on failure
                mainHandler.postDelayed(() -> navigateWebViewWhenReady(path, attempt + 1), delayMs);
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        // Optionally stop alert when app comes to foreground
        // Uncomment if you want alert to stop when app is opened
        // OrderAlertService.stopOrderAlert(this);
    }
}
