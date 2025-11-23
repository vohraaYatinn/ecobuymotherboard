import mongoose from "mongoose"

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
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
})

const cartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    sessionId: {
      type: String,
      index: true,
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
  }
)

// Sparse unique index for customerId - only indexes non-null values
// This allows multiple carts with null customerId (guest carts)
cartSchema.index({ customerId: 1 }, { unique: true, sparse: true })
// Index for sessionId lookup
cartSchema.index({ sessionId: 1 })

const Cart = mongoose.model("Cart", cartSchema)

export default Cart
