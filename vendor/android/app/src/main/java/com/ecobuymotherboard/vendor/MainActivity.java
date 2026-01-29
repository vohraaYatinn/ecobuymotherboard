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
        Log.d(TAG, "onCreate - App starting");
        
        // Register our custom plugin
        registerPlugin(OrderAlertPlugin.class);
        
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "onCreate - Super.onCreate() completed, handling intent");
        
        // Handle intent if app was opened from notification
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        Log.d(TAG, "onNewIntent - New intent received");
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        Log.d(TAG, "handleIntent - Starting intent handling");
        
        if (intent != null) {
            String navigateTo = intent.getStringExtra("navigateTo");
            String orderId = intent.getStringExtra("orderId");
            
            Log.d(TAG, "handleIntent - Intent extras:");
            Log.d(TAG, "handleIntent -   navigateTo: " + navigateTo);
            Log.d(TAG, "handleIntent -   orderId: " + orderId);
            
            if (navigateTo != null) {
                Log.d(TAG, "handleIntent - ✅ navigateTo found, stopping alert and preparing navigation");
                
                // Stop the alert when app is opened
                OrderAlertService.stopOrderAlert(this);
                Log.d(TAG, "handleIntent - Alert stopped");

                // Build a safe in-app path (no trailing slash needed)
                String url = "/" + navigateTo;
                if (orderId != null && !orderId.isEmpty()) {
                    url += "?orderId=" + Uri.encode(orderId);
                }

                Log.d(TAG, "handleIntent - Built URL: " + url);
                Log.d(TAG, "handleIntent - Calling navigateWebViewWhenReady()");
                
                navigateWebViewWhenReady(url, 0);
            } else {
                Log.d(TAG, "handleIntent - ⚠️ No navigateTo extra found in intent");
            }
        } else {
            Log.d(TAG, "handleIntent - ⚠️ Intent is null");
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

        Log.d(TAG, "navigateWebViewWhenReady - Attempt " + attempt + "/" + maxAttempts + " for path: " + path);

        if (attempt > maxAttempts) {
            Log.w(TAG, "navigateWebViewWhenReady: ❌ Giving up after " + attempt + " attempts, path=" + path);
            return;
        }

        if (getBridge() == null) {
            Log.d(TAG, "navigateWebViewWhenReady - Bridge is null, retrying in " + delayMs + "ms");
            mainHandler.postDelayed(() -> navigateWebViewWhenReady(path, attempt + 1), delayMs);
            return;
        }

        if (getBridge().getWebView() == null) {
            Log.d(TAG, "navigateWebViewWhenReady - WebView is null, retrying in " + delayMs + "ms");
            mainHandler.postDelayed(() -> navigateWebViewWhenReady(path, attempt + 1), delayMs);
            return;
        }

        Log.d(TAG, "navigateWebViewWhenReady - ✅ Bridge and WebView are ready");

        final String jsPath = path.replace("'", "\\'");
        // Set a flag in localStorage to indicate native navigation is happening
        // This helps the splash screen know not to redirect
        final String setFlagJs = "localStorage.setItem('nativeNavigationPending', 'true'); localStorage.setItem('nativeNavigationPath', '" + jsPath.replace("'", "\\'") + "');";
        
        // Try to use Next.js router navigation first (via window.navigateToRoute)
        // Fallback to window.location.href if the function doesn't exist
        final String navigateJs = 
            "(function() {" +
            "  if (typeof window.navigateToRoute === 'function') {" +
            "    console.log('🧭 [Android] Using navigateToRoute for:', '" + jsPath + "');" +
            "    window.navigateToRoute('" + jsPath + "');" +
            "  } else {" +
            "    console.log('🧭 [Android] navigateToRoute not available, using window.location.href');" +
            "    window.location.href = '" + jsPath + "';" +
            "  }" +
            "})();";

        Log.d(TAG, "navigateWebViewWhenReady - Setting flags in localStorage:");
        Log.d(TAG, "navigateWebViewWhenReady -   nativeNavigationPending: true");
        Log.d(TAG, "navigateWebViewWhenReady -   nativeNavigationPath: " + jsPath);
        Log.d(TAG, "navigateWebViewWhenReady - Executing JavaScript to set flags and navigate");

        mainHandler.post(() -> {
            try {
                Log.d(TAG, "navigateWebViewWhenReady - ✅ Executing JavaScript (attempt " + attempt + ")");
                
                // First set the flag, then navigate
                // Use evaluateJavascript when available; it's more reliable than loadUrl("javascript:...") on some devices
                getBridge().getWebView().evaluateJavascript(setFlagJs, (result) -> {
                    Log.d(TAG, "navigateWebViewWhenReady - Flag set callback result: " + result);
                    Log.d(TAG, "navigateWebViewWhenReady - Now executing navigation JavaScript");
                    
                    // Small delay to ensure flags are set before navigation
                    mainHandler.postDelayed(() -> {
                        // After setting flag, navigate
                        getBridge().getWebView().evaluateJavascript(navigateJs, (navResult) -> {
                            Log.d(TAG, "navigateWebViewWhenReady - Navigation callback result: " + navResult);
                            Log.d(TAG, "navigateWebViewWhenReady - ✅ Navigation JavaScript executed");
                        });
                    }, 50);
                });
            } catch (Exception e) {
                Log.w(TAG, "navigateWebViewWhenReady - ❌ evaluateJavascript failed (attempt " + attempt + "): " + e.getMessage());
                e.printStackTrace();
                // Retry on failure
                Log.d(TAG, "navigateWebViewWhenReady - Retrying in " + delayMs + "ms");
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
