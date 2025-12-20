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
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "admin_review_required", "return_requested", "return_accepted", "return_rejected"],
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
    paymentGateway: {
      type: String,
      default: null,
    },
    paymentTransactionId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },
    paymentMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    inventoryAdjusted: {
      type: Boolean,
      default: false,
    },
    postPaymentNotified: {
      type: Boolean,
      default: false,
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
    // DTDC Tracking fields
    awbNumber: {
      type: String,
      default: null,
    },
    dtdcTrackingData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    trackingLastUpdated: {
      type: Date,
      default: null,
    },
    // GST and Invoice fields
    shippingState: {
      type: String,
      default: null,
    },
    cgst: {
      type: Number,
      default: 0,
    },
    sgst: {
      type: Number,
      default: 0,
    },
    igst: {
      type: Number,
      default: 0,
    },
    invoiceNumber: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },
    // Return request fields
    returnRequest: {
      type: {
        type: String,
        enum: ["pending", "accepted", "denied", "completed", null],
        default: null,
      },
      reason: {
        type: String,
        default: null,
      },
      requestedAt: {
        type: Date,
        default: null,
      },
      reviewedAt: {
        type: Date,
        default: null,
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        default: null,
      },
      adminNotes: {
        type: String,
        default: null,
      },
      refundStatus: {
        type: String,
        enum: ["pending", "processing", "completed", "failed", null],
        default: null,
      },
      refundTransactionId: {
        type: String,
        default: null,
      },
      attachments: {
        type: [
          {
            url: { type: String },
            originalName: { type: String },
            mimeType: { type: String },
            size: { type: Number },
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
        default: [],
      },
    },
    deliveredAt: {
      type: Date,
      default: null,
      index: true,
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
