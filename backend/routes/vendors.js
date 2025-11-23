import express from "express"
import Vendor from "../models/Vendor.js"
import { verifyAdminToken } from "../middleware/auth.js"

const router = express.Router()

// Get all vendors with filters and pagination
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query

    // Build filter object
    const filter = {}

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ]
    }

    // Status filter
    if (status && status !== "all") {
      filter.status = status
    }

    // Only show active vendors
    filter.isActive = true

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === "asc" ? 1 : -1

    // Get vendors
    const vendors = await Vendor.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean()

    // Get total count
    const total = await Vendor.countDocuments(filter)

    res.status(200).json({
      success: true,
      data: vendors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    console.error("Get vendors error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching vendors",
    })
  }
})

// Get single vendor by ID
router.get("/:id", async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id)

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      })
    }

    res.status(200).json({
      success: true,
      data: vendor,
    })
  } catch (error) {
    console.error("Get vendor error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error fetching vendor",
    })
  }
})

// Create new vendor (Admin only)
router.post("/", verifyAdminToken, async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      phone,
      status,
      address,
    } = req.body

    // Validate required fields
    if (!name || !username || !email || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    // Check if email or username already exists
    const existingVendor = await Vendor.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    })

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor with this email or username already exists",
      })
    }

    // Create vendor
    const vendor = new Vendor({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      phone,
      status: status || "pending",
      address: {
        firstName: address.firstName,
        lastName: address.lastName,
        address1: address.address1,
        address2: address.address2 || "",
        city: address.city,
        state: address.state,
        postcode: address.postcode,
        country: address.country || "india",
      },
    })

    await vendor.save()

    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      data: vendor,
    })
  } catch (error) {
    console.error("Create vendor error:", error)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Vendor with this email or username already exists",
      })
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)[0].message,
      })
    }
    res.status(500).json({
      success: false,
      message: "Error creating vendor",
    })
  }
})

// Update vendor (Admin only)
router.put("/:id", verifyAdminToken, async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      phone,
      status,
      address,
    } = req.body

    const vendor = await Vendor.findById(req.params.id)

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      })
    }

    // Check if email or username is being changed and if it already exists
    if (email && email.toLowerCase() !== vendor.email) {
      const existingVendor = await Vendor.findOne({ email: email.toLowerCase() })
      if (existingVendor) {
        return res.status(400).json({
          success: false,
          message: "Vendor with this email already exists",
        })
      }
    }

    if (username && username.toLowerCase() !== vendor.username) {
      const existingVendor = await Vendor.findOne({ username: username.toLowerCase() })
      if (existingVendor) {
        return res.status(400).json({
          success: false,
          message: "Vendor with this username already exists",
        })
      }
    }

    // Update fields
    if (name) vendor.name = name
    if (username) vendor.username = username.toLowerCase()
    if (email) vendor.email = email.toLowerCase()
    if (phone) vendor.phone = phone
    if (status) vendor.status = status
    if (address) {
      vendor.address = {
        firstName: address.firstName || vendor.address.firstName,
        lastName: address.lastName || vendor.address.lastName,
        address1: address.address1 || vendor.address.address1,
        address2: address.address2 !== undefined ? address.address2 : vendor.address.address2,
        city: address.city || vendor.address.city,
        state: address.state || vendor.address.state,
        postcode: address.postcode || vendor.address.postcode,
        country: address.country || vendor.address.country,
      }
    }

    await vendor.save()

    res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      data: vendor,
    })
  } catch (error) {
    console.error("Update vendor error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      })
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Vendor with this email or username already exists",
      })
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)[0].message,
      })
    }
    res.status(500).json({
      success: false,
      message: "Error updating vendor",
    })
  }
})

// Delete vendor (Admin only) - Soft delete
router.delete("/:id", verifyAdminToken, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id)

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      })
    }

    // Soft delete
    vendor.isActive = false
    await vendor.save()

    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    })
  } catch (error) {
    console.error("Delete vendor error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error deleting vendor",
    })
  }
})

// Get vendor statistics
router.get("/:id/stats", async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).select("totalProducts ordersFulfilled createdAt")

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      })
    }

    res.status(200).json({
      success: true,
      data: {
        totalProducts: vendor.totalProducts,
        ordersFulfilled: vendor.ordersFulfilled,
        memberSince: vendor.createdAt,
      },
    })
  } catch (error) {
    console.error("Get vendor stats error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching vendor statistics",
    })
  }
})

export default router




