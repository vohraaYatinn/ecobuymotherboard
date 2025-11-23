import mongoose from "mongoose"

const wishlistSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Ensure one product per customer (unique combination)
wishlistSchema.index({ customerId: 1, productId: 1 }, { unique: true })

const Wishlist = mongoose.model("Wishlist", wishlistSchema)

export default Wishlist




