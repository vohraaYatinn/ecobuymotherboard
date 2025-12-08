import express from "express"
import axios from "axios"
import jwt from "jsonwebtoken"
import Customer from "../models/Customer.js"
import OtpSession from "../models/OtpSession.js"

const router = express.Router()

// MessageCentral Configuration
const MESSAGE_CENTRAL_CONFIG = {
  authToken: process.env.MESSAGE_CENTRAL_AUTH_TOKEN || "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJDLUYwQkMyRUNBNENGOTQ5QiIsImlhdCI6MTc1MDAwNjAxOSwiZXhwIjoxOTA3Njg2MDE5fQ.hLwCqVSAWYUSXfgUWPc7IFpokBRAt502A82r9QugbeGbqM0D0Ny34mfky5fiiAErqBs0xIVP4NbzS01-WGbs8g",
  customerId: process.env.MESSAGE_CENTRAL_CUSTOMER_ID || "C-F0BC2ECA4CF949B",
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

// Send OTP for customer login/signup
router.post("/send-otp", async (req, res) => {
  try {
    const { mobile, countryCode = "91", name, email } = req.body

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

    console.log(`📱 [CUSTOMER AUTH] Sending OTP to ${fullMobile}`)

    // Check if customer exists
    const existingCustomer = await Customer.findOne({ mobile: fullMobile })
    const isNewUser = !existingCustomer

    // Development mode: bypass MessageCentral API
    if (OTP_DEVELOPMENT) {
      console.log("🧪 [CUSTOMER AUTH] Development mode: Bypassing MessageCentral API")

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

      console.log("✅ [CUSTOMER AUTH] OTP sent successfully:", response.data)

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
      console.error("❌ [CUSTOMER AUTH] MessageCentral API error:", error.response?.data || error.message)

      // Fallback: Create a mock session for development
      if (process.env.NODE_ENV === "development") {
        console.log("⚠️  [CUSTOMER AUTH] Using development mode - OTP: 1234")

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
    console.error("❌ [CUSTOMER AUTH] Send OTP error:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Verify OTP and login/signup
router.post("/verify-otp", async (req, res) => {
  try {
    const { mobile, countryCode = "91", otp, verificationId, fcmToken, platform, deviceModel, appVersion, name, email } = req.body

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
      console.log("🧪 [CUSTOMER AUTH] OTP '0000' accepted")
    } else if (session.devMode) {
      // Development mode OTP
      otpValid = otp === session.devOtp
      console.log("⚠️  [CUSTOMER AUTH] Development mode OTP verification")
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

        console.log("✅ [CUSTOMER AUTH] OTP verification response:", response.data)
        otpValid = response.data.data?.verificationStatus === "VERIFICATION_COMPLETED"
      } catch (error) {
        console.error("❌ [CUSTOMER AUTH] OTP verification error:", error.response?.data || error.message)

        // In development, accept any 4-digit OTP
        if (process.env.NODE_ENV === "development") {
          console.log("⚠️  [CUSTOMER AUTH] Development fallback - accepting OTP")
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

    // OTP is valid - create or update customer
    let customer = await Customer.findOne({ mobile: fullMobile })
    const isNewUser = !customer

    if (!customer) {
      // Create new customer
      customer = new Customer({
        mobile: fullMobile,
        name: name || "",
        email: email || "",
      })
      await customer.save()
      console.log("✅ [CUSTOMER AUTH] New customer created:", customer._id)
    } else {
      // Update existing customer
      if (name) customer.name = name
      if (email) customer.email = email
      customer.lastLoginAt = new Date()
      await customer.save()
      console.log("✅ [CUSTOMER AUTH] Existing customer logged in:", customer._id)
    }

    // Store FCM token if provided
    if (fcmToken) {
      try {
        const tokenData = {
          token: fcmToken,
          platform: platform || "web",
          deviceModel: deviceModel || "Unknown Device",
          appVersion: appVersion || "0.0.0",
          lastSeenAt: new Date(),
          createdAt: new Date(),
        }

        customer.pushTokens = customer.pushTokens.filter((pt) => pt.token !== fcmToken)
        customer.pushTokens.push(tokenData)
        if (customer.pushTokens.length > 10) {
          customer.pushTokens = customer.pushTokens
            .sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt))
            .slice(0, 10)
        }
        await customer.save()
        console.log("✅ [CUSTOMER AUTH] FCM token stored for customer:", customer._id)
      } catch (error) {
        console.error("❌ [CUSTOMER AUTH] Error storing FCM token:", error)
      }
    }

    // Clean up OTP session
    await OtpSession.deleteOne({ _id: session._id })

    // Generate JWT token (no expiration - token never expires unless user logs out)
    const token = jwt.sign(
      {
        userId: customer._id.toString(),
        mobile: customer.mobile,
      },
      process.env.JWT_SECRET || "your-secret-key-change-in-production"
      // No expiresIn - token never expires automatically
    )

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: customer._id,
        mobile: customer.mobile,
        name: customer.name,
        email: customer.email,
      },
      isNewUser,
    })
  } catch (error) {
    console.error("❌ [CUSTOMER AUTH] Verify OTP error:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Get customer profile
router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "")
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-in-production")
    const customer = await Customer.findById(decoded.userId).select("-pushTokens")

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      })
    }

    res.json({
      success: true,
      data: customer,
    })
  } catch (error) {
    console.error("Error fetching customer profile:", error)
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      })
    }
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

export default router
