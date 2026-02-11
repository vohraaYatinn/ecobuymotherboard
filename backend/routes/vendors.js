import express from "express"
import Vendor from "../models/Vendor.js"
import { verifyAdminToken } from "../middleware/auth.js"
import nodemailer from "nodemailer"
import multer from "multer"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Store vendor documents inside the same uploads directory that Express serves
// so that uploaded files are actually accessible via the /uploads route.
// server.js uses: app.use("/uploads", express.static(path.join(__dirname, "uploads")))
// which resolves to `<backend-root>/uploads`. So write to `<backend-root>/uploads/vendor-documents`.
const vendorDocsDir = path.join(__dirname, "..", "uploads/vendor-documents")
const fsPromises = fs.promises

if (!fs.existsSync(vendorDocsDir)) {
  fs.mkdirSync(vendorDocsDir, { recursive: true })
}

const vendorDocStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, vendorDocsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, `vendor-${uniqueSuffix}${ext}`)
  },
})

const ALLOWED_DOC_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".heic",
  ".heif",
]

const vendorDocFileFilter = (req, file, cb) => {
  const mime = file.mimetype || ""
  const ext = path.extname(file.originalname || "").toLowerCase()

  if (mime.startsWith("image/") || mime === "application/pdf") {
    return cb(null, true)
  }
  // Some browsers/OS send application/octet-stream for images or PDFs
  if (mime === "application/octet-stream" && ALLOWED_DOC_EXTENSIONS.includes(ext)) {
    return cb(null, true)
  }
  cb(new Error("Only PDF and image files are allowed for vendor documents"), false)
}

const uploadVendorDocs = multer({
  storage: vendorDocStorage,
  fileFilter: vendorDocFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
})

const mapUploadedDocuments = (files = []) =>
  files.map((file) => ({
    url: `/uploads/vendor-documents/${file.filename}`,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
  }))

const removeVendorDocuments = async (vendor) => {
  if (!vendor?.documents || !Array.isArray(vendor.documents) || vendor.documents.length === 0) {
    return
  }

  for (const doc of vendor.documents) {
    if (!doc?.url) continue

    const sanitizedPath = doc.url.replace(/^\/+/, "")
    const filePath = path.join(__dirname, "..", sanitizedPath)

    try {
      await fsPromises.unlink(filePath)
    } catch (err) {
      if (err.code !== "ENOENT") {
        console.error(`Error removing vendor document ${filePath}:`, err)
      }
    }
  }
}

// Helper function to normalize phone number for consistent storage
const normalizePhoneForStorage = (phone) => {
  if (!phone) return null
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, "")
  // If it starts with country code (91), remove it
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return cleaned.substring(2) // Return last 10 digits
  }
  // Return last 10 digits or original if already 10 digits
  if (cleaned.length >= 10) {
    return cleaned.slice(-10)
  }
  return cleaned.length === 10 ? cleaned : phone // Fallback to original if can't normalize
}

const handleVendorDocsUpload = (req, res, next) => {
  const contentType = req.headers["content-type"] || ""

  if (contentType.includes("multipart/form-data")) {
    return uploadVendorDocs.array("documents", 5)(req, res, (err) => {
      if (err) {
        // Handle multer errors
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
              message: "One or more files are too large. Maximum size is 10MB per file.",
            })
          }
          if (err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({
              success: false,
              message: "Too many files. Maximum 5 files allowed.",
            })
          }
          return res.status(400).json({
            success: false,
            message: err.message || "Error uploading documents",
          })
        }
        // Handle other upload errors (file type, etc.)
        return res.status(400).json({
          success: false,
          message: err.message || "Invalid document upload. Please ensure files are PDF or images and under 10MB each.",
        })
      }
      return next()
    })
  }

  return next()
}

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
      user: process.env.SMTP_USER || process.env.ADMIN_EMAIL || "SUPPORT@ELECOBUY.COM",
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

    // Calculate ordersFulfilled dynamically: delivered orders where return period is over
    const Order = (await import("../models/Order.js")).default
    const RETURN_WINDOW_DAYS = 3
    const now = Date.now()
    const returnWindowMs = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000

    // Get all delivered orders for this vendor
    const deliveredOrders = await Order.find({
      vendorId: vendor._id,
      status: "delivered",
      $or: [
        { returnRequest: { $exists: false } },
        { "returnRequest.type": { $in: [null, "denied"] } },
      ],
    })
      .select("deliveredAt updatedAt")
      .lean()

    // Filter orders where return period is over (using deliveredAt or updatedAt as fallback)
    const fulfilledOrders = deliveredOrders.filter((order) => {
      const deliveryDate = order.deliveredAt 
        ? new Date(order.deliveredAt).getTime()
        : new Date(order.updatedAt).getTime()
      const returnDeadline = deliveryDate + returnWindowMs
      return now > returnDeadline
    }).length

    // Convert vendor to plain object and update ordersFulfilled
    const vendorData = vendor.toObject()
    vendorData.ordersFulfilled = fulfilledOrders

    res.status(200).json({
      success: true,
      data: vendorData,
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
router.post("/", verifyAdminToken, handleVendorDocsUpload, async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      phone,
      status,
      address,
      gstNumber,
      bankAccountNumber,
      ifscCode,
      pan,
      tan,
      referralCode,
    } = req.body

    // Validate required fields
    if (!name || !username || !email || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    if (!gstNumber || !bankAccountNumber || !ifscCode || !pan) {
      return res.status(400).json({
        success: false,
        message: "GST, bank account, IFSC, and PAN are required",
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

    // Normalize phone number for consistent storage
    const normalizedPhone = normalizePhoneForStorage(phone)

    // Create vendor
    const vendor = new Vendor({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      phone: normalizedPhone || phone, // Use normalized or fallback to original
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
      gstNumber,
      bankAccountNumber,
      ifscCode,
      pan,
      tan: tan || "",
      referralCode,
      documents: mapUploadedDocuments(req.files || []),
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
router.put("/:id", verifyAdminToken, handleVendorDocsUpload, async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      phone,
      status,
      address,
      gstNumber,
      bankAccountNumber,
      ifscCode,
      pan,
      tan,
      referralCode,
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
    if (gstNumber) vendor.gstNumber = gstNumber
    if (bankAccountNumber) vendor.bankAccountNumber = bankAccountNumber
    if (ifscCode) vendor.ifscCode = ifscCode
    if (pan) vendor.pan = pan
    if (tan !== undefined) vendor.tan = tan
    if (referralCode !== undefined) vendor.referralCode = referralCode

    const newDocuments = mapUploadedDocuments(req.files || [])
    if (newDocuments.length) {
      vendor.documents = [...(vendor.documents || []), ...newDocuments]
    }

    await vendor.save()

    // Send approval email if status changed to approved
    if (isBeingApproved) {
      try {
        const transporter = getTransporter()
        if (transporter) {
          const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "SUPPORT@ELECOBUY.COM"
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

    await removeVendorDocuments(vendor)
    await Vendor.deleteOne({ _id: vendor._id })

    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
      data: {
        deletedId: vendor._id,
      },
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

// Bulk delete vendors (Admin only) - Hard delete
router.post("/bulk-delete", verifyAdminToken, async (req, res) => {
  try {
    const { vendorIds } = req.body

    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vendor IDs array is required",
      })
    }

    const vendors = await Vendor.find({ _id: { $in: vendorIds } })

    if (!vendors || vendors.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No vendors found for the provided IDs",
      })
    }

    for (const vendor of vendors) {
      await removeVendorDocuments(vendor)
    }

    const deleteResult = await Vendor.deleteMany({ _id: { $in: vendorIds } })

    res.status(200).json({
      success: true,
      message: `Deleted ${deleteResult.deletedCount} vendor(s)`,
      data: {
        deletedCount: deleteResult.deletedCount,
      },
    })
  } catch (error) {
    console.error("Bulk delete vendors error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor IDs provided",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error deleting vendors",
    })
  }
})

// Public vendor registration (no auth required)
router.post("/register", handleVendorDocsUpload, async (req, res) => {
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
      gstNumber,
      bankAccountNumber,
      ifscCode,
      pan,
      tan,
      referralCode,
    } = req.body

    // Validate required fields (gstNumber is optional)
    if (
      !username ||
      !email ||
      !firstName ||
      !lastName ||
      !address1 ||
      !city ||
      !state ||
      !postcode ||
      !storePhone ||
      !bankAccountNumber ||
      !ifscCode ||
      !pan
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      })
    }

    // If GST is provided, validate format (15 alphanumeric chars)
    const gstTrimmed = (gstNumber && typeof gstNumber === "string") ? gstNumber.trim() : ""
    if (gstTrimmed && !/^[0-9A-Z]{15}$/i.test(gstTrimmed)) {
      return res.status(400).json({
        success: false,
        message: "GST should be 15 characters (alphanumeric, uppercase)",
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

    // Normalize phone number for consistent storage
    const normalizedPhone = normalizePhoneForStorage(storePhone)

    // Create vendor with pending status
    const vendor = new Vendor({
      name: `${firstName} ${lastName}`,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      phone: normalizedPhone || storePhone, // Use normalized or fallback to original
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
      gstNumber: gstTrimmed || "",
      bankAccountNumber,
      ifscCode,
      pan,
      tan: tan || "",
      referralCode,
      documents: mapUploadedDocuments(req.files || []),
    })

    await vendor.save()

    console.log("✅ New vendor registration:", vendor._id, vendor.name)

    // Try to automatically link to existing VendorUser if one exists
    try {
      const VendorUser = (await import("../models/VendorUser.js")).default
      const normalizedPhone = normalizePhoneForStorage(vendor.phone)
      
      if (normalizedPhone) {
        // Try to find VendorUser by phone (normalized to 91XXXXXXXXXX format)
        const phoneVariations = [
          `91${normalizedPhone}`, // 917995524585
          normalizedPhone, // 7995524585
        ]
        
        for (const phoneVar of phoneVariations) {
          const vendorUser = await VendorUser.findOne({ mobile: phoneVar })
          if (vendorUser && !vendorUser.vendorId) {
            vendorUser.vendorId = vendor._id
            await vendorUser.save()
            console.log(`✅ [VENDOR REGISTER] Auto-linked VendorUser ${vendorUser._id} to Vendor ${vendor._id} by phone`)
            break
          }
        }
      }
      
      // Also try by email if phone didn't match
      if (vendor.email) {
        const vendorUserByEmail = await VendorUser.findOne({ 
          email: vendor.email.toLowerCase().trim(),
          vendorId: { $exists: false }
        })
        if (vendorUserByEmail) {
          vendorUserByEmail.vendorId = vendor._id
          await vendorUserByEmail.save()
          console.log(`✅ [VENDOR REGISTER] Auto-linked VendorUser ${vendorUserByEmail._id} to Vendor ${vendor._id} by email`)
        }
      }
    } catch (linkError) {
      // Don't fail registration if linking fails - it can be done manually later
      console.error("⚠️ [VENDOR REGISTER] Error auto-linking vendor user:", linkError)
    }

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

    const toCsvValue = (value) => {
      if (value === null || value === undefined) return '""'
      const str = String(value)
      return `"${str.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`
    }

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
      "GST Number",
      "PAN",
      "TAN",
      "Bank Account Number",
      "IFSC Code",
      "Referral Code",
      "Contact First Name",
      "Contact Last Name",
      "Address Line 1",
      "Address Line 2",
      "Total Products",
      "Orders Fulfilled",
      "City",
      "State",
      "Country",
      "Postcode",
      "Documents Count",
      "Joined Date",
    ].join(","))

    // Data rows
    vendors.forEach((vendor) => {
      const address = vendor.address || {}
      csvRows.push([
        toCsvValue(vendor._id?.toString?.() || ""),
        toCsvValue(vendor.name || ""),
        toCsvValue(vendor.username || ""),
        toCsvValue(vendor.email || ""),
        toCsvValue(vendor.phone || ""),
        toCsvValue(vendor.status || ""),
        toCsvValue(vendor.commission ?? 0),
        toCsvValue(vendor.gstNumber || ""),
        toCsvValue(vendor.pan || ""),
        toCsvValue(vendor.tan || ""),
        toCsvValue(vendor.bankAccountNumber || ""),
        toCsvValue(vendor.ifscCode || ""),
        toCsvValue(vendor.referralCode || ""),
        toCsvValue(address.firstName || ""),
        toCsvValue(address.lastName || ""),
        toCsvValue(address.address1 || ""),
        toCsvValue(address.address2 || ""),
        toCsvValue(vendor.totalProducts ?? 0),
        toCsvValue(vendor.ordersFulfilled ?? 0),
        toCsvValue(address.city || ""),
        toCsvValue(address.state || ""),
        toCsvValue(address.country || ""),
        toCsvValue(address.postcode || ""),
        toCsvValue(Array.isArray(vendor.documents) ? vendor.documents.length : 0),
        toCsvValue(vendor.createdAt ? new Date(vendor.createdAt).toISOString().split("T")[0] : ""),
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

// Serve vendor document (Admin only)
router.get("/:vendorId/documents/:documentIndex", verifyAdminToken, async (req, res) => {
  try {
    const { vendorId, documentIndex } = req.params
    const index = parseInt(documentIndex)

    if (isNaN(index) || index < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid document index",
      })
    }

    const vendor = await Vendor.findById(vendorId)

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      })
    }

    if (!vendor.documents || !Array.isArray(vendor.documents) || index >= vendor.documents.length) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      })
    }

    const document = vendor.documents[index]

    // Extract file path from stored URL (e.g. /uploads/vendor-documents/vendor-123456.pdf)
    let filePath
    if (document.url.startsWith("/uploads/")) {
      filePath = path.join(__dirname, "..", document.url)
    } else if (document.url.startsWith("uploads/")) {
      filePath = path.join(__dirname, "..", document.url)
    } else {
      // If it's a full URL, try to extract the path
      const urlPath = document.url.replace(/^https?:\/\/[^\/]+/, "")
      filePath = path.join(__dirname, "..", urlPath.startsWith("/") ? urlPath : `/${urlPath}`)
    }

    // Check if file exists – support legacy path where files were accidentally saved under routes/uploads
    if (!fs.existsSync(filePath)) {
      const legacyFilePath = path.join(__dirname, "uploads/vendor-documents", path.basename(filePath))
      if (fs.existsSync(legacyFilePath)) {
        filePath = legacyFilePath
      } else {
        return res.status(404).json({
          success: false,
          message: "Document file not found on server",
        })
      }
    }

    // Determine content type
    const contentType = document.mimetype || "application/octet-stream"
    
    // Check if this is a download request
    const isDownload = req.query.download === "true"
    
    // Set response headers
    const filename = document.originalName || path.basename(filePath)
    res.setHeader("Content-Type", contentType)
    res.setHeader(
      "Content-Disposition", 
      isDownload ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`
    )
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)
    
    fileStream.on("error", (error) => {
      console.error("Error streaming document:", error)
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Error reading document file",
        })
      }
    })
  } catch (error) {
    console.error("Serve vendor document error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      })
    }
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Error serving document",
      })
    }
  }
})

export default router




