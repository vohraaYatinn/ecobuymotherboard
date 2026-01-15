import cron from "node-cron"
import Order from "../models/Order.js"
import { createRazorpayRefund } from "./razorpayService.js"
import { sendCustomerOrderStageEmail } from "./orderCustomerEmailNotifications.js"
import { notifyVendorsForOrderStage } from "./vendorOrderStageNotifications.js"

/**
 * Main function to process refunds for return_picked_up orders
 * Can be called directly for testing or by the cron job
 */
export async function processRefundsForReturnPickedUpOrders() {
  try {
    const startTime = Date.now()
    console.log(`\n💰 [RefundCron] ========================================`)
    console.log(`💰 [RefundCron] Starting refund processing for return_picked_up orders...`)
    console.log(`💰 [RefundCron] Timestamp: ${new Date().toISOString()}`)

    // Find all orders with status "return_picked_up" that haven't been refunded yet
    const returnPickedUpOrders = await Order.find({
      status: "return_picked_up",
      $or: [
        { refundStatus: null },
        { refundStatus: "pending" },
        { refundStatus: { $exists: false } },
      ],
    }).select(
      "_id orderNumber vendorId customerId paymentMethod paymentStatus paymentTransactionId paymentMeta total refundStatus refundTransactionId"
    )

    console.log(`🔍 [RefundCron] Query executed - found ${returnPickedUpOrders.length} order(s)`)

    if (returnPickedUpOrders.length === 0) {
      console.log(`ℹ️ [RefundCron] No return_picked_up orders pending refund found`)
      console.log(`💰 [RefundCron] ========================================\n`)
      return {
        success: true,
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        message: "No orders to process",
      }
    }

    console.log(
      `📦 [RefundCron] Found ${returnPickedUpOrders.length} return_picked_up order(s) pending refund`
    )
    console.log(
      `📦 [RefundCron] Order IDs: ${returnPickedUpOrders.map((o) => o.orderNumber).join(", ")}`
    )

    let processedCount = 0
    let successCount = 0
    let failedCount = 0
    let skippedCount = 0

    for (let i = 0; i < returnPickedUpOrders.length; i++) {
      const order = returnPickedUpOrders[i]
      try {
        console.log(`\n📋 [RefundCron] Processing order ${i + 1}/${returnPickedUpOrders.length}`)
        console.log(`📋 [RefundCron] Order: ${order.orderNumber}`)
        console.log(`📋 [RefundCron] Order ID: ${order._id}`)
        console.log(`📋 [RefundCron] Payment Method: ${order.paymentMethod}`)
        console.log(`📋 [RefundCron] Payment Status: ${order.paymentStatus}`)
        console.log(`📋 [RefundCron] Current Refund Status: ${order.refundStatus || "null"}`)
        console.log(`📋 [RefundCron] Order Total: ₹${order.total}`)

        // Skip if already refunded
        if (order.refundStatus === "completed") {
          console.log(`⏭️ [RefundCron] Order ${order.orderNumber} already refunded, skipping`)
          skippedCount++
          continue
        }

        // Handle COD orders - no actual refund needed, just mark as completed
        if (order.paymentMethod === "cod") {
          console.log(`💵 [RefundCron] COD order - marking refund as completed (no actual refund needed)`)
          order.refundStatus = "completed"
          order.paymentStatus = "refunded"
          // Also update returnRequest refund status if return request exists
          if (order.returnRequest && order.returnRequest.type) {
            order.returnRequest.refundStatus = "completed"
          }
          await order.save()
          console.log(`✅ [RefundCron] COD order ${order.orderNumber} marked as refunded`)

          // Email buyer (deduped)
          try {
            await sendCustomerOrderStageEmail({ orderId: order._id, stageKey: "refund:completed" })
          } catch (emailErr) {
            console.error("❌ [RefundCron] Error sending refund email (COD):", emailErr?.message || emailErr)
          }

          // Notify vendor (push + email) (deduped)
          try {
            await notifyVendorsForOrderStage({ orderId: order._id, stageKey: "refund:completed" })
          } catch (vendorErr) {
            console.error("❌ [RefundCron] Error notifying vendor (COD completed):", vendorErr?.message || vendorErr)
          }

          successCount++
          processedCount++
          continue
        }

        // Handle online payment refunds
        if (order.paymentMethod === "online") {
          // Check if payment was actually made
          if (order.paymentStatus !== "paid") {
            console.log(
              `⚠️ [RefundCron] Order ${order.orderNumber} payment status is "${order.paymentStatus}", not "paid". Skipping refund.`
            )
            skippedCount++
            continue
          }

          // Get payment ID
          const paymentId =
            order.paymentMeta?.razorpayPaymentId || order.paymentTransactionId

          if (!paymentId) {
            console.error(
              `❌ [RefundCron] Order ${order.orderNumber} has no payment ID. Cannot process refund.`
            )
            order.refundStatus = "failed"
            order.paymentMeta = {
              ...(order.paymentMeta || {}),
              refundError: "No payment ID found",
              refundAttemptedAt: new Date().toISOString(),
            }
            await order.save()
            failedCount++
            processedCount++
            continue
          }

          // Calculate refund amount
          const amountInPaise = Math.round(order.total * 100)

          console.log(`💳 [RefundCron] Processing Razorpay refund...`)
          console.log(`💳 [RefundCron] Payment ID: ${paymentId}`)
          console.log(`💳 [RefundCron] Refund Amount: ₹${order.total} (${amountInPaise} paise)`)

          try {
            // Update status to processing
            order.refundStatus = "processing"
            await order.save()

            // Email buyer (deduped)
            try {
              await sendCustomerOrderStageEmail({ orderId: order._id, stageKey: "refund:processing" })
            } catch (emailErr) {
              console.error("❌ [RefundCron] Error sending refund processing email:", emailErr?.message || emailErr)
            }

            // Notify vendor (push + email) (deduped)
            try {
              await notifyVendorsForOrderStage({ orderId: order._id, stageKey: "refund:processing" })
            } catch (vendorErr) {
              console.error("❌ [RefundCron] Error notifying vendor (processing):", vendorErr?.message || vendorErr)
            }

            // Initiate refund
            const refundResult = await createRazorpayRefund({
              paymentId,
              amountInPaise,
              notes: {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                reason: "return_picked_up_automatic_refund",
                processedAt: new Date().toISOString(),
                cronJob: "refundCron",
              },
            })

            console.log(`✅ [RefundCron] Refund successful for order ${order.orderNumber}`)
            console.log(`✅ [RefundCron] Refund ID: ${refundResult.id}`)
            console.log(`✅ [RefundCron] Refund Amount: ₹${(refundResult.amount || 0) / 100}`)
            console.log(`✅ [RefundCron] Refund Status: ${refundResult.status}`)

            // Update order with refund details
            order.refundStatus = "completed"
            order.refundTransactionId = refundResult.id
            order.paymentStatus = "refunded"
            // Also update returnRequest refund status if return request exists
            if (order.returnRequest && order.returnRequest.type) {
              order.returnRequest.refundStatus = "completed"
              order.returnRequest.refundTransactionId = refundResult.id
            }
            order.paymentMeta = {
              ...(order.paymentMeta || {}),
              returnRefund: refundResult,
              refundedAt: new Date().toISOString(),
              refundProcessedBy: "refundCron",
            }

            await order.save()
            console.log(`✅ [RefundCron] Order ${order.orderNumber} updated successfully`)

            // Email buyer (deduped)
            try {
              await sendCustomerOrderStageEmail({ orderId: order._id, stageKey: "refund:completed" })
            } catch (emailErr) {
              console.error("❌ [RefundCron] Error sending refund completed email:", emailErr?.message || emailErr)
            }

            // Notify vendor (push + email) (deduped)
            try {
              await notifyVendorsForOrderStage({ orderId: order._id, stageKey: "refund:completed" })
            } catch (vendorErr) {
              console.error("❌ [RefundCron] Error notifying vendor (completed):", vendorErr?.message || vendorErr)
            }

            successCount++
            processedCount++
          } catch (refundError) {
            console.error(
              `❌ [RefundCron] Refund failed for order ${order.orderNumber}:`,
              refundError.message
            )
            console.error(`❌ [RefundCron] Error details:`, refundError)

            // Update order with failure status
            order.refundStatus = "failed"
            order.paymentMeta = {
              ...(order.paymentMeta || {}),
              refundError: refundError.message,
              refundErrorDetails: refundError.providerData || null,
              refundAttemptedAt: new Date().toISOString(),
              refundProcessedBy: "refundCron",
            }

            await order.save()
            console.log(`❌ [RefundCron] Order ${order.orderNumber} marked as refund failed`)

            // Email buyer (deduped)
            try {
              await sendCustomerOrderStageEmail({ orderId: order._id, stageKey: "refund:failed" })
            } catch (emailErr) {
              console.error("❌ [RefundCron] Error sending refund failed email:", emailErr?.message || emailErr)
            }

            // Notify vendor (push + email) (deduped)
            try {
              await notifyVendorsForOrderStage({ orderId: order._id, stageKey: "refund:failed" })
            } catch (vendorErr) {
              console.error("❌ [RefundCron] Error notifying vendor (failed):", vendorErr?.message || vendorErr)
            }

            failedCount++
            processedCount++
          }
        } else {
          // Unknown payment method
          console.log(
            `⚠️ [RefundCron] Order ${order.orderNumber} has unknown payment method: ${order.paymentMethod}`
          )
          skippedCount++
        }

        // Small delay to avoid rate limiting
        if (i < returnPickedUpOrders.length - 1) {
          console.log(`⏳ [RefundCron] Waiting 500ms before next request...`)
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      } catch (orderError) {
        console.error(
          `❌ [RefundCron] Error processing order ${order.orderNumber}:`,
          orderError.message
        )
        console.error(`❌ [RefundCron] Stack trace:`, orderError.stack)
        failedCount++
        processedCount++
      }
    }

    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    console.log(`\n💰 [RefundCron] ========================================`)
    console.log(`💰 [RefundCron] Completed in ${duration} seconds`)
    console.log(`💰 [RefundCron] Total Orders: ${returnPickedUpOrders.length}`)
    console.log(`💰 [RefundCron] Processed: ${processedCount}`)
    console.log(`💰 [RefundCron] Successful: ${successCount}`)
    console.log(`💰 [RefundCron] Failed: ${failedCount}`)
    console.log(`💰 [RefundCron] Skipped: ${skippedCount}`)
    console.log(`💰 [RefundCron] ========================================\n`)

    return {
      success: true,
      total: returnPickedUpOrders.length,
      processed: processedCount,
      successful: successCount,
      failed: failedCount,
      skipped: skippedCount,
      duration: parseFloat(duration),
    }
  } catch (error) {
    console.error("\n❌ [RefundCron] ========================================")
    console.error("❌ [RefundCron] Fatal error in cron job:", error.message)
    console.error("❌ [RefundCron] Stack trace:", error.stack)
    console.error("❌ [RefundCron] ========================================\n")
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Cron job to process refunds for return_picked_up orders
 * Runs every 3 hours and processes refunds for orders that have been picked up
 */
export function startRefundCron() {
  // Run every 3 hours
  cron.schedule("0 */3 * * *", async () => {
    await processRefundsForReturnPickedUpOrders()
  })

  console.log("✅ [RefundCron] Cron job started - processing refunds every 3 hours for return_picked_up orders")
  console.log("✅ [RefundCron] Next run: Every 3 hours (at :00 minutes)")
  console.log("✅ [RefundCron] To test manually, run: node scripts/testRefundCron.js")
}

