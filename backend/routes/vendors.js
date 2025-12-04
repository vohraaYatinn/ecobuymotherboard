import express from "express"
import Vendor from "../models/Vendor.js"
import { verifyAdminToken } from "../middleware/auth.js"
import nodemailer from "nodemailer"
import vendorUpload from "../middleware/vendorUpload.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Configure nodemailer transporter
const getTransporter = () => {
  // If SMTP credentials are not provided, return null (email won't be sent but vendor will still be updated)
  if (!process.env.SMTP_USER && !process.env.ADMIN_EMAIL) {
    console.warn("⚠️  [VENDOR] SMTP credentials not configured. Vendor approval emails will not be sent.")
    return null
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || process.env.ADMIN_EMAIL || "info@elecobuy.com",
      pass: process.env.SMTP_PASS || process.env.ADMIN_EMAIL_PASSWORD,
    },
  })

  return transporter
}

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

    // Track if status is changing to approved
    const previousStatus = vendor.status
    const isBeingApproved = status === "approved" && previousStatus !== "approved"

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
    // Update new fields
    if (req.body.gstNo !== undefined) vendor.gstNo = req.body.gstNo || undefined
    if (req.body.bankAccountNumber !== undefined) vendor.bankAccountNumber = req.body.bankAccountNumber || undefined
    if (req.body.ifscCode !== undefined) vendor.ifscCode = req.body.ifscCode || undefined
    if (req.body.pan !== undefined) vendor.pan = req.body.pan || undefined
    if (req.body.tan !== undefined) vendor.tan = req.body.tan || undefined
    if (req.body.referral !== undefined) vendor.referral = req.body.referral || undefined

    await vendor.save()

    // Send approval email if status changed to approved
    if (isBeingApproved) {
      try {
        const transporter = getTransporter()
        if (transporter) {
          const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "info@elecobuy.com"
          const vendorEmail = vendor.email
          const vendorName = vendor.name || `${vendor.address.firstName} ${vendor.address.lastName}`

          const mailOptions = {
            from: process.env.SMTP_USER || adminEmail,
            to: vendorEmail,
            subject: "🎉 Your Vendor Account Has Been Approved!",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Vendor Account Approved</title>
              </head>
              <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Congratulations!</h1>
                    <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your Vendor Account Has Been Approved</p>
                  </div>

                  <!-- Content -->
                  <div style="padding: 40px 30px;">
                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Dear ${vendorName},
                    </p>
                    
                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      We are pleased to inform you that your vendor account has been <strong style="color: #10b981;">approved</strong>! You can now start selling on our platform.
                    </p>

                    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 4px;">
                      <h2 style="color: #065f46; font-size: 18px; margin: 0 0 10px 0;">Account Details:</h2>
                      <p style="color: #047857; font-size: 14px; margin: 5px 0;"><strong>Username:</strong> ${vendor.username}</p>
                      <p style="color: #047857; font-size: 14px; margin: 5px 0;"><strong>Email:</strong> ${vendorEmail}</p>
                      <p style="color: #047857; font-size: 14px; margin: 5px 0;"><strong>Status:</strong> Approved ✅</p>
                    </div>

                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                      <strong>What's Next?</strong>
                    </p>
                    <ul style="color: #333333; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0; padding-left: 20px;">
                      <li>Log in to your vendor dashboard</li>
                      <li>Start adding your products</li>
                      <li>Manage your orders and inventory</li>
                      <li>Track your sales and earnings</li>
                    </ul>

                    <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                      If you have any questions or need assistance, please don't hesitate to contact our support team.
                    </p>

                    <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                      Best regards,<br>
                      <strong>The EcoBuy Team</strong>
                    </p>
                  </div>

                  <!-- Footer -->
                  <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                      This is an automated email. Please do not reply to this message.
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          }

          await transporter.sendMail(mailOptions)
          console.log(`✅ [VENDOR] Approval email sent successfully to ${vendorEmail}`)
        } else {
          console.warn("⚠️  [VENDOR] Approval email not sent - SMTP not configured")
        }
      } catch (emailError) {
        console.error("❌ [VENDOR] Error sending approval email:", emailError)
        // Don't fail the request if email fails - vendor is still updated
      }
    }

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

// Public vendor registration (no auth required)
router.post("/register", vendorUpload.array("documents", 10), async (req, res) => {
  try {
    const {
      username,
      email,
      firstName,
      lastName,
      address1,
      address2,
      country,
      city,
      state,
      postcode,
      storePhone,
      gstNo,
      bankAccountNumber,
      ifscCode,
      pan,
      tan,
      referral,
    } = req.body

    // Validate required fields
    if (!username || !email || !firstName || !lastName || !address1 || !city || !state || !postcode || !storePhone) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      })
    }

    // Check if email or username already exists
    const existingVendor = await Vendor.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    })

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: "A vendor with this email or username already exists",
      })
    }

    // Process uploaded documents
    const documents = []
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        documents.push({
          filename: file.filename,
          originalName: file.originalname,
          path: `/uploads/vendor-documents/${file.filename}`,
          uploadedAt: new Date(),
        })
      })
    }

    // Create vendor with pending status
    const vendor = new Vendor({
      name: `${firstName} ${lastName}`,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      phone: storePhone,
      status: "pending",
      address: {
        firstName: firstName,
        lastName: lastName,
        address1: address1,
        address2: address2 || "",
        city: city,
        state: state,
        postcode: postcode,
        country: country || "india",
      },
      gstNo: gstNo || undefined,
      bankAccountNumber: bankAccountNumber || undefined,
      ifscCode: ifscCode || undefined,
      pan: pan || undefined,
      tan: tan || undefined,
      referral: referral || undefined,
      documents: documents,
    })

    await vendor.save()

    console.log("✅ New vendor registration:", vendor._id, vendor.name)

    res.status(201).json({
      success: true,
      message: "Registration submitted successfully! Your application is pending approval.",
      data: {
        id: vendor._id,
        name: vendor.name,
        username: vendor.username,
        email: vendor.email,
        status: vendor.status,
      },
    })
  } catch (error) {
    console.error("Vendor registration error:", error)
    
    // Clean up uploaded files if there's an error
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const filePath = path.join(__dirname, "../uploads/vendor-documents", file.filename)
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }
        } catch (unlinkError) {
          console.error("Error deleting uploaded file:", unlinkError)
        }
      })
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A vendor with this email or username already exists",
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
      message: "Error submitting registration. Please try again.",
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

// Bulk update vendor commissions (Admin only)
router.post("/update-commissions", verifyAdminToken, async (req, res) => {
  try {
    const { vendorIds, commission } = req.body

    // Validate input
    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vendor IDs array is required",
      })
    }

    if (commission === undefined || commission === null || isNaN(commission)) {
      return res.status(400).json({
        success: false,
        message: "Commission value is required and must be a number",
      })
    }

    if (commission < 0 || commission > 100) {
      return res.status(400).json({
        success: false,
        message: "Commission must be between 0 and 100",
      })
    }

    // Update vendors
    const result = await Vendor.updateMany(
      { _id: { $in: vendorIds }, isActive: true },
      { $set: { commission: parseFloat(commission) } }
    )

    res.status(200).json({
      success: true,
      message: `Commission updated for ${result.modifiedCount} vendor(s)`,
      data: {
        updatedCount: result.modifiedCount,
        commission: parseFloat(commission),
      },
    })
  } catch (error) {
    console.error("Update commissions error:", error)
    res.status(500).json({
      success: false,
      message: "Error updating vendor commissions",
    })
  }
})

// Export vendors list as CSV (Admin only)
router.get("/export/csv", verifyAdminToken, async (req, res) => {
  try {
    const { search = "", status = "" } = req.query

    // Build filter object
    const filter = { isActive: true }

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

    // Get all vendors matching filters
    const vendors = await Vendor.find(filter).sort({ createdAt: -1 }).lean()

    // Generate CSV
    const csvRows = []

    // Header
    csvRows.push([
      "Vendor ID",
      "Name",
      "Username",
      "Email",
      "Phone",
      "Status",
      "Commission (%)",
      "Total Products",
      "Orders Fulfilled",
      "City",
      "State",
      "Country",
      "Postcode",
      "Joined Date",
    ].join(","))

    // Data rows
    vendors.forEach((vendor) => {
      const address = vendor.address || {}
      csvRows.push([
        vendor._id.toString(),
        `"${(vendor.name || "").replace(/"/g, '""')}"`,
        `"${(vendor.username || "").replace(/"/g, '""')}"`,
        `"${(vendor.email || "").replace(/"/g, '""')}"`,
        `"${(vendor.phone || "").replace(/"/g, '""')}"`,
        vendor.status || "",
        vendor.commission || 0,
        vendor.totalProducts || 0,
        vendor.ordersFulfilled || 0,
        `"${(address.city || "").replace(/"/g, '""')}"`,
        `"${(address.state || "").replace(/"/g, '""')}"`,
        `"${(address.country || "").replace(/"/g, '""')}"`,
        `"${(address.postcode || "").replace(/"/g, '""')}"`,
        new Date(vendor.createdAt).toISOString().split("T")[0],
      ].join(","))
    })

    const csv = csvRows.join("\n")

    res.setHeader("Content-Type", "text/csv")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="vendors-export-${Date.now()}.csv"`
    )
    res.send(csv)
  } catch (error) {
    console.error("Export vendors error:", error)
    res.status(500).json({
      success: false,
      message: "Error exporting vendors",
    })
  }
})

export default router




