package com.ecobuymotherboard.vendor;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

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
            
            if (navigateTo != null && getBridge() != null && getBridge().getWebView() != null) {
                // Stop the alert when app is opened
                OrderAlertService.stopOrderAlert(this);
                
                // Navigate to the appropriate page
                String url = "/" + navigateTo + "/";
                if (orderId != null && !orderId.isEmpty()) {
                    url += "?orderId=" + orderId;
                }
                
                final String finalUrl = url;
                getBridge().getWebView().post(() -> {
                    Log.d(TAG, "Navigating to: " + finalUrl);
                    getBridge().getWebView().loadUrl("javascript:window.location.href='" + finalUrl + "'");
                });
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Optionally stop alert when app comes to foreground
        // Uncomment if you want alert to stop when app is opened
        // OrderAlertService.stopOrderAlert(this);
    }
}
