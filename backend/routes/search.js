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
    
    // Split search query into individual words for better matching
    const searchWords = searchQuery.split(/\s+/).filter(word => word.length > 0)
    
    // Build search conditions: try exact phrase match first, then individual word matches
    // For multi-word queries, match products where ALL words appear somewhere in searchable fields
    const searchConditions = []
    
    // First, try exact phrase match (higher priority)
    searchConditions.push({
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { brand: { $regex: searchQuery, $options: "i" } },
        { sku: { $regex: searchQuery, $options: "i" } },
        { model: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ]
    })
    
    // Then, for multi-word queries, also match products where all words appear
    if (searchWords.length > 1) {
      // Each word must appear in at least one of the searchable fields
      const wordConditions = searchWords.map(word => ({
        $or: [
          { name: { $regex: word, $options: "i" } },
          { brand: { $regex: word, $options: "i" } },
          { sku: { $regex: word, $options: "i" } },
          { model: { $regex: word, $options: "i" } },
          { description: { $regex: word, $options: "i" } },
        ]
      }))
      // All words must match (using $and)
      searchConditions.push({ $and: wordConditions })
    }

    // Search in name, brand, SKU, and description (category is ObjectId, not searchable as string)
    const products = await Product.find({
      $and: [
        { status: "in-stock" }, // Only show in-stock products
        { isActive: true }, // Only show active products
        {
          $or: searchConditions,
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

    // Split search query into individual words for better matching
    const searchWords = searchQuery.split(/\s+/).filter(word => word.length > 0)
    
    // Build search conditions: try exact phrase match first, then individual word matches
    // For multi-word queries, match products where ALL words appear somewhere in searchable fields
    const searchConditions = []
    
    // First, try exact phrase match (higher priority)
    searchConditions.push({
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { brand: { $regex: searchQuery, $options: "i" } },
        { sku: { $regex: searchQuery, $options: "i" } },
        { model: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ]
    })
    
    // Then, for multi-word queries, also match products where all words appear
    if (searchWords.length > 1) {
      // Each word must appear in at least one of the searchable fields
      const wordConditions = searchWords.map(word => ({
        $or: [
          { name: { $regex: word, $options: "i" } },
          { brand: { $regex: word, $options: "i" } },
          { sku: { $regex: word, $options: "i" } },
          { model: { $regex: word, $options: "i" } },
          { description: { $regex: word, $options: "i" } },
        ]
      }))
      // All words must match (using $and)
      searchConditions.push({ $and: wordConditions })
    }

    // Search in name, brand, SKU, and description (category is ObjectId, not searchable as string)
    const query = {
      $and: [
        { status: "in-stock" },
        { isActive: true }, // Only show active products
        {
          $or: searchConditions,
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




