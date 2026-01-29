import Notification from "../models/Notification.js"
import VendorUser from "../models/VendorUser.js"
import Vendor from "../models/Vendor.js"
import Order from "../models/Order.js"
import { sendEmail } from "./mailer.js"
import { messaging, reinitializeFirebase } from "../config/firebase-admin.js"

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`

function mapStageKeyToNotificationType(stageKey) {
  if (!stageKey || typeof stageKey !== "string") return "order_processing"

  if (stageKey.startsWith("status:")) {
    const s = stageKey.slice("status:".length)
    if (s === "processing") return "order_processing"
    if (s === "shipped") return "order_shipped"
    if (s === "delivered") return "order_delivered"
    if (s === "cancelled") return "order_cancelled"
    if (s === "return_requested") return "return_requested"
    if (s === "return_accepted") return "return_accepted"
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

function buildStageInfo({ stageKey, order }) {
  const orderNumber = order.orderNumber
  const showPrice = stageKey === "status:processing" || stageKey.startsWith("return_") || stageKey.startsWith("refund:")

  if (stageKey.startsWith("status:")) {
    const status = stageKey.replace("status:", "")
    switch (status) {
      case "processing":
        return {
          subject: `New Order Accepted - ${orderNumber}`,
          title: "🎉 New Order Accepted!",
          message: `You have accepted a new order. Please start processing it immediately.`,
          details: `Order ${orderNumber} is now in your queue. Please ensure all items are available and prepare the order for shipment.`,
          icon: "🎉",
          color: "#10B981",
          showPrice: true
        }
      case "shipped":
        return {
          subject: `Order Packed - ${orderNumber}`,
          title: "📦 Order Packed",
          message: `Order ${orderNumber} has been packed and is ready for shipment.`,
          details: `The order has been packed successfully. The shipment will be created and picked up by the courier soon. Track the shipment using the AWB number once it's available.`,
          icon: "📦",
          color: "#3B82F6",
          showPrice: false
        }
      case "delivered":
        return {
          subject: `Order Delivered - ${orderNumber}`,
          title: "🎊 Order Delivered Successfully!",
          message: `Order ${orderNumber} has been successfully delivered to the customer.`,
          details: `Great job! The order has been delivered. The customer will be notified, and payment will be processed according to the payment method.`,
          icon: "🎊",
          color: "#10B981",
          showPrice: false
        }
      case "cancelled":
        return {
          subject: `Order Cancelled - ${orderNumber}`,
          title: "❌ Order Cancelled",
          message: `Order ${orderNumber} has been cancelled.`,
          details: `The order has been cancelled. If inventory was adjusted, it has been restored. Please review the cancellation reason if available.`,
          icon: "❌",
          color: "#EF4444",
          showPrice: false
        }
      case "return_requested":
        return {
          subject: `Return Requested - ${orderNumber}`,
          title: "📦 Return Request Received",
          message: `A customer has requested a return for order ${orderNumber}.`,
          details: `Please review the return request. The return will be processed once approved by the admin team.`,
          icon: "📦",
          color: "#8B5CF6",
          showPrice: true
        }
      case "return_accepted":
        return {
          subject: `Return Accepted - ${orderNumber}`,
          title: "✅ Return Request Accepted",
          message: `The return request for order ${orderNumber} has been accepted.`,
          details: `A reverse pickup will be scheduled. Please prepare to receive the returned items. Once received, the refund will be processed.`,
          icon: "✅",
          color: "#10B981",
          showPrice: true
        }
      case "return_rejected":
        return {
          subject: `Return Rejected - ${orderNumber}`,
          title: "⚠️ Return Request Rejected",
          message: `The return request for order ${orderNumber} has been rejected.`,
          details: `The return request has been reviewed and rejected. The order remains as delivered.`,
          icon: "⚠️",
          color: "#F59E0B",
          showPrice: false
        }
      case "return_picked_up":
        return {
          subject: `Return packed up - ${orderNumber}`,
          title: "📦 Return packed up",
          message: `The return items for order ${orderNumber} have been packed up.`,
          details: `The returned items are on their way back to you. Please inspect them upon receipt. The refund will be processed automatically.`,
          icon: "📦",
          color: "#8B5CF6",
          showPrice: true
        }
      default:
        return {
          subject: `Order Update - ${orderNumber}`,
          title: "📋 Order Update",
          message: `There's an update on order ${orderNumber}.`,
          details: `Check the order details for more information.`,
          icon: "📋",
          color: "#6B7280",
          showPrice: false
        }
    }
  }

  if (stageKey.startsWith("refund:")) {
    const rs = stageKey.replace("refund:", "")
    if (rs === "processing") {
      return {
        subject: `Refund Processing - ${orderNumber}`,
        title: "💰 Refund Processing",
        message: `A refund is being processed for order ${orderNumber}.`,
        details: `The refund has been initiated. The amount will be credited back to the customer's original payment method.`,
        icon: "💰",
        color: "#F59E0B",
        showPrice: true
      }
    }
    if (rs === "completed") {
      return {
        subject: `Refund Completed - ${orderNumber}`,
        title: "✅ Refund Completed",
        message: `The refund for order ${orderNumber} has been completed.`,
        details: `The refund has been successfully processed and credited to the customer.`,
        icon: "✅",
        color: "#10B981",
        showPrice: true
      }
    }
    if (rs === "failed") {
      return {
        subject: `Refund Failed - ${orderNumber}`,
        title: "⚠️ Refund Failed",
        message: `The refund for order ${orderNumber} could not be processed automatically.`,
        details: `Please review the refund details and contact support if needed.`,
        icon: "⚠️",
        color: "#EF4444",
        showPrice: true
      }
    }
    return {
      subject: `Refund Update - ${orderNumber}`,
      title: "💰 Refund Update",
      message: `Refund status update for order ${orderNumber}.`,
      details: `Check the order details for more information.`,
      icon: "💰",
      color: "#6B7280",
      showPrice: true
    }
  }

  return {
    subject: `Order Update - ${orderNumber}`,
    title: "📋 Order Update",
    message: `There's an update on order ${orderNumber}.`,
    details: `Check the order details for more information.`,
    icon: "📋",
    color: "#6B7280",
    showPrice: false
  }
}

/**
 * Render beautiful HTML email template for vendors
 */
const renderVendorEmailHtml = ({ vendorName, title, message, details, order, stageInfo }) => {
  const { icon = "📋", color = "#6B7280", showPrice = false } = stageInfo || {}
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { 
    year: "numeric", 
    month: "long", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }) : ""

  // Format order items for display
  const itemsHtml = order.items && order.items.length > 0 ? order.items.map(item => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 8px; vertical-align: top;">
        <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${item.name || "Product"}</div>
        ${item.brand ? `<div style="font-size: 13px; color: #6B7280;">Brand: ${item.brand}</div>` : ""}
      </td>
      <td style="padding: 12px 8px; text-align: center; color: #374151;">${item.quantity || 1}</td>
      <td style="padding: 12px 8px; text-align: right; color: #111827; font-weight: 600;">${money(item.price || 0)}</td>
      ${showPrice ? `<td style="padding: 12px 8px; text-align: right; color: #111827; font-weight: 600;">${money((item.price || 0) * (item.quantity || 1))}</td>` : '<td style="padding: 12px 8px; text-align: right; color: #111827; font-weight: 600;">-</td>'}
    </tr>
  `).join("") : ""

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      @media only screen and (max-width: 600px) {
        .container { width: 100% !important; padding: 10px !important; }
        .content { padding: 20px 15px !important; }
      }
    </style>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #111827; margin: 0; padding: 0; background-color: #f3f4f6;">
    <div style="max-width: 640px; margin: 0 auto; padding: 20px;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%); color: #fff; padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 12px;">${icon}</div>
        <div style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">${title}</div>
        <div style="font-size: 14px; opacity: 0.95;">Elecobuy Vendor Portal</div>
      </div>

      <!-- Main Content -->
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; padding: 32px 24px; border-radius: 0 0 12px 12px;">
        <!-- Greeting -->
        <div style="margin-bottom: 24px; font-size: 16px; color: #374151;">
          Hi ${vendorName || "Vendor"},
        </div>

        <!-- Main Message -->
        <div style="margin-bottom: 20px; font-size: 16px; color: #111827; line-height: 1.7;">
          ${message}
        </div>

        <!-- Details -->
        ${details ? `
        <div style="margin-bottom: 24px; padding: 20px; background: #f9fafb; border-left: 4px solid ${color}; border-radius: 8px;">
          <div style="font-size: 15px; color: #374151; line-height: 1.7; white-space: pre-line;">${details}</div>
        </div>
        ` : ""}

        <!-- Order Summary Card -->
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <div style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb;">
            Order Details
          </div>
          
          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6B7280; font-size: 14px;">Order Number:</span>
              <span style="color: #111827; font-weight: 600; font-size: 14px;">${order.orderNumber}</span>
            </div>
            ${orderDate ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6B7280; font-size: 14px;">Order Date:</span>
              <span style="color: #111827; font-weight: 600; font-size: 14px;">${orderDate}</span>
            </div>
            ` : ""}
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6B7280; font-size: 14px;">Order Status:</span>
              <span style="color: ${color}; font-weight: 600; font-size: 14px; text-transform: capitalize;">${order.status || "N/A"}</span>
            </div>
            ${order.paymentMethod ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6B7280; font-size: 14px;">Payment Method:</span>
              <span style="color: #111827; font-weight: 600; font-size: 14px; text-transform: uppercase;">${order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod}</span>
            </div>
            ` : ""}
          </div>

          ${itemsHtml ? `
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 12px;">Items</div>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 10px 8px; text-align: left; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase;">Product</th>
                  <th style="padding: 10px 8px; text-align: center; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase;">Qty</th>
                  <th style="padding: 10px 8px; text-align: right; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase;">Price</th>
                  ${showPrice ? '<th style="padding: 10px 8px; text-align: right; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase;">Total</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
          ` : ""}

          <!-- Order Totals (only show if showPrice is true) -->
          ${showPrice ? `
          <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6B7280; font-size: 14px;">Subtotal:</span>
              <span style="color: #111827; font-weight: 600; font-size: 14px;">${money(order.subtotal || 0)}</span>
            </div>
            ${order.shipping > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6B7280; font-size: 14px;">Shipping:</span>
              <span style="color: #111827; font-weight: 600; font-size: 14px;">${money(order.shipping || 0)}</span>
            </div>
            ` : ""}
            ${order.cgst > 0 && order.sgst > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6B7280; font-size: 14px;">CGST (9%):</span>
              <span style="color: #111827; font-weight: 600; font-size: 14px;">${money(order.cgst || 0)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6B7280; font-size: 14px;">SGST (9%):</span>
              <span style="color: #111827; font-weight: 600; font-size: 14px;">${money(order.sgst || 0)}</span>
            </div>
            ` : order.igst > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6B7280; font-size: 14px;">IGST (18%):</span>
              <span style="color: #111827; font-weight: 600; font-size: 14px;">${money(order.igst || 0)}</span>
            </div>
            ` : ""}
            <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 2px solid #e5e7eb;">
              <span style="color: #111827; font-weight: 700; font-size: 18px;">Total:</span>
              <span style="color: ${color}; font-weight: 700; font-size: 18px;">${money(order.total || 0)}</span>
            </div>
          </div>
          ` : ""}

          <!-- Tracking Information -->
          ${order.awbNumber ? `
          <div style="margin-top: 20px; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
            <div style="font-size: 14px; font-weight: 600; color: #1e40af; margin-bottom: 8px;">📦 Tracking Information</div>
            <div style="font-size: 13px; color: #374151;">
              <strong>AWB Number:</strong> <span style="font-family: monospace; background: #fff; padding: 4px 8px; border-radius: 4px;">${order.awbNumber}</span>
            </div>
          </div>
          ` : ""}
          ${order.returnAwbNumber ? `
          <div style="margin-top: 16px; padding: 16px; background: #f3e8ff; border: 1px solid #c4b5fd; border-radius: 8px;">
            <div style="font-size: 14px; font-weight: 600; color: #6b21a8; margin-bottom: 8px;">📦 Return Tracking</div>
            <div style="font-size: 13px; color: #374151;">
              <strong>Return AWB:</strong> <span style="font-family: monospace; background: #fff; padding: 4px 8px; border-radius: 4px;">${order.returnAwbNumber}</span>
            </div>
          </div>
          ` : ""}
        </div>

        <!-- Shipping Address -->
        ${order.shippingAddress ? `
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 12px;">📍 Shipping Address</div>
          <div style="font-size: 14px; color: #374151; line-height: 1.8;">
            <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">
              ${order.shippingAddress.firstName || ""} ${order.shippingAddress.lastName || ""}
            </div>
            <div>${order.shippingAddress.address1 || ""}${order.shippingAddress.address2 ? `, ${order.shippingAddress.address2}` : ""}</div>
            <div>${order.shippingAddress.city || ""}, ${order.shippingAddress.state || ""} - ${order.shippingAddress.postcode || ""}</div>
            ${order.shippingAddress.country ? `<div>${order.shippingAddress.country}</div>` : ""}
            ${order.shippingAddress.phone ? `<div style="margin-top: 8px;"><strong>Phone:</strong> ${order.shippingAddress.phone}</div>` : ""}
          </div>
        </div>
        ` : ""}

        <!-- Support Info -->
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
          <div style="font-size: 13px; color: #6B7280; margin-bottom: 8px;">
            Need help? Contact our support team
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 24px; padding: 20px; color: #9CA3AF; font-size: 12px;">
        <div style="margin-bottom: 8px;">© ${new Date().getFullYear()} Elecobuy. All rights reserved.</div>
        <div>This is an automated email. Please do not reply to this message.</div>
      </div>
    </div>
  </body>
</html>
`
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

  try {
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
  } catch (error) {
    console.error("❌ [VendorPush] Error sending push notification:", error)
    return { sent: 0, failed: tokens.length, skipped: false }
  }
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

  const order = await Order.findById(orderId)
    .populate("shippingAddress")
    .populate("items.productId")
    .select("_id orderNumber vendorId status refundStatus createdAt items subtotal shipping total cgst sgst igst paymentMethod awbNumber returnAwbNumber")
    .lean()

  if (!order) return { success: false, reason: "order_not_found" }
  if (!order.vendorId) return { success: false, reason: "order_not_assigned" }

  const vendorUsers = await VendorUser.find({ vendorId: order.vendorId, isActive: true }).lean()
  if (!vendorUsers || vendorUsers.length === 0) return { success: false, reason: "no_vendor_users" }

  const type = mapStageKeyToNotificationType(stageKey)
  const stageInfo = buildStageInfo({ stageKey, order })
  const finalTitle = title || stageInfo.title
  const finalMessage = message || stageInfo.message

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

    // Push notification (to this vendor user's tokens)
    try {
      const tokens =
        (vu.pushTokens || [])
          .map((t) => (t?.token || "").trim())
          .filter(Boolean)

      if (tokens.length > 0) {
        const pushBody = stageInfo.details ? `${finalMessage}\n\n${stageInfo.details.split('\n')[0]}` : finalMessage
        await sendPushToTokens({
          tokens,
          title: finalTitle.replace(/[🎉✅⚙️🚚🎊❌📦⚠️🔍📋💰]/g, "").trim(), // Remove emojis for push title
          body: pushBody.substring(0, 200), // Limit body length
          data: {
            type,
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            stageKey,
          },
        })
      }
    } catch (pushErr) {
      console.error("❌ [VendorStageNotify] Push failed:", pushErr?.message || pushErr)
    }

    // Email (to this vendor user if present)
    try {
      const to = (vu.email || "").trim()
      if (to) {
        const vendorName = vu.name || "Vendor"
        const html = renderVendorEmailHtml({
          vendorName,
          title: finalTitle,
          message: finalMessage,
          details: stageInfo.details,
          order,
          stageInfo,
        })
        await sendEmail({ to, subject: stageInfo.subject, html })
      }
    } catch (emailErr) {
      console.error("❌ [VendorStageNotify] Email failed:", emailErr?.message || emailErr)
    }
  }

  // Fallback email to Vendor.email (once) when vendor users have no emails
  try {
    const anyEmails = vendorUsers.some((vu) => (vu.email || "").trim())
    if (!anyEmails && createdFor.length > 0) {
      const vendor = await Vendor.findById(order.vendorId).select("email name").lean()
      const to = (vendor?.email || "").trim()
      if (to) {
        const vendorName = vendor?.name || "Vendor"
        const html = renderVendorEmailHtml({
          vendorName,
          title: finalTitle,
          message: finalMessage,
          details: stageInfo.details,
          order,
          stageInfo,
        })
        await sendEmail({ to, subject: stageInfo.subject, html })
      }
    }
  } catch (fallbackEmailErr) {
    console.error("❌ [VendorStageNotify] Vendor fallback email failed:", fallbackEmailErr?.message || fallbackEmailErr)
  }

  return { success: true, type, createdFor, skippedFor }
}
