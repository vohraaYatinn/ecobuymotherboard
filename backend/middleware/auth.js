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

    if (!decoded.sessionId || vendorUser.sessionId !== decoded.sessionId) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again."
      })
    }

    // Get vendor details if linked
    let vendor = null
    if (vendorUser.vendorId) {
      vendor = await Vendor.findById(vendorUser.vendorId)
    }

    // Require vendor to be linked and approved for access
    if (!vendor) {
      return res.status(403).json({
        success: false,
        message: "No vendor account found. Please register as a vendor first.",
      })
    }

    // Check vendor status - only approved vendors can access protected routes
    if (vendor.status !== "approved") {
      let message = ""
      switch (vendor.status) {
        case "pending":
          message = "Your request is under review. You will receive an email notification once your vendor account is approved."
          break
        case "rejected":
          message = "Your vendor account has been rejected. Please contact support for more information."
          break
        case "suspended":
          message = "Your vendor account has been suspended. Please contact support for more information."
          break
        default:
          message = "Your vendor account is not approved. Please contact support for more information."
      }

      return res.status(403).json({
        success: false,
        message,
        vendorStatus: vendor.status,
      })
    }

    req.vendorUser = {
      id: vendorUser._id,
      mobile: vendorUser.mobile,
      name: vendorUser.name,
      email: vendorUser.email,
      vendorId: vendorUser.vendorId,
    }

    req.vendor = {
      id: vendor._id,
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      status: vendor.status,
      isActive: vendor.isActive,
    }

    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    })
  }
}


