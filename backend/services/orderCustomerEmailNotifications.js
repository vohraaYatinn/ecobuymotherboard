import Order from "../models/Order.js"
import Customer from "../models/Customer.js"
import { sendEmail } from "./mailer.js"

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`

const getBuyerPortalUrl = (orderId) => {
  const base = process.env.FRONTEND_URL || "https://elecobuy.com"
  // Best-effort: most deployments have a dashboard; if you have a dedicated order page, update here.
  return `${base.replace(/\/$/, "")}/dashboard`
}

const stageCopy = ({ stageKey, order }) => {
  const orderNumber = order.orderNumber

  // Stage keys we use:
  // - status:<order.status>
  // - dtdc:<forward dtdcStatus>
  // - return_dtdc:<return dtdcStatus>
  // - refund:<refundStatus>

  if (stageKey.startsWith("status:")) {
    const status = stageKey.replace("status:", "")
    switch (status) {
      case "pending":
        return {
          subject: `Order placed - ${orderNumber}`,
          title: "Order placed",
          message: `We’ve received your order ${orderNumber}.`,
        }
      case "confirmed":
        return {
          subject: `Order confirmed - ${orderNumber}`,
          title: "Order confirmed",
          message: `Your order ${orderNumber} has been confirmed.`,
        }
      case "processing":
        return {
          subject: `Order processing - ${orderNumber}`,
          title: "Order is being processed",
          message: `Your order ${orderNumber} is now being processed.`,
        }
      case "shipped":
        return {
          subject: `Order shipped - ${orderNumber}`,
          title: "Order shipped",
          message: `Your order ${orderNumber} has been shipped.${order.awbNumber ? ` Tracking (AWB): ${order.awbNumber}.` : ""}`,
        }
      case "delivered":
        return {
          subject: `Order delivered - ${orderNumber}`,
          title: "Order delivered",
          message: `Your order ${orderNumber} has been delivered. Thank you for shopping with us.`,
        }
      case "cancelled":
        return {
          subject: `Order cancelled - ${orderNumber}`,
          title: "Order cancelled",
          message: `Your order ${orderNumber} has been cancelled.`,
        }
      case "return_requested":
        return {
          subject: `Return requested - ${orderNumber}`,
          title: "Return request submitted",
          message: `We’ve received your return request for order ${orderNumber}.`,
        }
      case "return_accepted":
        return {
          subject: `Return accepted - ${orderNumber}`,
          title: "Return request accepted",
          message: `Your return request for order ${orderNumber} has been accepted.${order.returnAwbNumber ? ` Return pickup AWB: ${order.returnAwbNumber}.` : ""}`,
        }
      case "return_rejected":
        return {
          subject: `Return rejected - ${orderNumber}`,
          title: "Return request rejected",
          message: `Your return request for order ${orderNumber} has been rejected.`,
        }
      case "return_picked_up":
        return {
          subject: `Return picked up - ${orderNumber}`,
          title: "Return picked up",
          message: `Your return for order ${orderNumber} has been picked up. Refund (if applicable) will be processed shortly.`,
        }
      case "admin_review_required":
        return {
          subject: `Order update - ${orderNumber}`,
          title: "Order update",
          message: `Your order ${orderNumber} is taking longer than usual to assign/confirm. Our team is reviewing it and will update you shortly.`,
        }
      default:
        return {
          subject: `Order update - ${orderNumber}`,
          title: "Order update",
          message: `Your order ${orderNumber} status is now "${status}".`,
        }
    }
  }

  if (stageKey.startsWith("dtdc:")) {
    const dtdc = stageKey.replace("dtdc:", "")
    return {
      subject: `Shipping update - ${orderNumber}`,
      title: "Shipping update",
      message: `Your shipment for order ${orderNumber} is now "${dtdc.replace(/_/g, " ")}".${order.awbNumber ? ` Tracking (AWB): ${order.awbNumber}.` : ""}`,
    }
  }

  if (stageKey.startsWith("return_dtdc:")) {
    const dtdc = stageKey.replace("return_dtdc:", "")
    return {
      subject: `Return pickup update - ${orderNumber}`,
      title: "Return pickup update",
      message: `Your return shipment for order ${orderNumber} is now "${dtdc.replace(/_/g, " ")}".${order.returnAwbNumber ? ` Return AWB: ${order.returnAwbNumber}.` : ""}`,
    }
  }

  if (stageKey.startsWith("refund:")) {
    const rs = stageKey.replace("refund:", "")
    if (rs === "processing") {
      return {
        subject: `Refund initiated - ${orderNumber}`,
        title: "Refund initiated",
        message: `We’ve initiated the refund for order ${orderNumber}. Amount: ${money(order.total)}.`,
      }
    }
    if (rs === "completed") {
      return {
        subject: `Refund completed - ${orderNumber}`,
        title: "Refund completed",
        message: `Your refund for order ${orderNumber} has been completed. Amount: ${money(order.total)}.`,
      }
    }
    if (rs === "failed") {
      return {
        subject: `Refund update - ${orderNumber}`,
        title: "Refund needs attention",
        message: `We couldn’t complete the refund automatically for order ${orderNumber}. Please contact support for help.`,
      }
    }
    return {
      subject: `Refund update - ${orderNumber}`,
      title: "Refund update",
      message: `Refund status for order ${orderNumber} is now "${rs}".`,
    }
  }

  return {
    subject: `Order update - ${orderNumber}`,
    title: "Order update",
    message: `There is an update on your order ${orderNumber}.`,
  }
}

const renderEmailHtml = ({ customerName, title, message, order }) => {
  const portalUrl = getBuyerPortalUrl(order._id)
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; margin: 0; padding: 0;">
    <div style="max-width: 640px; margin: 0 auto; padding: 20px;">
      <div style="background:#2563EB; color:#fff; padding:18px 20px; border-radius:8px 8px 0 0;">
        <div style="font-size:18px; font-weight:700;">${title}</div>
        <div style="font-size:13px; opacity:0.9; margin-top:4px;">Elecobuy order update</div>
      </div>
      <div style="border:1px solid #e5e7eb; border-top:none; padding:18px 20px; background:#fff;">
        <div style="margin-bottom:12px;">Hi ${customerName},</div>
        <div style="margin-bottom:14px;">${message}</div>
        <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:14px 16px; margin:16px 0;">
          <div><strong>Order:</strong> ${order.orderNumber}</div>
          <div><strong>Total:</strong> ${money(order.total)}</div>
          <div><strong>Status:</strong> ${order.status}</div>
          ${order.awbNumber ? `<div><strong>Tracking (AWB):</strong> ${order.awbNumber}</div>` : ""}
          ${order.returnAwbNumber ? `<div><strong>Return AWB:</strong> ${order.returnAwbNumber}</div>` : ""}
        </div>
        <a href="${portalUrl}" style="display:inline-block; background:#111827; color:#fff; text-decoration:none; padding:10px 14px; border-radius:8px; font-weight:600;">
          View in Buyer Portal
        </a>
      </div>
      <div style="font-size:12px; color:#6b7280; margin-top:14px; text-align:center;">
        If you didn’t place this order, please contact support.
      </div>
    </div>
  </body>
</html>
`
}

/**
 * Sends a customer email exactly once per stageKey (deduped via Order.emailNotifiedStages).
 * Returns { skipped: true } if stage was already sent.
 */
export async function sendCustomerOrderStageEmail({ orderId, stageKey }) {
  if (!orderId || !stageKey) return { skipped: true, reason: "missing_params" }

  // Atomic dedupe: only proceed if stageKey was not already recorded.
  const order = await Order.findOneAndUpdate(
    { _id: orderId, emailNotifiedStages: { $ne: stageKey } },
    { $addToSet: { emailNotifiedStages: stageKey } },
    { new: true }
  )
    .populate("shippingAddress")
    .lean()

  if (!order) return { skipped: true, reason: "already_sent_or_missing_order" }

  const customer = await Customer.findById(order.customerId).select("name email").lean()
  if (!customer?.email) return { skipped: true, reason: "missing_customer_email" }

  const { subject, title, message } = stageCopy({ stageKey, order })
  const customerName =
    customer.name ||
    `${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}`.trim() ||
    "there"

  const html = renderEmailHtml({ customerName, title, message, order })
  const sendResult = await sendEmail({ to: customer.email, subject, html })

  if (!sendResult.sent) {
    // Best-effort rollback so we can retry later if SMTP was temporarily down
    await Order.updateOne({ _id: orderId }, { $pull: { emailNotifiedStages: stageKey } })
    return { skipped: true, reason: sendResult.reason || "send_failed" }
  }

  return { sent: true }
}

