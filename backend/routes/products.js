import express from "express"
import Product from "../models/Product.js"
import { verifyAdminToken } from "../middleware/auth.js"
import excelUpload from "../middleware/excelUpload.js"
import * as XLSX from "xlsx"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
      { Field: "category", Required: "Yes", Description: "One of: tv-inverter, tv-motherboard, tv-pcb, power-supply, t-con, universal-motherboard" },
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

    const validCategories = [
      "tv-inverter",
      "tv-motherboard",
      "tv-pcb",
      "power-supply",
      "t-con",
      "universal-motherboard",
    ]

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

        // Validate category
        if (!validCategories.includes(row.category)) {
          results.failed++
          results.errors.push({
            row: rowNumber,
            sku: row.sku,
            error: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
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
          existingProduct.category = row.category
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
            category: row.category,
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




