import { Capacitor, registerPlugin } from '@capacitor/core';

export interface OrderAlertPlugin {
  startAlert(options: { title?: string; message?: string; orderId?: string }): Promise<{ success: boolean; message: string }>;
  stopAlert(): Promise<{ success: boolean; message: string }>;
  isAlertPlaying(): Promise<{ isPlaying: boolean }>;
}

// Register the native plugin
const OrderAlert = registerPlugin<OrderAlertPlugin>('OrderAlert', {
  web: () => import('./order-alert-web').then(m => new m.OrderAlertWeb()),
});

export default OrderAlert;

/**
 * Start the native order alert (continuous sound + vibration)
 * Works even when app is closed on Android
 */
export async function startNativeAlert(title?: string, message?: string, orderId?: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('🔔 [OrderAlert] Not on native platform, skipping native alert');
    return false;
  }

  try {
    const result = await OrderAlert.startAlert({
      title: title || 'New Order!',
      message: message || 'You have a new order to accept',
      orderId: orderId || '',
    });
    console.log('🔔 [OrderAlert] Native alert started:', result);
    return result.success;
  } catch (error) {
    console.error('🔔 [OrderAlert] Failed to start native alert:', error);
    return false;
  }
}

/**
 * Stop the native order alert
 */
export async function stopNativeAlert(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('🔔 [OrderAlert] Not on native platform, skipping native alert stop');
    return false;
  }

  try {
    const result = await OrderAlert.stopAlert();
    console.log('🔔 [OrderAlert] Native alert stopped:', result);
    return result.success;
  } catch (error) {
    console.error('🔔 [OrderAlert] Failed to stop native alert:', error);
    return false;
  }
}

/**
 * Check if native alert is currently playing
 */
export async function isNativeAlertPlaying(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const result = await OrderAlert.isAlertPlaying();
    return result.isPlaying;
  } catch (error) {
    console.error('🔔 [OrderAlert] Failed to check alert status:', error);
    return false;
  }
}



























