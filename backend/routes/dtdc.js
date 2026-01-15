import express from "express"
import { verifyAdminToken } from "../middleware/auth.js"
import { trackConsignment, getAuthToken, checkPincodeServiceability } from "../services/dtdcService.js"
import Order from "../models/Order.js"
import mongoose from "mongoose"

const router = express.Router()

/**
 * Track a consignment by AWB number (Admin only)
 * POST /api/dtdc/track
 * Body: { awbNumber: "V01197967" }
 */
router.post("/track", verifyAdminToken, async (req, res) => {
  try {
    const { awbNumber } = req.body

    if (!awbNumber) {
      return res.status(400).json({
        success: false,
        message: "AWB number is required",
      })
    }

    const trackingData = await trackConsignment(awbNumber, true)

    res.json({
      success: true,
      message: "Tracking data retrieved successfully",
      data: trackingData,
    })
  } catch (error) {
    console.error("DTDC tracking error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to track consignment",
      error: error.message,
    })
  }
})

/**
 * Add/Update AWB number for an order (Admin only)
 * PUT /api/dtdc/order/:orderId/awb
 * Body: { awbNumber: "V01197967" }
 */
router.put("/order/:orderId/awb", verifyAdminToken, async (req, res) => {
  try {
    const { orderId } = req.params
    const { awbNumber } = req.body

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      })
    }

    if (!awbNumber) {
      return res.status(400).json({
        success: false,
        message: "AWB number is required",
      })
    }

    // Validate AWB format (DTDC can return 9–12 alphanumeric, e.g. V01197967 or 7X109986044)
    const cleanAWB = awbNumber.trim().toUpperCase()
    if (!/^[A-Z0-9]{9,12}$/.test(cleanAWB)) {
      return res.status(400).json({
        success: false,
        message: "Invalid AWB number format. Expected 9-12 alphanumeric characters (e.g., V01197967 or 7X109986044)",
      })
    }

    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Update AWB number
    order.awbNumber = cleanAWB
    order.trackingLastUpdated = null // Reset tracking data when AWB is updated
    order.dtdcTrackingData = null

    await order.save()

    // Populate before returning
    await order.populate("customerId", "name mobile email")
    await order.populate("shippingAddress")
    await order.populate("vendorId", "name email phone address")
    await order.populate("items.productId", "name brand sku images")

    res.json({
      success: true,
      message: "AWB number updated successfully",
      data: order,
    })
  } catch (error) {
    console.error("Update AWB error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error updating AWB number",
      error: error.message,
    })
  }
})

/**
 * Fetch and update tracking data for an order (Admin only)
 * POST /api/dtdc/order/:orderId/track
 */
router.post("/order/:orderId/track", verifyAdminToken, async (req, res) => {
  try {
    const { orderId } = req.params

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      })
    }

    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (!order.awbNumber) {
      return res.status(400).json({
        success: false,
        message: "AWB number is not set for this order. Please add an AWB number first.",
      })
    }

    // Fetch tracking data from DTDC
    const trackingData = await trackConsignment(order.awbNumber, true)

    // Update order with tracking data
    order.dtdcTrackingData = trackingData
    order.trackingLastUpdated = new Date()

    await order.save()

    // Populate before returning
    await order.populate("customerId", "name mobile email")
    await order.populate("shippingAddress")
    await order.populate("vendorId", "name email phone address")
    await order.populate("items.productId", "name brand sku images")

    res.json({
      success: true,
      message: "Tracking data updated successfully",
      data: {
        order,
        tracking: trackingData,
      },
    })
  } catch (error) {
    console.error("Fetch tracking error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch tracking data",
      error: error.message,
    })
  }
})

/**
 * Get tracking data for an order (Admin only)
 * GET /api/dtdc/order/:orderId/tracking
 */
router.get("/order/:orderId/tracking", verifyAdminToken, async (req, res) => {
  try {
    const { orderId } = req.params

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      })
    }

    const order = await Order.findById(orderId).select("awbNumber dtdcTrackingData trackingLastUpdated")

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (!order.awbNumber) {
      return res.status(400).json({
        success: false,
        message: "AWB number is not set for this order",
      })
    }

    // If tracking data exists and is recent (less than 1 hour old), return cached data
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (order.dtdcTrackingData && order.trackingLastUpdated && order.trackingLastUpdated > oneHourAgo) {
      return res.json({
        success: true,
        message: "Tracking data retrieved from cache",
        data: {
          awbNumber: order.awbNumber,
          tracking: order.dtdcTrackingData,
          lastUpdated: order.trackingLastUpdated,
          cached: true,
        },
      })
    }

    // Otherwise, fetch fresh data
    try {
      const trackingData = await trackConsignment(order.awbNumber, true)

      // Update order with fresh tracking data
      order.dtdcTrackingData = trackingData
      order.trackingLastUpdated = new Date()
      await order.save()

      return res.json({
        success: true,
        message: "Tracking data retrieved successfully",
        data: {
          awbNumber: order.awbNumber,
          tracking: trackingData,
          lastUpdated: order.trackingLastUpdated,
          cached: false,
        },
      })
    } catch (trackError) {
      // If fresh fetch fails but we have cached data, return cached data
      if (order.dtdcTrackingData) {
        return res.json({
          success: true,
          message: "Using cached tracking data (fresh fetch failed)",
          data: {
            awbNumber: order.awbNumber,
            tracking: order.dtdcTrackingData,
            lastUpdated: order.trackingLastUpdated,
            cached: true,
            warning: trackError.message,
          },
        })
      }
      throw trackError
    }
  } catch (error) {
    console.error("Get tracking error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get tracking data",
      error: error.message,
    })
  }
})

/**
 * Check pincode serviceability (Public endpoint)
 * GET /api/dtdc/check-pincode?pincode=110001
 */
router.get("/check-pincode", async (req, res) => {
  try {
    const { pincode, originPincode } = req.query

    if (!pincode) {
      return res.status(400).json({
        success: false,
        message: "Pincode is required",
      })
    }

    const serviceabilityData = await checkPincodeServiceability(pincode, originPincode || null)

    res.json({
      success: serviceabilityData.success,
      message: serviceabilityData.message || "Serviceability check completed",
      data: serviceabilityData,
    })
  } catch (error) {
    console.error("Pincode serviceability check error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check pincode serviceability",
      error: error.message,
    })
  }
})

/**
 * Get tracking data for customer (Customer can track their own orders)
 * GET /api/dtdc/order/:orderId/tracking/customer
 */
router.get("/order/:orderId/tracking/customer", async (req, res) => {
  try {
    const { orderId } = req.params
    const token = req.headers.authorization?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    // Verify token and get customer ID
    const jwt = await import("jsonwebtoken")
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-in-production")
    const customerId = decoded.userId

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      })
    }

    const order = await Order.findOne({
      _id: orderId,
      customerId: customerId,
    }).select("awbNumber dtdcTrackingData trackingLastUpdated")

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (!order.awbNumber) {
      return res.status(400).json({
        success: false,
        message: "Tracking information is not available for this order yet",
      })
    }

    // Return cached data if available, otherwise fetch fresh
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (order.dtdcTrackingData && order.trackingLastUpdated && order.trackingLastUpdated > oneHourAgo) {
      return res.json({
        success: true,
        data: {
          awbNumber: order.awbNumber,
          tracking: order.dtdcTrackingData,
          lastUpdated: order.trackingLastUpdated,
        },
      })
    }

    // Fetch fresh data
    try {
      const trackingData = await trackConsignment(order.awbNumber, true)
      order.dtdcTrackingData = trackingData
      order.trackingLastUpdated = new Date()
      await order.save()

      return res.json({
        success: true,
        data: {
          awbNumber: order.awbNumber,
          tracking: trackingData,
          lastUpdated: order.trackingLastUpdated,
        },
      })
    } catch (trackError) {
      // Return cached data if available, even if stale
      if (order.dtdcTrackingData) {
        return res.json({
          success: true,
          data: {
            awbNumber: order.awbNumber,
            tracking: order.dtdcTrackingData,
            lastUpdated: order.trackingLastUpdated,
            warning: "Using cached data. Fresh fetch failed.",
          },
        })
      }
      throw trackError
    }
  } catch (error) {
    console.error("Customer tracking error:", error)
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      })
    }
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get tracking data",
      error: error.message,
    })
  }
})

export default router


