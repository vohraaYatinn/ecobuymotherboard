import express from "express"
import Settings from "../models/Settings.js"
import { verifyAdminToken, verifyVendorToken } from "../middleware/auth.js"
import Order from "../models/Order.js"
import Vendor from "../models/Vendor.js"
import VendorUser from "../models/VendorUser.js"
import Notification from "../models/Notification.js"
import { sendEmail } from "../services/mailer.js"
import { renderVendorEmailHtml } from "../services/vendorOrderStageNotifications.js"

const router = express.Router()

const RETURN_WINDOW_DAYS = 3
const GATEWAY_RATE = 0.02 // 2% of payout before gateway

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

    // Notify vendor(s) if an actual payment was recorded (paidNumber > 0)
    // Notes-only updates should not trigger a payout notification.
    if (paidNumber > 0) {
      try {
        const vendor = await Vendor.findById(vendorId).select("name email").lean()
        const vendorUsers = await VendorUser.find({ vendorId, isActive: true })
          .select("_id email mobile name")
          .lean()

        const vendorName = vendor?.name || "Vendor"
        const amountText = `₹${paidNumber.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        const totalText = `₹${newTotalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        const cleanNotes = typeof notes === "string" ? notes.trim() : ""

        const title = "Payout recorded"
        const message =
          `Payment of ${amountText} has been recorded for you.` +
          ` Total paid till date: ${totalText}.` +
          (cleanNotes ? ` Notes: ${cleanNotes}` : "")

        if (vendorUsers.length > 0) {
          await Notification.insertMany(
            vendorUsers.map((vu) => ({
              userId: vu._id,
              userType: "vendor",
              type: "vendor_payment_received",
              title,
              message,
              vendorId,
              isRead: false,
              metadata: {
                amount: paidNumber,
                totalPaid: newTotalPaid,
                notes: cleanNotes,
                recordedByAdminId: req.admin?.id,
              },
            }))
          )
        }

        // Email notification (best-effort)
        const toEmail = vendor?.email || vendorUsers?.[0]?.email
        if (toEmail) {
          const subject = `Payout recorded: ${amountText}`
          const detailsLines = [
            `Payout Amount: ${amountText}`,
            `Total Paid Till Date: ${totalText}`,
            cleanNotes ? `Notes: ${cleanNotes}` : null,
            `Recorded At: ${new Date().toLocaleString("en-IN")}`,
          ].filter(Boolean)

          const html = renderVendorEmailHtml({
            vendorName,
            title: "💸 Payout Recorded",
            message: `A payment of <strong>${amountText}</strong> has been recorded for your account.`,
            details: detailsLines.join("\n"),
            order: null, // payout emails are not order-specific
            stageInfo: {
              icon: "💸",
              color: "#10B981",
              showPrice: false,
              subject,
            },
          })
          await sendEmail({ to: toEmail, subject, html })
        }
      } catch (notifyError) {
        console.error("⚠️ Vendor payout notification failed (non-blocking):", notifyError)
      }
    }

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

// Get vendor ledger balance - uses EXACT same logic as admin ledger
router.get("/vendor/balance", verifyVendorToken, async (req, res) => {
  try {
    const vendorId = req.vendorUser.vendorId?.toString()

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor account not linked. Please contact support.",
      })
    }

    // Get vendor to fetch commission rate
    const vendor = await Vendor.findById(vendorId).select("commission")
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      })
    }

    const commissionRate = vendor?.commission || 0
    const commissionMultiplier = commissionRate / 100
    const payoutMultiplier = 1 - commissionMultiplier

    // Calculate return window cutoff - same as admin ledger
    const now = Date.now()
    const returnWindowMs = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000
    const returnWindowCutoff = now - returnWindowMs

    // Get ALL delivered orders for this vendor (no limit, matching admin ledger logic)
    // Admin ledger fetches with limit 100, but we need ALL orders for this vendor
    const deliveredOrders = await Order.find({
      vendorId,
      status: "delivered",
    })
      .populate("vendorId", "commission")
      .select("subtotal total status deliveredAt updatedAt returnRequest")
      .lean()

    // Filter orders using EXACT same logic as admin ledger (when showReadyOnly = true)
    const eligibleOrders = deliveredOrders.filter((order) => {
      // Use deliveredAt if available, otherwise fallback to updatedAt (for older orders)
      const deliveryDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.updatedAt)
      const deliveredAt = deliveryDate.getTime()
      const returnDeadline = deliveredAt + returnWindowMs
      const isWindowOver = now > returnDeadline
      
      // Only include if return window is over (showReadyOnly = true in admin)
      if (!isWindowOver) return false
      
      // Exclude if a return is still pending/accepted/completed
      const rrType = order.returnRequest?.type
      if (rrType && rrType !== "denied") return false
      
      return true
    })

    // Calculate netPayout for each order using EXACT same formula as admin ledger
    let totalNetPayout = 0
    for (const order of eligibleOrders) {
      // Get vendor commission rate from populated order or fallback
      const orderVendor = typeof order.vendorId === "object" && order.vendorId !== null ? order.vendorId : null
      const orderCommissionRate = orderVendor?.commission || commissionRate || 0
      const orderCommissionMultiplier = orderCommissionRate / 100
      const orderPayoutMultiplier = 1 - orderCommissionMultiplier

      const platformCommission = order.subtotal * orderCommissionMultiplier
      const payoutBeforeGateway = order.subtotal * orderPayoutMultiplier
      const paymentGatewayCharges = payoutBeforeGateway * GATEWAY_RATE
      const netPayout = payoutBeforeGateway - paymentGatewayCharges

      totalNetPayout += netPayout
    }

    // Get paid amount from ledger
    const setting = await getOrCreateLedgerSettings()
    const payments = typeof setting.value === "object" && setting.value !== null ? setting.value : {}
    const ledgerEntry = payments[vendorId]
    const paidAmount = Math.max(Number(ledgerEntry?.paid || 0), 0)

    // Calculate balance using EXACT same formula: balance = netPayout - paid
    const balanceAmount = totalNetPayout - paidAmount

    res.json({
      success: true,
      data: {
        netPayout: totalNetPayout,
        paid: paidAmount,
        balance: balanceAmount,
        ordersCount: eligibleOrders.length,
      },
    })
  } catch (error) {
    console.error("Error calculating vendor ledger balance:", error)
    res.status(500).json({
      success: false,
      message: "Error calculating ledger balance",
      error: error.message,
    })
  }
})

export default router




