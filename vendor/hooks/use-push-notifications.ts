"use client"

import { useEffect, useState, useCallback } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { getMessagingInstance } from '@/lib/firebase';
import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { useNavigation } from '@/contexts/navigation-context';

export interface NotificationData {
  id: string;
  type: 'order' | 'payment' | 'customer' | 'delivery' | 'inventory' | 'general';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  data?: Record<string, any>;
}

import { API_URL } from "../lib/api-config";

// Helper function to send FCM token to backend
async function sendTokenToBackend(token: string, platform: string, deviceModel?: string, appVersion?: string) {
  try {
    const vendorToken = localStorage.getItem('vendorToken');
    if (!vendorToken) {
      console.log('Vendor not logged in, skipping token registration');
      return;
    }

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Device';
    const detectedPlatform = platform || (userAgent.includes('Android') ? 'android' : userAgent.includes('iPhone') || userAgent.includes('iPad') ? 'ios' : 'web');
    const detectedDeviceModel = deviceModel || userAgent || 'Unknown Device';
    const detectedAppVersion = appVersion || '1.0.0';

    const response = await fetch(`${API_URL}/api/push-notifications/vendor/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${vendorToken}`,
      },
      body: JSON.stringify({
        fcmToken: token,
        platform: detectedPlatform,
        deviceModel: detectedDeviceModel,
        appVersion: detectedAppVersion,
      }),
    });

    const data = await response.json();
    if (data.success) {
      console.log('✅ FCM token sent to backend successfully');
    } else {
      console.warn('⚠️ Failed to send FCM token to backend:', data.message);
    }
  } catch (error) {
    console.error('❌ Error sending FCM token to backend:', error);
    // Don't throw - token registration should not block app functionality
  }
}

export function usePushNotifications() {
  const { setSelectedOrderId } = useNavigation();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  // Load notifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('push_notifications');
    if (stored) {
      try {
        setNotifications(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load notifications from storage:', e);
      }
    }
  }, []);

  // Save notifications to localStorage
  const saveNotifications = useCallback((newNotifications: NotificationData[]) => {
    setNotifications(newNotifications);
    localStorage.setItem('push_notifications', JSON.stringify(newNotifications));
  }, []);

  // Request permissions and register for push notifications
  const register = useCallback(async (router?: any) => {
    if (!Capacitor.isNativePlatform()) {
      // Web platform - use Firebase
      if ('Notification' in window && 'serviceWorker' in navigator) {
        try {
          // Register service worker first
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('Service Worker registered:', registration);
          
          const permission = await Notification.requestPermission();
          setPermissionStatus(permission as any);
          
          if (permission === 'granted') {
            // Get messaging instance
            const messaging = await getMessagingInstance();
            
            if (messaging) {
              try {
                // Request notification permission and get FCM token
                const token = await getToken(messaging, {
                  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '',
                  serviceWorkerRegistration: registration,
                });
                
                if (token) {
                  setFcmToken(token);
                  setIsRegistered(true);
                  console.log('🔔 [PUSH] FCM Token received:', token.substring(0, 20) + '...');
                  
                  // Save to localStorage for use during OTP verification
                  localStorage.setItem('vendorFcmToken', token);
                  console.log('🔔 [PUSH] FCM token saved to localStorage');
                  
                  // Send token to backend
                  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Device';
                  const platform = userAgent.includes('Android') ? 'android' : userAgent.includes('iPhone') || userAgent.includes('iPad') ? 'ios' : 'web';
                  await sendTokenToBackend(token, platform);
                  
                  // Listen for foreground messages
                  onMessage(messaging, (payload) => {
                    console.log('🔔 [PushNotification] Foreground message received:', payload);
                    const notification: NotificationData = {
                      id: payload.messageId || Date.now().toString(),
                      type: (payload.data?.type as any) || 'general',
                      title: payload.notification?.title || 'New Notification',
                      message: payload.notification?.body || '',
                      timestamp: Date.now(),
                      read: false,
                      data: payload.data,
                    };
                    
                    // Show browser notification with click handler
                    if ('Notification' in window && Notification.permission === 'granted') {
                      const browserNotification = new Notification(notification.title, {
                        body: notification.message,
                        icon: '/icon.svg',
                        data: payload.data,
                      });
                      
                      // Handle notification click - navigate to appropriate page
                      browserNotification.onclick = () => {
                        window.focus();
                        if (router && typeof window !== 'undefined') {
                          const notificationType = payload.data?.type || notification.type;
                          const orderId = payload.data?.orderId;
                          
                          console.log('🔔 [PushNotification] Browser notification clicked, type:', notificationType);
                          
                          // Navigate to accept-orders for new order notifications
                          if (notificationType === 'new_order_available' || notificationType === 'order_placed') {
                            console.log('🔔 [PushNotification] Redirecting to /accept-orders');
                            router.push('/accept-orders');
                          } 
                          // Navigate to specific order if orderId is provided
                          else if (orderId) {
                            console.log('🔔 [PushNotification] Redirecting to order:', orderId);
                            setSelectedOrderId(orderId);
                            router.push('/order-detail');
                          }
                          // Default: navigate to notifications page
                          else {
                            console.log('🔔 [PushNotification] Redirecting to /notifications');
                            router.push('/notifications');
                          }
                        }
                        browserNotification.close();
                      };
                    }
                    
                    // Add to notifications list
                    const updated = [notification, ...notifications];
                    saveNotifications(updated);
                  });
                }
              } catch (error) {
                console.error('Error getting FCM token:', error);
              }
            }
          }
        } catch (error) {
          console.error('Error registering service worker:', error);
        }
      }
      return;
    }

    // Native platform - use Capacitor Push Notifications
    try {
      // Request permission
      let permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      
      setPermissionStatus(permStatus.receive as any);
      
      if (permStatus.receive !== 'granted') {
        console.warn('Push notification permission denied');
        return;
      }

      // Register for push notifications
      await PushNotifications.register();
      setIsRegistered(true);
      
      // Listen for registration
      PushNotifications.addListener('registration', async (token) => {
        console.log('🔔 [PUSH] Push registration success, token: ' + token.value.substring(0, 20) + '...');
        setFcmToken(token.value);
        
        // Save to localStorage for use during OTP verification
        localStorage.setItem('vendorFcmToken', token.value);
        console.log('🔔 [PUSH] FCM token saved to localStorage');
        
        // Send token to backend
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Device';
        const platform = Capacitor.getPlatform() === 'android' ? 'android' : Capacitor.getPlatform() === 'ios' ? 'ios' : 'unknown';
        await sendTokenToBackend(token.value, platform);
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      // Listen for push notifications received while app is in foreground
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received:', notification);
        
        const notificationData: NotificationData = {
          id: notification.id || Date.now().toString(),
          type: (notification.data?.type as any) || 'general',
          title: notification.title || 'New Notification',
          message: notification.body || '',
          timestamp: Date.now(),
          read: false,
          data: notification.data,
        };
        
        const updated = [notificationData, ...notifications];
        saveNotifications(updated);
      });

      // Listen for push notifications tapped
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('🔔 [PushNotification] Notification tapped:', action);
        
        const notification = action.notification;
        const notificationData: NotificationData = {
          id: notification.id || Date.now().toString(),
          type: (notification.data?.type as any) || 'general',
          title: notification.title || 'New Notification',
          message: notification.body || '',
          timestamp: Date.now(),
          read: false,
          data: notification.data,
        };
        
        const updated = [notificationData, ...notifications];
        saveNotifications(updated);
        
        // Handle navigation based on notification type
        if (router && typeof window !== 'undefined') {
          const notificationType = notification.data?.type || notificationData.type;
          const orderId = notification.data?.orderId;
          
          console.log('🔔 [PushNotification] Navigating based on type:', notificationType);
          
          // Navigate to accept-orders page for new order notifications
          if (notificationType === 'new_order_available' || notificationType === 'order_placed') {
            console.log('🔔 [PushNotification] Redirecting to /accept-orders');
            router.push('/accept-orders');
          } 
            // Navigate to specific order if orderId is provided
            else if (orderId) {
              console.log('🔔 [PushNotification] Redirecting to order:', orderId);
              setSelectedOrderId(orderId);
              router.push('/order-detail');
            }
          // Default: navigate to notifications page
          else {
            console.log('🔔 [PushNotification] Redirecting to /notifications');
            router.push('/notifications');
          }
        }
      });
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  }, [notifications, saveNotifications]);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    const updated = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  // Delete notification
  const deleteNotification = useCallback((id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    fcmToken,
    isRegistered,
    permissionStatus,
    register,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    unreadCount,
  };
}

