import express from "express"
import Order from "../models/Order.js"
import Customer from "../models/Customer.js"
import Notification from "../models/Notification.js"
import Admin from "../models/Admin.js"
import Vendor from "../models/Vendor.js"
import { verifyVendorToken } from "../middleware/auth.js"
import { createShipmentForOrder } from "../services/dtdcService.js"

const router = express.Router()

const RETURN_WINDOW_DAYS = 3
const PLATFORM_COMMISSION_RATE = 0.2 // 20%
const GATEWAY_RATE = 0.02 // 2% of order total

// Get unassigned orders (orders without a vendor)
router.get("/unassigned", verifyVendorToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query

    // Find orders without vendor assignment
    const filter = {
      $or: [
        { vendorId: null },
        { vendorId: { $exists: false } }
      ],
      status: { $in: ["pending", "confirmed"] } // Only show pending or confirmed orders
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

    // Get vendor's order counts
    const totalOrders = await Order.countDocuments({ vendorId })
    const pendingOrders = await Order.countDocuments({ vendorId, status: "processing" })
    const shippedOrders = await Order.countDocuments({ vendorId, status: "shipped" })
    const deliveredOrders = await Order.countDocuments({ vendorId, status: "delivered" })

    // Calculate net payout from delivered orders outside return window and without active returns
    const now = new Date()
    const returnWindowCutoff = new Date(now.getTime() - RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000)

    const eligibleOrders = await Order.find({
      vendorId,
      status: "delivered",
      updatedAt: { $lte: returnWindowCutoff },
      $or: [
        { returnRequest: { $exists: false } },
        { "returnRequest.type": { $in: [null, "denied"] } },
      ],
    }).select("subtotal total status updatedAt returnRequest")

    const totalRevenue = eligibleOrders.reduce((sum, order) => {
      const subtotal = typeof order.subtotal === "number" ? order.subtotal : order.total || 0
      const total = order.total || subtotal
      const commission = subtotal * PLATFORM_COMMISSION_RATE
      const gatewayFees = total * GATEWAY_RATE
      const netPayout = subtotal - commission - gatewayFees
      return sum + Math.max(netPayout, 0)
    }, 0)

    // Calculate average order value
    const avgOrderResult = await Order.aggregate([
      { $match: { vendorId } },
      { $group: { _id: null, avg: { $avg: "$total" } } },
    ])
    const avgOrderValue = avgOrderResult.length > 0 ? avgOrderResult[0].avg : 0

    // Get recent orders (last 3)
    const recentOrders = await Order.find({ vendorId })
      .populate("customerId", "name mobile")
      .sort({ createdAt: -1 })
      .limit(3)
      .select("orderNumber customerId total status createdAt")
      .lean()

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
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case "7d":
        startDate.setDate(now.getDate() - 7)
        break
      case "30d":
        startDate.setDate(now.getDate() - 30)
        break
      case "90d":
        startDate.setDate(now.getDate() - 90)
        break
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // Get orders in the period
    const orders = await Order.find({
      vendorId: vendorId,
      createdAt: { $gte: startDate },
    })
      .sort({ createdAt: 1 })
      .lean()

    // Revenue over time (daily breakdown)
    const revenueByDate = {}
    const ordersByDate = {}
    
    orders.forEach((order) => {
      const date = new Date(order.createdAt).toISOString().split("T")[0]
      
      if (!revenueByDate[date]) {
        revenueByDate[date] = 0
        ordersByDate[date] = 0
      }
      
      // Count revenue for all delivered orders (vendors earn revenue when order is delivered)
      if (order.status === "delivered") {
        revenueByDate[date] += order.total || 0
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

    // Orders by status
    const ordersByStatus = {
      processing: orders.filter((o) => o.status === "processing").length,
      shipped: orders.filter((o) => o.status === "shipped").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
    }

    // Revenue by status (vendors earn revenue when order is delivered)
    const revenueByStatus = {
      processing: orders
        .filter((o) => o.status === "processing")
        .reduce((sum, o) => sum + (o.total || 0), 0),
      shipped: orders
        .filter((o) => o.status === "shipped")
        .reduce((sum, o) => sum + (o.total || 0), 0),
      delivered: orders
        .filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + (o.total || 0), 0),
    }

    // Calculate totals (all delivered orders count as revenue)
    const totalRevenue = orders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + (o.total || 0), 0)

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
        ordersByStatus,
        revenueByStatus: {
          processing: Math.round(revenueByStatus.processing),
          shipped: Math.round(revenueByStatus.shipped),
          delivered: Math.round(revenueByStatus.delivered),
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
router.put("/:id/status", verifyVendorToken, async (req, res) => {
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

    // Update status and set deliveredAt once when delivered
    if (status === "delivered" && order.status !== "delivered" && !order.deliveredAt) {
      order.deliveredAt = new Date()
    }

    order.status = status
    await order.save()

    // Auto-create DTDC shipment when vendor marks order as shipped (packed)
    if (status === "shipped" && !order.awbNumber) {
      console.log(`🔵 [VENDOR-DEBUG] Starting DTDC shipment creation for order ${order.orderNumber} (ID: ${order._id})`)
      
      try {
        // Ensure required relations are populated for shipment creation
        await order.populate("shippingAddress")
        await order.populate("customerId", "name email mobile")

        // Fetch vendor address for origin pickup
        const vendor = await Vendor.findById(vendorId).lean()
        const vendorAddress = vendor?.address
        const origin = vendorAddress
          ? {
              name: vendor?.name || "Vendor",
              phone: vendor?.phone || "",
              address1: vendorAddress.address1,
              address2: vendorAddress.address2 || "",
              pincode: vendorAddress.postcode,
              city: vendorAddress.city,
              state: vendorAddress.state,
            }
          : undefined

        const shippingAddr = order.shippingAddress
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

        console.log(`🔵 [VENDOR-DEBUG] Calling createShipmentForOrder...`)
        const shipmentResult = await createShipmentForOrder(order, {
          origin,
          destination: shippingAddr,
          direction: "forward",
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
            title: "Order Shipped",
            message: `Order ${order.orderNumber} has been shipped by ${vendor?.name || "vendor"} to the customer`,
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
            type: "order_shipped",
            title: "Order Shipped",
            message: `Your order ${order.orderNumber} has been shipped and is on its way to you`,
            orderId: order._id,
            orderNumber: order.orderNumber,
            vendorId: vendorId,
            customerId: order.customerId,
          })
        }
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
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
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

