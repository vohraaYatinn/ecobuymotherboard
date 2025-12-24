import cron from "node-cron"
import Order from "../models/Order.js"
import { trackConsignmentJson, mapDtdcStatusToEnum } from "./dtdcService.js"

/**
 * Main function to update DTDC status for shipped orders
 * Can be called directly for testing or by the cron job
 */
export async function updateDtdcStatusForShippedOrders() {
  try {
    const startTime = Date.now()
    console.log(`\n🔄 [DtdcStatusCron] ========================================`)
    console.log(`🔄 [DtdcStatusCron] Starting DTDC status update check...`)
    console.log(`🔄 [DtdcStatusCron] Timestamp: ${new Date().toISOString()}`)

    // Find all orders with status "shipped" or "return_accepted" that have an AWB number
    const shippedOrders = await Order.find({
      status: { $in: ["shipped", "return_accepted"] },
      awbNumber: { $ne: null, $exists: true },
    }).select("_id orderNumber awbNumber dtdcStatus dtdcTrackingData trackingLastUpdated status")

    console.log(`🔍 [DtdcStatusCron] Query executed - found ${shippedOrders.length} order(s)`)

    if (shippedOrders.length === 0) {
      console.log(`ℹ️ [DtdcStatusCron] No shipped or return_accepted orders with AWB numbers found`)
      console.log(`🔄 [DtdcStatusCron] ========================================\n`)
      return {
        success: true,
        total: 0,
        updated: 0,
        errors: 0,
        message: "No orders to process",
      }
    }

    console.log(
      `📦 [DtdcStatusCron] Found ${shippedOrders.length} order(s) (shipped/return_accepted) with AWB numbers to check`
    )
    console.log(`📦 [DtdcStatusCron] Order IDs: ${shippedOrders.map((o) => o.orderNumber).join(", ")}`)

    let successCount = 0
    let errorCount = 0
    let updatedCount = 0
    let orderStatusUpdatedCount = 0

    for (let i = 0; i < shippedOrders.length; i++) {
      const order = shippedOrders[i]
      try {
        console.log(`\n📋 [DtdcStatusCron] Processing order ${i + 1}/${shippedOrders.length}`)
        console.log(`📋 [DtdcStatusCron] Order: ${order.orderNumber}`)
        console.log(`📋 [DtdcStatusCron] Order ID: ${order._id}`)
        console.log(`📋 [DtdcStatusCron] Order Status: ${order.status}`)

        if (!order.awbNumber) {
          console.warn(
            `⚠️ [DtdcStatusCron] Order ${order.orderNumber} has no AWB number, skipping`
          )
          continue
        }

        console.log(
          `🔍 [DtdcStatusCron] Checking DTDC status for order ${order.orderNumber} (AWB: ${order.awbNumber})`
        )
        console.log(`🔍 [DtdcStatusCron] Current DTDC Status: ${order.dtdcStatus || "null"}`)
        console.log(`🔍 [DtdcStatusCron] Last Updated: ${order.trackingLastUpdated || "Never"}`)

        // Track the consignment
        console.log(`🌐 [DtdcStatusCron] Calling DTDC API for AWB: ${order.awbNumber}...`)
        const trackingData = await trackConsignmentJson(order.awbNumber, true)

        if (!trackingData || !trackingData.success) {
          console.error(
            `❌ [DtdcStatusCron] Failed to get tracking data for order ${order.orderNumber}:`,
            trackingData?.error || "Unknown error"
          )
          if (trackingData?.rawData) {
            console.error(`❌ [DtdcStatusCron] Raw response:`, JSON.stringify(trackingData.rawData, null, 2))
          }
          errorCount++
          continue
        }

        console.log(`✅ [DtdcStatusCron] Successfully fetched tracking data`)
        console.log(`📊 [DtdcStatusCron] Tracking Status Text: ${trackingData.statusText || "N/A"}`)

        // Extract status from tracking data
        const statusText = trackingData.statusText || trackingData.rawData?.trackHeader?.strStatus
        const newDtdcStatus = mapDtdcStatusToEnum(statusText)

        console.log(`🔄 [DtdcStatusCron] Mapped Status: "${statusText}" → "${newDtdcStatus}"`)

        // Store old status for logging
        const oldDtdcStatus = order.dtdcStatus

        // Check if status has changed
        const statusChanged = oldDtdcStatus !== newDtdcStatus

        console.log(`🔄 [DtdcStatusCron] Status Changed: ${statusChanged ? "YES" : "NO"}`)
        if (statusChanged) {
          console.log(`🔄 [DtdcStatusCron] Old: "${oldDtdcStatus || "null"}" → New: "${newDtdcStatus}"`)
        }

        // Update order with new tracking data
        order.dtdcTrackingData = trackingData.rawData || trackingData
        order.trackingLastUpdated = new Date()

        if (newDtdcStatus) {
          order.dtdcStatus = newDtdcStatus
        }

        // Auto-update order status based on DTDC status changes
        let orderStatusUpdated = false
        const oldOrderStatus = order.status

        // Rule 1: When order is "shipped" and DTDC status becomes "delivered", update order status to "delivered"
        if (order.status === "shipped" && newDtdcStatus === "delivered") {
          order.status = "delivered"
          if (!order.deliveredAt) {
            order.deliveredAt = new Date()
            console.log(`📦 [DtdcStatusCron] Setting deliveredAt timestamp for order ${order.orderNumber}`)
          }
          orderStatusUpdated = true
          console.log(
            `🔄 [DtdcStatusCron] Auto-updating order status: "${oldOrderStatus}" → "delivered" (DTDC status: delivered)`
          )
        }

        // Rule 2: When order is "return_accepted" and DTDC status indicates "picked up", 
        // update order status to "return_picked_up"
        if (order.status === "return_accepted" && newDtdcStatus === "booked") {
          // Check if the status text indicates pickup
          const statusTextLower = (statusText || "").toLowerCase()
          if (
            statusTextLower.includes("picked up") ||
            statusTextLower.includes("pickup completed") ||
            statusTextLower.includes("pickup done")
          ) {
            order.status = "return_picked_up"
            orderStatusUpdated = true
            console.log(
              `🔄 [DtdcStatusCron] Auto-updating order status: "${oldOrderStatus}" → "return_picked_up" (DTDC status: picked up)`
            )
          }
        }

        console.log(`💾 [DtdcStatusCron] Saving order to database...`)
        await order.save()
        console.log(`✅ [DtdcStatusCron] Order saved successfully`)

        if (orderStatusUpdated) {
          orderStatusUpdatedCount++
          console.log(
            `✅ [DtdcStatusCron] ✅ Order status automatically updated: "${oldOrderStatus}" → "${order.status}"`
          )
        }

        if (statusChanged) {
          console.log(
            `✅ [DtdcStatusCron] ✅ Updated order ${order.orderNumber}: DTDC status changed from "${oldDtdcStatus || "null"}" to "${newDtdcStatus}"`
          )
          updatedCount++
        } else {
          console.log(
            `ℹ️ [DtdcStatusCron] Order ${order.orderNumber}: DTDC status unchanged (${newDtdcStatus || "null"})`
          )
        }

        successCount++

        // Small delay to avoid rate limiting
        if (i < shippedOrders.length - 1) {
          console.log(`⏳ [DtdcStatusCron] Waiting 500ms before next request...`)
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      } catch (orderError) {
        console.error(
          `❌ [DtdcStatusCron] Error processing order ${order.orderNumber}:`,
          orderError.message
        )
        console.error(`❌ [DtdcStatusCron] Stack trace:`, orderError.stack)
        errorCount++
      }
    }

    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    console.log(`\n✅ [DtdcStatusCron] ========================================`)
    console.log(`✅ [DtdcStatusCron] Completed in ${duration} seconds`)
    console.log(`✅ [DtdcStatusCron] Total Orders: ${shippedOrders.length}`)
    console.log(`✅ [DtdcStatusCron] Successful: ${successCount}`)
    console.log(`✅ [DtdcStatusCron] DTDC Status Updated: ${updatedCount}`)
    console.log(`✅ [DtdcStatusCron] Order Status Auto-Updated: ${orderStatusUpdatedCount}`)
    console.log(`✅ [DtdcStatusCron] Errors: ${errorCount}`)
    console.log(`✅ [DtdcStatusCron] ========================================\n`)

    return {
      success: true,
      total: shippedOrders.length,
      successful: successCount,
      updated: updatedCount,
      orderStatusUpdated: orderStatusUpdatedCount,
      errors: errorCount,
      duration: parseFloat(duration),
    }
  } catch (error) {
    console.error("\n❌ [DtdcStatusCron] ========================================")
    console.error("❌ [DtdcStatusCron] Fatal error in cron job:", error.message)
    console.error("❌ [DtdcStatusCron] Stack trace:", error.stack)
    console.error("❌ [DtdcStatusCron] ========================================\n")
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Cron job to update DTDC status for shipped and return_accepted orders
 * Runs every 3 hours and checks all orders with status "shipped" or "return_accepted" that have an AWB number
 */
export function startDtdcStatusCron() {
  // Run every 3 hours
  cron.schedule("0 */3 * * *", async () => {
    await updateDtdcStatusForShippedOrders()
  })

  console.log("✅ [DtdcStatusCron] Cron job started - checking DTDC status every 3 hours for shipped and return_accepted orders")
  console.log("✅ [DtdcStatusCron] Next run: Every 3 hours (at :00 minutes)")
  console.log("✅ [DtdcStatusCron] To test manually, run: node scripts/testDtdcStatusCron.js")
}
