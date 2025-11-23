import express from "express"
import Product from "../models/Product.js"

const router = express.Router()

// Search products with autocomplete
router.get("/suggestions", async (req, res) => {
  try {
    const { q, limit = 10 } = req.query

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: [],
      })
    }

    const searchQuery = q.trim()

    // Search in name, brand, SKU, and category
    const products = await Product.find({
      $and: [
        { status: "in-stock" }, // Only show in-stock products
        {
          $or: [
            { name: { $regex: searchQuery, $options: "i" } },
            { brand: { $regex: searchQuery, $options: "i" } },
            { sku: { $regex: searchQuery, $options: "i" } },
            { category: { $regex: searchQuery, $options: "i" } },
            { description: { $regex: searchQuery, $options: "i" } },
          ],
        },
      ],
    })
      .select("name brand price images sku category")
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: products,
    })
  } catch (error) {
    console.error("Error searching products:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Full search (for search results page)
router.get("/", async (req, res) => {
  try {
    const { q, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc" } = req.query

    if (!q || q.trim().length < 1) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      })
    }

    const searchQuery = q.trim()
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Search in name, brand, SKU, category, and description
    const query = {
      $and: [
        { status: "in-stock" },
        {
          $or: [
            { name: { $regex: searchQuery, $options: "i" } },
            { brand: { $regex: searchQuery, $options: "i" } },
            { sku: { $regex: searchQuery, $options: "i" } },
            { category: { $regex: searchQuery, $options: "i" } },
            { description: { $regex: searchQuery, $options: "i" } },
          ],
        },
      ],
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .select("name brand price images sku category rating reviews stock")
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(query),
    ])

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    console.error("Error searching products:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

export default router




