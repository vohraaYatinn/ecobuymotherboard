import jwt from "jsonwebtoken"
import Admin from "../models/Admin.js"
import VendorUser from "../models/VendorUser.js"
import Vendor from "../models/Vendor.js"

export const verifyAdminToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Access denied."
      })
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production"
    )

    const admin = await Admin.findById(decoded.id).select("-password")

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid or inactive admin"
      })
    }

    req.admin = {
      id: admin._id,
      email: admin.email,
      role: admin.role
    }

    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    })
  }
}

export const verifyVendorToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Access denied."
      })
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production"
    )

    const vendorUser = await VendorUser.findById(decoded.userId)

    if (!vendorUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid vendor user"
      })
    }

    // Get vendor details if linked (allow all statuses - pending, approved, etc.)
    let vendor = null
    if (vendorUser.vendorId) {
      vendor = await Vendor.findById(vendorUser.vendorId)
      // Don't reject based on status - allow pending vendors to access
      // Individual endpoints can check status if needed
    }

    req.vendorUser = {
      id: vendorUser._id,
      mobile: vendorUser.mobile,
      name: vendorUser.name,
      email: vendorUser.email,
      vendorId: vendorUser.vendorId,
    }

    req.vendor = vendor ? {
      id: vendor._id,
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      status: vendor.status,
      isActive: vendor.isActive,
    } : null

    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    })
  }
}


