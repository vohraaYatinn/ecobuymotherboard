import mongoose from "mongoose"

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
  },
})

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerAddress",
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    shipping: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "online", "wallet"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },
    assignmentMode: {
      type: String,
      enum: ["accepted-by-vendor", "assigned-by-admin"],
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Index for order lookup
orderSchema.index({ customerId: 1, createdAt: -1 })
orderSchema.index({ orderNumber: 1 })
orderSchema.index({ vendorId: 1 })

// Generate order number before saving (fallback if not set)
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    try {
      // Use this.constructor instead of mongoose.model for better reliability
      const count = await this.constructor.countDocuments()
      const timestamp = Date.now()
      const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
      this.orderNumber = `ORD-${timestamp}-${String(count + 1).padStart(6, "0")}-${randomSuffix}`
    } catch (error) {
      // Fallback to timestamp-based if count fails
      this.orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    }
  }
  next()
})

const Order = mongoose.model("Order", orderSchema)

export default Order
