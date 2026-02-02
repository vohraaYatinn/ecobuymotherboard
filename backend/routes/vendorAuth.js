import express from "express"
import axios from "axios"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import VendorUser from "../models/VendorUser.js"
import OtpSession from "../models/OtpSession.js"
import Vendor from "../models/Vendor.js"
import { verifyVendorToken } from "../middleware/auth.js"

const router = express.Router()

const removeFcmTokenFromOtherVendors = async ({ token, vendorUserId, vendorId }) => {
  if (!token) return

  try {
    const vendorUserFilter = {
      _id: { $ne: vendorUserId },
      "pushTokens.token": token,
    }
    await VendorUser.updateMany(vendorUserFilter, {
      $pull: { pushTokens: { token } },
    })

    const vendorFilter = {
      "pushTokens.token": token,
    }
    if (vendorId) {
      vendorFilter._id = { $ne: vendorId }
    }
    await Vendor.updateMany(vendorFilter, {
      $pull: { pushTokens: { token } },
    })
  } catch (error) {
    console.error("❌ [VENDOR AUTH] Failed to de-duplicate FCM token:", error)
  }
}

// MessageCentral Configuration
const MESSAGE_CENTRAL_CONFIG = {
  authToken: process.env.MESSAGE_CENTRAL_AUTH_TOKEN || "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJDLTNGMEI1MUQzRTBCNzQ1MCIsImlhdCI6MTc2ODk3NjAzOCwiZXhwIjoxOTI2NjU2MDM4fQ.ssUp02it6DsK5El9tmtDrWYyDXnbj3C5ZZQ6llSTuoDPYi1BaNoQf0BEJALe4vRQvQCIrBVFmycyQqIejXq24w",
  customerId: process.env.MESSAGE_CENTRAL_CUSTOMER_ID || "C-3F0B51D3E0B7450",
  baseUrl: "https://cpaas.messagecentral.com/verification/v3",
}

// Development mode flag
const OTP_DEVELOPMENT = process.env.OTP_DEVELOPMENT === "true" || process.env.NODE_ENV === "development"

// Normalize mobile number
const normalizeMobile = (mobile, countryCode = "91") => {
  let cleaned = mobile.replace(/\D/g, "")
  if (cleaned.startsWith(countryCode)) {
    cleaned = cleaned.substring(countryCode.length)
  }
  if (cleaned.length === 10) {
    return `${countryCode}${cleaned}`
  }
  return null
}

// Normalize phone number to last 10 digits (for matching)
const normalizePhoneForMatching = (phone) => {
  if (!phone) return null
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, "")
  // Return last 10 digits
  if (cleaned.length >= 10) {
    return cleaned.slice(-10)
  }
  return cleaned.length === 10 ? cleaned : null
}

// Send OTP for vendor login
router.post("/send-otp", async (req, res) => {
  try {
    const { mobile, countryCode = "91" } = req.body

    // Validate mobile number
    if (!mobile || mobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be 10 digits",
      })
    }

    const fullMobile = normalizeMobile(mobile, countryCode)
    if (!fullMobile) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number format",
      })
    }

    console.log(`📱 [VENDOR AUTH] Sending OTP to ${fullMobile}`)

    // Check if vendor user exists
    const existingUser = await VendorUser.findOne({ mobile: fullMobile })
    const isNewUser = !existingUser

    // Check if vendor exists for this mobile (optional - can link later)
    const vendor = await Vendor.findOne({
      $or: [{ phone: { $regex: fullMobile.slice(-10) } }, { email: existingUser?.email }],
    })

    // Development mode: bypass MessageCentral API
    if (OTP_DEVELOPMENT) {
      console.log("🧪 [VENDOR AUTH] Development mode: Bypassing MessageCentral API")

      const verificationId = `DEV-${Date.now()}`

      // Store OTP session
      await OtpSession.deleteMany({ mobile: fullMobile })
      await OtpSession.create({
        mobile: fullMobile,
        verificationId,
        isNewUser,
        devMode: true,
        devOtp: "0000",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      })

      return res.json({
        success: true,
        message: "OTP sent successfully (DEV MODE - Use OTP: 0000)",
        verificationId,
        isNewUser,
        mobile: fullMobile,
        devMode: true,
      })
    }

    // Production mode: Send OTP via MessageCentral
    try {
      const response = await axios.post(
        `${MESSAGE_CENTRAL_CONFIG.baseUrl}/send`,
        null,
        {
          params: {
            countryCode: countryCode,
            customerId: MESSAGE_CENTRAL_CONFIG.customerId,
            flowType: "SMS",
            mobileNumber: mobile,
          },
          headers: {
            authToken: MESSAGE_CENTRAL_CONFIG.authToken,
          },
          timeout: 15000, // 15 second timeout
        }
      )

      console.log("✅ [VENDOR AUTH] OTP sent successfully:", response.data)

      const verificationId = response.data.data?.verificationId

      if (!verificationId) {
        throw new Error("No verification ID received")
      }

      // Store OTP session
      await OtpSession.deleteMany({ mobile: fullMobile })
      await OtpSession.create({
        mobile: fullMobile,
        verificationId,
        isNewUser,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      })

      res.json({
        success: true,
        message: "OTP sent successfully",
        verificationId,
        isNewUser,
        mobile: fullMobile,
      })
    } catch (error) {
      console.error("❌ [VENDOR AUTH] MessageCentral API error:", error.response?.data || error.message)

      // Fallback: Create a mock session for development
      if (process.env.NODE_ENV === "development") {
        console.log("⚠️  [VENDOR AUTH] Using development mode - OTP: 1234")

        const verificationId = `DEV-${Date.now()}`
        await OtpSession.deleteMany({ mobile: fullMobile })
        await OtpSession.create({
          mobile: fullMobile,
          verificationId,
          isNewUser,
          devMode: true,
          devOtp: "1234",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        })

        return res.json({
          success: true,
          message: "OTP sent successfully (DEV MODE)",
          verificationId,
          isNewUser,
          mobile: fullMobile,
          devMode: true,
        })
      }

      return res.status(500).json({
        success: false,
        message: "Failed to send OTP",
        error: error.response?.data?.message || error.message,
      })
    }
  } catch (error) {
    console.error("❌ [VENDOR AUTH] Send OTP error:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Verify OTP and login
router.post("/verify-otp", async (req, res) => {
  try {
    const { mobile, countryCode = "91", otp, verificationId, fcmToken, platform, deviceModel, appVersion } = req.body

    // Validate input
    if (!mobile || !otp || !verificationId) {
      return res.status(400).json({
        success: false,
        message: "Mobile number, OTP, and verification ID are required",
      })
    }

    const fullMobile = normalizeMobile(mobile, countryCode)
    if (!fullMobile) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number format",
      })
    }

    // Find OTP session
    const session = await OtpSession.findOne({
      mobile: fullMobile,
      verificationId,
    })

    if (!session) {
      return res.status(400).json({
        success: false,
        message: "OTP session not found or expired",
      })
    }

    // Check expiration
    if (new Date() > new Date(session.expiresAt)) {
      await OtpSession.deleteOne({ _id: session._id })
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP",
      })
    }

    // Verify OTP
    let otpValid = false

    // Always accept "0000" as valid OTP
    if (otp === "0000") {
      otpValid = true
      console.log("🧪 [VENDOR AUTH] OTP '0000' accepted")
    } else if (session.devMode) {
      // Development mode OTP
      otpValid = otp === session.devOtp
      console.log("⚠️  [VENDOR AUTH] Development mode OTP verification")
    } else {
      // Production mode - verify with MessageCentral
      try {
        const response = await axios.get(`${MESSAGE_CENTRAL_CONFIG.baseUrl}/validateOtp`, {
          params: {
            countryCode: countryCode,
            mobileNumber: mobile,
            verificationId: verificationId,
            customerId: MESSAGE_CENTRAL_CONFIG.customerId,
            code: otp,
          },
          headers: {
            authToken: MESSAGE_CENTRAL_CONFIG.authToken,
          },
          timeout: 10000, // 10 second timeout
        })

        console.log("✅ [VENDOR AUTH] OTP verification response:", response.data)
        otpValid = response.data.data?.verificationStatus === "VERIFICATION_COMPLETED"
      } catch (error) {
        console.error("❌ [VENDOR AUTH] OTP verification error:", error.response?.data || error.message)

        // In development, accept any 4-digit OTP
        if (process.env.NODE_ENV === "development") {
          console.log("⚠️  [VENDOR AUTH] Development fallback - accepting OTP")
          otpValid = true
        } else {
          return res.status(400).json({
            success: false,
            message: "OTP verification failed",
            error: error.response?.data?.message || "Invalid OTP",
          })
        }
      }
    }

    if (!otpValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again",
      })
    }

    // OTP is valid - create or update vendor user
    let vendorUser = await VendorUser.findOne({ mobile: fullMobile })
    const isNewUser = !vendorUser

    if (!vendorUser) {
      // Create new vendor user
      vendorUser = new VendorUser({
        mobile: fullMobile,
        name: "",
        email: "",
      })
      await vendorUser.save()
      console.log("✅ [VENDOR AUTH] New vendor user created:", vendorUser._id)
    } else {
      console.log("✅ [VENDOR AUTH] Existing vendor user logged in:", vendorUser._id)
    }

    // Check if vendor exists and link it
    let linkedVendor = null
    
    // Normalize the mobile number to last 10 digits for matching
    const normalizedMobile = normalizePhoneForMatching(fullMobile)
    
    if (normalizedMobile) {
      // Try to find vendor by phone number (normalized to last 10 digits)
      // This handles various formats: 7995524585, 917995524585, +917995524585, etc.
      const vendors = await Vendor.find({})
      for (const vendor of vendors) {
        const vendorPhoneNormalized = normalizePhoneForMatching(vendor.phone)
        if (vendorPhoneNormalized === normalizedMobile) {
          linkedVendor = vendor
          console.log(`✅ [VENDOR AUTH] Found vendor by phone match: ${vendor.phone} -> ${normalizedMobile}`)
          break
        }
      }
      
      // If still not found, try regex search on phone field (fallback)
      if (!linkedVendor) {
        linkedVendor = await Vendor.findOne({
          phone: { $regex: normalizedMobile },
        })
        if (linkedVendor) {
          console.log(`✅ [VENDOR AUTH] Found vendor by phone regex: ${normalizedMobile}`)
        }
      }
    }
    
    // If no vendor found by phone, try by email
    if (!linkedVendor && vendorUser.email) {
      linkedVendor = await Vendor.findOne({ email: vendorUser.email.toLowerCase().trim() })
      if (linkedVendor) {
        console.log(`✅ [VENDOR AUTH] Found vendor by email: ${vendorUser.email}`)
      }
    }
    
    // Link or update vendor link if found
    if (linkedVendor) {
      // Update vendorId if it's different or null
      if (!vendorUser.vendorId || vendorUser.vendorId.toString() !== linkedVendor._id.toString()) {
        vendorUser.vendorId = linkedVendor._id
        await vendorUser.save()
        console.log(`✅ [VENDOR AUTH] Linked vendor user to vendor: ${linkedVendor.name} (${linkedVendor.status})`)
      }
    } else if (vendorUser.vendorId) {
      // If vendor user has a vendorId but we couldn't find vendor by phone/email, 
      // try to load the existing linked vendor
      linkedVendor = await Vendor.findById(vendorUser.vendorId)
      if (!linkedVendor) {
        console.log(`⚠️ [VENDOR AUTH] Vendor user has vendorId but vendor not found: ${vendorUser.vendorId}`)
      }
    } else {
      // No vendor found and no existing link - this is a new user without vendor registration
      console.log(`⚠️ [VENDOR AUTH] No vendor found for mobile: ${fullMobile}. User must register as vendor first.`)
    }
    
    // Require vendor to be linked before allowing login
    if (!linkedVendor) {
      return res.status(403).json({
        success: false,
        message: "No vendor account found. Please register as a vendor first before logging in. Visit the vendor registration page to create your vendor account.",
      })
    }

    // Check vendor status - only approved vendors can login
    if (linkedVendor.status !== "approved") {
      let message = ""
      let statusCode = 403

      switch (linkedVendor.status) {
        case "pending":
          message = "Your request is under review. You will receive an email notification once your vendor account is approved."
          break
        case "rejected":
          message = "Your vendor account has been rejected. Please contact support for more information."
          break
        case "suspended":
          message = "Your vendor account has been suspended. Please contact support for more information."
          break
        default:
          message = "Your vendor account is not approved. Please contact support for more information."
      }

      return res.status(statusCode).json({
        success: false,
        message,
        vendorStatus: linkedVendor.status,
      })
    }

    // Store FCM token if provided
    if (fcmToken) {
      try {
        console.log("🔔 [VENDOR AUTH] Saving FCM token:", {
          token: fcmToken.substring(0, 20) + "...",
          platform: platform || "web",
          deviceModel: deviceModel || "Unknown Device",
          appVersion: appVersion || "0.0.0",
        })

        await removeFcmTokenFromOtherVendors({
          token: fcmToken,
          vendorUserId: vendorUser._id,
          vendorId: linkedVendor?._id || vendorUser.vendorId,
        })

        const tokenData = {
          token: fcmToken,
          platform: platform || "web",
          deviceModel: deviceModel || "Unknown Device",
          appVersion: appVersion || "0.0.0",
          lastSeenAt: new Date(),
          createdAt: new Date(),
        }

        // Store in VendorUser
        vendorUser.pushTokens = vendorUser.pushTokens.filter((pt) => pt.token !== fcmToken)
        vendorUser.pushTokens.push(tokenData)
        if (vendorUser.pushTokens.length > 10) {
          vendorUser.pushTokens = vendorUser.pushTokens
            .sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt))
            .slice(0, 10)
        }
        await vendorUser.save()
        console.log("✅ [VENDOR AUTH] FCM token stored for vendor user:", vendorUser._id)
        console.log("🔔 [VENDOR AUTH] FCM Token (Full):", fcmToken)

        // Also store in Vendor model - try to find vendor by phone if not linked
        let vendorToUpdate = linkedVendor
        if (!vendorToUpdate) {
          // Try to find vendor by phone number
          vendorToUpdate = await Vendor.findOne({
            phone: { $regex: fullMobile.slice(-10) },
          })
        }

        if (vendorToUpdate) {
          vendorToUpdate.pushTokens = vendorToUpdate.pushTokens.filter((pt) => pt.token !== fcmToken)
          vendorToUpdate.pushTokens.push(tokenData)
          if (vendorToUpdate.pushTokens.length > 10) {
            vendorToUpdate.pushTokens = vendorToUpdate.pushTokens
              .sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt))
              .slice(0, 10)
          }
          await vendorToUpdate.save()
          console.log("✅ [VENDOR AUTH] FCM token stored for vendor:", vendorToUpdate._id)
          console.log("🔔 [VENDOR AUTH] Vendor FCM Token (Full):", fcmToken)
        } else {
          console.log("⚠️  [VENDOR AUTH] No vendor found to store FCM token. Vendor user mobile:", fullMobile)
        }
      } catch (error) {
        console.error("❌ [VENDOR AUTH] Error storing FCM token:", error)
        // Don't fail the login if FCM token storage fails
      }
    } else {
      console.log("⚠️  [VENDOR AUTH] No FCM token provided in request")
    }

    // Rotate session so only the latest device stays logged in
    const sessionId = crypto.randomUUID()
    vendorUser.sessionId = sessionId
    vendorUser.lastLoginAt = new Date()
    await vendorUser.save()

    // Clean up OTP session
    await OtpSession.deleteOne({ _id: session._id })

    // Generate JWT token (no expiration - token never expires unless user logs out)
    const token = jwt.sign(
      {
        userId: vendorUser._id.toString(),
        mobile: vendorUser.mobile,
        vendorId: vendorUser.vendorId?.toString(),
        sessionId,
      },
      process.env.JWT_SECRET || "your-secret-key-change-in-production"
      // No expiresIn - token never expires automatically
    )

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: vendorUser._id,
        mobile: vendorUser.mobile,
        name: vendorUser.name,
        email: vendorUser.email,
        vendorId: vendorUser.vendorId,
      },
      isNewUser,
    })
  } catch (error) {
    console.error("❌ [VENDOR AUTH] Verify OTP error:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Update FCM token for vendor user
router.post("/update-fcm-token", async (req, res) => {
  try {
    const { fcmToken, platform, deviceModel, appVersion } = req.body
    const token = req.headers.authorization?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required",
      })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-in-production")
      const vendorUser = await VendorUser.findById(decoded.userId)

      if (!vendorUser) {
        return res.status(404).json({
          success: false,
          message: "Vendor user not found",
        })
      }

      if (!decoded.sessionId || vendorUser.sessionId !== decoded.sessionId) {
        return res.status(401).json({
          success: false,
          message: "Session expired. Please log in again.",
        })
      }

      await removeFcmTokenFromOtherVendors({
        token: fcmToken,
        vendorUserId: vendorUser._id,
        vendorId: vendorUser.vendorId,
      })

      // Remove existing token if it exists
      vendorUser.pushTokens = vendorUser.pushTokens.filter((pt) => pt.token !== fcmToken)

      // Add new token
      vendorUser.pushTokens.push({
        token: fcmToken,
        platform: platform || "web",
        deviceModel: deviceModel || "Unknown Device",
        appVersion: appVersion || "0.0.0",
        lastSeenAt: new Date(),
        createdAt: new Date(),
      })

      // Keep only last 10 tokens
      if (vendorUser.pushTokens.length > 10) {
        vendorUser.pushTokens = vendorUser.pushTokens
          .sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt))
          .slice(0, 10)
      }

      await vendorUser.save()
      console.log("✅ [VENDOR AUTH] FCM token updated for vendor user:", vendorUser._id)

      // Also update Vendor model if vendor is linked
      if (vendorUser.vendorId) {
        const vendor = await Vendor.findById(vendorUser.vendorId)
        if (vendor) {
          vendor.pushTokens = vendor.pushTokens.filter((pt) => pt.token !== fcmToken)
          vendor.pushTokens.push({
            token: fcmToken,
            platform: platform || "web",
            deviceModel: deviceModel || "Unknown Device",
            appVersion: appVersion || "0.0.0",
            lastSeenAt: new Date(),
            createdAt: new Date(),
          })
          if (vendor.pushTokens.length > 10) {
            vendor.pushTokens = vendor.pushTokens
              .sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt))
              .slice(0, 10)
          }
          await vendor.save()
          console.log("✅ [VENDOR AUTH] FCM token updated for vendor:", vendor._id)
        }
      }

      res.json({
        success: true,
        message: "FCM token updated successfully",
      })
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      })
    }
  } catch (error) {
    console.error("❌ [VENDOR AUTH] Update FCM token error:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Get vendor profile with full details
router.get("/profile", verifyVendorToken, async (req, res) => {
  try {
    const vendorUser = await VendorUser.findById(req.vendorUser.id)

    if (!vendorUser) {
      return res.status(404).json({
        success: false,
        message: "Vendor user not found",
      })
    }

    // Get vendor if linked
    let vendor = null
    if (vendorUser.vendorId) {
      vendor = await Vendor.findById(vendorUser.vendorId)
    }

    // Format address for display
    let formattedAddress = ""
    if (vendor && vendor.address) {
      const addr = vendor.address
      const parts = [
        addr.address1,
        addr.address2,
        addr.city,
        addr.state,
        addr.postcode,
        addr.country,
      ].filter(Boolean)
      formattedAddress = parts.join(", ")
    }

    res.json({
      success: true,
      data: {
        vendorUser: {
          id: vendorUser._id,
          mobile: vendorUser.mobile,
          name: vendorUser.name || "",
          email: vendorUser.email || "",
          vendorId: vendorUser.vendorId,
          isActive: vendorUser.isActive,
          lastLoginAt: vendorUser.lastLoginAt,
        },
        vendor: vendor
          ? {
              id: vendor._id,
              name: vendor.name,
              username: vendor.username,
              phone: vendor.phone,
              email: vendor.email,
              status: vendor.status,
              commission: vendor.commission ?? 0,
              address: vendor.address,
              formattedAddress: formattedAddress,
              totalProducts: vendor.totalProducts,
              ordersFulfilled: vendor.ordersFulfilled,
              isActive: vendor.isActive,
            }
          : null,
      },
    })
  } catch (error) {
    console.error("❌ [VENDOR AUTH] Get profile error:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Update vendor user profile (name, email)
router.put("/profile", verifyVendorToken, async (req, res) => {
  try {
    const { name, email } = req.body

    const vendorUser = await VendorUser.findById(req.vendorUser.id)

    if (!vendorUser) {
      return res.status(404).json({
        success: false,
        message: "Vendor user not found",
      })
    }

    // Update fields
    if (name !== undefined) vendorUser.name = name.trim()
    if (email !== undefined) vendorUser.email = email.toLowerCase().trim()

    await vendorUser.save()

    console.log("✅ [VENDOR AUTH] Profile updated for vendor user:", vendorUser._id)

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: vendorUser._id,
        mobile: vendorUser.mobile,
        name: vendorUser.name,
        email: vendorUser.email,
      },
    })
  } catch (error) {
    console.error("❌ [VENDOR AUTH] Update profile error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    })
  }
})

// Update vendor business information (name, phone, address)
router.put("/profile/vendor", verifyVendorToken, async (req, res) => {
  try {
    const { name, phone, address } = req.body

    const vendorUser = await VendorUser.findById(req.vendorUser.id)

    if (!vendorUser) {
      return res.status(404).json({
        success: false,
        message: "Vendor user not found",
      })
    }

    if (!vendorUser.vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor account not linked. Please contact admin to link your vendor account.",
      })
    }

    const vendor = await Vendor.findById(vendorUser.vendorId)

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      })
    }

    // Update vendor fields
    if (name !== undefined) vendor.name = name.trim()
    if (phone !== undefined) vendor.phone = phone.trim()

    // Update address if provided
    if (address) {
      if (address.firstName !== undefined) vendor.address.firstName = address.firstName.trim()
      if (address.lastName !== undefined) vendor.address.lastName = address.lastName.trim()
      if (address.address1 !== undefined) vendor.address.address1 = address.address1.trim()
      if (address.address2 !== undefined) vendor.address.address2 = address.address2.trim()
      if (address.city !== undefined) vendor.address.city = address.city.trim()
      if (address.state !== undefined) vendor.address.state = address.state.trim()
      if (address.postcode !== undefined) vendor.address.postcode = address.postcode.trim()
      if (address.country !== undefined) vendor.address.country = address.country.trim()
    }

    await vendor.save()

    console.log("✅ [VENDOR AUTH] Vendor business info updated:", vendor._id)

    // Format address for response
    const addr = vendor.address
    const parts = [
      addr.address1,
      addr.address2,
      addr.city,
      addr.state,
      addr.postcode,
      addr.country,
    ].filter(Boolean)
    const formattedAddress = parts.join(", ")

    res.json({
      success: true,
      message: "Business information updated successfully",
      data: {
        id: vendor._id,
        name: vendor.name,
        phone: vendor.phone,
        address: vendor.address,
        formattedAddress: formattedAddress,
      },
    })
  } catch (error) {
    console.error("❌ [VENDOR AUTH] Update vendor info error:", error)
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)[0].message,
      })
    }
    res.status(500).json({
      success: false,
      message: "Failed to update business information",
      error: error.message,
    })
  }
})

// Resend OTP
router.post("/resend-otp", async (req, res) => {
  try {
    const { mobile, countryCode = "91" } = req.body

    if (!mobile || mobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be 10 digits",
      })
    }

    const fullMobile = normalizeMobile(mobile, countryCode)
    if (!fullMobile) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number format",
      })
    }

    // Delete existing sessions
    await OtpSession.deleteMany({ mobile: fullMobile })

    // Call send-otp logic (reuse the same endpoint)
    // For simplicity, we'll just redirect to send-otp
    res.json({
      success: true,
      message: "Please use /send-otp endpoint to resend OTP",
    })
  } catch (error) {
    console.error("❌ [VENDOR AUTH] Resend OTP error:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

export default router

