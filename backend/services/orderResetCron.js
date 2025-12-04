import cron from "node-cron"
import Order from "../models/Order.js"
import Vendor from "../models/Vendor.js"
import VendorUser from "../models/VendorUser.js"
import Notification from "../models/Notification.js"
import { sendPushNotificationToAllVendors } from "../routes/pushNotifications.js"

/**
 * Cron job to reset orders that have been in "processing" status for 2+ minutes
 * This treats them as fresh orders and sends notifications to vendors again
 */
export function startOrderResetCron() {
  // Run every 24 hours at midnight (00:00)
  cron.schedule("0 0 * * *", async () => {
    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago

      // Find orders with status "processing" that were updated 2+ minutes ago
      // Reset orders that were accepted by vendors (or have no assignmentMode set, for backward compatibility)
      const stuckOrders = await Order.find({
        status: "processing",
        updatedAt: { $lte: twoMinutesAgo },
        vendorId: { $ne: null }, // Only orders that have been assigned to a vendor
        $or: [
          { assignmentMode: "accepted-by-vendor" }, // Orders accepted by vendors
          { assignmentMode: null }, // Backward compatibility for orders without assignmentMode
        ],
      })

      if (stuckOrders.length === 0) {
        return // No stuck orders found
      }

      console.log(
        `🔄 [OrderResetCron] Found ${stuckOrders.length} order(s) stuck in processing status`
      )

      for (const order of stuckOrders) {
        try {
          // Reset order to pending status and remove vendor assignment
          const previousVendorId = order.vendorId
          order.status = "pending"
          order.vendorId = null
          order.assignmentMode = null

          await order.save()

          console.log(
            `✅ [OrderResetCron] Reset order ${order.orderNumber} from processing to pending`
          )

          // Send notifications to all active vendors
          const vendors = await Vendor.find({ status: "approved", isActive: true })

          // Create in-app notifications for all vendors
          for (const vendor of vendors) {
            const vendorUser = await VendorUser.findOne({
              vendorId: vendor._id,
              isActive: true,
            })

            if (vendorUser) {
              await Notification.create({
                userId: vendorUser._id,
                userType: "vendor",
                type: "new_order_available",
                title: "New Order Available",
                message: `New order ${order.orderNumber} is available to accept. Total: ₹${order.total.toLocaleString("en-IN")}`,
                orderId: order._id,
                orderNumber: order.orderNumber,
                customerId: order.customerId,
              })
            }
          }

          // Send push notifications to all vendors
          try {
            const pushResult = await sendPushNotificationToAllVendors(
              "New Order Available",
              `New order ${order.orderNumber} is available to accept. Total: ₹${order.total.toLocaleString("en-IN")}`,
              {
                type: "new_order_available",
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
              }
            )

            if (pushResult.success) {
              console.log(
                `✅ [OrderResetCron] Push notifications sent to ${pushResult.sent} vendor device(s) for order ${order.orderNumber}`
              )
            } else {
              console.warn(
                `⚠️ [OrderResetCron] Push notification failed for order ${order.orderNumber}: ${pushResult.message}`
              )
            }
          } catch (pushError) {
            console.error(
              `❌ [OrderResetCron] Error sending push notifications for order ${order.orderNumber}:`,
              pushError
            )
          }

          // Optionally notify admin about the reset
          try {
            const Admin = (await import("../models/Admin.js")).default
            const admin = await Admin.findOne({ isActive: true })
            if (admin) {
              await Notification.create({
                userId: admin._id,
                userType: "admin",
                type: "order_placed",
                title: "Order Reset - Available Again",
                message: `Order ${order.orderNumber} was reset from processing status and is now available for vendors to accept`,
                orderId: order._id,
                orderNumber: order.orderNumber,
                customerId: order.customerId,
                vendorId: previousVendorId,
              })
            }
          } catch (adminNotifError) {
            console.error(
              `❌ [OrderResetCron] Error creating admin notification:`,
              adminNotifError
            )
          }
        } catch (orderError) {
          console.error(
            `❌ [OrderResetCron] Error processing order ${order.orderNumber}:`,
            orderError
          )
        }
      }

      console.log(
        `✅ [OrderResetCron] Completed processing ${stuckOrders.length} order(s)`
      )
    } catch (error) {
      console.error("❌ [OrderResetCron] Error in cron job:", error)
    }
  })

  console.log("✅ [OrderResetCron] Cron job started - checking every 24 hours (at midnight) for orders stuck in processing")
}

