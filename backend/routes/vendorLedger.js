import express from "express"
import Settings from "../models/Settings.js"
import { verifyAdminToken, verifyVendorToken } from "../middleware/auth.js"

const router = express.Router()

const LEDGER_SETTINGS_KEY = "vendor_ledger_payments"

const getOrCreateLedgerSettings = async () => {
  let setting = await Settings.findOne({ key: LEDGER_SETTINGS_KEY })
  if (!setting) {
    setting = await Settings.create({
      key: LEDGER_SETTINGS_KEY,
      value: {},
      description: "Vendor ledger payouts recorded by admin",
    })
  }
  if (typeof setting.value !== "object" || setting.value === null) {
    setting.value = {}
  }
  return setting
}

router.get("/admin", verifyAdminToken, async (_req, res) => {
  try {
    const setting = await getOrCreateLedgerSettings()

    res.json({
      success: true,
      data: {
        payments: setting.value || {},
        updatedAt: setting.updatedAt,
      },
    })
  } catch (error) {
    console.error("Error fetching vendor ledger payments:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching vendor ledger payments",
    })
  }
})

router.put("/admin/:vendorId", verifyAdminToken, async (req, res) => {
  try {
    const { vendorId } = req.params
    const { paid = 0, notes = "" } = req.body || {}

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required",
      })
    }

    const paidNumber = Number(paid)
    if (Number.isNaN(paidNumber) || paidNumber < 0) {
      return res.status(400).json({
        success: false,
        message: "Paid amount must be a non-negative number",
      })
    }

    const setting = await getOrCreateLedgerSettings()
    const payments = typeof setting.value === "object" && setting.value !== null ? setting.value : {}

    // Get existing paid amount for this vendor
    const existingPaid = payments[vendorId]?.paid || 0
    const existingPaidNumber = Number(existingPaid) || 0
    
    // Add the new payment amount to the existing total
    const newTotalPaid = existingPaidNumber + paidNumber

    payments[vendorId] = {
      paid: newTotalPaid,
      notes: typeof notes === "string" ? notes : "",
      updatedAt: new Date().toISOString(),
      updatedBy: req.admin?.id,
    }

    setting.value = payments
    setting.lastUpdatedBy = req.admin?.id
    // Mark the value field as modified so Mongoose detects the nested object changes
    setting.markModified('value')
    await setting.save()

    res.json({
      success: true,
      message: "Vendor ledger updated",
      data: {
        vendorId,
        payment: payments[vendorId],
        payments,
      },
    })
  } catch (error) {
    console.error("Error updating vendor ledger payment:", error)
    res.status(500).json({
      success: false,
      message: "Error updating vendor ledger payment",
    })
  }
})

router.get("/vendor", verifyVendorToken, async (req, res) => {
  try {
    const vendorId = req.vendorUser.vendorId?.toString()

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor account not linked. Please contact support.",
      })
    }

    const setting = await getOrCreateLedgerSettings()
    const payments = typeof setting.value === "object" && setting.value !== null ? setting.value : {}
    const entry = payments[vendorId] || null

    res.json({
      success: true,
      data: {
        paid: Math.max(Number(entry?.paid || 0), 0),
        notes: entry?.notes || "",
        updatedAt: entry?.updatedAt || null,
      },
    })
  } catch (error) {
    console.error("Error fetching vendor ledger for vendor:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching ledger details",
    })
  }
})

export default router




