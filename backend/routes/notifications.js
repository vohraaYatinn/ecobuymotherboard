import express from "express"
import Notification from "../models/Notification.js"
import { verifyAdminToken } from "../middleware/auth.js"
import { verifyVendorToken } from "../middleware/auth.js"
import jwt from "jsonwebtoken"

const router = express.Router()

// Middleware to verify customer JWT token
const verifyCustomerToken = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-in-production")
    req.userId = decoded.userId
    req.userType = "customer"
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    })
  }
}

// Get notifications for customer
router.get("/customer", verifyCustomerToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query

    const filter = {
      userId: req.userId,
      userType: "customer",
    }

    if (unreadOnly === "true") {
      filter.isRead = false
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const notifications = await Notification.find(filter)
      .populate("orderId", "orderNumber status total")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean()

    const total = await Notification.countDocuments(filter)
    const unreadCount = await Notification.countDocuments({
      userId: req.userId,
      userType: "customer",
      isRead: false,
    })

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        unreadCount,
      },
    })
  } catch (error) {
    console.error("Get customer notifications error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message,
    })
  }
})

// Get notifications for vendor
router.get("/vendor", verifyVendorToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query

    const filter = {
      userId: req.vendorUser.id,
      userType: "vendor",
    }

    if (unreadOnly === "true") {
      filter.isRead = false
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const notifications = await Notification.find(filter)
      .populate("orderId", "orderNumber status total")
      .populate("customerId", "name mobile")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean()

    const total = await Notification.countDocuments(filter)
    const unreadCount = await Notification.countDocuments({
      userId: req.vendorUser.id,
      userType: "vendor",
      isRead: false,
    })

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        unreadCount,
      },
    })
  } catch (error) {
    console.error("Get vendor notifications error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message,
    })
  }
})

// Get notifications for admin
router.get("/admin", verifyAdminToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query

    const filter = {
      userId: req.admin.id,
      userType: "admin",
    }

    if (unreadOnly === "true") {
      filter.isRead = false
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const notifications = await Notification.find(filter)
      .populate("orderId", "orderNumber status total")
      .populate("vendorId", "name phone")
      .populate("customerId", "name mobile")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean()

    const total = await Notification.countDocuments(filter)
    const unreadCount = await Notification.countDocuments({
      userId: req.admin.id,
      userType: "admin",
      isRead: false,
    })

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        unreadCount,
      },
    })
  } catch (error) {
    console.error("Get admin notifications error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message,
    })
  }
})

// Mark notification as read - Customer
router.put("/customer/:id/read", verifyCustomerToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      })
    }

    if (notification.userType !== "customer" || notification.userId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      })
    }

    notification.isRead = true
    await notification.save()

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    })
  } catch (error) {
    console.error("Mark notification read error:", error)
    res.status(500).json({
      success: false,
      message: "Error updating notification",
      error: error.message,
    })
  }
})

// Mark notification as read - Vendor
router.put("/vendor/:id/read", verifyVendorToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      })
    }

    if (notification.userType !== "vendor" || notification.userId.toString() !== req.vendorUser.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      })
    }

    notification.isRead = true
    await notification.save()

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    })
  } catch (error) {
    console.error("Mark notification read error:", error)
    res.status(500).json({
      success: false,
      message: "Error updating notification",
      error: error.message,
    })
  }
})

// Mark notification as read - Admin
router.put("/admin/:id/read", verifyAdminToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      })
    }

    if (notification.userType !== "admin" || notification.userId.toString() !== req.admin.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      })
    }

    notification.isRead = true
    await notification.save()

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    })
  } catch (error) {
    console.error("Mark notification read error:", error)
    res.status(500).json({
      success: false,
      message: "Error updating notification",
      error: error.message,
    })
  }
})

// Mark all notifications as read - Customer
router.put("/customer/mark-all-read", verifyCustomerToken, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        userId: req.userId,
        userType: "customer",
        isRead: false,
      },
      { isRead: true }
    )

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    })
  } catch (error) {
    console.error("Mark all notifications read error:", error)
    res.status(500).json({
      success: false,
      message: "Error updating notifications",
      error: error.message,
    })
  }
})

// Mark all notifications as read - Vendor
router.put("/vendor/mark-all-read", verifyVendorToken, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        userId: req.vendorUser.id,
        userType: "vendor",
        isRead: false,
      },
      { isRead: true }
    )

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    })
  } catch (error) {
    console.error("Mark all notifications read error:", error)
    res.status(500).json({
      success: false,
      message: "Error updating notifications",
      error: error.message,
    })
  }
})

// Mark all notifications as read - Admin
router.put("/admin/mark-all-read", verifyAdminToken, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        userId: req.admin.id,
        userType: "admin",
        isRead: false,
      },
      { isRead: true }
    )

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    })
  } catch (error) {
    console.error("Mark all notifications read error:", error)
    res.status(500).json({
      success: false,
      message: "Error updating notifications",
      error: error.message,
    })
  }
})

export default router

