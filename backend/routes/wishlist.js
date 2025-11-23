import express from "express"
import Wishlist from "../models/Wishlist.js"
import Product from "../models/Product.js"
import jwt from "jsonwebtoken"

const router = express.Router()

// Middleware to verify JWT token
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-in-production")
    req.userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    })
  }
}

// Get all wishlist items
router.get("/", authenticate, async (req, res) => {
  try {
    const wishlistItems = await Wishlist.find({ customerId: req.userId })
      .populate("productId", "name brand price images sku category status stock comparePrice rating reviews")
      .sort({ createdAt: -1 })

    const items = wishlistItems
      .filter((item) => item.productId) // Filter out deleted products
      .map((item) => ({
        _id: item._id,
        product: item.productId,
        addedAt: item.createdAt,
      }))

    res.json({
      success: true,
      data: items,
    })
  } catch (error) {
    console.error("Error fetching wishlist:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Check if product is in wishlist
router.get("/check/:productId", authenticate, async (req, res) => {
  try {
    const { productId } = req.params

    const wishlistItem = await Wishlist.findOne({
      customerId: req.userId,
      productId: productId,
    })

    res.json({
      success: true,
      isFavorite: !!wishlistItem,
    })
  } catch (error) {
    console.error("Error checking wishlist:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Add to wishlist
router.post("/add", authenticate, async (req, res) => {
  try {
    const { productId } = req.body

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      })
    }

    // Check if product exists
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Check if already in wishlist
    const existingItem = await Wishlist.findOne({
      customerId: req.userId,
      productId: productId,
    })

    if (existingItem) {
      return res.json({
        success: true,
        message: "Product already in wishlist",
        data: existingItem,
      })
    }

    // Add to wishlist
    const wishlistItem = new Wishlist({
      customerId: req.userId,
      productId: productId,
    })

    await wishlistItem.save()

    res.json({
      success: true,
      message: "Product added to wishlist",
      data: wishlistItem,
    })
  } catch (error) {
    console.error("Error adding to wishlist:", error)
    if (error.code === 11000) {
      // Duplicate key error
      return res.json({
        success: true,
        message: "Product already in wishlist",
      })
    }
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Remove from wishlist
router.delete("/remove/:productId", authenticate, async (req, res) => {
  try {
    const { productId } = req.params

    const wishlistItem = await Wishlist.findOneAndDelete({
      customerId: req.userId,
      productId: productId,
    })

    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in wishlist",
      })
    }

    res.json({
      success: true,
      message: "Product removed from wishlist",
    })
  } catch (error) {
    console.error("Error removing from wishlist:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Get wishlist count
router.get("/count", authenticate, async (req, res) => {
  try {
    const count = await Wishlist.countDocuments({ customerId: req.userId })

    res.json({
      success: true,
      count,
    })
  } catch (error) {
    console.error("Error getting wishlist count:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

export default router




