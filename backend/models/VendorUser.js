import mongoose from "mongoose"

const vendorUserSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
    sessionId: {
      type: String,
      default: null,
      trim: true,
    },
    pushTokens: [
      {
        token: {
          type: String,
          required: true,
          trim: true,
        },
        platform: {
          type: String,
          enum: ["android", "ios", "web", "unknown"],
          default: "unknown",
        },
        deviceModel: {
          type: String,
          default: "Unknown Device",
        },
        appVersion: {
          type: String,
          default: "0.0.0",
        },
        lastSeenAt: {
          type: Date,
          default: Date.now,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
)

// Index for mobile search
vendorUserSchema.index({ mobile: 1 })

const VendorUser = mongoose.model("VendorUser", vendorUserSchema)

export default VendorUser

