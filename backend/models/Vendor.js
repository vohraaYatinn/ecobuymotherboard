import mongoose from "mongoose"

const vendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },
    address: {
      firstName: {
        type: String,
        required: [true, "First name is required"],
        trim: true,
      },
      lastName: {
        type: String,
        required: [true, "Last name is required"],
        trim: true,
      },
      address1: {
        type: String,
        required: [true, "Address line 1 is required"],
        trim: true,
      },
      address2: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
      },
      state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
      },
      postcode: {
        type: String,
        required: [true, "Postcode is required"],
        trim: true,
      },
      country: {
        type: String,
        required: [true, "Country is required"],
        default: "india",
        trim: true,
      },
    },
    totalProducts: {
      type: Number,
      default: 0,
      min: 0,
    },
    ordersFulfilled: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Index for search
vendorSchema.index({ name: "text", email: "text", phone: "text", username: "text" })
vendorSchema.index({ status: 1 })
vendorSchema.index({ createdAt: -1 })

// Virtual for full address
vendorSchema.virtual("fullAddress").get(function () {
  const addr = this.address
  const parts = [
    addr.address1,
    addr.address2,
    addr.city,
    addr.state,
    addr.postcode,
    addr.country,
  ].filter(Boolean)
  return parts.join(", ")
})

const Vendor = mongoose.model("Vendor", vendorSchema)

export default Vendor

