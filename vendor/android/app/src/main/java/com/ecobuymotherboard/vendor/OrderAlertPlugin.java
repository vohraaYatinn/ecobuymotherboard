package com.ecobuymotherboard.vendor;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor Plugin to control the Order Alert Service from JavaScript
 */
@CapacitorPlugin(name = "OrderAlert")
public class OrderAlertPlugin extends Plugin {
    private static final String TAG = "OrderAlertPlugin";

    /**
     * Start the continuous order alert
     * Call from JavaScript: await OrderAlert.startAlert({ title, message, orderId })
     */
    @PluginMethod
    public void startAlert(PluginCall call) {
        String title = call.getString("title", "New Order!");
        String message = call.getString("message", "You have a new order to accept");
        String orderId = call.getString("orderId", "");

        Log.d(TAG, "startAlert called - title: " + title + ", orderId: " + orderId);

        try {
            OrderAlertService.startOrderAlert(getContext(), title, message, orderId);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "Alert started");
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error starting alert: " + e.getMessage());
            call.reject("Failed to start alert", e);
        }
    }

    /**
     * Stop the continuous order alert
     * Call from JavaScript: await OrderAlert.stopAlert()
     */
    @PluginMethod
    public void stopAlert(PluginCall call) {
        Log.d(TAG, "stopAlert called");

        try {
            OrderAlertService.stopOrderAlert(getContext());
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "Alert stopped");
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error stopping alert: " + e.getMessage());
            call.reject("Failed to stop alert", e);
        }
    }

    /**
     * Check if alert is currently playing
     * Call from JavaScript: const { isPlaying } = await OrderAlert.isAlertPlaying()
     */
    @PluginMethod
    public void isAlertPlaying(PluginCall call) {
        boolean isPlaying = OrderAlertService.isServiceRunning;
        Log.d(TAG, "isAlertPlaying: " + isPlaying);

        JSObject result = new JSObject();
        result.put("isPlaying", isPlaying);
        call.resolve(result);
    }
}



























