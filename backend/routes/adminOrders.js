import express from "express"
import mongoose from "mongoose"
import Order from "../models/Order.js"
import Customer from "../models/Customer.js"
import Notification from "../models/Notification.js"
import Admin from "../models/Admin.js"
import { verifyAdminToken } from "../middleware/auth.js"
import { createRazorpayRefund } from "../services/razorpayService.js"

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

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
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
      const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
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

// Get all return requests (Admin only)
router.get("/returns", verifyAdminToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = "pending", // pending, accepted, denied
    } = req.query

    // Build filter for return requests
    const filter = {
      "returnRequest.type": status === "all" ? { $ne: null } : status,
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Get orders with return requests
    const orders = await Order.find(filter)
      .populate("customerId", "name mobile email")
      .populate("shippingAddress", "firstName lastName phone address1 city state postcode")
      .populate("returnRequest.reviewedBy", "name email")
      .populate("items.productId", "name brand sku images")
      .sort({ "returnRequest.requestedAt": -1 })
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
    console.error("Get return requests error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching return requests",
      error: error.message,
    })
  }
})

// Accept return request (Admin only)
router.post("/:id/return/accept", verifyAdminToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      })
    }

    const { adminNotes } = req.body

    const order = await Order.findById(req.params.id).populate("customerId", "name mobile email")

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (!order.returnRequest || order.returnRequest.type !== "pending") {
      return res.status(400).json({
        success: false,
        message: "No pending return request found for this order",
      })
    }

    // Get admin info
    const admin = await Admin.findById(req.admin.id)
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not found",
      })
    }

    // Update return request status and order status
    order.returnRequest.type = "accepted"
    order.returnRequest.reviewedAt = new Date()
    order.returnRequest.reviewedBy = req.admin.id
    if (adminNotes) {
      order.returnRequest.adminNotes = adminNotes.trim()
    }
    order.returnRequest.refundStatus = "pending"
    order.status = "return_accepted"

    // Process refund if payment was made online
    let refundResult = null
    let refundError = null

    if (order.paymentMethod === "online" && order.paymentStatus === "paid" && order.paymentTransactionId) {
      try {
        const paymentId = order.paymentMeta?.razorpayPaymentId || order.paymentTransactionId
        const amountInPaise = Math.round(order.total * 100)

        console.log(`🔄 [RETURN ACCEPT] Initiating refund for order ${order.orderNumber}`, {
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
            reason: "return_accepted_by_admin",
            acceptedAt: new Date().toISOString(),
          },
        })

        console.log(`✅ [RETURN ACCEPT] Refund successful for order ${order.orderNumber}`, {
          refundId: refundResult.id,
          amount: refundResult.amount,
        })

        order.returnRequest.refundStatus = "completed"
        order.returnRequest.refundTransactionId = refundResult.id
        order.paymentStatus = "refunded"
        order.paymentMeta = {
          ...(order.paymentMeta || {}),
          returnRefund: refundResult,
          refundedAt: new Date().toISOString(),
        }
      } catch (refundErr) {
        refundError = refundErr
        console.error(`❌ [RETURN ACCEPT] Refund failed for order ${order.orderNumber}:`, refundErr)
        order.returnRequest.refundStatus = "failed"
      }
    } else if (order.paymentMethod === "cod") {
      // For COD, refund is not applicable but we mark it as completed
      order.returnRequest.refundStatus = "completed"
    }

    await order.save()

    // Create notification for customer
    try {
      await Notification.create({
        userId: order.customerId._id,
        userType: "customer",
        type: "return_accepted",
        title: "Return Request Accepted",
        message: `Your return request for order ${order.orderNumber} has been accepted.${refundResult ? " Refund will be processed shortly." : order.paymentMethod === "cod" ? "" : refundError ? " Please contact support for refund." : ""}`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerId: order.customerId._id,
      })
    } catch (notifError) {
      console.error("Error creating return accepted notification:", notifError)
    }

    res.status(200).json({
      success: true,
      message: refundError
        ? "Return request accepted. Refund failed - please process manually."
        : "Return request accepted successfully",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        returnRequest: order.returnRequest,
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
    console.error("Error accepting return request:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error accepting return request",
      error: error.message,
    })
  }
})

// Deny return request (Admin only)
router.post("/:id/return/deny", verifyAdminToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      })
    }

    const { adminNotes } = req.body

    if (!adminNotes || adminNotes.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Admin notes are required when denying a return request",
      })
    }

    const order = await Order.findById(req.params.id).populate("customerId", "name mobile email")

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (!order.returnRequest || order.returnRequest.type !== "pending") {
      return res.status(400).json({
        success: false,
        message: "No pending return request found for this order",
      })
    }

    // Get admin info
    const admin = await Admin.findById(req.admin.id)
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not found",
      })
    }

    // Update return request status and order status
    order.returnRequest.type = "denied"
    order.returnRequest.reviewedAt = new Date()
    order.returnRequest.reviewedBy = req.admin.id
    order.returnRequest.adminNotes = adminNotes.trim()
    order.status = "return_rejected"

    await order.save()

    // Create notification for customer
    try {
      await Notification.create({
        userId: order.customerId._id,
        userType: "customer",
        type: "return_denied",
        title: "Return Request Denied",
        message: `Your return request for order ${order.orderNumber} has been denied. Reason: ${adminNotes.substring(0, 100)}${adminNotes.length > 100 ? "..." : ""}`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerId: order.customerId._id,
      })
    } catch (notifError) {
      console.error("Error creating return denied notification:", notifError)
    }

    res.status(200).json({
      success: true,
      message: "Return request denied successfully",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        returnRequest: order.returnRequest,
      },
    })
  } catch (error) {
    console.error("Error denying return request:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error denying return request",
      error: error.message,
    })
  }
})

export default router

