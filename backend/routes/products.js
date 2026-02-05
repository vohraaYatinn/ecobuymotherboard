import express from "express"
import mongoose from "mongoose"
import Product from "../models/Product.js"
import Category from "../models/Category.js"
import { verifyAdminToken } from "../middleware/auth.js"
import excelUpload from "../middleware/excelUpload.js"
import * as XLSX from "xlsx"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

/** Escape special regex characters in a string for safe use in $regex */
function escapeRegex(str) {
  if (typeof str !== "string") return ""
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Resolve a category value (ObjectId or slug/alias) to an active Category doc
 */
const resolveCategoryDoc = async (categoryValue) => {
  if (!categoryValue) return null

  // Already an ObjectId
  if (mongoose.Types.ObjectId.isValid(categoryValue)) {
    const categoryDoc = await Category.findById(categoryValue)
    if (categoryDoc && categoryDoc.isActive) return categoryDoc
  }

  // Try slug lookups, including legacy aliases
  const slugValue = categoryValue.toString().trim().toLowerCase()
  const reverseMap = {
    "tv-pcb": "television-pcb",
    "tv-motherboard": "television-motherboard",
    "tv-inverter": "television-inverter",
  }
  const candidateSlugs = [slugValue]
  if (reverseMap[slugValue]) candidateSlugs.push(reverseMap[slugValue])

  const categoryDoc = await Category.findOne({
    slug: { $in: candidateSlugs },
    isActive: true,
  })

  return categoryDoc || null
}

// Get all products with filters and pagination
router.get("/", async (req, res) => {
  try {
    const raw = req.query
    const pageNum = Math.max(1, parseInt(raw.page, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(raw.limit, 10) || 10))
    const search = typeof raw.search === "string" ? raw.search.trim() : ""
    const status = typeof raw.status === "string" ? raw.status.trim() : ""
    const category = typeof raw.category === "string" ? raw.category.trim() : ""
    const brand = typeof raw.brand === "string" ? raw.brand.trim() : ""
    const sortBy = raw.sortBy || "createdAt"
    const sortOrder = raw.sortOrder === "asc" ? "asc" : "desc"

    // Build filter object
    const filter = {}

    // Search filter (escape regex so special chars don't break query)
    if (search) {
      const safeSearch = escapeRegex(search)
      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { sku: { $regex: safeSearch, $options: "i" } },
        { brand: { $regex: safeSearch, $options: "i" } },
      ]
    }

    // Status filter: "available" = in-stock or low-stock (for storefront)
    if (status && status !== "all") {
      if (status === "available") {
        filter.status = { $in: ["in-stock", "low-stock"] }
      } else {
        filter.status = status
      }
    }

    // Brand filter (escape regex for exact/safe match)
    if (brand) {
      filter.brand = { $regex: escapeRegex(brand), $options: "i" }
    }

    // Only show active products
    filter.isActive = true

    // Calculate pagination
    const skip = (pageNum - 1) * limitNum

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === "asc" ? 1 : -1

    // Handle category filter - SIMPLEST APPROACH: Query all, filter in memory
    let products = []
    let total = 0
    
    if (category) {
      const categoryDoc = await resolveCategoryDoc(category)
      
      if (categoryDoc) {
        // Get all matching products (no category filter in DB query)
        const baseFilter = { ...filter }
        delete baseFilter.$or
        delete baseFilter.$and
        
        // Get all products matching other filters
        let allProducts = await Product.find(baseFilter).lean()
        if (filter.$or) {
          // Apply search filter in memory
          const searchRegex = new RegExp(filter.$or[0].name.$regex, 'i')
          allProducts = allProducts.filter(p => 
            searchRegex.test(p.name) || 
            searchRegex.test(p.sku) || 
            searchRegex.test(p.brand)
          )
        }
        
        // Filter by category in memory
        const matchingProducts = allProducts.filter(p => {
          if (!p.category) return false
          const catId = p.category.toString ? p.category.toString() : p.category
          const catStr = typeof p.category === 'string' ? p.category : null
          return catId === categoryDoc._id.toString() || 
                 catStr === categoryDoc.slug ||
                 catStr === "tv-pcb" && categoryDoc.slug === "television-pcb" ||
                 catStr === "tv-motherboard" && categoryDoc.slug === "television-motherboard" ||
                 catStr === "tv-inverter" && categoryDoc.slug === "television-inverter"
        })
        
        // Sort
        matchingProducts.sort((a, b) => {
          const aVal = a[sortBy] || new Date(0)
          const bVal = b[sortBy] || new Date(0)
          return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
        })
        
        total = matchingProducts.length
        products = matchingProducts.slice(skip, skip + limitNum)
      } else {
        products = []
        total = 0
      }
    } else {
      // No category - normal query
      products = await Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean()
      
      total = await Product.countDocuments(filter)
    }

    // Collect all category IDs and slugs to fetch in one query
    const categoryIds = []
    const categorySlugs = []
    products.forEach((product) => {
      if (product.category) {
        if (mongoose.Types.ObjectId.isValid(product.category)) {
          categoryIds.push(product.category)
        } else if (typeof product.category === "string") {
          categorySlugs.push(product.category)
        }
      }
    })

    // Fetch all categories at once
    const categoryMap = new Map()
    if (categoryIds.length > 0 || categorySlugs.length > 0) {
      const categoryQuery = {
        isActive: true,
        $or: [
          ...(categoryIds.length > 0 ? [{ _id: { $in: categoryIds } }] : []),
          ...(categorySlugs.length > 0 ? [{ slug: { $in: categorySlugs } }] : []),
        ],
      }
      const categories = await Category.find(categoryQuery).select("_id name slug").lean()
      categories.forEach((cat) => {
        categoryMap.set(cat._id.toString(), cat)
        categoryMap.set(cat.slug, cat)
      })
    }

    // Format products with category data
    products = products.map((product) => {
      if (product.category) {
        const categoryKey =
          typeof product.category === "string" && mongoose.Types.ObjectId.isValid(product.category)
            ? product.category
            : typeof product.category === "string"
            ? product.category
            : product.category.toString()

        const categoryDoc = categoryMap.get(categoryKey)
        if (categoryDoc) {
          product.category = {
            _id: categoryDoc._id,
            name: categoryDoc.name,
            slug: categoryDoc.slug,
          }
        } else if (typeof product.category === "string") {
          // Format string category nicely if not found in database
          product.category = {
            _id: null,
            name: product.category
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" "),
            slug: product.category,
          }
        }
      }
      return product
    })


    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error("Get products error:", error)
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    })
  }
})

// Get single product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean()

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Handle category - can be string (old format) or ObjectId (new format)
    if (product.category) {
      let categoryDoc = null
      if (mongoose.Types.ObjectId.isValid(product.category)) {
        categoryDoc = await Category.findById(product.category).select("_id name slug description").lean()
      } else if (typeof product.category === "string") {
        categoryDoc = await Category.findOne({ slug: product.category, isActive: true })
          .select("_id name slug description")
          .lean()
      }

      if (categoryDoc) {
        product.category = categoryDoc
      } else if (typeof product.category === "string") {
        // Format string category nicely if not found
        product.category = {
          _id: null,
          name: product.category
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
          slug: product.category,
          description: null,
        }
      }
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

    // Validate category - can be ObjectId or slug
    let categoryDoc
    if (mongoose.Types.ObjectId.isValid(category)) {
      categoryDoc = await Category.findById(category)
    } else {
      categoryDoc = await Category.findOne({ slug: category, isActive: true })
    }

    if (!categoryDoc || !categoryDoc.isActive) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive category",
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
      category: categoryDoc._id,
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

    // Validate/normalize category (handles ObjectId, slug, or legacy aliases)
    const categoryToUse = category !== undefined ? category : product.category
    if (categoryToUse) {
      const categoryDoc = await resolveCategoryDoc(categoryToUse)
      if (!categoryDoc || !categoryDoc.isActive) {
        return res.status(400).json({
          success: false,
          message: "Invalid or inactive category",
        })
      }
      product.category = categoryDoc._id
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
    if (description) product.description = description
    if (featuresArray) product.features = featuresArray
    if (specifications) product.specifications = { ...product.specifications, ...specifications }
    if (price !== undefined) product.price = parseFloat(price)
    if (comparePrice !== undefined) product.comparePrice = comparePrice ? parseFloat(comparePrice) : undefined
    if (stock !== undefined) product.stock = parseInt(stock)
    if (status) product.status = status
    if (images) product.images = images

    await product.save()

    // Populate category before sending response
    await product.populate("category", "name slug description")

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

// Bulk hard delete products (Admin only)
router.post("/bulk/delete", verifyAdminToken, async (req, res) => {
  try {
    const { productIds } = req.body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of product IDs to delete",
      })
    }

    // Validate all IDs are valid MongoDB ObjectIds
    const validIds = productIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
    
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid product IDs provided",
      })
    }

    // Hard delete products
    const deleteResult = await Product.deleteMany({
      _id: { $in: validIds },
    })

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} product(s)`,
      data: {
        deletedCount: deleteResult.deletedCount,
        requestedCount: productIds.length,
        validCount: validIds.length,
      },
    })
  } catch (error) {
    console.error("Bulk delete products error:", error)
    res.status(500).json({
      success: false,
      message: "Error deleting products",
      error: error.message,
    })
  }
})

// Get filter options (categories, brands, etc.)
router.get("/filters/options", async (req, res) => {
  try {
    // Get active categories
    const categories = await Category.find({ isActive: true })
      .select("_id name slug")
      .sort({ name: 1 })
      .lean()
    
    // Get brands from products
    const brands = await Product.distinct("brand", { isActive: true })
    const statuses = ["in-stock", "out-of-stock", "low-stock"]

    res.status(200).json({
      success: true,
      data: {
        categories,
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

// Download Excel template for bulk product upload
router.get("/bulk/template", verifyAdminToken, (req, res) => {
  try {
    // Define template structure with sample data
    const templateData = [
      {
        name: "Samsung TV Motherboard BN94-12345",
        sku: "SAM-MB-12345",
        brand: "Samsung",
        model: "BN94-12345",
        category: "tv-motherboard",
        description: "Original Samsung TV motherboard compatible with multiple models",
        features: "High quality components|Easy installation|1 year warranty",
        price: 4500,
        comparePrice: 5500,
        stock: 25,
        productType: "TV Motherboard",
        compatibility: "Samsung 32-55 inch TVs",
        warranty: "1 Year",
        condition: "new",
        weight: "500g",
        dimensions: "30x20x5 cm",
      },
      {
        name: "LG Power Supply Board EAY12345678",
        sku: "LG-PSB-12345",
        brand: "LG",
        model: "EAY12345678",
        category: "power-supply",
        description: "Original LG power supply board for LED TVs",
        features: "Stable power output|Low noise operation|Energy efficient",
        price: 2800,
        comparePrice: 3500,
        stock: 15,
        productType: "Power Supply Board",
        compatibility: "LG LED TVs 42-65 inch",
        warranty: "6 Months",
        condition: "new",
        weight: "400g",
        dimensions: "25x15x4 cm",
      },
    ]

    // Create workbook
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(templateData)

    // Set column widths
    worksheet["!cols"] = [
      { wch: 40 }, // name
      { wch: 15 }, // sku
      { wch: 15 }, // brand
      { wch: 20 }, // model
      { wch: 20 }, // category
      { wch: 50 }, // description
      { wch: 50 }, // features (pipe-separated)
      { wch: 10 }, // price
      { wch: 12 }, // comparePrice
      { wch: 8 },  // stock
      { wch: 20 }, // productType
      { wch: 30 }, // compatibility
      { wch: 15 }, // warranty
      { wch: 12 }, // condition
      { wch: 10 }, // weight
      { wch: 15 }, // dimensions
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, "Products")

    // Add instructions sheet
    const instructionsData = [
      { Field: "name", Required: "Yes", Description: "Product name (e.g., Samsung TV Motherboard BN94-12345)" },
      { Field: "sku", Required: "Yes", Description: "Unique Stock Keeping Unit (e.g., SAM-MB-12345). Will be converted to uppercase." },
      { Field: "brand", Required: "Yes", Description: "Brand name (e.g., Samsung, LG, Sony)" },
      { Field: "model", Required: "No", Description: "Model number" },
      { Field: "category", Required: "Yes", Description: "Category slug (e.g., tv-inverter, tv-motherboard) or category ID. Must match an active category in the system." },
      { Field: "description", Required: "Yes", Description: "Product description" },
      { Field: "features", Required: "No", Description: "Features separated by pipe (|) character. E.g., Feature 1|Feature 2|Feature 3" },
      { Field: "price", Required: "Yes", Description: "Product price (number)" },
      { Field: "comparePrice", Required: "No", Description: "Original/Compare price for showing discount (number)" },
      { Field: "stock", Required: "Yes", Description: "Stock quantity (number)" },
      { Field: "productType", Required: "No", Description: "Specification: Product type" },
      { Field: "compatibility", Required: "No", Description: "Specification: Compatible with" },
      { Field: "warranty", Required: "No", Description: "Specification: Warranty period" },
      { Field: "condition", Required: "No", Description: "One of: new, refurbished, used. Defaults to 'new'" },
      { Field: "weight", Required: "No", Description: "Specification: Product weight" },
      { Field: "dimensions", Required: "No", Description: "Specification: Product dimensions" },
    ]

    const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData)
    instructionsSheet["!cols"] = [
      { wch: 15 },
      { wch: 10 },
      { wch: 80 },
    ]
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions")

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    // Set headers for file download
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Disposition", "attachment; filename=product_upload_template.xlsx")
    res.setHeader("Content-Length", buffer.length)

    res.send(buffer)
  } catch (error) {
    console.error("Generate template error:", error)
    res.status(500).json({
      success: false,
      message: "Error generating template",
    })
  }
})

// Bulk upload products from Excel (Admin only)
router.post("/bulk/upload", verifyAdminToken, excelUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      })
    }

    // Read the uploaded Excel file
    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)

    if (!data || data.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path)
      return res.status(400).json({
        success: false,
        message: "Excel file is empty or invalid",
      })
    }

    const results = {
      total: data.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    }

    const validConditions = ["new", "refurbished", "used"]

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNumber = i + 2 // Excel row number (1-indexed + header row)

      try {
        // Validate required fields
        if (!row.name || !row.sku || !row.brand || !row.category || !row.description || !row.price || row.stock === undefined) {
          results.failed++
          results.errors.push({
            row: rowNumber,
            sku: row.sku || "N/A",
            error: "Missing required fields (name, sku, brand, category, description, price, stock)",
          })
          continue
        }

        // Validate and find category - can be slug or ObjectId
        let categoryDoc
        const categoryValue = row.category.toString().trim()
        if (mongoose.Types.ObjectId.isValid(categoryValue)) {
          categoryDoc = await Category.findById(categoryValue)
        } else {
          categoryDoc = await Category.findOne({ slug: categoryValue.toLowerCase(), isActive: true })
        }

        if (!categoryDoc || !categoryDoc.isActive) {
          results.failed++
          results.errors.push({
            row: rowNumber,
            sku: row.sku,
            error: `Invalid or inactive category: ${categoryValue}. Please use a valid category slug or ID.`,
          })
          continue
        }

        // Validate condition if provided
        const condition = row.condition || "new"
        if (!validConditions.includes(condition)) {
          results.failed++
          results.errors.push({
            row: rowNumber,
            sku: row.sku,
            error: `Invalid condition. Must be one of: ${validConditions.join(", ")}`,
          })
          continue
        }

        // Parse features (pipe-separated)
        let featuresArray = []
        if (row.features) {
          featuresArray = row.features.split("|").map((f) => f.trim()).filter((f) => f)
        }

        // Build specifications object
        const specifications = {}
        if (row.productType) specifications.productType = row.productType
        if (row.compatibility) specifications.compatibility = row.compatibility
        if (row.warranty) specifications.warranty = row.warranty
        if (row.condition) specifications.condition = condition
        if (row.weight) specifications.weight = row.weight
        if (row.dimensions) specifications.dimensions = row.dimensions

        // Check if product with SKU already exists
        const existingProduct = await Product.findOne({ sku: row.sku.toString().toUpperCase() })

        if (existingProduct) {
          // Update existing product
          existingProduct.name = row.name
          existingProduct.brand = row.brand
          existingProduct.model = row.model || existingProduct.model
          existingProduct.category = categoryDoc._id
          existingProduct.description = row.description
          existingProduct.features = featuresArray.length > 0 ? featuresArray : existingProduct.features
          existingProduct.specifications = { ...existingProduct.specifications, ...specifications }
          existingProduct.price = parseFloat(row.price)
          if (row.comparePrice) existingProduct.comparePrice = parseFloat(row.comparePrice)
          existingProduct.stock = parseInt(row.stock)
          existingProduct.isActive = true

          await existingProduct.save()
          results.updated++
        } else {
          // Create new product
          const product = new Product({
            name: row.name,
            sku: row.sku.toString().toUpperCase(),
            brand: row.brand,
            model: row.model || "",
            category: categoryDoc._id,
            description: row.description,
            features: featuresArray,
            specifications,
            price: parseFloat(row.price),
            comparePrice: row.comparePrice ? parseFloat(row.comparePrice) : undefined,
            stock: parseInt(row.stock),
            images: [],
          })

          await product.save()
          results.created++
        }
      } catch (error) {
        results.failed++
        results.errors.push({
          row: rowNumber,
          sku: row.sku || "N/A",
          error: error.message,
        })
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path)

    res.status(200).json({
      success: true,
      message: `Bulk upload completed. Created: ${results.created}, Updated: ${results.updated}, Failed: ${results.failed}`,
      data: results,
    })
  } catch (error) {
    console.error("Bulk upload error:", error)
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    res.status(500).json({
      success: false,
      message: "Error processing bulk upload",
    })
  }
})

export default router




