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
      user: process.env.SMTP_USER || process.env.ADMIN_EMAIL || "connectwithyatin@gmail.com",
      pass: process.env.SMTP_PASS || process.env.ADMIN_EMAIL_PASSWORD,
    },
  })

  return transporter
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

// Create order
router.post("/", authenticate, async (req, res) => {
  try {
    const { addressId, paymentMethod = "cod" } = req.body

    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      })
    }

    // Get customer cart
    const cart = await Cart.findOne({ customerId: req.userId }).populate("items.productId")

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      })
    }

    // Verify address belongs to customer
    const address = await CustomerAddress.findOne({
      _id: addressId,
      customerId: req.userId,
    })

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      })
    }

    // Calculate totals
    let subtotal = 0
    const orderItems = []

    for (const item of cart.items) {
      const product = item.productId
      
      // Check stock
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`,
        })
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

    const shipping = subtotal > 500 ? 0 : 50
    const total = subtotal + shipping

    // Generate unique order number
    // Format: ORD-TIMESTAMP-RANDOM
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substr(2, 9).toUpperCase()
    const orderNumber = `ORD-${timestamp}-${randomSuffix}`

    // Create order
    const order = new Order({
      orderNumber,
      customerId: req.userId,
      items: orderItems,
      shippingAddress: addressId,
      subtotal,
      shipping,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
      status: "pending",
    })

    await order.save()

    // Update product stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.productId._id, {
        $inc: { stock: -item.quantity },
      })
    }

    // Clear cart
    cart.items = []
    await cart.save()

    // Populate address for response
    await order.populate("shippingAddress")

    // Create notifications
    try {
      // Notification for customer
      await Notification.create({
        userId: req.userId,
        userType: "customer",
        type: "order_placed",
        title: "Order Placed Successfully",
        message: `Your order ${orderNumber} has been placed successfully. Total: ₹${total.toLocaleString("en-IN")}`,
        orderId: order._id,
        orderNumber: orderNumber,
        customerId: req.userId,
      })

      // Notification for admin
      const admin = await Admin.findOne({ isActive: true })
      if (admin) {
        await Notification.create({
          userId: admin._id,
          userType: "admin",
          type: "order_placed",
          title: "New Order Placed",
          message: `New order ${orderNumber} has been placed by a customer. Total: ₹${total.toLocaleString("en-IN")}`,
          orderId: order._id,
          orderNumber: orderNumber,
          customerId: req.userId,
        })
      }

      // Notification for all active vendors (order available to accept)
      const vendors = await Vendor.find({ status: "approved", isActive: true })
      for (const vendor of vendors) {
        // Find vendor user to get userId
        const VendorUser = (await import("../models/VendorUser.js")).default
        const vendorUser = await VendorUser.findOne({ vendorId: vendor._id, isActive: true })
        if (vendorUser) {
          await Notification.create({
            userId: vendorUser._id,
            userType: "vendor",
            type: "new_order_available",
            title: "New Order Available",
            message: `New order ${orderNumber} is available to accept. Total: ₹${total.toLocaleString("en-IN")}`,
            orderId: order._id,
            orderNumber: orderNumber,
            customerId: req.userId,
          })
        }
      }

      // Send push notifications to all vendors
      try {
        const { sendPushNotificationToAllVendors } = await import("../routes/pushNotifications.js")
        const pushResult = await sendPushNotificationToAllVendors(
          "New Order Available",
          `New order ${orderNumber} is available to accept. Total: ₹${total.toLocaleString("en-IN")}`,
          {
            type: "new_order_available",
            orderId: order._id.toString(),
            orderNumber: orderNumber,
          }
        )
        
        if (pushResult.success) {
          console.log(`✅ [Order] Push notifications sent to ${pushResult.sent} vendor device(s)`)
        } else {
          console.warn(`⚠️ [Order] Push notification failed: ${pushResult.message}`)
        }
      } catch (pushError) {
        console.error("❌ [Order] Error sending push notifications:", pushError)
        // Don't fail the order creation if push notifications fail
      }
    } catch (notifError) {
      console.error("Error creating notifications:", notifError)
      // Don't fail the order creation if notifications fail
    }

    // Send order confirmation email to customer (non-blocking for order success)
    try {
      const customer = await Customer.findById(req.userId)

      if (!customer || !customer.email) {
        console.warn(
          `⚠️  [ORDER] Customer email not available. Skipping order confirmation email for order ${orderNumber}`
        )
      } else {
        const transporter = getTransporter()

        if (!transporter) {
          console.warn(
            `⚠️  [ORDER] Transporter not configured. Skipping order confirmation email for order ${orderNumber}`
          )
        } else {
          const customerName = customer.name || `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`
          const customerEmail = customer.email
          const adminEmail = process.env.ADMIN_EMAIL || "connectwithyatin@gmail.com"

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
            subject: `Your Order Confirmation - ${orderNumber}`,
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
                      <p><strong>Order Number:</strong> ${orderNumber}</p>
                      <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString("en-IN")}</p>
                      <p><strong>Payment Method:</strong> ${
                        order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod.toUpperCase()
                      }</p>
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
                      <p><strong>Shipping:</strong> ₹${order.shipping.toLocaleString("en-IN")}</p>
                      <p><strong>Grand Total:</strong> ₹${order.total.toLocaleString("en-IN")}</p>
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
          console.log(`✅ [ORDER] Order confirmation email sent to ${customerEmail} for order ${orderNumber}`)
        }
      }
    } catch (emailError) {
      console.error("❌ [ORDER] Error sending order confirmation email:", emailError)
      // Do not fail the order creation if email fails
    }

    res.json({
      success: true,
      message: "Order placed successfully",
      data: order,
    })
  } catch (error) {
    console.error("Error creating order:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

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

export default router
