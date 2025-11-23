import express from "express"
import Order from "../models/Order.js"
import Customer from "../models/Customer.js"
import Product from "../models/Product.js"
import Vendor from "../models/Vendor.js"
import { verifyAdminToken } from "../middleware/auth.js"

const router = express.Router()

// Get admin dashboard statistics
router.get("/stats", verifyAdminToken, async (req, res) => {
  try {
    // Get counts
    const totalOrders = await Order.countDocuments()
    const totalCustomers = await Customer.countDocuments()
    const totalProducts = await Product.countDocuments({ isActive: true })
    const totalVendors = await Vendor.countDocuments({ isActive: true })

    // Get order status counts
    const pendingOrders = await Order.countDocuments({ status: "pending" })
    const processingOrders = await Order.countDocuments({ status: "processing" })
    const shippedOrders = await Order.countDocuments({ status: "shipped" })
    const deliveredOrders = await Order.countDocuments({ status: "delivered" })
    const cancelledOrders = await Order.countDocuments({ status: "cancelled" })

    // Calculate revenue from delivered and paid orders
    const revenueResult = await Order.aggregate([
      { $match: { status: "delivered", paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ])
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0

    // Get recent orders (last 5)
    const recentOrders = await Order.find()
      .populate("customerId", "name mobile")
      .sort({ createdAt: -1 })
      .limit(5)
      .select("orderNumber customerId total status paymentStatus createdAt")
      .lean()

    // Get pending vendor requests
    const pendingVendors = await Vendor.find({ status: "pending", isActive: true })
      .select("name email phone createdAt")
      .limit(5)
      .lean()

    res.status(200).json({
      success: true,
      data: {
        totals: {
          orders: totalOrders,
          customers: totalCustomers,
          products: totalProducts,
          vendors: totalVendors,
          revenue: totalRevenue,
        },
        orderStatus: {
          pending: pendingOrders,
          processing: processingOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },
        recentOrders,
        pendingVendors,
      },
    })
  } catch (error) {
    console.error("Get admin dashboard stats error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
      error: error.message,
    })
  }
})

export default router



