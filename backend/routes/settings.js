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

// Default keys and values for site settings (company + contact)
const SITE_SETTING_KEYS = {
  company_brand_name: { default: "Elecobuy", description: "Brand name" },
  company_name: { default: "Elecobuy Electronics Pvt Ltd", description: "Company legal name" },
  company_address: { default: "123, Tech Park, Mumbai, Maharashtra - 400001", description: "Company address" },
  contact_primary_phone: { default: "1800 123 9336", description: "Primary phone" },
  contact_secondary_phone: { default: "+91 7396 777 600", description: "Secondary phone" },
  contact_support_phone: { default: "+91 7396 777 300", description: "Support phone" },
  contact_support_email: { default: "SUPPORT@ELECOBUY.COM", description: "Support email" },
}

async function getSiteSettingValue(key) {
  const meta = SITE_SETTING_KEYS[key]
  if (!meta) return undefined
  const doc = await Settings.findOne({ key })
  return doc ? doc.value : meta.default
}

// Get site settings (company + contact) for admin
router.get("/admin/site-settings", verifyAdminToken, async (req, res) => {
  try {
    const data = {}
    for (const key of Object.keys(SITE_SETTING_KEYS)) {
      data[key] = await getSiteSettingValue(key)
    }
    res.json({
      success: true,
      data: {
        companyInfo: {
          brandName: data.company_brand_name,
          companyName: data.company_name,
          address: data.company_address,
        },
        contactInfo: {
          primaryPhone: data.contact_primary_phone,
          secondaryPhone: data.contact_secondary_phone,
          supportPhone: data.contact_support_phone,
          supportEmail: data.contact_support_email,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching site settings:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching site settings",
    })
  }
})

// Update site settings (company + contact) - admin only
router.put("/admin/site-settings", verifyAdminToken, async (req, res) => {
  try {
    const { companyInfo, contactInfo } = req.body
    const updates = []

    if (companyInfo) {
      if (companyInfo.brandName != null) updates.push({ key: "company_brand_name", value: String(companyInfo.brandName) })
      if (companyInfo.companyName != null) updates.push({ key: "company_name", value: String(companyInfo.companyName) })
      if (companyInfo.address != null) updates.push({ key: "company_address", value: String(companyInfo.address) })
    }
    if (contactInfo) {
      if (contactInfo.primaryPhone != null) updates.push({ key: "contact_primary_phone", value: String(contactInfo.primaryPhone) })
      if (contactInfo.secondaryPhone != null) updates.push({ key: "contact_secondary_phone", value: String(contactInfo.secondaryPhone) })
      if (contactInfo.supportPhone != null) updates.push({ key: "contact_support_phone", value: String(contactInfo.supportPhone) })
      if (contactInfo.supportEmail != null) updates.push({ key: "contact_support_email", value: String(contactInfo.supportEmail) })
    }

    for (const { key, value } of updates) {
      const meta = SITE_SETTING_KEYS[key]
      if (!meta) continue
      await Settings.findOneAndUpdate(
        { key },
        {
          key,
          value,
          description: meta.description,
          lastUpdatedBy: req.admin.id,
        },
        { new: true, upsert: true }
      )
    }

    const data = {}
    for (const key of Object.keys(SITE_SETTING_KEYS)) {
      data[key] = await getSiteSettingValue(key)
    }
    res.json({
      success: true,
      message: "Site settings updated successfully",
      data: {
        companyInfo: {
          brandName: data.company_brand_name,
          companyName: data.company_name,
          address: data.company_address,
        },
        contactInfo: {
          primaryPhone: data.contact_primary_phone,
          secondaryPhone: data.contact_secondary_phone,
          supportPhone: data.contact_support_phone,
          supportEmail: data.contact_support_email,
        },
      },
    })
  } catch (error) {
    console.error("Error updating site settings:", error)
    res.status(500).json({
      success: false,
      message: "Error updating site settings",
    })
  }
})

export default router

