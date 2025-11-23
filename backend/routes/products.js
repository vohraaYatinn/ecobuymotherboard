import express from "express"
import Product from "../models/Product.js"
import { verifyAdminToken } from "../middleware/auth.js"

const router = express.Router()

// Get all products with filters and pagination
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      category = "",
      brand = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query

    // Build filter object
    const filter = {}

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ]
    }

    // Status filter
    if (status && status !== "all") {
      filter.status = status
    }

    // Category filter
    if (category) {
      filter.category = category
    }

    // Brand filter
    if (brand) {
      filter.brand = { $regex: brand, $options: "i" }
    }

    // Only show active products
    filter.isActive = true

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === "asc" ? 1 : -1

    // Get products
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean()

    // Get total count
    const total = await Product.countDocuments(filter)

    res.status(200).json({
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
    console.error("Get products error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching products",
    })
  }
})

// Get single product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    res.status(200).json({
      success: true,
      data: product,
    })
  } catch (error) {
    console.error("Get product error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error fetching product",
    })
  }
})

// Create new product (Admin only)
router.post("/", verifyAdminToken, async (req, res) => {
  try {
    const {
      name,
      sku,
      brand,
      model,
      category,
      description,
      features,
      specifications,
      price,
      comparePrice,
      stock,
      status,
      images,
    } = req.body

    // Validate required fields
    if (!name || !sku || !brand || !category || !description || !price || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku: sku.toUpperCase() })
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists",
      })
    }

    // Parse features if it's a string
    let featuresArray = []
    if (features) {
      if (typeof features === "string") {
        featuresArray = features.split("\n").filter((f) => f.trim())
      } else if (Array.isArray(features)) {
        featuresArray = features
      }
    }

    // Create product
    const product = new Product({
      name,
      sku: sku.toUpperCase(),
      brand,
      model,
      category,
      description,
      features: featuresArray,
      specifications: specifications || {},
      price: parseFloat(price),
      comparePrice: comparePrice ? parseFloat(comparePrice) : undefined,
      stock: parseInt(stock),
      status: status || "in-stock",
      images: images || [],
    })

    await product.save()

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    })
  } catch (error) {
    console.error("Create product error:", error)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists",
      })
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)[0].message,
      })
    }
    res.status(500).json({
      success: false,
      message: "Error creating product",
    })
  }
})

// Update product (Admin only)
router.put("/:id", verifyAdminToken, async (req, res) => {
  try {
    const {
      name,
      sku,
      brand,
      model,
      category,
      description,
      features,
      specifications,
      price,
      comparePrice,
      stock,
      status,
      images,
    } = req.body

    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Check if SKU is being changed and if it already exists
    if (sku && sku.toUpperCase() !== product.sku) {
      const existingProduct = await Product.findOne({ sku: sku.toUpperCase() })
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Product with this SKU already exists",
        })
      }
    }

    // Parse features if it's a string
    let featuresArray = product.features
    if (features !== undefined) {
      if (typeof features === "string") {
        featuresArray = features.split("\n").filter((f) => f.trim())
      } else if (Array.isArray(features)) {
        featuresArray = features
      }
    }

    // Update fields
    if (name) product.name = name
    if (sku) product.sku = sku.toUpperCase()
    if (brand) product.brand = brand
    if (model !== undefined) product.model = model
    if (category) product.category = category
    if (description) product.description = description
    if (featuresArray) product.features = featuresArray
    if (specifications) product.specifications = { ...product.specifications, ...specifications }
    if (price !== undefined) product.price = parseFloat(price)
    if (comparePrice !== undefined) product.comparePrice = comparePrice ? parseFloat(comparePrice) : undefined
    if (stock !== undefined) product.stock = parseInt(stock)
    if (status) product.status = status
    if (images) product.images = images

    await product.save()

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    })
  } catch (error) {
    console.error("Update product error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      })
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists",
      })
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)[0].message,
      })
    }
    res.status(500).json({
      success: false,
      message: "Error updating product",
    })
  }
})

// Delete product (Admin only) - Soft delete
router.delete("/:id", verifyAdminToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Soft delete
    product.isActive = false
    await product.save()

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    })
  } catch (error) {
    console.error("Delete product error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error deleting product",
    })
  }
})

// Get filter options (categories, brands, etc.)
router.get("/filters/options", async (req, res) => {
  try {
    const categories = await Product.distinct("category", { isActive: true })
    const brands = await Product.distinct("brand", { isActive: true })
    const statuses = ["in-stock", "out-of-stock", "low-stock"]

    res.status(200).json({
      success: true,
      data: {
        categories: categories.sort(),
        brands: brands.sort(),
        statuses,
      },
    })
  } catch (error) {
    console.error("Get filter options error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching filter options",
    })
  }
})

export default router




