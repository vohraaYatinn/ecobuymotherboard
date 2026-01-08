import express from "express"
import Customer from "../models/Customer.js"
import Order from "../models/Order.js"
import CustomerAddress from "../models/CustomerAddress.js"
import Cart from "../models/Cart.js"
import Wishlist from "../models/Wishlist.js"
import { verifyAdminToken } from "../middleware/auth.js"

const router = express.Router()

const removeCustomerRelations = async (customerId) => {
  await Promise.all([
    CustomerAddress.deleteMany({ customerId }),
    Cart.deleteMany({ customerId }),
    Wishlist.deleteMany({ customerId }),
  ])
}

// Bulk delete customers (Admin only) - Hard delete
router.post("/bulk-delete", verifyAdminToken, async (req, res) => {
  try {
    const { customerIds } = req.body

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Customer IDs array is required",
      })
    }

    const customers = await Customer.find({ _id: { $in: customerIds } })

    if (!customers || customers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No customers found for the provided IDs",
      })
    }

    for (const customer of customers) {
      await removeCustomerRelations(customer._id)
    }

    const deleteResult = await Customer.deleteMany({ _id: { $in: customerIds } })

    res.status(200).json({
      success: true,
      message: `Deleted ${deleteResult.deletedCount} customer(s)`,
      data: {
        deletedCount: deleteResult.deletedCount,
      },
    })
  } catch (error) {
    console.error("Bulk delete customers error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid customer IDs provided",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error deleting customers",
      error: error.message,
    })
  }
})

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
    const allOrders = await Order.find({ customerId: customer._id })
      .select("status paymentStatus total")
      .lean()
    
    const totalOrders = allOrders.length
    const totalSpent = allOrders.reduce((sum, order) => {
      if (order.status === "delivered" && order.paymentStatus === "paid") {
        return sum + order.total
      }
      return sum
    }, 0)

    // Get recent orders for display
    const recentOrdersData = await Order.find({ customerId: customer._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("orderNumber status paymentStatus createdAt total")
      .lean()

    // Get customer addresses
    const addresses = await CustomerAddress.find({ customerId: customer._id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean()

    // Format recent orders for frontend
    const recentOrders = recentOrdersData.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      total: order.total,
    }))

    res.status(200).json({
      success: true,
      data: {
        ...customer,
        totalOrders,
        totalSpent,
        addresses,
        recentOrders,
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

// Delete single customer (Admin only) - Hard delete
router.delete("/:id", verifyAdminToken, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      })
    }

    await removeCustomerRelations(customer._id)
    await Customer.deleteOne({ _id: customer._id })

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
      data: {
        deletedId: customer._id,
      },
    })
  } catch (error) {
    console.error("Delete customer error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error deleting customer",
      error: error.message,
    })
  }
})

export default router

