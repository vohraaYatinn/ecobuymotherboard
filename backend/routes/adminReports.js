import express from "express"
import Order from "../models/Order.js"
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

// Get yesterday's summary
router.get("/yesterday-summary", verifyAdminToken, async (req, res) => {
  try {
    // Get yesterday's date range (start and end of yesterday)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const yesterdayEnd = new Date(yesterday)
    yesterdayEnd.setHours(23, 59, 59, 999)

    // Orders received yesterday (created yesterday)
    const ordersReceived = await Order.countDocuments({
      createdAt: {
        $gte: yesterday,
        $lte: yesterdayEnd,
      },
    })

    // Orders dispatched yesterday (status changed to shipped yesterday)
    // Note: We'll check orders that were shipped yesterday based on updatedAt
    // This is an approximation - ideally you'd track status change timestamps
    const ordersDispatched = await Order.countDocuments({
      status: "shipped",
      updatedAt: {
        $gte: yesterday,
        $lte: yesterdayEnd,
      },
    })

    // Orders pending (status is pending)
    const ordersPending = await Order.countDocuments({
      status: "pending",
    })

    // Orders delivered (status is delivered)
    const ordersDelivered = await Order.countDocuments({
      status: "delivered",
    })

    // Additional: Orders that were delivered yesterday
    const ordersDeliveredYesterday = await Order.countDocuments({
      status: "delivered",
      updatedAt: {
        $gte: yesterday,
        $lte: yesterdayEnd,
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
        date: yesterday.toISOString().split("T")[0],
      },
    })
  } catch (error) {
    console.error("Get yesterday summary error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching yesterday summary",
      error: error.message,
    })
  }
})

// Get daily orders for chart (last N days)
router.get("/daily-orders", verifyAdminToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Aggregate orders by day
    const dailyOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
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
    const weeks = parseInt(req.query.weeks) || 12

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - weeks * 7)
    startDate.setHours(0, 0, 0, 0)

    // Aggregate orders by week
    const weeklyOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
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
    const months = parseInt(req.query.months) || 12

    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)

    // Aggregate orders by month
    const monthlyOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
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

export default router


