import mongoose from "mongoose"

const otpSessionSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      index: true,
    },
    verificationId: {
      type: String,
      required: true,
      unique: true,
    },
    otp: {
      type: String,
    },
    isNewUser: {
      type: Boolean,
      default: false,
    },
    devMode: {
      type: Boolean,
      default: false,
    },
    devOtp: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index for mobile and verificationId lookup
otpSessionSchema.index({ mobile: 1, verificationId: 1 })

// TTL index for auto-deleting expired sessions
otpSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const OtpSession = mongoose.model("OtpSession", otpSessionSchema)

export default OtpSession

