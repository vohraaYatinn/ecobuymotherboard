import express from "express"
import Order from "../models/Order.js"
import Vendor from "../models/Vendor.js"
import { verifyAdminToken } from "../middleware/auth.js"

const router = express.Router()

// Get full orders report
router.get("/orders", verifyAdminToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, status = "", startDate = "", endDate = "" } = req.query

    const filter = {}

    if (status && status !== "all") {
      filter.status = status
    }

    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        // Set end date to end of day
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        filter.createdAt.$lte = end
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const orders = await Order.find(filter)
      .populate("customerId", "name mobile email")
      .populate("shippingAddress", "firstName lastName phone address1 city state postcode")
      .populate("vendorId", "name email phone address")
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
    console.error("Get orders report error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching orders report",
      error: error.message,
    })
  }
})

// Get summary (yesterday's or custom date range)
router.get("/yesterday-summary", verifyAdminToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    let dateStart, dateEnd, dateLabel

    if (startDate && endDate) {
      // Custom date range
      dateStart = new Date(startDate)
      dateStart.setHours(0, 0, 0, 0)
      dateEnd = new Date(endDate)
      dateEnd.setHours(23, 59, 59, 999)
      dateLabel = `${startDate} to ${endDate}`
    } else {
      // Default: yesterday's date range
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      dateStart = yesterday
      dateEnd = new Date(yesterday)
      dateEnd.setHours(23, 59, 59, 999)
      dateLabel = yesterday.toISOString().split("T")[0]
    }

    // Orders received in date range (created in range)
    const ordersReceived = await Order.countDocuments({
      createdAt: {
        $gte: dateStart,
        $lte: dateEnd,
      },
    })

    // Orders dispatched in date range (status changed to shipped in range)
    // Note: We'll check orders that were shipped in range based on updatedAt
    // This is an approximation - ideally you'd track status change timestamps
    const ordersDispatched = await Order.countDocuments({
      status: "shipped",
      updatedAt: {
        $gte: dateStart,
        $lte: dateEnd,
      },
    })

    // Orders pending (status is pending) - always current, not date filtered
    const ordersPending = await Order.countDocuments({
      status: "pending",
    })

    // Orders delivered (status is delivered) - always current, not date filtered
    const ordersDelivered = await Order.countDocuments({
      status: "delivered",
    })

    // Additional: Orders that were delivered in date range
    const ordersDeliveredYesterday = await Order.countDocuments({
      status: "delivered",
      updatedAt: {
        $gte: dateStart,
        $lte: dateEnd,
      },
    })

    res.status(200).json({
      success: true,
      data: {
        ordersReceived,
        ordersDispatched,
        ordersPending,
        ordersDelivered,
        ordersDeliveredYesterday,
        date: dateLabel,
        isDateRange: !!(startDate && endDate),
        startDate: startDate || null,
        endDate: endDate || null,
      },
    })
  } catch (error) {
    console.error("Get summary error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching summary",
      error: error.message,
    })
  }
})

// Get daily orders for chart (last N days)
router.get("/daily-orders", verifyAdminToken, async (req, res) => {
  try {
    let startDate
    let endDate = null

    // Support custom date range
    if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(req.query.endDate)
      endDate.setHours(23, 59, 59, 999)
    } else {
      const days = parseInt(req.query.days) || 30
      startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      startDate.setHours(0, 0, 0, 0)
    }

    // Build match filter
    const matchFilter = {
      createdAt: { $gte: startDate },
    }
    if (endDate) {
      matchFilter.createdAt.$lte = endDate
    }

    // Aggregate orders by day
    const dailyOrders = await Order.aggregate([
      {
        $match: matchFilter,
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          count: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$status", "delivered"] }, { $eq: ["$paymentStatus", "paid"] }] },
                "$total",
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ])

    res.status(200).json({
      success: true,
      data: dailyOrders.map((item) => ({
        date: item._id,
        orders: item.count,
        revenue: item.totalRevenue,
      })),
    })
  } catch (error) {
    console.error("Get daily orders error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching daily orders",
      error: error.message,
    })
  }
})

// Get weekly orders for chart (last N weeks)
router.get("/weekly-orders", verifyAdminToken, async (req, res) => {
  try {
    let startDate
    let endDate = null

    // Support custom date range
    if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(req.query.endDate)
      endDate.setHours(23, 59, 59, 999)
    } else {
      const weeks = parseInt(req.query.weeks) || 12
      startDate = new Date()
      startDate.setDate(startDate.getDate() - weeks * 7)
      startDate.setHours(0, 0, 0, 0)
    }

    // Build match filter
    const matchFilter = {
      createdAt: { $gte: startDate },
    }
    if (endDate) {
      matchFilter.createdAt.$lte = endDate
    }

    // Aggregate orders by week
    const weeklyOrders = await Order.aggregate([
      {
        $match: matchFilter,
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            week: { $week: "$createdAt" },
          },
          count: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$status", "delivered"] }, { $eq: ["$paymentStatus", "paid"] }] },
                "$total",
                0,
              ],
            },
          },
          startDate: { $min: "$createdAt" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.week": 1 },
      },
    ])

    res.status(200).json({
      success: true,
      data: weeklyOrders.map((item) => ({
        week: `Week ${item._id.week}, ${item._id.year}`,
        weekNumber: item._id.week,
        year: item._id.year,
        orders: item.count,
        revenue: item.totalRevenue,
        startDate: item.startDate,
      })),
    })
  } catch (error) {
    console.error("Get weekly orders error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching weekly orders",
      error: error.message,
    })
  }
})

// Get monthly orders for chart (last N months)
router.get("/monthly-orders", verifyAdminToken, async (req, res) => {
  try {
    let startDate
    let endDate = null

    // Support custom date range
    if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(req.query.endDate)
      endDate.setHours(23, 59, 59, 999)
    } else {
      const months = parseInt(req.query.months) || 12
      startDate = new Date()
      startDate.setMonth(startDate.getMonth() - months)
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
    }

    // Build match filter
    const matchFilter = {
      createdAt: { $gte: startDate },
    }
    if (endDate) {
      matchFilter.createdAt.$lte = endDate
    }

    // Aggregate orders by month
    const monthlyOrders = await Order.aggregate([
      {
        $match: matchFilter,
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$status", "delivered"] }, { $eq: ["$paymentStatus", "paid"] }] },
                "$total",
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ])

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]

    res.status(200).json({
      success: true,
      data: monthlyOrders.map((item) => ({
        month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
        monthNumber: item._id.month,
        year: item._id.year,
        orders: item.count,
        revenue: item.totalRevenue,
      })),
    })
  } catch (error) {
    console.error("Get monthly orders error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching monthly orders",
      error: error.message,
    })
  }
})

// Get comprehensive report summary
router.get("/summary", verifyAdminToken, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments()

    // Get yesterday's summary
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    const yesterdayEnd = new Date(yesterday)
    yesterdayEnd.setHours(23, 59, 59, 999)

    const ordersReceived = await Order.countDocuments({
      createdAt: {
        $gte: yesterday,
        $lte: yesterdayEnd,
      },
    })

    const ordersDispatched = await Order.countDocuments({
      status: "shipped",
      updatedAt: {
        $gte: yesterday,
        $lte: yesterdayEnd,
      },
    })

    const ordersPending = await Order.countDocuments({
      status: "pending",
    })

    const ordersDelivered = await Order.countDocuments({
      status: "delivered",
    })

    // Status breakdown
    const statusBreakdown = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    const statusMap = {}
    statusBreakdown.forEach((item) => {
      statusMap[item._id] = item.count
    })

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        yesterday: {
          ordersReceived,
          ordersDispatched,
          ordersPending,
          ordersDelivered,
          date: yesterday.toISOString().split("T")[0],
        },
        statusBreakdown: statusMap,
      },
    })
  } catch (error) {
    console.error("Get report summary error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching report summary",
      error: error.message,
    })
  }
})

// Get vendor analytics for a specific vendor
router.get("/vendor/:vendorId", verifyAdminToken, async (req, res) => {
  try {
    const { vendorId } = req.params
    const { startDate = "", endDate = "" } = req.query

    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId)
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      })
    }

    // Build date filter
    const filter = { vendorId }
    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        filter.createdAt.$lte = end
      }
    }

    // Get all orders for this vendor
    const orders = await Order.find(filter)
      .populate("customerId", "name mobile email")
      .populate("items.productId", "name brand sku")
      .sort({ createdAt: -1 })
      .lean()

    // Calculate statistics
    const totalOrders = orders.length
    const pendingOrders = orders.filter((o) => o.status === "pending").length
    const processingOrders = orders.filter((o) => o.status === "processing").length
    const shippedOrders = orders.filter((o) => o.status === "shipped").length
    const deliveredOrders = orders.filter((o) => o.status === "delivered").length
    const cancelledOrders = orders.filter((o) => o.status === "cancelled").length

    // Calculate revenue (from delivered orders)
    const totalRevenue = orders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + (o.total || 0), 0)

    // Calculate total income (all orders regardless of status)
    const totalIncome = orders.reduce((sum, o) => sum + (o.total || 0), 0)

    // Calculate average order value
    const avgOrderValue = totalOrders > 0 ? totalIncome / totalOrders : 0

    // Revenue by status
    const revenueByStatus = {
      pending: orders
        .filter((o) => o.status === "pending")
        .reduce((sum, o) => sum + (o.total || 0), 0),
      processing: orders
        .filter((o) => o.status === "processing")
        .reduce((sum, o) => sum + (o.total || 0), 0),
      shipped: orders
        .filter((o) => o.status === "shipped")
        .reduce((sum, o) => sum + (o.total || 0), 0),
      delivered: totalRevenue,
      cancelled: orders
        .filter((o) => o.status === "cancelled")
        .reduce((sum, o) => sum + (o.total || 0), 0),
    }

    // Revenue over time (daily breakdown)
    const revenueByDate = {}
    const ordersByDate = {}

    orders.forEach((order) => {
      const date = new Date(order.createdAt).toISOString().split("T")[0]

      if (!revenueByDate[date]) {
        revenueByDate[date] = 0
        ordersByDate[date] = 0
      }

      if (order.status === "delivered") {
        revenueByDate[date] += order.total || 0
      }
      ordersByDate[date]++
    })

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

    // Get unique product count from orders (products sold by this vendor)
    const uniqueProducts = new Set()
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.productId?._id) {
          uniqueProducts.add(item.productId._id.toString())
        }
      })
    })
    const productCount = uniqueProducts.size

    // Get unique customers count
    const uniqueCustomers = new Set(orders.map((o) => o.customerId?._id?.toString()).filter(Boolean))
      .size

    // Payment method breakdown
    const paymentMethodBreakdown = {
      cod: orders.filter((o) => o.paymentMethod === "cod").length,
      online: orders.filter((o) => o.paymentMethod === "online").length,
      wallet: orders.filter((o) => o.paymentMethod === "wallet").length,
    }

    res.status(200).json({
      success: true,
      data: {
        vendor: {
          _id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          status: vendor.status,
          createdAt: vendor.createdAt,
        },
        summary: {
          totalOrders,
          totalRevenue: Math.round(totalRevenue),
          totalIncome: Math.round(totalIncome),
          avgOrderValue: Math.round(avgOrderValue),
          productCount,
          uniqueCustomers,
        },
        ordersByStatus: {
          pending: pendingOrders,
          processing: processingOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },
        revenueByStatus: {
          pending: Math.round(revenueByStatus.pending),
          processing: Math.round(revenueByStatus.processing),
          shipped: Math.round(revenueByStatus.shipped),
          delivered: Math.round(revenueByStatus.delivered),
          cancelled: Math.round(revenueByStatus.cancelled),
        },
        revenueOverTime: revenueData,
        ordersOverTime: ordersData,
        paymentMethodBreakdown,
        orders: orders.map((order) => ({
          _id: order._id,
          orderNumber: order.orderNumber,
          customer: order.customerId
            ? {
                name: order.customerId.name,
                mobile: order.customerId.mobile,
                email: order.customerId.email,
              }
            : null,
          total: order.total,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
          items: order.items.map((item) => ({
            name: item.name,
            brand: item.brand,
            quantity: item.quantity,
            price: item.price,
          })),
        })),
      },
    })
  } catch (error) {
    console.error("Get vendor analytics error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching vendor analytics",
      error: error.message,
    })
  }
})

// Get top 10 vendors by performance
router.get("/vendors/top-10", verifyAdminToken, async (req, res) => {
  try {
    const { period = "all" } = req.query // all, 7d, 30d, 90d, 1y

    // Build date filter
    let dateFilter = {}
    if (period !== "all") {
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
      }
      startDate.setHours(0, 0, 0, 0)
      dateFilter.createdAt = { $gte: startDate }
    }

    // Aggregate vendor performance
    const vendorPerformance = await Order.aggregate([
      {
        $match: {
          vendorId: { $exists: true, $ne: null },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: "$vendorId",
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ["$status", "delivered"] }, "$total", 0],
            },
          },
          totalIncome: { $sum: "$total" },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          processingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "processing"] }, 1, 0] },
          },
          shippedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "shipped"] }, 1, 0] },
          },
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
      {
        $limit: 10,
      },
    ])

    // Get vendor details
    const vendorIds = vendorPerformance.map((v) => v._id)
    const vendors = await Vendor.find({ _id: { $in: vendorIds } })
      .select("name email phone status createdAt totalProducts")
      .lean()

    const vendorMap = {}
    vendors.forEach((v) => {
      vendorMap[v._id.toString()] = v
    })

    // Combine performance data with vendor details
    const topVendors = vendorPerformance.map((perf) => {
      const vendor = vendorMap[perf._id.toString()]
      return {
        vendorId: perf._id,
        vendorName: vendor?.name || "Unknown",
        vendorEmail: vendor?.email || "N/A",
        vendorPhone: vendor?.phone || "N/A",
        vendorStatus: vendor?.status || "N/A",
        totalProducts: vendor?.totalProducts || 0,
        totalOrders: perf.totalOrders,
        deliveredOrders: perf.deliveredOrders,
        pendingOrders: perf.pendingOrders,
        processingOrders: perf.processingOrders,
        shippedOrders: perf.shippedOrders,
        totalRevenue: Math.round(perf.totalRevenue),
        totalIncome: Math.round(perf.totalIncome),
        avgOrderValue: perf.totalOrders > 0 ? Math.round(perf.totalIncome / perf.totalOrders) : 0,
        deliveryRate:
          perf.totalOrders > 0
            ? Math.round((perf.deliveredOrders / perf.totalOrders) * 100)
            : 0,
      }
    })

    res.status(200).json({
      success: true,
      data: {
        period,
        vendors: topVendors,
      },
    })
  } catch (error) {
    console.error("Get top vendors error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching top vendors",
      error: error.message,
    })
  }
})

// Export vendor analytics data (CSV format)
router.get("/vendor/:vendorId/export", verifyAdminToken, async (req, res) => {
  try {
    const { vendorId } = req.params
    const { startDate = "", endDate = "", format = "csv" } = req.query

    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId)
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      })
    }

    // Build date filter
    const filter = { vendorId }
    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        filter.createdAt.$lte = end
      }
    }

    // Get all orders for this vendor
    const orders = await Order.find(filter)
      .populate("customerId", "name mobile email")
      .populate("items.productId", "name brand sku")
      .sort({ createdAt: -1 })
      .lean()

    if (format === "csv") {
      // Generate CSV
      const csvRows = []
      
      // Header
      csvRows.push([
        "Order Number",
        "Date",
        "Customer Name",
        "Customer Email",
        "Customer Mobile",
        "Status",
        "Payment Status",
        "Payment Method",
        "Subtotal",
        "Shipping",
        "Total",
        "Items",
      ].join(","))

      // Data rows
      orders.forEach((order) => {
        const items = order.items.map((item) => `${item.name} (x${item.quantity})`).join("; ")
        csvRows.push([
          order.orderNumber || "",
          new Date(order.createdAt).toISOString().split("T")[0],
          order.customerId?.name || "",
          order.customerId?.email || "",
          order.customerId?.mobile || "",
          order.status || "",
          order.paymentStatus || "",
          order.paymentMethod || "",
          order.subtotal || 0,
          order.shipping || 0,
          order.total || 0,
          `"${items}"`,
        ].join(","))
      })

      const csv = csvRows.join("\n")

      res.setHeader("Content-Type", "text/csv")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="vendor-${vendor.name}-analytics-${Date.now()}.csv"`
      )
      res.send(csv)
    } else {
      // JSON format
      res.status(200).json({
        success: true,
        data: {
          vendor: {
            _id: vendor._id,
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone,
          },
          period: {
            startDate: startDate || null,
            endDate: endDate || null,
          },
          orders: orders.map((order) => ({
            orderNumber: order.orderNumber,
            date: order.createdAt,
            customer: order.customerId
              ? {
                  name: order.customerId.name,
                  email: order.customerId.email,
                  mobile: order.customerId.mobile,
                }
              : null,
            status: order.status,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            subtotal: order.subtotal,
            shipping: order.shipping,
            total: order.total,
            items: order.items.map((item) => ({
              name: item.name,
              brand: item.brand,
              sku: item.productId?.sku || "",
              quantity: item.quantity,
              price: item.price,
            })),
          })),
        },
      })
    }
  } catch (error) {
    console.error("Export vendor analytics error:", error)
    res.status(500).json({
      success: false,
      message: "Error exporting vendor analytics",
      error: error.message,
    })
  }
})

export default router











