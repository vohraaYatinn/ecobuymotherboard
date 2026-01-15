import Notification from "../models/Notification.js"
import VendorUser from "../models/VendorUser.js"
import Vendor from "../models/Vendor.js"
import Order from "../models/Order.js"
import { sendEmail } from "./mailer.js"
import { messaging, reinitializeFirebase } from "../config/firebase-admin.js"

function mapStageKeyToNotificationType(stageKey) {
  // stageKey examples:
  // - status:processing
  // - status:shipped
  // - status:delivered
  // - status:return_requested
  // - status:return_accepted
  // - status:return_rejected
  // - status:return_picked_up
  // - refund:processing
  // - refund:completed
  // - refund:failed
  if (!stageKey || typeof stageKey !== "string") return "order_processing"

  if (stageKey.startsWith("status:")) {
    const s = stageKey.slice("status:".length)
    if (s === "processing") return "order_processing"
    if (s === "shipped") return "order_shipped"
    if (s === "delivered") return "order_delivered"
    if (s === "cancelled") return "order_cancelled"
    if (s === "return_requested") return "return_requested"
    if (s === "return_accepted") return "return_accepted"
    // Keep schema enum aligned with existing admin/customer terminology ("return_denied")
    if (s === "return_rejected") return "return_denied"
    if (s === "return_picked_up") return "return_picked_up"
  }

  if (stageKey.startsWith("refund:")) {
    const r = stageKey.slice("refund:".length)
    if (r === "processing") return "refund_processing"
    if (r === "completed") return "refund_completed"
    if (r === "failed") return "refund_failed"
  }

  return "order_processing"
}

function buildTitleAndMessage({ type, orderNumber }) {
  const safeOrder = orderNumber ? ` ${orderNumber}` : ""
  switch (type) {
    case "order_processing":
      return {
        title: "Order Accepted",
        message: `Order${safeOrder} is now in processing.`,
      }
    case "order_shipped":
      return {
        title: "Order Shipped",
        message: `Order${safeOrder} has been marked as shipped.`,
      }
    case "order_delivered":
      return {
        title: "Order Delivered",
        message: `Order${safeOrder} has been marked as delivered.`,
      }
    case "order_cancelled":
      return {
        title: "Order Cancelled",
        message: `Order${safeOrder} has been cancelled.`,
      }
    case "return_requested":
      return {
        title: "Return Requested",
        message: `A return has been requested for order${safeOrder}.`,
      }
    case "return_accepted":
      return {
        title: "Return Accepted",
        message: `The return request for order${safeOrder} was accepted.`,
      }
    case "return_denied":
      return {
        title: "Return Rejected",
        message: `The return request for order${safeOrder} was rejected.`,
      }
    case "return_picked_up":
      return {
        title: "Return Picked Up",
        message: `Return pickup completed for order${safeOrder}.`,
      }
    case "refund_processing":
      return {
        title: "Refund Processing",
        message: `Refund is being processed for order${safeOrder}.`,
      }
    case "refund_completed":
      return {
        title: "Refund Completed",
        message: `Refund has been completed for order${safeOrder}.`,
      }
    case "refund_failed":
      return {
        title: "Refund Failed",
        message: `Refund failed for order${safeOrder}. Please review.`,
      }
    default:
      return {
        title: "Order Update",
        message: `Order${safeOrder} has an update.`,
      }
  }
}

async function sendPushToTokens({ tokens, title, body, data }) {
  if (!tokens || tokens.length === 0) return { sent: 0, failed: 0, skipped: true }

  if (!messaging) {
    // Try to reinitialize if credentials exist
    const hasProjectId = !!process.env.FIREBASE_PROJECT_ID
    const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL
    const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY
    if (hasProjectId && hasClientEmail && hasPrivateKey) {
      reinitializeFirebase()
    }
  }

  if (!messaging) return { sent: 0, failed: 0, skipped: true }

  const payloadData = Object.entries(data || {}).reduce((acc, [k, v]) => {
    acc[k] = String(v)
    return acc
  }, {})

  const resp = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: payloadData,
    android: {
      priority: "high",
      notification: { sound: "default", channelId: "default" },
    },
    apns: {
      payload: {
        aps: { sound: "default", badge: 1 },
      },
    },
  })

  return { sent: resp.successCount, failed: resp.failureCount }
}

/**
 * Notify the vendor (all active VendorUsers linked to order.vendorId) about a stage change.
 *
 * Dedupe guarantee:
 * - per vendor user + order + stageKey
 * - if a duplicate is detected, we skip both push + email to avoid spam
 */
export async function notifyVendorsForOrderStage({ orderId, stageKey, title, message }) {
  if (!orderId) return { success: false, reason: "missing_order_id" }
  if (!stageKey) return { success: false, reason: "missing_stage_key" }

  const order = await Order.findById(orderId).select("_id orderNumber vendorId status refundStatus").lean()
  if (!order) return { success: false, reason: "order_not_found" }
  if (!order.vendorId) return { success: false, reason: "order_not_assigned" }

  const vendorUsers = await VendorUser.find({ vendorId: order.vendorId, isActive: true }).lean()
  if (!vendorUsers || vendorUsers.length === 0) return { success: false, reason: "no_vendor_users" }

  const type = mapStageKeyToNotificationType(stageKey)
  const built = buildTitleAndMessage({ type, orderNumber: order.orderNumber })
  const finalTitle = title || built.title
  const finalMessage = message || built.message

  // Create per-vendor-user notifications, deduped by stageKey.
  const createdFor = []
  const skippedFor = []

  for (const vu of vendorUsers) {
    const existing = await Notification.findOne({
      userId: vu._id,
      userType: "vendor",
      orderId: order._id,
      "metadata.stageKey": stageKey,
    }).select("_id")

    if (existing) {
      skippedFor.push(vu._id.toString())
      continue
    }

    await Notification.create({
      userId: vu._id,
      userType: "vendor",
      type,
      title: finalTitle,
      message: finalMessage,
      orderId: order._id,
      orderNumber: order.orderNumber,
      vendorId: order.vendorId,
      metadata: {
        stageKey,
      },
    })

    createdFor.push(vu._id.toString())

    // Push (to this vendor user's tokens) + Email (to this vendor user if present)
    try {
      const tokens =
        (vu.pushTokens || [])
          .map((t) => (t?.token || "").trim())
          .filter(Boolean)

      await sendPushToTokens({
        tokens,
        title: finalTitle,
        body: finalMessage,
        data: {
          type,
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          stageKey,
        },
      })
    } catch (pushErr) {
      console.error("❌ [VendorStageNotify] Push failed:", pushErr?.message || pushErr)
    }

    try {
      const to = (vu.email || "").trim()
      if (to) {
        const subject = `${finalTitle} - ${order.orderNumber}`
        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2 style="margin: 0 0 12px;">${finalTitle}</h2>
            <p style="margin: 0 0 8px;">${finalMessage}</p>
            <p style="margin: 0; color: #666;">Order: <strong>${order.orderNumber}</strong></p>
          </div>
        `
        await sendEmail({ to, subject, html })
      }
    } catch (emailErr) {
      console.error("❌ [VendorStageNotify] Email failed:", emailErr?.message || emailErr)
    }
  }

  // Fallback email to Vendor.email (once) when vendor users have no emails
  try {
    const anyEmails = vendorUsers.some((vu) => (vu.email || "").trim())
    if (!anyEmails && createdFor.length > 0) {
      const vendor = await Vendor.findById(order.vendorId).select("email").lean()
      const to = (vendor?.email || "").trim()
      if (to) {
        const subject = `${finalTitle} - ${order.orderNumber}`
        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2 style="margin: 0 0 12px;">${finalTitle}</h2>
            <p style="margin: 0 0 8px;">${finalMessage}</p>
            <p style="margin: 0; color: #666;">Order: <strong>${order.orderNumber}</strong></p>
          </div>
        `
        await sendEmail({ to, subject, html })
      }
    }
  } catch (fallbackEmailErr) {
    console.error("❌ [VendorStageNotify] Vendor fallback email failed:", fallbackEmailErr?.message || fallbackEmailErr)
  }

  return { success: true, type, createdFor, skippedFor }
}

