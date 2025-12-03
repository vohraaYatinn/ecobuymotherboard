import express from "express"
import { verifyAdminToken } from "../middleware/auth.js"
import { generateInvoicePDF, getOrderForInvoice } from "../services/invoiceService.js"
import mongoose from "mongoose"
import jwt from "jsonwebtoken"

const router = express.Router()

/**
 * Download invoice for customer
 * GET /api/invoices/:orderId/download
 */
router.get("/:orderId/download", async (req, res) => {
  try {
    const { orderId } = req.params
    const token = req.headers.authorization?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    // Verify token and get customer ID
    let userId
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-in-production")
      userId = decoded.userId
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      })
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      })
    }

    // Get order for invoice
    const order = await getOrderForInvoice(orderId, userId, false)

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(order)

    // Set response headers
    const filename = `Invoice_${order.invoiceNumber || order.orderNumber}.pdf`
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.setHeader("Content-Length", pdfBuffer.length)

    // Send PDF
    res.send(pdfBuffer)
  } catch (error) {
    console.error("Invoice download error:", error)
    if (error.message === "Order not found") {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate invoice",
    })
  }
})

/**
 * Download invoice for admin
 * GET /api/invoices/:orderId/download/admin
 */
router.get("/:orderId/download/admin", verifyAdminToken, async (req, res) => {
  try {
    const { orderId } = req.params

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      })
    }

    // Get order for invoice (admin can access any order)
    const order = await getOrderForInvoice(orderId, null, true)

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(order)

    // Set response headers
    const filename = `Invoice_${order.invoiceNumber || order.orderNumber}.pdf`
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.setHeader("Content-Length", pdfBuffer.length)

    // Send PDF
    res.send(pdfBuffer)
  } catch (error) {
    console.error("Admin invoice download error:", error)
    if (error.message === "Order not found") {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate invoice",
    })
  }
})

export default router



