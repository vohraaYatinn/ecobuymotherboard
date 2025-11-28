import mongoose from "mongoose"

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    features: {
      type: [String],
      default: [],
    },
    specifications: {
      productType: { type: String, trim: true },
      compatibility: { type: String, trim: true },
      warranty: { type: String, trim: true },
      condition: {
        type: String,
        enum: ["new", "refurbished", "used"],
        default: "new",
      },
      weight: { type: String, trim: true },
      dimensions: { type: String, trim: true },
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be positive"],
    },
    comparePrice: {
      type: Number,
      min: [0, "Compare price must be positive"],
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    status: {
      type: String,
      enum: ["in-stock", "out-of-stock", "low-stock"],
      default: "in-stock",
    },
    images: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviews: {
      type: Number,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index for search
productSchema.index({ name: "text", sku: "text", brand: "text" })
productSchema.index({ category: 1, status: 1 })
productSchema.index({ createdAt: -1 })

// Virtual for discount percentage
productSchema.virtual("discountPercentage").get(function () {
  if (this.comparePrice && this.comparePrice > this.price) {
    return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100)
  }
  return 0
})

// Method to update stock status based on stock quantity
productSchema.methods.updateStockStatus = function () {
  if (this.stock === 0) {
    this.status = "out-of-stock"
  } else if (this.stock < 10) {
    this.status = "low-stock"
  } else {
    this.status = "in-stock"
  }
}

// Pre-save hook to update stock status
productSchema.pre("save", function (next) {
  this.updateStockStatus()
  next()
})

const Product = mongoose.model("Product", productSchema)

export default Product




