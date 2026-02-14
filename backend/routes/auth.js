import express from "express"
import jwt from "jsonwebtoken"
import Admin from "../models/Admin.js"
import { verifyAdminToken } from "../middleware/auth.js"

const router = express.Router()

// Admin Login
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      })
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() })

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      })
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Admin account is deactivated"
      })
    }

    // Compare password
    const isPasswordValid = await admin.comparePassword(password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      })
    }

    // Generate JWT token (no expiration - token never expires unless user logs out)
    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role
      },
      process.env.JWT_SECRET || "your-secret-key-change-in-production"
      // No expiresIn - token never expires automatically
    )

    // Return success response
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role
      }
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later."
    })
  }
})

// Admin Logout
router.post("/admin/logout", async (req, res) => {
  try {
    // Since we're using JWT tokens (stateless), logout is primarily client-side
    // But we can log the logout event or invalidate tokens if using a token blacklist
    res.status(200).json({
      success: true,
      message: "Logout successful"
    })
  } catch (error) {
    console.error("Logout error:", error)
    res.status(500).json({
      success: false,
      message: "Server error during logout"
    })
  }
})

// Verify token (for protected routes)
router.get("/admin/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
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

    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name || "",
        phone: admin.phone || "",
        role: admin.role
      }
    })
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    })
  }
})

// Get admin profile (protected)
router.get("/admin/profile", verifyAdminToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select("-password")
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid or inactive admin"
      })
    }
    res.status(200).json({
      success: true,
      data: {
        id: admin._id,
        email: admin.email,
        name: admin.name || "",
        phone: admin.phone || "",
        role: admin.role
      }
    })
  } catch (error) {
    console.error("Get admin profile error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile"
    })
  }
})

// Update admin profile (name, email, phone)
router.put("/admin/profile", verifyAdminToken, async (req, res) => {
  try {
    const { name, email, phone } = req.body
    const admin = await Admin.findById(req.admin.id)
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid or inactive admin"
      })
    }
    if (name !== undefined) admin.name = String(name).trim()
    if (phone !== undefined) admin.phone = String(phone).trim()
    if (email !== undefined) {
      const newEmail = String(email).toLowerCase().trim()
      if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email"
        })
      }
      const existing = await Admin.findOne({ email: newEmail })
      if (existing && existing._id.toString() !== admin._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Email already in use"
        })
      }
      admin.email = newEmail
    }
    await admin.save()
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: admin._id,
        email: admin.email,
        name: admin.name || "",
        phone: admin.phone || "",
        role: admin.role
      }
    })
  } catch (error) {
    console.error("Update admin profile error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update profile"
    })
  }
})

// Change admin password
router.put("/admin/change-password", verifyAdminToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters"
      })
    }
    const admin = await Admin.findById(req.admin.id)
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid or inactive admin"
      })
    }
    const isValid = await admin.comparePassword(currentPassword)
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      })
    }
    admin.password = newPassword
    await admin.save()
    res.status(200).json({
      success: true,
      message: "Password updated successfully"
    })
  } catch (error) {
    console.error("Change admin password error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to change password"
    })
  }
})

export default router

