import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userType: {
      type: String,
      enum: ["customer", "admin", "vendor"],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "order_placed",
        "order_accepted",
        "order_processing",
        "order_shipped",
        "order_delivered",
        "order_cancelled",
        "new_order_available",
        "admin_review_required",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    orderNumber: {
      type: String,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

// Compound indexes for efficient queries
notificationSchema.index({ userId: 1, userType: 1, isRead: 1, createdAt: -1 })
notificationSchema.index({ orderId: 1 })

const Notification = mongoose.model("Notification", notificationSchema)

export default Notification



