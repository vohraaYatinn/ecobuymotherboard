import express from "express";
import { verifyVendorToken } from "../middleware/auth.js";
import { verifyAdminToken } from "../middleware/auth.js";
import VendorUser from "../models/VendorUser.js";
import Vendor from "../models/Vendor.js";
import { messaging, reinitializeFirebase } from "../config/firebase-admin.js";

const router = express.Router();

// Register/Update FCM token for vendor user
router.post("/vendor/register-token", verifyVendorToken, async (req, res) => {
  try {
    const { fcmToken, platform, deviceModel, appVersion } = req.body;
    const vendorUserId = req.vendorUser.id;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required",
      });
    }

    const vendorUser = await VendorUser.findById(vendorUserId);
    if (!vendorUser) {
      return res.status(404).json({
        success: false,
        message: "Vendor user not found",
      });
    }

    // Store token data
    const tokenData = {
      token: fcmToken.trim(),
      platform: platform || "unknown",
      deviceModel: deviceModel || "Unknown Device",
      appVersion: appVersion || "0.0.0",
      lastSeenAt: new Date(),
      createdAt: new Date(),
    };

    // Remove existing token if it exists
    vendorUser.pushTokens = vendorUser.pushTokens.filter(
      (pt) => pt.token !== fcmToken.trim()
    );

    // Add new token
    vendorUser.pushTokens.push(tokenData);

    // Keep only the latest 10 tokens
    if (vendorUser.pushTokens.length > 10) {
      vendorUser.pushTokens = vendorUser.pushTokens
        .sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt))
        .slice(0, 10);
    }

    await vendorUser.save();

    // Also update in Vendor model if vendor is linked
    if (vendorUser.vendorId) {
      const vendor = await Vendor.findById(vendorUser.vendorId);
      if (vendor) {
        vendor.pushTokens = vendor.pushTokens.filter(
          (pt) => pt.token !== fcmToken.trim()
        );
        vendor.pushTokens.push(tokenData);
        if (vendor.pushTokens.length > 10) {
          vendor.pushTokens = vendor.pushTokens
            .sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt))
            .slice(0, 10);
        }
        await vendor.save();
      }
    }

    console.log(`✅ FCM token registered for vendor user: ${vendorUserId}`);

    res.json({
      success: true,
      message: "FCM token registered successfully",
    });
  } catch (error) {
    console.error("❌ Register FCM token error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register FCM token",
      error: error.message,
    });
  }
});

// Admin: Send push notification to all vendors or specific vendors
router.post("/admin/send", verifyAdminToken, async (req, res) => {
  try {
    const { title, body, data, vendorIds, sendToAll } = req.body;

    // Validation
    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: "Title and body are required",
      });
    }

    if (!messaging) {
      // Try to re-initialize if credentials exist
      const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
      const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
      const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;
      
      if (hasProjectId && hasClientEmail && hasPrivateKey) {
        console.log('🔄 [PushNotification] Attempting to re-initialize Firebase...');
        const reinitSuccess = reinitializeFirebase();
        if (reinitSuccess && messaging) {
          console.log('✅ [PushNotification] Firebase re-initialized successfully');
          // Continue with sending notification
        } else {
          return res.status(503).json({
            success: false,
            error: "Firebase Admin SDK initialization failed",
            message: "Firebase credentials are present but initialization failed. Check server logs for details.",
            debug: {
              hasProjectId: true,
              hasClientEmail: true,
              hasPrivateKey: true,
              reinitAttempted: true,
              reinitSuccess: false,
            },
          });
        }
      } else {
        // Check what's missing
        const missing = []
        if (!hasProjectId) missing.push('FIREBASE_PROJECT_ID')
        if (!hasClientEmail) missing.push('FIREBASE_CLIENT_EMAIL')
        if (!hasPrivateKey) missing.push('FIREBASE_PRIVATE_KEY')
        
        return res.status(503).json({
          success: false,
          error: "Firebase Admin SDK not initialized",
          message: missing.length > 0
            ? `Missing Firebase credentials: ${missing.join(', ')}. Please check your .env file and restart the server.`
            : "Push notifications are not available. Please configure Firebase credentials in .env file (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) and restart the server.",
          debug: {
            hasProjectId: hasProjectId,
            hasClientEmail: hasClientEmail,
            hasPrivateKey: hasPrivateKey,
            missing: missing,
          },
        });
      }
    }

    // Get vendor users to send notifications to
    let vendorUsers = [];
    if (sendToAll) {
      // Get all active vendor users
      vendorUsers = await VendorUser.find({ isActive: true }).populate(
        "vendorId"
      );
    } else if (vendorIds && Array.isArray(vendorIds) && vendorIds.length > 0) {
      // Get specific vendor users
      vendorUsers = await VendorUser.find({
        _id: { $in: vendorIds },
        isActive: true,
      }).populate("vendorId");
    } else {
      return res.status(400).json({
        success: false,
        message: "Either sendToAll must be true or vendorIds array must be provided",
      });
    }

    if (vendorUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active vendor users found",
      });
    }

    // Collect all FCM tokens
    const tokens = [];
    const tokenToVendorMap = new Map(); // To track which vendor owns which token

    for (const vendorUser of vendorUsers) {
      if (vendorUser.pushTokens && vendorUser.pushTokens.length > 0) {
        for (const tokenData of vendorUser.pushTokens) {
          if (tokenData.token && tokenData.token.trim()) {
            tokens.push(tokenData.token.trim());
            tokenToVendorMap.set(tokenData.token.trim(), {
              vendorUserId: vendorUser._id.toString(),
              vendorUserMobile: vendorUser.mobile,
              vendorName: vendorUser.vendorId?.name || "Unknown Vendor",
            });
          }
        }
      }
    }

    if (tokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No FCM tokens found for the selected vendors",
      });
    }

    // Prepare message
    // Ensure type is included in data for navigation handling
    const notificationData = {
      type: data?.type || 'general', // Default to 'general' if not specified
      ...(data || {}),
    };
    
    // If title contains "new order" or "order available", set type to new_order_available
    if (!notificationData.type || notificationData.type === 'general') {
      const titleLower = title.toLowerCase();
      if (titleLower.includes('new order') || titleLower.includes('order available')) {
        notificationData.type = 'new_order_available';
      }
    }
    
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: Object.entries(notificationData).reduce((acc, [key, value]) => {
        acc[key] = String(value); // FCM data must be strings
        return acc;
      }, {}),
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    console.log(
      `📤 [PushNotification] Sending to ${tokens.length} device(s) from ${vendorUsers.length} vendor(s)`
    );
    console.log(`📝 [PushNotification] Title: "${title}" - Body: "${body}"`);

    let sent = 0;
    let failed = 0;
    const errors = [];

    // Send to each token
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      try {
        const result = await messaging.send({
          ...message,
          token: token,
        });

        sent++;
        console.log(`✅ [PushNotification] Success for token ${i + 1}/${tokens.length}`);
      } catch (error) {
        failed++;
        const errorMsg = error.message || "Unknown error";
        console.error(
          `❌ [PushNotification] Failed for token ${i + 1}/${tokens.length}: ${errorMsg}`
        );

        // Remove invalid tokens from database
        if (error.code === "messaging/invalid-registration-token" || 
            error.code === "messaging/registration-token-not-registered") {
          const vendorInfo = tokenToVendorMap.get(token);
          if (vendorInfo) {
            try {
              const vendorUser = await VendorUser.findById(vendorInfo.vendorUserId);
              if (vendorUser) {
                vendorUser.pushTokens = vendorUser.pushTokens.filter(
                  (pt) => pt.token !== token
                );
                await vendorUser.save();
                console.log(`🗑️  Removed invalid token from vendor user: ${vendorInfo.vendorUserMobile}`);
              }
            } catch (cleanupError) {
              console.error("Error removing invalid token:", cleanupError);
            }
          }
        }

        errors.push({
          token: token.substring(0, 20) + "...",
          error: errorMsg,
          code: error.code,
        });
      }
    }

    console.log(`📊 [PushNotification] Summary: ${sent} sent, ${failed} failed`);

    res.json({
      success: true,
      message: `Notification sent to ${sent} device(s)${failed > 0 ? `, ${failed} failed` : ""}`,
      sent,
      failed,
      total: tokens.length,
      vendorsCount: vendorUsers.length,
      errors: failed > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("❌ [PushNotification] Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send push notification",
      message: error.message,
    });
  }
});

// Test Firebase connection (for debugging)
router.get("/test", verifyAdminToken, async (req, res) => {
  try {
    const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
    const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
    const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;
    const hasMessaging = !!messaging;
    
    res.json({
      success: true,
      data: {
        credentials: {
          FIREBASE_PROJECT_ID: hasProjectId,
          FIREBASE_CLIENT_EMAIL: hasClientEmail,
          FIREBASE_PRIVATE_KEY: hasPrivateKey,
        },
        messaging: hasMessaging,
        initialized: hasMessaging,
        message: hasMessaging 
          ? "Firebase Admin SDK is initialized and ready" 
          : "Firebase Admin SDK is not initialized. Check server logs for details.",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Admin: Get all vendors with their push notification token status
router.get("/admin/vendors", verifyAdminToken, async (req, res) => {
  try {
    const vendors = await VendorUser.find({ isActive: true })
      .populate("vendorId", "name phone email status")
      .select("mobile name email vendorId pushTokens isActive lastLoginAt")
      .sort({ createdAt: -1 });

    const vendorsWithTokenStatus = vendors.map((vendor) => ({
      _id: vendor._id,
      mobile: vendor.mobile,
      name: vendor.name || vendor.vendorId?.name || "N/A",
      email: vendor.email || vendor.vendorId?.email || "N/A",
      vendorId: vendor.vendorId?._id || null,
      vendorName: vendor.vendorId?.name || "Not linked",
      vendorStatus: vendor.vendorId?.status || "N/A",
      hasTokens: vendor.pushTokens && vendor.pushTokens.length > 0,
      tokenCount: vendor.pushTokens ? vendor.pushTokens.length : 0,
      lastLoginAt: vendor.lastLoginAt,
      isActive: vendor.isActive,
    }));

    res.json({
      success: true,
      data: {
        vendors: vendorsWithTokenStatus,
        total: vendorsWithTokenStatus.length,
        withTokens: vendorsWithTokenStatus.filter((v) => v.hasTokens).length,
        withoutTokens: vendorsWithTokenStatus.filter((v) => !v.hasTokens).length,
      },
    });
  } catch (error) {
    console.error("❌ Get vendors error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vendors",
      error: error.message,
    });
  }
});

// Helper function to send push notification to all vendors
// options:
// - excludeVendorIds: array of Vendor _id strings to exclude (best-effort; requires vendorUser.vendorId)
export async function sendPushNotificationToAllVendors(title, body, data = {}, options = {}) {
  try {
    if (!messaging) {
      console.warn('⚠️ [PushNotification] Firebase Admin SDK not initialized, skipping push notification');
      return { success: false, message: 'Firebase not initialized' };
    }
    const excludeVendorIds = Array.isArray(options?.excludeVendorIds) ? options.excludeVendorIds.map(String) : [];

    // Get all active vendor users with push tokens
    const vendorUsers = await VendorUser.find({ isActive: true })
      .populate('vendorId', 'name status')
      .select('pushTokens vendorId');

    if (!vendorUsers || vendorUsers.length === 0) {
      console.log('📭 [PushNotification] No active vendor users found');
      return { success: false, message: 'No active vendors found' };
    }

    // Collect FCM tokens with platform info
    const androidTokens = [];
    const iosTokens = [];
    const otherTokens = [];
    const tokenToPlatformMap = new Map();
    
    for (const vendorUser of vendorUsers) {
      // Best-effort exclusion by vendorId
      const vendorIdValue =
        typeof vendorUser?.vendorId === "object" && vendorUser.vendorId
          ? (vendorUser.vendorId._id || vendorUser.vendorId).toString()
          : (vendorUser?.vendorId ? vendorUser.vendorId.toString() : "")
      if (vendorIdValue && excludeVendorIds.includes(vendorIdValue)) {
        continue
      }

      if (vendorUser.pushTokens && vendorUser.pushTokens.length > 0) {
        for (const tokenData of vendorUser.pushTokens) {
          if (tokenData.token && tokenData.token.trim()) {
            const platform = tokenData.platform || 'unknown';
            const token = tokenData.token.trim();
            tokenToPlatformMap.set(token, platform);
            
            if (platform === 'android') {
              androidTokens.push(token);
            } else if (platform === 'ios') {
              iosTokens.push(token);
            } else {
              otherTokens.push(token);
            }
          }
        }
      }
    }

    const totalTokens = androidTokens.length + iosTokens.length + otherTokens.length;
    if (totalTokens === 0) {
      console.log('📭 [PushNotification] No FCM tokens found for vendors');
      return { success: false, message: 'No FCM tokens found' };
    }

    // Ensure type is included in data for navigation
    const notificationData = {
      type: data.type || 'new_order_available',
      ...data,
      title: title, // Include title and body in data for data-only messages
      body: body,
    };

    const isNewOrderAlert = notificationData.type === 'new_order_available' || 
                           notificationData.type === 'order_placed' ||
                           notificationData.type === 'new_order';

    // Prepare data payload (convert all values to strings as required by FCM)
    const dataPayload = Object.entries(notificationData).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {});

    console.log(`📤 [PushNotification] Sending to ${totalTokens} vendor device(s): ${androidTokens.length} Android, ${iosTokens.length} iOS, ${otherTokens.length} other`);
    console.log(`📝 [PushNotification] Title: "${title}" - Body: "${body}"`);
    console.log(`🔔 [PushNotification] Is new order alert: ${isNewOrderAlert}`);

    let totalSent = 0;
    let totalFailed = 0;
    const allFailedTokens = [];

    // Send to Android devices - use data-only for new order alerts to ensure onMessageReceived is called
    if (androidTokens.length > 0) {
      const androidMessage = isNewOrderAlert
        ? {
            // Data-only message for new orders - ensures onMessageReceived is ALWAYS called, even when app is closed
            data: dataPayload,
            android: {
              priority: 'high',
            },
          }
        : {
            // Regular notification + data for other notifications
            notification: {
              title: title,
              body: body,
            },
            data: dataPayload,
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                channelId: 'default',
              },
            },
          };

      const androidResponse = await messaging.sendEachForMulticast({
        tokens: androidTokens,
        ...androidMessage,
      });

      totalSent += androidResponse.successCount;
      totalFailed += androidResponse.failureCount;

      // Track failed tokens
      androidResponse.responses.forEach((resp, idx) => {
        if (!resp.success) {
          allFailedTokens.push(androidTokens[idx]);
        }
      });

      console.log(`📱 [PushNotification] Android: Sent: ${androidResponse.successCount}, Failed: ${androidResponse.failureCount}`);
    }

    // Send to iOS devices - always use notification + data
    if (iosTokens.length > 0) {
      const iosMessage = {
        notification: {
          title: title,
          body: body,
        },
        data: dataPayload,
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const iosResponse = await messaging.sendEachForMulticast({
        tokens: iosTokens,
        ...iosMessage,
      });

      totalSent += iosResponse.successCount;
      totalFailed += iosResponse.failureCount;

      // Track failed tokens
      iosResponse.responses.forEach((resp, idx) => {
        if (!resp.success) {
          allFailedTokens.push(iosTokens[idx]);
        }
      });

      console.log(`🍎 [PushNotification] iOS: Sent: ${iosResponse.successCount}, Failed: ${iosResponse.failureCount}`);
    }

    // Send to other/unknown platforms - use notification + data
    if (otherTokens.length > 0) {
      const otherMessage = {
        notification: {
          title: title,
          body: body,
        },
        data: dataPayload,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const otherResponse = await messaging.sendEachForMulticast({
        tokens: otherTokens,
        ...otherMessage,
      });

      totalSent += otherResponse.successCount;
      totalFailed += otherResponse.failureCount;

      // Track failed tokens
      otherResponse.responses.forEach((resp, idx) => {
        if (!resp.success) {
          allFailedTokens.push(otherTokens[idx]);
        }
      });

      console.log(`🌐 [PushNotification] Other: Sent: ${otherResponse.successCount}, Failed: ${otherResponse.failureCount}`);
    }

    const sent = totalSent;
    const failed = totalFailed;

    console.log(`✅ [PushNotification] Sent: ${sent}, Failed: ${failed}`);

    if (failed > 0 && allFailedTokens.length > 0) {
      // Clean up invalid tokens
      console.log(`🧹 [PushNotification] Cleaning up ${allFailedTokens.length} invalid tokens`);
      
      for (const vendorUser of vendorUsers) {
        if (vendorUser.pushTokens && vendorUser.pushTokens.length > 0) {
          const originalLength = vendorUser.pushTokens.length;
          vendorUser.pushTokens = vendorUser.pushTokens.filter(
            (tokenData) => !allFailedTokens.includes(tokenData.token.trim())
          );
          
          if (vendorUser.pushTokens.length < originalLength) {
            await vendorUser.save();
            console.log(`🧹 [PushNotification] Removed ${originalLength - vendorUser.pushTokens.length} invalid token(s) for vendor user ${vendorUser._id}`);
          }
        }
      }
      
      console.log(`🧹 [PushNotification] Cleanup complete`);
    }

    return {
      success: true,
      sent,
      failed,
      total: totalTokens,
    };
  } catch (error) {
    console.error('❌ [PushNotification] Error sending to vendors:', error);
    return {
      success: false,
      message: error.message,
      error: error,
    };
  }
}

export default router;

