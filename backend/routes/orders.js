import express from "express"
import mongoose from "mongoose"
import Order from "../models/Order.js"
import Cart from "../models/Cart.js"
import Product from "../models/Product.js"
import CustomerAddress from "../models/CustomerAddress.js"
import Notification from "../models/Notification.js"
import Admin from "../models/Admin.js"
import Vendor from "../models/Vendor.js"
import jwt from "jsonwebtoken"

const router = express.Router()

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
