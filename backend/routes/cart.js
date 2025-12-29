import express from "express"
import Cart from "../models/Cart.js"
import Product from "../models/Product.js"
import jwt from "jsonwebtoken"

const router = express.Router()

// Middleware to get customer ID from token or session
const getCustomerId = (req) => {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-in-production")
      return decoded.userId
    } catch (error) {
      return null
    }
  }
  return null
}

// Get cart
router.get("/", async (req, res) => {
  try {
    const customerId = getCustomerId(req)
    const sessionId = req.headers["x-session-id"]

    let cart = null

    if (customerId) {
      // Find cart by customer ID
      cart = await Cart.findOne({ customerId })
      
      // If customer logged in and has session cart, merge them
      if (sessionId) {
        const sessionCart = await Cart.findOne({ sessionId })
        if (sessionCart && sessionCart.items.length > 0) {
          // Only merge if session cart doesn't belong to this customer (avoid merging own cart)
          if (!sessionCart.customerId || sessionCart.customerId.toString() !== customerId.toString()) {
            needsMerge = true
            // Merge session cart into customer cart
            if (!cart) {
              cart = new Cart({ customerId, items: [] })
            }
            
            for (const sessionItem of sessionCart.items) {
              const existingItemIndex = cart.items.findIndex(
                (item) => item.productId.toString() === sessionItem.productId.toString()
              )
              
              if (existingItemIndex >= 0) {
                // Update quantity
                cart.items[existingItemIndex].quantity += sessionItem.quantity
              } else {
                // Add new item
                cart.items.push({
                  productId: sessionItem.productId,
                  quantity: sessionItem.quantity,
                  price: sessionItem.price,
                })
              }
            }
            
            await cart.save()
            // Delete session cart after successful merge
            await Cart.deleteOne({ _id: sessionCart._id })
          }
        }
      }
      
      // Repopulate cart after merge (or if no merge was needed)
      if (cart) {
        cart = await Cart.findById(cart._id).populate("items.productId", "name brand price images status stock")
      }
    } else if (sessionId) {
      // Find cart by session ID
      cart = await Cart.findOne({ sessionId }).populate("items.productId", "name brand price images status stock")
    }

    if (!cart) {
      return res.json({
        success: true,
        data: { items: [] },
      })
    }

    // Format response
    const items = cart.items.map((item) => ({
      _id: item._id,
      product: {
        _id: item.productId._id,
        name: item.productId.name,
        brand: item.productId.brand,
        price: item.productId.price,
        images: item.productId.images,
      },
      quantity: item.quantity,
      price: item.price,
    }))

    res.json({
      success: true,
      data: { items },
    })
  } catch (error) {
    console.error("Error fetching cart:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Add to cart
router.post("/add", async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body
    const customerId = getCustomerId(req)
    let sessionId = req.headers["x-session-id"]

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      })
    }

    // Get product details
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    if (product.status !== "in-stock" || product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: "Product is out of stock",
      })
    }

    // Find or create cart
    let cart = null
    if (customerId) {
      // For logged-in users, find or create cart by customerId
      cart = await Cart.findOne({ customerId })
      if (!cart) {
        cart = new Cart({ customerId, items: [] })
      }
      
      // If user has a session cart, merge it into customer cart
      if (sessionId) {
        const sessionCart = await Cart.findOne({ sessionId })
        if (sessionCart && sessionCart.items.length > 0) {
          // Only merge if session cart doesn't belong to this customer
          if (!sessionCart.customerId || sessionCart.customerId.toString() !== customerId.toString()) {
            // Merge all session cart items into customer cart
            for (const sessionItem of sessionCart.items) {
              const existingItemIndex = cart.items.findIndex(
                (item) => item.productId.toString() === sessionItem.productId.toString()
              )
              
              if (existingItemIndex >= 0) {
                // Update quantity
                cart.items[existingItemIndex].quantity += sessionItem.quantity
              } else {
                // Add new item
                cart.items.push({
                  productId: sessionItem.productId,
                  quantity: sessionItem.quantity,
                  price: sessionItem.price,
                })
              }
            }
            
            // Delete session cart after merging
            await Cart.deleteOne({ _id: sessionCart._id })
          }
        }
      }
    } else {
      // For guest users, always require sessionId
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
      cart = await Cart.findOne({ sessionId })
      if (!cart) {
        cart = new Cart({ sessionId, customerId: null, items: [] })
      }
    }

    // Check if item already exists
    const existingItemIndex = cart.items.findIndex((item) => item.productId.toString() === productId)

    if (existingItemIndex >= 0) {
      // Update quantity
      cart.items[existingItemIndex].quantity += quantity
    } else {
      // Add new item
      cart.items.push({
        productId,
        quantity,
        price: product.price,
      })
    }

    // Ensure customer ID is set for logged-in users
    if (customerId && !cart.customerId) {
      cart.customerId = customerId
      // Clear sessionId since cart is now associated with customer
      cart.sessionId = undefined
    }

    await cart.save()

    // Return sessionId in response for guest users
    const response = {
      success: true,
      message: "Item added to cart",
      data: cart,
    }
    
    // Include sessionId in response for guest users so frontend can store it
    if (!customerId && cart.sessionId) {
      response.sessionId = cart.sessionId
    }

    res.json(response)
  } catch (error) {
    console.error("Error adding to cart:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Update cart item quantity
router.put("/update", async (req, res) => {
  try {
    const { productId, quantity } = req.body
    const customerId = getCustomerId(req)
    const sessionId = req.headers["x-session-id"]

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Product ID and valid quantity are required",
      })
    }

    // Find cart
    let cart = null
    if (customerId) {
      cart = await Cart.findOne({ customerId })
    } else if (sessionId) {
      cart = await Cart.findOne({ sessionId })
    }

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      })
    }

    // Find and update item
    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId)
    if (itemIndex < 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      })
    }

    // Check stock
    const product = await Product.findById(productId)
    if (!product || product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock",
      })
    }

    cart.items[itemIndex].quantity = quantity
    await cart.save()

    res.json({
      success: true,
      message: "Cart updated",
      data: cart,
    })
  } catch (error) {
    console.error("Error updating cart:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Remove from cart
router.delete("/remove/:productId", async (req, res) => {
  try {
    const { productId } = req.params
    const customerId = getCustomerId(req)
    const sessionId = req.headers["x-session-id"]

    // Find cart
    let cart = null
    if (customerId) {
      cart = await Cart.findOne({ customerId })
    } else if (sessionId) {
      cart = await Cart.findOne({ sessionId })
    }

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      })
    }

    // Remove item
    cart.items = cart.items.filter((item) => item.productId.toString() !== productId)
    await cart.save()

    res.json({
      success: true,
      message: "Item removed from cart",
      data: cart,
    })
  } catch (error) {
    console.error("Error removing from cart:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Clear cart
router.delete("/clear", async (req, res) => {
  try {
    const customerId = getCustomerId(req)
    const sessionId = req.headers["x-session-id"]

    // Find cart
    let cart = null
    if (customerId) {
      cart = await Cart.findOne({ customerId })
    } else if (sessionId) {
      cart = await Cart.findOne({ sessionId })
    }

    if (!cart) {
      return res.json({
        success: true,
        message: "Cart is already empty",
      })
    }

    cart.items = []
    await cart.save()

    res.json({
      success: true,
      message: "Cart cleared",
    })
  } catch (error) {
    console.error("Error clearing cart:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

export default router
