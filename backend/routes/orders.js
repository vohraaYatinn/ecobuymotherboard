import express from "express"
import mongoose from "mongoose"
import Order from "../models/Order.js"
import Cart from "../models/Cart.js"
import Product from "../models/Product.js"
import Customer from "../models/Customer.js"
import CustomerAddress from "../models/CustomerAddress.js"
import Notification from "../models/Notification.js"
import Admin from "../models/Admin.js"
import Vendor from "../models/Vendor.js"
import { createRazorpayOrder, razorpayConfig, verifyRazorpaySignature, createRazorpayRefund } from "../services/razorpayService.js"
import jwt from "jsonwebtoken"
import nodemailer from "nodemailer"

const router = express.Router()

// Email transporter helper (shared config with enquiries route)
const getTransporter = () => {
  // If SMTP credentials are not provided, return null (email won't be sent but order will still be processed)
  if (!process.env.SMTP_USER && !process.env.ADMIN_EMAIL) {
    console.warn("⚠️  [ORDER] SMTP credentials not configured. Order emails will not be sent.")
    return null
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || process.env.ADMIN_EMAIL || "mahender@ekranfix.com",
      pass: process.env.SMTP_PASS || process.env.ADMIN_EMAIL_PASSWORD,
    },
  })

  return transporter
}

const buildHttpError = (status, message) => {
  const error = new Error(message)
  error.statusCode = status
  return error
}

const sendOrderNotifications = async (order) => {
  if (order.postPaymentNotified) return

  try {
    await Notification.create({
      userId: order.customerId,
      userType: "customer",
      type: "order_placed",
      title: "Order Placed Successfully",
      message: `Your order ${order.orderNumber} has been placed successfully. Total: ₹${order.total.toLocaleString("en-IN")}`,
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
    })

    const admin = await Admin.findOne({ isActive: true })
    if (admin) {
      await Notification.create({
        userId: admin._id,
        userType: "admin",
        type: "order_placed",
        title: "New Order Placed",
        message: `New order ${order.orderNumber} has been placed by a customer. Total: ₹${order.total.toLocaleString("en-IN")}`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
      })
    }

    const vendors = await Vendor.find({ status: "approved", isActive: true })
    for (const vendor of vendors) {
      const VendorUser = (await import("../models/VendorUser.js")).default
      const vendorUser = await VendorUser.findOne({ vendorId: vendor._id, isActive: true })
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

    try {
      const { sendPushNotificationToAllVendors } = await import("../routes/pushNotifications.js")
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
        console.log(`✅ [Order] Push notifications sent to ${pushResult.sent} vendor device(s)`)
      } else {
        console.warn(`⚠️ [Order] Push notification failed: ${pushResult.message}`)
      }
    } catch (pushError) {
      console.error("❌ [Order] Error sending push notifications:", pushError)
    }

    order.postPaymentNotified = true
    await order.save()
  } catch (notifError) {
    console.error("Error creating notifications:", notifError)
  }
}

const sendOrderConfirmationEmail = async (order) => {
  try {
    const customer = await Customer.findById(order.customerId)

    if (!customer || !customer.email) {
      console.warn(`⚠️  [ORDER] Customer email not available. Skipping order confirmation email for order ${order.orderNumber}`)
      return
    }

    const transporter = getTransporter()

    if (!transporter) {
      console.warn(`⚠️  [ORDER] Transporter not configured. Skipping order confirmation email for order ${order.orderNumber}`)
      return
    }

    const customerName = customer.name || `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`
    const customerEmail = customer.email
    const adminEmail = process.env.ADMIN_EMAIL || "mahender@ekranfix.com"

    const orderItemsHtml = order.items
      .map(
        (item) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${item.price.toLocaleString(
                  "en-IN"
                )}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${(
                  item.price * item.quantity
                ).toLocaleString("en-IN")}</td>
              </tr>
            `
      )
      .join("")

    const address = order.shippingAddress
    const addressHtml = `
            <div style="margin-top: 10px;">
              <div><strong>${address.firstName} ${address.lastName}</strong></div>
              <div>${address.address1}${address.address2 ? ", " + address.address2 : ""}</div>
              <div>${address.city}, ${address.state} - ${address.postcode}</div>
              <div>${address.country}</div>
              <div>Phone: ${address.phone}</div>
            </div>
          `

    const mailOptions = {
      from: process.env.SMTP_USER || adminEmail,
      to: customerEmail,
      subject: `Your Order Confirmation - ${order.orderNumber}`,
      html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8" />
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: #2563EB; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                  .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                  .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
                  .summary { margin-top: 10px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h2>Order Confirmation</h2>
                    <p>Thank you for shopping with Elecobuy!</p>
                  </div>
                  <div class="content">
                    <p>Hi ${customerName},</p>
                    <p>We have received your order. Here are your order details:</p>
                    <div class="summary">
                      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                      <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString("en-IN")}</p>
                      <p><strong>Payment Method:</strong> ${order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod.toUpperCase()}</p>
                    </div>
                    <h3>Items</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                      <thead>
                        <tr>
                          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Product</th>
                          <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Qty</th>
                          <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Price</th>
                          <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${orderItemsHtml}
                      </tbody>
                    </table>
                    <div style="margin-top: 15px; text-align: right;">
                      <p><strong>Subtotal:</strong> ₹${order.subtotal.toLocaleString("en-IN")}</p>
                      <p><strong>Shipping/Handling Charges:</strong> ₹${order.shipping.toLocaleString("en-IN")}</p>
                      ${order.cgst > 0 && order.sgst > 0 ? `
                        <p><strong>CGST (9%):</strong> ₹${order.cgst.toLocaleString("en-IN")}</p>
                        <p><strong>SGST (9%):</strong> ₹${order.sgst.toLocaleString("en-IN")}</p>
                      ` : order.igst > 0 ? `
                        <p><strong>IGST (18%):</strong> ₹${order.igst.toLocaleString("en-IN")}</p>
                      ` : ''}
                      <p style="margin-top: 10px; font-size: 18px; border-top: 2px solid #ddd; padding-top: 10px;"><strong>Grand Total:</strong> ₹${order.total.toLocaleString("en-IN")}</p>
                    </div>
                    <h3>Shipping Address</h3>
                    ${addressHtml}
                    <p style="margin-top: 20px;">You will receive another update when your order is shipped.</p>
                  </div>
                  <div class="footer">
                    <p>This email was sent by Elecobuy.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
    }

    await transporter.sendMail(mailOptions)
    console.log(`✅ [ORDER] Order confirmation email sent to ${customerEmail} for order ${order.orderNumber}`)
  } catch (emailError) {
    console.error("❌ [ORDER] Error sending order confirmation email:", emailError)
  }
}

const adjustInventoryAndCart = async (order) => {
  if (order.inventoryAdjusted) {
    return { inventoryAdjusted: true }
  }

  const insufficientItems = []

  for (const item of order.items) {
    const product = await Product.findById(item.productId)
    if (!product || product.stock < item.quantity) {
      insufficientItems.push(item.name || item.productId?.toString())
    }
  }

  if (insufficientItems.length > 0) {
    order.status = "admin_review_required"
    await order.save()
    return { inventoryAdjusted: false, insufficientItems }
  }

  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: -item.quantity },
    })
  }

  order.inventoryAdjusted = true
  await order.save()

  const cart = await Cart.findOne({ customerId: order.customerId })
  if (cart) {
    cart.items = []
    await cart.save()
  }

  return { inventoryAdjusted: true }
}

const finalizeOrderAfterPayment = async (order) => {
  await order.populate("shippingAddress")

  const inventoryResult = await adjustInventoryAndCart(order)
  await sendOrderNotifications(order)
  await sendOrderConfirmationEmail(order)

  return inventoryResult
}

const markOrderAsPaid = async (order, transactionId, paymentMeta, gateway = "razorpay") => {
  if (order.paymentStatus === "paid") return order

  order.paymentStatus = "paid"
  order.paymentMethod = "online"
  order.paymentGateway = gateway || "razorpay"
  order.paymentTransactionId = transactionId || order.paymentTransactionId
  order.paymentMeta = paymentMeta || order.paymentMeta
  order.status = order.status === "cancelled" ? "pending" : order.status || "pending"

  await order.save()
  await finalizeOrderAfterPayment(order)

  return order
}

const markOrderAsFailed = async (order, paymentMeta) => {
  order.paymentStatus = "failed"
  order.status = "cancelled"
  order.paymentMeta = paymentMeta || order.paymentMeta
  await order.save()
  return order
}

const createOrderDraft = async ({ customerId, addressId }) => {
  if (!addressId) {
    throw buildHttpError(400, "Shipping address is required")
  }

  const cart = await Cart.findOne({ customerId }).populate("items.productId")

  if (!cart || cart.items.length === 0) {
    throw buildHttpError(400, "Cart is empty")
  }

  const address = await CustomerAddress.findOne({
    _id: addressId,
    customerId,
  })

  if (!address) {
    throw buildHttpError(404, "Address not found")
  }

  let subtotal = 0
  const orderItems = []

  for (const item of cart.items) {
    const product = item.productId

    if (!product || product.stock < item.quantity) {
      throw buildHttpError(400, `Insufficient stock for ${product?.name || "a product"}`)
    }

    const itemTotal = product.price * item.quantity
    subtotal += itemTotal

    orderItems.push({
      productId: product._id,
      name: product.name,
      brand: product.brand,
      quantity: item.quantity,
      price: product.price,
      image: product.images?.[0] || "",
    })
  }

  const shipping = 1 // Fixed shipping charges as per requirements

  const shippingState = address.state?.trim().toUpperCase() || ""
  const isTelangana = shippingState === "TELANGANA" || shippingState === "TS"
  const taxableAmount = subtotal + shipping
  let cgst = 0
  let sgst = 0
  let igst = 0

  if (isTelangana) {
    cgst = Math.round((taxableAmount * 9) / 100)
    sgst = Math.round((taxableAmount * 9) / 100)
  } else {
    igst = Math.round((taxableAmount * 18) / 100)
  }

  const gstTotal = cgst + sgst + igst
  const total = subtotal + shipping + gstTotal

  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substr(2, 9).toUpperCase()
  const orderNumber = `ORD-${timestamp}-${randomSuffix}`

  const orderCount = await Order.countDocuments()
  const invoiceNumber = String(orderCount + 1).padStart(10, "0")

  const order = new Order({
    orderNumber,
    customerId,
    items: orderItems,
    shippingAddress: addressId,
    subtotal,
    shipping,
    cgst,
    sgst,
    igst,
    total,
    shippingState: address.state,
    invoiceNumber,
    paymentMethod: "online",
    paymentStatus: "pending",
    paymentGateway: "razorpay",
    paymentTransactionId: orderNumber,
    status: "pending",
  })

  await order.save()
  await order.populate("shippingAddress")

  return { order, cart }
}

const handleRazorpayInitiation = async (req, res) => {
  try {
    const { addressId } = req.body

    const { order } = await createOrderDraft({
      customerId: req.userId,
      addressId,
    })

    const amountInPaise = Math.round(order.total * 100)
    const razorpayOrder = await createRazorpayOrder({
      amountInPaise,
      receiptId: order.orderNumber,
      notes: {
        orderId: order._id.toString(),
        customerId: req.userId.toString(),
        orderNumber: order.orderNumber,
      },
    })

    if (!razorpayOrder?.id) {
      throw buildHttpError(500, "Failed to generate Razorpay order")
    }

    order.paymentGateway = "razorpay"
    order.paymentTransactionId = razorpayOrder.id
    order.paymentMeta = {
      ...(order.paymentMeta || {}),
      razorpayOrder,
    }

    await order.save()

    res.json({
      success: true,
      message: "Razorpay order created. Proceed to payment.",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: razorpayConfig.keyId,
        customer: {
          name: `${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}`.trim(),
          contact: order.shippingAddress?.phone,
        },
      },
    })
  } catch (error) {
    const statusCode = error.statusCode || error.response?.status || 500
    const providerData = error.providerData || error.response?.data
    console.error("Error initiating Razorpay payment:", statusCode, providerData || error)
    res.status(statusCode).json({
      success: false,
      message:
        providerData?.message ||
        providerData?.code ||
        error.message ||
        "Failed to initiate Razorpay payment",
      providerData,
    })
  }
}

const handleRazorpayVerification = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
      throw buildHttpError(400, "Missing payment verification details")
    }

    const order = await Order.findById(orderId).populate("shippingAddress")

    if (!order) {
      throw buildHttpError(404, "Order not found for this transaction")
    }

    if (order.customerId.toString() !== req.userId.toString()) {
      throw buildHttpError(403, "You are not allowed to verify this payment")
    }

    const isValid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    })

    if (!isValid) {
      await markOrderAsFailed(order, {
        ...(order.paymentMeta || {}),
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        reason: "invalid_signature",
      })

      throw buildHttpError(400, "Payment verification failed")
    }

    await markOrderAsPaid(
      order,
      razorpayPaymentId,
      {
        ...(order.paymentMeta || {}),
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      },
      "razorpay"
    )

    res.json({
      success: true,
      message: "Payment verified successfully",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
      },
    })
  } catch (error) {
    const statusCode = error.statusCode || error.response?.status || 500
    const providerData = error.providerData || error.response?.data
    console.error("Error verifying Razorpay payment:", statusCode, providerData || error)
    res.status(statusCode).json({
      success: false,
      message: providerData?.message || providerData?.code || error.message || "Failed to verify payment",
      providerData,
    })
  }
}

// Middleware to verify JWT token
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-in-production")
    req.userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    })
  }
}

router.post("/razorpay/initiate", authenticate, handleRazorpayInitiation)
router.post("/razorpay/verify", authenticate, handleRazorpayVerification)
router.get("/razorpay/status/:orderId", authenticate, async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await Order.findById(orderId).populate("shippingAddress").populate("items.productId", "name brand images")

    if (!order) {
      throw buildHttpError(404, "Order not found")
    }

    if (order.customerId.toString() !== req.userId.toString()) {
      throw buildHttpError(403, "You are not allowed to view this payment status")
    }

    res.json({
      success: true,
      message: "Payment status fetched",
      data: {
        order,
      },
    })
  } catch (error) {
    const statusCode = error.statusCode || error.response?.status || 500
    const providerData = error.providerData || error.response?.data
    console.error("Error fetching Razorpay status:", statusCode, providerData || error)
    res.status(statusCode).json({
      success: false,
      message: providerData?.message || providerData?.code || error.message || "Failed to fetch payment status",
      providerData,
    })
  }
})
router.post("/", authenticate, handleRazorpayInitiation)

// Get all orders for customer
router.get("/", authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.userId })
      .populate("shippingAddress")
      .populate("items.productId", "name brand images")
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: orders,
    })
  } catch (error) {
    console.error("Error fetching orders:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Get order statistics for dashboard
router.get("/stats", authenticate, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments({ customerId: req.userId })
    const pendingOrders = await Order.countDocuments({ customerId: req.userId, status: "pending" })
    const processingOrders = await Order.countDocuments({ customerId: req.userId, status: "processing" })
    const shippedOrders = await Order.countDocuments({ customerId: req.userId, status: "shipped" })
    const deliveredOrders = await Order.countDocuments({ customerId: req.userId, status: "delivered" })
    const cancelledOrders = await Order.countDocuments({ customerId: req.userId, status: "cancelled" })

    res.json({
      success: true,
      data: {
        total: totalOrders,
        pending: pendingOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
      },
    })
  } catch (error) {
    console.error("Error fetching order stats:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Get single order
router.get("/:id", authenticate, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      })
    }

    const order = await Order.findOne({
      _id: req.params.id,
      customerId: req.userId,
    })
      .populate("shippingAddress")
      .populate("items.productId", "name brand images")

    if (!order) {
      console.log(`Order not found: ID=${req.params.id}, CustomerID=${req.userId}`)
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    res.json({
      success: true,
      data: order,
    })
  } catch (error) {
    console.error("Error fetching order:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Cancel order endpoint
router.post("/:id/cancel", authenticate, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      })
    }

    const order = await Order.findOne({
      _id: req.params.id,
      customerId: req.userId,
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Check if order can be cancelled
    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled",
      })
    }

    if (order.status === "shipped" || order.status === "delivered") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel order that has been shipped or delivered",
      })
    }

    // Only allow cancellation during processing, pending, or confirmed stages
    const cancellableStatuses = ["pending", "confirmed", "processing"]
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`,
      })
    }

    let refundResult = null
    let refundError = null

    // Process refund if payment was made online and is paid
    if (order.paymentMethod === "online" && order.paymentStatus === "paid" && order.paymentTransactionId) {
      try {
        // Get the payment ID from paymentMeta or paymentTransactionId
        const paymentId = order.paymentMeta?.razorpayPaymentId || order.paymentTransactionId
        
        // If paymentTransactionId is a Razorpay order ID, we need to fetch the payment first
        // For now, assume paymentTransactionId is the payment ID
        const amountInPaise = Math.round(order.total * 100)
        
        console.log(`🔄 [ORDER CANCEL] Initiating refund for order ${order.orderNumber}`, {
          paymentId,
          amount: order.total,
          amountInPaise,
        })

        refundResult = await createRazorpayRefund({
          paymentId,
          amountInPaise,
          notes: {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            reason: "order_cancelled_by_customer",
            cancelledAt: new Date().toISOString(),
          },
        })

        console.log(`✅ [ORDER CANCEL] Refund successful for order ${order.orderNumber}`, {
          refundId: refundResult.id,
          amount: refundResult.amount,
        })

        // Update payment status to refunded
        order.paymentStatus = "refunded"
        order.paymentMeta = {
          ...(order.paymentMeta || {}),
          refund: refundResult,
          refundedAt: new Date().toISOString(),
        }
      } catch (refundErr) {
        refundError = refundErr
        console.error(`❌ [ORDER CANCEL] Refund failed for order ${order.orderNumber}:`, refundErr)
        // Continue with cancellation even if refund fails - admin can handle manually
        // But we should still mark the order as cancelled
      }
    }

    // Restore inventory
    if (order.inventoryAdjusted) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity },
        })
      }
      order.inventoryAdjusted = false
    }

    // Update order status to cancelled
    order.status = "cancelled"

    // Store cancellation metadata
    order.paymentMeta = {
      ...(order.paymentMeta || {}),
      cancelledAt: new Date().toISOString(),
      cancelledBy: "customer",
      cancellationReason: "customer_request",
      refundError: refundError ? refundError.message : null,
    }

    await order.save()

    // Create notification for customer
    try {
      await Notification.create({
        userId: order.customerId,
        userType: "customer",
        type: "order_cancelled",
        title: "Order Cancelled",
        message: `Your order ${order.orderNumber} has been cancelled${refundResult ? ". Refund will be processed shortly." : order.paymentMethod === "cod" ? "." : ". Please contact support for refund."}`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
      })
    } catch (notifError) {
      console.error("Error creating cancellation notification:", notifError)
    }

    // Notify admin about cancellation
    try {
      const admin = await Admin.findOne({ isActive: true })
      if (admin) {
        await Notification.create({
          userId: admin._id,
          userType: "admin",
          type: "order_cancelled",
          title: "Order Cancelled by Customer",
          message: `Order ${order.orderNumber} has been cancelled by customer.${refundError ? " Refund failed - manual intervention required." : ""}`,
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerId: order.customerId,
        })
      }
    } catch (notifError) {
      console.error("Error creating admin notification:", notifError)
    }

    res.json({
      success: true,
      message: refundError
        ? "Order cancelled. Refund failed - please contact support."
        : refundResult
          ? "Order cancelled and refund initiated successfully"
          : "Order cancelled successfully",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        refund: refundResult
          ? {
              id: refundResult.id,
              amount: refundResult.amount / 100,
              status: refundResult.status,
            }
          : null,
        refundError: refundError ? refundError.message : null,
      },
    })
  } catch (error) {
    console.error("Error cancelling order:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Request return for delivered order
router.post("/:id/return", authenticate, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      })
    }

    const { reason } = req.body

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Return reason is required",
      })
    }

    const order = await Order.findOne({
      _id: req.params.id,
      customerId: req.userId,
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Check if order is delivered
    if (order.status !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Return can only be requested for delivered orders",
      })
    }

    // Check if return request already exists
    if (order.returnRequest && order.returnRequest.type) {
      return res.status(400).json({
        success: false,
        message: `Return request already ${order.returnRequest.type}`,
      })
    }

    // Create return request and update order status
    order.returnRequest = {
      type: "pending",
      reason: reason.trim(),
      requestedAt: new Date(),
    }
    order.status = "return_requested"

    await order.save()

    // Create notification for customer
    try {
      await Notification.create({
        userId: order.customerId,
        userType: "customer",
        type: "return_requested",
        title: "Return Request Submitted",
        message: `Your return request for order ${order.orderNumber} has been submitted and is under review.`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
      })
    } catch (notifError) {
      console.error("Error creating return request notification:", notifError)
    }

    // Notify admin about return request
    try {
      const admin = await Admin.findOne({ isActive: true })
      if (admin) {
        await Notification.create({
          userId: admin._id,
          userType: "admin",
          type: "return_requested",
          title: "New Return Request",
          message: `Customer has requested return for order ${order.orderNumber}. Reason: ${reason.substring(0, 50)}${reason.length > 50 ? "..." : ""}`,
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerId: order.customerId,
        })
      }
    } catch (notifError) {
      console.error("Error creating admin notification:", notifError)
    }

    res.json({
      success: true,
      message: "Return request submitted successfully",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        returnRequest: order.returnRequest,
      },
    })
  } catch (error) {
    console.error("Error creating return request:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

export default router
