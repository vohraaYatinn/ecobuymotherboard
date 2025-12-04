import express from "express"
import mongoose from "mongoose"
import Order from "../models/Order.js"
import Customer from "../models/Customer.js"
import { verifyAdminToken } from "../middleware/auth.js"

const router = express.Router()

// Get all orders with filters and pagination (Admin only)
router.get("/", verifyAdminToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      paymentMethod = "",
      paymentStatus = "",
      vendorId = "",
      assignmentMode = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query

    // Build filter object
    const filter = {}
    const orConditions = []

    // Search filter (order number, customer phone, product name, vendor name)
    if (search) {
      orConditions.push(
        { orderNumber: { $regex: search, $options: "i" } },
        { "items.name": { $regex: search, $options: "i" } }
      )

      // Also search by customer phone if search looks like a phone number
      if (/^[\d\s\+\-]+$/.test(search)) {
        const phoneSearch = search.replace(/\D/g, "")
        if (phoneSearch.length >= 10) {
          const customers = await Customer.find({
            mobile: { $regex: phoneSearch, $options: "i" },
          }).select("_id")
          const customerIds = customers.map((c) => c._id)
          if (customerIds.length > 0) {
            orConditions.push({ customerId: { $in: customerIds } })
          }
        }
      }

      // Search by vendor name
      const Vendor = (await import("../models/Vendor.js")).default
      const vendors = await Vendor.find({
        name: { $regex: search, $options: "i" },
      }).select("_id")
      const vendorIds = vendors.map((v) => v._id)
      if (vendorIds.length > 0) {
        orConditions.push({ vendorId: { $in: vendorIds } })
      }

      if (orConditions.length > 0) {
        filter.$or = orConditions
      }
    }

    // Status filter
    if (status && status !== "all") {
      filter.status = status
    }

    // Payment method filter
    if (paymentMethod && paymentMethod !== "all") {
      filter.paymentMethod = paymentMethod
    }

    // Payment status filter
    if (paymentStatus && paymentStatus !== "all") {
      filter.paymentStatus = paymentStatus
    }

    // Vendor filter
    if (vendorId && vendorId !== "all") {
      if (vendorId === "unassigned") {
        // For unassigned orders, combine with search if exists
        const vendorOrConditions = [
          { vendorId: null },
          { vendorId: { $exists: false } }
        ]
        
        if (filter.$or) {
          // Combine search and vendor filter using $and
          filter.$and = [
            { $or: filter.$or },
            { $or: vendorOrConditions }
          ]
          delete filter.$or
        } else {
          filter.$or = vendorOrConditions
        }
      } else {
        // For specific vendor, add to filter directly
        // If we have search conditions, use $and to combine
        if (filter.$or) {
          filter.$and = [
            { $or: filter.$or },
            { vendorId: vendorId }
          ]
          delete filter.$or
        } else {
          filter.vendorId = vendorId
        }
      }
    }

    // Assignment mode filter
    if (assignmentMode && assignmentMode !== "all") {
      if (filter.$and) {
        filter.$and.push({ assignmentMode })
      } else if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { assignmentMode }]
        delete filter.$or
      } else {
        filter.assignmentMode = assignmentMode
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === "asc" ? 1 : -1

    // Get orders with populated data
    const orders = await Order.find(filter)
      .populate("customerId", "name mobile email")
      .populate("shippingAddress", "firstName lastName phone address1 city state postcode")
      .populate("vendorId", "name email phone address")
      .populate("items.productId", "name brand sku images")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean()

    // Get total count
    const total = await Order.countDocuments(filter)

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    console.error("Get admin orders error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message,
    })
  }
})

// Get single order by ID (Admin only)
router.get("/:id", verifyAdminToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      })
    }

    const order = await Order.findById(req.params.id)
      .populate("customerId", "name mobile email")
      .populate("shippingAddress")
      .populate("vendorId", "name email phone address")
      .populate("items.productId", "name brand sku images category")

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    res.status(200).json({
      success: true,
      data: order,
    })
  } catch (error) {
    console.error("Get admin order error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error fetching order",
      error: error.message,
    })
  }
})

// Update order status (Admin only)
router.put("/:id/status", verifyAdminToken, async (req, res) => {
  try {
    const { status } = req.body

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      })
    }

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "admin_review_required"]
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      })
    }

    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    order.status = status
    await order.save()

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    })
  } catch (error) {
    console.error("Update order status error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error updating order status",
      error: error.message,
    })
  }
})

// Update order payment status (Admin only)
router.put("/:id/payment-status", verifyAdminToken, async (req, res) => {
  try {
    const { paymentStatus } = req.body

    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: "Payment status is required",
      })
    }

    const validStatuses = ["pending", "paid", "failed", "refunded"]
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      })
    }

    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    order.paymentStatus = paymentStatus
    await order.save()

    res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
      data: order,
    })
  } catch (error) {
    console.error("Update payment status error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error updating payment status",
      error: error.message,
    })
  }
})

// Update order (Admin only) - Full update
router.put("/:id", verifyAdminToken, async (req, res) => {
  try {
    const { status, paymentStatus, paymentMethod, vendorId } = req.body

    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (status) {
      const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "admin_review_required"]
      if (validStatuses.includes(status)) {
        order.status = status
      }
    }

    if (paymentStatus) {
      const validPaymentStatuses = ["pending", "paid", "failed", "refunded"]
      if (validPaymentStatuses.includes(paymentStatus)) {
        order.paymentStatus = paymentStatus
      }
    }

    if (paymentMethod) {
      const validPaymentMethods = ["cod", "online", "wallet"]
      if (validPaymentMethods.includes(paymentMethod)) {
        order.paymentMethod = paymentMethod
      }
    }

    if (vendorId !== undefined) {
      if (vendorId === null || vendorId === "") {
        order.vendorId = null
        order.assignmentMode = null
      } else {
        // Validate vendor exists
        const Vendor = (await import("../models/Vendor.js")).default
        const vendor = await Vendor.findById(vendorId)
        if (!vendor) {
          return res.status(400).json({
            success: false,
            message: "Vendor not found",
          })
        }
        order.vendorId = vendorId
        // Only set assignment mode if not already set (preserve "accepted-by-vendor" if exists)
        if (!order.assignmentMode) {
          order.assignmentMode = "assigned-by-admin"
        }
        // If order was in admin_review_required status, change to processing
        if (order.status === "admin_review_required") {
          order.status = "processing"
        }
      }
    }

    await order.save()

    // Populate before returning
    await order.populate("customerId", "name mobile email")
    await order.populate("shippingAddress")
    await order.populate("vendorId", "name email phone address")
    await order.populate("items.productId", "name brand sku images")

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: order,
    })
  } catch (error) {
    console.error("Update order error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error updating order",
      error: error.message,
    })
  }
})

// Assign vendor to order (Admin only)
router.put("/:id/assign-vendor", verifyAdminToken, async (req, res) => {
  try {
    const { vendorId } = req.body

    if (vendorId === undefined) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required",
      })
    }

    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (vendorId === null || vendorId === "") {
      order.vendorId = null
      order.assignmentMode = null
    } else {
      // Validate vendor exists
      const Vendor = (await import("../models/Vendor.js")).default
      const vendor = await Vendor.findById(vendorId)
      if (!vendor) {
        return res.status(400).json({
          success: false,
          message: "Vendor not found",
        })
      }
      order.vendorId = vendorId
      order.assignmentMode = "assigned-by-admin"
      // If order was in admin_review_required status, change to processing
      if (order.status === "admin_review_required") {
        order.status = "processing"
      }
    }

    await order.save()

    // Populate before returning
    await order.populate("vendorId", "name email phone address")

    res.status(200).json({
      success: true,
      message: vendorId ? "Vendor assigned successfully" : "Vendor unassigned successfully",
      data: order,
    })
  } catch (error) {
    console.error("Assign vendor error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID or vendor ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error assigning vendor",
      error: error.message,
    })
  }
})

// Bulk delete orders (Admin only) - Soft delete by setting status to cancelled
router.post("/bulk-delete", verifyAdminToken, async (req, res) => {
  try {
    const { orderIds } = req.body

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "orderIds array is required and must not be empty",
      })
    }

    // Validate all order IDs are valid MongoDB ObjectIds
    const invalidIds = orderIds.filter((id) => !mongoose.Types.ObjectId.isValid(id))
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid order ID format: ${invalidIds.join(", ")}`,
      })
    }

    // Update all orders to cancelled status (soft delete)
    const result = await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { status: "cancelled" } }
    )

    res.status(200).json({
      success: true,
      message: `Successfully cancelled ${result.modifiedCount} order(s)`,
      data: {
        deletedCount: result.modifiedCount,
        totalRequested: orderIds.length,
      },
    })
  } catch (error) {
    console.error("Bulk delete orders error:", error)
    res.status(500).json({
      success: false,
      message: "Error cancelling orders",
      error: error.message,
    })
  }
})

// Delete order (Admin only) - Soft delete by setting status to cancelled
router.delete("/:id", verifyAdminToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Soft delete - set status to cancelled
    order.status = "cancelled"
    await order.save()

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
    })
  } catch (error) {
    console.error("Delete order error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error cancelling order",
      error: error.message,
    })
  }
})

// Get order statistics (Admin only)
router.get("/stats/overview", verifyAdminToken, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments()
    const pendingOrders = await Order.countDocuments({ status: "pending" })
    const processingOrders = await Order.countDocuments({ status: "processing" })
    const shippedOrders = await Order.countDocuments({ status: "shipped" })
    const deliveredOrders = await Order.countDocuments({ status: "delivered" })
    const cancelledOrders = await Order.countDocuments({ status: "cancelled" })
    const adminReviewRequiredOrders = await Order.countDocuments({ status: "admin_review_required" })

    // Calculate total revenue from delivered orders
    const revenueResult = await Order.aggregate([
      { $match: { status: "delivered", paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ])
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0

    res.json({
      success: true,
      data: {
        total: totalOrders,
        pending: pendingOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
        adminReviewRequired: adminReviewRequiredOrders,
        totalRevenue,
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

