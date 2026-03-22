import jwt from "jsonwebtoken"
import Admin from "../models/Admin.js"
import VendorUser from "../models/VendorUser.js"
import Vendor from "../models/Vendor.js"
import Employee from "../models/Employee.js"
import Designation from "../models/Designation.js"

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

    // Handle employee tokens
    if (decoded.type === "employee") {
      const employee = await Employee.findById(decoded.id).select("-password").populate("designation")

      if (!employee || !employee.isActive) {
        return res.status(401).json({ success: false, message: "Invalid or inactive employee" })
      }

      if (!employee.designation || !employee.designation.isActive) {
        return res.status(403).json({ success: false, message: "Your designation has been deactivated. Contact admin." })
      }

      req.employee = {
        id: employee._id,
        email: employee.email,
        name: employee.name,
        designation: employee.designation.name,
        permissions: employee.designation.permissions,
      }

      // Also set req.admin for backward compatibility with routes that check req.admin.id
      req.admin = {
        id: employee._id,
        email: employee.email,
        role: "employee",
        isEmployee: true,
        permissions: employee.designation.permissions,
      }

      return next()
    }

    // Handle admin tokens
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

export const verifyEmployeeToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]

    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided. Access denied." })
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production"
    )

    if (decoded.type !== "employee") {
      return res.status(401).json({ success: false, message: "Invalid token type" })
    }

    const employee = await Employee.findById(decoded.id).select("-password").populate("designation")

    if (!employee || !employee.isActive) {
      return res.status(401).json({ success: false, message: "Invalid or inactive employee" })
    }

    if (!employee.designation || !employee.designation.isActive) {
      return res.status(403).json({ success: false, message: "Designation deactivated. Contact admin." })
    }

    req.employee = {
      id: employee._id,
      email: employee.email,
      name: employee.name,
      designation: employee.designation.name,
      permissions: employee.designation.permissions,
    }

    next()
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid or expired token" })
  }
}

export const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    // Real admins (not employees) bypass permission checks
    if (req.admin && !req.admin.isEmployee) return next()

    // For employees, check permissions from either req.employee or req.admin
    const permissions = req.employee?.permissions || req.admin?.permissions || []

    if (permissions.length === 0 && !req.admin && !req.employee) {
      return res.status(401).json({ success: false, message: "Authentication required" })
    }

    const hasPermission = requiredPermissions.some((perm) => permissions.includes(perm))

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      })
    }

    next()
  }
}

export const verifyAdminOrEmployee = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided. Access denied." })
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production"
    )

    if (decoded.type === "employee") {
      const employee = await Employee.findById(decoded.id).select("-password").populate("designation")
      if (!employee || !employee.isActive || !employee.designation || !employee.designation.isActive) {
        return res.status(401).json({ success: false, message: "Invalid or inactive employee" })
      }
      req.employee = {
        id: employee._id,
        email: employee.email,
        name: employee.name,
        designation: employee.designation.name,
        permissions: employee.designation.permissions,
      }
      return next()
    }

    const admin = await Admin.findById(decoded.id).select("-password")
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: "Invalid or inactive admin" })
    }
    req.admin = { id: admin._id, email: admin.email, role: admin.role }
    next()
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid or expired token" })
  }
}
