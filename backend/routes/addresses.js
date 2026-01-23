import express from "express"
import CustomerAddress from "../models/CustomerAddress.js"
import jwt from "jsonwebtoken"

const router = express.Router()

// Middleware to verify JWT token
const authenticate = (req, res, next) => {
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
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    })
  }
}

// Get all addresses for customer
router.get("/", authenticate, async (req, res) => {
  try {
    const addresses = await CustomerAddress.find({ customerId: req.userId }).sort({ isDefault: -1, createdAt: -1 })

    res.json({
      success: true,
      data: addresses,
    })
  } catch (error) {
    console.error("Error fetching addresses:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Get single address
router.get("/:id", authenticate, async (req, res) => {
  try {
    const address = await CustomerAddress.findOne({
      _id: req.params.id,
      customerId: req.userId,
    })

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      })
    }

    res.json({
      success: true,
      data: address,
    })
  } catch (error) {
    console.error("Error fetching address:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Create new address
router.post("/", authenticate, async (req, res) => {
  try {
    const { type, firstName, lastName, phone, address1, address2, city, state, postcode, country, isDefault } = req.body

    // Validate required fields
    const normalizedPhone = String(phone || "").replace(/\D/g, "")
    if (!firstName || !lastName || !normalizedPhone || !address1 || !city || !state || !postcode) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      })
    }
    if (normalizedPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      })
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await CustomerAddress.updateMany({ customerId: req.userId }, { isDefault: false })
    }

    const address = new CustomerAddress({
      customerId: req.userId,
      type: type || "home",
      firstName,
      lastName,
      phone: normalizedPhone,
      address1,
      address2: address2 || "",
      city,
      state,
      postcode,
      country: country || "India",
      isDefault: isDefault || false,
    })

    await address.save()

    res.json({
      success: true,
      message: "Address added successfully",
      data: address,
    })
  } catch (error) {
    console.error("Error creating address:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Update address
router.put("/:id", authenticate, async (req, res) => {
  try {
    const address = await CustomerAddress.findOne({
      _id: req.params.id,
      customerId: req.userId,
    })

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      })
    }

    const { type, firstName, lastName, phone, address1, address2, city, state, postcode, country, isDefault } = req.body
    const normalizedPhone = phone !== undefined ? String(phone || "").replace(/\D/g, "") : null

    // Update fields
    if (type) address.type = type
    if (firstName) address.firstName = firstName
    if (lastName) address.lastName = lastName
    if (normalizedPhone !== null) {
      if (!normalizedPhone) {
        return res.status(400).json({
          success: false,
          message: "Phone number is required",
        })
      }
      if (normalizedPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          message: "Phone number must be 10 digits",
        })
      }
      address.phone = normalizedPhone
    }
    if (address1) address.address1 = address1
    if (address2 !== undefined) address.address2 = address2
    if (city) address.city = city
    if (state) address.state = state
    if (postcode) address.postcode = postcode
    if (country) address.country = country
    if (isDefault !== undefined) {
      address.isDefault = isDefault
      // If setting as default, unset other defaults
      if (isDefault) {
        await CustomerAddress.updateMany({ customerId: req.userId, _id: { $ne: address._id } }, { isDefault: false })
      }
    }

    await address.save()

    res.json({
      success: true,
      message: "Address updated successfully",
      data: address,
    })
  } catch (error) {
    console.error("Error updating address:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Delete address
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const address = await CustomerAddress.findOne({
      _id: req.params.id,
      customerId: req.userId,
    })

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      })
    }

    await CustomerAddress.deleteOne({ _id: address._id })

    res.json({
      success: true,
      message: "Address deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting address:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

export default router
