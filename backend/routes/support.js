import express from "express"
import nodemailer from "nodemailer"
import SupportRequest from "../models/SupportRequest.js"
import { verifyAdminToken } from "../middleware/auth.js"

const router = express.Router()

// Configure nodemailer transporter
const getTransporter = () => {
  if (!process.env.SMTP_USER && !process.env.ADMIN_EMAIL) {
    console.warn("⚠️  [SUPPORT] SMTP credentials not configured. Emails will not be sent.")
    return null
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || process.env.ADMIN_EMAIL || "mahender@ekranfix.com",
      pass: process.env.SMTP_PASS || process.env.ADMIN_EMAIL_PASSWORD,
    },
  })

  return transporter
}

// Submit support request
router.post("/submit", async (req, res) => {
  try {
    const { name, email, phone, orderID, category, message } = req.body

    // Validation
    if (!name || !email || !phone || !category || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone, category, and message are required",
      })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      })
    }

    // Create support request in database
    const supportRequest = new SupportRequest({
      name,
      email,
      phone,
      orderID: orderID || undefined,
      category,
      message,
      status: "pending",
    })

    await supportRequest.save()

    const adminEmail = process.env.ADMIN_EMAIL || "mahender@ekranfix.com"

    // Prepare email content
    const categoryLabels = {
      order: "Order Issues",
      product: "Product Quality",
      shipping: "Shipping & Delivery",
      payment: "Payment Issues",
      return: "Returns & Refunds",
      new_product_request: "New Product Request",
      other: "Other",
    }

    const mailOptions = {
      from: process.env.SMTP_USER || adminEmail,
      to: adminEmail,
      subject: `New Support Request: ${categoryLabels[category] || category}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #555; }
            .value { margin-top: 5px; color: #333; }
            .message-box { background-color: white; padding: 15px; border-left: 4px solid #4CAF50; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
            .ticket-id { background-color: #e3f2fd; padding: 10px; border-radius: 5px; margin-bottom: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Support Request</h2>
            </div>
            <div class="content">
              <div class="ticket-id">
                <strong>Ticket ID:</strong> ${supportRequest._id}
              </div>
              <div class="field">
                <div class="label">Name:</div>
                <div class="value">${name}</div>
              </div>
              <div class="field">
                <div class="label">Email:</div>
                <div class="value">${email}</div>
              </div>
              <div class="field">
                <div class="label">Phone:</div>
                <div class="value">${phone}</div>
              </div>
              ${orderID ? `
              <div class="field">
                <div class="label">Order ID:</div>
                <div class="value">${orderID}</div>
              </div>
              ` : ""}
              <div class="field">
                <div class="label">Category:</div>
                <div class="value">${categoryLabels[category] || category}</div>
              </div>
              <div class="field">
                <div class="label">Message:</div>
                <div class="message-box">${message.replace(/\n/g, "<br>")}</div>
              </div>
            </div>
            <div class="footer">
              <p>This support request was submitted from the Elecobuy website.</p>
              <p>Reply to: ${email}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }

    // Send email
    try {
      const transporter = getTransporter()
      if (transporter) {
        await transporter.sendMail(mailOptions)
        console.log("✅ [SUPPORT] Email sent successfully to", adminEmail)
      } else {
        console.warn("⚠️  [SUPPORT] Email not sent - SMTP not configured")
      }
    } catch (emailError) {
      console.error("❌ [SUPPORT] Error sending email:", emailError)
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: "Support request submitted successfully. We will get back to you within 24 hours.",
      ticketId: supportRequest._id,
    })
  } catch (error) {
    console.error("Error submitting support request:", error)
    res.status(500).json({
      success: false,
      message: "Error submitting support request. Please try again.",
    })
  }
})

// Get all support requests (admin only)
router.get("/admin/all", verifyAdminToken, async (req, res) => {
  try {
    const { status, category, page = 1, limit = 50, search } = req.query

    // Build query
    const query = {}
    if (status) query.status = status
    if (category) query.category = category
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { orderID: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ]
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const supportRequests = await SupportRequest.find(query)
      .populate("customerId", "name email mobile")
      .populate("resolvedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await SupportRequest.countDocuments(query)

    res.json({
      success: true,
      data: supportRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    console.error("Error fetching support requests:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching support requests",
    })
  }
})

// Get single support request (admin only)
router.get("/admin/:id", verifyAdminToken, async (req, res) => {
  try {
    const supportRequest = await SupportRequest.findById(req.params.id)
      .populate("customerId", "name email mobile")
      .populate("resolvedBy", "name")

    if (!supportRequest) {
      return res.status(404).json({
        success: false,
        message: "Support request not found",
      })
    }

    res.json({
      success: true,
      data: supportRequest,
    })
  } catch (error) {
    console.error("Error fetching support request:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching support request",
    })
  }
})

// Update support request status (admin only)
router.patch("/admin/:id/status", verifyAdminToken, async (req, res) => {
  try {
    const { status, adminNotes } = req.body

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      })
    }

    const updateData = { status }
    if (adminNotes) updateData.adminNotes = adminNotes

    if (status === "resolved" || status === "closed") {
      updateData.resolvedAt = new Date()
      updateData.resolvedBy = req.admin.id
    }

    const supportRequest = await SupportRequest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .populate("customerId", "name email mobile")
      .populate("resolvedBy", "name")

    if (!supportRequest) {
      return res.status(404).json({
        success: false,
        message: "Support request not found",
      })
    }

    res.json({
      success: true,
      data: supportRequest,
      message: "Support request updated successfully",
    })
  } catch (error) {
    console.error("Error updating support request:", error)
    res.status(500).json({
      success: false,
      message: "Error updating support request",
    })
  }
})

export default router

