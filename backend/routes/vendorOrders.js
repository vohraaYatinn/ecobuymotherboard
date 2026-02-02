import express from "express"
import multer from "multer"
import Order from "../models/Order.js"
import Customer from "../models/Customer.js"
import Notification from "../models/Notification.js"
import Admin from "../models/Admin.js"
import Vendor from "../models/Vendor.js"
import Settings from "../models/Settings.js"
import { verifyVendorToken } from "../middleware/auth.js"
import { createShipmentForOrder, downloadShippingLabel } from "../services/dtdcService.js"
import { sendCustomerOrderStageEmail } from "../services/orderCustomerEmailNotifications.js"
import { notifyVendorsForOrderStage } from "../services/vendorOrderStageNotifications.js"
import { sendEmail } from "../services/mailer.js"
import packingVideoUpload from "../middleware/packingVideoUpload.js"

const router = express.Router()

// Helper function to calculate vendor net payout amount
// Formula: subtotal - commission - gateway charges (for online/wallet orders)
const calculateNetPayout = (order, vendor) => {
  const GATEWAY_RATE = 0.02 // 2%
  const subtotal = order.subtotal ?? order.total ?? 0
  const commissionRate = vendor?.commission || 0
  const commissionMultiplier = commissionRate / 100
  const payoutMultiplier = 1 - commissionMultiplier
  
  const payoutBeforeGateway = subtotal * payoutMultiplier
  // Gateway charges only apply to online/wallet orders
  const paymentGatewayCharges = (order.paymentMethod === "online" || order.paymentMethod === "wallet")
    ? payoutBeforeGateway * GATEWAY_RATE
    : 0
  
  const netPayout = payoutBeforeGateway - paymentGatewayCharges
  return Math.round(netPayout)
}

// Get unassigned orders (orders without a vendor)
router.get("/unassigned", verifyVendorToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query

    // Find orders without vendor assignment and with paid payment status
    const filter = {
      $or: [
        { vendorId: null },
        { vendorId: { $exists: false } }
      ],
      status: { $in: ["pending", "confirmed"] }, // Only show pending or confirmed orders
      paymentStatus: "paid" // Only show orders with paid payment status
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const orders = await Order.find(filter)
      .populate("customerId", "name mobile email")
      .populate("shippingAddress", "firstName lastName phone address1 address2 city state postcode")
      .populate("items.productId", "name brand sku images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean()

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
    console.error("Get unassigned orders error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching unassigned orders",
      error: error.message,
    })
  }
})

// Accept an order (vendor accepts unassigned order)
router.post("/:id/accept", verifyVendorToken, async (req, res) => {
  try {
    const { id } = req.params
    const vendorId = req.vendorUser.vendorId

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor account not linked. Please contact support.",
      })
    }

    // Find the order
    const order = await Order.findById(id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Check if order is already assigned
    if (order.vendorId) {
      return res.status(400).json({
        success: false,
        message: "Order is already assigned to another vendor",
      })
    }

    // Check if order status is valid for acceptance
    if (!["pending", "confirmed"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Order cannot be accepted in its current status",
      })
    }

    // Check if payment status is paid
    if (order.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Only orders with paid payment status can be accepted",
      })
    }

    // Assign order to vendor
    order.vendorId = vendorId
    order.assignmentMode = "accepted-by-vendor"
    order.status = "processing"

    await order.save()

    // Populate before returning
    await order.populate("customerId", "name mobile email")
    await order.populate("shippingAddress")
    await order.populate("items.productId", "name brand sku images")

    // Create notifications
    try {
      const vendor = await Vendor.findById(vendorId)
      
      // Notification for admin
      const admin = await Admin.findOne({ isActive: true })
      if (admin) {
        await Notification.create({
          userId: admin._id,
          userType: "admin",
          type: "order_accepted",
          title: "Order Accepted by Vendor",
          message: `Order ${order.orderNumber} has been accepted by ${vendor?.name || "a vendor"}`,
          orderId: order._id,
          orderNumber: order.orderNumber,
          vendorId: vendorId,
          customerId: order.customerId,
        })
      }

      // Notification for customer
      if (order.customerId) {
        await Notification.create({
          userId: order.customerId,
          userType: "customer",
          type: "order_accepted",
          title: "Order Accepted",
          message: `Your order ${order.orderNumber} has been accepted by ${vendor?.name || "a vendor"} and is now being processed`,
          orderId: order._id,
          orderNumber: order.orderNumber,
          vendorId: vendorId,
          customerId: order.customerId,
        })
      }
    } catch (notifError) {
      console.error("Error creating notifications:", notifError)
      // Don't fail the order acceptance if notifications fail
    }

    // Email buyer (deduped)
    try {
      await sendCustomerOrderStageEmail({ orderId: order._id, stageKey: "status:processing" })
    } catch (emailErr) {
      console.error("Error sending order processing email:", emailErr)
    }

    // Notify vendor (push + email), useful for multi-device and recordkeeping (deduped)
    try {
      await notifyVendorsForOrderStage({ orderId: order._id, stageKey: "status:processing" })
    } catch (vendorNotifErr) {
      console.error("Error sending vendor processing notifications:", vendorNotifErr)
    }

    res.status(200).json({
      success: true,
      message: "Order accepted successfully",
      data: order,
    })
  } catch (error) {
    console.error("Accept order error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error accepting order",
      error: error.message,
    })
  }
})

// Vendor cancel an already accepted/assigned order (requires admin reassignment)
router.post("/:id/cancel", verifyVendorToken, async (req, res) => {
  try {
    const { id } = req.params
    const vendorId = req.vendorUser.vendorId
    const { reason } = req.body || {}

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor account not linked. Please contact support.",
      })
    }

    const order = await Order.findById(id)
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Must be assigned to this vendor
    if (!order.vendorId || order.vendorId.toString() !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this order",
      })
    }

    // Only allow cancellation while in "processing" (Accepted) before shipment is created
    if (["shipped", "delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order in status: ${order.status}`,
      })
    }

    if (order.awbNumber) {
      return res.status(400).json({
        success: false,
        message: "Shipment already created for this order. Please contact admin to cancel/handle shipment.",
      })
    }

    const oldVendorId = order.vendorId

    // Unassign + flag for admin action
    order.vendorId = null
    order.assignmentMode = null
    order.status = "admin_review_required"

    const prevMeta = typeof order.paymentMeta === "object" && order.paymentMeta ? order.paymentMeta : {}
    order.paymentMeta = {
      ...prevMeta,
      vendorCancellation: {
        cancelledAt: new Date().toISOString(),
        cancelledBy: "vendor",
        vendorId: vendorId,
        reason: typeof reason === "string" ? reason.trim() : "",
      },
    }

    await order.save()

    // Notify admins (in-app)
    let adminEmails = []
    try {
      const vendor = await Vendor.findById(vendorId).select("name email phone").lean()
      const admins = await Admin.find({ isActive: true }).select("email").lean()
      adminEmails = (admins || []).map((a) => a.email).filter(Boolean)

      const notifTitle = "Vendor Cancelled Accepted Order"
      const notifMessage = `Order ${order.orderNumber} was cancelled by ${vendor?.name || "a vendor"} and needs reassignment.${reason ? ` Reason: ${reason}` : ""}`

      await Promise.all(
        (admins || []).map((admin) =>
          Notification.create({
            userId: admin._id,
            userType: "admin",
            type: "admin_review_required",
            title: notifTitle,
            message: notifMessage,
            orderId: order._id,
            orderNumber: order.orderNumber,
            vendorId: oldVendorId,
            customerId: order.customerId,
            metadata: {
              cancelledBy: "vendor",
              reason: typeof reason === "string" ? reason.trim() : "",
            },
          })
        )
      )

      // Email admins (best-effort)
      if (adminEmails.length > 0) {
        const subject = `Vendor cancelled order ${order.orderNumber} - reassignment required`
        const safeReason = typeof reason === "string" ? reason.trim() : ""
        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.5">
            <h2 style="margin: 0 0 8px">Vendor Cancelled Accepted Order</h2>
            <p style="margin: 0 0 6px"><strong>Order:</strong> ${order.orderNumber}</p>
            <p style="margin: 0 0 6px"><strong>Vendor:</strong> ${vendor?.name || "N/A"}</p>
            ${safeReason ? `<p style="margin: 0 0 6px"><strong>Reason:</strong> ${safeReason}</p>` : ""}
            <p style="margin: 12px 0 0">This order has been unassigned and marked for admin review. Please reassign it to another vendor.</p>
          </div>
        `
        await sendEmail({ to: adminEmails, subject, html })
      }
    } catch (notifErr) {
      console.error("Error notifying admins for vendor cancellation:", notifErr)
    }

    res.status(200).json({
      success: true,
      message: "Order cancelled and sent for admin reassignment",
      data: order,
    })
  } catch (error) {
    console.error("Vendor cancel order error:", error)
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

// Get vendor's assigned orders
router.get("/", verifyVendorToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "" } = req.query
    const vendorId = req.vendorUser.vendorId

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor account not linked. Please contact support.",
      })
    }

    // Build filter - only orders assigned to this vendor
    const filter = {
      vendorId: vendorId,
    }

    // Add status filter if provided
    if (status && status !== "all") {
      filter.status = status
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const orders = await Order.find(filter)
      .populate("customerId", "name mobile email")
      .populate("shippingAddress", "firstName lastName phone address1 address2 city state postcode")
      .populate("items.productId", "name brand sku images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean()

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
    console.error("Get vendor orders error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message,
    })
  }
})

// IMPORTANT: Specific routes must come before parameterized routes (/:id)
// Get vendor dashboard statistics
router.get("/dashboard/stats", verifyVendorToken, async (req, res) => {
  try {
    const vendorId = req.vendorUser.vendorId

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor account not linked. Please contact support.",
      })
    }

    // Get vendor details for commission rate
    const vendor = await Vendor.findById(vendorId).select("commission").lean()
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      })
    }

    // Get vendor's order counts
    const totalOrders = await Order.countDocuments({ vendorId })
    const pendingOrders = await Order.countDocuments({ vendorId, status: "processing" })
    const shippedOrders = await Order.countDocuments({ vendorId, status: "shipped" })
    const deliveredOrders = await Order.countDocuments({ vendorId, status: "delivered" })

    // Get delivered orders to calculate net payout revenue
    const deliveredOrdersList = await Order.find({ vendorId, status: "delivered" })
      .select("subtotal total paymentMethod")
      .lean()
    
    // Calculate revenue using net payout from all delivered orders
    const totalRevenue = deliveredOrdersList.reduce(
      (sum, order) => sum + calculateNetPayout(order, vendor),
      0
    )

    // Get all orders to calculate average order value using net payout
    const allOrders = await Order.find({ vendorId })
      .select("subtotal total paymentMethod")
      .lean()
    
    const totalNetPayout = allOrders.reduce(
      (sum, order) => sum + calculateNetPayout(order, vendor),
      0
    )
    const avgOrderValue = totalOrders > 0 ? totalNetPayout / totalOrders : 0

    // Get recent orders (last 3)
    const recentOrders = await Order.find({ vendorId })
      .populate("customerId", "name mobile")
      .sort({ createdAt: -1 })
      .limit(3)
      .select("orderNumber customerId total status createdAt")
      .lean()

    // Calculate ledger amounts (totalEarned, paidAmount, pendingAmount, balanceAmount)
    const RETURN_WINDOW_DAYS = 3
    const returnWindowMs = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000
    const now = Date.now()
    const returnWindowCutoff = now - returnWindowMs

    // Get all delivered orders with return request info
    const deliveredOrdersWithReturns = await Order.find({
      vendorId,
      status: "delivered",
    })
      .select("subtotal total paymentMethod deliveredAt updatedAt returnRequest")
      .lean()

    // Calculate totalEarned: delivered orders with closed return window and no pending returns
    let totalEarned = 0
    let pendingAmount = 0

    for (const order of deliveredOrdersWithReturns) {
      const deliveryDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.updatedAt)
      const deliveredAt = deliveryDate.getTime()
      const returnDeadline = deliveredAt + returnWindowMs
      const isWindowOver = now > returnDeadline
      
      const netPayout = calculateNetPayout(order, vendor)
      
      // Check if return is pending/accepted/completed (exclude denied)
      const rrType = order.returnRequest?.type
      const hasPendingReturn = rrType && rrType !== "denied"
      
      if (isWindowOver && !hasPendingReturn) {
        // Eligible for payment - count as totalEarned
        totalEarned += netPayout
      } else {
        // Not yet eligible - count as pendingAmount
        pendingAmount += netPayout
      }
    }

    // Get pending/shipped orders and add to pendingAmount
    const pendingAndShippedOrders = await Order.find({
      vendorId,
      status: { $in: ["processing", "shipped"] },
    })
      .select("subtotal total paymentMethod")
      .lean()

    for (const order of pendingAndShippedOrders) {
      pendingAmount += calculateNetPayout(order, vendor)
    }

    // Get paid amount from ledger
    const LEDGER_SETTINGS_KEY = "vendor_ledger_payments"
    let paidAmount = 0
    try {
      const setting = await Settings.findOne({ key: LEDGER_SETTINGS_KEY })
      if (setting && typeof setting.value === "object" && setting.value !== null) {
        const payments = setting.value
        const vendorIdStr = vendorId.toString()
        const ledgerEntry = payments[vendorIdStr]
        paidAmount = Math.max(Number(ledgerEntry?.paid || 0), 0)
      }
    } catch (ledgerError) {
      console.error("Error fetching ledger payments:", ledgerError)
      // Continue with paidAmount = 0 if ledger fetch fails
    }

    // Calculate balance: totalEarned - paidAmount
    const balanceAmount = totalEarned - paidAmount

    res.status(200).json({
      success: true,
      data: {
        totals: {
          orders: totalOrders,
          pending: pendingOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          revenue: totalRevenue,
          avgOrderValue,
          totalEarned,
          paidAmount,
          pendingAmount,
          balanceAmount,
        },
        recentOrders,
      },
    })
  } catch (error) {
    console.error("Get vendor dashboard stats error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
      error: error.message,
    })
  }
})

// Get vendor analytics/reports data (MUST come before /:id route)
router.get("/analytics", verifyVendorToken, async (req, res) => {
  try {
    const vendorId = req.vendorUser.vendorId

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor account not linked. Please contact support.",
      })
    }

    const { period = "30d" } = req.query // 7d, 30d, 90d, 1y

    // Calculate date range
    const periodStartDate = new Date()
    let startDate = new Date()
    
    switch (period) {
      case "7d":
        startDate.setDate(periodStartDate.getDate() - 7)
        break
      case "30d":
        startDate.setDate(periodStartDate.getDate() - 30)
        break
      case "90d":
        startDate.setDate(periodStartDate.getDate() - 90)
        break
      case "1y":
        startDate.setFullYear(periodStartDate.getFullYear() - 1)
        break
      default:
        startDate.setDate(periodStartDate.getDate() - 30)
    }

    // Get vendor details for commission rate
    const vendor = await Vendor.findById(vendorId).select("commission").lean()
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      })
    }

    // Get orders in the period with return request and delivery info
    const orders = await Order.find({
      vendorId: vendorId,
      createdAt: { $gte: startDate },
    })
      .select("subtotal total paymentMethod status createdAt updatedAt deliveredAt returnRequest")
      .sort({ createdAt: 1 })
      .lean()

    // Revenue over time (daily breakdown) using net payout
    const revenueByDate = {}
    const ordersByDate = {}
    
    orders.forEach((order) => {
      const date = new Date(order.createdAt).toISOString().split("T")[0]
      
      if (!revenueByDate[date]) {
        revenueByDate[date] = 0
        ordersByDate[date] = 0
      }
      
      // Count revenue for all delivered orders using net payout
      if (order.status === "delivered") {
        revenueByDate[date] += calculateNetPayout(order, vendor)
      }
      ordersByDate[date]++
    })

    // Convert to array format for charts
    const revenueData = Object.entries(revenueByDate)
      .map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const ordersData = Object.entries(ordersByDate)
      .map(([date, count]) => ({
        date,
        orders: count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate return window cutoff
    const RETURN_WINDOW_DAYS = 3
    const returnWindowMs = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000
    const now = Date.now()

    // Separate delivered orders by return window status
    const deliveredOrders = orders.filter((o) => o.status === "delivered")
    let deliveredReturnOpen = 0
    let deliveredReturnOver = 0
    let deliveredReturnOpenCount = 0
    let deliveredReturnOverCount = 0

    deliveredOrders.forEach((order) => {
      const deliveryDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.updatedAt)
      const deliveredAt = deliveryDate.getTime()
      const returnDeadline = deliveredAt + returnWindowMs
      const isWindowOver = now > returnDeadline
      
      // Check if return is pending/accepted/completed (exclude denied)
      const rrType = order.returnRequest?.type
      const hasPendingReturn = rrType && rrType !== "denied"
      
      const netPayout = calculateNetPayout(order, vendor)
      
      if (isWindowOver && !hasPendingReturn) {
        deliveredReturnOver += netPayout
        deliveredReturnOverCount++
      } else {
        deliveredReturnOpen += netPayout
        deliveredReturnOpenCount++
      }
    })

    // Get cancelled orders
    const cancelledOrders = orders.filter((o) => o.status === "cancelled")
    const cancelledRevenue = cancelledOrders.reduce((sum, o) => sum + calculateNetPayout(o, vendor), 0)

    // Get return accepted orders
    const returnAcceptedOrders = orders.filter((o) => 
      o.status === "return_accepted" || o.status === "return_picked_up"
    )
    const returnAcceptedRevenue = returnAcceptedOrders.reduce((sum, o) => sum + calculateNetPayout(o, vendor), 0)
    const returnAcceptedCount = returnAcceptedOrders.length

    // Orders by status
    const ordersByStatus = {
      processing: orders.filter((o) => o.status === "processing").length,
      shipped: orders.filter((o) => o.status === "shipped").length,
      delivered_return_open: deliveredReturnOpenCount,
      delivered_return_over: deliveredReturnOverCount,
      cancelled: cancelledOrders.length,
      return_accepted: returnAcceptedCount,
    }

    // Revenue by status using net payout
    const revenueByStatus = {
      processing: orders
        .filter((o) => o.status === "processing")
        .reduce((sum, o) => sum + calculateNetPayout(o, vendor), 0),
      shipped: orders
        .filter((o) => o.status === "shipped")
        .reduce((sum, o) => sum + calculateNetPayout(o, vendor), 0),
      delivered_return_open: deliveredReturnOpen,
      delivered_return_over: deliveredReturnOver,
      cancelled: cancelledRevenue,
      return_accepted: returnAcceptedRevenue,
    }

    // Orders by status over time
    const ordersByStatusOverTime = {}
    const revenueByStatusOverTime = {}
    
    orders.forEach((order) => {
      const date = new Date(order.createdAt).toISOString().split("T")[0]
      
      if (!ordersByStatusOverTime[date]) {
        ordersByStatusOverTime[date] = {
          date,
          processing: 0,
          shipped: 0,
          delivered_return_open: 0,
          delivered_return_over: 0,
          cancelled: 0,
          return_accepted: 0,
        }
        revenueByStatusOverTime[date] = {
          date,
          processing: 0,
          shipped: 0,
          delivered_return_open: 0,
          delivered_return_over: 0,
          cancelled: 0,
          return_accepted: 0,
        }
      }

      const netPayout = calculateNetPayout(order, vendor)
      
      if (order.status === "processing") {
        ordersByStatusOverTime[date].processing++
        revenueByStatusOverTime[date].processing += netPayout
      } else if (order.status === "shipped") {
        ordersByStatusOverTime[date].shipped++
        revenueByStatusOverTime[date].shipped += netPayout
      } else if (order.status === "delivered") {
        const deliveryDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.updatedAt)
        const deliveredAt = deliveryDate.getTime()
        const returnDeadline = deliveredAt + returnWindowMs
        const isWindowOver = now > returnDeadline
        const rrType = order.returnRequest?.type
        const hasPendingReturn = rrType && rrType !== "denied"
        
        if (isWindowOver && !hasPendingReturn) {
          ordersByStatusOverTime[date].delivered_return_over++
          revenueByStatusOverTime[date].delivered_return_over += netPayout
        } else {
          ordersByStatusOverTime[date].delivered_return_open++
          revenueByStatusOverTime[date].delivered_return_open += netPayout
        }
      } else if (order.status === "cancelled") {
        ordersByStatusOverTime[date].cancelled++
        revenueByStatusOverTime[date].cancelled += netPayout
      } else if (order.status === "return_accepted" || order.status === "return_picked_up") {
        ordersByStatusOverTime[date].return_accepted++
        revenueByStatusOverTime[date].return_accepted += netPayout
      }
    })

    const ordersByStatusOverTimeArray = Object.values(ordersByStatusOverTime)
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate totals using net payout (all delivered orders count as revenue)
    const totalRevenue = orders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + calculateNetPayout(o, vendor), 0)

    const totalOrders = orders.length
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    res.status(200).json({
      success: true,
      data: {
        period,
        summary: {
          totalRevenue: Math.round(totalRevenue),
          totalOrders,
          avgOrderValue: Math.round(avgOrderValue),
        },
        revenueOverTime: revenueData,
        ordersOverTime: ordersData,
        ordersByStatusOverTime: ordersByStatusOverTimeArray,
        ordersByStatus,
        revenueByStatus: {
          processing: Math.round(revenueByStatus.processing),
          shipped: Math.round(revenueByStatus.shipped),
          delivered_return_open: Math.round(revenueByStatus.delivered_return_open),
          delivered_return_over: Math.round(revenueByStatus.delivered_return_over),
          cancelled: Math.round(revenueByStatus.cancelled),
          return_accepted: Math.round(revenueByStatus.return_accepted),
        },
      },
    })
  } catch (error) {
    console.error("Get vendor analytics error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching analytics data",
      error: error.message,
    })
  }
})

// Update order status (vendor can only update to shipped or delivered)
router.put("/:id/status", verifyVendorToken, (req, res, next) => {
  packingVideoUpload.single("packingVideo")(req, res, (err) => {
    if (err) {
      console.error("❌ [VENDOR ORDERS] Multer error:", err)
      console.error("❌ [VENDOR ORDERS] Error details:", {
        code: err.code,
        message: err.message,
        field: err.field,
        name: err.name,
      })
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            success: false,
            message: "Video file size exceeds the 100MB limit. Please upload a smaller video.",
          })
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            success: false,
            message: "Unexpected file field. Please use 'packingVideo' as the field name.",
          })
        }
        return res.status(400).json({
          success: false,
          message: err.message || "File upload error",
        })
      }
      // Handle file filter errors and other upload errors
      return res.status(400).json({
        success: false,
        message: err.message || "Error uploading video. Please ensure it's a valid video file and try again.",
      })
    }
    next()
  })
}, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const vendorId = req.vendorUser.vendorId

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor account not linked. Please contact support.",
      })
    }

    // Validate status - vendors can only set to shipped or delivered
    if (!["shipped", "delivered"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Vendors can only update status to 'shipped' or 'delivered'",
      })
    }

    // Find the order and verify it's assigned to this vendor
    const order = await Order.findOne({
      _id: id,
      vendorId: vendorId,
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not assigned to you",
      })
    }

    // Validate status transition
    // Can only ship from processing, and deliver from shipped
    if (status === "shipped" && order.status !== "processing") {
      return res.status(400).json({
        success: false,
        message: "Can only ship orders that are in 'processing' status",
      })
    }

    if (status === "delivered" && order.status !== "shipped") {
      return res.status(400).json({
        success: false,
        message: "Can only deliver orders that are in 'shipped' status",
      })
    }

    // If vendor is marking as shipped (packed) and provided a packing video, persist it for later return verification.
    if (status === "shipped" && req.file) {
      order.packingVideo = {
        url: `/uploads/packing-videos/${req.file.filename}`,
        originalName: req.file.originalname || null,
        mimeType: req.file.mimetype || null,
        size: typeof req.file.size === "number" ? req.file.size : null,
        uploadedAt: new Date(),
      }
    }

    // Update status and set deliveredAt once when delivered
    if (status === "delivered" && order.status !== "delivered" && !order.deliveredAt) {
      order.deliveredAt = new Date()
    }

    order.status = status
    await order.save()

    // Notify vendor (push + email), useful for multi-device and recordkeeping (deduped)
    try {
      await notifyVendorsForOrderStage({ orderId: order._id, stageKey: `status:${status}` })
    } catch (vendorNotifErr) {
      console.error("Error sending vendor status notifications:", vendorNotifErr)
    }

    // Auto-create DTDC shipment when vendor marks order as shipped (packed)
    if (status === "shipped" && !order.awbNumber) {
      console.log(`🔵 [VENDOR-DEBUG] Starting DTDC shipment creation for order ${order.orderNumber} (ID: ${order._id})`)
      
      try {
        // Ensure required relations are populated for shipment creation
        await order.populate("shippingAddress")
        await order.populate("customerId", "name email mobile")
        // Ensure product names/brands are available for DTDC "Product Description"
        await order.populate("items.productId", "name brand sku")

        console.log(`🔵 [VENDOR-DEBUG] Order populated. Shipping address:`, {
          name: order.shippingAddress?.firstName + " " + order.shippingAddress?.lastName,
          city: order.shippingAddress?.city,
          state: order.shippingAddress?.state,
          pincode: order.shippingAddress?.postcode,
        })
        console.log(`🔵 [VENDOR-DEBUG] Customer:`, {
          name: order.customerId?.name,
          email: order.customerId?.email,
        })
        console.log(`🔵 [VENDOR-DEBUG] Order total: ₹${order.total}, Payment method: ${order.paymentMethod}`)

        const vendorDoc = await Vendor.findById(vendorId).lean()
        const vendorAddress =
          vendorDoc?.address?.address1
            ? {
                name:
                  vendorDoc.name ||
                  `${vendorDoc.address.firstName || ""} ${vendorDoc.address.lastName || ""}`.trim() ||
                  "Vendor",
                phone: vendorDoc.phone || "",
                address1: vendorDoc.address.address1,
                address2: vendorDoc.address.address2 || "",
                pincode: vendorDoc.address.postcode,
                city: vendorDoc.address.city,
                state: vendorDoc.address.state,
              }
            : null

        if (!vendorAddress) {
          throw new Error("Vendor address missing for DTDC shipment origin")
        }

        console.log(`🔵 [VENDOR-DEBUG] Using vendor pickup address:`, vendorAddress)
        console.log(`🔵 [VENDOR-DEBUG] Calling createShipmentForOrder...`)
        const shipmentResult = await createShipmentForOrder(order, {
          origin: vendorAddress,
        })
        console.log(`🔵 [VENDOR-DEBUG] createShipmentForOrder returned:`, {
          hasAwbNumber: !!shipmentResult.awbNumber,
          awbNumber: shipmentResult.awbNumber,
          hasTrackingData: !!shipmentResult.trackingData,
        })

        if (shipmentResult.awbNumber) {
          order.awbNumber = shipmentResult.awbNumber
          order.dtdcTrackingData = shipmentResult.trackingData || shipmentResult
          order.trackingLastUpdated = new Date()
          await order.save()

          console.log(`✅ [VENDOR-DEBUG] ✅ DTDC shipment SUCCESS for order ${order.orderNumber}`)
          console.log(`✅ [VENDOR-DEBUG] AWB Number: ${shipmentResult.awbNumber}`)
          console.log(`✅ [VENDOR-DEBUG] Order saved with DTDC data`)
        } else {
          console.warn(`⚠️ [VENDOR-DEBUG] ⚠️ DTDC shipment created but NO AWB number returned`)
          console.warn(`⚠️ [VENDOR-DEBUG] Response:`, JSON.stringify(shipmentResult, null, 2))
        }
      } catch (shipError) {
        console.error(`❌ [VENDOR-DEBUG] ❌ DTDC shipment FAILED for order ${order.orderNumber}`)
        console.error(`❌ [VENDOR-DEBUG] Error message:`, shipError.message)
        console.error(`❌ [VENDOR-DEBUG] Error stack:`, shipError.stack)
        if (shipError.response) {
          console.error(`❌ [VENDOR-DEBUG] HTTP Status:`, shipError.response.status)
          console.error(`❌ [VENDOR-DEBUG] Response data:`, JSON.stringify(shipError.response.data, null, 2))
        }
        // Do NOT fail the vendor status update if DTDC call fails
      }
    } else if (status === "shipped" && order.awbNumber) {
      console.log(`ℹ️ [VENDOR-DEBUG] Order ${order.orderNumber} already has AWB: ${order.awbNumber}. Skipping DTDC creation.`)
    }

    // Populate before returning
    await order.populate("customerId", "name mobile email")
    await order.populate("shippingAddress")
    await order.populate("items.productId", "name brand sku images")

    // Create notifications based on status change
    try {
      const vendor = await Vendor.findById(vendorId)
      
      if (status === "shipped") {
        // Notification for admin
        const admin = await Admin.findOne({ isActive: true })
        if (admin) {
          await Notification.create({
            userId: admin._id,
            userType: "admin",
            type: "order_shipped",
            title: "Order Packed",
            message: `Order ${order.orderNumber} has been packed by ${vendor?.name || "vendor"} and is ready for shipment`,
            orderId: order._id,
            orderNumber: order.orderNumber,
            vendorId: vendorId,
            customerId: order.customerId,
          })
        }

        // Customer will be notified via DTDC tracking updates when order is actually in transit
        // No notification at packing stage
      } else if (status === "delivered") {
        // Notification for admin
        const admin = await Admin.findOne({ isActive: true })
        if (admin && order.customerId) {
          const Customer = (await import("../models/Customer.js")).default
          const customer = await Customer.findById(order.customerId).select("name").lean()
          await Notification.create({
            userId: admin._id,
            userType: "admin",
            type: "order_delivered",
            title: "Order Delivered",
            message: `Order ${order.orderNumber} has been delivered by ${vendor?.name || "vendor"} to ${customer?.name || "customer"}`,
            orderId: order._id,
            orderNumber: order.orderNumber,
            vendorId: vendorId,
            customerId: order.customerId,
          })
        }

        // Notification for customer
        if (order.customerId) {
          await Notification.create({
            userId: order.customerId,
            userType: "customer",
            type: "order_delivered",
            title: "Order Delivered",
            message: `Your order ${order.orderNumber} has been delivered successfully. Thank you for your purchase!`,
            orderId: order._id,
            orderNumber: order.orderNumber,
            vendorId: vendorId,
            customerId: order.customerId,
          })
        }
      }
    } catch (notifError) {
      console.error("Error creating notifications:", notifError)
      // Don't fail the status update if notifications fail
    }

    // Email buyer (deduped)
    // Note: Customer should NOT be notified when vendor packs the order (status:shipped)
    // Customer will be notified via DTDC tracking updates when the order is actually in transit
    try {
      if (status === "delivered") {
        await sendCustomerOrderStageEmail({ orderId: order._id, stageKey: "status:delivered" })
      }
      // Removed customer email for "shipped" status - customer will be notified via DTDC status updates
    } catch (emailErr) {
      console.error("Error sending buyer status email:", emailErr)
    }

    // Prepare response with DTDC status info
    const responseData = {
      ...order.toObject(),
      dtdcStatus: status === "shipped" ? {
        awbNumber: order.awbNumber || null,
        shipmentCreated: !!order.awbNumber,
        message: order.awbNumber 
          ? `DTDC shipment created successfully. AWB: ${order.awbNumber}`
          : "DTDC shipment creation attempted but AWB not available. Check server logs for details.",
      } : null,
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: responseData,
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

// Get customers from vendor's assigned orders (MUST come before /:id route)
router.get("/customers", verifyVendorToken, async (req, res) => {
  try {
    const vendorId = req.vendorUser.vendorId

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor account not linked. Please contact support.",
      })
    }

    const { page = 1, limit = 20, search = "" } = req.query

    // Build filter
    const filter = {
      vendorId: vendorId,
    }

    // Get all orders assigned to this vendor and extract unique customers
    const orders = await Order.find(filter)
      .populate("customerId", "name email mobile")
      .select("customerId total status paymentStatus createdAt")
      .lean()

    // Group by customer and calculate stats
    const customerMap = new Map()

    orders.forEach((order) => {
      const customerId = order.customerId?._id?.toString()
      if (!customerId) return

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          _id: order.customerId._id,
          name: order.customerId.name || "N/A",
          email: order.customerId.email || "N/A",
          mobile: order.customerId.mobile || "N/A",
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: null,
          lastOrderId: null,
        })
      }

      const customer = customerMap.get(customerId)
      customer.totalOrders++

      // Count revenue for all delivered orders (vendors earn revenue when order is delivered)
      if (order.status === "delivered") {
        customer.totalSpent += order.total || 0
      }

      if (!customer.lastOrderDate || new Date(order.createdAt) > new Date(customer.lastOrderDate)) {
        customer.lastOrderDate = order.createdAt
        customer.lastOrderId = order._id
      }
    })

    // Convert map to array
    let customers = Array.from(customerMap.values())

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      customers = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchLower) ||
          customer.email.toLowerCase().includes(searchLower) ||
          customer.mobile.includes(search)
      )
    }

    // Sort by last order date (most recent first)
    customers.sort((a, b) => {
      if (!a.lastOrderDate) return 1
      if (!b.lastOrderDate) return -1
      return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
    })

    // Pagination
    const total = customers.length
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const paginatedCustomers = customers.slice(skip, skip + parseInt(limit))

    res.status(200).json({
      success: true,
      data: paginatedCustomers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    console.error("Get vendor customers error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching customers",
      error: error.message,
    })
  }
})

// Get single customer detail (vendor can only see customers from their orders)
router.get("/customers/:id", verifyVendorToken, async (req, res) => {
  try {
    const { id } = req.params
    const vendorId = req.vendorUser.vendorId

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor account not linked. Please contact support.",
      })
    }

    // Verify customer has orders assigned to this vendor
    const order = await Order.findOne({
      customerId: id,
      vendorId: vendorId,
    })
      .populate("customerId", "name email mobile createdAt")
      .lean()

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Customer not found or not assigned to you",
      })
    }

    // Get customer details
    const Customer = (await import("../models/Customer.js")).default
    const customer = await Customer.findById(id).select("-pushTokens").lean()

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      })
    }

    // Get all orders for this customer assigned to this vendor
    const customerOrders = await Order.find({
      customerId: id,
      vendorId: vendorId,
    })
      .populate("shippingAddress", "firstName lastName phone address1 address2 city state postcode")
      .sort({ createdAt: -1 })
      .lean()

    // Calculate statistics
    const totalOrders = customerOrders.length
    // Calculate total spent from all delivered orders (vendors earn revenue when order is delivered)
    const totalSpent = customerOrders.reduce((sum, order) => {
      if (order.status === "delivered") {
        return sum + (order.total || 0)
      }
      return sum
    }, 0)

    // Get most recent address
    const recentOrder = customerOrders[0]
    const address = recentOrder?.shippingAddress || null

    // Get recent orders (last 5)
    const recentOrders = customerOrders.slice(0, 5).map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      subtotal: order.subtotal,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
    }))

    res.status(200).json({
      success: true,
      data: {
        ...customer,
        totalOrders,
        totalSpent,
        address,
        recentOrders,
        joinDate: customer.createdAt,
        lastOrderDate: recentOrder?.createdAt || null,
      },
    })
  } catch (error) {
    console.error("Get vendor customer detail error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error fetching customer details",
      error: error.message,
    })
  }
})

// Download shipping label for an order (MUST come before /:id route)
router.get("/:id/label", verifyVendorToken, async (req, res) => {
  try {
    const { id } = req.params
    const vendorId = req.vendorUser.vendorId

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor account not linked. Please contact support.",
      })
    }

    // Find the order and verify it's assigned to this vendor
    const order = await Order.findOne({
      _id: id,
      vendorId: vendorId,
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not assigned to you",
      })
    }

    // Check if order has an AWB number
    if (!order.awbNumber) {
      return res.status(400).json({
        success: false,
        message: "Order does not have an AWB number. Please create a shipment first.",
      })
    }

    // Download the label from DTDC
    try {
      const labelBuffer = await downloadShippingLabel(order.awbNumber)
      
      // Set appropriate headers for PDF download
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="shipping-label-${order.orderNumber}-${order.awbNumber}.pdf"`
      )
      
      // Send the PDF buffer
      res.send(labelBuffer)
    } catch (labelError) {
      console.error("Error downloading shipping label:", labelError)
      return res.status(500).json({
        success: false,
        message: labelError.message || "Failed to download shipping label",
      })
    }
  } catch (error) {
    console.error("Download label error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error downloading label",
      error: error.message,
    })
  }
})

// Get single order by ID (vendor's assigned order) - MUST BE LAST (after all specific routes)
router.get("/:id", verifyVendorToken, async (req, res) => {
  try {
    const { id } = req.params
    const vendorId = req.vendorUser.vendorId

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor account not linked. Please contact support.",
      })
    }

    const order = await Order.findOne({
      _id: id,
      vendorId: vendorId,
    })
      .populate("customerId", "name mobile email")
      .populate("shippingAddress", "firstName lastName phone address1 address2 city state postcode")
      .populate("items.productId", "name brand sku images category")
      .lean()

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not assigned to you",
      })
    }

    res.status(200).json({
      success: true,
      data: order,
    })
  } catch (error) {
    console.error("Get order error:", error)
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

export default router

