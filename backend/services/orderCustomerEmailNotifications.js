import Order from "../models/Order.js"
import Customer from "../models/Customer.js"
import { sendEmail } from "./mailer.js"
import { messaging, reinitializeFirebase } from "../config/firebase-admin.js"
import Product from "../models/Product.js"

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`

const getBuyerPortalUrl = (orderId) => {
  const base = process.env.FRONTEND_URL || "https://elecobuy.com"
  return `${base.replace(/\/$/, "")}/dashboard`
}

/**
 * Send push notification to customer devices
 */
async function sendPushToCustomerTokens({ tokens, title, body, data }) {
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
    console.error("❌ [CustomerPush] Error sending push notification:", error)
    return { sent: 0, failed: tokens.length, skipped: false }
  }
}

const stageCopy = ({ stageKey, order }) => {
  const orderNumber = order.orderNumber
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  }) : ""

  // Show price only for order creation (pending) and return-related stages
  const showPrice = stageKey === "status:pending" || stageKey.startsWith("return_") || stageKey.startsWith("refund:")

  if (stageKey.startsWith("status:")) {
    const status = stageKey.replace("status:", "")
    switch (status) {
      case "pending":
        return {
          subject: `Order Placed Successfully - ${orderNumber}`,
          title: "🎉 Order Placed Successfully!",
          message: `Great news! We've received your order and payment confirmation. Your order is now being prepared for processing.`,
          details: `We're excited to fulfill your order. Our team will begin processing it shortly, and you'll receive updates at every step of the journey.`,
          icon: "✅",
          color: "#10B981",
          showPrice: true
        }
      case "confirmed":
        return {
          subject: `Order Confirmed - ${orderNumber}`,
          title: "✅ Order Confirmed",
          message: `Your order has been confirmed and is ready to be processed.`,
          details: `We've verified your order details and payment. Your items are now being prepared for shipment.`,
          icon: "✅",
          color: "#10B981",
          showPrice: false
        }
      case "processing":
        return {
          subject: `Order Processing - ${orderNumber}`,
          title: "⚙️ Order is Being Processed",
          message: `Your order is now being processed by our team.`,
          details: `We're carefully preparing your items for shipment. This includes quality checks, packaging, and preparing shipping labels. You'll receive another update once your order is ready to ship.`,
          icon: "⚙️",
          color: "#F59E0B",
          showPrice: false
        }
      case "shipped":
        return {
          subject: `Order Shipped - ${orderNumber}`,
          title: "🚚 Your Order Has Shipped!",
          message: `Great news! Your order has been shipped and is on its way to you.`,
          details: order.awbNumber 
            ? `Your package is now in transit. You can track your shipment using the AWB number provided below. Expected delivery will be updated as your package moves through our logistics network.`
            : `Your package is now in transit. Expected delivery details will be shared soon.`,
          icon: "🚚",
          color: "#3B82F6",
          showPrice: false
        }
      case "delivered":
        return {
          subject: `Order Delivered - ${orderNumber}`,
          title: "🎊 Order Delivered Successfully!",
          message: `Your order has been delivered successfully. We hope you love your purchase!`,
          details: `Thank you for shopping with us! Your order has been delivered. If you have any questions or concerns, please don't hesitate to reach out to our customer support team. We'd also love to hear your feedback!`,
          icon: "🎊",
          color: "#10B981",
          showPrice: false
        }
      case "cancelled":
        return {
          subject: `Order Cancelled - ${orderNumber}`,
          title: "❌ Order Cancelled",
          message: `Your order has been cancelled as requested.`,
          details: `If you made a payment, your refund will be processed according to our refund policy. You'll receive a separate notification once the refund is initiated. If you have any questions, please contact our support team.`,
          icon: "❌",
          color: "#EF4444",
          showPrice: false
        }
      case "return_requested":
        return {
          subject: `Return Request Received - ${orderNumber}`,
          title: "📦 Return Request Received",
          message: `We've received your return request and it's currently under review.`,
          details: `Our team will review your return request within 24-48 hours. You'll receive an update once the review is complete. Please ensure the items are in their original condition and packaging.`,
          icon: "📦",
          color: "#8B5CF6",
          showPrice: true
        }
      case "return_accepted":
        return {
          subject: `Return Accepted - ${orderNumber}`,
          title: "✅ Return Request Accepted",
          message: `Your return request has been accepted! We'll arrange a pickup for your items.`,
          details: order.returnAwbNumber
            ? `A reverse pickup has been scheduled. You can track the pickup using the return AWB number provided below. Once we receive the items, your refund will be processed.`
            : `A reverse pickup will be scheduled soon. You'll receive pickup details via SMS and email. Once we receive the items, your refund will be processed.`,
          icon: "✅",
          color: "#10B981",
          showPrice: true
        }
      case "return_rejected":
        return {
          subject: `Return Request Update - ${orderNumber}`,
          title: "⚠️ Return Request Review",
          message: `Your return request could not be processed as requested.`,
          details: `Our team has reviewed your return request. If you believe this is an error or have questions, please contact our customer support team. We're here to help resolve any issues.`,
          icon: "⚠️",
          color: "#F59E0B",
          showPrice: true
        }
      case "return_picked_up":
        return {
          subject: `Return packed up - ${orderNumber}`,
          title: "📦 Return packed up Successfully",
          message: `Your return items have been packed up and are on their way back to us.`,
          details: `We've received your returned items. Our team will inspect them and process your refund within 5-7 business days. You'll receive a notification once the refund is initiated.`,
          icon: "📦",
          color: "#8B5CF6",
          showPrice: true
        }
      case "admin_review_required":
        return {
          subject: `Order Under Review - ${orderNumber}`,
          title: "🔍 Order Under Review",
          message: `Your order is currently under review by our team.`,
          details: `We're taking extra care to ensure everything is perfect with your order. This may take a bit longer than usual, but we'll keep you updated. You'll receive another notification once the review is complete.`,
          icon: "🔍",
          color: "#6366F1",
          showPrice: false
        }
      default:
        return {
          subject: `Order Update - ${orderNumber}`,
          title: "📋 Order Update",
          message: `There's an update on your order.`,
          details: `Your order status has been updated to "${status}". Check your order details for more information.`,
          icon: "📋",
          color: "#6B7280",
          showPrice: false
        }
    }
  }

  if (stageKey.startsWith("dtdc:")) {
    const dtdc = stageKey.replace("dtdc:", "")
    const dtdcStatusText = dtdc.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
    
    let message = ""
    let details = ""
    
    switch (dtdc) {
      case "booked":
        message = "Your shipment has been booked with our logistics partner."
        details = "The shipping label has been created and your package is ready to be packed up by the courier."
        break
      case "in_transit":
        message = "Your package is in transit and on its way to you."
        details = "Your order is moving through our logistics network. You'll receive updates as it progresses."
        break
      case "out_for_delivery":
        message = "Your package is out for delivery!"
        details = "Great news! Your order is out for delivery and should reach you today. Please ensure someone is available to receive the package."
        break
      case "delivered":
        message = "Your package has been delivered successfully."
        details = "Your order has been delivered. We hope you're happy with your purchase!"
        break
      case "rto":
        message = "Your package is being returned to the origin."
        details = "The courier was unable to deliver your package. It's being returned to us. Our team will contact you to arrange redelivery."
        break
      case "failed":
        message = "There was an issue with the delivery attempt."
        details = "The courier encountered an issue while attempting delivery. They will try again, or our team will contact you to resolve this."
        break
      case "cancelled":
        message = "The shipment has been cancelled."
        details = "The shipment for this order has been cancelled. Our team will contact you with next steps."
        break
      default:
        message = `Your shipment status is now: ${dtdcStatusText}`
        details = `Track your package using the AWB number provided below.`
    }
    
    return {
      subject: `Shipping Update - ${orderNumber}`,
      title: `📦 ${dtdcStatusText}`,
      message,
      details: order.awbNumber ? `${details} Track your package using AWB: ${order.awbNumber}` : details,
      icon: "📦",
      color: "#3B82F6",
      showPrice: false
    }
  }

  if (stageKey.startsWith("return_dtdc:")) {
    const dtdc = stageKey.replace("return_dtdc:", "")
    const dtdcStatusText = dtdc.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
    
    let message = ""
    let details = ""
    
    switch (dtdc) {
      case "booked":
        message = "Return pickup has been booked."
        details = "The return pickup has been scheduled. Our courier partner will contact you to arrange the pickup."
        break
      case "in_transit":
        message = "Your return is in transit back to us."
        details = "Your returned items are on their way back to our warehouse. We'll process your refund once we receive and inspect the items."
        break
      case "out_for_delivery":
        message = "Return pickup is scheduled for today."
        details = "Our courier partner will pick up your return items today. Please ensure the items are ready and in their original packaging."
        break
      case "delivered":
        message = "Return items received successfully."
        details = "We've received your returned items. Our team will inspect them and process your refund within 5-7 business days."
        break
      default:
        message = `Return status: ${dtdcStatusText}`
        details = order.returnAwbNumber ? `Track your return using AWB: ${order.returnAwbNumber}` : ""
    }
    
    return {
      subject: `Return Pickup Update - ${orderNumber}`,
      title: `📦 Return: ${dtdcStatusText}`,
      message,
      details: order.returnAwbNumber ? `${details} Track using Return AWB: ${order.returnAwbNumber}` : details,
      icon: "📦",
      color: "#8B5CF6",
      showPrice: true
    }
  }

  if (stageKey.startsWith("refund:")) {
    const rs = stageKey.replace("refund:", "")
    if (rs === "processing") {
      return {
        subject: `Refund Initiated - ${orderNumber}`,
        title: "💰 Refund Initiated",
        message: `We've initiated your refund. The amount will be credited back to your original payment method.`,
        details: `Refund Amount: ${money(order.total)}\n\nYour refund is being processed and will be credited to your original payment method within 5-7 business days. You'll receive a confirmation once the refund is completed.`,
        icon: "💰",
        color: "#10B981",
        showPrice: true
      }
    }
    if (rs === "completed") {
      return {
        subject: `Refund Completed - ${orderNumber}`,
        title: "✅ Refund Completed",
        message: `Your refund has been successfully processed and credited.`,
        details: `Refund Amount: ${money(order.total)}\n\nYour refund has been completed and the amount has been credited to your original payment method. It may take 1-2 business days to reflect in your account depending on your bank. Thank you for your patience!`,
        icon: "✅",
        color: "#10B981",
        showPrice: true
      }
    }
    if (rs === "failed") {
      return {
        subject: `Refund Issue - ${orderNumber}`,
        title: "⚠️ Refund Needs Attention",
        message: `We encountered an issue processing your refund automatically.`,
        details: `We couldn't complete the refund automatically. Please contact our customer support team with your order number, and we'll resolve this immediately. We apologize for the inconvenience.`,
        icon: "⚠️",
        color: "#EF4444",
        showPrice: true
      }
    }
    return {
      subject: `Refund Update - ${orderNumber}`,
      title: "💰 Refund Update",
      message: `Your refund status has been updated.`,
      details: `Refund status: ${rs}. Check your order details for more information.`,
      icon: "💰",
      color: "#6B7280",
      showPrice: true
    }
  }

  return {
    subject: `Order Update - ${orderNumber}`,
    title: "📋 Order Update",
    message: `There is an update on your order.`,
    details: `Check your order details for more information.`,
    icon: "📋",
    color: "#6B7280",
    showPrice: false
  }
}

/**
 * Render beautiful HTML email template
 */
const renderEmailHtml = ({ customerName, title, message, details, order, stageInfo }) => {
  const portalUrl = getBuyerPortalUrl(order._id)
  const { icon = "📋", color = "#6B7280", showPrice = false } = stageInfo || {}
  
  // Format order items for display
  const itemsHtml = order.items && order.items.length > 0 ? order.items.map(item => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 8px; vertical-align: top;">
        <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${item.name || "Product"}</div>
        ${item.brand ? `<div style="font-size: 13px; color: #6B7280;">Brand: ${item.brand}</div>` : ""}
      </td>
      <td style="padding: 12px 8px; text-align: center; color: #374151;">${item.quantity || 1}</td>
      ${showPrice ? `
      <td style="padding: 12px 8px; text-align: right; color: #111827; font-weight: 600;">${money(item.price || 0)}</td>
      <td style="padding: 12px 8px; text-align: right; color: #111827; font-weight: 600;">${money((item.price || 0) * (item.quantity || 1))}</td>
      ` : `
      <td style="padding: 12px 8px; text-align: right; color: #111827; font-weight: 600;">-</td>
      <td style="padding: 12px 8px; text-align: right; color: #111827; font-weight: 600;">-</td>
      `}
    </tr>
  `).join("") : ""

  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { 
    year: "numeric", 
    month: "long", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }) : ""

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
        <div style="font-size: 14px; opacity: 0.95;">Elecobuy Order Update</div>
      </div>

      <!-- Main Content -->
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; padding: 32px 24px; border-radius: 0 0 12px 12px;">
        <!-- Greeting -->
        <div style="margin-bottom: 24px; font-size: 16px; color: #374151;">
          Hi ${customerName},
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
            Order Summary
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
            <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 12px;">Items Ordered</div>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 10px 8px; text-align: left; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase;">Product</th>
                  <th style="padding: 10px 8px; text-align: center; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase;">Qty</th>
                  ${showPrice ? `
                  <th style="padding: 10px 8px; text-align: right; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase;">Price</th>
                  <th style="padding: 10px 8px; text-align: right; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase;">Total</th>
                  ` : ''}
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

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0 24px;">
          <a href="${portalUrl}" style="display: inline-block; background: ${color}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            View Order Details
          </a>
        </div>

        <!-- Support Info -->
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
          <div style="font-size: 13px; color: #6B7280; margin-bottom: 8px;">
            Need help? Contact our support team
          </div>
          <div style="font-size: 12px; color: #9CA3AF;">
            If you didn't place this order, please contact us immediately.
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

/**
 * Sends a customer email and push notification exactly once per stageKey (deduped via Order.emailNotifiedStages).
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
    .populate("items.productId")
    .lean()

  if (!order) return { skipped: true, reason: "already_sent_or_missing_order" }

  const customer = await Customer.findById(order.customerId).select("name email pushTokens").lean()
  if (!customer?.email) return { skipped: true, reason: "missing_customer_email" }

  const stageInfo = stageCopy({ stageKey, order })
  const { subject, title, message, details } = stageInfo
  const customerName =
    customer.name ||
    `${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}`.trim() ||
    "there"

  // Send email
  const html = renderEmailHtml({ customerName, title, message, details, order, stageInfo })
  const sendResult = await sendEmail({ to: customer.email, subject, html })

  if (!sendResult.sent) {
    // Best-effort rollback so we can retry later if SMTP was temporarily down
    await Order.updateOne({ _id: orderId }, { $pull: { emailNotifiedStages: stageKey } })
    return { skipped: true, reason: sendResult.reason || "send_failed" }
  }

  // Send push notification
  try {
    if (customer.pushTokens && customer.pushTokens.length > 0) {
      const tokens = customer.pushTokens
        .map((t) => t?.token || "")
        .filter(Boolean)
        .map((t) => t.trim())

      if (tokens.length > 0) {
        const pushBody = details ? `${message}\n\n${details.split('\n')[0]}` : message
        await sendPushToCustomerTokens({
          tokens,
          title: title.replace(/[🎉✅⚙️🚚🎊❌📦⚠️🔍📋💰]/g, "").trim(), // Remove emojis for push title
          body: pushBody.substring(0, 200), // Limit body length
          data: {
            type: "order_update",
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            stageKey,
          },
        })
      }
    }
  } catch (pushError) {
    console.error("❌ [CustomerEmail] Error sending push notification:", pushError)
    // Don't fail email if push fails
  }

  return { sent: true }
}
