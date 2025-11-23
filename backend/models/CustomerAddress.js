import mongoose from "mongoose"

const customerAddressSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["home", "work", "other"],
      default: "home",
    },
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
    phone: {
      type: String,
      required: [true, "Phone number is required"],
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
      default: "India",
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

// Index for customer lookup
customerAddressSchema.index({ customerId: 1, isDefault: 1 })

const CustomerAddress = mongoose.model("CustomerAddress", customerAddressSchema)

export default CustomerAddress




