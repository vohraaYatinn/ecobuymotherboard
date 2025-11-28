import express from "express"
import mongoose from "mongoose"
import Category from "../models/Category.js"
import { verifyAdminToken } from "../middleware/auth.js"

const router = express.Router()

// Get all categories (public, but only active ones)
router.get("/", async (req, res) => {
  try {
    const { includeInactive = "false" } = req.query
    const filter = includeInactive === "true" ? {} : { isActive: true }

    const categories = await Category.find(filter).sort({ name: 1 }).lean()

    res.status(200).json({
      success: true,
      data: categories,
    })
  } catch (error) {
    console.error("Get categories error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching categories",
    })
  }
})

// Get single category by ID or slug
router.get("/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params

    // Try to find by ID first, then by slug
    let category
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      category = await Category.findById(identifier)
    } else {
      category = await Category.findOne({ slug: identifier })
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    res.status(200).json({
      success: true,
      data: category,
    })
  } catch (error) {
    console.error("Get category error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error fetching category",
    })
  }
})

// Create new category (Admin only)
router.post("/", verifyAdminToken, async (req, res) => {
  try {
    const { name, slug, description } = req.body

    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Name and slug are required",
      })
    }

    // Check if category with same name or slug already exists
    const existingCategory = await Category.findOne({
      $or: [{ name: name.trim() }, { slug: slug.trim().toLowerCase() }],
    })

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name or slug already exists",
      })
    }

    // Create category
    const category = new Category({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description?.trim() || "",
      isActive: true,
    })

    await category.save()

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    })
  } catch (error) {
    console.error("Create category error:", error)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category with this name or slug already exists",
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
      message: "Error creating category",
    })
  }
})

// Update category (Admin only)
router.put("/:id", verifyAdminToken, async (req, res) => {
  try {
    const { name, slug, description, isActive } = req.body

    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    // Check if name or slug is being changed and if it already exists
    if (name || slug) {
      const checkName = name?.trim() || category.name
      const checkSlug = slug?.trim().toLowerCase() || category.slug

      const existingCategory = await Category.findOne({
        _id: { $ne: category._id },
        $or: [{ name: checkName }, { slug: checkSlug }],
      })

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category with this name or slug already exists",
        })
      }
    }

    // Update fields
    if (name) category.name = name.trim()
    if (slug) category.slug = slug.trim().toLowerCase()
    if (description !== undefined) category.description = description.trim()
    if (isActive !== undefined) category.isActive = isActive

    await category.save()

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    })
  } catch (error) {
    console.error("Update category error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      })
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category with this name or slug already exists",
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
      message: "Error updating category",
    })
  }
})

// Delete category (Admin only) - Soft delete
router.delete("/:id", verifyAdminToken, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    // Check if category is being used by any products
    const Product = (await import("../models/Product.js")).default
    const productCount = await Product.countDocuments({ category: category._id, isActive: true })

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It is being used by ${productCount} active product(s). Please remove or reassign products first.`,
      })
    }

    // Soft delete
    category.isActive = false
    await category.save()

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    })
  } catch (error) {
    console.error("Delete category error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      })
    }
    res.status(500).json({
      success: false,
      message: "Error deleting category",
    })
  }
})

export default router

