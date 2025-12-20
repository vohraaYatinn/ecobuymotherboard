import express from "express"
import Settings from "../models/Settings.js"
import { verifyAdminToken } from "../middleware/auth.js"

const router = express.Router()

// Default shipping charges
const DEFAULT_SHIPPING_CHARGES = 150

// Helper function to get or create a setting
const getOrCreateSetting = async (key, defaultValue, description) => {
  let setting = await Settings.findOne({ key })
  
  if (!setting) {
    setting = new Settings({
      key,
      value: defaultValue,
      description,
    })
    await setting.save()
  }
  
  return setting
}

// Get shipping charges (public endpoint)
router.get("/shipping-charges", async (req, res) => {
  try {
    const setting = await getOrCreateSetting(
      "shipping_charges",
      DEFAULT_SHIPPING_CHARGES,
      "Shipping and handling charges in INR"
    )
    
    res.json({
      success: true,
      data: {
        shippingCharges: setting.value,
      },
    })
  } catch (error) {
    console.error("Error fetching shipping charges:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching shipping charges",
      data: {
        shippingCharges: DEFAULT_SHIPPING_CHARGES, // Fallback to default
      },
    })
  }
})

// Get all settings (admin only)
router.get("/admin/all", verifyAdminToken, async (req, res) => {
  try {
    const settings = await Settings.find()
      .populate("lastUpdatedBy", "name email")
      .sort({ key: 1 })
      .select("-__v")

    res.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    console.error("Error fetching settings:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching settings",
    })
  }
})

// Get shipping charges setting (admin only)
router.get("/admin/shipping-charges", verifyAdminToken, async (req, res) => {
  try {
    const setting = await getOrCreateSetting(
      "shipping_charges",
      DEFAULT_SHIPPING_CHARGES,
      "Shipping and handling charges in INR"
    )
    await setting.populate("lastUpdatedBy", "name email")

    res.json({
      success: true,
      data: setting,
    })
  } catch (error) {
    console.error("Error fetching shipping charges:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching shipping charges",
    })
  }
})

// Update shipping charges (admin only)
router.put("/admin/shipping-charges", verifyAdminToken, async (req, res) => {
  try {
    const { shippingCharges } = req.body

    // Validation
    if (shippingCharges === undefined || shippingCharges === null) {
      return res.status(400).json({
        success: false,
        message: "Shipping charges value is required",
      })
    }

    const charges = Number(shippingCharges)
    
    if (isNaN(charges) || charges < 0) {
      return res.status(400).json({
        success: false,
        message: "Shipping charges must be a non-negative number",
      })
    }

    // Update or create setting
    const setting = await Settings.findOneAndUpdate(
      { key: "shipping_charges" },
      {
        key: "shipping_charges",
        value: charges,
        description: "Shipping and handling charges in INR",
        lastUpdatedBy: req.admin._id,
      },
      { new: true, upsert: true }
    ).populate("lastUpdatedBy", "name email")

    res.json({
      success: true,
      message: "Shipping charges updated successfully",
      data: setting,
    })
  } catch (error) {
    console.error("Error updating shipping charges:", error)
    res.status(500).json({
      success: false,
      message: "Error updating shipping charges",
    })
  }
})

export default router

