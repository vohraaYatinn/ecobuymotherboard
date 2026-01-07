import express from "express"
import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"
import nodemailer from "nodemailer"
import SupportRequest from "../models/SupportRequest.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Create enquiries directory if it doesn't exist
const enquiriesDir = path.join(__dirname, "../uploads/enquiries")
if (!fs.existsSync(enquiriesDir)) {
  fs.mkdirSync(enquiriesDir, { recursive: true })
}

// Configure multer for enquiry image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, enquiriesDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, `enquiry-${uniqueSuffix}${ext}`)
  },
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"), false)
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})

// Configure nodemailer transporter
const getTransporter = () => {
  // Use environment variables for email configuration
  // For production, configure with your SMTP settings
  // If SMTP credentials are not provided, return null (email won't be sent but enquiry will still be processed)
  if (!process.env.SMTP_USER && !process.env.ADMIN_EMAIL) {
    console.warn("⚠️  [ENQUIRY] SMTP credentials not configured. Emails will not be sent.")
    return null
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || process.env.ADMIN_EMAIL || "SUPPORT@ELECOBUY.COM",
      pass: process.env.SMTP_PASS || process.env.ADMIN_EMAIL_PASSWORD,
    },
  })

  return transporter
}

// Submit enquiry
router.post("/submit", (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Image file is too large. Maximum size is 10MB.",
          })
        }
        return res.status(400).json({
          success: false,
          message: err.message || "Error uploading image",
        })
      }
      // Handle other upload errors
      return res.status(400).json({
        success: false,
        message: err.message || "Error uploading image. Please try again.",
      })
    }
    next()
  })
}, async (req, res) => {
  try {
    const { name, phone, email, productSearched, note } = req.body

    // Validation
    if (!name || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, and email are required",
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

    const adminEmail = process.env.ADMIN_EMAIL || "SUPPORT@ELECOBUY.COM"

    // Create a linked support request so admins can see this in the Support Requests screen
    let supportRequest
    try {
      const messageParts = [
        productSearched ? `Product searched: ${productSearched}` : null,
        note ? `Customer note: ${note}` : null,
      ].filter(Boolean)

      supportRequest = new SupportRequest({
        name,
        email,
        phone,
        category: "new_product_request",
        message:
          messageParts.join("\n\n") ||
          "New product request submitted from the product search form.",
        status: "pending",
      })

      await supportRequest.save()
    } catch (dbError) {
      console.error("❌ [ENQUIRY] Error creating support request:", dbError)
      return res.status(500).json({
        success: false,
        message: "Error submitting enquiry. Please try again.",
      })
    }

    // Prepare email content
    const imageAttachment = req.file
      ? {
          filename: req.file.originalname,
          path: req.file.path,
        }
      : null

    const mailOptions = {
      from: process.env.SMTP_USER || adminEmail,
      to: adminEmail,
      subject: `New Product Enquiry: ${productSearched || "General Enquiry"}`,
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
            .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Product Enquiry</h2>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Name:</div>
                <div class="value">${name}</div>
              </div>
              <div class="field">
                <div class="label">Phone:</div>
                <div class="value">${phone}</div>
              </div>
              <div class="field">
                <div class="label">Email:</div>
                <div class="value">${email}</div>
              </div>
              <div class="field">
                <div class="label">Product Searched:</div>
                <div class="value">${productSearched || "Not specified"}</div>
              </div>
              ${note ? `
              <div class="field">
                <div class="label">Note:</div>
                <div class="value">${note}</div>
              </div>
              ` : ""}
              ${imageAttachment ? `
              <div class="field">
                <div class="label">Image Attached:</div>
                <div class="value">Yes (see attachment)</div>
              </div>
              ` : ""}
            </div>
            <div class="footer">
              <p>This enquiry was submitted from the Elecobuy website.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: imageAttachment ? [imageAttachment] : [],
    }

    // Send email
    try {
      const transporter = getTransporter()
      if (transporter) {
        await transporter.sendMail(mailOptions)
        console.log("✅ [ENQUIRY] Email sent successfully to", adminEmail)
      } else {
        console.warn("⚠️  [ENQUIRY] Email not sent - SMTP not configured")
      }
      
      res.json({
        success: true,
        message: "Enquiry submitted successfully. We will contact you soon.",
        ticketId: supportRequest?._id,
      })
    } catch (emailError) {
      console.error("❌ [ENQUIRY] Error sending email:", emailError)
      
      // Still return success if email fails (enquiry is logged)
      // In production, you might want to store enquiries in database
      res.json({
        success: true,
        message: "Enquiry submitted successfully. We will contact you soon.",
        ticketId: supportRequest?._id,
        warning: "Email notification may not have been sent. Please check server logs.",
      })
    }
  } catch (error) {
    console.error("Error submitting enquiry:", error)
    res.status(500).json({
      success: false,
      message: "Error submitting enquiry. Please try again.",
    })
  }
})

export default router

