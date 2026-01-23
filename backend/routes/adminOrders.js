import express from "express"
import mongoose from "mongoose"
import Order from "../models/Order.js"
import Customer from "../models/Customer.js"
import Notification from "../models/Notification.js"
import Admin from "../models/Admin.js"
import { verifyAdminToken } from "../middleware/auth.js"
import { createShipmentForOrder } from "../services/dtdcService.js"
import Vendor from "../models/Vendor.js"
import VendorUser from "../models/VendorUser.js"
import { sendCustomerOrderStageEmail } from "../services/orderCustomerEmailNotifications.js"
import { notifyVendorsForOrderStage } from "../services/vendorOrderStageNotifications.js"

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
      showUncompletedOrders = "",
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

    // Payment status filter - Apply last to ensure proper combination
    if (showUncompletedOrders === "true") {
      // When "Show uncompleted orders" is checked, show orders that are:
      // - Not delivered (status != "delivered") OR
      // - Unpaid (paymentStatus = "pending" or "failed")
      const uncompletedConditions = [
        { status: { $ne: "delivered" } },
        { paymentStatus: { $in: ["pending", "failed"] } }
      ]
      
      // Combine with existing filters using $and
      if (filter.$and) {
        filter.$and.push({ $or: uncompletedConditions })
      } else if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: uncompletedConditions }
        ]
        delete filter.$or
      } else {
        filter.$or = uncompletedConditions
      }
    } else if (paymentStatus && paymentStatus !== "all") {
      // User explicitly selected a payment status filter
      if (filter.$and) {
        filter.$and.push({ paymentStatus })
      } else if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { paymentStatus }]
        delete filter.$or
      } else {
        filter.paymentStatus = paymentStatus
      }
    } else {
      // Default filter: Only show orders where payment is completed (paid, refunded) or order is cancelled
      // Exclude orders with pending/failed payment status (when customer opens Razorpay but doesn't complete)
      const paymentStatusConditions = [
        { paymentStatus: { $in: ["paid", "refunded"] } },
        { status: "cancelled" }
      ]
      
      // Combine with existing filters using $and
      if (filter.$and) {
        filter.$and.push({ $or: paymentStatusConditions })
      } else if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: paymentStatusConditions }
        ]
        delete filter.$or
      } else {
        filter.$or = paymentStatusConditions
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
      .populate("vendorId", "name email phone address commission")
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
      .populate("vendorId", "name email phone address commission")
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

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "admin_review_required", "return_requested", "return_accepted", "return_rejected", "return_picked_up"]
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

    const oldStatus = order.status

    // Set deliveredAt when order is marked delivered for the first time
    if (status === "delivered" && order.status !== "delivered" && !order.deliveredAt) {
      order.deliveredAt = new Date()
    }

    order.status = status
    await order.save()

    // Email buyer on status change (deduped)
    try {
      if (oldStatus !== status) {
        await sendCustomerOrderStageEmail({ orderId: order._id, stageKey: `status:${status}` })
      }
    } catch (emailErr) {
      console.error("Error sending buyer status email (admin update):", emailErr)
    }

    // Notify vendor (push + email) on status change (deduped)
    try {
      if (oldStatus !== status) {
        await notifyVendorsForOrderStage({ orderId: order._id, stageKey: `status:${status}` })
      }
    } catch (vendorErr) {
      console.error("Error sending vendor status notifications (admin update):", vendorErr)
    }

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
    const { status, paymentStatus, paymentMethod, vendorId, createdAt, deliveredAt } = req.body

    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    const oldStatus = order.status

    if (status) {
      const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "admin_review_required", "return_requested", "return_accepted", "return_rejected", "return_picked_up"]
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

    // Save other changes first (status, paymentStatus, etc.)
    await order.save()

    // Email buyer on status change (deduped)
    try {
      if (status && oldStatus !== order.status) {
        await sendCustomerOrderStageEmail({ orderId: order._id, stageKey: `status:${order.status}` })
      }
    } catch (emailErr) {
      console.error("Error sending buyer status email (admin full update):", emailErr)
    }

    // Notify vendor (push + email) on status change (deduped)
    try {
      if (status && oldStatus !== order.status) {
        await notifyVendorsForOrderStage({ orderId: order._id, stageKey: `status:${order.status}` })
      }
    } catch (vendorErr) {
      console.error("Error sending vendor status notifications (admin full update):", vendorErr)
    }

    // Update createdAt separately AFTER saving other changes
    // Use direct MongoDB update to bypass Mongoose timestamps
    if (createdAt) {
      const createdAtDate = new Date(createdAt)
      if (!isNaN(createdAtDate.getTime())) {
        const updateResult = await Order.collection.updateOne(
          { _id: order._id },
          { $set: { createdAt: createdAtDate } }
        )
        console.log(`Updated createdAt for order ${order.orderNumber} (${order._id}) to ${createdAtDate.toISOString()}`)
        console.log("createdAt update result:", {
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount,
          acknowledged: updateResult.acknowledged,
        })

        if (updateResult.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Order not found for createdAt update",
          })
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid createdAt date format",
        })
      }
    }

    // Update deliveredAt separately (optional manual override)
    if (deliveredAt) {
      const deliveredAtDate = new Date(deliveredAt)
      if (!isNaN(deliveredAtDate.getTime())) {
        const updateResult = await Order.collection.updateOne(
          { _id: order._id },
          { $set: { deliveredAt: deliveredAtDate } }
        )
        console.log(`Updated deliveredAt for order ${order.orderNumber} (${order._id}) to ${deliveredAtDate.toISOString()}`)
        console.log("deliveredAt update result:", {
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount,
          acknowledged: updateResult.acknowledged,
        })

        if (updateResult.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Order not found for deliveredAt update",
          })
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid deliveredAt date format",
        })
      }
    }

    // Reload order to ensure we have the latest data (especially createdAt / deliveredAt if updated)
    const finalOrder = await Order.findById(order._id)
    if (!finalOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found after update",
      })
    }
    
    // Log createdAt value for debugging
    if (createdAt) {
      console.log(`Reloaded order ${finalOrder.orderNumber} createdAt:`, finalOrder.createdAt)
      console.log(`Expected createdAt:`, new Date(createdAt).toISOString())
    }

    // Populate before returning
    await finalOrder.populate("customerId", "name mobile email")
    await finalOrder.populate("shippingAddress")
    await finalOrder.populate("vendorId", "name email phone address")
    await finalOrder.populate("items.productId", "name brand sku images")

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: finalOrder,
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

// Push/broadcast an order to vendors for acceptance (Admin only)
// This is intended for unassigned orders that should be accepted by a vendor (like "new order available").
router.post("/:id/push-to-vendors", verifyAdminToken, async (req, res) => {
  try {
    const { excludeVendorId } = req.body || {}

    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (["shipped", "delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot push order in status: ${order.status}`,
      })
    }

    if (order.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Only paid orders can be pushed to vendors for acceptance",
      })
    }

    if (order.awbNumber) {
      return res.status(400).json({
        success: false,
        message: "Shipment already created for this order. Cannot push to vendors.",
      })
    }

    // Make the order "accept-able": must be unassigned and status pending/confirmed (vendor accept endpoint requires this)
    order.vendorId = null
    order.assignmentMode = null
    if (!["pending", "confirmed"].includes(order.status)) {
      order.status = "confirmed"
    }

    const meta = typeof order.paymentMeta === "object" && order.paymentMeta ? order.paymentMeta : {}
    order.paymentMeta = {
      ...meta,
      adminPushToVendors: {
        pushedAt: new Date().toISOString(),
        pushedByAdminId: req.admin?.id,
      },
    }

    await order.save()

    // Exclude a specific vendor (optional). If not provided, try to exclude the vendor who cancelled (if present).
    const cancelledVendorId =
      typeof order.paymentMeta === "object" && order.paymentMeta?.vendorCancellation?.vendorId
        ? order.paymentMeta.vendorCancellation.vendorId.toString()
        : null
    const excludeVendorIds = []
    if (excludeVendorId) excludeVendorIds.push(excludeVendorId.toString())
    else if (cancelledVendorId) excludeVendorIds.push(cancelledVendorId)

    // Create/update vendor in-app notifications (best-effort)
    try {
      const vendorUsers = await VendorUser.find({
        isActive: true,
        ...(excludeVendorIds.length > 0 ? { vendorId: { $nin: excludeVendorIds } } : {}),
      })
        .select("_id")
        .lean()

      await Promise.all(
        (vendorUsers || []).map((vu) =>
          Notification.updateOne(
            {
              userId: vu._id,
              userType: "vendor",
              orderId: order._id,
              type: "new_order_available",
              "metadata.source": "admin_push",
            },
            {
              $set: {
                title: "New Order Available",
                message: `New order ${order.orderNumber} is available to accept. Total: ₹${order.total.toLocaleString("en-IN")}`,
                isRead: false,
                orderNumber: order.orderNumber,
                customerId: order.customerId,
                metadata: {
                  source: "admin_push",
                  pushedAt: new Date().toISOString(),
                },
              },
              $setOnInsert: {
                vendorId: null,
              },
            },
            { upsert: true }
          )
        )
      )
    } catch (notifErr) {
      console.error("Error creating vendor notifications for admin push:", notifErr)
    }

    // Push notifications (FCM) to vendor devices (best-effort)
    let pushResult = null
    try {
      const { sendPushNotificationToAllVendors } = await import("./pushNotifications.js")
      pushResult = await sendPushNotificationToAllVendors(
        "New Order Available",
        `New order ${order.orderNumber} is available to accept. Total: ₹${order.total.toLocaleString("en-IN")}`,
        {
          type: "new_order_available",
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
        },
        { excludeVendorIds }
      )
    } catch (pushError) {
      console.error("Error sending push-to-vendors for admin:", pushError)
    }

    return res.status(200).json({
      success: true,
      message: "Order pushed to vendors for acceptance",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        excludedVendorIds: excludeVendorIds,
        push: pushResult,
      },
    })
  } catch (error) {
    console.error("Push-to-vendors error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }
    return res.status(500).json({
      success: false,
      message: "Error pushing order to vendors",
      error: error.message,
    })
  }
})

// Bulk delete orders (Admin only) - Hard delete
router.post("/bulk-delete", verifyAdminToken, async (req, res) => {
  try {
    const { orderIds } = req.body

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "orderIds array is required",
      })
    }

    const invalidIds = orderIds.filter((id) => !mongoose.Types.ObjectId.isValid(id))
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid order IDs: ${invalidIds.join(", ")}`,
      })
    }

    const result = await Order.deleteMany({ _id: { $in: orderIds } })

    // Clean up related notifications to avoid dangling references
    await Notification.deleteMany({ orderId: { $in: orderIds } })

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} order(s)`,
      data: {
        deletedCount: result.deletedCount,
      },
    })
  } catch (error) {
    console.error("Bulk delete orders error:", error)
    return res.status(500).json({
      success: false,
      message: "Error deleting orders",
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

    const order = await Order.findById(req.params.id)
      .populate("customerId", "name mobile email")
      .populate("shippingAddress")

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
    // Set refund status to pending - will be processed by cron job when order reaches return_picked_up status
    order.returnRequest.refundStatus = "pending"
    // Set order-level refundStatus to pending for cron job to pick up
    order.refundStatus = "pending"
    order.status = "return_accepted"

    // Attempt to create DTDC pickup/shipment for the return (customer -> vendor)
    let shipmentResult = null
    let shipmentError = null
    try {
      if (order.returnAwbNumber) {
        console.log("ℹ️ [RETURN ACCEPT][DTDC] Return AWB already exists. Skipping pickup creation.")
      } else {
        console.log("🔵 [RETURN ACCEPT][DTDC] Preparing reverse pickup for order", order.orderNumber)
        const customerAddress = order.shippingAddress
          ? {
              name: `${order.shippingAddress.firstName || ""} ${order.shippingAddress.lastName || ""}`.trim(),
              phone: order.shippingAddress.phone || "",
              address1: order.shippingAddress.address1,
              address2: order.shippingAddress.address2 || "",
              pincode: order.shippingAddress.postcode || "",
              city: order.shippingAddress.city || "",
              state: order.shippingAddress.state || "",
            }
          : undefined

        let vendorAddress =
          order.vendorId?.address && order.vendorId?.address.address1
            ? {
                name: order.vendorId?.name || "Vendor",
                phone: order.vendorId?.phone || "",
                address1: order.vendorId.address.address1,
                address2: order.vendorId.address.address2 || "",
                pincode: order.vendorId.address.postcode,
                city: order.vendorId.address.city,
                state: order.vendorId.address.state,
              }
            : undefined

        // Fallback: fetch vendor from DB if populated doc is missing address
        if (!vendorAddress && order.vendorId) {
          try {
            const vendorDoc = await Vendor.findById(order.vendorId).lean()
            if (vendorDoc?.address?.address1) {
              vendorAddress = {
                name: vendorDoc.name || "Vendor",
                phone: vendorDoc.phone || "",
                address1: vendorDoc.address.address1,
                address2: vendorDoc.address.address2 || "",
                pincode: vendorDoc.address.postcode,
                city: vendorDoc.address.city,
                state: vendorDoc.address.state,
              }
              console.log("🔵 [RETURN ACCEPT][DTDC] Vendor address loaded via DB lookup")
            }
          } catch (lookupErr) {
            console.error("❌ [RETURN ACCEPT][DTDC] Vendor lookup failed:", lookupErr)
          }
        }

        if (!vendorAddress) {
          throw new Error("Vendor address missing for DTDC reverse pickup")
        }

        console.log("🔵 [RETURN ACCEPT][DTDC] Origin (customer) ->", customerAddress)
        console.log("🔵 [RETURN ACCEPT][DTDC] Destination (vendor) ->", vendorAddress)

        shipmentResult = await createShipmentForOrder(order, {
          origin: customerAddress,
          destination: vendorAddress,
          direction: "reverse",
          referenceNumber: `${order.orderNumber}-RET`,
        })
        if (shipmentResult?.awbNumber) {
          // IMPORTANT: Return shipments must have a separate AWB and must NOT overwrite the forward AWB.
          order.returnAwbNumber = shipmentResult.awbNumber
          order.returnDtdcTrackingData = shipmentResult.trackingData || null
          order.returnTrackingLastUpdated = new Date()
          console.log("✅ [RETURN ACCEPT][DTDC] Reverse pickup created. AWB:", shipmentResult.awbNumber)
        }
      }
    } catch (shipErr) {
      shipmentError = shipErr
      console.error(`❌ [RETURN ACCEPT] DTDC pickup creation failed for order ${order.orderNumber}:`, shipErr)
    }

    // Persist changes (statuses + shipment info if any)
    await order.save()

    // Notify vendor (push + email) (deduped)
    try {
      await notifyVendorsForOrderStage({ orderId: order._id, stageKey: "status:return_accepted" })
    } catch (vendorErr) {
      console.error("❌ [RETURN ACCEPT] Error notifying vendor:", vendorErr)
    }

    // Create notification for customer
    try {
      const customerId = typeof order.customerId === "object" && order.customerId?._id 
        ? order.customerId._id 
        : order.customerId
      
      await Notification.create({
        userId: customerId,
        userType: "customer",
        type: "return_accepted",
        title: "Return Request Accepted",
        message: `Your return request for order ${order.orderNumber} has been accepted. Refund will be processed automatically once the return is packed up.`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerId: customerId,
      })
      console.log(`✅ [RETURN ACCEPT] Notification created for customer ${customerId}`)
    } catch (notifError) {
      console.error("❌ [RETURN ACCEPT] Error creating return accepted notification:", notifError)
    }

    // Email buyer (deduped)
    try {
      await sendCustomerOrderStageEmail({ orderId: order._id, stageKey: "status:return_accepted" })
    } catch (emailErr) {
      console.error("❌ [RETURN ACCEPT] Error sending buyer email:", emailErr)
    }

    res.status(200).json({
      success: true,
      message: shipmentError
        ? "Return accepted. Pickup creation failed - please schedule manually."
        : "Return request accepted successfully. Refund will be processed automatically once the return is packed up.",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        returnRequest: order.returnRequest,
        dtdc: shipmentResult
          ? {
              returnAwbNumber: shipmentResult.awbNumber,
            }
          : null,
        shipmentError: shipmentError ? shipmentError.message : null,
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

    // Notify vendor (push + email) (deduped)
    try {
      await notifyVendorsForOrderStage({ orderId: order._id, stageKey: "status:return_rejected" })
    } catch (vendorErr) {
      console.error("❌ [RETURN DENY] Error notifying vendor:", vendorErr)
    }

    // Create notification for customer
    try {
      const customerId = typeof order.customerId === "object" && order.customerId?._id 
        ? order.customerId._id 
        : order.customerId
      
      await Notification.create({
        userId: customerId,
        userType: "customer",
        type: "return_denied",
        title: "Return Request Denied",
        message: `Your return request for order ${order.orderNumber} has been denied. Reason: ${adminNotes.substring(0, 100)}${adminNotes.length > 100 ? "..." : ""}`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerId: customerId,
      })
      console.log(`✅ [RETURN DENY] Notification created for customer ${customerId}`)
    } catch (notifError) {
      console.error("❌ [RETURN DENY] Error creating return denied notification:", notifError)
    }

    // Email buyer (deduped)
    try {
      await sendCustomerOrderStageEmail({ orderId: order._id, stageKey: "status:return_rejected" })
    } catch (emailErr) {
      console.error("❌ [RETURN DENY] Error sending buyer email:", emailErr)
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

