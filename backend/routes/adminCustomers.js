import express from "express"
import Customer from "../models/Customer.js"
import Order from "../models/Order.js"
import { verifyAdminToken } from "../middleware/auth.js"

const router = express.Router()

// Get all customers with filters and pagination (Admin only)
router.get("/", verifyAdminToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query

    // Build filter object
    const filter = {}

    // Search filter (name, email, phone, mobile)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ]
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === "asc" ? 1 : -1

    // Get customers
    const customers = await Customer.find(filter)
      .select("-pushTokens")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean()

    // Get total count
    const total = await Customer.countDocuments(filter)

    // Get customer IDs
    const customerIds = customers.map((c) => c._id)

    // Get order statistics using aggregation
    const orderStats = await Order.aggregate([
      { $match: { customerId: { $in: customerIds } } },
      {
        $group: {
          _id: "$customerId",
          totalOrders: { $sum: 1 },
          totalSpent: {
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
    ])

    // Create a map for quick lookup
    const statsMap = new Map()
    orderStats.forEach((stat) => {
      statsMap.set(stat._id.toString(), stat)
    })

    // Get cities from most recent orders
    const recentOrders = await Order.find({ customerId: { $in: customerIds } })
      .populate("shippingAddress", "city")
      .sort({ createdAt: -1 })
      .select("customerId shippingAddress")
      .lean()

    const cityMap = new Map()
    recentOrders.forEach((order) => {
      const customerId = order.customerId.toString()
      if (!cityMap.has(customerId) && order.shippingAddress?.city) {
        cityMap.set(customerId, order.shippingAddress.city)
      }
    })

    // Combine customer data with statistics
    const customersWithStats = customers.map((customer) => {
      const stats = statsMap.get(customer._id.toString()) || { totalOrders: 0, totalSpent: 0 }
      const city = cityMap.get(customer._id.toString()) || "N/A"

      return {
        ...customer,
        totalOrders: stats.totalOrders,
        totalSpent: stats.totalSpent,
        city,
      }
    })

    res.status(200).json({
      success: true,
      data: customersWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    console.error("Get admin customers error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching customers",
      error: error.message,
    })
  }
})

// Get single customer by ID (Admin only)
router.get("/:id", verifyAdminToken, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).select("-pushTokens").lean()

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      })
    }

    // Get order statistics
    const orders = await Order.find({ customerId: customer._id })
    const totalOrders = orders.length
    const totalSpent = orders.reduce((sum, order) => {
      if (order.status === "delivered" && order.paymentStatus === "paid") {
        return sum + order.total
      }
      return sum
    }, 0)

    res.status(200).json({
      success: true,
      data: {
        ...customer,
        totalOrders,
        totalSpent,
      },
    })
  } catch (error) {
    console.error("Get customer error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error fetching customer",
      error: error.message,
    })
  }
})

export default router

